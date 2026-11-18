// Nota fiscal pública (005 RN-019 a RN-037): regra do ente, prazos, situação, régua da NF, etapa do órgão,
// histórico de pagamento, certidão e contrato. Puras: entram nas SFs JAVASCRIPT por `FONTE` (usam as funções
// de lib/dias-uteis.mjs e o `somarMeses` do preâmbulo, coladas no mesmo corpo). Datas 'AAAA-MM-DD'.
// `nf` = linha de CC_NF_PUBLICA (colunas em MAIÚSCULA); `p` = parametros('PUBLICA').

import { somarDias, somarDiasUteis, proximoUtil } from '../dias-uteis.mjs';
import { somarMeses } from '../tempo.mjs';
import { HOJE_SQL } from '../tempo.mjs';

/** Carga inicial (RN-035, P-23): todas a confirmar, 10 + 10 dias úteis, sem link. */
export const REGRAS_INICIAIS = [
  { NOME: 'Federal', ESFERA: 'FEDERAL', UF: '', BASE_LEGAL: 'Lei 14.133/2021, art. 141; IN SEGES/ME 77/2022, arts. 5º, 7º e 11: 10 dias úteis para liquidar (do recebimento da NF) e 10 para pagar (da liquidação); metade em pequeno valor (art. 75, II).' },
  { NOME: 'Distrito Federal', ESFERA: 'ESTADUAL', UF: 'DF', BASE_LEGAL: 'Decreto DF 44.330/2023; pagamento não fixado: vale o contrato; prazos de referência federal.' },
  { NOME: 'Estado de Goiás', ESFERA: 'ESTADUAL', UF: 'GO', BASE_LEGAL: 'Decretos GO 9.561/2019 (ordem cronológica por fonte) e 10.240/2023.' },
  { NOME: 'Estado do Tocantins', ESFERA: 'ESTADUAL', UF: 'TO', BASE_LEGAL: 'IN TCE/TO 1/2023.' },
  { NOME: 'Municípios', ESFERA: 'MUNICIPAL', UF: '', BASE_LEGAL: 'Decreto do próprio município; Atricon, Resolução 03/2022.' },
].map((r) => ({ ...r, LIQ_DIAS: 10, PAG_DIAS: 10, CONTAGEM: 'UTEIS', LINK: '', SITUACAO: 'A_CONFIRMAR' }));

/** Os 10 passos da régua (RN-027): ordem da tabela, ação, canal do contato (005 plan) e modelo de mensagem. */
export const PASSOS = [
  { passo: 'CONF', acao: 'Confirmar recebimento da NF e o atesto com o fiscal', canal: 'Telefone', modelo: 'PUB_PROTOCOLO' },
  { passo: 'L1', acao: 'E-mail ao fiscal e ao financeiro: liquidação vencida', canal: 'E-mail', modelo: 'PUB_LIQ' },
  { passo: 'L2', acao: 'Ligação ao fiscal: pendências e previsão de atesto', canal: 'Telefone', modelo: 'PUB_LIQ' },
  { passo: 'L3', acao: 'Ofício ao ordenador de despesa pedindo a liquidação', canal: 'Ofício', modelo: 'PUB_OFICIO' },
  { passo: 'G1', acao: 'E-mail cobrando o pagamento vencido', canal: 'E-mail', modelo: 'PUB_PAGAMENTO' },
  { passo: 'G2', acao: 'Pedido de posição na ordem cronológica (LAI)', canal: 'Portal do órgão', modelo: 'PUB_FILA' },
  { passo: 'G3', acao: 'Ligação ao setor financeiro / ordenador de despesa', canal: 'Telefone', modelo: 'PUB_PAGAMENTO' },
  { passo: 'G4', acao: 'Ofício formal de cobrança ao ordenador de despesa', canal: 'Ofício', modelo: 'PUB_OFICIO' },
  { passo: 'M2', acao: 'Jurídico avalia requerimento e art. 137', canal: 'Ofício', modelo: 'PUB_REQUERIMENTO' },
  { passo: 'G5', acao: 'Avaliar cobrança judicial com o jurídico', canal: '', modelo: '' },
];

