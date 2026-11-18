// add-040 — Server Functions da 004-concessao-credito (04 §4): 49 públicas e 17 internas, as três carteiras.
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// Publicado nas duas passadas do PUBLISH_ORDER e REPUBLICADO depois do add-050 (DT-39). Dois critérios de
// "a 005 existe", coerentes pelo PUBLISH_ORDER: a SQL olha o arquivo `add-050-setor-publico.mjs` na publicação
// (sem ele os fragmentos não citam CC_ANALISE_ORGAO e a guarda recusa a PUBLICA); a JS olha o id de
// `ccPubMotorCalcular` na execução (0 → "O motor do órgão não está instalado."). O ramo público da JS (motor do
// órgão conferido com a fotografia, crédito na decisão — D-004 —, capa, ficha e fila) é da 004 e já está aqui.
//
// Entradas das internas (forma A, 01 §5; `membroId` = quem age; `agora` vem da JS):
//   ccEscCredSolicitacaoInserir   clienteId, carteira, tipoCliente, valor, prazoMeses, justificativa, rca, analistaId, prazoDecisao, membroId, agora
//   ccEscCredSolicitacaoCard      solicitacaoId, cardId, membroId
//   ccEscCredSolicitacaoDados     solicitacaoId + colunas de dados (valor, prazoMeses, tipoCliente, justificativa, rca, obs, consData, consReceita,
//                                 consProtesto, consProcesso, consSocios, cnpjAbertura, finAc, finPc, finPl, finDivida, finEbitda, fatMensal, scoreSerasa,
//                                 fpTipo, fpNome, fpPrazoDias, garantia, confFinContatoId, flagNegativacao, flagDados, flagPedido), membroId
//   ccEscCredSolicitacaoAnalise   solicitacaoId, limiteProposto, parecer, membroId
//   ccEscCredSolicitacaoAnalista  solicitacaoId, analistaId, membroId
//   ccEscCredSolicitacaoMotor     solicitacaoId, rating, limite, resultado, membroId, agora
//   ccEscCredSolicitacaoAjuste    solicitacaoId, acao (PROPOR | DECIDIR), rating, justificativa, aprovar, membroId, agora
//   ccEscCredSolicitacaoDecisao   solicitacaoId, decisaoId, resultado, motivo, membroId, agora
//   ccEscCredSolicitacaoEncerrar  solicitacaoId, motivo, membroId, agora
//   ccEscCredDecisaoInserir       entidade (SOLICITACAO | PEDIDO), entidadeId, creditoId (renovação; 0), resultado, limiteAprovado, planoCod, planoDescr,
//                                 forma, condicao, parecer, justificativaExcecao, motorJson, membroId, agora
//                                 (rótulo da alçada, nível, rating e limite do motor saem da própria SQL)
//   ccEscCredCreditoInserir       decisaoId, membroId, agora (início = hoje e fim = hoje + cred.validadeMeses, na SQL)
//   ccEscCredCreditoSituacao      creditoId, situacao, motivo, membroId, agora
//   ccEscCredPedidoInserir        clienteId, numeroPedido, valor, rca, tipoCliente, justificativa, analistaId, membroId, agora
//                                 (crédito, limite, utilizado, atraso, excesso e alçada saem da SQL: posição e 03 §7)
//   ccEscCredPedidoAtualizar      pedidoId, modo (CARD | RECOMENDACAO | ANALISTA | DESFECHO), cardId, recomendacao, analistaId, resultado, motivo, membroId, agora
//   ccEscCredPendenciaInserir     tipo, origem, origemId, membroId, agora (cliente, valor e descrição saem da origem, na SQL)
//   ccEscCredPendenciaAplicar     pendenciaId, obs, membroId, agora
//   ccEscCredCalibracaoRevisaoInserir parecer, leituraJson, membroId, agora

import 'dotenv/config';
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chaveDeRotulo } from '@benenutri/mitra-kanban/motor';
import { js, injetarIds } from './lib/escritas.mjs';
import { q } from './lib/texto-sql.mjs';
import { ATOR, PODE_ADMINISTRAR, NIVEL_MIN, clienteVisivelA, numerosComoParametro } from './lib/guarda.mjs';
import { EU, MEMBRO_A, clienteVisivel, membroVisivel } from './lib/visibilidade.mjs';
import { PARAM_NUM, PARAM } from './lib/parametros.mjs';
import { HOJE_SQL, KB_BRASILIA } from './lib/tempo.mjs';
import { semearQuadro } from './lib/quadros.mjs';
import { FONTE as FONTE_MOTOR } from './lib/concessao-credito/motor.mjs';
import { FONTE as FONTE_REGRAS } from './lib/concessao-credito/regras.mjs';
import {
  RATING_EFETIVO, ABERTA, PROPONENTE_ADD, NAO_PROPONENTE, NIVEL_CONCESSAO, ROTULO_CONCESSAO, VALOR_ALCADA, EXCECAO_CONCESSAO,
  FAIXA_CONCESSAO, ANTES_DO_COMITE, CASO_S, CASO_P, CASO_PW, ALCADA_PEDIDO, SOMAR_MESES, CREDITO_LIBERAVEL, BRL,
} from './lib/concessao-credito/sql.mjs';
import { QUADROS } from './lib/quadros/004-concessao-credito.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
/** Com a 005 presente, o ramo público entra nos fragmentos (republicação depois do add-050, DT-39). */
const TEM_005 = existsSync(join(AQUI, 'add-050-setor-publico.mjs'));

/* ── texto que entra nos corpos JAVASCRIPT ── */

