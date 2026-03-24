import { db } from '@/lib/db'
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

export async function ensureDefaultAdmin() {
  const existing = await db.adminUser.findFirst()
  if (!existing) {
    const { hash, salt } = hashPassword('dage168')
    await db.adminUser.create({
      data: { username: 'dage666', passwordHash: hash, passwordSalt: salt }
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