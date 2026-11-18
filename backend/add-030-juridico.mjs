// add-030 — Server Functions da 003-juridico (04 §3): 42 públicas e 19 internas, e a semeadura do quadro `juridico`.
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// `definitions` vai para o simulador, que roda o MESMO SQL e o MESMO JavaScript publicados.
//
// Entradas das escritas internas (forma A, 01 §5; `membroId` = quem age; `agora` vem da JS):
//   ccEscJurProcessoInserir      origem (COBRANCA|MANUAL|CARGA), clienteId (0 = sem cliente, só CARGA), nomeDevedor, documento,
//                                carteira, buId, linha, filial, valor, autos, tribunal, responsavelId, status, prazo, prazoDescricao, substabelecer,
//                                obs, chaveCarga, alertaCarga, sugestaoClientes, encerradoEm, motivo, motivoTexto, ultimoAndamentoEm, membroId, agora
//                                (COBRANCA: a SQL deriva caso, setor, valor e status e grava vazios autos, prazo, responsável, carga e encerramento)
//   ccEscJurProcessoCard         processoId, cardId, membroId
//   ccEscJurProcessoAtualizar    processoId, autos, tribunal, filial, linha, responsavelId, status, prazo, prazoDescricao, substabelecer,
//                                formaCitacao, resultadoSentenca, recuperadoInformado ('' = derivar), valor, obs, ultimoAndamentoEm, membroId
//   ccEscJurProcessoEnvio        processoId, valorAtualizado, prazo, status, membroId, agora (VALOR relido da posição)
//   ccEscJurProcessoEncerrar     processoId, motivo, motivoTexto, status, membroId, agora
//   ccEscJurProcessoCliente      processoId, clienteId, buId, membroId
//   ccEscJurProcessoCarga        processoId, conferir (0/1), ultimoAndamentoEm, membroId, agora
//   ccEscJurDossieItensInserir   processoId, n, itens, situacoes, obss, origens (listas por ¦), membroId, agora
//   ccEscJurDossieItemMarcar     itemId, situacao, obs, origem, kbAnexoIds, membroId, agora
//   ccEscJurAndamentosInserir    processoId, n, ems, periodos, textos, autores (listas por ¦), tipo, membroId
//   ccEscJurCustosInserir        processoId, n, tipos, datas, valores, obss, pagos, guias, comprovantes (listas por ¦), membroId, agora
//   ccEscJurCustoAtualizar       custoId, tipo, data, valor, obs, pago, guia, comprovante, membroId
//   ccEscJurCustoRemover         custoId, membroId, agora
//   ccEscJurAcordoInserir        processoId, valor, entrada, nParcelas, honorarios, situacaoTexto, carga (0/1), membroId, agora
//   ccEscJurAcordoParcelasInserir acordoId, n, numeros, valores, vencimentos, situacoes, pagosEm, origens (listas por ¦), membroId
//   ccEscJurAcordoSituacao       acordoId, situacao (ANDAMENTO|RECUSADO|QUITADO|HONORARIOS), pagoEm, membroId, agora
//   ccEscJurAcordoParcela        parcelaId, situacao (ABERTA|PAGA), pagoEm, membroId
//   ccEscJurNotificacaoInserir   clienteId, processoId, cobrancaId, filial, prazoAte, principal, multa, juros, correcao, total, membroId
//                                (EMITIDA_EM = hoje e MODELO_VERSAO do modelo validado em dia, relidos na SQL)
//   ccEscJurFilialSalvar         codigo, razaoSocial, cnpj, endereco, cidadeUf, uf, banco, representante, representanteCargo, ativa, membroId, agora

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { chaveDeRotulo } from '@benenutri/mitra-kanban/motor';
import { js, injetarIds } from './lib/escritas.mjs';
import { q } from './lib/texto-sql.mjs';
import { ATOR, PODE_ADMINISTRAR, NIVEL_MIN, podeAdministrarEm, clienteVisivelA, NUMEROS_20, ITEM, numerosComoParametro } from './lib/guarda.mjs';
import { EU, clienteVisivel } from './lib/visibilidade.mjs';
import { PARAM_NUM } from './lib/parametros.mjs';
import { HOJE_SQL } from './lib/tempo.mjs';
import { FONTE as FONTE_DIAS } from './lib/dias-uteis.mjs';
import { semearQuadro } from './lib/quadros.mjs';
import { FONTE as FONTE_REGRAS } from './lib/juridico/regras.mjs';
import { FONTE as FONTE_CARGA } from './lib/juridico/carga.mjs';
import { FONTE as FONTE_GESTAO } from './lib/juridico/gestao.mjs';
import { DOCUMENTOS, TIPOS_CUSTO, MOTIVOS, FASES, FASES_COM_AUTOS, DESVIOS, INDICADORES, GRUPO_SQL } from './lib/juridico/catalogos.mjs';
import { QUADROS, ETIQUETAS } from './lib/quadros/003-juridico.mjs';

/* ── texto que entra nos corpos JAVASCRIPT ── */

const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;

function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function texto(v, max = 500) { return String(v ?? '').replace(/\\/g, '').replace(/¦/g, '|').trim().slice(0, max); }
function dinheiro(v) { const t = String(v ?? '').trim().replace(',', '.'); const n = Number(t); return t !== '' && Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; }
function ehData(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)); }
function valoresDe(json) { try { return JSON.parse(json || '{}') || {}; } catch { return {}; } }
function diasEntre(a, b) { return Math.round((Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000); }
function digitos(v) { return String(v ?? '').replace(/\D/g, ''); }
function lista(xs, f) { return xs.map((x) => texto(f(x), 2000)).join('¦'); }

/** Jurídico ou quem administra (`JUR` de 04 §0). */
function jur(m) { return !!m && !!m.membroId && (m.cargo === 'JURIDICO' || podeAdministrar(m)); }

/** Documentos que valem para a carteira (05 §8). */
function documentosDa(carteira) { return DOCUMENTOS.filter((d) => (carteira === 'PUBLICA' ? d.publico : d.privado)); }

/** Processo com cliente, card e fase; `onde` é SQL sobre P. Sem visibilidade (quem chama confere com `vePro`). */
async function lerProcesso(onde) {
  const [p] = await ler(`SELECT P.*, C.CODCLI, C.NOME AS CLIENTE_NOME, C.AGENTE_ID, C.ANALISTA_ID, C.NO_JURIDICO, C.SETOR AS CLIENTE_SETOR,
  C.DOCUMENTO AS CLIENTE_DOCUMENTO, C.ENDERECO AS CLIENTE_ENDERECO, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO,
  K.FASE_ID, K.VALORES_JSON, K.RESPONSAVEL_ID AS CARD_RESPONSAVEL, K.PRAZO AS CARD_PRAZO, COALESCE(F.CHAVE, '') AS FASE_CHAVE,
  COALESCE(KF.NOME, '') AS FASE_NOME, KB.ID AS BOARD_ID, R.USER_ID AS RESPONSAVEL_USER_ID
FROM CC_PROCESSO P LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN KB_BOARD KB ON KB.SLUG = 'juridico' LEFT JOIN CC_MEMBRO R ON R.ID = P.RESPONSAVEL_ID
WHERE ${onde} ORDER BY P.ID DESC LIMIT 1`);
  return p || null;
}
const procPorId = (id) => lerProcesso(`P.ID = ${inteiro(id)}`);

/** Cliente com os caminhos para `visivel()`. */
async function lerCliente(clienteId) {
  const [c] = await ler(`SELECT C.*, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO, AG.USER_ID AS AGENTE_USER_ID
FROM CC_CLIENTE C LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID WHERE C.ID = ${inteiro(clienteId)}`);
  return c || null;
}

/** Vê o processo (RN-030): vê tudo, Jurídico, ou o cliente visível; processo sem cliente só para quem vê tudo ou o Jurídico. */
function vePro(m, pr) {
  if (!m || !m.membroId || !pr) return false;
  if (m.veTudo || m.cargo === 'JURIDICO') return true;
  return !!pr.CLIENTE_ID && visivel(m, pr);
}

/** USER_ID "em nome de" quem age (05 §1 regra 6). */
async function usuarioDe(m) {
  if (m.userId) return m.userId;
  const [l] = await ler(`SELECT USER_ID FROM CC_MEMBRO WHERE ID = ${inteiro(m.membroId)}`);
  return inteiro(l && l.USER_ID);
}

async function faseIdDe(chave) {
  const [f] = await ler(`SELECT FASE_ID FROM CC_FASE WHERE QUADRO = 'juridico' AND CHAVE = ${q(chave)}`);
  return inteiro(f && f.FASE_ID);
}

/** Feriados nacionais e da UF (RN-005). */
async function feriadosDaUf(uf) {
  return (await ler(`SELECT DATA FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL' OR (ABRANGENCIA = 'UF' AND UF = ${q(uf)})`)).map((f) => f.DATA);
}

/** Etiquetas do card trocando só as do Jurídico pelas `desejadas` (rótulos). */
function etiquetasNovas(valoresJson, desejadas) {
  const fora = ETIQUETAS.map((r) => chaveDeRotulo(r));
  const atuais = (valoresDe(valoresJson).etiquetas || []).map(String).filter((e) => !fora.includes(e));
  return [...atuais, ...desejadas.map((r) => chaveDeRotulo(r))];
}

/** Capa do card (05 §6): campos fixos, `dossie`, `custo` e `acordo`, e as etiquetas que a 003 controla. */
async function capaDoProcesso(pr) {
  const docs = documentosDa(pr.CARTEIRA).filter((d) => d.obrigatorio);
  const itens = await ler(`SELECT ITEM, SITUACAO, OBS FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ${inteiro(pr.ID)}`);
  const prog = progressoDoDossie(itens, docs);
  const [c] = await ler(`SELECT COALESCE(SUM(VALOR), 0) AS CUSTO, COALESCE(SUM(CASE WHEN PAGO = FALSE THEN 1 ELSE 0 END), 0) AS A_PAGAR
FROM CC_PROCESSO_CUSTO WHERE PROCESSO_ID = ${inteiro(pr.ID)} AND REMOVIDO_EM IS NULL`);
  const [a] = await ler(`SELECT COUNT(PA.ID) AS N, COALESCE(SUM(CASE WHEN PA.SITUACAO = 'PAGA' THEN 1 ELSE 0 END), 0) AS PAGAS
FROM CC_ACORDO_JUDICIAL_PARCELA PA WHERE PA.ACORDO_ID = (SELECT MAX(AJ.ID) FROM CC_ACORDO_JUDICIAL AJ WHERE AJ.PROCESSO_ID = ${inteiro(pr.ID)} AND AJ.SITUACAO <> 'RECUSADO')`);
  const custo = Number(c.CUSTO);
  const pct = Number(pr.VALOR) > 0 ? Math.round(custo / Number(pr.VALOR) * 1000) / 10 : 0;
  const nParc = inteiro(a && a.N);
  const pagas = inteiro(a && a.PAGAS);
  const valores = {
    valor: Number(pr.VALOR), carteira: pr.CARTEIRA, autos: pr.AUTOS, prazo_descricao: pr.PRAZO_DESCRICAO, situacao: pr.STATUS, tribunal: pr.TRIBUNAL,
    filial: pr.FILIAL, bu: String(inteiro(pr.BU_ID)), linha: pr.LINHA === 'GALDERMA' ? 'GALDERMA' : 'DEMAIS',
    dossie: prog.total ? [{ rotulo: 'Dossiê', texto: `${prog.ok} de ${prog.total}`, pct: Math.round(prog.ok / prog.total * 100), tom: prog.ok === prog.total ? 'ok' : 'atencao' }] : '',
    custo: custo > 0 ? `${brl(custo)} · ${String(pct).replace('.', ',')}%` : '',
    acordo: nParc ? [{ rotulo: 'Acordo', texto: `${pagas} de ${nParc}`, pct: Math.round(pagas / nParc * 100), tom: pagas === nParc ? 'ok' : 'transito' }] : '',
  };
  const pendenteCarga = pr.ORIGEM === 'CARGA' && !pr.CARGA_CONFERIDA_EM && (pr.ALERTA_CARGA || !pr.CLIENTE_ID);
  const desejadas = [...(inteiro(c.A_PAGAR) > 0 ? ['Custo a pagar'] : []), ...(pendenteCarga ? ['Carga a conferir'] : []),
    ...(ehVerdade(pr.SUBSTABELECER) ? ['Substabelecer'] : [])];
  // Campo de seleção só aceita opção existente (a lib recusa): valor sem opção não vai à capa.
  const campos = await ler(`SELECT KC.CHAVE, KC.TIPO, KC.CONFIG_JSON FROM KB_CAMPO KC JOIN KB_BOARD KB ON KB.ID = KC.BOARD_ID WHERE KB.SLUG = 'juridico' AND KC.ATIVO = TRUE`);
  const saida = {};
  for (const [chave, v] of Object.entries(valores)) {
    const campo = campos.find((x) => x.CHAVE === chave);
    if (!campo || v === '' || v === null || v === undefined) continue;
    if (campo.TIPO === 'selecao' && !((valoresDe(campo.CONFIG_JSON).opcoes || []).some((o) => String(o.valor) === String(v)))) continue;
    saida[chave] = v;
  }
  if (campos.some((x) => x.CHAVE === 'etiquetas')) saida.etiquetas = etiquetasNovas(pr.VALORES_JSON, desejadas);
  return saida;
}

const tituloDe = (pr) => `${pr.NOME_DEVEDOR} · ${pr.AUTOS || 'sem autos'}`;

/** kbCardAtualizar com título, capa, prazo e responsável (a lib limpa o que não vem). */
async function kbAtualizarProc(pr, usuarioId, extra = {}) {
  if (!pr.CARD_ID) return null;
  const responsavel = extra.responsavelId !== undefined ? extra.responsavelId : (inteiro(pr.RESPONSAVEL_USER_ID) && pr.DOSSIE_ENVIADO_EM ? inteiro(pr.RESPONSAVEL_USER_ID)
    : (pr.ORIGEM !== 'COBRANCA' && inteiro(pr.RESPONSAVEL_USER_ID)) ? inteiro(pr.RESPONSAVEL_USER_ID) : inteiro(pr.CARD_RESPONSAVEL));
  return chamarKb('kbCardAtualizar', { cardId: inteiro(pr.CARD_ID), titulo: tituloDe(pr), valoresJson: JSON.stringify(await capaDoProcesso(pr)),
    responsavelId: responsavel, prazo: pr.PRAZO || '', atualizadoPor: usuarioId, origem: 'sistema' });
}

async function kbMoverProc(pr, chave, usuarioId) {
  const faseId = await faseIdDe(chave);
  if (!pr.CARD_ID || !faseId) return { ok: false, error: 'Fase não encontrada.' };
  return chamarKb('kbCardMover', { cardId: inteiro(pr.CARD_ID), faseId, ordem: 0, movidoPor: usuarioId, origem: 'sistema' });
}

async function kbNotaProc(cardId, textoNota, usuarioId) {
  if (!inteiro(cardId) || !textoNota) return null;
  return chamarKb('kbNotaRegistrar', { cardId: inteiro(cardId), texto: String(textoNota).slice(0, 1000), usuarioId });
}

/** Card novo no quadro `juridico` (nasce na fase de entrada, `dossie`); grava o CARD_ID e leva à fase pedida. */
async function criarCard(pr, usuarioId, responsavelUserId, faseChave) {
  const [b] = await ler("SELECT BOARD_ID FROM CC_FASE WHERE QUADRO = 'juridico' AND CHAVE = 'dossie'");
  const r = await chamarKb('kbCardCriar', { boardId: inteiro(b && b.BOARD_ID), titulo: tituloDe(pr), valoresJson: JSON.stringify(await capaDoProcesso(pr)),
    responsavelId: responsavelUserId, prazo: pr.PRAZO || '', criadoPor: usuarioId, origem: 'sistema' });
  if (!r || r.ok === false || !inteiro(r.id)) return { ok: false, error: (r && r.error) || 'Não foi possível criar o card.' };
  await escrever('ccEscJurProcessoCard', { processoId: inteiro(pr.ID), cardId: inteiro(r.id), membroId: inteiro(pr._membroId) });
  const novo = await procPorId(pr.ID);
  if (inteiro(novo.CARD_ID) !== inteiro(r.id)) return { ok: false, error: MSG.SEM_PERMISSAO, cardId: inteiro(r.id) };
  if (faseChave && faseChave !== 'dossie') {
    const mv = await kbMoverProc(novo, faseChave, usuarioId);
    if (mv && mv.ok === false) return { ok: false, error: mv.error, cardId: inteiro(r.id) };
  }
  return { ok: true, cardId: inteiro(r.id) };
}

/** BU de maior saldo vencido do cliente na carteira (informativo, RN-011). */
async function buDoCliente(clienteId, carteira) {
  const [b] = await ler(`SELECT BU_ID FROM CC_POSICAO_CLIENTE_BU WHERE CLIENTE_ID = ${inteiro(clienteId)} AND CARTEIRA = ${q(carteira)}
ORDER BY VENCIDO DESC, (VENCIDO + A_VENCER) DESC, BU_ID LIMIT 1`);
  return inteiro(b && b.BU_ID);
}

/** Marca ou desmarca NO_JURIDICO (verdadeiro quando o cliente tem processo ativo fora do dossiê). */
async function marcarNoJuridico(clienteId, m) {
  if (!inteiro(clienteId)) return;
  const [n] = await ler(`SELECT COUNT(*) AS N FROM CC_PROCESSO P LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE P.CLIENTE_ID = ${inteiro(clienteId)} AND P.ENCERRADO_EM IS NULL AND (P.ORIGEM <> 'COBRANCA' OR P.DOSSIE_ENVIADO_EM IS NOT NULL)`);
  const [c] = await ler(`SELECT NO_JURIDICO FROM CC_CLIENTE WHERE ID = ${inteiro(clienteId)}`);
  const deve = inteiro(n && n.N) > 0;
  if (c && ehVerdade(c.NO_JURIDICO) !== deve) {
    await escrever('ccEscBaseClienteJuridico', { clienteId: inteiro(clienteId), noJuridico: deve ? 1 : 0, membroId: m.membroId, agora: agora() });
  }
}

/** Escreve (opcional): `ccCobEncargosCalcular` só se a 002 estiver publicada; senão, sem encargos. */
async function encargosDe(m, clienteId, carteira, data) {
  if (!idDe('ccCobEncargosCalcular')) return { ok: true, linhas: [], principal: 0, multa: 0, juros: 0, correcao: 0, total: 0, semCobranca: true };
  return escrever('ccCobEncargosCalcular', { clienteId: inteiro(clienteId), carteira, data, titulos: '', membroId: m.membroId || 0 });
}

// FONTE_CARGA e FONTE_GESTAO só entram nas SFs que as usam (jsAux, terceiro argumento).
const FONTE_COMUM = [
  q, inteiro, texto, dinheiro, ehData, valoresDe, diasEntre, digitos, lista, jur, documentosDa, lerProcesso, lerCliente, vePro, usuarioDe,
  faseIdDe, feriadosDaUf, etiquetasNovas, capaDoProcesso, kbAtualizarProc, kbMoverProc, kbNotaProc, criarCard, buDoCliente, marcarNoJuridico,
  encargosDe, chaveDeRotulo,
].map(String).join('\n') + '\n' + [
  'const procPorId = (id) => lerProcesso(`P.ID = ${inteiro(id)}`);',
  `const tituloDe = ${String(tituloDe)};`,
  constante('DOCUMENTOS', DOCUMENTOS), constante('TIPOS_CUSTO', TIPOS_CUSTO), constante('MOTIVOS', MOTIVOS), constante('FASES', FASES),
  constante('FASES_COM_AUTOS', FASES_COM_AUTOS), constante('DESVIOS', DESVIOS), constante('INDICADORES', INDICADORES), constante('ETIQUETAS', ETIQUETAS),
  constante('CARTEIRAS', ['PRIVADA', 'ESTETICA', 'PUBLICA']),
  FONTE_DIAS, FONTE_REGRAS,
].join('\n');


/* ── leituras JAVASCRIPT ── */

const corpoProcessoFicha = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const pr = inteiro(event.processoId) ? await procPorId(event.processoId) : await lerProcesso(`P.CARD_ID = ${inteiro(event.cardId)}`);
  if (!pr || !vePro(m, pr)) return recusar('Processo não encontrado.');
  const id = inteiro(pr.ID);
  const hojeData = hoje();
  const p = await parametros(pr.CARTEIRA);
  const docs = documentosDa(pr.CARTEIRA);
  const itensDb = await ler(`SELECT * FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ${id} ORDER BY ID`);
  const idsAnexo = [...new Set(itensDb.flatMap((i) => String(i.KB_ANEXO_IDS || '').split(',').map(inteiro).filter(Boolean)))];
  const custos = await ler(`SELECT * FROM CC_PROCESSO_CUSTO WHERE PROCESSO_ID = ${id} AND REMOVIDO_EM IS NULL ORDER BY DATA DESC, ID DESC`);
  for (const c of custos) for (const k of ['GUIA_KB_ANEXO_ID', 'COMPROVANTE_KB_ANEXO_ID']) if (inteiro(c[k])) idsAnexo.push(inteiro(c[k]));
  const anexos = idsAnexo.length && pr.CARD_ID
    ? await ler(`SELECT ID, NOME, URL FROM KB_ANEXO WHERE CARD_ID = ${inteiro(pr.CARD_ID)} AND ID IN (${idsAnexo.join(', ')})`) : [];
  const anexo = (aid) => { const a = anexos.find((x) => inteiro(x.ID) === inteiro(aid)); return a ? { id: inteiro(a.ID), nome: a.NOME, url: a.URL } : null; };
  const itens = docs.map((d) => {
    const i = itensDb.find((x) => x.ITEM === d.codigo);
    return { ID: i ? inteiro(i.ID) : 0, ITEM: d.codigo, TEXTO: d.texto, OBRIGATORIO: d.obrigatorio, SITUACAO: i ? i.SITUACAO : '', OBS: i ? i.OBS : '',
      ORIGEM: i ? i.ORIGEM : '', anexos: i ? String(i.KB_ANEXO_IDS || '').split(',').map(anexo).filter(Boolean) : [] };
  }).filter((i) => i.ID);
  const andamentos = await ler(`SELECT A.ID, A.EM, A.PERIODO, A.TEXTO, A.TIPO, COALESCE(M.NOME, A.AUTOR_NOME) AS AUTOR_NOME
FROM CC_PROCESSO_ANDAMENTO A LEFT JOIN CC_MEMBRO M ON M.ID = A.AUTOR_ID WHERE A.PROCESSO_ID = ${id} ORDER BY A.EM DESC, A.ID DESC LIMIT 10`);
  const [acordo] = await ler(`SELECT * FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ${id} AND SITUACAO <> 'RECUSADO' ORDER BY ID DESC LIMIT 1`);
  const parcelas = acordo ? (await ler(`SELECT * FROM CC_ACORDO_JUDICIAL_PARCELA WHERE ACORDO_ID = ${inteiro(acordo.ID)} ORDER BY NUMERO`))
    .map((x) => ({ ...x, VENCIDA: x.SITUACAO === 'ABERTA' && x.VENCIMENTO < hojeData ? 1 : 0 })) : [];
  const pagas = parcelas.filter((x) => x.SITUACAO === 'PAGA').reduce((s, x) => s + Number(x.VALOR), 0);
  const total = custos.reduce((s, c) => s + Number(c.VALOR), 0);
  const pago = custos.filter((c) => ehVerdade(c.PAGO)).reduce((s, c) => s + Number(c.VALOR), 0);
  const [notificacao] = pr.CLIENTE_ID ? await ler(`SELECT * FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE CLIENTE_ID = ${inteiro(pr.CLIENTE_ID)} ORDER BY ID DESC LIMIT 1`) : [];
  const prog = progressoDoDossie(itensDb, docs);
  const enviado = !!pr.DOSSIE_ENVIADO_EM;
  const caso = pr.CLIENTE_ID && m.cargo !== 'JURIDICO' && visivel(m, pr);
  return {
    ok: true,
    processo: {
      ID: id, CARD_ID: inteiro(pr.CARD_ID), CLIENTE_ID: inteiro(pr.CLIENTE_ID), CODCLI: pr.CODCLI, NOME_DEVEDOR: pr.NOME_DEVEDOR, DOCUMENTO: pr.DOCUMENTO,
      SETOR: pr.SETOR, CARTEIRA: pr.CARTEIRA, BU_ID: inteiro(pr.BU_ID), LINHA: pr.LINHA, FILIAL: pr.FILIAL, VALOR: Number(pr.VALOR),
      VALOR_ATUALIZADO: Number(pr.VALOR_ATUALIZADO), AUTOS: pr.AUTOS, ANO_AUTOS: validarAutos(pr.AUTOS).ano, TRIBUNAL: pr.TRIBUNAL,
      RESPONSAVEL_ID: inteiro(pr.RESPONSAVEL_ID), STATUS: pr.STATUS, PRAZO: pr.PRAZO, PRAZO_DESCRICAO: pr.PRAZO_DESCRICAO,
      DIAS_PRAZO: pr.PRAZO ? diasEntre(hojeData, pr.PRAZO) : null, SUBSTABELECER: ehVerdade(pr.SUBSTABELECER) ? 1 : 0, FORMA_CITACAO: pr.FORMA_CITACAO,
      RESULTADO_SENTENCA: pr.RESULTADO_SENTENCA, RECUPERADO_INFORMADO: pr.RECUPERADO_INFORMADO === null ? null : Number(pr.RECUPERADO_INFORMADO),
      RECUPERADO: recuperado(pr, pagas), MOTIVO_ENCERRAMENTO: pr.MOTIVO_ENCERRAMENTO, MOTIVO_TEXTO: pr.MOTIVO_TEXTO, ENCERRADO_EM: pr.ENCERRADO_EM,
      OBS: pr.OBS, ORIGEM: pr.ORIGEM, FASE_CHAVE: pr.FASE_CHAVE, FASE_NOME: pr.FASE_NOME, DOSSIE_ABERTO_EM: pr.DOSSIE_ABERTO_EM,
      DOSSIE_ENVIADO_EM: pr.DOSSIE_ENVIADO_EM, ULTIMO_ANDAMENTO_EM: pr.ULTIMO_ANDAMENTO_EM,
      DIAS_SEM_ANDAMENTO: pr.ULTIMO_ANDAMENTO_EM ? diasEntre(pr.ULTIMO_ANDAMENTO_EM, hojeData) : null,
      ALERTA_CARGA: pr.ALERTA_CARGA, SUGESTAO_CLIENTES: pr.SUGESTAO_CLIENTES, CARGA_CONFERIDA_EM: pr.CARGA_CONFERIDA_EM, COBRANCA_ID: inteiro(pr.COBRANCA_ID),
    },
    cliente: pr.CLIENTE_ID ? { ID: inteiro(pr.CLIENTE_ID), CODCLI: pr.CODCLI, NOME: pr.CLIENTE_NOME, DOCUMENTO: pr.CLIENTE_DOCUMENTO, SETOR: pr.CLIENTE_SETOR,
      ENDERECO: pr.CLIENTE_ENDERECO } : null,
    itens, progresso: { ok: prog.ok, total: prog.total, faltam: prog.faltam },
    andamentos,
    custos: custos.map((c) => ({ ...c, GRUPO: (TIPOS_CUSTO.find((t) => t.codigo === c.TIPO) || {}).grupo || 'OUTROS', guia: anexo(c.GUIA_KB_ANEXO_ID), comprovante: anexo(c.COMPROVANTE_KB_ANEXO_ID) })),
    custoResumo: { total, pago, aPagar: Math.round((total - pago) * 100) / 100, pct: Number(pr.VALOR) > 0 ? Math.round(total / Number(pr.VALOR) * 10000) / 100 : 0 },
    acordo: acordo || null, parcelas, notificacao: notificacao || null,
    pode: {
      mover: jur(m), editar: jur(m), lancar: jur(m), registrarAcordo: jur(m) && !pr.ENCERRADO_EM, encerrar: jur(m) && !pr.ENCERRADO_EM,
      enviar: pr.ORIGEM === 'COBRANCA' && !enviado && !pr.ENCERRADO_EM && m.nivel >= Number(p['jur.envioNivelMin']) && prog.completo,
      marcarItem: pr.ORIGEM === 'COBRANCA' && !enviado && !pr.ENCERRADO_EM && (inteiro(pr.DOSSIE_ABERTO_POR) === m.membroId || caso || jur(m)),
      aprovarAcordo: !!acordo && acordo.SITUACAO === 'AGUARDANDO' && m.nivel >= inteiro(acordo.NIVEL_EXIGIDO) && inteiro(acordo.REGISTRADO_POR) !== m.membroId,
      emitirNotificacao: !!caso && pr.CARTEIRA !== 'PUBLICA',
    },
  };
};

