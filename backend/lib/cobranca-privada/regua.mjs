// Régua das carteiras Privada e Estética (RN-001 a RN-004, RN-030, RN-033, RF-005). Funções puras; entram
// nas SFs por `FONTE` (as que chamam funções de dias úteis precisam também do FONTE de lib/dias-uteis.mjs).

import { proximoUtil } from '../dias-uteis.mjs';

/** Carteiras com régua por dias, bloqueio, fila e e-mail da régua (04 §11, exceção E-1/E-3). */
export const CARTEIRAS_COM_REGUA = ['PRIVADA', 'ESTETICA'];

/** Fases da régua por dias, em ordem. */
export const FASES_REGUA = ['prev_d5', 'prev_d1', 'venc_d0', 'pag_nao_ident', 'cob_ativa', 'notif_formal', 'protesto', 'neg_pos_protesto', 'extrajudicial'];

/**
 * Fase devida pelos dias (RN-001, RN-002). `pos` = { vencido, diasAtraso, diasParaVencer (null = sem
 * próximo vencimento) }; `p` = parâmetros da carteira. '' = nenhuma (sem caso).
 */
export function faseDevida(pos, p) {
  const n = (k) => Number(p[`regua.${k}`]);
  const d = Number(pos.diasAtraso) || 0;
  if (Number(pos.vencido) > 0) {
    if (d >= n('extra')) return 'extrajudicial';
    if (d >= n('prop')) return 'neg_pos_protesto';
    if (d >= n('neg')) return 'protesto';
    if (d >= n('notif')) return 'notif_formal';
    if (d >= n('lig')) return 'cob_ativa';
    if (d >= n('confPag')) return 'pag_nao_ident';
    return 'venc_d0';
  }
  const f = pos.diasParaVencer;
  if (f === null || f === undefined || f === '' || Number(f) < 0) return '';
  if (Number(f) === 0) return 'venc_d0';
  if (Number(f) <= n('prevAviso2')) return 'prev_d1';
  if (Number(f) <= n('prevAviso1')) return 'prev_d5';
  return '';
}

/** Bloqueio devido (RN-004): sem vencido ou com acordo ativo de entrada paga, nenhum. */
export function bloqueioDevido(pos, p, acordoAtivoPago = false) {
  const d = Number(pos.diasAtraso) || 0;
  if (!(Number(pos.vencido) > 0) || acordoAtivoPago) return '';
  if (d >= Number(p['regua.bloqTotal'])) return 'TOTAL';
  if (d >= Number(p['regua.lig'])) return 'PEDIDOS';
  return '';
}

/** Nome da coluna com o dia configurado (RN-001: "D+6 · Cobrança ativa"). Fase sem dia devolve o nome semeado. */
export function nomeDaFase(chave, p = {}) {
  const BASE = {
    prev_d5: ['D-', 'prevAviso1', 'Lembrete'], prev_d1: ['D-', 'prevAviso2', 'Confirmação'], venc_d0: ['D+', '', 'Vencimento'],
    pag_nao_ident: ['D+', 'confPag', 'Pagamento não identificado'], cob_ativa: ['D+', 'lig', 'Cobrança ativa'],
    notif_formal: ['D+', 'notif', 'Notificação formal'], protesto: ['D+', 'neg', 'Protesto em cartório'],
    neg_pos_protesto: ['D+', 'prop', 'Negociação pós-protesto'], extrajudicial: ['D+', 'extra', 'Extrajudicial'],
    juridico: ['D+', 'jur', 'Cobrança judicial'],
  };
  const PADRAO = { prevAviso1: 5, prevAviso2: 1, confPag: 2, lig: 4, notif: 7, neg: 10, prop: 20, extra: 30, jur: 45 };
  const OUTRAS = { negociacao: 'Em negociação', acordo: 'Acordo em andamento', regularizado: 'Regularizados',
    pago_no_prazo: 'Pagos no vencimento', baixado: 'Baixados como perda' };
  const b = BASE[chave];
  if (!b) return OUTRAS[chave] || chave;
  const dias = b[1] ? (p[`regua.${b[1]}`] ?? PADRAO[b[1]]) : 0;
  return `${b[0]}${dias} · ${b[2]}`;
}

/**
 * Etiquetas calculadas do caso privado/Estética (05 §3.4, §3.6). `c` = { vencido, diasAtraso, protestado,
 * bloqueioDevido, bloqueioAplicado, promessaVencida, semContato, anuenciaPendente, baixaPendente, juridicoEm }.
 */
