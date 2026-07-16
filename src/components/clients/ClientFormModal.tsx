import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { isValidCNPJ, isValidCPF, formatCNPJ, formatCPF, formatPhone } from "@/lib/validators";
import { Client, ClientType } from "@/types";
import ClientAccessRequestModal from "./ClientAccessRequestModal";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Globe, Loader2, Lock, Search } from "lucide-react";

const baseSchema = z.object({
  razao_social: z.string().trim().min(2, "Razão social é obrigatória").max(200),
  nome_fantasia: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  contato_nome: z.string().trim().max(100).optional().or(z.literal("")),
  contato_email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  contato_telefone: z.string().trim().max(20).optional().or(z.literal("")),
  endereco: z.string().trim().max(300).optional().or(z.literal("")),
  cidade: z.string().trim().max(100).optional().or(z.literal("")),
  estado: z.string().trim().max(2).optional().or(z.literal("")),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  observacoes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const nacionalSchema = baseSchema.extend({
  client_type: z.literal("nacional"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  cpf: z.string().optional().or(z.literal("")),
  inscricao_estadual: z.string().trim().max(20).optional().or(z.literal("")),
  tax_id: z.string().optional(),
  pais: z.literal("Brasil"),
});

const internacionalSchema = baseSchema.extend({
  client_type: z.literal("internacional"),
  tax_id: z.string().trim().max(50).optional().or(z.literal("")),
  pais: z.string().trim().min(2, "País é obrigatório").max(100),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  inscricao_estadual: z.string().optional(),
});

const clientSchema = z.discriminatedUnion("client_type", [
  nacionalSchema,
  internacionalSchema,
]).superRefine((data, ctx) => {
  if (data.client_type === "nacional") {
    const cnpjClean = data.cnpj?.replace(/\D/g, "") || "";
    const cpfClean = data.cpf?.replace(/\D/g, "") || "";
    if (!cnpjClean || cnpjClean.length < 14) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ obrigatório", path: ["cnpj"] });
    } else if (!isValidCNPJ(cnpjClean)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ inválido", path: ["cnpj"] });
    }
    if (cpfClean && !isValidCPF(cpfClean)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF inválido", path: ["cpf"] });
    }
  }
});

type ClientFormData = z.infer<typeof clientSchema>;

interface LeadData {
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  leadData?: LeadData | null;
  onConvertSuccess?: (clientId: string) => void;
}

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default function ClientFormModal({ open, onOpenChange, client, leadData, onConvertSuccess }: ClientFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!client;
  const isConvertMode = !!leadData && !isEditing;
  const [clientType, setClientType] = useState<ClientType>(client?.client_type || "nacional");
  const [accessRequestOpen, setAccessRequestOpen] = useState(false);
  const [duplicateCnpjDigits, setDuplicateCnpjDigits] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const lastLookedUpRef = { current: "" } as { current: string };

  const lookupCnpj = async (rawCnpj: string) => {
    const digits = rawCnpj.replace(/\D/g, "");
    if (digits.length !== 14 || !isValidCNPJ(digits)) {
      toast({ title: "CNPJ inválido", variant: "destructive" });
      return;
    }
    setCnpjLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cnpj", { body: { cnpj: digits } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      const v = form.getValues();
      const setIfEmpty = (name: keyof ClientFormData, value: string | null) => {
        if (!value) return;
        if (!v[name] || v[name] === "") form.setValue(name as any, value, { shouldValidate: true });
      };
      // Overwrite razao_social / nome_fantasia
      if (d.razao_social) form.setValue("razao_social", d.razao_social, { shouldValidate: true });
      if (d.nome_fantasia) form.setValue("nome_fantasia", d.nome_fantasia, { shouldValidate: true });
      setIfEmpty("endereco", d.endereco);
      setIfEmpty("cidade", d.cidade);
      setIfEmpty("estado", d.estado);
      setIfEmpty("cep", d.cep);
      setIfEmpty("telefone", d.telefone ? formatPhone(d.telefone) : null);
      setIfEmpty("email", d.email);
      toast({ title: "Dados preenchidos via CNPJ" });
      if (d.warning) {
        toast({ title: "Atenção", description: d.warning });
      }
    } catch (e: any) {
      toast({ title: "Erro na consulta de CNPJ", description: e.message, variant: "destructive" });
    } finally {
      setCnpjLoading(false);
    }
  };

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: getDefaultValues(client),
  });

  useEffect(() => {
    if (open) {
      const defaults = getDefaultValues(client, leadData);
      form.reset(defaults);
      setClientType(defaults.client_type as ClientType);
    }
  }, [open, client, leadData]);

  function getDefaultValues(c?: Client | null, ld?: LeadData | null): ClientFormData {
    if (c) {
      return {
        client_type: c.client_type as ClientType,
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia || "",
        cnpj: c.cnpj || "",
        cpf: c.cpf || "",
        inscricao_estadual: c.inscricao_estadual || "",
        tax_id: c.tax_id || "",
        email: c.email || "",
        telefone: c.telefone || "",
        contato_nome: c.contato_nome || "",
        contato_email: c.contato_email || "",
        contato_telefone: c.contato_telefone || "",
        endereco: c.endereco || "",
        cidade: c.cidade || "",
        estado: c.estado || "",
        cep: c.cep || "",
        pais: c.pais || "Brasil",
        observacoes: c.observacoes || "",
      } as ClientFormData;
    }
    return {
      client_type: "nacional",
      razao_social: ld?.company_name || "",
      nome_fantasia: ld?.company_name || "",
      cnpj: "",
      cpf: "",
      inscricao_estadual: "",
      email: "",
      telefone: "",
      contato_nome: ld?.contact_name || "",
      contato_email: ld?.contact_email || "",
      contato_telefone: ld?.contact_phone || "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      pais: "Brasil",
      observacoes: "",
    } as ClientFormData;
  }

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Usuário não autenticado");

      const cnpjDigits = data.client_type === "nacional" ? (data.cnpj?.replace(/\D/g, "") || null) : null;

      const payload = {
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || null,
        client_type: data.client_type,
        cnpj: data.client_type === "nacional" ? (data.cnpj || null) : null,
        cnpj_digits: cnpjDigits,
        cpf: data.client_type === "nacional" ? (data.cpf || null) : null,
        inscricao_estadual: data.client_type === "nacional" ? (data.inscricao_estadual || null) : null,
        tax_id: data.client_type === "internacional" ? (data.tax_id || null) : null,
        email: data.email || null,
        telefone: data.telefone || null,
        contato_nome: data.contato_nome || null,
        contato_email: data.contato_email || null,
        contato_telefone: data.contato_telefone || null,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.client_type === "nacional" ? (data.estado || null) : null,
        cep: data.client_type === "nacional" ? (data.cep || null) : null,
        pais: data.pais,
        observacoes: data.observacoes || null,
      };

      if (isEditing) {
        // Remove cnpj fields from update to prevent trigger error
        const { cnpj: _c, cnpj_digits: _cd, ...updatePayload } = payload;
        const { error } = await supabase
          .from("clients")
          .update(updatePayload)
          .eq("id", client!.id);
        if (error) throw error;
        return null;
      } else {
        const { data: newClient, error } = await supabase.from("clients").insert([{
          ...payload,
          created_by: session.session.user.id,
          assigned_to: session.session.user.id,
        }]).select().single();
        if (error) {
          // Check for unique CNPJ violation
          if (error.message?.includes("idx_clients_cnpj_digits_unique") || error.code === "23505") {
            setDuplicateCnpjDigits(cnpjDigits || "");
            setAccessRequestOpen(true);
            throw new Error("CNPJ já cadastrado e não atribuído a você. Solicite acesso ao administrador.");
          }
          throw error;
        }
        return newClient;
      }
    },
    onSuccess: (newClient) => {
      toast({ title: isConvertMode ? "Lead convertido em cliente!" : isEditing ? "Cliente atualizado!" : "Cliente criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      form.reset();
      onOpenChange(false);
      if (isConvertMode && newClient?.id && onConvertSuccess) {
        onConvertSuccess(newClient.id);
      }
    },
    onError: (error) => {
      toast({
        title: isEditing ? "Erro ao atualizar cliente" : "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTabChange = (value: string) => {
    const type = value as ClientType;
    setClientType(type);
    form.setValue("client_type", type);
    if (type === "internacional") {
      form.setValue("pais" as any, "");
    } else {
      form.setValue("pais" as any, "Brasil");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isConvertMode ? "Converter Lead em Cliente" : isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {isConvertMode ? "Preencha os dados obrigatórios para converter o lead em cliente." : isEditing ? "Atualize os dados do cliente" : "Preencha os dados do cliente. CNPJ é obrigatório."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={clientType} onValueChange={handleTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="nacional" className="flex-1 gap-2">
                <Building2 className="h-4 w-4" /> Nacional
              </TabsTrigger>
              <TabsTrigger value="internacional" className="flex-1 gap-2">
                <Globe className="h-4 w-4" /> Internacional
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4 mt-4">
                {/* Dados principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="razao_social" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nome_fantasia" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl><Input placeholder="Nome fantasia" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Documentos - Nacional */}
                <TabsContent value="nacional" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          CNPJ *
                          {isEditing && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>CNPJ não pode ser alterado após criação</TooltipContent>
                            </Tooltip>
                          )}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="00.000.000/0000-00"
                              value={field.value || ""}
                              onChange={(e) => {
                                const formatted = formatCNPJ(e.target.value);
                                field.onChange(formatted);
                                const digits = formatted.replace(/\D/g, "");
                                if (!isEditing && digits.length === 14 && isValidCNPJ(digits) && lastLookedUpRef.current !== digits) {
                                  lastLookedUpRef.current = digits;
                                  lookupCnpj(digits);
                                }
                              }}
                              disabled={isEditing}
                              className={isEditing ? "bg-muted cursor-not-allowed" : ""}
                            />
                            {!isEditing && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => lookupCnpj(field.value || "")}
                                disabled={cnpjLoading}
                                title="Buscar CNPJ"
                              >
                                {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cpf" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" value={field.value || ""} onChange={(e) => field.onChange(formatCPF(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="inscricao_estadual" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual</FormLabel>
                        <FormControl><Input placeholder="IE" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>

                {/* Documentos - Internacional */}
                <TabsContent value="internacional" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tax_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID</FormLabel>
                        <FormControl><Input placeholder="Tax identification number" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="pais" render={({ field }) => (
                      <FormItem>
                        <FormLabel>País *</FormLabel>
                        <FormControl><Input placeholder="País" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>

                {/* Contato */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="email@empresa.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="telefone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" value={field.value || ""} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Pessoa de contato */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Pessoa de Contato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="contato_nome" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl><Input placeholder="Nome do contato" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contato_email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="contato@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contato_telefone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" value={field.value || ""} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Endereço - Nacional */}
                {clientType === "nacional" && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="endereco" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl><Input placeholder="Rua, número, complemento" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cidade" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl><Input placeholder="Cidade" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="estado" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ESTADOS_BR.map((uf) => (
                                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}

                {/* Endereço - Internacional */}
                {clientType === "internacional" && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="endereco" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl><Input placeholder="Full address" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cidade" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl><Input placeholder="City" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}

                {/* Observações */}
                <FormField control={form.control} name="observacoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Observações sobre o cliente..." className="resize-none" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isConvertMode ? "Converter em Cliente" : isEditing ? "Atualizar" : "Salvar Cliente"}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ClientAccessRequestModal
        open={accessRequestOpen}
        onOpenChange={setAccessRequestOpen}
        cnpjDigits={duplicateCnpjDigits}
      />
    </>
  );
}
