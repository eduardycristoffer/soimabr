import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Globe, Check, Plus } from "lucide-react";
import ClientFormModal from "@/components/clients/ClientFormModal";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
}

export default function StepClient({ data, updateData, onNext }: Props) {
  const [search, setSearch] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-select", search],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("id, razao_social, nome_fantasia, cnpj, tax_id, client_type, cidade, estado, pais")
        .eq("is_active", true)
        .order("razao_social")
        .limit(20);
      if (search) {
        q = q.or(`razao_social.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const selectClient = (client: any) => {
    updateData({
      client_id: client.id,
      client_name: client.nome_fantasia || client.razao_social,
      client_type: client.client_type || "nacional",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
        ) : clients?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente encontrado</p>
        ) : (
          clients?.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                data.client_id === c.id ? "border-primary bg-accent/30" : ""
              }`}
              onClick={() => selectClient(c)}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{c.razao_social}</p>
                    {c.nome_fantasia && (
                      <p className="text-xs text-muted-foreground">{c.nome_fantasia}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {c.cnpj || c.tax_id || ""}{" "}
                      {c.cidade && c.estado ? `· ${c.cidade}/${c.estado}` : c.pais !== "Brasil" ? `· ${c.pais}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.client_type === "nacional" ? "default" : "secondary"} className="text-xs">
                    {c.client_type === "nacional" ? <Building2 className="mr-1 h-3 w-3" /> : <Globe className="mr-1 h-3 w-3" />}
                    {c.client_type === "nacional" ? "Nacional" : "Internacional"}
                  </Badge>
                  {data.client_id === c.id && <Check className="h-5 w-5 text-primary" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!data.client_id}>
          Próximo
        </Button>
      </div>
    </div>
  );
}
