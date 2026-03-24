import { NextRequest, NextResponse } from 'next/server'
import { destroySession, SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (token) {
      await destroySession(token)
    }
    const res = NextResponse.json({ success: true })
    // 清除 Cookie
    res.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0)
    })
    return res
  } catch (error) {
    console.error('退出失败:', error)
    return NextResponse.json({ error: '退出失败' }, { status: 500 })
  }
}