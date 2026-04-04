'use client'

import { useState } from 'react'
import { addItem, CartItem } from '@/lib/cart'
import { useSettings } from '@/lib/settings'
import { normalizeFrontendLanguage, t } from '@/lib/i18n'

interface Props {
  id: string
  slug: string
  title: string
  price: number
  imageUrl: string
  selectedOptions?: Record<string, string>
  showQuantitySelector?: boolean
  defaultQuantity?: number
  onAdded?: (items: CartItem[]) => void
  size?: 'sm' | 'md'
}

export default function AddToCartButton({
  id,
  slug,
  title,
  price,
  imageUrl,
  selectedOptions,
  showQuantitySelector = false,
  defaultQuantity = 1,
  onAdded,
  size = 'md',
}: Props) {
  const { settings } = useSettings()
  const lang = normalizeFrontendLanguage(settings.frontendLanguage)
  const [qty, setQty] = useState<number>(Math.max(1, defaultQuantity))
  const [feedback, setFeedback] = useState<string>('')
  const canMinus = qty > 1

  const handleAdd = () => {
    const items = addItem({ id, slug, title, price, imageUrl, selectedOptions, quantity: qty })
    setFeedback(t(lang, 'addToCart.added'))
    if (onAdded) onAdded(items)
    setTimeout(() => setFeedback(''), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      {showQuantitySelector && (
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setQty(q => Math.max(1, q - 1))}
            disabled={!canMinus}
            className={`px-3 py-2 text-sm ${canMinus ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
            aria-label={t(lang, 'addToCart.decreaseQty')}
          >
            -
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => {
              const v = parseInt(e.target.value || '1', 10)
              setQty(Number.isFinite(v) && v > 0 ? v : 1)
            }}
            className="w-14 text-center outline-none py-2"
            aria-label={t(lang, 'addToCart.quantity')}
          />
          <button
            type="button"
            onClick={() => setQty(q => q + 1)}
            className="px-3 py-2 text-sm hover:bg-gray-50"
            aria-label={t(lang, 'addToCart.increaseQty')}
          >
            +
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className={`inline-flex items-center justify-center ${size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded-md bg-green-600 text-white font-semibold hover:bg-green-500 text-center leading-tight`}
      >
        {t(lang, 'addToCart.button')}
      </button>

      {feedback && (
        <span className="text-sm text-gray-600" aria-live="polite">{feedback}</span>
      )}
    </div>
  )
}
