import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, FileText, Eye, MoreHorizontal, Download, Loader2 } from "lucide-react";
import { QuoteStatus } from "@/types";
import QuoteWizard from "@/components/quotes/QuoteWizard";

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Orcamentos() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes", search],
    queryFn: async () => {
      let query = supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia)")
        .order("created_at", { ascending: false });
      if (search) {
        query = query.or(`quote_number.ilike.%${search}%,project_name.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number, currency: string = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  const handleGeneratePdf = async (quoteId: string) => {
    setGeneratingPdf(quoteId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("generate-pdf", {
        body: { quoteId },
      });

      if (response.error) throw response.error;

      const { html, quote_number } = response.data;

      // Open in new window for printing/saving as PDF
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Auto-trigger print dialog after a short delay
        setTimeout(() => printWindow.print(), 500);
      }

      toast({ title: "PDF gerado!", description: `Orçamento ${quote_number} pronto para impressão` });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  if (wizardOpen) {
    return <QuoteWizard onClose={() => setWizardOpen(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Crie e gerencie propostas comerciais</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : quotes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground">Crie seu primeiro orçamento clicando no botão acima</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.clients?.nome_fantasia || quote.clients?.razao_social || "-"}</TableCell>
                    <TableCell>{quote.project_name || "-"}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(quote.total, quote.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[quote.status as QuoteStatus].variant}>
                        {statusConfig[quote.status as QuoteStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                          </DropdownMenuItem>
                          {(quote.status === "finalized" || quote.status === "draft") && (
                            <DropdownMenuItem
                              onClick={() => handleGeneratePdf(quote.id)}
                              disabled={generatingPdf === quote.id}
                            >
                              {generatingPdf === quote.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              Gerar PDF
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
