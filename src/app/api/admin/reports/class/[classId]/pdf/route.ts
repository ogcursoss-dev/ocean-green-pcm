import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Relatório 1: Boletim da turma com notas e situação (Aprovado/Reprovado)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { classId } = await params;
  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
  }

  // Provas oficiais (não recuperação) da turma
  const exams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL", isRecovery: false },
    orderBy: { startDateTime: "asc" },
    select: { id: true, title: true, passingScore: true },
  });

  // Todas as provas (incluindo recuperação)
  const allExams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL" },
    orderBy: { startDateTime: "asc" },
    select: { id: true, title: true, passingScore: true, isRecovery: true, parentExamId: true },
  });

  const members = await db.classMember.findMany({
    where: { classId },
    include: { user: { select: { id: true, name: true, cpf: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const userIds = members.map((m) => m.userId);

  const attempts = await db.examAttempt.findMany({
    where: { examId: { in: allExams.map((e) => e.id) }, userId: { in: userIds } },
    include: { exam: { select: { passingScore: true, isRecovery: true, parentExamId: true } } },
  });

  interface StudentRow {
    name: string;
    cpf: string;
    examScores: Record<string, number | null>;
    finalScore: number | null;
    situation: string;
  }

  const rows: StudentRow[] = members.map((m) => {
    const studentAttempts = attempts.filter((a) => a.userId === m.userId);
    const examScores: Record<string, number | null> = {};
    for (const ex of exams) {
      const att = studentAttempts.find((a) => a.examId === ex.id);
      examScores[ex.id] = att?.score ?? null;
    }
    let finalScore: number | null = null;
    for (const ex of exams) {
      const originalScore = examScores[ex.id];
      const recoveryAttempts = studentAttempts.filter(
        (a) => a.exam.isRecovery && a.exam.parentExamId === ex.id
      );
      const recoveryScore = recoveryAttempts.length
        ? Math.max(...recoveryAttempts.map((a) => a.score ?? 0))
        : null;
      const best = [originalScore, recoveryScore].filter((s) => s !== null).map((s) => s as number);
      const examFinal = best.length ? Math.max(...best) : null;
      if (examFinal !== null) {
        finalScore = examFinal;
      }
    }
    let situation = "Pendente";
    if (finalScore !== null) {
      const passingScore = exams[0]?.passingScore ?? 60;
      situation = finalScore >= passingScore ? "Aprovado" : "Reprovado";
    }
    return { name: m.user.name, cpf: m.user.cpf, examScores, finalScore, situation };
  });

  const scored = rows.filter((r) => r.finalScore !== null).map((r) => r.finalScore as number);
  const stats = {
    total: members.length,
    realizaram: scored.length,
    media: scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0,
    maior: scored.length ? Math.max(...scored) : 0,
    menor: scored.length ? Math.min(...scored) : 0,
    aprovados: rows.filter((r) => r.situation === "Aprovado").length,
    reprovados: rows.filter((r) => r.situation === "Reprovado").length,
    pendentes: rows.filter((r) => r.situation === "Pendente").length,
  };

  // ===== GERA PDF =====
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(10, 92, 54);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ocean Green Treinamentos", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Boletim da Turma — Relatório de Notas", margin, 18);
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
  if (cls.description) {
    doc.text(cls.description, margin, y);
    y += 5;
  }
  doc.text(`Total de alunos: ${stats.total} | Realizaram: ${stats.realizaram}`, margin, y);
  y += 8;

  const boxes = [
    { label: "Média da Turma", value: stats.media.toFixed(1) + "%" },
    { label: "Maior Nota", value: stats.maior.toFixed(1) + "%" },
    { label: "Menor Nota", value: stats.menor.toFixed(1) + "%" },
    { label: "Aprovados", value: String(stats.aprovados) },
    { label: "Reprovados", value: String(stats.reprovados) },
    { label: "Pendentes", value: String(stats.pendentes) },
  ];
  const boxW = (pageWidth - margin * 2 - 5 * 3) / 6;
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(244, 247, 246);
    doc.roundedRect(x, y, boxW, 16, 1.5, 1.5, "F");
    doc.setDrawColor(46, 139, 87);
    doc.setLineWidth(0.3);
    doc.line(x, y, x + boxW, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 100, 90);
    doc.text(b.label, x + boxW / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 92, 54);
    doc.text(b.value, x + boxW / 2, y + 12, { align: "center" });
  });
  y += 22;

  const head = [["#", "Aluno", "CPF", ...exams.map((e) => e.title.substring(0, 18)), "Nota Final", "Situação"]];
  const body = rows.map((r, idx) => {
    const examCols = exams.map((e) => {
      const s = r.examScores[e.id];
      return s === null ? "—" : s.toFixed(1) + "%";
    });
    const finalCol = r.finalScore === null ? "—" : r.finalScore.toFixed(1) + "%";
    return [String(idx + 1), r.name, r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"), ...examCols, finalCol, r.situation];
  });

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
        if (txt === "Aprovado") {
          data.cell.styles.textColor = [16, 122, 87];
          data.cell.styles.fontStyle = "bold";
        } else if (txt === "Reprovado") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [150, 150, 150];
        }
      }
      if (data.section === "body" && data.column.index === head[0].length - 2) {
        const txt = String(data.cell.raw);
        if (txt !== "—") {
          const val = parseFloat(txt);
          data.cell.styles.fontStyle = "bold";
          if (val >= 60) data.cell.styles.textColor = [16, 122, 87];
          else data.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Ocean Green Treinamentos — Boletim ${cls.name} — Página ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  const pdfBytes = doc.output("arraybuffer");
  const filename = `boletim-${cls.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
