import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building2, Save, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCPF } from "@/lib/validators";

const settingsSchema = z.object({
  company_name: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().min(1, "Razão social é obrigatória"),
  cnpj: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  crea_registration: z.string().optional().or(z.literal("")),
  // Usados na qualificação das partes dos contratos
  inscricao_estadual: z.string().optional().or(z.literal("")),
  representante_nome: z.string().optional().or(z.literal("")),
  representante_cpf: z.string().optional().or(z.literal("")),
  representante_rg: z.string().optional().or(z.literal("")),
  representante_cargo: z.string().optional().or(z.literal("")),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function ConfiguracaoEmpresa() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  // O sistema tem mais de uma empresa (ex.: indústria, locações, serviços), cada uma
  // com seu modelo de contrato. Antes a tela editava só "a primeira" sem deixar escolher.
  const { data: companies, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const settings = useMemo(
    () => (companies || []).find((c) => c.id === selectedCompanyId) || (companies || [])[0] || null,
    [companies, selectedCompanyId],
  );

  const { data: systemSettings, isLoading: isSystemSettingsLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isSuperAdmin = systemSettings?.super_admin_id === user?.user_id;

  const bannerMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!isSuperAdmin) throw new Error("Você não tem permissão para alterar este aviso.");
      const { error } = await supabase
        .from("system_settings")
        .update({ maintenance_banner_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast({ title: enabled ? "Aviso ativado" : "Aviso desativado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao alterar aviso", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      company_name: "",
      razao_social: "",
      cnpj: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      crea_registration: "",
      inscricao_estadual: "",
      representante_nome: "",
      representante_cpf: "",
      representante_rg: "",
      representante_cargo: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        company_name: settings.company_name || "",
        razao_social: settings.razao_social || "",
        cnpj: settings.cnpj || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        address: settings.address || "",
        crea_registration: settings.crea_registration || "",
        inscricao_estadual: settings.inscricao_estadual || "",
        representante_nome: settings.representante_nome || "",
        representante_cpf: settings.representante_cpf || "",
        representante_rg: settings.representante_rg || "",
        representante_cargo: settings.representante_cargo || "",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      if (!settings?.id) throw new Error("Configuração não encontrada");
      const { error } = await supabase
        .from("company_settings")
        .update(data)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Configurações salvas!" });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  if (isLoading || isSystemSettingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Configuração da Empresa
        </h1>
        <p className="text-sm text-muted-foreground">
          Dados institucionais usados no cabeçalho e rodapé do PDF das propostas
        </p>
      </div>

      {(companies || []).length > 1 && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label>Empresa que você está editando</Label>
            <Select value={settings?.id || ""} onValueChange={(v) => setSelectedCompanyId(v)}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {(companies || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name || c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cada empresa tem seu modelo de contrato (venda, locação e serviços). Os dados abaixo entram na qualificação da vendedora/locadora do contrato.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Estas informações aparecerão no PDF gerado</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="company_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="razao_social" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="crea_registration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registro CREA</FormLabel>
                    <FormControl><Input placeholder="Reg. Crea 00000/RF" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" placeholder="contato@empresa.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input placeholder="www.empresa.com.br" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço Completo</FormLabel>
                  <FormControl><Input placeholder="Rua, nº - Bairro, Cidade - UF, CEP" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="inscricao_estadual" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl><Input placeholder="Ex.: 10.550.407-6" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="pt-2 space-y-1">
                <h3 className="text-sm font-semibold">Representante legal padrão</h3>
                <p className="text-xs text-muted-foreground">
                  Pré-preenche o representante da vendedora ao gerar um contrato (pode ser alterado em cada contrato).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="representante_nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representante_cargo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl><Input placeholder="Ex.: Diretor" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representante_cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        {...field}
                        onChange={(e) => field.onChange(formatCPF(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representante_rg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG / documento</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isSuperAdmin && systemSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Aviso de Atualização
            </CardTitle>
            <CardDescription>
              Controle a faixa vermelha exibida no topo para todos os usuários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="maintenance-banner">Exibir aviso no topo</Label>
                <p className="text-sm text-muted-foreground">
                  {systemSettings.maintenance_banner_message}
                </p>
              </div>
              <Switch
                id="maintenance-banner"
                checked={systemSettings.maintenance_banner_enabled}
                disabled={bannerMutation.isPending}
                onCheckedChange={(checked) => bannerMutation.mutate(checked)}
                aria-label="Exibir aviso de atualização"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