/** Sugestões ao vivo do dossiê (RN-003; só leitura). Tabelas da 005 lidas direto, ausentes = sem sugestão. */
const corpoDossieSugestao = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const pr = await procPorId(event.processoId);
  if (!pr || !vePro(m, pr) || !pr.CLIENTE_ID) return recusar('Processo não encontrado.');
  const cid = inteiro(pr.CLIENTE_ID);
  const tentar = async (sql) => { try { return await ler(sql); } catch { return null; } };
  const enc = await encargosDe(m, cid, pr.CARTEIRA, hoje());
  const sug = {};
  const add = (item, sugestao, origem) => { if (sugestao) sug[item] = { item, sugestao, origem }; };
  if (enc && enc.ok !== false && !enc.semCobranca) {
    add('demonst', `Total atualizado ${brl(enc.total)} em ${dataBr(hoje())}: principal ${brl(enc.principal)}, multa ${brl(enc.multa)}, juros ${brl(enc.juros)}, correção ${brl(enc.correcao)}.`, 'ENCARGOS');
    if (pr.CARTEIRA !== 'PUBLICA') add('nf', (enc.linhas || []).map((l) => `${l.TITULO} · venc. ${dataBr(l.VENCIMENTO)} · ${brl(l.SALDO)}`).join('; '), 'TITULOS');
  }
  const [caso] = (await tentar(`SELECT ID, PROTESTADO FROM CC_COBRANCA WHERE CLIENTE_ID = ${cid} AND CARTEIRA = ${q(pr.CARTEIRA)} ORDER BY ID DESC LIMIT 1`)) || [];
  const conta = async (tabela) => { const r = await tentar(`SELECT COUNT(*) AS N FROM ${tabela} WHERE CLIENTE_ID = ${cid}`); return r ? inteiro(r[0].N) : 0; };
  const hist = [['ações da régua', caso ? inteiro(((await tentar(`SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ${inteiro(caso.ID)}`)) || [{ N: 0 }])[0].N) : 0],
    ['contatos', await conta('CC_CONTATO_COBRANCA')], ['promessas', await conta('CC_PROMESSA')]];
  add('hist', `Histórico de cobrança: ${hist.map(([r, n]) => `${n} ${r}`).join(', ')}.`, 'COBRANCA');
  if (caso && ehVerdade(caso.PROTESTADO)) add('protesto', 'Título protestado pela régua.', 'COBRANCA');
  const [notif] = await ler(`SELECT EMITIDA_EM FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE CLIENTE_ID = ${cid} ORDER BY ID DESC LIMIT 1`);
  if (notif && pr.CARTEIRA !== 'PUBLICA') add('notif', `Notificação gerada em ${dataBr(notif.EMITIDA_EM)}; anexar o comprovante de recebimento.`, 'NOTIFICACAO');
  if (pr.CLIENTE_DOCUMENTO && pr.CLIENTE_ENDERECO) add('cadastro', 'CNPJ e endereço no cadastro; anexar contrato social e QSA.', 'CLIENTE');
  const [garantia] = (await tentar(`SELECT AC.GARANTIA FROM CC_ACORDO AC JOIN CC_COBRANCA CB ON CB.ID = AC.COBRANCA_ID WHERE CB.CLIENTE_ID = ${cid} AND AC.GARANTIA <> '' ORDER BY AC.ID DESC LIMIT 1`)) || [];
  if (garantia) add('garantia', `Garantia do último acordo: ${garantia.GARANTIA}.`, 'ACORDO');
  if (pr.CARTEIRA === 'PUBLICA') {
    const nfs = (await tentar(`SELECT ID, NUMNOTA, EMISSAO, EMPENHO, PROTOCOLO, ATESTO FROM CC_NF_PUBLICA WHERE CLIENTE_ID = ${cid} AND CANCELADA = FALSE ORDER BY EMISSAO`)) || [];
    if (nfs.length) {
      add('nf', nfs.map((n) => `NF ${n.NUMNOTA} de ${dataBr(n.EMISSAO)}`).join('; '), 'NF_PUBLICA');
      add('empenho', nfs.filter((n) => n.EMPENHO).map((n) => `NF ${n.NUMNOTA}: empenho ${n.EMPENHO}`).join('; '), 'NF_PUBLICA');
      add('atesto', nfs.filter((n) => n.PROTOCOLO || n.ATESTO).map((n) => `NF ${n.NUMNOTA}: protocolo ${dataBr(n.PROTOCOLO) || '—'}, atesto ${dataBr(n.ATESTO) || '—'}`).join('; '), 'NF_PUBLICA');
      const emissoes = nfs.map((n) => q(n.EMISSAO)).join(', ');
      const certs = (await tentar(`SELECT DISTINCT TIPO, EMISSAO, VALIDADE FROM CC_CERTIDAO X WHERE EXISTS (SELECT 1 FROM CC_NF_PUBLICA N WHERE N.CLIENTE_ID = ${cid}
  AND N.CANCELADA = FALSE AND N.EMISSAO >= COALESCE(X.EMISSAO, N.EMISSAO) AND N.EMISSAO <= X.VALIDADE) AND ${emissoes ? 'TRUE' : 'FALSE'}`)) || [];
      add('certidoes', certs.map((c) => `${c.TIPO} válida até ${dataBr(c.VALIDADE)}`).join('; '), 'CERTIDAO');
    }
    const passos = (await tentar(`SELECT PASSO, FEITO_EM, PROTOCOLO_ORGAO FROM CC_NF_ACAO WHERE CLIENTE_ID = ${cid} AND PASSO IN ('L3', 'G4', 'M2', 'G2') ORDER BY FEITO_EM`)) || [];
    add('oficio', passos.filter((x) => x.PASSO !== 'G2').map((x) => `${x.PASSO} em ${dataBr(x.FEITO_EM)}${x.PROTOCOLO_ORGAO ? ` (protocolo ${x.PROTOCOLO_ORGAO})` : ''}`).join('; '), 'NF_ACAO');
    add('lai', passos.filter((x) => x.PASSO === 'G2').map((x) => `Pedido LAI em ${dataBr(x.FEITO_EM)}`).join('; '), 'NF_ACAO');
    const [an] = (await tentar(`SELECT CONTRATO FROM CC_ANALISE_ORGAO WHERE CLIENTE_ID = ${cid} AND CONTRATO <> '' ORDER BY ATUALIZADO_EM DESC, ID DESC LIMIT 1`)) || [];
    if (an) add('contrato', `Contrato ${an.CONTRATO} (análise do órgão).`, 'ANALISE_ORGAO');
  }
  const linhas = documentosDa(pr.CARTEIRA).map((d) => sug[d.codigo] || { item: d.codigo, sugestao: '', origem: '' });
  return { ok: true, linhas, total: enc && enc.ok !== false ? Number(enc.total) : 0, titulos: enc && enc.linhas ? enc.linhas : [] };
};

/** Dados da carteira do Jurídico para `calcular` (alertas e indicadores), com os filtros do recorte. JUR vê tudo. */
async function lerCarteira() {
  const hojeData = hoje();
  const filtro = [
    event.carteira ? `P.CARTEIRA = ${q(texto(event.carteira, 10).toUpperCase())}` : '',
    event.filial ? `P.FILIAL = ${q(texto(event.filial, 10))}` : '',
    event.linha === 'GALDERMA' ? "P.LINHA = 'GALDERMA'" : event.linha === 'DEMAIS' ? "P.LINHA <> 'GALDERMA'" : '',
    event.buId !== undefined && event.buId !== '' && inteiro(event.buId) !== -1 ? `P.BU_ID = ${inteiro(event.buId)}` : '',
  ].filter(Boolean);
  const onde = filtro.length ? `WHERE ${filtro.join(' AND ')}` : '';
  const obrig = documentosDa('PRIVADA').concat(documentosDa('PUBLICA')).filter((d) => d.obrigatorio).map((d) => q(d.codigo));
  const processos = await ler(`SELECT P.ID, P.CLIENTE_ID, C.CODCLI, P.NOME_DEVEDOR, P.CARTEIRA, P.SETOR, P.LINHA, P.FILIAL, P.BU_ID, COALESCE(B.NOME, 'Sem BU') AS BU_NOME,
  P.VALOR, P.AUTOS, P.TRIBUNAL, COALESCE(F.CHAVE, '') AS FASE, P.ENCERRADO_EM, P.MOTIVO_ENCERRAMENTO, P.PRAZO, P.ULTIMO_ANDAMENTO_EM, P.SUBSTABELECER,
  P.FORMA_CITACAO, P.RESULTADO_SENTENCA, P.RECUPERADO_INFORMADO, P.DOSSIE_ABERTO_EM, P.ORIGEM, P.STATUS, P.ALERTA_CARGA, P.SUGESTAO_CLIENTES,
  P.CARGA_CONFERIDA_EM, COALESCE(PC.VENCIDO, 0) AS SALDO_VENCIDO,
  (SELECT COUNT(*) FROM CC_DOSSIE_ITEM I WHERE I.PROCESSO_ID = P.ID AND I.ITEM IN (${[...new Set(obrig)].join(', ')})
    AND (I.SITUACAO = 'OK' OR (I.SITUACAO = 'NA' AND I.OBS <> ''))) AS DOSSIE_OK,
  (SELECT COUNT(*) FROM CC_DOSSIE_ITEM I WHERE I.PROCESSO_ID = P.ID AND I.ITEM IN (${[...new Set(obrig)].join(', ')})) AS DOSSIE_TOTAL
FROM CC_PROCESSO P LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN CC_BU B ON B.ID = P.BU_ID LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA PC ON PC.CLIENTE_ID = P.CLIENTE_ID AND PC.CARTEIRA = P.CARTEIRA
${onde} ORDER BY P.ID`);
  const ids = new Set(processos.map((x) => inteiro(x.ID)));
  const acordos = (await ler(`SELECT AJ.ID, AJ.PROCESSO_ID, AJ.VALOR, AJ.SITUACAO, AJ.NIVEL_EXIGIDO,
  COALESCE(SUM(CASE WHEN PA.SITUACAO = 'PAGA' THEN PA.VALOR ELSE 0 END), 0) AS PAGO,
  COALESCE(SUM(CASE WHEN PA.SITUACAO <> 'PAGA' THEN PA.VALOR ELSE 0 END), 0) AS ABERTO,
  COALESCE(SUM(CASE WHEN PA.SITUACAO = 'ABERTA' AND PA.VENCIMENTO < ${q(hojeData)} THEN 1 ELSE 0 END), 0) AS VENCIDAS,
  COALESCE(SUM(CASE WHEN PA.SITUACAO = 'ABERTA' AND PA.VENCIMENTO < ${q(hojeData)} THEN PA.VALOR ELSE 0 END), 0) AS VENCIDO_VALOR,
  COALESCE(SUM(CASE WHEN PA.SITUACAO = 'A_CONFIRMAR' THEN 1 ELSE 0 END), 0) AS A_CONFIRMAR, COUNT(PA.ID) AS PARCELAS
FROM CC_ACORDO_JUDICIAL AJ LEFT JOIN CC_ACORDO_JUDICIAL_PARCELA PA ON PA.ACORDO_ID = AJ.ID
WHERE AJ.ID IN (SELECT MAX(X.ID) FROM CC_ACORDO_JUDICIAL X WHERE X.SITUACAO <> 'RECUSADO' GROUP BY X.PROCESSO_ID)
GROUP BY AJ.ID, AJ.PROCESSO_ID, AJ.VALOR, AJ.SITUACAO, AJ.NIVEL_EXIGIDO`)).filter((a) => ids.has(inteiro(a.PROCESSO_ID)));
  const custos = (await ler(`SELECT ID, PROCESSO_ID, TIPO, DATA, VALOR, PAGO, GUIA_KB_ANEXO_ID AS GUIA, COMPROVANTE_KB_ANEXO_ID AS COMPROVANTE
FROM CC_PROCESSO_CUSTO WHERE REMOVIDO_EM IS NULL`)).filter((c) => ids.has(inteiro(c.PROCESSO_ID)));
  let prontos = [];
  try {
    prontos = await ler(`SELECT CB.CLIENTE_ID, C.CODCLI, C.NOME, CB.CARTEIRA, COALESCE(PC.DIAS_ATRASO, 0) AS DIAS_ATRASO, COALESCE(PC.VENCIDO, 0) AS VENCIDO,
  ${PARAM_NUM_REGUA_JUR} AS REGUA_JUR
FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA PC ON PC.CLIENTE_ID = CB.CLIENTE_ID AND PC.CARTEIRA = CB.CARTEIRA
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE CB.ENCERRADO_EM IS NULL AND CB.JURIDICO_EM IS NULL AND CB.CARTEIRA IN ('PRIVADA', 'ESTETICA') AND COALESCE(PC.VENCIDO, 0) > 0
  AND COALESCE(F.CHAVE, '') NOT IN ('negociacao', 'acordo', 'juridico')
  AND NOT EXISTS (SELECT 1 FROM CC_PROCESSO X WHERE X.CLIENTE_ID = CB.CLIENTE_ID AND X.CARTEIRA = CB.CARTEIRA AND X.ENCERRADO_EM IS NULL)
  ${event.carteira ? `AND CB.CARTEIRA = ${q(texto(event.carteira, 10).toUpperCase())}` : ''}`);
  } catch { prontos = []; } // sem a 002, nenhum caso de cobrança
  return { processos, acordos, custos, prontos };
}

const corpoAlertas = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Os alertas do Jurídico são do Jurídico, do Gerente, da Diretoria e de quem administra.');
  const todas = calcularAlertas(await lerCarteira(), await parametros(''), hoje());
  const linhas = event.tipo ? todas.filter((l) => l.tipo === event.tipo) : todas;
  return { ok: true, linhas, total: linhas.length, criticos: linhas.filter((l) => l.gravidade === 'critico').length };
};

const corpoIndicadores = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('A visão gerencial é do Jurídico, do Gerente, da Diretoria e de quem administra.');
  const ref = ehData(event.ate) ? event.ate : hoje();
  return { ok: true, ...calcularIndicadores(await lerCarteira(), await parametros(''), hoje(), ref) };
};

/* ── dossiê ── */

const corpoDossieAbrir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const carteira = texto(event.carteira, 10).toUpperCase();
  if (!CARTEIRAS.includes(carteira)) return recusar('Informe a carteira.');
  const cliente = await lerCliente(event.clienteId);
  if (!cliente || m.cargo === 'JURIDICO' || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const cid = inteiro(cliente.ID);
  const agoraTxt = agora();
  const usuarioId = await usuarioDe(m);
  let caso = null;
  try { [caso] = await ler(`SELECT ID, CARD_ID, PROTESTADO FROM CC_COBRANCA WHERE CLIENTE_ID = ${cid} AND CARTEIRA = ${q(carteira)} AND ENCERRADO_EM IS NULL`); } catch { caso = null; }
  const docs = documentosDa(carteira);
  const sugestoes = async () => {
    const [notif] = await ler(`SELECT EMITIDA_EM FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE CLIENTE_ID = ${cid} ORDER BY ID DESC LIMIT 1`);
    return docs.map((d) => {
      if (d.codigo === 'demonst') return [d.codigo, 'OK', 'Gerado pelo sistema.'];
      if (d.codigo === 'hist') return [d.codigo, 'OK', 'Gerado pelo sistema (régua, contatos, promessas e propostas).'];
      if (d.codigo === 'protesto' && caso && ehVerdade(caso.PROTESTADO)) return [d.codigo, 'OK', 'Título protestado pela régua.'];
      if (d.codigo === 'notif' && notif) return [d.codigo, 'PENDENTE', `Notificação gerada em ${dataBr(notif.EMITIDA_EM)}; anexar o comprovante de recebimento.`];
      if (d.codigo === 'cadastro' && cliente.DOCUMENTO && cliente.ENDERECO) return [d.codigo, 'PENDENTE', 'CNPJ e endereço no cadastro; anexar contrato social e QSA.'];
      return [d.codigo, 'PENDENTE', ''];
    });
  };
  const inserirItens = async (processoId) => {
    const s = await sugestoes();
    return escrever('ccEscJurDossieItensInserir', { processoId, n: s.length, itens: lista(s, (x) => x[0]), situacoes: lista(s, (x) => x[1]),
      obss: lista(s, (x) => x[2]), origens: lista(s, () => 'SUGESTAO'), membroId: m.membroId, agora: agoraTxt });
  };
  // (0) Processo ativo do cliente na carteira, de qualquer origem (RF-007, RN-007): devolve o mesmo e completa o dossiê em montagem.
  const existente = await lerProcesso(`P.CLIENTE_ID = ${cid} AND P.CARTEIRA = ${q(carteira)} AND P.ENCERRADO_EM IS NULL`);
  if (existente) {
    if (existente.ORIGEM === 'COBRANCA' && !existente.DOSSIE_ENVIADO_EM) {
      const [n] = await ler(`SELECT COUNT(*) AS N FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ${inteiro(existente.ID)}`);
      const feito = [];
      if (inteiro(n.N) < docs.length) { await inserirItens(inteiro(existente.ID)); feito.push('itens'); }
      if (!existente.CARD_ID) { await criarCard({ ...existente, _membroId: m.membroId }, usuarioId, usuarioId, 'dossie'); feito.push('card'); }
      if (feito.length) await auditar('Jurídico', 'PROCESSO', existente.ID, cid, [{ campo: '(reabertura)', antes: '', depois: `Dossiê completado: ${feito.join(' e ')}` }], m);
    }
    return { ok: true, processoId: inteiro(existente.ID), cardId: inteiro((await procPorId(existente.ID)).CARD_ID), existente: true };
  }
  // Sem caso aberto na carteira, só o ramo N2 (fechamento v2, DT-41: sempre com o cliente visível).
  if (!caso && !nivelMin(m, 2)) return recusar('Este cliente não tem caso de cobrança aberto nesta carteira: o dossiê avulso é aberto pelo Supervisor ou acima.');
  // (1) Valor da posição da carteira; filial e BU de maior saldo vencido.
  const [pos] = await ler(`SELECT VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ${cid} AND CARTEIRA = ${q(carteira)}`);
  let filial = '';
  const t = await escrever('ccBaseTitulosAbertos', { clienteId: cid, carteira, soVencidos: 1, membroId: m.membroId });
  if (t && t.ok !== false && !t.erroWinthor) {
    const porFilial = {};
    for (const l of t.linhas || []) porFilial[l.FILIAL] = (porFilial[l.FILIAL] || 0) + Number(l.SALDO);
    filial = Object.entries(porFilial).sort((a, b) => b[1] - a[1]).map((x) => x[0])[0] || '';
  }
  const buId = await buDoCliente(cid, carteira);
  // (2) Processo.
  await escrever('ccEscJurProcessoInserir', {
    origem: 'COBRANCA', clienteId: cid, nomeDevedor: texto(cliente.NOME, 200), documento: digitos(cliente.DOCUMENTO),
    setor: cliente.SETOR || 'PRIVADO', carteira, buId, linha: '', filial: texto(filial, 10), valor: pos ? Number(pos.VENCIDO) : 0, autos: '', tribunal: '',
    responsavelId: 0, status: 'Dossiê em montagem pelo Financeiro', prazo: '', prazoDescricao: '', substabelecer: 0, obs: '', chaveCarga: '',
    alertaCarga: '', sugestaoClientes: '', encerradoEm: '', motivo: '', motivoTexto: '', ultimoAndamentoEm: '', membroId: m.membroId, agora: agoraTxt,
  });
  const pr = await lerProcesso(`P.CLIENTE_ID = ${cid} AND P.CARTEIRA = ${q(carteira)} AND P.ENCERRADO_EM IS NULL AND P.ORIGEM = 'COBRANCA'`);
  if (!pr) return recusar(MSG.SEM_PERMISSAO);
  // (3) Itens com a sugestão; (4)–(5) card na fase dossie com quem abriu como responsável.
  await inserirItens(inteiro(pr.ID));
  const card = await criarCard({ ...pr, _membroId: m.membroId }, usuarioId, usuarioId, 'dossie');
  // (6) Auditoria; (7) nota no card da cobrança.
  await auditar('Jurídico', 'PROCESSO', pr.ID, cid, [{ campo: '(criação)', antes: '', depois: `Dossiê aberto · ${carteira} · ${brl(pr.VALOR)}` }], m);
  if (caso && caso.CARD_ID) await kbNotaProc(caso.CARD_ID, `Dossiê de cobrança jurídica aberto (processo ${pr.ID}).`, usuarioId);
  return { ok: true, processoId: inteiro(pr.ID), cardId: card.cardId || 0, existente: false };
};

