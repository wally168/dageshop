'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Navigation as NavIcon, 
  Save, 
  Plus, 
  X, 
  ArrowLeft,
  Menu,
  ExternalLink,
  Home,
  Package,
  Info,
  Mail,
  Loader2
} from 'lucide-react'
import { useSettings } from '@/lib/settings'

interface NavItem {
  id: string
  label: string
  href: string
  order: number
  isExternal: boolean
  active: boolean
}

export default function NavigationPage() {
  const { settings } = useSettings()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [navItems, setNavItems] = useState<NavItem[]>([
    { id: '1', label: 'Home', href: '/', order: 1, isExternal: false, active: true },
    { id: '2', label: 'Products', href: '/products', order: 2, isExternal: false, active: true },
    { id: '3', label: 'About', href: '/about', order: 3, isExternal: false, active: true },
    { id: '4', label: 'Contact', href: '/contact', order: 4, isExternal: false, active: true },
  ])

  // 新增：进入页面拉取已有导航数据
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/navigation?includeInactive=true', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length) {
            // 保障排序与结构
            const normalized = data
              .map((i: any) => ({
                id: String(i.id),
                label: String(i.label || ''),
                href: String(i.href || ''),
                order: Number(i.order || 0),
                isExternal: Boolean(i.isExternal) || false,
                active: Boolean(i.active ?? true),
              }))
              .sort((a, b) => a.order - b.order)
              .map((item, idx) => ({ ...item, order: idx + 1 }))
            setNavItems(normalized)
          }
        }
      } catch (e) {
        console.error('加载导航失败:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // 基础校验：label/href 不可为空，order 为数字
      const cleaned = navItems
        .map((item) => ({
          id: String(item.id).trim(),
          label: String(item.label).trim(),
          href: String(item.href).trim(),
          order: Number(item.order),
          active: Boolean(item.active),
        }))
        .filter((item) => item.label && item.href)
        .sort((a, b) => a.order - b.order)
        .map((item, idx) => ({ ...item, order: idx + 1 }))

      if (!cleaned.length) {
        alert('请至少保留一个有效的导航项（名称与链接不能为空）')
        return
      }

      const res = await fetch('/api/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleaned }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || '保存失败')
      }

      // 保存成功，刷新一次列表以确保前后台一致
      try {
        const refresh = await fetch('/api/navigation', { cache: 'no-store' })
        if (refresh.ok) {
          const data = await refresh.json()
          if (Array.isArray(data)) {
            const normalized = data
              .map((i: any) => ({
                id: String(i.id),
                label: String(i.label || ''),
                href: String(i.href || ''),
                order: Number(i.order || 0),
                isExternal: Boolean(i.isExternal) || false,
                active: Boolean(i.active ?? true),
              }))
              .sort((a, b) => a.order - b.order)
              .map((item, idx) => ({ ...item, order: idx + 1 }))
            setNavItems(normalized)
          }
        }
      } catch {}

      alert('导航设置保存成功！')
    } catch (error) {
      console.error('保存导航设置失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const addNavItem = () => {
    const newItem: NavItem = {
      id: Date.now().toString(),
      label: '',
      href: '',
      order: navItems.length + 1,
      isExternal: false,
      active: true
    }
    setNavItems([...navItems, newItem])
  }

  const removeNavItem = (id: string) => {
    setNavItems(navItems.filter(item => item.id !== id))
  }

  const updateNavItem = (id: string, field: keyof NavItem, value: string | boolean | number) => {
    setNavItems(navItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const moveNavItem = (id: string, direction: 'up' | 'down') => {
    const currentIndex = navItems.findIndex(item => item.id === id)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === navItems.length - 1)
    ) {
      return
    }

    const newItems = [...navItems]
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // 交换位置
    const temp = newItems[currentIndex]
    newItems[currentIndex] = newItems[targetIndex]
    newItems[targetIndex] = temp
    
    // 更新order
    newItems.forEach((item, index) => {
      item.order = index + 1
    })

    setNavItems(newItems)
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
              <NavIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">导航管理</span>
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
        {/* 页面说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <Menu className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">导航菜单管理</h3>
              <p className="text-sm text-blue-700 mt-1">
                在这里可以添加、编辑和排序网站的主导航菜单项。更改将立即应用到前台网站。
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 导航项列表 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">导航菜单项</h2>
              <button
                type="button"
                onClick={addNavItem}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                disabled={loading || saving}
              >
                <Plus className="h-4 w-4 mr-2" /> 添加菜单项
              </button>
            </div>

            {navItems
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">名称</label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateNavItem(item.id, 'label', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="例如：首页"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700">链接</label>
                    <input
                      type="text"
                      value={item.href}
                      onChange={(e) => updateNavItem(item.id, 'href', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="例如：/products 或 https://example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">排序</label>
                    <input
                      type="number"
                      min={1}
                      value={item.order}
                      onChange={(e) => updateNavItem(item.id, 'order', Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">启用</label>
                    <div className="mt-2">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateNavItem(item.id, 'active', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-end space-x-2">
                    <button
                      type="button"
                      onClick={() => moveNavItem(item.id, 'up')}
                      className="px-2 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >↑</button>
                    <button
                      type="button"
                      onClick={() => moveNavItem(item.id, 'down')}
                      className="px-2 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >↓</button>
                    <button
                      type="button"
                      onClick={() => removeNavItem(item.id)}
                      className="px-2 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  正在保存...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存更改
                </>
              )}
            </button>
          </div>

          {/* 预览 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">导航预览</h2>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-6">
                <div className="font-semibold text-gray-900">{settings.siteName}</div>
                <nav className="flex space-x-6">
                  {navItems
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`${item.active ? 'text-gray-700' : 'text-gray-400 line-through'} hover:text-blue-600 cursor-pointer`}
                        title={`${item.label} → ${item.href}`}
                      >
                        {item.label || '(未命名)'}
                      </div>
                    ))}
                </nav>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}