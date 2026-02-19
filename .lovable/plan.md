

## Adaptar PDF com Capa e Contracapa Premium

### Resumo
Adicionar uma pagina de capa (com overlay de dados da proposta) e uma contracapa ao PDF existente, usando as imagens fornecidas. O conteudo interno permanece inalterado.

---

### Etapas

#### 1. Salvar imagens no projeto
- Copiar as duas imagens enviadas para `public/images/`:
  - `pdf-cover.jpg` (capa)
  - `pdf-backcover.jpg` (contracapa)
- Essas imagens serao servidas via URL publica do preview/deploy

#### 2. Modificar a Edge Function `generate-pdf`

Alterar apenas a funcao `generateQuoteHTML` para:

**a) Adicionar CSS de paginas full-bleed:**
- Capa e contracapa com `width: 210mm; height: 297mm; margin: 0; padding: 0` e `page-break-after: always`
- Imagem de fundo via `background-image` cobrindo 100% da pagina
- Overlay discreto no canto inferior esquerdo da capa com:
  - Numero da proposta
  - Nome do cliente (razao_social ou nome_fantasia)
  - Cidade / UF
  - Data de emissao
- Estilo do overlay: fonte 11px, cor branca, opacidade ~75%, sem caixas pesadas, alinhado ao canto inferior esquerdo

**b) Estrutura HTML final do PDF:**
1. Pagina de capa (imagem full-bleed + overlay)
2. `page-break-after: always`
3. Conteudo atual (sem alteracoes)
4. `page-break-before: always`
5. Contracapa (imagem full-bleed, sem overlay)

**c) Ajuste de `@page`:**
- Regra `@page` para paginas internas mantendo margens de 15mm
- Capa e contracapa com margens zero

---

### Detalhes Tecnicos

**URLs das imagens:** Serao referenciadas via URL absoluta do deploy (`https://soimabr.lovable.app/images/pdf-cover.jpg`). Isso garante que o HTML do PDF consiga carregar as imagens ao ser aberto em nova janela para impressao.

**CSS da capa:**
```css
.cover-page {
  width: 210mm;
  height: 297mm;
  margin: 0;
  padding: 0;
  position: relative;
  background-size: cover;
  background-position: center;
  page-break-after: always;
}
.cover-overlay {
  position: absolute;
  bottom: 40px;
  left: 40px;
  color: white;
  font-size: 11px;
  opacity: 0.85;
  line-height: 1.6;
}
```

**Overlay da capa (exemplo):**
```
Proposta n. 0234
Cliente: Joao da Silva
Anapolis - GO
Emitida em: 12/03/2026
```

**Contracapa:** Apenas imagem full-bleed sem texto programatico (a arte ja contem as informacoes de contato da SOIMA).

#### Arquivos modificados:
- `supabase/functions/generate-pdf/index.ts` (unico arquivo alterado)
- `public/images/pdf-cover.jpg` (novo)
- `public/images/pdf-backcover.jpg` (novo)

