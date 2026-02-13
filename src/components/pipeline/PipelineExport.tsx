import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PipelineStage } from "@/types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  stages: PipelineStage[];
}

export default function PipelineExport({ stages }: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const handleExport = async () => {
    try {
      let query = supabase
        .from("leads")
        .select("*, pipeline_stages(name)")
        .order("created_at", { ascending: false });

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
      if (filterStage !== "all") query = query.eq("stage_id", filterStage);
      if (filterSource !== "all") query = query.eq("source", filterSource);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Nenhum lead encontrado com os filtros selecionados");
        return;
      }

      const rows = data.map((lead: any) => ({
        Nome: lead.title,
        "E-mail": lead.contact_email || "",
        Telefone: lead.contact_phone || "",
        Empresa: lead.company_name || "",
        Contato: lead.contact_name || "",
        Etapa: lead.pipeline_stages?.name || "",
        Origem: lead.source || "",
        "Data de Criação": new Date(lead.created_at).toLocaleDateString("pt-BR"),
        "Valor Estimado": lead.estimated_value || 0,
        Convertido: lead.is_converted ? "Sim" : "Não",
      }));

      if (exportFormat === "csv") {
        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(","),
          ...rows.map((row: any) =>
            headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, "leads-export.csv");
      } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        XLSX.writeFile(wb, "leads-export.xlsx");
      }

      toast.success("Exportação concluída");
      setFilterOpen(false);
    } catch (err: any) {
      toast.error("Erro na exportação: " + err.message);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setExportFormat("csv"); setFilterOpen(true); }}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setExportFormat("xlsx"); setFilterOpen(true); }}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros de Exportação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data início</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>Data fim</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Etapa</Label>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterOpen(false)}>Cancelar</Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
