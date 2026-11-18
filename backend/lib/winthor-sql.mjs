// Todo SQL Oracle que o sistema manda ao Winthor (DT-26; 02 §Winthor). Só SELECT/WITH (RNF-005).
// Trocar coluna = trocar só este arquivo (S-12 da T-002).
//
// Funções Oracle usadas: NVL, TO_DATE, TO_CHAR, TRUNC, ROW_NUMBER() OVER, REPLACE (o simulador
// emula; 06 §5). Datas saem como texto 'AAAA-MM-DD'. Nunca SYSDATE: a data de referência vem da JS
// (relógio único, 01 §3). `{{param}}` = valor preenchido por `preencher()` (na JS) ou pela plataforma
// (SF SQL com jdbcId). A leitura pagina o cadastro por `CODCLI > {{cursor}}` (corte em `{{linhas}}`) e lê o resto
// da página pela faixa `CODCLI BETWEEN {{de}} AND {{ate}}`: cada cliente sai inteiro na mesma página.
// Exclusão fixa até a S-12: só DTCANCEL (01 §11); tipo de cobrança sai pela lista do parâmetro, na JS.

/**
 * Marcador do jdbcId do Winthor (DT-26). Definition SQL do Winthor declara `jdbcId: MARCADOR_JDBC_WINTHOR`;
 * JS que lê o Winthor por runQueryMitra usa `jdbcId: Number('__JDBC_WINTHOR__')`. Na publicação o
 * add-010 troca pelo id real (`jdbcIdWinthor()` do add-002); no simulador, por JDBC_WINTHOR_SIM.
 */
export const MARCADOR_JDBC_WINTHOR = '__JDBC_WINTHOR__';

const ABERTO = `P.DTPAG IS NULL AND P.DTCANCEL IS NULL AND P.VALOR - NVL(P.VPAGO, 0) > 0.004`;
const DATA = (col) => `TO_CHAR(${col}, 'YYYY-MM-DD')`;
const VALOR_ITEM = 'NVL(MC.VLSUBTOTITEM, M.QT * M.PUNIT)';

/** Cadastro do universo (título em aberto ou movimento desde `inicioJanela`), uma página por CODCLI. */
export const SQL_CLIENTES_PAGINA = `SELECT T.* FROM (
  SELECT C.CODCLI, C.CLIENTE, C.FANTASIA, C.CGCENT, C.TIPOFJ, C.ESTENT, C.MUNICENT, C.ENDERENT, C.BAIRROENT, C.CEPENT,
         C.TELENT, C.EMAIL, C.CODATV1, A.RAMO, C.CODUSUR1, U.NOME AS RCA_NOME, C.CODPLPAG, C.LIMCRED,
         ${DATA('C.DTULTCOMP')} AS DTULTCOMP, ${DATA('C.DTCADASTRO')} AS DTCADASTRO, C.BLOQUEIO,
         ROW_NUMBER() OVER (ORDER BY C.CODCLI) AS RN
  FROM PCCLIENT C
  LEFT JOIN PCATIVI A ON A.CODATIV = C.CODATV1
  LEFT JOIN PCUSUARI U ON U.CODUSUR = C.CODUSUR1
  WHERE C.CODCLI > {{cursor}}
    AND EXISTS (SELECT 1 FROM PCPREST P WHERE P.CODCLI = C.CODCLI
                AND ((${ABERTO})
                     OR P.DTEMISSAO >= TO_DATE('{{inicioJanela}}', 'YYYY-MM-DD')
                     OR P.DTPAG >= TO_DATE('{{inicioJanela}}', 'YYYY-MM-DD')))
) T WHERE T.RN <= {{linhas}} ORDER BY T.CODCLI`;

/** Compras da janela por cliente (vendas distintas, valor, Σ valor × prazo), títulos emitidos sem cancelados. */
export const SQL_COMPRAS_PAGINA = `SELECT P.CODCLI, COUNT(DISTINCT P.NUMTRANSVENDA) AS COMPRAS_QTD, SUM(P.VALOR) AS COMPRAS_VALOR,
       SUM(P.VALOR * TRUNC(P.DTVENC - P.DTEMISSAO)) AS SOMA_VALOR_PRAZO
FROM PCPREST P
WHERE P.CODCLI BETWEEN {{de}} AND {{ate}} AND P.DTCANCEL IS NULL
  AND P.DTEMISSAO >= TO_DATE('{{inicioCompras}}', 'YYYY-MM-DD')
GROUP BY P.CODCLI
ORDER BY P.CODCLI`;

/** Títulos em aberto dos clientes da faixa [de, ate] (a página de clientes da leitura). */
export const SQL_TITULOS_ABERTOS = `SELECT P.CODCLI, P.NUMTRANSVENDA, P.PREST, P.DUPLIC, P.CODFILIAL, N.NUMNOTA, P.VALOR, NVL(P.VPAGO, 0) AS VPAGO,
       ${DATA('P.DTVENC')} AS DTVENC, ${DATA('P.DTEMISSAO')} AS DTEMISSAO, P.CODCOB
FROM PCPREST P
LEFT JOIN PCNFSAID N ON N.NUMTRANSVENDA = P.NUMTRANSVENDA
WHERE P.CODCLI BETWEEN {{de}} AND {{ate}} AND ${ABERTO}
ORDER BY P.CODCLI, P.NUMTRANSVENDA, P.PREST`;

