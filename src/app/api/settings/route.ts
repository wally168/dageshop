import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// 默认设置
const defaultSettings = {
  siteName: 'Your Brand',
  logoUrl: '',
  logoWidth: '',
  logoHeight: '',
  siteDescription: 'Discover premium products with exceptional quality and design',
  siteKeywords: 'premium products, quality, design, lifestyle',
  contactEmail: 'contact@yourbrand.com',
  contactPhone: '+1 (555) 123-4567',
  contactAddress: '123 Main Street, City, State 12345',
  messageForwardEmail: '',
  messageForwardEnabled: 'false',
  socialFacebook: 'https://facebook.com/yourbrand',
  socialFacebookTitle: 'Facebook',
  socialTwitter: 'https://twitter.com/yourbrand',
  socialTwitterTitle: 'Twitter',
  socialInstagram: 'https://instagram.com/yourbrand',
  socialInstagramTitle: 'Instagram',
  socialYoutube: 'https://youtube.com/yourbrand',
  socialYoutubeTitle: 'YouTube',
  socialTiktok: '',
  socialTiktokTitle: 'TikTok',
  footerText: '© 2025 Your Brand. All rights reserved.',
  aboutText: 'We\'re passionate about bringing you the finest products that combine quality, innovation, and style.',
  ourStory: 'Founded with a vision to make premium products accessible to everyone, Your Brand has been dedicated to curating exceptional items that enhance your daily life. We believe that quality shouldn\'t be compromised, and every product in our collection reflects this commitment.',
  ourMission: 'To provide our customers with carefully selected, high-quality products that offer both functionality and style. We work directly with trusted manufacturers and suppliers to ensure that every item meets our rigorous standards.',
  whyChooseUs: 'Rigorous quality control and product testing\nCompetitive pricing with transparent policies\nExcellent customer service and support\nFast and reliable shipping\nSatisfaction guarantee on all products',
  privacyPolicy: 'We value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.',
  termsOfService: 'By using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.',
  analyticsHeadHtml: '',
  analyticsBodyHtml: '',
  analyticsGoogleHtml: '',
  // SEO
  seoTitle: '',
  seoKeywords: 'premium products, quality, design, lifestyle',
  seoDescription: 'Discover premium products with exceptional quality and design',
  seoSummary: '',
  // Sitemap
  sitemapEnabled: 'true',
  sitemapChangefreq: 'daily',
  sitemapPriority: '0.7',
  sitemapIncludeProducts: 'true',
  sitemapIncludeCategories: 'true',
  // Robots
  robotsAllowAll: 'true',
  robotsDisallowAdmin: 'true',
  robotsDisallowApi: 'true',
  robotsDisallowCart: 'true',
  robotsDisallowCheckout: 'true',
  robotsDisallowSearch: 'true',
  robotsExtraRules: '',
  // Site verification
  googleSiteVerification: '',
  baiduSiteVerification: ''
}

// GET - 获取所有设置
export async function GET() {
  try {
    const settings = await db.siteSettings.findMany()
    
    // 将数据库中的设置转换为对象格式
    const settingsObject: Record<string, string> = {}
    
    // 先填充默认值
    Object.entries(defaultSettings).forEach(([key, value]) => {
      settingsObject[key] = value
    })
    
    // 然后用数据库中的值覆盖
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value
    })

    return NextResponse.json(settingsObject, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    return NextResponse.json({ error: '获取设置失败' }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  }
}

// PUT - 更新设置（需管理员登录）
export async function PUT(request: NextRequest) {
  // 会话校验
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = await db.session.findUnique({ where: { token } })
  if (!session || session.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // 使用批量事务更新设置，兼容 Data Proxy（避免交互式事务）
    const ops: Prisma.PrismaPromise<any>[] = []
    for (const [key, value] of Object.entries(body)) {
      const stringValue = typeof value === 'string' ? value : String(value)
      ops.push(
        db.siteSettings.upsert({
          where: { key },
          update: { value: stringValue },
          create: { key, value: stringValue, description: `${key} setting` }
        })
      )
    }
    await db.$transaction(ops)

    return NextResponse.json({ message: '设置更新成功' }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('更新设置失败:', error)
    return NextResponse.json({ error: '更新设置失败' }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  }
}