const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;
function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function texto(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function lerJsonSeguro(v, padrao) {
  if (v && typeof v === 'object') return v;
  try { const o = JSON.parse(String(v || '')); return o && typeof o === 'object' ? o : padrao; } catch { return padrao; }
}
function brl(v) { return `R$ ${Math.round(Number(v) || 0).toLocaleString('pt-BR')}`; }
function br(d) { return d ? String(d).slice(0, 10).split('-').reverse().join('/') : ''; }
const UTIL = [q, inteiro, numero, texto, lerJsonSeguro, brl, br].map(String).join('\n');

const FORMAS = ['Boleto bancário', 'PIX', 'Cartão de crédito', 'Cartão BNDES', 'Transferência (TED)', 'Depósito antecipado', 'Cheque'];
const FONTES = ['RECURSOS_PROPRIOS', 'OPERADORA', 'SUS', 'PACIENTE', 'MISTO', 'OUTRA'];
const ETQ = Object.fromEntries(['Exceção ao motor', 'Ajuste de rating pendente', 'Pré-aprovada', 'Aplicar no Winthor', 'Limite diverge do Winthor', 'Renovação',
  'Liberação crítica', 'Dentro da regra'].map((r) => [r, chaveDeRotulo(r)]));

/** Linha da solicitação com cliente, caminhos (visibilidade, caso), fase e card. */
const SQL_SOL = `SELECT S.*, C.CODCLI, C.NOME AS CLIENTE_NOME, C.SETOR, C.TIPO_PESSOA, C.GRUPO_ECONOMICO, C.NO_JURIDICO, C.AGENTE_ID,
  C.ANALISTA_ID AS CLIENTE_ANALISTA_ID, C.CONTATOS_REVISADO_EM, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO,
  CS.CAMINHO AS CASO_CAMINHO, CS.USER_ID AS CASO_USER_ID, AJ.CAMINHO AS AJUSTE_CAMINHO,
  F.CHAVE AS FASE_CHAVE, F.ORDEM AS FASE_ORDEM, F.QUADRO, F.FINAL AS FASE_FINAL, F.BOARD_ID,
  (SELECT FC.ORDEM FROM CC_FASE FC WHERE FC.QUADRO = F.QUADRO AND FC.CHAVE = 'comite') AS ORDEM_COMITE,
  K.VALORES_JSON, K.PRAZO AS CARD_PRAZO, K.TITULO AS CARD_TITULO
FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID
LEFT JOIN CC_MEMBRO CS ON CS.ID = COALESCE(S.ANALISTA_ID, S.CRIADO_POR)
LEFT JOIN CC_MEMBRO AJ ON AJ.ID = S.AJUSTE_POR
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID`;

const SQL_POS = 'SELECT * FROM CC_POSICAO_CLIENTE WHERE CLIENTE_ID = ';

/* Funções do corpo das JS (vão por toString; usam o preâmbulo, UTIL e as constantes acima). */

async function solicitacaoPor(where) {
  const [s] = await ler(`${SQL_SOL} WHERE ${where}`);
  if (!s) return null;
  s.VALORES = lerJsonSeguro(s.VALORES_JSON, {});
  return s;
}

const ehCaso = (m, caminho) => !!(m && m.membroId && m.caminho && caminho && String(caminho).startsWith(m.caminho));
const naLista = (lista, id) => String(lista || '').split(',').map((x) => Number(x)).includes(Number(id));

async function usuarioDe(membroId) {
  const [l] = await ler(`SELECT USER_ID FROM CC_MEMBRO WHERE ID = ${inteiro(membroId)}`);
  return l ? inteiro(l.USER_ID) : 0;
}

/** Carteira com valores da posição + da solicitação → entradas do motor (motor.mjs). */
async function entradasDe(s, sobre = {}, p = {}) {
  const [pos] = await ler(`${SQL_POS}${inteiro(s.CLIENTE_ID)}`);
  const grupo = String(s.GRUPO_ECONOMICO || '');
  const [cart] = await ler(`SELECT COALESCE(SUM(CR.LIMITE), 0) AS OUTROS,
  COALESCE(SUM(CASE WHEN ${grupo ? `C.GRUPO_ECONOMICO = ${q(grupo)}` : '1 = 0'} THEN CR.LIMITE ELSE 0 END), 0) AS GRUPO
FROM CC_CREDITO CR JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID WHERE CR.VIGENTE_CHAVE IS NOT NULL AND CR.CLIENTE_ID <> ${inteiro(s.CLIENTE_ID)}`);
  return { ...entradasLinha(s, pos, cart ? numero(cart.OUTROS) : 0, cart ? numero(cart.GRUPO) : 0, p), ...sobre, posicao: pos || null };
}

/** Entradas do motor a partir da linha da solicitação e da posição (sem leitura: serve à rotina). */
function entradasLinha(s, pos, outros, grupo, p = {}) {
  const v = s.VALORES || {};
  const marcado = (k) => String(v[k] || '') === '1';
  const nulo = (x) => (x === null || x === undefined || x === '' ? null : Number(x));
  const fichaEmDia = s.CONTATOS_REVISADO_EM ? (Date.parse(`${hoje()}T00:00:00Z`) - Date.parse(`${String(s.CONTATOS_REVISADO_EM).slice(0, 10)}T00:00:00Z`)) / 86400000 <= Number(p['base.fichaValidadeDias'] || 180) : false;
  const e = {
    tipoCliente: s.TIPO_CLIENTE, tipoPessoa: s.TIPO_PESSOA, scoreSerasa: nulo(s.SCORE_SERASA),
    pontualidade: pos ? nulo(pos.PONTUALIDADE_PCT) : null, diasAtraso: pos ? inteiro(pos.DIAS_ATRASO) : 0,
    compraMedia: pos ? numero(pos.COMPRA_MEDIA_MENSAL) : 0, prazoMedio: pos ? inteiro(pos.PRAZO_MEDIO_DIAS) : 0,
    fatMensal: nulo(s.FAT_MENSAL), pl: nulo(s.FIN_PL), ac: nulo(s.FIN_AC), pc: nulo(s.FIN_PC), divida: nulo(s.FIN_DIVIDA), ebitda: nulo(s.FIN_EBITDA),
    garantia: s.GARANTIA || '', valor: numero(s.VALOR), fpTipo: s.FP_TIPO || '', fpPrazoDias: inteiro(s.FP_PRAZO_DIAS),
    alertas: [ehVerdade(s.FLAG_NEGATIVACAO) && 'NEGATIVACAO', ehVerdade(s.FLAG_DADOS) && 'DADOS', ehVerdade(s.FLAG_PEDIDO) && 'PEDIDO'].filter(Boolean),
    consultas: { data: s.CONS_DATA, receita: s.CONS_RECEITA, protesto: s.CONS_PROTESTO, processo: s.CONS_PROCESSO, socios: s.CONS_SOCIOS },
    cnpjAbertura: s.CNPJ_ABERTURA || null, hoje: hoje(),
    carteiraLimites: numero(outros), exposicaoGrupo: numero(grupo),
    docsAtendidos: {
      SERASA: marcado('cadastral_1'), PROTESTOS: marcado('cadastral_3'), PROCESSOS: marcado('cadastral_12'), CNPJ: marcado('cadastral_11'),
      SOCIOS: marcado('cadastral_13'), FATURAMENTO: marcado('cadastral_8'), GARANTIA: marcado('formalizacao_2'), FICHA: fichaEmDia,
      BALANCO: s.FIN_AC !== null && s.FIN_AC !== undefined && s.FIN_PC !== null && s.FIN_PC !== undefined && s.FIN_PL !== null && s.FIN_PL !== undefined,
    },
  };
  return e;
}

/** Objeto da alçada de `alcadaConcessao` a partir da linha; `ao` = a análise do órgão (Pública, DT-36) ou null. */
const alcadaDe = (s, limiteAprovado, p, ao = null) => alcadaConcessao({
  carteira: s.CARTEIRA, valor: s.VALOR, limiteProposto: s.LIMITE_PROPOSTO, motorLimite: s.MOTOR_LIMITE, motorResultado: s.MOTOR_RESULTADO,
  ajusteSituacao: s.AJUSTE_SITUACAO, cnpjAbertura: s.CNPJ_ABERTURA, tipoCliente: s.TIPO_CLIENTE, fatMensal: s.FAT_MENSAL, hoje: hoje(),
  exposicao: ao ? numero(ao.EXPOSICAO) : null,
}, limiteAprovado, p);

/** Análise do órgão da solicitação pública (fotografia do motor do órgão, DT-36); null sem a 005 ou sem análise. */
async function analiseOrgaoDe(s) {
  if (s.CARTEIRA !== 'PUBLICA' || !idDe('ccPubMotorCalcular')) return null;
  const [ao] = await ler(`SELECT ID, RATING_PUB, EXPOSICAO, PROPOSTA_POR FROM CC_ANALISE_ORGAO WHERE SOLICITACAO_ID = ${inteiro(s.ID)}`);
  return ao || null;
}

const ratingEfetivo = (s) => (s.AJUSTE_SITUACAO === 'APROVADO' ? s.RATING_AJUSTE : s.RATING_MOTOR) || '';

/** O que falta para a próxima fase (mesmas condições do gancho e da condição de entrada). */
function pendenciasDe(s, p) {
  const v = s.VALORES || {};
  const sim = (k) => String(v[k] || '') === '1';
  const f = s.FASE_CHAVE;
  const lista = [];
  if (f === 'entrada') {
    if (!(numero(s.VALOR) > 0)) lista.push('valor');
    if (!(inteiro(s.PRAZO_MESES) > 0)) lista.push('prazo');
    if (!s.ANALISTA_ID) lista.push('analista');
  } else if (f === 'cadastral') {
    if (!sim('cadastral_5')) lista.push('confirmação por telefone');
    if (!sim('cadastral_6')) lista.push('confirmação de endereço');
    if (!sim('cadastral_7')) lista.push('contato financeiro confirmado');
    if (!consultasValidas({ data: s.CONS_DATA, receita: s.CONS_RECEITA, protesto: s.CONS_PROTESTO, processo: s.CONS_PROCESSO, socios: s.CONS_SOCIOS },
      s.TIPO_PESSOA, hoje(), p)) lista.push('consultas obrigatórias válidas');
  } else if (f === 'credito' && s.CARTEIRA !== 'PUBLICA') {
    if (s.SCORE_SERASA === null || s.SCORE_SERASA === undefined || s.SCORE_SERASA === '') lista.push('score Serasa');
    if (!s.FP_TIPO) lista.push('fonte pagadora');
    if (!ratingEfetivo(s)) lista.push('rating calculado');
    if (s.AJUSTE_SITUACAO === 'PENDENTE') lista.push('ajuste de rating aguardando aprovação');
    if (!(numero(s.LIMITE_PROPOSTO) > 0)) lista.push('limite proposto');
    if (!s.PARECER_ANALISTA) lista.push('parecer do analista');
    if (numero(s.VALOR) > Number(p['limite.docF2']) && [s.FIN_AC, s.FIN_PC, s.FIN_PL].some((x) => x === null || x === undefined)) lista.push('análise financeira (AC, PC, PL)');
  } else if (f === 'analise') {
    if (!sim('analise_1')) lista.push('contrato ou ata, empenho e ordem de fornecimento');
    if (!sim('analise_2')) lista.push('dotação orçamentária');
  } else if (f === 'formalizacao') {
    if (!(Array.isArray(v.termo_assinado) ? v.termo_assinado.length : v.termo_assinado)) lista.push('termo de concessão assinado');
    if (s.GARANTIA && !sim('formalizacao_2')) lista.push('garantias formalizadas');
  }
  return lista;
}

/**
 * Atualiza capa, etiquetas, prazo e responsáveis do card só no que mudou (05 §1 regra 9). `capa` = { chave: valor };
 * `etq` = { mais: [chaves], menos: [chaves] }. Devolve as execuções gastas (0 ou a de kbCardAtualizar).
 */
async function atualizarCard(cardId, usuarioId, capa = {}, etq = null, extra = {}) {
  if (!cardId) return 0;
  const [k] = await ler(`SELECT K.VALORES_JSON, K.PRAZO, (SELECT GROUP_CONCAT(R.USUARIO_ID ORDER BY R.ORDEM SEPARATOR ',') FROM KB_CARD_RESPONSAVEL R WHERE R.CARD_ID = K.ID) AS RESP
FROM KB_CARD K WHERE K.ID = ${inteiro(cardId)}`);
  if (!k) return 0;
  const v = lerJsonSeguro(k.VALORES_JSON, {});
  const novos = {};
  for (const [chave, valor] of Object.entries(capa)) {
    const atual = v[chave] === undefined || v[chave] === null ? '' : String(v[chave]);
    const alvo = valor === undefined || valor === null ? '' : String(valor);
    const igualMoeda = alvo !== '' && atual !== '' && !Number.isNaN(Number(alvo)) && Number(atual) === Number(alvo);
    if (atual !== alvo && !igualMoeda) novos[chave] = valor;
  }
  if (etq) {
    const atuais = Array.isArray(v.etiquetas) ? v.etiquetas.map(String) : [];
    const lista = [...new Set([...atuais.filter((e) => !(etq.menos || []).includes(e)), ...(etq.mais || [])])];
    if (JSON.stringify([...lista].sort()) !== JSON.stringify([...atuais].sort())) novos.etiquetas = lista;
  }
  const prazo = extra.prazo !== undefined ? extra.prazo : (k.PRAZO || '');
  const resp = extra.responsaveisIds !== undefined ? String(extra.responsaveisIds) : String(k.RESP || '');
  if (!Object.keys(novos).length && prazo === (k.PRAZO || '') && resp === String(k.RESP || '')) return 0;
  const r = await chamarKb('kbCardAtualizar', {
    cardId: inteiro(cardId), valoresJson: JSON.stringify(novos), prazo, responsaveisIds: resp, atualizadoPor: usuarioId, origem: 'sistema',
  });
  if (r && r.ok === false) throw new Error(`Capa do card: ${r.error}`);
  return 1;
}

/** Move o card para a fase de chave `chave` do mesmo quadro (sem efeito se já está). */
async function moverCard(cardId, chave, usuarioId) {
  const [f] = await ler(`SELECT F2.FASE_ID, F1.FASE_ID AS ATUAL FROM KB_CARD K JOIN CC_FASE F1 ON F1.FASE_ID = K.FASE_ID
JOIN CC_FASE F2 ON F2.QUADRO = F1.QUADRO AND F2.CHAVE = ${q(chave)} WHERE K.ID = ${inteiro(cardId)}`);
  if (!f) return { ok: false, error: 'Card ou fase não encontrados.' };
  if (inteiro(f.FASE_ID) === inteiro(f.ATUAL)) return { ok: true, igual: true };
  return chamarKb('kbCardMover', { cardId: inteiro(cardId), faseId: inteiro(f.FASE_ID), ordem: 0, movidoPor: usuarioId, origem: 'sistema' });
}

async function nota(cardId, textoNota, usuarioId) {
  if (!cardId) return null;
  return chamarKb('kbNotaRegistrar', { cardId: inteiro(cardId), texto: String(textoNota).slice(0, 1000), usuarioId });
}

/** Próxima fase comum depois de `comite` no quadro. */
async function faseAposComite(quadro) {
  const [f] = await ler(`SELECT F.CHAVE FROM CC_FASE F WHERE F.QUADRO = ${q(quadro)} AND F.FINAL = FALSE
  AND F.ORDEM > (SELECT FC.ORDEM FROM CC_FASE FC WHERE FC.QUADRO = ${q(quadro)} AND FC.CHAVE = 'comite') ORDER BY F.ORDEM LIMIT 1`);
  return f ? f.CHAVE : '';
}

const FONTE_004 = [UTIL, FONTE_MOTOR, FONTE_REGRAS, constante('SQL_SOL', SQL_SOL), constante('SQL_POS', SQL_POS), constante('FORMAS', FORMAS),
  constante('FONTES', FONTES), constante('ETQ', ETQ),
  ...[solicitacaoPor, usuarioDe, entradasDe, entradasLinha, pendenciasDe, atualizarCard, moverCard, nota, faseAposComite, analiseOrgaoDe].map(String),
  `const ehCaso = ${ehCaso};`, `const naLista = ${naLista};`, `const alcadaDe = ${alcadaDe};`, `const ratingEfetivo = ${ratingEfetivo};`].join('\n');

/** Corpo de SF JAVASCRIPT: preâmbulo + fontes da 004 + a função. */
const sf = (fn, ...fontes) => js(`${[FONTE_004, ...fontes].join('\n')}\nreturn await (${fn})();`);

/* ── fragmentos SQL das leituras ── */

const ATRASADA = (k = 'K', kf = 'KF', f = 'F') => `(CASE WHEN ${kf}.SLA_HORAS > 0 AND ${f}.FINAL = FALSE
    AND TIMESTAMPDIFF(MINUTE, ${k}.FASE_DESDE, UTC_TIMESTAMP()) > ${kf}.SLA_HORAS * 60 THEN 1 ELSE 0 END)`;
const CLI = 'C.ID AS CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME';
const BUSCA = `('{{busca}}' = '' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%') OR CAST(C.CODCLI AS CHAR) = '{{busca}}')`;
const IDX = (r) => `(CASE ${r} WHEN 'AA' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4 WHEN 'E' THEN 5 ELSE -1 END)`;
const CORTE = (cart) => IDX(PARAM('cred.riscoCorteRating', cart));
const CLASSE = `(CASE WHEN ${IDX('CR.RATING_CONCESSAO')} >= ${CORTE('CR.CARTEIRA')} THEN 'ACEITO'
    WHEN ${IDX('CR.RATING_CONCESSAO')} >= 0 AND ${IDX('R.RATING_ATUAL')} >= ${CORTE('CR.CARTEIRA')} THEN 'NAO_PREVISTO' ELSE '' END)`;
const MES_IDX = (x) => `(CAST(SUBSTRING(${x}, 1, 4) AS SIGNED) * 12 + CAST(SUBSTRING(${x}, 6, 2) AS SIGNED))`;
const PRM = `JOIN (SELECT ${HOJE_SQL} AS HOJE) PRM ON 1 = 1`;

const FROM_SOL = `FROM CC_SOLICITACAO S
JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
${EU}
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = S.ANALISTA_ID`;
const FILTRO_SOL = `${clienteVisivel('C')}
  AND ('{{carteira}}' = '' OR S.CARTEIRA = '{{carteira}}')
  AND ('{{faseChave}}' = '' OR F.CHAVE = '{{faseChave}}')
  AND ({{analistaId}} = 0 OR S.ANALISTA_ID = {{analistaId}})
  AND ('{{situacao}}' = '' OR ('{{situacao}}' = 'ABERTA' AND ${ABERTA('S')}) OR ('{{situacao}}' = 'DECIDIDA' AND S.DECIDIDA_EM IS NOT NULL)
       OR ('{{situacao}}' = 'ENCERRADA' AND NOT ${ABERTA('S')}))
  AND ('{{tipoPessoa}}' = '' OR C.TIPO_PESSOA = '{{tipoPessoa}}')
  AND ('{{de}}' = '' OR SUBSTRING(S.CRIADO_EM, 1, 10) >= '{{de}}') AND ('{{ate}}' = '' OR SUBSTRING(S.CRIADO_EM, 1, 10) <= '{{ate}}')
  AND ${BUSCA}`;

const SQL_SOL_LISTAR = `SELECT S.ID, S.CARD_ID, ${CLI}, S.CARTEIRA, COALESCE(F.CHAVE, '') AS FASE_CHAVE, COALESCE(KF.NOME, '') AS FASE_NOME,
  ${KB_BRASILIA('K.FASE_DESDE')} AS FASE_DESDE, S.VALOR, S.TIPO_CLIENTE, COALESCE(AN.NOME, '') AS ANALISTA_NOME, S.PRAZO_DECISAO,
  ${ATRASADA()} AS ATRASADA, S.DECISAO_RESULTADO, S.DECIDIDA_EM, ${RATING_EFETIVO('S')} AS RATING
${FROM_SOL}
WHERE ${FILTRO_SOL}
ORDER BY S.PRAZO_DECISAO, S.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_SOL_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(S.VALOR), 0) AS VALOR,
  COALESCE(SUM(CASE WHEN S.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA') THEN 1 ELSE 0 END), 0) AS APROVADAS,
  COALESCE(SUM(CASE WHEN S.DECISAO_RESULTADO = 'RECUSADA' THEN 1 ELSE 0 END), 0) AS RECUSADAS,
  COALESCE(SUM(${ATRASADA()}), 0) AS ATRASADAS
${FROM_SOL}
WHERE ${FILTRO_SOL}`;

const SQL_ESTEIRA = `SELECT F.CHAVE AS FASE_CHAVE, KF.NOME AS FASE_NOME, F.ORDEM, KF.SLA_HORAS, COUNT(X.ID) AS QTD, COALESCE(SUM(X.VALOR), 0) AS VALOR,
  COALESCE(SUM(CASE WHEN X.ID IS NOT NULL AND X.ATRASADA = 0 THEN 1 ELSE 0 END), 0) AS NO_PRAZO, COALESCE(SUM(X.ATRASADA), 0) AS ATRASADAS
FROM CC_FASE F JOIN KB_FASE KF ON KF.ID = F.FASE_ID
LEFT JOIN (SELECT S.ID, S.VALOR, K.FASE_ID, ${ATRASADA('K', 'KF2', 'F2')} AS ATRASADA
  FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${EU}
  JOIN KB_CARD K ON K.ID = S.CARD_ID JOIN KB_FASE KF2 ON KF2.ID = K.FASE_ID JOIN CC_FASE F2 ON F2.FASE_ID = K.FASE_ID
  WHERE ${clienteVisivel('C')}) X ON X.FASE_ID = F.FASE_ID
WHERE F.QUADRO = CONCAT('concessao-', LOWER('{{carteira}}'))
GROUP BY F.CHAVE, KF.NOME, F.ORDEM, KF.SLA_HORAS
ORDER BY F.ORDEM`;

const SQL_HISTORICO = `SELECT S.ID AS SOLICITACAO_ID, S.CARTEIRA, S.CRIADO_EM, S.VALOR,
  COALESCE(D.RESULTADO, CASE WHEN S.ENCERRADA_EM IS NOT NULL THEN 'RECUSADA' ELSE '' END) AS RESULTADO,
  COALESCE(D.LIMITE_APROVADO, 0) AS LIMITE_APROVADO, COALESCE(D.RATING, '') AS RATING, COALESCE(D.RATING_PUB, '') AS RATING_PUB,
  COALESCE(M.NOME, '') AS RESPONSAVEL_NOME, COALESCE(D.EM, S.CRIADO_EM) AS EM
FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
${EU}
LEFT JOIN CC_DECISAO D ON D.ENTIDADE = 'SOLICITACAO' AND D.ENTIDADE_ID = S.ID
LEFT JOIN CC_MEMBRO M ON M.ID = D.RESPONSAVEL_ID
WHERE S.CLIENTE_ID = {{clienteId}} AND ${clienteVisivel('C')}
ORDER BY EM DESC, S.ID DESC
LIMIT 100`;

const VIGENTE_DO = (c) => `EXISTS (SELECT 1 FROM CC_CREDITO V1 WHERE V1.CLIENTE_ID = ${c} AND V1.VIGENTE_CHAVE IS NOT NULL)`;
const FAT_CARTEIRA = (cart) => `(SELECT COALESCE(SUM(FM.VALOR), 0) FROM CC_FATURAMENTO_MES FM JOIN CC_BU B ON B.ID = FM.BU_ID
    WHERE FM.CLIENTE_ID = C.ID AND B.CARTEIRA = '${cart}' AND ${MES_IDX('FM.MES')} >= ${MES_IDX('PRM.HOJE')} - 2)`;
const SQL_TIPO_CLIENTE = `SELECT C.ID AS CLIENTE_ID,
  CASE WHEN ${VIGENTE_DO('C.ID')} THEN 'RECORRENTE'
    WHEN EXISTS (SELECT 1 FROM CC_CREDITO V2 WHERE V2.CLIENTE_ID = C.ID AND V2.SITUACAO = 'OBSOLETO') THEN 'INATIVO'
    WHEN EXISTS (SELECT 1 FROM CC_SOLICITACAO V3 WHERE V3.CLIENTE_ID = C.ID) THEN 'RECORRENTE' ELSE 'NOVO' END AS TIPO_CLIENTE,
  CASE WHEN ${VIGENTE_DO('C.ID')} THEN 'crédito ativo na carteira'
    WHEN EXISTS (SELECT 1 FROM CC_CREDITO V2 WHERE V2.CLIENTE_ID = C.ID AND V2.SITUACAO = 'OBSOLETO') THEN 'cadastro obsoleto'
    WHEN EXISTS (SELECT 1 FROM CC_SOLICITACAO V3 WHERE V3.CLIENTE_ID = C.ID) THEN 'já tem solicitação registrada' ELSE 'sem solicitação anterior' END AS MOTIVO,
  CASE WHEN C.SETOR = 'PUBLICO' THEN 'PUBLICA' WHEN ${FAT_CARTEIRA('ESTETICA')} > ${FAT_CARTEIRA('PRIVADA')} THEN 'ESTETICA' ELSE 'PRIVADA' END AS CARTEIRA_SUGERIDA,
  P.ULTIMA_COMPRA, COALESCE(P.COMPRAS_QTD, 0) AS COMPRAS_QTD, CASE WHEN ${VIGENTE_DO('C.ID')} THEN 1 ELSE 0 END AS TEM_CREDITO_VIGENTE
FROM CC_CLIENTE C
${EU}
${PRM}
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = C.ID
WHERE C.ID = {{clienteId}} AND ${clienteVisivel('C')}`;

const FROM_CRED = `FROM CC_CREDITO CR
JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID
${EU}
${PRM}
JOIN CC_SOLICITACAO S ON S.ID = CR.SOLICITACAO_ID
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = CR.CLIENTE_ID
LEFT JOIN CC_RISCO_CLIENTE R ON R.CLIENTE_ID = CR.CLIENTE_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = CR.ANALISTA_ID`;
const COLS_CRED = `CR.ID, ${CLI}, CR.CARTEIRA, CR.LIMITE, COALESCE(P.UTILIZADO, 0) AS UTILIZADO, CR.PLANO_DESCR, CR.FORMA, CR.RATING_CONCESSAO,
  COALESCE(R.RATING_ATUAL, '') AS RATING_ATUAL, ${TEM_005 ? "COALESCE((SELECT AO.RATING_PUB FROM CC_ANALISE_ORGAO AO WHERE AO.ID = CR.ANALISE_ORGAO_ID), '')" : "''"} AS RATING_PUB,
  CR.INICIO_VALIDADE, CR.FIM_VALIDADE, CR.SITUACAO, CR.SITUACAO_EM, CR.MOTIVO_ENCAMINHAMENTO, COALESCE(R.DESTINO, '') AS DESTINO, S.CARD_ID,
  COALESCE(AN.NOME, '') AS ANALISTA_NOME, COALESCE(P.LIMITE, 0) AS LIMITE_WINTHOR, COALESCE(P.DISPONIVEL, 0) AS DISPONIVEL,
  COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.A_VENCER, 0) AS A_VENCER, COALESCE(R.CRITICIDADE, '') AS CRITICIDADE,
  COALESCE(P.COMPRAS_QTD, 0) AS COMPRAS_QTD, P.ULTIMA_COMPRA,
  CASE WHEN CR.VIGENTE_CHAVE IS NOT NULL AND COALESCE(P.LIMITE, 0) <> CR.LIMITE THEN 1 ELSE 0 END AS LIMITE_DIVERGE,
  (SELECT COUNT(*) FROM CC_PEDIDO_RETIDO PR WHERE PR.CLIENTE_ID = CR.CLIENTE_ID AND PR.DECISAO_RESULTADO = '') AS PEDIDOS_RETIDOS`;
const FILTRO_CRED = `${clienteVisivel('C')}
  AND ('{{carteira}}' = '' OR CR.CARTEIRA = '{{carteira}}')
  AND ('{{situacao}}' = '' OR CR.SITUACAO = '{{situacao}}')
  AND ({{analistaId}} = 0 OR CR.ANALISTA_ID = {{analistaId}})
  AND ({{vencendoEmDias}} = 0 OR (CR.SITUACAO = 'GESTAO' AND DATEDIFF(CR.FIM_VALIDADE, PRM.HOJE) BETWEEN 0 AND {{vencendoEmDias}}))
  AND ({{vencidos}} = 0 OR (CR.VIGENTE_CHAVE IS NOT NULL AND CR.FIM_VALIDADE < PRM.HOJE))
  AND ({{divergeWinthor}} = 0 OR (CR.VIGENTE_CHAVE IS NOT NULL AND COALESCE(P.LIMITE, 0) <> CR.LIMITE))
  AND ${BUSCA}`;
const SQL_CRED_LISTAR = `SELECT ${COLS_CRED}
${FROM_CRED}
WHERE ${FILTRO_CRED}
ORDER BY CR.FIM_VALIDADE, CR.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_CRED_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_CRED}
WHERE ${FILTRO_CRED}`;
const SQL_CRED_RESUMO = `SELECT COALESCE(SUM(CASE WHEN CR.VIGENTE_CHAVE IS NOT NULL THEN 1 ELSE 0 END), 0) AS VIGENTES,
  COALESCE(SUM(CASE WHEN CR.VIGENTE_CHAVE IS NOT NULL THEN CR.LIMITE ELSE 0 END), 0) AS LIMITE_TOTAL,
  COALESCE(SUM(CASE WHEN CR.VIGENTE_CHAVE IS NOT NULL THEN COALESCE(P.UTILIZADO, 0) ELSE 0 END), 0) AS UTILIZADO_TOTAL,
  COALESCE(SUM(CASE WHEN CR.SITUACAO = 'GESTAO' AND DATEDIFF(CR.FIM_VALIDADE, PRM.HOJE) BETWEEN 0 AND 30 THEN 1 ELSE 0 END), 0) AS VENCENDO_30D,
  COALESCE(SUM(CASE WHEN CR.VIGENTE_CHAVE IS NOT NULL AND CR.FIM_VALIDADE < PRM.HOJE THEN 1 ELSE 0 END), 0) AS VENCIDOS,
  COALESCE(SUM(CASE WHEN CR.SITUACAO = 'REANALISE' THEN 1 ELSE 0 END), 0) AS EM_REANALISE,
  COALESCE(SUM(CASE WHEN CR.SITUACAO = 'OBSOLETO' THEN 1 ELSE 0 END), 0) AS OBSOLETOS
${FROM_CRED}
WHERE ${clienteVisivel('C')} AND ('{{carteira}}' = '' OR CR.CARTEIRA = '{{carteira}}')`;

const FILTRO_REVISAO = `${clienteVisivel('C')} AND CR.SITUACAO = 'GESTAO' AND COALESCE(R.REVISAO_GATILHOS, '') <> ''
  AND ('{{carteira}}' = '' OR CR.CARTEIRA = '{{carteira}}')
  AND ('{{gatilho}}' = '' OR FIND_IN_SET('{{gatilho}}', R.REVISAO_GATILHOS) > 0)`;
const SQL_REVISAO_LISTAR = `SELECT ${COLS_CRED}, R.REVISAO_GATILHOS
${FROM_CRED}
WHERE ${FILTRO_REVISAO}
ORDER BY CR.FIM_VALIDADE, CR.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_REVISAO_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_CRED}
WHERE ${FILTRO_REVISAO}`;

const FROM_PED = `FROM CC_PEDIDO_RETIDO P
JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
${EU}
LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = P.ANALISTA_ID`;
const FILTRO_PED = `${clienteVisivel('C')}
  AND ('{{faseChave}}' = '' OR F.CHAVE = '{{faseChave}}')
  AND ({{analistaId}} = 0 OR P.ANALISTA_ID = {{analistaId}})
  AND ('{{situacao}}' = '' OR ('{{situacao}}' = 'ABERTO' AND P.DECISAO_RESULTADO = '') OR P.DECISAO_RESULTADO = '{{situacao}}')
  AND ${BUSCA}`;
const SQL_PED_LISTAR = `SELECT P.*, C.CODCLI, C.NOME AS CLIENTE_NOME, COALESCE(F.CHAVE, '') AS FASE_CHAVE, COALESCE(KF.NOME, '') AS FASE_NOME,
  ${KB_BRASILIA('K.FASE_DESDE')} AS FASE_DESDE, ${ATRASADA()} AS ATRASADO, COALESCE(AN.NOME, '') AS ANALISTA_NOME
${FROM_PED}
WHERE ${FILTRO_PED}
ORDER BY P.CRIADO_EM DESC, P.ID DESC
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_PED_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(${ATRASADA()}), 0) AS ATRASADOS
${FROM_PED}
WHERE ${FILTRO_PED}`;

const FROM_PEND = `FROM CC_PENDENCIA_WINTHOR PW
JOIN CC_CLIENTE C ON C.ID = PW.CLIENTE_ID
${EU}`;
const FILTRO_PEND = `${clienteVisivel('C')}
  AND ('{{tipo}}' = '' OR PW.TIPO = '{{tipo}}')
  AND ('{{situacao}}' = '' OR ('{{situacao}}' = 'PENDENTE' AND PW.APLICADA_EM IS NULL) OR ('{{situacao}}' = 'APLICADA' AND PW.APLICADA_EM IS NOT NULL))
  AND ${BUSCA}`;
const SQL_PEND_LISTAR = `SELECT PW.*, C.CODCLI, C.NOME AS CLIENTE_NOME
${FROM_PEND}
WHERE ${FILTRO_PEND}
ORDER BY PW.GERADA_EM, PW.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_PEND_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_PEND}
WHERE ${FILTRO_PEND}`;

/* Fila do crédito (RN-041): seis ramos sobre o membro pedido `T` (0 = eu; outro só abaixo de mim). */
const ALVO = `JOIN CC_MEMBRO T ON T.ATIVO = TRUE AND T.ID = (CASE WHEN {{membroId}} = 0 THEN EU.ID ELSE {{membroId}} END)
  AND ${membroVisivel('T.ID', 'EU')}`;
// CARTEIRA: a do card (abre no quadro certo); '' = quadro pedidos-limite.
const RAMO = (tipo, from, where, data, atrasado, textoSql, card, carteira = 'X1.CARTEIRA') => `SELECT '${tipo}' AS TIPO, ${CLI}, ${card} AS CARD_ID, ${data} AS DATA,
  ${atrasado} AS ATRASADO, ${textoSql} AS TEXTO, ${carteira} AS CARTEIRA
${from}
JOIN CC_CLIENTE C ON C.ID = X1.CLIENTE_ID
${EU}
${PRM}
${ALVO}
WHERE ${clienteVisivel('C')} AND ${where}`;
const SOL_X1 = `FROM CC_SOLICITACAO X1 JOIN KB_CARD KX ON KX.ID = X1.CARD_ID JOIN CC_FASE FX ON FX.FASE_ID = KX.FASE_ID`;
const SQL_AGENDA_UNIAO = [
  RAMO('SOLICITACAO_PRAZO', SOL_X1, `X1.ANALISTA_ID = T.ID AND ${ABERTA('X1')} AND X1.DECIDIDA_EM IS NULL AND X1.PRAZO_DECISAO <= PRM.HOJE`,
    'X1.PRAZO_DECISAO', "CASE WHEN X1.PRAZO_DECISAO < PRM.HOJE THEN 1 ELSE 0 END", "CONCAT('Decidir até ', COALESCE(X1.PRAZO_DECISAO, ''))", 'X1.CARD_ID'),
  RAMO('AJUSTE_DECIDIR', `${SOL_X1} JOIN CC_MEMBRO AJ ON AJ.ID = X1.AJUSTE_POR`,
    "X1.AJUSTE_SITUACAO = 'PENDENTE' AND AJ.ID <> T.ID AND T.CAMINHO <> '' AND AJ.CAMINHO LIKE CONCAT(T.CAMINHO, '%')",
    'SUBSTRING(X1.CRIADO_EM, 1, 10)', '0', "CONCAT('Aprovar ajuste de rating para ', X1.RATING_AJUSTE)", 'X1.CARD_ID'),
  RAMO('DECISAO_ALCADA', SOL_X1, `FX.CHAVE = 'comite' AND X1.DECISAO_RESULTADO IN ('', 'PRE_APROVADA') AND X1.ENCERRADA_EM IS NULL
    AND COALESCE(X1.ANALISTA_ID, 0) <> T.ID AND ${NAO_PROPONENTE('X1.PROPOSTA_POR', 'T.ID')} AND T.NIVEL >= ${NIVEL_CONCESSAO('X1', '0')}${TEM_005
    ? `\n    AND NOT EXISTS (SELECT 1 FROM CC_ANALISE_ORGAO AOX WHERE AOX.SOLICITACAO_ID = X1.ID AND NOT ${NAO_PROPONENTE('AOX.PROPOSTA_POR', 'T.ID')})` : ''}`,
    'X1.PRAZO_DECISAO', "CASE WHEN X1.PRAZO_DECISAO < PRM.HOJE THEN 1 ELSE 0 END", `CONCAT('Decidir na alçada: ', ${ROTULO_CONCESSAO('X1', '0')})`, 'X1.CARD_ID'),
  RAMO('PENDENCIA_WINTHOR', `FROM CC_PENDENCIA_WINTHOR X1 LEFT JOIN CC_SOLICITACAO SX ON X1.ORIGEM = 'SOLICITACAO' AND SX.ID = X1.ORIGEM_ID
    LEFT JOIN CC_CREDITO CX ON X1.ORIGEM = 'CREDITO' AND CX.ID = X1.ORIGEM_ID LEFT JOIN CC_SOLICITACAO SC ON SC.ID = CX.SOLICITACAO_ID
    LEFT JOIN CC_PEDIDO_RETIDO PX ON X1.ORIGEM = 'PEDIDO' AND PX.ID = X1.ORIGEM_ID`,
    'X1.APLICADA_EM IS NULL AND COALESCE(SX.ANALISTA_ID, CX.ANALISTA_ID, PX.ANALISTA_ID, 0) = T.ID',
    'SUBSTRING(X1.GERADA_EM, 1, 10)', '0', 'X1.DESCRICAO', 'COALESCE(SX.CARD_ID, SC.CARD_ID, PX.CARD_ID)', "COALESCE(SX.CARTEIRA, CX.CARTEIRA, '')"),
  RAMO('REANALISE', 'FROM CC_CREDITO X1 JOIN CC_SOLICITACAO SX ON SX.ID = X1.SOLICITACAO_ID',
    `X1.SITUACAO = 'REANALISE' AND COALESCE(X1.ANALISTA_ID, 0) <> T.ID AND T.NIVEL >= ${FAIXA_CONCESSAO('X1.LIMITE', 'X1.CARTEIRA')}`,
    'X1.FIM_VALIDADE', '0', "CONCAT('Concluir a reanálise: ', X1.MOTIVO_ENCAMINHAMENTO)", 'SX.CARD_ID'),
  RAMO('PEDIDO', 'FROM CC_PEDIDO_RETIDO X1', "X1.DECISAO_RESULTADO = '' AND X1.ANALISTA_ID = T.ID",
    'SUBSTRING(X1.CRIADO_EM, 1, 10)', '0', "CONCAT('Pedido ', X1.NUMERO_PEDIDO, ' retido: ', X1.ALCADA_EXIGIDA)", 'X1.CARD_ID', "''"),
].join('\nUNION ALL\n');
const SQL_AGENDA_LISTAR = `SELECT A1.* FROM (${SQL_AGENDA_UNIAO}) A1
ORDER BY A1.ATRASADO DESC, A1.DATA, A1.CODCLI
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_AGENDA_TOTAL = `SELECT COUNT(*) AS TOTAL FROM (${SQL_AGENDA_UNIAO}) A1`;

/* Risco do cliente: carteira e limite pela solicitação de origem e pelo crédito vigente. */
const FROM_RISCO = `FROM CC_RISCO_CLIENTE R
JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID
${EU}
LEFT JOIN CC_SOLICITACAO S ON S.ID = R.SOLICITACAO_ID
LEFT JOIN CC_CREDITO CR ON CR.ID = R.CREDITO_ID
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = R.CLIENTE_ID`;
const CART_RISCO = "('{{carteira}}' = '' OR S.CARTEIRA = '{{carteira}}')";

const SQL_FAROL_CARTEIRA = `SELECT R.RATING_ATUAL AS RATING, COUNT(*) AS CLIENTES, COALESCE(SUM(CR.LIMITE), 0) AS LIMITE,
  COALESCE(SUM(P.UTILIZADO), 0) AS UTILIZADO, COALESCE(SUM(P.VENCIDO), 0) AS VENCIDO,
  COALESCE(SUM(CASE WHEN R.REBAIXADO = TRUE THEN 1 ELSE 0 END), 0) AS REBAIXADOS
${FROM_RISCO}
WHERE ${clienteVisivel('C')} AND CR.VIGENTE_CHAVE IS NOT NULL AND R.RATING_ATUAL <> '' AND ${CART_RISCO}
GROUP BY R.RATING_ATUAL
ORDER BY ${IDX('R.RATING_ATUAL')}`;
const FILTRO_FAROL = `${clienteVisivel('C')} AND ${CART_RISCO}
  AND ('{{rating}}' = '' OR R.RATING_ATUAL = '{{rating}}')
  AND ({{rebaixado}} = -1 OR (CASE WHEN R.REBAIXADO = TRUE THEN 1 ELSE 0 END) = {{rebaixado}}) AND ${BUSCA}`;
const COLS_RISCO = `${CLI}, R.CREDITO_ID, R.SOLICITACAO_ID, R.SCORE_COMP, R.SCORE_FINAL, R.FAIXA_SCORE, R.FAIXA_ATRASO, R.RATING_ATUAL, R.REBAIXADO,
  R.ALERTAS, R.LIMITE_SUGERIDO, R.CRITICIDADE, R.CRIT_MOTIVOS, R.SAUDE, R.SAUDE_SINAIS, R.FLEX_PCT, R.FLEX_VALOR, R.FLEX_MOTIVOS, R.PROB_ATRASO,
  R.REVISAO_GATILHOS, R.DESTINO, R.LIMITE_DIVERGE, R.CALCULADO_EM, COALESCE(S.CARTEIRA, '') AS CARTEIRA,
  COALESCE(CR.LIMITE, P.LIMITE, 0) AS LIMITE, COALESCE(P.UTILIZADO, 0) AS UTILIZADO, COALESCE(P.VENCIDO, 0) AS VENCIDO,
  COALESCE(P.A_VENCER, 0) AS A_VENCER, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO`;
const SQL_FAROL_LISTAR = `SELECT ${COLS_RISCO}, CASE WHEN COALESCE(CR.LIMITE, 0) > R.LIMITE_SUGERIDO THEN 1 ELSE 0 END AS ACIMA_SUGERIDO
${FROM_RISCO}
WHERE ${FILTRO_FAROL}
ORDER BY ${IDX('R.RATING_ATUAL')} DESC, C.NOME
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_FAROL_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_RISCO}
WHERE ${FILTRO_FAROL}`;

const PROXIMA_REVISAO = (d) => {
  const k = `(${MES_IDX(d)} - 1 + ${PARAM_NUM('cred.calibRevisaoMeses')})`;
  const mes = `(MOD(${k}, 12) + 1)`;
  return `CONCAT(CAST(FLOOR(${k} / 12) AS SIGNED), '-', CASE WHEN ${mes} < 10 THEN '0' ELSE '' END, CAST(${mes} AS SIGNED), SUBSTRING(${d}, 8, 3))`;
};
const SQL_REVISAO_CALIB = `SELECT RV.ID, RV.REVISADO_EM, RV.PARECER, RV.POR_ID, COALESCE(M.NOME, '') AS POR_NOME, RV.EM,
  ${PROXIMA_REVISAO('RV.REVISADO_EM')} AS PROXIMA,
  CASE WHEN ${PROXIMA_REVISAO('RV.REVISADO_EM')} < PRM.HOJE THEN 1 ELSE 0 END AS VENCIDA
