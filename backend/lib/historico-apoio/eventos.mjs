// Linha do tempo do cliente (plan "Registros do histórico", 04 §7 mapa): UNION ALL de 39 subconsultas, cada
// uma filtrada pelo mesmo cliente e devolvendo EM, AGENDADO, CATEGORIA, TITULO, TEXTO, AUTOR_NOME, ORIGEM,
// ORIGEM_ID, CARD_ID. Sem tabela própria (D-002): o fato corrigido na origem aparece corrigido (RN-003).
//
// `cid` é a expressão SQL do cliente: nas SFs SQL, `CAST('{{clienteId}}' AS SIGNED)` (o valor entra entre
// aspas e vira número: nada da entrada escapa para a consulta); nas JS, o id inteiro já conferido.
// A visibilidade NÃO mora aqui: quem lê junta o cliente com `EU` + `clienteVisivel` (SQL) ou confere
// `visivel(m, cliente)` antes (JS), e corta `Alteração auditada` abaixo do nível 2 (RN-016).
// Dinheiro e data no texto vão como marcadores ({R$:12500.00}, {D:2026-11-24}) e `{+}` separa o que só
// aparece ao expandir (D-003): a tela formata.

import { HOJE_SQL, KB_BRASILIA } from '../tempo.mjs';

export const CATEGORIAS = ['Cobrança', 'Acordos e baixas', 'Crédito', 'Jurídico', 'Setor público', 'Comunicação', 'Recebimentos', 'Alteração auditada'];
export const AUDITADA = 'Alteração auditada';
/** Teto da emissão (RN-018, D-013); o simulador reduz por CC_HIST_TETO só no teste. */
export const TETO_EMISSAO = 2000;

export const CID_SQL = "CAST('{{clienteId}}' AS SIGNED)";

const RS = (x) => `CONCAT('{R$:', ${x}, '}')`;
const DT = (x) => `CONCAT('{D:', ${x}, '}')`;
const DIA_HORA = (x) => `CONCAT(${x}, 'T00:00:00')`;
const CART = (x) => `(CASE ${x} WHEN 'ESTETICA' THEN 'Estética' WHEN 'PUBLICA' THEN 'Pública' ELSE 'Privada' END)`;
const NOME = (alias) => `COALESCE(${alias}.NOME, '')`;
/** Autor nulo = a rotina (01 §2). */
const NOME_OU_ROTINA = (col, alias) => `(CASE WHEN ${col} IS NULL THEN 'Rotina' ELSE ${NOME(alias)} END)`;
const MEMBRO = (alias, col) => `LEFT JOIN CC_MEMBRO ${alias} ON ${alias}.ID = ${col}`;
/** Autor do movimento da lib: "Rotina" para origem sistema; senão o membro do usuário (KB_* guarda INT_USER.ID). */
const AUTOR_KB = (origemCol) => `(CASE WHEN ${origemCol} = 'sistema' THEN 'Rotina' ELSE ${NOME('MU')} END)`;
const OPC = (texto) => `(CASE WHEN ${texto} <> '' THEN CONCAT(' · ', ${texto}) ELSE '' END)`;

function origem({ origem: nome, categoria, em, titulo, texto, autor = "''", id, card = 'NULL', agendado = 0, from }) {
  return { origem: nome, categoria, sql: `SELECT ${em} AS EM, ${agendado} AS AGENDADO, '${categoria}' AS CATEGORIA, ${titulo} AS TITULO,
  ${texto} AS TEXTO, ${autor} AS AUTOR_NOME, '${nome}' AS ORIGEM, ${id} AS ORIGEM_ID, ${card} AS CARD_ID
${from}` };
}

/** Movimento de card do cliente (KB_MOVIMENTO): `junta` liga o card à entidade do domínio. */
const movimento = (nome, categoria, rotulo, junta, cartCol) => origem({
  origem: nome, categoria, em: KB_BRASILIA('MV.QUANDO'), titulo: `CONCAT('${rotulo}: ', COALESCE(PF.NOME, ''))`,
  texto: `CONCAT(${cartCol ? `CONCAT('Carteira ', ${CART(cartCol)})` : "''"}, CASE WHEN DF.NOME IS NULL THEN '' ELSE CONCAT('${cartCol ? '; ' : ''}veio de ', DF.NOME) END)`,
  autor: AUTOR_KB('MV.ORIGEM'), id: 'MV.ID', card: 'MV.CARD_ID',
  from: `FROM KB_MOVIMENTO MV
${junta}
LEFT JOIN KB_FASE PF ON PF.ID = MV.PARA_FASE_ID
LEFT JOIN KB_FASE DF ON DF.ID = MV.DE_FASE_ID
LEFT JOIN CC_MEMBRO MU ON MU.USER_ID = MV.USUARIO_ID`,
});

