import Link from 'next/link'
import { ArrowRight, Shield, Star, Zap, Package } from 'lucide-react'
import Layout from '@/components/Layout'
import Carousel from '@/components/Carousel'
import { db } from '@/lib/db'

interface Product {
  id: string
  title: string
  slug: string
  mainImage: string
  price: number
  originalPrice?: number
  featured: boolean
  avgRating?: number
  reviewCount?: number
}

interface HomeContent {
  featuredTitle: string
  featuredSubtitle: string
  whyChooseTitle: string
  whyChooseSubtitle: string
  feature1Title: string
  feature1Description: string
  feature2Title: string
  feature2Description: string
  feature3Title: string
  feature3Description: string
  carouselEnabled?: boolean
  carouselInterval?: number
}

interface CarouselItem {
  id: string
  title?: string | null
  description?: string | null
  imageUrl: string
  link?: string | null
  btnText?: string | null
  newTab?: boolean | null
}

const defaultHomeContent: HomeContent = {
  featuredTitle: 'Featured Products',
  featuredSubtitle: 'Discover our carefully curated collection of premium products, each selected for exceptional quality and design.',
  whyChooseTitle: 'Why Choose Your Brand',
  whyChooseSubtitle: "We're redefining the shopping experience with uncompromising quality, innovative design, and customer-first approach.",
  feature1Title: 'Premium Quality',
  feature1Description: 'Every product undergoes rigorous quality testing to ensure it meets our exceptional standards.',
  feature2Title: 'Secure & Trusted',
  feature2Description: 'Advanced security measures protect your data with enterprise-grade encryption and privacy.',
  feature3Title: 'Lightning Fast',
  feature3Description: 'Optimized delivery network ensures your orders arrive quickly and in perfect condition.',
  carouselEnabled: true,
  carouselInterval: 5000,
}

async function getSiteName(): Promise<string> {
  try {
    const rows = await db.siteSettings.findMany({ where: { key: 'siteName' } })
    const v = rows?.[0]?.value
    if (typeof v === 'string' && v.trim()) return v.trim()
  } catch {}
  return 'Your Brand'
}

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const products = await db.product.findMany({
      where: { featured: true, active: true },
      include: { category: true, brandRelation: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 3,
    })

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
        aggMap = Object.fromEntries(
          groups.map((g: any) => [
            g.productId,
            {
              avgRating: typeof g._avg?.rating === 'number' ? Math.round(g._avg.rating * 10) / 10 : 0,
              reviewCount: typeof g._count?._all === 'number' ? g._count._all : 0,
            },
          ])
        )
      } catch {}
    }

    return products.map((p: any) => ({
      ...p,
      avgRating: aggMap[p.id]?.avgRating ?? 0,
      reviewCount: aggMap[p.id]?.reviewCount ?? 0,
    }))
  } catch {
    return []
  }
}

async function getHomeContent(): Promise<HomeContent> {
  try {
    const row = await db.homeContent.findFirst()
    if (!row) return defaultHomeContent
    return {
      featuredTitle: row.featuredTitle || defaultHomeContent.featuredTitle,
      featuredSubtitle: row.featuredSubtitle || defaultHomeContent.featuredSubtitle,
      whyChooseTitle: row.whyChooseTitle || defaultHomeContent.whyChooseTitle,
      whyChooseSubtitle: row.whyChooseSubtitle || defaultHomeContent.whyChooseSubtitle,
      feature1Title: row.feature1Title || defaultHomeContent.feature1Title,
      feature1Description: row.feature1Description || defaultHomeContent.feature1Description,
      feature2Title: row.feature2Title || defaultHomeContent.feature2Title,
      feature2Description: row.feature2Description || defaultHomeContent.feature2Description,
      feature3Title: row.feature3Title || defaultHomeContent.feature3Title,
      feature3Description: row.feature3Description || defaultHomeContent.feature3Description,
      carouselEnabled: row.carouselEnabled ?? defaultHomeContent.carouselEnabled,
      carouselInterval: row.carouselInterval ?? defaultHomeContent.carouselInterval,
    }
  } catch {
    return defaultHomeContent
  }
}

async function getCarouselItems(): Promise<CarouselItem[]> {
  try {
    const items = await db.carouselItem.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })
    return items.map((i: any) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      imageUrl: i.imageUrl,
      link: i.link,
      btnText: i.btnText,
      newTab: i.newTab,
    }))
  } catch {
    return []
  }
}

export default async function Home() {
  const [siteName, featuredProducts, homeContent, carouselItems] = await Promise.all([
    getSiteName(),
    getFeaturedProducts(),
    getHomeContent(),
    getCarouselItems(),
  ])

  return (
    <Layout>
      {/* Carousel Section */}
      {(homeContent.carouselEnabled !== false && carouselItems.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <Carousel items={carouselItems} interval={homeContent.carouselInterval || 5000} />
        </div>
      )}

      {/* Featured Products Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              {homeContent.featuredTitle}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {homeContent.featuredSubtitle}
            </p>
          </div>
          
          {featuredProducts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No featured products available</p>
              {/* Removed Add Products link to avoid redirecting to admin login */}
            </div>
          )}
          
          {featuredProducts.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href="/products"
                className="btn-apple bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all inline-flex items-center shadow-lg hover:shadow-xl"
              >
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              {homeContent.whyChooseTitle || `Why Choose ${siteName}`}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {homeContent.whyChooseSubtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <FeatureCard
              icon={<Star className="h-8 w-8" />}
              iconBg="bg-gradient-to-br from-yellow-400 to-orange-500"
              title={homeContent.feature1Title}
              description={homeContent.feature1Description}
            />
            
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              iconBg="bg-gradient-to-br from-green-400 to-emerald-500"
              title={homeContent.feature2Title}
              description={homeContent.feature2Description}
            />
            
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              iconBg="bg-gradient-to-br from-purple-400 to-pink-500"
              title={homeContent.feature3Title}
              description={homeContent.feature3Description}
            />
          </div>
        </div>
      </section>
    </Layout>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="card-hover bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img 
            src={product.mainImage} 
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
          {(product.reviewCount ?? 0) > 0 && (
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="text-gray-900 font-medium">{(product.avgRating ?? 0).toFixed(1)}</span>
              <span className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.round(product.avgRating ?? 0) ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                ))}
              </span>
              <span className="text-gray-600">({product.reviewCount})</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              ${product.price}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-lg text-gray-500 line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function FeatureCard({ 
  icon, 
  iconBg, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}) {
  return (
    <div className="card-hover bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
      <div className={`${iconBg} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight">{title}</h3>
      <p className="text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
