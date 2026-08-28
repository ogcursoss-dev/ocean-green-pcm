#!/bin/bash
# Script de inicialização para produção
# Carrega as variáveis de ambiente do .env.deploy antes de iniciar o Next.js
# Resolve o problema de DATABASE_URL inválida em produção

cd "$(dirname "$0")"

# Exporta as variáveis do .env.deploy para o ambiente do processo
if [ -f .env.deploy ]; then
  echo "[start-prod] Carregando .env.deploy..."
  set -a
  source .env.deploy
  set +a
elif [ -f .env ]; then
  echo "[start-prod] Carregando .env..."
  set -a
  source .env
  set +a
fi

# Valida DATABASE_URL
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
  echo "[start-prod] ❌ DATABASE_URL inválida: ${DATABASE_URL:0:30}..."
  echo "[start-prod] Criando .env.deploy com valores padrão do Supabase..."
  cat > .env.deploy << 'EOF'
DATABASE_URL=postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://qqpalstkdwqgarqajozh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcGFsc3RrZHdxZ2FycWFqb3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4OTE5MDQsImV4cCI6MjEwMzQ2NzkwNH0.TqW5-R3VStp6BRTcuxsp_qOA3DRVK_1JNlj0VnkJZC8
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcGFsc3RrZHdxZ2FycWFqb3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg5MTkwNCwiZXhwIjoyMTAzNDY3OTA0fQ.7FXanV11T5e8Q8EeDUo21K5OZsNfJ9ZJbuUkGE475mo
JWT_SECRET=ocean-green-pcm-jwt-secret-2024-production-change
NODE_ENV=production
EOF
  set -a
  source .env.deploy
  set +a
fi

echo "[start-prod] ✅ DATABASE_URL: ${DATABASE_URL:0:40}..."

# Inicia o Next.js
export NODE_ENV=production
exec node_modules/.bin/next dev -p ${PORT:-3000}
