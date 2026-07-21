## Objetivo
Fazer o contrato herdar o escopo completo da proposta comercial — todos os itens com descrição/observações — em formato de tabela igual ao PDF da proposta, e também descrito por extenso na cláusula de Objeto.

## Estado atual (verificado)
- `contractPlaceholders.ts` renderiza `{{itens_inclusos_tabela}}` como uma lista markdown simples: `- 1x Grua SGT 3610`. Sem código, sem coluna, sem notas/observações.
- O renderer `md()` da Edge Function `generate-contract-pdf` só entende parágrafos, listas e negrito/itálico — **não** entende tabelas markdown.
- As cláusulas seed já usam `{{itens_inclusos_tabela}}` (Objeto) e `{{valor_total_extenso}}` (Preço).
- Especificações da grua já têm placeholders individuais (`{{lanca_m}}`, `{{altura_torre_m}}`, etc.), mas em números crus.

## Mudanças

### 1. `src/lib/contractPlaceholders.ts`
- Reescrever `itensInclusosTabela` para produzir uma **tabela HTML** completa (não markdown), agrupada por categoria (Grua, Componentes, Acessórios, Serviços), colunas: `#`, `Código`, `Descrição` (nome + observações + specs da grua quando aplicável), `Qtd`. Mesmo visual da tabela "ITENS DA PROPOSTA" do PDF da proposta.
- Novo placeholder `{{itens_inclusos_extenso}}`: descrição em prosa de cada item (`um (01) SGT3610TLTR — Grua ascensional SGT 3610 TL TR, contendo: [notes]`).
- Novo placeholder `{{especificacoes_grua_extenso}}`: `lança de X (Y por extenso) metros, altura de torre de …, carga máxima de … kg, carga na ponta de … kg`.
- Novo helper `numeroInteiroPorExtenso` (reutiliza `ate999`/lógica já existente) para dimensões em metros/kg.
- Manter `{{itens_inclusos_tabela}}` funcionando (agora tabela HTML) para não quebrar templates existentes.

### 2. `supabase/functions/generate-contract-pdf/index.ts`
- Atualizar `md()` para:
  - Passar HTML já pronto (blocos `<table>…</table>` gerados no placeholder) sem escapar/embrulhar em `<p>`. Fazer isso detectando linhas que começam com `<table`/`<tr`/etc. ou (mais simples) processando as partes tag-a-tag com um pequeno tokenizer que preserva blocos `<table>…</table>`.
  - Alternativa mais segura: no `resolvePlaceholders`, marcar o bloco com um sentinela `%%HTML%%…%%/HTML%%` que o `md()` reinjeta sem escapar.
- Adicionar CSS para tabela de escopo: cabeçalho azul (#1e40af), linhas com zebra, bordas cinza claras, `page-break-inside: avoid` por grupo, coluna descrição com `text-align:justify`.

### 3. Cláusula de OBJETO (opcional, sem migration obrigatória)
Não vou alterar os seeds já existentes — o placeholder `{{itens_inclusos_tabela}}` continua funcionando e ganha o novo formato automaticamente. Vou apenas **documentar** os novos placeholders em `contractPlaceholders.ts` para que o admin possa colar `{{itens_inclusos_extenso}}` e `{{especificacoes_grua_extenso}}` em qualquer cláusula pelo editor.

Se você quiser, atualizo também as cláusulas dos templates mestres para incluir a versão por extenso logo abaixo da tabela — me diga se quer isso incluso.

## Fora do escopo
- Não vou mexer no PDF da proposta.
- Não vou refazer o layout de assinaturas.
- Não vou criar novo template — só melhorar o que os placeholders produzem.

## Verificação
- `tsgo` no arquivo modificado.
- Gerar um contrato de venda e um de locação a partir de propostas existentes e conferir o PDF (tabela renderizada + prosa por extenso, sem quebrar cláusulas atuais).
