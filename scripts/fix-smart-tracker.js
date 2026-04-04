const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  try {
    console.log('开始修复 Smart Fitness Tracker 数据...');
    
    // 正确的数据
    const correctImages = [
      "https://placehold.co/600x600?text=Fitness+Tracker",
      "https://placehold.co/600x600?text=Fitness+Tracker+2",
      "https://placehold.co/600x600?text=Fitness+Tracker+3"
    ];
    
    const correctBulletPoints = [
      "Heart rate and SpO2 monitoring",
      "Sleep tracking and smart alarms", 
      "Water-resistant design",
      "GPS-enabled activity tracking",
      "Up to 10 days battery life"
    ];
    
    // 更新产品数据
    const result = await db.product.update({
      where: {
        slug: 'smart-fitness-tracker'
      },
      data: {
        images: JSON.stringify(correctImages),
        bulletPoints: JSON.stringify(correctBulletPoints)
      }
    });
    
    console.log('✓ 成功更新产品:', result.title);
    
    // 验证更新结果
    const updated = await db.product.findUnique({
      where: {
        slug: 'smart-fitness-tracker'
      }
    });
    
    console.log('\n验证更新结果:');
    const images = JSON.parse(updated.images);
    const bulletPoints = JSON.parse(updated.bulletPoints);
    
    console.log('图片数量:', images.length);
    images.forEach((img, index) => {
      console.log(`  图片 ${index + 1}: ${img}`);
    });
    
    console.log('\n要点数量:', bulletPoints.length);
    bulletPoints.forEach((point, index) => {
      console.log(`  ${index + 1}. ${point}`);
    });
    
  } catch (e) {
    console.error('修复失败:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();