const corpoDossieItemMarcar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [item] = await ler(`SELECT * FROM CC_DOSSIE_ITEM WHERE ID = ${inteiro(event.itemId)}`);
  const pr = item ? await procPorId(item.PROCESSO_ID) : null;
  if (!pr || !vePro(m, pr)) return recusar('Processo não encontrado.');
  if (pr.DOSSIE_ENVIADO_EM || pr.ENCERRADO_EM) return recusar('Dossiê já enviado: só leitura.');
  if (item.ITEM === 'alcada') return recusar('A aprovação do encaminhamento é marcada pelo próprio envio ao Jurídico.');
  if (!(inteiro(pr.DOSSIE_ABERTO_POR) === m.membroId || jur(m) || (m.cargo !== 'JURIDICO' && visivel(m, pr)))) return recusar('Sem permissão para montar este dossiê.');
  let situacao = texto(event.situacao, 10).toUpperCase();
  if (!['PENDENTE', 'OK', 'NA'].includes(situacao)) return recusar('Situação inválida.');
  let obs = texto(event.obs, 500);
  if (situacao === 'NA' && !obs) return recusar('"Não se aplica" exige o motivo.');
  const ids = [...new Set(String(event.kbAnexoIds ?? '').split(',').map(inteiro).filter(Boolean))];
  // KB_ANEXO_IDS é VARCHAR(200): o MySQL estrito recusa o excesso (o SQLite grava).
  if (ids.join(',').length > 200) return recusar('Até 25 anexos por item: junte os arquivos num só PDF.');
  let origem = 'MANUAL';
  if (ids.length) {
    const anexos = await ler(`SELECT ID, NOME FROM KB_ANEXO WHERE CARD_ID = ${inteiro(pr.CARD_ID)} AND ID IN (${ids.join(', ')})`);
    if (anexos.length !== ids.length) return recusar('Anexo não encontrado no card do processo.');
    if (situacao === 'PENDENTE') { situacao = 'OK'; origem = 'ANEXO'; }
    if (!obs) obs = `Anexo: ${anexos.map((a) => a.NOME).join(', ')}`.slice(0, 500);
  }
  const agoraTxt = agora();
  await escrever('ccEscJurDossieItemMarcar', { itemId: inteiro(item.ID), situacao, obs, origem, kbAnexoIds: ids.join(','), membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT SITUACAO, OBS FROM CC_DOSSIE_ITEM WHERE ID = ${inteiro(item.ID)}`);
  if (!rel || rel.SITUACAO !== situacao || rel.OBS !== obs) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Jurídico', 'DOSSIE_ITEM', item.ID, pr.CLIENTE_ID, [{ campo: item.ITEM, antes: `${item.SITUACAO} ${item.OBS}`.trim(), depois: `${situacao} ${obs}`.trim() }], m);
  await kbAtualizarProc(pr, await usuarioDe(m));
  const prog = progressoDoDossie(await ler(`SELECT ITEM, SITUACAO, OBS FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ${inteiro(pr.ID)}`), documentosDa(pr.CARTEIRA));
  return { ok: true, situacao, obs, progresso: { ok: prog.ok, total: prog.total, faltam: prog.faltam } };
};

const corpoDossieEnviar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const pr = await procPorId(event.processoId);
  if (!pr || !vePro(m, pr)) return recusar('Processo não encontrado.');
  if (pr.ORIGEM !== 'COBRANCA' || pr.ENCERRADO_EM) return recusar('Este processo não tem dossiê a enviar.');
  const p = await parametros(pr.CARTEIRA);
  if (!(m.nivel >= Number(p['jur.envioNivelMin']))) return recusar('O envio ao Jurídico exige Gerente financeiro ou acima.');
  const usuarioId = await usuarioDe(m);
  const cid = inteiro(pr.CLIENTE_ID);
  const cobranca = async () => {
    if (!idDe('ccCobEnviarJuridico')) { await marcarNoJuridico(cid, m); return { semCobranca: true }; }
    return escrever('ccCobEnviarJuridico', { clienteId: cid, carteira: pr.CARTEIRA, processoId: inteiro(pr.ID), membroId: m.membroId });
  };
  if (pr.DOSSIE_ENVIADO_EM) {
    // Repetir o envio completa o que faltou do quadro e da cobrança (R-07); nada se duplica.
    if (pr.FASE_CHAVE === 'dossie') { await kbMoverProc(pr, 'recebido', usuarioId); await kbAtualizarProc(await procPorId(pr.ID), usuarioId); }
    const r = await cobranca();
    return { ok: true, jaEnviado: true, processoId: inteiro(pr.ID), prazo: pr.PRAZO, cobranca: r };
  }
  const itens = await ler(`SELECT ID, ITEM, SITUACAO, OBS FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ${inteiro(pr.ID)}`);
  const prog = progressoDoDossie(itens, documentosDa(pr.CARTEIRA));
  if (!prog.completo) return recusar(`Faltam documentos obrigatórios: ${prog.faltam.join('; ')}.`, { faltam: prog.faltam });
  const hojeData = hoje();
  const agoraTxt = agora();
  const enc = await encargosDe(m, cid, pr.CARTEIRA, hojeData);
  if (enc && enc.ok === false) return recusar(enc.error);
  const [pos] = await ler(`SELECT VENCIDO, DIAS_ATRASO FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ${cid} AND CARTEIRA = ${q(pr.CARTEIRA)}`);
  const valor = pos ? Number(pos.VENCIDO) : Number(pr.VALOR);
  const atualizado = enc && !enc.semCobranca && Number(enc.total) > 0 ? Number(enc.total) : valor;
  const dias = pos ? inteiro(pos.DIAS_ATRASO) : 0;
  const [fil] = await ler(`SELECT UF FROM CC_FILIAL_CREDORA WHERE CODIGO = ${q(pr.FILIAL)}`);
  const prazo = prazoInicial(hojeData, Number(p['jur.prazoInicialDu']), await feriadosDaUf((fil && fil.UF) || p['base.calendarioUf'] || 'DF'));
  const status = 'Dossiê recebido pelo Jurídico: conferência e contato amigável';
  // (3) Domínio: envio com a guarda de nível e de completude na SQL.
  await escrever('ccEscJurProcessoEnvio', { processoId: inteiro(pr.ID), valorAtualizado: atualizado, prazo, status, membroId: m.membroId, agora: agoraTxt });
  const env = await procPorId(pr.ID);
  if (!env.DOSSIE_ENVIADO_EM || inteiro(env.DOSSIE_ENVIADO_POR) !== m.membroId) return recusar(MSG.SEM_PERMISSAO);
  // (4) aprovação do encaminhamento; (5) andamento do envio.
  const alcada = itens.find((i) => i.ITEM === 'alcada');
  if (alcada) {
    await escrever('ccEscJurDossieItemMarcar', { itemId: inteiro(alcada.ID), situacao: 'OK', obs: `${m.nome} · ${dataBr(hojeData)}`, origem: 'ENVIO', kbAnexoIds: '',
      membroId: m.membroId, agora: agoraTxt });
  }
  const textoAndamento = `Dossiê enviado ao Jurídico. Saldo vencido ${brl(valor)}, valor atualizado ${brl(atualizado)}, ${dias} dias de atraso.`;
  await escrever('ccEscJurAndamentosInserir', { processoId: inteiro(pr.ID), n: 1, ems: agoraTxt, periodos: '', textos: textoAndamento, autores: texto(m.nome, 120),
    tipo: 'SISTEMA', membroId: m.membroId });
  // (6) auditoria.
  await auditar('Jurídico', 'PROCESSO', pr.ID, cid, [
    { campo: 'Envio do dossiê', antes: '', depois: agoraTxt }, { campo: 'Prazo', antes: pr.PRAZO || '', depois: prazo },
    { campo: 'Valor', antes: Number(pr.VALOR).toFixed(2), depois: valor.toFixed(2) }, { campo: 'Valor atualizado', antes: Number(pr.VALOR_ATUALIZADO).toFixed(2), depois: atualizado.toFixed(2) },
  ], m);
  // (7) quadro: recebido, prazo, capa e responsável do Jurídico; (8) cobrança.
  await kbMoverProc(env, 'recebido', usuarioId);
  await kbAtualizarProc(await procPorId(pr.ID), usuarioId);
  const r = await cobranca();
  return { ok: true, processoId: inteiro(pr.ID), prazo, valor, valorAtualizado: atualizado, diasAtraso: dias, cobranca: r };
};

/* ── processo ── */

const corpoProcessoCriar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico cadastra processo.');
  const cliente = await lerCliente(event.clienteId);
  if (!cliente) return recusar('Informe o cliente pelo código ou CNPJ/CPF: processo sem cliente só na carga inicial.');
  const carteira = texto(event.carteira, 10).toUpperCase() || (cliente.SETOR === 'PUBLICO' ? 'PUBLICA' : 'PRIVADA');
  if (!CARTEIRAS.includes(carteira)) return recusar('Carteira inválida.');
  const faseChave = texto(event.faseChave, 20) || 'recebido';
  if (!FASES.some((f) => f.chave === faseChave) || ['dossie', 'encerrado'].includes(faseChave)) return recusar('Etapa inicial inválida.');
  const autos = validarAutos(event.autos);
  if (!autos.ok) return recusar('Número dos autos fora do padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).');
  if (FASES_COM_AUTOS.includes(faseChave) && !autos.autos) return recusar('Informe o número dos autos.');
  const valor = dinheiro(event.valor);
  if (!(valor >= 0)) return recusar('Informe o valor.');
  const prazo = String(event.prazo ?? '').trim();
  if (prazo && !ehData(prazo)) return recusar('Prazo inválido.');
  const linha = texto(event.linha, 12).toUpperCase() === 'GALDERMA' ? 'GALDERMA' : '';
  const responsavelId = inteiro(event.responsavelId);
  if (responsavelId) {
    const [r] = await ler(`SELECT ID FROM CC_MEMBRO WHERE ID = ${responsavelId} AND ATIVO = TRUE AND CARGO = 'JURIDICO'`);
    if (!r) return recusar('O responsável do processo é alguém do Jurídico.');
  }
  const agoraTxt = agora();
  const cid = inteiro(cliente.ID);
  await escrever('ccEscJurProcessoInserir', {
    origem: 'MANUAL', clienteId: cid, nomeDevedor: texto(event.nomeDevedor, 200) || texto(cliente.NOME, 200),
    documento: (digitos(event.documento) || digitos(cliente.DOCUMENTO)).slice(0, 20), setor: cliente.SETOR || 'PRIVADO', carteira, buId: await buDoCliente(cid, carteira),
    linha, filial: texto(event.filial, 10), valor, autos: autos.autos, tribunal: texto(event.tribunal, 20), responsavelId, status: texto(event.status, 300),
    prazo, prazoDescricao: texto(event.prazoDescricao, 200), substabelecer: 0, obs: texto(event.obs, 2000), chaveCarga: '', alertaCarga: '',
    sugestaoClientes: '', encerradoEm: '', motivo: '', motivoTexto: '', ultimoAndamentoEm: '', membroId: m.membroId, agora: agoraTxt,
  });
  const pr = await lerProcesso(`P.CLIENTE_ID = ${cid} AND P.ORIGEM = 'MANUAL' AND P.CRIADO_EM = ${q(agoraTxt)} AND P.CRIADO_POR = ${m.membroId}`);
  if (!pr) return recusar(MSG.SEM_PERMISSAO);
  const usuarioId = await usuarioDe(m);
  const card = await criarCard({ ...pr, _membroId: m.membroId }, usuarioId, inteiro(pr.RESPONSAVEL_USER_ID) || usuarioId, faseChave);
  await marcarNoJuridico(cid, m);
  await auditar('Jurídico', 'PROCESSO', pr.ID, cid, [{ campo: '(criação)', antes: '', depois: `Processo manual · ${carteira} · ${faseChave} · ${brl(valor)}${autos.autos ? ` · ${autos.autos}` : ''}` }], m);
  if (!card.ok) return { ok: true, processoId: inteiro(pr.ID), cardId: card.cardId || 0, aviso: card.error };
  return { ok: true, processoId: inteiro(pr.ID), cardId: card.cardId };
};

const CAMPOS_FICHA = [
  ['autos', 'AUTOS', 'Nº dos autos'], ['tribunal', 'TRIBUNAL', 'Tribunal'], ['filial', 'FILIAL', 'Filial'], ['linha', 'LINHA', 'Linha'],
  ['responsavelId', 'RESPONSAVEL_ID', 'Responsável'], ['status', 'STATUS', 'Situação'], ['prazo', 'PRAZO', 'Prazo'], ['prazoDescricao', 'PRAZO_DESCRICAO', 'Descrição do prazo'],
  ['substabelecer', 'SUBSTABELECER', 'Substabelecer'], ['formaCitacao', 'FORMA_CITACAO', 'Forma de citação'], ['resultadoSentenca', 'RESULTADO_SENTENCA', 'Resultado da sentença'],
  ['recuperadoInformado', 'RECUPERADO_INFORMADO', 'Recuperado informado'], ['valor', 'VALOR', 'Valor'], ['obs', 'OBS', 'Observações'],
];

const corpoProcessoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico edita o processo.');
  const pr = await procPorId(event.processoId);
  if (!pr) return recusar('Processo não encontrado.');
  const tem = (k) => event[k] !== undefined && event[k] !== null;
  const autos = tem('autos') ? validarAutos(event.autos) : { ok: true, autos: pr.AUTOS };
  if (!autos.ok) return recusar('Número dos autos fora do padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).');
  const prazo = tem('prazo') ? String(event.prazo).trim() : (pr.PRAZO || '');
  if (prazo && !ehData(prazo)) return recusar('Prazo inválido.');
  const formaCitacao = tem('formaCitacao') ? texto(event.formaCitacao, 10).toUpperCase() : pr.FORMA_CITACAO;
  if (formaCitacao && !['PESSOAL', 'EDITAL', 'CURADOR'].includes(formaCitacao)) return recusar('Forma de citação inválida.');
  const resultadoSentenca = tem('resultadoSentenca') ? texto(event.resultadoSentenca, 12).toUpperCase() : pr.RESULTADO_SENTENCA;
  if (resultadoSentenca && !['FAVORAVEL', 'PARCIAL', 'DESFAVORAVEL'].includes(resultadoSentenca)) return recusar('Resultado da sentença inválido.');
  const valor = tem('valor') && String(event.valor).trim() !== '' ? dinheiro(event.valor) : Number(pr.VALOR);
  if (!(valor >= 0)) return recusar('Valor inválido.');
  const rec = tem('recuperadoInformado') ? dinheiro(event.recuperadoInformado) : (pr.RECUPERADO_INFORMADO === null ? 0 : Number(pr.RECUPERADO_INFORMADO));
  if (Number.isNaN(rec) || rec < 0) return recusar('Valor recuperado inválido.');
  const linhaIn = texto(event.linha, 12).toUpperCase();
  const responsavelId = tem('responsavelId') && inteiro(event.responsavelId) ? inteiro(event.responsavelId) : inteiro(pr.RESPONSAVEL_ID);
  if (responsavelId && responsavelId !== inteiro(pr.RESPONSAVEL_ID)) {
    const [r] = await ler(`SELECT ID FROM CC_MEMBRO WHERE ID = ${responsavelId} AND ATIVO = TRUE AND CARGO = 'JURIDICO'`);
    if (!r) return recusar('O responsável do processo é alguém do Jurídico.');
  }
  const novo = {
    autos: autos.autos, tribunal: tem('tribunal') ? texto(event.tribunal, 20) : pr.TRIBUNAL, filial: texto(event.filial, 10) || pr.FILIAL,
    linha: linhaIn === 'GALDERMA' ? 'GALDERMA' : linhaIn === 'DEMAIS' ? '' : pr.LINHA, responsavelId,
    status: tem('status') ? texto(event.status, 300) : pr.STATUS, prazo, prazoDescricao: tem('prazoDescricao') ? texto(event.prazoDescricao, 200) : pr.PRAZO_DESCRICAO,
    substabelecer: tem('substabelecer') ? (inteiro(event.substabelecer) === 1 ? 1 : 0) : (ehVerdade(pr.SUBSTABELECER) ? 1 : 0), formaCitacao, resultadoSentenca,
    recuperadoInformado: rec > 0 ? rec.toFixed(2) : '', valor, obs: tem('obs') ? texto(event.obs, 2000) : pr.OBS,
  };
  const antes = {
    autos: pr.AUTOS, tribunal: pr.TRIBUNAL, filial: pr.FILIAL, linha: pr.LINHA, responsavelId: inteiro(pr.RESPONSAVEL_ID), status: pr.STATUS, prazo: pr.PRAZO || '',
    prazoDescricao: pr.PRAZO_DESCRICAO, substabelecer: ehVerdade(pr.SUBSTABELECER) ? 1 : 0, formaCitacao: pr.FORMA_CITACAO, resultadoSentenca: pr.RESULTADO_SENTENCA,
    recuperadoInformado: pr.RECUPERADO_INFORMADO === null ? '' : Number(pr.RECUPERADO_INFORMADO).toFixed(2), valor: Number(pr.VALOR), obs: pr.OBS,
  };
  const mudou = CAMPOS_FICHA.filter(([k]) => String(antes[k] ?? '') !== String(novo[k] ?? ''));
  if (!mudou.length) return { ok: true, processoId: inteiro(pr.ID), alterados: 0 };
  await escrever('ccEscJurProcessoAtualizar', { processoId: inteiro(pr.ID), ...novo, ultimoAndamentoEm: '', membroId: m.membroId });
  const rel = await procPorId(pr.ID);
  if (String(rel.AUTOS) !== String(novo.autos) || String(rel.STATUS) !== String(novo.status)) return recusar(MSG.SEM_PERMISSAO);
  const itensAud = mudou.map(([k, , rotulo]) => ({ campo: rotulo, antes: antes[k] ?? '', depois: novo[k] ?? '' }));
  await auditar('Jurídico', 'PROCESSO', pr.ID, pr.CLIENTE_ID, itensAud.length > 10 ? [...itensAud.slice(0, 9), { campo: '(demais)', antes: '', depois: itensAud.slice(9).map((i) => i.campo).join(', ') }] : itensAud, m);
  await kbAtualizarProc(rel, await usuarioDe(m));
  return { ok: true, processoId: inteiro(pr.ID), alterados: mudou.length, anoAutos: validarAutos(rel.AUTOS).ano };
};

const corpoProcessoEncerrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico encerra processo.');
  const pr = await procPorId(event.processoId);
  if (!pr) return recusar('Processo não encontrado.');
  if (pr.ENCERRADO_EM) return recusar('Processo já encerrado.');
  const motivo = texto(event.motivo, 16).toUpperCase();
  if (!MOTIVOS[motivo]) return recusar('Informe o motivo do encerramento: quitado, acordo cumprido, baixa como perda, extinto sem recuperação ou outro.');
  const motivoTexto = texto(event.motivoTexto, 300);
  if (motivo === 'OUTRO' && !motivoTexto) return recusar('Encerramento por "outro" exige o motivo escrito.');
  if (motivo === 'ACORDO_CUMPRIDO') {
    const [a] = await ler(`SELECT ID FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ${inteiro(pr.ID)} AND SITUACAO = 'QUITADO'`);
    if (!a) return recusar('"Acordo cumprido" exige o acordo judicial quitado.');
  }
  let aviso = '';
  if (motivo === 'BAIXA_PERDA' && pr.CLIENTE_ID) {
    let baixa = null;
    try { [baixa] = await ler(`SELECT ID FROM CC_BAIXA WHERE CLIENTE_ID = ${inteiro(pr.CLIENTE_ID)} AND SITUACAO = 'APROVADA'`); } catch { baixa = null; }
    if (!baixa) aviso = 'Encerrado como baixa como perda sem baixa aprovada na cobrança (P-43).';
  }
  const status = motivo === 'ACORDO_CUMPRIDO' ? 'Acordo judicial integralmente cumprido' : `Encerrado: ${MOTIVOS[motivo]}${motivoTexto ? ` · ${motivoTexto}` : ''}`;
  const agoraTxt = agora();
  await escrever('ccEscJurProcessoEncerrar', { processoId: inteiro(pr.ID), motivo, motivoTexto, status: texto(status, 300), membroId: m.membroId, agora: agoraTxt });
  const rel = await procPorId(pr.ID);
  if (!rel.ENCERRADO_EM) return recusar(MSG.SEM_PERMISSAO);
  await marcarNoJuridico(pr.CLIENTE_ID, m);
  await auditar('Jurídico', 'PROCESSO', pr.ID, pr.CLIENTE_ID, [{ campo: 'Encerramento', antes: '', depois: `${MOTIVOS[motivo]}${motivoTexto ? ` · ${motivoTexto}` : ''}` }], m);
  const usuarioId = await usuarioDe(m);
  await kbMoverProc(rel, 'encerrado', usuarioId);
  const nota = motivo === 'ACORDO_CUMPRIDO' ? 'Acordo quitado: todas as parcelas pagas.' : `Processo encerrado: ${MOTIVOS[motivo]}${motivoTexto ? ` · ${motivoTexto}` : ''}.${aviso ? ` ${aviso}` : ''}`;
  await kbNotaProc(rel.CARD_ID, nota, usuarioId);
  return { ok: true, processoId: inteiro(pr.ID), ...(aviso ? { aviso } : {}) };
};

const corpoProcessoVincular = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico vincula o cliente.');
  const pr = await procPorId(event.processoId);
  if (!pr) return recusar('Processo não encontrado.');
  const cliente = await lerCliente(event.clienteId);
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const buId = await buDoCliente(cliente.ID, pr.CARTEIRA);
  await escrever('ccEscJurProcessoCliente', { processoId: inteiro(pr.ID), clienteId: inteiro(cliente.ID), buId, membroId: m.membroId });
  const rel = await procPorId(pr.ID);
  if (inteiro(rel.CLIENTE_ID) !== inteiro(cliente.ID)) return recusar(MSG.SEM_PERMISSAO);
  if (!rel.ENCERRADO_EM) await marcarNoJuridico(cliente.ID, m);
  await auditar('Jurídico', 'PROCESSO', pr.ID, cliente.ID, [{ campo: 'Cliente', antes: pr.CLIENTE_ID ? `${pr.CODCLI} ${pr.CLIENTE_NOME}` : pr.NOME_DEVEDOR, depois: `${cliente.CODCLI} ${cliente.NOME}` }], m);
  await kbAtualizarProc(rel, await usuarioDe(m));
  return { ok: true, processoId: inteiro(pr.ID), clienteId: inteiro(cliente.ID), setor: rel.SETOR };
};

const corpoAndamentoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico registra andamento.');
  const pr = await procPorId(event.processoId);
  if (!pr) return recusar('Processo não encontrado.');
  const textoAnd = texto(event.texto, 2000);
  if (!textoAnd) return recusar('Escreva o andamento.');
  const agoraTxt = agora();
  const hojeData = agoraTxt.slice(0, 10);
  const em = String(event.em ?? '').trim();
  const dataEm = em ? em.slice(0, 10) : hojeData;
  if (!ehData(dataEm)) return recusar('Data do andamento inválida.');
  if (dataEm > hojeData) return recusar('A data do andamento não pode ser futura.');
  const emTxt = dataEm === hojeData ? agoraTxt : (em.length >= 19 ? em.slice(0, 19) : `${dataEm}T12:00:00`);
  const prazo = String(event.prazo ?? '').trim();
  if (prazo && !ehData(prazo)) return recusar('Prazo inválido.');
  await escrever('ccEscJurAndamentosInserir', { processoId: inteiro(pr.ID), n: 1, ems: emTxt, periodos: '', textos: textoAnd, autores: texto(m.nome, 120), tipo: 'MANUAL', membroId: m.membroId });
  const atual = {
    autos: pr.AUTOS, tribunal: pr.TRIBUNAL, filial: pr.FILIAL, linha: pr.LINHA, responsavelId: inteiro(pr.RESPONSAVEL_ID), status: texto(textoAnd, 300),
    prazo: prazo || pr.PRAZO || '', prazoDescricao: prazo ? texto(event.prazoDescricao, 200) : pr.PRAZO_DESCRICAO, substabelecer: ehVerdade(pr.SUBSTABELECER) ? 1 : 0,
    formaCitacao: pr.FORMA_CITACAO, resultadoSentenca: pr.RESULTADO_SENTENCA,
    recuperadoInformado: pr.RECUPERADO_INFORMADO === null ? '' : Number(pr.RECUPERADO_INFORMADO).toFixed(2), valor: Number(pr.VALOR), obs: pr.OBS,
  };
  await escrever('ccEscJurProcessoAtualizar', { processoId: inteiro(pr.ID), ...atual, ultimoAndamentoEm: emTxt, membroId: m.membroId });
  const rel = await procPorId(pr.ID);
  if (!rel.ULTIMO_ANDAMENTO_EM || rel.ULTIMO_ANDAMENTO_EM < emTxt) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Jurídico', 'ANDAMENTO', pr.ID, pr.CLIENTE_ID, [{ campo: 'Andamento', antes: '', depois: textoAnd },
    ...(prazo && prazo !== (pr.PRAZO || '') ? [{ campo: 'Prazo', antes: pr.PRAZO || '', depois: prazo }] : [])], m);
  const usuarioId = await usuarioDe(m);
  await kbAtualizarProc(rel, usuarioId);
  await kbNotaProc(rel.CARD_ID, `Andamento: ${textoAnd}`, usuarioId);
  return { ok: true, processoId: inteiro(pr.ID), diasSemAndamento: diasEntre(rel.ULTIMO_ANDAMENTO_EM, hojeData), diasPrazo: rel.PRAZO ? diasEntre(hojeData, rel.PRAZO) : null };
};

/* ── custos ── */

/** Valida e normaliza um custo da entrada (RN-013). */
function custoDaEntrada(e) {
  const tipo = texto(e.tipo, 16).toUpperCase();
  if (!TIPOS_CUSTO.some((t) => t.codigo === tipo)) return { erro: 'Tipo de custo inválido.' };
  const valor = dinheiro(e.valor);
  if (!(valor > 0)) return { erro: 'Informe o valor do custo (maior que zero).' };
  const data = String(e.data ?? '').trim() || hoje();
  if (!ehData(data)) return { erro: 'Data do custo inválida.' };
  const comprovante = inteiro(e.comprovanteKbAnexoId);
  return { tipo, valor, data, obs: texto(e.obs, 500), guia: inteiro(e.guiaKbAnexoId), comprovante, pago: comprovante || inteiro(e.pago) === 1 ? 1 : 0 };
}

async function anexosDoCard(pr, ids) {
  const lst = ids.filter(Boolean);
  if (!lst.length) return true;
  const r = await ler(`SELECT ID FROM KB_ANEXO WHERE CARD_ID = ${inteiro(pr.CARD_ID)} AND ID IN (${lst.join(', ')})`);
  return r.length === new Set(lst).size;
}

const corpoCustoLancar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico lança custo.');
  const pr = await procPorId(event.processoId);
  if (!pr) return recusar('Processo não encontrado.');
  const c = custoDaEntrada(event);
  if (c.erro) return recusar(c.erro);
  if (!(await anexosDoCard(pr, [c.guia, c.comprovante]))) return recusar('Anexo não encontrado no card do processo.');
  const agoraTxt = agora();
  await escrever('ccEscJurCustosInserir', { processoId: inteiro(pr.ID), n: 1, tipos: c.tipo, datas: c.data, valores: c.valor, obss: c.obs, pagos: c.pago,
    guias: c.guia, comprovantes: c.comprovante, membroId: m.membroId, agora: agoraTxt });
  const [novo] = await ler(`SELECT ID FROM CC_PROCESSO_CUSTO WHERE PROCESSO_ID = ${inteiro(pr.ID)} AND CRIADO_EM = ${q(agoraTxt)} AND CRIADO_POR = ${m.membroId} ORDER BY ID DESC LIMIT 1`);
  if (!novo) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Jurídico', 'CUSTO', novo.ID, pr.CLIENTE_ID, [{ campo: '(criação)', antes: '', depois: `${c.tipo} · ${c.data} · ${c.valor.toFixed(2)} · ${c.pago ? 'pago' : 'a pagar'}` }], m);
  await kbAtualizarProc(pr, await usuarioDe(m));
  return { ok: true, custoId: inteiro(novo.ID), pago: c.pago };
};

const corpoCustoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico altera custo.');
  const [atual] = await ler(`SELECT * FROM CC_PROCESSO_CUSTO WHERE ID = ${inteiro(event.custoId)} AND REMOVIDO_EM IS NULL`);
  if (!atual) return recusar('Custo não encontrado.');
  const pr = await procPorId(atual.PROCESSO_ID);
  const e = { tipo: atual.TIPO, data: atual.DATA, valor: atual.VALOR, obs: atual.OBS, pago: ehVerdade(atual.PAGO) ? 1 : 0, guiaKbAnexoId: atual.GUIA_KB_ANEXO_ID,
    comprovanteKbAnexoId: atual.COMPROVANTE_KB_ANEXO_ID };
  for (const k of Object.keys(e)) if (event[k] !== undefined && event[k] !== null && event[k] !== '') e[k] = event[k];
  const c = custoDaEntrada(e);
  if (c.erro) return recusar(c.erro);
  if (!(await anexosDoCard(pr, [c.guia, c.comprovante]))) return recusar('Anexo não encontrado no card do processo.');
  await escrever('ccEscJurCustoAtualizar', { custoId: inteiro(atual.ID), tipo: c.tipo, data: c.data, valor: c.valor, obs: c.obs, pago: c.pago, guia: c.guia,
    comprovante: c.comprovante, membroId: m.membroId });
  const [rel] = await ler(`SELECT * FROM CC_PROCESSO_CUSTO WHERE ID = ${inteiro(atual.ID)}`);
  if (!rel || Number(rel.VALOR) !== c.valor || (ehVerdade(rel.PAGO) ? 1 : 0) !== c.pago) return recusar(MSG.SEM_PERMISSAO);
  const campos = [['TIPO', 'tipo'], ['DATA', 'data'], ['VALOR', 'valor'], ['OBS', 'obs'], ['PAGO', 'pago'], ['GUIA_KB_ANEXO_ID', 'guia'], ['COMPROVANTE_KB_ANEXO_ID', 'comprovante']]
    .map(([col, k]) => ({ campo: col, antes: col === 'PAGO' ? (ehVerdade(atual.PAGO) ? 1 : 0) : (atual[col] ?? ''), depois: c[k] }))
    .filter((x) => String(x.antes ?? '') !== String(x.depois ?? '') && !(x.campo.endsWith('_ID') && !inteiro(x.antes) && !inteiro(x.depois)) && !(x.campo === 'VALOR' && Number(x.antes) === Number(x.depois)));
  if (campos.length) await auditar('Jurídico', 'CUSTO', atual.ID, pr.CLIENTE_ID, campos, m);
  await kbAtualizarProc(pr, await usuarioDe(m));
  return { ok: true, custoId: inteiro(atual.ID), pago: c.pago };
};

const corpoCustoRemover = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico remove custo.');
  const [atual] = await ler(`SELECT * FROM CC_PROCESSO_CUSTO WHERE ID = ${inteiro(event.custoId)} AND REMOVIDO_EM IS NULL`);
  if (!atual) return recusar('Custo não encontrado.');
  const agoraTxt = agora();
  await escrever('ccEscJurCustoRemover', { custoId: inteiro(atual.ID), membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT REMOVIDO_EM FROM CC_PROCESSO_CUSTO WHERE ID = ${inteiro(atual.ID)}`);
  if (!rel || !rel.REMOVIDO_EM) return recusar(MSG.SEM_PERMISSAO);
  const pr = await procPorId(atual.PROCESSO_ID);
  await auditar('Jurídico', 'CUSTO', atual.ID, pr.CLIENTE_ID, [{ campo: '(remoção)', antes: `${atual.TIPO} · ${atual.DATA} · ${Number(atual.VALOR).toFixed(2)}`, depois: texto(event.motivo, 300) }], m);
  await kbAtualizarProc(pr, await usuarioDe(m));
  return { ok: true, custoId: inteiro(atual.ID) };
};

