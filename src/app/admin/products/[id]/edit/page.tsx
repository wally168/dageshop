'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import useUnsavedChangesPrompt from '../../../../../hooks/useUnsavedChangesPrompt'
import * as XLSX from 'xlsx'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  Upload,
  ExternalLink,
  Star,
  Package,
  Home,
  Loader2,
  Trash2,
  FileText
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  bulletPoints: string[]
  amazonUrl: string
  youtubeUrl?: string
  youtubeIndex?: number | null
  categoryId?: string
  brandId?: string
  featured: boolean
  inStock: boolean
  brand?: string
  upc?: string
  publishedAt?: string | Date | null
  variants?: VariantGroup[]
  variantImageMap?: Record<string, Record<string, number>>
  showBuyOnAmazon?: boolean
  showAddToCart?: boolean
}

interface ProductForm {
  name: string
  description: string
  price: string
  originalPrice: string
  images: string[]
  bulletPoints: string[]
  amazonUrl: string
  youtubeUrl: string
  youtubeIndex?: number | null
  categoryId: string
  brandId: string
  featured: boolean
  inStock: boolean
  showBuyOnAmazon: boolean
  showAddToCart: boolean
  brand?: string
  upc?: string
  publishedAt?: string
  variants?: VariantGroup[]
  variantImageMap?: Record<string, Record<string, number>>
  variantOptionImages?: Record<string, Record<string, string>>
  variantOptionLinks?: Record<string, Record<string, string>>
}

interface VariantGroup { name: string; options: string[] }

// 新增：分类类型
interface Category { id: string; name: string; slug: string }
interface Brand { id: string; name: string; slug: string }

interface Review {
  id: string
  productId: string
  isVisible: boolean
  country: string
  name: string
  title: string
  content: string
  rating: number
  images: string[]
  createdAt?: string
  updatedAt?: string
}

// 链接校验（仅校验为有效 http/https URL，不自动改写）
function isValidAmazonUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
function extractYoutubeId(value: string): string | null {
  if (!value || typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id || null
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v')
      }
      const parts = url.pathname.split('/').filter(Boolean)
      const embedIndex = parts.findIndex(p => p === 'embed' || p === 'shorts')
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1]
    }
  } catch {}
  return null
}
function isValidYoutubeUrl(url: string): boolean {
  if (!url || !url.trim()) return true
  return !!extractYoutubeId(url)
}

const COMBO_KEY = '__combo__'
function parseComboKey(key: string): Record<string, string> {
  const map: Record<string, string> = {}
  if (!key) return map
  key.split('|').forEach(pair => {
    const [g, v] = pair.split('=')
    if (g) map[g] = v || ''
  })
  return map
}
function buildComboKey(groups: VariantGroup[] | undefined, selections: Record<string, string>): string {
  const gs = Array.isArray(groups) ? groups : []
  return gs.filter(g => g?.name && selections[g.name]).map(g => `${g.name}=${selections[g.name]}`).join('|')
}
function getAllComboKeys(groups: VariantGroup[] | undefined): string[] {
  const gs = Array.isArray(groups) ? groups.filter(g => g?.name && (g.options || []).length > 0) : []
  if (gs.length === 0) return []
  let acc: Record<string, string>[] = [{}]
  for (const g of gs) {
    const opts = g.options || []
    const next: Record<string, string>[] = []
    for (const sel of acc) {
      for (const opt of opts) {
        next.push({ ...sel, [g.name]: opt })
      }
    }
    acc = next
  }
  return acc.map(sel => buildComboKey(gs, sel))
}
function getFirstMissingComboKey(groups: VariantGroup[] | undefined, existing: Record<string, string> | undefined): string | null {
  const all = getAllComboKeys(groups)
  for (const k of all) {
    if (!existing || !(k in existing)) return k
  }
  return null
}

