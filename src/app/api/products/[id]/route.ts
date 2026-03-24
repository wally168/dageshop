import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      youtubeUrl,
      youtubeIndex,
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

    const updateData: any = {
      title: name,
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
      // 新增：按钮显示控制
      showBuyOnAmazon: showBuyOnAmazon !== false,
      showAddToCart: showAddToCart !== false,
    }

    const product = await db.product.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        category: true,
      },
    })

    const parseArr = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : [] } catch { return [] }
    }
    const parseObj = (s: string | null | undefined) => {
      try { return s ? JSON.parse(s) : null } catch { return null }
    }
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
    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
