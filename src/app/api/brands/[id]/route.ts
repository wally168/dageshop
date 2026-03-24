import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const brand = await db.brand.findUnique({ where: { id } })
    if (!brand) {
      return NextResponse.json({ error: '品牌不存在' }, { status: 404 })
    }
    return NextResponse.json(brand)
  } catch (error) {
    return NextResponse.json({ error: '获取品牌失败' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await request.json()
    const name: string = (payload?.name || '').trim()
    const slug: string = (payload?.slug || '').trim()
    const description: string | null = payload?.description ?? null
    const image: string | null = payload?.image ?? null

    if (!name || !slug) {
      return NextResponse.json({ error: '名称和 Slug 不能为空' }, { status: 400 })
    }

    // 检查 Slug 冲突
    const existing = await db.brand.findUnique({ where: { slug } })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Slug 已被占用' }, { status: 409 })
    }

    const updated = await db.brand.update({
      where: { id },
      data: { name, slug, description, image },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: '更新品牌失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // 不像分类，品牌目前没有强关联，可以直接删除
    // 如果后续有关联，需要先检查
    await db.brand.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '删除品牌失败' }, { status: 500 })
  }
}
