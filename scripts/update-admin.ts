import { db } from '../src/lib/db'
import { hashPassword, cleanCpf } from '../src/lib/auth'

async function main() {
  console.log('🔧 Atualizando admin para Lucas Skopek...')

  const newCpf = cleanCpf('124.521.557-48')
  const newPassword = await hashPassword('OceanGreen@2024')

  // Remove o admin antigo (000.000.001-91) se existir
  const oldAdmin = await db.user.findUnique({ where: { cpf: '00000000191' } })
  if (oldAdmin) {
    // Transfere a role ADMIN para o novo e desativa o antigo
    if (oldAdmin.cpf !== newCpf) {
      await db.user.update({
        where: { id: oldAdmin.id },
        data: { role: 'STUDENT', active: false },
      })
      console.log(`  ℹ️  Admin antigo (000.000.001-91) desativado`)
    }
  }

  // Cria ou atualiza o admin Lucas Skopek
  const existing = await db.user.findUnique({ where: { cpf: newCpf } })
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        name: 'Lucas Skopek',
        role: 'ADMIN',
        active: true,
        passwordHash: newPassword,
        email: 'lucas.skopek@oceangreen.com.br',
      },
    })
    console.log(`  ✅ Admin atualizado: Lucas Skopek (CPF: 124.521.557-48)`)
  } else {
    await db.user.create({
      data: {
        cpf: newCpf,
        name: 'Lucas Skopek',
        email: 'lucas.skopek@oceangreen.com.br',
        passwordHash: newPassword,
        role: 'ADMIN',
        active: true,
      },
    })
    console.log(`  ✅ Admin criado: Lucas Skopek (CPF: 124.521.557-48)`)
  }

  // Verifica turma padrão
  const cls = await db.class.findFirst({ where: { name: 'Turma PC 2026' } })
  if (!cls) {
    await db.class.create({
      data: { name: 'Turma PC 2026', description: 'Turma de Planejamento e Controle 2026', active: true },
    })
    console.log('  ✅ Turma PC 2026 criada')
  } else {
    console.log('  ℹ️  Turma PC 2026 já existe')
  }

  console.log('\n========================================')
  console.log('  CREDENCIAIS DE ACESSO ADMIN')
  console.log('========================================')
  console.log('  Nome: Lucas Skopek')
  console.log('  CPF:  124.521.557-48')
  console.log('  Senha: OceanGreen@2024')
  console.log('========================================')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
