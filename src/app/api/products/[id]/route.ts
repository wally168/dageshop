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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdminSession(request)
    if (response) return response

    const { id } = await params
    const product = await db.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        brandRelation: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // 映射字段以兼容前端，并解析 JSON 字段为数组
    const parseArr = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : [] } catch { return [] }
    }
    const parseObj = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : null } catch { return null }
    }
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
    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const { id } = await params
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

    const normalizedYoutubeUrl = typeof youtubeUrl === 'string' && youtubeUrl.trim() ? youtubeUrl.trim() : null
    const imageList = Array.isArray(images) ? images.filter((s: string) => s && s.trim() !== '') : []
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
      const asinConflict = await db.product.findFirst({
        where: {
          id: { not: id },
          asin: normalizedAsin,
        },
      })
      if (asinConflict) {
        return NextResponse.json(
          { error: 'ASIN 已存在，请填写唯一值' },
          { status: 400 }
        )
      }
      const asinConflictBySlug = await db.product.findFirst({
        where: {
          id: { not: id },
          slug: normalizedAsin,
        },
      })
      if (asinConflictBySlug) {
        return NextResponse.json(
          { error: 'ASIN 与现有产品链接冲突，请更换 ASIN' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      title: name,
      asin: normalizedAsin,
      showAsinOnFrontend: showAsinOnFrontend === true,
      // 将长描述或简短描述存入 description 字段
      description: longDescription || description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      mainImage: imageList.length > 0 ? imageList[0] : undefined,
      images: JSON.stringify(imageList),
      youtubeUrl: normalizedYoutubeUrl,
      youtubeIndex: normalizedYoutubeIndex,
      bulletPoints: JSON.stringify(bulletPoints || []),
      amazonUrl,
      categoryId: categoryId || undefined,
      featured: featured || false,
      active: inStock !== false,
      brand: brand === '' ? null : brand,
      brandId: brandId === '' ? null : brandId,
      upc: upc === '' ? null : upc,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      variants: (() => {
        try {
          if (Array.isArray(variants)) {
            const normalized = (variants as any[])
              .map((g: any) => ({
                name: typeof g?.name === 'string' ? g.name.trim() : '',
                options: Array.isArray(g?.options) ? g.options.map((o: any) => String(o).trim()).filter(Boolean) : []
              }))
              .filter((g: any) => g.name && g.options.length > 0)
            return JSON.stringify(normalized)
          }
          if (typeof variants === 'string') {
            const v = JSON.parse(variants)
            return Array.isArray(v) ? JSON.stringify(v) : undefined
          }
          return undefined
        } catch { return undefined }
      })(),
      variantImageMap: (() => {
        try {
          if (!variantImageMap) return undefined
          if (typeof variantImageMap === 'string') {
            const obj = JSON.parse(variantImageMap)
            return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined
          }
          if (typeof variantImageMap === 'object') {
            return JSON.stringify(variantImageMap)
          }
          return undefined
        } catch { return undefined }
      })(),
      variantOptionImages: (() => {
        try {
          if (!variantOptionImages) return undefined
          if (typeof variantOptionImages === 'string') {
            const obj = JSON.parse(variantOptionImages)
            return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined
          }
          if (typeof variantOptionImages === 'object') {
            return JSON.stringify(variantOptionImages)
          }
          return undefined
        } catch { return undefined }
      })(),
      variantOptionLinks: (() => {
        try {
          if (!variantOptionLinks) return undefined
          if (typeof variantOptionLinks === 'string') {
            const obj = JSON.parse(variantOptionLinks)
            return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined
          }
          if (typeof variantOptionLinks === 'object') {
            return JSON.stringify(variantOptionLinks)
          }
          return undefined
        } catch { return undefined }
      })(),
      variantOptionPrices: (() => {
        try {
          if (!variantOptionPrices) return undefined
          if (typeof variantOptionPrices === 'string') {
            const obj = JSON.parse(variantOptionPrices)
            return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined
          }
          if (typeof variantOptionPrices === 'object') {
            return JSON.stringify(variantOptionPrices)
          }
          return undefined
        } catch { return undefined }
      })(),
      variantOptionOriginalPrices: (() => {
        try {
          if (!variantOptionOriginalPrices) return undefined
          if (typeof variantOptionOriginalPrices === 'string') {
            const obj = JSON.parse(variantOptionOriginalPrices)
            return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined
          }
          if (typeof variantOptionOriginalPrices === 'object') {
            return JSON.stringify(variantOptionOriginalPrices)
          }
          return undefined
        } catch { return undefined }
      })(),
      variantOptionTitles: (() => {
        try {
          if (!variantOptionTitles) return undefined
          if (typeof variantOptionTitles === 'string') {
            const obj = JSON.parse(variantOptionTitles)
            return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined
          }
          if (typeof variantOptionTitles === 'object') {
            return JSON.stringify(variantOptionTitles)
          }
          return undefined
        } catch { return undefined }
      })(),
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
      product = await db.product.update({
        where: {
          id,
        },
        data: updateData,
        include: {
          category: true,
        },
      })
    } catch (innerError: any) {
      if (!isVariantOriginalPriceFieldError(innerError)) throw innerError
      const fallbackData = { ...updateData }
      let mergedPrice = mergeVariantPricesWithOriginal(
        updateData.variantOptionPrices,
        updateData.variantOptionOriginalPrices
      )
      mergedPrice = mergeVariantPricesWithTitle(mergedPrice, updateData.variantOptionTitles)
      fallbackData.variantOptionPrices = mergedPrice
      delete fallbackData.variantOptionOriginalPrices
      delete fallbackData.variantOptionTitles
      product = await db.product.update({
        where: {
          id,
        },
        data: fallbackData,
        include: {
          category: true,
        },
      })
    }

    const parseArr = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : [] } catch { return [] }
    }
    const parseObj = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : null } catch { return null }
    }
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
    return NextResponse.json(normalized)
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error?.code) console.error('Error code:', error.code)
    if (error?.meta) console.error('Error meta:', error.meta)
    return NextResponse.json(
      { error: `Failed to update product: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const { id } = await params
    // Delete related reviews first (cascade delete logic)
    await db.productReview.deleteMany({
      where: {
        productId: id,
      },
    })

    await db.product.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
