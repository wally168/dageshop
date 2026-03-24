'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ShoppingBag, ShoppingCart } from 'lucide-react'
import { useSettings } from '@/lib/settings'
import { getCount, onCartChange } from '@/lib/cart'

// 新增：动态导航项类型
interface NavItem {
  id: string
  label: string
  href: string
  order: number
  isExternal?: boolean
}

// 新增：默认导航（用于API为空时降级）
const defaultNav: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', order: 1 },
  { id: 'products', label: 'Products', href: '/products', order: 2 },
  { id: 'about', label: 'About', href: '/about', order: 3 },
  { id: 'contact', label: 'Contact', href: '/contact', order: 4 },
]

export default function Navigation({ initialNavItems = [] }: { initialNavItems?: NavItem[] }) {
  const { settings, loading } = useSettings()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  // 新增：前台动态导航项（以服务端初始数据作为首屏渲染）
  const [navItems, setNavItems] = useState<NavItem[]>(initialNavItems)
  const [navLoading, setNavLoading] = useState(initialNavItems.length === 0)
  const showSkeleton = navLoading && navItems.length === 0
  // 新增：购物车数量
  const [cartCount, setCartCount] = useState<number>(0)
  // 新增：分类与搜索
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 新增：加载导航数据（如果没有初始数据才显示loading）
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
            // API返回空时使用默认导航
            setNavItems(defaultNav)
          }
        } else {
          setNavItems(defaultNav)
        }
      } catch (e) {
        console.error('Navigation load failed:', e)
        setNavItems(defaultNav)
      } finally {
        if (shouldShowLoading) setNavLoading(false)
      }
    }
    load()
  }, [])

  // 加载分类用于 Products 下拉
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) setCategories(data as Array<{ id: string; name: string; slug: string }>)
        }
      } catch (e) {
        console.error('Load categories failed:', e)
      }
    }
    load()
  }, [])

  // 新增：订阅购物车变更（同页 + storage）
  useEffect(() => {
    setCartCount(getCount())
    const unsubscribe = onCartChange(() => setCartCount(getCount()))
    return unsubscribe
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const itemsToRender = navItems.filter((item) => item.href !== '/cart')
  
  // Helper to ensure units are present
  const formatSize = (value: string | undefined | null) => {
    if (!value || value === 'auto') return 'auto'
    if (/^\d+$/.test(value)) return `${value}px`
    return value
  }

  const hasCustomLogoSize =
    (settings.logoWidth && settings.logoWidth !== 'auto') ||
    (settings.logoHeight && settings.logoHeight !== 'auto')

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm' 
        : 'bg-white/95 backdrop-blur-md border-b border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-h-[4rem]">
          {/* 左侧：Logo 保持不变，占用等比空间 */}
          <div className="flex-1">
            <Link href="/" className="flex items-center space-x-2 group min-w-0">
              <div className="relative shrink-0">
                {settings.logoUrl ? (
                  <>
                    {/* 移动端 Logo: 恢复 object-contain 并参考 Footer 设置 (max-h-12/14) 确保比例正常且不过小 */}
            <img
              src={settings.logoUrl}
              alt={settings.siteName || 'Site Logo'}
              className={`md:hidden object-contain shrink-0 transition-transform group-hover:scale-105 ${
                hasCustomLogoSize ? 'w-auto max-w-[180px]' : 'h-10 w-auto max-w-[180px]'
              }`}
              style={
                hasCustomLogoSize
                  ? {
                      width: formatSize(settings.logoWidth),
                      height: formatSize(settings.logoHeight),
                    }
                  : undefined
              }
            />
            
            {/* 桌面端 Logo: 默认 h-8 (32px) 与桌面端页脚保持一致 */}
            <img
              src={settings.logoUrl}
              alt={settings.siteName || 'Site Logo'}
              className={`hidden md:block object-contain shrink-0 transition-transform group-hover:scale-105 ${
                hasCustomLogoSize ? 'max-w-full' : 'h-8 w-auto max-w-full'
              }`}
              style={
                hasCustomLogoSize
                  ? {
                      width: formatSize(settings.logoWidth),
                      height: formatSize(settings.logoHeight),
                    }
                  : undefined
              }
            />
                  </>
                ) : (
                  <>
<ShoppingBag
                  className="h-12 w-12 text-blue-600 transition-transform group-hover:scale-105"
                />   <div className="absolute inset-0 bg-blue-600/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300 opacity-0 group-hover:opacity-100"></div>
                  </>
                )}
              </div>
              <span className="text-xl font-semibold text-gray-900 tracking-tight truncate">
                {settings.siteName}
              </span>
            </Link>
          </div>

          {/* 中间：桌面导航 居中显示 + Products 下拉 */}
          <div className="hidden md:flex items-center justify-center space-x-1">
            {showSkeleton ? (
              <div className="flex items-center space-x-1">
                <SkeletonPill />
                <SkeletonPill />
                <SkeletonPill />
                <SkeletonPill />
              </div>
            ) : (
              itemsToRender.map((item) => (
                item.href === '/products' ? (
                  <div key={item.id} className="relative group">
                    <NavLink href={item.href}>{item.label}</NavLink>
                    {categories.length > 0 && (
                      <div className="absolute left-0 top-full pt-2 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          <Link href="/products" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">All Products</Link>
                          {categories.map((c) => (
                            <Link key={c.id} href={`/products?categoryId=${encodeURIComponent(c.id)}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink key={item.id} href={item.href}>
                    {item.label}
                  </NavLink>
                )
              ))
            )}
          </div>

          {/* 右侧：搜索框、购物车入口与移动端菜单按钮 */}
          <div className="flex md:flex-1 justify-end items-center gap-2">
            {/* Search */}
            <form action="/products" method="get" className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
              <input
                type="text"
                name="q"
                placeholder="Search Products"
                className="bg-transparent px-2 py-1 text-sm focus:outline-none w-40 md:w-48"
              />
              <button type="submit" className="text-sm px-2 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300">Search</button>
            </form>
            {/* Cart link always visible */}
            <Link
              href="/cart"
              className="hidden md:inline-flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100/50 rounded-lg transition-all duration-200"
              aria-label="Cart"
            >
              <span className="relative inline-flex">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">{cartCount}</span>
                )}
              </span>
              <span className="ml-2">Cart</span>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100/50 rounded-lg transition-all duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            {/* Mobile cart icon */}
            <Link
              href="/cart"
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100/50 rounded-lg transition-all duration-200"
              aria-label="Cart"
            >
              <span className="relative inline-flex">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">{cartCount}</span>
                )}
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation + 搜索与分类 */}
        <div 
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen 
              ? 'max-h-64 opacity-100' 
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
          style={{
            // 兼容性兜底：确保在 CSS 加载失败时也能正确隐藏/显示
            maxHeight: isMenuOpen ? '16rem' : '0',
            opacity: isMenuOpen ? 1 : 0,
            overflow: 'hidden',
            visibility: isMenuOpen ? 'visible' : 'hidden'
          }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-md border-t border-gray-200/50">
            {/* Mobile search */}
            <form action="/products" method="get" className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-2 mb-2">
              <input type="text" name="q" placeholder="Search Products" className="flex-1 bg-transparent px-2 py-1 text-sm focus:outline-none" />
              <button type="submit" className="text-sm px-2 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300">Search</button>
            </form>
            {showSkeleton ? (
              <div className="space-y-1">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : (
              <>
                {itemsToRender.map((item) => (
                  <MobileNavLink key={item.id} href={item.href} onClick={() => setIsMenuOpen(false)}>
                    {item.label}
                  </MobileNavLink>
                ))}
                {categories.length > 0 && (
                  <div className="mt-2 bg-white rounded-xl border border-gray-200">
                    <div className="px-4 py-2 text-xs text-gray-500">Browse by Category</div>
                    {categories.map((c) => (
                      <Link key={c.id} href={`/products?categoryId=${encodeURIComponent(c.id)}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function SkeletonPill() {
  return (
    <div className="h-9 w-20 rounded-full bg-gray-200 animate-pulse" />
  )
}

function SkeletonRow() {
  return (
    <div className="h-10 rounded-lg bg-gray-200 animate-pulse" />
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative px-4 py-2 text-base font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 group"
    >
      {children}
      <span className="absolute inset-x-4 bottom-0 h-0.5 bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
    </Link>
  )
}

function MobileNavLink({ 
  href, 
  children, 
  onClick 
}: { 
  href: string; 
  children: React.ReactNode; 
  onClick: () => void 
}) {
  return (
    <Link
      href={href}
      className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all duration-200"
      onClick={onClick}
    >
      {children}
    </Link>
  )
}
