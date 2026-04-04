import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function parseJsonField<T>(field: string | null): T[] {
  if (!field) return [] as T[]
  try {
    return JSON.parse(field) as T[]
  } catch {
    return [] as T[]
  }
}

export function normalizeAsin(asin?: string | null): string | null {
  if (!asin || typeof asin !== 'string') return null
  const normalized = asin.trim().toUpperCase()
  if (!normalized) return null
  return normalized
}

export function getProductUrlSegment(product: { asin?: string | null; slug: string }): string {
  return normalizeAsin(product.asin) || product.slug
}
