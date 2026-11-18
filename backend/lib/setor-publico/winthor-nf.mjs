// SQL Oracle das NFs de órgão (02 §Winthor; único lugar que muda com a S-12). Só SELECT.
// Por NF de saída: valor, saldo em aberto, parcelas, parcelas pagas, último pagamento, cancelamento e o número
// do pedido do cliente (candidato a empenho, PCPEDC.NUMPEDCLI). Só NF com parcela em PCPREST.
// Parâmetros (`preencher()` na rotina, ou a plataforma na SF `ccPubWinthorNf`): `clientes` (CODCLI, por vírgula),
// `aPartirDe` (cursor: NUMTRANSVENDA já gravado), `transacoes` (NUMTRANSVENDA em aberto no sistema, por vírgula; '0' = nenhuma),
// `desde` (pub.nfDataCorte), `linhas` (tamanho da página das novas).
// ponytail: lista de CODCLI e de transações por IN (até 1.000 itens no Oracle); a rotina divide em lotes de 500.

const DATA = (col) => `TO_CHAR(${col}, 'YYYY-MM-DD')`;

export const SQL_NF_PUBLICA = `SELECT T.* FROM (
  SELECT NF.CODFILIAL, NF.NUMTRANSVENDA, NF.NUMNOTA, NVL(NF.SERIE, '') AS SERIE, NF.CODCLI, ${DATA('NF.DTSAIDA')} AS EMISSAO,
         NVL(NF.VLTOTAL, 0) AS VALOR, ${DATA('NF.DTCANCEL')} AS CANCELADA_EM, NVL(PC.NUMPEDCLI, '') AS EMPENHO,
         (SELECT COUNT(*) FROM PCPREST P WHERE P.NUMTRANSVENDA = NF.NUMTRANSVENDA AND P.CODFILIAL = NF.CODFILIAL AND P.DTCANCEL IS NULL) AS PARCELAS,
         (SELECT COUNT(*) FROM PCPREST P WHERE P.NUMTRANSVENDA = NF.NUMTRANSVENDA AND P.CODFILIAL = NF.CODFILIAL AND P.DTCANCEL IS NULL
            AND P.DTPAG IS NOT NULL) AS PAGAS,
         (SELECT NVL(SUM(P.VALOR - NVL(P.VPAGO, 0)), 0) FROM PCPREST P WHERE P.NUMTRANSVENDA = NF.NUMTRANSVENDA AND P.CODFILIAL = NF.CODFILIAL
            AND P.DTCANCEL IS NULL AND P.DTPAG IS NULL) AS SALDO,
         (SELECT ${DATA('MAX(P.DTPAG)')} FROM PCPREST P WHERE P.NUMTRANSVENDA = NF.NUMTRANSVENDA AND P.CODFILIAL = NF.CODFILIAL
            AND P.DTCANCEL IS NULL) AS ULTIMO_PAGAMENTO,
         ROW_NUMBER() OVER (ORDER BY NF.NUMTRANSVENDA) AS RN
  FROM PCNFSAID NF
  LEFT JOIN PCPEDC PC ON PC.NUMPED = NF.NUMPED
  WHERE NF.CODCLI IN ({{clientes}})
    AND NF.DTSAIDA >= TO_DATE('{{desde}}', 'YYYY-MM-DD')
    AND ((NF.NUMTRANSVENDA > {{aPartirDe}} AND NF.DTCANCEL IS NULL) OR NF.NUMTRANSVENDA IN ({{transacoes}}))
    AND EXISTS (SELECT 1 FROM PCPREST P WHERE P.NUMTRANSVENDA = NF.NUMTRANSVENDA AND P.CODFILIAL = NF.CODFILIAL)
) T WHERE T.RN <= {{linhas}} ORDER BY T.NUMTRANSVENDA`;
