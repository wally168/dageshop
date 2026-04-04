import Link from 'next/link'
import Layout from '@/components/Layout'
import { db } from '@/lib/db'
import { formatPrice, getProductUrlSegment } from '@/lib/utils'
import AddToCartButton from '@/components/AddToCartButton'
import FallbackImage from '@/components/FallbackImage'
import type { Product } from '@prisma/client'
import { getFrontendLanguage } from '@/lib/site-language'
import { t } from '@/lib/i18n'

type ProductWithVariantPrice = Product & {
  variantOptionPrices?: string | null
  variantOptionOriginalPrices?: string | null
  variantOptionTitles?: string | null
}

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ categoryId?: string; q?: string }> }) {
  const lang = await getFrontendLanguage()
  const resolvedParams = searchParams ? await searchParams : {}
  const selectedCategoryId = resolvedParams?.categoryId || ''
  const q = resolvedParams?.q || ''
  let products: ProductWithVariantPrice[] = []
  try {
    const where: any = { active: true }
    if (selectedCategoryId) where.categoryId = selectedCategoryId
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    products = await db.product.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })
  } catch (e) {
    console.error('Failed to load products:', e)
    products = []
  }

  let aggMap: Record<string, { avgRating: number; reviewCount: number }> = {}
  try {
    const ids = products.map((p) => p.id)
    if (ids.length > 0) {
      const groups = await (db as any).productReview.groupBy({
        by: ['productId'],
        where: { productId: { in: ids }, isVisible: true },
        _avg: { rating: true },
        _count: { _all: true },
      })
      aggMap = Object.fromEntries(groups.map((g: any) => [
        g.productId,
        {
          avgRating: typeof g._avg?.rating === 'number' ? Math.round(g._avg.rating * 10) / 10 : 0,
          reviewCount: typeof g._count?._all === 'number' ? g._count._all : 0,
        }
      ]))
    }
  } catch (e) {
    console.error('Failed to aggregate reviews:', e)
  }

  let categories: Array<{ id: string; name: string }> = []
  try {
    const rows = await db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
    categories = rows
  } catch {}

  const resolveImage = (p: ProductWithVariantPrice): string => {
    const main = (p?.mainImage ?? '').trim()
    if (main) return main
    try {
      const arr = JSON.parse(p?.images ?? '[]')
      if (Array.isArray(arr) && arr.length > 0) {
        const first = (arr[0] ?? '').trim()
        if (first) return first
      }
    } catch {}
    return 'https://placehold.co/600x600?text=No+Image'
  }

  const resolveListPrices = (p: ProductWithVariantPrice): { price: number; originalPrice: number | null } => {
    const basePrice = Number(p?.price ?? 0)
    const baseOriginal = typeof p?.originalPrice === 'number' ? Number(p.originalPrice) : null
    try {
      const pricesObj = p?.variantOptionPrices ? JSON.parse(p.variantOptionPrices) : null
      const originalObj = p?.variantOptionOriginalPrices
        ? JSON.parse(p.variantOptionOriginalPrices)
        : (pricesObj?.__original_price_map__ ?? null)
      const pickFirstNumber = (obj: any): number | null => {
        if (!obj || typeof obj !== 'object') return null
        const combo = obj.__combo__
        if (combo && typeof combo === 'object') {
          const comboValue = Object.values(combo).find((v) => Number.isFinite(Number(v)))
          if (comboValue !== undefined) return Number(comboValue)
        }
        for (const [k, group] of Object.entries(obj)) {
          if (k === '__combo__' || k === '__original_price_map__') continue
          if (!group || typeof group !== 'object') continue
          const v = Object.values(group).find((x) => Number.isFinite(Number(x)))
          if (v !== undefined) return Number(v)
        }
        return null
      }
      const variantPrice = pickFirstNumber(pricesObj)
      const variantOriginal = pickFirstNumber(originalObj)
      return {
        price: variantPrice ?? basePrice,
        originalPrice: variantOriginal ?? (variantPrice === null ? baseOriginal : null),
      }
    } catch {
      return { price: basePrice, originalPrice: baseOriginal }
    }
  }

  const resolveListTitle = (p: ProductWithVariantPrice): string => {
    const baseTitle = (p?.title || '').trim() || 'Untitled Product'
    try {
      const pricesObj = p?.variantOptionPrices ? JSON.parse(p.variantOptionPrices) : null
      const titleObj = p?.variantOptionTitles
        ? JSON.parse(p.variantOptionTitles)
        : (pricesObj?.__title_map__ ?? null)
      const pickFirstTitle = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null
        const combo = obj.__combo__
        if (combo && typeof combo === 'object') {
          const comboValue = Object.values(combo).find((v) => typeof v === 'string' && v.trim())
          if (typeof comboValue === 'string') return comboValue.trim()
        }
        for (const [k, group] of Object.entries(obj)) {
          if (k === '__combo__' || k === '__title_map__') continue
          if (!group || typeof group !== 'object') continue
          const v = Object.values(group).find((x) => typeof x === 'string' && x.trim())
          if (typeof v === 'string') return v.trim()
        }
        return null
      }
      return pickFirstTitle(titleObj) || baseTitle
    } catch {
      return baseTitle
    }
  }

  return (
    <Layout>
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {t(lang, 'products.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
              {t(lang, 'products.subtitle')}
            </p>
          </div>

          {/* Filter bar */}
          <div className="mt-10 flex items-center justify-center">
            <form method="get" action="/products" className="flex items-center gap-3">
              <select name="categoryId" defaultValue={selectedCategoryId} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">{t(lang, 'products.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {q && <input type="hidden" name="q" value={q} />}
              <button type="submit" className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300">{t(lang, 'products.apply')}</button>
            </form>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {products.map((product) => {
              const productPath = `/products/${getProductUrlSegment(product as Product & { asin?: string | null })}`
              const displayImage = resolveImage(product)
              const resolvedPrice = resolveListPrices(product)
              const resolvedTitle = resolveListTitle(product)
              const price = resolvedPrice.price
              const hasOriginal = typeof resolvedPrice.originalPrice === 'number' && Number(resolvedPrice.originalPrice) > price
              const amazonUrl = typeof product?.amazonUrl === 'string' ? product.amazonUrl : ''
              const showBuy = product.showBuyOnAmazon !== false && !!amazonUrl
              const showAdd = product.showAddToCart !== false
              const avgRating = aggMap[product.id]?.avgRating ?? 0
              const reviewCount = aggMap[product.id]?.reviewCount ?? 0

              return (
                <div key={product.id} className="group relative">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                    <FallbackImage
                      src={displayImage}
                      alt={product.title || 'Product image'}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4 flex justify-between">
                    <div className="flex-1">
                      <h3 className="relative text-sm text-gray-700">
                        <Link href={productPath}>
                          <span aria-hidden="true" className="absolute inset-0" />
                          {resolvedTitle}
                        </Link>
                      </h3>
                      {reviewCount > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span className="text-gray-900 font-medium">{avgRating.toFixed(1)}</span>
                          <span className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < Math.round(avgRating) ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                            ))}
                          </span>
                          <span className="text-gray-600">({reviewCount})</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-lg font-medium text-gray-900">
                          {formatPrice(price)}
                        </p>
                        {hasOriginal && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatPrice(Number(resolvedPrice.originalPrice))}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Link
                          href={productPath}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-orange-600 text-white text-sm font-semibold leading-tight text-center hover:bg-orange-500"
                        >
                          {t(lang, 'products.viewDetails')}
                        </Link>
                        {showBuy && (
                          <a
                            href={amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold leading-tight text-center hover:bg-blue-500"
                          >
                            {t(lang, 'products.buyOnAmazon')}
                          </a>
                        )}
                        {showAdd && (
                          <div className="flex items-center">
                            <AddToCartButton
                              id={product.id}
                              slug={getProductUrlSegment(product as Product & { asin?: string | null })}
                              title={resolvedTitle}
                              price={price}
                              imageUrl={resolveImage(product)}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">{t(lang, 'products.noProducts')}</p>
              <p className="text-gray-400 text-sm mt-2">{t(lang, 'products.checkBackLater')}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
