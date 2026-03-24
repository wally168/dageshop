import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

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
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

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
