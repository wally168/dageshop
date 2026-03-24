'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, Loader2, ArrowLeft } from 'lucide-react'

export default function ChangePasswordPage() {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [usernamePassword, setUsernamePassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [usernameChanging, setUsernameChanging] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setCurrentUsername(data?.user?.username ?? null)
        }
      } catch {}
    }
    loadMe()
  }, [])

  const submitChangeUsername = async () => {
    setUsernameError(null)
    setUsernameSuccess(null)
    const nextUsername = newUsername.trim()
    if (!usernamePassword || !nextUsername) {
      setUsernameError('请输入当前密码与新用户名')
      return
    }
    if (currentUsername && nextUsername === currentUsername) {
      setUsernameError('新用户名不能与当前用户名相同')
      return
    }
    setUsernameChanging(true)
    try {
      const res = await fetch('/api/auth/change-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: usernamePassword, newUsername: nextUsername })
      })
      if (res.ok) {
        setUsernameSuccess('用户名修改成功')
        setCurrentUsername(nextUsername)
        setUsernamePassword('')
        setNewUsername('')
      } else {
        const text = await res.text()
        setUsernameError(text || '修改失败，请检查当前密码是否正确')
      }
    } catch (err) {
      setUsernameError('修改失败，请稍后重试')
    } finally {
      setUsernameChanging(false)
    }
  }

  const submitChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)
    if (!currentPassword || !newPassword) {
      setPasswordError('请输入当前密码与新密码')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致')
      return
    }
    setPasswordChanging(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      if (res.ok) {
        setPasswordSuccess('密码修改成功，已为安全起见退出登录，请使用新密码重新登录。')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
        setTimeout(() => { window.location.href = '/login' }, 1200)
      } else {
        const text = await res.text()
        setPasswordError(text || '修改失败，请检查当前密码是否正确')
      }
    } catch (err) {
      setPasswordError('修改失败，请稍后重试')
    } finally {
      setPasswordChanging(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部简单导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <Lock className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">账号与安全</span>
            </div>
            <Link href="/admin" className="text-gray-600 hover:text-blue-600 inline-flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回控制台
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="mb-4">
              <div className="text-lg font-semibold text-gray-900">修改用户名</div>
              <div className="text-sm text-gray-500 mt-1">当前用户名：{currentUsername || '加载中...'}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                <input
                  type="password"
                  value={usernamePassword}
                  onChange={(e) => setUsernamePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入当前密码"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新用户名</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入新用户名"
                  autoComplete="username"
                />
              </div>
            </div>
            {usernameError && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{usernameError}</div>
            )}
            {usernameSuccess && (
              <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{usernameSuccess}</div>
            )}
            <div className="flex items-center justify-end mt-6">
              <button
                type="button"
                onClick={submitChangeUsername}
                disabled={usernameChanging}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {usernameChanging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  <>修改用户名</>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="mb-4">
              <div className="text-lg font-semibold text-gray-900">修改密码</div>
              <div className="text-sm text-gray-500 mt-1">建议定期更新密码提升安全性</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入当前密码"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="至少6位，建议包含字母和数字"
                  autoComplete="new-password"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
              </div>
            </div>
            {passwordError && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{passwordSuccess}</div>
            )}
            <div className="flex items-center justify-end mt-6">
              <button
                type="button"
                onClick={submitChangePassword}
                disabled={passwordChanging}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordChanging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  <>修改密码</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
