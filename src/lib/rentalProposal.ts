/**
 * Proposta de locação de grua no modelo "quadro de preços por equipamento":
 *  - quadro resumo com os custos SEPARADOS em dois blocos — locação de bens móveis (EBL) e serviços de
 *    mão-de-obra (CMO) —, cada linha com quantidade, unidade, valor unitário e total;
 *  - linha sem valor NÃO aparece na proposta; qualquer linha pode ser desmarcada; dá para acrescentar linhas livres;
 *  - textos de condições (seguro, manutenção corretiva, compromissos, medição, prazos, jornada...) editáveis.
 *
 * Guardado na própria tabela `quotes` (quote_type = 'locacao'):
 *  - linhas visíveis → `quote_items` (com `unit`), para relatórios, contrato e PDF;
 *  - estado completo do quadro + textos → `quotes.service_data` (JSON com kind = "locacao");
 *  - colunas antigas `rental_*` continuam preenchidas (contrato, frota e relatórios dependem delas).
 *
 * Tudo aqui é função pura (sem banco), por isso é testado à parte.
 */

export const RENTAL_UNITS = ["Mês", "Hora", "Vb", "Metro", "Dia", "Un"] as const;

export type LineGroup = "ebl" | "cmo" | "night17" | "night22";

export const GROUP_TITLE: Record<LineGroup, string> = {
  ebl: "Locação de bens móveis",
  cmo: "Serviços de mão-de-obra",
  night17: "Manutenção corretiva após as 17:00 e até as 22:00",
  night22: "Manutenção corretiva após as 22:00 e até as 6:00",
};

export interface RentalLine {
  /** só para a tela (chave do React); não vai para o banco */
  id: string;
  /** linha-padrão do modelo (null = linha livre acrescentada pelo usuário) */
  key: string | null;
  group: LineGroup;
  description: string;
  unit: string;
  quantity: number;
  /** a quantidade acompanha o prazo da locação (linhas mensais) */
  follows_months: boolean;
  unit_price: number;
  /** desmarcada = não aparece na proposta */
  enabled: boolean;
  note: string;
}

interface CatalogEntry {
  key: string;
  group: LineGroup;
  description: string;
  unit: string;
  quantity: number;
  follows_months: boolean;
  enabled: boolean;
  category: string;
}

