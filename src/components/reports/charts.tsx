import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Table2 } from "lucide-react";

/*
 * Visualizações do relatório. Regras seguidas (guia de dataviz):
 *  - UMA cor por gráfico (a cor primária do tema): a série é uma só, então não há legenda;
 *  - colunas finas (até 24px), ponta de dados com 4px arredondados e base reta;
 *  - grade e eixos em hairline sólido, discretos (nunca tracejado);
 *  - valor escrito só na barra mais recente; o resto vem pelo eixo, tooltip e tabela;
 *  - texto sempre em cores de texto do tema, nunca na cor da série;
 *  - área de hover = a faixa inteira da coluna (maior que a barra);
 *  - todo gráfico tem a versão em tabela ("Ver como tabela").
 */

const SERIES = "hsl(var(--primary))";
const GRID = "hsl(var(--border))";
const TEXT_MUTED = "hsl(var(--muted-foreground))";
const TEXT = "hsl(var(--foreground))";

export interface ColumnPoint { label: string; value: number }

interface ColumnChartProps {
  title: string;
  description?: string;
  data: ColumnPoint[];
  /** Formata o valor (tooltip, rótulo e tabela) */
  format: (n: number) => string;
  /** Formata os números do eixo vertical (padrão: igual a `format`) */
  axisFormat?: (n: number) => string;
  /** Título da coluna de valores na tabela */
  valueHeader: string;
  integer?: boolean;
}

export function ColumnChart({ title, description, data, format, axisFormat, valueHeader, integer }: ColumnChartProps) {
  const [asTable, setAsTable] = useState(false);
  const last = data.length - 1;
  const latest = data[last];
  const summary = latest ? `${title}. Mês mais recente, ${latest.label}: ${format(latest.value)}.` : title;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}>
            {asTable ? <BarChart3 className="h-4 w-4 mr-1" /> : <Table2 className="h-4 w-4 mr-1" />}
            {asTable ? "Ver gráfico" : "Ver como tabela"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {asTable ? (
          <div className="h-[260px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8">Mês</TableHead>
                  <TableHead className="h-8 text-right">{valueHeader}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data].reverse().map((d) => (
                  <TableRow key={d.label}>
                    <TableCell className="py-1.5">{d.label}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{format(d.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[260px]" role="img" aria-label={summary}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 22, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                {/* No eixo só o mês ("nov"); o ano completo ("nov/26") vem no tooltip e na tabela.
                    12 rótulos com ano não cabem lado a lado e se sobrepõem. */}
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                  interval={0}
                  tickFormatter={(l: string) => String(l).split("/")[0]}
                />
                <YAxis
                  width={integer ? 28 : 56}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={!integer}
                  tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                  tickFormatter={axisFormat || format}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.6 }}
                  content={({ active, payload }: any) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                        <div className="text-muted-foreground">{payload[0].payload.label}</div>
                        <div className="text-sm font-semibold text-foreground">{format(payload[0].value)}</div>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                  {/* só a coluna mais recente leva o valor escrito */}
                  <LabelList
                    dataKey="value"
                    content={(p: any) =>
                      p.index === last ? (
                        <text x={p.x + p.width / 2} y={p.y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={TEXT}>
                          {format(p.value)}
                        </text>
                      ) : null
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface HBarItem { label: string; value: number; display?: string; hint?: string }

interface HBarListProps {
  title: string;
  description?: string;
  items: HBarItem[];
  /** Etapas ordenadas (funil): a mesma cor em degraus de intensidade */
  ordinal?: boolean;
  empty?: string;
}

// Degraus da cor do tema para etapas ordenadas. Nunca abaixo de 0,5: a etapa mais clara
// precisa seguir visível contra a superfície (mínimo de 2:1 de contraste).
const ORDINAL_OPACITY = [1, 0.8, 0.65, 0.5];

/** Barras horizontais ranqueadas: uma cor, valor na ponta, base reta e ponta arredondada. */
export function HBarList({ title, description, items, ordinal, empty }: HBarListProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {items.length === 0 || items.every((i) => i.value === 0) ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{empty || "Sem dados no período."}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((it, idx) => (
              <li key={it.label} className="grid grid-cols-[minmax(90px,150px)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate text-foreground" title={it.label}>{it.label}</span>
                <div className="h-3 flex items-center">
                  <div
                    className="h-3 rounded-r-[4px]"
                    style={{
                      width: `${Math.max((it.value / max) * 100, it.value > 0 ? 1.5 : 0)}%`,
                      background: SERIES,
                      opacity: ordinal ? ORDINAL_OPACITY[Math.min(idx, ORDINAL_OPACITY.length - 1)] : 1,
                    }}
                  />
                </div>
                <span className="tabular-nums text-foreground text-right min-w-[3.5rem]">
                  {it.display ?? it.value}
                  {it.hint && <span className="block text-[11px] text-muted-foreground">{it.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}

/** Cartão de um número só: rótulo, valor e uma nota curta. */
export function StatTile({ label, value, hint, icon }: StatTileProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
