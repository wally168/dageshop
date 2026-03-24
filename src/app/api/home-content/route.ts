import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - 获取首页内容
export async function GET() {
  try {
    let homeContent = await db.homeContent.findFirst()
    
    // 如果没有数据，创建默认数据
    if (!homeContent) {
      homeContent = await db.homeContent.create({
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
      })
    }
    
    return NextResponse.json(homeContent)
  } catch (error: any) {
    console.error('Failed to fetch home content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch home content', detail: error?.message || String(error), stack: error?.stack },
      { status: 500 }
    )
  }
}

// PUT - 更新首页内容
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    // 验证必填字段
    const requiredFields = [
      'featuredTitle', 'featuredSubtitle',
      'whyChooseTitle', 'whyChooseSubtitle',
      'feature1Title', 'feature1Description',
      'feature2Title', 'feature2Description', 
      'feature3Title', 'feature3Description'
    ]
    
    for (const field of requiredFields) {
      if (!data[field] || data[field].trim() === '') {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }
    
    // 查找现有记录
    let homeContent = await db.homeContent.findFirst()
    
    if (homeContent) {
      // 更新现有记录
      homeContent = await db.homeContent.update({
        where: { id: homeContent.id },
        data: {
          featuredTitle: data.featuredTitle.trim(),
          featuredSubtitle: data.featuredSubtitle.trim(),
          whyChooseTitle: data.whyChooseTitle.trim(),
          whyChooseSubtitle: data.whyChooseSubtitle.trim(),
          feature1Title: data.feature1Title.trim(),
          feature1Description: data.feature1Description.trim(),
          feature2Title: data.feature2Title.trim(),
          feature2Description: data.feature2Description.trim(),
          feature3Title: data.feature3Title.trim(),
          feature3Description: data.feature3Description.trim(),
          carouselEnabled: data.carouselEnabled !== undefined ? data.carouselEnabled : homeContent.carouselEnabled,
          carouselInterval: data.carouselInterval !== undefined ? parseInt(data.carouselInterval) : homeContent.carouselInterval,
        }
      })
    } else {
      // 创建新记录
      homeContent = await db.homeContent.create({
        data: {
          featuredTitle: data.featuredTitle.trim(),
          featuredSubtitle: data.featuredSubtitle.trim(),
          whyChooseTitle: data.whyChooseTitle.trim(),
          whyChooseSubtitle: data.whyChooseSubtitle.trim(),
          feature1Title: data.feature1Title.trim(),
          feature1Description: data.feature1Description.trim(),
          feature2Title: data.feature2Title.trim(),
          feature2Description: data.feature2Description.trim(),
          feature3Title: data.feature3Title.trim(),
          feature3Description: data.feature3Description.trim(),
          carouselEnabled: data.carouselEnabled !== undefined ? data.carouselEnabled : true,
          carouselInterval: data.carouselInterval !== undefined ? parseInt(data.carouselInterval) : 5000,
        }
      })
    }
    
    return NextResponse.json(homeContent)
  } catch (error: any) {
    console.error('Failed to update home content:', error)
    return NextResponse.json(
      { error: 'Failed to update home content', detail: error?.message || String(error), stack: error?.stack },
      { status: 500 }
    )
  }
}