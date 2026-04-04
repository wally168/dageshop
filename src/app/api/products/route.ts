import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'
import { normalizeAsin } from '@/lib/utils'

const ORIGINAL_PRICE_FALLBACK_KEY = '__original_price_map__'
const TITLE_FALLBACK_KEY = '__title_map__'

function parseJsonObj(input: string | null | undefined): any {
  try {
    return input ? JSON.parse(input) : null
  } catch {
    return null
  }
}

function splitVariantPriceMaps(
  variantOptionPricesRaw: string | null | undefined,
  variantOptionOriginalPricesRaw: string | null | undefined
): { variantOptionPrices: any; variantOptionOriginalPrices: any } {
  const pricesObj = parseJsonObj(variantOptionPricesRaw)
  const originalObj = parseJsonObj(variantOptionOriginalPricesRaw)
  if (originalObj && typeof originalObj === 'object') {
    if (pricesObj && typeof pricesObj === 'object' && pricesObj[ORIGINAL_PRICE_FALLBACK_KEY]) {
      delete pricesObj[ORIGINAL_PRICE_FALLBACK_KEY]
    }
    return {
      variantOptionPrices: pricesObj && typeof pricesObj === 'object' ? pricesObj : null,
      variantOptionOriginalPrices: originalObj,
    }
  }
  const fallbackOriginal = pricesObj?.[ORIGINAL_PRICE_FALLBACK_KEY]
  if (pricesObj && typeof pricesObj === 'object' && pricesObj[ORIGINAL_PRICE_FALLBACK_KEY]) {
    delete pricesObj[ORIGINAL_PRICE_FALLBACK_KEY]
  }
  return {
    variantOptionPrices: pricesObj && typeof pricesObj === 'object' ? pricesObj : null,
    variantOptionOriginalPrices: fallbackOriginal && typeof fallbackOriginal === 'object' ? fallbackOriginal : null,
  }
}

function splitVariantTitleMaps(
  variantOptionPricesRaw: string | null | undefined,
  variantOptionTitlesRaw: string | null | undefined
): { variantOptionPrices: any; variantOptionTitles: any } {
  const pricesObj = parseJsonObj(variantOptionPricesRaw)
  const titleObj = parseJsonObj(variantOptionTitlesRaw)
  if (titleObj && typeof titleObj === 'object') {
    if (pricesObj && typeof pricesObj === 'object' && pricesObj[TITLE_FALLBACK_KEY]) {
      delete pricesObj[TITLE_FALLBACK_KEY]
    }
    return {
      variantOptionPrices: pricesObj && typeof pricesObj === 'object' ? pricesObj : null,
      variantOptionTitles: titleObj,
    }
  }
  const fallbackTitle = pricesObj?.[TITLE_FALLBACK_KEY]
  if (pricesObj && typeof pricesObj === 'object' && pricesObj[TITLE_FALLBACK_KEY]) {
    delete pricesObj[TITLE_FALLBACK_KEY]
  }
  return {
    variantOptionPrices: pricesObj && typeof pricesObj === 'object' ? pricesObj : null,
    variantOptionTitles: fallbackTitle && typeof fallbackTitle === 'object' ? fallbackTitle : null,
  }
}

function mergeVariantPricesWithOriginal(
  variantOptionPricesRaw: string | null | undefined,
  variantOptionOriginalPricesRaw: string | null | undefined
): string | undefined {
  const pricesObj = parseJsonObj(variantOptionPricesRaw) || {}
  const originalObj = parseJsonObj(variantOptionOriginalPricesRaw)
  if (!originalObj || typeof originalObj !== 'object') {
    return variantOptionPricesRaw ?? undefined
  }
  pricesObj[ORIGINAL_PRICE_FALLBACK_KEY] = originalObj
  return JSON.stringify(pricesObj)
}

