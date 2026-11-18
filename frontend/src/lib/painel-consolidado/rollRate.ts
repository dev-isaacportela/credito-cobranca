// RN-010 na tela: a matriz origem × destino de `ccPainelRollRate` vira pagou / melhorou / manteve / piorou por faixa.
// FAIXA_PARA: −1 = sem saldo; 0 = a vencer; 1…5 = faixas de atraso; 6 = baixado como perda no mês.

export const FAIXAS = ['A vencer', '1 a 30 dias', '31 a 60 dias', '61 a 90 dias', '91 a 180 dias', 'Acima de 180 dias'];

export interface DestinoFaixa {
  faixa: number;
  rotulo: string;
  saldo: number;
  clientes: number;
  pagou: number;
  melhorou: number;
  manteve: number;
  piorou: number;
  /** Taxa de rolagem = piorou ÷ saldo, em % com 2 casas; `null` sem saldo. */
  taxa: number | null;
}

type Celula = Record<string, unknown>;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Destino de uma célula da matriz (RN-010). */
export function destino(de: number, para: number): 'pagou' | 'melhorou' | 'manteve' | 'piorou' {
  if (para === 6) return 'piorou';
  if (de === 0) return para <= 0 ? 'manteve' : 'piorou';
  if (para <= 0) return 'pagou';
  if (para < de) return 'melhorou';
  return para === de ? 'manteve' : 'piorou';
}

/** C-012: as cinco faixas de origem (a vencer a 91–180), mesmo as sem saldo, e o total. */
export function destinosRollRate(matriz: Celula[]): { faixas: DestinoFaixa[]; total: DestinoFaixa } {
  const faixas: DestinoFaixa[] = FAIXAS.slice(0, 5).map((rotulo, faixa) => ({
    faixa, rotulo, saldo: 0, clientes: 0, pagou: 0, melhorou: 0, manteve: 0, piorou: 0, taxa: null,
  }));
  for (const c of matriz) {
    const de = Number(c.FAIXA_DE);
    const f = faixas[de];
    if (!f) continue;
    const valor = Number(c.VALOR) || 0;
    f.saldo += valor;
    f.clientes += Number(c.CLIENTES) || 0;
    f[destino(de, Number(c.FAIXA_PARA))] += valor;
  }
  const total: DestinoFaixa = { faixa: -1, rotulo: 'Total', saldo: 0, clientes: 0, pagou: 0, melhorou: 0, manteve: 0, piorou: 0, taxa: null };
  for (const f of faixas) {
    f.taxa = f.saldo > 0 ? r2((f.piorou * 100) / f.saldo) : null;
    for (const k of ['saldo', 'clientes', 'pagou', 'melhorou', 'manteve', 'piorou'] as const) total[k] += f[k];
  }
  total.taxa = total.saldo > 0 ? r2((total.piorou * 100) / total.saldo) : null;
  return { faixas, total };
}
