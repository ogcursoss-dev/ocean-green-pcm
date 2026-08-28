import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

// ===== CARREGAMENTO FORÇADO DE VARIÁVEIS DE AMBIENTE =====
// A plataforma Z.ai injeta DATABASE_URL no formato JDBC (jdbc:postgresql://...)
// que é incompatível com o Prisma. Precisamos FORÇAR a sobrescrita com o valor
// correto do Supabase lido do arquivo .env.deploy

function forceLoadEnvFile(envPath: string): boolean {
  try {
    if (!fs.existsSync(envPath)) return false
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.substring(0, eqIdx).trim()
      let value = trimmed.substring(eqIdx + 1).trim()
      // Remove aspas
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      // FORÇA a sobrescrita — sobrescreve mesmo se já existir no ambiente
      process.env[key] = value
    }
    return true
  } catch (e) {
    return false
  }
}

function loadEnv() {
  // Lista de caminhos possíveis para o .env.deploy (em ordem de prioridade)
  const possiblePaths = [
    path.join(process.cwd(), '.env.deploy'),
    path.join(__dirname, '..', '.env.deploy'),
    path.join(__dirname, '..', '..', '.env.deploy'),
    '/home/z/my-project/.env.deploy',
    '.env.deploy',
  ]

  let loaded = false
  for (const envPath of possiblePaths) {
    if (forceLoadEnvFile(envPath)) {
      console.log('[env] Variáveis carregadas (forçadas) de:', envPath)
      loaded = true
      break
    }
  }

  // Validação: se DATABASE_URL não for PostgreSQL válida, força um valor padrão
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
    console.error('[env] DATABASE_URL inválida detectada:', dbUrl ? dbUrl.substring(0, 50) + '...' : 'undefined')
    console.error('[env] Forçando DATABASE_URL do Supabase...')
    // Valor hardcoded do Supabase (fallback final)
    process.env.DATABASE_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
    process.env.DIRECT_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
  }

  // Carrega .env e .env.local também (para desenvolvimento)
  config({ path: '.env.local', quiet: true })
  config({ path: '.env', quiet: true })

  console.log('[env] DATABASE_URL final:', process.env.DATABASE_URL?.substring(0, 40) + '...')
}

loadEnv()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
