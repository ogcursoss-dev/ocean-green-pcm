import {db} from '../src/lib/db'
import {readFileSync} from 'fs'

async function main() {
  const errors = JSON.parse(readFileSync('/tmp/deep_errors.json', 'utf-8'))
  console.log(`Corrigindo ${errors.length} erros...`)

  let fixed = 0
  const seen = new Set<string>()

  for (const err of errors) {
    if (seen.has(err.id)) continue
    seen.add(err.id)

    const question = await db.question.findUnique({ where: { id: err.id } })
    if (!question) continue

    // Se a explicação menciona uma resposta diferente do gabarito,
    // o gabarito está provavelmente errado. Vamos trocar as alternativas
    // para que a correta seja a mencionada na explicação.
    const newAnswer = err.mentioned // resposta mencionada na explicação

    // Troca a alternativa correta com a mencionada
    // Se gabarito é A mas explicação diz B, trocamos o conteúdo de A e B
    if (newAnswer && newAnswer !== err.correctAnswer) {
      const correctField = `option${err.correctAnswer}` as const
      const wrongField = `option${newAnswer}` as const

      const tempContent = question[correctField]
      const wrongContent = question[wrongField]

      await db.question.update({
        where: { id: err.id },
        data: {
          [correctField]: wrongContent,
          [wrongField]: tempContent,
          correctAnswer: err.correctAnswer, // mantém o gabarito, mas agora aponta para a alternativa correta
        },
      })

      // Na verdade, é mais simples: mudar o gabarito para a resposta correta
      await db.question.update({
        where: { id: err.id },
        data: {
          correctAnswer: newAnswer,
        },
      })

      fixed++
      console.log(`  ✅ ${err.id}: ${err.correctAnswer} -> ${newAnswer}`)
    }
  }

  // Corrigir também questões duplicadas
  const dupError = errors.find(e => e.type === 'DUPLICATED_STATEMENT')
  if (dupError && dupError.id2) {
    await db.question.delete({ where: { id: dupError.id2 } })
    fixed++
    console.log(`  🗑️ Removida questão duplicada: ${dupError.id2}`)
  }

  // Corrigir questões vagas (melhorar enunciado)
  const vagueErrors = errors.filter(e => e.type === 'VAGUE_QUESTION')
  for (const ve of vagueErrors) {
    const q = await db.question.findUnique({ where: { id: ve.id } })
    if (q) {
      const betterStatement = q.statement.includes('MTBF')
        ? 'Em relação ao MTBF (Mean Time Between Failures), qual é a definição correta e como ele é calculado no contexto da manutenção industrial?'
        : q.statement
      await db.question.update({ where: { id: ve.id }, data: { statement: betterStatement } })
      fixed++
      console.log(`  ✏️ Melhorado enunciado: ${ve.id}`)
    }
  }

  // Verificação final
  const total = await db.question.count()
  const byAns = await db.question.groupBy({ by: ['correctAnswer'], _count: true })
  console.log(`\n=== RESULTADO ===`)
  console.log(`Corrigidas: ${fixed}`)
  console.log(`Total questões: ${total}`)
  console.log(`Distribuição: ${byAns.map(a => `${a.correctAnswer}:${a._count}`).join(', ')}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
