import { db } from '../src/lib/db'

async function main() {
  const current = await db.question.groupBy({ by: ['correctAnswer'], _count: true })
  const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (const c of current) dist[c.correctAnswer] = c._count
  console.log('Inicial:', JSON.stringify(dist))

  const target = { A: 75, B: 75, C: 75, D: 75 }

  // A->B
  const aToB = Math.min(Math.max(0, dist.A - target.A), Math.max(0, target.B - dist.B))
  if (aToB > 0) {
    const qs = await db.question.findMany({ where: { correctAnswer: 'A' }, select: { id: true, optionA: true, optionB: true }, take: aToB })
    for (const q of qs) {
      await db.question.update({ where: { id: q.id }, data: { optionA: q.optionB, optionB: q.optionA, correctAnswer: 'B' } })
    }
    dist.A -= aToB; dist.B += aToB
    console.log(`A->B: ${aToB} trocas`)
  }

  // A->C
  const aToC = Math.min(Math.max(0, dist.A - target.A), Math.max(0, target.C - dist.C))
  if (aToC > 0) {
    const qs = await db.question.findMany({ where: { correctAnswer: 'A' }, select: { id: true, optionA: true, optionC: true }, take: aToC })
    for (const q of qs) {
      await db.question.update({ where: { id: q.id }, data: { optionA: q.optionC, optionC: q.optionA, correctAnswer: 'C' } })
    }
    dist.A -= aToC; dist.C += aToC
    console.log(`A->C: ${aToC} trocas`)
  }

  // D->B (se D > target e B < target)
  const dToB = Math.min(Math.max(0, dist.D - target.D), Math.max(0, target.B - dist.B))
  if (dToB > 0) {
    const qs = await db.question.findMany({ where: { correctAnswer: 'D' }, select: { id: true, optionD: true, optionB: true }, take: dToB })
    for (const q of qs) {
      await db.question.update({ where: { id: q.id }, data: { optionD: q.optionB, optionB: q.optionD, correctAnswer: 'B' } })
    }
    dist.D -= dToB; dist.B += dToB
    console.log(`D->B: ${dToB} trocas`)
  }

  // D->C
  const dToC = Math.min(Math.max(0, dist.D - target.D), Math.max(0, target.C - dist.C))
  if (dToC > 0) {
    const qs = await db.question.findMany({ where: { correctAnswer: 'D' }, select: { id: true, optionD: true, optionC: true }, take: dToC })
    for (const q of qs) {
      await db.question.update({ where: { id: q.id }, data: { optionD: q.optionC, optionC: q.optionD, correctAnswer: 'C' } })
    }
    dist.D -= dToC; dist.C += dToC
    console.log(`D->C: ${dToC} trocas`)
  }

  const final = await db.question.groupBy({ by: ['correctAnswer'], _count: true })
  console.log('Final:', final.map(f => f.correctAnswer + ':' + f._count).join(' '))
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