FROM CC_CALIBRACAO_REVISAO RV
${EU}
${PRM}
LEFT JOIN CC_MEMBRO M ON M.ID = RV.POR_ID
WHERE ${NIVEL_MIN(2, 'EU')}
ORDER BY RV.REVISADO_EM DESC, RV.ID DESC
LIMIT 20`;

const GRUPO = (analista, rating) => `(CASE '{{agrupar}}' WHEN 'ANALISTA' THEN CAST(COALESCE(${analista}, 0) AS CHAR) WHEN 'RATING' THEN COALESCE(${rating}, '') ELSE '' END)`;
const GRUPO_NOME = (rating) => `(CASE '{{agrupar}}' WHEN 'ANALISTA' THEN COALESCE(MAX(AN.NOME), 'Sem analista') WHEN 'RATING' THEN COALESCE(MAX(${rating}), '') ELSE '' END)`;
const SQL_SAUDE_RESUMO = `SELECT ${GRUPO('CR.ANALISTA_ID', 'CR.RATING_CONCESSAO')} AS GRUPO, ${GRUPO_NOME('CR.RATING_CONCESSAO')} AS GRUPO_NOME,
  COALESCE(SUM(CASE WHEN R.SAUDE = 'SAUDAVEL' THEN 1 ELSE 0 END), 0) AS SAUDAVEL,
  COALESCE(SUM(CASE WHEN R.SAUDE = 'ATENCAO' THEN 1 ELSE 0 END), 0) AS ATENCAO,
  COALESCE(SUM(CASE WHEN R.SAUDE = 'RISCO' THEN 1 ELSE 0 END), 0) AS RISCO,
  ROUND(COALESCE(SUM(CASE WHEN R.SAUDE = 'SAUDAVEL' THEN 1 ELSE 0 END), 0) * 100.0 / COUNT(*), 2) AS INDICE
${FROM_RISCO}
LEFT JOIN CC_MEMBRO AN ON AN.ID = CR.ANALISTA_ID
WHERE ${clienteVisivel('C')} AND CR.VIGENTE_CHAVE IS NOT NULL AND R.SAUDE <> '' AND ${CART_RISCO}
GROUP BY ${GRUPO('CR.ANALISTA_ID', 'CR.RATING_CONCESSAO')}
ORDER BY GRUPO`;
const FILTRO_SAUDE = `${clienteVisivel('C')} AND CR.VIGENTE_CHAVE IS NOT NULL AND R.SAUDE <> '' AND ${CART_RISCO}
  AND ('{{saude}}' = '' OR R.SAUDE = '{{saude}}') AND ${BUSCA}`;
const SQL_SAUDE_LISTAR = `SELECT ${COLS_RISCO}, COALESCE(AN.NOME, '') AS ANALISTA_NOME, CR.RATING_CONCESSAO, COALESCE(MD.NOME, '') AS APROVADO_POR_NOME
${FROM_RISCO}
LEFT JOIN CC_MEMBRO AN ON AN.ID = CR.ANALISTA_ID
LEFT JOIN CC_DECISAO D ON D.ID = CR.DECISAO_ID
LEFT JOIN CC_MEMBRO MD ON MD.ID = D.RESPONSAVEL_ID
WHERE ${FILTRO_SAUDE}
ORDER BY CASE R.SAUDE WHEN 'RISCO' THEN 0 WHEN 'ATENCAO' THEN 1 ELSE 2 END, C.NOME
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_SAUDE_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_RISCO}
WHERE ${FILTRO_SAUDE}`;

const FILTRO_RISCO = `${clienteVisivel('C')} AND CR.VIGENTE_CHAVE IS NOT NULL AND ${CART_RISCO} AND CR.CARTEIRA <> 'PUBLICA' AND ${CLASSE} <> ''`;
const SQL_RISCO_RESUMO = `SELECT ${GRUPO('CR.ANALISTA_ID', 'CR.RATING_CONCESSAO')} AS GRUPO, ${GRUPO_NOME('CR.RATING_CONCESSAO')} AS GRUPO_NOME,
  ${CLASSE} AS CLASSE, COUNT(*) AS CLIENTES, COALESCE(SUM(CR.LIMITE), 0) AS LIMITE, COALESCE(SUM(P.UTILIZADO), 0) AS UTILIZADO,
  COALESCE(SUM(P.VENCIDO), 0) AS VENCIDO
${FROM_RISCO}
LEFT JOIN CC_MEMBRO AN ON AN.ID = CR.ANALISTA_ID
WHERE ${FILTRO_RISCO}
GROUP BY GRUPO, CLASSE
ORDER BY GRUPO, CLASSE`;
const FILTRO_RISCO_LISTA = `${FILTRO_RISCO} AND ('{{classe}}' = '' OR ${CLASSE} = '{{classe}}') AND ${BUSCA}`;
const SQL_RISCO_LISTAR = `SELECT ${COLS_RISCO}, CR.RATING_CONCESSAO, ${CLASSE} AS CLASSE
${FROM_RISCO}
WHERE ${FILTRO_RISCO_LISTA}
ORDER BY C.NOME
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_RISCO_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_RISCO}
WHERE ${FILTRO_RISCO_LISTA}`;

const FILTRO_CRIT = `${clienteVisivel('C')} AND ${CART_RISCO} AND R.CRITICIDADE <> 'NORMAL'
  AND ('{{criticidade}}' = '' OR R.CRITICIDADE = '{{criticidade}}') AND ${BUSCA}`;
const SQL_CRIT_LISTAR = `SELECT ${COLS_RISCO}, P.PONTUALIDADE_PCT, S.SCORE_SERASA, COALESCE(P.PRAZO_MEDIO_DIAS, 0) AS PRAZO_MEDIO_DIAS,
  COALESCE((SELECT KF.NOME FROM KB_CARD K JOIN KB_FASE KF ON KF.ID = K.FASE_ID WHERE K.ID = S.CARD_ID), '') AS FASE_NOME
${FROM_RISCO}
WHERE ${FILTRO_CRIT}
ORDER BY CASE R.CRITICIDADE WHEN 'CRITICO' THEN 0 ELSE 1 END, C.NOME
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_CRIT_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_RISCO}
WHERE ${FILTRO_CRIT}`;

const SQL_FLEX = `SELECT COUNT(*) AS PEDIDOS,
  COALESCE(SUM(CASE WHEN P.DECISAO_RESULTADO = 'LIBERADO' THEN 1 ELSE 0 END), 0) AS FLEXIBILIZADOS,
  CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(CASE WHEN P.DECISAO_RESULTADO = 'LIBERADO' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) END AS TAXA_PCT,
  CASE WHEN SUM(CASE WHEN P.DECISAO_RESULTADO = 'LIBERADO' THEN 1 ELSE 0 END) > 0
    THEN ROUND(SUM(CASE WHEN P.DECISAO_RESULTADO = 'LIBERADO' AND P.DENTRO_REGRA = TRUE THEN 1 ELSE 0 END) * 100.0
      / SUM(CASE WHEN P.DECISAO_RESULTADO = 'LIBERADO' THEN 1 ELSE 0 END), 0) END AS DENTRO_REGRA_PCT,
  ${PARAM_NUM('flex.metaTaxaPct', "'{{carteira}}'")} AS META_TAXA_PCT, ${PARAM_NUM('flex.metaConfPct', "'{{carteira}}'")} AS META_CONF_PCT
FROM CC_PEDIDO_RETIDO P
JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
LEFT JOIN CC_CREDITO CRF ON CRF.ID = P.CREDITO_ID
${EU}
WHERE ${clienteVisivel('C')} AND P.DECISAO_RESULTADO <> '' AND P.DECIDIDO_EM IS NOT NULL
  AND ('{{carteira}}' = '' OR COALESCE(CRF.CARTEIRA, CASE WHEN C.SETOR = 'PUBLICO' THEN 'PUBLICA' ELSE 'PRIVADA' END) = '{{carteira}}')
  AND ('{{de}}' = '' OR SUBSTRING(P.DECIDIDO_EM, 1, 10) >= '{{de}}') AND ('{{ate}}' = '' OR SUBSTRING(P.DECIDIDO_EM, 1, 10) <= '{{ate}}')`;

/* ── leituras JAVASCRIPT ── */

/** Vê a solicitação: cliente visível, ou alçada lendo o card em `comite` (DT-35). */
const podeVer = (m, s, p) => visivel(m, s) || (s.FASE_CHAVE === 'comite' && m.nivel >= Number(p['alcada.nivelSupervisor']));

const corpoMotorCalcular = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const sobre = lerJsonSeguro(event.entradas, {});
  const simula = Object.keys(sobre).length > 0;
  const id = inteiro(event.solicitacaoId);
  if (!id) {
    if (!simula) return recusar('Informe a solicitação ou as entradas da simulação.');
    const carteira = ['PRIVADA', 'ESTETICA'].includes(sobre.carteira) ? sobre.carteira : 'PRIVADA';
    if (sobre.carteira === 'PUBLICA') return recusar('O simulador é das carteiras com motor próprio.');
    const p = await parametros(carteira);
    const e = { tipoCliente: 'NOVO', tipoPessoa: 'J', scoreSerasa: null, pontualidade: null, diasAtraso: 0, compraMedia: 0, prazoMedio: 0, fatMensal: null,
      pl: null, garantia: '', valor: 0, alertas: [], consultas: {}, carteiraLimites: null, exposicaoGrupo: 0, hoje: hoje(), docsAtendidos: {}, ...sobre };
    return { ok: true, ...motor(e, p) };
  }
  const s = await solicitacaoPor(`S.ID = ${id}`);
  const p = s ? await parametros(s.CARTEIRA) : null;
  if (!s || !podeVer(m, s, p)) return recusar('Solicitação não encontrada.');
  const gravar = inteiro(event.gravar) === 1 && !simula;
  if (gravar && !ehCaso(m, s.CASO_CAMINHO)) return recusar('Só o analista do caso ou o superior grava o cálculo do motor.');
  if (s.CARTEIRA === 'PUBLICA') {
    if (!idDe('ccPubMotorCalcular')) return recusar('O motor do órgão não está instalado.');
    const r = await escrever('ccPubMotorCalcular', { solicitacaoId: id, gravar: gravar ? 1 : 0, membroId: m.membroId });
    if (!r || r.ok === false) return r || recusar('O motor do órgão não respondeu.');
    // Capa do card público vem da análise do órgão (DT-36); só quando a fotografia foi regravada.
    if (gravar) {
      await atualizarCard(s.CARD_ID, m.userId || await usuarioDe(m.membroId), { rating: r.ratingPub || '', limite_sugerido: numero(r.exposicao),
        alcada: alcadaDe(s, 0, p, { EXPOSICAO: r.exposicao }).rotulo });
    }
    return { ok: true, rating: r.ratingPub, limiteSugerido: r.exposicao, resultado: r.decisaoSugerida, score: r.nota, alertas: r.faltando || [],
      detalhes: r, podeAprovar: r.podeAprovar, motivoNaoAprovar: r.motivoNaoAprovar };
  }
  const r = motor(await entradasDe(s, sobre, p), p);
  if (gravar && (r.rating || '') !== (s.RATING_MOTOR || '') || gravar && numero(r.limiteSugerido) !== numero(s.MOTOR_LIMITE)
    || gravar && r.codigo !== (s.MOTOR_RESULTADO || '')) {
    await escrever('ccEscCredSolicitacaoMotor', { solicitacaoId: id, rating: r.rating || '', limite: r.limiteSugerido, resultado: r.codigo, membroId: m.membroId, agora: agora() });
    await auditar('Crédito', 'SOLICITACAO', id, s.CLIENTE_ID, [{ campo: 'Motor', antes: `${s.RATING_MOTOR || '—'} ${numero(s.MOTOR_LIMITE)}`,
      depois: `${r.rating || '—'} ${numero(r.limiteSugerido)}` }], m);
  }
  return { ok: true, ...r };
};

const corpoSolicitacaoFicha = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const s = await solicitacaoPor(inteiro(event.solicitacaoId) ? `S.ID = ${inteiro(event.solicitacaoId)}` : `S.CARD_ID = ${inteiro(event.cardId)}`);
  const p = s ? await parametros(s.CARTEIRA) : null;
  if (!s || !podeVer(m, s, p)) return recusar('Solicitação não encontrada.');
  const e = await entradasDe(s, {}, p);
  const proprio = s.CARTEIRA !== 'PUBLICA';
  const r = proprio ? motor(e, p) : null;
  const ao = await analiseOrgaoDe(s);
  const alcada = alcadaDe(s, 0, p, ao);
  const fat = await ler(`SELECT F.MES, F.BU_ID, COALESCE(B.NOME, 'Sem BU') AS BU_NOME, F.VALOR FROM CC_FATURAMENTO_MES F LEFT JOIN CC_BU B ON B.ID = F.BU_ID
WHERE F.CLIENTE_ID = ${inteiro(s.CLIENTE_ID)} ORDER BY F.MES DESC, F.BU_ID LIMIT 36`);
  const decisoes = await ler(`SELECT D.*, COALESCE(M.NOME, '') AS RESPONSAVEL_NOME FROM CC_DECISAO D LEFT JOIN CC_MEMBRO M ON M.ID = D.RESPONSAVEL_ID
WHERE D.ENTIDADE = 'SOLICITACAO' AND D.ENTIDADE_ID = ${inteiro(s.ID)} ORDER BY D.ID DESC`);
  const [credito] = await ler(`SELECT CR.* FROM CC_CREDITO CR WHERE CR.SOLICITACAO_ID = ${inteiro(s.ID)} ORDER BY CR.ID DESC LIMIT 1`);
  const [risco] = await ler(`SELECT * FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ${inteiro(s.CLIENTE_ID)}`);
  const pendWinthor = await ler(`SELECT * FROM CC_PENDENCIA_WINTHOR WHERE CLIENTE_ID = ${inteiro(s.CLIENTE_ID)} AND APLICADA_EM IS NULL ORDER BY ID`);
  const caso = ehCaso(m, s.CASO_CAMINHO);
  const aberta = !s.ENCERRADA_EM && !credito;
  const naoDecidida = !s.DECIDIDA_EM;
  const antesComite = !ehVerdade(s.FASE_FINAL) && inteiro(s.FASE_ORDEM) < inteiro(s.ORDEM_COMITE);
  const proponente = naLista(s.PROPOSTA_POR, m.membroId) || (!!ao && naLista(ao.PROPOSTA_POR, m.membroId));
  const pode = {
    salvar: caso && aberta && naoDecidida,
    atribuir: nivelMin(m, 2) && visivel(m, s) && aberta && antesComite,
    recusar: caso && aberta && naoDecidida && antesComite,
    ajustar: caso && proprio && aberta && naoDecidida,
    decidirAjuste: s.AJUSTE_SITUACAO === 'PENDENTE' && !!s.AJUSTE_CAMINHO && inteiro(s.AJUSTE_POR) !== m.membroId && ehCaso(m, s.AJUSTE_CAMINHO),
    decidir: s.FASE_CHAVE === 'comite' && ['', 'PRE_APROVADA'].includes(s.DECISAO_RESULTADO || '') && m.nivel >= alcada.nivel
      && inteiro(s.ANALISTA_ID) !== m.membroId && !proponente,
    aplicar: caso && pendWinthor.length > 0,
    reanaliseAbrir: !!credito && credito.SITUACAO === 'GESTAO' && nivelMin(m, 2) && visivel(m, s),
    reanaliseConcluir: !!credito && credito.SITUACAO === 'REANALISE' && inteiro(credito.ANALISTA_ID) !== m.membroId,
  };
  const { posicao, ...entradas } = e;
  return {
    ok: true, solicitacao: { ...s, VALORES_JSON: undefined }, cliente: { ID: s.CLIENTE_ID, CODCLI: s.CODCLI, NOME: s.CLIENTE_NOME, SETOR: s.SETOR,
      TIPO_PESSOA: s.TIPO_PESSOA, GRUPO_ECONOMICO: s.GRUPO_ECONOMICO },
    posicao, faturamento: fat, entradas,
    consultasValidas: consultasValidas(entradas.consultas, s.TIPO_PESSOA, hoje(), p),
    motor: r, ratingEfetivo: ratingEfetivo(s), alcada: { nivel: alcada.nivel, rotulo: alcada.rotulo, valor: alcada.valor, excecao: alcada.excecao, motivos: alcada.motivos },
    decisoes, credito: credito ? { ...credito, risco: risco || null } : null, pendencias: pendenciasDe(s, p), pendenciasWinthor: pendWinthor,
    analiseOrgaoId: ao ? inteiro(ao.ID) : null, pode,
  };
};

const corpoPedidoFicha = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [pd] = await ler(`SELECT P.*, C.CODCLI, C.NOME AS CLIENTE_NOME, C.NO_JURIDICO, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO,
  CS.CAMINHO AS CASO_CAMINHO, F.CHAVE AS FASE_CHAVE
FROM CC_PEDIDO_RETIDO P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID
LEFT JOIN CC_MEMBRO CS ON CS.ID = COALESCE(P.ANALISTA_ID, P.CRIADO_POR)
LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE ${inteiro(event.pedidoId) ? `P.ID = ${inteiro(event.pedidoId)}` : `P.CARD_ID = ${inteiro(event.cardId)}`}`);
  if (!pd || !(visivel(m, pd) || m.nivel >= inteiro(pd.NIVEL_EXIGIDO))) return recusar('Pedido não encontrado.');
  const [posicao] = await ler(`${SQL_POS}${inteiro(pd.CLIENTE_ID)}`);
  const [credito] = await ler(`SELECT * FROM CC_CREDITO WHERE VIGENTE_CHAVE = ${inteiro(pd.CLIENTE_ID)}`);
  const [risco] = await ler(`SELECT * FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ${inteiro(pd.CLIENTE_ID)}`);
  const [decisao] = await ler(`SELECT D.*, COALESCE(M.NOME, '') AS RESPONSAVEL_NOME FROM CC_DECISAO D LEFT JOIN CC_MEMBRO M ON M.ID = D.RESPONSAVEL_ID
WHERE D.ENTIDADE = 'PEDIDO' AND D.ENTIDADE_ID = ${inteiro(pd.ID)} ORDER BY D.ID DESC LIMIT 1`);
  const autor = [inteiro(pd.ANALISTA_ID), inteiro(pd.CRIADO_POR)].includes(m.membroId) || naLista(pd.RECOMENDADO_POR, m.membroId);
  return {
    ok: true, pedido: pd, cliente: { ID: pd.CLIENTE_ID, CODCLI: pd.CODCLI, NOME: pd.CLIENTE_NOME }, posicao: posicao || null, credito: credito || null,
    risco: risco || null, alcada: { nivel: inteiro(pd.NIVEL_EXIGIDO), rotulo: pd.ALCADA_EXIGIDA, critica: ehVerdade(pd.CRITICA) }, decisao: decisao || null,
    pode: { salvar: ehCaso(m, pd.CASO_CAMINHO) && !pd.DECISAO_RESULTADO, decidir: !pd.DECISAO_RESULTADO && !autor && m.nivel >= inteiro(pd.NIVEL_EXIGIDO) },
  };
};

const corpoFarolValidacao = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor ou acima.');
  const carteira = ['PRIVADA', 'ESTETICA'].includes(event.carteira) ? event.carteira : '';
  const p = await parametros(carteira);
  const linhas = await ler(`SELECT MES, FAIXA, SUM(VENCIDO) AS VENCIDO, SUM(VENCIDO + A_VENCER) AS SALDO FROM CC_CALIBRACAO
WHERE CARTEIRA <> 'PUBLICA' ${carteira ? `AND CARTEIRA = ${q(carteira)}` : ''} GROUP BY MES, FAIXA ORDER BY MES DESC`);
  const meses = [...new Set(linhas.map((l) => l.MES))].slice(0, Number(p['cred.calibMinMeses']));
  const faixas = {};
  for (const l of linhas.filter((x) => meses.includes(x.MES))) {
    const f = faixas[l.FAIXA] || (faixas[l.FAIXA] = { saldo: 0, vencido: 0 });
    f.saldo += numero(l.SALDO); f.vencido += numero(l.VENCIDO);
  }
  const leitura = leituraFarol(faixas, meses.length, p);
  return { ok: true, carteira, ...(leitura || { leituras: [], aviso: 'Sem foto da carteira: não há leitura.', mesesDeBase: 0 }), semLeitura: !leitura };
};

const corpoDesempenho = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor ou acima.');
  const carteira = ['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(event.carteira) ? event.carteira : '';
  const de = /^\d{4}-\d{2}-\d{2}$/.test(String(event.de || '')) ? event.de : '0000-00-00';
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(String(event.ate || '')) ? event.ate : '9999-12-31';
  const hojeTxt = hoje();
  const visao = `${SQL_MEMBRO_A.split('#M#').join(String(m.membroId))}`;
  const filtroCart = carteira ? `AND S.CARTEIRA = ${q(carteira)}` : '';
  const sols = await ler(`SELECT S.ID, S.ANALISTA_ID, COALESCE(AN.NOME, '') AS ANALISTA_NOME, S.CRIADO_EM, S.PRAZO_DECISAO, S.DECIDIDA_EM, S.DECISAO_RESULTADO,
  S.ENCERRADA_EM, S.CARD_ID, D.RESPONSAVEL_ID, COALESCE(MD.NOME, '') AS RESPONSAVEL_NOME
FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${visao} LEFT JOIN CC_MEMBRO AN ON AN.ID = S.ANALISTA_ID
LEFT JOIN CC_DECISAO D ON D.ID = S.DECISAO_ID LEFT JOIN CC_MEMBRO MD ON MD.ID = D.RESPONSAVEL_ID
WHERE ${SQL_VISIVEL_A} ${filtroCart}`);
  const dias = (a, b) => Math.round((Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000);
  const calc = (lista) => {
    const dec = lista.filter((s) => s.DECIDIDA_EM && String(s.DECIDIDA_EM).slice(0, 10) >= de && String(s.DECIDIDA_EM).slice(0, 10) <= ate);
    const noPrazo = dec.filter((s) => String(s.DECIDIDA_EM).slice(0, 10) <= String(s.PRAZO_DECISAO || '9999'));
    const aprov = dec.filter((s) => ['APROVADA', 'PRE_APROVADA'].includes(s.DECISAO_RESULTADO));
    const fora = lista.filter((s) => !s.DECIDIDA_EM && !s.ENCERRADA_EM && s.PRAZO_DECISAO && s.PRAZO_DECISAO < hojeTxt);
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
    return { decididas: dec.length, noPrazo: noPrazo.length, slaPct: pct(noPrazo.length, dec.length),
      tempoMedio: dec.length ? Math.round((dec.reduce((t, s) => t + dias(s.CRIADO_EM, s.DECIDIDA_EM), 0) / dec.length) * 10) / 10 : null,
      aprovacaoPct: pct(aprov.length, dec.length), foraDoPrazo: fora.length };
  };
  const porAnalista = new Map();
  for (const s of sols) {
    const k = inteiro(s.ANALISTA_ID);
    if (!porAnalista.has(k)) porAnalista.set(k, { analistaId: k, nome: s.ANALISTA_NOME || 'Sem analista', lista: [] });
    porAnalista.get(k).lista.push(s);
  }
  const analistas = [...porAnalista.values()].map((a) => ({ analistaId: a.analistaId, nome: a.nome, ...calc(a.lista) }));
  // Responsáveis da decisão: as decididas agrupadas por quem decidiu (CC_DECISAO.RESPONSAVEL_ID).
  const porResponsavel = new Map();
  for (const s of sols.filter((x) => inteiro(x.RESPONSAVEL_ID))) {
    const k = inteiro(s.RESPONSAVEL_ID);
    if (!porResponsavel.has(k)) porResponsavel.set(k, { responsavelId: k, nome: s.RESPONSAVEL_NOME, lista: [] });
    porResponsavel.get(k).lista.push(s);
  }
  const responsaveis = [...porResponsavel.values()].map((x) => ({ responsavelId: x.responsavelId, nome: x.nome, ...calc(x.lista) }));
  const pedidos = await ler(`SELECT P.ID, P.CRIADO_EM, P.DECIDIDO_EM FROM CC_PEDIDO_RETIDO P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID ${visao}
WHERE ${SQL_VISIVEL_A} AND P.DECIDIDO_EM IS NOT NULL AND SUBSTRING(P.DECIDIDO_EM, 1, 10) BETWEEN ${q(de)} AND ${q(ate)}`);
  const horas = pedidos.map((x) => (Date.parse(`${String(x.DECIDIDO_EM).slice(0, 19)}Z`) - Date.parse(`${String(x.CRIADO_EM).slice(0, 19)}Z`)) / 3600000);
  const cards = sols.map((s) => inteiro(s.CARD_ID)).filter(Boolean);
  const fases = [];
  if (cards.length) {
    const movs = await ler(`SELECT MV.CARD_ID, MV.PARA_FASE_ID, MV.QUANDO, F.CHAVE, KF.NOME, KF.SLA_HORAS FROM KB_MOVIMENTO MV
