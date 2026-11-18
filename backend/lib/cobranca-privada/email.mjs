// E-mail da régua (RN-021 a RN-023, 03 §5). Puras; entram nas SFs por `FONTE` (com o FONTE de dias-uteis).

import { proximoUtil, somarDias } from '../dias-uteis.mjs';

/** Fase → modelo (03 §5) e o assunto base de cada um (RN-023). */
export const MODELO_DA_FASE = {
  prev_d5: 'COB_PREV_D5', prev_d1: 'COB_PREV_D1', venc_d0: 'COB_VENC_D0', pag_nao_ident: 'COB_PAG_NAO_IDENT', cob_ativa: 'COB_ATIVA',
  notif_formal: 'COB_NOTIF_FORMAL', protesto: 'COB_PROTESTO', neg_pos_protesto: 'COB_NEG_POS_PROTESTO', extrajudicial: 'COB_EXTRAJUDICIAL',
  juridico: 'COB_JURIDICO',
};

/**
 * Data-limite do texto (RN-023): hoje + (dia da etapa-alvo − dias de atraso), ou + `cob.emailPrazoMinDias`
 * se der zero ou menos, no próximo dia útil; extrajudicial = hoje + `jur.notifPrazoDias` (15 sem a 003).
 * Fase sem data-limite: ''.
 */
export function dataLimite(fase, diasAtraso, hojeData, p, feriados) {
  const ALVO = { notif_formal: 'regua.neg', neg_pos_protesto: 'regua.extra', juridico: 'regua.jurMax' };
  if (fase === 'extrajudicial') {
    const prazo = p['jur.notifPrazoDias'] === undefined || p['jur.notifPrazoDias'] === null ? 15 : Number(p['jur.notifPrazoDias']);
    return proximoUtil(somarDias(hojeData, prazo), feriados);
  }
  if (!ALVO[fase]) return '';
  let dias = Number(p[ALVO[fase]]) - (Number(diasAtraso) || 0);
  if (dias <= 0) dias = Number(p['cob.emailPrazoMinDias']) || 3;
  return proximoUtil(somarDias(hojeData, dias), feriados);
}

export const FONTE = `${String(dataLimite)}\nconst MODELO_DA_FASE = ${JSON.stringify(MODELO_DA_FASE)};`;
