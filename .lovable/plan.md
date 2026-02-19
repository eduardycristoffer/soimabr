

## Corrigir Capa e Contracapa do PDF (imagens nao carregam)

### Problema
As imagens da capa e contracapa sao referenciadas via URL externa (`https://soimabr.lovable.app/images/pdf-cover.jpg`). Como o PDF e gerado server-side via Edge Function e o HTML e aberto no navegador, o browser tenta buscar essas imagens na URL -- que nao existe ainda (app nao publicado com as imagens). Resultado: paginas em branco.

### Solucao
Embutir as imagens como **base64 data URIs** diretamente no HTML gerado. Isso elimina qualquer dependencia de URLs externas e garante que as imagens sempre aparecerao, independente do estado de publicacao.

### Etapas

#### 1. Criar script de conversao das imagens para base64
- Ler os arquivos `public/images/pdf-cover.jpg` e `public/images/pdf-backcover.jpg`
- Converter para base64 strings
- Salvar como constantes em um arquivo auxiliar dentro da Edge Function

#### 2. Criar arquivo de constantes com as imagens base64
- Novo arquivo: `supabase/functions/generate-pdf/images.ts`
- Conter duas constantes exportadas:
  - `COVER_BASE64` (data URI da capa)
  - `BACKCOVER_BASE64` (data URI da contracapa)

#### 3. Atualizar a Edge Function `generate-pdf/index.ts`
- Importar as constantes base64 de `./images.ts`
- Substituir as URLs externas pelas data URIs base64
- Trocar `background-image: url('https://...')` por `background-image: url('data:image/jpeg;base64,...')`
- Remover as constantes `PDF_COVER_URL` e `PDF_BACKCOVER_URL`

### Detalhes Tecnicos

**Estrutura do data URI:**
```
data:image/jpeg;base64,/9j/4AAQ...
```

**Alteracao no HTML gerado:**
```html
<!-- Antes -->
<div class="cover-page" style="background-image: url('https://soimabr.lovable.app/images/pdf-cover.jpg');">

<!-- Depois -->
<div class="cover-page" style="background-image: url('${COVER_BASE64}');">
```

**Nota sobre tamanho:** Imagens JPG em base64 aumentam ~33% em tamanho. As imagens da capa e contracapa devem ser razoaveis (< 500KB cada), resultando em um HTML um pouco maior mas totalmente auto-contido e funcional.

#### Arquivos modificados:
- `supabase/functions/generate-pdf/images.ts` (novo -- constantes base64)
- `supabase/functions/generate-pdf/index.ts` (importar base64 e substituir URLs)

