import ZAI from 'z-ai-web-dev-sdk'
import { writeFileSync } from 'fs'

// Distribuição: tópico -> número de questões (total ~300)
const distribution: { subjectName: string; easy: number; medium: number }[] = [
  { subjectName: 'Introdução ao PCM', easy: 5, medium: 4 },
  { subjectName: 'Planejamento da Manutenção (PCM)', easy: 5, medium: 5 },
  { subjectName: 'Manutenção Preventiva', easy: 5, medium: 5 },
  { subjectName: 'Manutenção Preditiva', easy: 4, medium: 4 },
  { subjectName: 'Manutenção Corretiva', easy: 4, medium: 4 },
  { subjectName: 'Manutenção Autônoma', easy: 4, medium: 3 },
  { subjectName: 'TPM - Manutenção Produtiva Total', easy: 5, medium: 5 },
  { subjectName: 'Falha, Defeito e Pane', easy: 4, medium: 3 },
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

function extractJson(text: string): any[] {
  // Remove markdown fences se existirem
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  // Tenta encontrar o array JSON
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1)
  }
  try {
    return JSON.parse(cleaned)
  } catch {
    return []
  }
}

async function generateBatch(zai: any, subjectName: string, difficulty: 'EASY' | 'MEDIUM', count: number): Promise<GenQuestion[]> {
  const diffLabel = difficulty === 'EASY' ? 'FÁCIL (conceitos básicos, definições diretas)' : 'MÉDIA (aplicações práticas, cenários, cálculos simples)'
  const prompt = `Você é um especialista em Planejamento e Controle da Manutenção (PCM) criando questões para uma prova de treinamento técnico.

Gere exatamente ${count} questões de múltipla escolha sobre o tópico: "${subjectName}".
Dificuldade: ${diffLabel}.

REGRAS OBRIGATÓRIAS:
- Cada questão deve ter 4 alternativas: A, B, C, D
- O enunciado deve ser claro, técnico e correto
- Diversifique o gabarito (correctAnswer) entre A, B, C, D — NÃO repita a mesma letra em sequência
- As alternativas erradas devem ser plausíveis (distratores razoáveis)
- A explicação deve justificar a resposta correta
- Questões em PORTUGUÊS
- NÃO gere questões duplicadas

Retorne APENAS um array JSON válido, sem texto adicional, no formato:
[
  {
    "statement": "Enunciado completo da questão",
    "optionA": "Texto da alternativa A",
    "optionB": "Texto da alternativa B",
    "optionC": "Texto da alternativa C",
    "optionD": "Texto da alternativa D",
    "correctAnswer": "A",
    "explanation": "Explicação detalhada do porquê desta ser a resposta correta"
  }
]

Gere as ${count} questões agora:`

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'Você é um engenheiro de manutenção sênior e professor técnico. Gera apenas JSON válido.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices[0]?.message?.content || ''
    const parsed = extractJson(content)
    return parsed.filter((q: any) => q.statement && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswer)
  } catch (e: any) {
    console.error(`Erro ao gerar batch ${subjectName} ${difficulty}:`, e.message)
    return []
  }
}

async function main() {
  console.log('🚀 Gerando 300 questões PCM com LLM...')
  const zai = await ZAI.create()
  const allQuestions: any[] = []

  for (const item of distribution) {
    console.log(`\n📚 ${item.subjectName}: ${item.easy} fácil + ${item.medium} média`)
    // Gera fáceis
    if (item.easy > 0) {
      const easy = await generateBatch(zai, item.subjectName, 'EASY', item.easy)
      for (const q of easy) {
        allQuestions.push({ ...q, subjectName: item.subjectName, difficulty: 'EASY' })
      }
      console.log(`  ✅ ${easy.length} fáceis geradas`)
    }
    // Gera médias
    if (item.medium > 0) {
      const medium = await generateBatch(zai, item.subjectName, 'MEDIUM', item.medium)
      for (const q of medium) {
        allQuestions.push({ ...q, subjectName: item.subjectName, difficulty: 'MEDIUM' })
      }
      console.log(`  ✅ ${medium.length} médias geradas`)
    }
  }

  console.log(`\n📊 Total gerado: ${allQuestions.length} questões`)

  // Estatísticas de gabarito
  const answerDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (const q of allQuestions) {
    const a = (q.correctAnswer || '').toUpperCase()
    if (answerDist[a] !== undefined) answerDist[a]++
  }
  console.log('Distribuição de gabaritos:', answerDist)

  // Escreve o arquivo de seed
  const seedContent = `import { db } from '../src/lib/db'

// 300 questões de PCM geradas automaticamente
const questions = ${JSON.stringify(allQuestions, null, 2)}

async function main() {
  console.log('🌱 Iniciando seed de questões...')
  let count = 0
  for (const q of questions) {
    const subject = await db.subject.findFirst({ where: { name: q.subjectName } })
    if (!subject) {
      console.warn('Disciplina não encontrada:', q.subjectName)
      continue
    }
    const existing = await db.question.findFirst({ where: { statement: q.statement } })
    if (existing) continue
    await db.question.create({
      data: {
        subjectId: subject.id,
        difficulty: q.difficulty,
        statement: q.statement,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer.toUpperCase(),
        explanation: q.explanation,
        active: true,
      },
    })
    count++
    if (count % 50 === 0) console.log('  ' + count + ' questões inseridas...')
  }
  console.log('✅ ' + count + ' questões inseridas!')
}

main().catch(console.error).finally(() => db.$disconnect())
`

  writeFileSync('/home/z/my-project/scripts/seed-questions.ts', seedContent)
  console.log(`\n💾 Arquivo salvo: scripts/seed-questions.ts (${allQuestions.length} questões)`)
}

main().catch((e) => {
  console.error('Erro fatal:', e)
  process.exit(1)
})
