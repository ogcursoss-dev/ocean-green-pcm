"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Trash2,
  Users,
  Calendar,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, formatDateTime } from "@/lib/api";
import { toast } from "sonner";

interface ExamDetail {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  passingScore: number;
  active: boolean;
  showResults: string;
  questionCount: number;
  isRecovery: boolean;
  class?: { id: string; name: string } | null;
  questions: any[];
  assignments: any[];
  _count?: { questions: number; assignments: number; attempts: number };
}

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ exam: ExamDetail }>(`/api/admin/exams/${id}`);
      if (!res.ok || !res.data?.exam) {
        toast.error(res.error || "Prova não encontrada.");
        router.replace("/app/admin/provas");
        return;
      }
      setExam(res.data.exam);
    } catch (e) {
      toast.error("Erro ao carregar prova.");
      router.replace("/app/admin/provas");
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [id]);

  async function handleDelete() {
    if (!exam) return;
    if (!confirm(`Excluir a prova "${exam.title}"? Esta ação não pode ser desfeita.`)) return;
    const res = await apiFetch(`/api/admin/exams/${exam.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Prova excluída.");
      router.replace("/app/admin/provas");
    } else {
      toast.error(res.error || "Erro ao excluir.");
    }
  }

  if (loading || !exam) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/app/admin/provas">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="size-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
          <FileText className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">{exam.title}</h1>
          {exam.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          title="Excluir prova"
        >
          <Trash2 className="size-5" />
        </Button>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Turma</p>
            <p className="text-sm font-semibold mt-0.5 truncate">{exam.class?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Início</p>
            <p className="text-sm font-semibold mt-0.5">{formatDateTime(exam.startDateTime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Encerramento</p>
            <p className="text-sm font-semibold mt-0.5">{formatDateTime(exam.endDateTime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Duração</p>
            <p className="text-sm font-semibold mt-0.5">{exam.durationMinutes} min</p>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={exam.type === "OFFICIAL" ? "default" : "secondary"}>
          {exam.type === "OFFICIAL" ? "Oficial" : "Simulado"}
        </Badge>
        <Badge variant="outline">Nota mín: {exam.passingScore}%</Badge>
        <Badge variant="outline">{exam.questionCount} questões por aluno</Badge>
        {exam.isRecovery && (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Recuperação
          </Badge>
        )}
        <Badge variant={exam.active ? "default" : "secondary"}>
          {exam.active ? "Ativa" : "Inativa"}
        </Badge>
      </div>

      {/* Resumo */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Atribuições ({exam.assignments?.length || 0})
            </CardTitle>
            <CardDescription>Quem pode fazer esta prova</CardDescription>
          </CardHeader>
          <CardContent>
            {(!exam.assignments || exam.assignments.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma atribuição. A prova foi atribuída automaticamente à turma.
              </p>
            ) : (
              <div className="space-y-2">
                {exam.assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border rounded p-2">
                    <span>
                      {a.userId ? (a.user?.name || "Aluno") : "Turma inteira"}
                    </span>
                    {a.customStart && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.customStart)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4" />
              Configuração
            </CardTitle>
            <CardDescription>Detalhes da prova</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questões sorteadas:</span>
              <span className="font-medium">{exam.questionCount} por aluno</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resultado:</span>
              <span className="font-medium">
                {exam.showResults === "IMMEDIATE" ? "Imediato" :
                 exam.showResults === "AFTER_END" ? "Após encerramento" : "Manual"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tentativas:</span>
              <span className="font-medium">{exam._count?.attempts || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
