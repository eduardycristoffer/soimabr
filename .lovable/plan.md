

## Ajuste do padding-bottom para evitar sobreposicao do rodape fixo

### Problema

O rodape fixo (`.page-footer`) com `position: fixed; bottom: 0` ocupa aproximadamente 20-25mm de altura (logos de 35px + texto + padding + border). O `padding-bottom: 30mm` atual no `.content-page` nao e suficiente em todas as paginas, especialmente quando o conteudo flui ate o final da pagina e o navegador faz a quebra de pagina automatica.

### Solucao

Aumentar o `padding-bottom` de `30mm` para `40mm` no `.content-page` para garantir que o conteudo nunca sobreponha o rodape em nenhuma pagina. Tambem adicionar uma regra `@media print` especifica para reforcar esse espaco.

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Aumentar `padding-bottom` de 30mm para 40mm no `.content-page`; adicionar `@page { margin-bottom: 0; }` no print media para evitar margens duplas |

### Detalhes tecnicos

Linha 676 do arquivo atual:
```css
/* Antes */
.content-page {
  padding: 15mm;
  padding-bottom: 30mm;
}

/* Depois */
.content-page {
  padding: 15mm;
  padding-bottom: 40mm;
}
```

O aumento de 10mm extras garante espaco suficiente para o rodape fixo que contem:
- Border-top de 2px
- Texto da empresa (9px + padding)
- Logos Yelum e CREA-GO (35px de altura)
- Gap e padding interno
