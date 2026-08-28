import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Relatório 2: Completo
// - Primeira página: resumo com notas e situação de todos os alunos
// - Em seguida: todas as provas que cada aluno fez, mostrando acertos e erros questão por questão
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  if (!classId) {
    return NextResponse.json({ error: "classId é obrigatório." }, { status: 400 });
  }

  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
  }

  const exams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL", isRecovery: false },
    orderBy: { startDateTime: "asc" },
    select: { id: true, title: true, passingScore: true, questionCount: true },
  });

  const allExams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL" },
    orderBy: { startDateTime: "asc" },
  });

  const members = await db.classMember.findMany({
    where: { classId },
    include: { user: { select: { id: true, name: true, cpf: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const userIds = members.map((m) => m.userId);

  // Busca todas as tentativas (provas + recuperações) com questões
  const attempts = await db.examAttempt.findMany({
    where: { examId: { in: allExams.map((e) => e.id) }, userId: { in: userIds } },
    include: {
      exam: { select: { id: true, title: true, passingScore: true, isRecovery: true, parentExamId: true } },
      user: { select: { name: true, cpf: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  // ===== PDF =====
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ===== CAPA: Resumo =====
  doc.setFillColor(10, 92, 54);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ocean Green Treinamentos", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Completo de Avaliações", margin, 18);
  doc.setFontSize(8);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 11, { align: "right" });
  doc.text("PCM — Planejamento e Controle da Manutenção", pageWidth - margin, 18, { align: "right" });

  let y = 34;
  doc.setTextColor(20, 30, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Turma: ${cls.name}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total de alunos: ${members.length} | Provas aplicadas: ${exams.length}`, margin, y);
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Este relatório apresenta o resumo de notas na primeira página, seguido das provas", margin, y);
  y += 4;
  doc.text("completas de cada aluno com acertos e erros questão por questão.", margin, y);
  y += 8;

  // Tabela resumo
  const head = [["#", "Aluno", "CPF", ...exams.map((e) => e.title.substring(0, 18)), "Nota Final", "Situação"]];
  const body: string[][] = [];
  for (const m of members) {
    const studentAttempts = attempts.filter((a) => a.userId === m.user.id);
    const examScores: Record<string, number | null> = {};
    for (const ex of exams) {
      const att = studentAttempts.find((a) => a.examId === ex.id);
      examScores[ex.id] = att?.score ?? null;
    }
    let finalScore: number | null = null;
    for (const ex of exams) {
      const original = examScores[ex.id];
      const recovs = studentAttempts.filter((a) => a.exam.isRecovery && a.exam.parentExamId === ex.id);
      const recovScore = recovs.length ? Math.max(...recovs.map((a) => a.score ?? 0)) : null;
      const best = [original, recovScore].filter((s) => s !== null).map((s) => s as number);
      if (best.length) finalScore = Math.max(...best);
    }
    const passingScore = exams[0]?.passingScore ?? 60;
    const situation = finalScore === null ? "Pendente" : finalScore >= passingScore ? "Aprovado" : "Reprovado";
    const examCols = exams.map((e) => {
      const s = examScores[e.id];
      return s === null ? "—" : s.toFixed(1) + "%";
    });
    const idx = members.indexOf(m) + 1;
    body.push([
      String(idx),
      m.user.name,
      m.user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
      ...examCols,
      finalScore === null ? "—" : finalScore.toFixed(1) + "%",
      situation,
    ]);
  }

  autoTable(doc, {
    head,
    body,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [10, 92, 54], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 246] },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 28 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === head[0].length - 1) {
        const txt = String(data.cell.raw);
        if (txt === "Aprovado") { data.cell.styles.textColor = [16, 122, 87]; data.cell.styles.fontStyle = "bold"; }
        else if (txt === "Reprovado") { data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = "bold"; }
        else data.cell.styles.textColor = [150, 150, 150];
      }
    },
  });

  // ===== PÁGINAS DETALHADAS: prova por prova de cada aluno =====
  const options = ["A", "B", "C", "D"];
  const optionFields = ["optionA", "optionB", "optionC", "optionD"] as const;

  for (const m of members) {
    const studentAttempts = attempts.filter((a) => a.userId === m.user.id);
    if (studentAttempts.length === 0) continue;

    for (const att of studentAttempts) {
      doc.addPage();
      // Cabeçalho com nome e CPF do aluno
      doc.setFillColor(10, 92, 54);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(att.exam.title, margin, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Aluno: ${att.user.name}`, margin, 19);
      doc.text(`CPF: ${att.user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}`, margin, 24);
      // Resultado à direita
      const score = att.score ?? 0;
      const passed = score >= (att.exam.passingScore ?? 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(score.toFixed(1) + "%", pageWidth - margin, 14, { align: "right" });
      doc.setFontSize(9);
      doc.text(`${att.correctCount}/${att.totalCount} acertos`, pageWidth - margin, 20, { align: "right" });
      doc.text(passed ? "APROVADO" : "REPROVADO", pageWidth - margin, 25, { align: "right" });

      let yy = 34;
      doc.setTextColor(20, 30, 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const submitted = att.submittedAt ? att.submittedAt.toLocaleString("pt-BR") : "—";
      const timeStr = att.timeSpentSeconds ? `${Math.floor(att.timeSpentSeconds / 60)}min ${att.timeSpentSeconds % 60}s` : "—";
      doc.text(`Submetida em: ${submitted} | Tempo: ${timeStr} | Tipo: ${att.exam.isRecovery ? "Recuperação" : "Prova Oficial"}`, margin, yy);
      yy += 4;
      doc.text(`Nota mínima para aprovação: ${att.exam.passingScore}%`, margin, yy);
      yy += 6;

      // Questões sorteadas para este aluno
      const qIds: string[] = att.questionIds ? JSON.parse(att.questionIds) : [];
      const answersList: Array<{ questionId: string; selected?: string }> = JSON.parse(att.answers || "[]");
      const ansMap: Record<string, string | undefined> = {};
      for (const a of answersList) ansMap[a.questionId] = a.selected;

      let questions: Array<{ id: string; statement: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; explanation: string; subject?: { name: string } }> = [];
      if (qIds.length > 0) {
        questions = await db.question.findMany({
          where: { id: { in: qIds } },
          include: { subject: { select: { name: true } } },
        });
        questions = qIds.map(qid => questions.find(q => q.id === qid)).filter(Boolean) as typeof questions;
      }

      // Renderiza cada questão com correção
      questions.forEach((q, idx) => {
        if (yy > 240) { doc.addPage(); yy = 20; }
        const selected = ansMap[q.id];
        const isCorrect = selected === q.correctAnswer;

        // Número da questão + status
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(10, 92, 54);
        doc.text(`Questão ${idx + 1}`, margin, yy);
        // Badge de acerto/erro
        if (isCorrect) {
          doc.setFillColor(16, 122, 87);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(margin + 22, yy - 4, 16, 5, 1, 1, "F");
          doc.setFontSize(7);
          doc.text("CERTO", margin + 30, yy, { align: "center" });
        } else {
          doc.setFillColor(185, 28, 28);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(margin + 22, yy - 4, 16, 5, 1, 1, "F");
          doc.setFontSize(7);
          doc.text("ERRADO", margin + 30, yy, { align: "center" });
        }
        if (q.subject) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(`[${q.subject.name}]`, pageWidth - margin, yy, { align: "right" });
        }
        yy += 5;

        // Enunciado
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(20, 30, 25);
        const stmt = doc.splitTextToSize(q.statement, pageWidth - margin * 2);
        doc.text(stmt, margin, yy);
        yy += stmt.length * 4.2 + 1;

        // Alternativas
        for (let i = 0; i < 4; i++) {
          if (yy > 275) { doc.addPage(); yy = 20; }
          const letter = options[i];
          const text = q[optionFields[i]];
          const isThisCorrect = q.correctAnswer === letter;
          const isSelected = selected === letter;

          if (isThisCorrect) {
            // Resposta correta: fundo verde
            doc.setFillColor(16, 122, 87);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.roundedRect(margin, yy - 4, 6, 6, 1, 1, "F");
            doc.text(letter, margin + 1.5, yy);
          } else if (isSelected) {
            // Resposta errada selecionada pelo aluno: fundo vermelho
            doc.setFillColor(185, 28, 28);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.roundedRect(margin, yy - 4, 6, 6, 1, 1, "F");
            doc.text(letter, margin + 1.5, yy);
          } else {
            doc.setDrawColor(180, 200, 190);
            doc.setTextColor(20, 30, 25);
            doc.setFont("helvetica", "normal");
            doc.roundedRect(margin, yy - 4, 6, 6, 1, 1, "D");
            doc.text(letter, margin + 1.5, yy);
          }
          const optLines = doc.splitTextToSize(text, pageWidth - margin * 2 - 10);
          doc.text(optLines, margin + 10, yy);
          yy += Math.max(5, optLines.length * 4.2);
        }

        // Resposta do aluno + gabarito
        yy += 2;
        if (yy > 275) { doc.addPage(); yy = 20; }
        doc.setFontSize(8);
        doc.setTextColor(60, 80, 70);
        doc.text(`Sua resposta: ${selected || "—"} | Gabarito: ${q.correctAnswer}`, margin, yy);
        yy += 4;
        // Explicação
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(40, 60, 50);
        const expl = doc.splitTextToSize(q.explanation || "Sem explicação.", pageWidth - margin * 2);
        // Fundo claro para a explicação
        doc.setFillColor(244, 247, 246);
        doc.rect(margin, yy - 3.5, pageWidth - margin * 2, expl.length * 4 + 2, "F");
        doc.text(expl, margin + 1.5, yy);
        yy += expl.length * 4 + 6;

        doc.setDrawColor(220, 230, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, yy, pageWidth - margin, yy);
        yy += 5;
      });
    }
  }

  // Rodapé numerado em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Ocean Green Treinamentos — Relatório Completo ${cls.name} — Página ${i}/${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  const pdfBytes = doc.output("arraybuffer");
  const filename = `relatorio-completo-${cls.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