/** Linhas do modelo. Todas começam SEM preço: quem faz a proposta define. */
export const LINE_CATALOG: CatalogEntry[] = [
  { key: "rent", group: "ebl", description: "Locação mensal do equipamento (mínimo 44 horas semanais - por turno)", unit: "Mês", quantity: 0, follows_months: true, enabled: true, category: "servico" },
  { key: "extra_hour", group: "ebl", description: "Hora adicional do equipamento (acima de 44 horas semanais - por turno)", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "servico" },
  { key: "bucket", group: "ebl", description: "Caçamba de 750 litros", unit: "Mês", quantity: 0, follows_months: true, enabled: false, category: "acessorio" },
  { key: "insurance", group: "ebl", description: "Seguro de riscos diversos (RD)", unit: "Mês", quantity: 0, follows_months: true, enabled: false, category: "servico" },

  { key: "assembly", group: "cmo", description: "Montagem (com auxílio de guindaste fornecido pela contratante)", unit: "Vb", quantity: 1, follows_months: false, enabled: true, category: "montagem" },
  { key: "disassembly", group: "cmo", description: "Desmontagem (com auxílio de guindaste fornecido pela contratante)", unit: "Vb", quantity: 1, follows_months: false, enabled: true, category: "montagem" },
  { key: "anchoring", group: "cmo", description: "Ancoragem convencional até 3 metros (estimado)", unit: "Vb", quantity: 0, follows_months: false, enabled: false, category: "montagem" },
  { key: "telescoping", group: "cmo", description: "Telescopagem por evento (estimado)", unit: "Metro", quantity: 0, follows_months: false, enabled: false, category: "montagem" },
  { key: "led", group: "cmo", description: "Iluminação decorativa em LED (opcional)", unit: "Vb", quantity: 0, follows_months: false, enabled: false, category: "acessorio" },
  { key: "mobilization", group: "cmo", description: "Custo para mobilização (entrega)", unit: "Vb", quantity: 1, follows_months: false, enabled: true, category: "transporte" },
  { key: "demobilization", group: "cmo", description: "Custo para desmobilização (retorno) — para variação superior a 5%, haverá repasse da diferença", unit: "Vb", quantity: 1, follows_months: false, enabled: true, category: "transporte" },
  { key: "freight", group: "cmo", description: "Frete", unit: "Vb", quantity: 1, follows_months: false, enabled: false, category: "frete" },
  { key: "operator", group: "cmo", description: "Operador mensal diurno (mínimo 44 horas semanais - por turno)", unit: "Mês", quantity: 0, follows_months: true, enabled: false, category: "operador" },
  { key: "operator_extra_weekday", group: "cmo", description: "Hora adicional do operador diurno (acima de 44 horas semanais) - segunda a sábado", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "operador" },
  { key: "operator_extra_holiday", group: "cmo", description: "Hora adicional do operador diurno (acima de 44 horas semanais) - domingo e feriado", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "operador" },
  { key: "maintenance_monthly", group: "cmo", description: "Manutenção mensal (preventiva / corretiva - taxa de reposição de peças) - segunda a sexta, horário comercial", unit: "Mês", quantity: 0, follows_months: true, enabled: false, category: "manutencao" },
  { key: "corrective_weekday", group: "cmo", description: "Manutenção corretiva - segunda a sexta (horário comercial, das 7:00 às 17:00)", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "corrective_sat", group: "cmo", description: "Manutenção corretiva - sábado (horário comercial, das 7:00 às 17:00)", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "corrective_holiday", group: "cmo", description: "Manutenção corretiva - domingo e feriado (horário comercial, das 7:00 às 17:00)", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "technical_assistance", group: "cmo", description: "Assistência técnica", unit: "Mês", quantity: 0, follows_months: true, enabled: false, category: "servico" },

  { key: "night17_weekday", group: "night17", description: "Manutenção corretiva (hora homem) - segunda a sexta", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "night17_sat", group: "night17", description: "Manutenção corretiva (hora homem) - sábado", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "night17_holiday", group: "night17", description: "Manutenção corretiva (hora homem) - domingo e feriado", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "night22_weekday", group: "night22", description: "Manutenção corretiva (hora homem) - segunda a sexta", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "night22_sat", group: "night22", description: "Manutenção corretiva (hora homem) - sábado", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
  { key: "night22_holiday", group: "night22", description: "Manutenção corretiva (hora homem) - domingo e feriado", unit: "Hora", quantity: 0, follows_months: false, enabled: false, category: "manutencao" },
];

const catalogByKey = new Map(LINE_CATALOG.map((c) => [c.key, c]));

// ───────────────────────── funções de apoio ─────────────────────────

export const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

let seq = 0;
export function newLineId(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  seq += 1;
  return `line-${Date.now()}-${seq}`;
}

function lineFromCatalog(c: CatalogEntry): RentalLine {
  return {
    id: newLineId(), key: c.key, group: c.group, description: c.description, unit: c.unit, quantity: c.quantity,
    follows_months: c.follows_months, unit_price: 0, enabled: c.enabled, note: "",
  };
}

export const defaultLines = (): RentalLine[] => LINE_CATALOG.map(lineFromCatalog);

/** Linha livre acrescentada pelo usuário. */
export function customLine(group: LineGroup, partial: Partial<RentalLine> = {}): RentalLine {
  return { id: newLineId(), key: null, group, description: "", unit: "Vb", quantity: 1, follows_months: false, unit_price: 0, enabled: true, note: "", ...partial };
}

/** Quantidade que vale na conta: as linhas mensais acompanham o prazo da locação. */
export const effectiveQty = (l: Pick<RentalLine, "quantity" | "follows_months">, months: number): number => {
  const q = l.follows_months ? Number(months) : Number(l.quantity);
  return q > 0 ? q : 0;
};

/** Aparece na proposta: marcada E com valor. */
export const isShown = (l: Pick<RentalLine, "enabled" | "unit_price">): boolean => !!l.enabled && Number(l.unit_price) > 0;

/** Valor da linha (quantidade × valor unitário). Linha de tabela de horas sem quantidade vale 0 (é só valor unitário). */
export const lineValue = (l: RentalLine, months: number): number => (isShown(l) ? round2(effectiveQty(l, months) * Number(l.unit_price)) : 0);

/** Define o valor unitário de uma linha-padrão (e a liga). Valor vazio ou zero deixa as linhas como estão. */
export const withLinePrice = (lines: RentalLine[], key: string, price: number | null | undefined): RentalLine[] =>
  Number(price) > 0 ? lines.map((l) => (l.key === key ? { ...l, unit_price: round2(Number(price)), enabled: true } : l)) : lines;

export const shownLines = (lines: RentalLine[], group: LineGroup): RentalLine[] => lines.filter((l) => l.group === group && isShown(l));

export const groupTotal = (lines: RentalLine[], group: LineGroup, months: number): number =>
  round2(shownLines(lines, group).reduce((s, l) => s + lineValue(l, months), 0));

export interface RentalTotals {
  ebl: number;
  cmo: number;
  /** valor total estimado por equipamento (antes de desconto e imposto) */
  subtotal: number;
  discount: number;
  afterDiscount: number;
  tax: number;
  total: number;
}

export function rentalTotals(lines: RentalLine[], months: number, discountPercent = 0, taxPercent = 0): RentalTotals {
  const ebl = groupTotal(lines, "ebl", months);
  const cmo = groupTotal(lines, "cmo", months);
  const subtotal = round2(ebl + cmo);
  const discount = round2(subtotal * ((Number(discountPercent) || 0) / 100));
  const afterDiscount = round2(subtotal - discount);
  const tax = round2(afterDiscount * ((Number(taxPercent) || 0) / 100));
  return { ebl, cmo, subtotal, discount, afterDiscount, tax, total: round2(afterDiscount + tax) };
}

const line = (lines: RentalLine[], key: string) => lines.find((l) => l.key === key);

/** Colunas antigas `rental_*`: o contrato, a frota e os relatórios continuam lendo daqui. */
export function legacyColumns(lines: RentalLine[], months: number) {
  const value = (key: string) => {
    const l = line(lines, key);
    return l ? lineValue(l, months) : 0;
  };
  const shown = (key: string) => {
    const l = line(lines, key);
    return !!l && isShown(l);
  };
  const rent = line(lines, "rent");
  return {
    rental_monthly_value: rent && isShown(rent) ? round2(Number(rent.unit_price)) : null,
    rental_mobilization: value("mobilization"),
    rental_demobilization: value("demobilization"),
    rental_freight: value("freight"),
    rental_assembly: value("assembly"),
    rental_disassembly: value("disassembly"),
    rental_operator_included: shown("operator"),
    rental_maintenance_included: shown("maintenance_monthly"),
    rental_insurance_included: shown("insurance"),
    rental_technical_assistance: shown("technical_assistance"),
  };
}

export interface LegacyRentalFields {
  rental_monthly_value?: number | null;
  rental_mobilization?: number | null;
  rental_demobilization?: number | null;
  rental_freight?: number | null;
  rental_assembly?: number | null;
  rental_disassembly?: number | null;
  rental_operator_included?: boolean | null;
  rental_maintenance_included?: boolean | null;
  rental_insurance_included?: boolean | null;
  rental_technical_assistance?: boolean | null;
}

/**
 * Proposta de locação feita antes do quadro de preços (só com as colunas `rental_*`): converte nas linhas do quadro,
 * para poder editá-la ou duplicá-la. O que era "incluso" (sem valor) vira linha ligada e SEM valor — assim a tela
 * avisa que ela não aparece até alguém informar o preço.
 */
export function linesFromLegacy(q: LegacyRentalFields): RentalLine[] {
  let lines = defaultLines();
  lines = withLinePrice(lines, "rent", q.rental_monthly_value);
  lines = withLinePrice(lines, "mobilization", q.rental_mobilization);
  lines = withLinePrice(lines, "demobilization", q.rental_demobilization);
  lines = withLinePrice(lines, "freight", q.rental_freight);
  lines = withLinePrice(lines, "assembly", q.rental_assembly);
  lines = withLinePrice(lines, "disassembly", q.rental_disassembly);
  const turnOn = (key: string, on: boolean | null | undefined) => {
    if (on) lines = lines.map((l) => (l.key === key ? { ...l, enabled: true } : l));
  };
  turnOn("operator", q.rental_operator_included);
  turnOn("maintenance_monthly", q.rental_maintenance_included);
  turnOn("insurance", q.rental_insurance_included);
  turnOn("technical_assistance", q.rental_technical_assistance);
  return lines;
}

// ───────────────────────── textos-padrão ─────────────────────────
// Escritos em linguagem genérica (LOCADORA / CONTRATANTE / CONTRATADA) a partir da estrutura do modelo.
// Percentuais, prazos e valores são pontos de partida: o usuário revisa antes de finalizar.

export const DEFAULT_SUBJECT = "Locação de grua e serviços decorrentes";

export const DEFAULT_INTRO =
  "Apresentamos nossa proposta comercial para a locação de grua, bem como para os serviços dela decorrentes, conforme o quadro de preços e as condições abaixo.";

export const DEFAULT_SAFETY_DEVICES = [
  "Limitador de momento máximo;",
  "Limitador de carga máxima;",
  "Limitadores de curso na lança;",
  "Limitador de altura para o gancho;",
  "Trava de segurança no gancho;",
  "Escada tipo marinheiro na torre e plataformas de descanso;",
  "Sistema trava-quedas para o deslocamento vertical do operador;",
  "Cabine giratória com acesso protegido (sistema de comunicação não incluso).",
];

export const DEFAULT_EQUIPMENT_LABELS = [
  "Altura útil inicial",
  "Altura útil final",
  "Fixação",
  "Alimentação elétrica",
  "Potência aparente (rede de energia)",
  "Elevação",
  "Rotação",
  "Distribuição",
];

export const DEFAULT_INSURANCE = [
  "A contratação do seguro é opcional.",
  "Em caso de não adesão, ficará a cargo da contratante a contratação do seguro de riscos diversos para o(s) equipamento(s) em questão.",
  "A taxa mensal do seguro será faturada pela LOCADORA, por meio de nota de débito.",
  "O seguro não se aplica a equipamentos para operação próxima à água (sobrevoo / projeção).",
  "O valor indicado sofrerá reajuste anual, tendo como base a variação acumulada do INCC-M, tomando por base o mês de emissão desta proposta.",
  "Em caso de interesse na contratação do seguro, a contratante poderá solicitar as informações sobre a cobertura da apólice, que, mediante aceite, serão acrescentadas como anexo a esta proposta e ao contrato.",
  "Caso não seja contratado o seguro da LOCADORA, o equipamento só será montado após a apresentação do seguro da obra com a inclusão do equipamento.",
];

export const DEFAULT_NOT_INCLUDED = [
  "Guindaste auxiliar para descarregamento, montagem e desmontagem — POR CONTA DO CLIENTE.",
  "Base / sapatas de concreto / estacas — POR CONTA DO CLIENTE.",
];

export const DEFAULT_INCLUDED = [
  "Manutenção preventiva: o valor unitário do quadro foi estimado para 1 (um) evento mensal, em dias úteis e horário comercial, até a conclusão efetiva da locação. O valor mensal da manutenção preventiva/corretiva é devido independentemente da efetiva utilização, pois remunera a disponibilidade de atendimento e a reposição de peças.",
  "Autotrafo 220 - 440 V.",
  "Para a manutenção corretiva, após a abertura do chamado, o prazo estimado para o início do atendimento é de 48 (quarenta e oito) horas, excluídos os finais de semana.",
  "Hospedagem e alimentação para o operador (1 por equipamento/turno), para a equipe de manutenção preventiva/corretiva (até 2 pessoas) e para a montagem e desmontagem (até 4 pessoas).",
];

export const DEFAULT_CORRECTIVE_NOTES = [
  "Independentemente do horário do chamado, sempre que for constatado que a causa da manutenção decorre de mau uso do equipamento (erros de sinalização, deficiência de alimentação elétrica, excesso de umidade ou inundação na alimentação elétrica / transformadores), serão cobradas as taxas previstas nas tabelas, acrescidas dos valores das peças e equipamentos substituídos.",
  "A medição considera o período a partir da 1ª hora de saída do técnico para o atendimento do chamado até a conclusão dos serviços.",
];

export const DEFAULT_OBSERVATIONS = [
  "Manutenção corretiva contratual: sem limite de chamados em dias úteis e horário comercial (segunda a sexta-feira, das 7:30 às 17:30). Será considerada uma franquia de 10% das horas úteis mensais contratadas para atendimento e posterior regularização; se a paralisação superar a garantia informada, as horas excedentes serão descontadas dentro do período correspondente à paralisação.",
  "Serviços de montagem, desmontagem, telescopagem, ancoragem e manutenção preventiva/corretiva executados aos sábados, domingos e feriados, ou fora do horário comercial, terão adicional por hora por homem, conforme tabela da LOCADORA; no período noturno (a partir das 22:00), será aplicado o adicional noturno de 20%.",
  "O período considerado para a montagem e a desmontagem é de 10 (dez) dias úteis para a montagem, 10 (dez) dias úteis para a desmontagem e 2 (dois) dias úteis para o deslocamento, excluído o período de integração, paradas por chuva e condições inadequadas ao desenvolvimento dos serviços. Na impossibilidade de execução por motivos não imputáveis à CONTRATADA, será cobrada a diária da equipe à disposição da obra ou por visita improdutiva.",
  "Condições de operação em dias de vento: até 42 km/h, operação normal com operador e sinaleiro; de 42 a 72 km/h, operação assistida (técnico de segurança ou engenheiro da obra); acima de 72 km/h, serviços paralisados e grua com giro livre.",
  "Os preços dos itens Equipamentos, Transportes e Chumbadores sofrerão reajuste anual, tendo como base a variação acumulada do INCC-DI - FGV. Os preços dos serviços (montagem, desmontagem, ancoragem, telescopagem, operação e manutenção) sofrerão reajuste de acordo com o dissídio coletivo da categoria, com data-base no mês de janeiro de cada ano.",
  "A reposição do equipamento, peças e acessórios (inclusive nas manutenções preventivas e corretivas) é de responsabilidade da CONTRATANTE quando utilizados de forma incorreta. Ficam excluídas desta cláusula as peças danificadas por consequência de mau uso, conservação, limpeza ou funcionalidade inadequada.",
  "A locação de bens móveis será faturada pela empresa locadora; a prestação de serviços de mão-de-obra será faturada pela empresa prestadora de serviços, por nota fiscal de serviços, com a incidência dos impostos aplicáveis. O percentual do ISS será acrescido aos valores com base na alíquota do município onde o serviço foi prestado.",
  "Ancoragem padrão tipo piso, com distância máxima de 3 metros entre a face da grua e a face da edificação.",
  "No preço da locação está considerado o período de 44 (quarenta e quatro) horas semanais, distribuídas na jornada: segunda a quinta-feira, das 7:00 às 17:00; sexta-feira, das 7:00 às 16:00, com 1 (uma) hora de intervalo e suspensão das atividades aos sábados e domingos. Horas que extrapolarem serão consideradas hora adicional do equipamento, cobradas conforme o quadro de preços.",
  "O equipamento será contratado com a carga horária mínima de 176 horas mensais. Excedendo essa carga horária, será considerada hora extra e adotado o valor da tabela de preços.",
  "Os serviços de manutenção ocasionados pela CONTRATANTE terão seus custos inseridos na medição, considerando os valores do técnico e do quilômetro rodado (quando a distância exceder 150 km da base da LOCADORA), além de todos os custos de deslocamento do técnico (eventual hospedagem, passagens aéreas, deslocamento do aeroporto à obra e vice-versa) e a peça avariada.",
  "Em caso de entrega técnica parcial do equipamento, especialmente quanto à ligação elétrica da grua, a LOCADORA não será responsável por atrasos ou impossibilidades decorrentes de problemas fora de seu controle, como questões de infraestrutura elétrica no local. A cobrança da locação começará na data acordada para a entrega técnica parcial, independentemente da conclusão da ligação elétrica. A entrega técnica será concluída somente após a ligação elétrica bem-sucedida e a verificação do funcionamento adequado da grua.",
];

export interface RentalSection {
  title: string;
  items: string[];
}

export const DEFAULT_SECTIONS: RentalSection[] = [
  {
    title: "Compromissos da contratante",
    items: [
      "Alimentação elétrica até a base do equipamento, com chave compatível, garantindo que a energia não apresente variação superior a +6% ou -10% da tensão nominal solicitada pelo equipamento;",
      "Custos para interdição junto ao departamento de trânsito do município (quando aplicável);",
      "Fornecer sinaleiro/amarrador e/ou \"rigger\" categorizado, equipado com sistema de comunicação (rádio, transmissor) entre o sinalizador e o operador do equipamento;",
      "Serviços de furações em concreto nas partes civis da obra;",
      "Dimensionamento e execução da base de concreto (aplicável somente no caso de grua fixa);",
      "Informar o local de aplicação dos chumbadores no momento da instalação em obra;",
      "Aterramento e medição ôhmica da estrutura conforme a NBR 5419;",
      "Cabos e outros acessórios de amarração de carga;",
      "Alvará de instalação da grua fornecido pela prefeitura do município (quando necessário);",
      "Guindaste auxiliar para descarregamento, montagem e desmontagem;",
      "Seguro de Responsabilidade Civil Geral e Cruzada, incluindo também o equipamento na apólice da obra;",
      "Seguro de Riscos Diversos (RD) para o(s) equipamento(s);",
      "Plano de carga;",
      "Fornecimento de estrutura de apoio aos funcionários da CONTRATADA, tais como armários, bebedouros, banheiros e outros, de acordo com as exigências do Ministério do Trabalho.",
    ],
  },
  {
    title: "Compromissos da contratada",
    items: [
      "Fornecimento de ART para os serviços de manutenção, montagens e desmontagens do equipamento;",
      "Esforços necessários para a execução do cálculo estrutural das bases de concreto;",
      "Estudo técnico, juntamente com a equipe de engenharia da CONTRATANTE, para análise das restrições e condições de operação e do layout de posição das gruas;",
      "Fornecimento de inventário de riscos, PCMSO e ASO, com os exames complementares conforme o GHE do programa.",
    ],
  },
  {
    title: "Medição e pagamentos",
    items: [
      "A medição será realizada mensalmente, com pagamentos mensais em até 30 (trinta) dias após a emissão do faturamento. Após o fechamento da medição, a CONTRATADA emitirá um boletim de medição para conhecimento e aprovação da CONTRATANTE, que deverá ocorrer no prazo improrrogável de 5 (cinco) dias úteis a partir da data de envio.",
      "A CONTRATANTE terá o prazo de até 5 (cinco) dias úteis para conferência, aprovação ou contestação da medição. Se não se manifestar, será concedido à CONTRATADA o direito de emitir a respectiva nota; eventuais divergências poderão ser apresentadas na medição subsequente.",
      "Atrasos de pagamento: multa de 2% (dois por cento) do valor do documento de cobrança em atraso e juros moratórios de 1% (um por cento) ao mês, calculados pro rata die a partir do primeiro dia após o vencimento. A multa e os juros serão apurados e apresentados na medição subsequente.",
      "A cobrança da locação de bens móveis dar-se-á por nota fatura ou outro documento hábil, sem destaque do ISS (Lei Complementar nº 116/2003).",
      "A prestação de serviços de mão-de-obra será formalizada por nota fiscal de serviços, com a incidência de ISS, IR, PIS, COFINS, CSLL e INSS. Os valores da proposta são brutos, ou seja, não incluem deduções, impostos, taxas ou contribuições que possam ser aplicáveis.",
      "A CONTRATANTE deverá reter, na fonte, a parcela referente ao ISS devido ao município onde o serviço foi prestado.",
    ],
  },
  {
    title: "Períodos e prazos",
    items: [
      "Esta proposta possui validade de 30 (trinta) dias ou de acordo com a disponibilidade do equipamento.",
      "A antecedência padrão para agendamento do início da montagem é de 90 (noventa) dias úteis, após a entrega de toda a documentação necessária para a elaboração do(s) contrato(s) e a assinatura da proposta. Para o agendamento dos demais serviços contratados, o prazo mínimo é de 22 (vinte e dois) dias úteis.",
      "A programação de entrega e montagem somente poderá ser realizada após a validação, em comum acordo das partes, do(s) projeto(s) final(is) relativo(s) ao posicionamento do(s) equipamento(s).",
      "As programações poderão ser canceladas se, em até 5 (cinco) dias úteis antes da montagem, não houver confirmação da execução e cura das bases ou dos caminhos de rolamento por parte da CONTRATANTE.",
      "O período de locação tem início com a retirada do(s) equipamento(s) no pátio da LOCADORA e termina com o retorno completo do(s) equipamento(s) ao local de origem. Para obras na cidade-sede da LOCADORA, terá início com a entrega técnica do equipamento.",
    ],
  },
  {
    title: "Jornadas de trabalho",
    items: [
      "A jornada do operador diurno é de 8 (oito) horas diárias e de 44 (quarenta e quatro) horas semanais, trabalhadas ou à disposição da CONTRATANTE: segunda a quinta-feira, das 7h às 17h; sexta-feira, das 7h às 16h.",
      "Será considerada hora adicional do operador a quantidade de horas excedentes à jornada acima; se ultrapassar o horário das 22:00, será cobrado adicional de 20% na hora extra do operador.",
      "Entre as jornadas deverá haver um intervalo mínimo de 11 (onze) horas consecutivas para descanso (art. 66 da CLT). O repouso semanal deverá coincidir preferencialmente com os domingos, totalizando 35 (trinta e cinco) horas de intervalo (art. 67 da CLT). Em trabalho contínuo acima de 6 (seis) horas, é obrigatória a concessão de intervalo mínimo de 1 (uma) hora (art. 71 da CLT).",
      "Em caso de excesso de jornada imposto aos operadores além dos limites do presente instrumento, a CONTRATANTE deverá reembolsar à CONTRATADA o valor da multa aplicada, bem como outros prejuízos decorrentes do excesso de jornada.",
      "Para atividades extraordinárias, a CONTRATANTE deverá solicitar à CONTRATADA com antecedência de 10 (dez) dias úteis o acréscimo de um operador, de forma que os limites legais da jornada não sejam ultrapassados, caso haja disponibilidade.",
      "Em caso de substituição definitiva do operador, a CONTRATANTE encaminhará solicitação justificada à CONTRATADA, que fará uma análise e, constando que a reclamação procede, terá 30 (trinta) dias para efetuar a troca.",
      "A partir de 150 km da base da LOCADORA, o cliente será responsável pelo transporte, hospedagem e alimentação do operador substituto.",
      "Caso haja necessidade de serviços aos sábados, domingos e feriados, o operador não poderá realizar jornada inferior a 8 (oito) horas diárias.",
    ],
  },
  {
    title: "Observações gerais",
    items: [
      "Somente estarão inclusos os serviços e fornecimentos claramente indicados nesta proposta.",
      "Os valores estão sujeitos à confirmação após a verificação de projetos, cronogramas de execução e visita técnica à obra.",
      "Todos os serviços estão com valores previstos para execução em dias úteis, em horário comercial.",
      "Para montagens de grua tipo ascensional, está considerada, em nosso estudo prévio, a utilização de vigas metálicas padrão com sapatas para fixação em lajes nas respectivas extremidades. Casos especiais serão analisados e validados pela área técnica da CONTRATADA e, após a aprovação da solução especial, ocorrerão ajustes comerciais (quando aplicável).",
      "Caso não seja possível o descarregamento em obra das carretas com os componentes da grua, por motivos não imputáveis à CONTRATADA, os valores da diária da carreta parada serão repassados à CONTRATANTE.",
      "Caso ocorram atrasos nas operações por motivos alheios ao gerenciamento da CONTRATADA e devidamente comprovados, serão cobradas as estadias e eventuais passagens aéreas da equipe, sendo apontado o mínimo de 10 horas/dia por profissional.",
      "Caso ocorra variação superior a 5% no valor do serviço de transporte de retorno, haverá repasse da diferença à CONTRATANTE.",
      "Esta proposta contempla o fornecimento de locação, serviços e operação. Todo gerenciamento, coordenação e definição dos serviços de movimentação de cargas são de total responsabilidade da CONTRATANTE.",
      "Todos os serviços e o(s) equipamento(s) seguirão as normas estabelecidas pela NR-18.",
      "Não serão permitidas instalações de placas de publicidade, exceto nos pontos definidos pelo fabricante (NR-18 e CLT).",
      "A LOCADORA deverá garantir eficiência operacional de 90% das horas mensais efetivamente realizadas: o equipamento não poderá permanecer inoperante por mais de 10% das horas úteis mensais por problemas de manutenção corretiva ou falta de operador. Não são consideradas as paradas em montagens, desmontagens, telescopagens, ancoragens, manutenção preventiva ou corretiva decorrentes do mau uso do equipamento. Se a soma mensal dos períodos de paralisação superar o percentual de 10%, será cedido desconto proporcional na medição, tendo como referência o valor da locação mensal.",
      "Na devolução, o(s) elemento(s), a ancoragem e a caçamba deverão ser entregues em perfeito estado de uso, conservação, limpeza e funcionalidade. Se a LOCADORA precisar efetuar limpeza ou reparos, serão cobradas as taxas de limpeza e reparo conforme a tabela vigente, além das peças e acessórios que não puderem ser reparados.",
      "Caso o(s) equipamento(s) não seja(m) montado(s) na data prevista por motivos não imputáveis à CONTRATADA, será cobrada da CONTRATANTE uma TAXA DE RESERVA de 30% do valor mensal da locação, com carência de 15 (quinze) dias para o início da cobrança, cobrada mensalmente até a efetiva montagem. Se o atraso superar 2 (dois) meses da data prevista, a CONTRATADA poderá rescindir o contrato de forma unilateral ou manter a grua em reserva mediante a cobrança da taxa.",
      "Caso a CONTRATANTE venha a rescindir antecipadamente, de maneira total ou parcial, o objeto desta proposta, ficará sujeita à penalização de 80% (oitenta por cento) do valor do saldo contratual.",
      "Depois do aceite desta proposta, serão elaborados os contratos definitivos pela empresa de locação (locação) e pela empresa prestadora de serviços (mão-de-obra). As minutas poderão ser discutidas, prevalecendo as condições principais do modelo da CONTRATADA, por ser a real e efetiva proprietária do(s) equipamento(s), responsável pela sua qualidade.",
      "Não será aceita a realização da montagem do(s) equipamento(s) caso não seja acusado o recebimento da(s) via(s) contratual(is) assinadas e com firma reconhecida, em até 15 (quinze) dias úteis da data programada para o serviço.",
    ],
  },
];

export const DEFAULT_ACCEPTANCE_TEXT =
  "Declaro expressamente ter lido com atenção todos os itens desta proposta, com os quais estou de acordo, autorizando a contratação dos itens descritos, passando a presente a ter valor de contrato preliminar, conforme previsto nos artigos 463 a 466 do Código Civil Brasileiro.";

export const DEFAULT_COMPANY_SLUG = "dacrom";

// ───────────────────────── dados da proposta (JSON em quotes.service_data) ─────────────────────────

export interface RentalKV {
  label: string;
  value: string;
}

export interface RentalData {
  version: 2;
  kind: "locacao";
  company_slug: string;
  issue_city: string;
  /** contato na obra (Att.) */
  attention: string;
  subject: string;
  intro: string;
  /** estado completo do quadro de preços (inclui linhas desmarcadas, para reabrir a proposta igual) */
  lines: RentalLine[];
  /** características técnicas além das que vêm do cadastro da grua */
  equipment: RentalKV[];
  safety_devices: string[];
  /** "Frete saindo de ..." — nota logo abaixo do quadro */
  freight_note: string;
  insurance: string[];
  not_included: string[];
  included: string[];
  corrective_notes: string[];
  observations: string[];
  sections: RentalSection[];
  acceptance_text: string;
  signer_name: string;
  signer_role: string;
}

export interface RentalCompanyHint {
  slug?: string | null;
  address?: string | null;
  representante_nome?: string | null;
  representante_cargo?: string | null;
}

export function cityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const m = address.match(/([^,]+?)\s*[-/]\s*([A-Z]{2})\s*(?:,|$)/);
  return m ? `${m[1].trim()}/${m[2]}` : "";
}

