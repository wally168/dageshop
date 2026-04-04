import { NextRequest, NextResponse } from 'next/server'
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

async function verifyWebhookSignature(
  accessToken: string,
  webhookId: string,
  headersMap: Record<string, string>,
  event: any
): Promise<boolean> {
  const payload = {
    transmission_id: headersMap['paypal-transmission-id'] || '',
    transmission_time: headersMap['paypal-transmission-time'] || '',
    cert_url: headersMap['paypal-cert-url'] || '',
    auth_algo: headersMap['paypal-auth-algo'] || '',
    transmission_sig: headersMap['paypal-transmission-sig'] || '',
    webhook_id: webhookId,
    webhook_event: event,
  }
  const response = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const data = await response.json()
  return response.ok && data?.verification_status === 'SUCCESS'
}

async function finalizePaidOrder(paypalOrderId: string, resource: any, rawPayload: any) {
  const captureId = String(resource?.id || '').trim()
  const amount = Number(resource?.amount?.value ?? 0)
  const currency = String(resource?.amount?.currency_code || 'USD')
  const relatedOrderId = String(resource?.supplementary_data?.related_ids?.order_id || paypalOrderId).trim()

  let order = await db.order.findUnique({ where: { paypalOrderId: relatedOrderId } })
  if (!order) {
    order = await db.order.findUnique({ where: { id: relatedOrderId } })
  }

  if (!order) {
    const fallbackItems = parsePayPalUnitItems(rawPayload?.resource?.seller_receivable_breakdown?.platform_fees)
    order = await db.order.create({
      data: {
        paypalOrderId: relatedOrderId || paypalOrderId,
        status: 'PAID',
        shippingStatus: 'PENDING',
        refundStatus: 'NONE',
        currency,
        totalAmount: Number.isFinite(amount) ? amount : 0,
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
        status: 'PAID',
        refundStatus: 'NONE',
        paypalOrderId: relatedOrderId || order.paypalOrderId || paypalOrderId,
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
        providerOrderId: relatedOrderId || paypalOrderId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        amount: Number.isFinite(amount) ? amount : null,
        currency,
        rawPayload: JSON.stringify(rawPayload),
      },
      create: {
        orderId: order.id,
        provider: 'paypal',
        providerOrderId: relatedOrderId || paypalOrderId,
        providerCaptureId: captureId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        amount: Number.isFinite(amount) ? amount : null,
        currency,
        rawPayload: JSON.stringify(rawPayload),
      },
    })
  }
}

async function finalizeRefundOrder(paypalOrderId: string, resource: any, rawPayload: any) {
  const captureId = String(resource?.id || '').trim()
  const amount = Number(resource?.amount?.value ?? 0)
  const currency = String(resource?.amount?.currency_code || 'USD')
  const relatedOrderId = String(resource?.supplementary_data?.related_ids?.order_id || paypalOrderId).trim()

  let order = await db.order.findUnique({ where: { paypalOrderId: relatedOrderId } })
  if (!order) {
    order = await db.order.findUnique({ where: { id: relatedOrderId } })
  }
  if (!order) return

  order = await db.order.update({
    where: { id: order.id },
    data: {
      refundStatus: 'REFUNDED',
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  })

  await db.paymentTransaction.create({
    data: {
      orderId: order.id,
      provider: 'paypal',
      providerOrderId: relatedOrderId || paypalOrderId,
      providerCaptureId: captureId || null,
      eventType: 'PAYMENT.CAPTURE.REFUNDED',
      amount: Number.isFinite(amount) ? amount : null,
      currency,
      rawPayload: JSON.stringify(rawPayload),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (!clientId || !clientSecret || !webhookId) {
      return NextResponse.json({ error: 'PayPal Webhook 配置缺失' }, { status: 500 })
    }

    const rawBody = await request.text()
    const event = JSON.parse(rawBody || '{}')
    const headersMap = Object.fromEntries(request.headers.entries())
    const accessToken = await getPayPalAccessToken(clientId, clientSecret)
    const verified = await verifyWebhookSignature(accessToken, webhookId, headersMap, event)
    if (!verified) {
      return NextResponse.json({ error: 'Webhook 验签失败' }, { status: 400 })
    }

    const eventType = String(event?.event_type || '')
    const resource = event?.resource || {}
    const providerOrderId = String(resource?.supplementary_data?.related_ids?.order_id || '')

    if (eventType === 'CHECKOUT.ORDER.APPROVED' && providerOrderId) {
      const existing = await db.order.findUnique({ where: { paypalOrderId: providerOrderId } })
      if (existing && existing.status !== 'PAID') {
        await db.order.update({
          where: { id: existing.id },
          data: { status: 'APPROVED' },
        })
      }
      if (existing) {
        await db.paymentTransaction.create({
          data: {
            orderId: existing.id,
            provider: 'paypal',
            providerOrderId,
            eventType,
            rawPayload: rawBody,
          },
        })
      }
    }

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      await finalizePaidOrder(providerOrderId, resource, event)
    }
    if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      await finalizeRefundOrder(providerOrderId, resource, event)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('处理 PayPal Webhook 失败:', error)
    return NextResponse.json({ error: '处理 PayPal Webhook 失败' }, { status: 500 })
  }
}
