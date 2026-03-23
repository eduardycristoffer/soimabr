

## Renomear termos e ajustar unidades dos Motores/Potências

### Resumo

Renomear labels de motores, trocar unidade kW por daN.m, adicionar campo "Potência total" ao lado da tensão, e ajustar o PDF.

### Mudanças de terminologia

| Atual | Novo |
|-------|------|
| Motorredutores (título seção) | Potências |
| Motorredutor de Distribuição (elev) | Elevação |
| Motorredutor de Translação (trans) | Distribuição |
| Motorredutor de Rotação (rot) | Rotação |
| Potência (kW) | Potência (daN.m) |
| Incluir mini-tabela de motorredutor | Incluir tabela de potências no PDF |

### Novo campo: Potência Total

- Adicionar campo `panel_potencia_total` (number | null) no wizard e na tabela `quotes`
- Exibido ao lado da "Tensão de alimentação" no formulário
- No PDF, aparece junto com a tensão na lista de itens integrantes

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | `ALTER TABLE quotes ADD COLUMN panel_potencia_total numeric;` + `ALTER TABLE products ADD COLUMN default_potencia_total numeric;` |
| `useQuoteWizard.ts` | Adicionar `panel_potencia_total: number \| null` ao tipo e `null` ao INITIAL_DATA |
| `StepTechnical.tsx` | Renomear labels; trocar "kW" por "daN.m"; adicionar input "Potência total" ao lado de "Tensão de alimentação"; mover tensão para dentro da seção de potências |
| `QuoteWizard.tsx` | Incluir `panel_potencia_total` no payload de save/load |
| `generate-pdf/index.ts` | Renomear translations (PT e EN); trocar "kW" por "daN.m" na renderização; adicionar "Potência total" e tensão na tabela de motores ou na lista de itens |

### No wizard (StepTechnical)

Grid de Tensão + Potência Total (lado a lado):
```
Tensão de alimentação    |  Potência total
[380V ▼]                 |  [___] kW
```

Seção "Potências" (era "Motorredutores"):
```
Elevação          → Potência (daN.m) | Potência (HP) | Velocidade
Distribuição      → Potência (daN.m) | Potência (HP) | Velocidade  
Rotação           → Potência (daN.m) | Potência (HP) | Velocidade
```

### No PDF

- Linha na lista: "Tensão de alimentação: 380V — Potência total: 45 kW"
- Tabela de motores: colunas Item + Especificação, com valores em daN.m / HP
- Labels PT: "Elevação", "Distribuição", "Rotação"
- Labels EN: "Hoisting", "Trolley travel", "Slewing"