export const kvFromLabels = (labels: string[]): RentalKV[] => labels.map((label) => ({ label, value: "" }));
const cloneSections = (s: RentalSection[]): RentalSection[] => s.map((x) => ({ title: x.title, items: [...x.items] }));

export function defaultRentalData(company?: RentalCompanyHint | null): RentalData {
  return {
    version: 2,
    kind: "locacao",
    company_slug: company?.slug || DEFAULT_COMPANY_SLUG,
    issue_city: cityFromAddress(company?.address),
    attention: "",
    subject: DEFAULT_SUBJECT,
    intro: DEFAULT_INTRO,
    lines: defaultLines(),
    equipment: kvFromLabels(DEFAULT_EQUIPMENT_LABELS),
    safety_devices: [...DEFAULT_SAFETY_DEVICES],
    freight_note: "",
    insurance: [...DEFAULT_INSURANCE],
    not_included: [...DEFAULT_NOT_INCLUDED],
    included: [...DEFAULT_INCLUDED],
    corrective_notes: [...DEFAULT_CORRECTIVE_NOTES],
    observations: [...DEFAULT_OBSERVATIONS],
    sections: cloneSections(DEFAULT_SECTIONS),
    acceptance_text: DEFAULT_ACCEPTANCE_TEXT,
    signer_name: company?.representante_nome || "",
    signer_role: company?.representante_cargo || "",
  };
}

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
const strList = (v: unknown, fallback: string[]): string[] => (Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [...fallback]);