/* ── acordo judicial ── */

/** Parcelas em lotes de 20 por execução (01 §5). */
async function gravarParcelas(acordoId, parcelas, m, origem) {
  for (let i = 0; i < parcelas.length; i += 20) {
    const lote = parcelas.slice(i, i + 20);
    await escrever('ccEscJurAcordoParcelasInserir', { acordoId, n: lote.length, numeros: lista(lote, (x) => x.numero), valores: lista(lote, (x) => Number(x.valor).toFixed(2)),
      vencimentos: lista(lote, (x) => x.vencimento), situacoes: lista(lote, (x) => x.situacao || 'ABERTA'), pagosEm: lista(lote, (x) => x.pagoEm || ''),
      origens: lista(lote, () => origem), membroId: m.membroId });
  }
}

const corpoAcordoCriar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico registra acordo judicial.');
  const pr = await procPorId(event.processoId);
  if (!pr) return recusar('Processo não encontrado.');
  if (pr.ENCERRADO_EM) return recusar('Processo encerrado.');
  const valor = dinheiro(event.valor);
  const entrada = String(event.entrada ?? '').trim() === '' ? 0 : dinheiro(event.entrada);
  const n = inteiro(event.nParcelas);
  if (!(valor > 0)) return recusar('Informe o valor do acordo.');
  if (!(entrada >= 0) || entrada > valor) return recusar('A entrada deve ficar entre zero e o valor do acordo.');
  if (n < 0 || n > 60 || (n === 0 && entrada < valor)) return recusar('Informe o número de parcelas.');
  const primeiro = String(event.primeiroVencimento ?? '').trim() || hoje();
  if (!ehData(primeiro)) return recusar('Vencimento da entrada inválido.');
  // A guarda das parcelas aceita vencimento até o registro + 31 dias por parcela (DATE_ADD em dias, sem MONTH no simulador).
  if (primeiro > somarDias(hoje(), 31)) return recusar('O vencimento da entrada fica em até 31 dias.');
  const [aberto] = await ler(`SELECT ID FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ${inteiro(pr.ID)} AND SITUACAO IN ('AGUARDANDO', 'ANDAMENTO')`);
  if (aberto) return recusar('O processo já tem acordo judicial aguardando aprovação ou em andamento.');
  const p = await parametros(pr.CARTEIRA);
  const honorarios = dinheiro(event.honorarios) > 0 ? dinheiro(event.honorarios) : Math.round(valor * Number(p['jur.honorariosPct'])) / 100;
  const politica = politicaDoAcordo(valor, entrada, n, p);
  const agoraTxt = agora();
  await escrever('ccEscJurAcordoInserir', { processoId: inteiro(pr.ID), valor, entrada, nParcelas: n, honorarios, situacaoTexto: '', carga: 0, membroId: m.membroId, agora: agoraTxt });
  const [ac] = await ler(`SELECT * FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ${inteiro(pr.ID)} AND REGISTRADO_EM = ${q(agoraTxt)} AND REGISTRADO_POR = ${m.membroId} ORDER BY ID DESC LIMIT 1`);
  if (!ac) return recusar(MSG.SEM_PERMISSAO);
  const parcelas = gerarParcelas(valor, entrada, n, primeiro);
  await gravarParcelas(inteiro(ac.ID), parcelas, m, 'MANUAL');
  await auditar('Jurídico', 'ACORDO_JUDICIAL', ac.ID, pr.CLIENTE_ID, [{ campo: '(criação)', antes: '',
    depois: `${valor.toFixed(2)} · entrada ${entrada.toFixed(2)} · ${n} parcela(s) · ${ac.SITUACAO}` }], m);
  const usuarioId = await usuarioDe(m);
  const situacaoTxt = ac.SITUACAO === 'AGUARDANDO' ? `aguardando aprovação (${politica.motivos.join(', ') || 'fora da política'})` : 'em andamento';
  await kbNotaProc(pr.CARD_ID, `Acordo judicial de ${brl(valor)} registrado: entrada ${brl(entrada)} + ${n} parcela(s); ${situacaoTxt}.`, usuarioId);
  return { ok: true, acordoId: inteiro(ac.ID), situacao: ac.SITUACAO, nivelExigido: inteiro(ac.NIVEL_EXIGIDO), honorarios, parcelas, politica };
};

