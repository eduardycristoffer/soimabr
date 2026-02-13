import { useState, useMemo } from "react";
import { LeadWithStage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  leads: LeadWithStage[];
  filter: "all" | "lead" | "proposal";
  onCardClick: (lead: LeadWithStage) => void;
}

type SortKey = "title" | "company_name" | "contact_name" | "stage" | "source" | "estimated_value" | "created_at";

export default function PipelineLeadList({ leads, filter, onCardClick }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    let list = leads;

    if (filter === "lead") {
      list = list.filter((l) => !l.quote_id);
    } else if (filter === "proposal") {
      list = list.filter((l) => !!l.quote_id);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.company_name?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.contact_email?.toLowerCase().includes(q) ||
          l.contact_phone?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortKey) {
        case "title": valA = a.title || ""; valB = b.title || ""; break;
        case "company_name": valA = a.company_name || ""; valB = b.company_name || ""; break;
        case "contact_name": valA = a.contact_name || ""; valB = b.contact_name || ""; break;
        case "stage": valA = a.pipeline_stages?.name || ""; valB = b.pipeline_stages?.name || ""; break;
        case "source": valA = a.source || ""; valB = b.source || ""; break;
        case "estimated_value": valA = a.estimated_value || 0; valB = b.estimated_value || 0; break;
        case "created_at": valA = a.created_at || ""; valB = b.created_at || ""; break;
        default: valA = ""; valB = "";
      }
      if (typeof valA === "number") return sortAsc ? valA - valB : valB - valA;
      return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    return list;
  }, [leads, filter, search, sortKey, sortAsc]);

  const getStatusBadge = (lead: LeadWithStage) => {
    if (lead.is_converted) return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Convertido</Badge>;
    if (lead.quote_id) return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Proposta</Badge>;
    return <Badge variant="outline">Lead</Badge>;
  };

  const sourceLabels: Record<string, string> = {
    manual: "Manual",
    indicacao: "Indicação",
    website: "Website",
    webhook: "Webhook",
    proposal_direct: "Proposta",
  };

  const SortHeader = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(sortField)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, empresa, contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Título" sortField="title" />
              <SortHeader label="Empresa" sortField="company_name" />
              <SortHeader label="Contato" sortField="contact_name" />
              <SortHeader label="Etapa" sortField="stage" />
              <SortHeader label="Origem" sortField="source" />
              <SortHeader label="Valor Estimado" sortField="estimated_value" />
              <SortHeader label="Data" sortField="created_at" />
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onCardClick(lead)}
                >
                  <TableCell className="font-medium">{lead.title}</TableCell>
                  <TableCell>{lead.company_name || "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {lead.contact_name && <div>{lead.contact_name}</div>}
                      {lead.contact_email && <div className="text-muted-foreground text-xs">{lead.contact_email}</div>}
                      {lead.contact_phone && <div className="text-muted-foreground text-xs">{lead.contact_phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.pipeline_stages && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: lead.pipeline_stages.color,
                          color: lead.pipeline_stages.color,
                        }}
                      >
                        {lead.pipeline_stages.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{sourceLabels[lead.source] || lead.source}</span>
                  </TableCell>
                  <TableCell>
                    {lead.estimated_value
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.estimated_value)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{getStatusBadge(lead)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} lead{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
