// Quadros da 002 (05 §3): cobranca-privada, cobranca-estetica (iguais) e cobranca-publica; checklists
// (`<fase>_<n>`, ITENS_ACAO) e o trecho do gancho ccPodeMover (04 §8, DT-35), único para os três.

import { visibilidadeDeCliente, veTudo } from '../visibilidade.mjs';

/** Itens de cada fase: `textos`, os que definem "ação feita" (`acao`, ●) e o que o e-mail marca (`email`, ✉; 0 = nenhum). */
export const ITENS_ACAO = {
  prev_d5: { acao: [1], email: 1, textos: ['Lembrete de vencimento enviado (e-mail e WhatsApp)', 'Lançamento da nota fiscal no financeiro do cliente confirmado'] },
  prev_d1: { acao: [1], email: 1, textos: ['Contato de confirmação do pagamento', 'Boleto ou PIX reenviado, se necessário'] },
  venc_d0: { acao: [1], email: 1, textos: ['E-mail de vencimento do dia enviado'] },
  pag_nao_ident: { acao: [1, 2], email: 1, textos: ['E-mail enviado informando que o pagamento não foi identificado, com a 2ª via',
    'Ligação para o financeiro do cliente sobre o pagamento não identificado', 'Comprovante solicitado ou previsão de pagamento registrada'] },
  cob_ativa: { acao: [1, 2], email: 0, textos: ['Ligação com o responsável financeiro do cliente', 'Vendedor avisado e novos pedidos bloqueados no ERP',
    'Data e valor de pagamento registrados'] },
  notif_formal: { acao: [1], email: 1, textos: ['Notificação formal enviada (e-mail com confirmação ou carta com AR)', 'Data de envio ao cartório informada ao cliente'] },
  protesto: { acao: [1, 3], email: 0, textos: ['Título enviado a protesto em cartório', 'Título negativado (Serasa / Boa Vista)', 'Bloqueio total do crédito confirmado no ERP'] },
  neg_pos_protesto: { acao: [1], email: 1, textos: ['Proposta de acordo apresentada ao cliente', 'Retorno do cliente registrado'] },
  extrajudicial: { acao: [1], email: 1, textos: ['Notificação extrajudicial enviada pelo Financeiro (modelo padrão, prazo de 15 dias)',
    'Caso encaminhado à assessoria de cobrança', 'Última proposta de acordo apresentada'] },
  juridico: { acao: [1], email: 0, textos: ['Dossiê completo enviado ao Jurídico', 'Contato amigável do Jurídico com o cliente', 'Ação de execução ou monitória ajuizada'] },
  negociacao: { acao: [], email: 0, textos: ['Proposta de acordo apresentada', 'Acordo aprovado na alçada'] },
  acordo: { acao: [], email: 0, textos: ['Termo de acordo assinado', 'Parcelas geradas no cartão'] },
  regularizado: { acao: [], email: 0, textos: ['Pagamento conferido', 'Bloqueio de pedidos retirado', 'Carta de anuência enviada e negativação excluída (quando houve protesto)'] },
  baixado: { acao: [], email: 0, textos: ['Lançamento contábil da perda', 'Cliente mantido bloqueado'] },
};

/** Itens do quadro público (05 §3.3): só `juridico_1` define ação. */
export const ITENS_PUBLICA = {
  nf_protocolar: { acao: [], email: 0, textos: ['NF e empenho conferidos', 'NF protocolada com comprovante e certidões', 'Agente de cobrança definido'] },
  liquidacao_vencida: { acao: [], email: 0, textos: ['Fiscal do contrato contatado', 'Pendências documentais verificadas', 'Previsão de atesto e liquidação registrada'] },
  pagamento_vencido: { acao: [], email: 0, textos: ['Posição na ordem cronológica pedida (LAI)', 'Setor financeiro contatado', 'Previsão de pagamento registrada'] },
  oficio: { acao: [], email: 0, textos: ['Ofício enviado ao ordenador de despesa', 'Protocolo registrado'] },
  requerimento: { acao: [], email: 0, textos: ['Requerimento protocolado', 'Reconhecimento de dívida ou programação de pagamento'] },
  juridico: { acao: [1], email: 0, textos: ['Encaminhado ao jurídico', 'Ação ajuizada'] },
  regularizado: { acao: [], email: 0, textos: ['Pagamento conferido'] },
};

/** Itens da fase no quadro da carteira. */
export const itensDaFase = (carteira, fase) => (carteira === 'PUBLICA' ? ITENS_PUBLICA : ITENS_ACAO)[fase] || { acao: [], email: 0, textos: [] };

