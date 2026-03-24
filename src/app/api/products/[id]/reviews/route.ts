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

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const url = new URL(request.url)
    const visibleOnly = url.searchParams.get('visibleOnly') !== '0'

    const reviews = await db.productReview.findMany({
      where: { productId: id, ...(visibleOnly ? { isVisible: true } : {}) },
      orderBy: { createdAt: 'desc' },
    })

    const result = reviews.map((r: ReviewRecord) => ({
      id: r.id,
      productId: r.productId,
      isVisible: r.isVisible,
      country: r.country || '',
      name: r.name || '',
      title: r.title || '',
      content: r.content,
      rating: r.rating,
      images: (() => { try { return r.images ? JSON.parse(r.images) : [] } catch { return [] } })(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('获取评论失败:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    if (typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: '内容必填' }, { status: 400 })
    }
    const safeRating = Math.max(1, Math.min(5, Number(rating || 5)))

    const created = await db.productReview.create({
      data: {
        productId: id,
        isVisible: isVisible !== false,
        country: (country ?? '') || null,
        name: (name ?? '') || null,
        title: (title ?? '') || null,
        content: content.trim(),
        rating: safeRating,
        images: (() => {
          try {
            if (Array.isArray(images)) return JSON.stringify(images)
            if (typeof images === 'string') return images
            return null
          } catch { return null }
        })(),
        createdAt: (() => {
          try {
            if (!createdAt) return undefined as unknown as Date
            const d = new Date(createdAt)
            return isNaN(d.getTime()) ? undefined as unknown as Date : d
          } catch { return undefined as unknown as Date }
        })(),
      },
    })

    const result = {
      id: created.id,
      productId: created.productId,
      isVisible: created.isVisible,
      country: created.country || '',
      name: created.name || '',
      title: created.title || '',
      content: created.content,
      rating: created.rating,
      images: (() => { try { return created.images ? JSON.parse(created.images) : [] } catch { return [] } })(),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('创建评论失败:', error)
    return NextResponse.json({ error: '创建评论失败' }, { status: 500 })
  }
}
