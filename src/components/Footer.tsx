'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useSettings } from '@/lib/settings'
import { useEffect, useState } from 'react'

interface NavItem {
  id: string
  label: string
  href: string
  order: number
  isExternal?: boolean
}

const defaultNav: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', order: 1 },
  { id: 'products', label: 'Products', href: '/products', order: 2 },
  { id: 'about', label: 'About', href: '/about', order: 3 },
  { id: 'contact', label: 'Contact', href: '/contact', order: 4 },
]

export default function Footer({ initialNavItems = [] }: { initialNavItems?: NavItem[] }) {
  const { settings, loading } = useSettings()
  const [navItems, setNavItems] = useState<NavItem[]>(initialNavItems)
  const [navLoading, setNavLoading] = useState(initialNavItems.length === 0)

  useEffect(() => {
    const load = async () => {
      const shouldShowLoading = initialNavItems.length === 0
      try {
        if (shouldShowLoading) setNavLoading(true)
        const res = await fetch('/api/navigation', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length) {
            setNavItems(data)
          } else {
            setNavItems(defaultNav)
          }
        } else {
          setNavItems(defaultNav)
        }
      } catch (e) {
        console.error('Footer navigation load failed:', e)
        setNavItems(defaultNav)
      } finally {
        if (shouldShowLoading) setNavLoading(false)
      }
    }
    load()
  }, [])

  // 加载站点设置时显示骨架，但导航不再因加载而空白
  if (loading) {
    return (
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </footer>
    )
  }
  // Helper to ensure units are present
  const formatSize = (value: string | undefined | null) => {
    if (!value || value === 'auto') return 'auto'
    if (/^\d+$/.test(value)) return `${value}px`
    return value
  }

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* 使用 table 布局确保在所有浏览器中的兼容性 */}
        <div className="block md:table w-full border-collapse">
          <div className="md:table-row">
            {/* 左侧品牌列 - 固定宽度 */}
            <div className="md:table-cell md:w-64 align-top pb-8 md:pb-0">
              <div className="space-y-8">
                <Link href="/" className="flex items-center space-x-2">
                  {settings.logoUrl ? (
                    <>
                      {/* 移动端 Logo (footer): 默认 h-8 (32px) */}
                      <img 
                        src={settings.logoUrl} 
                        alt={settings.siteName} 
                        className={`md:hidden object-contain ${
                          (settings.logoWidth && settings.logoWidth !== 'auto') || 
                          (settings.logoHeight && settings.logoHeight !== 'auto') 
                            ? 'max-h-12 w-auto max-w-[180px]' 
                            : 'max-h-12 w-auto max-w-[180px]'
                        }`}
                        style={
                          (settings.logoWidth && settings.logoWidth !== 'auto') || 
                          (settings.logoHeight && settings.logoHeight !== 'auto')
                            ? {
                                width: formatSize(settings.logoWidth),
                                height: formatSize(settings.logoHeight),
                              }
                            : undefined
                        }
                      />
                      {/* 桌面端 Logo (footer): 默认 h-8 (32px) */}
                      <img 
                        src={settings.logoUrl} 
                        alt={settings.siteName} 
                        className={`hidden md:block object-contain ${
                          (settings.logoWidth && settings.logoWidth !== 'auto') || 
                          (settings.logoHeight && settings.logoHeight !== 'auto') 
                            ? 'max-w-full' 
                            : 'max-w-full'
                        }`}
                        style={
                          (settings.logoWidth && settings.logoWidth !== 'auto') || 
                          (settings.logoHeight && settings.logoHeight !== 'auto')
                            ? {
                                width: formatSize(settings.logoWidth),
                                height: formatSize(settings.logoHeight),
                              }
                            : undefined
                        }
                      />
                    </>
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-blue-600" />
                  )}
                  <span className="text-xl font-semibold text-gray-900">{settings.siteName}</span>
                </Link>
                <p className="text-sm text-gray-600">
                  {settings.siteDescription}
                </p>
              </div>
            </div>
            {/* 右侧三列 - 自动分配剩余空间 */}
            <div className="md:table-cell align-top pl-0 md:pl-12">
              <div className="md:table w-full">
                <div className="md:table-row">
                  <div className="md:table-cell md:w-1/3 pr-8 pb-8 md:pb-0">
                    <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                      Navigation
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      {navItems.map((item) => (
                        <li key={item.id}>
                          <Link href={item.href} className="text-sm text-gray-600 hover:text-gray-900">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:table-cell md:w-1/3 pr-8 pb-8 md:pb-0">
                    <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                      Legal
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                          Privacy Policy
                        </Link>
                      </li>
                      <li>
                        <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                          Terms of Service
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="md:table-cell md:w-1/3">
                    <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                      Follow Us
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      {settings.socialFacebook && (
                        <li>
                          <a href={settings.socialFacebook} className="text-sm text-gray-600 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
                            {settings.socialFacebookTitle || 'Facebook'}
                          </a>
                        </li>
                      )}
                      {settings.socialTwitter && (
                        <li>
                          <a href={settings.socialTwitter} className="text-sm text-gray-600 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
                            {settings.socialTwitterTitle || 'Twitter'}
                          </a>
                        </li>
                      )}
                      {settings.socialInstagram && (
                        <li>
                          <a href={settings.socialInstagram} className="text-sm text-gray-600 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
                            {settings.socialInstagramTitle || 'Instagram'}
                          </a>
                        </li>
                      )}
                      {settings.socialYoutube && (
                        <li>
                          <a href={settings.socialYoutube} className="text-sm text-gray-600 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
                            {settings.socialYoutubeTitle || 'YouTube'}
                          </a>
                        </li>
                      )}
                      {settings.socialTiktok && (
                        <li>
                          <a href={settings.socialTiktok} className="text-sm text-gray-600 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
                            {settings.socialTiktokTitle || 'TikTok'}
                          </a>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8 clear-both">
          <p className="text-sm text-gray-600 text-center">
            {settings.footerText}
          </p>
        </div>
      </div>
    </footer>
  )
}