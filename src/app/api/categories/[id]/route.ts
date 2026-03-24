import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const c = await db.category.findUnique({ where: { id } })
    if (!c) return NextResponse.json({ error: '未找到该分类' }, { status: 404 })
    return NextResponse.json({ id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image })
  } catch (error) {
    console.error('获取分类详情失败:', error)
    return NextResponse.json({ error: '获取分类详情失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const payload = await request.json()
    const name: string | undefined = payload?.name?.trim()
    const slugInput: string | undefined = payload?.slug?.trim()
    const description: string | null | undefined = payload?.description ?? undefined
    const image: string | null | undefined = payload?.image ?? undefined

    const updateData: any = {}
    if (typeof name === 'string' && name.length > 0) updateData.name = name
    if (typeof slugInput === 'string') {
      const newSlug = slugInput || (name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      updateData.slug = newSlug
    }
    if (description !== undefined) updateData.description = description
    if (image !== undefined) updateData.image = image

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
    }

    // 如果要更新 slug，检查唯一性
    if (updateData.slug) {
      const existing = await db.category.findUnique({ where: { slug: updateData.slug } })
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: '分类 slug 已存在，请更换' }, { status: 409 })
      }
    }

    const updated = await db.category.update({ where: { id }, data: updateData })
    return NextResponse.json({ id: updated.id, name: updated.name, slug: updated.slug, description: updated.description, image: updated.image })
  } catch (error) {
    console.error('更新分类失败:', error)
    return NextResponse.json({ error: '更新分类失败' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // 检查是否有产品依赖该分类
    const count = await db.product.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json({ error: `该分类下有 ${count} 个产品，无法删除` }, { status: 400 })
    }

    await db.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('删除分类失败:', error)
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 })
  }
}