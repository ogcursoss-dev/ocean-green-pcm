"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Pencil,
  ChevronRight,
  Calendar,
  Clock,
  ListChecks,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch, formatDateTime } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ExamList {
  id: string;
  title: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  passingScore: number;
  active: boolean;
  class?: { id: string; name: string };
  _count?: { questions: number; assignments: number; attempts: number };
}

interface ClassItem {
  id: string;
  name: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamList[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamList | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await apiFetch<{ exams: ExamList[] }>("/api/admin/exams");
    if (res.ok && res.data) setExams(res.data.exams || []);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
    apiFetch<{ classes: ClassItem[] }>("/api/admin/classes").then((r) => {
      if (r.ok && r.data) setClasses(r.data.classes || []);
    });
  }, []);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(e: ExamList) {
    setEditing(e);
    setDialogOpen(true);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Provas</h1>
            <p className="text-sm text-muted-foreground">
              Crie, agende e atribua provas oficiais a turmas e alunos.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="size-4 mr-1" />
          Nova Prova
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2" />
              Carregando provas...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="size-8 mx-auto mb-2 opacity-50" />
              Nenhuma prova cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prova</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Questões</TableHead>
                    <TableHead>Atribuições</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((e, idx) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                      className={e.active ? "" : "opacity-60"}
                    >
                      <TableCell>
                        <Link
                          href={`/app/admin/provas/${e.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {e.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {e.durationMinutes} min · Nota mín. {e.passingScore}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.class?.name || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            e.type === "OFFICIAL"
                              ? "bg-secondary/15 text-secondary border-secondary/30"
                              : "bg-accent/15 text-accent border-accent/30"
                          }
                        >
                          {e.type === "OFFICIAL" ? "Oficial" : "Simulado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(e.startDateTime)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(e.endDateTime)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <ListChecks className="size-3 text-muted-foreground" />
                          {e._count?.questions || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Users className="size-3 text-muted-foreground" />
                          {e._count?.assignments || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {e._count?.attempts || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary"
                          >
                            <Link href={`/app/admin/provas/${e.id}`}>
                              Detalhes
                              <ChevronRight className="size-3 ml-1" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => openEdit(e)}
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        classes={classes}
        saving={saving}
        onSavingChange={setSaving}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function ExamDialog({
  open,
  onOpenChange,
  editing,
  classes,
  saving,
  onSavingChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ExamList | null;
  classes: ClassItem[];
  saving: boolean;
  onSavingChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState("OFFICIAL");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [passingScore, setPassingScore] = useState("60");
  const [questionCount, setQuestionCount] = useState("20");
  const [showResults, setShowResults] = useState("AFTER_END");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || "");
      setDescription(editing?.description || "");
      setClassId(editing?.class?.id || classes[0]?.id || "");
      setType(editing?.type || "OFFICIAL");
      setStartDateTime(
        editing
          ? toLocalInput(new Date(editing.startDateTime))
          : toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
      );
      setEndDateTime(
        editing
          ? toLocalInput(new Date(editing.endDateTime))
          : toLocalInput(new Date(Date.now() + 25 * 60 * 60 * 1000))
      );
      setDurationMinutes(String(editing?.durationMinutes || 60));
      setPassingScore(String(editing?.passingScore || 60));
      setQuestionCount(String(editing?.questionCount || 20));
      setShowResults("AFTER_END");
      setShuffleQuestions(false);
      setActive(editing?.active ?? true);
    }
  }, [open, editing, classes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !classId || !startDateTime || !endDateTime) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    onSavingChange(true);
    const body = {
      title: title.trim(),
      description: description.trim(),
      classId,
      type,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      durationMinutes: Number(durationMinutes),
      passingScore: Number(passingScore),
      questionCount: Number(questionCount) || 20,
      showResults,
      shuffleQuestions,
      active,
    };
    const res = editing
      ? await apiFetch(`/api/admin/exams/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/api/admin/exams", {
          method: "POST",
          body: JSON.stringify(body),
        });
    onSavingChange(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao salvar prova.");
      return;
    }
    toast.success(editing ? "Prova atualizada." : "Prova criada.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Prova" : "Nova Prova"}
            </DialogTitle>
            <DialogDescription>
              Configure título, turma, janela temporal e duração.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado Geral de PCM"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Turma *</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICIAL">Oficial</SelectItem>
                    <SelectItem value="SIMULATION">Simulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="start">Início *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Encerramento *</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duração (minutos) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passing">Nota mínima (%) *</Label>
                <Input
                  id="passing"
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Padrão: 60% (média 6.0)</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qcount">Nº de questões (sorteadas por aluno) *</Label>
                <Input
                  id="qcount"
                  type="number"
                  min="5"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Cada aluno recebe questões aleatórias do banco (anti-cola)</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Quando mostrar resultado ao aluno</Label>
              <Select value={showResults} onValueChange={setShowResults}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Imediato</SelectItem>
                  <SelectItem value="AFTER_END">Após encerramento</SelectItem>
                  <SelectItem value="MANUAL">Manual (divulgação posterior)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="shuffle"
                checked={shuffleQuestions}
                onCheckedChange={setShuffleQuestions}
              />
              <Label htmlFor="shuffle">Embaralhar questões</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active-exam"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active-exam">Prova ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
