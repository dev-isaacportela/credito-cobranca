// Fragmentos SQL do painel (plan 006, "Fragmentos comuns"). Texto idêntico no MySQL e no SQLite (06 §5).
//
// "Linhas do mês": uma tabela derivada com as colunas da foto (CC_FOTO_AGING) e mais quatro de leitura
// (ANALISTA_ID, NO_JURIDICO, LIMITE_CLIENTE, AO_VIVO). Mês passado = a foto; mês corrente = o ramo ao vivo,
// que é o MESMO SELECT que a rotina congela na foto (foto = ramo ao vivo gravado). `mes`, `data`, … são
// expressões SQL: literal na JS ('2026-11'), `{{mes}}`/`MES_REF` na SQL, ou um marcador '#MES#' trocado depois.

import { HOJE_SQL } from '../tempo.mjs';
import { PARAM_NUM } from '../parametros.mjs';
import { visibilidadeDeCliente, veTudo } from '../visibilidade.mjs';

export const CARTEIRAS = ['PRIVADA', 'ESTETICA', 'PUBLICA'];
export const MES_CORRENTE = `SUBSTRING(${HOJE_SQL}, 1, 7)`;
/** Mês do filtro na SQL ('' = corrente). */
export const MES_REF = `(CASE WHEN '{{mes}}' = '' THEN ${MES_CORRENTE} ELSE '{{mes}}' END)`;
/** 'AAAA-MM' → número de meses (para janelas e "n meses antes"). */
export const MES_INDICE = (expr) => `(CAST(SUBSTRING(${expr}, 1, 4) AS SIGNED) * 12 + CAST(SUBSTRING(${expr}, 6, 2) AS SIGNED))`;

/** Percentuais de PDD em vigor na data, uma linha por carteira: derivada (CARTEIRA, F0…F5) (RN-003). */
export const PDD_PCT = (data) => `(${CARTEIRAS.map((c) => `SELECT '${c}' AS CARTEIRA, ${[0, 1, 2, 3, 4, 5]
  .map((i) => `${PARAM_NUM(`pdd.f${i}`, c === 'PRIVADA' ? "''" : `'${c}'`, data)} AS F${i}`).join(', ')}`).join(' UNION ALL ')})`;

const FAIXAS = ['A_VENCER', 'V_1_30', 'V_31_60', 'V_61_90', 'V_91_180', 'V_180'];
/** PDD de uma linha `x` com os percentuais `pp` (Σ faixa × percentual ÷ 100). */
export const PDD_DA_LINHA = (x, pp) => `ROUND((${FAIXAS.map((f, i) => `${x}.${f} * ${pp}.F${i}`).join(' + ')}) / 100, 2)`;

const COLUNAS = ['MES', 'MES_SEGUINTE', 'CLIENTE_ID', 'BU_ID', 'CARTEIRA', 'AGENTE_ID', 'ANALISTA_ID', 'NO_JURIDICO', 'GRUPO_ECONOMICO', 'UF',
  'PLANO_COD', 'EM_JURIDICO', ...FAIXAS, 'VENCIDO', 'VDIAS', 'DIAS_ATRASO', 'FAIXA', 'PDD', 'VENCIDO_INICIAL', 'GERADA', 'RECUPERADO', 'BAIXADO',
  'PRINCIPAL', 'LIMITE', 'UTILIZADO', 'LIMITE_CLIENTE', 'SINCRONIZACAO_ID', 'SINCRONIZACAO_EM', 'AO_VIVO'];
/** Colunas gravadas em CC_FOTO_AGING (as de leitura ficam de fora). */
export const COLUNAS_FOTO = COLUNAS.filter((c) => !['ANALISTA_ID', 'NO_JURIDICO', 'LIMITE_CLIENTE', 'AO_VIVO'].includes(c));

const sel = (expr) => COLUNAS.map((c) => `${expr[c] ?? `F.${c}`} AS ${c}`).join(', ');

/** Linhas da foto que atendem `onde` (alias F). */
export const daFoto = (onde) => `SELECT ${sel({
  ANALISTA_ID: 'NULL', NO_JURIDICO: 'FALSE', AO_VIVO: '0',
  LIMITE_CLIENTE: '(SELECT SUM(F2.LIMITE) FROM CC_FOTO_AGING F2 WHERE F2.MES = F.MES AND F2.CLIENTE_ID = F.CLIENTE_ID)',
})} FROM CC_FOTO_AGING F WHERE ${onde}`;

/** Recebimentos com atraso, não estornados, pagos no mês, por cliente × BU (RN-007). */
const RECUPERADOS = (mes) => `(SELECT R1.CLIENTE_ID, R1.BU_ID, MIN(R1.CARTEIRA) AS CARTEIRA, SUM(R1.VALOR_PAGO) AS VALOR FROM CC_RECEBIMENTO R1
  WHERE R1.DATA_PAGAMENTO >= CONCAT(${mes}, '-01') AND R1.DATA_PAGAMENTO <= CONCAT(${mes}, '-31')
    AND R1.DIAS_ATRASO_PAGAMENTO > 0 AND R1.ESTORNADO = FALSE GROUP BY R1.CLIENTE_ID, R1.BU_ID)`;

/**
 * Baixas aprovadas no mês, por cliente × BU. A baixa é do caso (cliente × carteira): vai para a linha da carteira
 * com vencido na foto anterior (menor BU_ID); sem nenhuma, BU 0. ponytail: baixa não é rateada por BU.
 */
const BAIXAS = (mes) => `(SELECT B1.CLIENTE_ID, B1.BU_ID, MIN(B1.CARTEIRA) AS CARTEIRA, SUM(B1.VALOR) AS VALOR FROM (
    SELECT BX.CLIENTE_ID, CB.CARTEIRA, BX.VALOR, COALESCE((SELECT MIN(F1.BU_ID) FROM CC_FOTO_AGING F1 WHERE F1.MES_SEGUINTE = ${mes}
      AND F1.CLIENTE_ID = BX.CLIENTE_ID AND F1.CARTEIRA = CB.CARTEIRA AND F1.VENCIDO > 0), 0) AS BU_ID
    FROM CC_BAIXA BX JOIN CC_COBRANCA CB ON CB.ID = BX.COBRANCA_ID
    WHERE BX.SITUACAO = 'APROVADA' AND SUBSTRING(BX.DECIDIDO_EM, 1, 7) = ${mes}) B1
  GROUP BY B1.CLIENTE_ID, B1.BU_ID)`;

const SALDO = (x) => `(${x}.A_VENCER + ${x}.VENCIDO)`;
const DA_POSICAO = (col) => `COALESCE(P.${col}, 0)`;

/**
 * Ramo ao vivo do mês `mes` (plan, "Modelo de dados"): toda linha da posição por BU com saldo e, zerada, toda
 * chave cliente × BU que tinha saldo na foto anterior ou teve recuperação ou baixa no mês. `data` = data dos
 * percentuais de PDD; `onde` = condição extra (o painel liga o ramo só no mês corrente).
 */
