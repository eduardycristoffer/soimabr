import type { Tour } from "@/lib/tour";

/**
 * Tour "Novidades". Os nomes de botões e abas citados aqui são os que existem na tela;
 * se algum mudar, ajuste o texto (há um teste que confere os alvos).
 *
 * Passos sem `target` (ou com alvo que não aparece, como o menu no celular) viram um cartão no
 * centro da tela — por isso todo texto precisa fazer sentido sozinho.
 */
export const NOVIDADES_TOUR: Tour = {
  id: "novidades",
  version: 1,
  title: "Novidades do sistema",
  description: "Propostas, contratos, assinatura digital, e-mail, relatórios e o app para celular.",
  steps: [
    {
      id: "boas-vindas",
      title: "Conheça as novidades",
      body:
        "Este tour leva cerca de 3 minutos e mostra o que mudou: propostas, contratos, assinatura digital, envio por e-mail, relatórios e o aplicativo para celular.\n\n" +
        "Use os botões ou as setas do teclado. A tecla Esc fecha o tour.",
      tip: "Para refazer depois, use o botão “Tour guiado” no menu (no celular, toque em “Mais”).",
    },
    {
      id: "propostas",
      route: "/orcamentos",
      target: 'nav a[href="/orcamentos"]',
      placement: "right",
      title: "Propostas comerciais",
      body:
        "Aqui ficam todas as propostas, de venda, de locação e (quando ativada) de serviço. Cada linha mostra o status e a revisão (“rev. N”).\n\n" +
        "Clicando no número você abre o detalhe; o menu “⋯” de cada linha traz as ações.",
    },
    {
      id: "nova-proposta",
      route: "/orcamentos",
      target: '[data-tour="nova-proposta"]',
      title: "Nova proposta",
      body:
        "Escolha o tipo: Venda ou Locação.\n\n" +
        "Na locação, o desconto agora respeita o limite de cada usuário: acima dele, a proposta não é finalizada e vai para a aprovação de um administrador.",
    },
    {
      id: "servico",
      feature: "service",
      route: "/orcamentos",
      target: '[data-tour="nova-proposta"]',
      title: "Proposta de serviço",
      body:
        "Nova opção para montagem, manutenção e operação de grua. Você monta a tabela de preços (com quantidade, “sob medição” ou opcional), ajusta os textos de responsabilidades e gera um PDF em formato de carta, com o aceite do cliente no final.",
      tip: "Antes de finalizar, o sistema pede para você confirmar que revisou os textos-padrão.",
    },
    {
      id: "valores",
      route: "/orcamentos",
      title: "Valores em reais",
      body:
        "Toda proposta é em reais (R$). Nas propostas internacionais, o valor em dólar aparece só como estimativa pela cotação do dia, sempre identificado como estimativa.\n\n" +
        "Assim, a variação do câmbio não muda o valor da proposta.",
    },
    {
      id: "pdf-email",
      route: "/orcamentos",
      target: '[data-tour="acoes-proposta"]',
      title: "Baixar o PDF e enviar ao cliente",
      body:
        "No menu “⋯” da proposta há “Baixar PDF” (o arquivo pronto, sem a palavra “Rascunho”) e, nas finalizadas, “Enviar ao cliente” por e-mail.\n\n" +
        "No envio, você confere destinatário, assunto e mensagem, abre o PDF e marca “Autorizo o envio desta proposta ao cliente”.",
      tip: "O envio por e-mail aparece depois que um administrador conecta o e-mail da empresa.",
    },
    {
      id: "contratos",
      route: "/contratos",
      target: 'nav a[href="/contratos"]',
      placement: "right",
      title: "Contratos mais fáceis de ajustar",
      body:
        "No editor do contrato você corrige sozinho os dados do contrato, inclui mais de um representante e até 3 testemunhas, e edita serviços adicionais e parcelas.\n\n" +
        "CPF, CNPJ, telefone e CEP formatam sozinhos. No PDF, a numeração de páginas e o horário (Brasília) saem corretos, e o e-mail da nota fiscal entra no item 4.1.1.",
    },
    {
      id: "assinatura",
      route: "/contratos",
      title: "Assinatura digital (Autentique)",
      body:
        "Com o contrato aprovado, o botão “Enviar para assinatura digital” manda o documento para assinatura e acompanha cada assinante. Ao final, o PDF assinado fica registrado no próprio contrato.\n\n" +
        "Para funcionar, um administrador precisa conectar a conta do Autentique.",
      tip: "Começa em modo de teste, sem validade jurídica, até a chave de produção ser ativada.",
    },
    {
      id: "relatorios",
      route: "/relatorios",
      target: '[data-tour="relatorios-abas"]',
      placement: "bottom",
      title: "Relatórios",
      body:
        "Abas: Visão geral, Propostas, Contratos e (para administradores) Vendedores.\n\n" +
        "Use os filtros de período, tipo (venda, locação, serviço) e status para comparar resultados.",
    },
    {
      id: "integracao-email",
      adminOnly: true,
      route: "/webhooks",
      target: '[data-tour="aba-email"]',
      placement: "bottom",
      title: "Conectar o e-mail da empresa",
      body:
        "Na aba E-mail, escolha o provedor (Gmail, Microsoft 365, Zoho, HostGator…), informe usuário e senha, envie um e-mail de teste e ligue o envio de propostas.\n\n" +
        "Se quiser, marque “Exigir autorização de um administrador” para cada envio.",
      tip: "No Gmail, use uma senha de app. A senha é guardada criptografada e nunca volta para a tela.",
    },
    {
      id: "aprovacoes",
      adminOnly: true,
      route: "/aprovacoes",
      target: 'nav a[href="/aprovacoes"]',
      placement: "right",
      title: "Aprovações",
      body:
        "Além dos descontos acima do limite, aqui aparecem os envios de proposta por e-mail que aguardam autorização, quando essa exigência está ligada.",
    },
    {
      id: "app",
      target: '[data-tour="instalar-app"]',
      placement: "right",
      title: "Instale como aplicativo",
      body:
        "No computador e no Android, use “Instalar app” no menu (no celular, em “Mais”). No iPhone, abra pelo Safari e toque em Compartilhar → Adicionar à Tela de Início.\n\n" +
        "O app abre em tela cheia, avisa quando há versão nova e mostra um aviso se a internet cair.",
      tip: "Os dados continuam precisando de internet e nunca ficam guardados no aparelho.",
    },
    {
      id: "fim",
      title: "Pronto!",
      body:
        "Para rever este tour, use “Tour guiado” no menu (no celular, em “Mais”).\n\n" +
        "Se algo não funcionar como descrito aqui, avise para ajustarmos.",
    },
  ],
};

export const TOURS: Tour[] = [NOVIDADES_TOUR];

export const getTour = (id: string): Tour | undefined => TOURS.find((t) => t.id === id);
