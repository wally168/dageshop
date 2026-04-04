import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdminSession(request)
    if (response) return response

    const orders = await db.order.findMany({
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('获取订单失败:', error)
    return NextResponse.json({ error: '获取订单失败' }, { status: 500 })
  }
}
