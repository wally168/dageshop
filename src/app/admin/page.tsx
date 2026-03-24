'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, 
  Navigation as NavIcon, 
  Settings, 
  MessageSquare, 
  BarChart3, 
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCcw,
  Home,
  HelpCircle,
  X,
  Tag,
  Images,
  Database
} from 'lucide-react'
import { useSettings } from '@/lib/settings'

interface Product {
  id: string
  name: string
  price: number
  featured: boolean
  inStock: boolean
  createdAt: string
}

interface Message {
  id: string
  name: string
  email: string
  subject: string
  message: string
  createdAt: string
  read: boolean
}

export default function AdminDashboard() {
  const { settings } = useSettings()
  const [products, setProducts] = useState<Product[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [latestMessages, setLatestMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, messagesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/messages')
      ])
      
      const productsData = await productsRes.json()
      const messagesData = await messagesRes.json()
      
      const safeProducts = Array.isArray(productsData) ? productsData : []
      const safeMessages = Array.isArray(messagesData) ? messagesData : []
      
      setProducts(safeProducts)
      setMessages(safeMessages)
      setLatestMessages(safeMessages.slice(0, 5))
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/login'
  }
  const deleteProduct = async (id: string) => {
    if (!confirm('确定要删除这个产品吗？')) return
    
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' })
      setProducts(products.filter(p => p.id !== id))
    } catch (error) {
      console.error('删除产品失败:', error)
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{settings.siteName} 管理后台</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                 href="/admin"
                 className="text-gray-600 hover:text-blue-600 transition-colors"
               >
                 返回控制台
               </Link>
               <Link
                 href="/admin/change-password"
                 className="text-gray-600 hover:text-blue-600 transition-colors"
               >
                 修改密码
               </Link>
               <button
                 onClick={() => setShowGuide(true)}
                 className="text-gray-600 hover:text-blue-600 transition-colors"
                 title="使用说明"
               >
                 <HelpCircle className="h-5 w-5" />
               </button>
               <button
                 onClick={handleLogout}
                 className="text-gray-600 hover:text-red-600 transition-colors"
               >
                 退出登录
               </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600 mt-2">管理您的电商网站内容和设置</p>
        </div>

        {/* 快捷操作卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <QuickActionCard
            icon={<Package className="h-6 w-6" />}
            title="产品管理"
            description="添加、编辑和管理产品"
            href="/admin/products"
            color="bg-blue-500"
          />
          <QuickActionCard
            icon={<Tag className="h-6 w-6" />}
            title="分类与品牌"
            description="管理产品分类和品牌"
            href="/admin/categories"
            color="bg-teal-500"
          />
          <QuickActionCard
            icon={<NavIcon className="h-6 w-6" />}
            title="导航管理"
            description="编辑网站导航菜单"
            href="/admin/navigation"
            color="bg-green-500"
          />
          <QuickActionCard
            icon={<Home className="h-6 w-6" />}
            title="首页内容"
            description="编辑首页文字内容"
            href="/admin/home-content"
            color="bg-indigo-500"
          />
          <QuickActionCard
            icon={<Images className="h-6 w-6" />}
            title="轮播图管理"
            description="管理首页轮播图片"
            href="/admin/carousel"
            color="bg-cyan-500"
          />
          <QuickActionCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="留言管理"
            description="查看和回复用户留言"
            href="/admin/messages"
            color="bg-purple-500"
          />
          <QuickActionCard
            icon={<Settings className="h-6 w-6" />}
            title="网站设置"
            description="配置网站基本信息"
            href="/admin/settings"
            color="bg-orange-500"
          />
          <QuickActionCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="统计代码"
            description="管理第三方统计脚本"
            href="/admin/analytics"
            color="bg-pink-500"
          />
          <QuickActionCard
            icon={<Settings className="h-6 w-6" />}
            title="SEO 设置"
            description="配置 Sitemap、robots 与站点验证"
            href="/admin/seo"
            color="bg-slate-500"
          />
          <QuickActionCard
            icon={<RefreshCcw className="h-6 w-6" />}
            title="重置数据"
            description="清空并预设站点数据"
            href="/admin/reset"
            color="bg-red-500"
          />
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="总产品数"
            value={products.length.toString()}
            icon={<Package className="h-8 w-8 text-blue-600" />}
          />
          <StatCard
            title="新留言"
            value={messages.filter(m => !m.read).length.toString()}
            icon={<MessageSquare className="h-8 w-8 text-green-600" />}
          />
          <StatCard
            title="在售产品"
            value={products.filter(p => p.inStock).length.toString()}
            icon={<BarChart3 className="h-8 w-8 text-purple-600" />}
          />
        </div>

        {/* 最新产品和留言 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 最新产品 */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">最新产品</h2>
                <Link
                  href="/admin/products"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  查看全部
                </Link>
              </div>
            </div>
            <div className="p-6">
              {products.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无产品</p>
              ) : (
                <div className="space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">${product.price}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.inStock 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.inStock ? '有库存' : '缺货'}
                        </span>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 最新留言 */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">最新留言</h2>
                <Link
                  href="/admin/messages"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  查看全部
                </Link>
              </div>
            </div>
            <div className="p-6">
              {latestMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无留言</p>
              ) : (
                <div className="space-y-4">
                  {latestMessages.map((message) => (
                    <div key={message.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{message.name}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{message.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{message.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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

                {/* 邮箱管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">邮箱管理</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 入口：后台 → 邮箱管理（或消息列表右上角“邮箱管理”）</li>
                      <li>• 搜索：支持邮箱与姓名关键字</li>
                      <li>• 复制全部：复制当前筛选结果为“用户名,邮箱”，可直接粘贴到表格</li>
                      <li>• 单条复制：逐项复制为“用户名,邮箱”</li>
                      <li>• 下载 CSV：两列“name,email”</li>
                      <li>• 下载 TXT（仅邮箱）：每行一个邮箱</li>
                      <li>• 下载 TXT（用户名,邮箱）：每行“用户名,邮箱”</li>
                      <li>• 接口：/api/emails?format=json | csv | txt | txt_with_name</li>
                    </ul>
                  </div>
                </section>

                {/* 前台功能说明 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">前台功能说明</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 导航栏提供产品搜索（桌面与移动端）</li>
                      <li>• Products 菜单下拉显示启用分类，含“全部产品”入口</li>
                      <li>• 产品列表支持按分类筛选与关键词搜索</li>
                      <li>• 产品列表显示平均评分与评论数（实心星星）</li>
                      <li>• 支持加入购物车与跳转亚马逊购买</li>
                      <li>• 站点地图：访问 <code className="px-1 py-0.5 bg-gray-100 rounded">/sitemap.xml</code></li>
                    </ul>
                  </div>
                </section>

                {/* 评论管理说明 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">评论管理说明</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 入口：后台 → 产品 → 编辑 → 评论</li>
                      <li>• 可添加/编辑评论，设置是否显示在前台</li>
                      <li>• 支持星级评分（1–5）与图片上传</li>
                      <li>• 前台自动聚合平均评分与评论数量</li>
                    </ul>
                  </div>
                </section>

                {/* 轮播图与 SEO/统计 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">轮播图与 SEO/统计</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 轮播图管理：设置图片、链接、是否新窗口，支持拖拽排序</li>
                      <li>• SEO 设置：配置 Sitemap 与 Robots，控制是否包含产品/分类</li>
                      <li>• 统计代码：支持 Head/Body/Google 代码注入，前台自动加载</li>
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

function QuickActionCard({ 
  icon, 
  title, 
  description, 
  href, 
  color 
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  color: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  )
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend 
}: {
  title: string
  value: string
  icon: React.ReactNode
  trend?: string
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && <p className="text-sm text-green-600 mt-1">{trend}</p>}
        </div>
        <div className="opacity-80">
          {icon}
        </div>
      </div>
    </div>
  )
}
