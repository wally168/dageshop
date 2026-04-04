export type CartItem = {
  id: string
  slug: string
  title: string
  price: number
  imageUrl: string
  quantity: number
  selectedOptions?: Record<string, string>
}

const STORAGE_KEY = 'amzshop_cart'
// 新增：购物车变更事件名
const CART_EVENT = 'amzshop_cart_changed'

function safeParse<T>(s: string | null): T | null {
  try { return s ? JSON.parse(s) as T : null } catch { return null }
}

function serializeOptions(obj?: Record<string, string>): string {
  if (!obj || typeof obj !== 'object') return ''
  const entries = Object.entries(obj).filter(([k, v]) => k && v)
  entries.sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(Object.fromEntries(entries))
}

// 新增：触发购物车变更事件
function notifyCartChanged(): void {
  if (typeof window === 'undefined') return
  try { window.dispatchEvent(new Event(CART_EVENT)) } catch {}
}

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = safeParse<CartItem[]>(raw)
  return Array.isArray(parsed) ? parsed : []
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    notifyCartChanged()
  } catch {}
}

export function addItem(input: Omit<CartItem, 'quantity'> & { quantity?: number }): CartItem[] {
  const items = loadCart()
  const targetKey = `${input.id}::${serializeOptions(input.selectedOptions)}`
  const idx = items.findIndex(i => `${i.id}::${serializeOptions(i.selectedOptions)}` === targetKey)
  if (idx >= 0) {
    const q = typeof input.quantity === 'number' && input.quantity > 0 ? input.quantity : 1
    items[idx].quantity += q
  } else {
    items.push({ ...input, quantity: (input.quantity && input.quantity > 0) ? input.quantity : 1 })
  }
  saveCart(items)
  return items
}

export function removeItem(id: string, selectedOptions?: Record<string, string>): CartItem[] {
  const key = `${id}::${serializeOptions(selectedOptions)}`
  const items = loadCart().filter(i => `${i.id}::${serializeOptions(i.selectedOptions)}` !== key)
  saveCart(items)
  return items
}

export function getCount(): number {
  return loadCart().reduce((sum, i) => sum + (i.quantity || 0), 0)
}

export function clearCart(): void {
  if (typeof window === 'undefined') return
  try { 
    window.localStorage.removeItem(STORAGE_KEY)
    notifyCartChanged()
  } catch {}
}

// 新增：订阅购物车变更（同页事件 + 跨页 storage）
export function onCartChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler()
  }
  window.addEventListener(CART_EVENT, handler)
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(CART_EVENT, handler)
    window.removeEventListener('storage', storageHandler)
  }
}