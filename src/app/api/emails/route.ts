import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/emails
// 返回从 Message 表聚合出的邮箱列表，支持格式：json/csv/txt/txt_with_name
// JSON: [{ email, name, count, firstSeen, lastSeen }]
// CSV:  name,email\n...
// TXT:  一行一个邮箱（仅邮箱）
// TXT_WITH_NAME: 一行“用户名,邮箱”
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const format = (url.searchParams.get('format') || 'json').toLowerCase()

    // 读取必要字段后在内存中聚合，确保可取到“最新姓名”
    const messages = await db.message.findMany({
      select: { email: true, name: true, createdAt: true },
    })

    const statsMap = new Map<string, { count: number; firstSeen: Date | null; lastSeen: Date | null; latestName: string | null }>()

    for (const m of messages) {
      const s = statsMap.get(m.email) || { count: 0, firstSeen: null, lastSeen: null, latestName: null }
      s.count += 1
      if (!s.firstSeen || m.createdAt < s.firstSeen) s.firstSeen = m.createdAt
      if (!s.lastSeen || m.createdAt > s.lastSeen) { s.lastSeen = m.createdAt; s.latestName = m.name || null }
      statsMap.set(m.email, s)
    }

    const data = Array.from(statsMap.entries()).map(([email, s]) => ({
      email,
      name: s.latestName,
      count: s.count,
      firstSeen: s.firstSeen ? new Date(s.firstSeen).toISOString() : null,
      lastSeen: s.lastSeen ? new Date(s.lastSeen).toISOString() : null,
    }))

    if (format === 'csv') {
      const header = 'name,email'
      const rows = data.map(d => [
        d.name || '',
        d.email
      ].map(cell => {
        const needsQuote = /[",\n]/.test(cell)
        if (!needsQuote) return cell
        return '"' + cell.replace(/"/g, '""') + '"'
      }).join(',')).join('\n')
      const csv = `${header}\n${rows}`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="emails.csv"'
        }
      })
    }

    if (format === 'txt_with_name') {
      const lines = data.map(d => `${(d.name || '').trim()},${d.email.trim()}`).join('\n')
      return new NextResponse(lines, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="emails_with_name.txt"'
        }
      })
    }

    if (format === 'txt') {
      const uniqueEmails = data.map(d => d.email).join('\n')
      return new NextResponse(uniqueEmails, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="emails.txt"'
        }
      })
    }

    // 默认返回 JSON
    return NextResponse.json(data, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('获取邮箱列表失败:', error)
    return NextResponse.json({ error: '获取邮箱列表失败' }, { status: 500 })
  }
}