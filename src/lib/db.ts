import { PrismaClient } from '@prisma/client'

// URL do pooler do Supabase (porta 5432, session mode)
// O pooler gerencia as conexões para evitar EMAXCONNSESSION
const SUPABASE_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'

// Força as variáveis de ambiente ANTES de criar o PrismaClient
process.env.DATABASE_URL = SUPABASE_URL
process.env.DIRECT_URL = SUPABASE_URL

// Singleton global — reaproveita a mesma conexão em todas as requisições
// Evita EMAXCONNSESSION (limite de 15 conexões no plano gratuito)
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
