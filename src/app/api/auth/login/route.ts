import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultAdmin, authenticate, createSession, buildCookieOptions, SESSION_COOKIE } from '@/lib/auth'
import crypto from 'crypto'

type AttemptInfo = { count: number; resetAt: number }
const MAX_ATTEMPTS = 10
const WINDOW_MS = 5 * 60 * 1000
const FAIL_WINDOW_MS = 24 * 60 * 60 * 1000
const LOCK_THRESHOLD = 5
const attempts = new Map<string, AttemptInfo>()
const CAPTCHA_TTL_MS = 5 * 60 * 1000
const CAPTCHA_TRIGGER_COUNT = 1
const failAttempts = new Map<string, AttemptInfo>()
const captchaStore = new Map<string, { answer: string; expiresAt: number; ip: string; question: string }>()
const lockouts = new Map<string, { until: number }>()

function getClientIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  return real || 'unknown'
}

function recordAttempt(ip: string) {
  const now = Date.now()
  const current = attempts.get(ip)
  if (!current || current.resetAt <= now) {
    const resetAt = now + WINDOW_MS
    attempts.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt }
  }
  if (current.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }
  const next = { count: current.count + 1, resetAt: current.resetAt }
  attempts.set(ip, next)
  return { allowed: true, remaining: Math.max(0, MAX_ATTEMPTS - next.count), resetAt: next.resetAt }
}

function recordFail(ip: string) {
  const now = Date.now()
  const existingLock = lockouts.get(ip)
  if (existingLock && existingLock.until > now) {
    return { count: LOCK_THRESHOLD, resetAt: existingLock.until }
  }
  const current = failAttempts.get(ip)
  if (!current || current.resetAt <= now) {
    const resetAt = now + FAIL_WINDOW_MS
    const next = { count: 1, resetAt }
    failAttempts.set(ip, next)
    return next
  }
  const next = { count: current.count + 1, resetAt: current.resetAt }
  failAttempts.set(ip, next)
  if (next.count >= LOCK_THRESHOLD) {
    const until = now + FAIL_WINDOW_MS
    lockouts.set(ip, { until })
    return { count: next.count, resetAt: until }
  }
  return next
}

function getFailInfo(ip: string) {
  const now = Date.now()
  const lock = lockouts.get(ip)
  if (lock && lock.until > now) {
    return { count: LOCK_THRESHOLD, resetAt: lock.until }
  }
  if (lock && lock.until <= now) {
    lockouts.delete(ip)
  }
  const current = failAttempts.get(ip)
  if (!current || current.resetAt <= now) {
    failAttempts.delete(ip)
    return { count: 0, resetAt: now + FAIL_WINDOW_MS }
  }
  return current
}

function clearCaptchaForIp(ip: string) {
  for (const [token, info] of captchaStore.entries()) {
    if (info.ip === ip) {
      captchaStore.delete(token)
    }
  }
}

function issueCaptcha(ip: string) {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const token = crypto.randomUUID()
  const question = `${a} + ${b} = ?`
  const answer = String(a + b)
  captchaStore.set(token, { answer, expiresAt: Date.now() + CAPTCHA_TTL_MS, ip, question })
  return { token, question }
}

function verifyCaptcha(ip: string, token: string, answer: string) {
  const info = captchaStore.get(token)
  if (!info) return false
  if (info.expiresAt <= Date.now()) {
    captchaStore.delete(token)
    return false
  }
  if (info.ip !== ip) {
    captchaStore.delete(token)
    return false
  }
  const ok = String(answer || '').trim() === info.answer
  if (ok) captchaStore.delete(token)
  return ok
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = recordAttempt(ip)
    if (!rate.allowed) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
    }

    // 确保存在默认管理员（首次运行时）
    await ensureDefaultAdmin()

    const { username, password, captchaToken, captchaAnswer } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: '用户名与密码必填' }, { status: 400 })
    }

    const failInfo = getFailInfo(ip)
    if (failInfo.count >= LOCK_THRESHOLD) {
      const waitMs = Math.max(0, failInfo.resetAt - Date.now())
      const waitHours = Math.ceil(waitMs / (60 * 60 * 1000))
      return NextResponse.json(
        { error: `登录错误次数过多，请在 ${waitHours} 小时后重试` },
        { status: 429 }
      )
    }
    if (failInfo.count >= CAPTCHA_TRIGGER_COUNT) {
      if (!captchaToken || !captchaAnswer) {
        const nextCaptcha = issueCaptcha(ip)
        return NextResponse.json(
          { error: '请完成验证码验证', requireCaptcha: true, captchaToken: nextCaptcha.token, captchaQuestion: nextCaptcha.question },
          { status: 401 }
        )
      }
      const ok = verifyCaptcha(ip, String(captchaToken), String(captchaAnswer))
      if (!ok) {
        recordFail(ip)
        const nextCaptcha = issueCaptcha(ip)
        return NextResponse.json(
          { error: '验证码错误', requireCaptcha: true, captchaToken: nextCaptcha.token, captchaQuestion: nextCaptcha.question },
          { status: 401 }
        )
      }
    }

    const user = await authenticate(username, password)
    if (!user) {
      const info = recordFail(ip)
      if (info.count >= LOCK_THRESHOLD) {
        const waitMs = Math.max(0, info.resetAt - Date.now())
        const waitHours = Math.ceil(waitMs / (60 * 60 * 1000))
        return NextResponse.json(
          { error: `登录错误次数过多，请在 ${waitHours} 小时后重试` },
          { status: 429 }
        )
      }
      if (info.count >= CAPTCHA_TRIGGER_COUNT) {
        const nextCaptcha = issueCaptcha(ip)
        return NextResponse.json(
          { error: '用户名或密码错误', requireCaptcha: true, captchaToken: nextCaptcha.token, captchaQuestion: nextCaptcha.question },
          { status: 401 }
        )
      }
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const { token, expiresAt } = await createSession(user.id)
    const res = NextResponse.json({ success: true })
    res.cookies.set(SESSION_COOKIE, token, buildCookieOptions(expiresAt))
    attempts.delete(ip)
    failAttempts.delete(ip)
    lockouts.delete(ip)
    clearCaptchaForIp(ip)
    return res
  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
