# Como ativar o que o Lovable não aplica sozinho

O Lovable **não** implanta edge functions nem roda SQL que chegam pelo git (conforme a documentação dele).
Por isso, depois de mergear na `main`, é preciso fazer estes passos. A ordem importa.

## 1. Telas do app
Mergeou na `main` → o Lovable sincroniza → clique em **Publish** no Lovable.

## 2. Edge functions (pelo chat do Lovable)
Peça, uma de cada vez, sem alterar o código:

- *"Faça o deploy da edge function `generate-contract-pdf` com o código que está no repositório, sem alterar nada."*
  (corrige rodapé com número de página, fuso horário de Brasília e testemunhas no PDF)
- *"Faça o deploy da edge function `contract-signature` com o código que está no repositório, sem alterar nada."*
  (nova — assinatura digital pelo Autentique)
- *"Faça o deploy da edge function `proposal-email` com o código que está no repositório, sem alterar nada."*
  (nova — conectar o e-mail da empresa e enviar propostas aos clientes)
- *"Faça o deploy da edge function `generate-pdf` com o código que está no repositório, sem alterar nada."*
  (atualizada — passa a gerar o arquivo PDF para baixar/anexar e tira a palavra "Rascunho" do cabeçalho; o botão antigo de imprimir continua igual)

Confira em **More → Database → Manage → Edge functions** (ou o equivalente) que as quatro estão publicadas.

## 3. Banco de dados (SQL)
Peça no chat *"execute esta migration"* e cole o conteúdo, ou use o SQL editor:

1. `2026-11-17_contracts_extra_services.sql` — serviços adicionais editáveis no contrato (opcional)
2. `2026-11-17_autentique.sql` — tabelas e colunas da assinatura digital
3. `2026-11-18_email_integration.sql` — conta de e-mail da empresa e registro dos envios de proposta

São só colunas/tabelas **novas**; nada existente é alterado. O app funciona sem eles.

## 4. Autentique
1. No painel do Autentique, gere a **chave de API**: https://painel.autentique.com.br/perfil/api
2. Em **Lovable Cloud → Secrets**, crie (nunca cole a chave no chat nem no código):
   - `AUTENTIQUE_API_KEY` — a chave de API
   - `AUTENTIQUE_WEBHOOK_SECRET` — o segredo de validação dos webhooks (veja o passo 3 abaixo)
   - `AUTENTIQUE_SANDBOX` — **deixe sem criar** (modo teste) até o teste dar certo; só crie com o valor `false` para contratos reais
3. No painel do Autentique (desenvolvedor/webhooks), cadastre o endpoint:
   `https://untvhsyorhojoviyplax.supabase.co/functions/v1/contract-signature`
   com os eventos: `signature.viewed`, `signature.accepted`, `signature.rejected`, `document.finished`.
   > A documentação do Autentique não deixa claro onde se obtém o segredo do webhook. Confira no painel.
   > Sem o webhook, o botão **Atualizar status** do contrato faz a mesma conferência manualmente.

## 5. Teste (modo teste / sandbox)
Documentos de teste **não têm validade jurídica** e não gastam crédito.
1. Crie um contrato de teste, aprove, e clique em **Enviar para assinatura digital**.
2. Assine com um e-mail seu.
3. Veja o status mudar para "Assinou" e o PDF assinado aparecer em **Baixar assinado**.
4. Só então crie `AUTENTIQUE_SANDBOX = false` para valer.

## 6. E-mail da empresa (enviar propostas ao cliente)
Depois de publicar `proposal-email` e rodar o SQL do e-mail:
1. Entre como administrador em **Webhooks & Integrações → E-mail**.
2. Escolha o provedor (Gmail, Microsoft 365, Zoho, HostGator…) ou preencha servidor/porta/segurança, usuário e senha.
   - **Gmail/Google Workspace:** use uma **senha de app** (a senha normal não funciona).
   - **Microsoft 365:** o administrador do tenant precisa liberar o envio SMTP autenticado.
3. Preencha o remetente, salve e clique em **Enviar e-mail de teste**.
4. Ligue **Ativar envio de propostas por e-mail**. Opcional: **Exigir autorização de um administrador**.

Como funciona para o vendedor: na proposta **finalizada** → **Enviar ao cliente** → confere destinatário, assunto e
mensagem, usa **Conferir o PDF**, marca **Autorizo o envio** e envia. Com a exigência de administrador ligada, o pedido
vai para **Aprovações** e só sai quando um administrador autorizar.

Segurança: a senha do e-mail é guardada criptografada e não volta para a tela. A chave de criptografia é derivada do
segredo do servidor; se esse segredo for trocado, basta digitar a senha do e-mail de novo e salvar.

## 7. App instalável (PWA) e Relatórios — nada a configurar
Basta publicar. Para instalar: no computador/Android, o navegador mostra **Instalar app** (também no menu lateral do
sistema); no iPhone, pelo Safari: Compartilhar → Adicionar à Tela de Início (o sistema mostra esse passo a passo).

O que o PWA faz: ícone na tela, abre em tela cheia, aviso de "nova versão" com botão **Atualizar**, faixa de
"sem conexão" e uma página amigável quando falta internet. **Dados de clientes, propostas e contratos NUNCA ficam
guardados no aparelho**: só os arquivos do próprio app (telas, ícones) entram no cache; tudo do Supabase vai
sempre direto para a rede. O app continua precisando de internet para trabalhar.

## O que NÃO foi testado
A integração foi escrita pela documentação pública do Autentique (https://docs.autentique.com.br/api/2),
mas **não foi executada contra a API real** (não havia chave). O teste do passo 5 é obrigatório.
Pontos que a documentação não deixa 100% claros e que podem exigir ajuste no teste:
formato exato dos eventos de webhook, acesso ao link do PDF assinado e onde obter o segredo do webhook.

O envio de e-mail também **não foi executado contra um servidor SMTP real** (a criptografia da senha, a validação e o
HTML do e-mail foram testados à parte). O teste do passo 6 é obrigatório. O PDF anexado depende do PDFShift
(a mesma chave `PDFSHIFT_API_KEY` que já gera os contratos); confira no teste se o visual do PDF baixado está igual
ao da impressão.

O PWA foi verificado por teste automático (manifesto, ícones, regras do service worker executadas em ambiente simulado)
e por inspeção do manifesto no navegador, mas **o registro do service worker não pôde ser testado no navegador do
ambiente de desenvolvimento** (ele não suporta service workers). Teste no ar: abra o sistema no Chrome, confira em
DevTools → Application que o service worker está ativo e use **Instalar app**. Os ícones foram gerados a partir do
logotipo de 212 px; se quiser nitidez total, forneça a marca em alta resolução.
