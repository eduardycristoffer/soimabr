import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Product, ProductCategory } from "@/types";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  codigo: z.string().trim().min(1, "Código é obrigatório").max(50),
  nome: z.string().trim().min(2, "Nome é obrigatório").max(200),
  descricao: z.string().trim().max(1000).optional().or(z.literal("")),
  descricao_tecnica: z.string().trim().max(5000).optional().or(z.literal("")),
  descricao_tecnica_en: z.string().trim().max(5000).optional().or(z.literal("")),
  show_tech_desc_pdf: z.boolean(),
  categoria: z.enum(["grua", "configuracao", "torre", "tramo", "chassis", "acessorio"]),
  unidade: z.string().trim().min(1, "Unidade é obrigatória").max(10),
  preco: z.coerce.number().min(0, "Preço não pode ser negativo"),
  international_price_brl: z.coerce.number().min(0, "Preço não pode ser negativo").nullable().optional(),
  // English fields
  nome_en: z.string().trim().max(200).optional().or(z.literal("")),
  descricao_en: z.string().trim().max(1000).optional().or(z.literal("")),
  // Crane default specs
  default_lanca_m: z.coerce.number().min(0).nullable().optional(),
  default_altura_torre_m: z.coerce.number().min(0).nullable().optional(),
  default_carga_maxima_kg: z.coerce.number().min(0).nullable().optional(),
  default_carga_ponta_kg: z.coerce.number().min(0).nullable().optional(),
  default_altura_trabalho_m: z.coerce.number().min(0).nullable().optional(),
  // Existing crane spec fields
  spec_tipo: z.string().trim().max(200).optional().or(z.literal("")),
  spec_vel_elevacao: z.string().trim().max(200).optional().or(z.literal("")),
  spec_vel_rotacao: z.string().trim().max(200).optional().or(z.literal("")),
  spec_vel_translacao: z.string().trim().max(200).optional().or(z.literal("")),
  default_panel_voltage: z.string().trim().max(10).optional().or(z.literal("")),
  // Rental defaults
  rental_monthly_price: z.coerce.number().min(0).nullable().optional(),
  rental_mobilization_default: z.coerce.number().min(0).nullable().optional(),
  rental_assembly_default: z.coerce.number().min(0).nullable().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const categoryOptions: { value: ProductCategory; label: string }[] = [
  { value: "grua", label: "🏗️ Grua" },
  { value: "configuracao", label: "⚙️ Configuração" },
  { value: "torre", label: "🗼 Torre" },
  { value: "tramo", label: "📐 Tramo" },
  { value: "chassis", label: "🔧 Chassis" },
  { value: "acessorio", label: "🔩 Acessório" },
];

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export default function ProductFormModal({ open, onOpenChange, product }: ProductFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: getDefaults(product),
  });

  const watchedCategory = form.watch("categoria");
  const isGrua = watchedCategory === "grua";

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(product));
    }
  }, [open, product]);

  function getDefaults(p?: Product | null): ProductFormData {
    const pa = p as any;
    if (p) {
      return {
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao || "",
        descricao_tecnica: pa?.descricao_tecnica || "",
        descricao_tecnica_en: pa?.descricao_tecnica_en || "",
        show_tech_desc_pdf: pa?.show_tech_desc_pdf ?? false,
        categoria: p.categoria,
        unidade: p.unidade,
        preco: p.preco,
        international_price_brl: pa?.international_price_brl ?? null,
        nome_en: pa?.nome_en || "",
        descricao_en: pa?.descricao_en || "",
        default_lanca_m: pa?.default_lanca_m ?? null,
        default_altura_torre_m: pa?.default_altura_torre_m ?? null,
        default_carga_maxima_kg: pa?.default_carga_maxima_kg ?? null,
        default_carga_ponta_kg: pa?.default_carga_ponta_kg ?? null,
        default_altura_trabalho_m: pa?.default_altura_trabalho_m ?? null,
        spec_tipo: pa?.spec_tipo || "",
        spec_vel_elevacao: pa?.spec_vel_elevacao || "",
        spec_vel_rotacao: pa?.spec_vel_rotacao || "",
        spec_vel_translacao: pa?.spec_vel_translacao || "",
        default_panel_voltage: pa?.default_panel_voltage || "380",
      };
    }
    return {
      codigo: "",
      nome: "",
      descricao: "",
      descricao_tecnica: "",
      descricao_tecnica_en: "",
      show_tech_desc_pdf: false,
      categoria: "acessorio",
      unidade: "UN",
      preco: 0,
      international_price_brl: null,
      nome_en: "",
      descricao_en: "",
      default_lanca_m: null,
      default_altura_torre_m: null,
      default_carga_maxima_kg: null,
      default_carga_ponta_kg: null,
      default_altura_trabalho_m: null,
      spec_tipo: "",
      spec_vel_elevacao: "",
      spec_vel_rotacao: "",
      spec_vel_translacao: "",
      default_panel_voltage: "380",
    };
  }

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload: Record<string, any> = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        descricao_tecnica: data.descricao_tecnica || null,
        descricao_tecnica_en: data.descricao_tecnica_en || null,
        show_tech_desc_pdf: data.show_tech_desc_pdf,
        categoria: data.categoria,
        unidade: data.unidade,
        preco: data.preco,
        needs_review: data.preco === 0,
        international_price_brl: data.international_price_brl ?? null,
      };

      // Add crane-specific fields only when category is grua
      if (data.categoria === "grua") {
        payload.nome_en = data.nome_en || null;
        payload.descricao_en = data.descricao_en || null;
        payload.default_lanca_m = data.default_lanca_m ?? null;
        payload.default_altura_torre_m = data.default_altura_torre_m ?? null;
        payload.default_carga_maxima_kg = data.default_carga_maxima_kg ?? null;
        payload.default_carga_ponta_kg = data.default_carga_ponta_kg ?? null;
        payload.default_altura_trabalho_m = data.default_altura_trabalho_m ?? null;
        payload.spec_tipo = data.spec_tipo || null;
        payload.spec_vel_elevacao = data.spec_vel_elevacao || null;
        payload.spec_vel_rotacao = data.spec_vel_rotacao || null;
        payload.spec_vel_translacao = data.spec_vel_translacao || null;
        payload.default_panel_voltage = data.default_panel_voltage || "380";
      }

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(payload as any)
          .eq("id", product!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Produto atualizado!" : "Produto criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: isEditing ? "Erro ao atualizar produto" : "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const numFieldValue = (val: number | null | undefined) =>
    val === null || val === undefined ? "" : val;

  const parseNumField = (val: string) =>
    val === "" ? null : parseFloat(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isGrua ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do produto" : "Adicione um novo produto ao catálogo"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="codigo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl><Input placeholder="SGT3610TL" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome do produto" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Descrição do produto..." className="resize-none" rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* English fields for crane */}
            {isGrua && (
              <>
                <Separator />
                <h4 className="text-sm font-semibold text-primary">🌐 Nome e Descrição em Inglês</h4>
                <p className="text-xs text-muted-foreground">Usado automaticamente em propostas com idioma inglês / USD</p>

                <FormField control={form.control} name="nome_en" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (English)</FormLabel>
                    <FormControl><Input placeholder="Product name in English" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="descricao_en" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (English)</FormLabel>
                    <FormControl><Textarea placeholder="Product description in English..." className="resize-none" rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            <FormField control={form.control} name="descricao_tecnica" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição Técnica</FormLabel>
                <FormControl><Textarea placeholder="Descrição técnica detalhada do produto..." className="resize-none" rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="show_tech_desc_pdf" render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">
                  Exibir descrição técnica no PDF da proposta
                </FormLabel>
              </FormItem>
            )} />

            <FormField control={form.control} name="descricao_tecnica_en" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição Técnica (English)</FormLabel>
                <FormControl><Textarea placeholder="Technical product description in English..." className="resize-none" rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="unidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UN">UN</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="CJ">CJ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="international_price_brl" render={({ field }) => (
              <FormItem>
                <FormLabel>Preço Internacional (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Deixe vazio se não exportável"
                    value={field.value === null || field.value === undefined ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Usado como base em propostas internacionais (USD). Vazio = produto bloqueado para exportação.
                </p>
                <FormMessage />
              </FormItem>
            )} />

            {/* Crane default specs */}
            {isGrua && (
              <>
                <Separator />
                <h4 className="text-sm font-semibold text-primary">🏗️ Especificações Padrão da Grua</h4>
                <p className="text-xs text-muted-foreground">
                  Esses valores serão preenchidos automaticamente na proposta ao selecionar esta grua
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="default_lanca_m" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lança (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="Ex: 36"
                          value={numFieldValue(field.value)}
                          onChange={(e) => field.onChange(parseNumField(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="default_altura_torre_m" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura Torre (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="Ex: 27"
                          value={numFieldValue(field.value)}
                          onChange={(e) => field.onChange(parseNumField(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="default_carga_maxima_kg" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carga Máxima (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" placeholder="Ex: 6000"
                          value={numFieldValue(field.value)}
                          onChange={(e) => field.onChange(parseNumField(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="default_carga_ponta_kg" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carga na Ponta (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" placeholder="Ex: 1400"
                          value={numFieldValue(field.value)}
                          onChange={(e) => field.onChange(parseNumField(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="default_altura_trabalho_m" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura Trabalho (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="Ex: 30"
                          value={numFieldValue(field.value)}
                          onChange={(e) => field.onChange(parseNumField(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <Separator className="my-2" />
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Especificações técnicas padrão</h5>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="spec_tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl><Input placeholder="Ex: Torre ascensional" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="spec_vel_elevacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vel. Distribuição</FormLabel>
                      <FormControl><Input placeholder="Ex: MULT SPEED 2.5/58 m/min" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="spec_vel_rotacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vel. Rotação</FormLabel>
                      <FormControl><Input placeholder="Ex: 0 – 0,9 rpm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="spec_vel_translacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vel. Translação</FormLabel>
                      <FormControl><Input placeholder="Ex: 0 – 50 m/min" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="default_panel_voltage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tensão de Alimentação Padrão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "380"}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="220">220V</SelectItem>
                        <SelectItem value="380">380V</SelectItem>
                        <SelectItem value="440">440V</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Atualizar" : "Criar Produto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
