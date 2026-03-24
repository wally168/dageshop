'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, HelpCircle, X } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || '登录失败')
      }
      window.location.href = '/admin'
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8">
        <div className="flex items-center justify-center mb-6">
          <Lock className="h-8 w-8 text-blue-600" />
          <h1 className="ml-2 text-xl font-semibold text-gray-900">管理后台登录</h1>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? '正在登录...' : '登录'}
          </button>
        </form>

        {/* 已移除默认管理员账号密码提示，避免暴露敏感信息 */}

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">返回首页</Link>
        </div>

        {/* 使用说明链接 */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowGuide(true)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
          >
            <HelpCircle size={16} className="mr-1" />
            系统使用说明
          </button>
        </div>
      </div>

      {/* 使用说明弹窗 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">系统使用说明</h2>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* 系统概述 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">系统概述</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">
                      这是一个完整的电商管理系统，包含前台展示和后台管理功能。系统支持产品展示、用户管理、内容编辑等核心功能。
                    </p>
                  </div>
                </section>

                {/* 登录说明 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">登录说明</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">管理员账号</h4>
                        <p className="text-gray-600 text-sm">使用管理员账号登录后台管理系统</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">密码安全</h4>
                        <p className="text-gray-600 text-sm">请妥善保管登录密码，定期更换以确保安全</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">忘记密码</h4>
                        <p className="text-gray-600 text-sm">如忘记密码，请联系系统管理员重置</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 后台管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">后台管理功能</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">产品管理</h4>
                        <p className="text-gray-600 text-sm">添加、编辑、删除产品信息，设置产品图片和描述</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">导航设置</h4>
                        <p className="text-gray-600 text-sm">自定义网站导航菜单，调整菜单顺序和链接</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">首页内容</h4>
                        <p className="text-gray-600 text-sm">编辑首页展示内容，包括标题、描述和特色产品</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">系统设置</h4>
                        <p className="text-gray-600 text-sm">配置网站名称、描述、关键词等基本信息</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 前台功能 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">前台功能</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 导航栏支持产品搜索（桌面与移动端）</li>
                      <li>• Products 菜单下拉显示启用分类，含“全部产品”入口</li>
                      <li>• 产品页支持按分类筛选与关键词搜索</li>
                      <li>• 产品列表显示平均评分与评论数（实心星星样式）</li>
                      <li>• 支持“加入购物车”和“跳转亚马逊购买”</li>
                      <li>• 站点地图：访问 <code className="px-1 py-0.5 bg-gray-100 rounded">/sitemap.xml</code></li>
                    </ul>
                  </div>
                </section>

                {/* 评论管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">评论管理</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 入口：后台 → 产品 → 编辑 → 评论</li>
                      <li>• 添加/编辑评论，设置是否显示在前台（可见性）</li>
                      <li>• 支持星级评分（1–5）与多图上传</li>
                      <li>• 前台自动聚合平均评分与评论数量</li>
                    </ul>
                  </div>
                </section>

                {/* 轮播图管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">轮播图管理</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 入口：后台 → 轮播图管理</li>
                      <li>• 可设置图片、链接、是否新窗口打开</li>
                      <li>• 支持拖拽排序，自动保存顺序</li>
                    </ul>
                  </div>
                </section>

                {/* SEO 与统计 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">SEO 与统计</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• SEO 设置：后台 → SEO 设置，可配置 Sitemap 与 Robots</li>
                      <li>• 统计代码：后台 → 统计代码，支持 Head/Body/Google 代码注入</li>
                      <li>• 变更即时生效，无需重新部署</li>
                    </ul>
                  </div>
                </section>

                {/* 邮箱与留言管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">邮箱与留言管理</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 邮箱管理：支持搜索、复制与 CSV/TXT 下载，接口见 <code className="px-1 py-0.5 bg-gray-100 rounded">/api/emails</code></li>
                      <li>• 留言管理：查看、搜索、删除用户留言</li>
                    </ul>
                  </div>
                </section>

                {/* 技术支持 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">技术支持</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">如遇问题或需要帮助，请联系：</p>
                    <p className="text-sm font-medium text-blue-600">作者：達哥</p>
                    <p className="text-sm text-blue-600">WeChat: DAGEUP6688</p>
                  </div>
                </section>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
