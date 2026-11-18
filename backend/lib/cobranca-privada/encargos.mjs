// Encargos título a título (RN-015, 03 §6). Puras; entram em ccCobEncargosCalcular por `FONTE`.

/** Multa, juros e correção de um título com `dias` de atraso, cada um arredondado no centavo. */
export function encargosTitulo(saldo, dias, p) {
  const s = Number(saldo) || 0;
  const meses = Number(dias) / 30;
  const c = (v) => Math.round(v * 100) / 100;
  const multa = c(s * Number(p['enc.multa'] || 0) / 100);
  const juros = c(s * Number(p['enc.juros'] || 0) / 100 * meses);
  const correcao = c(s * ((1 + Number(p['enc.correcao'] || 0) / 100) ** meses - 1));
  return { multa, juros, correcao, total: c(s + multa + juros + correcao) };
}

/**
 * Linhas de ccBaseTitulosAbertos → encargos na `data`: soma as linhas do mesmo título e parcela, ignora
 * as que não venceram (dias ≤ 0). `diasEntre(a, b)` = b − a em dias corridos.
 */
export function calcularEncargos(linhas, data, p) {
  const diasEntre = (a, b) => Math.round((Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000);
  const porTitulo = new Map();
  for (const l of linhas || []) {
    const chave = `${l.TITULO}|${l.PARCELA}`;
    const atual = porTitulo.get(chave);
    if (atual) atual.SALDO += Number(l.SALDO || 0);
    else porTitulo.set(chave, { TITULO: l.TITULO, PARCELA: l.PARCELA, VENCIMENTO: l.VENCIMENTO_EFETIVO || l.VENCIMENTO, SALDO: Number(l.SALDO || 0) });
  }
  const c = (v) => Math.round(v * 100) / 100;
  const saida = { linhas: [], principal: 0, multa: 0, juros: 0, correcao: 0, total: 0 };
  for (const t of porTitulo.values()) {
    const dias = diasEntre(t.VENCIMENTO, data);
    if (dias <= 0 || !(t.SALDO > 0)) continue;
    const e = encargosTitulo(t.SALDO, dias, p);
    saida.linhas.push({ TITULO: t.TITULO, PARCELA: t.PARCELA, VENCIMENTO: t.VENCIMENTO, SALDO: c(t.SALDO), DIAS: dias,
      MULTA: e.multa, JUROS: e.juros, CORRECAO: e.correcao, TOTAL: e.total });
    saida.principal = c(saida.principal + t.SALDO);
    saida.multa = c(saida.multa + e.multa);
    saida.juros = c(saida.juros + e.juros);
    saida.correcao = c(saida.correcao + e.correcao);
    saida.total = c(saida.total + e.total);
  }
  return saida;
}

export const FONTE = [encargosTitulo, calcularEncargos].map(String).join('\n');
