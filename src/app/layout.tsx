import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ocean Green Treinamentos | Sistema PCM",
  description: "Plataforma de simulados e avaliações para Planejamento e Controle da Manutenção",
  keywords: ["PCM", "Manutenção", "Simulados", "Ocean Green", "Treinamentos"],
  authors: [{ name: "Ocean Green Treinamentos" }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
