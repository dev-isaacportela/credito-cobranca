// Quadros da 004 (05 §4, §5, §7): concessao-privada, concessao-estetica (iguais), concessao-publica e
// pedidos-limite; e o trecho do gancho ccPodeMover (04 §8, DT-35): um texto para os três concessao-*.

import { PARAM_NUM } from '../parametros.mjs';
import { HOJE_SQL } from '../tempo.mjs';

export const ITENS = {
  entrada: ['Proposta assinada pelo cliente', 'Documento de identificação recebido', 'Autorização de consulta ao SCR e aos bureaus assinada (LGPD)'],
  cadastral: ['Consulta Serasa / Boa Vista', 'Consulta SCR (endividamento bancário)', 'Restritivos e protestos verificados', 'Grupo econômico mapeado',
    'Confirmação por contato telefônico com o cliente', 'Confirmação de endereço (comprovante, visita ou foto da fachada)',
    'Contato financeiro identificado e confirmado', 'Comprovante de renda ou faturamento', 'Comprovante de endereço',
    'Contrato social e últimas alterações (PJ)', 'Situação na Receita Federal e quadro societário (QSA) conferidos',
    'Ações judiciais, falência e recuperação judicial pesquisadas', 'Sócios e empresas ligadas sem débitos com o grupo'],
  credito: ['Capacidade de pagamento calculada', 'Score e rating atribuídos', 'Limite e condições sugeridos', 'Parecer do agente'],
  comite: ['Alçada de aprovação definida', 'Proposta apresentada', 'Decisão e condições registradas'],
  formalizacao: ['Termo de concessão de limite / contrato de fornecimento emitido',
    'Garantias formalizadas, quando exigidas (aval, nota promissória, fiança ou seguro de crédito)', 'Termo assinado digitalmente',
    'Poderes de quem assina conferidos (contrato social ou procuração)'],
  liberacao: ['Conferência final de documentos', 'Limite cadastrado e ativo no ERP'],
  gestao: ['Limite cadastrado no ERP', 'Validade de 3 meses registrada', 'Monitoramento de exposição ativo', 'Garantias e covenants acompanhados'],
  reanalise: ['Histórico de compras e pagamentos revisado', 'Serasa e SCR atualizados', 'Limite reavaliado', 'Parecer de renovação registrado'],
  obsoleto: ['Limite bloqueado no ERP', 'Cliente informado'],
  recusada: ['Motivo da recusa registrado', 'Cliente comunicado'],
};
export const ITENS_PUBLICA = {
  entrada: ['Solicitação da área Comercial ou de Licitação', 'Órgão público identificado', 'Valor e prazo da operação definidos'],
  analise: ['Contrato ou ata, empenho e ordem de fornecimento', 'Dotação orçamentária e autorização da despesa', 'Publicação da contratação, quando aplicável',
    'Capacidade financeira do ente avaliada', 'Histórico de pagamentos e restos a pagar verificados'],
  comite: ['Risco da operação classificado', 'Aprovação conforme a política e as alçadas'],
};
export const ITENS_PEDIDO = {
  retido: ['Excesso confirmado no ERP', 'Agente responsável atribuído'],
  analise: ['Títulos em aberto e atrasos verificados', 'Histórico de pagamento consultado', 'Exposição do grupo econômico revisada', 'Recomendação registrada'],
  alcada: ['Alçada competente acionada', 'Condição de liberação definida'],
  liberado: ['Desbloqueio feito no ERP', 'Comercial avisado'],
  recusado: ['Motivo registrado', 'Comercial avisado'],
};

const checklist = (itens, fase) => (itens[fase] || []).map((label, i) => ({ chave: `${fase}_${i + 1}`, label, tipo: 'sim_nao', noCard: false, editavelDepois: true }));
const sim = (...chaves) => ({ op: 'e', regras: chaves.map((campo) => ({ campo, cmp: 'igual', valor: '1' })) });

