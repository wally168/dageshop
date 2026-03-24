import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'

// GET - 获取所有品牌
export async function GET() {
  try {
    const brands = await db.brand.findMany({
      orderBy: { name: 'asc' },
    })

    const result = brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      image: b.image,
    }))

    const res = NextResponse.json(result, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (error) {
    console.error('获取品牌失败:', error)
    return NextResponse.json({ error: '获取品牌失败' }, { status: 500 })
  }
}

// POST - 创建品牌
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const payload = await request.json()
    const name: string = (payload?.name || '').trim()
    const slugInput: string = (payload?.slug || '').trim()
    const description: string | null = payload?.description ?? null
    const image: string | null = payload?.image ?? null

    if (!name) {
      return NextResponse.json({ error: '品牌名称不能为空' }, { status: 400 })
    }

    const slug = slugInput || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // 检查 slug 唯一性
    const existing = await db.brand.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: '品牌 slug 已存在，请更换' }, { status: 409 })
    }

    const created = await db.brand.create({
      data: { name, slug, description, image },
    })

    return NextResponse.json({ id: created.id, name: created.name, slug: created.slug }, { status: 201 })
  } catch (error) {
    console.error('创建品牌失败:', error)
    return NextResponse.json({ error: '创建品牌失败' }, { status: 500 })
  }
}
