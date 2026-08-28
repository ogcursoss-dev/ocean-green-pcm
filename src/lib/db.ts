import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Carrega variáveis de ambiente do arquivo .env (silenciosamente)
// Garante que funcione tanto em dev quanto em produção (standalone)
config()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
