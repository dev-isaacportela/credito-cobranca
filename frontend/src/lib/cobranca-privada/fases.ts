// Fases do quadro de cobrança na tela (05 §3.1). `nomeDaFase` é cópia de backend/lib/cobranca-privada/regua.mjs:
// mudou lá, muda aqui (teste C-004 nos dois lados).

/** Fases da régua por dias, em ordem (as preventivas e as de atraso; sem `juridico`). */
export const FASES_REGUA = ['prev_d5', 'prev_d1', 'venc_d0', 'pag_nao_ident', 'cob_ativa', 'notif_formal', 'protesto', 'neg_pos_protesto', 'extrajudicial'];

/** Carteiras com régua por dias, bloqueio, fila e e-mail da régua (04 §11). */
export const CARTEIRAS_COM_REGUA = ['PRIVADA', 'ESTETICA'];

/** Nome da coluna com o dia configurado (RN-001: "D+6 · Cobrança ativa"). Fase sem dia devolve o nome semeado. */
export function nomeDaFase(chave: string, p: Record<string, unknown> = {}): string {
  const BASE: Record<string, [string, string, string]> = {
    prev_d5: ['D-', 'prevAviso1', 'Lembrete'], prev_d1: ['D-', 'prevAviso2', 'Confirmação'], venc_d0: ['D+', '', 'Vencimento'],
    pag_nao_ident: ['D+', 'confPag', 'Pagamento não identificado'], cob_ativa: ['D+', 'lig', 'Cobrança ativa'],
    notif_formal: ['D+', 'notif', 'Notificação formal'], protesto: ['D+', 'neg', 'Protesto em cartório'],
    neg_pos_protesto: ['D+', 'prop', 'Negociação pós-protesto'], extrajudicial: ['D+', 'extra', 'Extrajudicial'],
    juridico: ['D+', 'jur', 'Cobrança judicial'],
  };
  const PADRAO: Record<string, number> = { prevAviso1: 5, prevAviso2: 1, confPag: 2, lig: 4, notif: 7, neg: 10, prop: 20, extra: 30, jur: 45 };
  const OUTRAS: Record<string, string> = { negociacao: 'Em negociação', acordo: 'Acordo em andamento', regularizado: 'Regularizados',
    pago_no_prazo: 'Pagos no vencimento', baixado: 'Baixados como perda' };
  const b = BASE[chave];
  if (!b) return OUTRAS[chave] || chave;
  const dias = b[1] ? (p[`regua.${b[1]}`] ?? PADRAO[b[1]]) : 0;
  return `${b[0]}${dias} · ${b[2]}`;
}

/** Fase da régua = comum, fora de `negociacao`, `acordo` e `juridico` (o mesmo `REGUA()` do gancho). */
export const ehFaseDaRegua = (f: { chave: string; final: boolean }) => !f.final && !['negociacao', 'acordo', 'juridico'].includes(f.chave);
