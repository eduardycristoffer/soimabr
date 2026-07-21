import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Download, Send, Upload, Loader2, Lock } from "lucide-react";

const statusLabel: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", signed: "Assinado", cancelled: "Cancelado",
};

export default function ContratoEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts")
        .select("*, quotes(quote_number, quote_type, clients(razao_social, nome_fantasia))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: snapshots, refetch: refetchSnapshots } = useQuery({
    queryKey: ["contract-snapshots", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_clause_snapshots")
        .select("*").eq("contract_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLocked = contract?.status === "signed" || contract?.status === "cancelled";

  const updateClause = useMutation({
    mutationFn: async ({ snapshotId, body, title }: { snapshotId: string; body?: string; title?: string }) => {
      const patch: any = { edited_at: new Date().toISOString() };
      if (body !== undefined) patch.body = body;
      if (title !== undefined) patch.title = title;
      const { error } = await supabase.from("contract_clause_snapshots").update(patch).eq("id", snapshotId);
      if (error) throw error;
    },
    onSuccess: () => refetchSnapshots(),
  });

  const reorderClause = async (idx: number, dir: -1 | 1) => {
    if (!snapshots) return;
    const target = snapshots[idx + dir];
    if (!target) return;
    const a = snapshots[idx];
    await supabase.from("contract_clause_snapshots").update({ order_index: target.order_index }).eq("id", a.id);
    await supabase.from("contract_clause_snapshots").update({ order_index: a.order_index }).eq("id", target.id);
    refetchSnapshots();
  };

  const addClause = async () => {
    if (!snapshots) return;
    const maxOrder = Math.max(0, ...snapshots.map((s) => s.order_index));
    const { error } = await supabase.from("contract_clause_snapshots").insert({
      contract_id: id!,
      order_index: maxOrder + 1,
      title: "Nova cláusula",
      body: "Conteúdo da cláusula",
      is_core: false,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    refetchSnapshots();
  };

  const removeClause = async (snapId: string, isCore: boolean) => {
    if (isCore) { toast({ title: "Cláusula núcleo não pode ser removida" }); return; }
    if (!confirm("Remover esta cláusula?")) return;
    await supabase.from("contract_clause_snapshots").delete().eq("id", snapId);
    refetchSnapshots();
  };

  const saveContractFields = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("contracts").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contract", id] }); toast({ title: "Salvo" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract-pdf", { body: { contractId: id } });
      if (error) throw error;
      const w = window.open("", "_blank");
      if (w) { w.document.write(data.html); w.document.close(); }
      toast({ title: "PDF gerado" });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally { setGeneratingPdf(false); }
  };

  const markAsSent = () =>
    saveContractFields.mutate({ status: "sent", sent_at: new Date().toISOString() });

  const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${id}/signed-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("contracts").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      await saveContractFields.mutateAsync({
        signed_pdf_url: path,
        signed_at: new Date().toISOString(),
        status: "signed",
      });
      toast({ title: "PDF assinado anexado" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  if (isLoading || !contract) return <div className="p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {contract.contract_number}
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </h1>
          <p className="text-sm text-muted-foreground">
            Proposta {(contract as any).quotes?.quote_number} · {(contract as any).quotes?.clients?.nome_fantasia || (contract as any).quotes?.clients?.razao_social}
          </p>
        </div>
        <Badge>{statusLabel[contract.status]}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
          {generatingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Gerar PDF
        </Button>
        {contract.status === "draft" && (
          <Button variant="outline" onClick={markAsSent}>
            <Send className="h-4 w-4 mr-2" /> Marcar como enviado
          </Button>
        )}
        {contract.status !== "signed" && (
          <label>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleUploadSigned} disabled={uploading} />
            <Button variant="default" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Anexar PDF assinado
              </span>
            </Button>
          </label>
        )}
        {contract.signed_pdf_url && (
          <Button variant="ghost" onClick={async () => {
            const { data } = await supabase.storage.from("contracts").createSignedUrl(contract.signed_pdf_url!, 60);
            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
          }}>Baixar assinado</Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Representantes e Gestores</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {[
            ["Rep. Vendedora — nome", "seller_rep_name"],
            ["Rep. Vendedora — CPF", "seller_rep_cpf"],
            ["Rep. Compradora — nome", "buyer_rep_name"],
            ["Rep. Compradora — CPF", "buyer_rep_cpf"],
            ["Gestor Vendedora — nome", "seller_manager_name"],
            ["Gestor Vendedora — e-mail", "seller_manager_email"],
            ["Gestor Compradora — nome", "buyer_manager_name"],
            ["Gestor Compradora — e-mail", "buyer_manager_email"],
          ].map(([label, key]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                defaultValue={(contract as any)[key] || ""}
                disabled={isLocked}
                onBlur={(e) => {
                  if (e.target.value !== (contract as any)[key]) {
                    saveContractFields.mutate({ [key]: e.target.value || null });
                  }
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <SignatoriesEditor contractId={id!} isLocked={isLocked} />
      <WitnessesEditor contractId={id!} isLocked={isLocked} />



      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cláusulas</h2>
        {!isLocked && (
          <Button size="sm" variant="outline" onClick={addClause}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar cláusula
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {snapshots?.map((s, idx) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-8">{idx === 0 ? "—" : idx}</span>
                <Input
                  defaultValue={s.title}
                  disabled={isLocked}
                  onBlur={(e) => e.target.value !== s.title && updateClause.mutate({ snapshotId: s.id, title: e.target.value })}
                  className="font-semibold"
                />
                {s.is_core && <Badge variant="outline" className="text-[10px]">núcleo</Badge>}
                {!isLocked && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => reorderClause(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => reorderClause(idx, 1)} disabled={idx === (snapshots.length - 1)}><ArrowDown className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeClause(s.id, s.is_core)} disabled={s.is_core}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                defaultValue={s.body}
                disabled={isLocked}
                rows={Math.min(20, Math.max(4, s.body.split("\n").length))}
                onBlur={(e) => e.target.value !== s.body && updateClause.mutate({ snapshotId: s.id, body: e.target.value })}
                className="font-mono text-xs"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
