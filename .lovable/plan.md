

## Remover rodape fixo e adicionar rodape apenas na penultima pagina

### O que muda

O rodape fixo (`position: fixed; bottom: 0`) com razao social, CNPJ, endereco e logos (Yelum/CREA-GO) aparece em **todas** as paginas impressas. O usuario quer que ele apareca **somente na penultima pagina** (pagina final de conteudo, onde ficam condicoes/garantia/assinaturas).

### Detalhes tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | 3 alteracoes |

#### 1. Remover o bloco HTML do rodape fixo (linhas 871-880)

Remover completamente o `<div class="page-footer">...</div>` que esta no corpo do HTML e aparece em todas as paginas.

#### 2. Remover/comentar o CSS do `.page-footer` (linhas 695-718)

Remover os estilos `.page-footer`, `.page-footer .footer-company-legal`, `.page-footer .footer-logos-row` e o bloco `@media print` relacionado, ja que o elemento nao existira mais.

#### 3. Adicionar rodape inline na penultima pagina (dentro de `buildFinalPageHTML`)

Inserir um rodape estatico (nao fixo) no final do conteudo da pagina final, logo apos a linha de aceite e antes do fechamento do `</div>` da content-page. Usara os estilos `.footer` e `.footer-logos` que ja existem no CSS (linhas 804-807) mas nao estao sendo utilizados.

O rodape tera:
- Razao social da empresa
- CNPJ e endereco
- Logos Yelum e CREA-GO

#### 4. Reduzir padding-bottom das paginas 1 e 2

Como nao ha mais rodape fixo, o `padding-bottom: 45mm` da classe `.content-page` pode ser reduzido (para ~20mm), liberando mais espaco util para conteudo. A penultima pagina mantera espaco suficiente para o rodape inline.

### Resultado esperado

- **Capa**: Sem rodape
- **Pagina 1**: Sem rodape (mais espaco para itens)
- **Pagina 2 (opcional)**: Sem rodape
- **Pagina final**: Rodape com razao social, CNPJ, endereco e logos ao final
- **Contracapa**: Sem rodape

