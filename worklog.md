# Ocean Green Treinamentos - Worklog

Projeto: Sistema de Simulados e Avaliações PCM
Stack: Next.js 16, TypeScript, Prisma (SQLite dev / Supabase PostgreSQL prod), Tailwind, shadcn/ui

## Cores da Identidade Visual
- Verde Oceano Profundo: #0A5C36
- Verde Menta Corporativo: #2E8B57
- Azul Petróleo: #1B4965
- Off-White: #F4F7F6

---
Task ID: 1
Agent: main
Task: Setup inicial - worklog, schema do banco, identidade visual Ocean Green

Work Log:
- Criado arquivo de worklog
- Definido schema Prisma completo (Users, Classes, Subjects, Questions, Exams, ExamAssignments, ExamAttempts, Simulations)
- Configurando tema visual Ocean Green

Stage Summary:
- Schema Prisma completo criado: User, Class, ClassMember, Subject, Question, Exam, ExamQuestion, ExamAssignment, ExamAttempt, Simulation
- `bun run db:push` executado com sucesso
- Tema Ocean Green configurado em globals.css (cores: #0A5C36, #2E8B57, #1B4965, #F4F7F6)
- Utilidades de auth criadas: src/lib/auth.ts (hash/verify password, JWT, CPF mask/clean/validate)
- Utilidades de sessão criadas: src/lib/session.ts (create/destroy session, getCurrentUser, requireAdmin)
- Seed script em scripts/seed.ts
- Admin criado: CPF 000.000.001-91 | Senha: OceanGreen@2024
- 33 disciplinas PCM criadas no banco
- Dependências instaladas: bcryptjs, jsonwebtoken, jspdf, jspdf-autotable
- Próximo: delegar construção da app + geração das 300 questões em paralelo