const corpoAcordoAprovar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const [ac] = await ler(`SELECT * FROM CC_ACORDO_JUDICIAL WHERE ID = ${inteiro(event.acordoId)}`);
  if (!ac) return recusar('Acordo não encontrado.');
  if (ac.SITUACAO !== 'AGUARDANDO') return recusar('Este acordo não está aguardando aprovação.');
  if (!(m.nivel >= inteiro(ac.NIVEL_EXIGIDO))) return recusar(`Sem alçada: a aprovação deste acordo exige nível ${inteiro(ac.NIVEL_EXIGIDO)} (Gerente financeiro ou acima).`);
  if (inteiro(ac.REGISTRADO_POR) === m.membroId) return recusar('Quem registrou o acordo não aprova.');
  const aprovar = inteiro(event.aprovar) === 1;
  const textoDecisao = texto(event.texto, 300);
  if (!aprovar && !textoDecisao) return recusar('Informe o motivo da recusa.');
  const agoraTxt = agora();
  const situacao = aprovar ? 'ANDAMENTO' : 'RECUSADO';
  await escrever('ccEscJurAcordoSituacao', { acordoId: inteiro(ac.ID), situacao, pagoEm: '', membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT SITUACAO, APROVADO_POR FROM CC_ACORDO_JUDICIAL WHERE ID = ${inteiro(ac.ID)}`);
  if (!rel || rel.SITUACAO !== situacao) return recusar(MSG.SEM_PERMISSAO);
  const pr = await procPorId(ac.PROCESSO_ID);
  await auditar('Jurídico', 'ACORDO_JUDICIAL', ac.ID, pr.CLIENTE_ID, [{ campo: 'Aprovação', antes: 'AGUARDANDO', depois: `${situacao}${textoDecisao ? ` · ${textoDecisao}` : ''}` }], m);
  await kbNotaProc(pr.CARD_ID, aprovar ? `Acordo judicial de ${brl(ac.VALOR)} aprovado por ${m.nome}.` : `Acordo judicial de ${brl(ac.VALOR)} recusado por ${m.nome}: ${textoDecisao}`, await usuarioDe(m));
  return { ok: true, acordoId: inteiro(ac.ID), situacao, aprovadoPor: inteiro(rel.APROVADO_POR) };
};

const corpoParcelaSituacao = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico registra parcela.');
  const [pa] = await ler(`SELECT PA.*, AJ.PROCESSO_ID, AJ.SITUACAO AS ACORDO_SITUACAO FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = PA.ACORDO_ID
WHERE PA.ID = ${inteiro(event.parcelaId)}`);
  if (!pa) return recusar('Parcela não encontrada.');
  if (['QUITADO', 'RECUSADO'].includes(pa.ACORDO_SITUACAO)) return recusar('Acordo quitado ou recusado: parcelas só leitura.');
  const situacao = texto(event.situacao, 12).toUpperCase();
  if (!['ABERTA', 'PAGA'].includes(situacao)) return recusar('A parcela fica aberta ou paga ("a confirmar" só vem da carga).');
  if (situacao === 'PAGA' && pa.ACORDO_SITUACAO !== 'ANDAMENTO') return recusar('O acordo aguarda aprovação: a parcela só é paga com o acordo em andamento.');
  const hojeData = hoje();
  const pagoEm = situacao === 'PAGA' ? (String(event.pagoEm ?? '').trim() || hojeData) : '';
  if (situacao === 'PAGA' && (!ehData(pagoEm) || pagoEm > hojeData)) return recusar('A data do pagamento não pode ser futura.');
  await escrever('ccEscJurAcordoParcela', { parcelaId: inteiro(pa.ID), situacao, pagoEm, membroId: m.membroId });
  const [rel] = await ler(`SELECT SITUACAO, ORIGEM_SITUACAO FROM CC_ACORDO_JUDICIAL_PARCELA WHERE ID = ${inteiro(pa.ID)}`);
  if (!rel || rel.SITUACAO !== situacao || rel.ORIGEM_SITUACAO !== 'MANUAL') return recusar(MSG.SEM_PERMISSAO);
  const [resto] = await ler(`SELECT COUNT(*) AS N FROM CC_ACORDO_JUDICIAL_PARCELA WHERE ACORDO_ID = ${inteiro(pa.ACORDO_ID)} AND SITUACAO <> 'PAGA'`);
  let quitado = false;
  if (inteiro(resto.N) === 0 && pa.ACORDO_SITUACAO === 'ANDAMENTO') {
    await escrever('ccEscJurAcordoSituacao', { acordoId: inteiro(pa.ACORDO_ID), situacao: 'QUITADO', pagoEm: '', membroId: m.membroId, agora: agora() });
    const [a] = await ler(`SELECT SITUACAO FROM CC_ACORDO_JUDICIAL WHERE ID = ${inteiro(pa.ACORDO_ID)}`);
    quitado = a && a.SITUACAO === 'QUITADO';
  }
  const pr = await procPorId(pa.PROCESSO_ID);
  await auditar('Jurídico', 'PARCELA', pa.ID, pr.CLIENTE_ID, [{ campo: `Parcela ${pa.NUMERO}`, antes: `${pa.SITUACAO} ${pa.PAGO_EM || ''}`.trim(), depois: `${situacao} ${pagoEm}`.trim() },
    ...(quitado ? [{ campo: 'Acordo', antes: 'ANDAMENTO', depois: 'QUITADO' }] : [])], m);
  await kbAtualizarProc(pr, await usuarioDe(m));
  return { ok: true, parcelaId: inteiro(pa.ID), situacao, quitado };
};

const corpoHonorariosPagar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: só o Jurídico registra os honorários.');
  const [ac] = await ler(`SELECT * FROM CC_ACORDO_JUDICIAL WHERE ID = ${inteiro(event.acordoId)}`);
  if (!ac) return recusar('Acordo não encontrado.');
  const pagoEm = String(event.pagoEm ?? '').trim() || hoje();
  if (!ehData(pagoEm) || pagoEm > hoje()) return recusar('A data do pagamento não pode ser futura.');
  await escrever('ccEscJurAcordoSituacao', { acordoId: inteiro(ac.ID), situacao: 'HONORARIOS', pagoEm, membroId: m.membroId, agora: agora() });
  const [rel] = await ler(`SELECT HONORARIOS_PAGOS FROM CC_ACORDO_JUDICIAL WHERE ID = ${inteiro(ac.ID)}`);
  if (!rel || !ehVerdade(rel.HONORARIOS_PAGOS)) return recusar(MSG.SEM_PERMISSAO);
  const pr = await procPorId(ac.PROCESSO_ID);
  await auditar('Jurídico', 'ACORDO_JUDICIAL', ac.ID, pr.CLIENTE_ID, [{ campo: 'Honorários pagos', antes: 'Não', depois: `Sim · ${pagoEm}` }], m);
  return { ok: true, acordoId: inteiro(ac.ID) };
};

/* ── documentos e filial ── */

/** Filial credora para o documento: a pedida, senão a do processo, senão a dos títulos. */
async function filialDoDocumento(codigo, m, clienteId, carteira) {
  let cod = codigo;
  if (!cod) {
    const t = await escrever('ccBaseTitulosAbertos', { clienteId: inteiro(clienteId), carteira, soVencidos: 1, membroId: m.membroId });
    if (t && t.erroWinthor) return { erro: 'Informe a filial credora (Winthor indisponível).' };
    const porFilial = {};
    for (const l of (t && t.linhas) || []) porFilial[l.FILIAL] = (porFilial[l.FILIAL] || 0) + Number(l.SALDO);
    cod = Object.entries(porFilial).sort((a, b) => b[1] - a[1]).map((x) => x[0])[0] || '';
  }
  const [f] = await ler(`SELECT * FROM CC_FILIAL_CREDORA WHERE CODIGO = ${q(cod)}`);
  return f || null;
}

/** Prévia do texto da notificação (RN-024), com o corpo do modelo pelo `ccBaseModeloPrever`. */
async function prepararNotificacao(m, cliente, carteira, filial, prazoDias, enc) {
  const extras = {
    carteira, PRAZO_DIAS: porExtenso(prazoDias).replace(/^(\d+) /, '$1 '),
    TOTAL: `${brl(enc.total)}, assim composto: valor principal de ${brl(enc.principal)}, multa de ${brl(enc.multa)}, juros de mora de ${brl(enc.juros)} e correção monetária de ${brl(enc.correcao)}`,
    BANCO: filial.BANCO || '[BANCO, AGÊNCIA, CONTA E PIX]', REPRESENTANTE: filial.REPRESENTANTE || '[REPRESENTANTE]', CARGO_REPRESENTANTE: filial.REPRESENTANTE_CARGO || '[CARGO]',
  };
  const r = await escrever('ccBaseModeloPrever', { codigo: 'JUR_NOTIF_EXTRAJUDICIAL', clienteId: inteiro(cliente.ID), contatoId: 0, para: '', assunto: '', corpo: '',
    extras: JSON.stringify(extras), membroId: m.membroId });
  if (!r || r.ok === false) return { erro: (r && r.error) || 'Modelo da notificação indisponível.' };
  return { texto: montarNotificacao(r.corpo, { filial, cliente, encargos: enc, data: hoje() }), assunto: r.assunto, validado: !!r.validado, para: r.para };
}

const corpoNotificacaoPreparar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const cliente = await lerCliente(event.clienteId);
  if (!cliente || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const carteira = texto(event.carteira, 10).toUpperCase();
  if (carteira === 'PUBLICA' || cliente.SETOR === 'PUBLICO') return recusar('Órgão público não recebe notificação extrajudicial: use ofício e requerimento administrativo.');
  const p = await parametros(carteira);
  const [proc] = await ler(`SELECT FILIAL FROM CC_PROCESSO WHERE CLIENTE_ID = ${inteiro(cliente.ID)} AND CARTEIRA = ${q(carteira)} AND ENCERRADO_EM IS NULL ORDER BY ID DESC LIMIT 1`);
  const filial = await filialDoDocumento(texto(event.filial, 10) || (proc && proc.FILIAL) || '', m, cliente.ID, carteira);
  if (filial && filial.erro) return recusar(filial.erro);
  if (!filial || !filial.RAZAO_SOCIAL || digitos(filial.CNPJ).length !== 14) return recusar('A filial credora precisa ter razão social e CNPJ cadastrados.');
  const prazoDias = inteiro(event.prazoDias) || Number(p['jur.notifPrazoDias']);
  const enc = await encargosDe(m, cliente.ID, carteira, hoje());
  if (enc && enc.ok === false) return recusar(enc.error);
  const doc = await prepararNotificacao(m, cliente, carteira, filial, prazoDias, enc);
  if (doc.erro) return recusar(doc.erro);
  const [modelo] = await ler("SELECT VERSAO FROM CC_MODELO_MENSAGEM WHERE CODIGO = 'JUR_NOTIF_EXTRAJUDICIAL'");
  return { ok: true, texto: doc.texto, assunto: doc.assunto, demonstrativo: enc, filial, modeloVersao: inteiro(modelo && modelo.VERSAO), validado: doc.validado,
    prazoAte: somarDias(hoje(), prazoDias), para: doc.para };
};

const corpoNotificacaoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const cliente = await lerCliente(event.clienteId);
  if (!cliente || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const carteira = texto(event.carteira, 10).toUpperCase();
  if (carteira === 'PUBLICA' || cliente.SETOR === 'PUBLICO') return recusar('Órgão público não recebe notificação extrajudicial: use ofício e requerimento administrativo.');
  if (!['PRIVADA', 'ESTETICA'].includes(carteira)) return recusar('Informe a carteira.');
  if (m.cargo === 'JURIDICO' || !String(cliente.AGENTE_CAMINHO || '').startsWith(m.caminho || '¬')) return recusar('A notificação é emitida pelo agente do cliente ou por quem está acima dele.');
  const [modelo] = await ler("SELECT * FROM CC_MODELO_MENSAGEM WHERE CODIGO = 'JUR_NOTIF_EXTRAJUDICIAL' AND ATIVO = TRUE");
  const p = await parametros(carteira);
  const validado = modelo && inteiro(modelo.VALIDADO_VERSAO) === inteiro(modelo.VERSAO)
    && String(modelo.VALIDADO_EM || '').slice(0, 10) > somarMeses(hoje(), -(Number(p['com.modeloRevalidarMeses']) || 12));
  if (!validado) return recusar('O modelo da notificação aguarda validação em dia pelo Jurídico ou pelo Gerente financeiro.');
  const [proc] = await ler(`SELECT ID, FILIAL, CARD_ID FROM CC_PROCESSO WHERE CLIENTE_ID = ${inteiro(cliente.ID)} AND ${inteiro(event.processoId) ? `ID = ${inteiro(event.processoId)}` : `CARTEIRA = ${q(carteira)} AND ENCERRADO_EM IS NULL`} ORDER BY ID DESC LIMIT 1`);
  const filial = await filialDoDocumento(texto(event.filial, 10) || (proc && proc.FILIAL) || '', m, cliente.ID, carteira);
  if (filial && filial.erro) return recusar(filial.erro);
  if (!filial || !filial.RAZAO_SOCIAL || digitos(filial.CNPJ).length !== 14) return recusar('A filial credora precisa ter razão social e CNPJ cadastrados.');
  const hojeData = hoje();
  const prazoDias = inteiro(event.prazoDias) || Number(p['jur.notifPrazoDias']);
  const prazoAte = somarDias(hojeData, prazoDias);
  const enc = await encargosDe(m, cliente.ID, carteira, hojeData);
  if (enc && enc.ok === false) return recusar(enc.error);
  let caso = null;
  try { [caso] = await ler(`SELECT ID, CARD_ID FROM CC_COBRANCA WHERE CLIENTE_ID = ${inteiro(cliente.ID)} AND ${inteiro(event.cobrancaId) ? `ID = ${inteiro(event.cobrancaId)}` : `CARTEIRA = ${q(carteira)} AND ENCERRADO_EM IS NULL`}`); } catch { caso = null; }
  await escrever('ccEscJurNotificacaoInserir', { clienteId: inteiro(cliente.ID), processoId: proc ? inteiro(proc.ID) : 0, cobrancaId: caso ? inteiro(caso.ID) : 0,
    filial: filial.CODIGO, prazoAte, principal: enc.principal, multa: enc.multa, juros: enc.juros, correcao: enc.correcao, total: enc.total, membroId: m.membroId });
  const [nova] = await ler(`SELECT * FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE CLIENTE_ID = ${inteiro(cliente.ID)} AND EMITIDA_POR = ${m.membroId} AND EMITIDA_EM = ${q(hojeData)} ORDER BY ID DESC LIMIT 1`);
  if (!nova) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Jurídico', 'NOTIFICACAO', nova.ID, cliente.ID, [{ campo: '(criação)', antes: '', depois: `filial ${filial.CODIGO} · ${Number(enc.total).toFixed(2)} · prazo ${prazoAte}` }], m);
  let email = null;
  if (inteiro(event.enviarEmail) === 1) {
    try {
      const doc = await prepararNotificacao(m, cliente, carteira, filial, prazoDias, enc);
      email = doc.erro ? { ok: false, error: doc.erro } : await escrever('ccEmailEnviar', { codigo: 'JUR_NOTIF_EXTRAJUDICIAL', clienteId: inteiro(cliente.ID), contatoId: inteiro(event.contatoId),
        para: '', assunto: doc.assunto, corpo: doc.texto, extras: JSON.stringify({ carteira }), anexos: '[]', origem: '003-notificacao', referencia: `notificacao:${nova.ID}`, membroId: m.membroId });
    } catch (e) { email = { ok: false, error: String((e && e.message) || e) }; }
  }
  const usuarioId = await usuarioDe(m);
  const nota = `Notificação extrajudicial emitida: total ${brl(enc.total)}, prazo até ${dataBr(prazoAte)}.`;
  if (caso && caso.CARD_ID) await kbNotaProc(caso.CARD_ID, nota, usuarioId);
  if (proc && proc.CARD_ID) {
    // DT-34 regra 4: só anota no card do processo quem escreve nele (responsável do dossiê ainda não enviado, membro ou administrador do quadro).
    const pr = await procPorId(proc.ID);
    const escreve = podeAdministrar(m) || ['SUPERVISOR', 'JURIDICO'].includes(m.cargo) || (!pr.DOSSIE_ENVIADO_EM && inteiro(pr.CARD_RESPONSAVEL) === usuarioId);
    if (escreve) await kbNotaProc(proc.CARD_ID, nota, usuarioId);
  }
  return { ok: true, notificacaoId: inteiro(nova.ID), prazoAte, principal: enc.principal, multa: enc.multa, juros: enc.juros, correcao: enc.correcao, total: enc.total,
    ...(email ? { email } : {}) };
};

const corpoDemonstrativo = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  let clienteId = inteiro(event.clienteId);
  let carteira = texto(event.carteira, 10).toUpperCase();
  if (inteiro(event.processoId)) {
    const pr = await procPorId(event.processoId);
    if (!pr || !vePro(m, pr) || !pr.CLIENTE_ID) return recusar('Processo não encontrado.');
    clienteId = inteiro(pr.CLIENTE_ID);
    carteira = carteira || pr.CARTEIRA;
  }
  const cliente = await lerCliente(clienteId);
  if (!cliente || !visivel(m, cliente)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (!CARTEIRAS.includes(carteira)) carteira = cliente.SETOR === 'PUBLICO' ? 'PUBLICA' : 'PRIVADA';
  const data = ehData(event.data) ? event.data : hoje();
  const enc = await encargosDe(m, clienteId, carteira, data);
  if (enc && enc.ok === false) return recusar(enc.error);
  const p = await parametros(carteira, data);
  const pctTxt = (v) => String(Number(v)).replace('.', ',');
  return {
    ok: true, cabecalho: { cliente: cliente.NOME, codcli: cliente.CODCLI, documento: documentoFormatado(cliente.DOCUMENTO), carteira, data },
    linhas: enc.linhas || [], principal: enc.principal, multa: enc.multa, juros: enc.juros, correcao: enc.correcao, total: enc.total,
    rotulos: { principal: 'Valor principal', multa: `Multa (${pctTxt(p['enc.multa'])}%)`, juros: `Juros de mora (${pctTxt(p['enc.juros'])}% ao mês, pro rata por título)`,
      correcao: `Correção monetária (${pctTxt(p['enc.correcao'])}% ao mês)`, total: 'Total atualizado' },
    ...(enc.erroWinthor ? { erroWinthor: enc.erroWinthor } : {}),
  };
};

const corpoFilialSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar('Só o Gerente financeiro (ou acima) ou quem administra cadastra a filial credora.');
  const codigo = texto(event.codigo, 10);
  if (!codigo) return recusar('Informe o código da filial (CODFILIAL do Winthor).');
  const cnpj = digitos(event.cnpj);
  if (cnpj && cnpj.length !== 14) return recusar('CNPJ com 14 dígitos.');
  const uf = texto(event.uf, 2).toUpperCase();
  const [antes] = await ler(`SELECT * FROM CC_FILIAL_CREDORA WHERE CODIGO = ${q(codigo)}`);
  const dados = { codigo, razaoSocial: texto(event.razaoSocial, 200), cnpj, endereco: texto(event.endereco, 300), cidadeUf: texto(event.cidadeUf, 60), uf,
    banco: texto(event.banco, 300), representante: texto(event.representante, 120), representanteCargo: texto(event.representanteCargo, 80),
    ativa: event.ativa === undefined || event.ativa === '' ? 1 : (inteiro(event.ativa) === 1 ? 1 : 0) };
  const agoraTxt = agora();
  await escrever('ccEscJurFilialSalvar', { ...dados, membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT * FROM CC_FILIAL_CREDORA WHERE CODIGO = ${q(codigo)}`);
  if (!rel || rel.ATUALIZADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  const cols = [['RAZAO_SOCIAL', 'razaoSocial'], ['CNPJ', 'cnpj'], ['ENDERECO', 'endereco'], ['CIDADE_UF', 'cidadeUf'], ['UF', 'uf'], ['BANCO', 'banco'],
    ['REPRESENTANTE', 'representante'], ['REPRESENTANTE_CARGO', 'representanteCargo']];
  const mud = cols.map(([c, k]) => ({ campo: c, antes: antes ? antes[c] : '', depois: dados[k] })).filter((x) => String(x.antes ?? '') !== String(x.depois ?? ''));
  if (mud.length) await auditar('Jurídico', 'FILIAL_CREDORA', rel.ID, null, mud, m);
  return { ok: true, codigo };
};

/* ── carga inicial ── */

async function cargaConcluida() {
  // Concluída = a linha existe (RF-038: definitiva; a guarda das escritas lê o mesmo, CARGA_ABERTA).
  const [e] = await ler("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'jur.cargaConcluida'");
  return !!e;
}

function linhasDaEntrada() {
  try { const v = typeof event.linhas === 'string' ? JSON.parse(event.linhas) : event.linhas; return Array.isArray(v) ? v : (v ? [v] : []); } catch { return null; }
}

/** Revalida, recalcula a chave e o vínculo, resolve a filial e decide a ação de um processo interpretado. */
async function prepararLinha(bruta, clientes, filiais) {
  const fases = FASES.map((f) => f.chave).filter((f) => f !== 'dossie');
  const { motivos, linha } = validarProcesso(bruta, fases, hoje());
  const chave = chaveDaCarga(linha);
  const alertas = [...motivos];
  const autos = validarAutos(linha.autos);
  if (!autos.ok) alertas.push(`Nº dos autos fora do padrão CNJ: ${linha.autos}.`);
  if (linha.divergencia) alertas.push(linha.divergencia);
  const fil = resolverFilial(linha.uf, filiais);
  if (fil.aviso) alertas.push(fil.aviso);
  const vinc = sugerirCliente(linha, clientes);
  const [existente] = await ler(`SELECT P.ID, P.CARD_ID, (SELECT COUNT(*) FROM CC_PROCESSO_ANDAMENTO A WHERE A.PROCESSO_ID = P.ID) AS N_ANDAMENTOS,
  (SELECT COUNT(*) FROM CC_ACORDO_JUDICIAL AJ WHERE AJ.PROCESSO_ID = P.ID) AS N_ACORDOS,
  (SELECT COUNT(*) FROM CC_PROCESSO_CUSTO X WHERE X.PROCESSO_ID = P.ID) AS N_CUSTOS FROM CC_PROCESSO P WHERE P.CHAVE_CARGA = ${q(chave)}`);
  return { linha, chave, alertas, motivos, autos, filial: fil.filial, avisoFilial: fil.aviso, vinculo: vinc, existente: existente || null,
    acao: motivos.length ? 'IGNORA' : decidirAcao(linha, existente) };
}

async function clientesDaCarga() {
  // ponytail: a semelhança lê ID, CODCLI e NOME de até 5.000 clientes por chamada; acima disso, pré-filtrar por palavra do nome em NOME_BUSCA.
  return ler('SELECT ID, CODCLI, NOME FROM CC_CLIENTE ORDER BY ID LIMIT 5000');
}

const corpoCargaPrevia = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: a carga inicial é do Jurídico, do Gerente, da Diretoria e de quem administra.');
  if (await cargaConcluida()) return recusar('A carga inicial já foi concluída.');
  const linhas = linhasDaEntrada();
  if (!linhas || !linhas.length) return recusar('Informe os processos da planilha.');
  if (linhas.length > 5) return recusar('A prévia aceita até 5 processos por chamada.');
  const clientes = await clientesDaCarga();
  const filiais = await ler('SELECT CODIGO, UF, ATIVA FROM CC_FILIAL_CREDORA');
  const saida = [];
  for (const l of linhas) {
    const x = await prepararLinha(l, clientes, filiais);
    saida.push({ chave: x.chave, acao: x.acao, alertas: x.alertas, candidatos: x.vinculo.candidatos.map(({ semelhanca: s, ...c }) => ({ ...c, semelhanca: Math.round(s * 100) / 100 })) });
  }
  return { ok: true, linhas: saida };
};

const corpoCargaAplicar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: a carga inicial é do Jurídico, do Gerente, da Diretoria e de quem administra.');
  if (await cargaConcluida()) return recusar('A carga inicial já foi concluída.');
  const linhas = linhasDaEntrada();
  if (!linhas || linhas.length !== 1) return recusar('A aplicação recebe um processo por chamada.');
  const clientes = await clientesDaCarga();
  const filiais = await ler('SELECT CODIGO, UF, ATIVA FROM CC_FILIAL_CREDORA');
  const x = await prepararLinha(linhas[0], clientes, filiais);
  if (x.motivos.length) return recusar(x.motivos[0], { faltam: x.motivos });
  if (x.acao === 'IGNORA') return { ok: true, acao: 'IGNORA', chave: x.chave, processoId: inteiro(x.existente.ID) };
  const l = x.linha;
  const agoraTxt = agora();
  const usuarioId = await usuarioDe(m);
  // Vínculo: clienteId da tela vale se existe (candidato, busca ou sugestão confirmada); senão o código; senão sugestão por nome.
  const escolhido = l.clienteId ? clientes.find((c) => inteiro(c.ID) === l.clienteId) : null;
  const clienteId = escolhido ? inteiro(escolhido.ID) : x.vinculo.clienteId;
  const cliente = clienteId ? await lerCliente(clienteId) : null;
  let processoId = x.existente ? inteiro(x.existente.ID) : 0;
  if (!processoId) {
    const encerrado = l.faseChave === 'encerrado';
    const datas = l.andamentos.map((a) => a.data).sort();
    await escrever('ccEscJurProcessoInserir', {
      origem: 'CARGA', clienteId: clienteId || 0, nomeDevedor: l.nomeDevedor, documento: (cliente && digitos(cliente.DOCUMENTO)) || l.documento,
      setor: cliente ? cliente.SETOR || 'PRIVADO' : l.setor, carteira: l.carteira, buId: clienteId ? await buDoCliente(clienteId, l.carteira) : 0, linha: l.linha,
      filial: x.filial, valor: l.valor, autos: x.autos.ok ? x.autos.autos : '', tribunal: l.tribunal, responsavelId: 0, status: l.status, prazo: '', prazoDescricao: '',
      substabelecer: l.substabelecer, obs: '', chaveCarga: x.chave, alertaCarga: texto(x.alertas.join(' · '), 1000),
      sugestaoClientes: clienteId ? '' : x.vinculo.candidatos.map((c) => c.clienteId).join(',').slice(0, 200),
      encerradoEm: encerrado ? agoraTxt : '', motivo: encerrado ? l.motivo : '', motivoTexto: encerrado && l.motivo === 'OUTRO' ? texto(l.status, 300) : '',
      ultimoAndamentoEm: datas.length ? `${datas[datas.length - 1]}T12:00:00` : '', membroId: m.membroId, agora: agoraTxt,
    });
    const [novo] = await ler(`SELECT ID FROM CC_PROCESSO WHERE CHAVE_CARGA = ${q(x.chave)}`);
    if (!novo) return recusar(MSG.SEM_PERMISSAO);
    processoId = inteiro(novo.ID);
  }
  let pr = await procPorId(processoId);
  const feito = { card: false, andamentos: 0, custos: 0, acordo: false };
  if (!pr.CARD_ID) {
    const destino = pr.ENCERRADO_EM ? 'encerrado' : l.faseChave;
    const card = await criarCard({ ...pr, _membroId: m.membroId }, usuarioId, usuarioId, destino);
    feito.card = !!card.ok;
    pr = await procPorId(processoId);
  }
  const [nAnd] = await ler(`SELECT COUNT(*) AS N FROM CC_PROCESSO_ANDAMENTO WHERE PROCESSO_ID = ${processoId}`);
  if (l.andamentos.length && !inteiro(nAnd.N)) {
    await escrever('ccEscJurAndamentosInserir', { processoId, n: l.andamentos.length, ems: lista(l.andamentos, (a) => `${a.data}T12:00:00`),
      periodos: lista(l.andamentos, (a) => a.periodo), textos: lista(l.andamentos, (a) => a.texto), autores: lista(l.andamentos, (a) => a.autor), tipo: 'CARGA', membroId: m.membroId });
    const ult = l.andamentos.map((a) => a.data).sort().pop();
    if (x.existente) await escrever('ccEscJurProcessoCarga', { processoId, conferir: 0, ultimoAndamentoEm: `${ult}T12:00:00`, membroId: m.membroId, agora: agoraTxt });
    feito.andamentos = l.andamentos.length;
  }
  const [nCus] = await ler(`SELECT COUNT(*) AS N FROM CC_PROCESSO_CUSTO WHERE PROCESSO_ID = ${processoId}`);
  const custosOk = l.custos.filter((c) => TIPOS_CUSTO.some((t) => t.codigo === c.tipo));
  if (custosOk.length && !inteiro(nCus.N)) {
    await escrever('ccEscJurCustosInserir', { processoId, n: custosOk.length, tipos: lista(custosOk, (c) => c.tipo), datas: lista(custosOk, (c) => c.data),
      valores: lista(custosOk, (c) => c.valor.toFixed(2)), obss: lista(custosOk, (c) => c.obs), pagos: lista(custosOk, (c) => c.pago), guias: lista(custosOk, () => 0),
      comprovantes: lista(custosOk, () => 0), membroId: m.membroId, agora: agoraTxt });
    feito.custos = custosOk.length;
  }
  const [nAc] = await ler(`SELECT COUNT(*) AS N FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ${processoId}`);
  if (l.acordo && !inteiro(nAc.N)) {
    const p = await parametros(l.carteira);
    const a = l.acordo;
    const honorarios = a.honorarios > 0 ? a.honorarios : Math.round(a.valor * Number(p['jur.honorariosPct'])) / 100;
    const nParc = Math.max(a.nParcelas, ...a.parcelas.map((x2) => x2.numero), 0);
    await escrever('ccEscJurAcordoInserir', { processoId, valor: a.valor, entrada: a.entrada, nParcelas: nParc, honorarios, situacaoTexto: a.situacaoTexto, carga: 1,
      membroId: m.membroId, agora: agoraTxt });
    const [ac] = await ler(`SELECT ID FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ${processoId} ORDER BY ID DESC LIMIT 1`);
    if (ac) {
      await gravarParcelas(inteiro(ac.ID), a.parcelas.map((x2) => ({ ...x2, pagoEm: x2.situacao === 'PAGA' ? (x2.vencimento <= hoje() ? x2.vencimento : hoje()) : '' })), m, 'COR_PLANILHA');
      feito.acordo = true;
    }
  }
  if (clienteId && !pr.ENCERRADO_EM) await marcarNoJuridico(clienteId, m);
  await auditar('Carga do Jurídico', 'PROCESSO', processoId, clienteId || null, [{ campo: x.existente ? 'Carga (complemento)' : '(criação)', antes: '',
    depois: `${x.chave} · ${l.faseChave} · ${l.valor.toFixed(2)}${feito.andamentos ? ` · ${feito.andamentos} andamento(s)` : ''}${feito.acordo ? ' · acordo' : ''}` }], m);
  return { ok: true, acao: x.acao, chave: x.chave, processoId, clienteId: clienteId || 0, alertas: x.alertas, ...feito };
};

