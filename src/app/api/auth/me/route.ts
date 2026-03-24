import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, getSessionByToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      const res = NextResponse.json({ error: '未登录' }, { status: 401 })
      res.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(0)
      })
      return res
    }

    const session = await getSessionByToken(token)
    if (!session) {
      const res = NextResponse.json({ error: '会话无效或已过期' }, { status: 401 })
      res.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(0)
      })
      return res
    }

    return NextResponse.json({ user: { id: session.userId, username: session.user.username } })
  } catch (error) {
    console.error('会话校验失败:', error)
    return NextResponse.json({ error: '会话校验失败' }, { status: 500 })
  }
}