/** Valor dos itens por venda × departamento dos clientes da faixa (rateio por BU, D-01). */
export const SQL_ITENS_POR_DEPTO = `SELECT M.NUMTRANSVENDA, PR.CODEPTO, SUM(${VALOR_ITEM}) AS VALOR
FROM PCMOV M
JOIN PCPRODUT PR ON PR.CODPROD = M.CODPROD
LEFT JOIN PCMOVCOMPLE MC ON MC.NUMTRANSITEM = M.NUMTRANSITEM
WHERE M.CODCLI BETWEEN {{de}} AND {{ate}} AND M.DTCANCEL IS NULL AND M.CODOPER NOT IN ('SR', 'SO')
GROUP BY M.NUMTRANSVENDA, PR.CODEPTO
ORDER BY M.NUMTRANSVENDA, PR.CODEPTO`;

/** Pagamentos com DTPAG desde `inicioJanela` dos clientes da faixa (estorno = chave que sumiu, na JS). */
export const SQL_RECEBIMENTOS = `SELECT P.CODCLI, P.NUMTRANSVENDA, P.PREST, P.DUPLIC, P.CODFILIAL, NVL(P.VPAGO, P.VALOR) AS VPAGO,
       ${DATA('P.DTVENC')} AS DTVENC, ${DATA('P.DTPAG')} AS DTPAG
FROM PCPREST P
WHERE P.CODCLI BETWEEN {{de}} AND {{ate}} AND P.DTPAG >= TO_DATE('{{inicioJanela}}', 'YYYY-MM-DD') AND P.DTCANCEL IS NULL
ORDER BY P.CODCLI, P.NUMTRANSVENDA, P.PREST`;

/**
 * Faturamento por cliente × departamento × mês desde `inicio`, com os filtros confirmados do p-44515.
 * ponytail: valor do item = VLSUBTOTITEM; IPI, ST, frete e devolução (PCNFENT/PCESTCOM) do p-44515
 * entram com a descoberta da S-12 (o schema do simulador não tem essas colunas, 02 §Winthor).
 */
export const SQL_FATURAMENTO = `SELECT N.CODCLI, PR.CODEPTO, TO_CHAR(N.DTSAIDA, 'YYYY-MM') AS MES, SUM(${VALOR_ITEM}) AS VALOR
FROM PCNFSAID N
JOIN PCMOV M ON M.NUMTRANSVENDA = N.NUMTRANSVENDA AND M.CODFILIAL = N.CODFILIAL
JOIN PCPRODUT PR ON PR.CODPROD = M.CODPROD
LEFT JOIN PCMOVCOMPLE MC ON MC.NUMTRANSITEM = M.NUMTRANSITEM
WHERE N.CODCLI BETWEEN {{de}} AND {{ate}} AND N.DTSAIDA >= TO_DATE('{{inicio}}', 'YYYY-MM-DD')
  AND N.DTCANCEL IS NULL AND M.DTCANCEL IS NULL AND M.CODOPER NOT IN ('SR', 'SO')
  AND NVL(N.TIPOVENDA, 'X') NOT IN ('SR', 'DF')
  AND NVL(N.CODFISCAL, 0) NOT IN (522, 622, 722, 532, 632, 732)
  AND NVL(N.CONDVENDA, 0) NOT IN (4, 8, 10, 13, 20, 98, 99)
GROUP BY N.CODCLI, PR.CODEPTO, TO_CHAR(N.DTSAIDA, 'YYYY-MM')
ORDER BY N.CODCLI, PR.CODEPTO, MES`;

export const SQL_PLANOS = `SELECT CODPLPAG, DESCRICAO, NUMDIAS FROM PCPLPAG ORDER BY CODPLPAG`;

export const SQL_DEPARTAMENTOS = `SELECT CODEPTO, DESCRICAO FROM PCDEPTO ORDER BY CODEPTO`;

