import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCNPJ } from "@/lib/validators";
import { Loader2 } from "lucide-react";

export default function CnpjLookupConfig() {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(true);
  const [testCnpj, setTestCnpj] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["cnpj-lookup-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cnpj_lookup_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (config) setIsActive(config.is_active);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("cnpj_lookup_config")
        .update({ is_active: isActive })
        .eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cnpj-lookup-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cnpj", {
        body: { cnpj: testCnpj },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTestResult(data);
    } catch (e: any) {
      setTestError(e.message || "Erro na consulta");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Consulta Automática de CNPJ</CardTitle>
              <CardDescription>
                Ao cadastrar um cliente nacional, os dados são preenchidos automaticamente a partir do CNPJ.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor</Label>
            <Input value="BrasilAPI (gratuito, sem chave)" readOnly className="bg-muted" />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testar Consulta</CardTitle>
          <CardDescription>Consulte um CNPJ para validar o funcionamento da integração.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="00.000.000/0000-00"
              value={testCnpj}
              onChange={(e) => setTestCnpj(formatCNPJ(e.target.value))}
            />
            <Button onClick={handleTest} disabled={testing || testCnpj.replace(/\D/g, "").length !== 14}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar
            </Button>
          </div>

          {testError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {testError}
            </div>
          )}

          {testResult && (
            <div className="rounded-md border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(testResult, null, 2)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
