'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RefreshCcw, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'

export default function AdminResetPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (res.status === 401) {
          window.location.href = '/login?from=/admin/reset'
        }
      } catch {}
    }
    verify()
  }, [])

  const handleReset = async (mode: 'data' | 'full' | 'password') => {
    const msg = mode === 'full'
      ? '确认执行“全部重置”吗？此操作将清空管理员与所有会话，并恢复默认账号，随后跳转到登录页。'
      : mode === 'password'
        ? '确认执行“仅重置管理员密码”吗？此操作将把当前管理员密码重置为默认值（dage168），保留登录状态与站点数据。'
        : '确认执行“仅重置数据”吗？此操作将清空并预设站点数据，保留管理员与当前登录状态。'
    if (!confirm(msg)) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/reset?mode=${mode}`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setResult(data?.message || (mode === 'data' ? '数据已重置' : mode === 'password' ? '管理员密码已重置' : '站点已重置'))
      } else {
        if (res.status === 401) {
          // 全部重置后后端会返回401并清除Cookie，前端跳登录
          window.location.href = '/login?from=/admin/reset'
          return
        }
        setError(data?.error || '重置失败')
      }
    } catch (e) {
      setError('重置失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <RefreshCcw className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">重置站点</span>
            </div>
            <Link
              href="/admin"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              返回控制台
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2" />
          <h2 className="text-lg font-semibold">警告</h2>
        </div>
        <p className="text-gray-700 mb-6">
          请选择重置方式：
          <br />
          ・仅重置数据：清空并预设产品、分类、导航、站点设置、留言，保留管理员与当前登录状态。
          <br />
          ・仅重置管理员密码：将当前管理员密码重置为默认值（dage168），保留当前登录状态与站点数据。
          <br />
          ・全部重置：在“仅重置数据”的基础上，重置管理员为默认账号，并清除所有会话，随后跳转登录。
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleReset('data')}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            <RefreshCcw className={"h-5 w-5 mr-2 " + (loading ? 'animate-spin' : '')} />
            {loading ? '执行中...' : '仅重置数据'}
          </button>
          <button
            onClick={() => handleReset('password')}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-500 disabled:opacity-60"
          >
            <RefreshCcw className={"h-5 w-5 mr-2 " + (loading ? 'animate-spin' : '')} />
            {loading ? '执行中...' : '仅重置管理员密码'}
          </button>
          <button
            onClick={() => handleReset('full')}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-60"
          >
            <RefreshCcw className={"h-5 w-5 mr-2 " + (loading ? 'animate-spin' : '')} />
            {loading ? '执行中...' : '全部重置（重置管理员）'}
          </button>
        </div>

        {result && (
          <div className="mt-6 flex items-center text-green-700">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>{result}</span>
          </div>
        )}
        {error && (
          <div className="mt-6 flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <p>建议重置后前往“产品管理”和“网站设置”进行进一步编辑。</p>
        </div>
      </div>
    </div>
  )
}