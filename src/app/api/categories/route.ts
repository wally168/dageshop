import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - 获取所有分类（用于后台产品表单选择）
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
    })

    const result = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }))

    return NextResponse.json(result, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (error) {
    console.error('获取分类失败:', error)
    return NextResponse.json({ error: '获取分类失败' }, { status: 500 })
  }
}

// POST - 创建分类
export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const name: string = (payload?.name || '').trim()
    const slugInput: string = (payload?.slug || '').trim()
    const description: string | null = payload?.description ?? null
    const image: string | null = payload?.image ?? null

    if (!name) {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 })
    }

    const slug = slugInput || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // 检查 slug 唯一性
    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: '分类 slug 已存在，请更换' }, { status: 409 })
    }

    const created = await db.category.create({
      data: { name, slug, description, image },
    })

    return NextResponse.json({ id: created.id, name: created.name, slug: created.slug }, { status: 201 })
  } catch (error) {
    console.error('创建分类失败:', error)
    return NextResponse.json({ error: '创建分类失败' }, { status: 500 })
  }
}