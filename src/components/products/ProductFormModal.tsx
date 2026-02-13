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
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  codigo: z.string().trim().min(1, "Código é obrigatório").max(50),
  nome: z.string().trim().min(2, "Nome é obrigatório").max(200),
  descricao: z.string().trim().max(1000).optional().or(z.literal("")),
  descricao_tecnica: z.string().trim().max(5000).optional().or(z.literal("")),
  show_tech_desc_pdf: z.boolean(),
  categoria: z.enum(["grua", "configuracao", "torre", "tramo", "chassis", "acessorio"]),
  unidade: z.string().trim().min(1, "Unidade é obrigatória").max(10),
  preco: z.coerce.number().min(0, "Preço não pode ser negativo"),
  international_price_brl: z.coerce.number().min(0, "Preço não pode ser negativo").nullable().optional(),
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

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(product));
    }
  }, [open, product]);

  function getDefaults(p?: Product | null): ProductFormData {
    if (p) {
      return {
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao || "",
        descricao_tecnica: (p as any).descricao_tecnica || "",
        show_tech_desc_pdf: (p as any).show_tech_desc_pdf ?? false,
        categoria: p.categoria,
        unidade: p.unidade,
        preco: p.preco,
        international_price_brl: (p as any).international_price_brl ?? null,
      };
    }
    return {
      codigo: "",
      nome: "",
      descricao: "",
      descricao_tecnica: "",
      show_tech_desc_pdf: false,
      categoria: "acessorio",
      unidade: "UN",
      preco: 0,
      international_price_brl: null,
    };
  }

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        descricao_tecnica: data.descricao_tecnica || null,
        show_tech_desc_pdf: data.show_tech_desc_pdf,
        categoria: data.categoria,
        unidade: data.unidade,
        preco: data.preco,
        needs_review: data.preco === 0,
        international_price_brl: data.international_price_brl ?? null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([payload]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
