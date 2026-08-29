import type { NextConfig } from "next";

// Garantir que o Prisma Client seja gerado antes do build
// usando API síncrona (sem depender de postinstall)
const { execSync } = require("child_process");
try {
  execSync("npx prisma generate", { stdio: "pipe", timeout: 30000 });
  console.log("✓ Prisma Client gerado");
} catch (e) {
  // Tenta com yarn se npm falhar
  try {
    execSync("yarn prisma generate", { stdio: "pipe", timeout: 30000 });
    console.log("✓ Prisma Client gerado (yarn)");
  } catch (e2) {
    console.error("⚠ Prisma generate falhou:", (e as Error).message);
  }
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
