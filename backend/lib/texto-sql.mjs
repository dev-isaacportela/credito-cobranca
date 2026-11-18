// Literal SQL de texto montado em JS: o único quotador do projeto (B1 O-13). A 007 guarda a cópia dela.
//
// `q` entra nos corpos JAVASCRIPT por toString() (UTIL de cada add-0N0) e monta SQL de `ler()`/`runDmlMitra`.
// Dobra a aspa simples e REMOVE a barra invertida: o MySQL (sem NO_BACKSLASH_ESCAPES) lê `\` como escape e o
// SQLite do simulador não, então o único texto igual nos dois bancos é sem `\`, e `x\` nunca fecha o literal.
// Limite: texto com `\` perde a barra. Por isso JSON com string JSON dentro (aninhado, que tem `\"`) NÃO passa
// por `q`: vai como `'{{param}}'` de uma SF SQL (a plataforma liga o valor). Conferido em 17/11: o único JSON
// gravado por `q` é `KB_BOARD.ACESSO_JSON` (plano, só ids e papéis) e a impressão digital `CC_COBRANCA.CAPA_ENVIADA`
// (já sem `\` na comparação); a capa com `acordo` aninhado vai ao card por `valoresJson` da mitra-kanban.
export function q(v) { return `'${String(v ?? '').replace(/\\/g, '').replace(/'/g, "''")}'`; }

/** Publicação e seed (Node): NULL para nulo, aspa dobrada. O texto vem do código (catálogo, modelos), sem `\`. */
export const txt = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
