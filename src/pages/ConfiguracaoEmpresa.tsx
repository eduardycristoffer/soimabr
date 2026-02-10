import { useEffect } from "react";
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
import { Loader2, Building2, Save } from "lucide-react";

const settingsSchema = z.object({
  company_name: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().min(1, "Razão social é obrigatória"),
  cnpj: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  crea_registration: z.string().optional().or(z.literal("")),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function ConfiguracaoEmpresa() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
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

  if (isLoading) {
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
    </div>
  );
}