/** Títulos em aberto de um cliente, ao vivo: uma linha por título × departamento (`ccBaseWinthorTitulos`). */
export const SQL_TITULOS_CLIENTE = `SELECT P.CODCLI, P.NUMTRANSVENDA, P.PREST, P.DUPLIC, P.CODFILIAL, N.NUMNOTA, P.VALOR, NVL(P.VPAGO, 0) AS VPAGO,
       ${DATA('P.DTVENC')} AS DTVENC, ${DATA('P.DTEMISSAO')} AS DTEMISSAO, P.CODCOB, I.CODEPTO, I.VALOR AS ITEM_VALOR
FROM PCPREST P
LEFT JOIN PCNFSAID N ON N.NUMTRANSVENDA = P.NUMTRANSVENDA
LEFT JOIN (SELECT M.NUMTRANSVENDA, PR.CODEPTO, SUM(${VALOR_ITEM}) AS VALOR
           FROM PCMOV M JOIN PCPRODUT PR ON PR.CODPROD = M.CODPROD
           LEFT JOIN PCMOVCOMPLE MC ON MC.NUMTRANSITEM = M.NUMTRANSITEM
           WHERE M.CODCLI = {{codcli}} AND M.DTCANCEL IS NULL AND M.CODOPER NOT IN ('SR', 'SO')
           GROUP BY M.NUMTRANSVENDA, PR.CODEPTO) I ON I.NUMTRANSVENDA = P.NUMTRANSVENDA
WHERE P.CODCLI = {{codcli}} AND ${ABERTO}
ORDER BY P.DTVENC, P.NUMTRANSVENDA, P.PREST, I.CODEPTO`;

/** Cadastro de um cliente do Winthor, por código ou documento só dígitos (`ccBaseWinthorCliente`). */
export const SQL_CLIENTE = `SELECT C.CODCLI, C.CLIENTE, C.CGCENT, C.ESTENT, C.MUNICENT, A.RAMO, C.LIMCRED
FROM PCCLIENT C
LEFT JOIN PCATIVI A ON A.CODATIV = C.CODATV1
WHERE C.CODCLI = {{codcli}}
   OR ('{{documento}}' <> '' AND REPLACE(REPLACE(REPLACE(C.CGCENT, '.', ''), '/', ''), '-', '') = '{{documento}}')`;

/** Colunas reais das tabelas lidas (`ccBaseWinthorDescobrir`, S-12). */
export const SQL_COLUNAS = `SELECT TABLE_NAME, COLUMN_NAME FROM ALL_TAB_COLUMNS
WHERE TABLE_NAME IN ('PCCLIENT', 'PCATIVI', 'PCUSUARI', 'PCDEPTO', 'PCPRODUT', 'PCMOV', 'PCMOVCOMPLE', 'PCNFSAID', 'PCPREST', 'PCPLPAG')
ORDER BY TABLE_NAME, COLUMN_NAME`;

/** O que este arquivo lê de cada tabela; `ccBaseWinthorDescobrir` compara com ALL_TAB_COLUMNS. */
export const COLUNAS_LIDAS = {
  PCCLIENT: ['CODCLI', 'CLIENTE', 'FANTASIA', 'CGCENT', 'TIPOFJ', 'ESTENT', 'MUNICENT', 'ENDERENT', 'BAIRROENT', 'CEPENT', 'TELENT',
    'EMAIL', 'CODATV1', 'CODUSUR1', 'CODPLPAG', 'LIMCRED', 'DTULTCOMP', 'DTCADASTRO', 'BLOQUEIO'],
  PCATIVI: ['CODATIV', 'RAMO'],
  PCUSUARI: ['CODUSUR', 'NOME'],
  PCDEPTO: ['CODEPTO', 'DESCRICAO'],
  PCPRODUT: ['CODPROD', 'CODEPTO'],
  PCMOV: ['NUMTRANSVENDA', 'CODFILIAL', 'CODPROD', 'CODCLI', 'QT', 'PUNIT', 'CODOPER', 'NUMTRANSITEM', 'DTCANCEL'],
  PCMOVCOMPLE: ['NUMTRANSITEM', 'VLSUBTOTITEM'],
  PCNFSAID: ['NUMTRANSVENDA', 'CODFILIAL', 'CODCLI', 'NUMNOTA', 'DTSAIDA', 'DTCANCEL', 'TIPOVENDA', 'CODFISCAL', 'CONDVENDA'],
  PCPREST: ['NUMTRANSVENDA', 'PREST', 'CODFILIAL', 'CODCLI', 'DUPLIC', 'VALOR', 'VPAGO', 'DTVENC', 'DTPAG', 'DTEMISSAO', 'CODCOB', 'DTCANCEL'],
  PCPLPAG: ['CODPLPAG', 'DESCRICAO', 'NUMDIAS'],
};

/** Todo SQL deste arquivo (o teste RNF-005 varre a lista). */
export const TODOS = {
  SQL_CLIENTES_PAGINA, SQL_COMPRAS_PAGINA, SQL_TITULOS_ABERTOS, SQL_ITENS_POR_DEPTO, SQL_RECEBIMENTOS, SQL_FATURAMENTO,
  SQL_PLANOS, SQL_DEPARTAMENTOS, SQL_TITULOS_CLIENTE, SQL_CLIENTE, SQL_COLUNAS,
};

/** Troca `{{x}}` pelo valor (aspa simples dobrada). Parâmetro ausente lança: SQL pela metade não sai. */
export function preencher(sql, valores) {
  return String(sql).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!valores || valores[k] === undefined || valores[k] === null) throw new Error(`Parâmetro ${k} ausente no SQL do Winthor.`);
    return String(valores[k]).replace(/'/g, "''");
  });
}