function kvList(v: unknown, fallback: RentalKV[]): RentalKV[] {
  if (!Array.isArray(v)) return fallback.map((x) => ({ ...x }));
  return v.filter((x) => x && typeof x === "object").map((x: any) => ({ label: str(x.label, ""), value: str(x.value, "") }));
}

function sectionList(v: unknown, fallback: RentalSection[]): RentalSection[] {
  if (!Array.isArray(v)) return cloneSections(fallback);
  return v
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({ title: str(x.title, ""), items: strList(x.items, []) }));
}

/**
 * Lê as linhas gravadas: mantém as que o usuário editou e as livres, e acrescenta linhas-padrão que o
 * modelo ganhou depois (assim uma proposta antiga nunca perde uma opção nova).
 */
export function normalizeLines(raw: unknown): RentalLine[] {
  if (!Array.isArray(raw)) return defaultLines();
  const out: RentalLine[] = [];
  const seen = new Set<string>();
  for (const x of raw as any[]) {
    if (!x || typeof x !== "object") continue;
    const group: LineGroup = ["ebl", "cmo", "night17", "night22"].includes(x.group) ? x.group : "cmo";
    const key = typeof x.key === "string" ? x.key : null;
    const cat = key ? catalogByKey.get(key) : undefined;
    if (key && cat) seen.add(key);
    out.push({
      id: newLineId(),
      key: cat ? key : null,
      group: cat ? cat.group : group,
      description: str(x.description, cat?.description ?? ""),
      unit: str(x.unit, cat?.unit ?? "Vb"),
      quantity: Number(x.quantity) > 0 ? Number(x.quantity) : 0,
      follows_months: typeof x.follows_months === "boolean" ? x.follows_months : !!cat?.follows_months,
      unit_price: Number(x.unit_price) > 0 ? Number(x.unit_price) : 0,
      enabled: typeof x.enabled === "boolean" ? x.enabled : !!cat?.enabled,
      note: str(x.note, ""),
    });
  }
  for (const c of LINE_CATALOG) if (!seen.has(c.key)) out.push(lineFromCatalog(c));
  return out;
}

