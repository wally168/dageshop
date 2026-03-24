"use client"

import { useMemo, useState, useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import ProductImageGallery from './ProductImageGallery'
import { formatPrice } from '@/lib/utils'
import AddToCartButton from './AddToCartButton'

  type VariantGroup = { name: string; options: string[] }

  const COMBO_KEY = '__combo__'

  function buildComboKey(groups: VariantGroup[], selections: Record<string, string>): string {
    if (!Array.isArray(groups) || groups.length === 0) return ''
    return groups
      .filter(g => g?.name && selections[g.name])
      .map(g => `${g.name}=${selections[g.name]}`)
      .join('|')
  }

 function formatPublishedAt(dt?: string | Date | null): string {
   if (!dt) return ''
   try {
     const d = new Date(dt)
     return d.toLocaleDateString()
   } catch { return '' }
 }

function extractYoutubeId(value?: string | null): string | null {
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

function replaceYoutubeLinks(input: string): string {
  if (!input) return ''
  if (input.includes('<iframe')) return input
  const urlRegex = /(https?:\/\/[^\s"<>]+)/g
  return input.replace(urlRegex, (url) => {
    const id = extractYoutubeId(url)
    if (!id) return url
    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}`
    return `<div style="margin:12px 0;"><iframe src="${embedUrl}" title="YouTube video player" style="width:100%; aspect-ratio:16 / 9; border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
  })
}
 
 export default function ProductDetailClient({
   id,
   slug,
   title,
   categoryName,
   brand,
   upc,
   publishedAt,
   description,
   amazonUrl,
   price,
   originalPrice,
   images,
   mainImage,
  youtubeUrl,
  youtubeIndex,
   bullets,
   variantGroups,
   variantImageMap,
   variantOptionImages,
  variantOptionLinks,
  showBuyOnAmazon = true,
  showAddToCart = true,
  reviews = [],
}: {
  id: string
  slug: string
  title: string
  categoryName?: string
  brand?: string | null
  upc?: string | null
  publishedAt?: string | Date | null
  description: string
  amazonUrl: string
  price: number
  originalPrice?: number | null
  images: string[]
  mainImage: string
  youtubeUrl?: string | null
  youtubeIndex?: number | null
  bullets: string[]
  variantGroups: VariantGroup[]
  variantImageMap?: Record<string, Record<string, number>> | null
  variantOptionImages?: Record<string, Record<string, string>> | null
  variantOptionLinks?: Record<string, Record<string, string>> | null
  showBuyOnAmazon?: boolean
  showAddToCart?: boolean
  reviews?: Array<{ id: string; name: string; country: string; title: string; content: string; rating: number; images: string[]; createdAt?: string | Date }>
}): ReactElement {
   const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number>(0)
   const [selection, setSelection] = useState<Record<string, string>>({})
  const [failedThumb, setFailedThumb] = useState<Record<string, boolean>>({})
  const [lastClickedGroup, setLastClickedGroup] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number>(0)
  const [sortBy, setSortBy] = useState<'time' | 'rating'>('time')
  const [onlyWithImages, setOnlyWithImages] = useState<boolean>(false)
  const touchStartXRef = useRef<number | null>(null)
 
   const safeImages = useMemo(() => {
     const arr = Array.isArray(images) && images.length > 0 ? images : [mainImage]
     return arr.filter(Boolean)
   }, [images, mainImage])
  const youtubeId = useMemo(() => extractYoutubeId(youtubeUrl), [youtubeUrl])
  const normalizedYoutubeIndex = useMemo(() => {
    if (!youtubeId) return null
    const raw = typeof youtubeIndex === 'number' && Number.isFinite(youtubeIndex) ? youtubeIndex : 1
    return Math.max(0, Math.min(raw, safeImages.length))
  }, [youtubeId, youtubeIndex, safeImages.length])
  const hasGalleryVideo = !!youtubeId && normalizedYoutubeIndex !== null
  const toGalleryIndex = (imageIndex: number) => {
    if (!hasGalleryVideo || normalizedYoutubeIndex === null) return imageIndex
    return imageIndex >= normalizedYoutubeIndex ? imageIndex + 1 : imageIndex
  }
  const toImageIndex = (galleryIndex: number) => {
    if (!hasGalleryVideo || normalizedYoutubeIndex === null) return galleryIndex
    if (galleryIndex === normalizedYoutubeIndex) {
      return Math.min(normalizedYoutubeIndex, Math.max(0, safeImages.length - 1))
    }
    if (galleryIndex > normalizedYoutubeIndex) return galleryIndex - 1
    return galleryIndex
  }
   const selectedImageIndex = toImageIndex(selectedGalleryIndex)
   const primaryImageUrl = safeImages[selectedImageIndex] || mainImage
 
   const resolveIndex = (groupName: string, option: string): number => {
     // 映射表优先
     const mapped = variantImageMap?.[groupName]?.[option]
     if (typeof mapped === 'number' && mapped >= 0 && mapped < safeImages.length) return mapped
     // 基于文件名/URL包含的简单匹配（兼容无映射的情况）
     const lower = option.toLowerCase()
     const candidate = safeImages.findIndex((src) => src.toLowerCase().includes(lower))
     if (candidate >= 0) return candidate
     // 兜底主图
     return 0
   }
 
   const handleVariantClick = (groupName: string, opt: string) => {
     setSelection((prev) => ({ ...prev, [groupName]: opt }))
     setLastClickedGroup(groupName)
     const idx = resolveIndex(groupName, opt)
    setSelectedGalleryIndex(toGalleryIndex(idx))
  }

  // 构造缩略图URL
  const getThumbUrl = (groupName: string, opt: string): string | null => {
    const url = variantOptionImages?.[groupName]?.[opt]
    if (!url || typeof url !== 'string') return null
    return url.startsWith('http') ? url : (url.startsWith('/') ? url : `/${url}`)
  }

  const normalizeUrl = (u: string): string => {
    return u.startsWith('http') ? u : (u.startsWith('/') ? u : `/${u}`)
  }

  const sortedReviews = useMemo(() => {
    let arr = Array.isArray(reviews) ? [...reviews] : []
    if (onlyWithImages) arr = arr.filter(r => Array.isArray(r.images) && r.images.length > 0)
    if (sortBy === 'rating') {
      arr.sort((a, b) => b.rating - a.rating)
    } else {
      arr.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bd - ad
      })
    }
    return arr
  }, [reviews, sortBy, onlyWithImages])

  const formatReviewDate = (dt?: string | Date) => {
    if (!dt) return ''
    try {
      const d = new Date(dt)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  useEffect(() => {
    if (!previewUrls) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewUrls(null)
      else if (e.key === 'ArrowRight') setPreviewIndex(i => Math.min(i + 1, (previewUrls?.length ?? 1) - 1))
      else if (e.key === 'ArrowLeft') setPreviewIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewUrls])

  // 计算当前购买链接：
  // 1) 优先匹配“组合链接”（当所有分组均已选择）
  // 2) 再使用最近点击的分组映射
  // 3) 其次任何已选拥有映射的分组
  // 4) 兜底回退到产品 amazonUrl
  const currentBuyUrl = (() => {
    const ensureUrl = (u?: string | null): string | null => {
      if (!u || typeof u !== 'string') return null
      return u
    }
    if (Array.isArray(variantGroups) && variantGroups.length > 1) {
      const allSelected = variantGroups.every(g => !!selection[g.name])
      if (allSelected) {
        const key = buildComboKey(variantGroups, selection)
        const comboUrl = variantOptionLinks?.[COMBO_KEY]?.[key]
        const e = ensureUrl(comboUrl)
        if (e) return e
      }
    }
    if (lastClickedGroup && selection[lastClickedGroup]) {
      const u = variantOptionLinks?.[lastClickedGroup]?.[selection[lastClickedGroup]]
      const e = ensureUrl(u)
      if (e) return e
    }
    for (const [g, opt] of Object.entries(selection)) {
      const u = variantOptionLinks?.[g]?.[opt]
      const e = ensureUrl(u)
      if (e) return e
    }
    return amazonUrl
  })()

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* 左侧：图片 */}
      <div>
        <ProductImageGallery
          images={safeImages}
          mainImage={mainImage}
          title={title}
          youtubeUrl={youtubeUrl}
          youtubeIndex={normalizedYoutubeIndex}
          selectedIndex={selectedGalleryIndex}
          onIndexChange={setSelectedGalleryIndex}
        />
      </div>

      {/* 右侧：详情 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {categoryName && (
          <p className="mt-2 text-gray-600">Category: {categoryName}</p>
        )}
        {brand && (
          <p className="mt-1 text-gray-600">Brand: {brand}</p>
        )}
        {upc && (
          <p className="mt-1 text-gray-600">UPC: {upc}</p>
        )}
        {publishedAt && (
          <p className="mt-1 text-gray-500 text-sm">Date First Available : {formatPublishedAt(publishedAt)}</p>
        )}

        {/* 变体选项挪到价格上方，优先图片显示 */}
        {Array.isArray(variantGroups) && variantGroups.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-900">Available Options</h3>
            <div className="mt-3 space-y-4">
              {variantGroups.map((group, gi) => (
                <div key={gi}>
                  <p className="text-sm text-gray-700">{group.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(group.options || []).filter(Boolean).map((opt, oi) => {
                      const active = selection[group.name] === opt
                      const thumb = getThumbUrl(group.name, opt)
                      const k = `${group.name}::${opt}`
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => handleVariantClick(group.name, opt)}
                          className={`relative group inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border transition-colors ${
                            active ? 'ring-2 ring-blue-600 border-blue-600' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          style={{ minWidth: 44, minHeight: 44 }}
                        >
                          {thumb && !failedThumb[k] ? (
                            <>
                              <img
                                src={thumb}
                                alt={opt}
                                className="w-10 h-10 object-cover rounded"
                                onError={() => setFailedThumb(prev => ({ ...prev, [k]: true }))}
                              />
                              {/* 悬停文字叠层 */}
                              <span className="absolute -bottom-1 left-0 hidden group-hover:block translate-y-full bg-black/60 text-white text-[11px] px-1.5 py-0.5 rounded">
                                {opt}
                              </span>
                            </>
                          ) : (
                            <span className="px-3 py-1 text-gray-700">{opt}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 购买/加购操作区 */}
        <div className="mt-6 flex items-center gap-3">
        {showBuyOnAmazon && (
        <a
        href={currentBuyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500"
        >
        Buy on Amazon
        </a>
        )}
        {showAddToCart && (
        <AddToCartButton
        id={id}
        slug={slug}
        title={title}
        price={price}
        imageUrl={primaryImageUrl}
        selectedOptions={selection}
        showQuantitySelector={true}
        />
        )}
        </div>

         {/* 价格模块放在选项之后 */}
         <div className="mt-4 flex items-center gap-3">
           <span className="text-2xl font-semibold text-gray-900">{formatPrice(price)}</span>
           {originalPrice ? (
             <span className="text-gray-500 line-through">{formatPrice(originalPrice)}</span>
           ) : null}
        </div>

        {Array.isArray(bullets) && bullets.length > 0 && (
          <ul className="mt-4 list-disc list-inside text-gray-700 space-y-1">
            {bullets.filter(b => b && b.trim()).map((b, i) => (<li key={i}>{b}</li>))}
          </ul>
        )}

      </div>
    </div>

    <div className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900">Product Description</h2>
      <div 
        className="mt-2 text-gray-700 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: replaceYoutubeLinks(description) }}
        style={{ lineHeight: '1.6' }}
      />
    </div>
    {Array.isArray(sortedReviews) && sortedReviews.length > 0 && (
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Customer Reviews</h2>
        <div className="mt-2 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyWithImages} onChange={(e) => setOnlyWithImages(e.target.checked)} />
            Only reviews with images
          </label>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'time' | 'rating')} className="border rounded px-2 py-1">
              <option value="time">Newest</option>
              <option value="rating">Highest Rating</option>
            </select>
          </div>
        </div>
        <div className="mt-4 divide-y divide-gray-200">
          {sortedReviews.map((r) => (
            <div key={r.id} className="py-4">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < r.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                ))}
                <span className="text-sm text-gray-700">{r.title}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">{r.name} {r.country ? `(${r.country})` : ''} {r.createdAt ? `• ${formatReviewDate(r.createdAt)}` : ''}</div>
              <div className="text-sm text-gray-700 mt-2">{r.content}</div>
              {Array.isArray(r.images) && r.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.images.map((img, idx) => {
                    const u = normalizeUrl(img)
                    return (
                      <img
                        key={idx}
                        src={u}
                        alt=""
                        className="h-32 w-auto object-contain rounded cursor-zoom-in border border-gray-200"
                        onClick={() => { setPreviewUrls(r.images.map(normalizeUrl)); setPreviewIndex(idx) }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
    {previewUrls && (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setPreviewUrls(null)}>
        <button type="button" className="absolute top-3 right-3 bg-black/60 text-white rounded px-3 py-1 text-sm" onClick={(e) => { e.stopPropagation(); setPreviewUrls(null) }}>Close</button>
        {previewUrls.length > 1 && (
          <>
            <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg" onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => Math.max(i - 1, 0)) }} disabled={previewIndex <= 0}>‹</button>
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg" onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => Math.min(i + 1, previewUrls.length - 1)) }} disabled={previewIndex >= previewUrls.length - 1}>›</button>
          </>
        )}
        <img
          src={previewUrls[previewIndex]}
          alt=""
          className="max-h-[85vh] max-w-[90vw] object-contain rounded shadow-lg"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => { touchStartXRef.current = e.touches?.[0]?.clientX ?? null }}
          onTouchEnd={(e) => {
            const startX = touchStartXRef.current
            const endX = e.changedTouches?.[0]?.clientX
            if (typeof startX === 'number' && typeof endX === 'number') {
              const dx = endX - startX
              const TH = 40
              if (dx > TH) setPreviewIndex(i => Math.max(i - 1, 0))
              else if (dx < -TH) setPreviewIndex(i => Math.min(i + 1, previewUrls.length - 1))
            }
            touchStartXRef.current = null
          }}
        />
      </div>
    )}
    </>
  )
}
