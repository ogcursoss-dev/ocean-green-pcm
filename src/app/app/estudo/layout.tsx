"use client";

import { AppShell, type NavItem } from "@/components/app-shell";
import { LayoutDashboard, BookOpenText, ClipboardList, ArrowLeft } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems: NavItem[] = [
  { href: "/app/aluno", label: "Início", icon: LayoutDashboard },
  { href: "/app/estudo", label: "Modo Estudo", icon: BookOpenText },
  { href: "/app/provas", label: "Provas Oficiais", icon: ClipboardList },
];

export default function EstudoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell
        navItems={navItems}
        dashboardHref="/app/aluno"
        title="Área do Aluno"
        homeHref="/"
      >
        {children}
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
