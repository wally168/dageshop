const { PrismaClient } = require('@prisma/client')

async function initNavigation() {
  const prisma = new PrismaClient()
  
  try {
    // 检查是否已有导航数据
    const existingNav = await prisma.navigation.findMany()
    
    if (existingNav.length > 0) {
      console.log(`已存在 ${existingNav.length} 个导航菜单项，跳过初始化`)
      return
    }
    
    // 默认导航数据
    const defaultNavigation = [
      { label: 'Home', href: '/', order: 1 },
      { label: 'Products', href: '/products', order: 2 },
      { label: 'About', href: '/about', order: 3 },
      { label: 'Contact', href: '/contact', order: 4 },
    ]
    
    // 创建导航数据
    for (const item of defaultNavigation) {
      await prisma.navigation.create({
        data: {
          label: item.label,
          href: item.href,
          order: item.order,
          active: true,
        },
      })
    }
    
    console.log(`成功初始化 ${defaultNavigation.length} 个导航菜单项`)
    
    // 验证创建结果
    const newNav = await prisma.navigation.findMany({
      orderBy: { order: 'asc' }
    })
    
    console.log('导航菜单项:')
    newNav.forEach(item => {
      console.log(`- ${item.label} (${item.href}) - 顺序: ${item.order}`)
    })
    
  } catch (error) {
    console.error('初始化导航数据时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initNavigation()