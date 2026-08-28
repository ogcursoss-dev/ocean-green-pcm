import { db } from '../src/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// Disciplinas para reforçar (com foco em balancear gabaritos A e D)
const extra: { subjectName: string; difficulty: 'EASY' | 'MEDIUM'; count: number }[] = [
  { subjectName: 'Manutenção Preventiva', difficulty: 'EASY', count: 1 },
  { subjectName: 'Manutenção Preditiva', difficulty: 'MEDIUM', count: 1 },
  { subjectName: 'TPM - Manutenção Produtiva Total', difficulty: 'EASY', count: 1 },
  { subjectName: 'FMEA', difficulty: 'MEDIUM', count: 1 },
  { subjectName: 'OEE', difficulty: 'MEDIUM', count: 1 },
  { subjectName: 'MTBF', difficulty: 'MEDIUM', count: 1 },
  { subjectName: 'Matriz de Criticidade', difficulty: 'MEDIUM', count: 1 },
  { subjectName: 'Diagrama de Ishikawa', difficulty: 'MEDIUM', count: 1 },
  { subjectName: 'ISO 55000', difficulty: 'MEDIUM', count: 1 },
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
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)
  try {
    const arr = JSON.parse(cleaned)
    if (!Array.isArray(arr)) return []
    return arr.filter((q: any) =>
      q.statement && q.optionA && q.optionB && q.optionC && q.optionD &&
      ['A', 'B', 'C', 'D'].includes(String(q.correctAnswer).toUpperCase()) && q.explanation
    )
  } catch { return [] }
}

async function main() {
  console.log('🔧 Reforço: gerando 9 questões extras para chegar a 300...')
  const zai = await ZAI.create()
  const subjects = await db.subject.findMany()
  const subjectMap = new Map(subjects.map(s => [s.name, s.id]))

  let inserted = 0
  // Força gabarito A ou D para balancear
  const forceLetters = ['A', 'D', 'A', 'D', 'A', 'D', 'A', 'D', 'A']

  for (let i = 0; i < extra.length; i++) {
    const item = extra[i]
    const subjectId = subjectMap.get(item.subjectName)
    if (!subjectId) continue

    const diffLabel = item.difficulty === 'EASY' ? 'FÁCIL' : 'MÉDIA'
    const prompt = `Gere exatamente ${item.count} questão(ões) de múltipla escolha sobre: "${item.subjectName}".
Dificuldade: ${diffLabel}.
A resposta correta DEVE ser a alternativa "${forceLetters[i]}".
Retorne APENAS JSON: [{"statement":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"${forceLetters[i]}","explanation":"..."}]`

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Gerador de questões técnicas PCM. Responde apenas JSON.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content || ''
      const parsed = extractJson(content)
      for (const q of parsed.slice(0, item.count)) {
        const exists = await db.question.findFirst({ where: { statement: q.statement }, select: { id: true } })
        if (exists) continue
        await db.question.create({
          data: {
            subjectId,
            difficulty: item.difficulty,
            statement: q.statement,
            optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
            correctAnswer: q.correctAnswer.toUpperCase(),
            explanation: q.explanation,
            active: true,
          },
        })
        inserted++
        console.log(`  ✅ ${item.subjectName} [${item.difficulty}] -> ${q.correctAnswer.toUpperCase()}: ${q.statement.substring(0, 60)}...`)
      }
    } catch (e: any) {
      console.error(`  ❌ ${item.subjectName}: ${e.message}`)
    }
  }

  const total = await db.question.count()
  const byAns = await db.question.groupBy({ by: ['correctAnswer'], _count: true })
  console.log(`\n✅ ${inserted} extras inseridas. Total no banco: ${total}`)
  console.log('Gabaritos:', byAns.map(a => a.correctAnswer + ':' + a._count).join(' '))
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
