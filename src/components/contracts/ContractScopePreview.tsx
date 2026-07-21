import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye } from "lucide-react";
import {
  itensInclusosTabela,
  itensInclusosExtenso,
  especificacoesGruaExtenso,
  stripHtmlSentinels,
} from "@/lib/contractPlaceholders";

interface Props {
  quoteId: string;
}

export function ContractScopePreview({ quoteId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["contract-scope-preview", quoteId],
    queryFn: async () => {
      const [{ data: quote }, { data: items }] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", quoteId).single(),
        supabase
          .from("quote_items")
          .select("*, products(descricao, descricao_tecnica)")
          .eq("quote_id", quoteId)
          .order("order_index"),
      ]);
      return { quote, items: items || [] };
    },
    enabled: !!quoteId,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando pré-visualização do escopo…
        </CardContent>
      </Card>
    );
  }

  const tabelaHtml = stripHtmlSentinels(itensInclusosTabela(data.items));
  const extensoItens = itensInclusosExtenso(data.items);
  const extensoGrua = especificacoesGruaExtenso(data.quote, data.items);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" /> Pré-visualização do escopo
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Prévia de como a tabela e a versão por extenso aparecerão no PDF final.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-2">Tabela de itens inclusos</h4>
          <div
            className="scope-preview text-sm"
            dangerouslySetInnerHTML={{ __html: tabelaHtml }}
          />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Descrição por extenso dos itens</h4>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {extensoItens}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Especificações da grua por extenso</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {extensoGrua}
          </p>
        </div>
      </CardContent>

      <style>{`
        .scope-preview table.scope-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .scope-preview .scope-table th,
        .scope-preview .scope-table td {
          border: 1px solid hsl(var(--border));
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        .scope-preview .scope-table thead th {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          font-weight: 600;
        }
        .scope-preview .scope-table tr.cat-row td {
          background: hsl(var(--muted));
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.02em;
        }
        .scope-preview .scope-table tbody tr:nth-child(even):not(.cat-row) {
          background: hsl(var(--muted) / 0.35);
        }
        .scope-preview .c-idx { width: 32px; text-align: center; }
        .scope-preview .c-cod { width: 100px; font-family: ui-monospace, monospace; font-size: 0.75rem; }
        .scope-preview .c-qtd { width: 48px; text-align: center; }
        .scope-preview .item-notes,
        .scope-preview .item-specs,
        .scope-preview .item-commercial-desc,
        .scope-preview .item-tech-desc {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin-top: 2px;
        }
        .scope-preview .item-tech-desc {
          white-space: pre-wrap;
        }
      `}</style>
    </Card>
  );
}
