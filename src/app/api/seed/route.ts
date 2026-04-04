import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token') || request.headers.get('x-seed-token') || ''
    const expected = process.env.SEED_TOKEN || ''
    if (!expected || token !== expected) {
      return NextResponse.json({ error: '未授权的种子请求' }, { status: 401 })
    }

    // 默认导航
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

    // 默认产品
    const defaultProducts = [
      {
        title: 'Premium Wireless Headphones',
        slug: 'premium-wireless-headphones',
        mainImage: 'https://placehold.co/600x600?text=Headphones',
        images: JSON.stringify([
          'https://placehold.co/600x600?text=Headphones',
          'https://placehold.co/600x600?text=Headphones+2',
        ]),
        price: 299.99,
        originalPrice: 399.99,
        amazonUrl: 'https://amazon.com/product1',
        categorySlug: 'audio',
        bulletPoints: JSON.stringify([
          'High-fidelity audio with deep bass',
          'Comfortable over-ear design',
          'Long-lasting battery life',
          'Active noise cancellation',
          'Bluetooth 5.2 with multi-device pairing',
        ]),
        description: 'Experience premium sound quality with our wireless headphones, designed for comfort and clarity. Perfect for long listening sessions, commuting, or working from home.',
        featured: true,
        active: true,
      },
      {
        title: 'Smart Fitness Tracker',
        slug: 'smart-fitness-tracker',
        mainImage: 'https://placehold.co/600x600?text=Fitness+Tracker',
        images: JSON.stringify([
          'https://placehold.co/600x600?text=Fitness+Tracker',
          'https://placehold.co/600x600?text=Fitness+Tracker+2',
        ]),
        price: 149.99,
        originalPrice: 199.99,
        amazonUrl: 'https://amazon.com/product2',
        categorySlug: 'fitness',
        bulletPoints: JSON.stringify([
          'Heart rate and SpO2 monitoring',
          'Sleep tracking and smart alarms',
          'Water-resistant design',
          'GPS-enabled activity tracking',
          'Up to 10 days battery life',
        ]),
        description: 'Track your health and fitness goals with a sleek, powerful tracker. From heart rate to sleep patterns, get meaningful insights to optimize your lifestyle.',
        featured: true,
        active: true,
      },
      {
        title: '4K Action Camera',
        slug: '4k-action-camera',
        mainImage: 'https://placehold.co/600x600?text=Action+Camera',
        images: JSON.stringify([
          'https://placehold.co/600x600?text=Action+Camera',
          'https://placehold.co/600x600?text=Action+Camera+2',
        ]),
        price: 249.99,
        originalPrice: 299.99,
        amazonUrl: 'https://amazon.com/product3',
        categorySlug: 'electronics',
        bulletPoints: JSON.stringify([
          'Ultra HD 4K recording',
          'Waterproof up to 30 meters',
          'Wide-angle lens',
          'Wi-Fi connectivity',
          'Multiple mounting accessories included',
        ]),
        description: 'Capture every adventure in stunning detail with our 4K action camera, designed to be rugged, reliable, and easy to use.',
        featured: true,
        active: true,
      },
    ]

    // 1. 初始化导航（幂等）
    for (const item of defaultNavigation) {
      const existingNav = await db.navigation.findFirst({ where: { href: item.href } })
      if (existingNav) {
        await db.navigation.update({
          where: { id: existingNav.id },
          data: { label: item.label, order: item.order, href: item.href, active: true },
        })
      } else {
        await db.navigation.create({
          data: { label: item.label, href: item.href, order: item.order, active: true },
        })
      }
    }

    // 2. 初始化首页内容（如不存在则创建）
    const existingHome = await db.homeContent.findFirst()
    if (!existingHome) {
      await db.homeContent.create({
        data: {
          featuredTitle: 'Featured Products',
          whyChooseTitle: 'Why Choose Your Brand',
          whyChooseSubtitle: "We're redefining the shopping experience with uncompromising quality, innovative design, and customer-first approach.",
          feature1Title: 'Premium Quality',
          feature1Description: 'Every product undergoes rigorous quality testing to ensure it meets our exceptional standards.',
          feature2Title: 'Secure & Trusted',
          feature2Description: 'Advanced security measures protect your data with enterprise-grade encryption and privacy.',
          feature3Title: 'Lightning Fast',
          feature3Description: 'Optimized delivery network ensures your orders arrive quickly and in perfect condition.',
        },
      })
    }

    // 3. 创建分类（幂等）
    for (const category of defaultCategories) {
      await db.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      })
    }

    // 4. 创建产品（幂等）
    for (const product of defaultProducts) {
      const { categorySlug, ...productData } = product as any
      await db.product.upsert({
        where: { slug: product.slug },
        update: {
          ...productData,
          category: { connect: { slug: categorySlug } },
        },
        create: {
          ...productData,
          category: { connect: { slug: categorySlug } },
        },
      })
    }

    const categoriesCount = await db.category.count()
    const productsCount = await db.product.count()
    const navigationCount = await db.navigation.count()

    return NextResponse.json({
      ok: true,
      categoriesCount,
      productsCount,
      navigationCount,
    })
  } catch (error) {
    console.error('执行种子数据失败:', error)
    return NextResponse.json({ error: '执行种子数据失败' }, { status: 500 })
  }
}
