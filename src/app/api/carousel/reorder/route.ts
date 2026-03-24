import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
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
