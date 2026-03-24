import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, getSessionByToken, ensureDefaultAdmin, hashPassword } from '@/lib/auth'

// 站点默认设置（与 /api/settings 保持一致）
const defaultSettings: Record<string, string> = {
  siteName: 'Your Brand',
  logoUrl: '',
  siteDescription: 'Discover premium products with exceptional quality and design',
  siteKeywords: 'premium products, quality, design, lifestyle',
  contactEmail: 'contact@yourbrand.com',
  contactPhone: '+1 (555) 123-4567',
  contactAddress: '123 Main Street, City, State 12345',
  messageForwardEmail: '',
  messageForwardEnabled: 'false',
  socialFacebook: 'https://facebook.com/yourbrand',
  socialTwitter: 'https://twitter.com/yourbrand',
  socialInstagram: 'https://instagram.com/yourbrand',
  socialYoutube: 'https://youtube.com/yourbrand',
  footerText: '© 2025 Your Brand. All rights reserved.',
  aboutText: "We're passionate about bringing you the finest products that combine quality, innovation, and style.",
  ourStory: "Founded with a vision to make premium products accessible to everyone, Your Brand has been dedicated to curating exceptional items that enhance your daily life. We believe that quality shouldn't be compromised, and every product in our collection reflects this commitment.",
  ourMission: 'To provide our customers with carefully selected, high-quality products that offer both functionality and style. We work directly with trusted manufacturers and suppliers to ensure that every item meets our rigorous standards.',
  whyChooseUs: 'Rigorous quality control and product testing\nCompetitive pricing with transparent policies\nExcellent customer service and support\nFast and reliable shipping\nSatisfaction guarantee on all products',
  privacyPolicy: 'We value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.',
  termsOfService: 'By using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.',
}

// 默认导航（英文）
const defaultNavigation = [
  { label: 'Home', href: '/', order: 1 },
  { label: 'Products', href: '/products', order: 2 },
  { label: 'About', href: '/about', order: 3 },
  { label: 'Contact', href: '/contact', order: 4 },
]

// 默认分类
const defaultCategories = [
  { name: 'Electronics', slug: 'electronics', description: 'Premium consumer electronics and accessories', image: null },
  { name: 'Fitness', slug: 'fitness', description: 'Smart fitness devices and gear', image: null },
  { name: 'Audio', slug: 'audio', description: 'Speakers, headphones, and sound equipment', image: null },
]

// 默认产品（通过分类 slug 指向分类）
const defaultProducts = [
  {
    title: 'Premium Wireless Headphones',
    slug: 'premium-wireless-headphones',
    mainImage: 'https://placehold.co/600x600?text=Headphones',
    images: [
      'https://placehold.co/600x600?text=Headphones',
      'https://placehold.co/600x600?text=Headphones+2',
    ],
    price: 299.99,
    originalPrice: 399.99,
    amazonUrl: 'https://amazon.com/product1',
    categorySlug: 'audio',
    bulletPoints: [
      'High-fidelity audio with deep bass',
      'Comfortable over-ear design',
      'Long-lasting battery life',
      'Active noise cancellation',
      'Bluetooth 5.2 with multi-device pairing',
    ],
    description: 'Experience premium sound quality with our wireless headphones, designed for comfort and clarity. Perfect for long listening sessions, commuting, or working from home.',
    descriptionImages: [
      'https://placehold.co/800x600?text=Headphones+Detail+1',
      'https://placehold.co/800x600?text=Headphones+Detail+2',
    ],
    featured: true,
    active: true,
  },
  {
    title: 'Smart Fitness Tracker',
    slug: 'smart-fitness-tracker',
    mainImage: 'https://placehold.co/600x600?text=Fitness+Tracker',
    images: [
      'https://placehold.co/600x600?text=Fitness+Tracker',
      'https://placehold.co/600x600?text=Fitness+Tracker+2',
    ],
    price: 129.99,
    originalPrice: 159.99,
    amazonUrl: 'https://amazon.com/product2',
    categorySlug: 'fitness',
    bulletPoints: [
      'Heart rate and SpO2 monitoring',
      'Sleep tracking and smart alarms',
      'Water-resistant design',
      'GPS-enabled activity tracking',
      'Up to 10 days battery life',
    ],
    description: 'Track your health and fitness goals effortlessly with our smart fitness tracker, delivering insights to keep you motivated every day.',
    descriptionImages: [
      'https://placehold.co/800x600?text=Fitness+Detail+1',
      'https://placehold.co/800x600?text=Fitness+Detail+2',
    ],
    featured: true,
    active: true,
  },
  {
    title: '4K Ultra HD Action Camera',
    slug: '4k-ultra-hd-action-camera',
    mainImage: 'https://placehold.co/600x600?text=Action+Camera',
    images: [
      'https://placehold.co/600x600?text=Action+Camera',
      'https://placehold.co/600x600?text=Action+Camera+2',
    ],
    price: 249.99,
    originalPrice: 299.99,
    amazonUrl: 'https://amazon.com/product3',
    categorySlug: 'electronics',
    bulletPoints: [
      '4K video recording at 60 fps',
      'Image stabilization technology',
      'Waterproof up to 30 meters',
      'Wi-Fi and Bluetooth connectivity',
      'Wide range of accessories included',
    ],
    description: 'Capture every adventure in stunning detail with our 4K action camera, designed to be rugged, reliable, and easy to use.',
    descriptionImages: [
      'https://placehold.co/800x600?text=Camera+Detail+1',
      'https://placehold.co/800x600?text=Camera+Detail+2',
    ],
    featured: true,
    active: true,
  },
]