/** Etapas do órgão (05 §3.2) por nível; o nível 0 não existe. */
export const ETAPAS_ORGAO = ['', 'nf_protocolar', 'liquidacao_vencida', 'pagamento_vencido', 'oficio', 'requerimento'];

const ehVerdadeNf = (v) => v === true || Number(v) === 1;

/** RN-019: a regra da contratação; a de mesma esfera e UF; a de mesma esfera sem UF; a Federal. Só ativas. */
export function regraDaNf(regras, orgao, regraIdContratacao) {
  const ativas = (regras || []).filter((r) => ehVerdadeNf(r.ATIVO === undefined ? true : r.ATIVO));
  const daContratacao = regraIdContratacao ? ativas.find((r) => Number(r.ID) === Number(regraIdContratacao)) : null;
  if (daContratacao) return daContratacao;
  const esfera = (orgao && orgao.esfera) || '';
  const uf = (orgao && orgao.uf) || '';
  const federal = ativas.find((r) => r.ESFERA === 'FEDERAL' && !r.UF) || null;
  if (!esfera) return federal;
  return ativas.find((r) => r.ESFERA === esfera && r.UF && r.UF === uf) || ativas.find((r) => r.ESFERA === esfera && !r.UF) || federal;
}

/** Limite de pequeno valor em vigor na data (RN-021, P-47). `vigencias` = [{ inicio, valor }]. */
export function limitePequenoValor(vigencias, data) {
  let escolhida = null;
  for (const v of vigencias || []) if (String(v.inicio) <= String(data) && (!escolhida || String(v.inicio) > String(escolhida.inicio))) escolhida = v;
  return escolhida ? Number(escolhida.valor) : 0;
}

/**
 * RN-020 a RN-022. `nf` = { EMISSAO, PROTOCOLO, LIQUIDACAO }; `regra` = { LIQ_DIAS, PAG_DIAS, CONTAGEM };
 * `contratacao` = { VALOR_ESTIMADO, PRAZO_CONTRATO_DIAS } ou null; `limitePv` = limite em vigor na emissão.
 */
export function prazosNf(nf, regra, contratacao, feriados, limitePv) {
  const uteis = !regra || regra.CONTAGEM !== 'CORRIDOS';
  const estimado = contratacao ? Number(contratacao.VALOR_ESTIMADO) || 0 : 0;
  const pequenoValor = uteis && estimado > 0 && estimado <= Number(limitePv || 0);
  const liqDias = Number(regra ? regra.LIQ_DIAS : 10);
  const pagDias = Number(regra ? regra.PAG_DIAS : 10);
  const somar = (data, dias) => (uteis ? somarDiasUteis(data, dias, feriados) : proximoUtil(somarDias(data, dias), feriados));
  const marco = nf.PROTOCOLO || nf.EMISSAO;
  const liquidarAte = somar(marco, pequenoValor ? Math.ceil(liqDias / 2) : liqDias);
  const contrato = contratacao ? Number(contratacao.PRAZO_CONTRATO_DIAS) || 0 : 0;
  if (contrato > 0) return { liquidarAte, pagarAte: proximoUtil(somarDias(marco, contrato), feriados), pequenoValor, prazoContrato: true };
  const pagarAte = somar(nf.LIQUIDACAO || liquidarAte, pequenoValor ? Math.ceil(pagDias / 2) : pagDias);
  return { liquidarAte, pagarAte, pequenoValor, prazoContrato: false };
}

/** RN-023: emissão + 2 meses no calendário (sem o dia, o último do mês). */
export function mais2Meses(emissao) {
  return somarMeses(emissao, 2);
}

/** RN-024: a etapa mais adiantada com data. */
export function etapaNf(nf) {
  if (nf.PAGO_EM) return 'PAGA';
  if (nf.OP) return 'OP';
  if (nf.LIQUIDACAO) return 'LIQUIDADA';
  if (nf.ATESTO) return 'ATESTADA';
  if (nf.PROTOCOLO) return 'PROTOCOLADA';
  return 'ENTREGUE';
}

