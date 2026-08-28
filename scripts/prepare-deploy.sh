#!/bin/bash
# Prepara o build standalone para deploy em produção
# Garante que o server.js carregue o .env antes de iniciar

set -e
cd /home/z/my-project

echo "📦 Reconstruindo build standalone..."
# Limpa build antigo
rm -rf .next
# Build com output standalone
NODE_ENV=production bun run build 2>&1 | tail -5

echo "📄 Injetando carregador de .env no server.js..."
SERVER_JS=".next/standalone/server.js"
if [ ! -f "$SERVER_JS" ]; then
  echo "❌ server.js não encontrado em $SERVER_JS"
  exit 1
fi

# Cria um prefixo que carrega .env
cat > /tmp/env-loader.js << 'EOF'
// Carrega variáveis de ambiente do arquivo .env
(function() {
  const fs = require('fs');
  const path = require('path');
  const possiblePaths = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    '/home/z/my-project/.env',
    '.env',
  ];
  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.substring(0, eqIdx).trim();
          let value = trimmed.substring(eqIdx + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
        console.log('[env] Variáveis carregadas de', envPath);
        break;
      }
    } catch (e) {}
  }
})();
EOF

# Prepara o server.js com o carregador
cat /tmp/env-loader.js "$SERVER_JS" > /tmp/server-with-env.js
cp /tmp/server-with-env.js "$SERVER_JS"

echo "📝 Copiando .env para standalone..."
cp .env .next/standalone/.env

echo "📄 Copiando prisma/schema.prisma..."
mkdir -p .next/standalone/prisma
cp prisma/schema.prisma .next/standalone/prisma/

echo "✅ Build standalone pronto para deploy!"
echo "   Local: .next/standalone/"
echo "   Para deploy: copiar .next/standalone/ para o servidor e rodar: node server.js"
