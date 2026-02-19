

## Corrigir capa/contracapa para preencher toda a pagina na impressao

### Problema
A regra `@page { margin: 15mm }` aplica margens em TODAS as paginas, incluindo capa e contracapa. As margens negativas no `@media print` nao estao compensando corretamente, resultando na capa com bordas brancas ao redor.

### Solucao
Mudar a estrategia de margens: remover a margem do `@page` e aplicar padding diretamente nas paginas de conteudo. Assim a capa e contracapa ocupam 100% da pagina sem precisar de hacks com margens negativas.

### Alteracoes

**Arquivo:** `supabase/functions/generate-pdf/index.ts`

1. Alterar `@page` para margem zero:
```css
@page { size: A4; margin: 0; }
```

2. Criar uma classe `.content-page` com padding de 15mm para as paginas de conteudo (miolo):
```css
.content-page {
  padding: 15mm;
}
```

3. Remover as margens negativas e dimensoes expandidas do `@media print` (que nao funcionaram):
```css
@media print {
  .cover-page, .backcover-page {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
}
```

4. No HTML gerado, envolver as paginas de conteudo (tudo que nao e capa/contracapa) em `<div class="content-page">`.

### Detalhes Tecnicos

- Com `@page { margin: 0 }`, a capa ocupa 100% da area imprimivel
- O padding de 15mm nas paginas de conteudo reproduz o mesmo efeito visual que a margem anterior
- Sem hacks de margens negativas, o resultado e mais previsivel entre navegadores
- As propriedades `print-color-adjust: exact` continuam garantindo que as imagens de fundo sejam impressas

### Arquivos modificados
- `supabase/functions/generate-pdf/index.ts`