JOIN CC_FASE F ON F.FASE_ID = MV.PARA_FASE_ID JOIN KB_FASE KF ON KF.ID = MV.PARA_FASE_ID
WHERE MV.CARD_ID IN (${cards.join(',')}) ORDER BY MV.CARD_ID, MV.QUANDO, MV.ID`);
    const soma = new Map();
    for (let i = 0; i < movs.length; i += 1) {
      const a = movs[i]; const b = movs[i + 1];
      if (!b || b.CARD_ID !== a.CARD_ID) continue; // passagem em curso não entra
      const saida = KB_BRASILIA_JS(b.QUANDO);
      if (saida.slice(0, 10) < de || saida.slice(0, 10) > ate) continue;
      const h = (Date.parse(`${String(b.QUANDO).slice(0, 19)}Z`) - Date.parse(`${String(a.QUANDO).slice(0, 19)}Z`)) / 3600000;
      const x = soma.get(a.CHAVE) || { faseChave: a.CHAVE, nome: a.NOME, slaHoras: inteiro(a.SLA_HORAS), total: 0, passagens: 0 };
      x.total += h; x.passagens += 1; soma.set(a.CHAVE, x);
    }
    for (const x of soma.values()) fases.push({ faseChave: x.faseChave, nome: x.nome, slaHoras: x.slaHoras, passagens: x.passagens,
      mediaHoras: Math.round((x.total / x.passagens) * 10) / 10 });
  }
  const p = await parametros(carteira);
  return {
    ok: true,
    kpis: { ...calc(sols), pedidos: pedidos.length, pedidoTempoMedioHoras: horas.length ? Math.round((horas.reduce((t, h) => t + h, 0) / horas.length) * 10) / 10 : null,
      metaSlaPct: p['meta.slaPct'], metaTempoDias: p['meta.tempoDecisaoDias'], metaAprovacaoMin: p['meta.aprovacaoMinPct'], metaAprovacaoMax: p['meta.aprovacaoMaxPct'] },
    analistas, fases, responsaveis,
  };
};

/** KB_* em UTC → Brasília (texto). */
function KB_BRASILIA_JS(utc) {
  return new Date(Date.parse(`${String(utc).slice(0, 19)}Z`) - 3 * 3600000).toISOString().slice(0, 19);
}
const FONTE_VISAO = [constante('SQL_MEMBRO_A', MEMBRO_A('#M#')), constante('SQL_VISIVEL_A', clienteVisivelA('C', 'A')), String(KB_BRASILIA_JS)].join('\n');

/* ── escritas JAVASCRIPT ── */

const corpoSolicitacaoCriar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const carteira = String(event.carteira || '');
  if (!['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(carteira)) return recusar('Escolha a carteira: Privada, Estética ou Pública.');
  const tipoCliente = String(event.tipoCliente || '');
  if (!['NOVO', 'RECORRENTE', 'INATIVO'].includes(tipoCliente)) return recusar('Escolha o tipo de cliente.');
  const justificativa = texto(event.justificativa, 1000);
  if (!justificativa) return recusar('A justificativa da solicitação é obrigatória.');
  const valor = numero(event.valor);
  const prazoMeses = inteiro(event.prazoMeses);
  if (!(valor > 0)) return recusar('Informe o valor solicitado.');
  if (!(prazoMeses > 0)) return recusar('Informe o prazo em meses.');
  const [c] = await ler(`SELECT C.*, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO FROM CC_CLIENTE C
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID WHERE C.ID = ${inteiro(event.clienteId)}`);
  if (!c || !visivel(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (c.SETOR === 'PUBLICO' && carteira !== 'PUBLICA') return recusar('Órgão público só entra pela carteira Pública.');
  if (c.SETOR !== 'PUBLICO' && carteira === 'PUBLICA') return recusar('Cliente privado não entra na carteira Pública.');
  const analistaId = inteiro(event.analistaId);
  if (analistaId && analistaId !== m.membroId && !nivelMin(m, 2)) return recusar('Só Supervisor ou acima escolhe outro analista.');
  const [aberta] = await ler(`SELECT S.ID FROM CC_SOLICITACAO S WHERE S.CLIENTE_ID = ${inteiro(c.ID)} AND S.CARTEIRA = ${q(carteira)} AND ${SQL_ABERTA}`);
  if (aberta) return recusar('Já existe solicitação em andamento para este cliente nesta carteira.');
  const quadro = `concessao-${carteira.toLowerCase()}`;
  const [sla] = await ler(`SELECT SUM(KF.SLA_HORAS) AS HORAS, MIN(F.BOARD_ID) AS BOARD_ID FROM CC_FASE F JOIN KB_FASE KF ON KF.ID = F.FASE_ID
WHERE F.QUADRO = ${q(quadro)} AND F.FINAL = FALSE AND F.ORDEM <= (SELECT FC.ORDEM FROM CC_FASE FC WHERE FC.QUADRO = ${q(quadro)} AND FC.CHAVE = 'comite')`);
  if (!sla || !sla.BOARD_ID) return recusar('O quadro da carteira não está instalado.');
  const agoraTxt = agora();
  const prazo = prazoDecisao(agoraTxt, numero(sla.HORAS));
  await escrever('ccEscCredSolicitacaoInserir', { clienteId: c.ID, carteira, tipoCliente, valor, prazoMeses, justificativa, rca: texto(event.rca, 80),
    analistaId, prazoDecisao: prazo, membroId: m.membroId, agora: agoraTxt });
  const [nova] = await ler(`SELECT MAX(ID) AS ID FROM CC_SOLICITACAO WHERE CLIENTE_ID = ${inteiro(c.ID)} AND CRIADO_EM = ${q(agoraTxt)} AND CRIADO_POR = ${m.membroId}`);
  const id = inteiro(nova && nova.ID);
  if (!id) return recusar(MSG.SEM_PERMISSAO);
  if (analistaId) await escrever('ccEscBaseClienteAnalista', { clienteId: c.ID, analistaId, membroId: m.membroId, agora: agoraTxt });
  const eu = m.userId || await usuarioDe(m.membroId);
  const responsavel = (analistaId ? await usuarioDe(analistaId) : 0) || eu;
  const card = await chamarKb('kbCardCriar', { boardId: inteiro(sla.BOARD_ID), titulo: `${c.CODCLI} · ${c.NOME}`,
    valoresJson: JSON.stringify({ valor, tipo_cliente: tipoCliente }), responsaveisIds: String(responsavel), prazo, criadoPor: eu, origem: 'sistema' });
  if (card && card.ok !== false && inteiro(card.id)) await escrever('ccEscCredSolicitacaoCard', { solicitacaoId: id, cardId: inteiro(card.id), membroId: m.membroId });
  await auditar('Crédito', 'SOLICITACAO', id, c.ID, [{ campo: 'Solicitação', antes: '', depois: `${carteira} · ${tipoCliente} · ${brl(valor)} · ${prazoMeses} meses` }], m);
  return { ok: true, id, cardId: inteiro(card && card.id), prazoDecisao: prazo };
};

/** Colunas de dados (…Dados): nome da entrada → coluna e tipo ('n' número, 'nn' número que aceita vazio, 'd' data, 't' texto, 'b' 0/1). */
const CAMPOS_DADOS = {
  valor: ['VALOR', 'n'], prazoMeses: ['PRAZO_MESES', 'n'], tipoCliente: ['TIPO_CLIENTE', 't'], justificativa: ['JUSTIFICATIVA', 't'], rca: ['RCA', 't'],
  obs: ['OBS', 't'], consData: ['CONS_DATA', 'd'], consReceita: ['CONS_RECEITA', 't'], consProtesto: ['CONS_PROTESTO', 't'], consProcesso: ['CONS_PROCESSO', 't'],
  consSocios: ['CONS_SOCIOS', 't'], cnpjAbertura: ['CNPJ_ABERTURA', 'd'], finAc: ['FIN_AC', 'nn'], finPc: ['FIN_PC', 'nn'], finPl: ['FIN_PL', 'nn'],
  finDivida: ['FIN_DIVIDA', 'nn'], finEbitda: ['FIN_EBITDA', 'nn'], fatMensal: ['FAT_MENSAL', 'nn'], scoreSerasa: ['SCORE_SERASA', 'nn'], fpTipo: ['FP_TIPO', 't'],
  fpNome: ['FP_NOME', 't'], fpPrazoDias: ['FP_PRAZO_DIAS', 'n'], garantia: ['GARANTIA', 't'], confFinContatoId: ['CONF_FIN_CONTATO_ID', 'n'],
  flagNegativacao: ['FLAG_NEGATIVACAO', 'b'], flagDados: ['FLAG_DADOS', 'b'], flagPedido: ['FLAG_PEDIDO', 'b'],
};

const corpoSolicitacaoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const s = await solicitacaoPor(`S.ID = ${inteiro(event.solicitacaoId)}`);
  if (!s || !visivel(m, s)) return recusar('Solicitação não encontrada.');
  if (!ehCaso(m, s.CASO_CAMINHO)) return recusar('Só o analista do caso ou o superior altera a solicitação.');
  if (s.DECIDIDA_EM || s.ENCERRADA_EM) return recusar('A solicitação já foi decidida ou encerrada.');
  const atual = (col, t, linha = s) => {
    const v = linha[col];
    if (t === 'b') return ehVerdade(v) ? '1' : '0';
    if (v === null || v === undefined) return t === 'n' ? '0' : '';
    return t === 'n' || t === 'nn' ? String(Number(v)) : String(v);
  };
  const dados = {};
  const mudancas = [];
  for (const [k, [col, t]] of Object.entries(CAMPOS_DADOS)) {
    let v = atual(col, t);
    if (event[k] !== undefined && event[k] !== null) {
      const bruto = String(event[k]).trim();
      if (t === 'b') v = ehVerdade(event[k]) || bruto === 'true' ? '1' : '0';
      else if (t === 'nn') v = bruto === '' ? '' : String(Number(bruto));
      else if (t === 'n') v = String(numero(bruto));
      else if (t === 'd') v = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? bruto : '';
      else v = texto(bruto, col === 'JUSTIFICATIVA' || col === 'OBS' ? 1000 : 500);
      if ((t === 'n' || t === 'nn') && v !== '' && !Number.isFinite(Number(v))) return recusar(`Valor inválido em ${k}.`);
    }
    if (v !== atual(col, t)) mudancas.push({ campo: col, antes: atual(col, t), depois: v });
    dados[k] = v;
  }
  if (!['NOVO', 'RECORRENTE', 'INATIVO'].includes(dados.tipoCliente)) return recusar('Tipo de cliente inválido.');
  if (!['NAO_CONSULTADO', 'ATIVA', 'IRREGULAR'].includes(dados.consReceita)) return recusar('Receita: use Ativa ou Irregular.');
  for (const k of ['consProtesto', 'consProcesso', 'consSocios']) if (!['NAO_CONSULTADO', 'SEM', 'COM'].includes(dados[k])) return recusar('Consultas: use Sem ou Com.');
  if (dados.fpTipo && !FONTES.includes(dados.fpTipo)) return recusar('Fonte pagadora inválida.');
  if (dados.scoreSerasa !== '' && (Number(dados.scoreSerasa) < 0 || Number(dados.scoreSerasa) > 1000)) return recusar('Score Serasa: de 0 a 1000.');
  if (!(Number(dados.valor) > 0)) return recusar('Informe o valor solicitado.');
  const limiteProposto = event.limiteProposto !== undefined ? numero(event.limiteProposto) : numero(s.LIMITE_PROPOSTO);
  const parecer = event.parecer !== undefined ? texto(event.parecer, 2000) : String(s.PARECER_ANALISTA || '');
  if (limiteProposto < 0) return recusar('Limite proposto inválido.');
  const mudouAnalise = limiteProposto !== numero(s.LIMITE_PROPOSTO) || parecer !== String(s.PARECER_ANALISTA || '');
  if (!mudancas.length && !mudouAnalise) return { ok: true, alteracoes: 0 };
  const base = { solicitacaoId: s.ID, membroId: m.membroId };
  if (mudancas.length) await escrever('ccEscCredSolicitacaoDados', { ...base, ...dados });
  if (mudouAnalise) {
    await escrever('ccEscCredSolicitacaoAnalise', { ...base, limiteProposto, parecer });
    if (limiteProposto !== numero(s.LIMITE_PROPOSTO)) mudancas.push({ campo: 'LIMITE_PROPOSTO', antes: numero(s.LIMITE_PROPOSTO), depois: limiteProposto });
    if (parecer !== String(s.PARECER_ANALISTA || '')) mudancas.push({ campo: 'PARECER_ANALISTA', antes: s.PARECER_ANALISTA || '', depois: parecer });
  }
  const s2 = await solicitacaoPor(`S.ID = ${inteiro(s.ID)}`);
  const chaveDe = (col) => Object.keys(CAMPOS_DADOS).find((k) => CAMPOS_DADOS[k][0] === col);
  const conferido = mudancas.every((x) => !chaveDe(x.campo) || atual(x.campo, CAMPOS_DADOS[chaveDe(x.campo)][1], s2) === x.depois)
    && (!mudouAnalise || numero(s2.LIMITE_PROPOSTO) === limiteProposto);
  if (!conferido) return recusar(MSG.SEM_PERMISSAO);
  const p = await parametros(s2.CARTEIRA);
  let r = null;
  if (s2.CARTEIRA !== 'PUBLICA') {
    r = motor(await entradasDe(s2, {}, p), p);
    if ((r.rating || '') !== (s2.RATING_MOTOR || '') || numero(r.limiteSugerido) !== numero(s2.MOTOR_LIMITE) || r.codigo !== (s2.MOTOR_RESULTADO || '')) {
      await escrever('ccEscCredSolicitacaoMotor', { ...base, rating: r.rating || '', limite: r.limiteSugerido, resultado: r.codigo, agora: agora() });
      mudancas.push({ campo: 'Motor', antes: `${s2.RATING_MOTOR || '—'} ${numero(s2.MOTOR_LIMITE)}`, depois: `${r.rating || '—'} ${numero(r.limiteSugerido)}` });
      s2.RATING_MOTOR = r.rating || ''; s2.MOTOR_LIMITE = r.limiteSugerido; s2.MOTOR_RESULTADO = r.codigo;
    }
  }
  await auditarLinhas('Crédito', 'SOLICITACAO', mudancas.map((x) => ({ entidadeId: s.ID, clienteId: s.CLIENTE_ID, ...x })), m);
  const alcada = alcadaDe(s2, 0, p);
  const eu = m.userId || await usuarioDe(m.membroId);
  await atualizarCard(s2.CARD_ID, eu, {
    valor: numero(s2.VALOR), tipo_cliente: s2.TIPO_CLIENTE, rating: ratingEfetivo(s2), limite_sugerido: r ? r.limiteSugerido : '',
    alcada: alcada.rotulo, pendencia: pendenciasDe(s2, p).join(', '),
  }, { mais: alcada.excecao ? [ETQ['Exceção ao motor']] : [], menos: alcada.excecao ? [] : [ETQ['Exceção ao motor']] });
  return { ok: true, alteracoes: mudancas.length, motor: r };
};

const corpoSolicitacaoAtribuir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor ou acima atribui o analista.');
  const s = await solicitacaoPor(`S.ID = ${inteiro(event.solicitacaoId)}`);
  if (!s || !visivel(m, s)) return recusar('Solicitação não encontrada.');
  const analistaId = inteiro(event.analistaId);
  const [novo] = await ler(`SELECT ID, NOME, USER_ID FROM CC_MEMBRO WHERE ID = ${analistaId} AND ATIVO = TRUE AND CARGO <> 'JURIDICO'`);
  if (!novo) return recusar('Analista não encontrado.');
  if (s.ENCERRADA_EM || s.DECIDIDA_EM || ehVerdade(s.FASE_FINAL) || inteiro(s.FASE_ORDEM) >= inteiro(s.ORDEM_COMITE)) return recusar('A solicitação já está na alçada.');
  if (inteiro(s.ANALISTA_ID) === analistaId) return { ok: true };
  await escrever('ccEscCredSolicitacaoAnalista', { solicitacaoId: s.ID, analistaId, membroId: m.membroId });
  const [l] = await ler(`SELECT ANALISTA_ID FROM CC_SOLICITACAO WHERE ID = ${inteiro(s.ID)}`);
  if (!l || inteiro(l.ANALISTA_ID) !== analistaId) return recusar('A solicitação já está na alçada.');
  await escrever('ccEscBaseClienteAnalista', { clienteId: s.CLIENTE_ID, analistaId, membroId: m.membroId, agora: agora() });
  await auditar('Crédito', 'SOLICITACAO', s.ID, s.CLIENTE_ID, [{ campo: 'Analista', antes: inteiro(s.ANALISTA_ID), depois: analistaId }], m);
  await atualizarCard(s.CARD_ID, m.userId || await usuarioDe(m.membroId), {}, null, { responsaveisIds: String(inteiro(novo.USER_ID)) });
  return { ok: true };
};

const corpoSolicitacaoRecusar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const s = await solicitacaoPor(`S.ID = ${inteiro(event.solicitacaoId)}`);
  if (!s || !visivel(m, s)) return recusar('Solicitação não encontrada.');
  if (!ehCaso(m, s.CASO_CAMINHO)) return recusar('Só o analista do caso ou o superior recusa a solicitação.');
  const motivo = texto(event.motivo, 500);
  if (!motivo) return recusar('Informe o motivo da recusa.');
  if (s.ENCERRADA_EM || s.DECIDIDA_EM) return recusar('A solicitação já foi decidida ou encerrada.');
  if (ehVerdade(s.FASE_FINAL) || inteiro(s.FASE_ORDEM) >= inteiro(s.ORDEM_COMITE)) return recusar('Na fase Comitê a recusa é uma decisão da alçada.');
  const agoraTxt = agora();
  await escrever('ccEscCredSolicitacaoEncerrar', { solicitacaoId: s.ID, motivo, membroId: m.membroId, agora: agoraTxt });
  const [l] = await ler(`SELECT ENCERRADA_EM FROM CC_SOLICITACAO WHERE ID = ${inteiro(s.ID)}`);
  if (!l || !l.ENCERRADA_EM) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Crédito', 'SOLICITACAO', s.ID, s.CLIENTE_ID, [{ campo: 'Recusa', antes: '', depois: motivo }], m);
  const eu = m.userId || await usuarioDe(m.membroId);
  await moverCard(s.CARD_ID, 'recusada', eu);
  await nota(s.CARD_ID, `Solicitação recusada: ${motivo}`, eu);
  return { ok: true };
};

const corpoRatingAjustar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const s = await solicitacaoPor(`S.ID = ${inteiro(event.solicitacaoId)}`);
  if (!s || !visivel(m, s)) return recusar('Solicitação não encontrada.');
  if (!ehCaso(m, s.CASO_CAMINHO)) return recusar('Só o analista do caso ou o superior ajusta o rating.');
  if (s.CARTEIRA === 'PUBLICA') return recusar('Na carteira Pública o rating é o do motor do órgão.');
  if (s.DECIDIDA_EM || s.ENCERRADA_EM) return recusar('A solicitação já foi decidida ou encerrada.');
  const rating = String(event.rating || '');
  if (!['AA', 'A', 'B', 'C', 'D', 'E'].includes(rating)) return recusar('Rating: use AA, A, B, C, D ou E.');
  const justificativa = texto(event.justificativa, 1000);
  if (!justificativa) return recusar('Informe a justificativa do ajuste.');
  if (!s.RATING_MOTOR) return recusar('Calcule o motor antes de ajustar o rating.');
  await escrever('ccEscCredSolicitacaoAjuste', { solicitacaoId: s.ID, acao: 'PROPOR', rating, justificativa, aprovar: 0, membroId: m.membroId, agora: agora() });
  const [l] = await ler(`SELECT AJUSTE_SITUACAO, AJUSTE_POR FROM CC_SOLICITACAO WHERE ID = ${inteiro(s.ID)}`);
  if (!l || l.AJUSTE_SITUACAO !== 'PENDENTE' || inteiro(l.AJUSTE_POR) !== m.membroId) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Crédito', 'SOLICITACAO', s.ID, s.CLIENTE_ID, [{ campo: 'Ajuste de rating proposto', antes: s.RATING_MOTOR, depois: `${rating}: ${justificativa}` }], m);
  await nota(s.CARD_ID, `Ajuste de rating ${s.RATING_MOTOR} → ${rating} aguardando aprovação: ${justificativa}`, m.userId || await usuarioDe(m.membroId));
  return { ok: true };
};

const corpoRatingAjusteDecidir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const s = await solicitacaoPor(`S.ID = ${inteiro(event.solicitacaoId)}`);
  if (!s) return recusar('Solicitação não encontrada.');
  if (s.AJUSTE_SITUACAO !== 'PENDENTE') return recusar('Não há ajuste de rating aguardando aprovação.');
  if (inteiro(s.AJUSTE_POR) === m.membroId || !ehCaso(m, s.AJUSTE_CAMINHO)) return recusar('Só um superior de quem ajustou aprova o ajuste de rating.');
  const aprovar = ehVerdade(event.aprovar) || event.aprovar === 'true' ? 1 : 0;
  await escrever('ccEscCredSolicitacaoAjuste', { solicitacaoId: s.ID, acao: 'DECIDIR', rating: '', justificativa: '', aprovar, membroId: m.membroId, agora: agora() });
  const [l] = await ler(`SELECT AJUSTE_SITUACAO FROM CC_SOLICITACAO WHERE ID = ${inteiro(s.ID)}`);
  if (!l || l.AJUSTE_SITUACAO === 'PENDENTE') return recusar(MSG.SEM_PERMISSAO);
  await auditar('Crédito', 'SOLICITACAO', s.ID, s.CLIENTE_ID, [{ campo: 'Ajuste de rating', antes: `${s.RATING_MOTOR} → ${s.RATING_AJUSTE} pendente`,
    depois: `${l.AJUSTE_SITUACAO}${texto(event.texto, 300) ? `: ${texto(event.texto, 300)}` : ''}` }], m);
  await nota(s.CARD_ID, `Ajuste de rating ${aprovar ? 'aprovado' : 'recusado'} por ${m.nome}.`, m.userId || await usuarioDe(m.membroId));
  return { ok: true, situacao: l.AJUSTE_SITUACAO };
};

const corpoDecisaoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const s = await solicitacaoPor(`S.ID = ${inteiro(event.solicitacaoId)}`);
  if (!s) return recusar('Solicitação não encontrada.');
  if (s.FASE_CHAVE !== 'comite') return recusar('A decisão é registrada com a solicitação na fase de decisão (Comitê).');
  const resultado = String(event.resultado || '');
  if (!['APROVADA', 'PRE_APROVADA', 'RECUSADA'].includes(resultado)) return recusar('Resultado: aprovada, pré-aprovada ou recusada.');
  if (resultado === 'PRE_APROVADA' && s.CARTEIRA !== 'PUBLICA') return recusar('Pré-aprovação só existe na carteira Pública.');
  if (!['', 'PRE_APROVADA'].includes(s.DECISAO_RESULTADO || '') || s.ENCERRADA_EM) return recusar('A solicitação já foi decidida.');
  const aprova = resultado !== 'RECUSADA';
  const limiteAprovado = aprova ? numero(event.limiteAprovado) : 0;
  const planoCod = texto(event.planoCod, 10);
  const forma = texto(event.forma, 40);
  const parecer = texto(event.parecer, 2000);
  const faltam = [];
  if (aprova && !(limiteAprovado > 0)) faltam.push('limite aprovado');
  if (aprova && !planoCod) faltam.push('plano de pagamento');
  if (aprova && !forma) faltam.push('forma de pagamento');
  if (!parecer) faltam.push('parecer');
  if (faltam.length) return recusar(`Decisão incompleta: informe ${faltam.join(', ')}.`);
  if (aprova && !FORMAS.includes(forma)) return recusar('Forma de pagamento inválida.');
  if (inteiro(s.ANALISTA_ID) === m.membroId) return recusar('O analista da solicitação não decide (segregação de funções).');
  if (naLista(s.PROPOSTA_POR, m.membroId)) return recusar('Quem propôs não decide esta solicitação.');
  const p = await parametros(s.CARTEIRA);
  let r = null;
  let ao = null;
  if (s.CARTEIRA === 'PUBLICA') {
    // DT-36: motor do órgão chamado direto (sem gravar), conferido com a fotografia de CC_ANALISE_ORGAO.
    if (!idDe('ccPubMotorCalcular')) return recusar('O motor do órgão não está instalado.');
    ao = await analiseOrgaoDe(s);
    if (!ao || !ao.RATING_PUB) return recusar('Calcule o motor do órgão no bloco do órgão antes de decidir.');
    if (naLista(ao.PROPOSTA_POR, m.membroId)) return recusar('Quem propôs não decide esta solicitação.');
    const o = await escrever('ccPubMotorCalcular', { solicitacaoId: s.ID, gravar: 0, membroId: m.membroId });
    if (!o || o.ok === false) return o || recusar('O motor do órgão não respondeu.');
    if ((o.ratingPub || '') !== (ao.RATING_PUB || '') || numero(o.exposicao) !== numero(ao.EXPOSICAO)) {
      return recusar('O motor mudou desde o último cálculo. Recalcule no bloco do órgão.');
    }
    if (resultado === 'APROVADA' && !o.podeAprovar) return recusar(o.motivoNaoAprovar || 'O motor do órgão não permite aprovar.');
    r = { rating: o.ratingPub, limiteSugerido: numero(o.exposicao), resultado: o.decisaoSugerida, nota: o.nota };
  } else {
    const e = await entradasDe(s, {}, p);
    if (resultado === 'APROVADA' && !consultasValidas(e.consultas, s.TIPO_PESSOA, hoje(), p)) return recusar('As consultas obrigatórias venceram: refaça antes de decidir.');
    r = motor(e, p);
    if ((r.rating || '') !== (s.RATING_MOTOR || '') || numero(r.limiteSugerido) !== numero(s.MOTOR_LIMITE)) {
      return recusar('O motor mudou desde o último cálculo. Recalcule e confira.');
    }
    if (resultado === 'APROVADA' && !r.podeAprovar) return recusar(r.motivoNaoAprovar || 'O motor não permite aprovar.');
  }
  const alcada = alcadaDe(s, limiteAprovado, p, ao);
  if (m.nivel < alcada.nivel) return recusar(`A ${aprova ? 'aprovação' : 'recusa'} exige ${alcada.rotulo}.`);
  const justificativaExcecao = texto(event.justificativaExcecao, 1000);
  if (aprova && alcada.excecao && !justificativaExcecao) return recusar(`Exceção ao motor (${alcada.motivos.join(', ')}): a decisão é do Comitê de crédito e exige justificativa de exceção.`);
  let planoDescr = '';
  if (aprova) {
    const [pl] = await ler(`SELECT DESCRICAO FROM CC_PLANO_PAGAMENTO WHERE CODIGO = ${q(planoCod)}`);
    if (!pl) return recusar('Plano de pagamento não encontrado.');
    planoDescr = pl.DESCRICAO;
  }
  const agoraTxt = agora();
  const cargoAlcada = alcada.rotulo; // a SQL grava o rótulo relido da tabela (O-15): a entrada `cargoAlcada` não vale
  await escrever('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: s.ID, creditoId: 0, resultado, limiteAprovado, planoCod, planoDescr, forma,
    condicao: '', parecer, justificativaExcecao: aprova && alcada.excecao ? justificativaExcecao : '',
    motorJson: JSON.stringify({ rating: r && r.rating, limite: r && r.limiteSugerido, resultado: r && r.resultado, alcada }).slice(0, 60000),
    membroId: m.membroId, agora: agoraTxt });
  const [d] = await ler(`SELECT MAX(ID) AS ID FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ${inteiro(s.ID)}
  AND RESPONSAVEL_ID = ${m.membroId} AND EM = ${q(agoraTxt)}`);
  const decisaoId = inteiro(d && d.ID);
  if (!decisaoId) return recusar(MSG.SEM_PERMISSAO);
  await escrever('ccEscCredSolicitacaoDecisao', { solicitacaoId: s.ID, decisaoId, resultado, motivo: resultado === 'RECUSADA' ? parecer.slice(0, 500) : '',
    membroId: m.membroId, agora: agoraTxt });
  const linhas = [{ entidadeId: s.ID, clienteId: s.CLIENTE_ID, campo: 'Decisão', antes: s.DECISAO_RESULTADO || '',
    depois: `${resultado}${aprova ? ` · ${brl(limiteAprovado)} · ${planoDescr} · ${forma}` : ''} · ${cargoAlcada}` }];
  const eu = m.userId || await usuarioDe(m.membroId);
  const proxima = resultado === 'APROVADA' ? await faseAposComite(s.QUADRO) : '';
  let credito = null;
  if (resultado === 'APROVADA') {
    await escrever('ccEscCredPendenciaInserir', { tipo: 'APLICAR_LIMITE', origem: 'SOLICITACAO', origemId: s.ID, membroId: m.membroId, agora: agoraTxt });
    // D-004: quadro sem `liberacao` (a próxima fase já é `gestao`) cria o crédito na decisão.
    if (proxima === 'gestao') {
      credito = await criarCredito(s, decisaoId, m);
      if (!credito) throw new Error('O crédito vigente do cliente não pôde ser encerrado (a situação mudou).');
    }
  }
  await auditarLinhas('Crédito', 'SOLICITACAO', linhas, m);
  if (credito) await auditarLinhas('Crédito', 'CREDITO', credito.linhas, m);
  const etqMais = [];
  if (resultado === 'APROVADA') {
    await moverCard(s.CARD_ID, proxima, eu);
    etqMais.push(ETQ['Aplicar no Winthor']);
  } else if (resultado === 'RECUSADA') {
    await moverCard(s.CARD_ID, 'recusada', eu);
  } else etqMais.push(ETQ['Pré-aprovada']);
  if (aprova && alcada.excecao) etqMais.push(ETQ['Exceção ao motor']);
  if (aprova) {
    const capa = { valor: limiteAprovado, rating: ao ? ao.RATING_PUB : ratingEfetivo(s), alcada: cargoAlcada, pendencia: '',
      ...(ao ? { limite_sugerido: numero(ao.EXPOSICAO) } : {}), ...(credito ? { validade: credito.fim } : {}) };
    await atualizarCard(s.CARD_ID, eu, capa, { mais: etqMais, menos: resultado === 'APROVADA' ? [ETQ['Pré-aprovada']] : [] },
      credito ? { prazo: credito.fim } : {});
  }
  await nota(s.CARD_ID, `Decisão: ${resultado === 'APROVADA' ? 'aprovada' : resultado === 'RECUSADA' ? 'recusada' : 'pré-aprovada'} por ${m.nome} (${cargoAlcada})`
    + `${aprova ? `, limite ${brl(limiteAprovado)}` : ''}. ${parecer}`, eu);
  return { ok: true, decisaoId };
};

/**
 * Encerra o crédito vigente do cliente (substituição) e cria o novo da decisão; devolve as linhas de auditoria e o
 * fim da validade (calculado pela SQL). As duas guardas pedem o mesmo (caso ou decisor, card liberável): se a
 * inserção ainda assim falhar, o encerramento já feito é auditado antes do erro.
 */
async function criarCredito(s, decisaoId, m) {
  const linhas = [];
  const [antigo] = await ler(`SELECT ID, LIMITE FROM CC_CREDITO WHERE VIGENTE_CHAVE = ${inteiro(s.CLIENTE_ID)}`);
  const agoraTxt = agora();
  if (antigo) {
    await escrever('ccEscCredCreditoSituacao', { creditoId: antigo.ID, situacao: 'ENCERRADO', motivo: 'Substituído por novo crédito', membroId: m.membroId, agora: agoraTxt });
    const [l] = await ler(`SELECT SITUACAO FROM CC_CREDITO WHERE ID = ${inteiro(antigo.ID)}`);
    if (!l || l.SITUACAO !== 'ENCERRADO') return null; // a guarda recusou: nada mudou
    linhas.push({ entidadeId: antigo.ID, clienteId: s.CLIENTE_ID, campo: 'Crédito encerrado (substituído)', antes: brl(antigo.LIMITE), depois: 'ENCERRADO' });
  }
  await escrever('ccEscCredCreditoInserir', { decisaoId, membroId: m.membroId, agora: agoraTxt });
  const [novo] = await ler(`SELECT ID, LIMITE, FIM_VALIDADE FROM CC_CREDITO WHERE DECISAO_ID = ${inteiro(decisaoId)}`);
  if (!novo) {
    if (linhas.length) await auditarLinhas('Crédito', 'CREDITO', linhas, m);
    throw new Error('O crédito não foi criado (a situação mudou).');
  }
  linhas.push({ entidadeId: novo.ID, clienteId: s.CLIENTE_ID, campo: 'Crédito', antes: '', depois: `${brl(novo.LIMITE)} até ${br(novo.FIM_VALIDADE)}` });
  return { linhas, fim: novo.FIM_VALIDADE, creditoId: inteiro(novo.ID) };
}

const corpoPendenciaAplicar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [pw] = await ler(`SELECT PW.*, C.NO_JURIDICO, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO,
  COALESCE(MS.CAMINHO, MC.CAMINHO, MP.CAMINHO) AS CASO_CAMINHO FROM CC_PENDENCIA_WINTHOR PW