/** Marco da NF pública (só NF não cancelada). */
const marcoNf = (cid, nome, coluna, rotulo) => origem({
  origem: nome, categoria: 'Setor público', em: DIA_HORA(`NF.${coluna}`), titulo: `CONCAT('NF ', NF.NUMNOTA, ' ${rotulo}')`,
  texto: `CONCAT(${RS('NF.VALOR')}, CASE WHEN NF.EMPENHO <> '' THEN CONCAT('; empenho ', NF.EMPENHO) ELSE '' END)`, id: 'NF.ID',
  from: `FROM CC_NF_PUBLICA NF WHERE NF.CLIENTE_ID = ${cid} AND NF.CANCELADA = FALSE AND NF.${coluna} IS NOT NULL`,
});

/**
 * Auditoria sem eco (plan D-011): fica fora a linha que só repete a criação de um fato que já aparece na sua
 * categoria. Pares ENTIDADE|CAMPO como as donas gravam hoje (002 a 005; o plan citava `(criação)` genérico).
 */
export const ECO_AUDITORIA = ['CONTATO|(contato)', 'ACORDO|(proposta)', 'BAIXA|(proposta)', 'SOLICITACAO|Solicitação', 'PEDIDO|Pedido',
  'CREDITO|Crédito', 'CREDITO|Crédito renovado', 'PROCESSO|(criação)', 'ANDAMENTO|Andamento', 'ACORDO_JUDICIAL|(criação)', 'NOTIFICACAO|(criação)',
  'EMAIL_ENVIADO|(envio)'];

