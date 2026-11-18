// Prévia do acordo na tela (RN-009, RN-010). O servidor recalcula tudo ao propor (ccCobAcordoPropor);
// `simularParcelas` é cópia de `parcelasAcordo` de backend/lib/cobranca-privada/acordo.mjs, com a entrada como parcela 0.

import { proximoUtil, somarDias } from '../base/dias-uteis.ts';

type Feriados = Parameters<typeof proximoUtil>[1];

export interface Parcela { n: number; venc: string; valor: number }

/** Entrada (parcela 0, se > 0) + n parcelas: (valor − entrada) ÷ n truncado no centavo, o resto na última; vencimentos no próximo útil. */
export function simularParcelas(valor: number, entrada: number, n: number, entradaData: string, primeiroVenc: string,
  intervaloDias: number, feriados: Feriados): Parcela[] {
  const resto = Math.round((Number(valor) - Number(entrada)) * 100);
  const qtd = Math.trunc(Number(n));
  if (!(qtd > 0) || !(resto > 0) || !primeiroVenc) return [];
  const centavos = Math.floor(resto / qtd);
  const parcelas = Array.from({ length: qtd }, (_, k) => ({
    n: k + 1,
    venc: proximoUtil(somarDias(primeiroVenc, k * Number(intervaloDias)), feriados),
    valor: (k === qtd - 1 ? resto - centavos * (qtd - 1) : centavos) / 100,
  }));
  return Number(entrada) > 0 && entradaData ? [{ n: 0, venc: proximoUtil(entradaData, feriados), valor: Number(entrada) }, ...parcelas] : parcelas;
}

export interface Cenario { chave: 'curto' | 'padrao' | 'alongado'; nome: string; entradaPct: number; entrada: number; n: number; dentroDoPadrao: boolean; nivel: number }

/**
 * Três pontos de partida para a proposta (opção C): curto (entrada mínima + parcelas sugeridas), padrão (entrada mínima +
 * máximo do padrão) e alongado (metade da entrada mínima + o dobro das parcelas, fora do padrão). Alçada pela regra de RN-009:
 * dentro do padrão = entrada ≥ mínima, parcelas ≤ máximo e débito ≤ `cob.acordoValorGerente`.
 */
export function cenariosAcordo(debito: number, p: Record<string, unknown>): Cenario[] {
  const num = (k: string, padrao: number) => (p[k] === undefined || p[k] === '' ? padrao : Number(p[k]));
  const minPct = num('cob.acordoEntradaMinPct', 20);
  const maxN = num('cob.acordoMaxParcelas', 5);
  const sugeridas = Math.min(num('cob.acordoParcelasPadrao', 3), maxN);
  const teto = num('cob.acordoValorGerente', 50000);
  const nivel = (dentro: boolean) => (dentro ? num('alcada.acordoNivelPadrao', 2) : num('alcada.acordoNivelFora', 3));
  const monta = (chave: Cenario['chave'], nome: string, pct: number, n: number): Cenario => {
    const dentro = pct >= minPct && n <= maxN && debito <= teto;
    return { chave, nome, entradaPct: pct, entrada: Math.round(debito * pct) / 100, n, dentroDoPadrao: dentro, nivel: nivel(dentro) };
  };
  return [
    monta('curto', 'Curto', minPct, sugeridas),
    monta('padrao', 'Padrão', minPct, maxN),
    monta('alongado', 'Alongado', Math.round(minPct / 2), Math.min(maxN * 2, 60)),
  ];
}

/** Quem decide pelo nível (mesmo texto de `rotuloNivel` do backend). */
export function rotuloNivel(nivel: number): string {
  if (Number(nivel) >= 5) return 'a Diretoria';
  if (Number(nivel) >= 3) return 'o gerente financeiro';
  return 'o supervisor';
}
