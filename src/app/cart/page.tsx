'use client'

import Layout from '@/components/Layout'
import { loadCart, removeItem, clearCart, CartItem } from '@/lib/cart'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { useSettings } from '@/lib/settings'
import { normalizeFrontendLanguage, t, translateAttributeName } from '@/lib/i18n'

export default function CartPage() {
  const { settings } = useSettings()
  const lang = normalizeFrontendLanguage(settings.frontendLanguage)
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(loadCart())
  }, [])

  const handleRemove = (id: string, selectedOptions?: Record<string, string>) => {
    const next = removeItem(id, selectedOptions)
    setItems(next)
  }

  const handleClear = () => {
    clearCart()
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + i.price * (i.quantity || 0), 0)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900">{t(lang, 'cart.title')}</h1>
        {items.length === 0 ? (
          <div className="mt-6 text-gray-600">
            <p>{t(lang, 'cart.empty')}</p>
            <Link href="/products" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">{t(lang, 'cart.browseProducts')}</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((i, idx) => (
              <div key={idx} className="flex items-center gap-4 border rounded-lg p-3">
                <img src={i.imageUrl} alt={i.title} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <Link href={`/products/${i.slug}`} className="text-gray-900 font-medium hover:text-blue-600">{i.title}</Link>
                  <div className="text-sm text-gray-600">{t(lang, 'cart.quantity')}: {i.quantity}</div>
                  {i.selectedOptions && (
                    <div className="text-sm text-gray-600">{t(lang, 'cart.options')}: {Object.entries(i.selectedOptions).map(([k,v]) => `${translateAttributeName(k, lang)}: ${v}`).join(', ')}</div>
                  )}
                </div>
                <div className="text-gray-900 font-semibold">{formatPrice(i.price * i.quantity)}</div>
                <button
                  type="button"
                  onClick={() => handleRemove(i.id, i.selectedOptions)}
                  className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50"
                >
                  {t(lang, 'cart.remove')}
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <div className="text-xl font-semibold">{t(lang, 'cart.total')}: {formatPrice(total)}</div>
              <div className="flex items-center gap-3">
                <Link href="/products" className="px-4 py-2 rounded-md border hover:bg-gray-50">{t(lang, 'cart.continueShopping')}</Link>
                <button type="button" onClick={handleClear} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500">{t(lang, 'cart.clearCart')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