const FASES_PRIVADA = [
  ['entrada', '1 · Solicitação recebida', 'comum', 24, 'data-1'],
  ['cadastral', '2 · Documentação e análise cadastral', 'comum', 72, 'data-2'],
  ['credito', '3 · Análise de crédito', 'comum', 72, 'data-2', sim('cadastral_5', 'cadastral_6', 'cadastral_7')],
  ['comite', '4 · Comitê / Alçada', 'comum', 48, 'data-3'],
  ['formalizacao', '5 · Formalização', 'comum', 48, 'data-4'],
  ['liberacao', '6 · Liberação', 'comum', 24, 'data-4', { op: 'e', regras: [{ campo: 'termo_assinado', cmp: 'preenchido' }] }],
  ['gestao', 'Gestão de crédito', 'comum', 0, 'data-7'],
  ['reanalise', 'Reanálise', 'comum', 120, 'data-5'],
  ['obsoleto', 'Cadastro obsoleto', 'cancelado', 0, 'data-8'],
  ['recusada', 'Recusadas', 'cancelado', 0, 'data-8'],
  ['encerrada', 'Encerradas (crédito substituído)', 'sucesso', 0, 'data-6'],
];
const FASES_PUBLICA = [
  ['entrada', '1 · Recebimento da solicitação', 'comum', 24, 'data-1'],
  ['analise', '2 · Análise documental e financeira', 'comum', 192, 'data-2'],
  ['comite', '3 · Classificação de risco e aprovação', 'comum', 48, 'data-3', sim('analise_1', 'analise_2')],
  ['gestao', 'Monitoramento (crédito ativo)', 'comum', 0, 'data-7'],
  ['reanalise', 'Reavaliação de risco', 'comum', 120, 'data-5'],
  ['obsoleto', 'Cadastro obsoleto', 'cancelado', 0, 'data-8'],
  ['recusada', 'Recusadas', 'cancelado', 0, 'data-8'],
  ['encerrada', 'Encerradas', 'sucesso', 0, 'data-6'],
];
const FASES_PEDIDO = [
  ['retido', 'Retido por limite', 'comum', 2, 'data-3'],
  ['analise', 'Análise do excesso', 'comum', 4, 'data-4'],
  ['alcada', 'Aprovação da alçada', 'comum', 8, 'data-5'],
  ['liberado', 'Liberado', 'sucesso', 0, 'data-7'],
  ['recusado', 'Recusado', 'cancelado', 0, 'data-8'],
];

export const ETIQUETAS_CONCESSAO = ['Exceção ao motor', 'Ajuste de rating pendente', 'Pré-aprovada', 'Aplicar no Winthor', 'Limite diverge do Winthor', 'Renovação'];
export const ETIQUETAS_PEDIDO = ['Liberação crítica', 'Dentro da regra'];
const COR = { 'Exceção ao motor': '#b54708', 'Ajuste de rating pendente': '#b54708', 'Limite diverge do Winthor': '#b42318', 'Liberação crítica': '#b42318' };
const opcoes = (...v) => ({ opcoes: v.map((valor) => ({ valor, label: valor.charAt(0) + valor.slice(1).toLowerCase() })) });

const CAPA_CONCESSAO = [
  { chave: 'valor', label: 'Valor', tipo: 'moeda', noCard: true },
  { chave: 'tipo_cliente', label: 'Tipo de cliente', tipo: 'selecao', noCard: true, config: opcoes('NOVO', 'RECORRENTE', 'INATIVO') },
  { chave: 'rating', label: 'Rating', tipo: 'texto', noCard: true },
  { chave: 'validade', label: 'Validade', tipo: 'data', noCard: true },
  { chave: 'limite_sugerido', label: 'Limite sugerido', tipo: 'moeda', noCard: true },
  { chave: 'alcada', label: 'Alçada', tipo: 'texto', noCard: true },
  { chave: 'pendencia', label: 'Para avançar', tipo: 'texto', noCard: true },
];
const CAPA_PEDIDO = [
  { chave: 'valor', label: 'Valor do pedido', tipo: 'moeda', noCard: true },
  { chave: 'excesso', label: 'Excesso', tipo: 'moeda', noCard: true },
  { chave: 'excesso_pct', label: 'Excesso (%)', tipo: 'numero', noCard: true },
  { chave: 'alcada', label: 'Alçada', tipo: 'texto', noCard: true },
  { chave: 'uso', label: 'Uso do limite', tipo: 'progresso', noCard: true },
];