export function etiquetas(c, p) {
  const lista = [];
  const d = Number(c.diasAtraso) || 0;
  const vencido = Number(c.vencido ?? 1) > 0;
  if (c.protestado) lista.push('Protestado');
  if (c.bloqueioAplicado === 'PEDIDOS') lista.push('Bloqueio pedidos');
  if (c.bloqueioAplicado === 'TOTAL') lista.push('Bloqueio total');
  if ((c.bloqueioDevido || '') !== (c.bloqueioAplicado || '')) lista.push('Bloqueio a aplicar');
  if (c.promessaVencida) lista.push('Promessa vencida');
  if (c.semContato && vencido) lista.push('Sem contato');
  if (c.anuenciaPendente) lista.push('Anuência pendente');
  if (c.baixaPendente) lista.push('Baixa pendente');
  if (vencido && !c.juridicoEm && d >= Number(p['regua.jurMax'])) lista.push('Jurídico atrasado');
  else if (vencido && !c.juridicoEm && d >= Number(p['regua.jur'])) lista.push('Pronto para o Jurídico');
  return lista;
}

/**
 * Capa do card (RF-005, 05 §3.4): `{ prazo, campos, etiquetas }`. `c` = { preventivo, vencido, aVencer,
 * proxVenc, vencMaisAntigo, bus: [{ nome, valor }], proxAcao, proxAcaoData, bloqueioDevido, acordo:
 * { pagas, n } | null, temAcao, acaoFeita, ultimoContato, + os campos de `etiquetas` }.
 */
export function capaDoCaso(c, p) {
  const total = (c.bus || []).reduce((s, b) => s + Number(b.valor || 0), 0);
  const bus = total > 0 ? (c.bus || []).filter((b) => Number(b.valor) > 0)
    .map((b) => `${b.nome} ${Math.round((Number(b.valor) / total) * 100)}%`).join(' · ') : '';
  const preventivo = !!c.preventivo;
  const campos = {
    vencido: !preventivo && Number(c.vencido) > 0 ? Math.round(Number(c.vencido) * 100) / 100 : '',
    a_vencer: Number(c.aVencer) > 0 ? Math.round(Number(c.aVencer) * 100) / 100 : '',
    bus,
    proxima_acao: c.proxAcao || '',
    proxima_acao_data: c.proxAcaoData || '',
    bloqueio: !preventivo && c.bloqueioDevido ? String(c.bloqueioDevido).toLowerCase() : '',
    acordo: c.acordo && Number(c.acordo.n) > 0
      ? JSON.stringify([{ rotulo: 'Acordo', texto: `${c.acordo.pagas} de ${c.acordo.n}`, pct: Math.round((c.acordo.pagas / c.acordo.n) * 100) }]) : '',
    acao_fase: c.temAcao ? (c.acaoFeita ? 'feita' : 'a_fazer') : '',
    ultimo_contato: c.ultimoContato || '',
  };
  return { prazo: (preventivo ? c.proxVenc : c.vencMaisAntigo) || c.proxVenc || '', campos, etiquetas: etiquetas(c, p) };
}

/**
 * Prazo da ação da fase (02 CC_ACAO_REGUA.NO_PRAZO, RN-033): a data de entrada (Brasília) levada ao
 * próximo dia útil; com SLA, entrada + SLA (texto AAAA-MM-DDTHH:MM:SS). A ficha mostra; o NO_PRAZO gravado
 * é calculado na SQL de ccEscCobAcaoInserir com a mesma regra (NO_PRAZO_SQL).
 */
export function prazoDaAcao(entrada, feriados, slaHoras = 0) {
  const e = String(entrada || '');
  if (Number(slaHoras) > 0 && e.length >= 19) {
    return new Date(Date.parse(`${e.slice(0, 19)}Z`) + Number(slaHoras) * 3600000).toISOString().slice(0, 19);
  }
  return proximoUtil(e.slice(0, 10), feriados);
}

/** Fonte para as SFs (precisa do FONTE de dias-uteis). */
export const FONTE = [faseDevida, bloqueioDevido, nomeDaFase, etiquetas, capaDoCaso, prazoDaAcao].map(String).join('\n')
  + `\nconst CARTEIRAS_COM_REGUA = ${JSON.stringify(CARTEIRAS_COM_REGUA)};\nconst FASES_REGUA = ${JSON.stringify(FASES_REGUA)};`;
