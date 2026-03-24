import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '缺少文件字段: file' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    const size = file.size || 0
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: '仅支持图片上传' }, { status: 400 })
    }
    // Vercel Serverless Function Payload Limit is 4.5MB
    // 为了安全起见，限制为 4MB，预留 0.5MB 给 Multipart 头部开销
    if (size > 4 * 1024 * 1024) { 
      return NextResponse.json({ error: '文件过大，受 Vercel 平台限制最大支持 4MB' }, { status: 413 })
    }

    // 读取二进制数据
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    // 必须保存到数据库（Vercel 文件系统是临时的，无法持久化）
    try {
      const saved = await (db as any).image.create({
        data: {
          filename: file.name || `upload-${Date.now()}`,
          contentType,
          size,
          data: buffer,
        }
      })
      return NextResponse.json({ id: saved.id, url: `/api/images/${saved.id}` })
    } catch (dbErr: any) {
      console.error('DB 保存图片失败:', dbErr)
      return NextResponse.json({ error: '数据库保存失败，请检查文件大小或数据库连接' }, { status: 500 })
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}