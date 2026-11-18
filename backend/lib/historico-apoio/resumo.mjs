// Resumo do cliente (RN-005, 04 §7 `ccHistResumo`): consultas por `ler()` dentro da JS, depois de a JS conferir
// a visibilidade (`visivel(m, cliente)`, DT-34). Usadas por `ccHistResumo` e `ccHistExportar`. Entram nas SFs
// por `FONTE`; usam `ler`, `inteiro`, `nivelMin`, `EVENTOS_JS` e `AUDITADA` do corpo da SF.

/** Cliente com agente, supervisor do agente, analista (e os caminhos que `visivel()` usa) e a posição. */
async function clienteDoHistorico(id) {
  const [c] = await ler(`SELECT C.ID, C.CODCLI, C.NOME, C.FANTASIA, C.DOCUMENTO, C.TIPO_PESSOA, C.SETOR, C.ESFERA, C.UF, C.MUNICIPIO,
  C.NO_JURIDICO, C.AGENTE_ID, C.ANALISTA_ID, AG.NOME AS AGENTE_NOME, AG.CAMINHO AS AGENTE_CAMINHO, SUP.NOME AS SUPERVISOR_NOME,
  AN.NOME AS ANALISTA_NOME, AN.CAMINHO AS ANALISTA_CAMINHO, P.ID AS POSICAO_ID, P.LIMITE, P.UTILIZADO, P.DISPONIVEL, P.VENCIDO, P.A_VENCER,
  P.DIAS_ATRASO, P.VENC_MAIS_ANTIGO, P.PROX_VENC, P.PROX_VENC_VALOR, P.ULTIMA_COMPRA, P.SINCRONIZADO_EM
FROM CC_CLIENTE C
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
LEFT JOIN CC_MEMBRO SUP ON SUP.ID = AG.SUPERIOR_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = C.ID
WHERE C.ID = ${inteiro(id)}`);
  return c || null;
}

/** Contagem por categoria (a mesma união da lista; `Alteração auditada` só com nível 2 ou ADMIN, RN-016). */
async function contagensDo(id, m) {
  const corte = nivelMin(m, 2) ? '' : `WHERE E.CATEGORIA <> '${AUDITADA}'`;
  const contagens = {};
  for (const l of await ler(`SELECT E.CATEGORIA, COUNT(*) AS N FROM ${EVENTOS_JS.split('__CID__').join(String(inteiro(id)))} ${corte} GROUP BY E.CATEGORIA`)) {
    contagens[l.CATEGORIA] = inteiro(l.N);
  }
  return contagens;
}

