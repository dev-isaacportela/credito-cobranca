// Visibilidade pela hierarquia (01 §6). Texto SQL idêntico no MySQL e no SQLite do simulador.
// Hierarquia sem recursão: CC_MEMBRO.CAMINHO = '/topo/…/ID/'; quem está abaixo tem o caminho
// começando pelo caminho de quem está acima. Caminho vazio (membro recém-inserido, antes do
// caminho gravado) não vê ninguém pela hierarquia: igual ao `visivel()` em memória.

const COLUNAS_MEMBRO = `M.ID, M.CARGO, M.NIVEL, M.ADMIN, M.CAMINHO,
             CASE WHEN M.ADMIN = TRUE OR M.CARGO IN ('GERENTE','DIRETORIA') THEN 1 ELSE 0 END AS VE_TUDO`;

/** Junta o membro ativo da sessão como tabela derivada `EU`; sem membro ativo, a consulta volta vazia. */
export const EU = `JOIN (SELECT ${COLUNAS_MEMBRO}
      FROM CC_MEMBRO M JOIN INT_USER U ON LOWER(U.DESCR) = M.USER_EMAIL
      WHERE U.ID = :VAR_USER AND M.ATIVO = TRUE) EU ON 1 = 1`;

/**
 * A mesma tabela derivada, com o nome `A`, para o membro que `quem()` resolveu (leitura dentro de JS
 * chamada aninhada, DT-34). `membroId` é número já validado pela JS, ou `{{membroId}}`.
 */
export const MEMBRO_A = (membroId) => `JOIN (SELECT ${COLUNAS_MEMBRO}
      FROM CC_MEMBRO M WHERE M.ID = ${membroId} AND M.ATIVO = TRUE) A ON 1 = 1`;

/** Expressão de visibilidade de cliente; `veTudo` é a expressão SQL de "vê tudo" do ator. */
export function visibilidadeDeCliente(c, ator, veTudo) {
  return `(${veTudo}
 OR (${ator}.CARGO = 'JURIDICO' AND ${c}.NO_JURIDICO = TRUE)
 OR EXISTS (SELECT 1 FROM CC_MEMBRO V WHERE V.ID IN (${c}.AGENTE_ID, ${c}.ANALISTA_ID)
            AND ${ator}.CAMINHO <> '' AND V.CAMINHO LIKE CONCAT(${ator}.CAMINHO, '%')))`;
}

/** `C` = alias de CC_CLIENTE; exige o `EU` na consulta. */
export const clienteVisivel = (c = 'C') => visibilidadeDeCliente(c, 'EU', 'EU.VE_TUDO = 1');

/** "Vê tudo" sobre qualquer ator com ADMIN e CARGO (`EU`, `A`, o `M` do gancho). */
export const veTudo = (ator) => `(${ator}.ADMIN = TRUE OR ${ator}.CARGO IN ('GERENTE','DIRETORIA'))`;

/** A coluna aponta um membro (`X.AGENTE_ID`); `ator` = `EU` (padrão), `A` ou o `M` do gancho. */
export const membroVisivel = (coluna, ator = 'EU') => `(${veTudo(ator)} OR EXISTS (SELECT 1 FROM CC_MEMBRO V WHERE V.ID = ${coluna}
  AND ${ator}.CAMINHO <> '' AND V.CAMINHO LIKE CONCAT(${ator}.CAMINHO, '%')))`;

/**
 * A mesma regra em memória (preâmbulo `visivel(m, cliente)`). `cliente` traz NO_JURIDICO e os caminhos
 * do agente e do analista (AGENTE_CAMINHO, ANALISTA_CAMINHO), lidos na mesma consulta do cliente.
 */
export function visivel(m, cliente) {
  if (!m || !m.membroId || !cliente) return false;
  if (m.veTudo) return true;
  if (m.cargo === 'JURIDICO' && (cliente.NO_JURIDICO === true || Number(cliente.NO_JURIDICO) === 1)) return true;
  const caminho = String(m.caminho || '');
  return [cliente.AGENTE_CAMINHO, cliente.ANALISTA_CAMINHO].some((c) => caminho !== '' && typeof c === 'string' && c.startsWith(caminho));
}
