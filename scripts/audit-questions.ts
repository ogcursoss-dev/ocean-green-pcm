import {db} from '../src/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import {writeFileSync} from 'fs'

async function main() {
  const zai = await ZAI.create()
  const questions = await db.question.findMany({ include: { subject: true }, orderBy: { id: 'asc' } })
  const wrongAnswers: any[] = []

  for (let i = 0; i < questions.length; i += 10) {
    const batch = questions.slice(i, i + 10)
    const batchData = batch.map(q => ({
      id: q.id,
      statement: q.statement,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      subject: q.subject.name,
    }))

    const prompt = `Você é um engenheiro de manutenção sênior. Analise cada questão abaixo e verifique se o gabarito (correctAnswer) está CORRETO tecnicamente. Retorne APENAS um JSON array com as questões que têm o gabarito ERRADO, no formato: [{"id":"...","correctAnswer":"X","suggestedAnswer":"Y","reason":"..."}]. Se todas estiverem corretas, retorne [].

${JSON.stringify(batchData, null, 2)}`

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Você é um verificador técnico de questões de PCM. Responde apenas JSON.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      let content = completion.choices[0]?.message?.content || ''
      if (content.startsWith('```')) content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
      const start = content.indexOf('[')
      const end = content.lastIndexOf(']')
      if (start >= 0 && end >= 0) content = content.slice(start, end + 1)
      const wrong = JSON.parse(content)
      if (wrong.length > 0) {
        wrongAnswers.push(...wrong)
        console.log(`Batch ${Math.floor(i/10)+1} - ERRADOS: ${wrong.length}`)
      } else {
        console.log(`Batch ${Math.floor(i/10)+1} - OK`)
      }
    } catch (e: any) {
      console.error(`Batch ${Math.floor(i/10)+1} erro:`, e?.message?.substring(0, 80))
    }
    await new Promise(r => setTimeout(r, 2000))
  }

  writeFileSync('/tmp/wrong_answers.json', JSON.stringify(wrongAnswers, null, 2))
  console.log(`\nTotal de gabaritos errados encontrados: ${wrongAnswers.length}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
