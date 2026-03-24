import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const items = await db.carouselItem.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('Failed to fetch carousel items:', error)
    return NextResponse.json({ error: 'Failed to fetch carousel items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    // Basic validation
    if (!data.imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Get max order to append
    const lastItem = await db.carouselItem.findFirst({
      orderBy: { order: 'desc' },
    })
    const newOrder = (lastItem?.order ?? -1) + 1

    const item = await db.carouselItem.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        link: data.link,
        btnText: data.btnText,
        newTab: data.newTab ?? false,
        order: newOrder,
        active: data.active ?? true,
      },
    })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to create carousel item:', error)
    return NextResponse.json({ error: 'Failed to create carousel item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json()
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    await db.carouselItem.deleteMany({
      where: {
        id: { in: ids },
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete items:', error)
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 })
  }
}
