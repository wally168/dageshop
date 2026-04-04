'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Globe, Shield, FileText, Save, ListTree, CheckCircle } from 'lucide-react'
import { useSettings } from '@/lib/settings'

type S = Record<string, string>

export default function SeoSettingsPage() {
  const { settings } = useSettings()
  const [data, setData] = useState<S>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const json = await res.json()
        setData(json)
      } catch {}
      setLoading(false)
    }
    init()
  }, [])

  const set = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }))
  const setBool = (key: string, v: boolean) => set(key, v ? 'true' : 'false')

  const robotsPreview = () => {
    const lines: string[] = ['User-agent: *']
    if (data.robotsAllowAll === 'true') lines.push('Allow: /')
    if (data.robotsDisallowAdmin === 'true') lines.push('Disallow: /admin')
    if (data.robotsDisallowApi === 'true') lines.push('Disallow: /api')
    if (data.robotsDisallowCart === 'true') lines.push('Disallow: /cart')
    if (data.robotsDisallowCheckout === 'true') lines.push('Disallow: /checkout')
    if (data.robotsDisallowSearch === 'true') lines.push('Disallow: /search')
    const extra = (data.robotsExtraRules || '').trim()
    if (extra) lines.push(...extra.split(/\r?\n/).map(s => s.trim()).filter(Boolean))
    lines.push('Sitemap: [自动填充] /sitemap.xml')
    return lines.join('\n')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const payload: S = {
        seoTitle: data.seoTitle || '',
        seoKeywords: data.seoKeywords || '',
        seoDescription: data.seoDescription || '',
        seoSummary: data.seoSummary || '',
        sitemapEnabled: data.sitemapEnabled || 'true',
        sitemapChangefreq: data.sitemapChangefreq || 'daily',
        sitemapPriority: data.sitemapPriority || '0.7',
        sitemapIncludeProducts: data.sitemapIncludeProducts || 'true',
        sitemapIncludeCategories: data.sitemapIncludeCategories || 'true',
        robotsAllowAll: data.robotsAllowAll || 'true',
        robotsDisallowAdmin: data.robotsDisallowAdmin || 'true',
        robotsDisallowApi: data.robotsDisallowApi || 'true',
        robotsDisallowCart: data.robotsDisallowCart || 'true',
        robotsDisallowCheckout: data.robotsDisallowCheckout || 'true',
        robotsDisallowSearch: data.robotsDisallowSearch || 'true',
        robotsExtraRules: data.robotsExtraRules || '',
        googleSiteVerification: data.googleSiteVerification || '',
        baiduSiteVerification: data.baiduSiteVerification || '',
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('保存失败')
      setMessage('SEO 设置保存成功')
    } catch (e) {
      console.error('保存 SEO 设置失败:', e)
      setMessage('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载设置中...</p>
        </div>
      </div>
    )
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
              <Globe className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">SEO 设置</span>
            </div>
            <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition-colors">
              返回控制台
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('成功') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            <div className="flex items-center">
              {message.includes('成功') && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sitemap 管理 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <ListTree className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Sitemap 管理</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">启用 Sitemap</span>
                <button type="button" onClick={() => setBool('sitemapEnabled', !(data.sitemapEnabled === 'true'))} className={`relative inline-flex h-6 w-11 items-center rounded-full ${data.sitemapEnabled === 'true' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${data.sitemapEnabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`}></span>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">更新频率</label>
                <select value={data.sitemapChangefreq || 'daily'} onChange={(e) => set('sitemapChangefreq', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="always">always</option>
                  <option value="hourly">hourly</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                  <option value="never">never</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
                <input value={data.sitemapPriority || '0.7'} onChange={(e) => set('sitemapPriority', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <p className="text-xs text-gray-500 mt-1">
                  优先级用于向搜索引擎提示页面的重要程度，范围 0.0–1.0。
                  数值越高代表越重要，但搜索引擎仅作参考并不保证排序。
                  一般推荐：主页 0.8–1.0、列表页 0.6–0.8、详情页 0.5–0.8。
                  本系统默认值为 0.7。
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.sitemapIncludeProducts || 'true') === 'true'} onChange={(e) => setBool('sitemapIncludeProducts', e.target.checked)} />
                  包含产品
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.sitemapIncludeCategories || 'true') === 'true'} onChange={(e) => setBool('sitemapIncludeCategories', e.target.checked)} />
                  包含分类
                </label>
              </div>
              <div className="text-sm text-gray-600">访问 <code className="px-1 py-0.5 bg-gray-100 rounded">/sitemap.xml</code> 查看生成结果</div>
            </div>
          </div>

          {/* 站点元数据 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <FileText className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">站点元数据</h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标题（Title）</label>
                <input value={data.seoTitle || settings.siteName} onChange={(e) => set('seoTitle', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关键词（Keywords）</label>
                <input value={data.seoKeywords || settings.siteKeywords} onChange={(e) => set('seoKeywords', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">描述（Description）</label>
                <textarea rows={3} value={data.seoDescription || settings.siteDescription} onChange={(e) => set('seoDescription', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SEO 摘要</label>
                <textarea rows={3} value={data.seoSummary || ''} onChange={(e) => set('seoSummary', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="用于搜索引擎抓取的简短摘要，可选" />
              </div>
            </div>
          </div>

          {/* 机器人协议 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">爬虫协议（robots.txt）</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.robotsAllowAll || 'true') === 'true'} onChange={(e) => setBool('robotsAllowAll', e.target.checked)} />
                  允许抓取全部（Allow: /）
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.robotsDisallowAdmin || 'true') === 'true'} onChange={(e) => setBool('robotsDisallowAdmin', e.target.checked)} />
                  禁止抓取后台 (/admin)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.robotsDisallowApi || 'true') === 'true'} onChange={(e) => setBool('robotsDisallowApi', e.target.checked)} />
                  禁止抓取接口 (/api)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.robotsDisallowCart || 'true') === 'true'} onChange={(e) => setBool('robotsDisallowCart', e.target.checked)} />
                  禁止抓取购物车 (/cart)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.robotsDisallowCheckout || 'true') === 'true'} onChange={(e) => setBool('robotsDisallowCheckout', e.target.checked)} />
                  禁止抓取结算 (/checkout)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(data.robotsDisallowSearch || 'true') === 'true'} onChange={(e) => setBool('robotsDisallowSearch', e.target.checked)} />
                  禁止抓取搜索页 (/search)
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  说明：以上为电商站点常用的推荐设置，默认已选中。
                  允许抓取全部表示开放站点内容，其它选项用于避免搜索引擎收录后台、接口与交易流程页面。
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自定义规则（每行一条）</label>
                <textarea rows={6} value={data.robotsExtraRules || ''} onChange={(e) => set('robotsExtraRules', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="例如：\nDisallow: /private\nAllow: /public" />
                <p className="text-xs text-gray-500 mt-2">访问 <code className="px-1 py-0.5 bg-gray-100 rounded">/robots.txt</code> 查看最终效果</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">预览</label>
              <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-800 whitespace-pre-wrap">{robotsPreview()}</pre>
            </div>
          </div>

          {/* 网站验证 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <Globe className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">站点验证</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Google 验证（google-site-verification）</label>
                <input value={data.googleSiteVerification || ''} onChange={(e) => set('googleSiteVerification', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="粘贴 Google 提供的验证代码值" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Baidu 验证（baidu-site-verification）</label>
                <input value={data.baiduSiteVerification || ''} onChange={(e) => set('baiduSiteVerification', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="粘贴百度提供的验证代码值" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex items-center px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
