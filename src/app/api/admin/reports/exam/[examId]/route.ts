import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { examId } = await params;
  const url = new URL(req.url);
  const withAnswers = url.searchParams.get("withAnswers") === "true";

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      class: { select: { name: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: { subject: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!exam) {
    return NextResponse.json(
      { error: "Prova não encontrada." },
      { status: 404 }
    );
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ===== Cabeçalho =====
  doc.setFillColor(10, 92, 54); // #0A5C36
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ocean Green Treinamentos", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Avaliação PCM — Planejamento e Controle da Manutenção", margin, 17);
  doc.setFontSize(8);
  doc.text(
    withAnswers ? "Versão com gabarito comentado" : "Versão sem gabarito",
    pageWidth - margin,
    11,
    { align: "right" }
  );

  // ===== Info da prova =====
  doc.setTextColor(20, 30, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(exam.title, margin, 33);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 39;
  if (exam.description) {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(exam.description, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 2;
  }
  doc.setFontSize(10);
  doc.text(`Turma: ${exam.class?.name || "—"}`, margin, y);
  y += 5;
  doc.text(
    `Data de aplicação: ${exam.startDateTime.toLocaleString("pt-BR")} até ${exam.endDateTime.toLocaleString("pt-BR")}`,
    margin,
    y
  );
  y += 5;
  doc.text(
    `Duração: ${exam.durationMinutes} min | Total de questões: ${exam.questions.length}`,
    margin,
    y
  );
  y += 5;
  if (withAnswers) {
    doc.text(
      `Nota mínima para aprovação: ${exam.passingScore}%`,
      margin,
      y
    );
    y += 5;
  }
  // Linha divisória
  doc.setDrawColor(46, 139, 87);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== Questões =====
  const questions = exam.questions.map((eq) => eq.question);
  const options = ["A", "B", "C", "D"];
  const optionLabels = ["optionA", "optionB", "optionC", "optionD"] as const;

  questions.forEach((q, idx) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Enunciado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 92, 54);
    doc.text(`Questão ${idx + 1}`, margin, y);
    if (q.subject) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`[${q.subject.name}]`, pageWidth - margin, y, {
        align: "right",
      });
    }
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 25);
    const statement = doc.splitTextToSize(
      q.statement,
      pageWidth - margin * 2
    );
    doc.text(statement, margin, y);
    y += statement.length * 4.5 + 2;

    // Alternativas
    for (let i = 0; i < 4; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const letter = options[i];
      const text = q[optionLabels[i]];
      const isCorrect = withAnswers && q.correctAnswer === letter;

      if (isCorrect) {
        doc.setFillColor(46, 139, 87);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.roundedRect(margin, y - 4, 6, 6, 1, 1, "F");
        doc.text(letter, margin + 1.5, y, { baseline: "alphabetic" });
      } else {
        doc.setDrawColor(180, 200, 190);
        doc.setTextColor(20, 30, 25);
        doc.setFont("helvetica", "normal");
        doc.roundedRect(margin, y - 4, 6, 6, 1, 1, "D");
        doc.text(letter, margin + 1.5, y);
      }
      const optLines = doc.splitTextToSize(
        text,
        pageWidth - margin * 2 - 10
      );
      doc.text(optLines, margin + 10, y);
      y += Math.max(6, optLines.length * 4.5);
    }

    if (withAnswers) {
      y += 2;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(244, 247, 246);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 4 + Math.max(1, doc.splitTextToSize(q.explanation || "Sem explicação.", pageWidth - margin * 2 - 4).length * 4.5), "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(10, 92, 54);
      doc.text(`Gabarito: ${q.correctAnswer}`, margin + 2, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(40, 60, 50);
      const expl = doc.splitTextToSize(
        q.explanation || "Sem explicação cadastrada.",
        pageWidth - margin * 2 - 4
      );
      doc.text(expl, margin + 2, y);
      y += expl.length * 4.5 + 6;
    } else {
      // Espaço para resposta (versão sem gabarito)
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Resposta: ( ___ )", margin, y);
      y += 8;
    }

    y += 4;
    doc.setDrawColor(220, 230, 225);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  // ===== Rodapé numerado =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Ocean Green Treinamentos — ${exam.title} — Página ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  const pdfBytes = doc.output("arraybuffer");
  const filename = `prova-${exam.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${withAnswers ? "gabarito" : "aluno"}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
