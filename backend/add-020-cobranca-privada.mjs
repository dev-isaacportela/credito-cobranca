// add-020 — Server Functions da 002-cobranca (04 §2): 39 públicas e 21 internas, para as três carteiras (D-05).
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// `definitions` vai para o simulador, que roda o MESMO SQL e o MESMO JavaScript publicados.
//
// Entradas das escritas internas (forma A, 01 §5; `membroId` = quem age, 0 = rotina; `agora` vem da JS):
//   ccEscCobCasoInserir          clienteId, carteira, faseDevida, dataRef, membroId, agora              (só rotina)
//   ccEscCobCasoCard             cobrancaId, cardId, capa, membroId                                     (só rotina)
//   ccEscCobCasoCapa             cobrancaId, capa ('' = não grava), faseDevida ('' = não grava), membroId, agora
//   ccEscCobCasoProxAcao         cobrancaId, proxAcao, proxAcaoData, membroId, agora
//   ccEscCobCasoEncerrar         cobrancaId, desfecho ('' = não encerra), anuenciaAte, membroId, agora   (VALOR_BAIXADO = Σ baixas APROVADA)
//   ccEscCobCasoJuridico         cobrancaId, processoId, membroId, agora
//   ccEscCobCasoBloqueio         cobrancaId, aplicado, membroId, agora
//   ccEscCobCasoAnuencia         cobrancaId, membroId, agora
//   ccEscCobCasoProtesto         cobrancaId, membroId, agora
//   ccEscCobAcaoInserir          cobrancaId, faseChave (= fase do card), origem, membroId, agora   (NO_PRAZO calculado na SQL)
//   ccEscCobContatoInserir       clienteId, cobrancaId, nfId, data, canal, falouCom, retorno, previsao, valor, feedback, origem, emailEnviadoId, membroId, agora
//   ccEscCobPromessaInserir      contatoId, membroId
//   ccEscCobAcordoInserir        cobrancaId, debito (conferido com o vencido da carteira), valor, entrada, entradaData, nParcelas, primeiroVenc, intervaloDias, garantia, membroId, agora
//   ccEscCobAcordoParcelasInserir acordoId, n, numeros, vencs, valores (listas por ¦), membroId
//   ccEscCobAcordoSituacao       acordoId, situacao, parecer, membroId, agora
//   ccEscCobAcordoParcelaPagar   parcelaId, pagoEm, membroId
//   ccEscCobBaixaInserir         cobrancaId, valor, motivo, docRegua, docParecer, docProtesto, docAcordo, obs, membroId, agora
//   ccEscCobBaixaParecer         baixaId, resultado, texto, membroId, agora
//   ccEscCobBaixaDecidir         baixaId, aprovar, texto, membroId, agora
//   ccEscCobFilaInserir          n, cobrancaIds, clienteIds, fases, datasRef, valores (listas por ¦), membroId, agora   (só rotina)
//   ccEscCobFilaSituacao         ids (por vírgula), situacao, obs, emailEnviadoId, membroId, agora

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { chaveDeRotulo } from '@benenutri/mitra-kanban/motor';
import { js, injetarIds } from './lib/escritas.mjs';
import { q } from './lib/texto-sql.mjs';
import { ATOR, ROTINA, NIVEL_MIN, clienteVisivelA, NUMEROS_20, ITEM, numerosComoParametro } from './lib/guarda.mjs';
import { EU, clienteVisivel, membroVisivel, visibilidadeDeCliente, veTudo } from './lib/visibilidade.mjs';
import { PARAM, PARAM_NUM } from './lib/parametros.mjs';
import { HOJE_SQL, AGORA_SQL, KB_BRASILIA } from './lib/tempo.mjs';
import { FONTE as FONTE_DIAS } from './lib/dias-uteis.mjs';
import { semearQuadro } from './lib/quadros.mjs';
import { FONTE as FONTE_REGUA } from './lib/cobranca-privada/regua.mjs';
import { FONTE as FONTE_ACORDO } from './lib/cobranca-privada/acordo.mjs';
import { FONTE as FONTE_ENCARGOS } from './lib/cobranca-privada/encargos.mjs';
import { FONTE as FONTE_EMAIL, MODELO_DA_FASE } from './lib/cobranca-privada/email.mjs';
import { QUADROS, ITENS_ACAO, ITENS_PUBLICA, ETIQUETAS_PRIVADA, ETIQUETAS_PUBLICA } from './lib/quadros/002-cobranca-privada.mjs';
import { MODELOS } from './lib/modelos/002-cobranca-privada.mjs';

/* ── texto que entra nos corpos JAVASCRIPT ── */

const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;

