'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Save, Home, Type, Star, Shield, Zap, ArrowLeft, CheckCircle } from 'lucide-react'

interface HomeContent {
  id: string
  featuredTitle: string
  featuredSubtitle: string
  whyChooseTitle: string
  whyChooseSubtitle: string
  feature1Title: string
  feature1Description: string
  feature2Title: string
  feature2Description: string
  feature3Title: string
  feature3Description: string
}

export default function HomeContentPage() {
  const [content, setContent] = useState<HomeContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      const response = await fetch('/api/home-content')
      if (response.ok) {
        const data = await response.json()
        setContent(data)
      }
    } catch (error) {
      console.error('Failed to fetch content:', error)
      setMessage('获取内容失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content) return

    setSaving(true)
    setMessage('')

    try {
      console.log('开始保存，数据:', content)
      
      const response = await fetch('/api/home-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      })

      console.log('响应状态:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('保存成功，返回数据:', result)
        // 改为弹窗提示，与其他版块一致
        alert('首页内容保存成功！')
        // 成功后不再展示顶部绿色提示
        setMessage('')
      } else {
        const error = await response.json()
        console.error('保存失败，错误:', error)
        setMessage(`保存失败: ${error.error}`)
      }
    } catch (error) {
      console.error('保存过程中发生错误:', error)
      setMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      console.log('保存操作完成')
      setSaving(false)
    }
  }

  const handleChange = (field: keyof HomeContent, value: string) => {
    if (!content) return
    setContent({ ...content, [field]: value })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">无法加载内容</p>
        </div>
      </div>
    )
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
              <Home className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">首页内容管理</span>
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

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 页面说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <Type className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">首页内容管理</h3>
              <p className="text-sm text-blue-700 mt-1">
                编辑首页的标题、描述和特色功能内容。更改将立即应用到前台网站。
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg transition-all duration-300 ${
            message.includes('成功') 
              ? 'bg-green-50 text-green-800 border border-green-200 shadow-lg' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              {message.includes('成功') && (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 animate-pulse" />
              )}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Featured Products Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Type className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">精选产品区块</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主标题
                </label>
                <input
                  type="text"
                  value={content.featuredTitle}
                  onChange={(e) => handleChange('featuredTitle', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如: Featured Products"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  副标题描述
                </label>
                <textarea
                  value={content.featuredSubtitle}
                  onChange={(e) => handleChange('featuredSubtitle', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如: Discover our carefully curated collection..."
                />
              </div>
            </div>
          </div>

          {/* Why Choose Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Star className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">为什么选择我们区块</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主标题
                </label>
                <input
                  type="text"
                  value={content.whyChooseTitle}
                  onChange={(e) => handleChange('whyChooseTitle', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如: Why Choose Your Brand"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  副标题描述
                </label>
                <textarea
                  value={content.whyChooseSubtitle}
                  onChange={(e) => handleChange('whyChooseSubtitle', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如: We're redefining the shopping experience..."
                />
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">特色功能卡片</h2>
            
            <div className="space-y-6">
              {/* Feature 1 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-medium text-gray-900">功能卡片 1</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标题
                    </label>
                    <input
                      type="text"
                      value={content.feature1Title}
                      onChange={(e) => handleChange('feature1Title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Premium Quality"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={content.feature1Description}
                      onChange={(e) => handleChange('feature1Description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Every product undergoes rigorous quality testing..."
                    />
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">功能卡片 2</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标题
                    </label>
                    <input
                      type="text"
                      value={content.feature2Title}
                      onChange={(e) => handleChange('feature2Title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Secure & Trusted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={content.feature2Description}
                      onChange={(e) => handleChange('feature2Description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Advanced security measures protect your data..."
                    />
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Zap className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-medium text-gray-900">功能卡片 3</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标题
                    </label>
                    <input
                      type="text"
                      value={content.feature3Title}
                      onChange={(e) => handleChange('feature3Title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Lightning Fast"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={content.feature3Description}
                      onChange={(e) => handleChange('feature3Description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Optimized delivery network ensures your orders..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? '保存中...' : '保存更改'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}