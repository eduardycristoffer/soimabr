

## Correcao do PDF: Capa/Contracapa Novas + Impressao Correta

### Problemas Identificados

1. **Paginas em branco ao imprimir (Ctrl+P)**: A capa e contracapa usam `background-image` no CSS, que navegadores nao imprimem por padrao — resultando em paginas completamente em branco
2. **Texto da capa invisivel**: O overlay da capa usa cor branca (`color: white`), mas a nova capa tem fundo branco/claro — o texto fica invisivel
3. **Sem opcao de download direto**: Hoje o fluxo depende exclusivamente de abrir nova janela + Ctrl+P, que gera confusao
4. **Imagens de capa/contracapa desatualizadas**: Precisa trocar pelas novas imagens brancas fornecidas

### Solucao

#### 1. Trocar imagens de capa e contracapa

- Copiar as imagens `capa.jpg` e `contracapa.jpg` para `public/images/pdf-cover.jpg` e `public/images/pdf-backcover.jpg` (substituindo as atuais)
- Atualizar as URLs no edge function `generate-pdf` para referenciar as novas imagens no storage

#### 2. Usar `<img>` ao inves de `background-image` na capa e contracapa

A mudanca principal: trocar de `background-image` CSS (que nao imprime) para tags `<img>` com posicao absoluta (que sempre imprime).

Antes:
```html
<div class="cover-page" style="background-image: url(...);">
```

Depois:
```html
<div class="cover-page">
  <img src="..." class="cover-bg-img" />
  <div class="cover-overlay">...</div>
</div>
```

CSS:
```css
.cover-bg-img {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
}
```

Isso garante que a imagem aparece tanto na tela quanto na impressao.

#### 3. Ajustar cor do texto do overlay da capa

Como a nova capa e branca/clara, o texto do overlay precisa mudar de branco para escuro:

```css
.cover-overlay {
  color: #1a365d; /* azul escuro SOIMA */
}
```

Posicionar o overlay na parte inferior esquerda para combinar com o layout da nova capa (que ja tem "PROPOSTA COMERCIAL SOIMA" na imagem).

#### 4. Melhorar a experiencia de "download" do PDF

Duas melhorias:
- Na nova janela, adicionar um **botao flutuante "Salvar como PDF"** que chama `window.print()` automaticamente — o usuario nao precisa saber que deve usar Ctrl+P
- Adicionar **instrucoes visuais** na janela antes de imprimir
- Adicionar CSS `@media print` que oculta o botao e instrucoes durante a impressao

```html
<div class="print-toolbar" style="position:fixed; top:0; ...">
  <button onclick="window.print()">Salvar como PDF</button>
  <p>Selecione "Salvar como PDF" no destino da impressora</p>
</div>
```

```css
@media print {
  .print-toolbar { display: none !important; }
}
```

#### 5. CSS de impressao otimizado

Adicionar regras `@media print` para:
- Margem zero (`@page { margin: 0; }`) — ja existe mas vamos reforcar
- Forcar impressao de cores e imagens (`-webkit-print-color-adjust: exact`)
- Garantir quebras de pagina corretas entre capa, conteudo e contracapa

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `public/images/pdf-cover.jpg` | Substituido pela nova capa branca |
| `public/images/pdf-backcover.jpg` | Substituido pela nova contracapa branca |
| `supabase/functions/generate-pdf/index.ts` | Trocar background-image por img tag; ajustar cor do overlay; adicionar toolbar de impressao; otimizar CSS de print |

### Detalhes Tecnicos da Edge Function

**Capa** — trocar de:
```html
<div class="cover-page" style="background-image: url('...');">
  <div class="cover-overlay" style="color: white;">
```
Para:
```html
<div class="cover-page">
  <img src="..." class="cover-bg-img" />
  <div class="cover-overlay">
    Proposta n. PRO262628
    Cliente / Cidade
    Data
  </div>
</div>
```

**Contracapa** — mesmo padrao, sem overlay.

**Toolbar de impressao** — barra fixa no topo com botao "Salvar como PDF" + instrucao, oculta durante impressao.

**Upload das imagens** — as novas imagens serao copiadas para `public/images/` e tambem precisarao ser atualizadas no storage para que o edge function possa referencia-las via URL publica. Alternativa: fazer upload para o storage do backend e atualizar as constantes `PDF_COVER_URL` e `PDF_BACKCOVER_URL`.

### Compatibilidade

- Propostas antigas continuam funcionando normalmente
- A nova capa branca funciona bem tanto na tela quanto na impressao
- O botao "Salvar como PDF" torna o fluxo intuitivo para qualquer usuario

