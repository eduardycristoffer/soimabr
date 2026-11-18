import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Kanban, TrendingUp } from "lucide-react";

function useDashboardStats(): DashboardStats | undefined {
  const { isAdmin, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", isAdmin, user?.user_id],
    queryFn: async () => {
      const userId = user?.user_id;

      // Clientes
      let clientsQuery = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (!isAdmin) clientsQuery = clientsQuery.eq("created_by", userId!);
      const { count: clientsCount } = await clientsQuery;

      // Leads em andamento
      let leadsQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("is_converted", false);
      if (!isAdmin) leadsQuery = leadsQuery.eq("owner_id", userId!);
      const { count: leadsCount } = await leadsQuery;

      // Propostas este mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      let quotesQuery = supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());
      if (!isAdmin) quotesQuery = quotesQuery.eq("created_by", userId!);
      const { count: quotesCount } = await quotesQuery;

      // Taxa de conversão (leads finalizados / total)
      let totalLeadsQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true });
      if (!isAdmin) totalLeadsQuery = totalLeadsQuery.eq("owner_id", userId!);
      const { count: totalLeads } = await totalLeadsQuery;

      let convertedQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("is_converted", true);
      if (!isAdmin) convertedQuery = convertedQuery.eq("owner_id", userId!);
      const { count: convertedLeads } = await convertedQuery;

      const conversionRate =
        totalLeads && totalLeads > 0
          ? Math.round(((convertedLeads || 0) / totalLeads) * 100)
          : 0;

      return {
        clients: clientsCount || 0,
        leads: leadsCount || 0,
        quotes: quotesCount || 0,
        conversionRate,
      };
    },
    enabled: !!user,
  });

  return stats;
}

export interface DashboardStats {
  clients: number;
  leads: number;
  quotes: number;
  conversionRate: number;
}

/** Visão dos números do painel: 2 por linha no celular, 4 em tela larga. */
export function StatsCardsView({ stats }: { stats?: DashboardStats }) {
  const cards = [
    { title: "Clientes", value: stats?.clients ?? 0, description: "Total cadastrados", icon: Users, tint: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
    { title: "Leads", value: stats?.leads ?? 0, description: "Em andamento", icon: Kanban, tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
    { title: "Propostas", value: stats?.quotes ?? 0, description: "Este mês", icon: FileText, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
    { title: "Conversão", value: `${stats?.conversionRate ?? 0}%`, description: "Taxa de fechamento", icon: TrendingUp, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="min-w-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{card.title}</p>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${card.tint}`}>
                <card.icon className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{card.value}</div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StatsCards() {
  const stats = useDashboardStats();
  return <StatsCardsView stats={stats} />;
}
