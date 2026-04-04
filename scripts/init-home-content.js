const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

if (process.env.SEED_ON_DEPLOY !== '1') {
  console.log('跳过数据初始化：未设置 SEED_ON_DEPLOY=1');
  process.exit(0);
}

(async () => {
  try {
    console.log('开始初始化预设数据...');
    
    // 1) 首页内容（如不存在则创建）
    const existingContent = await db.homeContent.findFirst();
    
    if (!existingContent) {
      const homeContent = await db.homeContent.create({
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
      });
      console.log('✓ 已创建首页内容配置:', homeContent.id);
    } else {
      console.log('首页内容已存在，跳过创建');
    }

    // 2) 默认导航（幂等 upsert）
    const defaultNavigation = [
      { label: 'Home', href: '/', order: 1 },
      { label: 'Products', href: '/products', order: 2 },
      { label: 'About', href: '/about', order: 3 },
      { label: 'Contact', href: '/contact', order: 4 },
    ];
    for (const item of defaultNavigation) {
      const existingNav = await db.navigation.findFirst({ where: { href: item.href } });
      if (existingNav) {
        await db.navigation.update({
          where: { id: existingNav.id },
          data: { label: item.label, order: item.order, href: item.href, active: true },
        });
      } else {
        await db.navigation.create({
          data: { label: item.label, href: item.href, order: item.order, active: true },
        });
      }
    }
    console.log('✓ 导航初始化完成');

    // 3) 默认分类（幂等 upsert）
    const defaultCategories = [
      { name: 'Electronics', slug: 'electronics', description: 'Premium consumer electronics and accessories', image: null },
      { name: 'Fitness', slug: 'fitness', description: 'Smart fitness devices and gear', image: null },
      { name: 'Audio', slug: 'audio', description: 'Speakers, headphones, and sound equipment', image: null },
    ];
    for (const category of defaultCategories) {
      await db.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      });
    }
    console.log('✓ 分类初始化完成');

    // 4) 默认产品（幂等 upsert）
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
    ];
    for (const product of defaultProducts) {
      const { categorySlug, ...productData } = product;
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
      });
    }
    console.log('✓ 产品初始化完成');
    
  } catch (e) {
    console.error('初始化失败:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();