function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function texto(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function dinheiro(v) { const n = Number(String(v ?? '').trim().replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; }
function ehData(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')); }
function brasilia(utc) { return utc ? agora(Date.parse(`${String(utc).slice(0, 19)}Z`)) : ''; }
function valoresDe(json) { try { return JSON.parse(json || '{}') || {}; } catch { return {}; } }
function brl(v) { const [i, c] = Math.abs(Number(v) || 0).toFixed(2).split('.'); return `R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`; }
function diasEntre(a, b) { return Math.round((Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000); }
function itensDe(carteira, fase) { return (carteira === 'PUBLICA' ? ITENS_PUBLICA : ITENS_ACAO)[fase] || { acao: [], email: 0, textos: [] }; }

/** Feriados do calendário da empresa (nacionais + UF de base.calendarioUf). */
async function feriadosDe() {
  const [uf] = await ler(`SELECT ${SQL_UF} AS UF`);
  return ler(`SELECT DATA, NOME FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL' OR (ABRANGENCIA = 'UF' AND UF = ${q(uf ? uf.UF : 'DF')})`);
}

/** O caso com cliente, card e posição da carteira; `onde` é SQL sobre CB. Sem visibilidade (quem chama confere). */
async function lerCaso(onde) {
  const [c] = await ler(`SELECT CB.*, C.CODCLI, C.NOME AS CLIENTE_NOME, C.AGENTE_ID, C.ANALISTA_ID, C.NO_JURIDICO, C.SETOR,
  AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO, AG.USER_ID AS AGENTE_USER_ID,
  K.FASE_ID, K.FASE_DESDE, K.VALORES_JSON, K.RESPONSAVEL_ID, K.PRAZO AS CARD_PRAZO, K.TITULO AS CARD_TITULO, K.CONCLUIDO_EM,
  F.CHAVE AS FASE_CHAVE, F.FINAL AS FASE_FINAL, F.BOARD_ID, KF.NOME AS FASE_NOME, KF.SLA_HORAS,
  CONCAT('cobranca-', LOWER(CB.CARTEIRA)) AS QUADRO,
  COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.A_VENCER, 0) AS A_VENCER, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO,
  P.VENC_MAIS_ANTIGO, P.PROX_VENC, COALESCE(P.PROX_VENC_VALOR, 0) AS PROX_VENC_VALOR
FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA
WHERE ${onde} ORDER BY CB.ID DESC LIMIT 1`);
  return c || null;
}

/** Cliente com os caminhos para `visivel()`. */
async function lerCliente(clienteId) {
  const [c] = await ler(`SELECT C.*, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO, AG.USER_ID AS AGENTE_USER_ID
FROM CC_CLIENTE C LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID WHERE C.ID = ${inteiro(clienteId)}`);
  return c || null;
}

/** Opera o caso (01 §6, RN-027): agente do cliente ou acima dele; o Jurídico só lê. A rotina opera tudo. */
function opera(m, c) {
  return !!c && (m.rotina || (m.membroId > 0 && m.cargo !== 'JURIDICO' && visivel(m, c)));
}

/** Usuário da rotina nos quadros (05 §1 regra 7): base.rotinaUsuarioEmail, senão o primeiro ADMIN ativo. */
async function usuarioRotina() {
  const [l] = await ler(`SELECT COALESCE((SELECT MIN(U.ID) FROM INT_USER U WHERE LOWER(U.DESCR) = LOWER(${SQL_ROTINA_EMAIL})),
  (SELECT MIN(M.USER_ID) FROM CC_MEMBRO M WHERE M.ATIVO = TRUE AND M.ADMIN = TRUE AND M.USER_ID IS NOT NULL), 0) AS ID`);
  return inteiro(l && l.ID);
}

/** USER_ID "em nome de" quem age (05 §1 regra 6): a sessão, o membro informado ou, na rotina, o responsável. */
async function usuarioDe(m, c) {
  if (m.userId) return m.userId;
  if (m.membroId) {
    const [l] = await ler(`SELECT USER_ID FROM CC_MEMBRO WHERE ID = ${inteiro(m.membroId)}`);
    if (l && inteiro(l.USER_ID)) return inteiro(l.USER_ID);
  }
  return inteiro(c && (c.RESPONSAVEL_ID || c.AGENTE_USER_ID)) || usuarioRotina();
}

async function faseIdDe(quadro, chave) {
  const [f] = await ler(`SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ${q(quadro)} AND CHAVE = ${q(chave)}`);
  return inteiro(f && f.FASE_ID);
}

/** kbCardAtualizar com responsável e prazo preservados (a lib limpa o que não vem). */
async function kbAtualizar(c, valores, usuarioId, extra = {}) {
  if (!c.CARD_ID) return null;
  return chamarKb('kbCardAtualizar', {
    cardId: inteiro(c.CARD_ID), titulo: extra.titulo || '', valoresJson: JSON.stringify(valores),
    responsavelId: extra.responsavelId !== undefined ? extra.responsavelId : inteiro(c.RESPONSAVEL_ID),
    prazo: extra.prazo !== undefined ? extra.prazo : (c.CARD_PRAZO || ''), atualizadoPor: usuarioId, origem: 'sistema',
  });
}

async function kbMover(c, chave, usuarioId) {
  const faseId = await faseIdDe(c.QUADRO, chave);
  if (!c.CARD_ID || !faseId) return { ok: false, error: 'Fase não encontrada.' };
  return chamarKb('kbCardMover', { cardId: inteiro(c.CARD_ID), faseId, ordem: 0, movidoPor: usuarioId, origem: 'sistema' });
}

async function kbNota(c, textoNota, usuarioId) {
  if (!c.CARD_ID || !textoNota) return null;
  return chamarKb('kbNotaRegistrar', { cardId: inteiro(c.CARD_ID), texto: String(textoNota).slice(0, 1000), usuarioId });
}

/** Etiquetas do card trocando só as `controladas` pelas `desejadas` (rótulos). */
function etiquetasNovas(c, controladas, desejadas) {
  const atuais = (valoresDe(c.VALORES_JSON).etiquetas || []).map(String);
  const fora = controladas.map((r) => chaveDeRotulo(r));
  return [...atuais.filter((e) => !fora.includes(e)), ...desejadas.map((r) => chaveDeRotulo(r))];
}

const FONTE_COMUM = [
  q, inteiro, texto, dinheiro, ehData, brasilia, valoresDe, brl, diasEntre, itensDe, feriadosDe, lerCaso, lerCliente, opera,
  usuarioRotina, usuarioDe, faseIdDe, kbAtualizar, kbMover, kbNota, etiquetasNovas, chaveDeRotulo,
].map(String).join('\n') + '\n' + [
  constante('ITENS_ACAO', ITENS_ACAO), constante('ITENS_PUBLICA', ITENS_PUBLICA),
  constante('ETIQUETAS_PRIVADA', ETIQUETAS_PRIVADA), constante('ETIQUETAS_PUBLICA', ETIQUETAS_PUBLICA),
  constante('SQL_UF', PARAM('base.calendarioUf')), constante('SQL_ANEXO_EM', KB_BRASILIA('CRIADO_EM')), constante('SQL_ROTINA_EMAIL', `COALESCE(${PARAM('base.rotinaUsuarioEmail')}, '')`),
  constante('ASSUNTO_DA_FASE', Object.fromEntries(Object.entries(MODELO_DA_FASE).map(([f, cod]) => [f, MODELOS.find((x) => x.codigo === cod).assunto.replace(' · [RAZAO_SOCIAL]', '')]))),
  FONTE_DIAS, FONTE_REGUA, FONTE_EMAIL,
].join('\n');

/** Corpo de SF JAVASCRIPT: preâmbulo + FONTE_COMUM + fontes + a função. */
const sf = (fn, ...fontes) => js(`${[FONTE_COMUM, ...fontes].join('\n')}\nreturn await (${fn})();`);

/* ── fragmentos SQL ── */

const REGUA_ACAO = Object.keys(ITENS_ACAO).filter((f) => ITENS_ACAO[f].acao.length);
const LISTA = (xs) => xs.map((x) => `'${x}'`).join(', ');
const CARTEIRA_OK = (col) => `('{{carteira}}' = '' OR ${col} = '{{carteira}}')`;
/** Fase com item que define ação: régua privada/Estética e o `juridico` do órgão. */
const FASE_COM_ACAO = (f) => `(${f}.CHAVE IN (${LISTA(REGUA_ACAO)}) AND (${f}.QUADRO <> 'cobranca-publica' OR ${f}.CHAVE = 'juridico'))`;
/** Fase comum da régua do órgão (acabamento pós-v3): destino e origem permitidos à pessoa. */
const FASE_REGUA_PUB = (chave) => `EXISTS (SELECT 1 FROM CC_FASE FP WHERE FP.QUADRO = 'cobranca-publica' AND FP.CHAVE = ${chave}
      AND FP.FINAL = FALSE AND FP.CHAVE <> 'juridico')`;
const CARD_NA_REGUA_PUB = (cb) => `EXISTS (SELECT 1 FROM KB_CARD KP JOIN CC_FASE FP ON FP.FASE_ID = KP.FASE_ID WHERE KP.ID = ${cb}.CARD_ID
      AND FP.QUADRO = 'cobranca-publica' AND FP.FINAL = FALSE AND FP.CHAVE <> 'juridico')`;

/** Quem opera o caso (guarda): ator ativo, não Jurídico, com o cliente `clienteExpr` visível. */
const OPERA_SQL = (clienteExpr) => ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = ${clienteExpr} AND ${clienteVisivelA('C', 'A')})`);

/** Próximo dia útil de uma data (texto AAAA-MM-DD) em SQL: semana por DATEDIFF a partir de um domingo; feriados da empresa. */
const OFFSETS = `(SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7)`;
const DIA_MAIS = (expr, n) => `SUBSTRING(DATE_ADD(${expr}, INTERVAL (${n}) DAY), 1, 10)`;
const PROX_UTIL_SQL = (expr) => `(SELECT MIN(${DIA_MAIS(expr, 'O.N')}) FROM ${OFFSETS} O
      WHERE (DATEDIFF(${DIA_MAIS(expr, 'O.N')}, '2000-01-02') % 7) NOT IN (0, 6)
        AND NOT EXISTS (SELECT 1 FROM CC_FERIADO FE WHERE FE.DATA = ${DIA_MAIS(expr, 'O.N')}
          AND (FE.ABRANGENCIA = 'NACIONAL' OR (FE.ABRANGENCIA = 'UF' AND FE.UF = ${PARAM('base.calendarioUf')}))))`;

/** Ação no prazo (02 CC_ACAO_REGUA.NO_PRAZO, RN-033) do card `K` na fase `KF`, pelo relógio do banco: hoje ≤ entrada levada ao próximo útil;
 *  fase com SLA: agora ≤ entrada + SLA. Mesma regra de `prazoDaAcao()` (regua.mjs), que a ficha mostra. */
const NO_PRAZO_SQL = `(CASE WHEN KF.SLA_HORAS > 0
    THEN ${AGORA_SQL} <= DATE_FORMAT(DATE_ADD(CONVERT_TZ(K.FASE_DESDE, '+00:00', '-03:00'), INTERVAL (KF.SLA_HORAS) HOUR), '%Y-%m-%dT%H:%i:%s')
    ELSE ${HOJE_SQL} <= ${PROX_UTIL_SQL(`SUBSTRING(${KB_BRASILIA('K.FASE_DESDE')}, 1, 10)`)} END)`;

/** Modo do e-mail da fase na carteira (`cob.emailModo.<fase>`), lido na hora. */
const MODO_EMAIL_SQL = (fase, carteira) => {
  const valor = (cart) => `(SELECT P.VALOR FROM CC_PARAMETRO P WHERE P.CHAVE = CONCAT('cob.emailModo.', ${fase}) AND P.CARTEIRA = ${cart}
      AND P.VIGENCIA_INICIO <= ${HOJE_SQL} ORDER BY P.VIGENCIA_INICIO DESC LIMIT 1)`;
  return `COALESCE(${valor(carteira)}, ${valor("''")}, 'MANUAL')`;
};
const MODELO_SQL = (fase) => `(CASE ${fase} ${Object.entries(MODELO_DA_FASE).map(([f, c]) => `WHEN '${f}' THEN '${c}'`).join(' ')} ELSE '' END)`;
/** Destinatário (RN-017): contato principal com e-mail, senão o primeiro com e-mail. */
const PARA_SQL = (cliente) => `COALESCE((SELECT K1.EMAIL FROM CC_CONTATO_CLIENTE K1 WHERE K1.CLIENTE_ID = ${cliente} AND K1.EMAIL <> '' AND K1.SITUACAO <> 'NAO_USAR'
      ORDER BY CASE WHEN K1.PRINCIPAL = TRUE THEN 0 ELSE 1 END, K1.ID LIMIT 1), '')`;
const ACAO_TEXTO = {
  prev_d5: 'Enviar lembrete de vencimento', prev_d1: 'Confirmar a programação do pagamento', venc_d0: 'Enviar aviso de vencimento do dia',
  pag_nao_ident: 'Enviar e-mail e ligar: pagamento não identificado', cob_ativa: 'Ligar para o financeiro, avisar o vendedor e bloquear novos pedidos',
  notif_formal: 'Enviar notificação formal com aviso de protesto', protesto: 'Enviar ao cartório, negativar e bloquear todo o crédito',
  neg_pos_protesto: 'Apresentar proposta de acordo', extrajudicial: 'Enviar a notificação extrajudicial e acionar a assessoria',
  juridico: 'Enviar o dossiê ao Jurídico',
};
const CASE_ACAO_TEXTO = (f) => `(CASE ${f} ${Object.entries(ACAO_TEXTO).map(([k, t]) => `WHEN '${k}' THEN '${t}'`).join(' ')} ELSE '' END)`;
const DINHEIRO_SQL = (v) => `CONCAT('R$ ', FORMAT(${v}, 2, 'pt_BR'))`;
const HOJE = `${HOJE_SQL}`;
const ATE = `(CASE WHEN '{{ate}}' = '' THEN ${HOJE_SQL} ELSE '{{ate}}' END)`;

/* ── leituras SQL ── */

const SQL_QUADRO_RESUMO = `SELECT F.CHAVE AS FASE_CHAVE, KF.NOME AS FASE_NOME, F.ORDEM, COUNT(X.ID) AS CASOS,
  COALESCE(SUM(CASE WHEN F.CHAVE = 'baixado' THEN X.VALOR_BAIXADO ELSE X.VENCIDO END), 0) AS VENCIDO,
  COALESCE(SUM(X.PROX_VENC_VALOR), 0) AS A_VENCER
FROM CC_FASE F
JOIN KB_FASE KF ON KF.ID = F.FASE_ID
LEFT JOIN (SELECT CB.ID, K.FASE_ID, CB.VALOR_BAIXADO,
    CASE WHEN {{buId}} = -1 THEN COALESCE(P.VENCIDO, 0) ELSE COALESCE(PB.VENCIDO, 0) END AS VENCIDO,
    CASE WHEN {{buId}} = -1 THEN COALESCE(P.PROX_VENC_VALOR, 0) ELSE COALESCE(PB.PROX_VENC_VALOR, 0) END AS PROX_VENC_VALOR
  FROM CC_COBRANCA CB
  JOIN KB_CARD K ON K.ID = CB.CARD_ID
  JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
  ${EU}
  LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA
  LEFT JOIN CC_POSICAO_CLIENTE_BU PB ON PB.CLIENTE_ID = CB.CLIENTE_ID AND PB.BU_ID = {{buId}}
  WHERE CB.CARTEIRA = '{{carteira}}' AND ${clienteVisivel('C')}
    AND ({{agenteId}} = 0 OR C.AGENTE_ID = {{agenteId}})
    AND ({{buId}} = -1 OR (PB.VENCIDO + PB.A_VENCER) > 0)
    AND (CB.ENCERRADO_EM IS NULL OR SUBSTRING(CB.ENCERRADO_EM, 1, 7) = SUBSTRING(${HOJE_SQL}, 1, 7))) X ON X.FASE_ID = F.FASE_ID
WHERE F.QUADRO = CONCAT('cobranca-', LOWER('{{carteira}}'))
GROUP BY F.CHAVE, KF.NOME, F.ORDEM
ORDER BY F.ORDEM`;

const FILTRO_CASO = `CB.ENCERRADO_EM IS NULL AND ${clienteVisivel('C')} AND ${CARTEIRA_OK('CB.CARTEIRA')}
  AND ({{agenteId}} = 0 OR C.AGENTE_ID = {{agenteId}})
  AND ({{buId}} = -1 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PB WHERE PB.CLIENTE_ID = CB.CLIENTE_ID AND PB.BU_ID = {{buId}} AND (PB.VENCIDO + PB.A_VENCER) > 0))
  AND ('{{filtro}}' = ''
    OR ('{{filtro}}' = 'ATRASADO' AND COALESCE(P.VENCIDO, 0) > 0)
    OR ('{{filtro}}' = 'SEM_CONTATO' AND COALESCE(P.VENCIDO, 0) > 0 AND DATEDIFF(${HOJE_SQL}, COALESCE((SELECT MAX(KC.DATA) FROM CC_CONTATO_COBRANCA KC
         WHERE KC.COBRANCA_ID = CB.ID), SUBSTRING(CB.ABERTO_EM, 1, 10))) > ${PARAM_NUM('cob.semContatoDias', 'CB.CARTEIRA')})
    OR ('{{filtro}}' = 'PROMESSA' AND EXISTS (SELECT 1 FROM CC_PROMESSA PR WHERE PR.COBRANCA_ID = CB.ID AND PR.SITUACAO = 'ABERTA'))
    OR ('{{filtro}}' = 'ACORDO' AND EXISTS (SELECT 1 FROM CC_ACORDO AC WHERE AC.COBRANCA_ID = CB.ID AND AC.SITUACAO IN ('PROPOSTO', 'ATIVO'))))`;
const FROM_CASO = `FROM CC_COBRANCA CB
JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
${EU}
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA`;

const SQL_CASO_LISTAR = `SELECT CB.ID AS COBRANCA_ID, CB.CARD_ID, CB.CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, CB.CARTEIRA,
  COALESCE(F.CHAVE, '') AS FASE_CHAVE, COALESCE(KF.NOME, '') AS FASE_NOME, COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO,
  (SELECT MAX(KC.DATA) FROM CC_CONTATO_COBRANCA KC WHERE KC.COBRANCA_ID = CB.ID) AS ULT_CONTATO,
  (SELECT PR.DATA_PROMETIDA FROM CC_PROMESSA PR WHERE PR.COBRANCA_ID = CB.ID ORDER BY PR.ID DESC LIMIT 1) AS PROMESSA_DATA,
  (SELECT PR.VALOR FROM CC_PROMESSA PR WHERE PR.COBRANCA_ID = CB.ID ORDER BY PR.ID DESC LIMIT 1) AS PROMESSA_VALOR,
  (SELECT PR.SITUACAO FROM CC_PROMESSA PR WHERE PR.COBRANCA_ID = CB.ID ORDER BY PR.ID DESC LIMIT 1) AS PROMESSA_SITUACAO,
  (SELECT AC.SITUACAO FROM CC_ACORDO AC WHERE AC.COBRANCA_ID = CB.ID ORDER BY AC.ID DESC LIMIT 1) AS ACORDO_SITUACAO,
  (SELECT COUNT(*) FROM CC_ACORDO_PARCELA PA WHERE PA.N > 0 AND PA.PAGO_EM IS NOT NULL
     AND PA.ACORDO_ID = (SELECT MAX(AC.ID) FROM CC_ACORDO AC WHERE AC.COBRANCA_ID = CB.ID)) AS PARCELAS_PAGAS,
  COALESCE((SELECT AC.N_PARCELAS FROM CC_ACORDO AC WHERE AC.COBRANCA_ID = CB.ID ORDER BY AC.ID DESC LIMIT 1), 0) AS N_PARCELAS,
  CB.PROX_ACAO, CB.PROX_ACAO_DATA
${FROM_CASO}
WHERE ${FILTRO_CASO}
ORDER BY COALESCE(P.VENCIDO, 0) DESC, CB.ID
LIMIT {{limite}} OFFSET {{offset}}`;

const SQL_CASO_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(P.VENCIDO), 0) AS VENCIDO
${FROM_CASO}
WHERE ${FILTRO_CASO}`;

const SQL_SITUACAO = `SELECT CB.ID AS COBRANCA_ID, CB.CARTEIRA, CB.CARD_ID, COALESCE(F.CHAVE, '') AS FASE_CHAVE, COALESCE(KF.NOME, '') AS FASE_NOME,
  COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO, CB.PROTESTADO, CB.JURIDICO_EM, CB.PROCESSO_ID,
  CB.BLOQUEIO_DEVIDO, CB.BLOQUEIO_APLICADO
${FROM_CASO}
WHERE CB.ENCERRADO_EM IS NULL AND CB.CLIENTE_ID = {{clienteId}} AND ${CARTEIRA_OK('CB.CARTEIRA')} AND ${clienteVisivel('C')}
ORDER BY CB.CARTEIRA`;

const FILTRO_CONTATO = `${clienteVisivel('C')}
  AND ({{clienteId}} = 0 OR X.CLIENTE_ID = {{clienteId}})
  AND ({{cobrancaId}} = 0 OR X.COBRANCA_ID = {{cobrancaId}})
  AND ({{nfId}} = 0 OR X.NF_ID = {{nfId}})
  AND ({{agenteId}} = 0 OR X.AGENTE_ID = {{agenteId}})
  AND ('{{carteira}}' = '' OR CB.CARTEIRA = '{{carteira}}')
  AND ('{{retorno}}' = '' OR X.RETORNO = '{{retorno}}')
  AND ('{{promessa}}' = '' OR PR.SITUACAO = '{{promessa}}')
  AND ('{{de}}' = '' OR X.DATA >= '{{de}}')
  AND ('{{ate}}' = '' OR X.DATA <= '{{ate}}')
  AND ('{{busca}}' = '' OR CAST(C.CODCLI AS CHAR) = '{{busca}}' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%'))`;
const FROM_CONTATO = `FROM CC_CONTATO_COBRANCA X
JOIN CC_CLIENTE C ON C.ID = X.CLIENTE_ID
${EU}
LEFT JOIN CC_COBRANCA CB ON CB.ID = X.COBRANCA_ID
LEFT JOIN CC_PROMESSA PR ON PR.CONTATO_ID = X.ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = X.AGENTE_ID`;

/* Agenda (RN-025): um SELECT por tipo; QUEM diz a quem o evento pertence (AGENTE, DECISOR, JURIDICO). */
const EV = (tipo, quem, { data, textoSql, valor = '0', nivel = '0', propostoPor = '0', de, onde, enxerga = 0 }) => `SELECT '${tipo}' AS TIPO, '${quem}' AS QUEM,
    CB.CLIENTE_ID, CB.CARTEIRA, CB.ID AS COBRANCA_ID, CB.CARD_ID, ${data} AS DATA, ${textoSql} AS TEXTO, ${valor} AS VALOR,
    ${nivel} AS NIVEL, ${propostoPor} AS PROPOSTO_POR, ${enxerga} AS ENXERGA
  FROM ${de} WHERE ${onde}`;
const ABERTO = 'CB.ENCERRADO_EM IS NULL';
const EVENTOS = [
  EV('ACAO_REGUA', 'AGENTE', {
    data: PROX_UTIL_SQL(`SUBSTRING(${KB_BRASILIA('K.FASE_DESDE')}, 1, 10)`), textoSql: CASE_ACAO_TEXTO('F.CHAVE'),
    de: 'CC_COBRANCA CB JOIN KB_CARD K ON K.ID = CB.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID',
    onde: `${ABERTO} AND ${FASE_COM_ACAO('F')} AND NOT EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = CB.ID AND AR.FASE_CHAVE = F.CHAVE)`,
  }),
  EV('PROX_ACAO', 'AGENTE', { data: 'CB.PROX_ACAO_DATA', textoSql: 'CB.PROX_ACAO', de: 'CC_COBRANCA CB',
    onde: `${ABERTO} AND CB.PROX_ACAO <> '' AND CB.PROX_ACAO_DATA IS NOT NULL` }),
  EV('PROMESSA', 'AGENTE', { data: 'PR.DATA_PROMETIDA', textoSql: `CONCAT('Retorno: pagamento prometido de ', ${DINHEIRO_SQL('PR.VALOR')})`, valor: 'PR.VALOR',
    de: 'CC_PROMESSA PR JOIN CC_COBRANCA CB ON CB.ID = PR.COBRANCA_ID', onde: `${ABERTO} AND PR.SITUACAO = 'ABERTA'` }),
  EV('PROMESSA', 'AGENTE', {
    data: `SUBSTRING(DATE_ADD(PR.DATA_PROMETIDA, INTERVAL (CAST(${PARAM('cob.promessaToleranciaDias', 'CB.CARTEIRA')} AS SIGNED)) DAY), 1, 10)`,
    textoSql: `(CASE WHEN (SELECT COUNT(*) FROM CC_PROMESSA PQ WHERE PQ.COBRANCA_ID = CB.ID AND PQ.SITUACAO = 'QUEBRADA') >= ${PARAM_NUM('cob.promessasQuebradas', 'CB.CARTEIRA')}
        AND NOT EXISTS (SELECT 1 FROM CC_ACORDO AC WHERE AC.COBRANCA_ID = CB.ID AND AC.SITUACAO = 'ATIVO')
      THEN CONCAT((SELECT COUNT(*) FROM CC_PROMESSA PQ WHERE PQ.COBRANCA_ID = CB.ID AND PQ.SITUACAO = 'QUEBRADA'), ' promessas quebradas: exigir acordo formal com entrada ou avançar a régua')
      ELSE 'Promessa não cumprida: cobrar de novo' END)`,
    valor: 'PR.VALOR', de: 'CC_PROMESSA PR JOIN CC_COBRANCA CB ON CB.ID = PR.COBRANCA_ID',
    onde: `${ABERTO} AND PR.SITUACAO = 'QUEBRADA' AND PR.ID = (SELECT MAX(PX.ID) FROM CC_PROMESSA PX WHERE PX.COBRANCA_ID = CB.ID AND PX.SITUACAO = 'QUEBRADA')
      AND NOT EXISTS (SELECT 1 FROM CC_CONTATO_COBRANCA KC WHERE KC.COBRANCA_ID = CB.ID AND KC.CRIADO_EM > PR.AVALIADA_EM)`,
  }),
  EV('PARCELA_ACORDO', 'AGENTE', { data: 'PA.VENC', textoSql: "CONCAT('Parcela ', PA.N, ' do acordo')", valor: 'PA.VALOR',
    de: 'CC_ACORDO_PARCELA PA JOIN CC_ACORDO AC ON AC.ID = PA.ACORDO_ID JOIN CC_COBRANCA CB ON CB.ID = AC.COBRANCA_ID',
    onde: `${ABERTO} AND AC.SITUACAO = 'ATIVO' AND PA.PAGO_EM IS NULL AND PA.N = (SELECT MIN(PB.N) FROM CC_ACORDO_PARCELA PB WHERE PB.ACORDO_ID = AC.ID AND PB.PAGO_EM IS NULL)` }),
  EV('ANUENCIA', 'AGENTE', { data: 'CB.ANUENCIA_ATE', textoSql: "'Enviar carta de anuência'", de: 'CC_COBRANCA CB',
    onde: "CB.DESFECHO = 'REGULARIZADO' AND CB.PROTESTADO = TRUE AND CB.ANUENCIA_EM IS NULL AND CB.ANUENCIA_ATE IS NOT NULL" }),
  EV('BLOQUEIO_APLICAR', 'AGENTE', { data: HOJE_SQL,
    textoSql: "(CASE CB.BLOQUEIO_DEVIDO WHEN 'PEDIDOS' THEN 'Bloquear novos pedidos' WHEN 'TOTAL' THEN 'Bloqueio total' ELSE 'Liberar no ERP' END)",
    de: 'CC_COBRANCA CB', onde: "CB.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND CB.BLOQUEIO_DEVIDO <> CB.BLOQUEIO_APLICADO" }),
  EV('EMAIL_APROVAR', 'DECISOR', { data: HOJE_SQL, textoSql: `COALESCE((SELECT REPLACE(MM.ASSUNTO, ' · [RAZAO_SOCIAL]', '') FROM CC_MODELO_MENSAGEM MM WHERE MM.CODIGO = ${MODELO_SQL('EF.FASE_CHAVE')}), '')`,
    valor: 'EF.VALOR', nivel: PARAM_NUM('alcada.emailAprovaNivel'), enxerga: 1,
    de: 'CC_EMAIL_FILA EF JOIN CC_COBRANCA CB ON CB.ID = EF.COBRANCA_ID JOIN KB_CARD K ON K.ID = CB.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID',
    onde: `${ABERTO} AND EF.SITUACAO = 'PENDENTE' AND F.CHAVE = EF.FASE_CHAVE AND ${MODO_EMAIL_SQL('EF.FASE_CHAVE', 'CB.CARTEIRA')} = 'APROVAR'
      AND NOT EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = CB.ID AND AR.FASE_CHAVE = EF.FASE_CHAVE)` }),
  EV('ACORDO_DECIDIR', 'DECISOR', { data: HOJE_SQL, textoSql: "'Acordo aguardando decisão'", valor: 'AC.VALOR', nivel: 'AC.NIVEL_EXIGIDO',
    propostoPor: 'AC.PROPOSTO_POR', de: 'CC_ACORDO AC JOIN CC_COBRANCA CB ON CB.ID = AC.COBRANCA_ID', onde: "AC.SITUACAO = 'PROPOSTO'" }),
  EV('BAIXA_PARECER', 'JURIDICO', { data: HOJE_SQL, textoSql: "'Baixa aguardando parecer'", valor: 'BX.VALOR',
    de: 'CC_BAIXA BX JOIN CC_COBRANCA CB ON CB.ID = BX.COBRANCA_ID', onde: "BX.SITUACAO = 'PENDENTE' AND BX.PARECER_EM IS NULL" }),
  EV('BAIXA_DECIDIR', 'DECISOR', { data: HOJE_SQL, textoSql: "'Baixa aguardando decisão'", valor: 'BX.VALOR', nivel: 'BX.NIVEL_EXIGIDO',
    propostoPor: 'BX.PROPOSTO_POR', de: 'CC_BAIXA BX JOIN CC_COBRANCA CB ON CB.ID = BX.COBRANCA_ID', onde: "BX.SITUACAO = 'PENDENTE' AND BX.PARECER_EM IS NOT NULL" }),
  EV('FICHA_REVISAR', 'AGENTE', { data: HOJE_SQL, textoSql: "'Revisar ficha de contatos'", de: 'CC_COBRANCA CB JOIN CC_CLIENTE CF ON CF.ID = CB.CLIENTE_ID',
    onde: `${ABERTO} AND (CF.CONTATOS_REVISADO_EM IS NULL OR DATEDIFF(${HOJE_SQL}, SUBSTRING(CF.CONTATOS_REVISADO_EM, 1, 10)) > ${PARAM_NUM('base.fichaValidadeDias')})` }),
].join('\nUNION ALL\n');

/** Eventos de quem (`T`, alvo) visto por `EU`; T = eu ({{membroId}} = 0) ou alguém abaixo. */
const FROM_AGENDA = `FROM (${EVENTOS}) E
JOIN CC_CLIENTE C ON C.ID = E.CLIENTE_ID
${EU}
JOIN CC_MEMBRO T ON T.ID = (CASE WHEN {{membroId}} = 0 THEN EU.ID ELSE {{membroId}} END) AND T.ATIVO = TRUE`;
const FILTRO_AGENDA = `${membroVisivel('T.ID', 'EU')} AND ${CARTEIRA_OK('E.CARTEIRA')} AND E.DATA <= ${ATE}
  AND ((E.QUEM = 'AGENTE' AND C.AGENTE_ID = T.ID AND T.CARGO <> 'JURIDICO')
    OR (E.QUEM = 'DECISOR' AND T.CARGO <> 'JURIDICO' AND T.NIVEL >= E.NIVEL AND T.ID <> E.PROPOSTO_POR
        AND (E.ENXERGA = 0 OR ${visibilidadeDeCliente('C', 'T', veTudo('T'))}))
    OR (E.QUEM = 'JURIDICO' AND T.CARGO = 'JURIDICO'))`;
const SQL_AGENDA_LISTAR = `SELECT E.TIPO, E.CLIENTE_ID, C.NOME AS CLIENTE_NOME, C.CODCLI, E.CARTEIRA, E.COBRANCA_ID, E.CARD_ID, E.DATA,
  CASE WHEN E.DATA < ${HOJE_SQL} THEN 1 ELSE 0 END AS ATRASADO, E.TEXTO, E.VALOR
${FROM_AGENDA}
WHERE ${FILTRO_AGENDA}
ORDER BY E.DATA, E.VALOR DESC, E.COBRANCA_ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_AGENDA_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN E.DATA < ${HOJE_SQL} THEN 1 ELSE 0 END), 0) AS ATRASADOS
${FROM_AGENDA}
WHERE ${FILTRO_AGENDA}`;

const SQL_AGENDA_RESUMO = `SELECT AG.ID AS AGENTE_ID, AG.NOME AS AGENTE_NOME,
  COALESCE(SUM(CASE WHEN E.DATA = ${HOJE_SQL} THEN 1 ELSE 0 END), 0) AS PARA_HOJE,
  COALESCE(SUM(CASE WHEN E.DATA < ${HOJE_SQL} THEN 1 ELSE 0 END), 0) AS ATRASADAS,
  COALESCE(SUM(CASE WHEN E.TIPO = 'PROMESSA' AND E.DATA < ${HOJE_SQL} THEN 1 ELSE 0 END), 0) AS PROMESSAS_VENCIDAS,
  COALESCE(SUM(CASE WHEN E.DATA > ${HOJE_SQL} AND E.DATA <= ${ATE} THEN 1 ELSE 0 END), 0) AS PROXIMOS,
  (SELECT COUNT(*) FROM CC_COBRANCA CB2 JOIN CC_CLIENTE C2 ON C2.ID = CB2.CLIENTE_ID
     JOIN CC_POSICAO_CLIENTE_CARTEIRA P2 ON P2.CLIENTE_ID = CB2.CLIENTE_ID AND P2.CARTEIRA = CB2.CARTEIRA
     WHERE CB2.ENCERRADO_EM IS NULL AND C2.AGENTE_ID = AG.ID AND P2.VENCIDO > 0 AND ${CARTEIRA_OK('CB2.CARTEIRA')}
       AND DATEDIFF(${HOJE_SQL}, COALESCE((SELECT MAX(KC.DATA) FROM CC_CONTATO_COBRANCA KC WHERE KC.COBRANCA_ID = CB2.ID), SUBSTRING(CB2.ABERTO_EM, 1, 10)))
           > ${PARAM_NUM('cob.semContatoDias', 'CB2.CARTEIRA')}) AS SEM_CONTATO,
  COALESCE((SELECT SUM(CASE WHEN {{buId}} = -1 THEN P3.A_VENCER_7DU ELSE 0 END) FROM CC_POSICAO_CLIENTE_CARTEIRA P3 JOIN CC_CLIENTE C3 ON C3.ID = P3.CLIENTE_ID
     WHERE C3.AGENTE_ID = AG.ID AND ${CARTEIRA_OK('P3.CARTEIRA')}), 0)
   + COALESCE((SELECT SUM(P4.A_VENCER_7DU) FROM CC_POSICAO_CLIENTE_BU P4 JOIN CC_CLIENTE C4 ON C4.ID = P4.CLIENTE_ID
     WHERE {{buId}} >= 0 AND P4.BU_ID = {{buId}} AND C4.AGENTE_ID = AG.ID AND ${CARTEIRA_OK('P4.CARTEIRA')}), 0) AS A_VENCER_7DU
FROM CC_MEMBRO AG
${EU}
LEFT JOIN (SELECT E.*, C.AGENTE_ID FROM (${EVENTOS}) E JOIN CC_CLIENTE C ON C.ID = E.CLIENTE_ID
  WHERE E.QUEM = 'AGENTE' AND ${CARTEIRA_OK('E.CARTEIRA')} AND E.DATA <= ${ATE}) E ON E.AGENTE_ID = AG.ID
WHERE AG.ATIVO = TRUE AND AG.CARGO <> 'JURIDICO' AND ${membroVisivel('AG.ID', 'EU')}
  AND EXISTS (SELECT 1 FROM CC_CLIENTE CX WHERE CX.AGENTE_ID = AG.ID)
GROUP BY AG.ID, AG.NOME
ORDER BY AG.NOME`;

const SITUACAO_BLOQUEIO = `(CASE WHEN '{{situacao}}' IN ('', 'PENDENTE') THEN CB.BLOQUEIO_DEVIDO <> CB.BLOQUEIO_APLICADO
    WHEN '{{situacao}}' = 'BLOQUEAR_PEDIDOS' THEN CB.BLOQUEIO_DEVIDO = 'PEDIDOS' AND CB.BLOQUEIO_APLICADO <> 'PEDIDOS'
    WHEN '{{situacao}}' = 'BLOQUEAR_TOTAL' THEN CB.BLOQUEIO_DEVIDO = 'TOTAL' AND CB.BLOQUEIO_APLICADO <> 'TOTAL'
    WHEN '{{situacao}}' = 'LIBERAR' THEN CB.BLOQUEIO_DEVIDO = '' AND CB.BLOQUEIO_APLICADO <> ''
    WHEN '{{situacao}}' = 'BLOQUEADOS' THEN CB.BLOQUEIO_APLICADO <> '' AND CB.BLOQUEIO_APLICADO = CB.BLOQUEIO_DEVIDO
    ELSE 1 = 0 END)`;
const FILTRO_BLOQUEIO = `CB.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND ${CARTEIRA_OK('CB.CARTEIRA')} AND ${clienteVisivel('C')} AND ${SITUACAO_BLOQUEIO}
  AND ('{{busca}}' = '' OR CAST(C.CODCLI AS CHAR) = '{{busca}}' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%'))
  AND (CB.ENCERRADO_EM IS NULL OR CB.ID = (SELECT MAX(X.ID) FROM CC_COBRANCA X WHERE X.CLIENTE_ID = CB.CLIENTE_ID AND X.CARTEIRA = CB.CARTEIRA))`;
const FROM_BLOQUEIO = `FROM CC_COBRANCA CB
JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
${EU}
LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID`;

/** Chance de atraso (RN-016) sobre a posição `X` (carteira) e a pontualidade total `PT`. */
const PROB_ATRASO_SQL = (x) => `LEAST(${PARAM_NUM('cob.probTeto', `${x}.CARTEIRA`)},
    GREATEST(CASE WHEN ${x}.VENCIDO > 0 THEN ${PARAM_NUM('cob.probPisoAtraso', `${x}.CARTEIRA`)} ELSE 0 END,
      CASE WHEN PT.PONTUALIDADE_PCT IS NULL THEN ${PARAM_NUM('cob.probSemHistorico', `${x}.CARTEIRA`)} ELSE 100 - PT.PONTUALIDADE_PCT END))`;
const FROM_PROJECAO = `FROM (SELECT X.CLIENTE_ID, X.CARTEIRA, X.VENCIDO, X.A_VENCER, X.PROX_VENC, X.PROX_VENC_VALOR FROM CC_POSICAO_CLIENTE_CARTEIRA X
    WHERE {{buId}} = -1
  UNION ALL SELECT X.CLIENTE_ID, X.CARTEIRA, X.VENCIDO, X.A_VENCER, X.PROX_VENC, X.PROX_VENC_VALOR FROM CC_POSICAO_CLIENTE_BU X
    WHERE {{buId}} >= 0 AND X.BU_ID = {{buId}}) S
JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
${EU}
LEFT JOIN CC_POSICAO_CLIENTE PT ON PT.CLIENTE_ID = S.CLIENTE_ID
JOIN (SELECT ${HOJE_SQL} AS HOJE) PRM ON 1 = 1`;
const FILTRO_PROJECAO = `S.A_VENCER > 0 AND S.PROX_VENC IS NOT NULL AND DATEDIFF(S.PROX_VENC, PRM.HOJE) <= {{dias}} AND ${CARTEIRA_OK('S.CARTEIRA')}
  AND ${clienteVisivel('C')} AND ({{agenteId}} = 0 OR C.AGENTE_ID = {{agenteId}})`;
const COLUNAS_PROJECAO = `S.CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, S.CARTEIRA, S.A_VENCER, S.PROX_VENC, S.PROX_VENC_VALOR,
  ROUND(${PROB_ATRASO_SQL('S')}, 1) AS PROB_ATRASO,
  ROUND(S.A_VENCER * ${PROB_ATRASO_SQL('S')} / 100, 2) AS VALOR_ESPERADO,
  CASE WHEN ${PROB_ATRASO_SQL('S')} >= ${PARAM_NUM('cob.probForte', 'S.CARTEIRA')} THEN 'FORTE'
       WHEN ${PROB_ATRASO_SQL('S')} >= ${PARAM_NUM('cob.probMedio', 'S.CARTEIRA')} THEN 'MEDIA' ELSE 'BAIXA' END AS FAIXA`;

const FILA_VISIVEL = `CB.ENCERRADO_EM IS NULL OR EF.SITUACAO = 'ENVIADO'`;
const FROM_FILA = `FROM (SELECT EF.*, CB.CARTEIRA, CB.CARD_ID, CB.ENCERRADO_EM, F.CHAVE AS FASE_ATUAL,
    ${MODO_EMAIL_SQL('EF.FASE_CHAVE', 'CB.CARTEIRA')} AS MODO, ${PARA_SQL('EF.CLIENTE_ID')} AS PARA, ${MODELO_SQL('EF.FASE_CHAVE')} AS MODELO,
    (SELECT CASE WHEN MM.EFEITO_LEGAL = FALSE OR (MM.VALIDADO_VERSAO = MM.VERSAO AND MM.VALIDADO_EM IS NOT NULL) THEN 1 ELSE 0 END
       FROM CC_MODELO_MENSAGEM MM WHERE MM.CODIGO = ${MODELO_SQL('EF.FASE_CHAVE')}) AS VALIDADO,
    EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = EF.COBRANCA_ID AND AR.FASE_CHAVE = EF.FASE_CHAVE) AS ACAO_FEITA
  FROM CC_EMAIL_FILA EF JOIN CC_COBRANCA CB ON CB.ID = EF.COBRANCA_ID
  LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
  WHERE (EF.SITUACAO = 'PENDENTE' AND (${FILA_VISIVEL})) OR (EF.SITUACAO = 'ENVIADO' AND SUBSTRING(EF.ENVIADO_EM, 1, 10) = ${HOJE_SQL})) Q
JOIN CC_CLIENTE C ON C.ID = Q.CLIENTE_ID
${EU}`;
const SITUACAO_TELA = `(CASE WHEN Q.SITUACAO = 'ENVIADO' THEN 'ENVIADO' WHEN Q.PARA = '' THEN 'SEM_EMAIL' WHEN Q.MODO = 'APROVAR' THEN 'APROVAR' ELSE 'ENVIAR' END)`;
const FILTRO_FILA = `Q.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND ${CARTEIRA_OK('Q.CARTEIRA')} AND ${clienteVisivel('C')}
  AND (Q.SITUACAO = 'ENVIADO' OR (Q.ENCERRADO_EM IS NULL AND Q.FASE_ATUAL = Q.FASE_CHAVE AND Q.ACAO_FEITA = 0 AND Q.MODO <> 'AUTOMATICO'))
  AND ('{{situacao}}' IN ('', 'PENDENTE') AND Q.SITUACAO = 'PENDENTE' OR '{{situacao}}' NOT IN ('', 'PENDENTE') AND ${SITUACAO_TELA} = '{{situacao}}')`;
const SQL_FILA_LISTAR = `SELECT Q.ID, Q.COBRANCA_ID, Q.CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, Q.CARTEIRA, Q.CARD_ID, Q.FASE_CHAVE, Q.DATA_REF, Q.CHAVE,
  Q.VALOR, Q.SITUACAO, Q.CRIADO_EM, Q.ENVIADO_EM, Q.ENVIADO_POR, Q.EMAIL_ENVIADO_ID, Q.OBS, Q.MODO, Q.MODELO, Q.VALIDADO, Q.PARA, ${SITUACAO_TELA} AS SITUACAO_TELA
${FROM_FILA}
WHERE ${FILTRO_FILA}
ORDER BY CASE WHEN Q.SITUACAO = 'PENDENTE' THEN 0 ELSE 1 END, Q.VALOR DESC, Q.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_FILA_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(Q.VALOR), 0) AS VALOR
${FROM_FILA}
WHERE ${FILTRO_FILA}`;

/* Painéis (RN-026): saldos do recorte por carteira ou, com buId ≥ 0, por BU. */
const SALDOS = (cols) => `(SELECT ${cols} FROM CC_POSICAO_CLIENTE_CARTEIRA X WHERE {{buId}} = -1 AND ${CARTEIRA_OK('X.CARTEIRA')}
  UNION ALL SELECT ${cols} FROM CC_POSICAO_CLIENTE_BU X WHERE {{buId}} >= 0 AND X.BU_ID = {{buId}} AND ${CARTEIRA_OK('X.CARTEIRA')})`;
const COLS_SALDO = 'X.CLIENTE_ID, X.CARTEIRA, X.VENCIDO, X.A_VENCER, X.DIAS_ATRASO, X.V_1_30, X.V_31_60, X.V_61_90, X.V_91_180, X.V_180, X.PROX_VENC, X.PROX_VENC_VALOR';
const NO_RECORTE = (c) => `${clienteVisivel(c)} AND ({{agenteId}} = 0 OR ${c}.AGENTE_ID = {{agenteId}})`;
/** Caso `CB` (cliente `CX`) no recorte de carteira e BU. */
const CASO_NO_RECORTE = (cb, cx) => `${CARTEIRA_OK(`${cb}.CARTEIRA`)} AND ${NO_RECORTE(cx)}
    AND ({{buId}} = -1 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PBX WHERE PBX.CLIENTE_ID = ${cb}.CLIENTE_ID AND PBX.BU_ID = {{buId}} AND (PBX.VENCIDO + PBX.A_VENCER) > 0))`;
const PERIODO = `JOIN (SELECT ${HOJE_SQL} AS HOJE,
    CASE WHEN '{{de}}' = '' THEN CONCAT(SUBSTRING(${HOJE_SQL}, 1, 7), '-01') ELSE '{{de}}' END AS DE,
    CASE WHEN '{{ate}}' = '' THEN ${HOJE_SQL} ELSE '{{ate}}' END AS ATE) PRM ON 1 = 1`;
const PCT = (num, den) => `CASE WHEN (${den}) > 0 THEN ROUND(100.0 * (${num}) / (${den}), 1) ELSE 0 END`;
const RECEBIDO = (extra = '') => `COALESCE((SELECT SUM(R.VALOR_PAGO) FROM CC_RECEBIMENTO R JOIN CC_CLIENTE CR ON CR.ID = R.CLIENTE_ID
    WHERE R.ESTORNADO = FALSE AND R.DATA_PAGAMENTO >= PRM.DE AND R.DATA_PAGAMENTO <= PRM.ATE AND ${CARTEIRA_OK('R.CARTEIRA')}
      AND ({{buId}} = -1 OR R.BU_ID = {{buId}}) AND ${NO_RECORTE('CR')} ${extra}), 0)`;
const CASOS_ACAO = (extra) => `(SELECT COUNT(*) FROM CC_COBRANCA CB JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID JOIN KB_CARD K ON K.ID = CB.CARD_ID
    JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
    WHERE CB.ENCERRADO_EM IS NULL AND ${CASO_NO_RECORTE('CB', 'CX')} AND ${FASE_COM_ACAO('F')}
      AND NOT EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = CB.ID AND AR.FASE_CHAVE = F.CHAVE) ${extra})`;
const ACOES_PERIODO = (extra) => `(SELECT COUNT(*) FROM CC_ACAO_REGUA AR JOIN CC_COBRANCA CB ON CB.ID = AR.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
    WHERE SUBSTRING(AR.FEITA_EM, 1, 10) >= PRM.DE AND SUBSTRING(AR.FEITA_EM, 1, 10) <= PRM.ATE AND ${CASO_NO_RECORTE('CB', 'CX')} ${extra})`;
const CONTATOS = (extra) => `(SELECT COUNT(*) FROM CC_CONTATO_COBRANCA KC JOIN CC_CLIENTE CX ON CX.ID = KC.CLIENTE_ID LEFT JOIN CC_COBRANCA CB ON CB.ID = KC.COBRANCA_ID
    WHERE KC.DATA >= PRM.DE AND KC.DATA <= PRM.ATE AND ${NO_RECORTE('CX')} AND ('{{carteira}}' = '' OR CB.CARTEIRA = '{{carteira}}')
      AND ({{buId}} = -1 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PBX WHERE PBX.CLIENTE_ID = KC.CLIENTE_ID AND PBX.BU_ID = {{buId}} AND (PBX.VENCIDO + PBX.A_VENCER) > 0)) ${extra})`;
const PROMESSAS = (extra) => `(SELECT COUNT(*) FROM CC_PROMESSA PR JOIN CC_CLIENTE CX ON CX.ID = PR.CLIENTE_ID LEFT JOIN CC_COBRANCA CB ON CB.ID = PR.COBRANCA_ID
    WHERE ${NO_RECORTE('CX')} AND ('{{carteira}}' = '' OR CB.CARTEIRA = '{{carteira}}') ${extra})`;
const ACORDOS = (sel, extra) => `(SELECT ${sel} FROM CC_ACORDO AC JOIN CC_COBRANCA CB ON CB.ID = AC.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
    WHERE ${CASO_NO_RECORTE('CB', 'CX')} ${extra})`;
const BAIXAS = (sel, extra) => `(SELECT ${sel} FROM CC_BAIXA BX JOIN CC_COBRANCA CB ON CB.ID = BX.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
    WHERE ${CASO_NO_RECORTE('CB', 'CX')} ${extra})`;
const TRABALHADOS_ABERTO = `COALESCE((SELECT SUM(S2.VENCIDO) FROM ${SALDOS(COLS_SALDO)} S2 JOIN CC_CLIENTE CX ON CX.ID = S2.CLIENTE_ID
    WHERE ${NO_RECORTE('CX')} AND (
      EXISTS (SELECT 1 FROM CC_CONTATO_COBRANCA KC WHERE KC.CLIENTE_ID = S2.CLIENTE_ID AND KC.DATA >= PRM.DE AND KC.DATA <= PRM.ATE)
      OR EXISTS (SELECT 1 FROM CC_RECEBIMENTO R WHERE R.CLIENTE_ID = S2.CLIENTE_ID AND R.ESTORNADO = FALSE AND R.DATA_PAGAMENTO >= PRM.DE AND R.DATA_PAGAMENTO <= PRM.ATE)
      OR EXISTS (SELECT 1 FROM CC_COBRANCA CB WHERE CB.CLIENTE_ID = S2.CLIENTE_ID AND CB.CARTEIRA = S2.CARTEIRA
         AND SUBSTRING(CB.ABERTO_EM, 1, 10) <= PRM.ATE AND (CB.ENCERRADO_EM IS NULL OR SUBSTRING(CB.ENCERRADO_EM, 1, 10) >= PRM.DE)))), 0)`;
const RETORNOS = [['PROMESSA', 'Promessa de pagamento'], ['PAGOU', 'Pagou'], ['NEGOCIACAO', 'Pediu negociação / parcelamento'],
  ['CONTESTOU', 'Contestou o débito'], ['SEM_RETORNO', 'Sem retorno / não atendeu'], ['RECUSOU', 'Recusou pagar'], ['AGUARDANDO', 'Aguardando liquidação (órgão)']];
const CANAIS = ['Telefone', 'WhatsApp', 'E-mail', 'Visita', 'Carta', 'Ofício', 'Portal do órgão'];
const PROMESSA_AVALIADA = `AND PR.DATA_PROMETIDA >= PRM.DE AND PR.DATA_PROMETIDA <= PRM.ATE AND PR.SITUACAO IN ('CUMPRIDA', 'QUEBRADA')`;

const SQL_PAINEL_KPIS = `SELECT S.VENCIDO, S.A_VENCER, ${PCT('S.VENCIDO', 'S.VENCIDO + S.A_VENCER')} AS INAD_PCT, S.CLIENTES_VENCIDOS, S.DIAS_MEDIO,
  S.ACIMA_90, S.ACIMA_90_CLIENTES, S.VENCE_5D, S.VENCE_5D_CLIENTES,
  (SELECT COUNT(*) FROM CC_COBRANCA CB JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
     JOIN CC_POSICAO_CLIENTE_CARTEIRA PX ON PX.CLIENTE_ID = CB.CLIENTE_ID AND PX.CARTEIRA = CB.CARTEIRA
     WHERE CB.ENCERRADO_EM IS NULL AND PX.VENCIDO > 0 AND CB.PROX_ACAO = '' AND ${CASO_NO_RECORTE('CB', 'CX')}) AS SEM_PROX_ACAO,
  ${CASOS_ACAO('')} AS ACOES_PENDENTES,
  ${CASOS_ACAO(`AND ${PROX_UTIL_SQL(`SUBSTRING(${KB_BRASILIA('K.FASE_DESDE')}, 1, 10)`)} < PRM.HOJE`)} AS ACOES_ATRASADAS,
  ${PCT(ACOES_PERIODO('AND AR.NO_PRAZO = TRUE'), ACOES_PERIODO(''))} AS ACOES_NO_PRAZO_PCT,
  (SELECT COUNT(*) FROM CC_COBRANCA CB JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID WHERE CB.BLOQUEIO_APLICADO <> '' AND ${CASO_NO_RECORTE('CB', 'CX')}
     AND (CB.ENCERRADO_EM IS NULL OR CB.DESFECHO = 'BAIXADO')) AS BLOQUEADOS,
  COALESCE((SELECT SUM(PX.VENCIDO) FROM CC_COBRANCA CB JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
     JOIN CC_POSICAO_CLIENTE_CARTEIRA PX ON PX.CLIENTE_ID = CB.CLIENTE_ID AND PX.CARTEIRA = CB.CARTEIRA
     WHERE CB.BLOQUEIO_APLICADO <> '' AND ${CASO_NO_RECORTE('CB', 'CX')} AND (CB.ENCERRADO_EM IS NULL OR CB.DESFECHO = 'BAIXADO')), 0) AS BLOQUEADOS_VALOR,
  (SELECT COUNT(*) FROM CC_COBRANCA CB JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID WHERE CB.BLOQUEIO_APLICADO = 'TOTAL' AND ${CASO_NO_RECORTE('CB', 'CX')}
     AND (CB.ENCERRADO_EM IS NULL OR CB.DESFECHO = 'BAIXADO')) AS BLOQUEIO_TOTAL,
  ${RECEBIDO('AND R.DIAS_ATRASO_PAGAMENTO > 0')} AS RECUPERADO,
  ${PCT(RECEBIDO(), `${RECEBIDO()} + ${TRABALHADOS_ABERTO}`)} AS CONVERSAO_PCT,
  ${PROMESSAS('AND PR.DATA_CONTATO >= PRM.DE AND PR.DATA_CONTATO <= PRM.ATE')} AS PROMESSAS,
  ${PCT(PROMESSAS(`${PROMESSA_AVALIADA} AND PR.SITUACAO = 'CUMPRIDA'`), PROMESSAS(PROMESSA_AVALIADA))} AS PROMESSAS_CUMPRIDAS_PCT,
  ${CONTATOS('')} AS CONTATOS,
  ${RETORNOS.map(([k, r]) => `${CONTATOS(`AND KC.RETORNO = '${r}'`)} AS CONT_${k}`).join(',\n  ')},
  ${ACORDOS('COUNT(*)', "AND AC.SITUACAO = 'ATIVO'")} AS ACORDOS_ATIVOS,
  COALESCE(${ACORDOS('SUM(AC.VALOR)', "AND AC.SITUACAO = 'ATIVO'")}, 0) AS ACORDOS_ATIVOS_VALOR,
  ${ACORDOS('COUNT(*)', "AND AC.SITUACAO = 'ATIVO' AND NOT EXISTS (SELECT 1 FROM CC_ACORDO_PARCELA PA WHERE PA.ACORDO_ID = AC.ID AND PA.PAGO_EM IS NULL AND PA.VENC < PRM.HOJE)")} AS ACORDOS_EM_DIA,
  ${ACORDOS('COUNT(*)', "AND AC.SITUACAO = 'ATIVO' AND EXISTS (SELECT 1 FROM CC_ACORDO_PARCELA PA WHERE PA.ACORDO_ID = AC.ID AND PA.PAGO_EM IS NULL AND PA.VENC < PRM.HOJE)")} AS ACORDOS_PARCELA_VENCIDA,
  ${ACORDOS('COUNT(*)', "AND AC.SITUACAO = 'QUEBRADO' AND SUBSTRING(AC.ENCERRADO_EM, 1, 10) >= PRM.DE AND SUBSTRING(AC.ENCERRADO_EM, 1, 10) <= PRM.ATE")} AS ACORDOS_QUEBRADOS,
  COALESCE(${ACORDOS('SUM(AC.VALOR)', "AND AC.SITUACAO = 'QUEBRADO' AND SUBSTRING(AC.ENCERRADO_EM, 1, 10) >= PRM.DE AND SUBSTRING(AC.ENCERRADO_EM, 1, 10) <= PRM.ATE")}, 0) AS ACORDOS_QUEBRADOS_VALOR,
  (SELECT COUNT(*) FROM CC_ACORDO_PARCELA PA JOIN CC_ACORDO AC ON AC.ID = PA.ACORDO_ID
     JOIN CC_COBRANCA CB ON CB.ID = AC.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
     WHERE AC.SITUACAO = 'ATIVO' AND PA.PAGO_EM IS NULL AND PA.VENC >= PRM.HOJE AND DATEDIFF(PA.VENC, PRM.HOJE) <= 30 AND ${CASO_NO_RECORTE('CB', 'CX')}) AS PARCELAS_30D,
  COALESCE((SELECT SUM(PA.VALOR) FROM CC_ACORDO_PARCELA PA JOIN CC_ACORDO AC ON AC.ID = PA.ACORDO_ID
     JOIN CC_COBRANCA CB ON CB.ID = AC.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
     WHERE AC.SITUACAO = 'ATIVO' AND PA.PAGO_EM IS NULL AND PA.VENC >= PRM.HOJE AND DATEDIFF(PA.VENC, PRM.HOJE) <= 30 AND ${CASO_NO_RECORTE('CB', 'CX')}), 0) AS PARCELAS_30D_VALOR,
  ${BAIXAS('COUNT(*)', `AND BX.SITUACAO = 'PENDENTE' AND BX.NIVEL_EXIGIDO <= ${PARAM_NUM('alcada.baixaNivel1')}`)} AS BAIXAS_PEND_GERENTE,
  COALESCE(${BAIXAS('SUM(BX.VALOR)', `AND BX.SITUACAO = 'PENDENTE' AND BX.NIVEL_EXIGIDO <= ${PARAM_NUM('alcada.baixaNivel1')}`)}, 0) AS BAIXAS_PEND_GERENTE_VALOR,
  ${BAIXAS('COUNT(*)', `AND BX.SITUACAO = 'PENDENTE' AND BX.NIVEL_EXIGIDO > ${PARAM_NUM('alcada.baixaNivel1')}`)} AS BAIXAS_PEND_ACIMA,
  COALESCE(${BAIXAS('SUM(BX.VALOR)', `AND BX.SITUACAO = 'PENDENTE' AND BX.NIVEL_EXIGIDO > ${PARAM_NUM('alcada.baixaNivel1')}`)}, 0) AS BAIXAS_PEND_ACIMA_VALOR,
  ${BAIXAS('COUNT(*)', "AND BX.SITUACAO = 'PENDENTE' AND BX.PARECER_EM IS NULL")} AS BAIXAS_SEM_PARECER,
  COALESCE(${BAIXAS('SUM(BX.VALOR)', "AND BX.SITUACAO = 'APROVADA' AND SUBSTRING(BX.DECIDIDO_EM, 1, 10) >= PRM.DE AND SUBSTRING(BX.DECIDIDO_EM, 1, 10) <= PRM.ATE")}, 0) AS BAIXADO_PERIODO,
  ${BAIXAS('COUNT(DISTINCT BX.CLIENTE_ID)', "AND BX.SITUACAO = 'APROVADA' AND SUBSTRING(BX.DECIDIDO_EM, 1, 10) >= PRM.DE AND SUBSTRING(BX.DECIDIDO_EM, 1, 10) <= PRM.ATE")} AS BAIXADO_CLIENTES,
  COALESCE(${PARAM_NUM('meta.inadPct')}, 5) AS META_INAD, COALESCE(${PARAM_NUM('meta.conversaoPct')}, 60) AS META_CONVERSAO,
  COALESCE(${PARAM_NUM('meta.promessaPct')}, 70) AS META_PROMESSA, COALESCE(${PARAM_NUM('meta.recuperacaoPct')}, 80) AS META_RECUPERACAO
FROM (SELECT COALESCE(SUM(S0.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(S0.A_VENCER), 0) AS A_VENCER,
    COUNT(DISTINCT CASE WHEN S0.VENCIDO > 0 THEN S0.CLIENTE_ID END) AS CLIENTES_VENCIDOS,
    COALESCE(ROUND(AVG(CASE WHEN S0.VENCIDO > 0 THEN S0.DIAS_ATRASO END), 0), 0) AS DIAS_MEDIO,
    COALESCE(SUM(S0.V_91_180 + S0.V_180), 0) AS ACIMA_90,
    COUNT(DISTINCT CASE WHEN (S0.V_91_180 + S0.V_180) > 0 THEN S0.CLIENTE_ID END) AS ACIMA_90_CLIENTES,
    COALESCE(SUM(CASE WHEN S0.PROX_VENC >= ${HOJE_SQL} AND DATEDIFF(S0.PROX_VENC, ${HOJE_SQL}) <= 5 THEN S0.PROX_VENC_VALOR ELSE 0 END), 0) AS VENCE_5D,
    COUNT(DISTINCT CASE WHEN S0.PROX_VENC >= ${HOJE_SQL} AND DATEDIFF(S0.PROX_VENC, ${HOJE_SQL}) <= 5 THEN S0.CLIENTE_ID END) AS VENCE_5D_CLIENTES
  FROM ${SALDOS(COLS_SALDO)} S0 JOIN CC_CLIENTE C ON C.ID = S0.CLIENTE_ID ${EU} WHERE ${NO_RECORTE('C')}) S
${EU}
${PERIODO}`;

const SQL_PAINEL_AGENTES = `SELECT AG.ID AS AGENTE_ID, AG.NOME AS AGENTE_NOME, SU.ID AS SUPERVISOR_ID, COALESCE(SU.NOME, '') AS SUPERVISOR_NOME,
  COUNT(DISTINCT CASE WHEN S.VENCIDO > 0 THEN S.CLIENTE_ID END) AS CLIENTES_ATRASO,
  COALESCE(SUM(S.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(S.A_VENCER), 0) AS A_VENCER,
  ${PCT('COALESCE(SUM(S.VENCIDO), 0)', 'COALESCE(SUM(S.VENCIDO), 0) + COALESCE(SUM(S.A_VENCER), 0)')} AS INAD_PCT,
  (SELECT COUNT(*) FROM CC_CONTATO_COBRANCA KC LEFT JOIN CC_COBRANCA CB ON CB.ID = KC.COBRANCA_ID
     WHERE KC.AGENTE_ID = AG.ID AND KC.DATA >= PRM.DE AND KC.DATA <= PRM.ATE AND ('{{carteira}}' = '' OR CB.CARTEIRA = '{{carteira}}')) AS CONTATOS,
  (SELECT COUNT(*) FROM CC_PROMESSA PR LEFT JOIN CC_COBRANCA CB ON CB.ID = PR.COBRANCA_ID
     WHERE PR.AGENTE_ID = AG.ID AND PR.DATA_CONTATO >= PRM.DE AND PR.DATA_CONTATO <= PRM.ATE AND ('{{carteira}}' = '' OR CB.CARTEIRA = '{{carteira}}')) AS PROMESSAS,
  ${PCT(`(SELECT COUNT(*) FROM CC_PROMESSA PR WHERE PR.AGENTE_ID = AG.ID ${PROMESSA_AVALIADA} AND PR.SITUACAO = 'CUMPRIDA')`,
    `(SELECT COUNT(*) FROM CC_PROMESSA PR WHERE PR.AGENTE_ID = AG.ID ${PROMESSA_AVALIADA})`)} AS PROMESSAS_CUMPRIDAS_PCT,
  COALESCE((SELECT SUM(R.VALOR_PAGO) FROM CC_RECEBIMENTO R JOIN CC_CLIENTE CR ON CR.ID = R.CLIENTE_ID WHERE CR.AGENTE_ID = AG.ID AND R.ESTORNADO = FALSE
     AND R.DIAS_ATRASO_PAGAMENTO > 0 AND R.DATA_PAGAMENTO >= PRM.DE AND R.DATA_PAGAMENTO <= PRM.ATE AND ${CARTEIRA_OK('R.CARTEIRA')}
     AND ({{buId}} = -1 OR R.BU_ID = {{buId}})), 0) AS RECUPERADO,
  (SELECT COUNT(*) FROM CC_COBRANCA CB JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID JOIN KB_CARD K ON K.ID = CB.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
     WHERE CB.ENCERRADO_EM IS NULL AND CX.AGENTE_ID = AG.ID AND ${CARTEIRA_OK('CB.CARTEIRA')} AND ${FASE_COM_ACAO('F')}
       AND NOT EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = CB.ID AND AR.FASE_CHAVE = F.CHAVE)
       AND ${PROX_UTIL_SQL(`SUBSTRING(${KB_BRASILIA('K.FASE_DESDE')}, 1, 10)`)} < PRM.HOJE) AS ACOES_ATRASADAS,
  ${PCT(`(SELECT COUNT(*) FROM CC_ACAO_REGUA AR JOIN CC_COBRANCA CB ON CB.ID = AR.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
     WHERE CX.AGENTE_ID = AG.ID AND AR.NO_PRAZO = TRUE AND SUBSTRING(AR.FEITA_EM, 1, 10) >= PRM.DE AND SUBSTRING(AR.FEITA_EM, 1, 10) <= PRM.ATE)`,
    `(SELECT COUNT(*) FROM CC_ACAO_REGUA AR JOIN CC_COBRANCA CB ON CB.ID = AR.COBRANCA_ID JOIN CC_CLIENTE CX ON CX.ID = CB.CLIENTE_ID
     WHERE CX.AGENTE_ID = AG.ID AND SUBSTRING(AR.FEITA_EM, 1, 10) >= PRM.DE AND SUBSTRING(AR.FEITA_EM, 1, 10) <= PRM.ATE)`)} AS ACOES_NO_PRAZO_PCT
FROM ${SALDOS(COLS_SALDO)} S
JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
${EU}
${PERIODO}
JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
LEFT JOIN CC_MEMBRO SU ON SU.ID = AG.SUPERIOR_ID
WHERE ${NO_RECORTE('C')} AND (S.VENCIDO + S.A_VENCER) > 0
GROUP BY AG.ID, AG.NOME, SU.ID, SU.NOME, PRM.DE, PRM.ATE, PRM.HOJE
ORDER BY COALESCE(SU.NOME, ''), VENCIDO DESC`;

const SQL_PAINEL_BU = `SELECT B.ID AS BU_ID, B.NOME AS BU_NOME, B.CARTEIRA, COALESCE(SUM(X.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(X.A_VENCER), 0) AS A_VENCER,
  ${PCT('COALESCE(SUM(X.VENCIDO), 0)', `(SELECT COALESCE(SUM(X2.VENCIDO), 0) FROM CC_POSICAO_CLIENTE_BU X2 JOIN CC_CLIENTE C2 ON C2.ID = X2.CLIENTE_ID
     WHERE ${CARTEIRA_OK('X2.CARTEIRA')} AND ({{buId}} = -1 OR X2.BU_ID = {{buId}}) AND ${NO_RECORTE('C2')})`)} AS PARTICIPACAO_PCT,
  ${PCT('COALESCE(SUM(X.VENCIDO), 0)', 'COALESCE(SUM(X.VENCIDO), 0) + COALESCE(SUM(X.A_VENCER), 0)')} AS INAD_PCT,
  COUNT(DISTINCT CASE WHEN X.VENCIDO > 0 THEN X.CLIENTE_ID END) AS CLIENTES_ATRASO,
  COALESCE(SUM(X.V_91_180 + X.V_180), 0) AS ACIMA_90
FROM CC_POSICAO_CLIENTE_BU X
JOIN CC_BU B ON B.ID = X.BU_ID
JOIN CC_CLIENTE C ON C.ID = X.CLIENTE_ID
${EU}
WHERE ${CARTEIRA_OK('X.CARTEIRA')} AND ({{buId}} = -1 OR X.BU_ID = {{buId}}) AND ${NO_RECORTE('C')} AND (X.VENCIDO + X.A_VENCER) > 0
GROUP BY B.ID, B.NOME, B.CARTEIRA, B.ORDEM
ORDER BY B.ORDEM`;

const FAIXAS = [['A vencer', 'A_VENCER', 0], ['1 a 30 dias', 'V_1_30', 1], ['31 a 60 dias', 'V_31_60', 2], ['61 a 90 dias', 'V_61_90', 3],
  ['91 a 180 dias', 'V_91_180', 4], ['Acima de 180 dias', 'V_180', 5]];
const SQL_PAINEL_AGING = `SELECT A.FAIXA, A.ORDEM, A.CLIENTES, A.VALOR,
  ${PCT('A.VALOR', 'T.TOTAL')} AS PCT_CARTEIRA, CASE WHEN A.ORDEM = 0 THEN 0 ELSE ${PCT('A.VALOR', 'T.VENCIDO')} END AS PCT_VENCIDO, A.PDD
FROM (${FAIXAS.map(([nome, col, i]) => `SELECT '${nome}' AS FAIXA, ${i} AS ORDEM, COUNT(DISTINCT CASE WHEN S.${col} > 0 THEN S.CLIENTE_ID END) AS CLIENTES,
    COALESCE(SUM(S.${col}), 0) AS VALOR,
    ROUND(COALESCE(SUM(S.${col} * ${PARAM_NUM(`pdd.f${i}`, "CASE WHEN S.CARTEIRA = 'PRIVADA' THEN '' ELSE S.CARTEIRA END")} / 100), 0), 2) AS PDD
  FROM ${SALDOS(COLS_SALDO)} S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${EU} WHERE ${NO_RECORTE('C')}`).join('\n  UNION ALL ')}) A
JOIN (SELECT COALESCE(SUM(S.VENCIDO + S.A_VENCER), 0) AS TOTAL, COALESCE(SUM(S.VENCIDO), 0) AS VENCIDO
  FROM ${SALDOS(COLS_SALDO)} S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${EU} WHERE ${NO_RECORTE('C')}) T ON 1 = 1
ORDER BY A.ORDEM`;

const SQL_PAINEL_TOP = `SELECT S.CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, C.GRUPO_ECONOMICO, SUM(S.VENCIDO) AS VENCIDO,
  ${PCT('SUM(S.VENCIDO)', 'T.VENCIDO')} AS PARTICIPACAO_PCT
FROM ${SALDOS(COLS_SALDO)} S
JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
${EU}
JOIN (SELECT COALESCE(SUM(S2.VENCIDO), 0) AS VENCIDO FROM ${SALDOS(COLS_SALDO)} S2 JOIN CC_CLIENTE C2 ON C2.ID = S2.CLIENTE_ID ${EU}
  WHERE ${NO_RECORTE('C2')}) T ON 1 = 1
WHERE ${NO_RECORTE('C')} AND S.VENCIDO > 0
GROUP BY S.CLIENTE_ID, C.CODCLI, C.NOME, C.GRUPO_ECONOMICO, T.VENCIDO
ORDER BY VENCIDO DESC, S.CLIENTE_ID
LIMIT {{limite}}`;

/* ── leituras JAVASCRIPT ── */

const corpoCasoFicha = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const id = inteiro(event.cobrancaId);
  const cardId = inteiro(event.cardId);
  if (!id && !cardId) return recusar('Informe o caso.');
  const c = await lerCaso(id ? `CB.ID = ${id}` : `CB.CARD_ID = ${cardId}`);
  if (!c) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const cid = inteiro(c.ID);
  const baixas = await ler(`SELECT * FROM CC_BAIXA WHERE COBRANCA_ID = ${cid} ORDER BY ID DESC`);
  const baixa = baixas.find((b) => b.SITUACAO === 'PENDENTE') || baixas[0] || null;
  const [acordo] = await ler(`SELECT * FROM CC_ACORDO WHERE COBRANCA_ID = ${cid} ORDER BY ID DESC LIMIT 1`);
  // DT-35 (F5 C-02): quem decide na alçada não precisa ver o cliente; sem vê-lo, lê só o necessário para decidir
  // (caso, débito, acordo e parcelas, baixa), sem contatos, promessas, fila, ações nem composição por BU.
  const decideAcordo = !!acordo && acordo.SITUACAO === 'PROPOSTO' && m.nivel >= inteiro(acordo.NIVEL_EXIGIDO) && inteiro(acordo.PROPOSTO_POR) !== m.membroId;
  const decideBaixa = !!baixa && baixa.SITUACAO === 'PENDENTE' && !!baixa.PARECER_EM && m.nivel >= inteiro(baixa.NIVEL_EXIGIDO) && inteiro(baixa.PROPOSTO_POR) !== m.membroId;
  const restrito = !visivel(m, c) && m.cargo !== 'JURIDICO' && (decideAcordo || decideBaixa);
  // PA-21: o Jurídico lê, sem operar, o caso com baixa pendente.
  if (!visivel(m, c) && !restrito && !(m.cargo === 'JURIDICO' && baixa && baixa.SITUACAO === 'PENDENTE')) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const p = await parametros(c.CARTEIRA);
  const feriados = await feriadosDe();
  const parcelas = acordo ? await ler(`SELECT * FROM CC_ACORDO_PARCELA WHERE ACORDO_ID = ${inteiro(acordo.ID)} ORDER BY N`) : [];
  const promessas = restrito ? [] : await ler(`SELECT * FROM CC_PROMESSA WHERE COBRANCA_ID = ${cid} ORDER BY ID DESC`);
  const contatos = restrito ? [] : await ler(`SELECT X.*, COALESCE(M.NOME, '') AS AGENTE_NOME FROM CC_CONTATO_COBRANCA X LEFT JOIN CC_MEMBRO M ON M.ID = X.AGENTE_ID
WHERE X.CLIENTE_ID = ${inteiro(c.CLIENTE_ID)} ORDER BY X.DATA DESC, X.ID DESC LIMIT 5`);
  const fila = restrito ? [] : await ler(`SELECT * FROM CC_EMAIL_FILA WHERE COBRANCA_ID = ${cid} ORDER BY ID DESC LIMIT 10`);
  const feitas = restrito ? [] : await ler(`SELECT * FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ${cid}`);
  const porBu = restrito ? [] : await ler(`SELECT PB.*, B.NOME AS BU_NOME FROM CC_POSICAO_CLIENTE_BU PB JOIN CC_BU B ON B.ID = PB.BU_ID
WHERE PB.CLIENTE_ID = ${inteiro(c.CLIENTE_ID)} AND PB.CARTEIRA = ${q(c.CARTEIRA)} AND (PB.VENCIDO + PB.A_VENCER) > 0 ORDER BY B.ORDEM`);
  const fase = c.FASE_CHAVE || '';
  const def = itensDe(c.CARTEIRA, fase);
  const valores = valoresDe(c.VALORES_JSON);
  const feita = feitas.find((a) => a.FASE_CHAVE === fase) || null;
  const desde = brasilia(c.FASE_DESDE);
  const aberto = !c.ENCERRADO_EM;
  const regua = CARTEIRAS_COM_REGUA.includes(c.CARTEIRA);
  const dias = inteiro(c.DIAS_ATRASO);
  const etq = regua ? etiquetas({ diasAtraso: dias, vencido: c.VENCIDO, juridicoEm: c.JURIDICO_EM }, p) : [];
  let proximaFase = null;
  if (regua && aberto && Number(c.VENCIDO) > 0 && c.VENC_MAIS_ANTIGO) {
    const ordem = [['pag_nao_ident', 'confPag'], ['cob_ativa', 'lig'], ['notif_formal', 'notif'], ['protesto', 'neg'], ['neg_pos_protesto', 'prop'], ['extrajudicial', 'extra']];
    const prox = ordem.find(([, k]) => Number(p[`regua.${k}`]) > dias);
    if (prox) proximaFase = { chave: prox[0], nome: nomeDaFase(prox[0], p), em: somarDias(c.VENC_MAIS_ANTIGO, Number(p[`regua.${prox[1]}`])) };
  }
  const acordoAberto = acordo && ['PROPOSTO', 'ATIVO'].includes(acordo.SITUACAO) ? acordo : null;
  const operar = opera(m, c) && aberto;
  const modo = p[`cob.emailModo.${fase}`];
  const temNegociacao = c.CARTEIRA !== 'PUBLICA';
  const naRegua = fase && FASES_REGUA.includes(fase);
  const pendente = baixa && baixa.SITUACAO === 'PENDENTE' ? baixa : null;
  return {
    ok: true,
    restrito,
    caso: {
      id: cid, cardId: inteiro(c.CARD_ID), carteira: c.CARTEIRA, aberto, desfecho: c.DESFECHO, abertoEm: c.ABERTO_EM, encerradoEm: c.ENCERRADO_EM,
      faseChave: fase, faseNome: c.FASE_NOME || nomeDaFase(fase, p), faseDesde: desde, faseDevida: c.FASE_DEVIDA,
      acaoFeita: !!feita, acaoPrazo: def.acao.length && desde ? prazoDaAcao(desde, feriados, inteiro(c.SLA_HORAS)) : '',
      negociacaoVencida: fase === 'negociacao' && inteiro(c.SLA_HORAS) > 0 && !!desde && agora() > prazoDaAcao(desde, feriados, inteiro(c.SLA_HORAS)),
      prontoJuridico: etq.includes('Pronto para o Jurídico'), juridicoAtrasado: etq.includes('Jurídico atrasado'),
      anuenciaAte: c.ANUENCIA_ATE, anuenciaEm: c.ANUENCIA_EM, protestado: ehVerdade(c.PROTESTADO), juridicoEm: c.JURIDICO_EM, processoId: c.PROCESSO_ID,
      proxAcao: restrito ? '' : c.PROX_ACAO, proxAcaoData: restrito ? null : c.PROX_ACAO_DATA, valorBaixado: Number(c.VALOR_BAIXADO || 0), dataRef: c.DATA_REF, proximaFase,
    },
    cliente: { id: inteiro(c.CLIENTE_ID), codcli: inteiro(c.CODCLI), nome: c.CLIENTE_NOME, agenteId: inteiro(c.AGENTE_ID), setor: c.SETOR },
    posicao: { VENCIDO: Number(c.VENCIDO), A_VENCER: Number(c.A_VENCER), DIAS_ATRASO: dias, VENC_MAIS_ANTIGO: c.VENC_MAIS_ANTIGO, PROX_VENC: c.PROX_VENC, PROX_VENC_VALOR: Number(c.PROX_VENC_VALOR) },
    porBu,
    acoes: restrito ? [] : def.textos.map((t, i) => ({ n: i + 1, texto: t, define: def.acao.includes(i + 1), email: def.email === i + 1, marcado: String(valores[`${fase}_${i + 1}`] ?? '') === '1' })),
    acaoFeita: feita, promessas, acordo: acordo || null, parcelas, baixa, contatos, fila,
    bloqueio: { devido: c.BLOQUEIO_DEVIDO, aplicado: c.BLOQUEIO_APLICADO, aplicadoEm: c.BLOQUEIO_APLICADO_EM },
    pode: {
      operar,
      registrarAcao: operar && def.acao.length > 0 && !feita,
      registrarContato: opera(m, c),
      enviarEmail: operar && regua && !!MODELO_DA_FASE[fase] && modo === 'MANUAL',
      proporAcordo: operar && temNegociacao && (naRegua || fase === 'negociacao') && !acordoAberto && Number(c.VENCIDO) > 0,
      decidirAcordo: decideAcordo,
      pagarParcela: opera(m, c) && !!acordo && acordo.SITUACAO === 'ATIVO',
      cancelarAcordo: !!acordoAberto && nivelMin(m, 2) && visivel(m, c),
      proporBaixa: operar && !pendente && Number(c.VENCIDO) > Number(c.VALOR_BAIXADO || 0),
      parecerBaixa: !!pendente && m.cargo === 'JURIDICO',
      decidirBaixa: decideBaixa,
      registrarBloqueio: opera(m, c) && regua && c.BLOQUEIO_DEVIDO !== c.BLOQUEIO_APLICADO,
      registrarAnuencia: opera(m, c) && c.DESFECHO === 'REGULARIZADO' && ehVerdade(c.PROTESTADO) && !c.ANUENCIA_EM,
      montarDossie: operar && !c.JURIDICO_EM && (['extrajudicial', 'negociacao', 'acordo'].includes(fase) || c.CARTEIRA === 'PUBLICA' || m.nivel >= 3),
    },
  };
};

const corpoEncargos = async () => {
  const m = await quem();
  if (!m.membroId && !m.rotina) return recusar(MSG.NAO_MEMBRO);
  const cliente = await lerCliente(event.clienteId);
  if (!cliente || !(m.rotina || visivel(m, cliente))) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const carteira = texto(event.carteira, 10).toUpperCase();
  if (!['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(carteira)) return recusar('Informe a carteira.');
  const data = ehData(event.data) ? event.data : hoje();
  const r = await escrever('ccBaseTitulosAbertos', { clienteId: inteiro(cliente.ID), carteira, soVencidos: 1, membroId: m.membroId || 0 });
  if (r && r.ok === false) return recusar(r.error);
  if (r && r.erroWinthor) return { ok: true, linhas: [], principal: 0, multa: 0, juros: 0, correcao: 0, total: 0, erroWinthor: r.erroWinthor };
  const filtro = String(event.titulos ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const linhas = (r && r.linhas ? r.linhas : []).filter((l) => !filtro.length || filtro.includes(String(l.CHAVE)) || filtro.includes(String(l.TITULO)));
  return { ok: true, data, ...calcularEncargos(linhas, data, await parametros(carteira, data)) };
};

/* ── escritas JAVASCRIPT ── */

const corpoAcaoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.ENCERRADO_EM) return recusar('O caso está encerrado.');
  const fase = c.FASE_CHAVE || '';
  const def = itensDe(c.CARTEIRA, fase);
  if (!def.acao.length) return recusar('Esta etapa não tem ação a registrar; marque os itens no card.');
  const pedidos = String(event.itens ?? '').trim() === '' ? def.acao : [...new Set(String(event.itens).split(',').map((x) => inteiro(x)))];
  if (pedidos.some((n) => n < 1 || n > def.textos.length)) return recusar('Item inválido para esta etapa.');
  const valores = valoresDe(c.VALORES_JSON);
  const marcados = new Set([...def.textos.map((_, i) => i + 1).filter((n) => String(valores[`${fase}_${n}`] ?? '') === '1'), ...pedidos]);
  const feita = def.acao.every((n) => marcados.has(n));
  const agoraTxt = agora();
  const [ja] = await ler(`SELECT ID FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND FASE_CHAVE = ${q(fase)}`);
  if (feita && !ja) {
    await escrever('ccEscCobAcaoInserir', { cobrancaId: inteiro(c.ID), faseChave: fase, origem: 'BOTAO', membroId: m.membroId, agora: agoraTxt });
    const [gravada] = await ler(`SELECT ID FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND FASE_CHAVE = ${q(fase)}`);
    if (!gravada) return recusar(MSG.SEM_PERMISSAO);
  }
  const protesto = fase === 'protesto' && marcados.has(1) && !ehVerdade(c.PROTESTADO);
  if (protesto) await escrever('ccEscCobCasoProtesto', { cobrancaId: inteiro(c.ID), membroId: m.membroId, agora: agoraTxt });
  if (feita) {
    const fila = await ler(`SELECT ID FROM CC_EMAIL_FILA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND FASE_CHAVE = ${q(fase)} AND SITUACAO = 'PENDENTE'`);
    if (fila.length) await escrever('ccEscCobFilaSituacao', { ids: fila.map((f) => f.ID).join(','), situacao: 'FORA', obs: 'Ação da fase registrada por outro meio.', emailEnviadoId: 0, membroId: m.membroId, agora: agoraTxt });
  }
  await auditar('Cobrança', 'COBRANCA', c.ID, c.CLIENTE_ID, [{ campo: `Itens de ${fase}`, antes: '', depois: `${pedidos.join(', ')}${feita ? ' (ação feita)' : ''}${protesto ? '; protestado' : ''}` }], m);
  const novos = Object.fromEntries(pedidos.map((n) => [`${fase}_${n}`, '1']));
  if (c.CARTEIRA !== 'PUBLICA') novos.acao_fase = feita ? 'feita' : 'a_fazer';
  await kbAtualizar(c, novos, await usuarioDe(m, c));
  return { ok: true, acaoFeita: feita, protestado: protesto || ehVerdade(c.PROTESTADO) };
};

const corpoContatoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const cliente = await lerCliente(event.clienteId);
  if (!cliente || m.cargo === 'JURIDICO' || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const carteira = texto(event.carteira, 10).toUpperCase() || (cliente.SETOR === 'PUBLICO' ? 'PUBLICA' : 'PRIVADA');
  if (!['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(carteira)) return recusar('Carteira inválida.');
  const origem = texto(event.origem, 12).toUpperCase() || 'MANUAL';
  if (!['MANUAL', 'REGUA_PUB'].includes(origem)) return recusar('Origem inválida: o contato da régua por e-mail é gravado pelo envio.');
  const feedback = texto(event.feedback, 2000);
  if (!feedback) return recusar('Informe o feedback do contato.');
  const hojeData = hoje();
  const data = texto(event.data, 10) || hojeData;
  if (!ehData(data)) return recusar('Data do contato inválida.');
  if (data > hojeData) return recusar('A data do contato não pode ser futura.');
  const canal = texto(event.canal, 20);
  if (!CANAIS.includes(canal)) return recusar('Informe o canal do contato.');
  const retorno = texto(event.retorno, 40);
  if (retorno ? !RETORNOS.includes(retorno) : origem !== 'REGUA_PUB') return recusar('Informe o retorno do contato.');
  const valor = String(event.valor ?? '').trim() === '' ? 0 : dinheiro(event.valor);
  if (!(valor >= 0)) return recusar('Valor inválido.');
  const pedido = inteiro(event.cobrancaId);
  const c = await lerCaso(pedido ? `CB.ID = ${pedido} AND CB.CLIENTE_ID = ${inteiro(cliente.ID)}`
    : `CB.CLIENTE_ID = ${inteiro(cliente.ID)} AND CB.CARTEIRA = ${q(carteira)} AND CB.ENCERRADO_EM IS NULL`);
  if (pedido && !c) return recusar('Caso não encontrado.');
  const feriados = await feriadosDe();
  const p = await parametros(carteira);
  const avisos = [];
  let previsao = texto(event.previsao, 10);
  if (previsao) {
    if (!ehData(previsao) || previsao < data) return recusar('A previsão não pode ser anterior à data do contato.');
    const ajustada = proximoUtil(previsao, feriados);
    if (ajustada !== previsao) { avisos.push(`Previsão em ${motivoNaoUtil(previsao, feriados)}: vai para ${ajustada}.`); previsao = ajustada; }
    const max = inteiro(p['cob.promessaMaxUteis']);
    if (max > 0 && previsao > somarDiasUteis(data, max, feriados)) return recusar(`Promessa acima de ${max} dias úteis: registre um acordo formal com entrada.`);
  }
  let proxAcaoData = texto(event.proxAcaoData, 10);
  if (proxAcaoData) {
    if (!ehData(proxAcaoData)) return recusar('Data da próxima ação inválida.');
    const ajustada = proximoUtil(proxAcaoData, feriados);
    if (ajustada !== proxAcaoData) { avisos.push(`Próxima ação em ${motivoNaoUtil(proxAcaoData, feriados)}: vai para ${ajustada}.`); proxAcaoData = ajustada; }
  }
  const agoraTxt = agora();
  const cobrancaId = c ? inteiro(c.ID) : 0;
  await escrever('ccEscCobContatoInserir', {
    clienteId: inteiro(cliente.ID), cobrancaId, nfId: inteiro(event.nfId), data, canal, falouCom: texto(event.falouCom, 120), retorno,
    previsao, valor, feedback, origem, emailEnviadoId: inteiro(event.emailEnviadoId), membroId: m.membroId, agora: agoraTxt,
  });
  const [novo] = await ler(`SELECT MAX(ID) AS ID FROM CC_CONTATO_COBRANCA WHERE CLIENTE_ID = ${inteiro(cliente.ID)} AND AGENTE_ID = ${inteiro(m.membroId)} AND CRIADO_EM = ${q(agoraTxt)}`);
  const contatoId = inteiro(novo && novo.ID);
  if (!contatoId) return recusar(MSG.SEM_PERMISSAO);
  if (previsao) await escrever('ccEscCobPromessaInserir', { contatoId, membroId: m.membroId });
  let prox = null;
  if (previsao) prox = ['Conferir pagamento prometido', previsao];
  else if (texto(event.proxAcao, 200)) prox = [texto(event.proxAcao, 200), proxAcaoData];
  else if (c && c.PROX_ACAO_DATA && c.PROX_ACAO_DATA <= hojeData) prox = ['', ''];
  if (c && !c.ENCERRADO_EM && prox && (prox[0] !== c.PROX_ACAO || prox[1] !== (c.PROX_ACAO_DATA || ''))) {
    await escrever('ccEscCobCasoProxAcao', { cobrancaId, proxAcao: prox[0], proxAcaoData: prox[1], membroId: m.membroId, agora: agoraTxt });
  }
  await auditar('Cobrança', 'CONTATO', contatoId, cliente.ID, [{ campo: '(contato)', antes: '', depois: `${data} · ${canal}${retorno ? ` · ${retorno}` : ''}${previsao ? ` · promessa ${brl(valor)} em ${previsao}` : ''}` }], m);
  if (c && !c.ENCERRADO_EM && c.CARD_ID) {
    const usuarioId = await usuarioDe(m, c);
    await kbNota(c, `Contato (${canal})${retorno ? `: ${retorno}` : ''}. ${feedback}`, usuarioId);
    const capa = { ultimo_contato: data };
    if (prox) Object.assign(capa, { proxima_acao: prox[0], proxima_acao_data: prox[1] });
    await kbAtualizar(c, capa, usuarioId);
  }
  return { ok: true, contatoId, cobrancaId, previsao, aviso: avisos.join(' ') };
};

const corpoProxAcaoDefinir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.ENCERRADO_EM) return recusar('O caso está encerrado.');
  const proxAcao = texto(event.proxAcao, 200);
  let data = texto(event.proxAcaoData, 10);
  if (proxAcao && !ehData(data)) return recusar('Informe a data da próxima ação.');
  let aviso = '';
  if (data) {
    const feriados = await feriadosDe();
    const ajustada = proximoUtil(data, feriados);
    if (ajustada !== data) { aviso = `Data em ${motivoNaoUtil(data, feriados)}: a próxima ação vai para ${ajustada}.`; data = ajustada; }
  }
  const agoraTxt = agora();
  await escrever('ccEscCobCasoProxAcao', { cobrancaId: inteiro(c.ID), proxAcao, proxAcaoData: proxAcao ? data : '', membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT PROX_ACAO, PROX_ACAO_DATA FROM CC_COBRANCA WHERE ID = ${inteiro(c.ID)}`);
  if (!rel || rel.PROX_ACAO !== proxAcao) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Cobrança', 'COBRANCA', c.ID, c.CLIENTE_ID, [{ campo: 'Próxima ação', antes: `${c.PROX_ACAO || ''} ${c.PROX_ACAO_DATA || ''}`.trim(), depois: `${proxAcao} ${proxAcao ? data : ''}`.trim() }], m);
  await kbAtualizar(c, { proxima_acao: proxAcao, proxima_acao_data: proxAcao ? data : '' }, await usuarioDe(m, c));
  return { ok: true, proxAcaoData: proxAcao ? data : '', aviso };
};

/** Envio de um e-mail da régua pela 001 e os efeitos da 002 (contato, ação, fila); `fila` = id da linha (0 = a pendente do caso × fase). */
async function enviarDaRegua(m, c, { contatoId = 0, dataLimiteInformada = '', filaId = 0 } = {}) {
  const fase = c.FASE_CHAVE;
  const p = await parametros(c.CARTEIRA);
  const feriados = await feriadosDe();
  const dl = ehData(dataLimiteInformada) ? dataLimiteInformada : dataLimite(fase, c.DIAS_ATRASO, hoje(), p, feriados);
  const extras = { carteira: c.CARTEIRA };
  if (dl) extras.DATA_LIMITE = `${dl.slice(8, 10)}/${dl.slice(5, 7)}/${dl.slice(0, 4)}`;
  const r = await escrever('ccEmailEnviar', {
    codigo: MODELO_DA_FASE[fase], clienteId: inteiro(c.CLIENTE_ID), contatoId: inteiro(contatoId), extras: JSON.stringify(extras),
    origem: '002-regua', referencia: `cobranca:${inteiro(c.ID)}:${fase}`, membroId: m.membroId || 0,
  });
  if (!r || r.ok === false) return { erro: (r && r.error) || 'O envio falhou.' };
  const agoraTxt = agora();
  const emailId = inteiro(r.emailId);
  await escrever('ccEscCobContatoInserir', {
    clienteId: inteiro(c.CLIENTE_ID), cobrancaId: inteiro(c.ID), nfId: 0, data: hoje(), canal: 'E-mail', falouCom: '', retorno: '', previsao: '', valor: 0,
    feedback: `E-mail da régua enviado (${nomeDaFase(fase, p)}): ${ASSUNTO_DA_FASE[fase] || ''}`, origem: 'EMAIL_REGUA', emailEnviadoId: emailId,
    membroId: m.membroId || 0, agora: agoraTxt,
  });
  const def = itensDe(c.CARTEIRA, fase);
  const valores = valoresDe(c.VALORES_JSON);
  const marcados = new Set([...def.textos.map((_, i) => i + 1).filter((n) => String(valores[`${fase}_${n}`] ?? '') === '1'), ...(def.email ? [def.email] : [])]);
  const completa = def.email > 0 && def.acao.length > 0 && def.acao.every((n) => marcados.has(n));
  if (completa) {
    await escrever('ccEscCobAcaoInserir', { cobrancaId: inteiro(c.ID), faseChave: fase, origem: 'EMAIL', membroId: m.membroId || 0, agora: agoraTxt });
  }
  const ids = filaId ? [filaId] : (await ler(`SELECT ID FROM CC_EMAIL_FILA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND FASE_CHAVE = ${q(fase)} AND SITUACAO = 'PENDENTE'`)).map((f) => f.ID);
  if (ids.length) await escrever('ccEscCobFilaSituacao', { ids: ids.join(','), situacao: 'ENVIADO', obs: '', emailEnviadoId: emailId, membroId: m.membroId || 0, agora: agoraTxt });
  return { emailId, marca: def.email ? `${fase}_${def.email}` : '', completa };
}

const corpoEmailEnviar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.ENCERRADO_EM) return recusar('O caso está encerrado.');
  if (!CARTEIRAS_COM_REGUA.includes(c.CARTEIRA)) return recusar('Esta carteira não tem e-mail da régua.');
  const fase = c.FASE_CHAVE;
  if (!MODELO_DA_FASE[fase]) return recusar('Esta etapa não tem e-mail da régua.');
  const modo = (await parametros(c.CARTEIRA))[`cob.emailModo.${fase}`];
  if (modo === 'APROVAR') return recusar('Esta etapa exige aprovação: use a fila.');
  if (modo === 'AUTOMATICO') return recusar('Nesta etapa o e-mail é enviado pela rotina.');
  const r = await enviarDaRegua(m, c, { contatoId: event.contatoId, dataLimiteInformada: texto(event.dataLimite, 10) });
  if (r.erro) return recusar(r.erro);
  await auditar('Cobrança', 'COBRANCA', c.ID, c.CLIENTE_ID, [{ campo: `E-mail ${fase}`, antes: '', depois: `enviado (e-mail ${r.emailId})` }], m);
  const capa = r.marca ? { [r.marca]: '1' } : {};
  if (r.completa) capa.acao_fase = 'feita';
  if (Object.keys(capa).length) await kbAtualizar(c, capa, await usuarioDe(m, c));
  return { ok: true, emailId: r.emailId, acaoFeita: r.completa };
};

const corpoEmailFilaDecidir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const ids = [...new Set(String(event.filaIds ?? '').split(',').map((x) => inteiro(x)).filter((x) => x > 0))];
  if (!ids.length) return recusar('Informe os e-mails da fila.');
  if (ids.length > 2) return recusar('Aprove até 2 e-mails por vez.');
  const p0 = await parametros('');
  if (m.cargo === 'JURIDICO' || m.nivel < Number(p0['alcada.emailAprovaNivel'] || 2)) return recusar('Aprovar e-mail da fila exige supervisor ou acima.');
  const aprovar = event.aprovar === undefined || event.aprovar === '' ? 1 : inteiro(event.aprovar);
  const itens = [];
  for (const id of ids) {
    const [f] = await ler(`SELECT * FROM CC_EMAIL_FILA WHERE ID = ${id}`);
    const c = f ? await lerCaso(`CB.ID = ${inteiro(f.COBRANCA_ID)}`) : null;
    if (!f || !c || !opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
    if (f.SITUACAO !== 'PENDENTE' || c.ENCERRADO_EM || c.FASE_CHAVE !== f.FASE_CHAVE) return recusar('Este e-mail não está mais pendente na fila.');
    if ((await parametros(c.CARTEIRA))[`cob.emailModo.${f.FASE_CHAVE}`] !== 'APROVAR') return recusar('Este e-mail não é de aprovação.');
    itens.push({ f, c });
  }
  const agoraTxt = agora();
  if (aprovar !== 1) {
    await escrever('ccEscCobFilaSituacao', { ids: ids.join(','), situacao: 'FORA', obs: texto(event.obs, 500) || 'Descartado na fila.', emailEnviadoId: 0, membroId: m.membroId, agora: agoraTxt });
    await auditarLinhas('Cobrança', 'EMAIL_FILA', itens.map(({ f }) => ({ entidadeId: f.ID, clienteId: f.CLIENTE_ID, campo: 'Fila de e-mail', antes: 'PENDENTE', depois: 'FORA' })), m);
    return { ok: true, enviados: [], descartados: ids, recusados: [] };
  }
  const enviados = [];
  const recusados = [];
  for (const { f, c } of itens) {
    const r = await enviarDaRegua(m, c, { filaId: inteiro(f.ID) });
    if (r.erro) recusados.push({ filaId: inteiro(f.ID), error: r.erro });
    else enviados.push({ filaId: inteiro(f.ID), emailId: r.emailId });
  }
  if (enviados.length) {
    await auditarLinhas('Cobrança', 'EMAIL_FILA', enviados.map((e) => ({ entidadeId: e.filaId, clienteId: itens.find((i) => inteiro(i.f.ID) === e.filaId).f.CLIENTE_ID,
      campo: 'Fila de e-mail', antes: 'PENDENTE', depois: `ENVIADO (e-mail ${e.emailId})` })), m);
  }
  if (!enviados.length) return recusar(recusados[0].error, { enviados, recusados });
  return { ok: true, enviados, recusados };
};

const corpoBloqueioAplicar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (!CARTEIRAS_COM_REGUA.includes(c.CARTEIRA)) return recusar('Esta carteira não tem bloqueio para o ERP.');
  const aplicado = texto(event.aplicado, 8).toUpperCase();
  if (!['', 'PEDIDOS', 'TOTAL'].includes(aplicado)) return recusar('Bloqueio inválido: use nenhum, pedidos ou total.');
  const agoraTxt = agora();
  await escrever('ccEscCobCasoBloqueio', { cobrancaId: inteiro(c.ID), aplicado, membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT BLOQUEIO_APLICADO FROM CC_COBRANCA WHERE ID = ${inteiro(c.ID)}`);
  if (!rel || rel.BLOQUEIO_APLICADO !== aplicado) return recusar(MSG.SEM_PERMISSAO);
  const fase = c.FASE_CHAVE;
  const item = (fase === 'cob_ativa' && aplicado) ? 'cob_ativa_2' : (fase === 'protesto' && aplicado === 'TOTAL') ? 'protesto_3'
    : (fase === 'regularizado' && aplicado === '') ? 'regularizado_2' : '';
  const novos = item ? { [item]: '1' } : {};
  if (item && !c.ENCERRADO_EM) {
    const def = itensDe(c.CARTEIRA, fase);
    const valores = { ...valoresDe(c.VALORES_JSON), ...novos };
    const completa = def.acao.length > 0 && def.acao.every((n) => String(valores[`${fase}_${n}`] ?? '') === '1');
    const [ja] = await ler(`SELECT ID FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND FASE_CHAVE = ${q(fase)}`);
    if (completa && !ja) {
      await escrever('ccEscCobAcaoInserir', { cobrancaId: inteiro(c.ID), faseChave: fase, origem: 'BLOQUEIO', membroId: m.membroId, agora: agoraTxt });
      novos.acao_fase = 'feita';
    }
  }
  await auditar('Bloqueio', 'COBRANCA', c.ID, c.CLIENTE_ID, [{ campo: 'Bloqueio aplicado no ERP', antes: c.BLOQUEIO_APLICADO || '', depois: aplicado }], m);
  const desejadas = [...(aplicado === 'PEDIDOS' ? ['Bloqueio pedidos'] : []), ...(aplicado === 'TOTAL' ? ['Bloqueio total'] : []),
    ...((c.BLOQUEIO_DEVIDO || '') !== aplicado ? ['Bloqueio a aplicar'] : [])];
  novos.etiquetas = etiquetasNovas(c, ['Bloqueio pedidos', 'Bloqueio total', 'Bloqueio a aplicar'], desejadas);
  await kbAtualizar(c, novos, await usuarioDe(m, c));
  return { ok: true, aplicado, item };
};

const corpoAcordoPropor = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.ENCERRADO_EM) return recusar('O caso está encerrado.');
  if (!(await faseIdDe(c.QUADRO, 'negociacao'))) return recusar('Esta carteira não tem acordo parcelado.');
  if (!(FASES_REGUA.includes(c.FASE_CHAVE) || c.FASE_CHAVE === 'negociacao')) return recusar('O acordo é proposto com o caso na régua ou em negociação.');
  const [aberto] = await ler(`SELECT ID FROM CC_ACORDO WHERE COBRANCA_ID = ${inteiro(c.ID)} AND SITUACAO IN ('PROPOSTO', 'ATIVO')`);
  if (aberto) return recusar('Há acordo em aberto neste caso.');
  const debito = Math.round(Number(c.VENCIDO) * 100) / 100;
  if (!(debito > 0)) return recusar('Só cliente com saldo vencido entra em negociação.');
  if (Math.abs(dinheiro(event.debito) - debito) > 0.004) return recusar('O saldo mudou; atualize a tela.');
  const valor = dinheiro(event.valor);
  const entrada = String(event.entrada ?? '').trim() === '' ? 0 : dinheiro(event.entrada);
  const n = inteiro(event.nParcelas);
  const intervalo = inteiro(event.intervaloDias) || 30;
  if (!(valor > 0)) return recusar('Informe o valor do acordo.');
  if (!(entrada >= 0 && entrada < valor)) return recusar('A entrada deve ser menor que o valor do acordo.');
  if (n < 1 || n > 60) return recusar('O acordo tem de 1 a 60 parcelas.');
  if (intervalo < 1) return recusar('Intervalo entre parcelas inválido.');
  if (!ehData(event.primeiroVenc) || (entrada > 0 && !ehData(event.entradaData))) return recusar('Informe as datas do acordo.');
  const p = await parametros(c.CARTEIRA);
  const garantia = texto(event.garantia, 500);
  if (debito > Number(p['cob.acordoValorGerente']) && !garantia) return recusar(`Débito acima de ${brl(p['cob.acordoValorGerente'])}: descreva a garantia do acordo.`);
  const feriados = await feriadosDe();
  const entradaData = entrada > 0 ? proximoUtil(event.entradaData, feriados) : '';
  const parcelas = [...(entrada > 0 ? [{ n: 0, venc: entradaData, valor: entrada }] : []),
    ...parcelasAcordo(valor, entrada, n, event.primeiroVenc, intervalo, feriados)];
  const agoraTxt = agora();
  await escrever('ccEscCobAcordoInserir', {
    cobrancaId: inteiro(c.ID), debito, valor, entrada, entradaData, nParcelas: n, primeiroVenc: event.primeiroVenc, intervaloDias: intervalo,
    garantia, membroId: m.membroId, agora: agoraTxt,
  });
  const [novo] = await ler(`SELECT ID, NIVEL_EXIGIDO, MOTIVO_NIVEL FROM CC_ACORDO WHERE COBRANCA_ID = ${inteiro(c.ID)} AND SITUACAO = 'PROPOSTO'
  AND PROPOSTO_POR = ${inteiro(m.membroId)} AND PROPOSTO_EM = ${q(agoraTxt)}`);
  if (!novo) return recusar(MSG.SEM_PERMISSAO);
  for (let i = 0; i < parcelas.length; i += 20) {
    const lote = parcelas.slice(i, i + 20);
    await escrever('ccEscCobAcordoParcelasInserir', {
      acordoId: inteiro(novo.ID), n: lote.length, numeros: lote.map((x) => x.n).join('¦'), vencs: lote.map((x) => x.venc).join('¦'),
      valores: lote.map((x) => x.valor.toFixed(2)).join('¦'), membroId: m.membroId,
    });
  }
  await auditar('Acordos', 'ACORDO', novo.ID, c.CLIENTE_ID, [{ campo: '(proposta)', antes: '',
    depois: `${brl(valor)} (débito ${brl(debito)}), entrada ${brl(entrada)}, ${n} parcela(s); nível ${novo.NIVEL_EXIGIDO}${novo.MOTIVO_NIVEL ? `: ${novo.MOTIVO_NIVEL}` : ''}` }], m);
  const usuarioId = await usuarioDe(m, c);
  if (c.FASE_CHAVE !== 'negociacao') await kbMover(c, 'negociacao', usuarioId);
  await kbNota(c, `Acordo proposto: ${brl(valor)} em ${n} parcela(s)${entrada > 0 ? ` com entrada de ${brl(entrada)}` : ''}.`, usuarioId);
  return { ok: true, acordoId: inteiro(novo.ID), nivelExigido: inteiro(novo.NIVEL_EXIGIDO), motivoNivel: novo.MOTIVO_NIVEL, parcelas };
};

async function lerAcordo(acordoId) {
  const [a] = await ler(`SELECT * FROM CC_ACORDO WHERE ID = ${inteiro(acordoId)}`);
  return a || null;
}

/** Próxima ação do acordo: a menor parcela em aberto (ou limpa). */
async function proxAcaoDoAcordo(m, c, acordoId, agoraTxt) {
  const [pa] = await ler(`SELECT MIN(VENC) AS VENC FROM CC_ACORDO_PARCELA WHERE ACORDO_ID = ${inteiro(acordoId)} AND PAGO_EM IS NULL`);
  const prox = pa && pa.VENC ? ['Conferir pagamento da parcela', pa.VENC] : ['', ''];
  if (prox[0] !== c.PROX_ACAO || prox[1] !== (c.PROX_ACAO_DATA || '')) {
    await escrever('ccEscCobCasoProxAcao', { cobrancaId: inteiro(c.ID), proxAcao: prox[0], proxAcaoData: prox[1], membroId: m.membroId, agora: agoraTxt });
  }
  return prox;
}

const corpoAcordoDecidir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const a = await lerAcordo(event.acordoId);
  // A alçada não exige o cliente visível (04 §0, DT-35).
  if (!a) return recusar('Acordo não encontrado.');
  if (a.SITUACAO !== 'PROPOSTO') return recusar('Este acordo não está aguardando decisão.');
  if (inteiro(a.PROPOSTO_POR) === m.membroId) return recusar('Segregação: quem propôs o acordo não pode aprová-lo.');
  if (m.cargo === 'JURIDICO' || m.nivel < inteiro(a.NIVEL_EXIGIDO)) {
    return recusar(`Este acordo exige ${rotuloNivel(a.NIVEL_EXIGIDO)}${a.MOTIVO_NIVEL ? `: ${a.MOTIVO_NIVEL}` : ''}.`);
  }
  const aprovar = inteiro(event.aprovar) === 1;
  const parecer = texto(event.parecer, 1000);
  if (!aprovar && !parecer) return recusar('Informe o parecer da recusa.');
  const situacao = aprovar ? 'ATIVO' : 'RECUSADO';
  const agoraTxt = agora();
  await escrever('ccEscCobAcordoSituacao', { acordoId: inteiro(a.ID), situacao, parecer, membroId: m.membroId, agora: agoraTxt });
  const rel = await lerAcordo(a.ID);
  if (!rel || rel.SITUACAO !== situacao) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Acordos', 'ACORDO', a.ID, a.CLIENTE_ID, [{ campo: 'Situação', antes: 'PROPOSTO', depois: `${situacao}${parecer ? `: ${parecer}` : ''}` }], m);
  const c = await lerCaso(`CB.ID = ${inteiro(a.COBRANCA_ID)}`);
  const usuarioId = await usuarioDe(m, c);
  if (aprovar && c && !c.ENCERRADO_EM) {
    await proxAcaoDoAcordo(m, c, a.ID, agoraTxt);
    await kbMover(c, 'acordo', usuarioId);
    await kbNota(c, `Acordo aprovado: ${brl(a.VALOR)}.`, usuarioId);
  } else if (c) {
    await kbNota(c, `Acordo recusado: ${parecer}`, usuarioId);
  }
  return { ok: true, situacao };
};

