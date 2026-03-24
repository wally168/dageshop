import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message, country, orderNo } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Save message to database
    const newMessage = await db.message.create({
      data: {
        name,
        email,
        subject: subject || '',
        country: country || '',
        orderNo: orderNo || '',
        message,
      } as any,
    })

    const forwardSettings = await db.siteSettings.findMany({
      where: { key: { in: ['messageForwardEnabled', 'messageForwardEmail'] } }
    })
    const forwardMap = Object.fromEntries(forwardSettings.map(s => [s.key, s.value]))
    const forwardEnabled = String(forwardMap.messageForwardEnabled || '').toLowerCase() === 'true'
    const forwardTo = String(forwardMap.messageForwardEmail || '').trim()
    const resendKey = String(process.env.RESEND_API_KEY || '').trim()
    if (forwardEnabled && forwardTo && resendKey) {
      const html = [
        `<p><strong>姓名:</strong> ${escapeHtml(name)}</p>`,
        `<p><strong>邮箱:</strong> ${escapeHtml(email)}</p>`,
        `<p><strong>国家:</strong> ${escapeHtml(country || '-')}</p>`,
        `<p><strong>订单号:</strong> ${escapeHtml(orderNo || '-')}</p>`,
        `<p><strong>主题:</strong> ${escapeHtml(subject || '-')}</p>`,
        `<p><strong>内容:</strong></p>`,
        `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>`,
        `<p><strong>时间:</strong> ${new Date(newMessage.createdAt).toLocaleString('zh-CN')}</p>`
      ].join('')

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [forwardTo],
            subject: `新留言：${name} ${subject ? `- ${subject}` : ''}`.trim(),
            html
          })
        })
      } catch (e) {
        console.error('转发留言失败:', e)
      }
    }

    return NextResponse.json(
      { message: 'Message sent successfully', id: newMessage.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const format = (url.searchParams.get('format') || 'json').toLowerCase()
    const messages = await db.message.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    }) as Array<{
      id: string
      name: string
      email: string
      subject: string | null
      country?: string | null
      orderNo?: string | null
      message: string
      read: boolean
      createdAt: Date
    }>

    if (format === 'csv') {
      const header = 'name,email,message,createdAt,country,orderNo'
      const rows = messages.map(m => [
        m.name || '',
        m.email || '',
        m.message || '',
        m.createdAt ? new Date(m.createdAt).toISOString() : '',
        m.country || '',
        m.orderNo || ''
      ].map(cell => {
        const value = String(cell)
        const needsQuote = /[",\n]/.test(value)
        if (!needsQuote) return value
        return '"' + value.replace(/"/g, '""') + '"'
      }).join(',')).join('\n')
      const csv = `${header}\n${rows}`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="messages.csv"'
        }
      })
    }

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
