import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function MainLayout() {
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
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
    <div className={showMaintenanceBanner ? "flex min-h-screen w-full bg-background pt-9" : "flex min-h-screen w-full bg-background"}>
      {showMaintenanceBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 flex h-9 items-center justify-center bg-destructive px-4 text-center text-xs font-medium text-destructive-foreground sm:text-sm">
          {systemSettings.maintenance_banner_message}
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar bannerVisible={showMaintenanceBanner} />
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar">
          <Sidebar mobile onNavigate={() => setMobileOpen(false)} bannerVisible={showMaintenanceBanner} />
        </SheetContent>
      </Sheet>

      <main className={showMaintenanceBanner ? "flex-1 min-w-0 h-[calc(100vh-2.25rem)] overflow-y-auto scrollbar-thin scroll-smooth" : "flex-1 min-w-0 h-screen overflow-y-auto scrollbar-thin scroll-smooth"}>
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="container mx-auto max-w-screen-2xl p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
