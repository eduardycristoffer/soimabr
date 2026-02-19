

## Corrigir imagens de capa/contracapa no modo de impressao (Ctrl+P)

### Problema
A imagem da capa aparece corretamente na pagina `about:blank`, mas quando o usuario aciona Ctrl+P (impressao), o navegador remove as imagens de fundo (`background-image`) por padrao. Esse e um comportamento padrao dos navegadores para economizar tinta.

### Solucao
Adicionar as propriedades CSS `print-color-adjust: exact` e `-webkit-print-color-adjust: exact` nos elementos da capa e contracapa. Isso instrui o navegador a preservar cores e imagens de fundo na impressao.

Tambem ajustar a regra `@page` para remover margens nas paginas de capa/contracapa (full-bleed) e garantir que o `@media print` respeite o layout.

### Alteracao

**Arquivo:** `supabase/functions/generate-pdf/index.ts`

Na secao CSS `.cover-page, .backcover-page` (linha ~544), adicionar:

```css
.cover-page, .backcover-page {
  /* propriedades existentes ... */
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
```

Adicionar tambem uma regra `@media print` para garantir margens zero na capa:

```css
@media print {
  .cover-page, .backcover-page {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    margin: -15mm;
    width: calc(210mm + 30mm);
    height: calc(297mm + 30mm);
  }
}
```

### Detalhes Tecnicos

- `print-color-adjust: exact` e o padrao CSS moderno
- `-webkit-print-color-adjust: exact` cobre Chrome/Safari/Edge
- `color-adjust: exact` cobre Firefox
- O `!important` garante precedencia sobre configuracoes do navegador
- A regra `@media print` com margens negativas compensa o `@page { margin: 15mm }` para manter o full-bleed na capa

### Arquivos modificados
- `supabase/functions/generate-pdf/index.ts` (adicionar propriedades CSS de impressao)
