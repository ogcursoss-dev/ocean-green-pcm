import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('🌱 Iniciando seed Ocean Green...')

  // Cria admin padrão se não existir
  const existingAdmin = await db.user.findUnique({ where: { cpf: '00000000191' } })
  if (!existingAdmin) {
    const hash = await hashPassword('OceanGreen@2024')
    await db.user.create({
      data: {
        cpf: '00000000191',
        name: 'Administrador Ocean Green',
        email: 'admin@oceangreen.com.br',
        passwordHash: hash,
        role: 'ADMIN',
        active: true,
      },
    })
    console.log('✅ Admin criado | CPF: 000.000.001-91 | Senha: OceanGreen@2024')
  } else {
    console.log('ℹ️  Admin já existe')
  }

  // Cria turma padrão
  const defaultClass = await db.class.findFirst({ where: { name: 'Turma PC 2026' } })
  if (!defaultClass) {
    await db.class.create({
      data: { name: 'Turma PC 2026', description: 'Turma de Planejamento e Controle 2026', active: true },
    })
    console.log('✅ Turma PC 2026 criada')
  }

  // Cria disciplinas PCM
  const subjects = [
    { name: 'Introdução ao PCM', category: 'PCM Básico' },
    { name: 'Planejamento da Manutenção (PCM)', category: 'PCM Básico' },
    { name: 'Manutenção Preventiva', category: 'Tipos de Manutenção' },
    { name: 'Manutenção Preditiva', category: 'Tipos de Manutenção' },
    { name: 'Manutenção Corretiva', category: 'Tipos de Manutenção' },
    { name: 'Manutenção Autônoma', category: 'Tipos de Manutenção' },
    { name: 'TPM - Manutenção Produtiva Total', category: 'TPM' },
    { name: 'Falha, Defeito e Pane', category: 'Confiabilidade' },
    { name: 'NBR 5462', category: 'Normas' },
    { name: 'Curva da Banheira', category: 'Confiabilidade' },
    { name: 'OEE', category: 'Indicadores' },
    { name: 'Matriz de Criticidade', category: 'Gestão' },
    { name: 'Princípio de Pareto', category: 'Ferramentas da Qualidade' },
    { name: '5W2H', category: 'Ferramentas da Qualidade' },
    { name: 'Diagrama de Ishikawa', category: 'Ferramentas da Qualidade' },
    { name: 'PERT & CPM', category: 'Planejamento' },
    { name: 'CPM - Caminho Crítico', category: 'Planejamento' },
    { name: 'FTA - Árvore de Falhas', category: 'Confiabilidade' },
    { name: 'Kaizen - Melhoria Contínua', category: 'Lean' },
    { name: 'MTTR', category: 'Indicadores' },
    { name: 'MTBF', category: 'Indicadores' },
    { name: 'FMEA', category: 'Confiabilidade' },
    { name: 'RCM', category: 'Confiabilidade' },
    { name: 'RCA', category: 'Confiabilidade' },
    { name: 'ISO 55000', category: 'Normas' },
    { name: 'ISO 55001', category: 'Normas' },
    { name: 'Curva ABC', category: 'Gestão' },
    { name: 'Gestão de Custos na Manutenção', category: 'Gestão' },
    { name: 'SMED - Setup Rápido', category: 'Lean' },
    { name: 'Takt Time', category: 'Lean' },
    { name: 'Lean Manufacturing', category: 'Lean' },
    { name: 'DMAIC', category: 'Lean' },
    { name: 'Projetos Industriais', category: 'Gestão' },
  ]

  for (const s of subjects) {
    const exists = await db.subject.findFirst({ where: { name: s.name } })
    if (!exists) {
      await db.subject.create({ data: s })
      console.log(`  📘 Disciplina: ${s.name}`)
    }
  }

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
