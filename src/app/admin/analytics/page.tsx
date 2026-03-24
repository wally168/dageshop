'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, ArrowLeft, Save, Loader2 } from 'lucide-react'

interface AnalyticsSettings {
  analyticsHeadHtml: string
  analyticsBodyHtml: string
  analyticsGoogleHtml: string
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AnalyticsSettings>({
    analyticsHeadHtml: '',
    analyticsBodyHtml: '',
    analyticsGoogleHtml: ''
  })

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings({
            analyticsHeadHtml: data.analyticsHeadHtml || '',
            analyticsBodyHtml: data.analyticsBodyHtml || '',
            analyticsGoogleHtml: data.analyticsGoogleHtml || ''
          })
        }
      } catch (e) {
        console.error('获取统计代码失败:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analyticsHeadHtml: settings.analyticsHeadHtml,
          analyticsBodyHtml: settings.analyticsBodyHtml,
          analyticsGoogleHtml: settings.analyticsGoogleHtml
        })
      })
      if (res.ok) {
        alert('统计代码已保存！')
      } else {
        throw new Error('保存失败')
      }
    } catch (e) {
      console.error('保存统计代码失败:', e)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
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
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">统计代码</span>
            </div>
            <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition-colors">
              返回控制台
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">加载设置中...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">第三方统计代码</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HEAD 区域注入</label>
                  <textarea
                    rows={6}
                    value={settings.analyticsHeadHtml}
                    onChange={(e) => setSettings(s => ({ ...s, analyticsHeadHtml: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="粘贴百度统计、Google Analytics 等代码片段"
                  />
                  <p className="text-xs text-gray-500 mt-1">支持完整标签片段，保存后自动全站生效。</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Google 统计代码</label>
                  <textarea
                    rows={6}
                    value={settings.analyticsGoogleHtml}
                    onChange={(e) => setSettings(s => ({ ...s, analyticsGoogleHtml: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="粘贴 Google Analytics/Tag Manager 代码片段"
                  />
                  <p className="text-xs text-gray-500 mt-1">建议与 HEAD 注入同时使用，以便尽早加载。</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BODY 底部注入</label>
                  <textarea
                    rows={6}
                    value={settings.analyticsBodyHtml}
                    onChange={(e) => setSettings(s => ({ ...s, analyticsBodyHtml: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="部分平台建议在页面底部插入的代码"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <Link
                href="/admin"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

