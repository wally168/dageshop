"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

interface NavItem {
  id: string
  label: string
  href: string
  order: number
  isExternal?: boolean
}

export default function AppShell({
  children,
  initialNavItems = []
}: {
  children: React.ReactNode
  initialNavItems?: NavItem[]
}) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) {
    // 后台展示作者信息页脚
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t bg-white text-xs text-gray-600">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 text-center">
            作者：達哥 WeChat:DAGEUP6688
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation initialNavItems={initialNavItems} />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer initialNavItems={initialNavItems} />
    </div>
  )
}