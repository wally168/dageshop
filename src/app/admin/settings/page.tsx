'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Settings, 
  Save, 
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Trash2,
  Video,
  Loader2
} from 'lucide-react'

interface SiteSettings {
  siteName: string
  logoUrl: string
  logoWidth: string
  logoHeight: string
  siteDescription: string
  siteKeywords: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  messageForwardEmail: string
  messageForwardEnabled: string
  socialFacebook: string
  socialFacebookTitle: string
  socialTwitter: string
  socialTwitterTitle: string
  socialInstagram: string
  socialInstagramTitle: string
  socialYoutube: string
  socialYoutubeTitle: string
  socialTiktok: string
  socialTiktokTitle: string
  footerText: string
  aboutText: string
  ourStory: string
  ourMission: string
  whyChooseUs: string
  privacyPolicy: string
  termsOfService: string
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: '',
    logoUrl: '',
    logoWidth: '',
    logoHeight: '',
    siteDescription: '',
    siteKeywords: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    messageForwardEmail: '',
    messageForwardEnabled: 'false',
    socialFacebook: '',
    socialFacebookTitle: '',
    socialTwitter: '',
    socialTwitterTitle: '',
    socialInstagram: '',
    socialInstagramTitle: '',
    socialYoutube: '',
    socialYoutubeTitle: '',
    socialTiktok: '',
    socialTiktokTitle: '',
    footerText: '',
    aboutText: '',
    ourStory: '',
    ourMission: '',
    whyChooseUs: '',
    privacyPolicy: '',
    termsOfService: ''
  })

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('获取设置失败:', error)
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
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        alert('设置保存成功！')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof SiteSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const url = (data?.url ?? '') as string
      if (url && typeof url === 'string') {
        const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
        // 添加时间戳防止缓存
        const urlWithTimestamp = `${finalUrl}?t=${Date.now()}`
        handleInputChange('logoUrl', urlWithTimestamp)
      } else {
        alert('上传成功，但未返回有效URL')
      }
    } catch (e) {
      console.error('Logo 上传失败:', e)
      alert('上传失败，请稍后重试')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteLogo = () => {
    if (confirm('确定要删除 Logo 吗？')) {
      handleInputChange('logoUrl', '')
    }
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Settings className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">网站设置</span>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">加载设置中...</span>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本信息 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <Globe className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  网站名称
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => handleInputChange('siteName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入网站名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo 图片地址（URL，可选）
                </label>
                <input
                  type="url"
                  value={settings.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-gray-500 mt-1">留空则使用默认购物袋图标</p>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">或上传本地 Logo</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadLogo(file)
                      }}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadingLogo && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">仅支持图片，最大 5MB。上传成功后将自动填充上方 URL。</p>
                  <p className="text-xs text-amber-600 mt-1">💡 建议尺寸：高度 64px-96px（Retina 屏更清晰，前台将自动缩放为 32px 显示），宽度建议不超过 200px。建议可以自定义尺寸，来找到最佳显示效果。</p>

                  {settings.logoUrl && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="block text-sm text-gray-700">当前 Logo 预览</span>
                        <button
                          type="button"
                          onClick={handleDeleteLogo}
                          className="text-sm text-red-600 hover:text-red-800 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除 Logo
                        </button>
                      </div>
                      <div className="aspect-square w-24 overflow-hidden rounded-lg border bg-gray-100 flex items-center justify-center">
                        <img src={settings.logoUrl} alt="Site logo" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo 宽度 (例如: 180px 或 auto)
                    </label>
                    <input
                      type="text"
                      value={settings.logoWidth || ''}
                      onChange={(e) => handleInputChange('logoWidth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="建议: 不超过 200px"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo 高度 (例如: 55px 或 auto)
                    </label>
                    <input
                      type="text"
                      value={settings.logoHeight || ''}
                      onChange={(e) => handleInputChange('logoHeight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="默认: 32px"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  网站描述
                </label>
                <textarea
                  rows={3}
                  value={settings.siteDescription}
                  onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入网站描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关键词 (用逗号分隔)
                </label>
                <input
                  type="text"
                  value={settings.siteKeywords}
                  onChange={(e) => handleInputChange('siteKeywords', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="关键词1,关键词2,关键词3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关于我们文本
                </label>
                <textarea
                  rows={4}
                  value={settings.aboutText}
                  onChange={(e) => handleInputChange('aboutText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入关于我们的描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  我们的故事 (Our Story)
                </label>
                <textarea
                  rows={5}
                  value={settings.ourStory}
                  onChange={(e) => handleInputChange('ourStory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入我们的故事内容"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  我们的使命 (Our Mission)
                </label>
                <textarea
                  rows={4}
                  value={settings.ourMission}
                  onChange={(e) => handleInputChange('ourMission', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入我们的使命内容"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  为什么选择我们 (Why Choose Us)
                </label>
                <textarea
                  rows={6}
                  value={settings.whyChooseUs}
                  onChange={(e) => handleInputChange('whyChooseUs', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入选择我们的理由，每行一个要点"
                />
                <p className="text-sm text-gray-500 mt-1">
                  提示：每行输入一个要点，系统会自动格式化为列表
                </p>
              </div>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <Mail className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">联系信息</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系邮箱
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@example.com"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系电话
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={settings.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+86 400-123-4567"
                  />
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系地址
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.contactAddress}
                    onChange={(e) => handleInputChange('contactAddress', e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入联系地址"
                  />
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* 社交媒体 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-6">
              <Facebook className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">社交媒体</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facebook */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.socialFacebookTitle}
                    onChange={(e) => handleInputChange('socialFacebookTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="显示标题 (默认: Facebook)"
                  />
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.socialFacebook}
                      onChange={(e) => handleInputChange('socialFacebook', e.target.value)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://facebook.com/yourpage"
                    />
                    <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Twitter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.socialTwitterTitle}
                    onChange={(e) => handleInputChange('socialTwitterTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="显示标题 (默认: Twitter)"
                  />
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.socialTwitter}
                      onChange={(e) => handleInputChange('socialTwitter', e.target.value)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://twitter.com/yourhandle"
                    />
                    <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.socialInstagramTitle}
                    onChange={(e) => handleInputChange('socialInstagramTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="显示标题 (默认: Instagram)"
                  />
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.socialInstagram}
                      onChange={(e) => handleInputChange('socialInstagram', e.target.value)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://instagram.com/yourhandle"
                    />
                    <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.socialYoutubeTitle}
                    onChange={(e) => handleInputChange('socialYoutubeTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="显示标题 (默认: YouTube)"
                  />
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.socialYoutube}
                      onChange={(e) => handleInputChange('socialYoutube', e.target.value)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://youtube.com/yourchannel"
                    />
                    <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* TikTok */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TikTok
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.socialTiktokTitle}
                    onChange={(e) => handleInputChange('socialTiktokTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="显示标题 (默认: TikTok)"
                  />
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.socialTiktok}
                      onChange={(e) => handleInputChange('socialTiktok', e.target.value)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://tiktok.com/@yourhandle"
                    />
                    <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 页脚设置 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">页脚设置</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版权信息
              </label>
              <input
                type="text"
                value={settings.footerText}
                onChange={(e) => handleInputChange('footerText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="© 2025 Your Company. All rights reserved."
              />
            </div>
          </div>

          

          {/* 法律与政策 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">法律与政策</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  隐私政策 (Privacy Policy)
                </label>
                <textarea
                  rows={8}
                  value={settings.privacyPolicy}
                  onChange={(e) => handleInputChange('privacyPolicy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="填写隐私政策内容，支持多行文本"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  服务条款 (Terms of Service)
                </label>
                <textarea
                  rows={8}
                  value={settings.termsOfService}
                  onChange={(e) => handleInputChange('termsOfService', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="填写服务条款内容，支持多行文本"
                />
              </div>
            </div>
          </div>



          {/* 提交按钮 */}
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
