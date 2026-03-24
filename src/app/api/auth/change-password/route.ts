import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, getSessionByToken, hashPassword, verifyPassword } from '@/lib/auth'
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

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请输入当前密码与新密码' }, { status: 400 })
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 })
    }

    // 重新获取用户并校验当前密码
    const user = await db.adminUser.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 验证当前密码（使用封装的 verifyPassword）
    const ok = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)
    if (!ok) {
      return NextResponse.json({ error: '当前密码不正确' }, { status: 401 })
    }

    // 更新新密码
    const { hash, salt } = hashPassword(newPassword)
    await db.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: hash, passwordSalt: salt }
    })

    // 使所有会话失效，需重新登录
    await db.session.deleteMany({ where: { userId: user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('修改密码失败:', error)
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 })
  }
}