// `nome` é o que o card mostra ao mover ("E-mail ao responsável: 1 ação(ões) executada(s)"); sem ele a lib mostra o código (F5 C-04).
const email = (faseChave, assunto) => ({ nome: `E-mail ao responsável (${assunto.toLowerCase()})`, gatilho: 'card_movido', faseChave, acao: 'enviar_email',
  config: { para: ['$responsavel'], assunto, corpo: `${assunto}.` } });

const quadro = (slug, nome, fases, itens, capa, etiquetas, automacoes, extras = {}) => ({
  slug, nome, descricao: nome, config: { semEmail: false },
  fases: fases.map(([chave, nomeFase, tipo, slaHoras, cor, condicao]) => ({
    chave, nome: nomeFase, tipo, slaHoras, cor, ...(condicao ? { condicao } : {}),
    campos: [...checklist(itens, chave), ...(extras[chave] || [])],
  })),
  campos: capa, etiquetas: etiquetas.map((rotulo) => ({ rotulo, cor: COR[rotulo] || '#475467' })), automacoes,
});

const TERMO = { formalizacao: [{ chave: 'termo_assinado', label: 'Termo de concessão assinado', tipo: 'anexo', noCard: false, editavelDepois: true }] };
const AUTOMACOES_CONCESSAO = [email('comite', 'Solicitação aguardando decisão da alçada'), email('reanalise', 'Crédito em reanálise')];

export const QUADROS = [
  quadro('concessao-privada', 'Concessão · Privada', FASES_PRIVADA, ITENS, CAPA_CONCESSAO, ETIQUETAS_CONCESSAO, AUTOMACOES_CONCESSAO, TERMO),
  quadro('concessao-estetica', 'Concessão · Estética', FASES_PRIVADA, ITENS, CAPA_CONCESSAO, ETIQUETAS_CONCESSAO, AUTOMACOES_CONCESSAO, TERMO),
  quadro('concessao-publica', 'Concessão · Pública', FASES_PUBLICA, ITENS_PUBLICA, CAPA_CONCESSAO, ETIQUETAS_CONCESSAO, AUTOMACOES_CONCESSAO),
  quadro('pedidos-limite', 'Pedidos acima do limite', FASES_PEDIDO, ITENS_PEDIDO, CAPA_PEDIDO, ETIQUETAS_PEDIDO, [email('alcada', 'Pedido aguardando alçada')]),
];

/* ── gancho (04 §8, DT-35): destinos controlados primeiro (só domínio), depois o movimento livre ── */

const SOL = (cond) => `EXISTS (SELECT 1 FROM CC_SOLICITACAO S WHERE S.CARD_ID = K.ID AND ${cond})`;
const ORDEM_DE = (chave) => `(SELECT FX.ORDEM FROM CC_FASE FX WHERE FX.QUADRO = PARA.QUADRO AND FX.CHAVE = '${chave}')`;
const APOS_COMITE = `(SELECT MIN(FN.ORDEM) FROM CC_FASE FN WHERE FN.QUADRO = PARA.QUADRO AND FN.FINAL = FALSE AND FN.ORDEM > ${ORDEM_DE('comite')})`;
const SEGUINTE_DE = `(SELECT MIN(FN.ORDEM) FROM CC_FASE FN WHERE FN.QUADRO = PARA.QUADRO AND FN.FINAL = FALSE AND FN.ORDEM > DE.ORDEM)`;
const CREDITO_DA_SOL = (cond) => SOL(`EXISTS (SELECT 1 FROM CC_CREDITO CR WHERE CR.SOLICITACAO_ID = S.ID AND ${cond}
            AND CR.ID = (SELECT MAX(CR2.ID) FROM CC_CREDITO CR2 WHERE CR2.SOLICITACAO_ID = S.ID))`);
