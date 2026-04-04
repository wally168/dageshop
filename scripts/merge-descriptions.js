const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function mergeDescriptions() {
  try {
    console.log('开始合并产品描述字段...');
    
    // 获取所有产品
    const products = await db.product.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        descriptionImages: true
      }
    });

    console.log(`找到 ${products.length} 个产品需要处理`);

    for (const product of products) {
      let mergedDescription = product.description || '';
      
      // 如果有描述图片，将它们添加到描述中
      if (product.descriptionImages) {
        try {
          const images = JSON.parse(product.descriptionImages);
          if (images && images.length > 0) {
            // 在描述末尾添加图片HTML
            const imageHtml = images
              .filter(img => img && img.trim())
              .map(img => `<img src="${img}" alt="产品详情图" style="max-width: 100%; height: auto; margin: 10px 0;" />`)
              .join('\n');
            
            if (imageHtml) {
              mergedDescription += '\n\n' + imageHtml;
            }
          }
        } catch (e) {
          console.warn(`产品 ${product.title} 的描述图片JSON解析失败:`, e.message);
        }
      }

      // 更新产品描述
      await db.product.update({
        where: { id: product.id },
        data: { description: mergedDescription }
      });

      console.log(`✓ 已处理产品: ${product.title}`);
    }

    console.log('✅ 描述字段合并完成！');
  } catch (error) {
    console.error('❌ 合并描述时出错:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

mergeDescriptions();