const corpoAcordoParcelaPagar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [pa] = await ler(`SELECT * FROM CC_ACORDO_PARCELA WHERE ID = ${inteiro(event.parcelaId)}`);
  const a = pa ? await lerAcordo(pa.ACORDO_ID) : null;
  const c = a ? await lerCaso(`CB.ID = ${inteiro(a.COBRANCA_ID)}`) : null;
  if (!pa || !opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (a.SITUACAO !== 'ATIVO') return recusar('O acordo não está ativo.');
  if (pa.PAGO_EM) return recusar('Esta parcela já está paga.');
  const pagoEm = texto(event.pagoEm, 10) || hoje();
  if (!ehData(pagoEm) || pagoEm > hoje()) return recusar('A data do pagamento não pode ser futura.');
  const agoraTxt = agora();
  await escrever('ccEscCobAcordoParcelaPagar', { parcelaId: inteiro(pa.ID), pagoEm, membroId: m.membroId });
  const [rel] = await ler(`SELECT PAGO_EM FROM CC_ACORDO_PARCELA WHERE ID = ${inteiro(pa.ID)}`);
  if (!rel || rel.PAGO_EM !== pagoEm) return recusar(MSG.SEM_PERMISSAO);
  const [resto] = await ler(`SELECT COUNT(*) AS N, SUM(CASE WHEN N > 0 AND PAGO_EM IS NOT NULL THEN 1 ELSE 0 END) AS PAGAS FROM CC_ACORDO_PARCELA
WHERE ACORDO_ID = ${inteiro(a.ID)} AND (PAGO_EM IS NULL OR N > 0)`);
  const [abertas] = await ler(`SELECT COUNT(*) AS N FROM CC_ACORDO_PARCELA WHERE ACORDO_ID = ${inteiro(a.ID)} AND PAGO_EM IS NULL`);
  let situacao = 'ATIVO';
  if (inteiro(abertas.N) === 0) {
    await escrever('ccEscCobAcordoSituacao', { acordoId: inteiro(a.ID), situacao: 'QUITADO', parecer: '', membroId: m.membroId, agora: agoraTxt });
    situacao = 'QUITADO';
  }
  const prox = c.ENCERRADO_EM ? null : await proxAcaoDoAcordo(m, c, a.ID, agoraTxt);
  await auditar('Acordos', 'ACORDO_PARCELA', pa.ID, a.CLIENTE_ID, [{ campo: `Parcela ${pa.N}`, antes: '', depois: `paga em ${pagoEm}${situacao === 'QUITADO' ? ' (acordo quitado)' : ''}` }], m);
  if (!c.ENCERRADO_EM) {
    const pagas = inteiro(resto && resto.PAGAS);
    const capa = { acordo: JSON.stringify([{ rotulo: 'Acordo', texto: `${pagas} de ${inteiro(a.N_PARCELAS)}`, pct: Math.round((pagas / Math.max(1, inteiro(a.N_PARCELAS))) * 100) }]) };
    if (prox) Object.assign(capa, { proxima_acao: prox[0], proxima_acao_data: prox[1] });
    await kbAtualizar(c, capa, await usuarioDe(m, c));
  }
  return { ok: true, situacao };
};