/** As 39 origens (`sql(cid)` por origem). Toda junção que só traz card, NF ou processo confere o mesmo cliente (B4 C-02). */
export function origens(cid) {
  const MOV_COB = `JOIN CC_COBRANCA CB ON CB.CARD_ID = MV.CARD_ID AND CB.CLIENTE_ID = ${cid}`;
  const lista = [
    /* ── Cobrança (5) ── */
    origem({
      origem: 'ACAO', categoria: 'Cobrança', em: 'AR.FEITA_EM', titulo: "'Ação da régua feita'",
      texto: `CONCAT(COALESCE(KF.NOME, AR.FASE_CHAVE), ' · ', AR.ORIGEM, ' · ', CASE WHEN AR.NO_PRAZO = TRUE THEN 'no prazo' ELSE 'fora do prazo' END)`,
      autor: NOME_OU_ROTINA('AR.FEITA_POR', 'M'), id: 'AR.ID', card: 'CB.CARD_ID',
      from: `FROM CC_ACAO_REGUA AR
JOIN CC_COBRANCA CB ON CB.ID = AR.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
LEFT JOIN CC_FASE CF ON CF.QUADRO = CONCAT('cobranca-', LOWER(CB.CARTEIRA)) AND CF.CHAVE = AR.FASE_CHAVE
LEFT JOIN KB_FASE KF ON KF.ID = CF.FASE_ID
${MEMBRO('M', 'AR.FEITA_POR')}
WHERE AR.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'CONTATO', categoria: 'Cobrança',
      em: "(CASE WHEN K.DATA < SUBSTRING(K.CRIADO_EM, 1, 10) THEN CONCAT(K.DATA, 'T00:00:00') ELSE K.CRIADO_EM END)",
      titulo: `CONCAT('Contato por ', K.CANAL, CASE WHEN K.RETORNO <> '' THEN CONCAT(': ', K.RETORNO) ELSE '' END)`,
      texto: `CONCAT(CASE WHEN K.FALOU_COM <> '' THEN CONCAT('Falou com ', K.FALOU_COM, '. ') ELSE '' END, K.FEEDBACK)`,
      autor: NOME('M'), id: 'K.ID', card: 'CB.CARD_ID',
      from: `FROM CC_CONTATO_COBRANCA K
LEFT JOIN CC_COBRANCA CB ON CB.ID = K.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'K.AGENTE_ID')}
WHERE K.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'PROMESSA', categoria: 'Cobrança',
      em: "(CASE WHEN K.DATA < SUBSTRING(K.CRIADO_EM, 1, 10) THEN CONCAT(K.DATA, 'T00:00:00') ELSE K.CRIADO_EM END)",
      titulo: `CONCAT('Promessa de pagamento até ', ${DT('P.DATA_PROMETIDA')})`,
      texto: `CONCAT(CASE WHEN P.VALOR > 0 THEN CONCAT(${RS('P.VALOR')}, ' · ') ELSE '' END,
    CASE P.SITUACAO WHEN 'CUMPRIDA' THEN 'cumprida' WHEN 'QUEBRADA' THEN 'quebrada' ELSE 'em aberto' END)`,
      autor: NOME('M'), id: 'P.ID', card: 'CB.CARD_ID',
      from: `FROM CC_PROMESSA P
JOIN CC_CONTATO_COBRANCA K ON K.ID = P.CONTATO_ID
LEFT JOIN CC_COBRANCA CB ON CB.ID = P.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'P.AGENTE_ID')}
WHERE P.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'PROX_ACAO', categoria: 'Cobrança', agendado: 1, em: DIA_HORA('CB.PROX_ACAO_DATA'), titulo: "CONCAT('Próxima ação: ', CB.PROX_ACAO)",
      texto: `CONCAT('Carteira ', ${CART('CB.CARTEIRA')})`, id: 'CB.ID', card: 'CB.CARD_ID',
      from: `FROM CC_COBRANCA CB
WHERE CB.CLIENTE_ID = ${cid} AND CB.ENCERRADO_EM IS NULL AND CB.PROX_ACAO <> '' AND CB.PROX_ACAO_DATA >= ${HOJE_SQL}`,
    }),
    movimento('MOV_COB', 'Cobrança', 'Etapa da cobrança', MOV_COB, 'CB.CARTEIRA'),

    /* ── Acordos e baixas (8) ── */
    origem({
      origem: 'ACORDO', categoria: 'Acordos e baixas', em: 'A.PROPOSTO_EM', titulo: "'Acordo proposto'",
      texto: `CONCAT('Débito ', ${RS('A.DEBITO')}, '; acordo ', ${RS('A.VALOR')}, '; entrada ', ${RS('A.ENTRADA')}, '; ', A.N_PARCELAS, ' parcela(s)',
    CASE WHEN A.GARANTIA <> '' THEN CONCAT('; garantia: ', A.GARANTIA) ELSE '' END)`,
      autor: NOME('M'), id: 'A.ID', card: 'CB.CARD_ID',
      from: `FROM CC_ACORDO A
LEFT JOIN CC_COBRANCA CB ON CB.ID = A.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'A.PROPOSTO_POR')}
WHERE A.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'ACORDO_DECISAO', categoria: 'Acordos e baixas', em: 'A.DECIDIDO_EM',
      titulo: "CASE WHEN A.SITUACAO = 'RECUSADO' THEN 'Acordo recusado' ELSE 'Acordo aprovado' END", texto: 'A.PARECER',
      autor: NOME('M'), id: 'A.ID', card: 'CB.CARD_ID',
      from: `FROM CC_ACORDO A
LEFT JOIN CC_COBRANCA CB ON CB.ID = A.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'A.DECIDIDO_POR')}
WHERE A.CLIENTE_ID = ${cid} AND A.DECIDIDO_EM IS NOT NULL`,
    }),
    origem({
      origem: 'ACORDO_FIM', categoria: 'Acordos e baixas', em: 'A.ENCERRADO_EM',
      titulo: "CASE A.SITUACAO WHEN 'QUITADO' THEN 'Acordo quitado' WHEN 'QUEBRADO' THEN 'Acordo quebrado' ELSE 'Acordo cancelado' END",
      texto: `CONCAT('Acordo de ', ${RS('A.VALOR')})`, id: 'A.ID', card: 'CB.CARD_ID',
      from: `FROM CC_ACORDO A
LEFT JOIN CC_COBRANCA CB ON CB.ID = A.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
WHERE A.CLIENTE_ID = ${cid} AND A.ENCERRADO_EM IS NOT NULL AND A.SITUACAO IN ('QUITADO', 'QUEBRADO', 'CANCELADO')`,
    }),
    origem({
      origem: 'ACORDO_PARCELA', categoria: 'Acordos e baixas', em: DIA_HORA('PA.PAGO_EM'),
      titulo: "CASE WHEN PA.N = 0 THEN 'Entrada do acordo paga' ELSE CONCAT('Parcela ', PA.N, ' do acordo paga') END",
      texto: RS('PA.VALOR'), autor: NOME('M'), id: 'PA.ID', card: 'CB.CARD_ID',
      from: `FROM CC_ACORDO_PARCELA PA
JOIN CC_ACORDO A ON A.ID = PA.ACORDO_ID
LEFT JOIN CC_COBRANCA CB ON CB.ID = A.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'PA.PAGO_POR')}
WHERE PA.CLIENTE_ID = ${cid} AND PA.PAGO_EM IS NOT NULL`,
    }),
    origem({
      origem: 'ACORDO_PARCELA', categoria: 'Acordos e baixas', agendado: 1, em: DIA_HORA('PA.VENC'),
      titulo: "CASE WHEN PA.N = 0 THEN 'Entrada do acordo vence' ELSE CONCAT('Parcela ', PA.N, ' do acordo vence') END",
      texto: RS('PA.VALOR'), id: 'PA.ID', card: 'CB.CARD_ID',
      from: `FROM CC_ACORDO_PARCELA PA
JOIN CC_ACORDO A ON A.ID = PA.ACORDO_ID AND A.SITUACAO = 'ATIVO'
LEFT JOIN CC_COBRANCA CB ON CB.ID = A.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
WHERE PA.CLIENTE_ID = ${cid} AND PA.PAGO_EM IS NULL AND PA.VENC >= ${HOJE_SQL}`,
    }),
    origem({
      origem: 'BAIXA', categoria: 'Acordos e baixas', em: 'B.PROPOSTO_EM', titulo: "'Baixa como perda proposta'",
      texto: `CONCAT(${RS('B.VALOR')}, ' · ', B.MOTIVO)`, autor: NOME('M'), id: 'B.ID', card: 'CB.CARD_ID',
      from: `FROM CC_BAIXA B
LEFT JOIN CC_COBRANCA CB ON CB.ID = B.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'B.PROPOSTO_POR')}
WHERE B.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'BAIXA_PARECER', categoria: 'Acordos e baixas', em: 'B.PARECER_EM',
      titulo: "CONCAT('Parecer do Jurídico: ', CASE WHEN B.PARECER_RESULTADO = 'FAVORAVEL' THEN 'favorável' ELSE 'desfavorável' END)",
      texto: 'B.PARECER_TEXTO', autor: NOME('M'), id: 'B.ID', card: 'CB.CARD_ID',
      from: `FROM CC_BAIXA B
LEFT JOIN CC_COBRANCA CB ON CB.ID = B.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'B.PARECER_POR')}
WHERE B.CLIENTE_ID = ${cid} AND B.PARECER_EM IS NOT NULL`,
    }),
    origem({
      origem: 'BAIXA_DECISAO', categoria: 'Acordos e baixas', em: 'B.DECIDIDO_EM',
      titulo: "CASE WHEN B.SITUACAO = 'APROVADA' THEN 'Baixa aprovada' ELSE 'Baixa recusada' END",
      texto: 'B.DECISAO_TEXTO', autor: NOME('M'), id: 'B.ID', card: 'CB.CARD_ID',
      from: `FROM CC_BAIXA B
