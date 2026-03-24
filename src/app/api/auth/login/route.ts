import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultAdmin, authenticate, createSession, buildCookieOptions, SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 确保存在默认管理员（首次运行时）
    await ensureDefaultAdmin()

    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: '用户名与密码必填' }, { status: 400 })
    }

    const user = await authenticate(username, password)
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const { token, expiresAt } = await createSession(user.id)
    const res = NextResponse.json({ success: true })
    res.cookies.set(SESSION_COOKIE, token, buildCookieOptions(expiresAt))
    return res
  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}