export async function POST(request: NextRequest) {
  try {
    // 管理员权限校验
    console.log('Reset API: All cookies:', Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])))
    console.log('Reset API: SESSION_COOKIE name:', SESSION_COOKIE)
    const token = request.cookies.get(SESSION_COOKIE)?.value
    console.log('Reset API: Token received:', token ? 'Yes' : 'No')
    console.log('Reset API: Token value:', token)
    
    if (!token) {
      console.log('Reset API: No token found')
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const session = await getSessionByToken(token)
    console.log('Reset API: Session found:', session ? 'Yes' : 'No')
    
    if (!session) {
      console.log('Reset API: Session invalid or expired')
      return NextResponse.json({ error: '会话无效或已过期' }, { status: 401 })
    }

    // 读取重置模式：data（保留管理员与当前会话）/ full（重置管理员并清除所有会话）/ password（仅重置当前管理员密码）
    const rawMode = request.nextUrl?.searchParams?.get('mode')
    const mode = rawMode === 'full' ? 'full' : rawMode === 'password' ? 'password' : 'data'
    console.log('Reset API: Mode =', mode)

    console.log('Reset API: Starting reset process for user:', session.userId)

    // 新增：仅重置密码模式，保留所有数据与当前会话
    if (mode === 'password') {
      const { hash, salt } = hashPassword('dage168')
      await db.adminUser.update({
        where: { id: session.userId },
        data: { passwordHash: hash, passwordSalt: salt }
      })
      console.log('Reset API: PASSWORD mode completed, current session preserved')
      return NextResponse.json({ success: true, message: '已重置当前管理员密码为默认值（保留登录）' })
    }

    // 执行重置：清空并预设数据（顺序执行，避免交互式事务）
    if (mode === 'full') {
      // 清空所有会话与管理员（强制退出并重置管理员）
      console.log('Reset API: FULL mode - clearing ALL sessions and admin users')
      await db.session.deleteMany({})
      await db.adminUser.deleteMany({})
    } else {
      // 仅重置数据：保留管理员与当前登录会话
      console.log('Reset API: DATA mode - clearing sessions except current')
      await db.session.deleteMany({
        where: { token: { not: token } }
      })
    }

    console.log('Reset API: Clearing other data')
    await db.message.deleteMany({})
    await db.navigation.deleteMany({})
    await db.siteSettings.deleteMany({})
    await db.productReview.deleteMany({})
    await db.product.deleteMany({})
    await db.category.deleteMany({})
    await db.homeContent.deleteMany({})

    // 首页内容预设
    await db.homeContent.create({
      data: {
        featuredTitle: "Featured Products",
        featuredSubtitle: "Discover our carefully curated collection of premium products, each selected for exceptional quality and design.",
        whyChooseTitle: "Why Choose Your Brand",
        whyChooseSubtitle: "We're redefining the shopping experience with uncompromising quality, innovative design, and customer-first approach.",
        feature1Title: "Premium Quality",
        feature1Description: "Every product undergoes rigorous quality testing to ensure it meets our exceptional standards.",
        feature2Title: "Secure & Trusted",
        feature2Description: "Advanced security measures protect your data with enterprise-grade encryption and privacy.",
        feature3Title: "Lightning Fast",
        feature3Description: "Optimized delivery network ensures your orders arrive quickly and in perfect condition."
      }
    })

    // 站点设置预设
    for (const [key, value] of Object.entries(defaultSettings)) {
      await db.siteSettings.create({
        data: {
          key,
          value,
          description: `${key} setting`,
        },
      })
    }

    // 导航预设
    for (let i = 0; i < defaultNavigation.length; i++) {
      const item = defaultNavigation[i]
      await db.navigation.create({
        data: {
          label: item.label,
          href: item.href,
          order: item.order,
          active: true,
        },
      })
    }

    // 分类预设并建立映射
    const categoryMap: Record<string, string> = {}
    for (const cat of defaultCategories) {
      const created = await db.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          image: cat.image || undefined,
        },
      })
      categoryMap[cat.slug] = created.id
    }

    // 产品预设
    for (const p of defaultProducts) {
      const categoryId = categoryMap[p.categorySlug]
      if (!categoryId) continue

      // 确保 slug 唯一
      const baseSlug = p.slug
      let slug = baseSlug
      let suffix = 1
      while (await db.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${suffix++}`
      }

      await db.product.create({
        data: {
          title: p.title,
          slug,
          mainImage: p.mainImage,
          images: JSON.stringify(p.images),
          price: p.price,
          originalPrice: p.originalPrice,
          amazonUrl: p.amazonUrl,
          categoryId,
          bulletPoints: JSON.stringify(p.bulletPoints),
          description: p.description,
          featured: p.featured,
          active: p.active,
        },
      })
    }

    if (mode === 'full') {
      // 重置管理员为默认账号（dage666/dage168）
      await ensureDefaultAdmin()
      console.log('Reset API: FULL mode completed, forcing logout')
      // 清除 Cookie 并返回 401 以触发前端跳转登录
      const res = NextResponse.json({ error: '未登录', message: '站点已重置，已退出登录' }, { status: 401 })
      res.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(0)
      })
      return res
    }

    console.log('Reset API: DATA mode completed successfully')
    return NextResponse.json({ success: true, message: '站点数据已重置并预设（管理员与当前登录保留）' })
  } catch (error) {
    console.error('重置失败:', error)
    return NextResponse.json({ error: '重置失败' }, { status: 500 })
  }
}
