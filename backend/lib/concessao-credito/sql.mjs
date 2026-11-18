// Fragmentos SQL da 004 (texto idêntico no MySQL e no SQLite). `S` = CC_SOLICITACAO, `A` = o ator da guarda.

import { PARAM_NUM, PARAM } from '../parametros.mjs';
import { HOJE_SQL } from '../tempo.mjs';

/** Rating efetivo (02 §004): o ajuste aprovado, senão o motor. */
export const RATING_EFETIVO = (s = 'S') => `(CASE WHEN ${s}.AJUSTE_SITUACAO = 'APROVADO' THEN ${s}.RATING_AJUSTE ELSE ${s}.RATING_MOTOR END)`;

/** Aberta (PA-14): não encerrada e sem crédito nascido dela. */
export const ABERTA = (s = 'S') => `(${s}.ENCERRADA_EM IS NULL AND NOT EXISTS (SELECT 1 FROM CC_CREDITO CAB WHERE CAB.SOLICITACAO_ID = ${s}.ID))`;

/**
 * Id do membro como texto canônico ('3', nunca '3.0'): a guarda ATOR compara `A.ID = m` como número, então a
 * lista de autores tem de comparar a mesma forma (B-02 da validação B2).
 */
const ID_TXT = (m) => `CAST(CAST(${m} AS SIGNED) AS CHAR)`;

/** Lista de autores (DT-40): acrescenta `m` uma vez só. */
export const PROPONENTE_ADD = (col, m = '{{membroId}}') =>
  `(CASE WHEN FIND_IN_SET(${ID_TXT(m)}, ${col}) > 0 THEN ${col} WHEN ${col} = '' THEN ${ID_TXT(m)} ELSE CONCAT(${col}, ',', ${ID_TXT(m)}) END)`;
export const NAO_PROPONENTE = (col, m = '{{membroId}}') => `FIND_IN_SET(${ID_TXT(m)}, ${col}) = 0`;

/**
 * Data `d` (AAAA-MM-DD) + `n` meses, dia limitado ao último do mês (igual a `somarMeses` de tempo.mjs). O simulador
 * não soma MONTH em DATE_ADD: mês por aritmética, último dia por `DATE_ADD(1º do mês seguinte, -1 DAY)`.
 */
const DOIS = (x) => `CONCAT(CASE WHEN ${x} < 10 THEN '0' ELSE '' END, CAST(${x} AS SIGNED))`;
const PRIMEIRO_DO_MES = (k) => `CONCAT(CAST(FLOOR(${k} / 12) AS SIGNED), '-', ${DOIS(`(MOD(${k}, 12) + 1)`)}, '-01')`;
export const SOMAR_MESES = (d, n) => {
  const k = `(CAST(SUBSTRING(${d}, 1, 4) AS SIGNED) * 12 + CAST(SUBSTRING(${d}, 6, 2) AS SIGNED) - 1 + ${n})`;
  const ultimo = `CAST(SUBSTRING(DATE_ADD(${PRIMEIRO_DO_MES(`(${k} + 1)`)}, INTERVAL -1 DAY), 9, 2) AS SIGNED)`;
  return `CONCAT(SUBSTRING(${PRIMEIRO_DO_MES(k)}, 1, 8), ${DOIS(`LEAST(CAST(SUBSTRING(${d}, 9, 2) AS SIGNED), ${ultimo})`)})`;
};

/** Valor em reais como `brl()` das JS ('R$ 1.000.000'): inteiro, milhar com ponto, até 999 bilhões. */
export const BRL = (v) => {
  const t = `CAST(CAST(ROUND(${v}, 0) AS SIGNED) AS CHAR)`;
  const l = `CHAR_LENGTH(${t})`;
  const g = (de) => `SUBSTRING(${t}, ${l} - ${de}, 3)`;
  return `CONCAT('R$ ', CASE WHEN ${l} <= 3 THEN ${t} WHEN ${l} <= 6 THEN CONCAT(SUBSTRING(${t}, 1, ${l} - 3), '.', ${g(2)})
    WHEN ${l} <= 9 THEN CONCAT(SUBSTRING(${t}, 1, ${l} - 6), '.', ${g(5)}, '.', ${g(2)})
    ELSE CONCAT(SUBSTRING(${t}, 1, ${l} - 9), '.', ${g(8)}, '.', ${g(5)}, '.', ${g(2)}) END)`;
};

/**
 * RN-027 na SQL (igual a `alcadaPedido`): `o` = 'nivel' | 'rotulo' | 'critica'. `exc`/`pct`/`atr` = expressões do
 * excesso, do % sobre o limite e do atraso; `cart` = carteira dos parâmetros `alcada.ped*`.
 */