JOIN CC_CLIENTE C ON C.ID = PW.CLIENTE_ID LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID
LEFT JOIN CC_SOLICITACAO SO ON PW.ORIGEM = 'SOLICITACAO' AND SO.ID = PW.ORIGEM_ID LEFT JOIN CC_MEMBRO MS ON MS.ID = COALESCE(SO.ANALISTA_ID, SO.CRIADO_POR)
LEFT JOIN CC_CREDITO CO ON PW.ORIGEM = 'CREDITO' AND CO.ID = PW.ORIGEM_ID LEFT JOIN CC_SOLICITACAO SC ON SC.ID = CO.SOLICITACAO_ID
LEFT JOIN CC_MEMBRO MC ON MC.ID = COALESCE(CO.ANALISTA_ID, SC.CRIADO_POR)
LEFT JOIN CC_PEDIDO_RETIDO PO ON PW.ORIGEM = 'PEDIDO' AND PO.ID = PW.ORIGEM_ID LEFT JOIN CC_MEMBRO MP ON MP.ID = COALESCE(PO.ANALISTA_ID, PO.CRIADO_POR)
WHERE PW.ID = ${inteiro(event.pendenciaId)}`);
  if (!pw || !visivel(m, pw)) return recusar('Pendência não encontrada.');
  if (!ehCaso(m, pw.CASO_CAMINHO)) return recusar('Só o analista do caso ou o superior aplica a pendência.');
  if (pw.APLICADA_EM) return recusar('A pendência já foi aplicada.');
  const obs = texto(event.obs, 500);
  const agoraTxt = agora();
  let linhas = [];
  let s = null;
  let credito = null;
  if (pw.TIPO === 'APLICAR_LIMITE' && pw.ORIGEM === 'SOLICITACAO') {
    s = await solicitacaoPor(`S.ID = ${inteiro(pw.ORIGEM_ID)}`);
    const [lib] = s ? await ler(`SELECT 1 AS X FROM CC_FASE WHERE QUADRO = ${q(s.QUADRO)} AND CHAVE = 'liberacao'`) : [];
    if (lib) {
      if (s.FASE_CHAVE !== 'liberacao') return recusar('A solicitação ainda não está em Liberação.');
      credito = await criarCredito(s, s.DECISAO_ID, m);
      if (!credito) return recusar(MSG.SEM_PERMISSAO);
      linhas = credito.linhas;
    }
  }
  await escrever('ccEscCredPendenciaAplicar', { pendenciaId: pw.ID, obs, membroId: m.membroId, agora: agoraTxt });
  const [l] = await ler(`SELECT APLICADA_EM FROM CC_PENDENCIA_WINTHOR WHERE ID = ${inteiro(pw.ID)}`);
  if (!l || !l.APLICADA_EM) return recusar(MSG.SEM_PERMISSAO);
  if (linhas.length) await auditarLinhas('Crédito', 'CREDITO', linhas, m);
  await auditarLinhas('Pendências do Winthor', 'PENDENCIA', [{ entidadeId: pw.ID, clienteId: pw.CLIENTE_ID, campo: 'Pendência aplicada', antes: pw.DESCRICAO,
    depois: obs || 'Aplicada' }], m);
  if (credito && s) {
    const eu = m.userId || await usuarioDe(m.membroId);
    await moverCard(s.CARD_ID, 'gestao', eu);
    await atualizarCard(s.CARD_ID, eu, { validade: credito.fim, pendencia: '' }, { menos: [ETQ['Aplicar no Winthor']] }, { prazo: credito.fim });
  }
  return { ok: true, creditoId: credito ? credito.creditoId : 0 };
};

const corpoReanaliseAbrir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor ou acima antecipa a reanálise.');
  const [cr] = await ler(`SELECT CR.*, S.CARD_ID, C.NO_JURIDICO, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO FROM CC_CREDITO CR
JOIN CC_SOLICITACAO S ON S.ID = CR.SOLICITACAO_ID JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID WHERE CR.ID = ${inteiro(event.creditoId)}`);
  if (!cr || !visivel(m, cr)) return recusar('Crédito não encontrado.');
  if (cr.SITUACAO !== 'GESTAO') return recusar('O crédito não está em gestão.');
  const motivo = texto(event.motivo, 200) || 'Reanálise antecipada';
  await escrever('ccEscCredCreditoSituacao', { creditoId: cr.ID, situacao: 'REANALISE', motivo, membroId: m.membroId, agora: agora() });
  const [l] = await ler(`SELECT SITUACAO FROM CC_CREDITO WHERE ID = ${inteiro(cr.ID)}`);
  if (!l || l.SITUACAO !== 'REANALISE') return recusar(MSG.SEM_PERMISSAO);
  await auditar('Crédito', 'CREDITO', cr.ID, cr.CLIENTE_ID, [{ campo: 'Situação', antes: 'GESTAO', depois: `REANALISE: ${motivo}` }], m);
  const eu = m.userId || await usuarioDe(m.membroId);
  await moverCard(cr.CARD_ID, 'reanalise', eu);
  await nota(cr.CARD_ID, `Reanálise antecipada por ${m.nome}: ${motivo}`, eu);
  return { ok: true };
};

const corpoReanaliseConcluir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [cr] = await ler(`SELECT CR.*, S.CARD_ID FROM CC_CREDITO CR JOIN CC_SOLICITACAO S ON S.ID = CR.SOLICITACAO_ID WHERE CR.ID = ${inteiro(event.creditoId)}`);
  if (!cr) return recusar('Crédito não encontrado.');
  if (cr.SITUACAO !== 'REANALISE') return recusar('O crédito não está em reanálise.');
  const resultado = String(event.resultado || '');
  if (!['RENOVADA', 'OBSOLETO'].includes(resultado)) return recusar('Resultado: renovada ou obsoleto.');
  if (inteiro(cr.ANALISTA_ID) === m.membroId) return recusar('Quem analisou o crédito não decide a renovação (segregação de funções).');
  const parecer = texto(event.parecer, 2000);
  if (!parecer) return recusar('Informe o parecer da reanálise.');
  const p = await parametros(cr.CARTEIRA);
  const faixa = faixaConcessao(cr.LIMITE, p);
  if (m.nivel < faixa.nivel) return recusar(`A renovação exige ${faixa.rotulo}.`);
  const agoraTxt = agora();
  await escrever('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: cr.SOLICITACAO_ID, creditoId: cr.ID, resultado, limiteAprovado: cr.LIMITE,
    planoCod: cr.PLANO_COD, planoDescr: cr.PLANO_DESCR, forma: cr.FORMA, condicao: '', parecer,
    justificativaExcecao: '', motorJson: '{}', membroId: m.membroId, agora: agoraTxt });
  const [d] = await ler(`SELECT MAX(ID) AS ID FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ${inteiro(cr.SOLICITACAO_ID)}
  AND RESPONSAVEL_ID = ${m.membroId} AND EM = ${q(agoraTxt)} AND RESULTADO = ${q(resultado)}`);
  const decisaoId = inteiro(d && d.ID);
  if (!decisaoId) return recusar(MSG.SEM_PERMISSAO);
  const linhas = [{ entidadeId: cr.ID, clienteId: cr.CLIENTE_ID, campo: 'Reanálise', antes: 'REANALISE', depois: `${resultado}: ${parecer}` }];
  const eu = m.userId || await usuarioDe(m.membroId);
  if (resultado === 'RENOVADA') {
    await escrever('ccEscCredCreditoSituacao', { creditoId: cr.ID, situacao: 'ENCERRADO', motivo: 'Renovado', membroId: m.membroId, agora: agoraTxt });
    await escrever('ccEscCredCreditoInserir', { decisaoId, membroId: m.membroId, agora: agoraTxt });
    const [novo] = await ler(`SELECT ID, FIM_VALIDADE FROM CC_CREDITO WHERE DECISAO_ID = ${decisaoId}`);
    if (!novo) return recusar(MSG.SEM_PERMISSAO);
    const fim = novo.FIM_VALIDADE;
    linhas.push({ entidadeId: novo.ID, clienteId: cr.CLIENTE_ID, campo: 'Crédito renovado', antes: '', depois: `${brl(cr.LIMITE)} até ${br(fim)}` });
    await auditarLinhas('Crédito', 'CREDITO', linhas, m);
    await moverCard(cr.CARD_ID, 'gestao', eu);
    await atualizarCard(cr.CARD_ID, eu, { validade: fim }, { mais: [ETQ['Renovação']] }, { prazo: fim });
  } else {
    await escrever('ccEscCredCreditoSituacao', { creditoId: cr.ID, situacao: 'OBSOLETO', motivo: `Reanálise: ${parecer}`.slice(0, 200), membroId: m.membroId, agora: agoraTxt });
    await escrever('ccEscCredPendenciaInserir', { tipo: 'BLOQUEAR_LIMITE', origem: 'CREDITO', origemId: cr.ID, membroId: m.membroId, agora: agoraTxt });
    await auditarLinhas('Crédito', 'CREDITO', linhas, m);
    await moverCard(cr.CARD_ID, 'obsoleto', eu);
    await atualizarCard(cr.CARD_ID, eu, {}, { mais: [ETQ['Aplicar no Winthor']] });
  }
  await nota(cr.CARD_ID, `Reanálise concluída por ${m.nome}: ${resultado === 'RENOVADA' ? 'renovada' : 'cadastro obsoleto'}. ${parecer}`, eu);
  return { ok: true, decisaoId };
};

const corpoPedidoCriar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [c] = await ler(`SELECT C.*, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO FROM CC_CLIENTE C
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID WHERE C.ID = ${inteiro(event.clienteId)}`);
  if (!c || !visivel(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const numeroPedido = texto(event.numeroPedido, 20);
  const valor = numero(event.valor);
  if (!numeroPedido) return recusar('Informe o número do pedido.');
  if (!(valor > 0)) return recusar('Informe o valor do pedido.');
  const [pos] = await ler(`${SQL_POS}${inteiro(c.ID)}`);
  const limite = pos ? numero(pos.LIMITE) : 0;
  const utilizado = pos ? numero(pos.UTILIZADO) : 0;
  const ex = excessoPedido(limite, utilizado, valor);
  if (!(ex.excesso > 0)) return recusar('O pedido cabe no limite: não há o que liberar.');
  const [rep] = await ler(`SELECT ID FROM CC_PEDIDO_RETIDO WHERE CLIENTE_ID = ${inteiro(c.ID)} AND NUMERO_PEDIDO = ${q(numeroPedido)} AND DECISAO_RESULTADO = ''`);
  if (rep) return recusar('Já existe pedido em aberto com este número.');
  const [tipo] = await ler(`SELECT CASE WHEN EXISTS (SELECT 1 FROM CC_CREDITO V WHERE V.CLIENTE_ID = ${inteiro(c.ID)} AND V.VIGENTE_CHAVE IS NOT NULL) THEN 'RECORRENTE'
  WHEN EXISTS (SELECT 1 FROM CC_CREDITO V WHERE V.CLIENTE_ID = ${inteiro(c.ID)} AND V.SITUACAO = 'OBSOLETO') THEN 'INATIVO'
  WHEN EXISTS (SELECT 1 FROM CC_SOLICITACAO V WHERE V.CLIENTE_ID = ${inteiro(c.ID)}) THEN 'RECORRENTE' ELSE 'NOVO' END AS T FROM DUAL`);
  const analistaId = inteiro(c.ANALISTA_ID) || m.membroId;
  const agoraTxt = agora();
  // Excesso e alçada saem da SQL (posição e 03 §7, B-01); a JS só lê o que foi gravado.
  await escrever('ccEscCredPedidoInserir', { clienteId: c.ID, numeroPedido, valor, rca: texto(event.rca, 80),
    tipoCliente: tipo ? tipo.T : 'NOVO', justificativa: texto(event.justificativa, 1000), analistaId, membroId: m.membroId, agora: agoraTxt });
  const [novo] = await ler(`SELECT ID, EXCESSO, EXCESSO_PCT, ALCADA_EXIGIDA, CRITICA FROM CC_PEDIDO_RETIDO WHERE CLIENTE_ID = ${inteiro(c.ID)}
  AND CRIADO_EM = ${q(agoraTxt)} AND CRIADO_POR = ${m.membroId} ORDER BY ID DESC LIMIT 1`);
  const id = inteiro(novo && novo.ID);
  if (!id) return recusar(MSG.SEM_PERMISSAO);
  const alc = { rotulo: novo.ALCADA_EXIGIDA, critica: ehVerdade(novo.CRITICA) };
  ex.excesso = numero(novo.EXCESSO);
  ex.pct = numero(novo.EXCESSO_PCT);
  const [board] = await ler("SELECT MIN(BOARD_ID) AS BOARD_ID FROM CC_FASE WHERE QUADRO = 'pedidos-limite'");
  const eu = m.userId || await usuarioDe(m.membroId);
  const responsavel = (await usuarioDe(analistaId)) || eu;
  const usoPct = limite > 0 ? Math.round(((utilizado + valor) / limite) * 100) : 100;
  const card = await chamarKb('kbCardCriar', { boardId: inteiro(board && board.BOARD_ID), titulo: `Pedido ${numeroPedido} · ${c.CODCLI} · ${c.NOME}`,
    valoresJson: JSON.stringify({ valor, excesso: ex.excesso, excesso_pct: ex.pct, alcada: alc.rotulo,
      uso: [{ rotulo: 'Uso do limite', texto: `${brl(utilizado + valor)} de ${brl(limite)}`, pct: Math.min(usoPct, 100) }],
      ...(alc.critica ? { etiquetas: [ETQ['Liberação crítica']] } : {}) }),
    responsaveisIds: String(responsavel), prazo: '', criadoPor: eu, origem: 'sistema' });
  if (card && card.ok !== false && inteiro(card.id)) {
    await escrever('ccEscCredPedidoAtualizar', { pedidoId: id, modo: 'CARD', cardId: inteiro(card.id), recomendacao: '', analistaId: 0, resultado: '', motivo: '',
      membroId: m.membroId, agora: agoraTxt });
  }
  await auditar('Pedidos', 'PEDIDO', id, c.ID, [{ campo: 'Pedido', antes: '', depois: `${numeroPedido} · ${brl(valor)} · excesso ${brl(ex.excesso)} (${ex.pct}%) · ${alc.rotulo}` }], m);
  return { ok: true, id, cardId: inteiro(card && card.id), excesso: ex.excesso, excessoPct: ex.pct, alcada: alc.rotulo, critica: alc.critica };
};

/** Pedido com cliente, caminhos e fase. */
async function pedidoPor(id) {
  const [pd] = await ler(`SELECT P.*, C.CODCLI, C.NOME AS CLIENTE_NOME, C.NO_JURIDICO, AG.CAMINHO AS AGENTE_CAMINHO, ANC.CAMINHO AS ANALISTA_CAMINHO,
  CS.CAMINHO AS CASO_CAMINHO, F.CHAVE AS FASE_CHAVE
