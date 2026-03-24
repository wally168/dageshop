import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) return new NextResponse('Bad Request', { status: 400 })

    const image = await (db as any).image.findUnique({ where: { id } })
    if (!image) return new NextResponse('Not Found', { status: 404 })

    const headers = new Headers()
    headers.set('Content-Type', image.contentType || 'application/octet-stream')
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    // Prisma Bytes -> Buffer
    const data = Buffer.from(image.data as unknown as Uint8Array)
    return new NextResponse(data, { status: 200, headers })
  } catch (error) {
    console.error('读取图片失败:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}