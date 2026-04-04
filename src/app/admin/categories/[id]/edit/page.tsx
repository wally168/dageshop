"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Tag, Save, Trash2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

interface CategoryDetail {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
}

export default function EditCategoryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [data, setData] = useState<CategoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('加载分类详情失败')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, slug: data.slug, description: data.description ?? null, image: data.image ?? null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '更新分类失败')
      }
      router.push('/admin/categories')
    } catch (e: any) {
      setError(e.message || '更新分类失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除该分类吗？如果该分类下存在产品，将无法删除。')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '删除分类失败')
      }
      router.push('/admin/categories')
    } catch (e: any) {
      alert(e.message || '删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/categories" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Tag className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">编辑分类</span>
            </div>
            <Link
              href="/admin/categories"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              返回分类管理
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border">加载中...</div>
        ) : error ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border text-red-600">{error}</div>
        ) : data ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名称 *</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
              <input
                type="text"
                value={data.slug}
                onChange={(e) => setData({ ...data, slug: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">唯一 URL 标识（如留空，保存时按名称自动生成）。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                value={data.description ?? ''}
                onChange={(e) => setData({ ...data, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">封面图 URL</label>
              <input
                type="text"
                value={data.image ?? ''}
                onChange={(e) => setData({ ...data, image: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-5 w-5 mr-2" /> 删除分类
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                <Save className="h-5 w-5 mr-2" /> {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border">未找到分类</div>
        )}
      </div>
    </div>
  )
}