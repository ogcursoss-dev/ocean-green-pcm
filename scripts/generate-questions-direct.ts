import { db } from '../src/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// Distribuição alvo: 300 questões total (150 EASY + 150 MEDIUM)
const distribution: { subjectName: string; easy: number; medium: number }[] = [
  { subjectName: 'Introdução ao PCM', easy: 4, medium: 5 },
  { subjectName: 'Planejamento da Manutenção (PCM)', easy: 5, medium: 5 },
  { subjectName: 'Manutenção Preventiva', easy: 5, medium: 5 },
  { subjectName: 'Manutenção Preditiva', easy: 4, medium: 4 },
  { subjectName: 'Manutenção Corretiva', easy: 4, medium: 4 },
  { subjectName: 'Manutenção Autônoma', easy: 4, medium: 3 },
  { subjectName: 'TPM - Manutenção Produtiva Total', easy: 5, medium: 5 },
  { subjectName: 'Falha, Defeito e Pane', easy: 3, medium: 4 },
  { subjectName: 'NBR 5462', easy: 4, medium: 4 },
  { subjectName: 'Curva da Banheira', easy: 3, medium: 3 },
  { subjectName: 'OEE', easy: 4, medium: 4 },
  { subjectName: 'Matriz de Criticidade', easy: 3, medium: 4 },
  { subjectName: 'Princípio de Pareto', easy: 3, medium: 3 },
  { subjectName: '5W2H', easy: 3, medium: 3 },
  { subjectName: 'Diagrama de Ishikawa', easy: 3, medium: 3 },
  { subjectName: 'PERT & CPM', easy: 3, medium: 4 },
  { subjectName: 'CPM - Caminho Crítico', easy: 3, medium: 3 },
  { subjectName: 'FTA - Árvore de Falhas', easy: 3, medium: 3 },
  { subjectName: 'Kaizen - Melhoria Contínua', easy: 3, medium: 3 },
  { subjectName: 'MTTR', easy: 3, medium: 4 },
  { subjectName: 'MTBF', easy: 3, medium: 4 },
  { subjectName: 'FMEA', easy: 4, medium: 5 },
  { subjectName: 'RCM', easy: 3, medium: 4 },
  { subjectName: 'RCA', easy: 3, medium: 3 },
  { subjectName: 'ISO 55000', easy: 4, medium: 4 },
  { subjectName: 'ISO 55001', easy: 4, medium: 4 },
  { subjectName: 'Curva ABC', easy: 3, medium: 3 },
  { subjectName: 'Gestão de Custos na Manutenção', easy: 3, medium: 4 },
  { subjectName: 'SMED - Setup Rápido', easy: 3, medium: 3 },
  { subjectName: 'Takt Time', easy: 3, medium: 3 },
  { subjectName: 'Lean Manufacturing', easy: 3, medium: 3 },
  { subjectName: 'DMAIC', easy: 3, medium: 3 },
  { subjectName: 'Projetos Industriais', easy: 3, medium: 3 },
]

interface GenQuestion {
  statement: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation: string
}

function extractJson(text: string): GenQuestion[] {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1)
  }
  try {
    const arr = JSON.parse(cleaned)
    if (!Array.isArray(arr)) return []
    return arr.filter((q: any) =>
      q.statement && q.optionA && q.optionB && q.optionC && q.optionD &&
      ['A', 'B', 'C', 'D'].includes(String(q.correctAnswer).toUpperCase()) &&
      q.explanation
    )
  } catch {
    return []
  }
}

