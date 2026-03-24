'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Trash2, 
  Save, 
  MoveUp, 
  MoveDown, 
  ImageIcon, 
  Edit2, 
  X, 
  CheckSquare, 
  Square,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import Link from 'next/link'

interface CarouselItem {
  id: string
  title?: string
  description?: string
  imageUrl: string
  link?: string
  btnText?: string
  newTab?: boolean
  order: number
  active: boolean
}

interface HomeContent {
  carouselEnabled: boolean
  carouselInterval?: number
}

export default function CarouselAdmin() {
  const router = useRouter()
  const [items, setItems] = useState<CarouselItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sectionEnabled, setSectionEnabled] = useState(true)
  const [carouselInterval, setCarouselInterval] = useState(5000)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    link: '',
    btnText: 'Learn More',
    newTab: false,
    active: true
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [carouselRes, contentRes] = await Promise.all([
        fetch('/api/carousel'),
        fetch('/api/home-content')
      ])

      if (carouselRes.ok) {
        const data = await carouselRes.json()
        setItems(data)
      }
      
      if (contentRes.ok) {
        const data = await contentRes.json()
        setSectionEnabled(data.carouselEnabled ?? true)
        setCarouselInterval(data.carouselInterval ?? 5000)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInterval = async (newInterval: number) => {
    setCarouselInterval(newInterval)
    try {
      const contentRes = await fetch('/api/home-content')
      if (!contentRes.ok) return
      const contentData = await contentRes.json()
      
      await fetch('/api/home-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contentData,
          carouselInterval: newInterval
        })
      })
    } catch (error) {
      console.error('Failed to update interval:', error)
    }
  }

  const handleToggleSection = async () => {
    const newState = !sectionEnabled
    setSectionEnabled(newState)
    try {
      // We need to send all required fields or the API might complain if we only send one.
      // But let's try sending just what we need if the API supports partial updates or we fetch first.
      // The API implementation fetches current state, so we can just send what we want to update IF we send everything else back.
      // Wait, the API implementation requires all fields to be present in the validation check?
      // Let's check the API implementation again.
      // It checks required fields: 'featuredTitle', etc.
      // So we need to fetch current content first, then update.
      
      const contentRes = await fetch('/api/home-content')
      if (!contentRes.ok) return
      const contentData = await contentRes.json()
      
      await fetch('/api/home-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contentData,
          carouselEnabled: newState
        })
      })
    } catch (error) {
      console.error('Failed to toggle section:', error)
      setSectionEnabled(!newState) // Revert on error
    }
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.imageUrl) return alert('Image is required')

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`/api/carousel/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        if (res.ok) {
          const updated = await res.json()
          setItems(items.map(i => i.id === updated.id ? updated : i))
        }
      } else {
        // Create
        const res = await fetch('/api/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        if (res.ok) {
          const created = await res.json()
          setItems([...items, created])
        }
      }
      closeModal()
    } catch (error) {
      console.error('Failed to save item:', error)
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} item(s)?`)) return

    try {
      const res = await fetch('/api/carousel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      
      if (res.ok) {
        setItems(items.filter(i => !ids.includes(i.id)))
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Failed to delete items:', error)
    }
  }

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return

    // Swap
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp

    // Update orders locally
    newItems.forEach((item, idx) => item.order = idx)
    setItems(newItems)

    // Save to server
    try {
      await fetch('/api/carousel/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems.map(i => ({ id: i.id, order: i.order }))
        })
      })
    } catch (error) {
      console.error('Failed to reorder:', error)
    }
  }

  const handleToggleItemActive = async (item: CarouselItem) => {
    const newState = !item.active
    
    // Optimistic update
    setItems(items.map(i => i.id === item.id ? { ...i, active: newState } : i))
    
    try {
      await fetch(`/api/carousel/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      })
    } catch (error) {
      console.error('Failed to toggle item:', error)
      // Revert
      setItems(items.map(i => i.id === item.id ? { ...i, active: !newState } : i))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    // 客户端大小与类型校验（与服务端保持一致：仅图片，最大 5MB）
    const isImage = (file.type || '').startsWith('image/')
    if (!isImage) {
      setUploading(false)
      setUploadError('仅支持图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploading(false)
      setUploadError('文件过大，最大 5MB')
      return
    }
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data?.url) {
          setFormData(prev => ({ ...prev, imageUrl: data.url }))
        } else {
          setUploadError('上传成功但未返回图片地址')
        }
      } else {
        let message = '上传失败'
        try {
          const err = await res.json()
          message = err?.error || message
        } catch {}
        setUploadError(message)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError('上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  const openModal = (item?: CarouselItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title || '',
        description: item.description || '',
        imageUrl: item.imageUrl,
        link: item.link || '',
        btnText: item.btnText || 'Learn More',
        newTab: item.newTab ?? false,
        active: item.active
      })
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        link: '',
        btnText: 'Learn More',
        newTab: false,
        active: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>

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
              <ImageIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">轮播图管理</span>
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">轮播图列表</h1>
            <p className="text-gray-500 mt-1">管理首页顶部轮播图片</p>
            <p className="text-sm text-blue-600 mt-2 bg-blue-50 inline-block px-3 py-1.5 rounded-lg border border-blue-100">
              💡 建议尺寸：宽度 1370px，高度 600px；单张最大 5MB。保持统一宽高比可获得最佳展示效果。
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white px-4 py-2 rounded-lg border shadow-sm">
              <span className="text-sm font-medium text-gray-700 mr-3">轮播间隔(ms)</span>
              <input
                type="number"
                min="1000"
                step="500"
                value={carouselInterval}
                onChange={(e) => handleSaveInterval(parseInt(e.target.value))}
                className="w-20 text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-lg border shadow-sm">
              <span className="text-sm font-medium text-gray-700 mr-3">版块状态</span>
              <button
                onClick={handleToggleSection}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  sectionEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sectionEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              添加图片
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-blue-700">
            <span className="text-sm font-medium ml-2">已选择 {selectedIds.size} 项</span>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              批量删除
            </button>
          </div>
        )}

        {/* List */}
        <div className="bg-white shadow-sm rounded-xl border overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-3 flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="w-10">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                  {selectedIds.size === items.length && items.length > 0 ? (
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="w-24">图片</div>
              <div className="flex-1">标题/描述</div>
              <div className="w-24 text-center">排序</div>
              <div className="w-24 text-center">状态</div>
              <div className="w-32 text-right">操作</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  暂无轮播图，请点击右上角添加
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item.id} className="px-6 py-4 flex items-center hover:bg-gray-50 transition-colors">
                    <div className="w-10">
                      <button 
                        onClick={() => toggleSelection(item.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="w-24">
                      <div className="h-16 w-24 rounded-lg bg-gray-100 overflow-hidden border">
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    </div>
                    <div className="flex-1 px-4 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{item.title || '(无标题)'}</div>
                      <div className="text-sm text-gray-500 truncate">{item.description}</div>
                      {item.link && <div className="text-xs text-blue-500 mt-1 truncate" title={item.link}>{item.link}</div>}
                    </div>
                    <div className="w-24 flex justify-center space-x-1">
                      <button
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <MoveUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === items.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <MoveDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="w-24 flex justify-center">
                      <button
                        onClick={() => handleToggleItemActive(item)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          item.active ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            item.active ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="w-32 flex justify-end space-x-2">
                      <button
                        onClick={() => openModal(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete([item.id])}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? '编辑轮播图' : '添加轮播图'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图片 (必须)</label>
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-16 bg-gray-100 rounded-lg border overflow-hidden flex-shrink-0">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploading && <p className="text-xs text-blue-500 mt-1">上传中...</p>}
                    {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                  </div>
                </div>
                {/* URL fallback */}
                <input
                  type="text"
                  placeholder="或直接输入图片URL"
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跳转链接</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={e => setFormData({...formData, link: e.target.value})}
                  placeholder="例如: www.amazon.com"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>

              {/* Button Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">按钮文字</label>
                <input
                  type="text"
                  value={formData.btnText}
                  onChange={e => setFormData({...formData, btnText: e.target.value})}
                  placeholder="例如: Learn More, Shop Now"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newTab"
                    checked={formData.newTab}
                    onChange={e => setFormData({...formData, newTab: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="newTab" className="ml-2 block text-sm text-gray-900">
                    在新标签页打开链接
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={e => setFormData({...formData, active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                    启用此轮播图
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
