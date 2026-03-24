'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface SiteSettings {
  siteName: string
  logoUrl: string
  logoWidth: string
  logoHeight: string
  siteDescription: string
  siteKeywords: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  messageForwardEmail?: string
  messageForwardEnabled?: string
  socialFacebook: string
  socialFacebookTitle: string
  socialTwitter: string
  socialTwitterTitle: string
  socialInstagram: string
  socialInstagramTitle: string
  socialYoutube: string
  socialYoutubeTitle: string
  socialTiktok: string
  socialTiktokTitle: string
  footerText: string
  aboutText: string
  ourStory: string
  ourMission: string
  whyChooseUs: string
  privacyPolicy: string
  termsOfService: string
  analyticsHeadHtml?: string
  analyticsBodyHtml?: string
  analyticsGoogleHtml?: string
  // SEO settings
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  seoSummary?: string
  // Sitemap
  sitemapEnabled?: string
  sitemapChangefreq?: string
  sitemapPriority?: string
  sitemapIncludeProducts?: string
  sitemapIncludeCategories?: string
  // Robots
  robotsAllowAll?: string
  robotsDisallowAdmin?: string
  robotsDisallowApi?: string
  robotsDisallowCart?: string
  robotsDisallowCheckout?: string
  robotsDisallowSearch?: string
  robotsExtraRules?: string
  // Site verification
  googleSiteVerification?: string
  baiduSiteVerification?: string
}

interface SettingsContextType {
  settings: SiteSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const defaultSettings: SiteSettings = {
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
  analyticsGoogleHtml: ''
  ,
  // SEO defaults
  seoTitle: '',
  seoKeywords: 'premium products, quality, design, lifestyle',
  seoDescription: 'Discover premium products with exceptional quality and design',
  seoSummary: '',
  // Sitemap defaults
  sitemapEnabled: 'true',
  sitemapChangefreq: 'daily',
  sitemapPriority: '0.7',
  sitemapIncludeProducts: 'true',
  sitemapIncludeCategories: 'true',
  // Robots defaults
  robotsAllowAll: 'true',
  robotsDisallowAdmin: 'true',
  robotsDisallowApi: 'true',
  robotsDisallowCart: 'true',
  robotsDisallowCheckout: 'true',
  robotsDisallowSearch: 'true',
  robotsExtraRules: '',
  // Site verification defaults
  googleSiteVerification: '',
  baiduSiteVerification: ''
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Add SSR initial settings support and always refresh from API
export function SettingsProvider({ children, initialSettings }: { children: ReactNode, initialSettings?: SiteSettings }) {
  // Initialize with SSR-provided settings if available to prevent flicker
  const mergedInitial = initialSettings ? { ...defaultSettings, ...initialSettings } : defaultSettings
  const [settings, setSettings] = useState<SiteSettings>(mergedInitial)
  const [loading, setLoading] = useState(!initialSettings)

  // Fetch settings from API and update cache
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        if (typeof window !== 'undefined') {
          localStorage.setItem('siteSettings', JSON.stringify(data))
          localStorage.setItem('siteSettingsVersion', '1.5')
        }
      }
    } catch (error) {
      console.error('获取设置失败:', error)
      // keep current settings as fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      // If no SSR initial settings, use cache first for fast display, then refresh
      if (!initialSettings && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('siteSettings')
          const cacheVersion = localStorage.getItem('siteSettingsVersion')
          const currentVersion = '1.5'

          if (cached && cacheVersion === currentVersion) {
            const parsedSettings = JSON.parse(cached)
            if (parsedSettings.siteName && typeof parsedSettings.siteName === 'string') {
              setSettings(parsedSettings)
            } else {
              localStorage.removeItem('siteSettings')
              localStorage.removeItem('siteSettingsVersion')
            }
          } else {
            localStorage.removeItem('siteSettings')
            localStorage.removeItem('siteSettingsVersion')
          }
        } catch (error) {
          console.error('读取缓存设置失败:', error)
          localStorage.removeItem('siteSettings')
          localStorage.removeItem('siteSettingsVersion')
        }
      }

      await fetchSettings()
    }

    init()
  }, [])

  const refreshSettings = async () => {
    setLoading(true)
    await fetchSettings()
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    // 安全回退：在未包裹 SettingsProvider 的环境（如部分预览/SSR边界）提供默认值
    return {
      settings: defaultSettings,
      loading: true,
      refreshSettings: async () => {},
    }
  }
  return context
}
