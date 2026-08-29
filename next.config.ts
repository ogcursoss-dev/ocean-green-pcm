import type { NextConfig } from "next";
import { execSync } from "child_process";

// Garante que o Prisma Client seja gerado antes do build
// Resolve o erro: "Cannot find module '.prisma/client/default'"
// que ocorre quando a Z.ai roda apenas `next build` sem `prisma generate`
try {
  console.log("[next.config] Gerando Prisma Client...");
  execSync("npx prisma generate", { stdio: "inherit", timeout: 60000 });
  console.log("[next.config] Prisma Client gerado com sucesso");
} catch (e) {
  console.error("[next.config] Aviso: não foi possível gerar Prisma Client:", e);
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
