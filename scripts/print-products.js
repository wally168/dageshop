const { PrismaClient } = require('@prisma/client');
console.log('DATABASE_URL=', process.env.DATABASE_URL);
const db = new PrismaClient();
(async () => {
  try {
    const products = await db.product.findMany({});
    console.log(`总共有 ${products.length} 个产品:`);
    for (const p of products) {
      console.log(`id: ${p.id}, title: ${p.title}, slug: ${p.slug}, active: ${p.active}, featured: ${p.featured}`);
    }
    
    const featuredProducts = products.filter(p => p.featured);
    console.log(`\n精选产品数量: ${featuredProducts.length}`);
    featuredProducts.forEach(p => {
      console.log(`- ${p.title} (featured: ${p.featured})`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();