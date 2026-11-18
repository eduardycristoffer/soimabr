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
import { Plus, Search, FileText, Eye, MoreHorizontal, Download, Loader2, Clock, CheckCircle2, XCircle, Pencil, Copy, Trash2, FileSignature } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { QuoteStatus } from "@/types";
import QuoteWizard from "@/components/quotes/QuoteWizard";
import RentalWizard from "@/components/quotes/RentalWizard";
import QuoteTypeSelector from "@/components/quotes/QuoteTypeSelector";
import QuoteDetailModal from "@/components/quotes/QuoteDetailModal";
import GenerateContractDialog from "@/components/contracts/GenerateContractDialog";
import { QuoteAmount } from "@/components/quotes/QuoteAmount";
import { isUsdEstimateQuote } from "@/lib/quoteMoney";
import { useUsdBrlRate } from "@/hooks/useUsdBrlRate";
import SendProposalEmailDialog from "@/components/quotes/SendProposalEmailDialog";
import { useEmailIntegration } from "@/hooks/useEmailIntegration";
import { downloadQuotePdf } from "@/lib/quotePdf";
import { Mail, FileDown } from "lucide-react";
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
  const [contractQuoteId, setContractQuoteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emailQuoteId, setEmailQuoteId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const emailIntegration = useEmailIntegration();
  const emailAvailable = emailIntegration.dbReady && emailIntegration.deployed;

  // Baixa o arquivo PDF da proposta (o "Gerar PDF" abaixo só abre a página para imprimir)
  const handleDownloadPdf = async (quoteId: string) => {
    setDownloadingPdf(quoteId);
    try {
      const name = await downloadQuotePdf(quoteId);
      toast({ title: "PDF baixado", description: name });
    } catch (error: any) {
      toast({ title: "Erro ao baixar o PDF", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setDownloadingPdf(null);
    }
  };

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

      // Revision count per quote (each save creates a version snapshot)
      const quoteIds = data.map((q: any) => q.id);
      const revisions: Record<string, number> = {};
      if (quoteIds.length > 0) {
        const { data: versions } = await supabase
          .from("quote_versions")
          .select("quote_id, version_number")
          .in("quote_id", quoteIds);
        (versions || []).forEach((v: any) => {
          revisions[v.quote_id] = Math.max(revisions[v.quote_id] || 0, v.version_number);
        });
      }

      return data.map((q: any) => ({
        ...q,
        approver_name: q.discount_approved_by ? approverProfiles[q.discount_approved_by] || null : null,
        revision_count: revisions[q.id] || 0,
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

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  const formatDateTime = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));

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

  const handleEdit = (quoteId: string, quoteType?: string) => {
    setEditingQuoteId(quoteId);
    setWizardType(quoteType === "locacao" ? "locacao" : "venda");
    setWizardOpen(true);
  };

  const handleNew = () => {
    setEditingQuoteId(null);
    setDuplicatingQuoteId(null);
    setTypeSelectorOpen(true);
  };

  const handleTypeSelect = (type: "venda" | "locacao") => {
    setWizardType(type);
    setTypeSelectorOpen(false);
    setWizardOpen(true);
  };

  const handleDuplicate = (quoteId: string, quoteType?: string) => {
    setDuplicatingQuoteId(quoteId);
    setEditingQuoteId(null);
    setWizardType(quoteType === "locacao" ? "locacao" : "venda");
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
    if (wizardType === "locacao") {
      return <RentalWizard onClose={handleCloseWizard} editingQuoteId={editingQuoteId} duplicatingQuoteId={duplicatingQuoteId} />;
    }
    return <QuoteWizard onClose={handleCloseWizard} editingQuoteId={editingQuoteId} duplicatingQuoteId={duplicatingQuoteId} />;
  }

  const renderApprovalBadge = (quoteId: string, discountPercent: number, discountApproved: boolean) => {
    if (discountPercent <= 0) return null;
    const approvalStatus = getApprovalStatus(quoteId);

    if (approvalStatus === "pending") {
      return (
        <Badge variant="outline" className="text-[10px] status-badge-draft ml-1">
          <Clock className="h-2.5 w-2.5 mr-0.5" /> Aguardando
        </Badge>
      );
    }
    if (approvalStatus === "rejected") {
      return (
        <Badge variant="outline" className="text-[10px] status-badge-cancelled ml-1">
          <XCircle className="h-2.5 w-2.5 mr-0.5" /> Rejeitado
        </Badge>
      );
    }
    if (approvalStatus === "approved" || discountApproved) {
      return (
        <Badge variant="outline" className="text-[10px] status-badge-aprovado ml-1">
          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Aprovado
        </Badge>
      );
    }
    if (!discountApproved) {
      return (
        <Badge variant="outline" className="text-[10px] status-badge-draft ml-1">
          <Clock className="h-2.5 w-2.5 mr-0.5" /> Pendente
        </Badge>
      );
    }
    return null;
  };

  const filteredQuotes = statusFilter === "all" ? quotes : quotes?.filter((q) => q.status === statusFilter);

  // Propostas internacionais em USD são em R$: o dólar é só estimativa pela cotação de hoje.
  // A cotação só é buscada quando há alguma proposta assim na lista.
  const hasUsdEstimateQuotes = !!quotes?.some((q) => isUsdEstimateQuote(q as any));
  const { rate: liveUsdRate } = useUsdBrlRate(hasUsdEstimateQuotes);

  const renderQuoteActions = (quote: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setViewingQuoteId(quote.id)}>
          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
        </DropdownMenuItem>
        {(quote.status === "draft" || quote.status === "finalized") && (
          <DropdownMenuItem onClick={() => handleEdit(quote.id, (quote as any).quote_type)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
        )}
        {quote.status === "finalized" && (
          <>
            <DropdownMenuItem onClick={() => handleDuplicate(quote.id, (quote as any).quote_type)}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar como Rascunho
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setContractQuoteId(quote.id)}>
              <FileSignature className="mr-2 h-4 w-4" /> Gerar Contrato
            </DropdownMenuItem>
          </>
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
        {(quote.status === "finalized" || quote.status === "draft") && (
          <DropdownMenuItem
            onClick={() => handleDownloadPdf(quote.id)}
            disabled={downloadingPdf === quote.id}
          >
            {downloadingPdf === quote.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Baixar PDF
          </DropdownMenuItem>
        )}
        {quote.status === "finalized" && emailAvailable && (
          <DropdownMenuItem onClick={() => setEmailQuoteId(quote.id)}>
            <Mail className="mr-2 h-4 w-4" /> Enviar ao cliente
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
  );

  const renderQuoteBadges = (quote: any) => (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge variant={statusConfig[quote.status as QuoteStatus].variant} className={`status-badge-${quote.status}`}>
        {statusConfig[quote.status as QuoteStatus].label}
      </Badge>
      {(quote as any).revision_count > 0 && (
        <Badge variant="outline" className="text-[10px] status-badge-revision">
          rev. {(quote as any).revision_count}
        </Badge>
      )}
      {(quote as any).quote_type === "locacao" && (
        <Badge variant="outline" className="text-[10px] border-primary text-primary ml-1">Locação</Badge>
      )}
      {renderApprovalBadge(quote.id, quote.discount_percent, quote.discount_approved)}
      {quote.approver_name && (
        <span className="text-[10px] text-muted-foreground ml-1">
          por {quote.approver_name}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas Comerciais</h1>
          <p className="text-muted-foreground">Crie e gerencie propostas comerciais</p>
        </div>
        <Button onClick={handleNew} className="rounded-full self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-input"
            />
          </div>
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v)}
            className="justify-start w-full sm:w-auto bg-muted rounded-full p-1 gap-1 overflow-x-auto"
          >
            <ToggleGroupItem value="all" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Todas</ToggleGroupItem>
            <ToggleGroupItem value="draft" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Rascunho</ToggleGroupItem>
            <ToggleGroupItem value="finalized" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Finalizadas</ToggleGroupItem>
            <ToggleGroupItem value="cancelled" className="rounded-full px-4 h-9 text-sm data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground">Canceladas</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredQuotes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma proposta encontrada</h3>
               <p className="text-muted-foreground">Crie sua primeira proposta clicando no botão acima</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Alterado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes?.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-mono font-medium">{quote.quote_number}</TableCell>
                        <TableCell>{quote.clients?.nome_fantasia || quote.clients?.razao_social || "-"}</TableCell>
                        <TableCell>{quote.project_name || "-"}</TableCell>
                        <TableCell className="font-medium"><QuoteAmount value={quote.total} quote={quote as any} liveRate={liveUsdRate} /></TableCell>
                        <TableCell>{renderQuoteBadges(quote)}</TableCell>
                        <TableCell>{formatDate(quote.created_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime((quote as any).updated_at || quote.created_at)}
                        </TableCell>
                        <TableCell className="text-right">{renderQuoteActions(quote)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {filteredQuotes?.map((quote) => (
                  <div key={quote.id} className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono font-medium">{quote.quote_number}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {quote.clients?.nome_fantasia || quote.clients?.razao_social || "-"}
                        </p>
                      </div>
                      <div className="shrink-0 -mr-2 -mt-2">{renderQuoteActions(quote)}</div>
                    </div>
                    <div className="mt-3">{renderQuoteBadges(quote)}</div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <QuoteAmount className="font-medium" value={quote.total} quote={quote as any} liveRate={liveUsdRate} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime((quote as any).updated_at || quote.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <QuoteDetailModal
        quoteId={viewingQuoteId}
        open={!!viewingQuoteId}
        onClose={() => setViewingQuoteId(null)}
      />

      {contractQuoteId && (
        <GenerateContractDialog
          quoteId={contractQuoteId}
          open={!!contractQuoteId}
          onClose={() => setContractQuoteId(null)}
        />
      )}

      {emailQuoteId && (
        <SendProposalEmailDialog
          quoteId={emailQuoteId}
          open={!!emailQuoteId}
          onClose={() => setEmailQuoteId(null)}
        />
      )}

      <QuoteTypeSelector open={typeSelectorOpen} onSelect={handleTypeSelect} onClose={() => setTypeSelectorOpen(false)} />

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
