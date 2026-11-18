import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Kanban,
  FileText,
  FileSignature,
  FileCog,
  UserCog,
  ClipboardList,
  Menu,
  LogOut,
  ChevronLeft,
  Percent,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Webhook,
  BarChart3,
  Construction,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/types";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import logoSoima from "@/assets/logo-soima.webp";
import { InstallAppButton } from "@/components/layout/InstallAppButton";
import { TourButton } from "@/components/tour/TourButton";
import { useFleetEnabled } from "@/hooks/useFleetEnabled";

const navItems: NavItem[] = [
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

const COLLAPSED_KEY = "sidebar:collapsed";

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  bannerVisible?: boolean;
}

export function Sidebar({ mobile = false, onNavigate, bannerVisible = false }: SidebarProps) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    if (mobile || typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });

  useEffect(() => {
    if (mobile) return;
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed, mobile]);

  const effectiveCollapsed = mobile ? false : collapsed;

  // "Frota" só aparece para administradores e depois que o SQL da frota foi aplicado
  const fleetEnabled = useFleetEnabled(isAdmin);
  const filteredItems = navItems.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.needsFleet || fleetEnabled)
  );

  const isItemActive = (href: string) => {
    const path = location.pathname;
    return path === href || path.startsWith(href + "/");
  };

  const handleNavClick = () => {
    if (mobile && onNavigate) onNavigate();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar transition-all duration-300",
          mobile
            ? "h-full w-64"
            : cn(bannerVisible ? "sticky top-9 h-[calc(100vh-2.25rem)]" : "sticky top-0 h-screen", effectiveCollapsed ? "w-16" : "w-64")
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4 shrink-0">
          {!effectiveCollapsed && (
            <img src={logoSoima} alt="SOIMA BR" className="h-8 w-auto" />
          )}
          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const active = isItemActive(item.href);
              const link = (
                <NavLink
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    effectiveCollapsed && "justify-center",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!effectiveCollapsed && <span>{item.title}</span>}
                </NavLink>
              );
              return (
                <li key={item.href}>
                  {effectiveCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <div className="border-t p-4 shrink-0">
          <TourButton collapsed={effectiveCollapsed} onBeforeStart={mobile ? handleNavClick : undefined} />
          <InstallAppButton collapsed={effectiveCollapsed} />
          {!effectiveCollapsed && user && (
            <button
              onClick={() => {
                navigate("/perfil");
                handleNavClick();
              }}
              className="mb-3 w-full text-left rounded-lg px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
            >
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {user.email}
              </p>
            </button>
          )}
          {effectiveCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="text-sidebar-foreground hover:bg-sidebar-accent w-full"
                  aria-label="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={signOut}
              className="text-sidebar-foreground hover:bg-sidebar-accent w-full justify-start"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-2">Sair</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
