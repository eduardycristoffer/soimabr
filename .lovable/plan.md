

## Posicionar rodape no fundo da penultima pagina

### O que muda

O rodape inline (razao social, CNPJ, logos) esta colado logo apos o conteudo na penultima pagina. O usuario quer que ele fique **fixo no rodape da pagina** para dar a impressao de pagina completa/inteira.

### Detalhes tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | 2 alteracoes |

#### 1. Tornar a content-page da pagina final um container flex

Adicionar uma classe especifica (`.final-page`) ao div da pagina final com `display: flex; flex-direction: column; min-height: 100vh;` (ou altura da pagina A4). Isso permite que o rodape seja empurrado para o fundo usando `margin-top: auto`.

CSS a adicionar:

```
.final-page {
  display: flex;
  flex-direction: column;
  min-height: calc(297mm - 40mm); /* A4 height minus top+bottom padding */
}
```

#### 2. Adicionar `margin-top: auto` ao `.footer` dentro da pagina final

Alterar o estilo do `.footer` (ou aplicar inline no HTML da pagina final) para usar `margin-top: auto` em vez de `margin-top: 24px`. Isso empurra o rodape para o fundo da pagina, preenchendo o espaco vazio automaticamente.

O HTML do footer passa a ser:
```html
<div class="footer" style="margin-top: auto;">
  ...
</div>
```

#### 3. Envolver o conteudo principal em um div

Todo o conteudo acima do footer (resumo, condicoes, garantia, assinaturas) fica dentro de um `<div>` normal, e o footer fica como ultimo filho direto do flex container. Assim o flexbox empurra o footer para baixo.

### Resultado esperado

- Conteudo da penultima pagina (resumo, condicoes, garantia, assinaturas) no topo
- Rodape (razao social, CNPJ, logos) fixo no rodape da pagina
- Impressao visual de pagina inteira/completa

