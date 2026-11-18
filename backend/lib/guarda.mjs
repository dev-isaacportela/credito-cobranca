// Fragmentos da escrita guardada (01 §5). Toda `ccEsc…` é `INSERT … SELECT … FROM DUAL WHERE <GUARDA>`
// ou `UPDATE/DELETE … WHERE … AND <GUARDA>`. Texto idêntico no MySQL e no SQLite.

import { veTudo, visibilidadeDeCliente } from './visibilidade.mjs';

/**
 * O ator `A` existe, está ativo e, com sessão, é a própria sessão; sem sessão (aninhada, cron)
 * vale o `membroId` recebido. `cond` usa o alias `A` (cargo, nível, visibilidade).
 */
export const ATOR = (membroId = '{{membroId}}', cond = 'TRUE') => `EXISTS (SELECT 1 FROM CC_MEMBRO A
  LEFT JOIN INT_USER AU ON LOWER(AU.DESCR) = A.USER_EMAIL
  WHERE A.ID = ${membroId} AND A.ATIVO = TRUE AND (COALESCE(:VAR_USER, 0) = 0 OR AU.ID = :VAR_USER) AND ${cond})`;

/** Só chamada sem sessão e com membroId 0 age como rotina. */
export const ROTINA = '({{membroId}} = 0 AND COALESCE(:VAR_USER, 0) = 0)';

/** Administra (D-06): Gerente, Diretoria ou a marca ADMIN. `a` = `A`, `EU` ou o `M` do gancho. */
export const podeAdministrarEm = (a) => `(${a}.NIVEL >= 3 OR ${a}.ADMIN = TRUE)`;
export const PODE_ADMINISTRAR = podeAdministrarEm('A');

/** Nível mínimo que não é alçada (N2, N3): também atendido pela marca ADMIN. */
export const NIVEL_MIN = (n, a = 'A') => `(${a}.NIVEL >= ${Number(n)} OR ${a}.ADMIN = TRUE)`;

/** Cliente `c` visível ao ator `a` da guarda (CC_MEMBRO `A` do ATOR ou o `A` de MEMBRO_A). */
export const clienteVisivelA = (c = 'C', a = 'A') => visibilidadeDeCliente(c, a, veTudo(a));

/** Tabela de números 1..20 para lote por listas alinhadas (sem JSON_TABLE). Alias `N`. */
export const NUMEROS_20 = `(SELECT 1 AS N ${Array.from({ length: 19 }, (_, i) => `UNION ALL SELECT ${i + 2}`).join(' ')}) N`;

/** Separador das listas alinhadas (U+00A6); a JS troca `¦` por `|` nos valores antes de enviar. */
export const SEP = '¦';

/** O N-ésimo item da lista `{{param}}` (dentro de `FROM NUMEROS_20`). */
export const ITEM = (param, n = 'N.N') => `SUBSTRING_INDEX(SUBSTRING_INDEX('{{${param}}}', '${SEP}', ${n}), '${SEP}', -1)`;

/**
 * Números como parâmetro (DT-45, defesa em profundidade): todo `{{x}}` fora de literal SQL vira
 * `CAST('{{x}}' AS SIGNED)`, ou `AS DECIMAL(15,2)` para os nomes em `decimais` (valor em dinheiro, a escala das
 * colunas). Um `1 OR 1=1` deixa de ser fragmento: vira número (MySQL: 1 com aviso; erro em INSERT/UPDATE estrito).
 * Listas de FIND_IN_SET já vão entre aspas e ficam como estão. `LIMIT {{limite}} OFFSET {{offset}}` também fica:
 * o MySQL só aceita literal ali, e esses dois dependem da proteção de parâmetros da plataforma (S-16 do T-002).
 * `inteiro = 'INTEGER'` para a SQL do Winthor (Oracle e SQLite aceitam; SIGNED é só do MySQL).
 * Cada add-0N0 aplica no seu `sql()`: o texto publicado e o do simulador são o mesmo.
 */
export function numerosComoParametro(code, decimais = [], inteiro = 'SIGNED') {
  return String(code).split(/('(?:[^']|'')*')/).map((parte, i) => (i % 2 ? parte : parte.replace(/\{\{(\w+)\}\}/g, (m, nome, pos, s) =>
    (/\b(LIMIT|OFFSET)\s*$/i.test(s.slice(0, pos)) ? m : `CAST('${m}' AS ${decimais.includes(nome) ? 'DECIMAL(15,2)' : inteiro})`)))).join('');
}