export default function EditProduct() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const MAX_IMAGE_BYTES = 4 * 1024 * 1024
  const tooLargeMessage = '上传失败：图片不能大于4MB'

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    images: [''],
    bulletPoints: ['', '', '', '', '', '', '', ''],
    amazonUrl: '',
    youtubeUrl: '',
    youtubeIndex: null,
    categoryId: '',
    brandId: '',
    featured: false,
    inStock: true,
    showBuyOnAmazon: true,
    showAddToCart: true,
    brand: '',
    upc: '',
    publishedAt: '',
    variants: [{ name: '', options: [''] }],
    variantImageMap: {},
    variantOptionImages: {},
    variantOptionLinks: {},
  })
  // 新增：分类状态
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [brands, setBrands] = useState<Brand[]>([])
  const [urlError, setUrlError] = useState<string>('')
  const [youtubeUrlError, setYoutubeUrlError] = useState<string>('')
  // 上传状态：按索引标记（简化处理）
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  useUnsavedChangesPrompt(hasChanges)

  // 描述图片上传
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [descUploading, setDescUploading] = useState(false)

  const handleDescImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      alert(tooLargeMessage)
      e.target.value = ''
      return
    }

    setDescUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        if (res.status === 413) throw new Error(tooLargeMessage)
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      const url = data?.url
      
      if (typeof url === 'string' && url.length > 0) {
        const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
        const imgTag = `<img src="${finalUrl}" alt="Description Image" style="max-width: 100%; height: auto;" />`
        
        setForm(prev => {
          const textarea = descTextareaRef.current
          let newDesc = prev.description
          
          if (textarea) {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            newDesc = prev.description.substring(0, start) + imgTag + prev.description.substring(end)
          } else {
            newDesc = prev.description + imgTag
          }
          
          return { ...prev, description: newDesc }
        })
        setHasChanges(true)
      } else {
        alert('上传成功，但未返回有效URL')
      }
    } catch (e) {
      console.error('上传描述图片失败:', e)
      alert((e instanceof Error && e.message === tooLargeMessage) ? tooLargeMessage : '上传图片失败，请重试')
    } finally {
      setDescUploading(false)
      e.target.value = ''
    }
  }

  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [reviewImportFile, setReviewImportFile] = useState<File | null>(null)
  const [reviewImporting, setReviewImporting] = useState(false)
  const [reviewImportResult, setReviewImportResult] = useState<{ success: number; failed: number; skipped: number; errors: string[] } | null>(null)
  const [reviewImportVisible, setReviewImportVisible] = useState(true)
  const [reviewImportPreview, setReviewImportPreview] = useState<Array<{
    title: string
    content: string
    rating: number | null
    name: string
    country: string
    images: string[]
    createdAt?: string
    willImport: boolean
    reason: string
  }>>([])
  const [newReview, setNewReview] = useState<Review>({
    id: '',
    productId: productId,
    isVisible: true,
    country: '',
    name: '',
    title: '',
    content: '',
    rating: 5,
    images: [''],
    createdAt: ''
  })

  // 预览大图子组件，确保作用域正确
  const PreviewOverlay = ({ image, onClose }: { image: string | null; onClose: () => void }) => {
    if (!image) return null
    return (
      <div
        className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="relative max-w-[90vw] max-h-[85vh]">
          <img
            src={image}
            alt="预览大图"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-lg"
          />
          <button
            type="button"
            className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="关闭预览"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }
  const handleUpload = async (index: number, file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      alert(tooLargeMessage)
      return
    }
    setUploadingIndex(index)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        if (res.status === 413) throw new Error(tooLargeMessage)
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      const url = data?.url
      if (typeof url === 'string' && url.length > 0) {
        const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
        updateImageField(index, finalUrl)
        setHasChanges(true)
      } else {
        alert('上传成功，但未返回有效URL')
      }
    } catch (e) {
      console.error('上传失败:', e)
      alert((e instanceof Error && e.message === tooLargeMessage) ? tooLargeMessage : '上传失败，请稍后重试')
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleBulkUpload = async (files: FileList) => {
    if (!files || files.length === 0) return
    if (Array.from(files).some(f => f.size > MAX_IMAGE_BYTES)) {
      alert(tooLargeMessage)
      return
    }
    setBulkUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          if (res.status === 413) throw new Error(tooLargeMessage)
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        const url = data?.url
        if (typeof url === 'string' && url.length > 0) {
          const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
          urls.push(finalUrl)
        }
      }
      setForm(prev => ({
        ...prev,
        images: [...(Array.isArray(prev.images) ? prev.images : ['']).filter((img) => img.trim() !== ''), ...urls]
      }))
      setHasChanges(true)
    } catch (e) {
      console.error('批量上传失败:', e)
      alert((e instanceof Error && e.message === tooLargeMessage) ? tooLargeMessage : '批量上传失败，请稍后重试')
    } finally {
      setBulkUploading(false)
    }
  }

  const onDragStartImage = (index: number) => setDragIndex(index)
  const onDropImage = (index: number) => {
    setForm(prev => {
      const arr = [...(Array.isArray(prev.images) ? prev.images : [''])]
      const from = dragIndex
      const to = index
      if (from === null || from === to) return prev
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { ...prev, images: arr }
    })
    setDragIndex(null)
    setHasChanges(true)
  }

  // 新增：加载分类和品牌列表
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/brands', { cache: 'no-store' })
        ])
        if (catRes.ok) {
          const data = await catRes.json()
          const normalized = Array.isArray(data)
            ? data.map((c: any) => ({ ...c, id: String(c?.id ?? '') })).filter((c: any) => c.id)
            : []
          setCategories(normalized)
        }
        if (brandRes.ok) {
          const data = await brandRes.json()
          const normalized = Array.isArray(data)
            ? data.map((b: any) => ({ ...b, id: String(b?.id ?? '') })).filter((b: any) => b.id)
            : []
          setBrands(normalized)
        }
      } catch (e) {
        console.error('加载基础数据失败:', e)
      } finally {
        setCatLoading(false)
      }
    }
    loadData()
  }, [])

  const fetchProduct = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
        const toId = (v: any): string => (v === null || v === undefined) ? '' : String(v)
        
        const toLocalInput = (dt: string | Date | null | undefined): string => {
          if (!dt) return ''
          try {
            const d = new Date(dt)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
          } catch { return '' }
        }
        // 填充表单数据
        setForm({
          name: data.name || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          originalPrice: data.originalPrice?.toString() || '',
          images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [''],
          bulletPoints: Array.isArray(data.bulletPoints)
            ? Array.from({ length: 8 }, (_, i) => (data.bulletPoints[i] ?? ''))
            : ['', '', '', '', '', '', '', ''],
          amazonUrl: data.amazonUrl || '',
          youtubeUrl: (data as any).youtubeUrl || '',
          youtubeIndex: typeof (data as any).youtubeIndex === 'number' ? (data as any).youtubeIndex : null,
          categoryId: toId(data.categoryId),
          brandId: toId(data.brandId || data.brandRelation?.id),
          featured: data.featured || false,
          inStock: data.inStock !== false,
          showBuyOnAmazon: data.showBuyOnAmazon !== false,
          showAddToCart: data.showAddToCart !== false,
          brand: (data.brand ?? '') || '',
          upc: (data.upc ?? '') || '',
          publishedAt: toLocalInput(data.publishedAt ?? null),
          variants: Array.isArray(data.variants) && data.variants.length > 0 ? data.variants : [{ name: '', options: [''] }],
          variantImageMap: (data.variantImageMap ?? {}) as Record<string, Record<string, number>>, 
          variantOptionImages: (data.variantOptionImages ?? {}) as Record<string, Record<string, string>>, 
          variantOptionLinks: (data.variantOptionLinks ?? {}) as Record<string, Record<string, string>>, 
        })
      } else {
        alert('获取产品信息失败')
        router.push('/admin/products')
      }
    } catch (error) {
      console.error('获取产品失败:', error)
      alert('获取产品信息失败')
      router.push('/admin/products')
    } finally {
      setFetching(false)
    }
  }, [productId, router])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews?visibleOnly=0`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const normalized = Array.isArray(data) ? data.map((r: any) => ({
          id: String(r.id),
          productId: String(r.productId),
          isVisible: Boolean(r.isVisible),
          country: String(r.country || ''),
          name: String(r.name || ''),
          title: String(r.title || ''),
          content: String(r.content || ''),
          rating: Number(r.rating || 5),
          images: Array.isArray(r.images) ? r.images : [],
          createdAt: (() => {
            try {
              if (!r.createdAt) return ''
              const d = new Date(r.createdAt)
              const pad = (n: number) => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            } catch { return '' }
          })()
        })) : []
        setReviews(normalized)
      }
    } catch (e) {
      console.error('加载评论失败:', e)
    } finally {
      setLoadingReviews(false)
    }
  }, [productId])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const parseExcelDateToIso = (value: any): string | undefined => {
    if (!value) return undefined
    if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString()
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value)
      if (!parsed) return undefined
      const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0))
      if (!isNaN(d.getTime())) return d.toISOString()
      return undefined
    }
    if (typeof value === 'string') {
      const d = new Date(value)
      if (!isNaN(d.getTime())) return d.toISOString()
    }
    return undefined
  }

  const parseRatingValue = (value: any): number | null => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number' && !isNaN(value)) return value
    const str = String(value).trim()
    if (!str) return null
    const match = str.match(/(\d+(\.\d+)?)/)
    if (!match) return null
    const num = Number(match[1])
    return isNaN(num) ? null : num
  }

  const parseImagesValue = (value: any): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') {
      const str = value.trim()
      if (!str) return []
      if (str.startsWith('[')) {
        try {
          const arr = JSON.parse(str)
          if (Array.isArray(arr)) return arr.map(v => String(v).trim()).filter(Boolean)
        } catch {}
      }
      return str.split(/[\s,;]+/).map(v => v.trim()).filter(Boolean)
    }
    return [String(value).trim()].filter(Boolean)
  }

  const buildReviewImportPreview = (rows: Record<string, any>[]) => {
    const preview = rows.map((row) => {
      const title = String(row['标题'] ?? row['title'] ?? row['Title'] ?? '').trim()
      const content = String(row['内容'] ?? row['content'] ?? row['Content'] ?? '').trim()
      const ratingValue = parseRatingValue(row['星级'] ?? row['rating'] ?? row['Rating'])
      const name = String(row['评论人'] ?? row['name'] ?? row['Name'] ?? '').trim()
      const country = String(row['所属国家'] ?? row['country'] ?? row['Country'] ?? '').trim()
      const images = parseImagesValue(row['图片地址'] ?? row['images'] ?? row['Images'])
      const createdAt = parseExcelDateToIso(row['评论时间'] ?? row['time'] ?? row['Time'] ?? row['created_at'] ?? row['CreatedAt'])
      const isFive = ratingValue === 5
      const hasContent = Boolean(content)
      const willImport = isFive && hasContent
      let reason = ''
      if (!isFive) reason = '非5星'
      else if (!hasContent) reason = '内容为空'
      return { title, content, rating: ratingValue, name, country, images, createdAt, willImport, reason }
    })
    setReviewImportPreview(preview)
    return preview
  }

  const parseReviewImportFile = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[]
    return buildReviewImportPreview(jsonData)
  }

  const handleReviewImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReviewImportFile(file)
    setReviewImportResult(null)
    parseReviewImportFile(file).catch(() => {
      setReviewImportPreview([])
      setReviewImportResult({ success: 0, failed: 0, skipped: 0, errors: ['解析失败或文件损坏'] })
    })
  }

  const handleImportReviews = async () => {
    if (!reviewImportFile || reviewImporting) return
    setReviewImporting(true)
    setReviewImportResult(null)
    try {
      const preview = reviewImportPreview.length > 0 ? reviewImportPreview : await parseReviewImportFile(reviewImportFile)
      let success = 0
      let failed = 0
      let skipped = 0
      const errors: string[] = []

      for (const row of preview) {
        if (!row.willImport) {
          skipped++
          continue
        }
        try {
          const payload = {
            isVisible: reviewImportVisible,
            country: row.country,
            name: row.name,
            title: row.title,
            content: row.content,
            rating: 5,
            images: row.images,
            createdAt: row.createdAt
          }
          const res = await fetch(`/api/products/${productId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          if (res.ok) {
            success++
          } else {
            failed++
            const err = await res.json().catch(() => ({}))
            errors.push(err.error || '导入失败')
          }
        } catch (e) {
          failed++
          errors.push('导入失败')
        }
      }

      setReviewImportResult({ success, failed, skipped, errors })
      await loadReviews()
    } catch (e) {
      setReviewImportResult({ success: 0, failed: 0, skipped: 0, errors: ['解析失败或文件损坏'] })
    } finally {
      setReviewImporting(false)
    }
  }

  const addReviewImageField = (isEdit: boolean) => {
    if (isEdit && editingReview) {
      setEditingReview({ ...editingReview, images: [...(editingReview.images || []), ''] })
    } else {
      setNewReview(prev => ({ ...prev, images: [...(prev.images || []), ''] }))
    }
  }

  const removeReviewImageField = (index: number, isEdit: boolean) => {
    if (isEdit && editingReview) {
      setEditingReview({ ...editingReview, images: (editingReview.images || []).filter((_, i) => i !== index) })
    } else {
      setNewReview(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }))
    }
  }

  const updateReviewImageField = (index: number, value: string, isEdit: boolean) => {
    if (isEdit && editingReview) {
      setEditingReview({ ...editingReview, images: (editingReview.images || []).map((img, i) => i === index ? value : img) })
    } else {
      setNewReview(prev => ({ ...prev, images: (prev.images || []).map((img, i) => i === index ? value : img) }))
    }
  }

  const uploadReviewImage = async (index: number, file: File, isEdit: boolean) => {
    try {
      if (file.size > MAX_IMAGE_BYTES) {
        alert(tooLargeMessage)
        return
      }
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        if (res.status === 413) throw new Error(tooLargeMessage)
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      const url = data?.url
      if (typeof url === 'string' && url.length > 0) {
        const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
        updateReviewImageField(index, finalUrl, isEdit)
      }
    } catch (e) {
      console.error('上传失败:', e)
      alert((e instanceof Error && e.message === tooLargeMessage) ? tooLargeMessage : '上传失败，请稍后重试')
    }
  }

  const saveNewReview = async () => {
    try {
      const payload = {
        isVisible: newReview.isVisible,
        country: newReview.country,
        name: newReview.name,
        title: newReview.title,
        content: newReview.content,
        rating: newReview.rating,
        images: (newReview.images || []).filter((u) => u && u.trim() !== ''),
        createdAt: newReview.createdAt ? new Date(newReview.createdAt).toISOString() : undefined,
      }
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const created = await res.json()
        setReviews([created, ...reviews])
        setNewReview({ id: '', productId, isVisible: true, country: '', name: '', title: '', content: '', rating: 5, images: [''], createdAt: '' })
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || '添加失败')
      }
    } catch (e) {
      console.error('添加评论失败:', e)
      alert('添加失败')
    }
  }

  const startEditReview = (r: Review) => {
    setEditingReview({ ...r, images: (r.images || []).length > 0 ? r.images : [''] })
  }

  const saveEditReview = async () => {
    if (!editingReview) return
    try {
      const payload = {
        isVisible: editingReview.isVisible,
        country: editingReview.country,
        name: editingReview.name,
        title: editingReview.title,
        content: editingReview.content,
        rating: editingReview.rating,
        images: (editingReview.images || []).filter((u) => u && u.trim() !== ''),
        createdAt: editingReview.createdAt ? new Date(editingReview.createdAt).toISOString() : undefined,
      }
      const res = await fetch(`/api/reviews/${editingReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const updated = await res.json()
        setReviews(reviews.map(r => r.id === updated.id ? updated : r))
        setEditingReview(null)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || '更新失败')
      }
    } catch (e) {
      console.error('更新评论失败:', e)
      alert('更新失败')
    }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('确定删除该评论？')) return
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id))
      }
    } catch (e) {
      console.error('删除评论失败:', e)
      alert('删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 链接最终校验
    if (!isValidAmazonUrl(form.amazonUrl)) {
      setUrlError('请粘贴正确的亚马逊产品链接（需包含 /dp/ASIN）')
      setLoading(false)
      return
    }
    if (!isValidYoutubeUrl(form.youtubeUrl)) {
      setYoutubeUrlError('请输入有效的 YouTube 链接')
      setLoading(false)
      return
    }

    try {
      const imageList = (Array.isArray(form.images) ? form.images : ['']).filter(img => img.trim() !== '')
      const safeYoutubeIndex = (() => {
        if (typeof form.youtubeIndex !== 'number' || !Number.isFinite(form.youtubeIndex)) return null
        return Math.max(0, Math.min(form.youtubeIndex, imageList.length))
      })()
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          amazonUrl: form.amazonUrl,
          youtubeUrl: (form.youtubeUrl ?? '').trim() || null,
          youtubeIndex: safeYoutubeIndex,
          price: parseFloat(form.price),
          originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
          images: imageList,
          bulletPoints: Array.from({ length: 8 }, (_, i) => ((Array.isArray(form.bulletPoints) ? form.bulletPoints[i] : '') ?? '').trim()),
          brand: (form.brand ?? '').trim() || null,
          upc: (form.upc ?? '').trim() || null,
          publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
          variants: (form.variants || [])
            .map(g => ({
              name: (g.name || '').trim(),
              options: (g.options || []).map(o => o.trim()).filter(Boolean)
            }))
            .filter(g => g.name && g.options.length > 0),
          variantImageMap: form.variantImageMap || null,
          variantOptionImages: form.variantOptionImages || null,
          variantOptionLinks: form.variantOptionLinks || null,
        }),
      })

      if (response.ok) {
        alert('产品更新成功！')
        setHasChanges(false)
        router.push('/admin/products')
      } else {
        const error = await response.json()
        alert(`更新失败: ${error.error}`)
      }
    } catch (error) {
      console.error('更新产品失败:', error)
      alert('更新失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const addImageField = () => {
    setForm(prev => ({
      ...prev,
      images: [...(Array.isArray(prev.images) ? prev.images : ['']), '']
    }))
  }

  const removeImageField = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: (Array.isArray(prev.images) ? prev.images : ['']).filter((_, i) => i !== index)
    }))
  }

  const updateImageField = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      images: (Array.isArray(prev.images) ? prev.images : ['']).map((item, i) => i === index ? value : item)
    }))
    setHasChanges(true)
  }

  const updateBulletPoint = (index: number, value: string) => {
    if (value.length > 500) {
      value = value.substring(0, 500)
    }
    setForm(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.map((item, i) => i === index ? value : item)
    }))
    setHasChanges(true)
  }

  const reviewImportableCount = reviewImportPreview.filter((r) => r.willImport).length
  const reviewSkippedCount = reviewImportPreview.length - reviewImportableCount

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">加载产品信息中...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">产品不存在</p>
          <Link href="/admin/products" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            返回产品列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/products"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">编辑产品</h1>
              <p className="text-gray-600">修改产品信息</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/admin/products" className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors">
              <Package className="h-5 w-5 mr-1" />
              返回产品列表
            </Link>
            <Link href="/admin" className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors">
              <Home className="h-5 w-5 mr-1" />
              返回控制台
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} onInput={() => setHasChanges(true)} className="space-y-8">
          {/* 基本信息 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">基本信息</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  产品名称 * <span className="text-xs text-gray-500">(最多200字符)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入产品名称"
                />
               <div className="text-xs text-gray-500 mt-1">{form.name.length}/200 字符</div>
               {form.name.length >= 200 && (
                 <div className="text-xs text-red-600 mt-1">已达上限，超出部分将被截断</div>
               )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UPC（可选）
                </label>
                <input
                  type="text"
                  value={form.upc || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, upc: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：012345678905"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上架时间
                </label>
                <input
                  type="datetime-local"
                  value={form.publishedAt || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, publishedAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">可选择任意时间，不会自动使用当前时间</p>
              </div>

              {/* 新增：分类选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属分类 *
                </label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{catLoading ? '加载中…' : '请选择分类'}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {!catLoading && categories.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">暂无分类，请先执行重置数据或在数据库中创建分类。</p>
                )}
              </div>

              {/* 新增：品牌选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属品牌 (可选)
                </label>
                <select
                  value={form.brandId || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    const selected = brands.find(b => String(b.id) === val)
                    setForm(prev => {
                      if (!val) {
                         return { ...prev, brandId: '', brand: '' }
                      }
                      return { 
                        ...prev, 
                        brandId: val,
                        brand: selected ? selected.name : ''
                      }
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- 不选择品牌 --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {!form.brandId && form.brand && (
                  <p className="text-xs text-gray-500 mt-1">
                    当前保留的旧品牌名称：{form.brand}。请在上方选择对应品牌以关联（建议）。
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  亚马逊链接 *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required={(form.variants || []).length === 0}
                    disabled={(form.variants || []).length > 0}
                    value={form.amazonUrl}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm(prev => ({ ...prev, amazonUrl: v }))
                      if ((form.variants || []).length > 0) {
                        setUrlError('')
                      } else if (v.trim() === '') {
                        setUrlError('请输入有效链接')
                      } else if (!isValidAmazonUrl(v)) {
                        setUrlError('链接格式不正确，请输入以 http/https 开头的链接')
                      } else {
                        setUrlError('')
                      }
                    }}
                    onBlur={() => {}}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="https://www.amazon.com/dp/ASIN 或包含 /dp/ASIN 的链接"
                    title={(form.variants || []).length > 0 ? '已添加变体：主链接不可编辑但作为兜底；若某些选项未填购买链接，将跳转此主链接' : '示例：https://www.amazon.com/dp/B0CJZMP7L1 或 https://www.amazon.com/.../dp/B0CJZMP7L1'}
                  />
                  <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className={`text-xs mt-1 ${((form.variants || []).length > 0) ? 'text-gray-500' : (urlError ? 'text-red-600' : 'text-gray-500')}`}>
                  {((form.variants || []).length > 0) ? '已添加变体：主链接不可编辑但作为兜底；若选项未填写购买链接，将默认跳转主链接。' : (urlError || '请输入有效链接（http/https），我们不会自动改写')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  售价 ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原价 ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.originalPrice}
                  onChange={(e) => setForm(prev => ({ ...prev, originalPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  推荐产品
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(e) => setForm(prev => ({ ...prev, inStock: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">有库存</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.showBuyOnAmazon}
                  onChange={(e) => setForm(prev => ({ ...prev, showBuyOnAmazon: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">显示“去亚马逊购买”按钮</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.showAddToCart}
                  onChange={(e) => setForm(prev => ({ ...prev, showAddToCart: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">显示“加入购物车”按钮</span>
              </label>
            </div>
          </div>

          {/* 产品变体 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">产品变体</h2>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    variants: [...(prev.variants || []), { name: '', options: [''] }]
                  }))
                  setHasChanges(true)
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" /> 添加变体组
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              多维度链接支持：已支持“组合链接”（如颜色+尺寸）。当所有维度均选择且存在匹配的组合链接时，将优先跳转组合链接；否则优先使用选项链接，最后回退主链接。可在下方“组合链接（可选）”中添加。
            </p>

            {(form.variants || []).length === 0 ? (
              <p className="text-sm text-gray-500">暂无变体，可点击上方“添加变体组”。</p>
            ) : (
              <div className="space-y-6">
                {(form.variants || []).map((group, gi) => (
                  <div key={gi} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">变体组名称</label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm(prev => {
                              const variants = [...(prev.variants || [])]
                              variants[gi] = { ...variants[gi], name: v }
                              return { ...prev, variants }
                            })
                            setHasChanges(true)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="例如：Color、Size"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            variants: (prev.variants || []).filter((_, i) => i !== gi)
                          }))
                          setHasChanges(true)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">选项值</label>
                      <div className="space-y-3">
                        {(group.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-3 flex-wrap">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const v = e.target.value
                                setForm(prev => {
                                  const variants = [...(prev.variants || [])]
                                  const options = [...(variants[gi].options || [])]
                                  options[oi] = v
                                  variants[gi] = { ...variants[gi], options }
                                  return { ...prev, variants }
                                })
                                setHasChanges(true)
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={group.name ? `输入 ${group.name} 选项` : '输入选项值'}
                            />
                            {/* 变体主图URL/上传 */}
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-700">变体主图</label>
                              <input
                                type="url"
                                value={(form.variantOptionImages?.[group.name]?.[opt] ?? '')}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setForm(prev => {
                                    const next = { ...(prev.variantOptionImages || {}) } as Record<string, Record<string, string>>
                                    const gm = { ...(next[group.name] || {}) } as Record<string, string>
                                    if (v.trim() === '') {
                                      delete gm[opt]
                                    } else {
                                      gm[opt] = v
                                    }
                                    if (Object.keys(gm).length === 0) {
                                      delete next[group.name]
                                    } else {
                                      next[group.name] = gm
                                    }
                                    return { ...prev, variantOptionImages: next }
                                  })
                                  setHasChanges(true)
                                }}
                                placeholder="该选项主图URL"
                                className="px-2 py-1 border border-gray-300 rounded-md text-sm w-48"
                              />
                              <label className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 border rounded cursor-pointer hover:bg-gray-200">
                                <Upload className="h-3 w-3 mr-1" /> 上传
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    try {
                                      const fd = new FormData()
                                      fd.append('file', file)
                                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                                      const data = await res.json()
                                      const url = data?.url
                                      if (typeof url === 'string' && url.length > 0) {
                                        const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
                                        setForm(prev => {
                                          const next = { ...(prev.variantOptionImages || {}) } as Record<string, Record<string, string>>
                                          const gm = { ...(next[group.name] || {}) } as Record<string, string>
                                          gm[opt] = finalUrl
                                          next[group.name] = gm
                                          return { ...prev, variantOptionImages: next }
                                        })
                                        setHasChanges(true)
                                      } else {
                                        alert('上传成功，但未返回有效URL')
                                      }
                                    } catch (err) {
                                      console.error('上传失败', err)
                                      alert('上传失败，请稍后重试')
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {/* 选项购买链接 */}
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-700">选项购买链接</label>
                              <input
                                type="url"
                                value={(form.variantOptionLinks?.[group.name]?.[opt] ?? '')}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setForm(prev => {
                                    const next = { ...(prev.variantOptionLinks || {}) } as Record<string, Record<string, string>>
                                    const gm = { ...(next[group.name] || {}) } as Record<string, string>
                                    if (v.trim() === '') {
                                      delete gm[opt]
                                    } else {
                                      gm[opt] = v
                                    }
                                    if (Object.keys(gm).length === 0) {
                                      delete next[group.name]
                                    } else {
                                      next[group.name] = gm
                                    }
                                    return { ...prev, variantOptionLinks: next }
                                  })
                                  setHasChanges(true)
                                }}
                                placeholder="该选项购买链接URL"
                                className="px-2 py-1 border border-gray-300 rounded-md text-sm w-64"
                              />
                            </div>

                            {(group.options || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => {
                                    const variants = [...(prev.variants || [])]
                                    const options = (variants[gi].options || []).filter((_, i) => i !== oi)
                                    variants[gi] = { ...variants[gi], options }
                                    return { ...prev, variants }
                                  })
                                  setHasChanges(true)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => {
                            const variants = [...(prev.variants || [])]
                            const options = [...(variants[gi].options || []), '']
                            variants[gi] = { ...variants[gi], options }
                            return { ...prev, variants }
                          })
                          setHasChanges(true)
                        }}
                        className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" /> 添加选项
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 组合链接（可选） */}
          {Array.isArray(form.variants) && (form.variants?.length || 0) > 1 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">组合链接（可选）</h2>
                <button
                  type="button"
                  onClick={() => {
                    const key = getFirstMissingComboKey(form.variants, form.variantOptionLinks?.[COMBO_KEY])
                    if (!key) return
                    setForm(prev => {
                      const next = { ...(prev.variantOptionLinks || {}) } as Record<string, Record<string, string>>
                      const gm = { ...(next[COMBO_KEY] || {}) } as Record<string, string>
                      gm[key] = gm[key] ?? ''
                      next[COMBO_KEY] = gm
                      return { ...prev, variantOptionLinks: next }
                    })
                    setHasChanges(true)
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> 添加组合链接
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">当所有维度均选择且存在匹配的组合链接时，将优先跳转该链接；否则回退到选项链接或主链接。</p>

              {Object.entries(form.variantOptionLinks?.[COMBO_KEY] || {}).length === 0 ? (
                <p className="text-sm text-gray-500">尚未添加组合链接。</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(form.variantOptionLinks?.[COMBO_KEY] || {}).map(([key, url]) => {
                    const selections = parseComboKey(key)
                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {(form.variants || []).map((g, gi) => (
                            <div key={`${key}-${g.name}-${gi}`} className="flex items-center gap-2">
                              <label className="text-sm text-gray-700">{g.name}</label>
                              <select
                                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                value={selections[g.name] || ''}
                                onChange={(e) => {
                                  const newSel = { ...selections, [g.name]: e.target.value }
                                  setForm(prev => {
                                    const next = { ...(prev.variantOptionLinks || {}) } as Record<string, Record<string, string>>
                                    const gm = { ...(next[COMBO_KEY] || {}) } as Record<string, string>
                                    const oldUrl = gm[key] ?? ''
                                    delete gm[key]
                                    const newKey = buildComboKey(prev.variants, newSel)
                                    gm[newKey] = oldUrl
                                    next[COMBO_KEY] = gm
                                    return { ...prev, variantOptionLinks: next }
                                  })
                                  setHasChanges(true)
                                }}
                              >
                                {(g.options || []).map((opt) => (
                                  <option key={`${g.name}-${opt}`} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          ))}

                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700">组合购买链接</label>
                            <input
                              type="url"
                              value={url || ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setForm(prev => {
                                  const next = { ...(prev.variantOptionLinks || {}) } as Record<string, Record<string, string>>
                                  const gm = { ...(next[COMBO_KEY] || {}) } as Record<string, string>
                                  if (v.trim() === '') {
                                    delete gm[key]
                                  } else {
                                    gm[key] = v
                                  }
                                  if (Object.keys(gm).length === 0) {
                                    delete next[COMBO_KEY]
                                  } else {
                                    next[COMBO_KEY] = gm
                                  }
                                  return { ...prev, variantOptionLinks: next }
                                })
                                setHasChanges(true)
                              }}
                              placeholder="该组合购买链接URL"
                              className="px-2 py-1 border border-gray-300 rounded-md text-sm w-64"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setForm(prev => {
                                  const next = { ...(prev.variantOptionLinks || {}) } as Record<string, Record<string, string>>
                                  const gm = { ...(next[COMBO_KEY] || {}) } as Record<string, string>
                                  delete gm[key]
                                  if (Object.keys(gm).length === 0) delete next[COMBO_KEY]
                                  else next[COMBO_KEY] = gm
                                  return { ...prev, variantOptionLinks: next }
                                })
                                setHasChanges(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 产品图片 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">产品图片</h2>
              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 border rounded-lg cursor-pointer hover:bg-gray-200">
                  <Upload className="h-4 w-4 mr-2" />
                  {bulkUploading ? '批量上传中…' : '批量上传'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files
                      if (files) handleBulkUpload(files)
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加图片
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube 播放链接 <span className="text-gray-400 font-normal">(可选)</span>
              </label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, youtubeUrl: e.target.value }))
                  if (youtubeUrlError) setYoutubeUrlError('')
                }}
                placeholder="https://youtu.be/xxxx 或 https://www.youtube.com/watch?v=xxxx"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${youtubeUrlError ? 'border-red-500' : 'border-gray-300'}`}
              />
              {youtubeUrlError ? (
                <p className="text-xs text-red-600 mt-1">{youtubeUrlError}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">提供后可设置插入位置</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                视频插入位置 <span className="text-gray-400 font-normal">(可选)</span>
              </label>
              <select
                value={typeof form.youtubeIndex === 'number' && Number.isFinite(form.youtubeIndex) ? Math.max(0, Math.min(form.youtubeIndex, form.images.length)) : Math.min(1, form.images.length)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  setForm(prev => ({ ...prev, youtubeIndex: Number.isFinite(v) ? v : null }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: Math.max(1, form.images.length) + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    第 {i + 1} 位
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">第 1 位表示最前面，最后一位表示图片列表末尾</p>
            </div>

            <p className="text-xs text-gray-500 mb-2">提示：按住图片行拖拽进行排序；支持最大 4MB 图片上传</p>

            <div className="space-y-4">
              {form.images.map((image, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3"
                  draggable
                  onDragStart={() => onDragStartImage(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropImage(index)}
                >
                  <div className="flex-1">
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => updateImageField(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="产品图片URL地址"
                    />
                  </div>
                  <div className="w-16 h-16 rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image.startsWith('http') ? image : (image.startsWith('/') ? image : `/${image}`)}
                        alt="预览"
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => setPreviewImage(image.startsWith('http') ? image : (image.startsWith('/') ? image : `/${image}`))}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">无预览</span>
                    )}
                  </div>
                  {image ? (
                    <a
                      href={image.startsWith('http') ? image : (image.startsWith('/') ? image : `/${image}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600"
                      title="在新窗口打开图片"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                  <label className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 border rounded-lg cursor-pointer hover:bg-gray-200">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingIndex === index ? '上传中…' : '本地上传'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(index, f)
                      }}
                    />
                  </label>
                  {form.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageField(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 产品要点 (8点) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">产品要点 (8点描述)</h2>
            
            <div className="space-y-4">
              {form.bulletPoints.map((point, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    要点 {index + 1} {index >= 5 && <span className="text-gray-400 font-normal">(可选)</span>} <span className="text-xs text-gray-500">(最多500字符)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    value={point}
                    onChange={(e) => updateBulletPoint(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={index >= 5 ? `(可选) 输入第${index + 1}个产品要点` : `输入第${index + 1}个产品要点`}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {point.length}/500 字符
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 产品描述 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">产品描述</h2>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  详细描述 * <span className="text-xs text-gray-500">(最多3000字符，支持HTML，视频插入：直接粘贴 YouTube 链接即可)</span>
                </label>
                <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <Upload className={`h-4 w-4 mr-2 ${descUploading ? 'animate-pulse' : ''}`} />
                  {descUploading ? '上传中...' : '插入图片 (Max 4MB)'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleDescImageUpload}
                    disabled={descUploading}
                  />
                </label>
              </div>
              <textarea
              ref={descTextareaRef}
              required
                rows={12}
                maxLength={3000}
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="详细描述产品的特性、用途、优势...&#10;&#10;支持HTML标签，例如：&#10;&lt;p&gt;段落文本&lt;/p&gt;&#10;&lt;ul&gt;&lt;li&gt;列表项&lt;/li&gt;&lt;/ul&gt;&#10;&lt;img src=&quot;图片URL&quot; alt=&quot;描述&quot; /&gt;&#10;&lt;strong&gt;粗体文本&lt;/strong&gt;"
              />
              <div className="text-xs text-gray-500 mt-1">
                {form.description.length}/3000 字符
              </div>
              <div className="text-xs text-gray-600 mt-2">
                <strong>支持的HTML标签：</strong> &lt;p&gt;, &lt;br&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;img&gt;, &lt;a&gt;, &lt;h1-h6&gt;
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">产品评论</h2>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" /> 添加评论
              </button>
            </div>

            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">表格导入评论（仅导入 5 星）</div>
                    <div className="text-xs text-gray-500">字段：标题、内容、星级、图片地址、评论人、所属国家、评论时间</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center px-3 py-2 text-sm bg-white border rounded-lg cursor-pointer hover:bg-gray-100">
                    选择文件
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleReviewImportFileChange}
                      disabled={reviewImporting}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleImportReviews}
                    disabled={!reviewImportFile || reviewImporting}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {reviewImporting ? '导入中…' : '开始导入'}
                  </button>
                </div>
              </div>
              {reviewImportFile && (
                <div className="text-xs text-gray-600 mt-2">已选择：{reviewImportFile.name}</div>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={reviewImportVisible}
                  onChange={(e) => setReviewImportVisible(e.target.checked)}
                />
                <span>导入后显示在前台</span>
              </div>
              {reviewImportPreview.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-2">
                    预览：共 {reviewImportPreview.length} 条，预计导入 {reviewImportableCount} 条，跳过 {reviewSkippedCount} 条
                  </div>
                  <div className="overflow-x-auto border rounded-lg bg-white">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">标题</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">内容</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">星级</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">图片</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">评论人</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">国家</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">时间</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">结果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewImportPreview.slice(0, 20).map((row, i) => (
                          <tr key={`${row.title}-${i}`} className="border-t">
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.title || '-'}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-[240px]">
                              {(row.content || '').length > 30 ? `${row.content.slice(0, 30)}…` : (row.content || '-')}
                            </td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.rating ?? '-'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.images.length}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.name || '-'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.country || '-'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {row.createdAt ? row.createdAt.replace('T', ' ').slice(0, 16) : '-'}
                            </td>
                            <td className={`px-3 py-2 whitespace-nowrap ${row.willImport ? 'text-green-600' : 'text-gray-500'}`}>
                              {row.willImport ? '将导入' : `跳过${row.reason ? `：${row.reason}` : ''}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reviewImportPreview.length > 20 && (
                    <div className="text-xs text-gray-500 mt-1">仅显示前 20 条预览</div>
                  )}
                </div>
              )}
              {reviewImportResult && (
                <div className="mt-3 text-sm text-gray-700">
                  已导入 {reviewImportResult.success} 条，跳过 {reviewImportResult.skipped} 条，失败 {reviewImportResult.failed} 条
                </div>
              )}
              {reviewImportResult?.errors?.length ? (
                <div className="mt-2 text-xs text-red-600">
                  {reviewImportResult.errors.slice(0, 5).map((e, i) => (
                    <div key={`${e}-${i}`}>{e}</div>
                  ))}
                </div>
              ) : null}
            </div>

            {loadingReviews ? (
              <div className="text-gray-600 flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" /> 加载中…</div>
            ) : (
              <div className="space-y-6">
                {editingReview ? (
                  <div className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">发言时间</label>
                        <input type="datetime-local" value={editingReview.createdAt || ''} onChange={(e) => setEditingReview({ ...editingReview!, createdAt: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">国家/地区</label>
                        <input type="text" value={editingReview.country} onChange={(e) => setEditingReview({ ...editingReview!, country: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                        <input type="text" value={editingReview.name} onChange={(e) => setEditingReview({ ...editingReview!, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                        <input type="text" value={editingReview.title} onChange={(e) => setEditingReview({ ...editingReview!, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text sm font-medium text-gray-700 mb-2">内容</label>
                        <textarea rows={4} value={editingReview.content} onChange={(e) => setEditingReview({ ...editingReview!, content: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <label className="flex items-center">
                        <input type="checkbox" checked={editingReview.isVisible} onChange={(e) => setEditingReview({ ...editingReview!, isVisible: e.target.checked })} />
                        <span className="ml-2 text-sm text-gray-700">显示在前台</span>
                      </label>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button key={i} type="button" onClick={() => setEditingReview({ ...editingReview!, rating: i + 1 })} className={"mr-1 " + (i < editingReview.rating ? 'text-yellow-500' : 'text-gray-300')}>
                            <Star className="h-5 w-5" />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-700">{editingReview.rating} 星</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">图片</span>
                        <button type="button" onClick={() => addReviewImageField(true)} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"><Plus className="h-4 w-4 mr-1" /> 添加图片</button>
                      </div>
                      <div className="space-y-3">
                        {(editingReview.images || []).map((img, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <input type="url" value={img} onChange={(e) => updateReviewImageField(idx, e.target.value, true)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="图片URL" />
                            <label className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 border rounded-lg cursor-pointer hover:bg-gray-200">
                              <Upload className="h-4 w-4 mr-2" /> 本地上传
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReviewImage(idx, f, true) }} />
                            </label>
                            {(editingReview.images || []).length > 1 && (
                              <button type="button" onClick={() => removeReviewImageField(idx, true)} className="text-red-600 hover:text-red-700"><X className="h-5 w-5" /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-3">
                      <button type="button" onClick={() => setEditingReview(null)} className="px-4 py-2 border rounded-lg">取消</button>
                      <button type="button" onClick={saveEditReview} className="px-4 py-2 bg-blue-600 text-white rounded-lg">保存</button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">发言时间</label>
                        <input type="datetime-local" value={newReview.createdAt || ''} onChange={(e) => setNewReview({ ...newReview, createdAt: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">国家/地区</label>
                        <input type="text" value={newReview.country} onChange={(e) => setNewReview({ ...newReview, country: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                        <input type="text" value={newReview.name} onChange={(e) => setNewReview({ ...newReview, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                        <input type="text" value={newReview.title} onChange={(e) => setNewReview({ ...newReview, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                        <textarea rows={4} value={newReview.content} onChange={(e) => setNewReview({ ...newReview, content: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <label className="flex items-center">
                        <input type="checkbox" checked={newReview.isVisible} onChange={(e) => setNewReview({ ...newReview, isVisible: e.target.checked })} />
                        <span className="ml-2 text-sm text-gray-700">显示在前台</span>
                      </label>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button key={i} type="button" onClick={() => setNewReview({ ...newReview, rating: i + 1 })} className={"mr-1 " + (i < newReview.rating ? 'text-yellow-500' : 'text-gray-300')}>
                            <Star className="h-5 w-5" />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-700">{newReview.rating} 星</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">图片</span>
                        <button type="button" onClick={() => addReviewImageField(false)} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"><Plus className="h-4 w-4 mr-1" /> 添加图片</button>
                      </div>
                      <div className="space-y-3">
                        {(newReview.images || []).map((img, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <input type="url" value={img} onChange={(e) => updateReviewImageField(idx, e.target.value, false)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="图片URL" />
                            <label className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 border rounded-lg cursor-pointer hover:bg-gray-200">
                              <Upload className="h-4 w-4 mr-2" /> 本地上传
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReviewImage(idx, f, false) }} />
                            </label>
                            {(newReview.images || []).length > 1 && (
                              <button type="button" onClick={() => removeReviewImageField(idx, false)} className="text-red-600 hover:text-red-700"><X className="h-5 w-5" /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end">
                      <button type="button" onClick={saveNewReview} className="px-4 py-2 bg-blue-600 text-white rounded-lg">添加评论</button>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-2">已有评论</h3>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-gray-600">暂无评论</p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map(r => (
                        <div key={r.id} className="border rounded-lg p-4 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={"h-4 w-4 " + (i < r.rating ? 'text-yellow-500' : 'text-gray-300')} />
                              ))}
                              <span className="text-sm text-gray-700">{r.title}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{r.name} {r.country ? `(${r.country})` : ''}</div>
                            <div className="text-sm text-gray-700 mt-2">{r.content}</div>
                            {Array.isArray(r.images) && r.images.length > 0 && (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                {r.images.map((img, idx) => (
                                  <img key={idx} src={img.startsWith('http') ? img : (img.startsWith('/') ? img : `/${img}`)} alt="" className="w-full h-20 object-cover rounded" />
                                ))}
                              </div>
                            )}
                            <div className="mt-2">
                              <label className="inline-flex items-center">
                                <input type="checkbox" checked={r.isVisible} onChange={async (e) => { const res = await fetch(`/api/reviews/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isVisible: e.target.checked }) }); if (res.ok) { const updated = await res.json(); setReviews(reviews.map(rr => rr.id === updated.id ? updated : rr)) } }} />
                                <span className="ml-2 text-sm text-gray-700">显示在前台</span>
                              </label>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button type="button" onClick={() => startEditReview(r)} className="text-blue-600 hover:text-blue-700 text-sm">编辑</button>
                            <button type="button" onClick={() => deleteReview(r.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/admin/products"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  更新中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  更新产品
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    {previewImage && <PreviewOverlay image={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  )
}