const campos = (itens, fase) => (itens[fase]?.textos || []).map((label, i) => ({
  chave: `${fase}_${i + 1}`, label, tipo: 'sim_nao', noCard: false, editavelDepois: true,
}));
const opcoes = (...rotulos) => ({ opcoes: rotulos.map((r) => ({ valor: r.toLowerCase().replace(/[^a-z]+/g, '_'), label: r })) });

const FASES_PRIVADA = [
  ['prev_d5', 'D-5 · Lembrete', 'comum', 0, 'data-1'],
  ['prev_d1', 'D-1 · Confirmação', 'comum', 0, 'data-1'],
  ['venc_d0', 'D+0 · Vencimento', 'comum', 0, 'data-2'],
  ['pag_nao_ident', 'D+2 · Pagamento não identificado', 'comum', 0, 'data-2'],
  ['cob_ativa', 'D+4 · Cobrança ativa', 'comum', 0, 'data-3'],
  ['notif_formal', 'D+7 · Notificação formal', 'comum', 0, 'data-3'],
  ['protesto', 'D+10 · Protesto em cartório', 'comum', 0, 'data-4'],
  ['neg_pos_protesto', 'D+20 · Negociação pós-protesto', 'comum', 0, 'data-4'],
  ['extrajudicial', 'D+30 · Extrajudicial', 'comum', 0, 'data-5'],
  ['juridico', 'D+45 · Cobrança judicial', 'comum', 0, 'data-5'],
  ['negociacao', 'Em negociação', 'comum', 240, 'data-6'],
  ['acordo', 'Acordo em andamento', 'comum', 0, 'data-6'],
  ['regularizado', 'Regularizados', 'sucesso', 0, 'data-7'],
  ['pago_no_prazo', 'Pagos no vencimento', 'sucesso', 0, 'data-7'],
  ['baixado', 'Baixados como perda', 'cancelado', 0, 'data-8'],
];
const FASES_PUBLICA = [
  ['nf_protocolar', 'NF a protocolar', 'comum', 48, 'data-1'],
  ['liquidacao_vencida', 'Liquidação vencida · cobrar atesto', 'comum', 120, 'data-3'],
  ['pagamento_vencido', 'Pagamento vencido · ordem cronológica', 'comum', 240, 'data-4'],
  ['oficio', 'Ofício / notificação formal', 'comum', 240, 'data-4'],
  ['requerimento', 'Requerimento administrativo', 'comum', 0, 'data-5'],
  ['juridico', 'Cobrança judicial', 'comum', 0, 'data-5'],
  ['regularizado', 'Pagos', 'sucesso', 0, 'data-7'],
  ['baixado', 'Baixados como perda', 'cancelado', 0, 'data-8'],
];

export const ETIQUETAS_PRIVADA = ['Protestado', 'Bloqueio pedidos', 'Bloqueio total', 'Bloqueio a aplicar', 'Promessa vencida', 'Sem contato',
  'Anuência pendente', 'Baixa pendente', 'Pronto para o Jurídico', 'Jurídico atrasado'];
export const ETIQUETAS_PUBLICA = ['Acima de 2 meses', 'Pequeno valor', 'Promessa vencida', 'Baixa pendente'];
const COR = { Protestado: '#b42318', 'Bloqueio total': '#b42318', 'Jurídico atrasado': '#b42318', 'Promessa vencida': '#b54708', 'Bloqueio a aplicar': '#b54708' };

const CAPA_PRIVADA = [
  { chave: 'vencido', label: 'Vencido', tipo: 'moeda', noCard: true },
  { chave: 'a_vencer', label: 'A vencer', tipo: 'moeda', noCard: true },
  { chave: 'bus', label: 'BUs', tipo: 'texto', noCard: true },
  { chave: 'proxima_acao', label: 'Próxima ação', tipo: 'texto', noCard: true },
  { chave: 'proxima_acao_data', label: 'Data da próxima ação', tipo: 'data', noCard: true },
  { chave: 'bloqueio', label: 'Bloqueio', tipo: 'selecao', noCard: true, config: opcoes('Pedidos', 'Total') },
  { chave: 'acordo', label: 'Acordo', tipo: 'progresso', noCard: true },
  { chave: 'acao_fase', label: 'Ação da régua', tipo: 'selecao', noCard: true, config: { ...opcoes('A fazer', 'Feita'), filtro: true } },
  { chave: 'ultimo_contato', label: 'Último contato', tipo: 'data', noCard: true },
];
const CAPA_PUBLICA = [
  { chave: 'valor_aberto', label: 'Valor em aberto', tipo: 'moeda', noCard: true },
  { chave: 'nfs_abertas', label: 'NFs em aberto', tipo: 'numero', noCard: true },
  { chave: 'acima_2m', label: 'Acima de 2 meses', tipo: 'moeda', noCard: true },
  { chave: 'proxima_acao', label: 'Próxima ação', tipo: 'texto', noCard: true },
  { chave: 'proxima_acao_data', label: 'Data da próxima ação', tipo: 'data', noCard: true },
];

