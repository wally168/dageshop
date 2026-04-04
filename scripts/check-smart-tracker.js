const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  try {
    const product = await db.product.findUnique({
      where: {
        slug: 'smart-fitness-tracker'
      },
      include: {
        category: true
      }
    });
    
    if (product) {
      console.log('Smart Fitness Tracker 详细信息:');
      console.log('ID:', product.id);
      console.log('标题:', product.title);
      console.log('主图:', product.mainImage);
      console.log('图片数组:', product.images);
      console.log('要点数组:', product.bulletPoints);
      console.log('描述:', product.description);
      console.log('价格:', product.price);
      console.log('原价:', product.originalPrice);
      console.log('精选:', product.featured);
      console.log('激活:', product.active);
      console.log('分类:', product.category?.name);
      
      // 尝试解析JSON字段
      try {
        const images = JSON.parse(product.images || '[]');
        console.log('\n解析后的图片数组:', images);
        console.log('图片数量:', images.length);
      } catch (e) {
        console.log('\n图片数据解析失败:', e.message);
      }
      
      try {
        const bulletPoints = JSON.parse(product.bulletPoints || '[]');
        console.log('\n解析后的要点数组:', bulletPoints);
        console.log('要点数量:', bulletPoints.length);
        bulletPoints.forEach((point, index) => {
          console.log(`  ${index + 1}. ${point}`);
        });
      } catch (e) {
        console.log('\n要点数据解析失败:', e.message);
      }
    } else {
      console.log('未找到 Smart Fitness Tracker 产品');
    }
    
  } catch (e) {
    console.error('查询失败:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();