export const ALCADA_PEDIDO = (exc, pct, atr, cart, o = 'nivel') => {
  const faixa = (nivel, rotulo, critica) => ({ nivel: PARAM_NUM(`alcada.${nivel}`), rotulo: `'${rotulo}'`, critica }[o]);
  const comite = faixa('nivelComiteCredito', 'Comitê de crédito', 'TRUE');
  return `(CASE WHEN ${atr} > ${PARAM_NUM('alcada.pedAtrasoComiteDias', cart)} THEN ${comite}
    WHEN ${pct} <= ${PARAM_NUM('alcada.pedSupPct', cart)} AND ${exc} <= ${PARAM_NUM('alcada.pedSupValor', cart)} THEN ${faixa('nivelSupervisor', 'Supervisor', 'FALSE')}
    WHEN ${pct} <= ${PARAM_NUM('alcada.pedGerPct', cart)} THEN ${faixa('nivelGerente', 'Gerente', 'FALSE')}
    WHEN ${pct} <= ${PARAM_NUM('alcada.pedDirPct', cart)} THEN ${faixa('nivelDiretorFinanceiro', 'Diretor financeiro', 'TRUE')}
    ELSE ${comite} END)`;
};

/**
 * O crédito da solicitação `s` pode nascer agora: card em `liberacao`, ou em `comite` num quadro sem `liberacao`
 * (D-004: a Pública cria o crédito na decisão).
 */
export const CREDITO_LIBERAVEL = (s = 'S') => `EXISTS (SELECT 1 FROM KB_CARD KL JOIN CC_FASE FL ON FL.FASE_ID = KL.FASE_ID WHERE KL.ID = ${s}.CARD_ID
    AND (FL.CHAVE = 'liberacao' OR (FL.CHAVE = 'comite' AND NOT EXISTS (SELECT 1 FROM CC_FASE FX WHERE FX.QUADRO = FL.QUADRO AND FX.CHAVE = 'liberacao'))))`;

/** Meses completos entre a data `de` (AAAA-MM-DD) e hoje. Igual a `mesesEntre` do motor. */
const parte = (x, i, n) => `CAST(SUBSTRING(${x}, ${i}, ${n}) AS SIGNED)`;
export const MESES_ATE_HOJE = (de) => `((${parte(HOJE_SQL, 1, 4)} * 12 + ${parte(HOJE_SQL, 6, 2)}) - (${parte(de, 1, 4)} * 12 + ${parte(de, 6, 2)})
  - (CASE WHEN ${parte(HOJE_SQL, 9, 2)} < ${parte(de, 9, 2)} THEN 1 ELSE 0 END))`;

/** Faixa (nível) da concessão pelo valor `v` na carteira `cart`. `rotulo = true` devolve o rótulo. */
export const FAIXA_CONCESSAO = (v, cart, rotulo = false) => `(CASE WHEN ${v} <= ${PARAM_NUM('alcada.concSupervisor', cart)} THEN ${rotulo ? "'Supervisor'" : PARAM_NUM('alcada.nivelSupervisor')}
    WHEN ${v} <= ${PARAM_NUM('alcada.concGerente', cart)} THEN ${rotulo ? "'Gerente'" : PARAM_NUM('alcada.nivelGerente')}
    WHEN ${PARAM_NUM('alcada.concRegional', cart)} > ${PARAM_NUM('alcada.concGerente', cart)} AND ${v} <= ${PARAM_NUM('alcada.concRegional', cart)}
      THEN ${rotulo ? "'Comitê regional'" : PARAM_NUM('alcada.nivelComiteRegional')}
    ELSE ${rotulo ? PARAM('alcada.concRotuloTopo', cart) : PARAM_NUM('alcada.nivelComiteExecutivo')} END)`;

/**
 * RN-008/RN-010 na SQL (igual a `alcadaConcessao`). `la` = expressão do limite aprovado (0 = sem decisão).
 * `ao` = alias de CC_ANALISE_ORGAO da solicitação (só com a 005; sem ela a Pública não tem exceção).
 */
const VALOR_ALCADA = (s, la) => `(CASE WHEN GREATEST(${s}.LIMITE_PROPOSTO, ${la}) > 0 THEN GREATEST(${s}.LIMITE_PROPOSTO, ${la}) ELSE ${s}.VALOR END)`;
export const EXCECAO_CONCESSAO = (s, la, ao = null) => `((${s}.CARTEIRA <> 'PUBLICA' AND (
      (CASE WHEN ${la} > 0 THEN ${la} ELSE ${s}.LIMITE_PROPOSTO END) > ${s}.MOTOR_LIMITE
      OR ${s}.AJUSTE_SITUACAO = 'APROVADO'
      OR ${s}.MOTOR_RESULTADO IN ('EXCECAO_GARANTIA', 'COMITE_CONCENTRACAO')
      OR (${s}.CNPJ_ABERTURA IS NOT NULL AND ${MESES_ATE_HOJE(`${s}.CNPJ_ABERTURA`)} < ${PARAM_NUM('limite.fraudeMeses', `${s}.CARTEIRA`)})
      OR (${s}.TIPO_CLIENTE = 'NOVO' AND COALESCE(${s}.FAT_MENSAL, 0) > 0
          AND ${s}.VALOR > ${s}.FAT_MENSAL * ${PARAM_NUM('limite.fraudePct', `${s}.CARTEIRA`)} / 100)))${ao
  ? `\n    OR (${s}.CARTEIRA = 'PUBLICA' AND ${la} > COALESCE(${ao}.EXPOSICAO, 0))` : ''})`;