FROM CC_PEDIDO_RETIDO P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO ANC ON ANC.ID = C.ANALISTA_ID
LEFT JOIN CC_MEMBRO CS ON CS.ID = COALESCE(P.ANALISTA_ID, P.CRIADO_POR)
LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE P.ID = ${inteiro(id)}`);
  return pd || null;
}

const corpoPedidoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const pd = await pedidoPor(event.pedidoId);
  if (!pd || !visivel(m, pd)) return recusar('Pedido não encontrado.');
  if (!ehCaso(m, pd.CASO_CAMINHO)) return recusar('Só o analista do caso ou o superior altera o pedido.');
  if (pd.DECISAO_RESULTADO) return recusar('O pedido já foi decidido.');
  const agoraTxt = agora();
  const base = { pedidoId: pd.ID, cardId: 0, recomendacao: '', analistaId: 0, resultado: '', motivo: '', membroId: m.membroId, agora: agoraTxt };
  const linhas = [];
  const analistaId = inteiro(event.analistaId);
  if (analistaId && analistaId !== inteiro(pd.ANALISTA_ID)) {
    if (!['retido', 'analise'].includes(pd.FASE_CHAVE)) return recusar('O pedido já está na alçada.');
    const [novo] = await ler(`SELECT ID, USER_ID FROM CC_MEMBRO WHERE ID = ${analistaId} AND ATIVO = TRUE AND CARGO <> 'JURIDICO'`);
    if (!novo) return recusar('Analista não encontrado.');
    await escrever('ccEscCredPedidoAtualizar', { ...base, modo: 'ANALISTA', analistaId });
    const [l] = await ler(`SELECT ANALISTA_ID FROM CC_PEDIDO_RETIDO WHERE ID = ${inteiro(pd.ID)}`);
    if (!l || inteiro(l.ANALISTA_ID) !== analistaId) return recusar('O pedido já está na alçada.');
    linhas.push({ entidadeId: pd.ID, clienteId: pd.CLIENTE_ID, campo: 'Analista', antes: inteiro(pd.ANALISTA_ID), depois: analistaId });
    await atualizarCard(pd.CARD_ID, m.userId || await usuarioDe(m.membroId), {}, null, { responsaveisIds: String(inteiro(novo.USER_ID)) });
  }
  if (event.recomendacao !== undefined) {
    const recomendacao = texto(event.recomendacao, 1000);
    if (recomendacao !== String(pd.RECOMENDACAO || '')) {
      await escrever('ccEscCredPedidoAtualizar', { ...base, modo: 'RECOMENDACAO', recomendacao });
      const [l] = await ler(`SELECT RECOMENDACAO FROM CC_PEDIDO_RETIDO WHERE ID = ${inteiro(pd.ID)}`);
      if (!l || l.RECOMENDACAO !== recomendacao) return recusar(MSG.SEM_PERMISSAO);
      linhas.push({ entidadeId: pd.ID, clienteId: pd.CLIENTE_ID, campo: 'Recomendação', antes: pd.RECOMENDACAO || '', depois: recomendacao });
    }
  }
  await auditarLinhas('Pedidos', 'PEDIDO', linhas, m);
  return { ok: true, alteracoes: linhas.length };
};

const corpoPedidoDecidir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const pd = await pedidoPor(event.pedidoId);
  if (!pd) return recusar('Pedido não encontrado.');
  if (pd.DECISAO_RESULTADO) return recusar('O pedido já foi decidido.');
  const resultado = String(event.resultado || '');
  if (!['LIBERADO', 'RECUSADO'].includes(resultado)) return recusar('Resultado: liberado ou recusado.');
  if ([inteiro(pd.ANALISTA_ID), inteiro(pd.CRIADO_POR)].includes(m.membroId) || naLista(pd.RECOMENDADO_POR, m.membroId)) {
    return recusar('Quem lançou, analisou ou recomendou o pedido não o libera (segregação de funções).');
  }
  if (m.nivel < inteiro(pd.NIVEL_EXIGIDO)) return recusar(`A liberação exige ${pd.ALCADA_EXIGIDA}.`);
  const condicao = texto(event.condicao, 500);
  const planoCod = texto(event.planoCod, 10);
  const forma = texto(event.forma, 40);
  let parecer = texto(event.parecer, 2000);
  const motivo = texto(event.motivo, 500);
  let planoDescr = '';
  if (resultado === 'LIBERADO') {
    const faltam = [!condicao && 'condição de liberação', !planoCod && 'plano de pagamento', !forma && 'forma de pagamento'].filter(Boolean);
    if (faltam.length) return recusar(`Informe ${faltam.join(', ')}.`);
    if (!FORMAS.includes(forma)) return recusar('Forma de pagamento inválida.');
    const [pl] = await ler(`SELECT DESCRICAO FROM CC_PLANO_PAGAMENTO WHERE CODIGO = ${q(planoCod)}`);
    if (!pl) return recusar('Plano de pagamento não encontrado.');
    planoDescr = pl.DESCRICAO;
    let bloqueado = false;
    try {
      const [b] = await ler(`SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE CLIENTE_ID = ${inteiro(pd.CLIENTE_ID)} AND ENCERRADO_EM IS NULL AND BLOQUEIO_DEVIDO <> ''`);
      bloqueado = !!b && inteiro(b.N) > 0;
    } catch { bloqueado = false; }
    if (!parecer && ehVerdade(pd.CRITICA)) return recusar('Liberação crítica: informe o parecer.');
    if (!parecer && bloqueado) return recusar('Cliente bloqueado pela régua de cobrança: informe o parecer da liberação.');
  } else {
    if (!motivo) return recusar('Informe o motivo da recusa.');
    parecer = parecer || motivo;
  }
  const agoraTxt = agora();
  await escrever('ccEscCredDecisaoInserir', { entidade: 'PEDIDO', entidadeId: pd.ID, creditoId: 0, resultado, limiteAprovado: 0, planoCod, planoDescr, forma,
    condicao, parecer, justificativaExcecao: '', motorJson: '{}', membroId: m.membroId, agora: agoraTxt });
  const [d] = await ler(`SELECT MAX(ID) AS ID FROM CC_DECISAO WHERE ENTIDADE = 'PEDIDO' AND ENTIDADE_ID = ${inteiro(pd.ID)} AND RESPONSAVEL_ID = ${m.membroId}`);
  if (!d || !inteiro(d.ID)) return recusar(MSG.SEM_PERMISSAO);
  await escrever('ccEscCredPedidoAtualizar', { pedidoId: pd.ID, modo: 'DESFECHO', cardId: 0, recomendacao: '', analistaId: 0, resultado, motivo,
    membroId: m.membroId, agora: agoraTxt });
  if (resultado === 'LIBERADO') {
    await escrever('ccEscCredPendenciaInserir', { tipo: 'LIBERAR_PEDIDO', origem: 'PEDIDO', origemId: pd.ID, membroId: m.membroId, agora: agoraTxt });
  }
  await auditar('Pedidos', 'PEDIDO', pd.ID, pd.CLIENTE_ID, [{ campo: 'Decisão', antes: '', depois: `${resultado} · ${condicao || motivo}` }], m);
  const eu = m.userId || await usuarioDe(m.membroId);
  await moverCard(pd.CARD_ID, resultado === 'LIBERADO' ? 'liberado' : 'recusado', eu);
  await nota(pd.CARD_ID, `Pedido ${resultado === 'LIBERADO' ? `liberado (${condicao})` : `recusado: ${motivo}`} por ${m.nome}.`, eu);
  return { ok: true, decisaoId: inteiro(d.ID) };
};

const corpoCalibracaoRevisar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const parecer = texto(event.parecer, 2000);
  if (!parecer) return recusar('Informe o parecer da revisão.');
  const p = await parametros('');
  const linhas = await ler("SELECT MES, FAIXA, SUM(VENCIDO) AS VENCIDO, SUM(VENCIDO + A_VENCER) AS SALDO FROM CC_CALIBRACAO WHERE CARTEIRA <> 'PUBLICA' GROUP BY MES, FAIXA");
  const meses = [...new Set(linhas.map((l) => l.MES))].sort().reverse().slice(0, Number(p['cred.calibMinMeses']));
  const faixas = {};
  for (const l of linhas.filter((x) => meses.includes(x.MES))) {
    const f = faixas[l.FAIXA] || (faixas[l.FAIXA] = { saldo: 0, vencido: 0 });
    f.saldo += numero(l.SALDO); f.vencido += numero(l.VENCIDO);
  }
  const agoraTxt = agora();
  await escrever('ccEscCredCalibracaoRevisaoInserir', { parecer, leituraJson: JSON.stringify(leituraFarol(faixas, meses.length, p) || {}), membroId: m.membroId, agora: agoraTxt });
  const [l] = await ler(`SELECT MAX(ID) AS ID FROM CC_CALIBRACAO_REVISAO WHERE POR_ID = ${m.membroId} AND EM = ${q(agoraTxt)}`);
  if (!l || !inteiro(l.ID)) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Calibração', 'CALIBRACAO_REVISAO', l.ID, null, [{ campo: 'Revisão do semáforo', antes: '', depois: parecer }], m);
  return { ok: true, id: inteiro(l.ID) };
};

/* ── rotina (passo CREDITO, 05 §4.5) ── */

const corpoRotina = async () => {
  const CUSTO = { criar: 6, mover: 5, atualizar: 3, nota: 2 };
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina agendada executa este passo.');
  const orcamento = Math.max(0, inteiro(event.orcamentoExec) || 140);
  let gasto = 0;
  let pendentes = 0;
  let processados = 0;
  const cabe = (n) => gasto + n <= orcamento;
  const dml = (sql) => sdk.runDmlMitra({ projectId, sql });
  const agoraTxt = agora();
  const hojeTxt = hoje();
  const sqlv = (v) => (v === null || v === undefined ? 'NULL' : (typeof v === 'number' ? String(v) : q(v)));
  const prm = { PRIVADA: await parametros('PRIVADA'), ESTETICA: await parametros('ESTETICA'), PUBLICA: await parametros('PUBLICA') };
  const pDe = (c) => prm[c] || prm.PRIVADA;
  const membros = new Map((await ler('SELECT ID, USER_ID FROM CC_MEMBRO WHERE ATIVO = TRUE')).map((l) => [inteiro(l.ID), inteiro(l.USER_ID)]));
  let usuarioRotina = 0;
  const email = String(prm.PRIVADA['base.rotinaUsuarioEmail'] || '').toLowerCase();
  if (email) { const [u] = await ler(`SELECT ID FROM INT_USER WHERE LOWER(DESCR) = ${q(email)}`); usuarioRotina = u ? inteiro(u.ID) : 0; }
  if (!usuarioRotina) { const [u] = await ler('SELECT MIN(USER_ID) AS ID FROM CC_MEMBRO WHERE ATIVO = TRUE AND ADMIN = TRUE AND USER_ID IS NOT NULL'); usuarioRotina = u ? inteiro(u.ID) : 0; }
  const usuarioDoCaso = (analistaId, criadoPor) => membros.get(inteiro(analistaId)) || membros.get(inteiro(criadoPor)) || usuarioRotina;

  // 1. Risco do cliente (carteiras com motor da 004): universo = crédito vigente ou solicitação aberta.
  const creditos = await ler('SELECT * FROM CC_CREDITO WHERE VIGENTE_CHAVE IS NOT NULL');
  const credDoCliente = new Map(creditos.map((c) => [inteiro(c.CLIENTE_ID), c]));
  const idsSol = [...new Set(creditos.map((c) => inteiro(c.SOLICITACAO_ID)))];
  const solsCred = idsSol.length ? await ler(`${SQL_SOL} WHERE S.ID IN (${idsSol.join(',')})`) : [];
  const abertas = await ler(`${SQL_SOL} WHERE ${SQL_ABERTA} AND S.CARTEIRA <> 'PUBLICA' ORDER BY S.ID`);
  const fonte = new Map();
  for (const s of abertas) fonte.set(inteiro(s.CLIENTE_ID), s);
  for (const s of solsCred) {
    const cr = credDoCliente.get(inteiro(s.CLIENTE_ID));
    if (cr && cr.CARTEIRA !== 'PUBLICA' && inteiro(cr.SOLICITACAO_ID) === inteiro(s.ID)) fonte.set(inteiro(s.CLIENTE_ID), s);
  }
  const clientesCred = [...credDoCliente.keys()];
  const todosIds = [...new Set([...fonte.keys(), ...clientesCred])];
  const posicoes = new Map((todosIds.length ? await ler(`SELECT * FROM CC_POSICAO_CLIENTE WHERE CLIENTE_ID IN (${todosIds.join(',')})`) : [])
    .map((l) => [inteiro(l.CLIENTE_ID), l]));
  const grupos = new Map((clientesCred.length ? await ler(`SELECT ID, GRUPO_ECONOMICO FROM CC_CLIENTE WHERE ID IN (${clientesCred.join(',')})`) : [])
    .map((l) => [inteiro(l.ID), String(l.GRUPO_ECONOMICO || '')]));
  const totalLimites = creditos.reduce((t, c) => t + numero(c.LIMITE), 0);
  let bloqueados = new Set();
  try { bloqueados = new Set((await ler("SELECT DISTINCT CLIENTE_ID FROM CC_COBRANCA WHERE ENCERRADO_EM IS NULL AND BLOQUEIO_DEVIDO <> ''")).map((l) => inteiro(l.CLIENTE_ID))); } catch { /* sem a 002 */ }
  const atuais = new Map((await ler('SELECT * FROM CC_RISCO_CLIENTE')).map((l) => [inteiro(l.CLIENTE_ID), l]));
  const COLS = ['CLIENTE_ID', 'CREDITO_ID', 'SOLICITACAO_ID', 'SCORE_COMP', 'SCORE_FINAL', 'FAIXA_SCORE', 'FAIXA_ATRASO', 'RATING_ATUAL', 'REBAIXADO', 'ALERTAS',
    'LIMITE_SUGERIDO', 'CRITICIDADE', 'CRIT_MOTIVOS', 'SAUDE', 'SAUDE_SINAIS', 'FLEX_PCT', 'FLEX_VALOR', 'FLEX_MOTIVOS', 'PROB_ATRASO', 'REVISAO_GATILHOS',
    'DESTINO', 'LIMITE_DIVERGE', 'POSICAO_EM'];
  const norm = (v) => (v === null || v === undefined ? '' : (typeof v === 'boolean' ? (v ? '1' : '0') : (Number.isFinite(Number(v)) && String(v).trim() !== '' ? String(Number(v)) : String(v))));
  const mudar = [];
  for (const [cid, s] of fonte) {
    s.VALORES = lerJsonSeguro(s.VALORES_JSON, {});
    const cr = credDoCliente.get(cid);
    const p = pDe(s.CARTEIRA);
    const pos = posicoes.get(cid) || null;
    const grupo = grupos.get(cid) || String(s.GRUPO_ECONOMICO || '');
    const outros = totalLimites - (cr ? numero(cr.LIMITE) : 0);
    const doGrupo = grupo ? creditos.filter((c) => inteiro(c.CLIENTE_ID) !== cid && grupos.get(inteiro(c.CLIENTE_ID)) === grupo).reduce((t, c) => t + numero(c.LIMITE), 0) : 0;
    const e = entradasLinha(s, pos, outros, doGrupo, p);
    if (cr) e.valor = numero(cr.LIMITE);
    const r = motor(e, p);
    const rating = ratingAtual(r.rating || '', s);
    const lim = cr ? numero(cr.LIMITE) : numero(pos && pos.LIMITE);
    const uso = lim > 0 && pos ? Math.round((numero(pos.UTILIZADO) / lim) * 10000) / 100 : null;
    const rebaixado = !!r.detalhes.rebaixado;
    const crit = criticidade({ diasAtraso: e.diasAtraso, pontualidade: e.pontualidade, scoreSerasa: e.scoreSerasa, usoPct: uso, prazoMedio: e.prazoMedio, rating, rebaixado }, p);
    const vencida = !!cr && String(cr.FIM_VALIDADE) < hojeTxt;
    const sau = cr ? saude({ diasAtraso: e.diasAtraso, usoPct: uso, validadeVencida: vencida }, p) : { saude: '', sinais: [] };
    const conc = r.detalhes.concentracao;
    const flex = cr ? flexibilizacao({ rating, limite: lim, vencido: pos ? numero(pos.VENCIDO) : 0, pontualidade: e.pontualidade, bloqueado: bloqueados.has(cid),
      validadeVencida: vencida, rebaixado, temScore: r.score !== null, disponivel: conc.disponivel }, p) : { pct: 0, valor: 0, motivos: [] };
    const gat = cr && cr.SITUACAO === 'GESTAO' ? gatilhos({ diasAtraso: e.diasAtraso, usoPct: uso, negativacao: ehVerdade(s.FLAG_NEGATIVACAO),
      fimValidade: cr.FIM_VALIDADE, hoje: hojeTxt }, p) : [];
    const dest = cr && cr.SITUACAO === 'GESTAO' ? destinoCredito({ fimValidade: cr.FIM_VALIDADE, inicioValidade: cr.INICIO_VALIDADE,
      ultimaCompra: pos && pos.ULTIMA_COMPRA, comprasQtd: pos ? pos.COMPRAS_QTD : 0, hoje: hojeTxt }, p).destino : '';
    const linha = {
      CLIENTE_ID: cid, CREDITO_ID: cr ? inteiro(cr.ID) : null, SOLICITACAO_ID: inteiro(s.ID), SCORE_COMP: r.detalhes.scoreComp, SCORE_FINAL: r.score,
      FAIXA_SCORE: r.detalhes.faixaScore || '', FAIXA_ATRASO: r.detalhes.faixaAtraso || '', RATING_ATUAL: rating, REBAIXADO: rebaixado,
      ALERTAS: r.alertas.join('; ').slice(0, 500), LIMITE_SUGERIDO: numero(r.limiteSugerido), CRITICIDADE: crit.nivel, CRIT_MOTIVOS: crit.motivos.join('; ').slice(0, 500),
      SAUDE: sau.saude, SAUDE_SINAIS: sau.sinais.join('; ').slice(0, 300), FLEX_PCT: flex.pct, FLEX_VALOR: flex.valor, FLEX_MOTIVOS: flex.motivos.join('; ').slice(0, 300),
      PROB_ATRASO: probAtraso(e.pontualidade, pos ? pos.VENCIDO : 0, p), REVISAO_GATILHOS: gat.join(','), DESTINO: dest,
      LIMITE_DIVERGE: !!cr && !!pos && numero(pos.LIMITE) !== numero(cr.LIMITE), POSICAO_EM: pos ? pos.ALTERADO_EM || null : null,
    };
    const atual = atuais.get(cid);
    if (!atual || COLS.some((c) => norm(atual[c]) !== norm(linha[c]))) mudar.push(linha);
  }
  for (let i = 0; i < mudar.length; i += 200) {
    const valores = mudar.slice(i, i + 200).map((l) => `(${COLS.map((c) => (typeof l[c] === 'boolean' ? (l[c] ? 'TRUE' : 'FALSE') : sqlv(l[c]))).join(', ')}, ${q(agoraTxt)})`);
    await dml(`INSERT INTO CC_RISCO_CLIENTE (${COLS.join(', ')}, CALCULADO_EM) VALUES ${valores.join(',\n')}
ON DUPLICATE KEY UPDATE ${[...COLS.slice(1), 'CALCULADO_EM'].map((c) => `${c} = VALUES(${c})`).join(', ')}`);
  }
  const foraDoUniverso = [...atuais.keys()].filter((cid) => !fonte.has(cid));
  if (foraDoUniverso.length) await dml(`DELETE FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID IN (${foraDoUniverso.join(',')})`);
  processados += mudar.length;

  // 2. Encaminhamento no vencimento ou sem compra (as três carteiras): domínio, auditoria, depois o quadro.
  const encaminhar = [];
  for (const cr of creditos.filter((c) => c.SITUACAO === 'GESTAO')) {
    const pos = posicoes.get(inteiro(cr.CLIENTE_ID));
    const d = destinoCredito({ fimValidade: cr.FIM_VALIDADE, inicioValidade: cr.INICIO_VALIDADE, ultimaCompra: pos && pos.ULTIMA_COMPRA,
      comprasQtd: pos ? pos.COMPRAS_QTD : 0, hoje: hojeTxt }, pDe(cr.CARTEIRA));
    if (!d.destino) continue;
    const motivo = d.destino === 'OBSOLETO' ? `Cadastro obsoleto: ${d.motivo}` : d.motivo;
    await dml(`UPDATE CC_CREDITO SET SITUACAO = ${q(d.destino)}, SITUACAO_EM = ${q(agoraTxt)}, MOTIVO_ENCAMINHAMENTO = ${q(motivo.slice(0, 200))},
  VIGENTE_CHAVE = ${d.destino === 'REANALISE' ? 'VIGENTE_CHAVE' : 'NULL'} WHERE ID = ${inteiro(cr.ID)} AND SITUACAO = 'GESTAO'`);
    if (d.destino === 'OBSOLETO') {
      await dml(`INSERT INTO CC_PENDENCIA_WINTHOR (TIPO, CLIENTE_ID, ORIGEM, ORIGEM_ID, DESCRICAO, VALOR, GERADA_EM)
SELECT 'BLOQUEAR_LIMITE', CR.CLIENTE_ID, 'CREDITO', CR.ID, ${DESC_BLOQUEAR_JS}, CR.LIMITE, ${q(agoraTxt)} FROM CC_CREDITO CR
WHERE CR.ID = ${inteiro(cr.ID)} AND NOT EXISTS (SELECT 1 FROM (SELECT PW.ID FROM CC_PENDENCIA_WINTHOR PW WHERE PW.TIPO = 'BLOQUEAR_LIMITE' AND PW.ORIGEM = 'CREDITO'
  AND PW.ORIGEM_ID = ${inteiro(cr.ID)} AND PW.APLICADA_EM IS NULL) X)`);
    }
    encaminhar.push({ cr, destino: d.destino, motivo });
  }
  for (let i = 0; i < encaminhar.length; i += 20) {
    await auditarLinhas('Crédito', 'CREDITO', encaminhar.slice(i, i + 20).map((x) => ({ entidadeId: x.cr.ID, clienteId: x.cr.CLIENTE_ID, campo: 'Situação',
      antes: 'GESTAO', depois: `${x.destino}: ${x.motivo}` })), { membroId: 0 });
    gasto += 1;
  }
  processados += encaminhar.length;
  const cardDoCred = new Map(idsSol.length ? (await ler(`SELECT ID, CARD_ID FROM CC_SOLICITACAO WHERE ID IN (${idsSol.join(',')})`)).map((l) => [inteiro(l.ID), inteiro(l.CARD_ID)]) : []);
  for (const x of encaminhar) {
    const cardId = cardDoCred.get(inteiro(x.cr.SOLICITACAO_ID));
    if (!cardId) continue; // a conciliação cria o card na fase devida
    const custo = CUSTO.mover + CUSTO.nota + (x.destino === 'OBSOLETO' ? CUSTO.atualizar : 0);
    if (!cabe(custo)) { pendentes += 1; continue; }
    const u = usuarioDoCaso(x.cr.ANALISTA_ID, 0);
    await moverCard(cardId, x.destino === 'REANALISE' ? 'reanalise' : 'obsoleto', u);
    await nota(cardId, x.motivo, u);
    gasto += CUSTO.mover + CUSTO.nota;
    if (x.destino === 'OBSOLETO') gasto += CUSTO.atualizar * await atualizarCard(cardId, u, {}, { mais: [ETQ['Aplicar no Winthor']] });
  }

  // 3. Foto de calibração do mês que fechou (gatilho único, 01 §11): só se o mês ainda não tem foto.
  const [a, mm] = hojeTxt.split('-').map(Number);
  const mesAnterior = mm === 1 ? `${a - 1}-12` : `${a}-${String(mm - 1).padStart(2, '0')}`;
  const [foto] = await ler(`SELECT COUNT(*) AS N FROM CC_CALIBRACAO WHERE MES = ${q(mesAnterior)}`);
  if (!foto || !inteiro(foto.N)) {
    await dml(`INSERT IGNORE INTO CC_CALIBRACAO (MES, CLIENTE_ID, CREDITO_ID, CARTEIRA, FAIXA, SCORE_FINAL, DIAS_ATRASO, VENCIDO, A_VENCER, LIMITE, UTILIZADO, EM)
SELECT ${q(mesAnterior)}, CR.CLIENTE_ID, CR.ID, CR.CARTEIRA, COALESCE(R.RATING_ATUAL, ''), R.SCORE_FINAL, COALESCE(P.DIAS_ATRASO, 0), COALESCE(P.VENCIDO, 0),
  COALESCE(P.A_VENCER, 0), CR.LIMITE, COALESCE(P.UTILIZADO, 0), ${q(agoraTxt)}
