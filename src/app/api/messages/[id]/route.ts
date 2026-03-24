import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 检查消息是否存在
    const existingMessage = await db.message.findUnique({
      where: { id }
    })

    if (!existingMessage) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      )
    }

    // 删除消息
    await db.message.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除消息失败:', error)
    return NextResponse.json(
      { error: '删除消息失败' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const message = await db.message.findUnique({
      where: { id }
    })

    if (!message) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('获取消息失败:', error)
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { read } = body

    const existingMessage = await db.message.findUnique({
      where: { id }
    })

    if (!existingMessage) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      )
    }

    const updated = await db.message.update({
      where: { id },
      data: { read: Boolean(read) }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('更新消息失败:', error)
    return NextResponse.json(
      { error: '更新消息失败' },
      { status: 500 }
    )
  }
}