LEFT JOIN CC_COBRANCA CB ON CB.ID = B.COBRANCA_ID AND CB.CLIENTE_ID = ${cid}
${MEMBRO('M', 'B.DECIDIDO_POR')}
WHERE B.CLIENTE_ID = ${cid} AND B.DECIDIDO_EM IS NOT NULL`,
    }),

    /* ── Crédito (6) ── */
    origem({
      origem: 'SOLICITACAO', categoria: 'Crédito', em: 'S.CRIADO_EM', titulo: "'Solicitação de crédito aberta'",
      texto: `CONCAT(${RS('S.VALOR')}, ' · ', S.PRAZO_MESES, ' meses · carteira ', ${CART('S.CARTEIRA')}, ${OPC('S.JUSTIFICATIVA')})`,
      autor: NOME('M'), id: 'S.ID', card: 'S.CARD_ID',
      from: `FROM CC_SOLICITACAO S
${MEMBRO('M', 'S.CRIADO_POR')}
WHERE S.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'DECISAO', categoria: 'Crédito', em: 'D.EM',
      titulo: `CONCAT(CASE WHEN D.ENTIDADE = 'PEDIDO' THEN 'Decisão do pedido: ' ELSE 'Decisão de crédito: ' END,
    CASE D.RESULTADO WHEN 'APROVADA' THEN 'aprovada' WHEN 'PRE_APROVADA' THEN 'pré-aprovada' WHEN 'RECUSADA' THEN 'recusada'
      WHEN 'RENOVADA' THEN 'renovada' WHEN 'OBSOLETO' THEN 'obsoleto' WHEN 'LIBERADO' THEN 'liberado' WHEN 'RECUSADO' THEN 'recusado'
      ELSE LOWER(D.RESULTADO) END)`,
      texto: `CONCAT('Alçada ', D.ALCADA_EXIGIDA, '; limite aprovado ', ${RS('D.LIMITE_APROVADO')},
    CASE WHEN D.RATING <> '' THEN CONCAT('; rating ', D.RATING) WHEN D.RATING_PUB <> '' THEN CONCAT('; rating ', D.RATING_PUB) ELSE '' END,
    CASE WHEN D.PARECER <> '' THEN CONCAT('. ', D.PARECER) ELSE '' END)`,
      autor: NOME('M'), id: 'D.ID', card: 'COALESCE(S.CARD_ID, PD.CARD_ID)',
      from: `FROM CC_DECISAO D
LEFT JOIN CC_SOLICITACAO S ON D.ENTIDADE = 'SOLICITACAO' AND S.ID = D.ENTIDADE_ID AND S.CLIENTE_ID = D.CLIENTE_ID
LEFT JOIN CC_PEDIDO_RETIDO PD ON D.ENTIDADE = 'PEDIDO' AND PD.ID = D.ENTIDADE_ID AND PD.CLIENTE_ID = D.CLIENTE_ID
${MEMBRO('M', 'D.RESPONSAVEL_ID')}
WHERE D.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'CREDITO', categoria: 'Crédito', em: DIA_HORA('CR.INICIO_VALIDADE'), titulo: "'Crédito liberado'",
      texto: `CONCAT('Limite ', ${RS('CR.LIMITE')}, '; validade até ', ${DT('CR.FIM_VALIDADE')},
    CASE WHEN CR.PLANO_DESCR <> '' THEN CONCAT('; plano ', CR.PLANO_DESCR) ELSE '' END)`,
      id: 'CR.ID', card: 'S.CARD_ID',
      from: `FROM CC_CREDITO CR
