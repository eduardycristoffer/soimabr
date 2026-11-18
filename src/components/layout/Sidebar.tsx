import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
import { isNavActive, useVisibleNavItems } from "@/components/layout/navItems";

const COLLAPSED_KEY = "sidebar:collapsed";

interface SidebarProps {
  bannerVisible?: boolean;
}

/** Menu lateral (computador e tablet). No celular o menu é a barra de baixo + "Mais" (BottomNav e MoreSheet). */
export function Sidebar({ bannerVisible = false }: SidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const effectiveCollapsed = collapsed;

  // "Frota" só aparece para administradores e depois que o SQL da frota foi aplicado
  const filteredItems = useVisibleNavItems();
  const isItemActive = (href: string) => isNavActive(location.pathname, href);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar transition-all duration-300",
          bannerVisible ? "sticky top-9 h-[calc(100dvh-2.25rem)]" : "sticky top-0 h-dvh",
          effectiveCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4 shrink-0">
          {!effectiveCollapsed && (
            <img src={logoSoima} alt="SOIMA BR" className="h-8 w-auto" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const active = isItemActive(item.href);
              const link = (
                <NavLink
                  to={item.href}
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
          <TourButton collapsed={effectiveCollapsed} />
          <InstallAppButton collapsed={effectiveCollapsed} />
          {!effectiveCollapsed && user && (
            <button
              onClick={() => navigate("/perfil")}
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