const corpoAcordoCancelar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const a = await lerAcordo(event.acordoId);
  const c = a ? await lerCaso(`CB.ID = ${inteiro(a.COBRANCA_ID)}`) : null;
  if (!a || !c || !visivel(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (!nivelMin(m, 2)) return recusar('Cancelar acordo exige supervisor ou acima.');
  if (!['PROPOSTO', 'ATIVO'].includes(a.SITUACAO)) return recusar('Só acordo proposto ou ativo é cancelado.');
  const motivo = texto(event.motivo, 989); // 'Cancelado: ' + motivo cabe em CC_ACORDO.PARECER (1.000)
  if (!motivo) return recusar('Informe o motivo do cancelamento.');
  await escrever('ccEscCobAcordoSituacao', { acordoId: inteiro(a.ID), situacao: 'CANCELADO', parecer: `Cancelado: ${motivo}`, membroId: m.membroId, agora: agora() });
  const rel = await lerAcordo(a.ID);
  if (!rel || rel.SITUACAO !== 'CANCELADO') return recusar(MSG.SEM_PERMISSAO);
  await auditar('Acordos', 'ACORDO', a.ID, a.CLIENTE_ID, [{ campo: 'Situação', antes: a.SITUACAO, depois: `CANCELADO: ${motivo}` }], m);
  await kbNota(c, `Acordo cancelado: ${motivo}`, await usuarioDe(m, c));
  return { ok: true };
};

const corpoBaixaPropor = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.ENCERRADO_EM) return recusar('O caso está encerrado.');
  const motivo = texto(event.motivo, 60);
  if (!MOTIVOS_BAIXA.includes(motivo)) return recusar('Informe o motivo da baixa.');
  const valor = dinheiro(event.valor);
  if (!(valor > 0)) return recusar('O valor da baixa deve ser maior que zero.');
  const limite = Math.round((Number(c.VENCIDO) - Number(c.VALOR_BAIXADO || 0)) * 100) / 100;
  if (valor > limite) return recusar(`O valor da baixa passa do saldo vencido do caso (${brl(limite)}).`);
  const [pend] = await ler(`SELECT ID FROM CC_BAIXA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND SITUACAO = 'PENDENTE'`);
  if (pend) return recusar('Já há baixa pendente neste caso.');
  const agoraTxt = agora();
  const doc = (k) => (inteiro(event[k]) === 1 ? 1 : 0);
  await escrever('ccEscCobBaixaInserir', {
    cobrancaId: inteiro(c.ID), valor, motivo, docRegua: doc('docRegua'), docParecer: doc('docParecer'), docProtesto: doc('docProtesto'), docAcordo: doc('docAcordo'),
    obs: texto(event.obs, 1000), membroId: m.membroId, agora: agoraTxt,
  });
  const [nova] = await ler(`SELECT ID, NIVEL_EXIGIDO FROM CC_BAIXA WHERE COBRANCA_ID = ${inteiro(c.ID)} AND SITUACAO = 'PENDENTE' AND PROPOSTO_EM = ${q(agoraTxt)}`);
  if (!nova) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Baixas', 'BAIXA', nova.ID, c.CLIENTE_ID, [{ campo: '(proposta)', antes: '', depois: `${brl(valor)} · ${motivo} · nível ${nova.NIVEL_EXIGIDO}` }], m);
  const usuarioId = await usuarioDe(m, c);
  await kbAtualizar(c, { etiquetas: etiquetasNovas(c, ['Baixa pendente'], ['Baixa pendente']) }, usuarioId);
  await kbNota(c, `Baixa proposta: ${brl(valor)} (${motivo}).`, usuarioId);
  return { ok: true, baixaId: inteiro(nova.ID), nivelExigido: inteiro(nova.NIVEL_EXIGIDO) };
};

