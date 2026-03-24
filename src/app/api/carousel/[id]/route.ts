import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const item = await db.carouselItem.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        link: data.link,
        btnText: data.btnText,
        newTab: data.newTab,
        active: data.active,
        // order is usually handled by reorder endpoint, but can be here too if needed
      },
    })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update carousel item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.carouselItem.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete carousel item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
