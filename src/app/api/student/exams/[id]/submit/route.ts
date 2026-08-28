import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  const attempt = await db.examAttempt.findUnique({
    where: { examId_userId: { examId: id, userId: user.userId } },
    include: {
      exam: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { question: { select: { id: true, correctAnswer: true } } },
          },
        },
      },
    },
  });
  if (!attempt) {
    return NextResponse.json(
      { error: "Tentativa não encontrada. Inicie a prova primeiro." },
      { status: 404 }
    );
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Prova já finalizada.", status: attempt.status },
      { status: 400 }
    );
  }
  const answers: Array<{ questionId: string; selected?: string }> = JSON.parse(
    attempt.answers || "[]"
  );
  const answersMap: Record<string, string | undefined> = {};
  for (const a of answers) answersMap[a.questionId] = a.selected;
  let correct = 0;
  for (const eq of attempt.exam.questions) {
    if (answersMap[eq.question.id] === eq.question.correctAnswer) correct++;
  }
  const total = attempt.exam.questions.length;
  const score = total > 0 ? (correct / total) * 100 : 0;
  const now = new Date();
  const timeSpentSeconds = Math.floor(
    (now.getTime() - attempt.startedAt.getTime()) / 1000
  );
  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      score,
      correctCount: correct,
      totalCount: total,
      timeSpentSeconds,
    },
  });
  return NextResponse.json({
    ok: true,
    score,
    correctCount: correct,
    totalCount: total,
    timeSpentSeconds,
    passed: score >= (attempt.exam.passingScore ?? 0),
  });
}
