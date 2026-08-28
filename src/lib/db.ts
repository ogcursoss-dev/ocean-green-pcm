import { PrismaClient } from '@prisma/client'

// URL do Supabase com pgbouncer (pool de conexões)
// Usa a porta 6543 que é o pooler do Supabase (session mode)
process.env.DATABASE_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20'
process.env.DIRECT_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'

// Singleton global para evitar EMAXCONNSESSION (máximo de conexões no Supabase)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Cria uma única instância e reutiliza em todas as requisições
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma
