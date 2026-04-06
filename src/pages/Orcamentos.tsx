import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, FileText, Eye, MoreHorizontal, Download, Loader2, Clock, CheckCircle2, XCircle, Pencil, Copy, Trash2 } from "lucide-react";
import { QuoteStatus } from "@/types";
import QuoteWizard from "@/components/quotes/QuoteWizard";
import RentalWizard from "@/components/quotes/RentalWizard";
import QuoteTypeSelector from "@/components/quotes/QuoteTypeSelector";
import QuoteDetailModal from "@/components/quotes/QuoteDetailModal";
const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Orcamentos() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<"venda" | "locacao">("venda");
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [duplicatingQuoteId, setDuplicatingQuoteId] = useState<string | null>(null);
  const [viewingQuoteId, setViewingQuoteId] = useState<string | null>(null);
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

      const approverIds = [...new Set(data.filter((q: any) => q.discount_approved_by).map((q: any) => q.discount_approved_by))];
      let approverProfiles: Record<string, string> = {};
      if (approverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_directory")
          .select("user_id, name")
          .in("user_id", approverIds);
        if (profiles) {
          approverProfiles = Object.fromEntries(profiles.map((p) => [p.user_id, p.name]));
        }
      }

      return data.map((q: any) => ({
        ...q,
        approver_name: q.discount_approved_by ? approverProfiles[q.discount_approved_by] || null : null,
      }));
    },
  });

  const { data: approvalRequests } = useQuery({
    queryKey: ["discount-approvals-for-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_approval_requests")
        .select("quote_id, status")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getApprovalStatus = (quoteId: string) => {
    const req = approvalRequests?.find((r) => r.quote_id === quoteId);
    return req?.status || null;
  };

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

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }

      toast({ title: "PDF gerado!", description: `Proposta ${quote_number} pronta para impressão` });
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

  const handleEdit = (quoteId: string) => {
    setEditingQuoteId(quoteId);
    setWizardOpen(true);
  };

  const handleNew = () => {
    setEditingQuoteId(null);
    setDuplicatingQuoteId(null);
    setWizardOpen(true);
  };

  const handleDuplicate = (quoteId: string) => {
    setDuplicatingQuoteId(quoteId);
    setEditingQuoteId(null);
    setWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setWizardOpen(false);
    setEditingQuoteId(null);
    setDuplicatingQuoteId(null);
  };

  const handleDeleteQuote = async () => {
    if (!deletingQuoteId) return;
    try {
      await supabase.from("quote_items").delete().eq("quote_id", deletingQuoteId);
      await supabase.from("quote_versions").delete().eq("quote_id", deletingQuoteId);
      await supabase.from("discount_approval_requests").delete().eq("quote_id", deletingQuoteId);
      const { error } = await supabase.from("quotes").delete().eq("id", deletingQuoteId).eq("status", "draft");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Proposta excluída com sucesso" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir proposta", description: error.message, variant: "destructive" });
    } finally {
      setDeletingQuoteId(null);
    }
  };

  if (wizardOpen) {
    return <QuoteWizard onClose={handleCloseWizard} editingQuoteId={editingQuoteId} duplicatingQuoteId={duplicatingQuoteId} />;
  }

  const renderApprovalBadge = (quoteId: string, discountPercent: number, discountApproved: boolean) => {
    if (discountPercent <= 0) return null;
    const approvalStatus = getApprovalStatus(quoteId);

    if (approvalStatus === "pending") {
      return (
        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 ml-1">
          <Clock className="h-2.5 w-2.5 mr-0.5" /> Aguardando
        </Badge>
      );
    }
    if (approvalStatus === "rejected") {
      return (
        <Badge variant="outline" className="text-[10px] border-destructive text-destructive ml-1">
          <XCircle className="h-2.5 w-2.5 mr-0.5" /> Rejeitado
        </Badge>
      );
    }
    if (approvalStatus === "approved" || discountApproved) {
      return (
        <Badge variant="outline" className="text-[10px] border-green-300 text-green-600 ml-1">
          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Aprovado
        </Badge>
      );
    }
    if (!discountApproved) {
      return (
        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 ml-1">
          <Clock className="h-2.5 w-2.5 mr-0.5" /> Pendente
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas Comerciais</h1>
          <p className="text-muted-foreground">Crie e gerencie propostas comerciais</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Proposta
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
              <h3 className="mt-4 text-lg font-semibold">Nenhuma proposta encontrada</h3>
               <p className="text-muted-foreground">Crie sua primeira proposta clicando no botão acima</p>
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
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant={statusConfig[quote.status as QuoteStatus].variant}>
                          {statusConfig[quote.status as QuoteStatus].label}
                        </Badge>
                        {renderApprovalBadge(quote.id, quote.discount_percent, quote.discount_approved)}
                        {quote.approver_name && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            por {quote.approver_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingQuoteId(quote.id)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                          </DropdownMenuItem>
                          {quote.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(quote.id)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {quote.status === "finalized" && (
                            <DropdownMenuItem onClick={() => handleDuplicate(quote.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicar como Rascunho
                            </DropdownMenuItem>
                          )}
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
                          {quote.status === "draft" && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingQuoteId(quote.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
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

      <QuoteDetailModal
        quoteId={viewingQuoteId}
        open={!!viewingQuoteId}
        onClose={() => setViewingQuoteId(null)}
      />

      <AlertDialog open={!!deletingQuoteId} onOpenChange={(open) => !open && setDeletingQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
