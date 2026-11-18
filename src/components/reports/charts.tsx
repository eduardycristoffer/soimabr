import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}>
            {asTable ? <BarChart3 className="mr-1 h-4 w-4" /> : <Table2 className="mr-1 h-4 w-4" />}
            <span className="hidden sm:inline">{asTable ? "Ver gráfico" : "Ver como tabela"}</span>
            <span className="sm:hidden">{asTable ? "Gráfico" : "Tabela"}</span>
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
                  interval="preserveStartEnd"
                  minTickGap={6}
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
                        <text x={p.x + p.width} y={p.y - 6} textAnchor="end" fontSize={11} fontWeight={600} fill={TEXT}
                          stroke="hsl(var(--card))" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">
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
              <li key={it.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(90px,150px)_1fr_auto] sm:gap-y-0">
                {/* celular: nome e valor na primeira linha, a barra embaixo; a partir de sm: tudo em uma linha */}
                <span className="order-1 min-w-0 truncate text-foreground sm:order-none" title={it.label}>{it.label}</span>
                <div className="order-3 col-span-2 flex h-3 items-center sm:order-none sm:col-span-1">
                  <div
                    className="h-3 rounded-r-[4px]"
                    style={{
                      width: `${Math.max((it.value / max) * 100, it.value > 0 ? 1.5 : 0)}%`,
                      background: SERIES,
                      opacity: ordinal ? ORDINAL_OPACITY[Math.min(idx, ORDINAL_OPACITY.length - 1)] : 1,
                    }}
                  />
                </div>
                <span className="order-2 min-w-[3.5rem] whitespace-nowrap text-right tabular-nums text-foreground sm:order-none">
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


// ───────────────────────── paletas validadas ─────────────────────────
// Conferidas com o validador de paleta (claro e escuro): diferença entre cores vizinhas segura
// para daltonismo e contraste mínimo de 3:1 contra o fundo. A ordem importa (cores vizinhas).
export const PALETTE = {
  /** rascunho, finalizada, cancelada */
  status: { draft: "#d97706", finalized: "#2563eb", cancelled: "#e11d48" },
  /** venda, locação, serviço */
  type: { venda: "#2563eb", locacao: "#ea580c", servico: "#0d9488" },
  /** assinado, aguardando assinatura, em preparo, cancelado */
  contract: { signed: "#15803d", sent: "#2563eb", preparing: "#d97706", cancelled: "#e11d48" },
  /** linhas do gráfico de evolução */
  trend: { created: "#2563eb", signed: "#15803d", closed: "#d97706" },
} as const;

export interface ChartSeries { key: string; label: string; color: string }

function LegendDots({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Cartão de gráfico com a opção "Ver como tabela" (todo gráfico tem a versão em tabela). */
function ChartFrame({ title, description, headers, rows, children }: {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? <BarChart3 className="mr-1 h-4 w-4" /> : <Table2 className="mr-1 h-4 w-4" />}
            <span className="hidden sm:inline">{asTable ? "Ver gráfico" : "Ver como tabela"}</span>
            <span className="sm:hidden">{asTable ? "Gráfico" : "Tabela"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {asTable ? (
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h, i) => (
                    <TableHead key={h} className={`h-8 ${i > 0 ? "text-right" : ""}`}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={String(r[0])}>
                    {r.map((c, i) => (
                      <TableCell key={i} className={`py-1.5 ${i > 0 ? "text-right tabular-nums" : ""}`}>{c}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

const tipBox = "rounded-lg border bg-card px-3 py-2 text-xs shadow-sm";

function SeriesTooltip({ active, payload, series }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={tipBox}>
      <div className="mb-1 text-muted-foreground">{payload[0].payload.label}</div>
      {series.map((s: ChartSeries) => {
        const row = payload.find((p: any) => p.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto pl-3 font-semibold text-foreground">{row ? row.value : 0}</span>
          </div>
        );
      })}
    </div>
  );
}

interface SeriesChartProps {
  title: string;
  description?: string;
  /** cada ponto tem `label` ("nov/26") e um número por série */
  data: Array<Record<string, string | number>>;
  series: ChartSeries[];
  /** o texto lido por leitores de tela */
  summary?: string;
}

const AXIS_TICK = { fill: TEXT_MUTED, fontSize: 11 };
const monthOnly = (l: string) => String(l).split("/")[0];

/** Evolução mês a mês: uma linha por série, com legenda e dicas ao passar o dedo/mouse. */
export function TrendChart({ title, description, data, series, summary }: SeriesChartProps) {
  return (
    <ChartFrame
      title={title}
      description={description}
      headers={["Mês", ...series.map((s) => s.label)]}
      rows={[...data].reverse().map((d) => [String(d.label), ...series.map((s) => Number(d[s.key]) || 0)])}
    >
      <LegendDots items={series} />
      <div className="h-[240px] sm:h-[260px]" role="img" aria-label={summary || title}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={8} tickFormatter={monthOnly} />
            <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} tick={AXIS_TICK} />
            <Tooltip cursor={{ stroke: GRID }} content={(p: any) => <SeriesTooltip {...p} series={series} />} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: s.color }} activeDot={{ r: 5 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

/** Colunas empilhadas por mês (ex.: propostas por situação). Cores separadas por um filete de 2px. */
export function StackedColumnChart({ title, description, data, series, summary }: SeriesChartProps) {
  return (
    <ChartFrame
      title={title}
      description={description}
      headers={["Mês", ...series.map((s) => s.label)]}
      rows={[...data].reverse().map((d) => [String(d.label), ...series.map((s) => Number(d[s.key]) || 0)])}
    >
      <LegendDots items={series} />
      <div className="h-[240px] sm:h-[260px]" role="img" aria-label={summary || title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={8} tickFormatter={monthOnly} />
            <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} tick={AXIS_TICK} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.6 }} content={(p: any) => <SeriesTooltip {...p} series={series} />} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} stackId="m" fill={s.color} stroke="hsl(var(--card))" strokeWidth={2} maxBarSize={26} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export interface DonutSlice { key: string; label: string; value: number; color: string }

interface DonutProps {
  title: string;
  description?: string;
  slices: DonutSlice[];
  /** texto embaixo do número no centro ("propostas") */
  centerLabel: string;
  empty?: string;
}

/** Rosca com o total no centro e a legenda (nome, quantidade e %) ao lado, ou embaixo no celular. */
export function DonutChart({ title, description, slices, centerLabel, empty }: DonutProps) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const shown = slices.filter((s) => s.value > 0);
  const summary = `${title}. ${slices.map((s) => `${s.label}: ${s.value}`).join("; ")}.`;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty || "Sem dados no período."}</p>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
            <div className="relative h-[168px] w-[168px] shrink-0" role="img" aria-label={summary}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={shown} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={shown.length > 1 ? 2 : 0} stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false}>
                    {shown.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) =>
                      active && payload?.length ? (
                        <div className={tipBox}>
                          <div className="text-muted-foreground">{payload[0].name}</div>
                          <div className="text-sm font-semibold text-foreground">{payload[0].value}</div>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{total}</span>
                <span className="text-xs text-muted-foreground">{centerLabel}</span>
              </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
              {slices.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="font-medium tabular-nums">{s.value}</span>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