/** Lê o JSON do banco com tolerância (campo ausente → texto-padrão; lista esvaziada de propósito continua vazia). */
export function normalizeRentalData(raw: unknown, company?: RentalCompanyHint | null): RentalData {
  const base = defaultRentalData(company);
  if (!raw || typeof raw !== "object" || (raw as any).kind !== "locacao") return base;
  const r = raw as Record<string, unknown>;
  return {
    version: 2,
    kind: "locacao",
    company_slug: str(r.company_slug, base.company_slug) || base.company_slug,
    issue_city: str(r.issue_city, base.issue_city),
    attention: str(r.attention, ""),
    subject: str(r.subject, base.subject),
    intro: str(r.intro, base.intro),
    lines: normalizeLines(r.lines),
    equipment: kvList(r.equipment, base.equipment),
    safety_devices: strList(r.safety_devices, base.safety_devices),
    freight_note: str(r.freight_note, ""),
    insurance: strList(r.insurance, base.insurance),
    not_included: strList(r.not_included, base.not_included),
    included: strList(r.included, base.included),
    corrective_notes: strList(r.corrective_notes, base.corrective_notes),
    observations: strList(r.observations, base.observations),
    sections: sectionList(r.sections, base.sections),
    acceptance_text: str(r.acceptance_text, base.acceptance_text),
    signer_name: str(r.signer_name, base.signer_name),
    signer_role: str(r.signer_role, base.signer_role),
  };
}

