import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

interface NavItemInput {
  id: string
  label: string
  href: string
  order: number
  isExternal?: boolean
  active?: boolean
}

// GET - 获取所有导航项
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const items = await db.navigation.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { order: 'asc' }
    })

    // 统一返回到前端使用的结构
    const result = items.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      order: item.order,
      // 目前schema没有isExternal字段，默认false
      isExternal: false,
      active: item.active,
    }))

    return NextResponse.json(result, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('获取导航失败:', error)
    return NextResponse.json({ error: '获取导航失败' }, { status: 500 })
  }
}

// PUT - 覆盖更新全部导航项
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const items: NavItemInput[] = body?.items

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: '请求体需要包含items数组' }, { status: 400 })
    }

    // 验证字段
    for (const item of items) {
      if (!item.id || !item.label || !item.href || typeof item.order !== 'number') {
        return NextResponse.json({ error: '缺少必要字段: id/label/href/order' }, { status: 400 })
      }
    }

    // 使用批量事务，兼容 Data Proxy（避免交互式事务）
    const ids = items.map((i) => i.id)
    const ops: Prisma.PrismaPromise<any>[] = []
    ops.push(
      db.navigation.deleteMany({
        where: { id: { notIn: ids } }
      })
    )

    for (const item of items) {
      ops.push(
        db.navigation.upsert({
          where: { id: item.id },
          update: {
            label: item.label,
            href: item.href,
            order: item.order,
            active: item.active ?? true,
          },
          create: {
            id: item.id,
            label: item.label,
            href: item.href,
            order: item.order,
            active: item.active ?? true,
          }
        })
      )
    }

    await db.$transaction(ops)

    return NextResponse.json({ message: '导航更新成功' }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('更新导航失败:', error)
    return NextResponse.json({ error: '更新导航失败' }, { status: 500 })
  }
}