/** RN-024: situação e dias de atraso (igual a SITUACAO_NF_SQL e DIAS_ATRASO_NF_SQL). */
export function situacaoNf(nf, hoje) {
  const dias = (de, ate) => Math.round((Date.parse(`${String(ate).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(de).slice(0, 10)}T00:00:00Z`)) / 86400000);
  const atraso = nf.PAGAR_ATE ? Math.max(0, dias(nf.PAGAR_ATE, nf.PAGO_EM || hoje)) : 0;
  let situacao = 'NO_PRAZO';
  if (nf.PAGO_EM) situacao = 'PAGA';
  else if (!nf.PROTOCOLO) situacao = 'A_PROTOCOLAR';
  else if (!nf.LIQUIDACAO && nf.LIQUIDAR_ATE && hoje > nf.LIQUIDAR_ATE) situacao = 'LIQUIDACAO_VENCIDA';
  else if (nf.PAGAR_ATE && hoje > nf.PAGAR_ATE) situacao = 'PAGAMENTO_VENCIDO';
  return { situacao, diasAtraso: atraso, acima2m: !nf.PAGO_EM && !!nf.LIMITE_2M && hoje > nf.LIMITE_2M };
}

/** RN-025: primeira violação da ordem das datas (com o nome do campo), ou ''. */
export function validarDatas(d, hoje) {
  const campos = [['emissao', 'A emissão'], ['protocolo', 'O protocolo'], ['atesto', 'O atesto'], ['liquidacao', 'A liquidação'], ['op', 'A ordem de pagamento']];
  const nomes = { emissao: 'a emissão', protocolo: 'o protocolo', atesto: 'o atesto', liquidacao: 'a liquidação', op: 'a ordem de pagamento' };
  for (let i = 0; i < campos.length; i += 1) {
    const [chave, rotulo] = campos[i];
    const valor = d[chave] || '';
    if (!valor) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return `${rotulo}: data inválida.`;
    if (valor > hoje) return `${rotulo} não pode ser posterior a hoje.`;
    if (i === 0) continue;
    const anterior = campos[i - 1][0];
    if (!d[anterior]) return `${rotulo} exige ${nomes[anterior]}.`;
    if (valor < d[anterior]) return `${rotulo} não pode ser anterior a ${nomes[anterior]}.`;
  }
  return '';
}

/**
 * RN-027 e RN-029: os passos que se aplicam à NF não paga, com a data devida (dias úteis no calendário do
 * órgão). `feitos` = { PASSO: { FEITO_EM, NO_PRAZO } }. Cada passo: { passo, acao, canal, modelo, devido,
 * feitoEm, noPrazo, atrasado, podeFeito }.
 */
export function reguaNf(nf, p, feriados, feitos, hoje) {
  if (nf.PAGO_EM) return [];
  const f = feitos || {};
  const util = (data, n) => somarDiasUteis(data, Number(n), feriados);
  const devidos = {};
  if (nf.PROTOCOLO && !nf.ATESTO) devidos.CONF = util(nf.PROTOCOLO, p['pub.rpConf']);
  if (!nf.LIQUIDACAO && nf.LIQUIDAR_ATE) for (const k of ['L1', 'L2', 'L3']) devidos[k] = util(nf.LIQUIDAR_ATE, p[`pub.rp${k}`]);
  if (nf.PAGAR_ATE && (nf.LIQUIDACAO || hoje > nf.PAGAR_ATE)) for (const k of ['G1', 'G2', 'G3', 'G4', 'G5']) devidos[k] = util(nf.PAGAR_ATE, p[`pub.rp${k}`]);
  if (nf.LIMITE_2M) devidos.M2 = util(nf.LIMITE_2M, 1);
  const limiteFeito = util(hoje, p['pub.rpFeitoAntecedencia']);
  return PASSOS.filter((x) => devidos[x.passo]).map((x) => {
    const feito = f[x.passo];
    const devido = devidos[x.passo];
    return {
      ...x, devido, feitoEm: feito ? String(feito.FEITO_EM) : '', noPrazo: feito ? ehVerdadeNf(feito.NO_PRAZO) : null,
      atrasado: !feito && devido < hoje, podeFeito: !feito && devido <= limiteFeito,
    };
  });
}

