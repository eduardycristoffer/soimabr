import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function GoogleSheetsConfig() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    is_active: false,
    apps_script_url: "",
    spreadsheet_id: "",
    sheet_name: "",
    trigger_on: "created",
    trigger_stage_id: "",
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["google-sheets-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_sheets_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (config) {
      setForm({
        is_active: config.is_active,
        apps_script_url: config.apps_script_url || "",
        spreadsheet_id: config.spreadsheet_id || "",
        sheet_name: config.sheet_name || "",
        trigger_on: config.trigger_on,
        trigger_stage_id: config.trigger_stage_id || "",
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("google_sheets_config")
        .update({
          is_active: form.is_active,
          apps_script_url: form.apps_script_url || null,
          spreadsheet_id: form.spreadsheet_id || null,
          sheet_name: form.sheet_name || null,
          trigger_on: form.trigger_on,
          trigger_stage_id: form.trigger_stage_id || null,
        } as any)
        .eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-sheets-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Sheets</CardTitle>
              <CardDescription>Envie leads automaticamente para uma planilha Google Sheets via Apps Script</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={form.is_active ? "default" : "secondary"}>
                {form.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Apps Script Web App</Label>
            <Input
              value={form.apps_script_url}
              onChange={(e) => setForm({ ...form, apps_script_url: e.target.value })}
              placeholder="https://script.google.com/macros/s/..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ID da Planilha</Label>
              <Input
                value={form.spreadsheet_id}
                onChange={(e) => setForm({ ...form, spreadsheet_id: e.target.value })}
                placeholder="ID da planilha"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Aba</Label>
              <Input
                value={form.sheet_name}
                onChange={(e) => setForm({ ...form, sheet_name: e.target.value })}
                placeholder="Sheet1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Disparar quando</Label>
            <Select value={form.trigger_on} onValueChange={(v) => setForm({ ...form, trigger_on: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Lead é criado</SelectItem>
                <SelectItem value="stage">Lead entra em etapa específica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.trigger_on === "stage" && (
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={form.trigger_stage_id} onValueChange={(v) => setForm({ ...form, trigger_stage_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {stages?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mapeamento de campos</Label>
            <div className="rounded-md border p-3 bg-muted/50 text-xs font-mono space-y-1">
              <p>name → contact_name</p>
              <p>email → contact_email</p>
              <p>phone → contact_phone</p>
              <p>company → company_name</p>
              <p>source → lead_origin</p>
              <p>stage → stage_name</p>
              <p>created_at → created_at</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
