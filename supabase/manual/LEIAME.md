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
  (atualizada — passa a gerar o arquivo PDF para baixar/anexar, tira a palavra "Rascunho" do cabeçalho e gera o PDF da **proposta de serviço**; o botão antigo de imprimir continua igual)

Confira em **More → Database → Manage → Edge functions** (ou o equivalente) que as quatro estão publicadas.

## 3. Banco de dados (SQL)
Peça no chat *"execute esta migration"* e cole o conteúdo, ou use o SQL editor:

1. `2026-11-17_contracts_extra_services.sql` — serviços adicionais editáveis no contrato (opcional)
2. `2026-11-17_autentique.sql` — tabelas e colunas da assinatura digital
3. `2026-11-18_email_integration.sql` — conta de e-mail da empresa e registro dos envios de proposta
4. `2026-11-19_service_proposal.sql` — colunas da proposta de serviço (só depois dele a opção **Serviço** aparece em Nova Proposta)
5. `2026-11-20_proposal_closing.sql` — colunas do **fechamento** da proposta (só depois dele aparece **Confirmar fechamento**)
6. `2026-11-21_fleet.sql` — gestão da frota de gruas locadas (só depois dele o item **Frota** aparece no menu e o cartão "Locação em obra" nos contratos de locação)

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

## 8. Proposta de serviço (modelo TECSU)
Depois de publicar a função `generate-pdf` e rodar o SQL do item 4 da seção 3:
1. **Propostas → Nova Proposta → Serviço**. São 5 etapas: Cliente, Escopo (obra, objeto, equipamento), Preços, Condições e Revisão.
2. **Empresa emitente:** vem **Dacrom Brasil Serviços** por padrão (cabeçalho, rodapé e assinante saem dela); dá para trocar na etapa Escopo.
3. **Tabela de preços:** cada linha tem quantidade, unidade (Vb, Hs, Mês, Dia, Único, Un) e preço unitário.
   - com quantidade → soma no total;
   - sem quantidade → *sob medição* (vale o preço unitário, não soma);
   - *Opcional* → aparece com a marcação "OPCIONAL" e não soma.
   O menu **Atalhos de serviços** traz os serviços do modelo (montagem, telescopagem, manutenção, hora técnica...) **sem preço** — o preço é sempre definido por quem faz a proposta.
4. **Textos:** responsabilidades, pagamento, reajuste, retenções etc. já vêm preenchidos e são totalmente editáveis (com botão "Restaurar"). Para finalizar é preciso marcar que os textos foram revisados — reajuste, retenções e prazos do modelo **devem ser conferidos** para cada cliente.
5. Propostas de serviço funcionam com o que já existe: lista, **Baixar PDF**, **Enviar ao cliente** (e-mail), Relatórios, editar e duplicar.

## 9. Confirmar o fechamento de uma proposta finalizada
Depois do SQL do item 5 da seção 3:
1. Em **Propostas**, no menu "⋯" de uma proposta **finalizada** (ou no detalhe dela): **Confirmar fechamento**. Escolha a data (hoje por padrão; não aceita futuro nem antes da criação da proposta) e, se quiser, uma observação (ex.: nº do pedido de compra).
2. A proposta ganha o selo **Fechada** e entra no filtro **Fechadas**. A situação continua "Finalizada": "fechada" significa que o cliente aceitou.
3. Marcou por engano? **Desfazer fechamento**, no mesmo menu.
4. Propostas **internacionais** (cliente do exterior ou proposta em US$/€) ganham o selo **Internacional** na lista e no detalhe — isso não depende de SQL.

## 10. Frota de gruas locadas em obras

Depois de rodar `2026-11-21_fleet.sql` (item 6 do passo 3) e publicar o app, o menu ganha **Frota** (somente administradores; os valores de compra e a rentabilidade ficam restritos a eles, também no banco).

Como usar, na ordem:
1. **Frota → Nova grua**: cadastre cada grua física (código/patrimônio, modelo do catálogo, medidas, valor e data de compra). O valor de compra é a base do "valor empregado".
2. Em um **contrato de locação**, aparece o cartão **Locação em obra (frota)**: clique em *Alocar grua a este contrato*. Cliente, obra, início, prazo e valores já vêm da proposta; escolha a grua (o sistema marca as que estão ocupadas no período, em manutenção ou que não atendem a altura/lança/carga exigidas pela obra). Também dá para alocar direto em **Frota → Alocar grua a uma obra**, sem contrato.
3. Acompanhe no **Panorama**: números da frota, o que precisa de atenção (devolução atrasada, cliente esperando a grua, contrato terminando em até 30 dias, contrato sem assinatura, grua parada), linha do tempo de todas as gruas, receita por mês e rentabilidade.
4. Ao fim da obra: **Registrar devolução** (ou **Prorrogar**). Lance manutenção, frete e **investimentos** (reforma/upgrade) na página de cada grua para ver o resultado real.