/** RN-028: o vencido não feito de data mais recente; sem vencido, o próximo a vencer. Empate: L3, G4, M2; depois o último da tabela. */
export function passoAtual(passos, hoje) {
  const abertos = (passos || []).filter((x) => !x.feitoEm);
  if (!abertos.length) return null;
  const ordem = PASSOS.map((x) => x.passo);
  const peso = (x) => (['L3', 'G4', 'M2'].includes(x.passo) ? 100 : 0) + ordem.indexOf(x.passo);
  const vencidos = abertos.filter((x) => x.devido <= hoje);
  const lista = vencidos.length ? vencidos : abertos;
  const alvo = vencidos.length ? lista.reduce((m, x) => (x.devido > m ? x.devido : m), '') : lista.reduce((m, x) => (!m || x.devido < m ? x.devido : m), '');
  return lista.filter((x) => x.devido === alvo).sort((a, b) => peso(b) - peso(a))[0];
}

/**
 * RN-030: nível da etapa do órgão (1–5) por uma NF em aberto; `passos` = reguaNf. Ofício e requerimento pela data
 * devida de L3/G4 e de M2, feitos ou não (PA-02).
 */
export function nivelNf(nf, passos, hoje) {
  const s = situacaoNf(nf, hoje).situacao;
  const chegou = (k) => (passos || []).some((x) => x.passo === k && x.devido <= hoje);
  if (chegou('M2')) return 5;
  if (chegou('L3') || chegou('G4')) return 4;
  if (s === 'PAGAMENTO_VENCIDO') return 3;
  if (s === 'LIQUIDACAO_VENCIDA') return 2;
  return 1;
}

/** RN-030: chave da fase do órgão = a mais alta entre as NFs em aberto (`[{ nf, passos }]`); '' sem NF em aberto. */
export function etapaOrgao(abertas, hoje) {
  const nivel = (abertas || []).reduce((m, x) => Math.max(m, nivelNf(x.nf, x.passos, hoje)), 0);
  return ETAPAS_ORGAO[nivel] || '';
}

/** RN-028: entre os passos atuais das NFs em aberto, o de data mais antiga; empate, a NF de emissão mais antiga. */
export function proximaAcaoOrgao(nfs) {
  const com = (nfs || []).filter((nf) => nf.PROX_PASSO && nf.PROX_PASSO_DATA);
  if (!com.length) return { texto: '', data: '' };
  const nf = com.sort((a, b) => (a.PROX_PASSO_DATA === b.PROX_PASSO_DATA ? (a.EMISSAO < b.EMISSAO ? -1 : 1) : (a.PROX_PASSO_DATA < b.PROX_PASSO_DATA ? -1 : 1)))[0];
  const passo = PASSOS.find((x) => x.passo === nf.PROX_PASSO);
  return { texto: `NF ${nf.NUMNOTA} · ${passo ? passo.acao : nf.PROX_PASSO}`, data: nf.PROX_PASSO_DATA };
}

/** RN-033: modelo sugerido pela situação da NF. */
export function tipoMensagem(nf, hoje) {
  const s = situacaoNf(nf, hoje);
  if (s.acima2m) return 'PUB_REQUERIMENTO';
  const etapa = etapaNf(nf);
  if (etapa === 'ENTREGUE') return 'PUB_PROTOCOLO';
  if (etapa === 'PROTOCOLADA' || etapa === 'ATESTADA') return s.situacao === 'LIQUIDACAO_VENCIDA' ? 'PUB_LIQ' : 'PUB_PROTOCOLO';
  return s.situacao === 'PAGAMENTO_VENCIDO' ? 'PUB_PAGAMENTO' : 'PUB_FILA';
}

