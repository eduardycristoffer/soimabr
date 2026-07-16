import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy } from "lucide-react";

function TemplateEditor({ type }: { type: "venda" | "locacao" }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["contract-templates", type],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_templates")
        .select("*").eq("contract_type", type).order("version", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const active = selectedId ? templates?.find((t) => t.id === selectedId) : templates?.[0];

  const { data: clauses, refetch } = useQuery({
    queryKey: ["contract-clauses", active?.id],
    queryFn: async () => {
      if (!active) return [];
      const { data, error } = await supabase.from("contract_clauses")
        .select("*").eq("template_id", active.id).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!active,
  });

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("contract_templates").update({ is_active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["contract-templates", type] });
  };

  const duplicateVersion = async () => {
    if (!active) return;
    const nextVersion = Math.max(0, ...(templates || []).map((t) => t.version)) + 1;
    const { data: newT, error } = await supabase.from("contract_templates").insert({
      name: active.name.replace(/\s\(v\d+\)$/, "") + ` (v${nextVersion})`,
      contract_type: type,
      version: nextVersion,
      is_active: false,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (clauses && clauses.length > 0) {
      await supabase.from("contract_clauses").insert(clauses.map((c) => ({
        template_id: newT.id, order_index: c.order_index, title: c.title, body: c.body, is_core: c.is_core,
      })));
    }
    qc.invalidateQueries({ queryKey: ["contract-templates", type] });
    setSelectedId(newT.id);
    toast({ title: `Nova versão v${nextVersion} criada` });
  };

  const addClause = async () => {
    if (!active) return;
    const maxOrder = Math.max(0, ...(clauses || []).map((c) => c.order_index));
    await supabase.from("contract_clauses").insert({
      template_id: active.id, order_index: maxOrder + 1, title: "Nova cláusula", body: "Conteúdo", is_core: false,
    });
    refetch();
  };

  const updateClause = async (id: string, patch: any) => {
    await supabase.from("contract_clauses").update(patch).eq("id", id);
    refetch();
  };

  const removeClause = async (id: string) => {
    if (!confirm("Remover cláusula?")) return;
    await supabase.from("contract_clauses").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {templates?.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={`px-3 py-1.5 rounded border text-sm ${(active?.id === t.id) ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            v{t.version} {t.is_active && <Badge variant="outline" className="ml-1 text-[10px]">ativo</Badge>}
          </button>
        ))}
        <Button size="sm" variant="outline" onClick={duplicateVersion}>
          <Copy className="h-3 w-3 mr-1" /> Nova versão
        </Button>
      </div>

      {active && (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{active.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={active.is_active} onCheckedChange={(v) => toggleActive(active.id, v)} />
              </div>
            </CardHeader>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Cláusulas ({clauses?.length || 0})</h3>
            <Button size="sm" variant="outline" onClick={addClause}><Plus className="h-3 w-3 mr-1" /> Cláusula</Button>
          </div>

          {clauses?.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex gap-2 items-center">
                  <Input type="number" value={c.order_index} className="w-20"
                    onChange={(e) => updateClause(c.id, { order_index: Number(e.target.value) })}
                  />
                  <Input defaultValue={c.title} onBlur={(e) => e.target.value !== c.title && updateClause(c.id, { title: e.target.value })} />
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Núcleo</Label>
                    <Switch checked={c.is_core} onCheckedChange={(v) => updateClause(c.id, { is_core: v })} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeClause(c.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea defaultValue={c.body} rows={6} className="font-mono text-xs"
                  onBlur={(e) => e.target.value !== c.body && updateClause(c.id, { body: e.target.value })}
                />
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

export default function ContractTemplates() {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modelos de Contrato</h1>
        <p className="text-muted-foreground">Alterações aqui não afetam contratos já gerados.</p>
      </div>

      <Tabs defaultValue="venda">
        <TabsList>
          <TabsTrigger value="venda">Venda</TabsTrigger>
          <TabsTrigger value="locacao">Locação</TabsTrigger>
        </TabsList>
        <TabsContent value="venda" className="pt-4"><TemplateEditor type="venda" /></TabsContent>
        <TabsContent value="locacao" className="pt-4"><TemplateEditor type="locacao" /></TabsContent>
      </Tabs>
    </div>
  );
}
