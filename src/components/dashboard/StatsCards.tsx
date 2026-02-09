import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Kanban, TrendingUp } from "lucide-react";

export default function StatsCards() {
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

  const cards = [
    {
      title: "Clientes",
      value: stats?.clients ?? 0,
      description: "Total cadastrados",
      icon: Users,
    },
    {
      title: "Leads",
      value: stats?.leads ?? 0,
      description: "Em andamento",
      icon: Kanban,
    },
    {
      title: "Propostas",
      value: stats?.quotes ?? 0,
      description: "Este mês",
      icon: FileText,
    },
    {
      title: "Conversão",
      value: `${stats?.conversionRate ?? 0}%`,
      description: "Taxa de fechamento",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