/** Tira linhas e tópicos em branco antes de gravar. */
export function cleanRentalData(d: RentalData): RentalData {
  const list = (a: string[]) => a.map((s) => s.trim()).filter(Boolean);
  return {
    ...d,
    equipment: d.equipment.filter((x) => x.label.trim() || x.value.trim()),
    safety_devices: list(d.safety_devices),
    insurance: list(d.insurance),
    not_included: list(d.not_included),
    included: list(d.included),
    corrective_notes: list(d.corrective_notes),
    observations: list(d.observations),
    sections: d.sections.map((s) => ({ title: s.title.trim(), items: list(s.items) })).filter((s) => s.title || s.items.length),
    lines: d.lines.filter((l) => l.key || l.description.trim()),
  };
}

// ───────────────────────── banco ↔ tela ─────────────────────────

const categoryOf = (l: RentalLine): string => (l.key ? catalogByKey.get(l.key)?.category ?? "servico" : "servico");

/**
 * Linhas para `quote_items`: só as que aparecem na proposta (grupos EBL e CMO).
 * `total_price` é o valor da linha; `quantity` é inteiro no banco.
 * A grua escolhida vem na frente, SEM preço (o aluguel está na linha "Locação mensal").
 */
export interface RentalItemRow {
  quote_id: string;
  product_id: null;
  product_code: string;
  product_name: string;
  product_category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  unit: string;
  is_optional: boolean;
  order_index: number;
}

