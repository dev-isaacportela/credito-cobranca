// Regra pura do painel (plan 006, "Contexto técnico"): meses, índice de concentração (RN-014), ranking com
// acumulado, gerada estimada sobre fechamento manual (RN-008) e região pela UF (RN-018). Cada função é
// autocontida: entra nas SFs JAVASCRIPT por `FONTE` (toString).

/** 'AAAA-MM' + n meses. */
export function somarMes(mes, n) {
  const [a, m] = String(mes).split('-').map(Number);
  const t = a * 12 + (m - 1) + Number(n);
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

export function mesAnterior(mes) { return somarMes(mes, -1); }
export function mesSeguinte(mes) { return somarMes(mes, 1); }

/** Índice de concentração: soma dos quadrados das participações em % (RN-014), com uma casa. */
export function hhi(valores) {
  const total = valores.reduce((s, v) => s + Number(v || 0), 0);
  if (!(total > 0)) return null;
  return Math.round(valores.reduce((s, v) => s + ((Number(v || 0) * 100) / total) ** 2, 0) * 10) / 10;
}

/** 'pulverizada' abaixo do moderado, 'moderada' abaixo do alto, 'alta' a partir dele. */
export function faixaHhi(indice, moderado, alto) {
  if (indice === null || indice === undefined) return null;
  return indice < Number(moderado) ? 'pulverizada' : indice < Number(alto) ? 'moderada' : 'alta';
}

/**
 * `itens` = [{ chave, rotulo, valor }] → somados por chave, em ordem de valor (maior primeiro, empate pela
 * chave), com participação e acumulado em % (duas casas).
 */
export function ranking(itens) {
  const por = new Map();
  for (const i of itens) {
    const atual = por.get(i.chave) || { chave: i.chave, rotulo: i.rotulo, valor: 0 };
    atual.valor += Number(i.valor || 0);
    por.set(i.chave, atual);
  }
  const linhas = [...por.values()].filter((l) => l.valor > 0)
    .sort((a, b) => b.valor - a.valor || String(a.chave).localeCompare(String(b.chave)));
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  let acum = 0;
  return linhas.map((l) => {
    acum += l.valor;
    const r2 = (x) => Math.round(x * 100) / 100;
    return { ...l, valor: r2(l.valor), pct: total ? r2((l.valor * 100) / total) : 0, pctAcum: total ? r2((acum * 100) / total) : 0 };
  });
}

/** Gerada do mês sobre um anterior manual (RN-008): max(0, vencido − vencido manual + recuperado). */
export function geradaEstimada(vencido, vencidoManual, recuperado) {
  return Math.max(0, Math.round((Number(vencido) - Number(vencidoManual) + Number(recuperado)) * 100) / 100);
}

/** As cinco regiões do IBGE (RN-018); sem UF ou UF desconhecida = 'Sem região'. */
export function regiaoDaUf(uf) {
  const regioes = {
    Norte: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
    Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
    Sudeste: ['ES', 'MG', 'RJ', 'SP'],
    Sul: ['PR', 'RS', 'SC'],
  };
  const u = String(uf || '').toUpperCase();
  return Object.keys(regioes).find((r) => regioes[r].includes(u)) || 'Sem região';
}

export const FONTE = [somarMes, mesAnterior, mesSeguinte, hhi, faixaHhi, ranking, geradaEstimada, regiaoDaUf].map(String).join('\n');