async function lerBaixa(baixaId) {
  const [b] = await ler(`SELECT * FROM CC_BAIXA WHERE ID = ${inteiro(baixaId)}`);
  return b || null;
}

const corpoBaixaParecer = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (m.cargo !== 'JURIDICO') return recusar('O parecer da baixa é do Jurídico.');
  const b = await lerBaixa(event.baixaId);
  if (!b || b.SITUACAO !== 'PENDENTE') return recusar('Baixa pendente não encontrada.');
  const resultado = texto(event.resultado, 12).toUpperCase();
  if (!['FAVORAVEL', 'DESFAVORAVEL'].includes(resultado)) return recusar('Informe o resultado do parecer.');
  const textoParecer = texto(event.texto, 1000);
  if (!textoParecer) return recusar('Escreva o parecer.');
  const agoraTxt = agora();
  await escrever('ccEscCobBaixaParecer', { baixaId: inteiro(b.ID), resultado, texto: textoParecer, membroId: m.membroId, agora: agoraTxt });
  const rel = await lerBaixa(b.ID);
  if (!rel || rel.PARECER_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Baixas', 'BAIXA', b.ID, b.CLIENTE_ID, [{ campo: 'Parecer do Jurídico', antes: b.PARECER_RESULTADO || '', depois: `${resultado}: ${textoParecer}` }], m);
  return { ok: true };
};

const corpoBaixaDecidir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const b = await lerBaixa(event.baixaId);
  if (!b || b.SITUACAO !== 'PENDENTE') return recusar('Baixa pendente não encontrada.');
  if (!b.PARECER_EM) return recusar('A baixa só é decidida com o parecer do Jurídico registrado.');
  if (inteiro(b.PROPOSTO_POR) === m.membroId) return recusar('Segregação: quem propôs a baixa não pode decidi-la.');
  if (m.cargo === 'JURIDICO' || m.nivel < inteiro(b.NIVEL_EXIGIDO)) return recusar(`Esta baixa exige ${rotuloNivel(b.NIVEL_EXIGIDO)}.`);
  const aprovar = inteiro(event.aprovar) === 1;
  const decisao = texto(event.texto, 1000);
  if (!aprovar && !decisao) return recusar('Informe o motivo da recusa.');
  const agoraTxt = agora();
  await escrever('ccEscCobBaixaDecidir', { baixaId: inteiro(b.ID), aprovar: aprovar ? 1 : 0, texto: decisao, membroId: m.membroId, agora: agoraTxt });
  const rel = await lerBaixa(b.ID);
  if (!rel || rel.SITUACAO !== (aprovar ? 'APROVADA' : 'RECUSADA')) return recusar(MSG.SEM_PERMISSAO);
  const c = await lerCaso(`CB.ID = ${inteiro(b.COBRANCA_ID)}`);
  let encerrado = false;
  if (aprovar && c && !c.ENCERRADO_EM) {
    const total = Number(c.VALOR_BAIXADO || 0) + Number(b.VALOR);
    encerrado = total >= Number(c.VENCIDO) - 0.004;
    await escrever('ccEscCobCasoEncerrar', { cobrancaId: inteiro(c.ID), desfecho: encerrado ? 'BAIXADO' : '', anuenciaAte: '', membroId: m.membroId, agora: agoraTxt });
  }
  await auditar('Baixas', 'BAIXA', b.ID, b.CLIENTE_ID, [{ campo: 'Decisão', antes: 'PENDENTE', depois: `${aprovar ? 'APROVADA' : 'RECUSADA'}${decisao ? `: ${decisao}` : ''}${encerrado ? ' (caso baixado)' : ''}` }], m);
  if (c && c.CARD_ID) {
    const usuarioId = await usuarioDe(m, c);
    await kbAtualizar(c, { etiquetas: etiquetasNovas(c, ['Baixa pendente'], []) }, usuarioId);
    if (encerrado) await kbMover(c, 'baixado', usuarioId);
    await kbNota(c, aprovar ? `Baixa aprovada: ${brl(b.VALOR)}${encerrado ? ' (caso baixado como perda)' : ' (parcial)'}.` : `Baixa recusada: ${decisao}`, usuarioId);
  }
  return { ok: true, situacao: aprovar ? 'APROVADA' : 'RECUSADA', encerrado };
};

const corpoAnuenciaRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await lerCaso(`CB.ID = ${inteiro(event.cobrancaId)}`);
  if (!opera(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.DESFECHO !== 'REGULARIZADO' || !ehVerdade(c.PROTESTADO)) return recusar('Carta de anuência só para caso regularizado depois de protestado.');
  if (c.ANUENCIA_EM) return recusar('A carta de anuência já foi registrada.');
  const enviar = event.enviarEmail === undefined || event.enviarEmail === '' ? 1 : inteiro(event.enviarEmail);
  let emailId = 0;
  if (enviar === 1) {
    const anexos = await ler(`SELECT NOME, URL FROM KB_ANEXO WHERE CARD_ID = ${inteiro(c.CARD_ID)} AND EXCLUIDO_EM IS NULL AND ${SQL_ANEXO_EM} >= ${q(String(c.ENCERRADO_EM || '').slice(0, 19))} ORDER BY ID`);
    if (!anexos.length) return recusar('Anexe a carta de anuência ao card antes de enviar.');
    const r = await escrever('ccEmailEnviar', {
      codigo: 'COB_ANUENCIA', clienteId: inteiro(c.CLIENTE_ID), contatoId: inteiro(event.contatoId), extras: JSON.stringify({ carteira: c.CARTEIRA }),
      anexos: JSON.stringify(anexos.map((x) => ({ nome: x.NOME, url: x.URL }))), origem: '002-anuencia', referencia: `cobranca:${inteiro(c.ID)}:anuencia`, membroId: m.membroId,
    });
    if (!r || r.ok === false) return recusar((r && r.error) || 'O envio falhou.');
    emailId = inteiro(r.emailId);
  }
  const agoraTxt = agora();
  await escrever('ccEscCobCasoAnuencia', { cobrancaId: inteiro(c.ID), membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT ANUENCIA_EM FROM CC_COBRANCA WHERE ID = ${inteiro(c.ID)}`);
  if (!rel || rel.ANUENCIA_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Cobrança', 'COBRANCA', c.ID, c.CLIENTE_ID, [{ campo: 'Carta de anuência', antes: '', depois: emailId ? `enviada (e-mail ${emailId})` : 'registrada' }], m);
  await kbAtualizar(c, { regularizado_3: '1', etiquetas: etiquetasNovas(c, ['Anuência pendente'], []) }, await usuarioDe(m, c));
  return { ok: true, emailId };
};

const corpoEnviarJuridico = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const carteira = texto(event.carteira, 10).toUpperCase();
  const p = await parametros(carteira);
  const nivelEnvio = p['jur.envioNivelMin'] === undefined || p['jur.envioNivelMin'] === null ? 3 : Number(p['jur.envioNivelMin']);
  if (m.nivel < nivelEnvio) return recusar('O envio ao Jurídico exige o gerente financeiro ou acima.');
  const cliente = await lerCliente(event.clienteId);
  if (!cliente || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const processoId = inteiro(event.processoId);
  let processo = null;
  try {
    [processo] = await ler(`SELECT ID, DOSSIE_ENVIADO_EM, AUTOS FROM CC_PROCESSO WHERE ID = ${processoId} AND CLIENTE_ID = ${inteiro(cliente.ID)} AND CARTEIRA = ${q(carteira)}`);
  } catch { processo = null; }
  if (!processo || !processo.DOSSIE_ENVIADO_EM) return recusar('Envie o dossiê pelo quadro Jurídico.');
  const agoraTxt = agora();
  const c = await lerCaso(`CB.CLIENTE_ID = ${inteiro(cliente.ID)} AND CB.CARTEIRA = ${q(carteira)} AND CB.ENCERRADO_EM IS NULL`);
  if (!c) {
    await escrever('ccEscBaseClienteJuridico', { clienteId: inteiro(cliente.ID), noJuridico: 1, membroId: m.membroId, agora: agoraTxt });
    await auditar('Cobrança', 'CLIENTE', cliente.ID, cliente.ID, [{ campo: 'Envio ao Jurídico', antes: '', depois: `processo ${processoId} (sem caso aberto)` }], m);
    return { ok: true, semCaso: true };
  }
  if (c.JURIDICO_EM && inteiro(c.PROCESSO_ID) === processoId) return { ok: true, jaEnviado: true, cobrancaId: inteiro(c.ID) };
  await escrever('ccEscCobCasoJuridico', { cobrancaId: inteiro(c.ID), processoId, membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT JURIDICO_EM, PROCESSO_ID FROM CC_COBRANCA WHERE ID = ${inteiro(c.ID)}`);
  if (!rel || !rel.JURIDICO_EM || inteiro(rel.PROCESSO_ID) !== processoId) return recusar(MSG.SEM_PERMISSAO);
  await escrever('ccEscCobAcaoInserir', { cobrancaId: inteiro(c.ID), faseChave: 'juridico', origem: 'JURIDICO', membroId: m.membroId, agora: agoraTxt });
  await escrever('ccEscBaseClienteJuridico', { clienteId: inteiro(cliente.ID), noJuridico: 1, membroId: m.membroId, agora: agoraTxt });
  await auditar('Cobrança', 'COBRANCA', c.ID, c.CLIENTE_ID, [{ campo: 'Envio ao Jurídico', antes: '', depois: `processo ${processoId}` }], m);
  const usuarioId = await usuarioDe(m, c);
  await kbMover(c, 'juridico', usuarioId);
  await kbNota(c, `Enviado ao Jurídico (processo ${processo.AUTOS || processoId}).`, usuarioId);
  return { ok: true, cobrancaId: inteiro(c.ID) };
};

/* ── sincronização do caso (rotina e etapa do órgão, 04 §2 ccCobCasoSincronizar) ── */

const corpoCasoSincronizar = async () => {
  const m = await quem();
  if (!m.rotina && !m.membroId) return recusar(MSG.NAO_MEMBRO);
  const cliente = await lerCliente(event.clienteId);
  const carteira = texto(event.carteira, 10).toUpperCase();
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (!['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(carteira)) return recusar('Carteira inválida.');
  const faseChave = texto(event.faseChave, 30);
  const desfecho = texto(event.desfecho, 16).toUpperCase();
  const capaJson = String(event.capaJson ?? '').trim() || '{}';
  let capa;
  try { capa = JSON.parse(capaJson) || {}; } catch { return recusar('Capa inválida.'); }
  const notaTexto = texto(event.nota, 1000);
  if (desfecho && !['REGULARIZADO', 'PAGO_NO_PRAZO', 'BAIXADO'].includes(desfecho)) return recusar('Desfecho inválido.');
  const quadro = `cobranca-${carteira.toLowerCase()}`;
  const fases = await ler(`SELECT CHAVE, FASE_ID, ORDEM, FINAL FROM CC_FASE WHERE QUADRO = ${q(quadro)} ORDER BY ORDEM`);
  const reguaPub = (ch) => carteira === 'PUBLICA' && fases.some((f) => f.CHAVE === ch && !ehVerdade(f.FINAL) && ch !== 'juridico');
  if (faseChave && !fases.some((f) => f.CHAVE === faseChave)) return recusar('Fase inexistente no quadro.');
  const c = await lerCaso(`CB.CLIENTE_ID = ${inteiro(cliente.ID)} AND CB.CARTEIRA = ${q(carteira)} AND CB.ENCERRADO_EM IS NULL`);
  if (!m.rotina) {
    if (m.cargo === 'JURIDICO' || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
    if (carteira !== 'PUBLICA') return recusar('Só o sistema muda a etapa desta carteira.');
    if (!c || desfecho) return { ok: true, pendente: true };
    if (faseChave && faseChave !== c.FASE_CHAVE && !(reguaPub(faseChave) && reguaPub(c.FASE_CHAVE))) return recusar('A etapa do órgão só anda entre as fases da régua.');
    if ((capa.etiquetas || []).some((e) => !['Acima de 2 meses', 'Pequeno valor'].includes(e))) return recusar('Etiqueta fora do que a etapa do órgão controla.');
  }
  const agoraTxt = agora();
  const responsavel = inteiro(event.responsavelUserId) || inteiro(cliente.AGENTE_USER_ID) || await usuarioRotina();
  const valoresCapa = () => {
    const { etiquetas: etq, ...campos } = capa;
    return Array.isArray(etq) ? { ...campos, etiquetas: etiquetasNovas(caso || {}, ['Acima de 2 meses', 'Pequeno valor'], etq) } : campos;
  };
  let caso = c;
  const mudou = []; // auditoria (01 §7): criação, etapa, próxima ação e encerramento; a capa não se audita
  const saida = { ok: true, cobrancaId: c ? inteiro(c.ID) : 0, cardId: c ? inteiro(c.CARD_ID) : 0, criado: false, movido: false, atualizado: false, encerrado: false, pendente: false };
  if (!caso) {
    if (desfecho || !faseChave) return saida;
    await escrever('ccEscCobCasoInserir', { clienteId: inteiro(cliente.ID), carteira, faseDevida: faseChave, dataRef: ehData(event.prazo) ? event.prazo : '', membroId: 0, agora: agoraTxt });
    caso = await lerCaso(`CB.CLIENTE_ID = ${inteiro(cliente.ID)} AND CB.CARTEIRA = ${q(carteira)} AND CB.ENCERRADO_EM IS NULL`);
    if (!caso) return recusar(MSG.SEM_PERMISSAO);
    const titulo = texto(event.titulo, 255) || `${cliente.CODCLI} · ${cliente.NOME}`;
    const [b] = await ler(`SELECT BOARD_ID FROM CC_FASE WHERE QUADRO = ${q(quadro)} LIMIT 1`);
    // ponytail: card órfão (criado e não gravado no caso) achado pelo título no quadro; ORIGEM_CHAVE quando a lib aceitar na criação.
    const [orfao] = await ler(`SELECT K.ID FROM KB_CARD K WHERE K.BOARD_ID = ${inteiro(b && b.BOARD_ID)}
  AND K.TITULO = ${q(titulo)} AND K.EXCLUIDO_EM IS NULL AND K.CONCLUIDO_EM IS NULL AND NOT EXISTS (SELECT 1 FROM CC_COBRANCA X WHERE X.CARD_ID = K.ID)`);
    let cardId = inteiro(orfao && orfao.ID);
    if (!cardId) {
      const r = await chamarKb('kbCardCriar', { boardId: inteiro(b && b.BOARD_ID), titulo, valoresJson: JSON.stringify(valoresCapa()), responsavelId: responsavel,
        prazo: ehData(event.prazo) ? event.prazo : '', criadoPor: responsavel, origem: 'sistema' });
      if (!r || r.ok === false) return recusar((r && r.error) || 'Não foi possível criar o card.');
      cardId = inteiro(r.id);
    }
    await escrever('ccEscCobCasoCard', { cobrancaId: inteiro(caso.ID), cardId, capa: capaJson === '{}' ? '' : capaJson, membroId: 0 });
    caso = await lerCaso(`CB.ID = ${inteiro(caso.ID)}`);
    if (caso.FASE_CHAVE !== faseChave) await kbMover(caso, faseChave, responsavel);
    Object.assign(saida, { cobrancaId: inteiro(caso.ID), cardId, criado: true });
    mudou.push({ campo: '(criação)', antes: '', depois: `${carteira} · ${faseChave}` });
  } else {
    const usuarioId = m.rotina ? (inteiro(caso.RESPONSAVEL_ID) || responsavel) : await usuarioDe(m, caso);
    let capaGravada = false;
    if (faseChave && faseChave !== caso.FASE_CHAVE && !desfecho) {
      const capaMudou = capaJson !== '{}' && capaJson !== (caso.CAPA_ENVIADA || '');
      await escrever('ccEscCobCasoCapa', { cobrancaId: inteiro(caso.ID), capa: capaMudou ? capaJson : '', faseDevida: faseChave, membroId: m.membroId || 0, agora: agoraTxt });
      const [rel] = await ler(`SELECT FASE_DEVIDA FROM CC_COBRANCA WHERE ID = ${inteiro(caso.ID)}`);
      if (!rel || rel.FASE_DEVIDA !== faseChave) return recusar(MSG.SEM_PERMISSAO);
      capaGravada = capaMudou;
      const r = await kbMover(caso, faseChave, usuarioId);
      if (r && r.ok === false) return recusar(r.error);
      saida.movido = true;
      mudou.push({ campo: 'Etapa', antes: caso.FASE_CHAVE || '', depois: faseChave });
      if (notaTexto) await kbNota(caso, notaTexto, usuarioId);
    }
    const capaNova = capaJson !== '{}' && capaJson !== (caso.CAPA_ENVIADA || '');
    // O prazo do card também é gravado quando só ele muda (achado da 005).
    if (capaNova || (ehData(event.prazo) && event.prazo !== (caso.CARD_PRAZO || ''))) {
      // A pessoa mexe só em capa e prazo: título e responsável do card são da rotina (04 §2).
      await kbAtualizar(caso, valoresCapa(), usuarioId, { titulo: m.rotina ? texto(event.titulo, 255) : '', prazo: ehData(event.prazo) ? event.prazo : (caso.CARD_PRAZO || ''),
        responsavelId: (m.rotina && inteiro(event.responsavelUserId)) || inteiro(caso.RESPONSAVEL_ID) });
      if (capaNova && !capaGravada) await escrever('ccEscCobCasoCapa', { cobrancaId: inteiro(caso.ID), capa: capaJson, faseDevida: '', membroId: m.membroId || 0, agora: agoraTxt });
      saida.atualizado = true;
    }
    const proxAcao = texto(event.proxAcao, 200);
    const proxData = ehData(event.proxAcaoData) ? event.proxAcaoData : '';
    if ((proxAcao || proxData) && (proxAcao !== caso.PROX_ACAO || proxData !== (caso.PROX_ACAO_DATA || ''))) {
      await escrever('ccEscCobCasoProxAcao', { cobrancaId: inteiro(caso.ID), proxAcao, proxAcaoData: proxData, membroId: m.membroId || 0, agora: agoraTxt });
      mudou.push({ campo: 'Próxima ação', antes: `${caso.PROX_ACAO || ''} ${caso.PROX_ACAO_DATA || ''}`.trim(), depois: `${proxAcao} ${proxData}`.trim() });
    }
    if (desfecho && m.rotina) {
      const p = await parametros(carteira);
      const anuenciaAte = desfecho === 'REGULARIZADO' && ehVerdade(caso.PROTESTADO) ? somarDiasUteis(hoje(), Number(p['cob.anuenciaDiasUteis']) || 5, await feriadosDe()) : '';
      await escrever('ccEscCobCasoEncerrar', { cobrancaId: inteiro(caso.ID), desfecho, anuenciaAte, membroId: 0, agora: agoraTxt });
      const final = { REGULARIZADO: 'regularizado', PAGO_NO_PRAZO: 'pago_no_prazo', BAIXADO: 'baixado' }[desfecho];
      if (anuenciaAte) await kbAtualizar(caso, { etiquetas: etiquetasNovas(caso, ['Anuência pendente'], ['Anuência pendente']) }, usuarioId);
      await kbMover(caso, final, usuarioId);
      if (notaTexto) await kbNota(caso, notaTexto, usuarioId);
      saida.encerrado = true;
      mudou.push({ campo: 'Encerramento', antes: caso.FASE_CHAVE || '', depois: desfecho });
    }
  }
  if (mudou.length) await auditar('Cobrança', 'COBRANCA', caso.ID, cliente.ID, mudou, m);
  return saida;
};

/* ── rotina, passo REGUA (05 §3.6) ── */

// ponytail: custos medidos no simulador (smoke RNF-005); se a plataforma contar diferente, ajuste aqui.
const CUSTO = { criar: 4, mover: 3, atualizar: 3, nota: 2, email: 6, auditar: 1 };

/** Caso com mudança desde `__DESDE__` (rodada incremental, 01 §11 e plan passo 1): domínio, posição, card, acordo, promessa, contato, ação, baixa ou agente. */
const MUDOU_SQL = `(CB.ATUALIZADO_EM >= __DESDE__ OR P.ALTERADO_EM >= __DESDE__
    OR ${KB_BRASILIA('K.ATUALIZADO_EM')} >= __DESDE__ OR ${KB_BRASILIA('K.FASE_DESDE')} >= __DESDE__
    OR (AG.USER_ID IS NOT NULL AND AG.USER_ID <> K.RESPONSAVEL_ID)
    OR EXISTS (SELECT 1 FROM CC_ACORDO AC WHERE AC.COBRANCA_ID = CB.ID
      AND (AC.PROPOSTO_EM >= __DESDE__ OR AC.DECIDIDO_EM >= __DESDE__ OR AC.ENCERRADO_EM >= __DESDE__))
    OR EXISTS (SELECT 1 FROM CC_PROMESSA PR WHERE PR.COBRANCA_ID = CB.ID AND PR.AVALIADA_EM >= __DESDE__)
    OR EXISTS (SELECT 1 FROM CC_CONTATO_COBRANCA KC WHERE KC.COBRANCA_ID = CB.ID AND KC.CRIADO_EM >= __DESDE__)
    OR EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = CB.ID AND AR.FEITA_EM >= __DESDE__)
    OR EXISTS (SELECT 1 FROM CC_BAIXA BX WHERE BX.COBRANCA_ID = CB.ID AND (BX.PROPOSTO_EM >= __DESDE__ OR BX.DECIDIDO_EM >= __DESDE__)))`;

const corpoRotina = async () => {
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina roda este passo.');
  const orcamento = Math.max(4, inteiro(event.orcamentoExec) || 140);
  // Relógio de parede (01 §11, 45 s), com 5 s de folga para a auditoria e a volta ao ccRotina; o que não couber fica pendente.
  const inicioMs = Date.now();
  const prazoMs = (event.orcamentoMs === undefined || event.orcamentoMs === '' ? 45000 : Number(event.orcamentoMs)) - 5000;
  const semTempo = () => Date.now() - inicioMs >= prazoMs;
  const resumo = { abertos: 0, movidos: 0, encerrados: 0, capas: 0, promessas: 0, acordosQuebrados: 0, fila: 0, emails: 0, juridico: 0 };
  if (semTempo()) return { ok: true, pendentes: 1, execucoes: 1, processados: 0, resumo };
  let gasto = 0;
  let pendentes = 0;
  let processados = 0;
  const dml = (s) => sdk.runDmlMitra({ projectId, sql: s });
  const v = (x) => (x === null || x === undefined ? 'NULL' : typeof x === 'number' ? String(x) : q(x));
  const em = (col, lista) => (lista.length ? `${col} IN (${lista.join(',')})` : '1 = 0');
  const hojeData = hoje();
  const agoraTxt = agora();
  const feriados = await feriadosDe();
  const P = {};
  for (const cart of ['PRIVADA', 'ESTETICA', 'PUBLICA']) P[cart] = await parametros(cart);
  const rotinaUser = await usuarioRotina();
  // Auditoria da rodada (01 §7): um lote por área e entidade, no fim.
  const aud = { cobranca: [], promessa: [], acordo: [] };
  const ops = { criar: [], mover: [], encerrar: [], email: [], capa: [], nota: [] };
  const agendar = (tipo, custo, fn, precisa) => ops[tipo].push({ custo, fn, precisa });

  // Conjunto de trabalho (01 §11): a primeira rodada completa do dia lê tudo; as outras, só o que mudou desde o início da última
  // rodada OK do passo. Parâmetro mudado vale para todos os casos.
  let desde = '';
  if (!(await rodadaCompleta('REGUA'))) {
    const [ult] = await ler("SELECT MAX(INICIO) AS EM FROM CC_ROTINA_PASSO WHERE PASSO = 'REGUA' AND SITUACAO = 'OK'");
    desde = String((ult && ult.EM) || '');
    if (desde) {
      const [pm] = await ler(`SELECT COUNT(*) AS N FROM CC_PARAMETRO WHERE ATUALIZADO_EM >= ${q(desde)}`);
      if (inteiro(pm && pm.N) > 0) desde = '';
    }
  }

  // Linha 8: promessas (todas as carteiras). Recebido entre o contato e o limite (data + tolerância) ≥ valor → CUMPRIDA.
  const promessas = await ler(`SELECT PR.ID, PR.CLIENTE_ID, PR.COBRANCA_ID, PR.DATA_CONTATO, PR.DATA_PROMETIDA, PR.VALOR, COALESCE(CB.CARTEIRA, 'PRIVADA') AS CARTEIRA,
  CB.DESFECHO, CB.ENCERRADO_EM
FROM CC_PROMESSA PR LEFT JOIN CC_COBRANCA CB ON CB.ID = PR.COBRANCA_ID WHERE PR.SITUACAO = 'ABERTA'`);
  const primeiroContato = promessas.reduce((x, pr) => (String(pr.DATA_CONTATO) < x ? String(pr.DATA_CONTATO) : x), '9999-12-31');
  const recebimentos = promessas.length ? await ler(`SELECT R.CLIENTE_ID, R.CARTEIRA, R.DATA_PAGAMENTO, R.VALOR_PAGO FROM CC_RECEBIMENTO R
WHERE R.ESTORNADO = FALSE AND R.DATA_PAGAMENTO >= ${q(primeiroContato)} AND ${em('R.CLIENTE_ID', [...new Set(promessas.map((x) => inteiro(x.CLIENTE_ID)))])}`) : [];
  const cumpridas = [];
  const quebradas = [];
  for (const pr of promessas) {
    const limite = somarDias(pr.DATA_PROMETIDA, Number(P[pr.CARTEIRA]['cob.promessaToleranciaDias']) || 0);
    const recebido = recebimentos.filter((r) => inteiro(r.CLIENTE_ID) === inteiro(pr.CLIENTE_ID) && r.CARTEIRA === pr.CARTEIRA
      && r.DATA_PAGAMENTO >= pr.DATA_CONTATO && r.DATA_PAGAMENTO <= limite).reduce((s, r) => s + Number(r.VALOR_PAGO), 0);
    const pagou = ['REGULARIZADO', 'PAGO_NO_PRAZO'].includes(pr.DESFECHO) || (recebido > 0 && recebido >= Number(pr.VALOR) - 0.005);
    if (!pagou && hojeData <= limite) continue;
    (pagou ? cumpridas : quebradas).push(inteiro(pr.ID));
    aud.promessa.push({ entidadeId: pr.ID, clienteId: pr.CLIENTE_ID, campo: 'Situação', antes: 'ABERTA', depois: pagou ? 'CUMPRIDA' : 'QUEBRADA' });
  }
  if (cumpridas.length) await dml(`UPDATE CC_PROMESSA SET SITUACAO = 'CUMPRIDA', AVALIADA_EM = ${q(agoraTxt)} WHERE SITUACAO = 'ABERTA' AND ID IN (${cumpridas.join(',')})`);
  if (quebradas.length) await dml(`UPDATE CC_PROMESSA SET SITUACAO = 'QUEBRADA', AVALIADA_EM = ${q(agoraTxt)} WHERE SITUACAO = 'ABERTA' AND ID IN (${quebradas.join(',')})`);
  resumo.promessas = cumpridas.length + quebradas.length;
  const quebradaAgora = new Set(promessas.filter((x) => quebradas.includes(inteiro(x.ID))).map((x) => inteiro(x.COBRANCA_ID)));

  // Linha 4: acordo ativo com parcela vencida há mais de cob.quebraDias → QUEBRADO.
  const ativos = await ler(`SELECT AC.ID, AC.CLIENTE_ID, AC.COBRANCA_ID, AC.CARTEIRA, MIN(PA.VENC) AS VENC FROM CC_ACORDO AC
JOIN CC_ACORDO_PARCELA PA ON PA.ACORDO_ID = AC.ID AND PA.PAGO_EM IS NULL WHERE AC.SITUACAO = 'ATIVO' GROUP BY AC.ID, AC.CLIENTE_ID, AC.COBRANCA_ID, AC.CARTEIRA`);
  const quebrados = ativos.filter((a) => a.VENC < somarDias(hojeData, -(Number(P[a.CARTEIRA]['cob.quebraDias']) || 0)));
  if (quebrados.length) {
    await dml(`UPDATE CC_ACORDO SET SITUACAO = 'QUEBRADO', ENCERRADO_EM = ${q(agoraTxt)}, PARECER = 'Quebrado pela rotina: parcela vencida.'
WHERE SITUACAO = 'ATIVO' AND ID IN (${quebrados.map((a) => inteiro(a.ID)).join(',')})`);
    for (const a of quebrados) aud.acordo.push({ entidadeId: a.ID, clienteId: a.CLIENTE_ID, campo: 'Situação', antes: 'ATIVO', depois: 'QUEBRADO (parcela vencida)' });
    // B5 C-05: a próxima ação gravada pelo acordo sai com ele (agenda e capa); a do agente fica.
    const casosDoAcordo = await ler(`SELECT ID, CLIENTE_ID, PROX_ACAO, PROX_ACAO_DATA FROM CC_COBRANCA WHERE ENCERRADO_EM IS NULL
  AND PROX_ACAO = 'Conferir pagamento da parcela' AND ${em('ID', quebrados.map((a) => inteiro(a.COBRANCA_ID)).filter(Boolean))}`);
    if (casosDoAcordo.length) {
      await dml(`UPDATE CC_COBRANCA SET PROX_ACAO = '', PROX_ACAO_DATA = NULL, ATUALIZADO_EM = ${q(agoraTxt)}
WHERE ENCERRADO_EM IS NULL AND PROX_ACAO = 'Conferir pagamento da parcela' AND ID IN (${casosDoAcordo.map((c) => inteiro(c.ID)).join(',')})`);
      for (const c of casosDoAcordo) aud.cobranca.push({ entidadeId: c.ID, clienteId: c.CLIENTE_ID, campo: 'Próxima ação', antes: `${c.PROX_ACAO} ${c.PROX_ACAO_DATA || ''}`.trim(), depois: '' });
    }
  }
  resumo.acordosQuebrados = quebrados.length;

  // Linha 14: processo ativo no Jurídico (lido antes: o cliente dele entra no conjunto de trabalho).
  let processos = [];
  try {
    processos = await ler(`SELECT PX.ID, PX.CLIENTE_ID, PX.CARTEIRA, PX.AUTOS FROM CC_PROCESSO PX WHERE PX.ENCERRADO_EM IS NULL
  AND (PX.DOSSIE_ENVIADO_EM IS NOT NULL OR PX.ORIGEM <> 'COBRANCA') ORDER BY PX.ID DESC`);
  } catch { processos = []; } // sem a 003, nenhum processo

  // Casos abertos do conjunto de trabalho, com card e posição da carteira.
  const comProcesso = [...new Set(processos.map((x) => inteiro(x.CLIENTE_ID)))];
  const filtro = desde ? `AND (${SQL_MUDOU.split('__DESDE__').join(q(desde))} OR ${em('CB.CLIENTE_ID', comProcesso)})` : '';
  const casos = await ler(`SELECT CB.*, C.CODCLI, C.NOME AS CLIENTE_NOME, AG.USER_ID AS AGENTE_USER_ID,
  K.FASE_ID, K.FASE_DESDE, K.VALORES_JSON, K.RESPONSAVEL_ID, K.PRAZO AS CARD_PRAZO, K.TITULO AS CARD_TITULO, K.CONCLUIDO_EM,
  F.CHAVE AS FASE_CHAVE, F.FINAL AS FASE_FINAL, KF.SLA_HORAS, CONCAT('cobranca-', LOWER(CB.CARTEIRA)) AS QUADRO,
  COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.A_VENCER, 0) AS A_VENCER, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO,
  P.VENC_MAIS_ANTIGO, P.PROX_VENC, COALESCE(P.PROX_VENC_VALOR, 0) AS PROX_VENC_VALOR
FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA
WHERE CB.ENCERRADO_EM IS NULL ${filtro} ORDER BY CB.ID`);
  const ids = casos.map((c) => inteiro(c.ID));
  const clientes = [...new Set(casos.map((c) => inteiro(c.CLIENTE_ID)))];
  const posDe = (c) => ({ vencido: c.VENCIDO, diasAtraso: c.DIAS_ATRASO, diasParaVencer: c.PROX_VENC ? diasEntre(hojeData, c.PROX_VENC) : null });
  const devidaDe = (c) => (CARTEIRAS_COM_REGUA.includes(c.CARTEIRA) ? faseDevida(posDe(c), P[c.CARTEIRA]) : '');
  const acordos = await ler(`SELECT AC.ID, AC.COBRANCA_ID, AC.SITUACAO, AC.ENCERRADO_EM, AC.N_PARCELAS,
  (SELECT COUNT(*) FROM CC_ACORDO_PARCELA PA WHERE PA.ACORDO_ID = AC.ID AND PA.N > 0 AND PA.PAGO_EM IS NOT NULL) AS PAGAS,
  (SELECT COUNT(*) FROM CC_ACORDO_PARCELA PA WHERE PA.ACORDO_ID = AC.ID AND PA.N = 0 AND PA.PAGO_EM IS NULL) AS ENTRADA_ABERTA
FROM CC_ACORDO AC WHERE ${em('AC.COBRANCA_ID', ids)} ORDER BY AC.ID`);
  const ultimoAcordo = new Map();
  for (const a of acordos) ultimoAcordo.set(inteiro(a.COBRANCA_ID), a);
  const contatos = new Map((await ler(`SELECT COBRANCA_ID, MAX(DATA) AS DATA FROM CC_CONTATO_COBRANCA WHERE ${em('COBRANCA_ID', ids)} GROUP BY COBRANCA_ID`))
    .map((l) => [inteiro(l.COBRANCA_ID), l.DATA]));
  const feitas = await ler(`SELECT COBRANCA_ID, FASE_CHAVE, ORIGEM FROM CC_ACAO_REGUA WHERE ${em('COBRANCA_ID', ids)}`);
  const feita = (id, fase) => feitas.some((a) => inteiro(a.COBRANCA_ID) === id && a.FASE_CHAVE === fase);
  const fila = new Set((await ler(`SELECT CHAVE FROM CC_EMAIL_FILA WHERE ${em('COBRANCA_ID', ids)}`)).map((l) => l.CHAVE));
  // E-mails da régua já enviados: só as referências dos casos lidos (fase do card e fase devida), em lotes.
  const refs = [...new Set(casos.flatMap((c) => [c.FASE_CHAVE, devidaDe(c)].filter((f) => MODELO_DA_FASE[f]).map((f) => q(`cobranca:${inteiro(c.ID)}:${f}`))))];
  const enviados = new Set();
  for (let i = 0; i < refs.length; i += 500) {
    for (const l of await ler(`SELECT REFERENCIA FROM CC_EMAIL_ENVIADO WHERE RESULTADO = 'ENVIADO' AND REFERENCIA IN (${refs.slice(i, i + 500).join(',')})`)) enviados.add(l.REFERENCIA);
  }
  const baixasPend = new Set((await ler(`SELECT COBRANCA_ID FROM CC_BAIXA WHERE SITUACAO = 'PENDENTE' AND ${em('COBRANCA_ID', ids)}`)).map((l) => inteiro(l.COBRANCA_ID)));
  const promessaVencida = new Set((await ler(`SELECT PR.COBRANCA_ID FROM CC_PROMESSA PR WHERE PR.SITUACAO = 'QUEBRADA' AND ${em('PR.COBRANCA_ID', ids)}
  AND NOT EXISTS (SELECT 1 FROM CC_CONTATO_COBRANCA KC WHERE KC.COBRANCA_ID = PR.COBRANCA_ID AND KC.CRIADO_EM > PR.AVALIADA_EM)`)).map((l) => inteiro(l.COBRANCA_ID)));
  const bus = await ler(`SELECT PB.CLIENTE_ID, PB.CARTEIRA, B.NOME, PB.VENCIDO + PB.A_VENCER AS VALOR FROM CC_POSICAO_CLIENTE_BU PB JOIN CC_BU B ON B.ID = PB.BU_ID
WHERE (PB.VENCIDO + PB.A_VENCER) > 0 AND ${em('PB.CLIENTE_ID', clientes)} ORDER BY B.ORDEM`);
  // "Já atrasou" (C-06): houve recebimento pago depois do vencimento desde o início do caso; sem recebimento nenhum, vale a fase
  // devida fora da preventiva (título que saiu do ERP sem pagamento). Pago até o vencimento é no prazo, seja qual for o dia da leitura.
  const zerados = casos.filter((c) => CARTEIRAS_COM_REGUA.includes(c.CARTEIRA) && !(Number(c.VENCIDO) > 0));
  const inicioDe = (c) => [String(c.ABERTO_EM || '').slice(0, 10), String(c.DATA_REF || '9999-12-31')].sort()[0];
  const pagamentos = zerados.length ? await ler(`SELECT CLIENTE_ID, CARTEIRA, DATA_PAGAMENTO, DIAS_ATRASO_PAGAMENTO FROM CC_RECEBIMENTO
WHERE ESTORNADO = FALSE AND ${em('CLIENTE_ID', [...new Set(zerados.map((c) => inteiro(c.CLIENTE_ID)))])}
  AND DATA_PAGAMENTO >= ${q(zerados.map(inicioDe).sort()[0])}`) : [];
  const atrasou = (c) => {
    const pags = pagamentos.filter((r) => inteiro(r.CLIENTE_ID) === inteiro(c.CLIENTE_ID) && r.CARTEIRA === c.CARTEIRA && r.DATA_PAGAMENTO >= inicioDe(c));
    return pags.some((r) => inteiro(r.DIAS_ATRASO_PAGAMENTO) > 0) || (!pags.length && !['', 'prev_d5', 'prev_d1', 'venc_d0'].includes(c.FASE_DEVIDA || ''));
  };
  const fases = await ler('SELECT QUADRO, CHAVE, FASE_ID, BOARD_ID, FINAL FROM CC_FASE');
  const faseId = (quadro, chave) => inteiro((fases.find((f) => f.QUADRO === quadro && f.CHAVE === chave) || {}).FASE_ID);
  const boardId = (quadro) => inteiro((fases.find((f) => f.QUADRO === quadro) || {}).BOARD_ID);
  const quemMove = (c) => inteiro(c.RESPONSAVEL_ID) || rotinaUser;
  const nota = (c, textoNota) => agendar('nota', CUSTO.nota, () => chamarKb('kbNotaRegistrar', { cardId: inteiro(c.CARD_ID), texto: textoNota, usuarioId: quemMove(c) }));
  const mover = (c, chave, textoNota, tipo = 'mover') => {
    const destino = faseId(c.QUADRO, chave);
    if (!c.CARD_ID || !destino) return;
    agendar(tipo, CUSTO.mover, async () => {
      const r = await chamarKb('kbCardMover', { cardId: inteiro(c.CARD_ID), faseId: destino, ordem: 0, movidoPor: quemMove(c), origem: 'sistema' });
      if (r && r.ok === false) throw new Error(`kbCardMover ${c.CARD_ID} → ${chave}: ${r.error}`);
      resumo.movidos += 1;
      if (tipo === 'mover') aud.cobranca.push({ entidadeId: c.ID, clienteId: c.CLIENTE_ID, campo: 'Etapa', antes: c.FASE_CHAVE || '', depois: chave });
      if (textoNota) nota(c, textoNota);
    });
  };

  /** Capa desejada do caso (linha 13) e o texto canônico que vai a CAPA_ENVIADA. */
  const capaDe = (c, extra) => {
    const id = inteiro(c.ID);
    const p = P[c.CARTEIRA];
    const fase = extra.fase;
    const def = itensDe(c.CARTEIRA, fase);
    const valores = {};
    if (feita(id, fase)) for (const n of def.acao) valores[`${fase}_${n}`] = '1';
    if (def.email && enviados.has(`cobranca:${id}:${fase}`)) valores[`${fase}_${def.email}`] = '1';
    if (c.CARTEIRA === 'PUBLICA') {
      valores.etiquetas = etiquetasNovas(c, ['Promessa vencida', 'Baixa pendente'],
        [...(promessaVencida.has(id) ? ['Promessa vencida'] : []), ...(baixasPend.has(id) ? ['Baixa pendente'] : [])]);
      return { valores, prazo: c.CARD_PRAZO || '', canon: '' };
    }
    const a = ultimoAcordo.get(id);
    const ult = contatos.get(id) || '';
    const r = capaDoCaso({
      preventivo: !(Number(c.VENCIDO) > 0), vencido: c.VENCIDO, aVencer: c.A_VENCER, proxVenc: c.PROX_VENC, vencMaisAntigo: c.VENC_MAIS_ANTIGO,
      bus: bus.filter((b) => inteiro(b.CLIENTE_ID) === inteiro(c.CLIENTE_ID) && b.CARTEIRA === c.CARTEIRA).map((b) => ({ nome: b.NOME, valor: b.VALOR })),
      proxAcao: c.PROX_ACAO, proxAcaoData: c.PROX_ACAO_DATA, bloqueioDevido: c.BLOQUEIO_DEVIDO,
      acordo: a && a.SITUACAO === 'ATIVO' ? { pagas: inteiro(a.PAGAS), n: inteiro(a.N_PARCELAS) } : null,
      temAcao: def.acao.length > 0, acaoFeita: feita(id, fase), ultimoContato: ult,
      diasAtraso: c.DIAS_ATRASO, protestado: ehVerdade(c.PROTESTADO), bloqueioAplicado: c.BLOQUEIO_APLICADO,
      promessaVencida: promessaVencida.has(id),
      semContato: diasEntre(ult || String(c.ABERTO_EM).slice(0, 10), hojeData) > Number(p['cob.semContatoDias']),
      anuenciaPendente: false, baixaPendente: baixasPend.has(id), juridicoEm: c.JURIDICO_EM,
    }, p);
    const campos = Object.fromEntries(Object.entries(r.campos).map(([k, x]) => [k, typeof x === 'number' ? x.toFixed(2) : x]));
    Object.assign(valores, campos, { etiquetas: etiquetasNovas(c, ETIQUETAS_PRIVADA, r.etiquetas) });
    const canon = JSON.stringify({ campos, etiquetas: [...r.etiquetas].sort(), itens: Object.keys(valores).filter((k) => /_\d+$/.test(k)).sort(),
      prazo: r.prazo, responsavel: inteiro(c.AGENTE_USER_ID) }).replace(/\\/g, ''); // como q() grava (sem barra invertida)
    return { valores, prazo: r.prazo, canon };
  };

  const fechados = [];
  for (let i = 0; i < casos.length; i += 1) {
    if (semTempo()) { pendentes += casos.length - i; break; }
    const c = casos[i];
    processados += 1;
    const id = inteiro(c.ID);
    const cart = c.CARTEIRA;
    const p = P[cart];
    const set = {};
    const fase = c.FASE_CHAVE || '';
    let faseAlvo = fase;
    const regua = CARTEIRAS_COM_REGUA.includes(cart);
    const devida = devidaDe(c);
    const zerado = !(Number(c.VENCIDO) > 0);

    // Linha 6: vencido zerou → encerra, inclusive em `juridico` (05 §3.6); protestado → prazo da carta de anuência.
    // Preventiva em curso (o título que abriu o ciclo ainda é o próximo vencimento e há fase devida) não encerra, nem por pagamento
    // atrasado de outro título: encerrar e reabrir o mesmo ciclo na rodada seguinte não termina nunca (sim:seed, 17/11).
    const segue = devida && c.PROX_VENC === c.DATA_REF;
    const encerra = regua && zerado && !segue ? (atrasou(c) ? 'REGULARIZADO' : 'PAGO_NO_PRAZO') : '';
    if (encerra) {
      const anuenciaAte = encerra === 'REGULARIZADO' && ehVerdade(c.PROTESTADO) ? somarDiasUteis(hojeData, Number(p['cob.anuenciaDiasUteis']) || 5, feriados) : '';
      await dml(`UPDATE CC_COBRANCA SET ENCERRADO_EM = ${q(agoraTxt)}, DESFECHO = ${q(encerra)}, ATIVO_CHAVE = NULL, BLOQUEIO_DEVIDO = '',
  ANUENCIA_ATE = ${anuenciaAte ? q(anuenciaAte) : 'NULL'}, ATUALIZADO_EM = ${q(agoraTxt)} WHERE ID = ${id} AND ENCERRADO_EM IS NULL`);
      await dml(`UPDATE CC_EMAIL_FILA SET SITUACAO = 'FORA', OBS = 'Caso encerrado.' WHERE COBRANCA_ID = ${id} AND SITUACAO = 'PENDENTE'`);
      aud.cobranca.push({ entidadeId: id, clienteId: c.CLIENTE_ID, campo: 'Encerramento', antes: fase, depois: encerra });
      resumo.encerrados += 1;
      fechados.push(inteiro(c.CLIENTE_ID));
      if (c.CARD_ID) {
        const final = encerra === 'REGULARIZADO' ? 'regularizado' : 'pago_no_prazo';
        agendar('encerrar', CUSTO.mover + CUSTO.nota + (anuenciaAte ? CUSTO.atualizar : 0), async () => {
          if (anuenciaAte) await kbAtualizar(c, { etiquetas: etiquetasNovas(c, ['Anuência pendente'], ['Anuência pendente']) }, quemMove(c));
          await chamarKb('kbCardMover', { cardId: inteiro(c.CARD_ID), faseId: faseId(c.QUADRO, final), ordem: 0, movidoPor: quemMove(c), origem: 'sistema' });
          await chamarKb('kbNotaRegistrar', { cardId: inteiro(c.CARD_ID), texto: encerra === 'REGULARIZADO' ? 'Regularizado' : 'Pago no vencimento', usuarioId: quemMove(c) });
        });
      }
      continue;
    }

    // Linha 14: processo ativo no Jurídico (todas as carteiras).
    const proc = processos.find((x) => inteiro(x.CLIENTE_ID) === inteiro(c.CLIENTE_ID) && x.CARTEIRA === cart);
    if (proc && fase !== 'juridico' && c.CARD_ID) {
      if (!c.JURIDICO_EM) set.JURIDICO_EM = agoraTxt;
      if (inteiro(c.PROCESSO_ID) !== inteiro(proc.ID)) set.PROCESSO_ID = inteiro(proc.ID);
      mover(c, 'juridico', `Processo no Jurídico: ${proc.AUTOS || proc.ID}`);
      faseAlvo = 'juridico';
      resumo.juridico += 1;
    }

    if (regua) {
      const a = ultimoAcordo.get(id);
      const bloq = bloqueioDevido(posDe(c), p, !!a && a.SITUACAO === 'ATIVO' && inteiro(a.ENTRADA_ABERTA) === 0);
      if (bloq !== (c.BLOQUEIO_DEVIDO || '')) {
        set.BLOQUEIO_DEVIDO = bloq;
        if (c.CARD_ID) nota(c, `Bloqueio devido: ${bloq ? bloq.toLowerCase() : 'nenhum (liberar no ERP)'}`);
      }
      if (devida && devida !== c.FASE_DEVIDA) set.FASE_DEVIDA = devida;
      // Na régua DATA_REF acompanha o vencimento mais antigo; na preventiva fica o vencimento que abriu o ciclo.
      if (!zerado && c.VENC_MAIS_ANTIGO && c.VENC_MAIS_ANTIGO !== c.DATA_REF) set.DATA_REF = c.VENC_MAIS_ANTIGO;
      else if (!c.DATA_REF) set.DATA_REF = (zerado ? c.PROX_VENC : c.VENC_MAIS_ANTIGO) || hojeData;
      // Linhas 2 a 5: a régua anda sozinha; acordo e negociação só voltam pelo domínio; jurídico não sai.
      if (faseAlvo !== 'juridico' && devida) {
        if (FASES_REGUA.includes(fase) && fase !== devida) { mover(c, devida, `Régua: ${nomeDaFase(devida, p)}`); faseAlvo = devida; }
        else if (fase === 'acordo' && a && ['QUEBRADO', 'CANCELADO'].includes(a.SITUACAO)) {
          mover(c, devida, a.SITUACAO === 'QUEBRADO' ? 'Acordo quebrado' : `Régua: ${nomeDaFase(devida, p)}`); faseAlvo = devida;
        } else if (fase === 'negociacao' && a && a.SITUACAO === 'CANCELADO' && String(a.ENCERRADO_EM || '') >= brasilia(c.FASE_DESDE)) {
          mover(c, devida, `Régua: ${nomeDaFase(devida, p)}`); faseAlvo = devida;
        }
      }
      // Linha 12: itens ● marcados direto no card.
      const def = itensDe(cart, fase);
      const valores = valoresDe(c.VALORES_JSON);
      const marcado = (n) => String(valores[`${fase}_${n}`] ?? '') === '1';
      if (def.acao.length && fase === faseAlvo && !feita(id, fase) && def.acao.every(marcado)) {
        await dml(`INSERT IGNORE INTO CC_ACAO_REGUA (COBRANCA_ID, CLIENTE_ID, FASE_CHAVE, FEITA_EM, FEITA_POR, ORIGEM, NO_PRAZO)
SELECT CB.ID, CB.CLIENTE_ID, ${q(fase)}, ${q(agoraTxt)}, NULL, 'CARD', ${SQL_NO_PRAZO}
FROM CC_COBRANCA CB JOIN KB_CARD K ON K.ID = CB.CARD_ID JOIN KB_FASE KF ON KF.ID = K.FASE_ID WHERE CB.ID = ${id}`);
        feitas.push({ COBRANCA_ID: id, FASE_CHAVE: fase, ORIGEM: 'CARD' });
        aud.cobranca.push({ entidadeId: id, clienteId: c.CLIENTE_ID, campo: `Ação de ${fase}`, antes: '', depois: 'registrada pelo card' });
      }
      if (fase === 'protesto' && marcado(1) && !ehVerdade(c.PROTESTADO)) {
        set.PROTESTADO = true;
        aud.cobranca.push({ entidadeId: id, clienteId: c.CLIENTE_ID, campo: 'Protestado', antes: 'Não', depois: 'Sim (marcado no card)' });
      }
      // Linhas 10 e 11: e-mail da fase (fila ou envio automático).
      const modo = p[`cob.emailModo.${faseAlvo}`];
      const chaveFila = `${id}:${faseAlvo}`;
      if (MODELO_DA_FASE[faseAlvo] && fase === faseAlvo && !feita(id, faseAlvo) && !enviados.has(`cobranca:${id}:${faseAlvo}`)) {
        if (modo !== 'AUTOMATICO' && !fila.has(chaveFila)) {
          const valorFila = zerado ? Number(c.PROX_VENC_VALOR) : Number(c.VENCIDO);
          await dml(`INSERT IGNORE INTO CC_EMAIL_FILA (COBRANCA_ID, CLIENTE_ID, FASE_CHAVE, DATA_REF, CHAVE, VALOR, SITUACAO, CRIADO_EM)
VALUES (${id}, ${inteiro(c.CLIENTE_ID)}, ${q(faseAlvo)}, ${q(set.DATA_REF || c.DATA_REF || hojeData)}, ${q(chaveFila)}, ${valorFila.toFixed(2)}, 'PENDENTE', ${q(agoraTxt)})`);
          fila.add(chaveFila);
          resumo.fila += 1;
        } else if (modo === 'AUTOMATICO' && ops.email.length < 5) {
          agendar('email', CUSTO.email, async () => {
            const r = await enviarDaRegua({ membroId: 0, rotina: true }, { ...c, FASE_CHAVE: faseAlvo });
            if (r.erro) { aud.cobranca.push({ entidadeId: id, clienteId: c.CLIENTE_ID, campo: `E-mail ${faseAlvo}`, antes: '', depois: `não enviado: ${r.erro}` }); return; }
            enviados.add(`cobranca:${id}:${faseAlvo}`);
            resumo.emails += 1;
            if (r.completa) feitas.push({ COBRANCA_ID: id, FASE_CHAVE: faseAlvo, ORIGEM: 'EMAIL' });
          });
        }
      }
    }
    const novos = Object.entries(set);
    if (novos.length) {
      await dml(`UPDATE CC_COBRANCA SET ${novos.map(([k, x]) => `${k} = ${typeof x === 'boolean' ? (x ? 'TRUE' : 'FALSE') : v(x)}`).join(', ')},
  ATUALIZADO_EM = ${q(agoraTxt)} WHERE ID = ${id}`);
      Object.assign(c, set);
      if (set.BLOQUEIO_DEVIDO !== undefined) aud.cobranca.push({ entidadeId: id, clienteId: c.CLIENTE_ID, campo: 'Bloqueio devido', antes: '', depois: set.BLOQUEIO_DEVIDO || 'nenhum' });
      if (set.JURIDICO_EM || set.PROCESSO_ID) aud.cobranca.push({ entidadeId: id, clienteId: c.CLIENTE_ID, campo: 'Processo no Jurídico', antes: '', depois: String(proc.ID) });
    }
    // Linha 13: capa, itens e responsável (depois dos e-mails, que marcam o ✉).
    if (c.CARD_ID) {
      let capa = null;
      agendar('capa', CUSTO.atualizar, async () => {
        const responsavel = inteiro(c.AGENTE_USER_ID) || inteiro(c.RESPONSAVEL_ID);
        const r = await kbAtualizar(c, capa.valores, responsavel || rotinaUser, cart === 'PUBLICA' ? { responsavelId: responsavel } : { prazo: capa.prazo, responsavelId: responsavel });
        if (r && r.ok === false) throw new Error(`kbCardAtualizar ${c.CARD_ID}: ${r.error}`);
        if (cart !== 'PUBLICA') await dml(`UPDATE CC_COBRANCA SET CAPA_ENVIADA = ${q(capa.canon)} WHERE ID = ${id}`);
        resumo.capas += 1;
        return true;
      }, () => {
        capa = capaDe(c, { fase: faseAlvo });
        const responsavel = inteiro(c.AGENTE_USER_ID) || inteiro(c.RESPONSAVEL_ID);
        const atuais = valoresDe(faseAlvo === fase ? c.VALORES_JSON : '{}');
        const faltaItem = Object.keys(capa.valores).some((k) => /_\d+$/.test(k) && String(atuais[k] ?? '') !== '1');
        return cart === 'PUBLICA'
          ? (faltaItem || responsavel !== inteiro(c.RESPONSAVEL_ID) || JSON.stringify(capa.valores.etiquetas) !== JSON.stringify((valoresDe(c.VALORES_JSON).etiquetas || []).map(String)))
          : (capa.canon !== (c.CAPA_ENVIADA || '') || faltaItem || responsavel !== inteiro(c.RESPONSAVEL_ID));
      });
    }
    if (quebradaAgora.has(id) && c.CARD_ID) nota(c, 'Promessa quebrada');
  }

  // Casos encerrados fora da rotina (baixa) com o card fora da fase final.
  const soltos = await ler(`SELECT CB.ID, CB.CARD_ID, CB.DESFECHO, K.RESPONSAVEL_ID, CONCAT('cobranca-', LOWER(CB.CARTEIRA)) AS QUADRO FROM CC_COBRANCA CB
JOIN KB_CARD K ON K.ID = CB.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE CB.ENCERRADO_EM IS NOT NULL AND CB.DESFECHO <> '' AND F.FINAL = FALSE AND K.EXCLUIDO_EM IS NULL`);
  for (const s of soltos) mover(s, { REGULARIZADO: 'regularizado', PAGO_NO_PRAZO: 'pago_no_prazo', BAIXADO: 'baixado' }[s.DESFECHO], '', 'encerrar');

  // Linha 1: abre o caso (régua por dias) onde a posição pede e não há caso aberto; fora da rodada completa, só posição mudada
  // ou cliente cujo caso acabou de fechar.
  const candidatos = semTempo() ? [] : await ler(`SELECT P.CLIENTE_ID, P.CARTEIRA, P.VENCIDO, P.A_VENCER, P.DIAS_ATRASO, P.VENC_MAIS_ANTIGO, P.PROX_VENC, P.PROX_VENC_VALOR,
  C.CODCLI, C.NOME AS CLIENTE_NOME, AG.USER_ID AS AGENTE_USER_ID,
  (SELECT X.ENCERRADO_EM FROM CC_COBRANCA X WHERE X.CLIENTE_ID = P.CLIENTE_ID AND X.CARTEIRA = P.CARTEIRA AND X.DESFECHO = 'BAIXADO'
     AND X.ID = (SELECT MAX(Y.ID) FROM CC_COBRANCA Y WHERE Y.CLIENTE_ID = P.CLIENTE_ID AND Y.CARTEIRA = P.CARTEIRA)) AS BAIXADO_EM
FROM CC_POSICAO_CLIENTE_CARTEIRA P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
WHERE P.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND (P.VENCIDO > 0 OR P.PROX_VENC IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM CC_COBRANCA X WHERE X.CLIENTE_ID = P.CLIENTE_ID AND X.CARTEIRA = P.CARTEIRA AND X.ENCERRADO_EM IS NULL)
  ${desde ? `AND (P.ALTERADO_EM >= ${q(desde)} OR ${em('P.CLIENTE_ID', fechados)})` : ''}
ORDER BY P.VENCIDO DESC, P.CLIENTE_ID`);
  for (const n of candidatos) {
    const p = P[n.CARTEIRA];
    const pos = posDe(n);
    const devida = faseDevida(pos, p);
    if (!devida) continue;
    if (n.BAIXADO_EM && n.VENC_MAIS_ANTIGO && n.VENC_MAIS_ANTIGO <= String(n.BAIXADO_EM).slice(0, 10)) continue;
    const quadro = `cobranca-${n.CARTEIRA.toLowerCase()}`;
    agendar('criar', CUSTO.criar + CUSTO.mover, async () => {
      const chave = `${inteiro(n.CLIENTE_ID)}:${n.CARTEIRA}`;
      const dataRef = (Number(n.VENCIDO) > 0 ? n.VENC_MAIS_ANTIGO : n.PROX_VENC) || hojeData;
      await dml(`INSERT INTO CC_COBRANCA (CLIENTE_ID, CARTEIRA, ATIVO_CHAVE, ABERTO_EM, DATA_REF, FASE_DEVIDA, BLOQUEIO_DEVIDO, ATUALIZADO_EM)
SELECT ${inteiro(n.CLIENTE_ID)}, ${q(n.CARTEIRA)}, ${q(chave)}, ${q(agoraTxt)}, ${q(dataRef)}, ${q(devida)}, ${q(bloqueioDevido(pos, p))}, ${q(agoraTxt)} FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM CC_COBRANCA X WHERE X.ATIVO_CHAVE = ${q(chave)})`);
      const [caso] = await ler(`SELECT * FROM CC_COBRANCA WHERE ATIVO_CHAVE = ${q(chave)}`);
      if (!caso || caso.CARD_ID) return false;
      const titulo = `${n.CODCLI} · ${n.CLIENTE_NOME}`;
      const responsavel = inteiro(n.AGENTE_USER_ID) || rotinaUser;
      // ponytail: card órfão (criado e não gravado no caso) achado pelo título no quadro; ORIGEM_CHAVE quando a lib aceitar na criação.
      const [orfao] = await ler(`SELECT K.ID FROM KB_CARD K WHERE K.BOARD_ID = ${boardId(quadro)} AND K.TITULO = ${q(titulo)} AND K.EXCLUIDO_EM IS NULL
  AND K.CONCLUIDO_EM IS NULL AND NOT EXISTS (SELECT 1 FROM CC_COBRANCA X WHERE X.CARD_ID = K.ID)`);
      let cardId = inteiro(orfao && orfao.ID);
      if (!cardId) {
        const r = await chamarKb('kbCardCriar', { boardId: boardId(quadro), titulo, valoresJson: '{}', responsavelId: responsavel,
          prazo: dataRef, criadoPor: responsavel, origem: 'sistema' });
        if (!r || r.ok === false) throw new Error(`kbCardCriar ${titulo}: ${r && r.error}`);
        cardId = inteiro(r.id);
      }
      await dml(`UPDATE CC_COBRANCA SET CARD_ID = ${cardId} WHERE ID = ${inteiro(caso.ID)}`);
      const [k] = await ler(`SELECT FASE_ID FROM KB_CARD WHERE ID = ${cardId}`);
      if (inteiro(k && k.FASE_ID) !== faseId(quadro, devida)) {
        await chamarKb('kbCardMover', { cardId, faseId: faseId(quadro, devida), ordem: 0, movidoPor: responsavel, origem: 'sistema' });
      }
      aud.cobranca.push({ entidadeId: caso.ID, clienteId: n.CLIENTE_ID, campo: '(criação)', antes: '', depois: `${n.CARTEIRA} · ${devida}` });
      resumo.abertos += 1;
      return true;
    });
  }

  // Execução por prioridade dentro do orçamento (execuções e relógio); o que não coube fica pendente para a próxima rodada.
  const RESERVA = 3 * CUSTO.auditar;
  for (const tipo of ['criar', 'mover', 'encerrar', 'email', 'capa', 'nota']) {
    for (let i = 0; i < ops[tipo].length; i += 1) {
      const op = ops[tipo][i];
      if (op.precisa && !op.precisa()) continue;
      if (semTempo() || gasto + op.custo + RESERVA > orcamento) { pendentes += 1; continue; }
      const r = await op.fn();
      if (r !== false) gasto += op.custo;
    }
  }
  const rotina = { membroId: 0, rotina: true };
  for (const [area, entidade, linhas] of [['Cobrança', 'COBRANCA', aud.cobranca], ['Cobrança', 'PROMESSA', aud.promessa], ['Acordos', 'ACORDO', aud.acordo]]) {
    if (linhas.length) { await auditarLinhas(area, entidade, linhas, rotina); gasto += CUSTO.auditar; }
  }
  // Caso aberto nesta rodada tem capa e fila na seguinte.
  return { ok: true, pendentes: pendentes + resumo.abertos, execucoes: Math.max(1, gasto), processados, resumo };
};

/* ── escritas internas (forma A, guarda na SQL) ── */

const OPERA_CB = OPERA_SQL('CB.CLIENTE_ID');
const NA_REGUA_PUB_CB = CARD_NA_REGUA_PUB('CB');
const VISIVEL_A = (clienteExpr) => `EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = ${clienteExpr} AND ${clienteVisivelA('C', 'A')})`;

const ESCRITAS = {
  ccEscCobCasoInserir: `INSERT INTO CC_COBRANCA (CLIENTE_ID, CARTEIRA, ATIVO_CHAVE, ABERTO_EM, DATA_REF, FASE_DEVIDA, ATUALIZADO_EM)
SELECT C.ID, '{{carteira}}', CONCAT(C.ID, ':', '{{carteira}}'), '{{agora}}', NULLIF('{{dataRef}}', ''), '{{faseDevida}}', '{{agora}}'
FROM CC_CLIENTE C
WHERE C.ID = {{clienteId}} AND '{{carteira}}' IN ('PRIVADA', 'ESTETICA', 'PUBLICA') AND ${ROTINA}
  AND NOT EXISTS (SELECT 1 FROM CC_COBRANCA X WHERE X.CLIENTE_ID = C.ID AND X.CARTEIRA = '{{carteira}}' AND X.ENCERRADO_EM IS NULL)`,

  ccEscCobCasoCard: `UPDATE CC_COBRANCA SET CARD_ID = {{cardId}}, CAPA_ENVIADA = NULLIF('{{capa}}', '')
WHERE ID = {{cobrancaId}} AND CARD_ID IS NULL AND ${ROTINA}`,

  ccEscCobCasoCapa: `UPDATE CC_COBRANCA AS CB SET
  CAPA_ENVIADA = CASE WHEN '{{capa}}' = '' THEN CB.CAPA_ENVIADA ELSE '{{capa}}' END,
  FASE_DEVIDA = CASE WHEN '{{faseDevida}}' = '' THEN CB.FASE_DEVIDA ELSE '{{faseDevida}}' END,
  ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL
  AND (${ROTINA} OR (CB.CARTEIRA = 'PUBLICA' AND ${OPERA_CB}
    AND ('{{faseDevida}}' = '' OR (${FASE_REGUA_PUB("'{{faseDevida}}'")} AND ${NA_REGUA_PUB_CB}))))`,

  ccEscCobCasoProxAcao: `UPDATE CC_COBRANCA AS CB SET PROX_ACAO = '{{proxAcao}}', PROX_ACAO_DATA = NULLIF('{{proxAcaoData}}', ''), ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL
  AND (${ROTINA} OR ${OPERA_CB})`,

  // B-02: VALOR_BAIXADO é a soma das baixas aprovadas (repetir não soma de novo); BAIXADO só quando ela alcança o vencido.
  ccEscCobCasoEncerrar: `UPDATE CC_COBRANCA AS CB SET
  VALOR_BAIXADO = (SELECT COALESCE(SUM(BS.VALOR), 0) FROM CC_BAIXA BS WHERE BS.COBRANCA_ID = CB.ID AND BS.SITUACAO = 'APROVADA'),
  ENCERRADO_EM = CASE WHEN '{{desfecho}}' = '' THEN CB.ENCERRADO_EM ELSE '{{agora}}' END,
  DESFECHO = CASE WHEN '{{desfecho}}' = '' THEN CB.DESFECHO ELSE '{{desfecho}}' END,
  ATIVO_CHAVE = CASE WHEN '{{desfecho}}' = '' THEN CB.ATIVO_CHAVE ELSE NULL END,
  ANUENCIA_ATE = CASE WHEN '{{anuenciaAte}}' = '' THEN CB.ANUENCIA_ATE ELSE '{{anuenciaAte}}' END,
  BLOQUEIO_DEVIDO = CASE WHEN '{{desfecho}}' IN ('REGULARIZADO', 'PAGO_NO_PRAZO') THEN '' ELSE CB.BLOQUEIO_DEVIDO END,
  ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL AND '{{desfecho}}' IN ('', 'REGULARIZADO', 'PAGO_NO_PRAZO', 'BAIXADO')
  AND ('{{desfecho}}' <> 'BAIXADO' OR (SELECT COALESCE(SUM(BS.VALOR), 0) FROM CC_BAIXA BS WHERE BS.COBRANCA_ID = CB.ID AND BS.SITUACAO = 'APROVADA')
    >= COALESCE((SELECT P.VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA P WHERE P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA), 0) - 0.004)
  AND (${ROTINA} OR ('{{desfecho}}' IN ('', 'BAIXADO') AND ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND EXISTS (SELECT 1 FROM CC_BAIXA BX
      WHERE BX.COBRANCA_ID = CB.ID AND BX.SITUACAO = 'APROVADA' AND BX.DECIDIDO_POR = A.ID AND BX.DECIDIDO_EM = '{{agora}}')`)}))`,

  ccEscCobCasoJuridico: `UPDATE CC_COBRANCA AS CB SET JURIDICO_EM = COALESCE(CB.JURIDICO_EM, '{{agora}}'), JURIDICO_POR = NULLIF({{membroId}}, 0),
  PROCESSO_ID = {{processoId}}, ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL
  AND EXISTS (SELECT 1 FROM CC_PROCESSO PX WHERE PX.ID = {{processoId}} AND PX.CLIENTE_ID = CB.CLIENTE_ID AND PX.CARTEIRA = CB.CARTEIRA AND PX.DOSSIE_ENVIADO_EM IS NOT NULL)
  AND (${ROTINA} OR ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND A.NIVEL >= COALESCE(${PARAM_NUM('jur.envioNivelMin')}, 3) AND ${VISIVEL_A('CB.CLIENTE_ID')}`)})`,

  ccEscCobCasoBloqueio: `UPDATE CC_COBRANCA AS CB SET BLOQUEIO_APLICADO = '{{aplicado}}', BLOQUEIO_APLICADO_EM = '{{agora}}', BLOQUEIO_APLICADO_POR = {{membroId}},
  ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND '{{aplicado}}' IN ('', 'PEDIDOS', 'TOTAL') AND CB.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND ${OPERA_CB}`,

  ccEscCobCasoAnuencia: `UPDATE CC_COBRANCA AS CB SET ANUENCIA_EM = '{{agora}}', ANUENCIA_POR = {{membroId}}, ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND CB.DESFECHO = 'REGULARIZADO' AND CB.PROTESTADO = TRUE AND CB.ANUENCIA_EM IS NULL AND ${OPERA_CB}`,

  ccEscCobCasoProtesto: `UPDATE CC_COBRANCA AS CB SET PROTESTADO = TRUE, ATUALIZADO_EM = '{{agora}}'
WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL AND CB.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND (${ROTINA} OR ${OPERA_CB})
  AND EXISTS (SELECT 1 FROM KB_CARD K JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE K.ID = CB.CARD_ID AND F.CHAVE = 'protesto')`,

  // C-01: a ação é da fase em que o card está (ou `juridico` com JURIDICO_EM gravado); NO_PRAZO sai do relógio do banco.
  ccEscCobAcaoInserir: `INSERT INTO CC_ACAO_REGUA (COBRANCA_ID, CLIENTE_ID, FASE_CHAVE, FEITA_EM, FEITA_POR, ORIGEM, NO_PRAZO)
SELECT CB.ID, CB.CLIENTE_ID, '{{faseChave}}', '{{agora}}', NULLIF({{membroId}}, 0), '{{origem}}', ${NO_PRAZO_SQL}
FROM CC_COBRANCA CB
JOIN KB_CARD K ON K.ID = CB.CARD_ID
JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
JOIN KB_FASE KF ON KF.ID = K.FASE_ID
WHERE CB.ID = {{cobrancaId}} AND '{{origem}}' IN ('BOTAO', 'CARD', 'EMAIL', 'BLOQUEIO', 'ANUENCIA', 'JURIDICO', 'ACORDO')
  AND (F.CHAVE = '{{faseChave}}' OR ('{{faseChave}}' = 'juridico' AND CB.JURIDICO_EM IS NOT NULL))
  AND NOT EXISTS (SELECT 1 FROM CC_ACAO_REGUA AR WHERE AR.COBRANCA_ID = CB.ID AND AR.FASE_CHAVE = '{{faseChave}}')
  AND (${ROTINA} OR ${OPERA_CB})`,

  ccEscCobContatoInserir: `INSERT INTO CC_CONTATO_COBRANCA (CLIENTE_ID, COBRANCA_ID, NF_ID, DATA, CANAL, FALOU_COM, RETORNO, PREVISAO, VALOR, FEEDBACK, AGENTE_ID, ORIGEM,
  EMAIL_ENVIADO_ID, CRIADO_EM)
SELECT C.ID, NULLIF({{cobrancaId}}, 0), NULLIF({{nfId}}, 0), '{{data}}', '{{canal}}', '{{falouCom}}', '{{retorno}}', NULLIF('{{previsao}}', ''), {{valor}},
  '{{feedback}}', CASE WHEN {{membroId}} = 0 THEN COALESCE(C.AGENTE_ID, 0) ELSE {{membroId}} END, '{{origem}}', NULLIF({{emailEnviadoId}}, 0), '{{agora}}'
FROM CC_CLIENTE C
WHERE C.ID = {{clienteId}} AND '{{origem}}' IN ('MANUAL', 'REGUA_PUB', 'EMAIL_REGUA', 'FORA') AND '{{feedback}}' <> ''
  AND ({{cobrancaId}} = 0 OR EXISTS (SELECT 1 FROM CC_COBRANCA CB WHERE CB.ID = {{cobrancaId}} AND CB.CLIENTE_ID = C.ID))
  AND (('{{origem}}' = 'EMAIL_REGUA' AND ${ROTINA}) OR ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND ${clienteVisivelA('C', 'A')}`)})`,

  ccEscCobPromessaInserir: `INSERT INTO CC_PROMESSA (CLIENTE_ID, COBRANCA_ID, CONTATO_ID, DATA_CONTATO, DATA_PROMETIDA, VALOR, SITUACAO, AGENTE_ID)
