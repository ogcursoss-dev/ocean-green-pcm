import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getExamStatus, resolveWindow } from "@/lib/exam-window";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { assignments: true },
  });
  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }
  if (user.role === "STUDENT") {
    const individual = exam.assignments.find((a) => a.userId === user.userId);
    const turma = exam.assignments.find((a) => a.userId === null);
    const assignment = individual || turma;
    if (!assignment) {
      return NextResponse.json(
        { error: "Você não tem permissão para esta prova." },
        { status: 403 }
      );
    }
    const status = getExamStatus(exam, assignment);
    if (status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Prova fora da janela de aplicação.", status },
        { status: 403 }
      );
    }
    // Verifica tentativa existente
    const existing = await db.examAttempt.findUnique({
      where: { examId_userId: { examId: id, userId: user.userId } },
    });
    if (existing && existing.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "Prova já submetida.",
          attempt: {
            id: existing.id,
            status: existing.status,
            score: existing.score,
          },
        },
        { status: 400 }
      );
    }
    if (existing) {
      return NextResponse.json({ ok: true, attemptId: existing.id, resumed: true });
    }
    const attempt = await db.examAttempt.create({
      data: {
        examId: id,
        userId: user.userId,
        status: "IN_PROGRESS",
        answers: JSON.stringify([]),
      },
    });
    const window = resolveWindow(exam, assignment);
    return NextResponse.json({
      ok: true,
      attemptId: attempt.id,
      deadline: window.end.toISOString(),
      durationMinutes: window.durationMinutes,
    });
  }
  // Admin não inicia tentativa de prova — para fins de teste
  return NextResponse.json(
    { error: "Admins não iniciam tentativas." },
    { status: 400 }
  );
}
