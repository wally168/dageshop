import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_DAYS = 7

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashed = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hashed, 'hex'), Buffer.from(hash, 'hex'))
}

export function getDefaultAdminCredentials() {
  const username = String(process.env.DEFAULT_ADMIN_USERNAME || '').trim()
  const password = String(process.env.DEFAULT_ADMIN_PASSWORD || '').trim()
  if (process.env.NODE_ENV === 'production') {
    if (!username || !password) {
      throw new Error('DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD are required in production')
    }
  }
  return {
    username: username || 'dage666',
    password: password || 'dage168',
  }
}

export async function ensureDefaultAdmin() {
  const existing = await db.adminUser.findFirst()
  if (!existing) {
    const { username, password } = getDefaultAdminCredentials()
    const { hash, salt } = hashPassword(password)
    await db.adminUser.create({
      data: { username, passwordHash: hash, passwordSalt: salt }
    })
  }
}

export async function authenticate(username: string, password: string) {
  const user = await db.adminUser.findUnique({ where: { username } })
  if (!user) return null
  const ok = verifyPassword(password, user.passwordHash, user.passwordSalt)
  return ok ? user : null
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export async function getSessionByToken(token: string) {
  const session = await db.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    // expired
    try { await db.session.delete({ where: { token } }) } catch {}
    return null
  }
  return session
}

export async function destroySession(token: string) {
  try { await db.session.delete({ where: { token } }) } catch {}
}

export function buildCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  }
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0)
  })
}

export async function requireAdminSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return { response: NextResponse.json({ error: '未登录' }, { status: 401 }) }
  }

  const session = await getSessionByToken(token)
  if (!session) {
    const res = NextResponse.json({ error: '会话无效或已过期' }, { status: 401 })
    clearSessionCookie(res)
    return { response: res }
  }

  return { session }
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