SELECT X.CLIENTE_ID, X.COBRANCA_ID, X.ID, X.DATA, X.PREVISAO, X.VALOR, 'ABERTA', X.AGENTE_ID
FROM CC_CONTATO_COBRANCA X
WHERE X.ID = {{contatoId}} AND X.PREVISAO IS NOT NULL AND X.AGENTE_ID = {{membroId}}
  AND NOT EXISTS (SELECT 1 FROM CC_PROMESSA PR WHERE PR.CONTATO_ID = X.ID) AND ${ATOR('{{membroId}}')}`,

  // B-01: o débito, o desconto, a alçada e a exigência de garantia saem do vencido relido aqui; `debito` só confere (01 §5, D-003).
  ccEscCobAcordoInserir: `INSERT INTO CC_ACORDO (CLIENTE_ID, COBRANCA_ID, CARTEIRA, DEBITO, VALOR, DESCONTO, ENTRADA, ENTRADA_DATA, N_PARCELAS, PRIMEIRO_VENC,
  INTERVALO_DIAS, GARANTIA, NIVEL_EXIGIDO, MOTIVO_NIVEL, SITUACAO, PROPOSTO_POR, PROPOSTO_EM)
SELECT X.CLIENTE_ID, X.ID, X.CARTEIRA, X.DEB, {{valor}}, GREATEST(X.DEB - {{valor}}, 0), {{entrada}}, NULLIF('{{entradaData}}', ''), {{nParcelas}},
  '{{primeiroVenc}}', {{intervaloDias}}, '{{garantia}}',
  CASE WHEN X.FE + X.FP + X.FD > 0 THEN X.NF ELSE X.NP END,
  SUBSTRING(CONCAT(CASE WHEN X.FE = 1 THEN CONCAT('; entrada abaixo de ', X.PCT, '%') ELSE '' END,
    CASE WHEN X.FP = 1 THEN CONCAT('; mais de ', X.MAXP, ' parcelas') ELSE '' END,
    CASE WHEN X.FD = 1 THEN '; débito acima do valor do gerente' ELSE '' END, '  '), 3),
  'PROPOSTO', {{membroId}}, '{{agora}}'