const corpoCargaConferir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!jur(m)) return recusar('Sem permissão: a conferência da carga é do Jurídico.');
  const pr = await procPorId(event.processoId);
  if (!pr || pr.ORIGEM !== 'CARGA') return recusar('Processo da carga não encontrado.');
  if (pr.CARGA_CONFERIDA_EM) return { ok: true, processoId: inteiro(pr.ID), jaConferido: true };
  const agoraTxt = agora();
  await escrever('ccEscJurProcessoCarga', { processoId: inteiro(pr.ID), conferir: 1, ultimoAndamentoEm: '', membroId: m.membroId, agora: agoraTxt });
  const rel = await procPorId(pr.ID);
  if (!rel.CARGA_CONFERIDA_EM) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Carga do Jurídico', 'PROCESSO', pr.ID, pr.CLIENTE_ID, [{ campo: 'Pendência conferida', antes: pr.ALERTA_CARGA || '', depois: 'conferida' }], m);
  await kbAtualizarProc(rel, await usuarioDe(m));
  return { ok: true, processoId: inteiro(pr.ID) };
};

const corpoCargaConcluir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar('Só o Gerente financeiro (ou acima) ou quem administra conclui a carga inicial.');
  if (await cargaConcluida()) return { ok: true, jaConcluida: true };
  await escrever('ccEscBaseEstado', { chave: 'jur.cargaConcluida', valor: '1', membroId: m.membroId, agora: agora() });
  if (!(await cargaConcluida())) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Carga do Jurídico', 'ESTADO', 0, null, [{ campo: 'jur.cargaConcluida', antes: '', depois: '1' }], m);
  return { ok: true };
};

/* ── leituras SQL ── */

const OBRIG = [...new Set(DOCUMENTOS.filter((d) => d.obrigatorio).map((d) => `'${d.codigo}'`))].join(', ');
const PROC_VISIVEL = `(EU.VE_TUDO = 1 OR EU.CARGO = 'JURIDICO' OR (P.CLIENTE_ID IS NOT NULL AND ${clienteVisivel('C')}))`;
const EU_JUR = `(EU.CARGO = 'JURIDICO' OR ${podeAdministrarEm('EU')})`;
const HOJE = HOJE_SQL;
const ACORDO_DO_PROC = (p) => `(SELECT MAX(AJX.ID) FROM CC_ACORDO_JUDICIAL AJX WHERE AJX.PROCESSO_ID = ${p}.ID AND AJX.SITUACAO <> 'RECUSADO')`;
const SOMA_PARC = (cond) => `COALESCE((SELECT SUM(PA.VALOR) FROM CC_ACORDO_JUDICIAL_PARCELA PA WHERE PA.ACORDO_ID = AJ.ID AND ${cond}), 0)`;
const CONTA_PARC = (cond) => `(SELECT COUNT(*) FROM CC_ACORDO_JUDICIAL_PARCELA PA WHERE PA.ACORDO_ID = AJ.ID AND ${cond})`;
const CUSTO_DO = (p, cond = 'TRUE') => `COALESCE((SELECT SUM(X.VALOR) FROM CC_PROCESSO_CUSTO X WHERE X.PROCESSO_ID = ${p}.ID AND X.REMOVIDO_EM IS NULL AND ${cond}), 0)`;
const DIAS_DESDE = (col) => `DATEDIFF(${HOJE}, SUBSTRING(${col}, 1, 10))`;
const BUSCA_PROC = `CONCAT(UPPER(P.NOME_DEVEDOR), ' ', P.DOCUMENTO, ' ', P.AUTOS, ' ', REPLACE(REPLACE(P.AUTOS, '-', ''), '.', ''), ' ', UPPER(P.TRIBUNAL), ' ',
  UPPER(P.STATUS), ' ', UPPER(COALESCE(R.NOME, '')), ' ', COALESCE(C.NOME_BUSCA, ''), ' ', CAST(COALESCE(C.CODCLI, 0) AS CHAR))`;

const FROM_PROC = `FROM CC_PROCESSO P
LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
LEFT JOIN KB_FASE KF ON KF.ID = K.FASE_ID
LEFT JOIN CC_BU B ON B.ID = P.BU_ID
LEFT JOIN CC_MEMBRO R ON R.ID = P.RESPONSAVEL_ID
LEFT JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = ${ACORDO_DO_PROC('P')}
${EU}`;

const FILTRO_PROC = `${PROC_VISIVEL}
  AND ('{{faseChave}}' = '' OR F.CHAVE = '{{faseChave}}')
  AND ('{{carteira}}' = '' OR P.CARTEIRA = '{{carteira}}')
  AND ('{{filial}}' = '' OR P.FILIAL = '{{filial}}')
  AND ({{buId}} = -1 OR P.BU_ID = {{buId}})
  AND ('{{linha}}' = '' OR ('{{linha}}' = 'GALDERMA' AND P.LINHA = 'GALDERMA') OR ('{{linha}}' = 'DEMAIS' AND P.LINHA <> 'GALDERMA'))
  AND ('{{grupo}}' = '' OR ('{{grupo}}' = 'ENCERRADO' AND P.ENCERRADO_EM IS NOT NULL) OR ('{{grupo}}' = 'ANDAMENTO' AND P.ENCERRADO_EM IS NULL AND P.AUTOS <> '')
    OR ('{{grupo}}' = 'AJUIZAR' AND P.ENCERRADO_EM IS NULL AND P.AUTOS = ''))
  AND ('{{situacao}}' = '' OR ('{{situacao}}' = 'ATIVO' AND P.ENCERRADO_EM IS NULL) OR ('{{situacao}}' = 'ENCERRADO' AND P.ENCERRADO_EM IS NOT NULL))
  AND ({{responsavelId}} = 0 OR P.RESPONSAVEL_ID = {{responsavelId}})
  AND ({{semAndamentoDias}} = 0 OR (P.ENCERRADO_EM IS NULL AND P.ULTIMO_ANDAMENTO_EM IS NOT NULL AND ${DIAS_DESDE('P.ULTIMO_ANDAMENTO_EM')} > {{semAndamentoDias}}))
  AND ({{valorDe}} = 0 OR P.VALOR >= {{valorDe}}) AND ({{valorAte}} = 0 OR P.VALOR <= {{valorAte}})
  AND ('{{busca}}' = '' OR ${BUSCA_PROC} LIKE CONCAT('%', '{{busca}}', '%'))`;

const SQL_PROCESSO_LISTAR = `SELECT P.ID, P.CARD_ID, P.CLIENTE_ID, C.CODCLI, P.NOME_DEVEDOR, P.DOCUMENTO, P.SETOR, P.CARTEIRA, P.BU_ID, COALESCE(B.NOME, 'Sem BU') AS BU_NOME,
  P.LINHA, P.FILIAL, P.TRIBUNAL, P.STATUS, P.SUBSTABELECER, COALESCE(F.CHAVE, '') AS FASE_CHAVE, COALESCE(KF.NOME, '') AS FASE_NOME, P.AUTOS, P.VALOR,
  P.VALOR_ATUALIZADO, P.PRAZO, P.PRAZO_DESCRICAO, CASE WHEN P.PRAZO IS NULL THEN NULL ELSE DATEDIFF(P.PRAZO, ${HOJE}) END AS DIAS_PRAZO,
  P.ULTIMO_ANDAMENTO_EM, CASE WHEN P.ULTIMO_ANDAMENTO_EM IS NULL THEN NULL ELSE ${DIAS_DESDE('P.ULTIMO_ANDAMENTO_EM')} END AS DIAS_SEM_ANDAMENTO,
  ${CUSTO_DO('P')} AS CUSTO_TOTAL, COALESCE(R.NOME, '') AS RESPONSAVEL_NOME, P.MOTIVO_ENCERRAMENTO, P.ENCERRADO_EM,
  (SELECT COUNT(*) FROM CC_DOSSIE_ITEM I WHERE I.PROCESSO_ID = P.ID AND I.ITEM IN (${OBRIG}) AND (I.SITUACAO = 'OK' OR (I.SITUACAO = 'NA' AND I.OBS <> ''))) AS DOSSIE_OK,
  (SELECT COUNT(*) FROM CC_DOSSIE_ITEM I WHERE I.PROCESSO_ID = P.ID AND I.ITEM IN (${OBRIG})) AS DOSSIE_TOTAL,
  COALESCE(AJ.VALOR, 0) AS ACORDO_VALOR, CASE WHEN AJ.ID IS NULL THEN 0 ELSE ${CONTA_PARC("PA.SITUACAO = 'PAGA'")} END AS PARCELAS_PAGAS,
  CASE WHEN AJ.ID IS NULL THEN 0 ELSE ${CONTA_PARC('TRUE')} END AS PARCELAS_TOTAL,
  CASE WHEN AJ.ID IS NULL THEN 0 ELSE ${SOMA_PARC("PA.SITUACAO <> 'PAGA'")} END AS ACORDO_A_RECEBER, P.ALERTA_CARGA
${FROM_PROC}
WHERE ${FILTRO_PROC}
ORDER BY CASE WHEN P.PRAZO IS NULL THEN 1 ELSE 0 END, P.PRAZO, P.VALOR DESC, P.ID
LIMIT {{limite}} OFFSET {{offset}}`;

const GRUPO_COND = { ANDAMENTO: "P.ENCERRADO_EM IS NULL AND P.AUTOS <> ''", AJUIZAR: "P.ENCERRADO_EM IS NULL AND P.AUTOS = ''", ENCERRADO: 'P.ENCERRADO_EM IS NOT NULL' };
const SQL_PROCESSO_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(P.VALOR), 0) AS VALOR,
  ${Object.entries(GRUPO_COND).map(([g, c]) => `COALESCE(SUM(CASE WHEN ${c} THEN 1 ELSE 0 END), 0) AS TOTAL_${g}, COALESCE(SUM(CASE WHEN ${c} THEN P.VALOR ELSE 0 END), 0) AS VALOR_${g}`).join(',\n  ')}
${FROM_PROC}
WHERE ${FILTRO_PROC}`;

const PROC_DE = (x) => `EXISTS (SELECT 1 FROM CC_PROCESSO P LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE P.ID = ${x} AND ${PROC_VISIVEL})`;

const SQL_ANDAMENTO_LISTAR = `SELECT A.ID, A.PROCESSO_ID, A.EM, A.PERIODO, A.TEXTO, A.AUTOR_ID, COALESCE(M.NOME, A.AUTOR_NOME) AS AUTOR_NOME, A.TIPO
FROM CC_PROCESSO_ANDAMENTO A LEFT JOIN CC_MEMBRO M ON M.ID = A.AUTOR_ID ${EU}
WHERE A.PROCESSO_ID = {{processoId}} AND ${PROC_DE('A.PROCESSO_ID')}
ORDER BY A.EM DESC, A.ID DESC LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_ANDAMENTO_TOTAL = `SELECT COUNT(*) AS TOTAL FROM CC_PROCESSO_ANDAMENTO A ${EU} WHERE A.PROCESSO_ID = {{processoId}} AND ${PROC_DE('A.PROCESSO_ID')}`;

const FROM_CUSTO = `FROM CC_PROCESSO_CUSTO X JOIN CC_PROCESSO P ON P.ID = X.PROCESSO_ID LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID ${EU}`;
const FILTRO_CUSTO = `X.REMOVIDO_EM IS NULL AND ${PROC_VISIVEL} AND ({{processoId}} = 0 OR X.PROCESSO_ID = {{processoId}})
  AND ({{pago}} = -1 OR ({{pago}} = 1 AND X.PAGO = TRUE) OR ({{pago}} = 0 AND X.PAGO = FALSE))
  AND ('{{carteira}}' = '' OR P.CARTEIRA = '{{carteira}}') AND ('{{filial}}' = '' OR P.FILIAL = '{{filial}}')
  AND ({{semComprovante}} = 0 OR (X.PAGO = TRUE AND X.COMPROVANTE_KB_ANEXO_ID IS NULL))
  AND ('{{busca}}' = '' OR CONCAT(UPPER(P.NOME_DEVEDOR), ' ', X.TIPO, ' ', UPPER(X.OBS)) LIKE CONCAT('%', '{{busca}}', '%'))`;
const ANTIGO = `(X.PAGO = FALSE AND DATEDIFF(${HOJE}, X.DATA) > ${PARAM_NUM('jur.custoAPagarAntigoDias')})`;
const SQL_CUSTO_LISTAR = `SELECT X.ID, X.PROCESSO_ID, X.TIPO, ${GRUPO_SQL('X.TIPO')} AS GRUPO, X.DATA, X.VALOR, X.OBS, X.PAGO, X.GUIA_KB_ANEXO_ID, X.COMPROVANTE_KB_ANEXO_ID,
  X.CRIADO_EM, X.CRIADO_POR, P.NOME_DEVEDOR, P.CARTEIRA, P.FILIAL, P.VALOR AS VALOR_PROCESSO, CASE WHEN ${ANTIGO} THEN 1 ELSE 0 END AS A_PAGAR_ANTIGO
${FROM_CUSTO}
WHERE ${FILTRO_CUSTO}
ORDER BY X.DATA DESC, X.ID DESC LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_CUSTO_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(X.VALOR), 0) AS VALOR, COALESCE(SUM(CASE WHEN X.PAGO = TRUE THEN X.VALOR ELSE 0 END), 0) AS PAGO,
  COALESCE(SUM(CASE WHEN X.PAGO = FALSE THEN X.VALOR ELSE 0 END), 0) AS A_PAGAR
${FROM_CUSTO}
WHERE ${FILTRO_CUSTO}`;
const SQL_CUSTO_RESUMO = `SELECT COALESCE(SUM(X.VALOR), 0) AS TOTAL, COALESCE(SUM(CASE WHEN X.PAGO = TRUE THEN X.VALOR ELSE 0 END), 0) AS PAGO,
  COALESCE(SUM(CASE WHEN X.PAGO = FALSE THEN X.VALOR ELSE 0 END), 0) AS A_PAGAR, COALESCE(SUM(CASE WHEN ${ANTIGO} THEN 1 ELSE 0 END), 0) AS A_PAGAR_ANTIGO,
  CASE WHEN COALESCE((SELECT SUM(P2.VALOR) FROM CC_PROCESSO P2 WHERE ({{processoId}} = 0 AND P2.ENCERRADO_EM IS NULL) OR P2.ID = {{processoId}}), 0) > 0
    THEN ROUND(100.0 * COALESCE(SUM(X.VALOR), 0) / (SELECT SUM(P2.VALOR) FROM CC_PROCESSO P2 WHERE ({{processoId}} = 0 AND P2.ENCERRADO_EM IS NULL) OR P2.ID = {{processoId}}), 2)
    ELSE 0 END AS PCT_DO_VALOR
FROM CC_PROCESSO_CUSTO X JOIN CC_PROCESSO P ON P.ID = X.PROCESSO_ID LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID ${EU}
WHERE X.REMOVIDO_EM IS NULL AND ${PROC_VISIVEL} AND ({{processoId}} = 0 OR X.PROCESSO_ID = {{processoId}})`;

const FROM_ACORDO = `FROM CC_ACORDO_JUDICIAL AJ JOIN CC_PROCESSO P ON P.ID = AJ.PROCESSO_ID LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID ${EU}`;
const FILTRO_ACORDO = `${PROC_VISIVEL} AND ({{processoId}} = 0 OR AJ.PROCESSO_ID = {{processoId}}) AND ('{{situacao}}' = '' OR AJ.SITUACAO = '{{situacao}}')
  AND ('{{carteira}}' = '' OR P.CARTEIRA = '{{carteira}}') AND ('{{filial}}' = '' OR P.FILIAL = '{{filial}}')
  AND ('{{busca}}' = '' OR UPPER(P.NOME_DEVEDOR) LIKE CONCAT('%', '{{busca}}', '%'))`;
const SQL_ACORDO_LISTAR = `SELECT AJ.ID, AJ.PROCESSO_ID, AJ.VALOR, AJ.ENTRADA, AJ.N_PARCELAS, AJ.HONORARIOS, AJ.HONORARIOS_PAGOS, AJ.HONORARIOS_PAGOS_EM, AJ.SITUACAO,
  AJ.SITUACAO_TEXTO, AJ.ACIMA_ALCADA, AJ.NIVEL_EXIGIDO, AJ.REGISTRADO_POR, AJ.REGISTRADO_EM, AJ.APROVADO_POR, AJ.APROVADO_EM,
  COALESCE(MR.NOME, '') AS REGISTRADO_POR_NOME, COALESCE(MA.NOME, '') AS APROVADO_POR_NOME, P.NOME_DEVEDOR, P.CARTEIRA, P.FILIAL, P.CARD_ID,
  ${CONTA_PARC("PA.SITUACAO = 'PAGA'")} AS PARCELAS_PAGAS, ${CONTA_PARC('TRUE')} AS PARCELAS_TOTAL,
  ${CONTA_PARC(`PA.SITUACAO = 'ABERTA' AND PA.VENCIMENTO < ${HOJE}`)} AS PARCELAS_VENCIDAS,
  ${SOMA_PARC("PA.SITUACAO <> 'PAGA'")} AS A_RECEBER,
  (SELECT MIN(PA.VENCIMENTO) FROM CC_ACORDO_JUDICIAL_PARCELA PA WHERE PA.ACORDO_ID = AJ.ID AND PA.SITUACAO <> 'PAGA') AS PROXIMA_PARCELA
FROM CC_ACORDO_JUDICIAL AJ JOIN CC_PROCESSO P ON P.ID = AJ.PROCESSO_ID LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
LEFT JOIN CC_MEMBRO MR ON MR.ID = AJ.REGISTRADO_POR LEFT JOIN CC_MEMBRO MA ON MA.ID = AJ.APROVADO_POR ${EU}
WHERE ${FILTRO_ACORDO}
ORDER BY AJ.ID DESC LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_ACORDO_TOTAL = `SELECT COUNT(*) AS TOTAL,
  COALESCE(SUM(CASE WHEN AJ.SITUACAO = 'ANDAMENTO' THEN ${SOMA_PARC("PA.SITUACAO <> 'PAGA'")} ELSE 0 END), 0) AS VALOR_A_RECEBER,
  COALESCE(SUM(CASE WHEN AJ.SITUACAO = 'AGUARDANDO' THEN 1 ELSE 0 END), 0) AS AGUARDANDO,
  COALESCE(SUM(CASE WHEN AJ.SITUACAO = 'AGUARDANDO' THEN AJ.VALOR ELSE 0 END), 0) AS VALOR_AGUARDANDO
${FROM_ACORDO}
WHERE ${FILTRO_ACORDO}`;
const SQL_PARCELA_LISTAR = `SELECT PA.ID, PA.ACORDO_ID, PA.NUMERO, PA.VALOR, PA.VENCIMENTO, PA.SITUACAO, PA.PAGO_EM, PA.ORIGEM_SITUACAO,
  CASE WHEN PA.SITUACAO = 'ABERTA' AND PA.VENCIMENTO < ${HOJE} THEN 1 ELSE 0 END AS VENCIDA
FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = PA.ACORDO_ID ${EU}
WHERE PA.ACORDO_ID = {{acordoId}} AND ${PROC_DE('AJ.PROCESSO_ID')}
ORDER BY PA.NUMERO LIMIT 500`;

const MES = `(CASE WHEN '{{mes}}' = '' THEN SUBSTRING(${HOJE}, 1, 7) ELSE '{{mes}}' END)`;
const PAGO_EM_PERIODO = (tam) => `COALESCE((SELECT SUM(PA.VALOR) FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ2 ON AJ2.ID = PA.ACORDO_ID
    WHERE AJ2.PROCESSO_ID = P.ID AND AJ2.SITUACAO <> 'RECUSADO' AND PA.SITUACAO = 'PAGA' AND SUBSTRING(PA.PAGO_EM, 1, ${tam}) = SUBSTRING(${MES}, 1, ${tam})), 0)`;
const PAGO_TOTAL = `COALESCE((SELECT SUM(PA.VALOR) FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ2 ON AJ2.ID = PA.ACORDO_ID
    WHERE AJ2.PROCESSO_ID = P.ID AND AJ2.SITUACAO <> 'RECUSADO' AND PA.SITUACAO = 'PAGA'), 0)`;
// Encerramento datado: o processo que já veio encerrado da carga (ENCERRADO_EM = CRIADO_EM, sem data real na planilha) não entra
// no mês nem no ano da carga; o total (RECUPERADO) continua com ele.
const ENC_NO_PERIODO = (tam) => `(SUBSTRING(COALESCE(P.ENCERRADO_EM, ''), 1, ${tam}) = SUBSTRING(${MES}, 1, ${tam})
    AND NOT (P.ORIGEM = 'CARGA' AND P.ENCERRADO_EM = P.CRIADO_EM))`;
const REC_PERIODO = (tam) => `CASE WHEN P.RECUPERADO_INFORMADO IS NOT NULL THEN (CASE WHEN ${ENC_NO_PERIODO(tam)} THEN P.RECUPERADO_INFORMADO ELSE 0 END)
    ELSE ${PAGO_EM_PERIODO(tam)} + (CASE WHEN P.MOTIVO_ENCERRAMENTO = 'QUITADO' AND ${PAGO_TOTAL} = 0 AND ${ENC_NO_PERIODO(tam)}
      THEN P.VALOR ELSE 0 END) END`;
const SQL_RESUMO = `SELECT COALESCE(SUM(X.ATIVO), 0) AS ATIVOS, COALESCE(SUM(CASE WHEN X.ATIVO = 1 AND X.FASE = 'dossie' THEN 1 ELSE 0 END), 0) AS EM_DOSSIE,
  COALESCE(SUM(X.ATIVO * X.VALOR), 0) AS VALOR_EM_CAUSA,
  COALESCE(SUM(CASE WHEN X.ATIVO = 1 AND X.PRAZO IS NOT NULL AND DATEDIFF(X.PRAZO, ${HOJE}) <= ${PARAM_NUM('jur.prazoAmareloDias')} THEN 1 ELSE 0 END), 0) AS PRAZOS_VENCENDO,
  COALESCE(SUM(X.PARADO), 0) AS SEM_ANDAMENTO, COALESCE(SUM(X.CUSTO), 0) AS CUSTO_TOTAL, COALESCE(SUM(X.A_PAGAR), 0) AS CUSTO_A_PAGAR,
  COALESCE(SUM(X.RECUPERADO), 0) AS RECUPERADO,
  COALESCE(SUM(CASE WHEN X.ATIVO = 1 AND X.AUTOS = '' THEN 1 ELSE 0 END), 0) AS AJUIZAR,
  COALESCE(SUM(CASE WHEN X.ATIVO = 1 AND X.AUTOS = '' THEN X.VALOR ELSE 0 END), 0) AS VALOR_AJUIZAR, COALESCE(SUM(X.ATIVO * X.VALOR), 0) AS VALOR_ATIVOS,
  COALESCE(SUM(CASE WHEN X.AC_SITUACAO = 'ANDAMENTO' AND X.AC_ABERTO > 0 THEN 1 ELSE 0 END), 0) AS ACORDOS_A_RECEBER,
  COALESCE(SUM(CASE WHEN X.AC_SITUACAO = 'ANDAMENTO' THEN X.AC_ABERTO ELSE 0 END), 0) AS VALOR_ACORDOS_A_RECEBER,
  COALESCE(SUM(CASE WHEN X.AC_SITUACAO = 'ANDAMENTO' AND X.AC_VENCIDO > 0 THEN 1 ELSE 0 END), 0) AS ACORDOS_PARCELA_VENCIDA,
  COALESCE(SUM(CASE WHEN X.AC_SITUACAO = 'ANDAMENTO' THEN X.AC_VENCIDO ELSE 0 END), 0) AS VALOR_PARCELA_VENCIDA,
  COALESCE(SUM(X.REC_MES), 0) AS RECUPERADO_MES, COALESCE(SUM(X.REC_ANO), 0) AS RECUPERADO_ANO, COALESCE(SUM(X.CUSTO_MES), 0) AS CUSTO_MES,
  COALESCE(SUM(X.PRAZO_VENCIDO + X.PARADO), 0) AS DESVIOS_PRAZO,
  COALESCE(SUM(CASE WHEN X.PRAZO_VENCIDO = 1 AND DATEDIFF(${HOJE}, X.PRAZO) > ${PARAM_NUM('jur.prazoCriticoDias')} THEN 1 ELSE 0 END
    + CASE WHEN X.PARADO = 1 AND X.DIAS_PARADO > ${PARAM_NUM('jur.paradoCriticoDias')} THEN 1 ELSE 0 END), 0) AS DESVIOS_CRITICOS
