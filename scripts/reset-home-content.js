const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  try {
    console.log('开始重置首页内容数据...');
    
    // 删除现有的首页内容
    await db.homeContent.deleteMany({});
    console.log('✓ 已删除现有首页内容');
    
    // 创建默认首页内容
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
    
    console.log('✓ 成功重置首页内容配置:', homeContent.id);
    console.log('首页内容已恢复为预设数据');
    
  } catch (e) {
    console.error('重置失败:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();