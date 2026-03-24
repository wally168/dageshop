import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
type ReviewRecord = {
  id: string
  productId: string
  isVisible: boolean
  country: string | null
  name: string | null
  title: string | null
  content: string
  rating: number
  images: string | null
  createdAt: Date
  updatedAt: Date
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
  const {
      isVisible,
      country,
      name,
      title,
      content,
      rating,
      images,
      createdAt,
    } = body

    const data: any = {}
    if (typeof isVisible !== 'undefined') data.isVisible = isVisible !== false
    if (typeof country !== 'undefined') data.country = (country ?? '') || null
    if (typeof name !== 'undefined') data.name = (name ?? '') || null
    if (typeof title !== 'undefined') data.title = (title ?? '') || null
    if (typeof content === 'string') data.content = content.trim()
    if (typeof rating !== 'undefined') data.rating = Math.max(1, Math.min(5, Number(rating)))
    if (typeof images !== 'undefined') {
      try {
        data.images = Array.isArray(images) ? JSON.stringify(images) : (typeof images === 'string' ? images : null)
      } catch { data.images = null }
    }
    if (typeof createdAt !== 'undefined') {
      try {
        const d = new Date(createdAt)
        if (!isNaN(d.getTime())) data.createdAt = d
      } catch {}
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
    }

    const updated = await db.productReview.update({ where: { id }, data })
    const result: ReviewRecord & { images: string[] } = {
      id: updated.id,
      productId: updated.productId,
      isVisible: updated.isVisible,
      country: updated.country || '',
      name: updated.name || '',
      title: updated.title || '',
      content: updated.content,
      rating: updated.rating,
      images: (() => { try { return updated.images ? JSON.parse(updated.images) : [] } catch { return [] } })(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('更新评论失败:', error)
    return NextResponse.json({ error: '更新评论失败' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    await db.productReview.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('删除评论失败:', error)
    return NextResponse.json({ error: '删除评论失败' }, { status: 500 })
  }
}
