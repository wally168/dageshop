import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureUniqueSlug(base: string) {
  let candidate = base
  let suffix = 1
  while (await db.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix++}`
  }
  return candidate
}

export async function POST(_request: NextRequest) {
  try {
    const request = _request
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    const products = await db.product.findMany({})
    const updates: Array<{ id: string, title: string, from?: string | null, to: string }> = []

    for (const p of products) {
      if (!p.slug || p.slug.trim() === '') {
        const base = slugify(p.title || 'product') || `product-${p.id.slice(-6)}`
        const unique = await ensureUniqueSlug(base)
        await db.product.update({ where: { id: p.id }, data: { slug: unique } })
        updates.push({ id: p.id, title: p.title, from: p.slug, to: unique })
      }
    }

    return NextResponse.json({ updated: updates.length, updates })
  } catch (error) {
    console.error('Error fixing slugs:', error)
    return NextResponse.json({ error: 'Failed to fix slugs' }, { status: 500 })
  }
}
