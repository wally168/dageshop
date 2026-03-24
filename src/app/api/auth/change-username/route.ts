import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, getSessionByToken, verifyPassword } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const session = await getSessionByToken(token)
    if (!session) {
      return NextResponse.json({ error: '会话无效或已过期' }, { status: 401 })
    }

    const { currentPassword, newUsername } = await request.json()
    const nextUsername = String(newUsername || '').trim()
    if (!currentPassword || !nextUsername) {
      return NextResponse.json({ error: '请输入当前密码与新用户名' }, { status: 400 })
    }

    const user = await db.adminUser.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const ok = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)
    if (!ok) {
      return NextResponse.json({ error: '当前密码不正确' }, { status: 401 })
    }

    if (nextUsername === user.username) {
      return NextResponse.json({ error: '新用户名不能与当前用户名相同' }, { status: 400 })
    }

    const existing = await db.adminUser.findUnique({ where: { username: nextUsername } })
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }

    await db.adminUser.update({
      where: { id: user.id },
      data: { username: nextUsername }
    })

    return NextResponse.json({ success: true, username: nextUsername })
  } catch (error) {
    console.error('修改用户名失败:', error)
    return NextResponse.json({ error: '修改用户名失败' }, { status: 500 })
  }
}