const CASO = SOL(`EXISTS (SELECT 1 FROM CC_MEMBRO CS WHERE CS.ID = COALESCE(S.ANALISTA_ID, S.CRIADO_POR) AND M.CAMINHO <> '' AND CS.CAMINHO LIKE CONCAT(M.CAMINHO, '%'))`);
export const CONSULTAS_VALIDAS = (s = 'S') => `(${s}.CONS_RECEITA <> 'NAO_CONSULTADO' AND ${s}.CONS_PROTESTO <> 'NAO_CONSULTADO' AND ${s}.CONS_PROCESSO <> 'NAO_CONSULTADO'
          AND (${s}.CONS_SOCIOS <> 'NAO_CONSULTADO' OR EXISTS (SELECT 1 FROM CC_CLIENTE CT WHERE CT.ID = ${s}.CLIENTE_ID AND CT.TIPO_PESSOA = 'F'))
          AND ${s}.CONS_DATA IS NOT NULL AND DATEDIFF(${HOJE_SQL}, ${s}.CONS_DATA) <= ${PARAM_NUM('limite.consultaValidadeDias', `${s}.CARTEIRA`)})`;
/** O que falta na análise de crédito para o Comitê (vazio = completa). */
export const FALTA_ANALISE = (s = 'S') => `SUBSTRING(CONCAT(
          CASE WHEN ${s}.SCORE_SERASA IS NULL THEN ', score Serasa' ELSE '' END,
          CASE WHEN ${s}.FP_TIPO = '' THEN ', fonte pagadora' ELSE '' END,
          CASE WHEN (CASE WHEN ${s}.AJUSTE_SITUACAO = 'APROVADO' THEN ${s}.RATING_AJUSTE ELSE ${s}.RATING_MOTOR END) = '' THEN ', rating calculado' ELSE '' END,
          CASE WHEN ${s}.AJUSTE_SITUACAO = 'PENDENTE' THEN ', ajuste de rating aguardando aprovação' ELSE '' END,
          CASE WHEN ${s}.LIMITE_PROPOSTO <= 0 THEN ', limite proposto' ELSE '' END,
          CASE WHEN ${s}.PARECER_ANALISTA = '' THEN ', parecer do analista' ELSE '' END,
          CASE WHEN ${s}.VALOR > ${PARAM_NUM('limite.docF2', `${s}.CARTEIRA`)} AND (${s}.FIN_AC IS NULL OR ${s}.FIN_PC IS NULL OR ${s}.FIN_PL IS NULL)
            THEN ', análise financeira (AC, PC, PL)' ELSE '' END), 3)`;
const FALTA_DO_CARD = `(SELECT ${FALTA_ANALISE('S')} FROM CC_SOLICITACAO S WHERE S.CARD_ID = K.ID AND S.CARTEIRA <> 'PUBLICA')`;
const ITEM_SIM = (chave) => `COALESCE(JSON_UNQUOTE(JSON_EXTRACT(K.VALORES_JSON, '$.${chave}')), '') = '1'`;

const PEDIDO = (cond) => `EXISTS (SELECT 1 FROM CC_PEDIDO_RETIDO P WHERE P.CARD_ID = K.ID AND ${cond})`;
const CASO_PEDIDO = PEDIDO(`EXISTS (SELECT 1 FROM CC_MEMBRO CS WHERE CS.ID = COALESCE(P.ANALISTA_ID, P.CRIADO_POR) AND M.CAMINHO <> '' AND CS.CAMINHO LIKE CONCAT(M.CAMINHO, '%'))`);

