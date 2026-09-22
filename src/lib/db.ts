import { PrismaClient } from '@prisma/client'

// Novo projeto Supabase - pooler na porta 5432
const SUPABASE_URL = 'postgresql://postgres.yveaeokfzwxczhsshkzt:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'

process.env.DATABASE_URL = SUPABASE_URL
process.env.DIRECT_URL = SUPABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: SUPABASE_URL,
      },
    },
  })
}

export const db = globalForPrisma.prisma
