const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  try {
    // 将Smart Fitness Tracker设置为精选产品
    const result = await db.product.update({
      where: {
        slug: 'smart-fitness-tracker'
      },
      data: {
        featured: true
      }
    });
    
    console.log('成功将产品设置为精选:', result.title);
    
    // 验证精选产品数量
    const featuredProducts = await db.product.findMany({
      where: {
        featured: true
      }
    });
    
    console.log(`现在有 ${featuredProducts.length} 个精选产品:`);
    featuredProducts.forEach(p => {
      console.log(`- ${p.title}`);
    });
    
  } catch (e) {
    console.error('设置精选产品失败:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();