export function gancho(slug) {
  if (slug === 'pedidos-limite') {
    return `        WHEN PARA.CHAVE IN ('liberado', 'recusado') THEN (CASE WHEN ${PEDIDO("P.DECISAO_RESULTADO = (CASE PARA.CHAVE WHEN 'liberado' THEN 'LIBERADO' ELSE 'RECUSADO' END)")}
          THEN '' ELSE 'O pedido é liberado ou recusado pela decisão da alçada.' END)
        WHEN DE.FINAL = TRUE THEN 'Pedido decidido não volta.'
        WHEN NOT ${CASO_PEDIDO} THEN 'Só o analista do caso ou o superior move.'`;
  }
  if (!['concessao-privada', 'concessao-estetica', 'concessao-publica'].includes(slug)) return '';
  return `        WHEN PARA.CHAVE = 'gestao' THEN (CASE WHEN ${SOL('EXISTS (SELECT 1 FROM CC_CREDITO CR WHERE CR.SOLICITACAO_ID = S.ID AND CR.VIGENTE_CHAVE IS NOT NULL AND CR.SITUACAO = \'GESTAO\')')}
          THEN '' ELSE 'O crédito entra em gestão quando o limite é aplicado.' END)
        WHEN PARA.CHAVE IN ('reanalise', 'obsoleto', 'encerrada') THEN (CASE WHEN ${CREDITO_DA_SOL("CR.SITUACAO = (CASE PARA.CHAVE WHEN 'reanalise' THEN 'REANALISE' WHEN 'obsoleto' THEN 'OBSOLETO' ELSE 'ENCERRADO' END)")}
          THEN '' ELSE 'Encaminhamento é feito pelo sistema ou pela decisão de reanálise.' END)
        WHEN PARA.CHAVE = 'recusada' THEN (CASE WHEN ${SOL("S.ENCERRADA_EM IS NOT NULL AND (S.MOTIVO_RECUSA <> '' OR S.DECISAO_RESULTADO = 'RECUSADA')")}
          THEN '' ELSE 'Recuse pelo botão Recusar, com o motivo.' END)
        WHEN PARA.ORDEM = ${APOS_COMITE} THEN (CASE WHEN NOT ${SOL("S.DECISAO_RESULTADO = 'APROVADA'")} THEN 'A solicitação sai do Comitê pela decisão.'
          WHEN DE.ORDEM > PARA.ORDEM THEN 'Solicitação decidida não volta.' ELSE '' END)
        WHEN NOT ${CASO} THEN 'Só o analista do caso ou o superior move.'
        WHEN DE.CHAVE IN ('gestao', 'reanalise') OR DE.FINAL = TRUE THEN 'Encaminhamento é feito pelo sistema.'
        WHEN PARA.ORDEM < DE.ORDEM AND (DE.ORDEM > ${ORDEM_DE('comite')} OR ${SOL('S.DECIDIDA_EM IS NOT NULL')}) THEN 'Solicitação decidida não volta.'
        WHEN PARA.ORDEM > DE.ORDEM AND PARA.ORDEM <> ${SEGUINTE_DE} THEN 'Avance uma etapa por vez.'
        WHEN DE.CHAVE = 'entrada' AND PARA.ORDEM > DE.ORDEM AND NOT ${SOL('S.VALOR > 0 AND S.PRAZO_MESES > 0 AND S.ANALISTA_ID IS NOT NULL')} THEN 'Informe valor, prazo e analista.'
        WHEN PARA.CHAVE = 'credito' AND NOT ${SOL(CONSULTAS_VALIDAS('S'))} THEN 'Consultas obrigatórias pendentes ou vencidas.'
        WHEN PARA.CHAVE = 'comite' AND COALESCE(${FALTA_DO_CARD}, '') <> '' THEN CONCAT('Análise de crédito incompleta: ', ${FALTA_DO_CARD}, '.')
        WHEN PARA.CHAVE = 'liberacao' AND ${SOL("S.GARANTIA <> ''")} AND NOT ${ITEM_SIM('formalizacao_2')} THEN 'Garantia informada e não formalizada.'`;
}