function mergeVariantPricesWithTitle(
  variantOptionPricesRaw: string | null | undefined,
  variantOptionTitlesRaw: string | null | undefined
): string | undefined {
  const pricesObj = parseJsonObj(variantOptionPricesRaw) || {}
  const titleObj = parseJsonObj(variantOptionTitlesRaw)
  if (!titleObj || typeof titleObj !== 'object') {
    return variantOptionPricesRaw ?? undefined
  }
  pricesObj[TITLE_FALLBACK_KEY] = titleObj
  return JSON.stringify(pricesObj)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (includeInactive) {
      const { response } = await requireAdminSession(request)
      if (response) return response
    }
    
    const where: any = {}
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (featured === 'true') {
      where.featured = true
    }
    if (!includeInactive) {
      where.active = true
    }

    const queryOptions: any = {
      where,
      include: {
        category: true,
        brandRelation: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    }

    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        queryOptions.take = limitNum
      }
    }

    const products = await db.product.findMany(queryOptions)

    // 聚合可见评论的评分与数量
    const ids = products.map((p: any) => p.id)
    let aggMap: Record<string, { avgRating: number; reviewCount: number }> = {}
    if (ids.length > 0) {
      try {
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
      } catch (e) {
        console.error('Aggregate reviews failed:', e)
      }
    }

    // 映射数据库字段到前端期望的字段
    const normalized = products.map((p: any) => {
      let priceMaps = splitVariantPriceMaps(p.variantOptionPrices, p.variantOptionOriginalPrices)
      const titleMaps = splitVariantTitleMaps(p.variantOptionPrices, p.variantOptionTitles)
      priceMaps = { ...priceMaps, variantOptionPrices: titleMaps.variantOptionPrices }
      return ({
      ...p,
      name: p.title,
      inStock: p.active,
      images: (() => { try { return p.images ? JSON.parse(p.images) : [] } catch { return [] } })(),
      bulletPoints: (() => { try { return p.bulletPoints ? JSON.parse(p.bulletPoints) : [] } catch { return [] } })(),
      variants: (() => { try { return p.variants ? JSON.parse(p.variants) : [] } catch { return [] } })(),
      variantImageMap: (() => { try { return p.variantImageMap ? JSON.parse(p.variantImageMap) : null } catch { return null } })(),
      variantOptionImages: (() => { try { return p.variantOptionImages ? JSON.parse(p.variantOptionImages) : null } catch { return null } })(),
      variantOptionLinks: (() => { try { return p.variantOptionLinks ? JSON.parse(p.variantOptionLinks) : null } catch { return null } })(),
      variantOptionPrices: priceMaps.variantOptionPrices,
      variantOptionOriginalPrices: priceMaps.variantOptionOriginalPrices,
      variantOptionTitles: titleMaps.variantOptionTitles,
      avgRating: (aggMap[p.id]?.avgRating ?? 0),
      reviewCount: (aggMap[p.id]?.reviewCount ?? 0),
    })})

    const res = NextResponse.json(normalized)
    if (!includeInactive) {
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    }
    return res
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const body = await request.json()
    const {
      name,
      description,
      price,
      originalPrice,
      images,
      bulletPoints,
      longDescription,
      amazonUrl,
      categoryId,
      featured,
      inStock,
      brand,
      brandId,
      upc,
      publishedAt,
      variants,
      variantImageMap,
      variantOptionImages,
      variantOptionLinks,
      variantOptionPrices,
      variantOptionOriginalPrices,
      variantOptionTitles,
      youtubeUrl,
      youtubeIndex,
      asin,
      showAsinOnFrontend,
      // 新增字段：前台按钮显示控制
      showBuyOnAmazon,
      showAddToCart,
    } = body

    // 简单规范化 Amazon 链接：提取 ASIN 并转换为标准 dp 链接
    const extractAsin = (url: string): string | null => {
      try {
        const patterns = [
          /\/(?:dp|product)\/([A-Z0-9]{10})/i,
          /\/gp\/product\/([A-Z0-9]{10})/i,
          /[?&]ASIN=([A-Z0-9]{10})/i,
        ]
        for (const re of patterns) {
          const m = url.match(re)
          if (m && m[1]) return m[1].toUpperCase()
        }
        return null
      } catch { return null }
    }
    const amazonAsin = typeof amazonUrl === 'string' ? extractAsin(amazonUrl) : null
    const normalizedAmazonUrl = amazonAsin ? `https://www.amazon.com/dp/${amazonAsin}` : amazonUrl

    // Validate required fields
    if (!name || !description || !price || !amazonUrl) {
      return NextResponse.json(
        { error: 'Name, description, price, and Amazon URL are required' },
        { status: 400 }
      )
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 }
      )
    }

    const imageList = Array.isArray(images) ? images.filter((s: string) => s && s.trim() !== '') : []
    if (imageList.length === 0) {
      return NextResponse.json(
        { error: '至少需要一张产品主图' },
        { status: 400 }
      )
    }
    const normalizedYoutubeUrl = typeof youtubeUrl === 'string' && youtubeUrl.trim() ? youtubeUrl.trim() : null
    const normalizedYoutubeIndex = (() => {
      if (!normalizedYoutubeUrl) return null
      const raw = typeof youtubeIndex === 'number'
        ? youtubeIndex
        : typeof youtubeIndex === 'string'
          ? parseInt(youtubeIndex, 10)
          : NaN
      const fallback = Math.min(1, imageList.length)
      if (!Number.isFinite(raw)) return fallback
      return Math.max(0, Math.min(raw, imageList.length))
    })()

    const normalizedAsin = normalizeAsin(asin)

    if (normalizedAsin) {
      const asinConflict = await db.product.findUnique({ where: { asin: normalizedAsin } })
      if (asinConflict) {
        return NextResponse.json(
          { error: 'ASIN 已存在，请填写唯一值' },
          { status: 400 }
        )
      }
      const asinConflictBySlug = await db.product.findUnique({ where: { slug: normalizedAsin } })
      if (asinConflictBySlug) {
        return NextResponse.json(
          { error: 'ASIN 与现有产品链接冲突，请更换 ASIN' },
          { status: 400 }
        )
      }
    }

    // 生成唯一 slug（同时避免与 ASIN 冲突）
    const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    let slug = baseSlug
    let suffix = 1
    while (await db.product.findFirst({ where: { OR: [{ slug }, { asin: slug.toUpperCase() }] } })) {
      slug = `${baseSlug}-${suffix++}`
    }

    // 处理上架时间与变体
    const publishedAtDate = publishedAt ? new Date(publishedAt) : null
    const variantsJson: string | null = (() => {
      try {
        if (Array.isArray(variants)) {
          const normalized = (variants as any[])
            .map((g: any) => ({
              name: typeof g?.name === 'string' ? g.name.trim() : '',
              options: Array.isArray(g?.options) ? g.options.map((o: any) => String(o).trim()).filter(Boolean) : []
            }))
            .filter((g: any) => g.name && g.options.length > 0)
          return normalized.length ? JSON.stringify(normalized) : null
        }
        if (typeof variants === 'string') {
          const v = JSON.parse(variants)
          return Array.isArray(v) ? JSON.stringify(v) : null
        }
        return null
      } catch { return null }
    })()

    const variantImageMapJson: string | null = (() => {
      try {
        if (!variantImageMap) return null
        if (typeof variantImageMap === 'string') {
          const obj = JSON.parse(variantImageMap)
          return obj && typeof obj === 'object' ? JSON.stringify(obj) : null
        }
        if (typeof variantImageMap === 'object') {
          return JSON.stringify(variantImageMap)
        }
        return null
      } catch { return null }
    })()

    const variantOptionImagesJson: string | null = (() => {
      try {
        if (!variantOptionImages) return null
        if (typeof variantOptionImages === 'string') {
          const obj = JSON.parse(variantOptionImages)
          return obj && typeof obj === 'object' ? JSON.stringify(obj) : null
        }
        if (typeof variantOptionImages === 'object') {
          return JSON.stringify(variantOptionImages)
        }
        return null
      } catch { return null }
    })()

    const variantOptionLinksJson: string | null = (() => {
      try {
        if (!variantOptionLinks) return null
        if (typeof variantOptionLinks === 'string') {
          const obj = JSON.parse(variantOptionLinks)
          return obj && typeof obj === 'object' ? JSON.stringify(obj) : null
        }
        if (typeof variantOptionLinks === 'object') {
          return JSON.stringify(variantOptionLinks)
        }
        return null
      } catch { return null }
    })()

    const variantOptionPricesJson: string | null = (() => {
      try {
        if (!variantOptionPrices) return null
        if (typeof variantOptionPrices === 'string') {
          const obj = JSON.parse(variantOptionPrices)
          return obj && typeof obj === 'object' ? JSON.stringify(obj) : null
        }
        if (typeof variantOptionPrices === 'object') {
          return JSON.stringify(variantOptionPrices)
        }
        return null
      } catch { return null }
    })()

    const variantOptionOriginalPricesJson: string | null = (() => {
      try {
        if (!variantOptionOriginalPrices) return null
        if (typeof variantOptionOriginalPrices === 'string') {
          const obj = JSON.parse(variantOptionOriginalPrices)
          return obj && typeof obj === 'object' ? JSON.stringify(obj) : null
        }
        if (typeof variantOptionOriginalPrices === 'object') {
          return JSON.stringify(variantOptionOriginalPrices)
        }
        return null
      } catch { return null }
    })()

    const variantOptionTitlesJson: string | null = (() => {
      try {
        if (!variantOptionTitles) return null
        if (typeof variantOptionTitles === 'string') {
          const obj = JSON.parse(variantOptionTitles)
          return obj && typeof obj === 'object' ? JSON.stringify(obj) : null
        }
        if (typeof variantOptionTitles === 'object') {
          return JSON.stringify(variantOptionTitles)
        }
        return null
      } catch { return null }
    })()

    const createData: any = {
      title: name,
      slug,
      asin: normalizedAsin,
      showAsinOnFrontend: showAsinOnFrontend === true,
      mainImage: imageList[0],
      // 将长描述或简短描述存入 description 字段
      description: longDescription || description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      images: JSON.stringify(imageList),
      youtubeUrl: normalizedYoutubeUrl,
      youtubeIndex: normalizedYoutubeIndex,
      bulletPoints: JSON.stringify(Array.isArray(bulletPoints) ? bulletPoints : []),
      amazonUrl: normalizedAmazonUrl,
      // 直接使用 categoryId 赋值，与 import 接口保持一致
      categoryId: categoryId,
      featured: featured || false,
      active: inStock !== false,
      brand: brand || null,
      brandId: brandId || null,
      upc: upc || null,
      publishedAt: publishedAtDate,
      variants: variantsJson,
      variantImageMap: variantImageMapJson,
      variantOptionImages: variantOptionImagesJson,
      variantOptionLinks: variantOptionLinksJson,
      variantOptionPrices: variantOptionPricesJson,
      variantOptionOriginalPrices: variantOptionOriginalPricesJson,
      variantOptionTitles: variantOptionTitlesJson,
      // 新增：按钮显示控制
      showBuyOnAmazon: showBuyOnAmazon !== false,
      showAddToCart: showAddToCart !== false,
    }

    const isVariantOriginalPriceFieldError = (e: any) =>
      e?.code === 'P2022' ||
      e?.code === 'P2009' ||
      e?.code === 'P2010' ||
      String(e?.message || '').includes('variantOptionOriginalPrices') ||
      String(e?.message || '').includes('variantOptionTitles')

    let product: any
    try {
      product = await db.product.create({
        data: createData,
      })
    } catch (innerError: any) {
      if (!isVariantOriginalPriceFieldError(innerError)) throw innerError
      const fallbackData = { ...createData }
      let mergedPrice = mergeVariantPricesWithOriginal(
        variantOptionPricesJson,
        variantOptionOriginalPricesJson
      )
      mergedPrice = mergeVariantPricesWithTitle(mergedPrice, variantOptionTitlesJson)
      fallbackData.variantOptionPrices = mergedPrice
      delete fallbackData.variantOptionOriginalPrices
      delete fallbackData.variantOptionTitles
      product = await db.product.create({
        data: fallbackData,
      })
    }

    const parseArr = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : [] } catch { return [] }
    }
    const parseObj = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : null } catch { return null }
    }
    // 返回映射后的字段
    let priceMaps = splitVariantPriceMaps(
      (product as any).variantOptionPrices,
      (product as any).variantOptionOriginalPrices
    )
    const titleMaps = splitVariantTitleMaps(
      (product as any).variantOptionPrices,
      (product as any).variantOptionTitles
    )
    priceMaps = { ...priceMaps, variantOptionPrices: titleMaps.variantOptionPrices }
    const normalized = {
      ...(product as any), 
      name: (product as any).title, 
      inStock: (product as any).active,
      images: parseArr((product as any).images),
      bulletPoints: parseArr((product as any).bulletPoints),
      variants: parseArr((product as any).variants),
      variantImageMap: parseObj((product as any).variantImageMap),
      variantOptionImages: parseObj((product as any).variantOptionImages),
      variantOptionLinks: parseObj((product as any).variantOptionLinks),
      variantOptionPrices: priceMaps.variantOptionPrices,
      variantOptionOriginalPrices: priceMaps.variantOptionOriginalPrices,
      variantOptionTitles: titleMaps.variantOptionTitles,
    }
    return NextResponse.json(normalized, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    // 打印更详细的错误信息以便调试
    if (error.code) console.error('Error code:', error.code)
    if (error.meta) console.error('Error meta:', error.meta)
    
    return NextResponse.json(
      { error: `Failed to create product: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