LEFT JOIN CC_SOLICITACAO S ON S.ID = CR.SOLICITACAO_ID AND S.CLIENTE_ID = CR.CLIENTE_ID
WHERE CR.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'PEDIDO', categoria: 'Crédito', em: 'PD.CRIADO_EM', titulo: "CONCAT('Pedido ', PD.NUMERO_PEDIDO, ' retido por limite')",
      texto: `CONCAT(${RS('PD.VALOR')}, '; excesso ', ${RS('PD.EXCESSO')}, '; alçada ', PD.ALCADA_EXIGIDA)`,
      autor: NOME('M'), id: 'PD.ID', card: 'PD.CARD_ID',
      from: `FROM CC_PEDIDO_RETIDO PD
${MEMBRO('M', 'PD.CRIADO_POR')}
WHERE PD.CLIENTE_ID = ${cid}`,
    }),
    movimento('MOV_CRED', 'Crédito', 'Etapa do crédito', `JOIN CC_SOLICITACAO S ON S.CARD_ID = MV.CARD_ID AND S.CLIENTE_ID = ${cid}`, 'S.CARTEIRA'),
    movimento('MOV_PED', 'Crédito', 'Etapa do pedido', `JOIN CC_PEDIDO_RETIDO PD ON PD.CARD_ID = MV.CARD_ID AND PD.CLIENTE_ID = ${cid}`, null),

    /* ── Jurídico (9) ── */
    origem({
      origem: 'DOSSIE', categoria: 'Jurídico', em: 'PR.DOSSIE_ABERTO_EM', titulo: "'Dossiê para o Jurídico aberto'",
      texto: `CONCAT('Valor ', ${RS('PR.VALOR')})`, autor: NOME('M'), id: 'PR.ID', card: 'PR.CARD_ID',
      from: `FROM CC_PROCESSO PR
${MEMBRO('M', 'PR.DOSSIE_ABERTO_POR')}
WHERE PR.CLIENTE_ID = ${cid} AND PR.DOSSIE_ABERTO_EM IS NOT NULL`,
    }),
    origem({
      origem: 'DOSSIE_ENVIO', categoria: 'Jurídico', em: 'PR.DOSSIE_ENVIADO_EM', titulo: "'Dossiê enviado ao Jurídico'",
      texto: `CONCAT('Valor atualizado ', ${RS('PR.VALOR_ATUALIZADO')})`, autor: NOME('M'), id: 'PR.ID', card: 'PR.CARD_ID',
      from: `FROM CC_PROCESSO PR
${MEMBRO('M', 'PR.DOSSIE_ENVIADO_POR')}
WHERE PR.CLIENTE_ID = ${cid} AND PR.DOSSIE_ENVIADO_EM IS NOT NULL`,
    }),
    origem({
      origem: 'PROCESSO', categoria: 'Jurídico', em: 'PR.CRIADO_EM', titulo: "'Processo registrado'",
      texto: `CONCAT(CASE WHEN PR.AUTOS <> '' THEN CONCAT('Autos ', PR.AUTOS) ELSE 'Sem número dos autos' END,
    CASE WHEN PR.TRIBUNAL <> '' THEN CONCAT(' · ', PR.TRIBUNAL) ELSE '' END, '; valor ', ${RS('PR.VALOR')})`,
      autor: NOME('M'), id: 'PR.ID', card: 'PR.CARD_ID',
      from: `FROM CC_PROCESSO PR
${MEMBRO('M', 'PR.CRIADO_POR')}
WHERE PR.CLIENTE_ID = ${cid} AND PR.ORIGEM <> 'COBRANCA'`,
    }),
    origem({
      origem: 'PROCESSO_FIM', categoria: 'Jurídico', em: 'PR.ENCERRADO_EM', titulo: "'Processo encerrado'",
      texto: `CONCAT(PR.MOTIVO_ENCERRAMENTO, ${OPC('PR.MOTIVO_TEXTO')})`, id: 'PR.ID', card: 'PR.CARD_ID',
      from: `FROM CC_PROCESSO PR
WHERE PR.CLIENTE_ID = ${cid} AND PR.ENCERRADO_EM IS NOT NULL`,
    }),
    origem({
      origem: 'ANDAMENTO', categoria: 'Jurídico', em: "(CASE WHEN CHAR_LENGTH(AN.EM) = 10 THEN CONCAT(AN.EM, 'T00:00:00') ELSE AN.EM END)",
      titulo: "'Andamento do processo'", texto: 'AN.TEXTO', autor: `COALESCE(M.NOME, AN.AUTOR_NOME)`, id: 'AN.ID', card: 'PR.CARD_ID',
      from: `FROM CC_PROCESSO_ANDAMENTO AN
JOIN CC_PROCESSO PR ON PR.ID = AN.PROCESSO_ID
${MEMBRO('M', 'AN.AUTOR_ID')}
WHERE PR.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'ACORDO_JUD', categoria: 'Jurídico', em: 'AJ.REGISTRADO_EM', titulo: "'Acordo judicial registrado'",
      texto: `CONCAT(${RS('AJ.VALOR')}, '; entrada ', ${RS('AJ.ENTRADA')}, '; ', AJ.N_PARCELAS, ' parcela(s); honorários ', ${RS('AJ.HONORARIOS')})`,
      autor: NOME('M'), id: 'AJ.ID', card: 'PR.CARD_ID',
      from: `FROM CC_ACORDO_JUDICIAL AJ
JOIN CC_PROCESSO PR ON PR.ID = AJ.PROCESSO_ID
${MEMBRO('M', 'AJ.REGISTRADO_POR')}
WHERE PR.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'ACORDO_JUD_APROV', categoria: 'Jurídico', em: 'AJ.APROVADO_EM',
      titulo: "CASE WHEN AJ.SITUACAO = 'RECUSADO' THEN 'Acordo judicial recusado' ELSE 'Acordo judicial aprovado' END",
      texto: `CONCAT(${RS('AJ.VALOR')}, ${OPC('AJ.SITUACAO_TEXTO')})`, autor: NOME('M'), id: 'AJ.ID', card: 'PR.CARD_ID',
      from: `FROM CC_ACORDO_JUDICIAL AJ
JOIN CC_PROCESSO PR ON PR.ID = AJ.PROCESSO_ID
${MEMBRO('M', 'AJ.APROVADO_POR')}
WHERE PR.CLIENTE_ID = ${cid} AND AJ.APROVADO_EM IS NOT NULL`,
    }),
    origem({
      origem: 'NOTIFICACAO', categoria: 'Jurídico', em: DIA_HORA('NE.EMITIDA_EM'), titulo: "'Notificação extrajudicial emitida'",
      texto: `CONCAT('Total ', ${RS('NE.TOTAL')}, '; prazo até ', ${DT('NE.PRAZO_ATE')})`, autor: NOME('M'), id: 'NE.ID', card: 'PR.CARD_ID',
      from: `FROM CC_NOTIFICACAO_EXTRAJUDICIAL NE
LEFT JOIN CC_PROCESSO PR ON PR.ID = NE.PROCESSO_ID AND PR.CLIENTE_ID = NE.CLIENTE_ID
${MEMBRO('M', 'NE.EMITIDA_POR')}
WHERE NE.CLIENTE_ID = ${cid}`,
    }),
    movimento('MOV_JUR', 'Jurídico', 'Etapa do processo', `JOIN CC_PROCESSO PR ON PR.CARD_ID = MV.CARD_ID AND PR.CLIENTE_ID = ${cid}`, null),

    /* ── Setor público (7) ── */
    marcoNf(cid, 'NF_EMISSAO', 'EMISSAO', 'emitida'),
    marcoNf(cid, 'NF_PROTOCOLO', 'PROTOCOLO', 'protocolada'),
    marcoNf(cid, 'NF_ATESTO', 'ATESTO', 'atestada'),
    marcoNf(cid, 'NF_LIQUIDACAO', 'LIQUIDACAO', 'liquidada'),
    marcoNf(cid, 'NF_OP', 'OP', 'com ordem de pagamento'),
    marcoNf(cid, 'NF_PAGAMENTO', 'PAGO_EM', 'paga'),
    origem({
      origem: 'NF_ACAO', categoria: 'Setor público', em: 'NA.FEITO_EM', titulo: "CONCAT('Régua da NF ', NF.NUMNOTA, ': passo ', NA.PASSO)",
      texto: `CONCAT(CASE WHEN NA.NO_PRAZO = TRUE THEN 'No prazo' ELSE 'Fora do prazo' END, ' (devido em ', ${DT('NA.PRAZO')}, ')',
    CASE WHEN NA.PROTOCOLO_ORGAO <> '' THEN CONCAT('; protocolo do órgão ', NA.PROTOCOLO_ORGAO) ELSE '' END, ${OPC('NA.OBS')})`,
      autor: NOME_OU_ROTINA('NA.FEITO_POR', 'M'), id: 'NA.ID',
      from: `FROM CC_NF_ACAO NA
JOIN CC_NF_PUBLICA NF ON NF.ID = NA.NF_ID AND NF.CLIENTE_ID = NA.CLIENTE_ID AND NF.CANCELADA = FALSE
${MEMBRO('M', 'NA.FEITO_POR')}
WHERE NA.CLIENTE_ID = ${cid}`,
    }),

    /* ── Comunicação (2) ── */
    origem({
      origem: 'EMAIL', categoria: 'Comunicação', em: 'E.ENVIADO_EM', titulo: 'E.ASSUNTO',
      texto: `CONCAT('Para ', E.PARA, ' · ', CASE WHEN E.RESULTADO = 'ENVIADO' THEN 'Enviado' ELSE 'Falhou' END,
    CASE WHEN E.RESULTADO <> 'ENVIADO' AND E.ERRO <> '' THEN CONCAT(': ', E.ERRO) ELSE '' END, '{+}', E.CORPO)`,
      autor: NOME_OU_ROTINA('E.ENVIADO_POR', 'M'), id: 'E.ID',
      from: `FROM CC_EMAIL_ENVIADO E
${MEMBRO('M', 'E.ENVIADO_POR')}
WHERE E.CLIENTE_ID = ${cid}`,
    }),
    origem({
      origem: 'NOTA', categoria: 'Comunicação', em: KB_BRASILIA('L.QUANDO'), titulo: "'Nota no card'",
      texto: "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(L.DETALHE, '$.texto')), '')", autor: NOME('MU'), id: 'L.ID', card: 'L.CARD_ID',
      from: `FROM KB_LOG L
JOIN (SELECT CARD_ID FROM CC_COBRANCA WHERE CLIENTE_ID = ${cid} AND CARD_ID IS NOT NULL
  UNION SELECT CARD_ID FROM CC_SOLICITACAO WHERE CLIENTE_ID = ${cid} AND CARD_ID IS NOT NULL
  UNION SELECT CARD_ID FROM CC_PEDIDO_RETIDO WHERE CLIENTE_ID = ${cid} AND CARD_ID IS NOT NULL
  UNION SELECT CARD_ID FROM CC_PROCESSO WHERE CLIENTE_ID = ${cid} AND CARD_ID IS NOT NULL) CARDS ON CARDS.CARD_ID = L.CARD_ID
LEFT JOIN CC_MEMBRO MU ON MU.USER_ID = L.USUARIO_ID
WHERE L.EVENTO = 'nota'`,
    }),

    /* ── Recebimentos (1) ── */
    origem({
      origem: 'RECEBIMENTO', categoria: 'Recebimentos', em: DIA_HORA('R.DATA_PAGAMENTO'),
      titulo: "CASE WHEN R.DIAS_ATRASO_PAGAMENTO > 0 THEN 'Pagamento recebido com atraso' ELSE 'Pagamento recebido' END",
      texto: `CONCAT('Título ', R.TITULO, CASE WHEN R.PARCELA <> '' THEN CONCAT('-', R.PARCELA) ELSE '' END, '; ', ${RS('R.VALOR_PAGO')},
    '; vencimento ', ${DT('R.VENCIMENTO')},
    CASE WHEN R.DIAS_ATRASO_PAGAMENTO > 0 THEN CONCAT('; ', R.DIAS_ATRASO_PAGAMENTO, ' dia(s) de atraso') ELSE '' END)`,
      autor: "'Winthor'", id: 'R.ID',
      from: `FROM CC_RECEBIMENTO R
WHERE R.CLIENTE_ID = ${cid} AND R.ESTORNADO = FALSE`,
    }),

    /* ── Alteração auditada (1) ── */
    origem({
      origem: 'AUDITORIA', categoria: AUDITADA, em: 'AU.EM', titulo: "CONCAT(AU.AREA, ': ', AU.CAMPO)",
      texto: `CASE WHEN AU.ANTES = '' THEN AU.DEPOIS WHEN AU.DEPOIS = '' THEN CONCAT('Antes: ', AU.ANTES)
    ELSE CONCAT('De ', AU.ANTES, ' para ', AU.DEPOIS) END`,
      autor: "(CASE WHEN AU.POR IS NULL THEN 'Rotina' ELSE AU.POR_NOME END)", id: 'AU.ID',
      from: `FROM CC_AUDITORIA AU
WHERE AU.CLIENTE_ID = ${cid}
  AND CONCAT(AU.ENTIDADE, '|', AU.CAMPO) NOT IN (${ECO_AUDITORIA.map((x) => `'${x}'`).join(', ')})
  AND NOT (AU.ENTIDADE = 'NF_PUBLICA' AND AU.CAMPO LIKE '% · passo %')`,
    }),
  ];
  return lista;
}

/** A união das 39 origens, como tabela derivada `E`. */
export const EVENTOS_SQL = (cid) => `(${origens(cid).map((o) => o.sql).join('\nUNION ALL\n')}) E`;

/** RN-001: agendados em data crescente, depois passados em data decrescente; empate por origem e o último lançado primeiro. */
export const ORDEM_EVENTOS = `E.AGENDADO DESC, CASE WHEN E.AGENDADO = 1 THEN E.EM ELSE '' END ASC, E.EM DESC, E.ORIGEM ASC, E.ORIGEM_ID DESC`;
