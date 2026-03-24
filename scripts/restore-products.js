const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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
      'https://placehold.co/600x600?text=Fitness+Tracker+3',
    ]),
    price: 129.99,
    originalPrice: 159.99,
    amazonUrl: 'https://amazon.com/product2',
    categorySlug: 'fitness',
    bulletPoints: JSON.stringify([
      'Heart rate and SpO2 monitoring',
      'Sleep tracking and smart alarms',
      'Water-resistant design',
      'GPS-enabled activity tracking',
      'Up to 10 days battery life',
    ]),
    description: 'Track your health and fitness goals effortlessly with our smart fitness tracker, delivering insights to keep you motivated every day.',
    featured: true,
    active: true,
  },
  {
    title: '4K Ultra HD Action Camera',
    slug: '4k-ultra-hd-action-camera',
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
      '4K video recording at 60 fps',
      'Image stabilization technology',
      'Waterproof up to 30 meters',
      'Wi-Fi and Bluetooth connectivity',
      'Wide range of accessories included',
    ]),
    description: 'Capture every adventure in stunning detail with our 4K action camera, designed to be rugged, reliable, and easy to use.',
    featured: true,
    active: true,
  },
]

async function restoreData() {
  try {
    console.log('开始恢复产品数据...')

    // 1. 创建分类
    console.log('创建分类...')
    for (const category of defaultCategories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      })
    }

    // 2. 创建产品
    console.log('创建产品...')
    for (const product of defaultProducts) {
      const { categorySlug, ...productData } = product
      
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          ...productData,
          category: {
            connect: { slug: categorySlug }
          }
        },
        create: {
          ...productData,
          category: {
            connect: { slug: categorySlug }
          }
        },
      })
    }

    console.log('✅ 产品数据恢复完成！')
    console.log(`- 创建了 ${defaultCategories.length} 个分类`)
    console.log(`- 创建了 ${defaultProducts.length} 个产品`)

  } catch (error) {
    console.error('❌ 恢复数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreData()