

## Ajustes no PDF da Proposta

### 1. Informacoes da capa no canto superior direito

Atualmente o overlay da capa (numero da proposta, cliente, cidade, data) esta posicionado no canto inferior esquerdo (`bottom: 60px; left: 40px`). Sera movido para o canto superior direito:

- CSS: mudar de `bottom: 60px; left: 40px` para `top: 40px; right: 40px; text-align: right`
- Manter a cor azul escuro (#1a365d) para contraste com a capa branca

### 2. Logos Yelum e CREA-GO fixos no rodape de TODAS as paginas

Atualmente os logos so aparecem no rodape da ultima pagina de conteudo. Para que aparecam em todas as paginas de conteudo, sera usado um rodape fixo via CSS `@media print` com `position: fixed; bottom: 0`:

- Criar um elemento `.page-footer` com os logos Yelum e CREA-GO + dados da empresa
- Usar `position: fixed; bottom: 0` que no contexto de impressao repete o elemento em todas as paginas
- Adicionar `padding-bottom` extra no `.content-page` para que o conteudo nao sobreponha o rodape fixo
- O rodape fixo sera oculto na capa e contracapa via CSS

### 3. Remover padding superior excessivo do Escopo do Fornecimento

A secao "Escopo do Fornecimento" tem `page-break-inside: avoid` e herda o `margin-bottom: 14px` da classe `.section`, mas pode estar sendo empurrada para uma nova pagina pelo layout. Ajustes:

- Adicionar `margin-top: 0` ao primeiro `.section` apos o bloco de condicoes comerciais
- Ou reduzir o `page-break-before` que pode estar forcando espaco extra
- Garantir que a secao comece sem espaco desnecessario no topo quando cai em nova pagina

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Mover overlay da capa para top-right; criar rodape fixo com logos em todas as paginas; reduzir padding superior do escopo |

### Detalhes tecnicos

**Rodape fixo em todas as paginas (CSS print)**:
```css
.page-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  padding: 8px 15mm;
  border-top: 2px solid #0047AB;
}
```
Esse padrao funciona em navegadores baseados em Chromium (Chrome, Edge) no modo de impressao, repetindo o rodape em cada pagina impressa.

**Overlay da capa**:
```css
.cover-overlay {
  position: absolute;
  top: 40px;
  right: 40px;
  text-align: right;
  color: #1a365d;
}
```

**Escopo sem padding extra**:
A secao de escopo tera `margin-top: 0; padding-top: 0` para ficar colada ao topo quando iniciar em nova pagina. O `page-break-before: always` sera adicionado para garantir que comece limpa em pagina nova sem espaco morto.
