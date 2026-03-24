import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const { items } = await request.json() // [{ id, order }]
    
    if (!Array.isArray(items)) {
       return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Transaction to update all
    await db.$transaction(
      items.map((item: any) => 
        db.carouselItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder carousel items:', error)
    return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 })
  }
}
