'use client'

import { useEffect, useRef } from 'react'
import { useSettings } from '@/lib/settings'

function injectHtml(target: HTMLElement, html: string) {
  if (!target || !html) return
  const scripts: { attrs: Record<string, string>; content: string }[] = []
  const regexp = /<script([^>]*)>([\s\S]*?)<\/script>/gi
  let rest = html
  let match: RegExpExecArray | null
  const parts: string[] = []
  let lastIndex = 0
  while ((match = regexp.exec(html))) {
    const [full, attrStr, content] = match
    parts.push(html.slice(lastIndex, match.index))
    lastIndex = match.index + full.length
    const attrs: Record<string, string> = {}
    attrStr.replace(/(\w+)(\s*=\s*"([^"]*)"|\s*=\s*'([^']*)'|\s*=\s*([^\s"'>]+))?/g, (_m, k, _v, q1, q2, q3) => {
      const val = q1 ?? q2 ?? q3 ?? ''
      attrs[k] = val
      return ''
    })
    scripts.push({ attrs, content })
  }
  parts.push(html.slice(lastIndex))
  rest = parts.join('')
  if (rest.trim()) target.insertAdjacentHTML('beforeend', rest)
  for (const s of scripts) {
    const el = document.createElement('script')
    for (const [k, v] of Object.entries(s.attrs)) {
      if (v === '' && (k === 'async' || k === 'defer')) {
        el.setAttribute(k, '')
      } else {
        el.setAttribute(k, v)
      }
    }
    if (!s.attrs.src && s.content) el.textContent = s.content
    target.appendChild(el)
  }
}

export default function AnalyticsInjector() {
  const { settings } = useSettings()
  const injected = useRef(false)
  useEffect(() => {
    if (injected.current) return
    injected.current = true
    const headHtml = settings.analyticsHeadHtml
    const bodyHtml = settings.analyticsBodyHtml
    const googleHtml = settings.analyticsGoogleHtml
    if (typeof headHtml === 'string' && headHtml.trim() && typeof document !== 'undefined') {
      injectHtml(document.head, headHtml)
    }
    if (typeof googleHtml === 'string' && googleHtml.trim() && typeof document !== 'undefined') {
      injectHtml(document.head, googleHtml)
    }
    if (typeof bodyHtml === 'string' && bodyHtml.trim() && typeof document !== 'undefined') {
      injectHtml(document.body, bodyHtml)
    }
  }, [settings])
  return null
}

