import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { question: { include: { subject: true } } },
      },
      class: true,
    },
  })
  if (!exam) return NextResponse.json({ error: 'Prova não encontrada' }, { status: 404 })

  // Verifica acesso: turma do aluno OU atribuição individual
  const membership = await db.classMember.findFirst({
    where: { userId: user.userId, classId: exam.classId },
  })
  const individualAssignment = await db.examAssignment.findFirst({
    where: { examId: exam.id, userId: user.userId },
  })

  if (!membership && !individualAssignment) {
    return NextResponse.json({ error: 'Você não tem acesso a esta prova' }, { status: 403 })
  }

  // Determina janela temporal (override individual se existir)
  const start = individualAssignment?.customStart || exam.startDateTime
  const end = individualAssignment?.customEnd || exam.endDateTime
  const duration = individualAssignment?.customDuration || exam.durationMinutes
  const now = new Date()

  if (now < start) {
    return NextResponse.json({
      error: 'Esta prova ainda não está disponível',
      status: 'SCHEDULED',
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    }, { status: 403 })
  }
  if (now > end) {
    return NextResponse.json({
      error: 'O período desta prova foi encerrado',
      status: 'CLOSED',
    }, { status: 403 })
  }

  // Verifica se já submeteu
  const attempt = await db.examAttempt.findUnique({
    where: { examId_userId: { examId: exam.id, userId: user.userId } },
  })
  if (attempt && (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED')) {
    return NextResponse.json({
      error: 'Você já realizou esta prova',
      status: 'COMPLETED',
      score: attempt.score,
    }, { status: 403 })
  }

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      className: exam.class?.name || '',
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      durationMinutes: duration,
      questionCount: exam.questions.length,
    },
    questions: exam.questions.map(eq => ({
      id: eq.question.id,
      order: eq.order,
      statement: eq.question.statement,
      optionA: eq.question.optionA,
      optionB: eq.question.optionB,
      optionC: eq.question.optionC,
      optionD: eq.question.optionD,
      subjectName: eq.question.subject.name,
    })),
    existingAnswers: attempt ? JSON.parse(attempt.answers) : [],
    startedAt: attempt?.startedAt || null,
  })
}
