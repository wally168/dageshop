const { PrismaClient } = require('@prisma/client')

async function checkNavigation() {
  const prisma = new PrismaClient()
  
  try {
    const navigation = await prisma.navigation.findMany({
      orderBy: { order: 'asc' }
    })
    
    console.log(`总共有 ${navigation.length} 个导航菜单项:`)
    navigation.forEach(item => {
      console.log(`- ${item.label} (${item.href}) - 顺序: ${item.order}, 激活: ${item.active}`)
    })
  } catch (error) {
    console.error('检查导航数据时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNavigation()