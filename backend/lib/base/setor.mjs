// Setor e esfera pelo ramo de atividade (D-02, RN-018). Puras; entram na leitura por `FONTE`.

/** Maiúscula, sem acento, espaços colapsados. */
export function normalizarTexto(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * 'PUBLICO' se o código do ramo está em `ramosPublicos` ('11,12,…') ou o nome do ramo começa por
 * `prefixo`; senão 'PRIVADO'. Os dois vazios = ninguém é público.
 */
export function setorDoRamo(ramoCod, ramoNome, ramosPublicos, prefixo) {
  const codigos = String(ramosPublicos ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  if (ramoCod !== null && ramoCod !== undefined && codigos.includes(String(Number(ramoCod)))) return 'PUBLICO';
  const p = normalizarTexto(prefixo);
  return p !== '' && normalizarTexto(ramoNome).startsWith(p) ? 'PUBLICO' : 'PRIVADO';
}

/** Esfera pelo ramo em `base.ramosEsfera` ('13=MUNICIPAL,12=ESTADUAL'); null quando o ramo não está mapeado. */
export function esferaDoRamo(ramoCod, ramosEsfera) {
  if (ramoCod === null || ramoCod === undefined) return null;
  for (const par of String(ramosEsfera ?? '').split(',')) {
    const [codigo, esfera] = par.split('=').map((s) => String(s ?? '').trim());
    if (codigo !== '' && esfera && Number(codigo) === Number(ramoCod)) return esfera.toUpperCase();
  }
  return null;
}

// normalizarTexto não entra aqui: o UTIL do add-010 já a traz em todo corpo (uma só normalização, B1 O-13).
export const FONTE = [setorDoRamo, esferaDoRamo].map(String).join('\n');