FROM (SELECT P.ID, P.VALOR, P.AUTOS, P.PRAZO, COALESCE(F.CHAVE, '') AS FASE, CASE WHEN P.ENCERRADO_EM IS NULL THEN 1 ELSE 0 END AS ATIVO,
    CASE WHEN P.ENCERRADO_EM IS NULL AND P.PRAZO IS NOT NULL AND P.PRAZO < ${HOJE} THEN 1 ELSE 0 END AS PRAZO_VENCIDO,
    CASE WHEN P.ENCERRADO_EM IS NULL AND COALESCE(F.CHAVE, '') NOT IN ('dossie', 'suspenso') AND P.ULTIMO_ANDAMENTO_EM IS NOT NULL
      AND ${DIAS_DESDE('P.ULTIMO_ANDAMENTO_EM')} > ${PARAM_NUM('jur.paradoAtencaoDias')} THEN 1 ELSE 0 END AS PARADO,
    CASE WHEN P.ULTIMO_ANDAMENTO_EM IS NULL THEN 0 ELSE ${DIAS_DESDE('P.ULTIMO_ANDAMENTO_EM')} END AS DIAS_PARADO,
    ${CUSTO_DO('P')} AS CUSTO, ${CUSTO_DO('P', 'X.PAGO = FALSE')} AS A_PAGAR, ${CUSTO_DO('P', `SUBSTRING(X.DATA, 1, 7) = ${MES}`)} AS CUSTO_MES,
    CASE WHEN P.RECUPERADO_INFORMADO IS NOT NULL THEN P.RECUPERADO_INFORMADO WHEN ${PAGO_TOTAL} > 0 THEN ${PAGO_TOTAL}
      WHEN P.ENCERRADO_EM IS NOT NULL AND P.MOTIVO_ENCERRAMENTO = 'QUITADO' THEN P.VALOR ELSE 0 END AS RECUPERADO,
    ${REC_PERIODO(7)} AS REC_MES, ${REC_PERIODO(4)} AS REC_ANO,
    COALESCE(AJ.SITUACAO, '') AS AC_SITUACAO, CASE WHEN AJ.ID IS NULL THEN 0 ELSE ${SOMA_PARC("PA.SITUACAO <> 'PAGA'")} END AS AC_ABERTO,
    CASE WHEN AJ.ID IS NULL THEN 0 ELSE ${SOMA_PARC(`PA.SITUACAO = 'ABERTA' AND PA.VENCIMENTO < ${HOJE}`)} END AS AC_VENCIDO
  FROM CC_PROCESSO P LEFT JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
  LEFT JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = ${ACORDO_DO_PROC('P')}
  ${EU}
  WHERE ${PROC_VISIVEL} AND ('{{carteira}}' = '' OR P.CARTEIRA = '{{carteira}}')
    AND ({{buId}} = -1 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PB WHERE PB.CLIENTE_ID = P.CLIENTE_ID AND PB.BU_ID = {{buId}} AND (PB.VENCIDO + PB.A_VENCER) > 0))) X`;

const SQL_NOTIFICACAO_ULTIMA = `SELECT N.*, M.NOME AS EMITIDA_POR_NOME
FROM CC_NOTIFICACAO_EXTRAJUDICIAL N JOIN CC_CLIENTE C ON C.ID = N.CLIENTE_ID LEFT JOIN CC_MEMBRO M ON M.ID = N.EMITIDA_POR ${EU}
WHERE N.CLIENTE_ID = {{clienteId}} AND ${clienteVisivel('C')}
ORDER BY N.ID DESC LIMIT 1`;

const SQL_FILIAL_LISTAR = `SELECT FC.ID, FC.CODIGO, FC.RAZAO_SOCIAL, FC.CNPJ, FC.ENDERECO, FC.CIDADE_UF, FC.UF, FC.BANCO, FC.REPRESENTANTE, FC.REPRESENTANTE_CARGO,
  FC.ATIVA, FC.ATUALIZADO_EM, FC.ATUALIZADO_POR
FROM CC_FILIAL_CREDORA FC ${EU}
WHERE ({{ativa}} = -1 OR ({{ativa}} = 1 AND FC.ATIVA = TRUE) OR ({{ativa}} = 0 AND FC.ATIVA = FALSE))
ORDER BY FC.CODIGO LIMIT 500`;

const PENDENCIAS = `(SELECT 'ALERTA' AS TIPO, P.ID, 0 AS PARCELA_ID, P.NOME_DEVEDOR, P.DOCUMENTO, P.ALERTA_CARGA, P.SUGESTAO_CLIENTES
  FROM CC_PROCESSO P WHERE P.ORIGEM = 'CARGA' AND P.CARGA_CONFERIDA_EM IS NULL AND P.ALERTA_CARGA <> ''
UNION ALL
SELECT CASE WHEN P.SUGESTAO_CLIENTES <> '' THEN 'SUGESTAO' ELSE 'SEM_CLIENTE' END AS TIPO, P.ID, 0 AS PARCELA_ID, P.NOME_DEVEDOR, P.DOCUMENTO, P.ALERTA_CARGA, P.SUGESTAO_CLIENTES
  FROM CC_PROCESSO P WHERE P.ORIGEM = 'CARGA' AND P.CARGA_CONFERIDA_EM IS NULL AND P.CLIENTE_ID IS NULL
UNION ALL
SELECT 'PARCELA' AS TIPO, P.ID, PA.ID AS PARCELA_ID, P.NOME_DEVEDOR, P.DOCUMENTO, P.ALERTA_CARGA, P.SUGESTAO_CLIENTES
  FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = PA.ACORDO_ID JOIN CC_PROCESSO P ON P.ID = AJ.PROCESSO_ID
  WHERE PA.SITUACAO = 'A_CONFIRMAR') X`;
const SQL_PENDENCIA_LISTAR = `SELECT X.TIPO, X.ID, X.PARCELA_ID, X.NOME_DEVEDOR, X.DOCUMENTO, X.ALERTA_CARGA, X.SUGESTAO_CLIENTES
FROM ${PENDENCIAS} ${EU}
WHERE ${EU_JUR} AND ('{{tipo}}' = '' OR X.TIPO = '{{tipo}}')
ORDER BY X.ID, X.TIPO, X.PARCELA_ID LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_PENDENCIA_TOTAL = `SELECT COUNT(*) AS TOTAL FROM ${PENDENCIAS} ${EU} WHERE ${EU_JUR} AND ('{{tipo}}' = '' OR X.TIPO = '{{tipo}}')`;

/* ── escritas internas (forma A, guarda na SQL) ── */

const JUR = ATOR('{{membroId}}', `(A.CARGO = 'JURIDICO' OR ${PODE_ADMINISTRAR})`);
// Concluída = a linha existe (a base só deixa quem administra gravar '1'; a rotina não mexe nesta chave).
const CARGA_ABERTA = "NOT EXISTS (SELECT 1 FROM CC_ESTADO E WHERE E.CHAVE = 'jur.cargaConcluida')";
const VE_CLIENTE_DE = (expr) => ATOR('{{membroId}}', `EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = ${expr} AND ${clienteVisivelA('C', 'A')})`);
const OBRIG_SEM_ALCADA = [...new Set(DOCUMENTOS.filter((d) => d.obrigatorio && d.codigo !== 'alcada').map((d) => `'${d.codigo}'`))].join(', ');
const FORA = (entrada, n, valor) => `(${entrada} < ${valor} * ${PARAM_NUM('jur.acordoEntradaMinPct')} / 100 OR ${n} > ${PARAM_NUM('jur.acordoParcelasMax')}
    OR ${valor} > ${PARAM_NUM('jur.acordoAlcadaValor')})`;
const FORA_DA_POLITICA = FORA('{{entrada}}', '{{nParcelas}}', '{{valor}}');
const TIPOS_SQL = TIPOS_CUSTO.map((t) => `'${t.codigo}'`).join(', ');
const CODIGOS = (publico) => DOCUMENTOS.filter((d) => (publico ? d.publico : d.privado)).map((d) => `'${d.codigo}'`).join(', ');
/** Dossiê vindo da cobrança: o valor de entrada não vale; vale o derivado (B-01). */
const DA_COBRANCA = (derivado, entrada) => `CASE WHEN '{{origem}}' = 'COBRANCA' THEN ${derivado} ELSE ${entrada} END`;
const CASO_ABERTO = "(SELECT MAX(CB.ID) FROM CC_COBRANCA CB WHERE CB.CLIENTE_ID = {{clienteId}} AND CB.CARTEIRA = '{{carteira}}' AND CB.ENCERRADO_EM IS NULL)";
const DIA_MAIS = (expr, n) => `SUBSTRING(DATE_ADD(${expr}, INTERVAL (${n}) DAY), 1, 10)`;
// Parcela do acordo pela conta de gerarParcelas (RN-017): 0 = entrada; 1..N-1 = resto ÷ N truncado nos centavos; N = o que sobra.
const CADA = '(ROUND((AJ.VALOR - AJ.ENTRADA) * 100 / NULLIF(AJ.N_PARCELAS, 0) - 0.4999, 0) / 100)';
const NUM = `CAST(${ITEM('numeros')} AS SIGNED)`;
const PARCELA_ESPERADA = `(CASE WHEN ${NUM} = 0 THEN AJ.ENTRADA WHEN ${NUM} < AJ.N_PARCELAS THEN ${CADA}
    ELSE (AJ.VALOR - AJ.ENTRADA) - ${CADA} * (AJ.N_PARCELAS - 1) END)`;

const ESCRITAS = {
  ccEscJurProcessoInserir: `INSERT IGNORE INTO CC_PROCESSO (CLIENTE_ID, COBRANCA_ID, NOME_DEVEDOR, DOCUMENTO, SETOR, CARTEIRA, BU_ID, LINHA, FILIAL, VALOR, AUTOS, TRIBUNAL,
  RESPONSAVEL_ID, STATUS, PRAZO, PRAZO_DESCRICAO, SUBSTABELECER, OBS, ORIGEM, DOSSIE_ABERTO_EM, DOSSIE_ABERTO_POR, CHAVE_CARGA, ALERTA_CARGA, SUGESTAO_CLIENTES,
  ENCERRADO_EM, MOTIVO_ENCERRAMENTO, MOTIVO_TEXTO, ULTIMO_ANDAMENTO_EM, CRIADO_EM, CRIADO_POR)
SELECT NULLIF({{clienteId}}, 0), ${DA_COBRANCA(CASO_ABERTO, 'NULL')},
  ${DA_COBRANCA("COALESCE((SELECT SUBSTRING(C.NOME, 1, 200) FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}), '')", "'{{nomeDevedor}}'")}, '{{documento}}',
  ${DA_COBRANCA("COALESCE((SELECT C.SETOR FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}), 'PRIVADO')", "'{{setor}}'")}, '{{carteira}}', {{buId}},
  ${DA_COBRANCA("''", "'{{linha}}'")}, '{{filial}}',
  ${DA_COBRANCA("COALESCE((SELECT PC.VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA PC WHERE PC.CLIENTE_ID = {{clienteId}} AND PC.CARTEIRA = '{{carteira}}'), 0)", '{{valor}}')},
  ${DA_COBRANCA("''", "'{{autos}}'")}, ${DA_COBRANCA("''", "'{{tribunal}}'")}, ${DA_COBRANCA('NULL', 'NULLIF({{responsavelId}}, 0)')},
  ${DA_COBRANCA("'Dossiê em montagem pelo Financeiro'", "'{{status}}'")}, ${DA_COBRANCA('NULL', "NULLIF('{{prazo}}', '')")},
  ${DA_COBRANCA("''", "'{{prazoDescricao}}'")}, ${DA_COBRANCA('FALSE', '({{substabelecer}} = 1)')}, ${DA_COBRANCA("''", "'{{obs}}'")},
  '{{origem}}', CASE WHEN '{{origem}}' = 'COBRANCA' THEN '{{agora}}' END, CASE WHEN '{{origem}}' = 'COBRANCA' THEN {{membroId}} END,
  ${DA_COBRANCA('NULL', "NULLIF('{{chaveCarga}}', '')")}, ${DA_COBRANCA("''", "'{{alertaCarga}}'")}, ${DA_COBRANCA("''", "'{{sugestaoClientes}}'")},
  ${DA_COBRANCA('NULL', "NULLIF('{{encerradoEm}}', '')")}, ${DA_COBRANCA("''", "'{{motivo}}'")}, ${DA_COBRANCA("''", "'{{motivoTexto}}'")},
  ${DA_COBRANCA('NULL', "NULLIF('{{ultimoAndamentoEm}}', '')")}, '{{agora}}', {{membroId}}
FROM DUAL
WHERE '{{carteira}}' IN ('PRIVADA', 'ESTETICA', 'PUBLICA') AND (
  ('{{origem}}' = 'COBRANCA' AND {{clienteId}} > 0
    AND ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = {{clienteId}} AND ${clienteVisivelA('C', 'A')})
      AND (${CASO_ABERTO} IS NOT NULL OR ${NIVEL_MIN(2)})`)}
    AND NOT EXISTS (SELECT 1 FROM CC_PROCESSO X WHERE X.CLIENTE_ID = {{clienteId}} AND X.CARTEIRA = '{{carteira}}' AND X.ENCERRADO_EM IS NULL))
  OR ('{{origem}}' = 'MANUAL' AND {{valor}} >= 0 AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}) AND ${JUR})
  OR ('{{origem}}' = 'CARGA' AND {{valor}} >= 0 AND '{{chaveCarga}}' <> '' AND ${CARGA_ABERTA} AND ${JUR}))`,

  // Só o card do quadro juridico, com o título deste processo (criado agora por criarCard), que nenhum processo usa (B-02).
  // O COUNT em tabela derivada com agregado evita o erro 1093 do MySQL (06 §5).
  ccEscJurProcessoCard: `UPDATE CC_PROCESSO SET CARD_ID = {{cardId}}
WHERE ID = {{processoId}} AND CARD_ID IS NULL AND {{cardId}} > 0 AND ${ATOR('{{membroId}}')}
  AND EXISTS (SELECT 1 FROM KB_CARD K JOIN KB_BOARD B ON B.ID = K.BOARD_ID WHERE K.ID = {{cardId}} AND B.SLUG = 'juridico' AND K.EXCLUIDO_EM IS NULL
    AND K.TITULO = CONCAT(CC_PROCESSO.NOME_DEVEDOR, ' · ', CASE WHEN CC_PROCESSO.AUTOS = '' THEN 'sem autos' ELSE CC_PROCESSO.AUTOS END))
  AND (SELECT U.N FROM (SELECT COUNT(*) AS N FROM CC_PROCESSO X WHERE X.CARD_ID = {{cardId}}) U) = 0`,

  ccEscJurProcessoAtualizar: `UPDATE CC_PROCESSO SET AUTOS = '{{autos}}', TRIBUNAL = '{{tribunal}}', FILIAL = '{{filial}}', LINHA = '{{linha}}',
  RESPONSAVEL_ID = NULLIF({{responsavelId}}, 0), STATUS = '{{status}}', PRAZO = NULLIF('{{prazo}}', ''), PRAZO_DESCRICAO = '{{prazoDescricao}}',
  SUBSTABELECER = ({{substabelecer}} = 1), FORMA_CITACAO = '{{formaCitacao}}', RESULTADO_SENTENCA = '{{resultadoSentenca}}',
  RECUPERADO_INFORMADO = CASE WHEN '{{recuperadoInformado}}' = '' THEN NULL ELSE CAST('{{recuperadoInformado}}' AS DECIMAL(15,2)) END,
  VALOR = {{valor}}, OBS = '{{obs}}',
  ULTIMO_ANDAMENTO_EM = CASE WHEN '{{ultimoAndamentoEm}}' <> '' AND (ULTIMO_ANDAMENTO_EM IS NULL OR ULTIMO_ANDAMENTO_EM < '{{ultimoAndamentoEm}}')
    THEN '{{ultimoAndamentoEm}}' ELSE ULTIMO_ANDAMENTO_EM END
WHERE ID = {{processoId}} AND {{valor}} >= 0 AND ${JUR}`,

  // VALOR relido da posição (como a JS); prazo entre amanhã e 100 dias (60 du no máximo, 03 §14); cliente visível como em vePro (O-01).
  ccEscJurProcessoEnvio: `UPDATE CC_PROCESSO SET DOSSIE_ENVIADO_EM = '{{agora}}', DOSSIE_ENVIADO_POR = {{membroId}},
  VALOR = COALESCE((SELECT PC.VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA PC WHERE PC.CLIENTE_ID = CC_PROCESSO.CLIENTE_ID AND PC.CARTEIRA = CC_PROCESSO.CARTEIRA), VALOR),
  VALOR_ATUALIZADO = {{valorAtualizado}}, PRAZO = '{{prazo}}', STATUS = '{{status}}', ULTIMO_ANDAMENTO_EM = '{{agora}}',
  RESPONSAVEL_ID = COALESCE(RESPONSAVEL_ID, (SELECT MIN(J.ID) FROM CC_MEMBRO J WHERE J.CARGO = 'JURIDICO' AND J.ATIVO = TRUE))
WHERE ID = {{processoId}} AND ORIGEM = 'COBRANCA' AND DOSSIE_ENVIADO_EM IS NULL AND ENCERRADO_EM IS NULL
  AND '{{prazo}}' > ${HOJE_SQL} AND '{{prazo}}' <= ${DIA_MAIS(HOJE_SQL, 100)} AND {{valorAtualizado}} >= 0
  AND ${ATOR('{{membroId}}', `A.NIVEL >= ${PARAM_NUM('jur.envioNivelMin')}
    AND (A.CARGO = 'JURIDICO' OR EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = CC_PROCESSO.CLIENTE_ID AND ${clienteVisivelA('C', 'A')}))`)}
  AND NOT EXISTS (SELECT 1 FROM CC_DOSSIE_ITEM I WHERE I.PROCESSO_ID = {{processoId}} AND I.ITEM IN (${OBRIG_SEM_ALCADA})
    AND (I.SITUACAO = 'PENDENTE' OR (I.SITUACAO = 'NA' AND I.OBS = '')))`,

  ccEscJurProcessoEncerrar: `UPDATE CC_PROCESSO SET ENCERRADO_EM = '{{agora}}', MOTIVO_ENCERRAMENTO = '{{motivo}}', MOTIVO_TEXTO = '{{motivoTexto}}', STATUS = '{{status}}'
WHERE ID = {{processoId}} AND ENCERRADO_EM IS NULL AND '{{motivo}}' IN (${Object.keys(MOTIVOS).map((k) => `'${k}'`).join(', ')})
  AND ('{{motivo}}' <> 'OUTRO' OR '{{motivoTexto}}' <> '')
  AND ('{{motivo}}' <> 'ACORDO_CUMPRIDO' OR EXISTS (SELECT 1 FROM CC_ACORDO_JUDICIAL AJ WHERE AJ.PROCESSO_ID = {{processoId}} AND AJ.SITUACAO = 'QUITADO'))
  AND ${JUR}`,

  ccEscJurProcessoCliente: `UPDATE CC_PROCESSO SET CLIENTE_ID = {{clienteId}},
  NOME_DEVEDOR = (SELECT C.NOME FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}),
  DOCUMENTO = (SELECT C.DOCUMENTO FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}),
  SETOR = (SELECT C.SETOR FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}), BU_ID = {{buId}}, SUGESTAO_CLIENTES = ''
WHERE ID = {{processoId}} AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = {{clienteId}}) AND ${JUR}`,

  ccEscJurProcessoCarga: `UPDATE CC_PROCESSO SET
  CARGA_CONFERIDA_EM = CASE WHEN {{conferir}} = 1 THEN '{{agora}}' ELSE CARGA_CONFERIDA_EM END,
  CARGA_CONFERIDA_POR = CASE WHEN {{conferir}} = 1 THEN {{membroId}} ELSE CARGA_CONFERIDA_POR END,
  ULTIMO_ANDAMENTO_EM = CASE WHEN '{{ultimoAndamentoEm}}' <> '' AND (ULTIMO_ANDAMENTO_EM IS NULL OR ULTIMO_ANDAMENTO_EM < '{{ultimoAndamentoEm}}')
    THEN '{{ultimoAndamentoEm}}' ELSE ULTIMO_ANDAMENTO_EM END
