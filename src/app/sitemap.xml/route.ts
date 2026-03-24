import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('host')
    const proto = h.get('x-forwarded-proto') || 'http'
    if (host) return `${proto}://${host}`
  } catch {}
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'
}

async function getSettings(): Promise<Record<string, string>> {
  const defaults: Record<string, string> = {
    sitemapEnabled: 'true',
    sitemapIncludeProducts: 'true',
    sitemapIncludeCategories: 'true',
    sitemapChangefreq: 'daily',
    sitemapPriority: '0.7',
  }
  try {
    const rows = await db.siteSettings.findMany()
    for (const r of rows) defaults[r.key] = r.value
  } catch {}
  return defaults
}

export async function GET() {
  const settings = await getSettings()
  if (settings.sitemapEnabled !== 'true') {
    return new NextResponse('Sitemap disabled', { status: 404 })
  }

  const baseUrl = await getBaseUrl()
  const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = []

  const add = (path: string, lastmod?: Date) => {
    urls.push({
      loc: `${baseUrl}${path}`,
      lastmod: lastmod ? lastmod.toISOString() : undefined,
      changefreq: settings.sitemapChangefreq,
      priority: settings.sitemapPriority,
    })
  }

  add('/')
  add('/products')
  add('/about')
  add('/contact')

  if (settings.sitemapIncludeCategories === 'true') {
    try {
      const categories = await db.category.findMany({ select: { slug: true, updatedAt: true } })
      for (const c of categories) add(`/categories/${c.slug}`, c.updatedAt)
    } catch {}
  }

  if (settings.sitemapIncludeProducts === 'true') {
    try {
      const products = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } })
      for (const p of products) add(`/products/${p.slug}`, p.updatedAt)
    } catch {}
  }

  const xmlItems = urls.map(u => {
    return `  <url>\n    <loc>${u.loc}</loc>`
      + (u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '')
      + (u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '')
      + (u.priority ? `\n    <priority>${u.priority}</priority>` : '')
      + `\n  </url>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlItems}\n</urlset>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  })
}

