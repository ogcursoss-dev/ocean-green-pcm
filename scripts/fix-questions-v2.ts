import {db} from '../src/lib/db'
import {writeFileSync, readFileSync} from 'fs'

async function main() {
  const errors = JSON.parse(readFileSync('/tmp/deep_errors.json', 'utf-8'))
  const fixed = JSON.parse(readFileSync('/tmp/all_q_fixed.json', 'utf-8'))

  // Pegar IDs que ainda têm contradição
  const { execSync } = require('child_process')
  const result = execSync(`python3 -c "
import json, re
with open('/tmp/all_q_fixed.json') as f:
    questions = json.load(f)
errors = []
for q in questions:
    exp = q['explanation'].lower()
    patterns = [
        r'(?:alternativa|resposta|gabarito)[:\s]*(?:é\s*)?([abcd])',
        r'(?:correta|certa|certo)[:\s]*(?:é\s*)?(?:a\s+)?(?:alternativa\s+)?([abcd])',
    ]
    for pat in patterns:
        matches = re.findall(pat, exp)
        for m in matches:
            mentioned = m.upper()
            if mentioned != q['correctAnswer']:
                errors.append({'id': q['id'], 'correctAnswer': q['correctAnswer'], 'mentioned': mentioned, 'explanation': q['explanation'][:200]})
                break
print(json.dumps(errors))
"`, { encoding: 'utf-8' })

  const remainingErrors = JSON.parse(result)
  console.log(`Erros restantes: ${remainingErrors.length}`)

  // Para cada erro, verificar se a explicação realmente está dizendo que a letra mencionada é a correta
  // ou se está apenas mencionando a letra no contexto de explicar
  let realFixed = 0
  for (const err of remainingErrors) {
    const question = await db.question.findUnique({ where: { id: err.id } })
    if (!question) continue

    // Ler a explicação completa
    const exp = question.explanation.toLowerCase()
    const mentioned = err.mentioned.toLowerCase()

    // Verificar o contexto da menção
    // Procurar por "a resposta correta é X" ou "alternativa X é a correta"
    const patterns = [
      new RegExp(`(?:resposta|gabarito) (?:correta |)(?:é |)(?:a |)(?:alternativa |)${mentioned}`, 'i'),
      new RegExp(`alternativa ${mentioned} (?:é |)(?:a |)(?:correta|certa)`, 'i'),
      new RegExp(`(?:a |)(?:alternativa |)(?:correta|certa) (?:é |)(?:a |)(?:alternativa |)${mentioned}`, 'i'),
    ]

    let isReallyWrong = false
    for (const pat of patterns) {
      if (pat.test(exp)) {
        isReallyWrong = true
        break
      }
    }

    if (isReallyWrong) {
      // A explicação realmente diz que outra letra é a correta
      // Mudar o gabarito para a letra mencionada
      await db.question.update({
        where: { id: err.id },
        data: { correctAnswer: err.mentioned },
      })
      realFixed++
      console.log(`  ✅ ${err.id}: ${err.correctAnswer} -> ${err.mentioned}`)
    }
    // Se não, a menção é apenas contextual (explicando por que está errada)
  }

  // Remover duplicada
  const dupId = 'cmud0h2xx0001j22v0i1hzo5s'
  try {
    await db.question.delete({ where: { id: dupId } })
    console.log(`  🗑️ Removida duplicada: ${dupId}`)
    realFixed++
  } catch (e) {}

  // Verificação final
  const total = await db.question.count()
  const byAns = await db.question.groupBy({ by: ['correctAnswer'], _count: true })
  console.log(`\n=== RESULTADO FINAL ===`)
  console.log(`Corrigidas nesta rodada: ${realFixed}`)
  console.log(`Total questões: ${total}`)
  console.log(`Distribuição: ${byAns.map(a => `${a.correctAnswer}:${a._count}`).join(', ')}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
