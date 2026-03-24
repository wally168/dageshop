'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  ArrowLeft,
  Star,
  ExternalLink,
  Save,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Upload
} from 'lucide-react'
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  images?: string[]
  mainImage?: string
  bulletPoints: string
  longDescription: string
  descriptionImages: string
  amazonUrl: string
  categoryId?: string
  featured: boolean
  inStock: boolean
  sortOrder: number
  createdAt: string
  category?: {
    id: string
    name: string
  }
  brand?: string
  brandRelation?: {
    id: string
    name: string
  }
}

interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  product: Product
  selected: boolean
  onToggleSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  dragEnabled: boolean
  // Pass other handlers
  resolveImage: (p: any) => string
  toggleFeatured: (id: string, featured: boolean) => void
  toggleInStock: (id: string, inStock: boolean) => void
  deleteProduct: (id: string) => void
}

function SortableRow({
  product,
  selected,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragEnabled,
  resolveImage,
  toggleFeatured,
  toggleInStock,
  deleteProduct,
  ...props
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...props}
      className={`${props.className} ${isDragging ? 'bg-blue-50 shadow-lg' : 'hover:bg-gray-50'}`}
    >
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {dragEnabled ? (
          <div className="flex items-center gap-2">
            <button
              className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing p-1"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className={`text-gray-400 hover:text-blue-600 ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className={`text-gray-400 hover:text-blue-600 ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-gray-400 ml-1">{product.sortOrder}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">{product.sortOrder}</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12">
            <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={resolveImage(product)}
                alt={product.name}
                className="h-12 w-12 object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/96x96?text=No+Image' }}
              />
            </div>
          </div>
          <div className="ml-4">
            <div className="flex items-center">
              <div className="text-sm font-medium text-gray-900">
                {product.name}
              </div>
              {product.featured && (
                <Star className="h-4 w-4 text-yellow-400 ml-2" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 mb-1">
              {product.category?.name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {product.category.name}
                </span>
              )}
              {(product.brandRelation?.name || product.brand) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  {product.brandRelation?.name || product.brand}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {product.description}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">${product.price}</div>
        {product.originalPrice && (
          <div className="text-sm text-gray-500 line-through">
            ${product.originalPrice}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            product.inStock
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {product.inStock ? '已启用' : '已禁用'}
          </span>
          <label className="inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={product.inStock}
              onChange={() => toggleInStock(product.id, product.inStock)}
            />
            <span className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors relative">
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:left-6" />
            </span>
            <span className="ml-2 text-xs text-gray-600">启用</span>
          </label>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(product.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => toggleFeatured(product.id, product.featured)}
            className={`p-2 rounded-lg transition-colors ${
              product.featured
                ? 'text-yellow-600 hover:bg-yellow-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={product.featured ? '取消推荐' : '设为推荐'}
          >
            <Star className="h-4 w-4" />
          </button>
          <a
            href={product.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看亚马逊链接"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            onClick={() => deleteProduct(product.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFeatured, setFilterFeatured] = useState<boolean | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [hasOrderChanges, setHasOrderChanges] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over!.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, sortOrder: index }));
      });
      setHasOrderChanges(true);
    }
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    setProducts(items => {
      let newItems = [...items];
      if (direction === 'up' && index > 0) {
        newItems = arrayMove(newItems, index, index - 1);
      } else if (direction === 'down' && index < items.length - 1) {
        newItems = arrayMove(newItems, index, index + 1);
      } else {
        return items;
      }
      return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
    setHasOrderChanges(true);
  };

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
      setHasOrderChanges(false)
    } catch (error) {
      console.error('获取产品失败:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const saveOrder = async () => {
    if (!hasOrderChanges) return
    setSavingOrder(true)
    try {
      const updates = products.map(p => ({ id: p.id, sortOrder: p.sortOrder }))
      const response = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updates })
      })

      if (response.ok) {
        setHasOrderChanges(false)
        alert('排序已保存')
        fetchProducts() // Refresh to ensure correct order
      } else {
        throw new Error('Failed to save order')
      }
    } catch (error) {
      console.error('保存排序失败:', error)
      alert('保存排序失败')
    } finally {
      setSavingOrder(false)
    }
  }


  const resolveImage = (p: any): string => {
    const main = (p?.mainImage ?? '').trim()
    if (main) return main
    const arr = Array.isArray(p?.images) ? p.images : []
    const first = (arr[0] ?? '').trim()
    return first || 'https://placehold.co/96x96?text=No+Image'
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('确定要删除这个产品吗？此操作不可撤销。')) return
    
    try {
      const response = await fetch(`/api/products/${id}`, { 
        method: 'DELETE' 
      })
      
      if (response.ok) {
        setProducts(products.filter(p => p.id !== id))
        alert('产品删除成功')
      } else {
        alert('删除失败，请重试')
      }
    } catch (error) {
      console.error('删除产品失败:', error)
      alert('删除失败，请重试')
    }
  }

  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      const product = products.find(p => p.id === id)
      if (!product) return

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          featured: !featured,
        }),
      })

      if (response.ok) {
        setProducts(products.map(p => 
          p.id === id ? { ...p, featured: !featured } : p
        ))
      }
    } catch (error) {
      console.error('更新产品失败:', error)
    }
  }

  const toggleInStock = async (id: string, inStock: boolean) => {
    try {
      const product = products.find(p => p.id === id)
      if (!product) return

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          inStock: !inStock,
        }),
      })

      if (response.ok) {
        setProducts(products.map(p =>
          p.id === id ? { ...p, inStock: !inStock } : p
        ))
      }
    } catch (error) {
      console.error('更新产品启用状态失败:', error)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const isAllSelected = (list: Product[]) => {
    const ids = list.map(p => p.id)
    return ids.length > 0 && ids.every(id => selectedIds.includes(id))
  }

  const toggleSelectAll = () => {
    const ids = filteredProducts.map(p => p.id)
    setSelectedIds(prev => (isAllSelected(filteredProducts) ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))))
  }

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个产品吗？此操作不可撤销。`)) return

    try {
      for (const id of selectedIds) {
        const resp = await fetch(`/api/products/${id}`, { method: 'DELETE' })
        if (!resp.ok) throw new Error(`删除失败: ${id}`)
      }
      setProducts(products.filter(p => !selectedIds.includes(p.id)))
      setSelectedIds([])
      alert('批量删除成功')
    } catch (error) {
      console.error('批量删除失败:', error)
      alert('批量删除失败，请重试')
    }
  }

  const filteredProducts = (Array.isArray(products) ? products : []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFeatured = filterFeatured === null || product.featured === filterFeatured
    
    return matchesSearch && matchesFeatured
  })

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
              <Link href="/admin" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Package className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">产品管理</span>
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
        {/* 页面标题和操作 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">产品管理</h1>
            <p className="text-gray-600 mt-2">管理您的产品库存和信息</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            {hasOrderChanges && (
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center disabled:opacity-50"
              >
                {savingOrder ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                保存排序
              </button>
            )}
            <Link
              href="/admin/products/import"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center"
            >
              <Upload className="h-5 w-5 mr-2" />
              导入产品
            </Link>
            <Link
              href="/admin/products/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              添加产品
            </Link>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="搜索产品名称或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterFeatured === null ? '' : filterFeatured.toString()}
                onChange={(e) => setFilterFeatured(
                  e.target.value === '' ? null : e.target.value === 'true'
                )}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部产品</option>
                <option value="true">推荐产品</option>
                <option value="false">普通产品</option>
              </select>
            </div>
          </div>
        </div>

        {/* 产品列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无产品</h3>
              <p className="text-gray-600 mb-4">开始添加您的第一个产品吧</p>
              <Link
                href="/admin/products/new"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加产品
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={isAllSelected(filteredProducts)}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      排序
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      产品信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      价格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCenter} 
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={filteredProducts.map(p => p.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map((product, index) => (
                        <SortableRow
                          key={product.id}
                          product={product}
                          selected={selectedIds.includes(product.id)}
                          onToggleSelect={() => toggleSelect(product.id)}
                          onMoveUp={() => moveProduct(index, 'up')}
                          onMoveDown={() => moveProduct(index, 'down')}
                          isFirst={index === 0}
                          isLast={index === filteredProducts.length - 1}
                          dragEnabled={searchTerm === '' && filterFeatured === null}
                          resolveImage={resolveImage}
                          toggleFeatured={toggleFeatured}
                          toggleInStock={toggleInStock}
                          deleteProduct={deleteProduct}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>
              </table>
              <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-600">已选中 {selectedIds.length} 个产品</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-100"
                  >
                    {isAllSelected(filteredProducts) ? '取消全选' : '全选当前页'}
                  </button>
                  <button
                    onClick={bulkDelete}
                    disabled={selectedIds.length === 0}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedIds.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    批量删除
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">总产品数</p>
                <p className="text-2xl font-bold text-gray-900">{Array.isArray(products) ? products.length : 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">推荐产品</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Array.isArray(products) ? products.filter(p => p.featured).length : 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">有库存</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Array.isArray(products) ? products.filter(p => p.inStock).length : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}