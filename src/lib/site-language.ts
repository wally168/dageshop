import { cache } from 'react'
import { db } from '@/lib/db'
import { FrontendLanguage, normalizeFrontendLanguage } from '@/lib/i18n'

export const getFrontendLanguage = cache(async (): Promise<FrontendLanguage> => {
  try {
    const row = await db.siteSettings.findUnique({ where: { key: 'frontendLanguage' } })
    return normalizeFrontendLanguage(row?.value)
  } catch {
    return 'en'
  }
})