export const NIVEL_CONCESSAO = (s = 'S', la = '0', ao = null) => `(CASE WHEN ${EXCECAO_CONCESSAO(s, la, ao)}
    THEN GREATEST(${FAIXA_CONCESSAO(VALOR_ALCADA(s, la), `${s}.CARTEIRA`)}, ${PARAM_NUM('alcada.nivelComiteCredito')})
    ELSE ${FAIXA_CONCESSAO(VALOR_ALCADA(s, la), `${s}.CARTEIRA`)} END)`;
export const ROTULO_CONCESSAO = (s = 'S', la = '0', ao = null) => `(CASE WHEN ${EXCECAO_CONCESSAO(s, la, ao)}
    AND ${PARAM_NUM('alcada.nivelComiteCredito')} >= ${FAIXA_CONCESSAO(VALOR_ALCADA(s, la), `${s}.CARTEIRA`)}
    THEN 'Comitê de crédito' ELSE ${FAIXA_CONCESSAO(VALOR_ALCADA(s, la), `${s}.CARTEIRA`, true)} END)`;
export { VALOR_ALCADA };

/** ORDEM da fase `comite` do quadro da fase `f`. */
export const ORDEM_COMITE = (f = 'FS') => `(SELECT FC.ORDEM FROM CC_FASE FC WHERE FC.QUADRO = ${f}.QUADRO AND FC.CHAVE = 'comite')`;
/** Card antes de `comite` (fase comum com ordem menor). */
export const ANTES_DO_COMITE = (f = 'FS') => `(${f}.FINAL = FALSE AND ${f}.ORDEM < ${ORDEM_COMITE(f)})`;

/** "Caso" da solicitação para o ator `a`: analista (ou quem abriu, sem analista) ou superior dele. Sem a marca ADMIN. */
export const CASO_S = (s = 'S', a = 'A') => `EXISTS (SELECT 1 FROM CC_MEMBRO CS WHERE CS.ID = COALESCE(${s}.ANALISTA_ID, ${s}.CRIADO_POR)
    AND ${a}.CAMINHO <> '' AND CS.CAMINHO LIKE CONCAT(${a}.CAMINHO, '%'))`;
/** "Caso" do pedido: analista ou quem lançou, ou superior. */
export const CASO_P = (p = 'P', a = 'A') => `EXISTS (SELECT 1 FROM CC_MEMBRO CP WHERE CP.ID = COALESCE(${p}.ANALISTA_ID, ${p}.CRIADO_POR)
    AND ${a}.CAMINHO <> '' AND CP.CAMINHO LIKE CONCAT(${a}.CAMINHO, '%'))`;
/**
 * "Caso" da pendência do Winthor `pw` (04 §4: quem aplica é o caso da origem): analista da solicitação (ou quem
 * abriu), do crédito (ou quem abriu a solicitação dele) ou do pedido (ou quem lançou), ou superior.
 */
export const CASO_PW = (pw = 'PW', a = 'A') => `EXISTS (SELECT 1 FROM CC_MEMBRO CW WHERE CW.ID = (CASE ${pw}.ORIGEM
      WHEN 'SOLICITACAO' THEN (SELECT COALESCE(SW.ANALISTA_ID, SW.CRIADO_POR) FROM CC_SOLICITACAO SW WHERE SW.ID = ${pw}.ORIGEM_ID)
      WHEN 'CREDITO' THEN (SELECT COALESCE(CRW.ANALISTA_ID, SCW.CRIADO_POR) FROM CC_CREDITO CRW JOIN CC_SOLICITACAO SCW ON SCW.ID = CRW.SOLICITACAO_ID
        WHERE CRW.ID = ${pw}.ORIGEM_ID)
      WHEN 'PEDIDO' THEN (SELECT COALESCE(PDW.ANALISTA_ID, PDW.CRIADO_POR) FROM CC_PEDIDO_RETIDO PDW WHERE PDW.ID = ${pw}.ORIGEM_ID) END)
    AND ${a}.CAMINHO <> '' AND CW.CAMINHO LIKE CONCAT(${a}.CAMINHO, '%'))`;
