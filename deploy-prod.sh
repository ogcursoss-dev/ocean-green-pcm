#!/bin/bash
# Script de deploy para o servidor de produção
# Execute este script no servidor de produção (pcmogcursos.space-z.ai)
# para atualizar o código e reiniciar o servidor com as credenciais do Supabase
#
# USO: bash deploy-prod.sh

set -e

echo "🚀 Deploy Ocean Green Treinamentos - Produção"
echo "============================================="

# 1. Navega para o diretório do projeto
cd /home/z/my-project 2>/dev/null || cd /app 2>/dev/null || {
  echo "❌ Diretório do projeto não encontrado"
  exit 1
}

# 2. Atualiza o código do GitHub
echo "📥 Atualizando código do GitHub..."
git fetch origin main
git reset --hard origin/main
echo "✅ Código atualizado"

# 3. Instala dependências
echo "📦 Instalando dependências..."
bun install 2>/dev/null || npm install 2>/dev/null || {
  echo "⚠️  Aviso: não foi possível instalar dependências automaticamente"
}

# 4. Gera o Prisma Client
echo "🔧 Gerando Prisma Client..."
bun run db:generate 2>/dev/null || npx prisma generate 2>/dev/null || true

# 5. Garante que o .env.deploy existe
if [ ! -f .env.deploy ]; then
  echo "❌ .env.deploy não encontrado!"
  exit 1
fi
echo "✅ .env.deploy encontrado"

# 6. Para processos antigos do Next.js
echo "🛑 Parando processos antigos..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

# 7. Inicia o servidor com as credenciais corretas
echo "🚀 Iniciando servidor com Supabase..."
nohup setsid bash start-prod.sh < /dev/null > /home/z/my-project/deploy.log 2>&1 &
disown

# 8. Aguarda e testa
sleep 10
echo "🧪 Testando conexão..."
if curl -s --max-time 10 http://localhost:3000/api/me | grep -q "user"; then
  echo "✅ Servidor respondendo!"
  echo ""
  echo "🎉 Deploy concluído com sucesso!"
  echo "   URL local: http://localhost:3000"
  echo "   Login: apenas CPF (124.521.557-48 para admin)"
else
  echo "❌ Servidor não respondeu. Verifique o log:"
  echo "   tail -50 /home/z/my-project/deploy.log"
fi
