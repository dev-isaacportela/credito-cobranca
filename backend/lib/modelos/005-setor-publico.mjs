// Modelos de comunicação com o órgão (Anexo A da spec 005, 04 §5): sete `PUB_*`. Ofício e requerimento têm
// efeito legal (só saem com a versão atual validada, RN-033). Campos da NF em CAMPOS_EXTRAS (01 §13, PA-10).
// ponytail: corpos escritos a partir do resumo do Anexo A; o texto final entra pela tela de modelos.

const EXTRAS = 'ORGAO,NUMERO_NF,EMISSAO_NF,VALOR_NF,EMPENHO,CONTRATO,PROTOCOLO,DATA_LIQUIDAR_ATE,DATA_PAGAR_ATE,DIAS_ATRASO_NF';
const m = (codigo, nome, assunto, corpo, legal = false) => ({ codigo, nome, assunto, corpo, camposExtras: EXTRAS, efeitoLegal: legal });
const ASSINA = '\n\nAtenciosamente,\n[AGENTE]\n[ASSINATURA] · [TELEFONE_CONTATO] · [EMAIL_CONTATO]';

export const MODELOS = [
  m('PUB_ANALISE', 'Órgão · Análise · Fluxo de pagamento', 'Fluxo de pagamento · [ORGAO]',
    `Prezado(a) [CLIENTE],\n\nPara a análise de crédito de [ORGAO], pedimos ao setor financeiro o fluxo de pagamento: quem atesta, quem liquida, o prazo usual e a ordem cronológica por fonte de recurso, além do contato do fiscal do contrato [CONTRATO].${ASSINA}`),
  m('PUB_PROTOCOLO', 'Órgão · Protocolo da NF', 'NF [NUMERO_NF] · confirmação de protocolo',
    `Prezado(a) [CLIENTE],\n\nInformamos a NF [NUMERO_NF], emitida em [EMISSAO_NF], no valor de [VALOR_NF], referente ao empenho [EMPENHO]. Pedimos a confirmação do protocolo e do atesto; seguem as certidões da empresa.${ASSINA}`),
  m('PUB_LIQ', 'Órgão · Liquidação vencida', 'NF [NUMERO_NF] · liquidação pendente',
    `Prezado(a) [CLIENTE],\n\nO prazo de liquidação da NF [NUMERO_NF] (empenho [EMPENHO], valor [VALOR_NF]) venceu em [DATA_LIQUIDAR_ATE]. Pedimos informar as pendências do atesto e a previsão de liquidação.${ASSINA}`),
  m('PUB_FILA', 'Órgão · Posição na ordem cronológica (LAI)', 'Pedido de informação · NF [NUMERO_NF]',
    `Prezado(a) [CLIENTE],\n\nCom base na Lei 12.527/2011 (LAI) e no art. 141 da Lei 14.133/2021, pedimos a posição da NF [NUMERO_NF], de [VALOR_NF], na ordem cronológica de pagamentos de [ORGAO] e a data prevista de pagamento.${ASSINA}`),
  m('PUB_PAGAMENTO', 'Órgão · Pagamento vencido', 'NF [NUMERO_NF] · pagamento vencido',
    `Prezado(a) [CLIENTE],\n\nO pagamento da NF [NUMERO_NF] (empenho [EMPENHO], valor [VALOR_NF]) venceu em [DATA_PAGAR_ATE], há [DIAS_ATRASO_NF] dias. Pedimos a programação do pagamento.${ASSINA}`),
  m('PUB_OFICIO', 'Órgão · Ofício de cobrança', 'Ofício · cobrança da NF [NUMERO_NF]',
    `Ao Ordenador de Despesa de [ORGAO],\n\nA NF [NUMERO_NF], emitida em [EMISSAO_NF], no valor de [VALOR_NF], empenho [EMPENHO], protocolada em [PROTOCOLO], tinha liquidação devida até [DATA_LIQUIDAR_ATE] e pagamento até [DATA_PAGAR_ATE]. Os prazos legais venceram. Requeremos a liquidação ou o pagamento e resposta em 10 dias úteis.${ASSINA}`, true),
  m('PUB_REQUERIMENTO', 'Órgão · Requerimento administrativo (art. 137)', 'Requerimento administrativo · NF [NUMERO_NF]',
    `Ao Ordenador de Despesa de [ORGAO],\n\nA NF [NUMERO_NF], emitida em [EMISSAO_NF], no valor de [VALOR_NF], empenho [EMPENHO], está em atraso superior a 2 meses da emissão (art. 137 da Lei 14.133/2021). Requeremos o reconhecimento da dívida e a programação do pagamento, com resposta em 10 dias úteis.${ASSINA}`, true),
];
