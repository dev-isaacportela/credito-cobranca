// Regras em vigor (RF-020 a RF-022): junta, por chave, as leituras de `ccBaseParametroListar` da 001 (padrão,
// ESTETICA e PUBLICA). A vigência é resolvida pela 001 (RN-014); aqui só se marca próprio × herdado e o que a
// carteira não usa (03 §18, definição do sistema: D-010). Puras; entram na SF por `FONTE`.

/** Grupos (e prefixos de chave) que a carteira não usa (03 §18). */
export const NAO_USA = {
  PRIVADA: { grupos: ['pub', 'pubMotor'], prefixos: [] },
  ESTETICA: { grupos: ['pub', 'pubMotor'], prefixos: [] },
  PUBLICA: { grupos: ['regua', 'limite', 'score', 'farol', 'flex', 'saude', 'crit'], prefixos: ['cob.emailModo'] },
};

export const CARTEIRAS = ['PRIVADA', 'ESTETICA', 'PUBLICA'];

/** A carteira usa a chave? */
export function aplica(carteira, chave, grupo) {
  const n = NAO_USA[carteira];
  if (!n) return true;
  return !n.grupos.includes(grupo) && !n.prefixos.some((p) => chave === p || chave.startsWith(`${p}.`));
}

/**
 * `leituras` = { PRIVADA: linhas, ESTETICA: linhas, PUBLICA: linhas } (as que vieram; linhas de
 * ccBaseParametroListar, a PRIVADA pedida com carteira ''). Devolve uma regra por chave, na ordem do catálogo:
 * { chave, grupo, ordem, rotulo, tipo, unidade, descricao, porCarteira, padrao: { valor, desde }, carteiras }.
 */
export function montarRegras(leituras) {
  const base = leituras.PRIVADA || leituras.ESTETICA || leituras.PUBLICA || [];
  const porChave = Object.fromEntries(CARTEIRAS.map((cart) => [cart, Object.fromEntries((leituras[cart] || []).map((l) => [l.CHAVE, l]))]));
  const vazio = (v) => v === null || v === undefined;
  return base.map((d) => {
    const carteiras = {};
    for (const cart of CARTEIRAS) {
      const l = porChave[cart][d.CHAVE];
      if (!l) continue;
      const proprio = cart !== 'PRIVADA' && !vazio(l.VALOR_CARTEIRA);
      carteiras[cart] = { valor: l.VALOR_EFETIVO ?? null, proprio, desde: proprio ? l.VIGENCIA_INICIO : null, aplica: aplica(cart, d.CHAVE, d.GRUPO) };
    }
    return {
      chave: d.CHAVE, grupo: d.GRUPO, ordem: Number(d.ORDEM) || 0, rotulo: d.ROTULO, tipo: d.TIPO, unidade: d.UNIDADE, descricao: d.DESCRICAO,
      porCarteira: d.POR_CARTEIRA === true || Number(d.POR_CARTEIRA) === 1,
      padrao: { valor: d.VALOR_PADRAO ?? null, desde: leituras.PRIVADA ? (porChave.PRIVADA[d.CHAVE] || {}).VIGENCIA_INICIO ?? null : null },
      carteiras,
    };
  });
}

export const FONTE = [`const NAO_USA = ${JSON.stringify(NAO_USA)};`, `const CARTEIRAS = ${JSON.stringify(CARTEIRAS)};`,
  ...[aplica, montarRegras].map(String)].join('\n');
