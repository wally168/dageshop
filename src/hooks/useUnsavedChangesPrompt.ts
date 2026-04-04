import { useEffect } from 'react'

export default function useUnsavedChangesPrompt(
  enabled: boolean,
  message: string = '你还有未保存的更改，离开后将丢失这些修改，确定要离开吗？'
) {
  // 关闭/刷新浏览器提示
  useEffect(() => {
    if (!enabled) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled, message])

  // 拦截站内链接点击（next/link 生成的 a 标签）
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!enabled) return
      const target = e.target as HTMLElement | null
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null
      if (!anchor) return
      // 外链或在新标签打开不拦截
      const href = anchor.getAttribute('href') || ''
      const isExternal = anchor.target === '_blank' || /^https?:\/\//.test(href)
      const isSameOrigin = href.startsWith('/')
      if (isExternal && !isSameOrigin) return
      const ok = window.confirm(message)
      if (!ok) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled, message])

  // 处理浏览器后退（popstate）
  useEffect(() => {
    const onPopState = () => {
      if (!enabled) return
      const ok = window.confirm(message)
      if (!ok) {
        // 尝试留在当前页
        history.pushState(null, '', location.href)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [enabled, message])
}