async function generateBatch(
  zai: any,
  subjectName: string,
  difficulty: 'EASY' | 'MEDIUM',
  count: number,
  forceLetter?: string
): Promise<GenQuestion[]> {
  const diffLabel = difficulty === 'EASY'
    ? 'FÁCIL (conceitos básicos, definições diretas, identificação)'
    : 'MÉDIA (aplicações práticas, cenários reais, interpretação, cálculos simples)'

  const letterHint = forceLetter
    ? ` Distribua os gabaritos variando entre A, B, C, D. A primeira questão deve ter gabarito "${forceLetter}".`
    : ' Diversifique os gabaritos entre A, B, C, D de forma equilibrada — evite repetir a mesma letra em questões consecutivas.'

  const prompt = `Você é um engenheiro de manutenção sênior e professor técnico criando questões para um curso de Planejamento e Controle da Manutenção (PCM).

Gere exatamente ${count} questões de múltipla escolha sobre: "${subjectName}".
Dificuldade: ${diffLabel}.${letterHint}

REGRAS:
- 4 alternativas (A, B, C, D) por questão
- Enunciado claro, técnico e CORRETO
- Distratores plausíveis (alternativas erradas devem ser críveis)
- Explicação justifica a resposta correta
- Em PORTUGUÊS
- Sem duplicação entre questões
- Não use enunciados genéricos óbvios. Seja específico e técnico.

Retorne APENAS um array JSON (sem markdown, sem texto extra):
[{"statement":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]`

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Você é um gerador de questões técnicas de manutenção. Responde apenas com JSON válido, sem texto adicional.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content || ''
      const parsed = extractJson(content)
      if (parsed.length >= count) return parsed.slice(0, count)
      if (parsed.length > 0 && attempt === 3) return parsed
    } catch (e: any) {
      await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  return []
}

async function main() {
  console.log('🚀 Gerando questões PCM (incremental) e salvando no Supabase...')
  const zai = await ZAI.create()

  const subjects = await db.subject.findMany()
  const subjectMap = new Map(subjects.map(s => [s.name, s.id]))
  console.log(`📚 ${subjects.length} disciplinas carregadas`)

  // Conta questões existentes por disciplina/dificuldade para pular as já completas
  const existing = await db.question.groupBy({
    by: ['subjectId', 'difficulty'],
    _count: true,
  })
  const existingMap = new Map<string, number>()
  for (const e of existing) {
    existingMap.set(`${e.subjectId}|${e.difficulty}`, e._count)
  }

  let totalInserted = 0
  let totalSkipped = 0
  const answerDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  const lettersCycle = ['A', 'B', 'C', 'D', 'B', 'A', 'D', 'C', 'C', 'D', 'A', 'B']
  let letterIdx = 0
  const batchesToRun: { subjectId: string; subjectName: string; difficulty: 'EASY' | 'MEDIUM'; count: number }[] = []

  for (const item of distribution) {
    const subjectId = subjectMap.get(item.subjectName)
    if (!subjectId) continue
    for (const [diffLabel, target] of [['EASY', item.easy], ['MEDIUM', item.medium]] as const) {
      const have = existingMap.get(`${subjectId}|${diffLabel}`) || 0
      const need = target - have
      if (need > 0) {
        batchesToRun.push({ subjectId, subjectName: item.subjectName, difficulty: diffLabel as 'EASY' | 'MEDIUM', count: need })
      } else {
        totalSkipped++
      }
    }
  }

  console.log(`📋 ${batchesToRun.length} batches pendentes, ${totalSkipped} já completos`)

  let batchCount = 0
  for (const batch of batchesToRun) {
    batchCount++
    console.log(`\n[${batchCount}/${batchesToRun.length}] 📚 ${batch.subjectName} [${batch.difficulty}] - ${batch.count} questões`)
    const forceLetter = lettersCycle[letterIdx % lettersCycle.length]
    letterIdx++
    const generated = await generateBatch(zai, batch.subjectName, batch.difficulty, batch.count, forceLetter)
    console.log(`  → ${generated.length} questões geradas pelo LLM`)

    for (const q of generated) {
      const answer = q.correctAnswer.toUpperCase()
      const exists = await db.question.findFirst({ where: { statement: q.statement }, select: { id: true } })
      if (exists) continue
      await db.question.create({
        data: {
          subjectId: batch.subjectId,
          difficulty: batch.difficulty,
          statement: q.statement,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: answer,
          explanation: q.explanation,
          active: true,
        },
      })
      answerDist[answer]++
      totalInserted++
    }
    console.log(`  ✅ Total parcial inserido: ${totalInserted} (A:${answerDist.A} B:${answerDist.B} C:${answerDist.C} D:${answerDist.D})`)
  }

  const finalTotal = await db.question.count()
  console.log('\n========================================')
  console.log(`✅ ${totalInserted} novas questões inseridas!`)
  console.log(`📊 Total no banco: ${finalTotal} questões`)
  console.log(`📊 Distribuição desta sessão: A:${answerDist.A} B:${answerDist.B} C:${answerDist.C} D:${answerDist.D}`)
  console.log('========================================')
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
