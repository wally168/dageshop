import React from 'react'

interface LayoutProps {
  children: React.ReactNode
}

// 精简版 Layout：仅渲染 children，头部和页脚由根布局负责
export default function Layout({ children }: LayoutProps) {
  return <>{children}</>
}