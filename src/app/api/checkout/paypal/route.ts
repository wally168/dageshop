import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

type CheckoutItem = {
  id: string
  title: string
  price: number
  quantity: number
}

function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

function normalizeAmount(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2)
}

function parseCheckoutItems(raw: unknown): CheckoutItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const item = entry as Partial<CheckoutItem>
      const id = String(item.id || '').trim()
      const title = String(item.title || '').trim().slice(0, 127)
      const price = Number(item.price)
      const quantity = Number(item.quantity)
      if (!id || !title) return null
      if (!Number.isFinite(price) || price <= 0) return null
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) return null
      return { id, title, price, quantity }
    })
    .filter((item): item is CheckoutItem => Boolean(item))
}

function parsePayPalUnitItems(raw: unknown): CheckoutItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const item = entry as any
      const title = String(item?.name || '').trim().slice(0, 127)
      const price = Number(item?.unit_amount?.value)
      const quantity = Number(item?.quantity)
      if (!title) return null
      if (!Number.isFinite(price) || price <= 0) return null
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) return null
      return {
        id: title,
        title,
        price,
        quantity,
      }
    })
    .filter((item): item is CheckoutItem => Boolean(item))
}

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('host')
    const proto = h.get('x-forwarded-proto') || 'http'
    if (host) return `${proto}://${host}`
  } catch {}
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  const data = await response.json()
  if (!response.ok || !data?.access_token) {
    throw new Error(`PayPal token error: ${JSON.stringify(data)}`)
  }
  return data.access_token as string
}

async function createPayPalOrder(params: {
  accessToken: string
  total: number
  items: CheckoutItem[]
  returnUrl: string
  cancelUrl: string
  localOrderId: string
}) {
  const { accessToken, total, items, returnUrl, cancelUrl, localOrderId } = params
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        custom_id: localOrderId,
        invoice_id: localOrderId,
        amount: {
          currency_code: 'USD',
          value: normalizeAmount(total),
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: normalizeAmount(total),
            },
          },
        },
        items: items.map((item) => ({
          name: item.title,
          unit_amount: {
            currency_code: 'USD',
            value: normalizeAmount(item.price),
          },
          quantity: String(item.quantity),
        })),
      },
    ],
    application_context: {
      return_url: returnUrl,
      cancel_url: cancelUrl,
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
    },
  }

  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`PayPal create order error: ${JSON.stringify(data)}`)
  }
  return data
}

async function capturePayPalOrder(accessToken: string, orderId: string) {
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`PayPal capture order error: ${JSON.stringify(data)}`)
  }
  return data
}

async function createLocalOrder(items: CheckoutItem[], total: number) {
  return db.order.create({
    data: {
      totalAmount: total,
      currency: 'USD',
      status: 'CREATED',
      items: {
        create: items.map((item) => ({
          productId: item.id,
          productTitle: item.title,
          unitPrice: item.price,
          quantity: item.quantity,
          lineTotal: item.price * item.quantity,
        })),
      },
    },
  })
}

