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
    robotsAllowAll: 'true',
    robotsDisallowAdmin: 'true',
    robotsDisallowApi: 'true',
    robotsDisallowCart: 'true',
    robotsDisallowCheckout: 'true',
    robotsDisallowSearch: 'true',
    robotsExtraRules: '',
    sitemapEnabled: 'true',
  }
  try {
    const rows = await db.siteSettings.findMany()
    for (const r of rows) defaults[r.key] = r.value
  } catch {}
  return defaults
}

export async function GET() {
  const settings = await getSettings()
  const allowAll = settings.robotsAllowAll === 'true'
  const disallow = (k: string, path: string) => (settings[k] === 'true' ? `Disallow: ${path}` : '')
  const lines: string[] = []
  lines.push('User-agent: *')
  if (allowAll) lines.push('Allow: /')
  const rules = [
    disallow('robotsDisallowAdmin', '/admin'),
    disallow('robotsDisallowApi', '/api'),
    disallow('robotsDisallowCart', '/cart'),
    disallow('robotsDisallowCheckout', '/checkout'),
    disallow('robotsDisallowSearch', '/search'),
  ].filter(Boolean)
  lines.push(...rules)
  const extra = (settings.robotsExtraRules || '').trim()
  if (extra) lines.push(...extra.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))

  const baseUrl = await getBaseUrl()
  if (settings.sitemapEnabled === 'true') {
    lines.push(`Sitemap: ${baseUrl}/sitemap.xml`)
  }

  const text = lines.join('\n') + '\n'
  return new NextResponse(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