WHERE ID = {{processoId}} AND ORIGEM = 'CARGA' AND ({{conferir}} = 0 OR CARGA_CONFERIDA_EM IS NULL) AND ${JUR}`,

  ccEscJurDossieItensInserir: `INSERT IGNORE INTO CC_DOSSIE_ITEM (PROCESSO_ID, ITEM, SITUACAO, OBS, ORIGEM, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT P.ID, ${ITEM('itens')}, ${ITEM('situacoes')}, ${ITEM('obss')}, ${ITEM('origens')}, '{{agora}}', {{membroId}}
FROM CC_PROCESSO P JOIN ${NUMEROS_20} ON N.N <= {{n}}
WHERE P.ID = {{processoId}} AND P.ORIGEM = 'COBRANCA' AND P.DOSSIE_ENVIADO_EM IS NULL AND P.ENCERRADO_EM IS NULL
  AND ${ITEM('situacoes')} IN ('PENDENTE', 'OK') AND (${ITEM('itens')} <> 'alcada' OR ${ITEM('situacoes')} = 'PENDENTE')
  AND ((P.CARTEIRA = 'PUBLICA' AND ${ITEM('itens')} IN (${CODIGOS(true)})) OR (P.CARTEIRA <> 'PUBLICA' AND ${ITEM('itens')} IN (${CODIGOS(false)})))
  AND ${VE_CLIENTE_DE('P.CLIENTE_ID')}`,

  ccEscJurDossieItemMarcar: `UPDATE CC_DOSSIE_ITEM SET SITUACAO = '{{situacao}}', OBS = '{{obs}}', ORIGEM = '{{origem}}', KB_ANEXO_IDS = '{{kbAnexoIds}}',
  ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = {{membroId}}
WHERE ID = {{itemId}} AND '{{situacao}}' IN ('PENDENTE', 'OK', 'NA') AND ('{{situacao}}' <> 'NA' OR '{{obs}}' <> '')
  AND EXISTS (SELECT 1 FROM CC_PROCESSO P WHERE P.ID = CC_DOSSIE_ITEM.PROCESSO_ID AND P.ENCERRADO_EM IS NULL AND (
    (CC_DOSSIE_ITEM.ITEM <> 'alcada' AND '{{origem}}' <> 'ENVIO' AND P.DOSSIE_ENVIADO_EM IS NULL AND ${ATOR('{{membroId}}', `(A.ID = P.DOSSIE_ABERTO_POR OR A.CARGO = 'JURIDICO'
      OR ${PODE_ADMINISTRAR} OR EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = P.CLIENTE_ID AND ${clienteVisivelA('C', 'A')}))`)})
    OR (CC_DOSSIE_ITEM.ITEM = 'alcada' AND '{{origem}}' = 'ENVIO' AND '{{situacao}}' = 'OK' AND P.DOSSIE_ENVIADO_POR = {{membroId}} AND ${ATOR('{{membroId}}')})))`,

  ccEscJurAndamentosInserir: `INSERT INTO CC_PROCESSO_ANDAMENTO (PROCESSO_ID, EM, PERIODO, TEXTO, AUTOR_ID, AUTOR_NOME, TIPO)
SELECT P.ID, ${ITEM('ems')}, ${ITEM('periodos')}, ${ITEM('textos')}, CASE WHEN '{{tipo}}' = 'CARGA' THEN NULL ELSE {{membroId}} END, ${ITEM('autores')}, '{{tipo}}'
FROM CC_PROCESSO P JOIN ${NUMEROS_20} ON N.N <= {{n}}
WHERE P.ID = {{processoId}} AND '{{tipo}}' IN ('MANUAL', 'SISTEMA', 'CARGA') AND ${ITEM('textos')} <> ''
  AND (('{{tipo}}' <> 'SISTEMA' AND ${JUR})
    OR ('{{tipo}}' = 'SISTEMA' AND P.DOSSIE_ENVIADO_POR = {{membroId}} AND ${ATOR('{{membroId}}')}
      AND NOT EXISTS (SELECT 1 FROM CC_PROCESSO_ANDAMENTO X WHERE X.PROCESSO_ID = P.ID AND X.TIPO = 'SISTEMA')))`,

  ccEscJurCustosInserir: `INSERT INTO CC_PROCESSO_CUSTO (PROCESSO_ID, TIPO, DATA, VALOR, OBS, PAGO, GUIA_KB_ANEXO_ID, COMPROVANTE_KB_ANEXO_ID, CRIADO_EM, CRIADO_POR)
SELECT P.ID, ${ITEM('tipos')}, ${ITEM('datas')}, CAST(${ITEM('valores')} AS DECIMAL(15,2)), ${ITEM('obss')},
  (${ITEM('pagos')} = '1' OR CAST(${ITEM('comprovantes')} AS SIGNED) > 0), NULLIF(CAST(${ITEM('guias')} AS SIGNED), 0),
  NULLIF(CAST(${ITEM('comprovantes')} AS SIGNED), 0), '{{agora}}', {{membroId}}
FROM CC_PROCESSO P JOIN ${NUMEROS_20} ON N.N <= {{n}}
WHERE P.ID = {{processoId}} AND ${ITEM('tipos')} IN (${TIPOS_SQL}) AND CAST(${ITEM('valores')} AS DECIMAL(15,2)) > 0 AND ${JUR}`,

  ccEscJurCustoAtualizar: `UPDATE CC_PROCESSO_CUSTO SET TIPO = '{{tipo}}', DATA = '{{data}}', VALOR = {{valor}}, OBS = '{{obs}}',
  PAGO = ({{pago}} = 1 OR {{comprovante}} > 0), GUIA_KB_ANEXO_ID = NULLIF({{guia}}, 0), COMPROVANTE_KB_ANEXO_ID = NULLIF({{comprovante}}, 0)
WHERE ID = {{custoId}} AND REMOVIDO_EM IS NULL AND '{{tipo}}' IN (${TIPOS_SQL}) AND {{valor}} > 0 AND ${JUR}`,

  ccEscJurCustoRemover: `UPDATE CC_PROCESSO_CUSTO SET REMOVIDO_EM = '{{agora}}', REMOVIDO_POR = {{membroId}}
WHERE ID = {{custoId}} AND REMOVIDO_EM IS NULL AND ${JUR}`,

  // Bloqueio B-1 v2: situação, ACIMA_ALCADA e NIVEL_EXIGIDO decididos aqui, pela política relida em parâmetro; nada vem da JS.
  // Exceção da carga (C-01): só o primeiro acordo do processo da carga, com a carga aberta, e até o valor do processo na planilha;
  // fora disso a política vale como em qualquer acordo.
  ccEscJurAcordoInserir: `INSERT INTO CC_ACORDO_JUDICIAL (PROCESSO_ID, VALOR, ENTRADA, N_PARCELAS, HONORARIOS, SITUACAO, SITUACAO_TEXTO, ACIMA_ALCADA, NIVEL_EXIGIDO,
  REGISTRADO_POR, REGISTRADO_EM)
SELECT P.ID, {{valor}}, {{entrada}}, {{nParcelas}}, {{honorarios}},
  CASE WHEN X.CARGA = 1 AND {{valor}} <= P.VALOR THEN 'ANDAMENTO' WHEN X.FORA = 1 THEN 'AGUARDANDO' ELSE 'ANDAMENTO' END, '{{situacaoTexto}}', (X.FORA = 1),
  CASE WHEN X.FORA = 1 AND NOT (X.CARGA = 1 AND {{valor}} <= P.VALOR) THEN CAST(${PARAM_NUM('jur.acordoAlcadaNivel')} AS SIGNED) ELSE 0 END, {{membroId}}, '{{agora}}'
FROM CC_PROCESSO P JOIN (SELECT CASE WHEN ${FORA_DA_POLITICA} THEN 1 ELSE 0 END AS FORA,
    CASE WHEN {{carga}} = 1 THEN 1 ELSE 0 END AS CARGA) X ON 1 = 1
WHERE P.ID = {{processoId}} AND {{valor}} > 0 AND {{entrada}} >= 0 AND {{entrada}} <= {{valor}} AND {{nParcelas}} >= 0 AND {{nParcelas}} <= 61
  AND {{honorarios}} >= 0
  AND NOT EXISTS (SELECT 1 FROM CC_ACORDO_JUDICIAL AJ WHERE AJ.PROCESSO_ID = P.ID AND AJ.SITUACAO IN ('AGUARDANDO', 'ANDAMENTO'))
  AND ((X.CARGA = 0 AND P.ENCERRADO_EM IS NULL)
    OR (X.CARGA = 1 AND P.ORIGEM = 'CARGA' AND ${CARGA_ABERTA} AND NOT EXISTS (SELECT 1 FROM CC_ACORDO_JUDICIAL AJ WHERE AJ.PROCESSO_ID = P.ID)))
  AND ${JUR}`,

  // B-03: parcela MANUAL = a conta do acordo gravado (valor por número, ±0,004; vencimento até o registro + 31 dias por parcela) e o
  // acordo em andamento sem aprovação tem de estar dentro da política relida. COR_PLANILHA só no processo da carga, com a carga aberta.
  ccEscJurAcordoParcelasInserir: `INSERT IGNORE INTO CC_ACORDO_JUDICIAL_PARCELA (ACORDO_ID, NUMERO, VALOR, VENCIMENTO, SITUACAO, PAGO_EM, ORIGEM_SITUACAO, ATUALIZADO_POR)
SELECT AJ.ID, ${NUM}, CAST(${ITEM('valores')} AS DECIMAL(15,2)), ${ITEM('vencimentos')}, ${ITEM('situacoes')},
  NULLIF(${ITEM('pagosEm')}, ''), ${ITEM('origens')}, {{membroId}}
FROM CC_ACORDO_JUDICIAL AJ JOIN ${NUMEROS_20} ON N.N <= {{n}}
WHERE AJ.ID = {{acordoId}} AND AJ.SITUACAO NOT IN ('QUITADO', 'RECUSADO')
  AND ${NUM} >= 0 AND ${NUM} <= AJ.N_PARCELAS
  AND ${ITEM('situacoes')} IN ('ABERTA', 'PAGA', 'A_CONFIRMAR') AND ${ITEM('origens')} IN ('MANUAL', 'COR_PLANILHA')
  AND ((${ITEM('situacoes')} = 'ABERTA' AND ${ITEM('origens')} = 'MANUAL'
      AND (${NUM} > 0 OR AJ.ENTRADA > 0)
      AND ${PARCELA_ESPERADA} - CAST(${ITEM('valores')} AS DECIMAL(15,2)) BETWEEN -0.004 AND 0.004
      AND ${ITEM('vencimentos')} <= ${DIA_MAIS('SUBSTRING(AJ.REGISTRADO_EM, 1, 10)', `${NUM} * 31 + 31`)}
      AND (AJ.SITUACAO <> 'ANDAMENTO' OR AJ.APROVADO_POR IS NOT NULL OR NOT ${FORA('AJ.ENTRADA', 'AJ.N_PARCELAS', 'AJ.VALOR')}))
    OR (${ITEM('origens')} = 'COR_PLANILHA' AND EXISTS (SELECT 1 FROM CC_PROCESSO P WHERE P.ID = AJ.PROCESSO_ID AND P.ORIGEM = 'CARGA' AND ${CARGA_ABERTA})))
  AND ${JUR}`,

  ccEscJurAcordoSituacao: `UPDATE CC_ACORDO_JUDICIAL SET
  APROVADO_POR = CASE WHEN '{{situacao}}' IN ('ANDAMENTO', 'RECUSADO') THEN {{membroId}} ELSE APROVADO_POR END,
  APROVADO_EM = CASE WHEN '{{situacao}}' IN ('ANDAMENTO', 'RECUSADO') THEN '{{agora}}' ELSE APROVADO_EM END,
  HONORARIOS_PAGOS = CASE WHEN '{{situacao}}' = 'HONORARIOS' THEN TRUE ELSE HONORARIOS_PAGOS END,
  HONORARIOS_PAGOS_EM = CASE WHEN '{{situacao}}' = 'HONORARIOS' THEN '{{pagoEm}}' ELSE HONORARIOS_PAGOS_EM END,
  SITUACAO = CASE WHEN '{{situacao}}' = 'HONORARIOS' THEN SITUACAO ELSE '{{situacao}}' END
WHERE ID = {{acordoId}} AND (
  ('{{situacao}}' IN ('ANDAMENTO', 'RECUSADO') AND SITUACAO = 'AGUARDANDO' AND REGISTRADO_POR <> {{membroId}}
    AND ${ATOR('{{membroId}}', 'A.NIVEL >= CC_ACORDO_JUDICIAL.NIVEL_EXIGIDO')})
  OR ('{{situacao}}' = 'QUITADO' AND SITUACAO = 'ANDAMENTO' AND ${JUR}
    AND EXISTS (SELECT 1 FROM CC_ACORDO_JUDICIAL_PARCELA PA WHERE PA.ACORDO_ID = CC_ACORDO_JUDICIAL.ID)
    AND NOT EXISTS (SELECT 1 FROM CC_ACORDO_JUDICIAL_PARCELA PA WHERE PA.ACORDO_ID = CC_ACORDO_JUDICIAL.ID AND PA.SITUACAO <> 'PAGA'))
  OR ('{{situacao}}' = 'HONORARIOS' AND HONORARIOS_PAGOS = FALSE AND '{{pagoEm}}' <> '' AND '{{pagoEm}}' <= ${HOJE_SQL} AND ${JUR}))`,

  ccEscJurAcordoParcela: `UPDATE CC_ACORDO_JUDICIAL_PARCELA SET SITUACAO = '{{situacao}}', PAGO_EM = CASE WHEN '{{situacao}}' = 'PAGA' THEN '{{pagoEm}}' ELSE NULL END,
  ORIGEM_SITUACAO = 'MANUAL', ATUALIZADO_POR = {{membroId}}
WHERE ID = {{parcelaId}} AND '{{situacao}}' IN ('ABERTA', 'PAGA')
  AND ('{{situacao}}' = 'ABERTA' OR ('{{pagoEm}}' <> '' AND '{{pagoEm}}' <= ${HOJE_SQL}))
  AND EXISTS (SELECT 1 FROM CC_ACORDO_JUDICIAL AJ WHERE AJ.ID = CC_ACORDO_JUDICIAL_PARCELA.ACORDO_ID AND AJ.SITUACAO NOT IN ('QUITADO', 'RECUSADO')
    AND ('{{situacao}}' = 'ABERTA' OR AJ.SITUACAO = 'ANDAMENTO'))
  AND ${JUR}`,

  // C-02: data de hoje e versão do modelo validado em dia relidas aqui (31 dias por mês de com.modeloRevalidarMeses: a JS, por mês, é a mais
  // estrita); processo e caso só do mesmo cliente; valores coerentes e o principal até o saldo aberto da posição (a JS lê o Winthor ao vivo).
  ccEscJurNotificacaoInserir: `INSERT INTO CC_NOTIFICACAO_EXTRAJUDICIAL (CLIENTE_ID, PROCESSO_ID, COBRANCA_ID, FILIAL, EMITIDA_EM, PRAZO_ATE, PRINCIPAL, MULTA, JUROS,
  CORRECAO, TOTAL, MODELO_VERSAO, EMITIDA_POR)
SELECT C.ID, NULLIF({{processoId}}, 0), NULLIF({{cobrancaId}}, 0), '{{filial}}', ${HOJE_SQL}, '{{prazoAte}}', {{principal}}, {{multa}}, {{juros}},
  {{correcao}}, {{total}}, MM.VERSAO, {{membroId}}
FROM CC_CLIENTE C JOIN CC_MODELO_MENSAGEM MM ON MM.CODIGO = 'JUR_NOTIF_EXTRAJUDICIAL' AND MM.ATIVO = TRUE AND MM.VALIDADO_VERSAO = MM.VERSAO
  AND SUBSTRING(MM.VALIDADO_EM, 1, 10) > ${DIA_MAIS(HOJE_SQL, `CAST(-31 * ${PARAM_NUM('com.modeloRevalidarMeses')} AS SIGNED)`)}
WHERE C.ID = {{clienteId}} AND C.SETOR <> 'PUBLICO' AND '{{prazoAte}}' > ${HOJE_SQL}
  AND ({{processoId}} = 0 OR EXISTS (SELECT 1 FROM CC_PROCESSO X WHERE X.ID = {{processoId}} AND X.CLIENTE_ID = C.ID))
  AND ({{cobrancaId}} = 0 OR EXISTS (SELECT 1 FROM CC_COBRANCA X WHERE X.ID = {{cobrancaId}} AND X.CLIENTE_ID = C.ID))
  AND {{principal}} >= 0 AND {{multa}} >= 0 AND {{juros}} >= 0 AND {{correcao}} >= 0
  AND {{total}} - ({{principal}} + {{multa}} + {{juros}} + {{correcao}}) BETWEEN -0.01 AND 0.01
  AND {{principal}} <= COALESCE((SELECT SUM(PC.VENCIDO + PC.A_VENCER) FROM CC_POSICAO_CLIENTE_CARTEIRA PC WHERE PC.CLIENTE_ID = C.ID
    AND PC.CARTEIRA IN ('PRIVADA', 'ESTETICA')), 0) + 0.004
  AND EXISTS (SELECT 1 FROM CC_FILIAL_CREDORA FC WHERE FC.CODIGO = '{{filial}}' AND FC.RAZAO_SOCIAL <> '' AND CHAR_LENGTH(FC.CNPJ) = 14)
  AND ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND EXISTS (SELECT 1 FROM CC_MEMBRO V WHERE V.ID = C.AGENTE_ID AND A.CAMINHO <> '' AND V.CAMINHO LIKE CONCAT(A.CAMINHO, '%'))`)}`,

  ccEscJurFilialSalvar: `INSERT INTO CC_FILIAL_CREDORA (CODIGO, RAZAO_SOCIAL, CNPJ, ENDERECO, CIDADE_UF, UF, BANCO, REPRESENTANTE, REPRESENTANTE_CARGO, ATIVA,
  ATUALIZADO_EM, ATUALIZADO_POR)
SELECT '{{codigo}}', '{{razaoSocial}}', '{{cnpj}}', '{{endereco}}', '{{cidadeUf}}', '{{uf}}', '{{banco}}', '{{representante}}', '{{representanteCargo}}',
  ({{ativa}} = 1), '{{agora}}', {{membroId}}
FROM DUAL
WHERE '{{codigo}}' <> '' AND (CHAR_LENGTH('{{cnpj}}') = 0 OR CHAR_LENGTH('{{cnpj}}') = 14) AND ${ATOR('{{membroId}}', PODE_ADMINISTRAR)}
ON DUPLICATE KEY UPDATE RAZAO_SOCIAL = VALUES(RAZAO_SOCIAL), CNPJ = VALUES(CNPJ), ENDERECO = VALUES(ENDERECO), CIDADE_UF = VALUES(CIDADE_UF), UF = VALUES(UF),
  BANCO = VALUES(BANCO), REPRESENTANTE = VALUES(REPRESENTANTE), REPRESENTANTE_CARGO = VALUES(REPRESENTANTE_CARGO), ATIVA = VALUES(ATIVA),
  ATUALIZADO_EM = VALUES(ATUALIZADO_EM), ATUALIZADO_POR = VALUES(ATUALIZADO_POR)`,
};

/* ── definitions ── */

// Números como parâmetro (DT-45): todo {{x}} fora de aspas vira CAST; DECIMAIS = os valores em dinheiro desta spec.
const DECIMAIS = ['valorDe', 'valorAte', 'valor', 'valorAtualizado', 'entrada', 'honorarios', 'principal', 'multa', 'juros', 'correcao', 'total'];
const sql = (name, code) => ({ name, type: 'SQL', code: numerosComoParametro(code, DECIMAIS) });
const PARAM_NUM_REGUA_JUR = PARAM_NUM('regua.jur', 'CB.CARTEIRA');
// Funções auxiliares de uma SF só, coladas no corpo de todas (texto pequeno; sem módulo extra).
const AUX = [lerCarteira, custoDaEntrada, anexosDoCard, gravarParcelas, filialDoDocumento, prepararNotificacao, cargaConcluida, linhasDaEntrada, prepararLinha,
  clientesDaCarga].map(String).join('\n') + `\nconst PARAM_NUM_REGUA_JUR = ${JSON.stringify(PARAM_NUM_REGUA_JUR)};\n${constante('CAMPOS_FICHA', CAMPOS_FICHA)}`;
const jsAux = (name, fn, extra = '') => ({ name, type: 'JAVASCRIPT', code: js(`${FONTE_COMUM}\n${extra}\n${AUX}\nreturn await (${fn})();`) });

export const definitions = [
  sql('ccJurProcessoListar', SQL_PROCESSO_LISTAR),
  sql('ccJurProcessoTotal', SQL_PROCESSO_TOTAL),
  jsAux('ccJurProcessoFicha', corpoProcessoFicha),
  jsAux('ccJurDossieSugestao', corpoDossieSugestao),
  sql('ccJurAndamentoListar', SQL_ANDAMENTO_LISTAR),
  sql('ccJurAndamentoTotal', SQL_ANDAMENTO_TOTAL),
  sql('ccJurCustoListar', SQL_CUSTO_LISTAR),
  sql('ccJurCustoTotal', SQL_CUSTO_TOTAL),
  sql('ccJurCustoResumo', SQL_CUSTO_RESUMO),
  sql('ccJurAcordoListar', SQL_ACORDO_LISTAR),
  sql('ccJurAcordoTotal', SQL_ACORDO_TOTAL),
  sql('ccJurAcordoParcelaListar', SQL_PARCELA_LISTAR),
  jsAux('ccJurAlertas', corpoAlertas, FONTE_GESTAO),
  jsAux('ccJurIndicadores', corpoIndicadores, FONTE_GESTAO),
  sql('ccJurResumo', SQL_RESUMO),
  jsAux('ccJurNotificacaoPreparar', corpoNotificacaoPreparar),
  sql('ccJurNotificacaoUltima', SQL_NOTIFICACAO_ULTIMA),
  jsAux('ccJurDemonstrativoPreparar', corpoDemonstrativo),
  sql('ccJurFilialCredoraListar', SQL_FILIAL_LISTAR),
  sql('ccJurCargaPendenciaListar', SQL_PENDENCIA_LISTAR),
  sql('ccJurCargaPendenciaTotal', SQL_PENDENCIA_TOTAL),
  jsAux('ccJurCargaPrevia', corpoCargaPrevia, FONTE_CARGA),
  jsAux('ccJurDossieAbrir', corpoDossieAbrir),
  jsAux('ccJurDossieItemMarcar', corpoDossieItemMarcar),
  jsAux('ccJurDossieEnviar', corpoDossieEnviar),
  jsAux('ccJurProcessoCriar', corpoProcessoCriar),
  jsAux('ccJurProcessoSalvar', corpoProcessoSalvar),
  jsAux('ccJurProcessoEncerrar', corpoProcessoEncerrar),
  jsAux('ccJurProcessoVincularCliente', corpoProcessoVincular),
  jsAux('ccJurAndamentoRegistrar', corpoAndamentoRegistrar),
  jsAux('ccJurCustoLancar', corpoCustoLancar),
  jsAux('ccJurCustoSalvar', corpoCustoSalvar),
  jsAux('ccJurCustoRemover', corpoCustoRemover),
  jsAux('ccJurAcordoCriar', corpoAcordoCriar),
  jsAux('ccJurAcordoAprovar', corpoAcordoAprovar),
  jsAux('ccJurAcordoParcelaSituacao', corpoParcelaSituacao),
  jsAux('ccJurAcordoHonorariosPagar', corpoHonorariosPagar),
  jsAux('ccJurNotificacaoRegistrar', corpoNotificacaoRegistrar),
  jsAux('ccJurFilialCredoraSalvar', corpoFilialSalvar),
  jsAux('ccJurCargaAplicar', corpoCargaAplicar, FONTE_CARGA),
  jsAux('ccJurCargaConferir', corpoCargaConferir),
  jsAux('ccJurCargaConcluir', corpoCargaConcluir),
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
      description: `Crédito e Cobrança · 003-juridico · ${def.name}` };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  // 1ª passada: cria o que falta (upsert pelo nome); 2ª: republica as JS com o mapa completo.
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 003 e ${quadros.length} quadro(s).`);
  console.log('Republique o add-010 (ids da 003 e ccPodeMover com o trecho do juridico), depois o add-001-kanban, o add-090 e o sync-server-function-map.');
}