FROM CC_CREDITO CR LEFT JOIN CC_RISCO_CLIENTE R ON R.CLIENTE_ID = CR.CLIENTE_ID LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = CR.CLIENTE_ID
WHERE CR.VIGENTE_CHAVE IS NOT NULL AND CR.CARTEIRA <> 'PUBLICA'`);
  }

  // 4. Conciliação quadro × domínio (05 §4.5 linha 5): card ausente, fase diferente da devida, capa do rating e divergência.
  const boards = new Map((await ler('SELECT QUADRO, MIN(BOARD_ID) AS BOARD_ID FROM CC_FASE GROUP BY QUADRO')).map((l) => [l.QUADRO, inteiro(l.BOARD_ID)]));
  const aposComite = {};
  for (const quadro of ['concessao-privada', 'concessao-estetica', 'concessao-publica']) aposComite[quadro] = await faseAposComite(quadro);
  const devida = (x, quadro) => {
    if (x.CR_SITUACAO) return { GESTAO: 'gestao', REANALISE: 'reanalise', OBSOLETO: 'obsoleto', ENCERRADO: 'encerrada' }[x.CR_SITUACAO];
    if (x.ENCERRADA_EM && (x.MOTIVO_RECUSA || x.DECISAO_RESULTADO === 'RECUSADA')) return 'recusada';
    if (x.DECISAO_RESULTADO === 'APROVADA') {
      return x.FASE_CHAVE && !ehVerdade(x.FASE_FINAL) && inteiro(x.FASE_ORDEM) > inteiro(x.ORDEM_COMITE) ? x.FASE_CHAVE : aposComite[quadro];
    }
    if (x.DECISAO_RESULTADO === 'PRE_APROVADA') return 'comite';
    return x.FASE_CHAVE || 'entrada';
  };
  const sols = await ler(`SELECT S.ID, S.CLIENTE_ID, S.CARTEIRA, S.CARD_ID, S.ANALISTA_ID, S.CRIADO_POR, S.VALOR, S.TIPO_CLIENTE, S.PRAZO_DECISAO, S.ENCERRADA_EM,
  S.MOTIVO_RECUSA, S.DECISAO_RESULTADO, C.CODCLI, C.NOME, F.CHAVE AS FASE_CHAVE, F.ORDEM AS FASE_ORDEM, F.FINAL AS FASE_FINAL,
  (SELECT FC.ORDEM FROM CC_FASE FC WHERE FC.QUADRO = F.QUADRO AND FC.CHAVE = 'comite') AS ORDEM_COMITE,
  CR.SITUACAO AS CR_SITUACAO, CR.FIM_VALIDADE AS CR_FIM, CR.LIMITE AS CR_LIMITE, CR.CARTEIRA AS CR_CARTEIRA
FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN CC_CREDITO CR ON CR.ID = (SELECT MAX(CR2.ID) FROM CC_CREDITO CR2 WHERE CR2.SOLICITACAO_ID = S.ID)
WHERE S.CARD_ID IS NULL OR F.FINAL = FALSE OR CR.SITUACAO IS NOT NULL OR S.ENCERRADA_EM IS NOT NULL
ORDER BY S.ID`);
  for (const x of sols) {
    const quadro = `concessao-${String(x.CARTEIRA).toLowerCase()}`;
    let cardId = inteiro(x.CARD_ID);
    const u = usuarioDoCaso(x.ANALISTA_ID, x.CRIADO_POR);
    if (!cardId) {
      if (!cabe(CUSTO.criar + CUSTO.mover)) { pendentes += 1; continue; }
      const card = await chamarKb('kbCardCriar', { boardId: boards.get(quadro), titulo: `${x.CODCLI} · ${x.NOME}`,
        valoresJson: JSON.stringify({ valor: numero(x.CR_LIMITE || x.VALOR), tipo_cliente: x.TIPO_CLIENTE }), responsaveisIds: String(u),
        prazo: x.CR_FIM || x.PRAZO_DECISAO || '', criadoPor: u, origem: 'sistema' });
      gasto += CUSTO.criar;
      cardId = inteiro(card && card.id);
      if (!cardId) continue;
      await dml(`UPDATE CC_SOLICITACAO SET CARD_ID = ${cardId} WHERE ID = ${inteiro(x.ID)} AND CARD_ID IS NULL`);
      x.FASE_CHAVE = 'entrada'; x.FASE_FINAL = false; x.FASE_ORDEM = 1;
      processados += 1;
    }
    const alvo = devida(x, quadro);
    if (alvo && alvo !== x.FASE_CHAVE) {
      if (!cabe(CUSTO.mover)) { pendentes += 1; continue; }
      const r = await moverCard(cardId, alvo, u);
      gasto += CUSTO.mover;
      if (r && r.ok !== false) processados += 1;
    }
  }
  const peds = await ler(`SELECT P.ID, P.CARD_ID, P.ANALISTA_ID, P.CRIADO_POR, P.NUMERO_PEDIDO, P.VALOR, P.EXCESSO, P.EXCESSO_PCT, P.ALCADA_EXIGIDA, P.DECISAO_RESULTADO,
  C.CODCLI, C.NOME, F.CHAVE AS FASE_CHAVE
FROM CC_PEDIDO_RETIDO P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE P.CARD_ID IS NULL OR (P.DECISAO_RESULTADO <> '' AND F.FINAL = FALSE) ORDER BY P.ID`);
  for (const x of peds) {
    let cardId = inteiro(x.CARD_ID);
    const u = usuarioDoCaso(x.ANALISTA_ID, x.CRIADO_POR);
    if (!cardId) {
      if (!cabe(CUSTO.criar + CUSTO.mover)) { pendentes += 1; continue; }
      const card = await chamarKb('kbCardCriar', { boardId: boards.get('pedidos-limite'), titulo: `Pedido ${x.NUMERO_PEDIDO} · ${x.CODCLI} · ${x.NOME}`,
        valoresJson: JSON.stringify({ valor: numero(x.VALOR), excesso: numero(x.EXCESSO), excesso_pct: numero(x.EXCESSO_PCT), alcada: x.ALCADA_EXIGIDA }),
        responsaveisIds: String(u), prazo: '', criadoPor: u, origem: 'sistema' });
      gasto += CUSTO.criar;
      cardId = inteiro(card && card.id);
      if (!cardId) continue;
      await dml(`UPDATE CC_PEDIDO_RETIDO SET CARD_ID = ${cardId} WHERE ID = ${inteiro(x.ID)} AND CARD_ID IS NULL`);
      x.FASE_CHAVE = 'retido';
      processados += 1;
    }
    const alvo = x.DECISAO_RESULTADO === 'LIBERADO' ? 'liberado' : (x.DECISAO_RESULTADO === 'RECUSADO' ? 'recusado' : '');
    if (alvo && alvo !== x.FASE_CHAVE) {
      if (!cabe(CUSTO.mover)) { pendentes += 1; continue; }
      await moverCard(cardId, alvo, u);
      gasto += CUSTO.mover;
    }
  }
  // Capa `rating` e etiqueta de divergência dos cards de crédito vigente (só quando mudam).
  const capas = await ler(`SELECT S.CARD_ID, S.ANALISTA_ID, R.RATING_ATUAL, R.LIMITE_DIVERGE, K.VALORES_JSON FROM CC_RISCO_CLIENTE R
JOIN CC_CREDITO CR ON CR.ID = R.CREDITO_ID JOIN CC_SOLICITACAO S ON S.ID = CR.SOLICITACAO_ID JOIN KB_CARD K ON K.ID = S.CARD_ID
WHERE CR.VIGENTE_CHAVE IS NOT NULL`);
  for (const x of capas) {
    const v = lerJsonSeguro(x.VALORES_JSON, {});
    const etq = Array.isArray(v.etiquetas) ? v.etiquetas : [];
    const diverge = ehVerdade(x.LIMITE_DIVERGE);
    if (String(v.rating || '') === String(x.RATING_ATUAL || '') && etq.includes(ETQ['Limite diverge do Winthor']) === diverge) continue;
    if (!cabe(CUSTO.atualizar)) { pendentes += 1; continue; }
    gasto += CUSTO.atualizar * await atualizarCard(x.CARD_ID, usuarioDoCaso(x.ANALISTA_ID, 0), { rating: x.RATING_ATUAL || '' },
      diverge ? { mais: [ETQ['Limite diverge do Winthor']] } : { menos: [ETQ['Limite diverge do Winthor']] });
  }
  return { ok: true, pendentes, execucoes: gasto, processados };
};

/* ── internas (forma A, 01 §5) ── */

const CASO_SOL = CASO_S('CC_SOLICITACAO', 'A');
const ATOR_CASO_SOL = ATOR('{{membroId}}', CASO_SOL);
const ABERTA_SOL = 'CC_SOLICITACAO.DECIDIDA_EM IS NULL AND CC_SOLICITACAO.ENCERRADA_EM IS NULL';
const ANTES_COMITE_SOL = `EXISTS (SELECT 1 FROM KB_CARD KS JOIN CC_FASE FS ON FS.FASE_ID = KS.FASE_ID WHERE KS.ID = CC_SOLICITACAO.CARD_ID AND ${ANTES_DO_COMITE('FS')})`;
const NUM = (k) => `CAST(NULLIF('{{${k}}}', '') AS DECIMAL(15,2))`;
const MUDOU_MOTOR = `VALOR <> {{valor}} OR TIPO_CLIENTE <> '{{tipoCliente}}' OR COALESCE(CONS_DATA, '') <> '{{consData}}'
    OR CONS_RECEITA <> '{{consReceita}}' OR CONS_PROTESTO <> '{{consProtesto}}' OR CONS_PROCESSO <> '{{consProcesso}}' OR CONS_SOCIOS <> '{{consSocios}}'
    OR COALESCE(CNPJ_ABERTURA, '') <> '{{cnpjAbertura}}'
    ${['finAc:FIN_AC', 'finPc:FIN_PC', 'finPl:FIN_PL', 'finDivida:FIN_DIVIDA', 'finEbitda:FIN_EBITDA', 'fatMensal:FAT_MENSAL', 'scoreSerasa:SCORE_SERASA']
    .map((x) => { const [k, c] = x.split(':'); return `OR COALESCE(${c}, -1) <> COALESCE(${NUM(k)}, -1)`; }).join('\n    ')}
    OR FP_TIPO <> '{{fpTipo}}' OR FP_PRAZO_DIAS <> {{fpPrazoDias}} OR GARANTIA <> '{{garantia}}'
    OR FLAG_NEGATIVACAO <> ({{flagNegativacao}} = 1) OR FLAG_DADOS <> ({{flagDados}} = 1) OR FLAG_PEDIDO <> ({{flagPedido}} = 1)`;

const LA = '{{limiteAprovado}}';
const AO_JOIN = TEM_005 ? 'LEFT JOIN CC_ANALISE_ORGAO AO ON AO.SOLICITACAO_ID = S.ID' : '';
// Pública APROVADA só com contrato ativo, relido da análise (RN-005 da 005, 04 §8; B-01 da B3-005): o `podeAprovar` da JS na guarda.
const RAMO_CONCESSAO = `SELECT 'SOLICITACAO', S.ID, S.CLIENTE_ID, '{{resultado}}', {{membroId}}, ${ROTULO_CONCESSAO('S', LA, TEM_005 ? 'AO' : null)},
  ${ROTULO_CONCESSAO('S', LA, TEM_005 ? 'AO' : null)},
  ${NIVEL_CONCESSAO('S', LA, TEM_005 ? 'AO' : null)}, ${VALOR_ALCADA('S', LA)}, ${LA},
  ${TEM_005 ? "CASE WHEN S.CARTEIRA = 'PUBLICA' THEN COALESCE(AO.EXPOSICAO, 0) ELSE S.MOTOR_LIMITE END" : 'S.MOTOR_LIMITE'},
  CASE WHEN S.CARTEIRA = 'PUBLICA' THEN '' ELSE ${RATING_EFETIVO('S')} END, ${TEM_005 ? "CASE WHEN S.CARTEIRA = 'PUBLICA' THEN COALESCE(AO.RATING_PUB, '') ELSE '' END" : "''"},
  '{{planoCod}}', '{{planoDescr}}', '{{forma}}', '', '{{parecer}}', '{{justificativaExcecao}}', '{{motorJson}}', '{{agora}}'
FROM CC_SOLICITACAO S JOIN KB_CARD KS ON KS.ID = S.CARD_ID JOIN CC_FASE FS ON FS.FASE_ID = KS.FASE_ID ${AO_JOIN}
WHERE '{{entidade}}' = 'SOLICITACAO' AND {{creditoId}} = 0 AND S.ID = {{entidadeId}} AND FS.CHAVE = 'comite' AND S.ENCERRADA_EM IS NULL
  AND (S.DECISAO_RESULTADO = '' OR S.DECISAO_RESULTADO = 'PRE_APROVADA')
  AND ('{{resultado}}' IN ('APROVADA', 'RECUSADA') OR ('{{resultado}}' = 'PRE_APROVADA' AND S.CARTEIRA = 'PUBLICA'))
  ${TEM_005 ? `AND (S.CARTEIRA <> 'PUBLICA' OR (AO.ID IS NOT NULL AND ${NAO_PROPONENTE('AO.PROPOSTA_POR')}))
  AND ('{{resultado}}' <> 'APROVADA' OR S.CARTEIRA <> 'PUBLICA'
    OR (AO.BASE = 'CONTRATO' AND AO.SALDO_CONTRATO > 0 AND AO.VIGENCIA_FIM >= ${HOJE_SQL}))` : "AND S.CARTEIRA <> 'PUBLICA'"}
  AND COALESCE(S.ANALISTA_ID, 0) <> {{membroId}} AND ${NAO_PROPONENTE('S.PROPOSTA_POR')}
  AND '{{parecer}}' <> ''
  AND ('{{resultado}}' = 'RECUSADA' OR (${LA} > 0 AND '{{planoCod}}' <> '' AND '{{forma}}' <> ''))
  AND ('{{resultado}}' <> 'APROVADA' OR NOT ${EXCECAO_CONCESSAO('S', LA, TEM_005 ? 'AO' : null)} OR '{{justificativaExcecao}}' <> '')
  AND ${ATOR('{{membroId}}', `A.NIVEL >= ${NIVEL_CONCESSAO('S', LA, TEM_005 ? 'AO' : null)}`)}`;
const RAMO_RENOVACAO = `SELECT 'SOLICITACAO', CR.SOLICITACAO_ID, CR.CLIENTE_ID, '{{resultado}}', {{membroId}}, ${FAIXA_CONCESSAO('CR.LIMITE', 'CR.CARTEIRA', true)},
  ${FAIXA_CONCESSAO('CR.LIMITE', 'CR.CARTEIRA', true)}, ${FAIXA_CONCESSAO('CR.LIMITE', 'CR.CARTEIRA')}, CR.LIMITE, CR.LIMITE, 0,
  CASE WHEN CR.CARTEIRA = 'PUBLICA' THEN '' ELSE COALESCE(R.RATING_ATUAL, '') END, '', CR.PLANO_COD, CR.PLANO_DESCR, CR.FORMA, '', '{{parecer}}', '',
  '{{motorJson}}', '{{agora}}'
FROM CC_CREDITO CR LEFT JOIN CC_RISCO_CLIENTE R ON R.CLIENTE_ID = CR.CLIENTE_ID
WHERE '{{entidade}}' = 'SOLICITACAO' AND {{creditoId}} > 0 AND CR.ID = {{creditoId}} AND CR.SITUACAO = 'REANALISE'
  AND '{{resultado}}' IN ('RENOVADA', 'OBSOLETO') AND COALESCE(CR.ANALISTA_ID, 0) <> {{membroId}} AND '{{parecer}}' <> ''
  AND ${ATOR('{{membroId}}', `A.NIVEL >= ${FAIXA_CONCESSAO('CR.LIMITE', 'CR.CARTEIRA')}`)}`;
const RAMO_PEDIDO = `SELECT 'PEDIDO', P.ID, P.CLIENTE_ID, '{{resultado}}', {{membroId}}, P.ALCADA_EXIGIDA, P.ALCADA_EXIGIDA, P.NIVEL_EXIGIDO, P.EXCESSO, 0,
  P.LIMITE_NA_DATA, '', '', '{{planoCod}}', '{{planoDescr}}', '{{forma}}', '{{condicao}}', '{{parecer}}', '', '{{motorJson}}', '{{agora}}'
FROM CC_PEDIDO_RETIDO P
WHERE '{{entidade}}' = 'PEDIDO' AND P.ID = {{entidadeId}} AND P.DECISAO_RESULTADO = '' AND '{{resultado}}' IN ('LIBERADO', 'RECUSADO')
  AND COALESCE(P.ANALISTA_ID, 0) <> {{membroId}} AND COALESCE(P.CRIADO_POR, 0) <> {{membroId}} AND ${NAO_PROPONENTE('P.RECOMENDADO_POR')}
  AND ('{{resultado}}' = 'RECUSADO' OR ('{{condicao}}' <> '' AND '{{planoCod}}' <> '' AND '{{forma}}' <> ''))
  AND ${ATOR('{{membroId}}', 'A.NIVEL >= P.NIVEL_EXIGIDO')}`;

const SQL_DECISAO_INSERIR = `INSERT INTO CC_DECISAO (ENTIDADE, ENTIDADE_ID, CLIENTE_ID, RESULTADO, RESPONSAVEL_ID, CARGO_ALCADA, ALCADA_EXIGIDA, NIVEL_EXIGIDO,
  VALOR_ALCADA, LIMITE_APROVADO, LIMITE_MOTOR, RATING, RATING_PUB, PLANO_COD, PLANO_DESCR, FORMA, CONDICAO, PARECER, JUSTIFICATIVA_EXCECAO, MOTOR_JSON, EM)
${RAMO_CONCESSAO}
UNION ALL
${RAMO_RENOVACAO}
UNION ALL
${RAMO_PEDIDO}`;

/** Pedido (B-01): % do excesso sobre o limite e a alçada de 03 §7, sobre a derivada `X` de ccEscCredPedidoInserir. */
const PED_PCT = '(CASE WHEN X.LIM > 0 THEN ROUND(X.EXC * 100 / X.LIM, 2) ELSE 100 END)';
const PED_ALCADA = (o) => ALCADA_PEDIDO('X.EXC', PED_PCT, 'X.ATR', 'X.CART', o);
/** Pendência ainda não aberta para a mesma origem (`{{tipo}}`/`{{origem}}`/`{{origemId}}`). */
const PEND_NOVA = `NOT EXISTS (SELECT 1 FROM (SELECT PW.ID FROM CC_PENDENCIA_WINTHOR PW WHERE PW.TIPO = '{{tipo}}' AND PW.ORIGEM = '{{origem}}'
    AND PW.ORIGEM_ID = {{origemId}} AND PW.APLICADA_EM IS NULL) XP)`;
/** Texto da pendência de bloqueio (SF e rotina, o mesmo). */
const DESC_BLOQUEAR = (cr) => `CONCAT('Bloquear limite no Winthor: ', ${BRL(`${cr}.LIMITE`)})`;

const DECISAO_DO_ATOR = (resultados, cond) => `EXISTS (SELECT 1 FROM CC_DECISAO D WHERE D.ENTIDADE = 'SOLICITACAO' AND D.RESULTADO IN (${resultados})
      AND D.RESPONSAVEL_ID = {{membroId}} AND ${cond})`;

const INTERNAS = {
  ccEscCredSolicitacaoInserir: `INSERT INTO CC_SOLICITACAO (CLIENTE_ID, CARTEIRA, TIPO_CLIENTE, VALOR, PRAZO_MESES, JUSTIFICATIVA, RCA, ANALISTA_ID, CRIADO_EM, CRIADO_POR, PRAZO_DECISAO)
SELECT C.ID, '{{carteira}}', '{{tipoCliente}}', {{valor}}, {{prazoMeses}}, '{{justificativa}}', '{{rca}}', NULLIF({{analistaId}}, 0), '{{agora}}', {{membroId}}, '{{prazoDecisao}}'
FROM CC_CLIENTE C
WHERE C.ID = {{clienteId}} AND '{{carteira}}' IN ('PRIVADA', 'ESTETICA', 'PUBLICA') AND '{{tipoCliente}}' IN ('NOVO', 'RECORRENTE', 'INATIVO')
  AND {{valor}} > 0 AND {{prazoMeses}} > 0 AND '{{justificativa}}' <> ''
  AND ((C.SETOR = 'PUBLICO' AND '{{carteira}}' = 'PUBLICA') OR (C.SETOR <> 'PUBLICO' AND '{{carteira}}' <> 'PUBLICA'))
  AND NOT EXISTS (SELECT 1 FROM (SELECT S.ID FROM CC_SOLICITACAO S WHERE S.CLIENTE_ID = {{clienteId}} AND S.CARTEIRA = '{{carteira}}' AND ${ABERTA('S')}) X)
  AND ({{analistaId}} = 0 OR EXISTS (SELECT 1 FROM CC_MEMBRO D WHERE D.ID = {{analistaId}} AND D.ATIVO = TRUE AND D.CARGO <> 'JURIDICO'))
  AND ${ATOR('{{membroId}}', `${clienteVisivelA('C', 'A')} AND ({{analistaId}} = 0 OR {{analistaId}} = A.ID OR ${NIVEL_MIN(2)})`)}`,
  ccEscCredSolicitacaoCard: `UPDATE CC_SOLICITACAO SET CARD_ID = {{cardId}}
WHERE ID = {{solicitacaoId}} AND CARD_ID IS NULL
  AND EXISTS (SELECT 1 FROM KB_CARD K JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE K.ID = {{cardId}}
    AND F.QUADRO = CONCAT('concessao-', LOWER(CC_SOLICITACAO.CARTEIRA)))
  AND NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT S2.ID FROM CC_SOLICITACAO S2 WHERE S2.CARD_ID = {{cardId}}) X)
  AND ${ATOR('{{membroId}}', `(A.ID = CC_SOLICITACAO.CRIADO_POR OR ${CASO_SOL})`)}`,
  ccEscCredSolicitacaoDados: `UPDATE CC_SOLICITACAO SET
  PROPOSTA_POR = CASE WHEN ${MUDOU_MOTOR} THEN ${PROPONENTE_ADD('PROPOSTA_POR')} ELSE PROPOSTA_POR END,
  VALOR = {{valor}}, PRAZO_MESES = {{prazoMeses}}, TIPO_CLIENTE = '{{tipoCliente}}', JUSTIFICATIVA = '{{justificativa}}', RCA = '{{rca}}', OBS = '{{obs}}',
  CONS_DATA = NULLIF('{{consData}}', ''), CONS_RECEITA = '{{consReceita}}', CONS_PROTESTO = '{{consProtesto}}', CONS_PROCESSO = '{{consProcesso}}',
  CONS_SOCIOS = '{{consSocios}}', CNPJ_ABERTURA = NULLIF('{{cnpjAbertura}}', ''), FIN_AC = ${NUM('finAc')}, FIN_PC = ${NUM('finPc')}, FIN_PL = ${NUM('finPl')},
  FIN_DIVIDA = ${NUM('finDivida')}, FIN_EBITDA = ${NUM('finEbitda')}, FAT_MENSAL = ${NUM('fatMensal')},
  SCORE_SERASA = CAST(NULLIF('{{scoreSerasa}}', '') AS SIGNED), FP_TIPO = '{{fpTipo}}', FP_NOME = '{{fpNome}}', FP_PRAZO_DIAS = {{fpPrazoDias}},
  GARANTIA = '{{garantia}}', CONF_FIN_CONTATO_ID = NULLIF({{confFinContatoId}}, 0), FLAG_NEGATIVACAO = ({{flagNegativacao}} = 1),
  FLAG_DADOS = ({{flagDados}} = 1), FLAG_PEDIDO = ({{flagPedido}} = 1)
WHERE ID = {{solicitacaoId}} AND ${ABERTA_SOL} AND {{valor}} > 0 AND ${ATOR_CASO_SOL}`,
  ccEscCredSolicitacaoAnalise: `UPDATE CC_SOLICITACAO SET PROPOSTA_POR = ${PROPONENTE_ADD('PROPOSTA_POR')}, LIMITE_PROPOSTO = {{limiteProposto}},
  PARECER_ANALISTA = '{{parecer}}'
WHERE ID = {{solicitacaoId}} AND ${ABERTA_SOL} AND {{limiteProposto}} >= 0 AND ${ATOR_CASO_SOL}`,
  ccEscCredSolicitacaoAnalista: `UPDATE CC_SOLICITACAO SET ANALISTA_ID = {{analistaId}}
WHERE ID = {{solicitacaoId}} AND ${ABERTA_SOL} AND ${ANTES_COMITE_SOL}
  AND EXISTS (SELECT 1 FROM CC_MEMBRO D WHERE D.ID = {{analistaId}} AND D.ATIVO = TRUE AND D.CARGO <> 'JURIDICO')
  AND ${ATOR('{{membroId}}', `${NIVEL_MIN(2)} AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = CC_SOLICITACAO.CLIENTE_ID AND ${clienteVisivelA('C', 'A')})`)}`,
  ccEscCredSolicitacaoMotor: `UPDATE CC_SOLICITACAO SET PROPOSTA_POR = ${PROPONENTE_ADD('PROPOSTA_POR')}, RATING_MOTOR = '{{rating}}', MOTOR_LIMITE = {{limite}},
  MOTOR_RESULTADO = '{{resultado}}', MOTOR_EM = '{{agora}}'
