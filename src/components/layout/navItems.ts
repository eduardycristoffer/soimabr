import {
  BarChart3, CheckCircle2, ClipboardList, Construction, FileCog, FileSignature, FileText, Kanban, LayoutDashboard, Package,
  Percent, ShieldCheck, UserCog, Users, Webhook, Building2,
} from "lucide-react";
import type { NavItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useFleetEnabled } from "@/hooks/useFleetEnabled";

/** Todas as telas do menu (menu lateral no computador, barra de baixo + "Mais" no celular). */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Pipeline", href: "/pipeline", icon: Kanban },
  { title: "Propostas", href: "/orcamentos", icon: FileText },
  { title: "Contratos", href: "/contratos", icon: FileSignature },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { title: "Frota", href: "/frota", icon: Construction, adminOnly: true, needsFleet: true },
  { title: "Modelos de Contrato", href: "/admin/modelos-contrato", icon: FileCog, adminOnly: true },
  { title: "Produtos", href: "/produtos", icon: Package, adminOnly: true },
  { title: "Aprovações", href: "/aprovacoes", icon: CheckCircle2, adminOnly: true },
  { title: "Solicitações", href: "/solicitacoes-acesso", icon: ShieldCheck, adminOnly: true },
  { title: "Regras de Desconto", href: "/regras-desconto", icon: Percent, adminOnly: true },
  { title: "Usuários", href: "/usuarios", icon: UserCog, adminOnly: true },
  { title: "Auditoria", href: "/auditoria", icon: ClipboardList, adminOnly: true },
  { title: "Empresa", href: "/configuracao-empresa", icon: Building2, adminOnly: true },
  { title: "Webhooks", href: "/webhooks", icon: Webhook, adminOnly: true },
];

/** Os 4 atalhos que ficam sempre à mão na barra de baixo do celular (o resto vem em "Mais"). */
export const BOTTOM_BAR_HREFS = ["/dashboard", "/orcamentos", "/pipeline", "/contratos"] as const;

/** Rota atual pertence a este item do menu? */
export const isNavActive = (pathname: string, href: string): boolean => pathname === href || pathname.startsWith(href + "/");

/** Itens que este usuário pode ver: administração só para admin; "Frota" só com a frota ativada no banco. */
export function useVisibleNavItems(): NavItem[] {
  const { isAdmin } = useAuth();
  const fleetEnabled = useFleetEnabled(isAdmin);
  return navItems.filter((item) => (!item.adminOnly || isAdmin) && (!item.needsFleet || fleetEnabled));
}
