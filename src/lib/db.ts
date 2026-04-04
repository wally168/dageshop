import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const resolvedDatabaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.CONNECTION_STRING

if (!resolvedDatabaseUrl) {
  throw new Error(
    'Missing database connection string. Please set one of: PRISMA_DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, DATABASE_URL, CONNECTION_STRING'
  )
}

export const db: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: resolvedDatabaseUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
