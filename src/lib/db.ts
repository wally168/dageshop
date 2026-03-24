import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use PRISMA_DATABASE_URL if available, fallback to DATABASE_URL for local dev
export const db: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