/** RN-012: médias inteiras (dias corridos) sobre as NFs pagas. */
export function historicoPagamento(pagas) {
  const dias = (de, ate) => Math.round((Date.parse(`${String(ate).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(de).slice(0, 10)}T00:00:00Z`)) / 86400000);
  const lista = (pagas || []).filter((nf) => nf.PAGO_EM);
  const media = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
  const atrasos = lista.filter((nf) => nf.PAGAR_ATE).map((nf) => Math.max(0, dias(nf.PAGAR_ATE, nf.PAGO_EM)));
  return {
    pagas: lista.length,
    noPrazo: atrasos.filter((x) => x === 0).length,
    liquidacaoMedia: media(lista.filter((nf) => nf.PROTOCOLO && nf.LIQUIDACAO).map((nf) => dias(nf.PROTOCOLO, nf.LIQUIDACAO))),
    pagamentoMedio: media(lista.filter((nf) => nf.LIQUIDACAO).map((nf) => dias(nf.LIQUIDACAO, nf.PAGO_EM))),
    atrasoMedio: media(atrasos),
  };
}

/** RN-036: VENCIDA depois da validade; VENCENDO até `pub.certAlertaDias` dias antes (inclusive); senão VALIDA. */
export function situacaoCertidao(validade, hoje, alertaDias) {
  if (String(validade) < String(hoje)) return 'VENCIDA';
  return String(validade) <= somarDias(hoje, Number(alertaDias)) ? 'VENCENDO' : 'VALIDA';
}

/** RN-037: '' | VIGENCIA | SALDO | VIGENCIA_SALDO. `valor` = valor da contratação (VALOR_ESTIMADO, ou o limite). */
export function alertaContrato({ vigenciaFim, saldo, valor }, hoje, p) {
  const vig = !!vigenciaFim && String(vigenciaFim) <= somarDias(hoje, Number(p['pub.contratoVigDias']));
  const sal = Number(valor) > 0 && (Number(saldo) / Number(valor)) * 100 < Number(p['pub.contratoSaldoPct']);
  return vig && sal ? 'VIGENCIA_SALDO' : vig ? 'VIGENCIA' : sal ? 'SALDO' : '';
}

/* ── fragmentos SQL (a mesma regra de situacaoNf, 06 §5) ── */

export const SITUACAO_NF_SQL = (n = 'N') => `(CASE WHEN ${n}.PAGO_EM IS NOT NULL THEN 'PAGA'
    WHEN ${n}.PROTOCOLO IS NULL THEN 'A_PROTOCOLAR'
    WHEN ${n}.LIQUIDACAO IS NULL AND ${HOJE_SQL} > ${n}.LIQUIDAR_ATE THEN 'LIQUIDACAO_VENCIDA'
    WHEN ${HOJE_SQL} > ${n}.PAGAR_ATE THEN 'PAGAMENTO_VENCIDO' ELSE 'NO_PRAZO' END)`;
export const DIAS_ATRASO_NF_SQL = (n = 'N') => `(CASE WHEN ${n}.PAGAR_ATE IS NULL THEN 0
    ELSE GREATEST(0, DATEDIFF(COALESCE(${n}.PAGO_EM, ${HOJE_SQL}), ${n}.PAGAR_ATE)) END)`;
export const ACIMA_2M_SQL = (n = 'N') => `(CASE WHEN ${n}.PAGO_EM IS NULL AND ${n}.LIMITE_2M IS NOT NULL AND ${HOJE_SQL} > ${n}.LIMITE_2M THEN 1 ELSE 0 END)`;
/** NF em tramitação (não paga, não baixada, não cancelada). */
export const ABERTA_NF_SQL = (n = 'N') => `(${n}.PAGO_EM IS NULL AND ${n}.BAIXADA = FALSE AND ${n}.CANCELADA = FALSE)`;

export const FONTE = [`const PASSOS = ${JSON.stringify(PASSOS)};`, `const ETAPAS_ORGAO = ${JSON.stringify(ETAPAS_ORGAO)};`,
  `const ehVerdadeNf = ${ehVerdadeNf};`,
  ...[regraDaNf, limitePequenoValor, prazosNf, mais2Meses, etapaNf, situacaoNf, validarDatas, reguaNf, passoAtual, nivelNf, etapaOrgao,
    proximaAcaoOrgao, tipoMensagem, historicoPagamento, situacaoCertidao, alertaContrato].map(String)].join('\n');
