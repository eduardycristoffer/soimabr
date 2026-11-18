import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useState } from "react";
import { BottomNav } from "./BottomNav";
import { MoreSheet } from "./MoreSheet";
import logoSoima from "@/assets/logo-soima.webp";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppTourProvider } from "@/components/tour/AppTourProvider";

export function MainLayout() {
  const { user, isLoading } = useAuth();
  const online = useOnlineStatus();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: systemSettings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("maintenance_banner_enabled, maintenance_banner_message")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const showMaintenanceBanner = systemSettings?.maintenance_banner_enabled === true;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppTourProvider>
    <div className={showMaintenanceBanner ? "flex min-h-dvh w-full bg-background pt-9" : "flex min-h-dvh w-full bg-background"}>
      {showMaintenanceBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 flex h-9 items-center justify-center bg-destructive px-4 text-center text-xs font-medium text-destructive-foreground sm:text-sm">
          {systemSettings.maintenance_banner_message}
        </div>
      )}

      {/* Computador e tablet: menu lateral */}
      <div className="hidden md:block">
        <Sidebar bannerVisible={showMaintenanceBanner} />
      </div>

      <main className={cn("min-w-0 flex-1 overflow-y-auto scrollbar-thin scroll-smooth overscroll-y-contain", showMaintenanceBanner ? "h-[calc(100dvh-2.25rem)]" : "h-dvh")}>
        {/* Sem internet: aviso discreto (o app precisa de conexão para os dados) */}
        {!online && (
          <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <WifiOff className="h-3.5 w-3.5" /> Sem conexão com a internet. Os dados voltam a carregar quando a conexão voltar.
          </div>
        )}
        {/* Celular: faixa fina com a marca (respeita o entalhe/barra de status); o menu fica na barra de baixo */}
        <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <div className="flex h-12 items-center px-4">
            <img src={logoSoima} alt="SOIMA BR" className="h-6 w-auto" />
          </div>
        </header>
        <div className="container mx-auto max-w-screen-2xl p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Celular: barra de baixo + gaveta "Mais" com todas as opções */}
      <BottomNav onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
    </AppTourProvider>
  );
}