WHERE ID = {{solicitacaoId}} AND ${ABERTA_SOL} AND CARTEIRA <> 'PUBLICA' AND '{{rating}}' IN ('', 'AA', 'A', 'B', 'C', 'D', 'E') AND ${ATOR_CASO_SOL}`,
  ccEscCredSolicitacaoAjuste: `UPDATE CC_SOLICITACAO SET
  PROPOSTA_POR = CASE WHEN '{{acao}}' = 'PROPOR' THEN ${PROPONENTE_ADD('PROPOSTA_POR')} ELSE PROPOSTA_POR END,
  RATING_AJUSTE = CASE WHEN '{{acao}}' = 'PROPOR' THEN '{{rating}}' ELSE RATING_AJUSTE END,
  AJUSTE_JUSTIFICATIVA = CASE WHEN '{{acao}}' = 'PROPOR' THEN '{{justificativa}}' ELSE AJUSTE_JUSTIFICATIVA END,
  AJUSTE_POR = CASE WHEN '{{acao}}' = 'PROPOR' THEN {{membroId}} ELSE AJUSTE_POR END,
  AJUSTE_DECIDIDO_POR = CASE WHEN '{{acao}}' = 'PROPOR' THEN NULL ELSE {{membroId}} END,
  AJUSTE_DECIDIDO_EM = CASE WHEN '{{acao}}' = 'PROPOR' THEN NULL ELSE '{{agora}}' END,
  AJUSTE_SITUACAO = CASE WHEN '{{acao}}' = 'PROPOR' THEN 'PENDENTE' WHEN {{aprovar}} = 1 THEN 'APROVADO' ELSE 'RECUSADO' END
WHERE ID = {{solicitacaoId}} AND ${ABERTA_SOL} AND CARTEIRA <> 'PUBLICA'
  AND (('{{acao}}' = 'PROPOR' AND '{{rating}}' IN ('AA', 'A', 'B', 'C', 'D', 'E') AND '{{justificativa}}' <> '' AND ${ATOR_CASO_SOL})
    OR ('{{acao}}' = 'DECIDIR' AND AJUSTE_SITUACAO = 'PENDENTE' AND ${ATOR('{{membroId}}', `EXISTS (SELECT 1 FROM CC_MEMBRO AJ WHERE AJ.ID = CC_SOLICITACAO.AJUSTE_POR
      AND AJ.ID <> A.ID AND A.CAMINHO <> '' AND AJ.CAMINHO LIKE CONCAT(A.CAMINHO, '%'))`)}))`,
  ccEscCredSolicitacaoDecisao: `UPDATE CC_SOLICITACAO SET DECISAO_RESULTADO = '{{resultado}}', DECISAO_ID = {{decisaoId}},
  DECIDIDA_EM = COALESCE(DECIDIDA_EM, '{{agora}}'),
  ENCERRADA_EM = CASE WHEN '{{resultado}}' = 'RECUSADA' THEN '{{agora}}' ELSE ENCERRADA_EM END,
  MOTIVO_RECUSA = CASE WHEN '{{resultado}}' = 'RECUSADA' THEN '{{motivo}}' ELSE MOTIVO_RECUSA END
WHERE ID = {{solicitacaoId}} AND ENCERRADA_EM IS NULL
  AND EXISTS (SELECT 1 FROM CC_DECISAO D WHERE D.ID = {{decisaoId}} AND D.ENTIDADE = 'SOLICITACAO' AND D.ENTIDADE_ID = {{solicitacaoId}}
    AND D.RESULTADO = '{{resultado}}' AND D.RESPONSAVEL_ID = {{membroId}})
  AND ${ATOR()}`,
  ccEscCredSolicitacaoEncerrar: `UPDATE CC_SOLICITACAO SET ENCERRADA_EM = '{{agora}}', MOTIVO_RECUSA = '{{motivo}}'
WHERE ID = {{solicitacaoId}} AND ${ABERTA_SOL} AND '{{motivo}}' <> '' AND ${ANTES_COMITE_SOL} AND ${ATOR_CASO_SOL}`,
  ccEscCredDecisaoInserir: SQL_DECISAO_INSERIR,
  ccEscCredCreditoInserir: `INSERT INTO CC_CREDITO (CLIENTE_ID, SOLICITACAO_ID, DECISAO_ID, CARTEIRA, ANALISTA_ID, LIMITE, PLANO_COD, PLANO_DESCR, FORMA,
  RATING_CONCESSAO, ANALISE_ORGAO_ID, TIPO_CLIENTE, INICIO_VALIDADE, FIM_VALIDADE, SITUACAO, SITUACAO_EM, MOTIVO_ENCAMINHAMENTO, VIGENTE_CHAVE)
SELECT D.CLIENTE_ID, S.ID, D.ID, S.CARTEIRA, S.ANALISTA_ID, D.LIMITE_APROVADO, D.PLANO_COD, D.PLANO_DESCR, D.FORMA,
  CASE WHEN S.CARTEIRA = 'PUBLICA' THEN '' ELSE D.RATING END,
  ${TEM_005 ? "(SELECT MAX(AO.ID) FROM CC_ANALISE_ORGAO AO WHERE AO.SOLICITACAO_ID = S.ID AND S.CARTEIRA = 'PUBLICA')" : 'NULL'},
  S.TIPO_CLIENTE, PRM.HOJE, ${SOMAR_MESES('PRM.HOJE', PARAM_NUM('cred.validadeMeses', 'S.CARTEIRA'))}, 'GESTAO', '{{agora}}', '', D.CLIENTE_ID
FROM CC_DECISAO D JOIN CC_SOLICITACAO S ON S.ID = D.ENTIDADE_ID ${PRM}
WHERE D.ID = {{decisaoId}} AND D.ENTIDADE = 'SOLICITACAO' AND D.RESULTADO IN ('APROVADA', 'RENOVADA') AND D.LIMITE_APROVADO > 0
  AND NOT EXISTS (SELECT 1 FROM (SELECT CX.DECISAO_ID FROM CC_CREDITO CX) X WHERE X.DECISAO_ID = D.ID)
  AND NOT EXISTS (SELECT 1 FROM (SELECT CY.VIGENTE_CHAVE FROM CC_CREDITO CY WHERE CY.VIGENTE_CHAVE IS NOT NULL) Y WHERE Y.VIGENTE_CHAVE = D.CLIENTE_ID)
  AND ((D.RESULTADO = 'RENOVADA' AND ${ATOR('{{membroId}}', 'A.ID = D.RESPONSAVEL_ID')})
    OR (D.RESULTADO = 'APROVADA' AND S.DECISAO_ID = D.ID AND ${CREDITO_LIBERAVEL('S')}
      AND ${ATOR('{{membroId}}', `(A.ID = D.RESPONSAVEL_ID OR ${CASO_S('S', 'A')})`)}))`,
  ccEscCredCreditoSituacao: `UPDATE CC_CREDITO SET SITUACAO = '{{situacao}}', SITUACAO_EM = '{{agora}}', MOTIVO_ENCAMINHAMENTO = '{{motivo}}',
  VIGENTE_CHAVE = CASE WHEN '{{situacao}}' IN ('GESTAO', 'REANALISE') THEN CLIENTE_ID ELSE NULL END
WHERE ID = {{creditoId}} AND (
  ('{{situacao}}' = 'REANALISE' AND SITUACAO = 'GESTAO'
    AND ${ATOR('{{membroId}}', `${NIVEL_MIN(2)} AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = CC_CREDITO.CLIENTE_ID AND ${clienteVisivelA('C', 'A')})`)})
  OR ('{{situacao}}' = 'ENCERRADO' AND SITUACAO IN ('GESTAO', 'REANALISE')
    AND EXISTS (SELECT 1 FROM CC_DECISAO D JOIN CC_SOLICITACAO S ON S.ID = D.ENTIDADE_ID AND S.DECISAO_ID = D.ID
      WHERE D.ENTIDADE = 'SOLICITACAO' AND D.CLIENTE_ID = CC_CREDITO.CLIENTE_ID AND D.ID > CC_CREDITO.DECISAO_ID AND D.RESULTADO = 'APROVADA'
        AND NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT CN0.DECISAO_ID FROM CC_CREDITO CN0) CN WHERE CN.DECISAO_ID = D.ID) AND ${CREDITO_LIBERAVEL('S')}
        AND ${ATOR('{{membroId}}', `(A.ID = D.RESPONSAVEL_ID OR ${CASO_S('S', 'A')})`)}))
  OR ('{{situacao}}' IN ('ENCERRADO', 'OBSOLETO') AND SITUACAO = 'REANALISE' AND ${ATOR()}
    AND ${DECISAO_DO_ATOR("'RENOVADA', 'OBSOLETO'", `D.ENTIDADE_ID = CC_CREDITO.SOLICITACAO_ID AND D.ID > CC_CREDITO.DECISAO_ID
      AND D.RESULTADO = (CASE '{{situacao}}' WHEN 'ENCERRADO' THEN 'RENOVADA' ELSE 'OBSOLETO' END)`)}))`,
  ccEscCredPedidoInserir: `INSERT INTO CC_PEDIDO_RETIDO (CLIENTE_ID, CREDITO_ID, NUMERO_PEDIDO, VALOR, LIMITE_NA_DATA, UTILIZADO_NA_DATA, ATRASO_NA_DATA, EXCESSO,
  EXCESSO_PCT, ALCADA_EXIGIDA, NIVEL_EXIGIDO, CRITICA, RCA, TIPO_CLIENTE, JUSTIFICATIVA, ANALISTA_ID, CRIADO_EM, CRIADO_POR)
SELECT C.ID, X.CREDITO_ID, '{{numeroPedido}}', {{valor}}, X.LIM, X.UT, X.ATR, X.EXC, ${PED_PCT},
  ${PED_ALCADA('rotulo')}, ${PED_ALCADA('nivel')}, ${PED_ALCADA('critica')},
  '{{rca}}', '{{tipoCliente}}', '{{justificativa}}', NULLIF({{analistaId}}, 0), '{{agora}}', {{membroId}}
FROM (SELECT C0.ID, COALESCE(P0.LIMITE, 0) AS LIM, COALESCE(P0.UTILIZADO, 0) AS UT, COALESCE(P0.DIAS_ATRASO, 0) AS ATR,
    ROUND(COALESCE(P0.UTILIZADO, 0) + {{valor}} - COALESCE(P0.LIMITE, 0), 2) AS EXC, CR0.ID AS CREDITO_ID,
    COALESCE(CR0.CARTEIRA, CASE WHEN C0.SETOR = 'PUBLICO' THEN 'PUBLICA' ELSE 'PRIVADA' END) AS CART
  FROM CC_CLIENTE C0 LEFT JOIN CC_POSICAO_CLIENTE P0 ON P0.CLIENTE_ID = C0.ID LEFT JOIN CC_CREDITO CR0 ON CR0.VIGENTE_CHAVE = C0.ID
  WHERE C0.ID = {{clienteId}}) X
JOIN CC_CLIENTE C ON C.ID = X.ID
WHERE '{{numeroPedido}}' <> '' AND {{valor}} > 0 AND X.EXC > 0
  AND NOT EXISTS (SELECT 1 FROM (SELECT P.ID FROM CC_PEDIDO_RETIDO P WHERE P.CLIENTE_ID = {{clienteId}} AND P.NUMERO_PEDIDO = '{{numeroPedido}}'
    AND P.DECISAO_RESULTADO = '') X)
  AND ${ATOR('{{membroId}}', clienteVisivelA('C', 'A'))}`,
  ccEscCredPedidoAtualizar: `UPDATE CC_PEDIDO_RETIDO SET
  RECOMENDADO_POR = CASE WHEN '{{modo}}' = 'RECOMENDACAO' THEN ${PROPONENTE_ADD('RECOMENDADO_POR')} ELSE RECOMENDADO_POR END,
  DENTRO_REGRA = CASE WHEN '{{modo}}' = 'DESFECHO' THEN ('{{resultado}}' = 'LIBERADO' AND UTILIZADO_NA_DATA + VALOR <= LIMITE_NA_DATA
    + COALESCE((SELECT R.FLEX_VALOR FROM CC_RISCO_CLIENTE R WHERE R.CLIENTE_ID = CC_PEDIDO_RETIDO.CLIENTE_ID), 0)) ELSE DENTRO_REGRA END,
  FLEXIBILIZADO = CASE WHEN '{{modo}}' = 'DESFECHO' THEN ('{{resultado}}' = 'LIBERADO') ELSE FLEXIBILIZADO END,
  CARD_ID = CASE WHEN '{{modo}}' = 'CARD' THEN {{cardId}} ELSE CARD_ID END,
  RECOMENDACAO = CASE WHEN '{{modo}}' = 'RECOMENDACAO' THEN '{{recomendacao}}' ELSE RECOMENDACAO END,
  ANALISTA_ID = CASE WHEN '{{modo}}' = 'ANALISTA' THEN {{analistaId}} ELSE ANALISTA_ID END,
  MOTIVO_RECUSA = CASE WHEN '{{modo}}' = 'DESFECHO' THEN '{{motivo}}' ELSE MOTIVO_RECUSA END,
  DECIDIDO_EM = CASE WHEN '{{modo}}' = 'DESFECHO' THEN '{{agora}}' ELSE DECIDIDO_EM END,
  DECISAO_RESULTADO = CASE WHEN '{{modo}}' = 'DESFECHO' THEN '{{resultado}}' ELSE DECISAO_RESULTADO END
WHERE ID = {{pedidoId}} AND DECISAO_RESULTADO = '' AND (
  ('{{modo}}' = 'CARD' AND CARD_ID IS NULL
    AND EXISTS (SELECT 1 FROM KB_CARD K JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE K.ID = {{cardId}} AND F.QUADRO = 'pedidos-limite')
    AND NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT P2.ID FROM CC_PEDIDO_RETIDO P2 WHERE P2.CARD_ID = {{cardId}}) X)
    AND ${ATOR('{{membroId}}', `(A.ID = CC_PEDIDO_RETIDO.CRIADO_POR OR ${CASO_P('CC_PEDIDO_RETIDO', 'A')})`)})
  OR ('{{modo}}' = 'RECOMENDACAO' AND ${ATOR('{{membroId}}', CASO_P('CC_PEDIDO_RETIDO', 'A'))})
  OR ('{{modo}}' = 'ANALISTA' AND EXISTS (SELECT 1 FROM KB_CARD KP JOIN CC_FASE FP ON FP.FASE_ID = KP.FASE_ID WHERE KP.ID = CC_PEDIDO_RETIDO.CARD_ID
      AND FP.CHAVE IN ('retido', 'analise'))
    AND EXISTS (SELECT 1 FROM CC_MEMBRO D WHERE D.ID = {{analistaId}} AND D.ATIVO = TRUE AND D.CARGO <> 'JURIDICO')
    AND ${ATOR('{{membroId}}', CASO_P('CC_PEDIDO_RETIDO', 'A'))})
  OR ('{{modo}}' = 'DESFECHO' AND '{{resultado}}' IN ('LIBERADO', 'RECUSADO') AND ${ATOR()}
    AND EXISTS (SELECT 1 FROM CC_DECISAO D WHERE D.ENTIDADE = 'PEDIDO' AND D.ENTIDADE_ID = {{pedidoId}} AND D.RESULTADO = '{{resultado}}'
      AND D.RESPONSAVEL_ID = {{membroId}})))`,
  ccEscCredPendenciaInserir: `INSERT INTO CC_PENDENCIA_WINTHOR (TIPO, CLIENTE_ID, ORIGEM, ORIGEM_ID, DESCRICAO, VALOR, GERADA_EM, GERADA_POR)
SELECT 'APLICAR_LIMITE', D.CLIENTE_ID, 'SOLICITACAO', S.ID,
  CONCAT('Aplicar no Winthor: limite ', ${BRL('D.LIMITE_APROVADO')}, ', plano ', D.PLANO_DESCR, ', ', LOWER(D.FORMA)), D.LIMITE_APROVADO, '{{agora}}', {{membroId}}
FROM CC_SOLICITACAO S JOIN CC_DECISAO D ON D.ID = S.DECISAO_ID
WHERE '{{tipo}}' = 'APLICAR_LIMITE' AND '{{origem}}' = 'SOLICITACAO' AND S.ID = {{origemId}} AND D.ENTIDADE = 'SOLICITACAO' AND D.ENTIDADE_ID = S.ID
  AND D.RESULTADO = 'APROVADA' AND D.RESPONSAVEL_ID = {{membroId}} AND ${PEND_NOVA} AND ${ATOR()}
UNION ALL
SELECT 'BLOQUEAR_LIMITE', CR.CLIENTE_ID, 'CREDITO', CR.ID, ${DESC_BLOQUEAR('CR')}, CR.LIMITE, '{{agora}}', {{membroId}}
FROM CC_CREDITO CR
WHERE '{{tipo}}' = 'BLOQUEAR_LIMITE' AND '{{origem}}' = 'CREDITO' AND CR.ID = {{origemId}} AND CR.SITUACAO = 'OBSOLETO'
  AND ${DECISAO_DO_ATOR("'OBSOLETO'", 'D.ENTIDADE_ID = CR.SOLICITACAO_ID')} AND ${PEND_NOVA} AND ${ATOR()}
UNION ALL
SELECT 'LIBERAR_PEDIDO', P.CLIENTE_ID, 'PEDIDO', P.ID, CONCAT('Liberar pedido ', P.NUMERO_PEDIDO, ' no Winthor'), P.VALOR, '{{agora}}', {{membroId}}
FROM CC_PEDIDO_RETIDO P
WHERE '{{tipo}}' = 'LIBERAR_PEDIDO' AND '{{origem}}' = 'PEDIDO' AND P.ID = {{origemId}} AND P.DECISAO_RESULTADO = 'LIBERADO'
  AND EXISTS (SELECT 1 FROM CC_DECISAO D WHERE D.ENTIDADE = 'PEDIDO' AND D.ENTIDADE_ID = P.ID AND D.RESULTADO = 'LIBERADO' AND D.RESPONSAVEL_ID = {{membroId}})
  AND ${PEND_NOVA} AND ${ATOR()}`,
  ccEscCredPendenciaAplicar: `UPDATE CC_PENDENCIA_WINTHOR SET APLICADA_EM = '{{agora}}', APLICADA_POR = {{membroId}}, OBS = '{{obs}}'
WHERE ID = {{pendenciaId}} AND APLICADA_EM IS NULL AND ${ATOR('{{membroId}}', CASO_PW('CC_PENDENCIA_WINTHOR', 'A'))}`,
  ccEscCredCalibracaoRevisaoInserir: `INSERT INTO CC_CALIBRACAO_REVISAO (REVISADO_EM, PARECER, LEITURA_JSON, POR_ID, EM)
SELECT SUBSTRING('{{agora}}', 1, 10), '{{parecer}}', '{{leituraJson}}', {{membroId}}, '{{agora}}' FROM DUAL
WHERE '{{parecer}}' <> '' AND ${ATOR('{{membroId}}', PODE_ADMINISTRAR)}`,
};

/* ── definitions ── */

// Números como parâmetro (DT-45): todo {{x}} fora de aspas vira CAST; DECIMAIS = os valores em dinheiro desta spec.
const DECIMAIS = ['valor', 'limiteProposto', 'limite', 'limiteAprovado'];
const sql = (name, code, extra = {}) => ({ name, type: 'SQL', code: numerosComoParametro(code, DECIMAIS), ...extra });
const jsDef = (name, code, extra = {}) => ({ name, type: 'JAVASCRIPT', code, ...extra });
const FONTE_ESCRITA = [constante('SQL_ABERTA', ABERTA('S')), constante('CAMPOS_DADOS', CAMPOS_DADOS), constante('DESC_BLOQUEAR_JS', DESC_BLOQUEAR('CR')),
  `const podeVer = ${podeVer};`, String(criarCredito), String(pedidoPor), FONTE_VISAO].join('\n');
const sfe = (fn) => sf(fn, FONTE_ESCRITA);

export const definitions = [
  // ── Leituras ──
  sql('ccCredSolicitacaoListar', SQL_SOL_LISTAR),
  sql('ccCredSolicitacaoTotal', SQL_SOL_TOTAL),
  sql('ccCredEsteiraResumo', SQL_ESTEIRA),
  jsDef('ccCredSolicitacaoFicha', sfe(corpoSolicitacaoFicha)),
  sql('ccCredSolicitacaoHistorico', SQL_HISTORICO),
  sql('ccCredTipoClienteSugerir', SQL_TIPO_CLIENTE),
  jsDef('ccCredMotorCalcular', sfe(corpoMotorCalcular)),
  sql('ccCredCreditoListar', SQL_CRED_LISTAR),
  sql('ccCredCreditoTotal', SQL_CRED_TOTAL),
  sql('ccCredCreditoResumo', SQL_CRED_RESUMO),
  sql('ccCredRevisaoListar', SQL_REVISAO_LISTAR),
  sql('ccCredRevisaoTotal', SQL_REVISAO_TOTAL),
  sql('ccCredPedidoListar', SQL_PED_LISTAR),
  sql('ccCredPedidoTotal', SQL_PED_TOTAL),
  jsDef('ccCredPedidoFicha', sfe(corpoPedidoFicha)),
  sql('ccCredPendenciaListar', SQL_PEND_LISTAR),
  sql('ccCredPendenciaTotal', SQL_PEND_TOTAL),
  sql('ccCredAgendaListar', SQL_AGENDA_LISTAR),
  sql('ccCredAgendaTotal', SQL_AGENDA_TOTAL),
  sql('ccCredFarolCarteira', SQL_FAROL_CARTEIRA),
  sql('ccCredFarolClienteListar', SQL_FAROL_LISTAR),
  sql('ccCredFarolClienteTotal', SQL_FAROL_TOTAL),
  jsDef('ccCredFarolValidacao', sfe(corpoFarolValidacao)),
  sql('ccCredCalibracaoRevisaoListar', SQL_REVISAO_CALIB),
  sql('ccCredSaudeResumo', SQL_SAUDE_RESUMO),
  sql('ccCredSaudeListar', SQL_SAUDE_LISTAR),
  sql('ccCredSaudeTotal', SQL_SAUDE_TOTAL),
  sql('ccCredRiscoResumo', SQL_RISCO_RESUMO),
  sql('ccCredRiscoListar', SQL_RISCO_LISTAR),
  sql('ccCredRiscoTotal', SQL_RISCO_TOTAL),
  sql('ccCredCriticidadeListar', SQL_CRIT_LISTAR),
  sql('ccCredCriticidadeTotal', SQL_CRIT_TOTAL),
  sql('ccCredFlexResumo', SQL_FLEX),
  jsDef('ccCredDesempenho', sfe(corpoDesempenho)),
  // ── Escritas ──
  jsDef('ccCredSolicitacaoCriar', sfe(corpoSolicitacaoCriar)),
  jsDef('ccCredSolicitacaoSalvar', sfe(corpoSolicitacaoSalvar)),
  jsDef('ccCredSolicitacaoAtribuir', sfe(corpoSolicitacaoAtribuir)),
  jsDef('ccCredSolicitacaoRecusar', sfe(corpoSolicitacaoRecusar)),
  jsDef('ccCredRatingAjustar', sfe(corpoRatingAjustar)),
  jsDef('ccCredRatingAjusteDecidir', sfe(corpoRatingAjusteDecidir)),
  jsDef('ccCredDecisaoRegistrar', sfe(corpoDecisaoRegistrar)),
  jsDef('ccCredPendenciaAplicar', sfe(corpoPendenciaAplicar)),
  jsDef('ccCredReanaliseAbrir', sfe(corpoReanaliseAbrir)),
  jsDef('ccCredReanaliseConcluir', sfe(corpoReanaliseConcluir)),
  jsDef('ccCredPedidoCriar', sfe(corpoPedidoCriar)),
  jsDef('ccCredPedidoSalvar', sfe(corpoPedidoSalvar)),
  jsDef('ccCredPedidoDecidir', sfe(corpoPedidoDecidir)),
  jsDef('ccCredCalibracaoRevisar', sfe(corpoCalibracaoRevisar)),
  jsDef('ccCredRotina', sfe(corpoRotina)),
  // ── Internas ──
  ...Object.entries(INTERNAS).map(([nome, code]) => sql(nome, code)),
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
  const linhasDe = (r) => r?.result?.rows ?? r?.rows ?? (Array.isArray(r?.result) ? r.result : []);
  const exec = {
    consultar: async (q2) => linhasDe(await sdk.runQueryMitra({ projectId, sql: q2 })),
    executar: async (q2) => { await sdk.runDmlMitra({ projectId, sql: q2 }); },
  };
  await semearQuadro(exec, QUADROS);
  const lerMapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const publicar = async (def, mapa) => {
    const code = def.type === 'JAVASCRIPT' ? injetarIds(def.code, mapa) : def.code;
    const dados = { name: def.name, type: def.type, code, description: `Crédito e Cobrança · 004-concessao-credito · ${def.name}` };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 004 (ramo público ${TEM_005 ? 'com' : 'sem'} a 005) e 4 quadros semeados.`);
  console.log('Republique o add-010 (ccPodeMover com o trecho da 004), o add-001-kanban, o add-090 e o sync-server-function-map.');
}
