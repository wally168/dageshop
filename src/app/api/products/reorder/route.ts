import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { products } = body // Expecting [{ id: string, sortOrder: number }]

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Transaction to update all
    await db.$transaction(
      products.map((p: { id: string; sortOrder: number }) =>
        db.product.update({
          where: { id: p.id },
          data: { sortOrder: p.sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering products:', error)
    return NextResponse.json(
      { error: 'Failed to reorder products' },
      { status: 500 }
    )
  }
}