async function finalizeOrderFromCapture(paypalOrderId: string, captured: any) {
  const unit = captured?.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const captureId = String(capture?.id || '').trim()
  const amount = Number(capture?.amount?.value ?? 0)
  const currency = String(capture?.amount?.currency_code || 'USD')
  const localOrderId = String(unit?.custom_id || '').trim()

  let order = localOrderId
    ? await db.order.findUnique({ where: { id: localOrderId } })
    : await db.order.findUnique({ where: { paypalOrderId } })

  if (!order) {
    const fallbackItems = parsePayPalUnitItems(unit?.items)
    const fallbackTotal = Number.isFinite(amount) && amount > 0
      ? amount
      : fallbackItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    order = await db.order.create({
      data: {
        paypalOrderId,
        status: 'PAID',
        currency,
        totalAmount: fallbackTotal,
        paidAt: new Date(),
        items: {
          create: fallbackItems.map((item) => ({
            productId: item.id,
            productTitle: item.title,
            unitPrice: item.price,
            quantity: item.quantity,
            lineTotal: item.price * item.quantity,
          })),
        },
      },
    })
  } else {
    order = await db.order.update({
      where: { id: order.id },
      data: {
        paypalOrderId,
        status: 'PAID',
        currency,
        paidAt: new Date(),
      },
    })
  }

  if (captureId) {
    await db.paymentTransaction.upsert({
      where: { providerCaptureId: captureId },
      update: {
        orderId: order.id,
        provider: 'paypal',
        providerOrderId: paypalOrderId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        amount: Number.isFinite(amount) ? amount : null,
        currency,
        rawPayload: JSON.stringify(captured),
      },
      create: {
        orderId: order.id,
        provider: 'paypal',
        providerOrderId: paypalOrderId,
        providerCaptureId: captureId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        amount: Number.isFinite(amount) ? amount : null,
        currency,
        rawPayload: JSON.stringify(captured),
      },
    })
  } else {
    await db.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: 'paypal',
        providerOrderId: paypalOrderId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        amount: Number.isFinite(amount) ? amount : null,
        currency,
        rawPayload: JSON.stringify(captured),
      },
    })
  }

  return { order, capture }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal 配置缺失' }, { status: 500 })
    }

    const body = await request.json()
    const items = parseCheckoutItems(body?.items)
    if (items.length === 0) {
      return NextResponse.json({ error: '购物车为空或数据无效' }, { status: 400 })
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: '订单金额无效' }, { status: 400 })
    }

    const localOrder = await createLocalOrder(items, total)
    const baseUrl = await getBaseUrl()
    const returnUrl = new URL('/cart', baseUrl)
    returnUrl.searchParams.set('paypalStatus', 'success')
    const cancelUrl = new URL('/cart', baseUrl)
    cancelUrl.searchParams.set('paypalStatus', 'cancel')

    try {
      const accessToken = await getPayPalAccessToken(clientId, clientSecret)
      const created = await createPayPalOrder({
        accessToken,
        total,
        items,
        returnUrl: returnUrl.toString(),
        cancelUrl: cancelUrl.toString(),
        localOrderId: localOrder.id,
      })
      const links = Array.isArray(created?.links) ? created.links : []
      const approve = links.find((link: any) => link?.rel === 'approve')?.href
      if (!approve) {
        await db.order.update({
          where: { id: localOrder.id },
          data: { status: 'FAILED' },
        })
        return NextResponse.json({ error: '创建支付订单失败' }, { status: 502 })
      }

      await db.order.update({
        where: { id: localOrder.id },
        data: {
          paypalOrderId: String(created.id || ''),
          status: 'APPROVED',
        },
      })
      await db.paymentTransaction.create({
        data: {
          orderId: localOrder.id,
          provider: 'paypal',
          providerOrderId: String(created.id || ''),
          eventType: 'CHECKOUT.ORDER.CREATED',
          amount: total,
          currency: 'USD',
          rawPayload: JSON.stringify(created),
        },
      })

      return NextResponse.json({
        orderId: created.id,
        localOrderId: localOrder.id,
        approveUrl: approve,
      })
    } catch (error) {
      await db.order.update({
        where: { id: localOrder.id },
        data: { status: 'FAILED' },
      })
      throw error
    }
  } catch (error) {
    console.error('创建 PayPal 订单失败:', error)
    return NextResponse.json({ error: '创建 PayPal 订单失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal 配置缺失' }, { status: 500 })
    }

    const body = await request.json()
    const paypalOrderId = String(body?.orderId || '').trim()
    if (!paypalOrderId) {
      return NextResponse.json({ error: '缺少 PayPal 订单号' }, { status: 400 })
    }

    const existing = await db.order.findUnique({ where: { paypalOrderId } })
    if (existing?.status === 'PAID') {
      return NextResponse.json({
        success: true,
        orderId: paypalOrderId,
        status: 'COMPLETED',
      })
    }

    const accessToken = await getPayPalAccessToken(clientId, clientSecret)
    const captured = await capturePayPalOrder(accessToken, paypalOrderId)
    if (captured?.status !== 'COMPLETED') {
      return NextResponse.json({ error: '支付未完成', details: captured }, { status: 409 })
    }

    const { order, capture } = await finalizeOrderFromCapture(paypalOrderId, captured)
    return NextResponse.json({
      success: true,
      localOrderId: order.id,
      orderId: captured.id,
      captureId: capture?.id || null,
      amount: capture?.amount?.value || null,
      currency: capture?.amount?.currency_code || null,
      status: captured.status,
    })
  } catch (error) {
    console.error('确认 PayPal 支付失败:', error)
    return NextResponse.json({ error: '确认 PayPal 支付失败' }, { status: 500 })
  }
}
