import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Carrega variáveis de ambiente dos arquivos disponíveis
// Prioridade: .env.local > .env > .env.deploy
// Em produção (deploy), o .env pode não existir, mas .env.deploy sim
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })
config({ path: '.env.deploy', quiet: true })
config({ path: '.env.production', quiet: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
