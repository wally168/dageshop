'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Mail, Copy, Download, Search, ArrowLeft, RefreshCw } from 'lucide-react'

interface EmailEntry {
  email: string
  name: string | null
  count: number
  firstSeen: string | null
  lastSeen: string | null
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<EmailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchEmails() }, [])

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/emails')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEmails(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('获取邮箱失败:', e)
      setEmails([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return emails
    return emails.filter(e => {
      const emailHit = e.email.toLowerCase().includes(term)
      const nameHit = (e.name || '').toLowerCase().includes(term)
      return emailHit || nameHit
    })
  }, [emails, searchTerm])

  const toNameEmailLine = (e: EmailEntry) => `${(e.name || '').trim()},${e.email.trim()}`

  const copyAll = async () => {
    try {
      const text = filtered.map(toNameEmailLine).join('\n')
      await navigator.clipboard.writeText(text)
      alert('已复制（用户名,邮箱）列表到剪贴板')
    } catch (e) {
      console.error('复制失败:', e)
      alert('复制失败，请重试')
    }
  }

  const downloadCsv = () => { window.location.href = '/api/emails?format=csv' }
  const downloadTxt = () => { window.location.href = '/api/emails?format=txt' }
  const downloadTxtWithName = () => { window.location.href = '/api/emails?format=txt_with_name' }

  const totalUnique = emails.length
  const todayCount = emails.filter(e => {
    if (!e.lastSeen) return false
    const d = new Date(e.lastSeen)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  const formatDate = (s: string | null) => {
    if (!s) return '-'
    try {
      return new Date(s).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    } catch { return '-' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900 flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回仪表盘
            </Link>
            <Link href="/admin/messages" className="text-gray-600 hover:text-gray-900 flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回留言管理
            </Link>
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900">邮箱管理</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={copyAll} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center" title="复制全部（用户名+邮箱）">
              <Copy className="h-4 w-4 mr-1" /> 复制全部（用户名+邮箱）
            </button>
            <button onClick={downloadCsv} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center" title="下载 CSV（用户名,邮箱）">
              <Download className="h-4 w-4 mr-1" /> 下载 CSV
            </button>
            <button onClick={downloadTxt} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center" title="下载 TXT（仅邮箱）">
              <Download className="h-4 w-4 mr-1" /> 下载 TXT（仅邮箱）
            </button>
            <button onClick={downloadTxtWithName} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center" title="下载 TXT（用户名,邮箱）">
              <Download className="h-4 w-4 mr-1" /> 下载 TXT（用户名,邮箱）
            </button>
            <button onClick={fetchEmails} className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center text-gray-700">
              <RefreshCw className="h-4 w-4 mr-1" /> 刷新
            </button>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-600">独立邮箱</p>
            <p className="text-2xl font-bold text-gray-900">{totalUnique}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-600">今日活跃邮箱</p>
            <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-600">下载格式</p>
            <p className="text-sm text-gray-900">CSV（用户名,邮箱） / TXT（仅邮箱 或 用户名,邮箱）</p>
          </div>
        </div>

        {/* 搜索与列表 */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索邮箱或姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <span className="text-sm text-gray-500">共 {filtered.length} 个邮箱</span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">暂无邮箱</p>
              </div>
            ) : (
              filtered.map((e) => (
                <div key={e.email} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.email}</p>
                    <p className="text-xs text-gray-500 mt-1">姓名：{e.name || '-'} ｜ 数量：{e.count} ｜ 最早：{formatDate(e.firstSeen)} ｜ 最近：{formatDate(e.lastSeen)}</p>
                  </div>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText(toNameEmailLine(e)); alert('已复制（用户名,邮箱）') } catch { alert('复制失败') } }}
                    className="text-blue-600 hover:text-blue-700 flex items-center"
                    title="复制（用户名+邮箱）"
                  >
                    <Copy className="h-4 w-4 mr-1" /> 复制
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
