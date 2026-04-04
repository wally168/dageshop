"use client"

import { useState } from "react"

export default function ProductImageGallery({
  images,
  mainImage,
  title,
  youtubeUrl,
  youtubeIndex,
  selectedIndex,
  onIndexChange,
}: {
  images: string[]
  mainImage: string
  title: string
  youtubeUrl?: string | null
  youtubeIndex?: number | null
  selectedIndex?: number
  onIndexChange?: (index: number) => void
}) {
  const displayImages = Array.isArray(images) && images.length > 0 ? images : [mainImage]
  const [internalIndex, setInternalIndex] = useState(0)

  const normalize = (src: string) => (src.startsWith("http") ? src : src.startsWith("/") ? src : `/${src}`)

  // 新增：大图查看开关
  const [isModalOpen, setIsModalOpen] = useState(false)

  const extractYoutubeId = (value?: string | null): string | null => {
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

  const youtubeId = extractYoutubeId(youtubeUrl)
  const galleryItems = (() => {
    if (!youtubeId) return displayImages.map((src) => ({ type: 'image' as const, src }))
    const insertIndex = (() => {
      const raw = typeof youtubeIndex === 'number' && Number.isFinite(youtubeIndex) ? youtubeIndex : 1
      return Math.max(0, Math.min(raw, displayImages.length))
    })()
    const items: Array<{ type: 'image'; src: string } | { type: 'video'; id: string }> = []
    for (let i = 0; i < displayImages.length; i += 1) {
      if (i === insertIndex) items.push({ type: 'video', id: youtubeId })
      items.push({ type: 'image', src: displayImages[i] })
    }
    if (insertIndex >= displayImages.length) items.push({ type: 'video', id: youtubeId })
    return items
  })()
  const activeIndex = (typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < galleryItems.length)
    ? selectedIndex
    : internalIndex
  const current = galleryItems[activeIndex] || galleryItems[0]

  return (
    <div>
      {/* 固定 800x800 视窗，移动端自适应方形 */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-white border flex items-center justify-center"
        style={{ maxWidth: 800, aspectRatio: '1 / 1' }}
        onClick={() => {
          if (current?.type === 'image') setIsModalOpen(true)
        }}
      >
        {current?.type === 'video' ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${current.id}`}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <>
            <img src={normalize(current?.src || '')} alt={title} className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform duration-200" />
            <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">Click to enlarge</div>
          </>
        )}
      </div>

      {galleryItems.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {galleryItems.map((item, idx) => (
            <button
              key={`${item.type}-${idx}`}
              type="button"
              className={`relative rounded overflow-hidden border ${
                idx === activeIndex ? "ring-2 ring-blue-500" : "border-transparent"
              }`}
              onClick={() => {
                setInternalIndex(idx)
                onIndexChange?.(idx)
              }}
              aria-label={`View image ${idx + 1}`}
            >
              {item.type === 'video' ? (
                <img src={`https://img.youtube.com/vi/${item.id}/hqdefault.jpg`} alt={`Thumbnail ${idx + 1}`} className="w-full h-24 object-contain bg-white" />
              ) : (
                <img src={normalize(item.src)} alt={`Thumbnail ${idx + 1}`} className="w-full h-24 object-contain bg-white" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 大图弹窗 */}
      {isModalOpen && current?.type === 'image' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={normalize(current?.src || '')} alt={title} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-lg" />
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow hover:bg-gray-100"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