const quadro = (slug, nome, fases, itens, capa, etiquetas) => ({
  slug, nome, descricao: `Casos de cobrança · ${nome}`, config: { semEmail: false },
  fases: fases.map(([chave, nomeFase, tipo, slaHoras, cor]) => ({ chave, nome: nomeFase, tipo, slaHoras, cor, campos: campos(itens, chave) })),
  campos: capa, etiquetas: etiquetas.map((rotulo) => ({ rotulo, cor: COR[rotulo] || '#475467' })), automacoes: [],
});

export const QUADROS = [
  quadro('cobranca-privada', 'Cobrança · Privada', FASES_PRIVADA, ITENS_ACAO, CAPA_PRIVADA, ETIQUETAS_PRIVADA),
  quadro('cobranca-estetica', 'Cobrança · Estética', FASES_PRIVADA, ITENS_ACAO, CAPA_PRIVADA, ETIQUETAS_PRIVADA),
  quadro('cobranca-publica', 'Cobrança · Pública', FASES_PUBLICA, ITENS_PUBLICA, CAPA_PUBLICA, ETIQUETAS_PUBLICA),
];

/* ── gancho (04 §8): destinos controlados primeiro (só o domínio), depois a saída fechada, depois quem move ── */

const REGUA = (f) => `(${f}.FINAL = FALSE AND ${f}.CHAVE NOT IN ('negociacao', 'acordo', 'juridico'))`;
const CASO = (cond) => `EXISTS (SELECT 1 FROM CC_COBRANCA CB WHERE CB.CARD_ID = K.ID AND ${cond})`;
const MOTIVO_REGUA = `(CASE WHEN EXISTS (SELECT 1 FROM CC_FASE FN WHERE FN.BOARD_ID = PARA.BOARD_ID AND FN.CHAVE = 'negociacao')
          THEN 'A régua move o card pelos dias de atraso.' ELSE 'A etapa do órgão acompanha as notas fiscais.' END)`;
const ACORDO_EM = (situacoes) => `EXISTS (SELECT 1 FROM CC_COBRANCA CB JOIN CC_ACORDO AC ON AC.COBRANCA_ID = CB.ID
          WHERE CB.CARD_ID = K.ID AND AC.SITUACAO IN (${situacoes}))`;
const OPERA = `EXISTS (SELECT 1 FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID WHERE CB.CARD_ID = K.ID
          AND M.CARGO <> 'JURIDICO' AND ${visibilidadeDeCliente('C', 'M', veTudo('M'))})`;

export function gancho(slug) {
  if (!['cobranca-privada', 'cobranca-estetica', 'cobranca-publica'].includes(slug)) return '';
  return `        WHEN PARA.CHAVE = 'acordo' THEN (CASE WHEN ${ACORDO_EM("'ATIVO'")} THEN '' ELSE 'O card vai para Acordo quando o acordo é aprovado.' END)
        WHEN PARA.CHAVE = 'juridico' THEN (CASE WHEN ${CASO('CB.JURIDICO_EM IS NOT NULL')} THEN '' ELSE 'Envie o dossiê pelo quadro Jurídico.' END)
        WHEN PARA.FINAL = TRUE THEN (CASE WHEN ${CASO(`CB.ENCERRADO_EM IS NOT NULL AND CB.DESFECHO = (CASE PARA.CHAVE WHEN 'regularizado' THEN 'REGULARIZADO'
          WHEN 'pago_no_prazo' THEN 'PAGO_NO_PRAZO' WHEN 'baixado' THEN 'BAIXADO' ELSE '-' END)`)} THEN ''
          ELSE 'O caso é encerrado pelo sistema (saldo zerado) ou pela decisão de baixa.' END)
        WHEN ${REGUA('DE')} AND ${REGUA('PARA')} THEN (CASE WHEN ${CASO('CB.FASE_DEVIDA = PARA.CHAVE')} THEN '' ELSE ${MOTIVO_REGUA} END)
        WHEN DE.CHAVE IN ('acordo', 'juridico') OR DE.FINAL = TRUE THEN ${MOTIVO_REGUA}
        WHEN NOT ${OPERA} THEN 'Só quem opera o caso move o card.'
        WHEN PARA.CHAVE = 'negociacao' AND NOT ${CASO(`EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_CARTEIRA PC
          WHERE PC.CLIENTE_ID = CB.CLIENTE_ID AND PC.CARTEIRA = CB.CARTEIRA AND PC.VENCIDO > 0)`)} THEN 'Só cliente com saldo vencido entra em negociação.'
        WHEN DE.CHAVE = 'negociacao' AND ${ACORDO_EM("'PROPOSTO', 'ATIVO'")} THEN 'Há acordo em aberto neste caso.'`;
}