export function aoVivo(mes, { data = HOJE_SQL, mesSeguinte = "''", sincId = '0', sincEm = "''", onde = 'TRUE' } = {}) {
  const principal = `(P.CLIENTE_ID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU P2 WHERE P2.CLIENTE_ID = K.CLIENTE_ID
      AND ${SALDO('P2')} > 0 AND (${SALDO('P2')} > ${SALDO('P')} OR (${SALDO('P2')} = ${SALDO('P')} AND P2.BU_ID < P.BU_ID))))`;
  const gerada = `(${DA_POSICAO('VENCIDO')} - COALESCE(ANT.VENCIDO, 0) + COALESCE(R.VALOR, 0))`;
  return `SELECT ${sel({
    MES: mes, MES_SEGUINTE: mesSeguinte, CLIENTE_ID: 'K.CLIENTE_ID', BU_ID: 'K.BU_ID',
    CARTEIRA: "COALESCE(P.CARTEIRA, ANT.CARTEIRA, X.CARTEIRA, R.CARTEIRA, 'PRIVADA')",
    AGENTE_ID: 'C.AGENTE_ID', ANALISTA_ID: 'C.ANALISTA_ID', NO_JURIDICO: 'C.NO_JURIDICO', GRUPO_ECONOMICO: 'C.GRUPO_ECONOMICO', UF: 'C.UF',
    PLANO_COD: 'C.PLANO_COD', EM_JURIDICO: 'C.NO_JURIDICO',
    ...Object.fromEntries([...FAIXAS, 'VENCIDO', 'VDIAS', 'DIAS_ATRASO'].map((f) => [f, DA_POSICAO(f)])),
    FAIXA: `(CASE WHEN P.CLIENTE_ID IS NULL THEN -1 WHEN P.VENCIDO = 0 THEN 0 WHEN P.DIAS_ATRASO <= 30 THEN 1 WHEN P.DIAS_ATRASO <= 60 THEN 2
      WHEN P.DIAS_ATRASO <= 90 THEN 3 WHEN P.DIAS_ATRASO <= 180 THEN 4 ELSE 5 END)`,
    PDD: `(CASE WHEN P.CLIENTE_ID IS NULL THEN 0 ELSE ${PDD_DA_LINHA('P', 'PP')} END)`,
    VENCIDO_INICIAL: 'COALESCE(ANT.VENCIDO, 0)',
    GERADA: `(CASE WHEN BASE.N > 0 AND ${gerada} > 0 THEN ${gerada} ELSE 0 END)`,
    RECUPERADO: 'COALESCE(R.VALOR, 0)', BAIXADO: 'COALESCE(X.VALOR, 0)',
    PRINCIPAL: `(CASE WHEN ${principal} THEN TRUE ELSE FALSE END)`,
    LIMITE: `(CASE WHEN ${principal} THEN COALESCE(PC.LIMITE, 0) ELSE 0 END)`,
    UTILIZADO: `(CASE WHEN ${principal} THEN COALESCE(PC.UTILIZADO, 0) ELSE 0 END)`,
    LIMITE_CLIENTE: 'COALESCE(PC.LIMITE, 0)', SINCRONIZACAO_ID: sincId, SINCRONIZACAO_EM: sincEm, AO_VIVO: '1',
  })}
FROM (SELECT P0.CLIENTE_ID, P0.BU_ID FROM CC_POSICAO_CLIENTE_BU P0 WHERE ${SALDO('P0')} > 0
  UNION SELECT F0.CLIENTE_ID, F0.BU_ID FROM CC_FOTO_AGING F0 WHERE F0.MES_SEGUINTE = ${mes} AND ${SALDO('F0')} > 0
  UNION SELECT R0.CLIENTE_ID, R0.BU_ID FROM ${RECUPERADOS(mes)} R0
  UNION SELECT X0.CLIENTE_ID, X0.BU_ID FROM ${BAIXAS(mes)} X0) K
JOIN CC_CLIENTE C ON C.ID = K.CLIENTE_ID
JOIN (SELECT COUNT(*) AS N FROM CC_FOTO_AGING FB WHERE FB.MES_SEGUINTE = ${mes}) BASE ON 1 = 1
LEFT JOIN CC_POSICAO_CLIENTE_BU P ON P.CLIENTE_ID = K.CLIENTE_ID AND P.BU_ID = K.BU_ID AND ${SALDO('P')} > 0
LEFT JOIN CC_FOTO_AGING ANT ON ANT.MES_SEGUINTE = ${mes} AND ANT.CLIENTE_ID = K.CLIENTE_ID AND ANT.BU_ID = K.BU_ID
LEFT JOIN ${RECUPERADOS(mes)} R ON R.CLIENTE_ID = K.CLIENTE_ID AND R.BU_ID = K.BU_ID
LEFT JOIN ${BAIXAS(mes)} X ON X.CLIENTE_ID = K.CLIENTE_ID AND X.BU_ID = K.BU_ID
LEFT JOIN CC_POSICAO_CLIENTE PC ON PC.CLIENTE_ID = K.CLIENTE_ID
LEFT JOIN ${PDD_PCT(data)} PP ON PP.CARTEIRA = P.CARTEIRA
WHERE ${onde}`;
}

/** Linhas do mês para as SQL de leitura: foto de `mes` + ramo ao vivo só quando `mes` é o corrente. */
export const linhasDoMes = (mes = MES_REF) => `(${daFoto(`F.MES = ${mes}`)}
UNION ALL
${aoVivo(mes, { onde: `${mes} = ${MES_CORRENTE}` })})`;

/** Visibilidade da linha (RN-015, RN-006): Jurídico não vê; foto pelo agente congelado; ao vivo pelo cliente. */
export const visivelNoPainel = (b = 'B', ator = 'EU') => `(${ator}.CARGO <> 'JURIDICO' AND ${visibilidadeDeCliente(b, ator, veTudo(ator))})`;

/** Filtros de BU e carteira sobre a linha (`bu` e `carteira` são expressões SQL; -1 e '' desligam). */
export const filtrosDoPainel = (b = 'B', bu = '{{buId}}', carteira = "'{{carteira}}'") =>
  `(${bu} < 0 OR ${b}.BU_ID = ${bu}) AND (${carteira} = '' OR ${b}.CARTEIRA = ${carteira})`;

/** Recorte de um registro do cliente (contato, promessa, solicitação…): BU = cliente com saldo na BU; carteira do registro. */
export const recorteDoCliente = (clienteId, carteiraCol, bu = '{{buId}}', carteira = "'{{carteira}}'") =>
  `(${bu} < 0 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PB WHERE PB.CLIENTE_ID = ${clienteId} AND PB.BU_ID = ${bu}
    AND ${SALDO('PB')} > 0)) AND (${carteira} = '' OR ${carteiraCol} = ${carteira})`;
