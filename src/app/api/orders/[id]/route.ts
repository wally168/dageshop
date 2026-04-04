import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdminSession(request)
    if (response) return response
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('获取订单详情失败:', error)
    return NextResponse.json({ error: '获取订单详情失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response
    const { id } = await params
    const body = await request.json()
    const shippingStatus = String(body?.shippingStatus || '').trim().toUpperCase()
    const refundStatus = String(body?.refundStatus || '').trim().toUpperCase()
    const trackingNumber = body?.trackingNumber == null ? undefined : String(body.trackingNumber).trim()

    const updateData: any = {}
    if (shippingStatus) {
      updateData.shippingStatus = shippingStatus
      updateData.shippedAt = shippingStatus === 'SHIPPED' ? new Date() : null
    }
    if (refundStatus) {
      updateData.refundStatus = refundStatus
      updateData.refundedAt = refundStatus === 'REFUNDED' ? new Date() : null
      if (refundStatus === 'REFUNDED') {
        updateData.status = 'REFUNDED'
      }
    }
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
    }

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    const logEvents: Array<{ eventType: string; payload: Record<string, unknown> }> = []
    if (shippingStatus && shippingStatus !== existing.shippingStatus) {
      logEvents.push({
        eventType: 'ORDER.SHIPPING_STATUS.UPDATED',
        payload: {
          from: existing.shippingStatus,
          to: shippingStatus,
        },
      })
    }
    if (refundStatus && refundStatus !== existing.refundStatus) {
      logEvents.push({
        eventType: 'ORDER.REFUND_STATUS.UPDATED',
        payload: {
          from: existing.refundStatus,
          to: refundStatus,
        },
      })
    }
    if (trackingNumber !== undefined && (trackingNumber || null) !== (existing.trackingNumber || null)) {
      logEvents.push({
        eventType: 'ORDER.TRACKING.UPDATED',
        payload: {
          from: existing.trackingNumber || null,
          to: trackingNumber || null,
        },
      })
    }

    const updated = await db.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
        },
      })
      if (logEvents.length > 0) {
        await tx.paymentTransaction.createMany({
          data: logEvents.map((log) => ({
            orderId: id,
            provider: 'system',
            eventType: log.eventType,
            rawPayload: JSON.stringify(log.payload),
          })),
        })
      }
      return tx.order.findUniqueOrThrow({
        where: { id },
        include: {
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
        },
      })
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('更新订单失败:', error)
    return NextResponse.json({ error: '更新订单失败' }, { status: 500 })
  }
}
