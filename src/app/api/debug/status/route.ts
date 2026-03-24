import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // 数据库健康检查与各表计数
    const [
      adminCount,
      sessionCount,
      productCount,
      categoryCount,
      messageCount,
      homeContentCount,
    ] = await Promise.all([
      db.adminUser.count(),
      db.session.count(),
      db.product.count(),
      db.category.count(),
      db.message.count(),
      db.homeContent.count(),
    ])

    return NextResponse.json({
      ok: true,
      dbProvider: 'postgresql',
      counts: {
        adminUser: adminCount,
        session: sessionCount,
        product: productCount,
        category: categoryCount,
        message: messageCount,
        homeContent: homeContentCount,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'unknown error',
      },
      { status: 500 }
    )
  }
}