export function toQuoteItemRows(quoteId: string, lines: RentalLine[], months: number): RentalItemRow[] {
  const rows: RentalItemRow[] = [];
  for (const group of ["ebl", "cmo"] as const) {
    for (const l of shownLines(lines, group)) {
      rows.push({
        quote_id: quoteId,
        product_id: null,
        product_code: `LOC-${String(rows.length + 1).padStart(2, "0")}`,
        product_name: l.description.trim(),
        product_category: categoryOf(l),
        quantity: Math.round(effectiveQty(l, months)),
        unit_price: round2(Number(l.unit_price)),
        total_price: lineValue(l, months),
        notes: l.note.trim() || null,
        unit: l.unit || "Vb",
        is_optional: false,
        order_index: rows.length + 1, // 0 fica reservado à grua
      });
    }
  }
  return rows;
}

// ───────────────────────── validação ─────────────────────────

export interface RentalCheckInput {
  client_id: string;
  months: number;
  lines: RentalLine[];
  data: RentalData;
  validity_days: number;
}

/** Problemas que impedem FINALIZAR (o rascunho pode ser salvo incompleto). */
export function rentalProblems(i: RentalCheckInput): string[] {
  const out: string[] = [];
  if (!i.client_id) out.push("Escolha o cliente.");
  if (!(Number(i.months) > 0)) out.push("Informe o prazo da locação, em meses.");
  const rent = line(i.lines, "rent");
  if (!rent || !isShown(rent)) out.push("Informe o valor da locação mensal do equipamento.");
  for (const l of i.lines) {
    if (!l.enabled || !(Number(l.unit_price) > 0)) continue;
    if (!l.description.trim()) out.push("Há uma linha com valor, mas sem descrição.");
    const q = effectiveQty(l, i.months);
    if (q > 0 && !Number.isInteger(q)) out.push(`"${l.description.trim()}": a quantidade precisa ser um número inteiro.`);
  }
  if (!i.data.subject.trim()) out.push("Informe o assunto da proposta.");
  if (!(i.validity_days > 0)) out.push("Informe a validade da proposta em dias.");
  return out;
}

/** Linhas ligadas mas ainda sem valor: avisa na tela que não vão aparecer. */
export const linesWithoutValue = (lines: RentalLine[]): RentalLine[] =>
  lines.filter((l) => (l.group === "ebl" || l.group === "cmo") && l.enabled && !(Number(l.unit_price) > 0));