FROM (SELECT CB.ID, CB.CLIENTE_ID, CB.CARTEIRA, ROUND(COALESCE(P.VENCIDO, 0), 2) AS DEB,
    CASE WHEN {{entrada}} * 100 < ${PARAM_NUM('cob.acordoEntradaMinPct', 'CB.CARTEIRA')} * GREATEST(ROUND(COALESCE(P.VENCIDO, 0), 2), {{valor}}) THEN 1 ELSE 0 END AS FE,
    CASE WHEN {{nParcelas}} > ${PARAM_NUM('cob.acordoMaxParcelas', 'CB.CARTEIRA')} THEN 1 ELSE 0 END AS FP,
    CASE WHEN ROUND(COALESCE(P.VENCIDO, 0), 2) > ${PARAM_NUM('cob.acordoValorGerente', 'CB.CARTEIRA')} THEN 1 ELSE 0 END AS FD,
    ${PARAM('cob.acordoEntradaMinPct', 'CB.CARTEIRA')} AS PCT, ${PARAM('cob.acordoMaxParcelas', 'CB.CARTEIRA')} AS MAXP,
    ${PARAM_NUM('alcada.acordoNivelPadrao')} AS NP, ${PARAM_NUM('alcada.acordoNivelFora')} AS NF
  FROM CC_COBRANCA CB
  LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA
  WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL AND ${OPERA_CB}
    AND EXISTS (SELECT 1 FROM CC_FASE FN WHERE FN.QUADRO = CONCAT('cobranca-', LOWER(CB.CARTEIRA)) AND FN.CHAVE = 'negociacao')
    AND NOT EXISTS (SELECT 1 FROM CC_ACORDO AX WHERE AX.COBRANCA_ID = CB.ID AND AX.SITUACAO IN ('PROPOSTO', 'ATIVO'))) X
WHERE {{valor}} > 0 AND X.DEB > 0 AND ABS({{debito}} - X.DEB) <= 0.004 AND {{entrada}} >= 0 AND {{entrada}} < {{valor}}
  AND {{nParcelas}} >= 1 AND {{nParcelas}} <= 60
  AND (X.FD = 0 OR '{{garantia}}' <> '')`,

  ccEscCobAcordoParcelasInserir: `INSERT INTO CC_ACORDO_PARCELA (ACORDO_ID, CLIENTE_ID, N, VENC, VALOR)
SELECT AC.ID, AC.CLIENTE_ID, CAST(${ITEM('numeros')} AS SIGNED), ${ITEM('vencs')}, CAST(${ITEM('valores')} AS DECIMAL(15,2))
FROM CC_ACORDO AC JOIN ${NUMEROS_20} ON N.N <= {{n}}
WHERE AC.ID = {{acordoId}} AND AC.SITUACAO = 'PROPOSTO' AND AC.PROPOSTO_POR = {{membroId}} AND ${ATOR('{{membroId}}')}`,

  ccEscCobAcordoSituacao: `UPDATE CC_ACORDO AS AC SET SITUACAO = '{{situacao}}',
  DECIDIDO_POR = CASE WHEN '{{situacao}}' IN ('ATIVO', 'RECUSADO') THEN {{membroId}} ELSE AC.DECIDIDO_POR END,
  DECIDIDO_EM = CASE WHEN '{{situacao}}' IN ('ATIVO', 'RECUSADO') THEN '{{agora}}' ELSE AC.DECIDIDO_EM END,
  PARECER = CASE WHEN '{{parecer}}' = '' THEN AC.PARECER ELSE '{{parecer}}' END,
  ENCERRADO_EM = CASE WHEN '{{situacao}}' = 'ATIVO' THEN AC.ENCERRADO_EM ELSE '{{agora}}' END
WHERE AC.ID = {{acordoId}} AND (
  ('{{situacao}}' IN ('ATIVO', 'RECUSADO') AND AC.SITUACAO = 'PROPOSTO' AND AC.PROPOSTO_POR <> {{membroId}}
    AND ${ATOR('{{membroId}}', "A.CARGO <> 'JURIDICO' AND A.NIVEL >= AC.NIVEL_EXIGIDO")})
  OR ('{{situacao}}' = 'CANCELADO' AND AC.SITUACAO IN ('PROPOSTO', 'ATIVO') AND ${ATOR('{{membroId}}', `${NIVEL_MIN(2)} AND ${VISIVEL_A('AC.CLIENTE_ID')}`)})
  OR ('{{situacao}}' = 'QUITADO' AND AC.SITUACAO = 'ATIVO' AND NOT EXISTS (SELECT 1 FROM CC_ACORDO_PARCELA PA WHERE PA.ACORDO_ID = AC.ID AND PA.PAGO_EM IS NULL)
    AND (${ROTINA} OR ${OPERA_SQL('AC.CLIENTE_ID')}))
  OR ('{{situacao}}' = 'QUEBRADO' AND AC.SITUACAO = 'ATIVO' AND ${ROTINA}))`,

  ccEscCobAcordoParcelaPagar: `UPDATE CC_ACORDO_PARCELA AS PA SET PAGO_EM = '{{pagoEm}}', PAGO_POR = NULLIF({{membroId}}, 0)
WHERE PA.ID = {{parcelaId}} AND PA.PAGO_EM IS NULL
  AND EXISTS (SELECT 1 FROM CC_ACORDO AC WHERE AC.ID = PA.ACORDO_ID AND AC.SITUACAO = 'ATIVO')
  AND (${ROTINA} OR ${OPERA_SQL('PA.CLIENTE_ID')})`,

  ccEscCobBaixaInserir: `INSERT INTO CC_BAIXA (CLIENTE_ID, COBRANCA_ID, VALOR, MOTIVO, DOC_REGUA, DOC_PARECER, DOC_PROTESTO, DOC_ACORDO, OBS, NIVEL_EXIGIDO, SITUACAO,
  PROPOSTO_POR, PROPOSTO_EM)
SELECT CB.CLIENTE_ID, CB.ID, {{valor}}, '{{motivo}}', ({{docRegua}} = 1), ({{docParecer}} = 1), ({{docProtesto}} = 1), ({{docAcordo}} = 1), '{{obs}}',
  CASE WHEN {{valor}} <= ${PARAM_NUM('alcada.baixaGerente', 'CB.CARTEIRA')} THEN ${PARAM_NUM('alcada.baixaNivel1')}
       WHEN {{valor}} <= ${PARAM_NUM('alcada.baixaDiretor', 'CB.CARTEIRA')} THEN ${PARAM_NUM('alcada.baixaNivel2')}
       ELSE ${PARAM_NUM('alcada.baixaNivel3')} END,
  'PENDENTE', {{membroId}}, '{{agora}}'
FROM CC_COBRANCA CB
LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA P ON P.CLIENTE_ID = CB.CLIENTE_ID AND P.CARTEIRA = CB.CARTEIRA
WHERE CB.ID = {{cobrancaId}} AND CB.ENCERRADO_EM IS NULL AND {{valor}} > 0 AND {{valor}} <= COALESCE(P.VENCIDO, 0) - CB.VALOR_BAIXADO + 0.004
  AND '{{motivo}}' <> ''
  AND NOT EXISTS (SELECT 1 FROM CC_BAIXA BX WHERE BX.COBRANCA_ID = CB.ID AND BX.SITUACAO = 'PENDENTE')
  AND ${OPERA_CB}`,

  ccEscCobBaixaParecer: `UPDATE CC_BAIXA AS BX SET PARECER_RESULTADO = '{{resultado}}', PARECER_TEXTO = '{{texto}}', PARECER_POR = {{membroId}}, PARECER_EM = '{{agora}}'
WHERE BX.ID = {{baixaId}} AND BX.SITUACAO = 'PENDENTE' AND '{{resultado}}' IN ('FAVORAVEL', 'DESFAVORAVEL') AND '{{texto}}' <> ''
  AND ${ATOR('{{membroId}}', "A.CARGO = 'JURIDICO'")}`,

  ccEscCobBaixaDecidir: `UPDATE CC_BAIXA AS BX SET SITUACAO = CASE WHEN {{aprovar}} = 1 THEN 'APROVADA' ELSE 'RECUSADA' END,
  DECIDIDO_POR = {{membroId}}, DECIDIDO_EM = '{{agora}}', DECISAO_TEXTO = '{{texto}}'
WHERE BX.ID = {{baixaId}} AND BX.SITUACAO = 'PENDENTE' AND BX.PARECER_EM IS NOT NULL AND BX.PROPOSTO_POR <> {{membroId}}
  AND ({{aprovar}} = 1 OR '{{texto}}' <> '')
  AND ${ATOR('{{membroId}}', "A.CARGO <> 'JURIDICO' AND A.NIVEL >= BX.NIVEL_EXIGIDO")}`,

  ccEscCobFilaInserir: `INSERT INTO CC_EMAIL_FILA (COBRANCA_ID, CLIENTE_ID, FASE_CHAVE, DATA_REF, CHAVE, VALOR, SITUACAO, CRIADO_EM)
SELECT CAST(${ITEM('cobrancaIds')} AS SIGNED), CAST(${ITEM('clienteIds')} AS SIGNED), ${ITEM('fases')}, ${ITEM('datasRef')},
  CONCAT(${ITEM('cobrancaIds')}, ':', ${ITEM('fases')}), CAST(${ITEM('valores')} AS DECIMAL(15,2)), 'PENDENTE', '{{agora}}'
FROM ${NUMEROS_20}
WHERE N.N <= {{n}} AND ${ROTINA}
  AND NOT EXISTS (SELECT 1 FROM CC_EMAIL_FILA EF WHERE EF.CHAVE = CONCAT(${ITEM('cobrancaIds')}, ':', ${ITEM('fases')}))`,

  ccEscCobFilaSituacao: `UPDATE CC_EMAIL_FILA AS EF SET SITUACAO = '{{situacao}}', OBS = CASE WHEN '{{obs}}' = '' THEN EF.OBS ELSE '{{obs}}' END,
  APROVADO_POR = CASE WHEN '{{situacao}}' = 'ENVIADO' THEN NULLIF({{membroId}}, 0) ELSE EF.APROVADO_POR END,
  APROVADO_EM = CASE WHEN '{{situacao}}' = 'ENVIADO' THEN '{{agora}}' ELSE EF.APROVADO_EM END,
  ENVIADO_POR = CASE WHEN '{{situacao}}' = 'ENVIADO' THEN NULLIF({{membroId}}, 0) ELSE EF.ENVIADO_POR END,
  ENVIADO_EM = CASE WHEN '{{situacao}}' = 'ENVIADO' THEN '{{agora}}' ELSE EF.ENVIADO_EM END,
  EMAIL_ENVIADO_ID = CASE WHEN '{{situacao}}' = 'ENVIADO' THEN NULLIF({{emailEnviadoId}}, 0) ELSE EF.EMAIL_ENVIADO_ID END
WHERE FIND_IN_SET(EF.ID, '{{ids}}') > 0 AND EF.SITUACAO = 'PENDENTE' AND '{{situacao}}' IN ('ENVIADO', 'FORA')
  AND (${ROTINA} OR ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND ${VISIVEL_A('EF.CLIENTE_ID')}
    AND (${MODO_EMAIL_SQL('EF.FASE_CHAVE', '(SELECT CBF.CARTEIRA FROM CC_COBRANCA CBF WHERE CBF.ID = EF.COBRANCA_ID)')} <> 'APROVAR'
      OR A.NIVEL >= ${PARAM_NUM('alcada.emailAprovaNivel')})`)})`,
};

/* ── leituras SQL restantes ── */

const SQL_CONTATO_LISTAR = `SELECT X.ID, X.CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, X.COBRANCA_ID, COALESCE(CB.CARTEIRA, '') AS CARTEIRA, X.NF_ID, X.DATA, X.CANAL,
  X.FALOU_COM, X.RETORNO, X.PREVISAO, X.VALOR, X.FEEDBACK, X.AGENTE_ID, COALESCE(AG.NOME, '') AS AGENTE_NOME, X.ORIGEM, X.EMAIL_ENVIADO_ID, X.CRIADO_EM,
  COALESCE(PR.SITUACAO, '') AS PROMESSA_SITUACAO, CB.CARD_ID
${FROM_CONTATO}
WHERE ${FILTRO_CONTATO}
ORDER BY X.DATA DESC, X.ID DESC
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_CONTATO_TOTAL = `SELECT COUNT(*) AS TOTAL,
  COALESCE(SUM(CASE WHEN PR.SITUACAO = 'ABERTA' THEN 1 ELSE 0 END), 0) AS PROMESSAS_ABERTAS,
  COALESCE(SUM(CASE WHEN PR.SITUACAO = 'QUEBRADA' THEN 1 ELSE 0 END), 0) AS PROMESSAS_QUEBRADAS,
  COALESCE(SUM(CASE WHEN X.RETORNO = '${RETORNOS.find((r) => r[0] === 'SEM_RETORNO')[1]}' THEN 1 ELSE 0 END), 0) AS SEM_RETORNO
${FROM_CONTATO}
WHERE ${FILTRO_CONTATO}`;

const SQL_BLOQUEIO_LISTAR = `SELECT CB.ID AS COBRANCA_ID, CB.CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, CB.CARTEIRA, CB.CARD_ID, COALESCE(AG.NOME, '') AS AGENTE_NOME,
  COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO, CB.BLOQUEIO_DEVIDO AS DEVIDO, CB.BLOQUEIO_APLICADO AS APLICADO, CB.BLOQUEIO_APLICADO_EM,
  CB.ENCERRADO_EM, CB.DESFECHO,
  CASE WHEN CB.BLOQUEIO_DEVIDO = CB.BLOQUEIO_APLICADO THEN '' WHEN CB.BLOQUEIO_DEVIDO = '' THEN 'LIBERAR'
       WHEN CB.BLOQUEIO_DEVIDO = 'PEDIDOS' THEN 'BLOQUEAR_PEDIDOS' ELSE 'BLOQUEAR_TOTAL' END AS ACAO
${FROM_BLOQUEIO}
WHERE ${FILTRO_BLOQUEIO}
ORDER BY COALESCE(P.VENCIDO, 0) DESC, CB.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_BLOQUEIO_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(P.VENCIDO), 0) AS VENCIDO
${FROM_BLOQUEIO}
WHERE ${FILTRO_BLOQUEIO}`;

const SQL_PROJECAO_LISTAR = `SELECT ${COLUNAS_PROJECAO}
${FROM_PROJECAO}
WHERE ${FILTRO_PROJECAO}
ORDER BY VALOR_ESPERADO DESC, S.CLIENTE_ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_PROJECAO_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(S.A_VENCER), 0) AS A_VENCER,
  COALESCE(SUM(ROUND(S.A_VENCER * ${PROB_ATRASO_SQL('S')} / 100, 2)), 0) AS VALOR_ESPERADO,
  COALESCE(SUM(CASE WHEN ${PROB_ATRASO_SQL('S')} >= ${PARAM_NUM('cob.probForte', 'S.CARTEIRA')} THEN 1 ELSE 0 END), 0) AS CLIENTES_FORTE
${FROM_PROJECAO}
WHERE ${FILTRO_PROJECAO}`;

/* ── definições ── */

// Números como parâmetro (DT-45): todo {{x}} fora de aspas vira CAST; DECIMAIS = os valores em dinheiro desta spec.
const DECIMAIS = ['valor', 'debito', 'entrada'];
const sql = (name, code, extra = {}) => ({ name, type: 'SQL', code: numerosComoParametro(code, DECIMAIS), ...extra });
const jsDef = (name, code, extra = {}) => ({ name, type: 'JAVASCRIPT', code, ...extra });
const COM_ENVIO = [enviarDaRegua, lerAcordo, proxAcaoDoAcordo, lerBaixa].map(String).join('\n');
const FONTES_COB = [constante('CANAIS', CANAIS), constante('CUSTO', CUSTO), constante('RETORNOS', RETORNOS.map((r) => r[1])), FONTE_ACORDO, FONTE_ENCARGOS, COM_ENVIO];
const sfCob = (fn) => sf(fn, ...FONTES_COB);

export const definitions = [
  sql('ccCobQuadroResumo', SQL_QUADRO_RESUMO),
  jsDef('ccCobCasoFicha', sfCob(corpoCasoFicha)),
  sql('ccCobCasoListar', SQL_CASO_LISTAR),
  sql('ccCobCasoTotal', SQL_CASO_TOTAL),
  sql('ccCobSituacao', SQL_SITUACAO),
  jsDef('ccCobEncargosCalcular', sfCob(corpoEncargos)),
  sql('ccCobContatoListar', SQL_CONTATO_LISTAR),
  sql('ccCobContatoTotal', SQL_CONTATO_TOTAL),
  sql('ccCobAgendaListar', SQL_AGENDA_LISTAR),
  sql('ccCobAgendaTotal', SQL_AGENDA_TOTAL),
  sql('ccCobAgendaResumo', SQL_AGENDA_RESUMO),
  sql('ccCobBloqueioListar', SQL_BLOQUEIO_LISTAR),
  sql('ccCobBloqueioTotal', SQL_BLOQUEIO_TOTAL),
  sql('ccCobProjecaoListar', SQL_PROJECAO_LISTAR),
  sql('ccCobProjecaoTotal', SQL_PROJECAO_TOTAL),
  sql('ccCobEmailFilaListar', SQL_FILA_LISTAR),
  sql('ccCobEmailFilaTotal', SQL_FILA_TOTAL),
  sql('ccCobPainelKpis', SQL_PAINEL_KPIS),
  sql('ccCobPainelAgentes', SQL_PAINEL_AGENTES),
  sql('ccCobPainelBu', SQL_PAINEL_BU),
  sql('ccCobPainelAging', SQL_PAINEL_AGING),
  sql('ccCobPainelTopDevedores', SQL_PAINEL_TOP),
  jsDef('ccCobAcaoRegistrar', sfCob(corpoAcaoRegistrar)),
  jsDef('ccCobContatoRegistrar', sfCob(corpoContatoRegistrar)),
  jsDef('ccCobProxAcaoDefinir', sfCob(corpoProxAcaoDefinir)),
  jsDef('ccCobEmailEnviar', sfCob(corpoEmailEnviar)),
  jsDef('ccCobEmailFilaDecidir', sfCob(corpoEmailFilaDecidir)),
  jsDef('ccCobBloqueioAplicar', sfCob(corpoBloqueioAplicar)),
  jsDef('ccCobAcordoPropor', sfCob(corpoAcordoPropor)),
  jsDef('ccCobAcordoDecidir', sfCob(corpoAcordoDecidir)),
  jsDef('ccCobAcordoParcelaPagar', sfCob(corpoAcordoParcelaPagar)),
  jsDef('ccCobAcordoCancelar', sfCob(corpoAcordoCancelar)),
  jsDef('ccCobBaixaPropor', sfCob(corpoBaixaPropor)),
  jsDef('ccCobBaixaParecer', sfCob(corpoBaixaParecer)),
  jsDef('ccCobBaixaDecidir', sfCob(corpoBaixaDecidir)),
  jsDef('ccCobAnuenciaRegistrar', sfCob(corpoAnuenciaRegistrar)),
  jsDef('ccCobEnviarJuridico', sfCob(corpoEnviarJuridico)),
  jsDef('ccCobCasoSincronizar', sfCob(corpoCasoSincronizar)),
  jsDef('ccCobRotina', sf(corpoRotina, ...FONTES_COB, constante('SQL_NO_PRAZO', NO_PRAZO_SQL), constante('SQL_MUDOU', MUDOU_SQL))),
  ...Object.entries(ESCRITAS).map(([nome, code]) => sql(nome, code)),
];

/* ── publicação (só no sandbox) ── */

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntrypoint()) {
  if (!process.env.MITRA_BASE_URL) throw new Error('MITRA_BASE_URL ausente: este script roda no sandbox do Mitra, com o .env real.');
  const sdk = await import('mitra-sdk');
  sdk.configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  const linhas = (r) => r?.result?.rows ?? r?.result ?? [];
  const exec = { consultar: async (s) => linhas(await sdk.runQueryMitra({ projectId, sql: s })), executar: (s) => sdk.runDmlMitra({ projectId, sql: s }) };
  const quadros = await semearQuadro(exec, QUADROS);
  const lerMapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const publicar = async (def, mapa) => {
    const dados = { name: def.name, type: def.type, code: def.type === 'JAVASCRIPT' ? injetarIds(def.code, mapa) : def.code,
      description: `Crédito e Cobrança · 002-cobranca · ${def.name}` };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  // 1ª passada: cria o que falta (upsert pelo nome); 2ª: republica as JS com o mapa completo.
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 002 e ${quadros.length} quadro(s).`);
  console.log('Republique o add-010 (ccPodeMover com o trecho da 002), depois o add-001-kanban, o add-090 e o sync-server-function-map.');
}
