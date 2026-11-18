// Modelos da régua de cobrança (RN-023, 01 §13). Assunto base + " · [RAZAO_SOCIAL]"; nascem sem validação.
// ponytail: corpos curtos escritos a partir dos assuntos da RN-023; o texto final do relatório C §3.6 entra
// pela tela de modelos (ccBaseModeloSalvar), sem mudar código.

const m = (codigo, nome, assunto, corpo, { extras = '', legal = false } = {}) =>
  ({ codigo, nome, assunto: `${assunto} · [RAZAO_SOCIAL]`, corpo, camposExtras: extras, efeitoLegal: legal });

const ASSINA = '\n\nQualquer dúvida, fale com a nossa equipe pelo [TELEFONE_CONTATO] ou [EMAIL_CONTATO].';

export const MODELOS = [
  m('COB_PREV_D5', 'Régua · D-5 · Lembrete', 'Lembrete: seu pagamento vence em breve!',
    `Prezado(a) [CLIENTE],\n\nLembramos que o título de [VALOR_PROXIMO_VENCIMENTO] de [RAZAO_SOCIAL] vence em [PROXIMO_VENCIMENTO]. Se o pagamento já estiver programado, desconsidere esta mensagem.${ASSINA}`),
  m('COB_PREV_D1', 'Régua · D-1 · Confirmação', 'Seu pagamento vence amanhã',
    `Prezado(a) [CLIENTE],\n\nO título de [VALOR_PROXIMO_VENCIMENTO] vence amanhã, [PROXIMO_VENCIMENTO]. Pedimos confirmar a programação do pagamento; se precisar do boleto ou do PIX, responda este e-mail.${ASSINA}`),
  m('COB_VENC_D0', 'Régua · D+0 · Vencimento', 'Atenção: seu pagamento vence hoje!',
    `Prezado(a) [CLIENTE],\n\nO título de [RAZAO_SOCIAL] vence hoje. Evite multa e juros efetuando o pagamento até o fim do dia.${ASSINA}`),
  m('COB_PAG_NAO_IDENT', 'Régua · Pagamento não identificado', 'Pagamento não identificado',
    `Prezado(a) [CLIENTE],\n\nNão identificamos o pagamento de [VALOR_VENCIDO], vencido em [VENCIMENTO_MAIS_ANTIGO]. Se já pagou, envie o comprovante; se não, segue a 2ª via para regularização.${ASSINA}`),
  m('COB_ATIVA', 'Régua · Cobrança ativa', 'Aviso: fatura vencida – regularize seu pagamento',
    `Prezado(a) [CLIENTE],\n\nConsta em aberto [VALOR_VENCIDO], vencido há [DIAS_ATRASO] dias. Novos pedidos ficam suspensos até a regularização.${ASSINA}`),
  m('COB_NOTIF_FORMAL', 'Régua · Notificação formal', 'Notificação de débito em aberto – aviso de protesto',
    `Prezado(a) [CLIENTE],\n\nNotificamos [RAZAO_SOCIAL] (CNPJ/CPF [CNPJ]) do débito de [VALOR_VENCIDO], vencido em [VENCIMENTO_MAIS_ANTIGO]. Sem a regularização até [DATA_LIMITE], o título será encaminhado a protesto em cartório.${ASSINA}`,
    { extras: 'DATA_LIMITE', legal: true }),
  m('COB_PROTESTO', 'Régua · Protesto em cartório', 'Aviso: título encaminhado para protesto em cartório',
    `Prezado(a) [CLIENTE],\n\nO débito de [VALOR_VENCIDO] de [RAZAO_SOCIAL], vencido em [VENCIMENTO_MAIS_ANTIGO], foi encaminhado a protesto em cartório e o crédito está bloqueado.${ASSINA}`,
    { legal: true }),
  m('COB_NEG_POS_PROTESTO', 'Régua · Negociação pós-protesto', 'Negociação do débito protestado',
    `Prezado(a) [CLIENTE],\n\nPara encerrar o protesto do débito de [VALOR_VENCIDO], apresentamos uma proposta de acordo válida até [DATA_LIMITE]. Após o pagamento enviamos a carta de anuência.${ASSINA}`,
    { extras: 'DATA_LIMITE' }),
  m('COB_EXTRAJUDICIAL', 'Régua · Extrajudicial', 'Notificação extrajudicial – débito em aberto',
    `Prezado(a) [CLIENTE],\n\nNotificamos extrajudicialmente [RAZAO_SOCIAL] (CNPJ/CPF [CNPJ]) do débito de [VALOR_VENCIDO], vencido em [VENCIMENTO_MAIS_ANTIGO]. Sem a regularização até [DATA_LIMITE], o caso segue para cobrança judicial.${ASSINA}`,
    { extras: 'DATA_LIMITE', legal: true }),
  m('COB_JURIDICO', 'Régua · Cobrança judicial', 'Notificação de encaminhamento para cobrança judicial',
    `Prezado(a) [CLIENTE],\n\nO débito de [VALOR_VENCIDO] de [RAZAO_SOCIAL] foi encaminhado ao Jurídico para cobrança judicial. Para um acordo antes do ajuizamento, procure-nos até [DATA_LIMITE].${ASSINA}`,
    { extras: 'DATA_LIMITE', legal: true }),
  m('COB_ANUENCIA', 'Carta de anuência', 'Quitação confirmada – carta de anuência',
    `Prezado(a) [CLIENTE],\n\nConfirmamos a quitação do débito de [RAZAO_SOCIAL]. Segue em anexo a carta de anuência para o cancelamento do protesto em cartório.${ASSINA}`,
    { legal: true }),
];
