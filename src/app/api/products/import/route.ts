import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { slugify } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { getSessionByToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = await getSessionByToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const categoryId = formData.get('categoryId') as string
    const brandId = formData.get('brandId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const row of jsonData as any[]) {
      try {
        // Validate required fields
        if (!row.title || !row.price || !row.url) {
          results.failed++
          results.errors.push(`Row missing required fields: ${JSON.stringify(row)}`)
          continue
        }

        // Generate slug
        let slug = slugify(row.title)
        let suffix = 1
        const originalSlug = slug
        while (await db.product.findUnique({ where: { slug } })) {
          slug = `${originalSlug}-${suffix++}`
        }

        // Process images
        // Expecting "images" column to be a string (maybe comma separated or JSON?) or just handle single image
        // The user example had "images" as a field.
        // Assuming images is a URL or comma-separated URLs
        let imagesList: string[] = []
        if (row.images) {
           // If it looks like a JSON array
           if (typeof row.images === 'string' && row.images.trim().startsWith('[')) {
             try {
               imagesList = JSON.parse(row.images)
             } catch {
               imagesList = [row.images]
             }
           } else {
             // Split by comma or space if multiple?
             // Let's assume space or comma separated if not JSON
             imagesList = String(row.images).split(/[\s,]+/).filter(Boolean)
           }
        }
        
        // Also handle "images" column from user input which might be just one URL
        
        const mainImage = imagesList.length > 0 ? imagesList[0] : ''
        
        // Process bullet points
        const bulletPoints = []
        for (let i = 1; i <= 5; i++) {
          if (row[`bullet_point_${i}`]) {
            bulletPoints.push(row[`bullet_point_${i}`])
          }
        }

        // Process price
        const price = parseFloat(row.price)
        if (isNaN(price)) {
          results.failed++
          results.errors.push(`Invalid price for product: ${row.title}`)
          continue
        }

        // Process release_date
        let publishedAt = null
        if (row.release_date) {
            // Excel dates can be tricky. XLSX.utils.sheet_to_json might return number or string.
            // If raw: false (default), it tries to format.
            // Let's assume it's parseable by Date or it's an Excel serial date if we read differently.
            // But sheet_to_json default behavior is usually fine for standard dates.
            publishedAt = new Date(row.release_date)
            if (isNaN(publishedAt.getTime())) {
                publishedAt = new Date() // Fallback to now or null?
            }
        }

        await db.product.create({
          data: {
            title: row.title,
            slug,
            mainImage: mainImage,
            images: JSON.stringify(imagesList),
            price: price,
            amazonUrl: row.url,
            categoryId: categoryId,
            brandId: brandId || null,
            bulletPoints: JSON.stringify(bulletPoints),
            description: row.description || '',
            publishedAt: publishedAt,
            showBuyOnAmazon: true,
            showAddToCart: true,
            active: true
          }
        })

        results.success++
      } catch (err: any) {
        console.error('Error processing row:', row, err)
        results.failed++
        results.errors.push(`Error processing ${row.title || 'unknown'}: ${err.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to process import' }, { status: 500 })
  }
}
