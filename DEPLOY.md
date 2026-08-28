# Deploy - Ocean Green Treinamentos

## URL de Produção
https://pcmogcursos.space-z.ai/

## Problema Conhecido e Solução

### Problema
O servidor de produção estava com `DATABASE_URL` inválida (apontando para SQLite
em vez de Supabase PostgreSQL), causando erro de login.

### Solução Implementada
1. **`.env.deploy`** — arquivo de configuração versionado no git com as credenciais
   do Supabase. Este arquivo é carregado automaticamente pelo `start-prod.sh`.

2. **`start-prod.sh`** — script de inicialização que:
   - Carrega as variáveis do `.env.deploy`
   - Valida que `DATABASE_URL` está com protocolo PostgreSQL
   - Se necessário, cria o `.env.deploy` automaticamente
   - Inicia o Next.js

3. **`src/lib/db.ts`** — usa `dotenv` para carregar múltiplos arquivos `.env`
   em ordem de prioridade: `.env.local` > `.env` > `.env.deploy`

## Como Atualizar o Servidor de Produção

### Opção 1: Usando start-prod.sh (recomendado)
```bash
# No servidor de produção:
cd /caminho/para/ocean-green-pcm
git pull origin main
bash start-prod.sh
```

### Opção 2: Usando npm/bun diretamente
```bash
cd /caminho/para/ocean-green-pcm
git pull origin main
# Carregar variáveis manualmente
export $(cat .env.deploy | xargs)
bun run dev
# ou: npm run dev
```

### Opção 3: Reiniciar serviço (PM2, systemd, etc)
```bash
cd /caminho/para/ocean-green-pcm
git pull origin main
# Reiniciar o serviço que roda a aplicação
pm2 restart ocean-green
# ou: systemctl restart ocean-green
```

## Credenciais de Acesso

### Admin
- **CPF**: 124.521.557-48 (Lucas Skopek)
- **Login**: apenas CPF (sem senha)

### Banco de Dados (Supabase)
- **URL**: https://qqpalstkdwqgarqajozh.supabase.co
- **Pooler**: aws-0-sa-east-1.pooler.supabase.com:5432
- **Database**: postgres

## Estado do Sistema
- 1 admin ativo (Lucas Skopek)
- 1 turma (Turma PC 2026.2)
- 33 disciplinas PCM
- 300 questões (145 fáceis + 155 médias)
- 0 alunos (pronto para cadastro)
- 0 provas (pronto para criação)
