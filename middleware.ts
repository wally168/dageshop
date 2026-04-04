import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 仅保护 /admin 页面
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // 只做 Cookie 存在性校验，避免在 Edge 中访问数据库
  const token = req.cookies.get('admin_session')?.value
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}