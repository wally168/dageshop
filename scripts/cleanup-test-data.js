const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  try {
    console.log('开始清理测试数据...');
    const delProduct = await db.product.deleteMany({ where: { slug: 'test-product' } });
    console.log(`✓ 已删除测试产品 test-product: ${delProduct.count} 条`);
    const delCategory = await db.category.deleteMany({ where: { slug: 'default' } });
    console.log(`✓ 已删除测试分类 default: ${delCategory.count} 条`);
  } catch (e) {
    console.error('清理失败:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();