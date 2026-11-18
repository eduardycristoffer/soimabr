import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileSignature, Eye, Plus } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import SelectQuoteForContractDialog from "@/components/contracts/SelectQuoteForContractDialog";
import GenerateContractDialog from "@/components/contracts/GenerateContractDialog";
import { ContractFleetChip, useContractFleetMap } from "@/components/fleet/ContractFleetChip";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  em_revisao: { label: "Em revisão", variant: "outline" },
  aprovado: { label: "Aprovado", variant: "default" },
  sent: { label: "Enviado", variant: "outline" },
  signed: { label: "Assinado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Contratos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectOpen, setSelectOpen] = useState(false);
  const [generateForQuoteId, setGenerateForQuoteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts", search],
    queryFn: async () => {
      let q = supabase
        .from("contracts")
        .select("*, quotes(quote_number, quote_type, clients(razao_social, nome_fantasia))")
        .order("created_at", { ascending: false });
      if (search) q = q.ilike("contract_number", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const filteredContracts = statusFilter === "all" ? contracts : contracts?.filter((c: any) => c.status === statusFilter);
  // qual grua da frota atende cada contrato de locação (só aparece com a frota ativada)
  const fleet = useContractFleetMap((filteredContracts || []).map((c: any) => c.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contratos</h1>
          <p className="text-muted-foreground">Contratos gerados a partir de propostas finalizadas</p>
        </div>
        <Button onClick={() => setSelectOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Gerar Contrato
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v)}
            className="justify-start w-full sm:w-auto bg-muted rounded-full p-1 gap-1 overflow-x-auto"
          >
            <ToggleGroupItem value="all" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Todos</ToggleGroupItem>
            <ToggleGroupItem value="draft" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Rascunho</ToggleGroupItem>
            <ToggleGroupItem value="em_revisao" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Em revisão</ToggleGroupItem>
            <ToggleGroupItem value="sent" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Enviado</ToggleGroupItem>
            <ToggleGroupItem value="signed" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Assinado</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filteredContracts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileSignature className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground">Gere contratos a partir de propostas finalizadas.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Proposta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-medium">{c.contract_number}</TableCell>
                        <TableCell className="font-mono">{c.quotes?.quote_number}</TableCell>
                        <TableCell>{c.quotes?.clients?.nome_fantasia || c.quotes?.clients?.razao_social || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{c.quotes?.quote_type === "locacao" ? "Locação" : "Venda"}</Badge>
                            <ContractFleetChip enabled={fleet.enabled} isRental={c.quotes?.quote_type === "locacao"} codes={fleet.map[c.id]} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[c.status]?.variant} className={`status-badge-${c.status}`}>{statusConfig[c.status]?.label}</Badge>
                        </TableCell>
                        <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${c.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {filteredContracts?.map((c: any) => (
                  <div key={c.id} className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono font-medium">{c.contract_number}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {c.quotes?.clients?.nome_fantasia || c.quotes?.clients?.razao_social || "-"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 -mr-2 -mt-2" onClick={() => navigate(`/contratos/${c.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-1 flex-wrap">
                      <Badge variant={statusConfig[c.status]?.variant} className={`status-badge-${c.status}`}>{statusConfig[c.status]?.label}</Badge>
                      <Badge variant="outline">{c.quotes?.quote_type === "locacao" ? "Locação" : "Venda"}</Badge>
                      <ContractFleetChip enabled={fleet.enabled} isRental={c.quotes?.quote_type === "locacao"} codes={fleet.map[c.id]} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{c.quotes?.quote_number}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SelectQuoteForContractDialog
        open={selectOpen}
        onClose={() => setSelectOpen(false)}
        onSelect={(qid) => { setSelectOpen(false); setGenerateForQuoteId(qid); }}
      />
      {generateForQuoteId && (
        <GenerateContractDialog
          quoteId={generateForQuoteId}
          open={!!generateForQuoteId}
          onClose={() => setGenerateForQuoteId(null)}
        />
      )}
    </div>
  );
}