Como os números são calculados:
- **Valor empregado** = compra + investimentos lançados.
- **Receita** = aluguel mensal pro rata dos dias em obra + mobilização (ao iniciar) + desmobilização (ao devolver). Se a grua passa do prazo sem voltar, continua rendendo e aparece como atrasada.
- **Resultado** = receita − custos de operação (manutenção, frete, montagem, seguro, impostos).
- **Rentabilidade (ROI)** = resultado ÷ valor empregado. **Rendimento mensal** = mensalidade atual ÷ valor empregado. **Utilização** = dias em obra ÷ dias disponíveis nos últimos 12 meses.
- Valores de propostas em dólar são convertidos pela cotação gravada na proposta; em outra moeda sem cotação, preencha em reais.

## 11. Proposta de locação com quadro de preços (modelo por equipamento)

Usa o mesmo SQL da proposta de serviço (item 4 da seção 3) e exige publicar de novo a função `generate-pdf`. **Sem o SQL**, a locação continua funcionando no formato simples de antes (só não grava os textos e as linhas detalhadas).

1. **Propostas → Nova Proposta → Locação.** São 8 etapas: Cliente, Obra, Grua, **Preços**, **Condições**, Comercial, Resumo e Revisão.
2. **Preços:** cada custo é uma linha própria, em dois blocos — *Locação de bens móveis* (locação mensal, hora adicional, caçamba, **seguro**) e *Serviços de mão-de-obra* (montagem, desmontagem, mobilização, desmobilização, frete, **operador**, **manutenção**, **assistência técnica**...). Cada linha tem quantidade, unidade e valor unitário.
   - **Linha sem valor não aparece na proposta**; é só desligar o interruptor para tirar (ex.: mobilização). Os itens desligados ficam numa linha só.
   - Dá para **acrescentar itens próprios** (botão *Adicionar item*) em qualquer bloco.
   - Itens mensais acompanham o prazo da locação (clique no texto abaixo da linha para usar uma quantidade fixa).
   - *Manutenção corretiva fora do horário comercial* (após 17h e após 22h): tabelas de valor por hora com campo **Adesão: Sim / Não** na proposta; só aparecem se tiverem valor e **não somam** no total.
3. **Condições:** seguro, incluso, não incluso, observações, compromissos da contratante/contratada, medição e pagamentos, prazos, jornadas, aceite. Os textos já vêm preenchidos e são editáveis (botão *Restaurar*). São um **ponto de partida genérico**: percentuais, multas, prazos e reajustes **devem ser conferidos** para cada cliente. Para finalizar é preciso marcar que os textos foram revisados.
4. **Obra:** nome, local, contato (Att.), período, início previsto e requisitos técnicos. **Tipo de obra, condição do terreno e fundação especial não são mais perguntados** (propostas antigas mantêm o que já tinham gravado; no contrato de locação cadastrado, as linhas 4.1, 4.3 e 4.4 que citam esses dados saem com "—" até o modelo do contrato ser ajustado).
5. **Comercial:** **imposto** e **desconto** continuam como antes (o desconto respeita o limite de cada usuário e o pedido de aprovação).
6. O **PDF** sai em formato de carta, com o quadro de preços (valor total por equipamento), as tabelas de adesão, os textos numerados e o aceite. A empresa emitente é escolhida na etapa Condições (padrão: Dacrom). "Esconder valores unitários" (etapa Comercial) tira as colunas de preço e deixa só o total.
7. Propostas de locação antigas continuam abrindo: ao editar, os valores já gravados viram linhas do quadro (o que era "incluso" vira linha ligada **sem valor**, com aviso, até alguém informar o preço). Contrato, frota e relatórios continuam lendo os mesmos campos de antes.
8. A proposta detalhada é sempre em português. O **contrato** de locação segue o modelo cadastrado em Modelos de Contrato; incluir ali as mesmas cláusulas da proposta (e outras) é um passo à parte.

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

**Proposta de serviço:** o texto e o layout do PDF foram conferidos no navegador (a mesma página que a função monta), e as
telas, os cálculos e a ordem de gravação foram testados automaticamente (com banco simulado). Mas **não foi aberta com
login no sistema real** nem gerada pelo PDFShift — confira no primeiro teste: margens, o rodapé com "Página X de Y" e
as quebras de página da tabela. O botão **Gerar Contrato** numa proposta de serviço usa o modelo de contrato de serviço
que já existe no sistema; não foi testado.
