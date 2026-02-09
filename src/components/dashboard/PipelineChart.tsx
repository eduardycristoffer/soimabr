import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PipelineChart() {
  const { isAdmin, user } = useAuth();

  const { data: chartData } = useQuery({
    queryKey: ["pipeline-chart", isAdmin, user?.user_id],
    queryFn: async () => {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index");

      let leadsQuery = supabase.from("leads").select("stage_id");
      if (!isAdmin) leadsQuery = leadsQuery.eq("owner_id", user!.user_id);
      const { data: leads } = await leadsQuery;

      return (stages || []).map((stage) => ({
        name: stage.name,
        count: (leads || []).filter((l) => l.stage_id === stage.id).length,
        color: stage.color,
      }));
    },
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline de Vendas</CardTitle>
        <CardDescription>Leads por etapa do funil</CardDescription>
      </CardHeader>
      <CardContent>
        {!chartData || chartData.every((d) => d.count === 0) ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">
              Adicione leads ao pipeline para ver o gráfico
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
