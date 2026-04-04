"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus, Tag, ArrowLeft, Trash2, Edit3, Layers } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
}

interface Brand {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
}

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories')
  
  // Categories State
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  // Brands State
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [brandError, setBrandError] = useState<string | null>(null)
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null)
  
  // Brand Form State (Simple inline or modal simulation)
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')

  useEffect(() => {
    loadCategories()
    if (activeTab === 'brands') {
      loadBrands()
    }
  }, [activeTab])

  const loadCategories = async () => {
    setLoadingCategories(true)
    setCategoryError(null)
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      if (!res.ok) throw new Error('加载分类失败')
      const data = await res.json()
      setCategories(data)
    } catch (e: any) {
      setCategoryError(e.message || '加载分类失败')
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadBrands = async () => {
    setLoadingBrands(true)
    setBrandError(null)
    try {
      const res = await fetch('/api/brands', { cache: 'no-store' })
      if (!res.ok) throw new Error('加载品牌失败')
      const data = await res.json()
      setBrands(data)
    } catch (e: any) {
      setBrandError(e.message || '加载品牌失败')
    } finally {
      setLoadingBrands(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除该分类吗？如果该分类下存在产品，将无法删除。')) return
    setDeletingCategoryId(id)
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '删除分类失败')
      }
      await loadCategories()
    } catch (e: any) {
      alert(e.message || '删除失败')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('确定要删除该品牌吗？')) return
    setDeletingBrandId(id)
    try {
      const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '删除品牌失败')
      }
      await loadBrands()
    } catch (e: any) {
      alert(e.message || '删除失败')
    } finally {
      setDeletingBrandId(null)
    }
  }

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBrandName.trim()) return

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      setNewBrandName('')
      setIsAddingBrand(false)
      loadBrands()
    } catch (e: any) {
      alert(e.message)
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
              <Tag className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">分类与品牌管理</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab === 'categories' ? '分类管理' : '品牌管理'}
            </h1>
            <p className="text-gray-600 mt-2">
              {activeTab === 'categories' ? '添加、编辑和删除产品分类' : '管理产品品牌信息'}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex gap-2">
             {activeTab === 'categories' ? (
                <Link
                  href="/admin/categories/new"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  添加分类
                </Link>
             ) : (
                <button
                  onClick={() => setIsAddingBrand(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  添加品牌
                </button>
             )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('categories')}
              className={`${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Layers className="w-4 h-4 mr-2" />
              分类列表
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`${
                activeTab === 'brands'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Tag className="w-4 h-4 mr-2" />
              品牌列表
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          {activeTab === 'categories' && (
            <>
              {loadingCategories ? (
                <p className="text-gray-600">加载中...</p>
              ) : categoryError ? (
                <p className="text-red-600">{categoryError}</p>
              ) : categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">暂无分类，请先添加或执行数据恢复。</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{c.slug}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <Link
                              href={`/admin/categories/${c.id}/edit`}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              <Edit3 className="h-4 w-4 mr-1" /> 编辑
                            </Link>
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              disabled={deletingCategoryId === c.id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> {deletingCategoryId === c.id ? '删除中...' : '删除'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'brands' && (
            <>
              {isAddingBrand && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                   <h3 className="text-sm font-medium text-gray-900 mb-3">快速添加品牌</h3>
                   <form onSubmit={handleCreateBrand} className="flex gap-4">
                     <input 
                       type="text" 
                       value={newBrandName}
                       onChange={e => setNewBrandName(e.target.value)}
                       placeholder="输入品牌名称"
                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                       autoFocus
                     />
                     <button 
                       type="submit"
                       className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                     >
                       保存
                     </button>
                     <button 
                       type="button"
                       onClick={() => setIsAddingBrand(false)}
                       className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                     >
                       取消
                     </button>
                   </form>
                </div>
              )}

              {loadingBrands ? (
                <p className="text-gray-600">加载中...</p>
              ) : brandError ? (
                <p className="text-red-600">{brandError}</p>
              ) : brands.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">暂无品牌，请点击右上角添加。</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品牌名称</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {brands.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{b.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{b.slug}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <button
                              onClick={() => handleDeleteBrand(b.id)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              disabled={deletingBrandId === b.id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> {deletingBrandId === b.id ? '删除中...' : '删除'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