/** Os 12 campos de RN-005 e as contagens. Campo sem dado = null (a tela mostra "—"). */
async function resumoDo(c, m) {
  const id = inteiro(c.ID);
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  const [sol] = await ler(`SELECT S.ID, S.CARTEIRA, S.FP_NOME, S.CRIADO_EM, S.DECISAO_RESULTADO, KF.NOME AS ETAPA, CF.CHAVE AS ETAPA_CHAVE,
  AO.FONTE_PAGADORA AS FP_ORGAO
FROM CC_SOLICITACAO S
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_FASE CF ON CF.FASE_ID = K.FASE_ID
LEFT JOIN CC_ANALISE_ORGAO AO ON AO.SOLICITACAO_ID = S.ID
WHERE S.CLIENTE_ID = ${id} ORDER BY S.CRIADO_EM DESC, S.ID DESC LIMIT 1`);
  const [vig] = await ler(`SELECT ID, CARTEIRA, LIMITE, INICIO_VALIDADE, FIM_VALIDADE, SITUACAO, RATING_CONCESSAO, ANALISE_ORGAO_ID
FROM CC_CREDITO WHERE VIGENTE_CHAVE = ${id}`);
  const [risco] = await ler(`SELECT CRITICIDADE, CRIT_MOTIVOS, RATING_ATUAL, REBAIXADO, SCORE_FINAL, FAIXA_SCORE, SAUDE, CALCULADO_EM
FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ${id}`);
  // Rating público (02 CC_ANALISE_ORGAO): o da análise do crédito vigente; sem ele, a aprovada mais recente.
  const analises = await ler(`SELECT AO.ID, AO.RATING_PUB, AO.FONTE_PAGADORA, S.DECISAO_RESULTADO FROM CC_ANALISE_ORGAO AO
JOIN CC_SOLICITACAO S ON S.ID = AO.SOLICITACAO_ID
WHERE AO.CLIENTE_ID = ${id} AND AO.RATING_PUB <> '' ORDER BY S.DECIDIDA_EM DESC, AO.ID DESC`);
  const analise = analises.find((a) => vig && inteiro(a.ID) === inteiro(vig.ANALISE_ORGAO_ID))
    || analises.find((a) => ['APROVADA', 'PRE_APROVADA'].includes(a.DECISAO_RESULTADO)) || null;
  const cobrancas = await ler(`SELECT CB.ID, CB.CARTEIRA, CB.CARD_ID, KF.NOME AS FASE_NOME, CF.CHAVE AS FASE_CHAVE, CB.PROX_ACAO, CB.PROX_ACAO_DATA
FROM CC_COBRANCA CB
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_FASE CF ON CF.FASE_ID = K.FASE_ID
WHERE CB.CLIENTE_ID = ${id} AND CB.ENCERRADO_EM IS NULL ORDER BY CB.CARTEIRA, CB.ID`);
  const [n] = await ler(`SELECT
  (SELECT COUNT(*) FROM CC_CONTATO_COBRANCA WHERE CLIENTE_ID = ${id}) AS CONTATOS,
  (SELECT COUNT(*) FROM CC_PROMESSA WHERE CLIENTE_ID = ${id} AND SITUACAO = 'ABERTA') AS PROMESSAS_ABERTAS,
  (SELECT SUM(VALOR_PAGO) FROM CC_RECEBIMENTO WHERE CLIENTE_ID = ${id} AND ESTORNADO = FALSE AND DIAS_ATRASO_PAGAMENTO > 0) AS RECUPERADO,
  (SELECT COUNT(*) FROM CC_ANEXO WHERE ENTIDADE = 'CLIENTE' AND CLIENTE_ID = ${id} AND REMOVIDO_EM IS NULL) AS ANEXOS,
  (SELECT COUNT(*) FROM KB_ANEXO KA WHERE KA.EXCLUIDO_EM IS NULL AND KA.CARD_ID IN (
    SELECT CARD_ID FROM CC_COBRANCA WHERE CLIENTE_ID = ${id} AND CARD_ID IS NOT NULL
    UNION SELECT CARD_ID FROM CC_SOLICITACAO WHERE CLIENTE_ID = ${id} AND CARD_ID IS NOT NULL
    UNION SELECT CARD_ID FROM CC_PEDIDO_RETIDO WHERE CLIENTE_ID = ${id} AND CARD_ID IS NOT NULL
    UNION SELECT CARD_ID FROM CC_PROCESSO WHERE CLIENTE_ID = ${id} AND CARD_ID IS NOT NULL)) AS ANEXOS_CARD,
  (SELECT COUNT(*) FROM CC_PROCESSO WHERE CLIENTE_ID = ${id}) AS PROCESSOS,
  (SELECT COUNT(*) FROM CC_PROCESSO WHERE CLIENTE_ID = ${id} AND ENCERRADO_EM IS NULL) AS PROCESSOS_ATIVOS`);
  const [ultimo] = await ler(`SELECT DATA, CANAL, RETORNO, FALOU_COM FROM CC_CONTATO_COBRANCA WHERE CLIENTE_ID = ${id} ORDER BY DATA DESC, ID DESC LIMIT 1`);
  const contagens = await contagensDo(id, m);
  const fontePagadora = (sol && (sol.FP_ORGAO || sol.FP_NOME)) || (analise && analise.FONTE_PAGADORA) || null;
  return {
    cliente: {
      ID: id, CODCLI: inteiro(c.CODCLI), NOME: c.NOME, FANTASIA: c.FANTASIA, DOCUMENTO: c.DOCUMENTO, TIPO_PESSOA: c.TIPO_PESSOA, SETOR: c.SETOR,
      ESFERA: c.ESFERA, UF: c.UF, MUNICIPIO: c.MUNICIPIO, AGENTE_NOME: c.AGENTE_NOME || null, SUPERVISOR_NOME: c.SUPERVISOR_NOME || null,
      ANALISTA_NOME: c.ANALISTA_NOME || null,
    },
    posicao: c.POSICAO_ID ? {
      LIMITE: num(c.LIMITE), UTILIZADO: num(c.UTILIZADO), DISPONIVEL: num(c.DISPONIVEL), VENCIDO: num(c.VENCIDO), A_VENCER: num(c.A_VENCER),
      DIAS_ATRASO: inteiro(c.DIAS_ATRASO), VENC_MAIS_ANTIGO: c.VENC_MAIS_ANTIGO, PROX_VENC: c.PROX_VENC, PROX_VENC_VALOR: num(c.PROX_VENC_VALOR),
      ULTIMA_COMPRA: c.ULTIMA_COMPRA, SINCRONIZADO_EM: c.SINCRONIZADO_EM,
    } : null,
    credito: sol || vig ? {
      etapa: (sol && sol.ETAPA) || null, etapaChave: (sol && sol.ETAPA_CHAVE) || null, carteira: (sol && sol.CARTEIRA) || (vig && vig.CARTEIRA) || null,
      fontePagadora, vigente: vig ? { LIMITE: num(vig.LIMITE), INICIO_VALIDADE: vig.INICIO_VALIDADE, FIM_VALIDADE: vig.FIM_VALIDADE, SITUACAO: vig.SITUACAO,
        RATING_CONCESSAO: vig.RATING_CONCESSAO || null } : null,
    } : null,
    fontePagadora,
    risco: risco ? { ...risco, SCORE_FINAL: num(risco.SCORE_FINAL) } : null,
    ratingPub: (analise && analise.RATING_PUB) || null,
    cobrancas: cobrancas.map((x) => ({ ID: inteiro(x.ID), CARTEIRA: x.CARTEIRA, CARD_ID: x.CARD_ID ? inteiro(x.CARD_ID) : null, FASE_NOME: x.FASE_NOME || null,
      FASE_CHAVE: x.FASE_CHAVE || null, PROX_ACAO: x.PROX_ACAO || null, PROX_ACAO_DATA: x.PROX_ACAO_DATA || null })),
    processos: { total: inteiro(n.PROCESSOS), ativos: inteiro(n.PROCESSOS_ATIVOS) },
    ultimoContato: ultimo || null,
    recuperado: n.RECUPERADO === null || n.RECUPERADO === undefined ? null : Math.round(Number(n.RECUPERADO) * 100) / 100,
    contatos: inteiro(n.CONTATOS),
    promessasAbertas: inteiro(n.PROMESSAS_ABERTAS),
    documentos: inteiro(n.ANEXOS) + inteiro(n.ANEXOS_CARD),
    contagens,
    total: Object.values(contagens).reduce((s, x) => s + x, 0),
  };
}

export const FONTE = [clienteDoHistorico, contagensDo, resumoDo].map(String).join('\n');
