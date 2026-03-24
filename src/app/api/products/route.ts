import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit')
    
    const where: any = {}
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (featured === 'true') {
      where.featured = true
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
    const normalized = products.map((p: any) => ({
      ...p,
      name: p.title,
      inStock: p.active,
      images: (() => { try { return p.images ? JSON.parse(p.images) : [] } catch { return [] } })(),
      bulletPoints: (() => { try { return p.bulletPoints ? JSON.parse(p.bulletPoints) : [] } catch { return [] } })(),
      variants: (() => { try { return p.variants ? JSON.parse(p.variants) : [] } catch { return [] } })(),
      variantImageMap: (() => { try { return p.variantImageMap ? JSON.parse(p.variantImageMap) : null } catch { return null } })(),
      variantOptionImages: (() => { try { return p.variantOptionImages ? JSON.parse(p.variantOptionImages) : null } catch { return null } })(),
      variantOptionLinks: (() => { try { return p.variantOptionLinks ? JSON.parse(p.variantOptionLinks) : null } catch { return null } })(),
      avgRating: (aggMap[p.id]?.avgRating ?? 0),
      reviewCount: (aggMap[p.id]?.reviewCount ?? 0),
    }))

    return NextResponse.json(normalized)
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
      youtubeUrl,
      youtubeIndex,
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
    const asin = typeof amazonUrl === 'string' ? extractAsin(amazonUrl) : null
    const normalizedAmazonUrl = asin ? `https://www.amazon.com/dp/${asin}` : amazonUrl

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

    // 生成唯一 slug
    const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    let slug = baseSlug
    let suffix = 1
    while (await db.product.findUnique({ where: { slug } })) {
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

    const createData: any = {
      title: name,
      slug,
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
      // 新增：按钮显示控制
      showBuyOnAmazon: showBuyOnAmazon !== false,
      showAddToCart: showAddToCart !== false,
    }

    const product = await db.product.create({
      data: createData,
    })

    const parseArr = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : [] } catch { return [] }
    }
    const parseObj = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : null } catch { return null }
    }
    // 返回映射后的字段
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
