// Smoke da 003-juridico (spec, seção Testes; plan, "Ordem do smoke"). Cada teste() começa de uma cópia do banco do
// passo 11, em D (BANCO_POR_TESTE): a ordem do plan (blocos A, B e C num banco só) deixa de importar; cada teste monta
// o que precisa. RN-021, RN-028 e RF-019 são regra de tela (frontend/tests).

import {
  teste, pular, consultar, como, chamar, rodarRotinaAte, execucoes, nasDuasSessoes, existe, assert, U, M, dia, D,
} from './base.mjs';
import { chaveDeRotulo } from '@benenutri/mitra-kanban/motor';
import { DOCUMENTOS, documentosDa, TIPOS_CUSTO, GRUPOS_CUSTO } from '../../lib/juridico/catalogos.mjs';
import { validarAutos, gerarParcelas, politicaDoAcordo, prazoInicial, montarNotificacao } from '../../lib/juridico/regras.mjs';
import { inferirData, semelhanca, chaveDaCarga } from '../../lib/juridico/carga.mjs';
import { PLANILHA_TESTE, PLANILHA_SANTA_MARIA } from '../seed/003-juridico.mjs';

export const SEEDS = ['003'];
export const RELOGIO = D;
export const BANCO_POR_TESTE = true;

/* ── ajudantes ── */

const PADRAO = {
  busca: '', limite: '100', offset: '0', faseChave: '', carteira: '', filial: '', buId: '-1', linha: '', grupo: '', situacao: '', responsavelId: '0',
  semAndamentoDias: '0', valorDe: '0', valorAte: '0', processoId: '0', acordoId: '0', pago: '-1', semComprovante: '0', mes: '', tipo: '', ativa: '-1',
  clienteId: '0', membroId: '0',
};
const linhas = async (nome, input = {}) => (await chamar(nome, { ...PADRAO, ...input })).rows;
const linha = async (nome, input) => (await linhas(nome, input))[0];
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => { assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 300)}`); if (re) assert.match(r.error, re); return r; };
const n = (v) => Number(v);
const contar = (sql, ...p) => n(consultar(sql, ...p)[0].N);
const idDe = (codcli) => consultar('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli)[0]?.ID;
const proc = (codcli, extra = '') => consultar(`SELECT P.*, F.CHAVE AS FASE, K.VALORES_JSON, K.RESPONSAVEL_ID AS CARD_RESPONSAVEL FROM CC_PROCESSO P
JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE C.CODCLI = ? ${extra} ORDER BY P.ID DESC LIMIT 1`, codcli)[0];
const procPorId = (id) => consultar(`SELECT P.*, F.CHAVE AS FASE, K.VALORES_JSON FROM CC_PROCESSO P LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID
LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE P.ID = ?`, id)[0];
const caso = (codcli, carteira = 'PRIVADA') => consultar(`SELECT CB.*, F.CHAVE AS FASE FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE C.CODCLI = ? AND CB.CARTEIRA = ? ORDER BY CB.ID DESC LIMIT 1`, codcli, carteira)[0];
const itens = (processoId) => Object.fromEntries(consultar('SELECT * FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ?', processoId).map((i) => [i.ITEM, i]));
const faseId = (chave) => consultar("SELECT FASE_ID FROM CC_FASE WHERE QUADRO = 'juridico' AND CHAVE = ?", chave)[0].FASE_ID;
const mover = (login, p, chave) => como(login, () => chamar('kbCardMover', { cardId: p.CARD_ID, faseId: faseId(chave), ordem: 0 }));
const notas = (cardId, texto) => contar("SELECT COUNT(*) AS N FROM KB_LOG WHERE CARD_ID = ? AND EVENTO = 'nota' AND DETALHE LIKE ?", cardId, `%${texto}%`);
const julia = (nome, input) => como('julia', () => chamar(nome, input));
const ficha = (login, processoId) => como(login, () => chamar('ccJurProcessoFicha', { processoId }));
const alertas = async (input = {}) => aceito(await julia('ccJurAlertas', input));
const indicadores = async (input = {}) => {
  const r = aceito(await julia('ccJurIndicadores', input));
  return Object.fromEntries(r.indicadores.map((i) => [i.chave, i]));
};
const totais = (login, input = {}) => como(login, () => linha('ccJurProcessoTotal', input));
const salvarParametros = async (login, itens) => aceito(await como(login, () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify(itens) })));
const abrir = (login, codcli, carteira = 'PRIVADA') => como(login, () => chamar('ccJurDossieAbrir', { clienteId: idDe(codcli), carteira }));
const marcar = (login, itemId, situacao, obs = '', extra = {}) => como(login, () => chamar('ccJurDossieItemMarcar', { itemId, situacao, obs, ...extra }));
const progresso = async (login, processoId) => (aceito(await ficha(login, processoId))).progresso;
/** Completa o dossiê da Atlas (notificação e cadastro conferidos), como Ana. */
async function completarAtlas() {
  const p = proc(3001);
  const i = itens(p.ID);
  aceito(await marcar('ana', i.notif.ID, 'OK', 'Notificação recebida'));
  aceito(await marcar('ana', i.cadastro.ID, 'OK', 'Contrato social anexado'));
  return p;
}
const acordo = (login, processoId, valor, entrada, nParcelas, extra = {}) => como(login, () => chamar('ccJurAcordoCriar', {
  processoId, valor, entrada, nParcelas, primeiroVencimento: dia(0), ...extra,
}));
const parcelasDe = (acordoId) => consultar('SELECT * FROM CC_ACORDO_JUDICIAL_PARCELA WHERE ACORDO_ID = ? ORDER BY NUMERO', acordoId);
const aplicar = (login, linhaCarga) => como(login, () => chamar('ccJurCargaAplicar', { linhas: JSON.stringify([linhaCarga]) }));
const pendencias = async () => n((await como('julia', () => linha('ccJurCargaPendenciaTotal', {}))).TOTAL);
const anexar = async (login, cardId, nome) => n(aceito(await como(login, () => chamar('kbAnexoRegistrar', { cardId, tipo: 'arquivo', nome, url: `https://arquivos.test/${nome}`, tamanho: 100 }))).id);
const resumo = async () => { const s = await como('julia', () => linha('ccJurResumo', {})); return [s.RECUPERADO, s.RECUPERADO_MES, s.RECUPERADO_ANO].map(n); };
const agoraD = () => `${dia(0)}T10:00:00`;
/** Chamada direta de uma escrita interna, com a sessão de `login` (o perfil libera as `ccEsc…`, S-03). */
const direto = (login, nome, input) => como(login, () => chamar(nome, { membroId: M[login], agora: agoraD(), ...input }));
/** Entrada "maliciosa" de ccEscJurProcessoInserir: tudo o que a regra deriva vem preenchido. */
const forjado = () => ({
  origem: 'COBRANCA', nomeDevedor: 'Forjado', documento: '1', setor: 'PUBLICO', buId: 0, linha: 'GALDERMA', filial: '1', valor: 1000000,
  autos: '0712345-11.2024.8.07.0001', tribunal: 'TJDFT', responsavelId: 0, status: 'Quitado', prazo: dia(3), prazoDescricao: 'x', substabelecer: 1, obs: 'x',
  chaveCarga: 'CHAVE-FORJADA', alertaCarga: 'x', sugestaoClientes: '1', encerradoEm: agoraD(), motivo: 'QUITADO', motivoTexto: 'x', ultimoAndamentoEm: agoraD(),
});
const listas = (ps, f) => ps.map(f).join('¦');
const parcelasDireto = (acordoId, ps) => direto('julia', 'ccEscJurAcordoParcelasInserir', { acordoId, n: ps.length, numeros: listas(ps, (p) => p.numero),
  valores: listas(ps, (p) => Number(p.valor).toFixed(2)), vencimentos: listas(ps, (p) => p.vencimento), situacoes: listas(ps, () => 'ABERTA'),
  pagosEm: listas(ps, () => ''), origens: listas(ps, () => 'MANUAL') });

export async function suite() {
  /* ── dossiê ── */

  await teste('C-001: dossiê da Iota aberto por Ana', async () => {
    const r = aceito(await abrir('ana', 3013));
    assert.equal(r.existente, false);
    const i = itens(r.processoId);
    assert.equal(Object.keys(i).length, 11);
    assert.equal(documentosDa('PRIVADA').filter((d) => d.obrigatorio).length, 10);
    assert.deepEqual(['demonst', 'hist', 'protesto'].map((c) => i[c].SITUACAO), ['OK', 'OK', 'OK']);
    assert.equal(i.notif.SITUACAO, 'PENDENTE');
    assert.match(i.notif.OBS, /Notificação gerada em 20\/10\/2026/);
    assert.equal(i.cadastro.SITUACAO, 'PENDENTE');
    assert.match(i.cadastro.OBS, /contrato social e QSA/);
    const pg = await progresso('ana', r.processoId);
    assert.deepEqual([pg.ok, pg.total], [3, 10]);
    assert.equal(procPorId(r.processoId).FASE, 'dossie');
  });

  await teste('C-002: abrir o dossiê não muda a cobrança e tira o alerta', async () => {
    const antesFase = caso(3013).FASE;
    const antes = await alertas();
    assert.equal(antes.total, 13);
    const noDossie = n((await totais('julia', { faseChave: 'dossie' })).TOTAL);
    assert.equal(noDossie, 1);
    const r = aceito(await abrir('ana', 3013));
    const p = procPorId(r.processoId);
    assert.deepEqual([p.FASE, n(p.VALOR), p.FILIAL], ['dossie', 33000, '1']);
    assert.equal(n((await totais('julia', { faseChave: 'dossie' })).TOTAL), 2);
    assert.equal(caso(3013).FASE, antesFase);
    const depois = await alertas();
    assert.equal(depois.total, 12);
    assert.equal(depois.linhas.some((l) => l.tipo === 'semdossie'), false);
    aceito(await marcar('ana', itens(r.processoId).entrega.ID, 'OK', 'Canhotos'));
    aceito(await abrir('ana', 3013));
    assert.equal(itens(r.processoId).entrega.SITUACAO, 'OK');
  });

  await teste('C-003 · RN-004: Gustavo envia a Atlas completa', async () => {
    const p = await completarAtlas();
    const r = aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: p.ID })));
    const e = procPorId(p.ID);
    assert.deepEqual([e.FASE, e.PRAZO, n(e.VALOR_ATUALIZADO)], ['recebido', '2026-11-27', 31087.25]);
    assert.equal(r.prazo, '2026-11-27');
    const alc = itens(p.ID).alcada;
    assert.deepEqual([alc.SITUACAO, alc.OBS, alc.ORIGEM], ['OK', 'Gustavo Lima · 19/11/2026', 'ENVIO']);
    const pg = await progresso('julia', p.ID);
    assert.deepEqual([pg.ok, pg.total], [10, 10]);
    if (existe('ccCobEnviarJuridico')) assert.equal(caso(3001).FASE, 'juridico');
    const [and] = consultar("SELECT TEXTO FROM CC_PROCESSO_ANDAMENTO WHERE PROCESSO_ID = ? AND TIPO = 'SISTEMA'", p.ID);
    for (const t of ['30.000,00', '31.087,25', '38 dias']) assert.ok(and.TEXTO.includes(t), and.TEXTO);
    aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: p.ID })));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PROCESSO_ANDAMENTO WHERE PROCESSO_ID = ? AND TIPO = 'SISTEMA'", p.ID), 1);
  });

  await teste('C-004: envio com 7 de 10 recusado com os faltantes', async () => {
    const p = proc(3001);
    const r = recusado(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: p.ID })), /Notificação extrajudicial/);
    assert.match(r.error, /Cadastro do devedor/);
    assert.equal(r.faltam.length, 2);
    assert.doesNotMatch(r.error, /Aprovação/);
    assert.equal(procPorId(p.ID).FASE, 'dossie');
  });

  await teste('C-005: envio exige Gerente', async () => {
    const p = await completarAtlas();
    recusado(await como('ana', () => chamar('ccJurDossieEnviar', { processoId: p.ID })), /Gerente/);
    recusado(await como('sergio', () => chamar('ccJurDossieEnviar', { processoId: p.ID })), /Gerente/);
    // Escrita direta: Sérgio sem o nível; Gustavo com prazo fora do envio (O-01).
    await direto('sergio', 'ccEscJurProcessoEnvio', { processoId: p.ID, valorAtualizado: 1, prazo: dia(5), status: 'x' });
    await direto('gustavo', 'ccEscJurProcessoEnvio', { processoId: p.ID, valorAtualizado: 1, prazo: '2099-12-31', status: 'x' });
    assert.equal(procPorId(p.ID).FASE, 'dossie');
    assert.equal(procPorId(p.ID).DOSSIE_ENVIADO_EM, null);
  });

  await teste('C-005 · DT-45: número com texto de injeção não vaza na leitura nem grava pela interna', async () => {
    // Leitura: `responsavelId` que fecharia o parêntese do filtro vira número (0 = sem filtro, pela visibilidade).
    const total = async (login, input) => n((await totais(login, input)).TOTAL);
    assert.ok(await total('ana') < await total('gustavo'));
    assert.equal(await total('ana', { responsavelId: '0) OR (1=1' }), await total('ana'));
    // Interna: Sérgio não envia o dossiê; o OR no `membroId` passaria o ATOR pela própria linha dele.
    const p = await completarAtlas();
    await direto('sergio', 'ccEscJurProcessoEnvio', { processoId: p.ID, valorAtualizado: 1, prazo: dia(5), status: 'x', membroId: `${M.sergio} OR 1=1` });
    assert.equal(procPorId(p.ID).DOSSIE_ENVIADO_EM, null);
  });

  await teste('C-006: "não se aplica" exige motivo', async () => {
    const p = proc(3001);
    const id = itens(p.ID).cadastro.ID;
    recusado(await marcar('ana', id, 'NA', ''), /motivo/);
    assert.equal((await progresso('ana', p.ID)).ok, 7);
    aceito(await marcar('ana', id, 'NA', 'Cadastro já arquivado no processo anterior'));
    assert.equal((await progresso('ana', p.ID)).ok, 8);
  });

  await teste('C-007: dossiê público do Fundo de Luziânia por Carlos', async () => {
    const r = aceito(await abrir('carlos', 3004, 'PUBLICA'));
    const i = itens(r.processoId);
    assert.equal(Object.keys(i).length, 13);
    assert.equal(documentosDa('PUBLICA').filter((d) => d.obrigatorio).length, 11);
    for (const c of ['protesto', 'notif', 'pedido', 'titulo']) assert.equal(i[c], undefined);
    const pg = await progresso('carlos', r.processoId);
    assert.deepEqual([pg.ok, pg.total], [2, 11]);
    const sug = await nasDuasSessoes(async () => {
      const s = aceito(await como('carlos', () => chamar('ccJurDossieSugestao', { processoId: r.processoId })));
      return s.linhas.filter((l) => ['nf', 'contrato', 'empenho', 'atesto', 'oficio', 'lai', 'certidoes'].includes(l.item)).map((l) => [l.item, l.sugestao]);
    });
    // Sem as tabelas da 005 (ou sem NF do órgão nelas), nenhuma sugestão; com a 005 instalada, a NF lida do Winthor vira sugestão do item nf.
    let nfs = 0;
    try { nfs = contar('SELECT COUNT(*) AS N FROM CC_NF_PUBLICA WHERE CLIENTE_ID = ?', idDe(3004)); } catch { nfs = 0; }
    assert.ok(sug.every(([item, s]) => (item === 'nf' && nfs ? /^NF /.test(s) : s === '')), JSON.stringify(sug));
  });

  await teste('RN-006: público sem notificação extrajudicial', async () => {
    assert.equal(documentosDa('PUBLICA').some((d) => d.codigo === 'notif'), false);
    recusado(await como('carlos', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3004), carteira: 'PUBLICA' })), /ofício/);
  });

  await teste('C-008: reabrir o dossiê devolve o mesmo processo', async () => {
    const a = aceito(await abrir('ana', 3013));
    const b = aceito(await abrir('ana', 3013));
    assert.equal(b.processoId, a.processoId);
    assert.equal(b.existente, true);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PROCESSO WHERE CLIENTE_ID = ?', idDe(3013)), 1);
  });

  await teste('RN-030: Ana chamando ccEscJurProcessoInserir direto não grava encerramento, valor, carga nem repete', async () => {
    const antes = await resumo();
    // Sem caso aberto na carteira e Ana (nível 1): nada, como na JS (DT-41).
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE CLIENTE_ID = ? AND CARTEIRA = 'ESTETICA' AND ENCERRADO_EM IS NULL", idDe(3001)), 0);
    await direto('ana', 'ccEscJurProcessoInserir', { ...forjado(), clienteId: idDe(3001), carteira: 'ESTETICA' });
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PROCESSO WHERE CLIENTE_ID = ? AND CARTEIRA = 'ESTETICA'", idDe(3001)), 0);
    // Com caso: grava o dossiê com o que a regra deriva, uma vez só.
    for (let i = 0; i < 2; i += 1) await direto('ana', 'ccEscJurProcessoInserir', { ...forjado(), clienteId: idDe(3013), carteira: 'PRIVADA' });
    const ps = consultar('SELECT * FROM CC_PROCESSO WHERE CLIENTE_ID = ?', idDe(3013));
    assert.equal(ps.length, 1);
    const p = ps[0];
    assert.deepEqual([p.ENCERRADO_EM, p.MOTIVO_ENCERRAMENTO, p.MOTIVO_TEXTO, n(p.VALOR), p.AUTOS, p.TRIBUNAL, p.RESPONSAVEL_ID, p.PRAZO, p.CHAVE_CARGA,
      p.ULTIMO_ANDAMENTO_EM, p.STATUS, p.SETOR, n(p.SUBSTABELECER), p.LINHA, n(p.COBRANCA_ID), p.ORIGEM],
    [null, '', '', 33000, '', '', null, null, null, null, 'Dossiê em montagem pelo Financeiro', 'PRIVADO', 0, '', n(caso(3013).ID), 'COBRANCA']);
    assert.deepEqual(await resumo(), antes);
    // Item fora do catálogo e aprovação do encaminhamento já OK: recusados (O-02).
    await direto('ana', 'ccEscJurDossieItensInserir', { processoId: p.ID, n: 2, itens: 'xyz¦alcada', situacoes: 'OK¦OK', obss: 'x¦x', origens: 'SUGESTAO¦SUGESTAO' });
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ?', p.ID), 0);
    // A abertura pela tela completa itens e card do mesmo processo.
    const r = aceito(await abrir('ana', 3013));
    assert.deepEqual([r.processoId, r.existente], [n(p.ID), true]);
    assert.equal(Object.keys(itens(p.ID)).length, 11);
    assert.equal(procPorId(p.ID).FASE, 'dossie');
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE ENTIDADE = 'PROCESSO' AND ENTIDADE_ID = ? AND CAMPO = '(reabertura)'", p.ID), 1);
  });

  await teste('C-009: Sérgio chamando ccEscJurProcessoCard direto não liga processo ao card de outro', async () => {
    const vale = proc(3002);
    await direto('sergio', 'ccEscJurProcessoInserir', { ...forjado(), clienteId: idDe(3013), carteira: 'PRIVADA' });
    const [falso] = consultar('SELECT ID FROM CC_PROCESSO WHERE CLIENTE_ID = ?', idDe(3013));
    await direto('sergio', 'ccEscJurProcessoCard', { processoId: falso.ID, cardId: vale.CARD_ID });
    assert.equal(procPorId(falso.ID).CARD_ID, null);
    // Card de outro quadro com o mesmo título também não serve.
    const [outro] = consultar("SELECT K.ID FROM KB_CARD K JOIN KB_BOARD B ON B.ID = K.BOARD_ID WHERE B.SLUG <> 'juridico' LIMIT 1");
    if (outro) {
      await direto('sergio', 'ccEscJurProcessoCard', { processoId: falso.ID, cardId: outro.ID });
      assert.equal(procPorId(falso.ID).CARD_ID, null);
    }
    recusado(await mover('sergio', vale, 'encerrado'), /Encerrar processo/);
    assert.equal(proc(3002).FASE, vale.FASE);
    // Processo com o mesmo título de outro (manual da Júlia com o nome da Atlas, sem autos): o card já usado não serve.
    const atlas = proc(3001);
    await direto('julia', 'ccEscJurProcessoInserir', { ...forjado(), origem: 'MANUAL', clienteId: idDe(3015), carteira: 'PRIVADA', nomeDevedor: atlas.NOME_DEVEDOR,
      autos: '', chaveCarga: '', encerradoEm: '', motivo: '', ultimoAndamentoEm: '' });
    const [gemeo] = consultar("SELECT ID FROM CC_PROCESSO WHERE CLIENTE_ID = ? AND ORIGEM = 'MANUAL'", idDe(3015));
    await direto('sergio', 'ccEscJurProcessoCard', { processoId: gemeo.ID, cardId: atlas.CARD_ID });
    assert.equal(procPorId(gemeo.ID).CARD_ID, null);
  });

  await teste('C-009: travas do quadro e encerramento', async () => {
    const atlas = proc(3001);
    const delta = proc(3006);
    const vale = proc(3002);
    recusado(await mover('julia', atlas, 'peticao'), /Envie o dossiê/);
    recusado(await mover('julia', delta, 'citacao'), /número dos autos/);
    recusado(await mover('julia', vale, 'encerrado'), /Encerrar processo/);
    recusado(await julia('ccJurProcessoSalvar', { processoId: delta.ID, autos: '12345' }), /CNJ/);
    aceito(await julia('ccJurProcessoSalvar', { processoId: delta.ID, autos: '0709999-10.2026.8.07.0001' }));
    aceito(await mover('julia', proc(3006), 'citacao'));
    assert.equal(proc(3006).FASE, 'citacao');
    recusado(await julia('ccJurProcessoEncerrar', { processoId: vale.ID }), /motivo/);
    aceito(await julia('ccJurProcessoEncerrar', { processoId: vale.ID, motivo: 'QUITADO' }));
    assert.equal(proc(3002).FASE, 'encerrado');
    for (const p of [delta, vale]) assert.ok(contar('SELECT COUNT(*) AS N FROM KB_MOVIMENTO WHERE CARD_ID = ?', p.CARD_ID) >= 2);
    recusado(await mover('ana', atlas, 'peticao'), /Só o Jurídico/);
  });

  await teste('RN-001: catálogo do dossiê', async () => {
    assert.equal(DOCUMENTOS.length, 17);
    for (const c of ['PRIVADA', 'ESTETICA']) {
      assert.deepEqual([documentosDa(c).length, documentosDa(c).filter((d) => d.obrigatorio).length], [11, 10]);
    }
    assert.deepEqual([documentosDa('PUBLICA').length, documentosDa('PUBLICA').filter((d) => d.obrigatorio).length], [13, 11]);
    const soPublica = DOCUMENTOS.filter((d) => d.publico && !d.privado).map((d) => d.codigo).sort();
    assert.deepEqual(soPublica, ['atesto', 'certidoes', 'contrato', 'empenho', 'lai', 'oficio']);
  });

  await teste('RN-002: anexo confere o item; "não se aplica" sem motivo não conta', async () => {
    const r = aceito(await abrir('ana', 3013));
    const p = procPorId(r.processoId);
    const anexoId = await anexar('ana', p.CARD_ID, 'nf-3001.pdf');
    const antes = (await progresso('ana', p.ID)).ok;
    aceito(await marcar('ana', itens(p.ID).nf.ID, 'PENDENTE', '', { kbAnexoIds: String(anexoId) }));
    const nf = itens(p.ID).nf;
    assert.deepEqual([nf.SITUACAO, nf.OBS, nf.ORIGEM], ['OK', 'Anexo: nf-3001.pdf', 'ANEXO']);
    assert.equal((await progresso('ana', p.ID)).ok, antes + 1);
    recusado(await marcar('ana', itens(p.ID).entrega.ID, 'NA', ''));
    assert.equal((await progresso('ana', p.ID)).ok, antes + 1);
    // KB_ANEXO_IDS tem 200 caracteres: lista maior é recusada antes de gravar (C-03).
    const muitos = Array.from({ length: 30 }, (_, i) => 1000000 + i).join(',');
    recusado(await marcar('ana', itens(p.ID).entrega.ID, 'PENDENTE', '', { kbAnexoIds: muitos }), /25 anexos/);
  });

  await teste('RN-003: sugestão não sobrescreve; sem endereço, sem sugestão de cadastro', async () => {
    const r = aceito(await abrir('ana', 3013));
    aceito(await marcar('ana', itens(r.processoId).protesto.ID, 'PENDENTE', 'Conferir o instrumento'));
    aceito(await abrir('ana', 3013));
    assert.equal(itens(r.processoId).protesto.SITUACAO, 'PENDENTE');
    const l = aceito(await abrir('bruno', 3012));
    assert.equal(itens(l.processoId).cadastro.OBS, '');
  });

  await teste('RN-004: nível do envio é parâmetro', async () => {
    const r = aceito(await abrir('ana', 3013));
    assert.equal(caso(3013).FASE, 'extrajudicial');
    assert.ok(r.processoId);
    const p = await completarAtlas();
    recusado(await como('sergio', () => chamar('ccJurDossieEnviar', { processoId: p.ID })), /Gerente/);
    await salvarParametros('gustavo', [{ chave: 'jur.envioNivelMin', valor: '2' }]);
    const enviado = await nasDuasSessoes(async () => {
      const e = aceito(await como('sergio', () => chamar('ccJurDossieEnviar', { processoId: p.ID })));
      return [e.prazo, procPorId(p.ID).FASE, existe('ccCobEnviarJuridico') ? caso(3001).FASE : 'juridico'];
    });
    assert.deepEqual(enviado, ['2026-11-27', 'recebido', 'juridico']);
  });

  await teste('DT-34: envio, criação, carga e encerramento iguais nas duas sessões', async () => {
    const p = await completarAtlas();
    const r = await nasDuasSessoes(async () => {
      const env = aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: p.ID })));
      const cri = aceito(await julia('ccJurProcessoCriar', { clienteId: idDe(3015), carteira: 'PRIVADA', faseChave: 'peticao', valor: 4000 }));
      const car = aceito(await aplicar('julia', PLANILHA_TESTE[2]));
      aceito(await julia('ccJurProcessoEncerrar', { processoId: proc(3002).ID, motivo: 'QUITADO' }));
      const card = (id) => { const x = procPorId(id); return [x.FASE, x.RESPONSAVEL_ID === null ? 0 : n(x.RESPONSAVEL_ID), x.ENCERRADO_EM ? 1 : 0]; };
      return { envio: [env.prazo, ...card(p.ID)], criacao: card(cri.processoId), carga: [car.acao, ...card(car.processoId)], encerrado: card(proc(3002).ID),
        notas: notas(proc(3002).CARD_ID, 'Processo encerrado') };
    });
    assert.deepEqual([r.envio[1], r.criacao[0], r.carga[1], r.encerrado], ['recebido', 'peticao', 'acordo', ['encerrado', n(proc(3002).RESPONSAVEL_ID), 1]]);
    assert.equal(r.notas, 1);
  });

  await teste('RN-005: prazo inicial em dias úteis', async () => {
    const feriados = ['2026-11-20'];
    assert.equal(prazoInicial('2026-11-19', 5, feriados), '2026-11-27');
    assert.equal(prazoInicial('2026-11-19', 3, feriados), '2026-11-25');
    assert.equal(prazoInicial('2026-11-13', 5, feriados), '2026-11-23');
    await salvarParametros('gustavo', [{ chave: 'jur.prazoInicialDu', valor: '3' }]);
    const p = await completarAtlas();
    const r = aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: p.ID })));
    assert.equal(r.prazo, '2026-11-25');
  });

  await teste('RN-007: processo manual da Zeta e a rotina da cobrança', async () => {
    const r = aceito(await julia('ccJurProcessoCriar', { clienteId: idDe(3008), carteira: 'PRIVADA', faseChave: 'recebido', valor: 5000 }));
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PROCESSO WHERE CLIENTE_ID = ?', idDe(3008)), 2);
    assert.equal(n(consultar('SELECT NO_JURIDICO FROM CC_CLIENTE WHERE ID = ?', idDe(3008))[0].NO_JURIDICO), 1);
    const b = aceito(await abrir('bruno', 3008));
    assert.deepEqual([b.processoId, b.existente], [r.processoId, true]);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PROCESSO WHERE CLIENTE_ID = ?', idDe(3008)), 2);
    if (!existe('ccCobCasoSincronizar')) pular('depende de 002');
    assert.notEqual(caso(3008).FASE, 'juridico');
    await rodarRotinaAte();
    if (caso(3008).FASE !== 'juridico') {
      aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
      await rodarRotinaAte();
    }
    assert.equal(caso(3008).FASE, 'juridico');
    assert.equal(n(caso(3008).PROCESSO_ID), r.processoId);
  });

  /* ── processo ── */

  await teste('C-010: lista do Jurídico por grupo, linha, filial, carteira e busca', async () => {
    const t = await totais('julia');
    assert.deepEqual([n(t.TOTAL_ANDAMENTO), n(t.VALOR_ANDAMENTO)], [5, 320000]);
    assert.deepEqual([n(t.TOTAL_AJUIZAR), n(t.VALOR_AJUIZAR)], [4, 175000]);
    assert.deepEqual([n(t.TOTAL_ENCERRADO), n(t.VALOR_ENCERRADO)], [3, 42000]);
    assert.equal(n((await totais('julia', { linha: 'GALDERMA' })).TOTAL), 1);
    assert.equal(n((await totais('julia', { filial: '2', situacao: 'ATIVO' })).TOTAL), 3);
    assert.equal(n((await totais('julia', { carteira: 'PUBLICA' })).TOTAL), 1);
    assert.equal(n((await totais('julia', { carteira: 'ESTETICA' })).TOTAL), 1);
    const busca = await como('julia', () => linhas('ccJurProcessoListar', { busca: '0712345' }));
    assert.deepEqual(busca.map((l) => n(l.CLIENTE_ID)), [idDe(3002)]);
  });

  await teste('RN-008: a ajuizar até ter autos', async () => {
    const teta = proc(3010);
    assert.equal((await como('julia', () => linhas('ccJurProcessoListar', { grupo: 'AJUIZAR' }))).some((l) => n(l.ID) === n(teta.ID)), true);
    aceito(await julia('ccJurProcessoSalvar', { processoId: teta.ID, autos: '0701111-11.2026.8.09.0051' }));
    assert.equal(n((await totais('julia')).TOTAL_ANDAMENTO), 6);
    assert.equal(proc(3010).FASE, 'recebido');
  });

  await teste('RN-009: encerramento, volta ao dossiê e cadastro em citação', async () => {
    const l = aceito(await abrir('bruno', 3012));
    recusado(await julia('ccJurProcessoEncerrar', { processoId: l.processoId, motivo: 'OUTRO' }), /motivo/);
    aceito(await julia('ccJurProcessoEncerrar', { processoId: l.processoId, motivo: 'OUTRO', motivoTexto: 'Cliente pagou direto à filial' }));
    assert.equal(procPorId(l.processoId).FASE, 'encerrado');
    recusado(await mover('julia', procPorId(l.processoId), 'dossie'), /não volta/);
    const delta = proc(3006);
    const antes = contar('SELECT COUNT(*) AS N FROM CC_PROCESSO_ANDAMENTO WHERE PROCESSO_ID = ?', delta.ID);
    aceito(await mover('julia', delta, 'peticao'));
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PROCESSO_ANDAMENTO WHERE PROCESSO_ID = ?', delta.ID), antes);
    const b = aceito(await julia('ccJurProcessoEncerrar', { processoId: delta.ID, motivo: 'BAIXA_PERDA' }));
    assert.match(b.aviso, /baixa aprovada/);
    recusado(await julia('ccJurProcessoCriar', { clienteId: idDe(3015), carteira: 'PRIVADA', faseChave: 'citacao', valor: 1000 }), /número dos autos/);
  });

  await teste('RN-010: andamento não se altera; data inferida na carga', async () => {
    for (const nome of ['ccJurAndamentoSalvar', 'ccJurAndamentoRemover', 'ccJurAndamentoExcluir']) assert.equal(existe(nome), false);
    const gama = (await como('julia', () => linhas('ccJurProcessoListar', { busca: 'GAMA' })))[0];
    assert.equal(n(gama.DIAS_SEM_ANDAMENTO), 50);
    assert.equal(inferirData('05/11', '2026-11-19'), '2026-11-05');
    assert.equal(inferirData('20/12', '2026-11-19'), '2025-12-20');
    assert.equal(inferirData('', '2026-11-19'), '2026-11-19');
    aceito(await aplicar('julia', PLANILHA_TESTE[0]));
    const ems = consultar('SELECT A.EM FROM CC_PROCESSO_ANDAMENTO A JOIN CC_PROCESSO P ON P.ID = A.PROCESSO_ID JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE C.CODCLI = 3017 ORDER BY A.EM')
      .map((a) => a.EM.slice(0, 10));
    assert.deepEqual(ems, ['2025-10-02', '2025-12-20', '2026-11-05', '2026-11-19']);
  });

  await teste('C-011: andamento na Gama', async () => {
    const gama = proc(3005);
    assert.equal((await alertas({ tipo: 'parado' })).total, 1);
    recusado(await julia('ccJurAndamentoRegistrar', { processoId: gama.ID, texto: '' }));
    recusado(await como('bruno', () => chamar('ccJurAndamentoRegistrar', { processoId: gama.ID, texto: 'x' })), /permissão/);
    const r = aceito(await julia('ccJurAndamentoRegistrar', { processoId: gama.ID, texto: 'Bloqueio parcial via SISBAJUD', prazo: dia(2) }));
    assert.deepEqual([r.diasSemAndamento, r.diasPrazo], [0, 2]);
    assert.equal((await alertas({ tipo: 'parado' })).total, 0);
  });

  await teste('RN-012: número dos autos no padrão CNJ', async () => {
    assert.deepEqual([validarAutos('0712345-11.2024.8.07.0001').ok, validarAutos('0712345-11.2024.8.07.0001').ano], [true, 2024]);
    assert.equal(validarAutos('0712345-11.2024.8.07').ok, false);
    assert.equal(validarAutos('07123451120248070001X').ok, false);
    recusado(await julia('ccJurProcessoSalvar', { processoId: proc(3006).ID, autos: '0712345-11.2024.8.07' }), /CNJ/);
  });

  await teste('RN-015: valor recuperado', async () => {
    const rec = async (codcli) => (aceito(await ficha('julia', proc(codcli).ID))).processo.RECUPERADO;
    assert.deepEqual([await rec(3008), await rec(3011), await rec(3012), await rec(3003)], [20000, 10000, 0, 0]);
    aceito(await julia('ccJurProcessoSalvar', { processoId: proc(3012).ID, recuperadoInformado: 1500 }));
    assert.equal(await rec(3012), 1500);
    aceito(await julia('ccJurProcessoSalvar', { processoId: proc(3012).ID, recuperadoInformado: 0 }));
    assert.deepEqual([await rec(3012), proc(3012).RECUPERADO_INFORMADO], [0, null]);
  });

  await teste('RN-015: processo que já veio encerrado da carga não soma no recuperado do mês nem do ano', async () => {
    const [total, mes, ano] = await resumo();
    const r = aceito(await aplicar('julia', PLANILHA_TESTE[4]));
    assert.equal(procPorId(r.processoId).MOTIVO_ENCERRAMENTO, 'QUITADO');
    assert.deepEqual(await resumo(), [total + 3000, mes, ano]);
  });

  await teste('RN-032: linha Galderma', async () => {
    assert.equal(n((await totais('julia', { linha: 'GALDERMA' })).TOTAL), 1);
    aceito(await julia('ccJurProcessoSalvar', { processoId: proc(3005).ID, linha: 'GALDERMA' }));
    assert.equal(n((await totais('julia', { linha: 'GALDERMA' })).TOTAL), 2);
  });

  await teste('RNF-006: ficha sem acesso não devolve nada', async () => {
    const r = recusado(await ficha('bruno', proc(3001).ID), /não encontrado/);
    assert.doesNotMatch(JSON.stringify(r), /https?:/);
  });

  /* ── custos ── */

  await teste('C-012: custos do Vale Verde', async () => {
    const vale = proc(3002);
    recusado(await julia('ccJurCustoLancar', { processoId: vale.ID, tipo: 'PESQUISAS', valor: 0 }), /valor/);
    assert.equal((await alertas({ tipo: 'custo' })).total, 1);
    aceito(await julia('ccJurCustoLancar', { processoId: vale.ID, tipo: 'PESQUISAS', valor: 2600, data: dia(0) }));
    const r = await como('julia', () => linha('ccJurCustoResumo', { processoId: vale.ID }));
    assert.deepEqual([n(r.TOTAL), n(r.PCT_DO_VALOR)], [4100, 10.25]);
    assert.equal((await alertas({ tipo: 'custo' })).total, 2);
    const dil = consultar("SELECT ID FROM CC_PROCESSO_CUSTO WHERE PROCESSO_ID = ? AND TIPO = 'DILIGENCIA'", vale.ID)[0];
    const comp = await anexar('julia', vale.CARD_ID, 'comprovante-diligencia.pdf');
    aceito(await julia('ccJurCustoSalvar', { custoId: dil.ID, comprovanteKbAnexoId: comp }));
    assert.equal(n(consultar('SELECT PAGO FROM CC_PROCESSO_CUSTO WHERE ID = ?', dil.ID)[0].PAGO), 1);
    assert.equal(n((await como('julia', () => linha('ccJurCustoResumo', {}))).A_PAGAR), 2600);
  });

  await teste('RN-013: tipos e grupos de custo', async () => {
    assert.equal(TIPOS_CUSTO.length, 12);
    assert.equal(Object.keys(GRUPOS_CUSTO).length, 4);
    const grupo = (rotulo) => TIPOS_CUSTO.find((t) => t.rotulo === rotulo).grupo;
    assert.equal(grupo('Pesquisas (SISBAJUD, RENAJUD, INFOJUD, endereço)'), 'DILIGENCIAS');
    assert.equal(grupo('Cartório e protesto'), 'OUTROS');
    const r = aceito(await julia('ccJurIndicadores', {}));
    assert.equal(r.custos.numeros.semGuia, 1);
  });

  await teste('RN-014: alerta de custo acima da meta', async () => {
    const custo = await alertas({ tipo: 'custo' });
    assert.deepEqual(custo.linhas.map((l) => n(l.processoId)), [n(proc(3005).ID)]);
    aceito(await julia('ccJurCustoLancar', { processoId: proc(3008).ID, tipo: 'CARTORIO', valor: 3000 }));
    assert.equal((await alertas({ tipo: 'custo' })).total, 1);
  });

  /* ── acordo judicial ── */

  await teste('C-013: acordo da Eta em andamento', async () => {
    const eta = proc(3009);
    const r = aceito(await acordo('julia', eta.ID, 30000, 6000, 5));
    assert.deepEqual([r.situacao, r.honorarios], ['ANDAMENTO', 3000]);
    const ps = parcelasDe(r.acordoId);
    assert.deepEqual(ps.map((p) => p.NUMERO), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual([n(ps[0].VALOR), ps[0].VENCIMENTO], [6000, '2026-11-19']);
    assert.ok(ps.slice(1).every((p) => n(p.VALOR) === 4800));
    assert.deepEqual([ps[1].VENCIMENTO, ps[5].VENCIMENTO], ['2026-12-19', '2027-04-19']);
    assert.equal(consultar('SELECT APROVADO_POR FROM CC_ACORDO_JUDICIAL WHERE ID = ?', r.acordoId)[0].APROVADO_POR, null);
    aceito(await mover('julia', eta, 'acordo'));
  });

  await teste('C-014: alçada do acordo', async () => {
    const delta = aceito(await acordo('julia', proc(3006).ID, 70000, 14000, 5));
    assert.equal(delta.situacao, 'AGUARDANDO');
    recusado(await julia('ccJurAcordoAprovar', { acordoId: delta.acordoId, aprovar: 1 }), /alçada/);
    recusado(await como('sergio', () => chamar('ccJurAcordoAprovar', { acordoId: delta.acordoId, aprovar: 1 })), /alçada/);
    const gama = aceito(await acordo('gustavo', proc(3005).ID, 25000, 2000, 5));
    assert.equal(gama.situacao, 'AGUARDANDO');
    recusado(await como('gustavo', () => chamar('ccJurAcordoAprovar', { acordoId: gama.acordoId, aprovar: 1 })), /registrou/);
    aceito(await como('gustavo', () => chamar('ccJurAcordoAprovar', { acordoId: delta.acordoId, aprovar: 1 })));
    aceito(await como('diana', () => chamar('ccJurAcordoAprovar', { acordoId: gama.acordoId, aprovar: 1 })));
    const sit = consultar('SELECT ID, SITUACAO, APROVADO_POR FROM CC_ACORDO_JUDICIAL WHERE ID IN (?, ?) ORDER BY ID', delta.acordoId, gama.acordoId);
    assert.deepEqual(sit.map((a) => [a.SITUACAO, a.APROVADO_POR]), [['ANDAMENTO', M.gustavo], ['ANDAMENTO', M.diana]]);
  });

  await teste('C-014: Jurídico chamando a escrita direto não grava acordo acima da alçada como em andamento', async () => {
    const vale = proc(3002);
    await como(null, () => chamar('ccEscJurAcordoInserir', { processoId: vale.ID, valor: 70000, entrada: 14000, nParcelas: 5, honorarios: 7000, situacaoTexto: '',
      carga: 0, membroId: M.julia, agora: `${dia(0)}T10:00:00` }));
    const [a] = consultar('SELECT SITUACAO, NIVEL_EXIGIDO FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', vale.ID);
    assert.deepEqual([a.SITUACAO, n(a.NIVEL_EXIGIDO)], ['AGUARDANDO', 3]);
    await como(null, () => chamar('ccEscJurAcordoInserir', { processoId: proc(3009).ID, valor: 70000, entrada: 14000, nParcelas: 5, honorarios: 7000,
      situacaoTexto: '', carga: 1, membroId: M.julia, agora: `${dia(0)}T10:00:00` }));
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', proc(3009).ID), 0);
  });

  await teste('C-014: Júlia chamando as parcelas direto não grava parcela fora do acordo (entrada de R$ 0,01)', async () => {
    const eta = proc(3009);
    await direto('julia', 'ccEscJurAcordoInserir', { processoId: eta.ID, valor: 50000, entrada: 10000, nParcelas: 5, honorarios: 5000, situacaoTexto: '', carga: 0 });
    const [a] = consultar('SELECT ID, SITUACAO, NIVEL_EXIGIDO FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', eta.ID);
    assert.deepEqual([a.SITUACAO, n(a.NIVEL_EXIGIDO)], ['ANDAMENTO', 0]);
    const certas = gerarParcelas(50000, 10000, 5, dia(0));
    // Entrada de R$ 0,01 e parcelas de 10.000 vencendo em 2031: nenhuma entra.
    await parcelasDireto(a.ID, [{ numero: 0, valor: 0.01, vencimento: dia(0) }]);
    await parcelasDireto(a.ID, certas.slice(1).map((p) => ({ ...p, valor: 10000, vencimento: '2031-01-10' })));
    // Valor certo, vencimento além do registro + 31 dias por parcela: não entra.
    await parcelasDireto(a.ID, [{ ...certas[1], vencimento: '2031-01-10' }]);
    assert.equal(parcelasDe(a.ID).length, 0);
    // As parcelas da conta do acordo entram.
    await parcelasDireto(a.ID, certas);
    assert.deepEqual(parcelasDe(a.ID).map((p) => [p.NUMERO, n(p.VALOR)]), certas.map((p) => [p.numero, p.valor]));
  });

  await teste('C-014: Júlia com carga = 1 direto não grava acordo fora da política em andamento (500.000 em 60 parcelas)', async () => {
    const teta = proc(3010);
    assert.equal(teta.ORIGEM, 'CARGA');
    const carga = (valor, entrada, nParcelas) => direto('julia', 'ccEscJurAcordoInserir', { processoId: teta.ID, valor, entrada, nParcelas, honorarios: 0,
      situacaoTexto: 'Planilha', carga: 1 });
    await carga(500000, 0, 60);
    const [a] = consultar('SELECT ID, SITUACAO, ACIMA_ALCADA, NIVEL_EXIGIDO FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', teta.ID);
    assert.deepEqual([a.SITUACAO, n(a.ACIMA_ALCADA), n(a.NIVEL_EXIGIDO)], ['AGUARDANDO', 1, 3]);
    aceito(await como('gustavo', () => chamar('ccJurAcordoAprovar', { acordoId: a.ID, aprovar: 0, texto: 'Fora da política' })));
    // Depois de um acordo (mesmo recusado), a exceção da carga não vale mais.
    await carga(1000, 1000, 0);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', teta.ID), 1);
  });

  await teste('C-015: parcela de acordo aguardando aprovação não é paga', async () => {
    const delta = aceito(await acordo('julia', proc(3006).ID, 70000, 14000, 5));
    assert.equal(delta.situacao, 'AGUARDANDO');
    recusado(await julia('ccJurAcordoParcelaSituacao', { parcelaId: parcelasDe(delta.acordoId)[0].ID, situacao: 'PAGA', pagoEm: dia(0) }), /aguarda aprovação/);
    await direto('julia', 'ccEscJurAcordoParcela', { parcelaId: parcelasDe(delta.acordoId)[0].ID, situacao: 'PAGA', pagoEm: dia(0) });
    assert.equal(parcelasDe(delta.acordoId)[0].SITUACAO, 'ABERTA');
  });

  await teste('C-015: parcelas pagas quitam o acordo; encerramento por acordo cumprido', async () => {
    const eta = proc(3009);
    const r = aceito(await acordo('julia', eta.ID, 30000, 6000, 5));
    aceito(await mover('julia', eta, 'acordo'));
    const ps = parcelasDe(r.acordoId);
    recusado(await julia('ccJurAcordoParcelaSituacao', { parcelaId: ps[0].ID, situacao: 'PAGA', pagoEm: dia(1) }), /futura/);
    for (const p of ps.slice(0, 5)) assert.equal(aceito(await julia('ccJurAcordoParcelaSituacao', { parcelaId: p.ID, situacao: 'PAGA', pagoEm: dia(0) })).quitado, false);
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO_JUDICIAL WHERE ID = ?', r.acordoId)[0].SITUACAO, 'ANDAMENTO');
    assert.equal(proc(3009).FASE, 'acordo');
    assert.equal(aceito(await julia('ccJurAcordoParcelaSituacao', { parcelaId: ps[5].ID, situacao: 'PAGA', pagoEm: dia(0) })).quitado, true);
    recusado(await julia('ccJurProcessoEncerrar', { processoId: proc(3002).ID, motivo: 'ACORDO_CUMPRIDO' }), /quitado/);
    aceito(await julia('ccJurProcessoEncerrar', { processoId: eta.ID, motivo: 'ACORDO_CUMPRIDO' }));
    assert.equal(proc(3009).FASE, 'encerrado');
    assert.equal(notas(eta.CARD_ID, 'Acordo quitado: todas as parcelas pagas.'), 1);
    assert.equal((aceito(await ficha('julia', eta.ID))).processo.RECUPERADO, 30000);
  });

  await teste('RN-017: parcelas do acordo', async () => {
    const ps = gerarParcelas(1000, 200, 3, '2027-01-31');
    assert.deepEqual(ps.map((p) => p.valor), [200, 266.66, 266.66, 266.68]);
    assert.deepEqual(ps.slice(1, 3).map((p) => p.vencimento), ['2027-02-28', '2027-03-31']);
  });

  await teste('RN-018: honorários do acordo', async () => {
    assert.equal(aceito(await acordo('julia', proc(3009).ID, 30000, 6000, 5)).honorarios, 3000);
    await salvarParametros('gustavo', [{ chave: 'jur.honorariosPct', valor: '12' }]);
    assert.equal(aceito(await acordo('julia', proc(3002).ID, 30000, 6000, 5)).honorarios, 3600);
  });

  await teste('RN-019: política e recusa do acordo', async () => {
    const p = { 'jur.acordoEntradaMinPct': 20, 'jur.acordoParcelasMax': 5, 'jur.acordoAlcadaValor': 50000, 'jur.acordoAlcadaNivel': 3 };
    assert.equal(politicaDoAcordo(30000, 6000, 5, p).situacao, 'ANDAMENTO');
    const casos = [[3009, 30000, 6000, 5, 'ANDAMENTO'], [3002, 30000, 6000, 6, 'AGUARDANDO'], [3005, 50000, 10000, 5, 'ANDAMENTO'], [3006, 50000.01, 10000, 5, 'AGUARDANDO']];
    const ids = {};
    for (const [codcli, valor, entrada, nParc, sit] of casos) {
      const r = aceito(await acordo('julia', proc(codcli).ID, valor, entrada, nParc));
      assert.equal(r.situacao, sit, `${codcli}`);
      ids[codcli] = r.acordoId;
    }
    aceito(await como('gustavo', () => chamar('ccJurAcordoAprovar', { acordoId: ids[3002], aprovar: 0, texto: 'Entrada baixa' })));
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO_JUDICIAL WHERE ID = ?', ids[3002])[0].SITUACAO, 'RECUSADO');
    assert.equal(notas(proc(3002).CARD_ID, 'recusado'), 1);
    aceito(await acordo('julia', proc(3002).ID, 30000, 6000, 5));
    recusado(await acordo('julia', proc(3009).ID, 30000, 6000, 5), /acordo judicial/);
  });

  await teste('RN-020: parcela vencida e "a confirmar"', async () => {
    const nova = await como('julia', () => linhas('ccJurAcordoParcelaListar', {
      acordoId: consultar('SELECT ID FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', proc(3003).ID)[0].ID }));
    assert.equal(nova.filter((p) => n(p.VENCIDA) === 1).length, 1);
    const hoje = aceito(await acordo('julia', proc(3009).ID, 30000, 6000, 5));
    const ontem = aceito(await acordo('julia', proc(3002).ID, 30000, 6000, 5, { primeiroVencimento: dia(-1) }));
    const venc = async (acordoId) => n((await como('julia', () => linhas('ccJurAcordoParcelaListar', { acordoId })))[0].VENCIDA);
    assert.deepEqual([await venc(hoje.acordoId), await venc(ontem.acordoId)], [0, 1]);
    recusado(await julia('ccJurAcordoParcelaSituacao', { parcelaId: parcelasDe(hoje.acordoId)[1].ID, situacao: 'A_CONFIRMAR' }));
  });

  /* ── alertas e indicadores ── */

  await teste('C-016: alertas da carteira', async () => {
    const r = await alertas();
    assert.deepEqual([r.total, r.criticos], [13, 4]);
    const ordem = ['prazo', 'parcela', 'politica', 'semdossie', 'parado', 'custo', 'custas', 'carga', 'subst', 'suspenso', 'dossie', 'encsaldo', 'atvreg'];
    assert.deepEqual([...new Set(r.linhas.filter((l) => l.gravidade === 'atencao').map((l) => l.tipo))].every((t) => ordem.includes(t)), true);
    const tipos = r.linhas.map((l) => l.tipo);
    const criticos = r.linhas.filter((l) => l.gravidade === 'critico').map((l) => l.tipo);
    assert.deepEqual(criticos, ['prazo', 'parcela', 'politica', 'semdossie']);
    assert.deepEqual(tipos.filter((t, i) => tipos.indexOf(t) === i), ordem);
    assert.match(r.linhas.find((l) => l.tipo === 'prazo').texto, /9 dias/);
    assert.deepEqual((await alertas({ tipo: 'custo' })).linhas.map((l) => n(l.processoId)), [n(proc(3005).ID)]);
    const sem = r.linhas.find((l) => l.tipo === 'semdossie');
    assert.deepEqual([n(sem.clienteId), sem.processoId || 0], [idDe(3013), 0]);
  });

  await teste('RN-022: gravidade dos desvios', async () => {
    const grav = async (tipo, filtro = () => true) => (await alertas({ tipo })).linhas.filter(filtro).map((l) => l.gravidade);
    assert.deepEqual(await grav('prazo'), ['critico']);
    aceito(await julia('ccJurProcessoSalvar', { processoId: proc(3002).ID, prazo: dia(-5) }));
    assert.deepEqual(await grav('prazo'), ['atencao']);
    assert.deepEqual(await grav('parado'), ['atencao']);
    consultar("UPDATE CC_PROCESSO SET ULTIMO_ANDAMENTO_EM = '2026-09-15T12:00:00' WHERE ID = ? RETURNING 1", proc(3005).ID);
    assert.deepEqual(await grav('parado'), ['critico']);
    assert.deepEqual(await grav('politica'), ['critico']);
    aceito(await acordo('julia', proc(3009).ID, 30000, 6000, 6));
    assert.deepEqual(await grav('politica', (l) => n(l.processoId) === n(proc(3009).ID)), ['atencao']);
    assert.equal((await alertas({ tipo: 'semdossie' })).linhas.some((l) => n(l.clienteId) === idDe(3004)), false);
  });

  await teste('C-017 · RN-016: indicadores e resumo da carteira', async () => {
    const r = aceito(await julia('ccJurIndicadores', {}));
    const i = Object.fromEntries(r.indicadores.map((x) => [x.chave, x]));
    const v = (k) => i[k].valor;
    assert.deepEqual([v('01'), v('02'), i['02'].ticket, i['02'].carteira], [5, 320000, 64000, 495000]);
    assert.deepEqual([v('03'), i['03'].faixa, v('04'), i['04'].total, v('05')], [4, 'atencao', 1, 25000, 30000]);
    assert.deepEqual([v('06'), i['06'].faixa, v('07'), i['07'].quantidade, v('08')], [5.6, 'ruim', 0, 0, 0]);
    assert.deepEqual([r.acordosAguardando.quantidade, r.acordosAguardando.valor], [1, 60000]);
    assert.deepEqual([v('09'), i['09'].processos, v('10'), i['10'].faixa, v('11'), i['11'].faixa], [4500, 2, 0.9, 'bom', 6.7, 'bom']);
    assert.deepEqual([v('12'), i['12'].faixa, v('13'), i['13'].faixa, v('14'), i['14'].faixa], [2250, 'atencao', 1, 'ruim', 1, 'atencao']);
    assert.deepEqual([v('15'), i['15'].faixa, v('16'), i['16'].faixa, v('17'), i['17'].faixa], [1, 'atencao', 1, 'ruim', 48, 'atencao']);
    assert.deepEqual([v('18'), i['18'].faixa, v('19'), v('20'), v('21')], [40, 'atencao', 1, 3.7, 25]);
    assert.deepEqual([v('22'), i['22'].faixa, v('23'), i['23'].faixa, v('24'), r.concentracao], [66.7, 'atencao', 20, 'atencao', 1, 58.6]);
    const s = await como('julia', () => linha('ccJurResumo', {}));
    assert.deepEqual([s.ATIVOS, s.EM_DOSSIE, s.VALOR_EM_CAUSA, s.CUSTO_TOTAL, s.CUSTO_A_PAGAR, s.RECUPERADO].map(n), [9, 1, 495000, 4500, 300, 30000]);
    assert.deepEqual([s.AJUIZAR, s.VALOR_AJUIZAR, s.RECUPERADO_MES, s.RECUPERADO_ANO, s.CUSTO_MES, s.DESVIOS_PRAZO, s.DESVIOS_CRITICOS].map(n),
      [4, 175000, 0, 30000, 1200, 2, 1]);
    assert.equal(Math.round(30000 / (495000 + 42000) * 1000) / 10, 5.6);
  });

  await teste('RN-023: idade, acordo, edital e recorte por filial', async () => {
    const i = await indicadores();
    assert.deepEqual([i['20'].valor, i['23'].valor, i['21'].valor], [3.7, 20, 25]);
    assert.equal((await indicadores({ filial: '2' }))['01'].valor, 2);
  });

  await teste('C-024: meta de custo é parâmetro', async () => {
    await salvarParametros('gustavo', [{ chave: 'jur.custoMetaPct', valor: '15' }]);
    const a = await alertas();
    assert.deepEqual([a.linhas.filter((l) => l.tipo === 'custo').length, a.total], [0, 12]);
    await salvarParametros('gustavo', [{ chave: 'jur.custoMetaPct', valor: '10' }]);
    assert.match((await alertas({ tipo: 'custo' })).linhas[0].texto, /10%/);
  });

  await teste('RN-031: dossiê parado é parâmetro', async () => {
    assert.equal((await alertas({ tipo: 'dossie' })).linhas.some((l) => n(l.processoId) === n(proc(3001).ID)), true);
    await salvarParametros('gustavo', [{ chave: 'jur.dossieParadoDias', valor: '20' }]);
    assert.equal((await alertas({ tipo: 'dossie' })).linhas.some((l) => n(l.processoId) === n(proc(3001).ID)), false);
  });

  /* ── notificação e demonstrativo ── */

  await teste('C-018: notificação da Atlas', async () => {
    const atlas = proc(3001);
    const prev = aceito(await como('ana', () => chamar('ccJurNotificacaoPreparar', { clienteId: idDe(3001), carteira: 'PRIVADA' })));
    assert.match(prev.texto, /BENENUTRI COMERCIAL LTDA/);
    assert.match(prev.texto, /20\.720\.905\/0001-43/);
    const e = prev.demonstrativo;
    assert.equal(e.linhas.length, 2);
    assert.deepEqual([e.principal, e.multa, e.juros, e.correcao, e.total], [30000, 600, 348, 139.25, 31087.25]);
    const r = aceito(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA' })));
    assert.equal(r.prazoAte, '2026-12-04');
    assert.equal(notas(atlas.CARD_ID, '31.087,25'), 1);
    assert.equal(notas(atlas.CARD_ID, '04/12/2026'), 1);
    recusado(await julia('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA' }));
    aceito(await como('gustavo', () => chamar('ccJurFilialCredoraSalvar', { codigo: '3', razaoSocial: 'BENENUTRI FILIAL 3', uf: 'DF' })));
    recusado(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA', filial: '3' })), /CNPJ/);
    consultar("UPDATE CC_MODELO_MENSAGEM SET VALIDADO_VERSAO = NULL, VALIDADO_EM = NULL WHERE CODIGO = 'JUR_NOTIF_EXTRAJUDICIAL' RETURNING 1");
    recusado(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA' })), /validação/);
  });

  await teste('C-018: Ana chamando ccEscJurNotificacaoInserir direto não grava data, versão, valores nem processo de outro cliente', async () => {
    const cid = idDe(3001);
    const qtd = () => contar('SELECT COUNT(*) AS N FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE CLIENTE_ID = ?', cid);
    const antes = qtd();
    const valores = { principal: 30000, multa: 600, juros: 348, correcao: 139.25, total: 31087.25 };
    const notif = (extra) => direto('ana', 'ccEscJurNotificacaoInserir', { clienteId: cid, processoId: 0, cobrancaId: 0, filial: '1', prazoAte: dia(15),
      emitidaEm: '2026-01-02', modeloVersao: 99, ...valores, ...extra });
    consultar("UPDATE CC_MODELO_MENSAGEM SET VALIDADO_VERSAO = NULL, VALIDADO_EM = NULL WHERE CODIGO = 'JUR_NOTIF_EXTRAJUDICIAL' RETURNING 1");
    await notif({});
    assert.equal(qtd(), antes);
    aceito(await julia('ccBaseModeloValidar', { codigo: 'JUR_NOTIF_EXTRAJUDICIAL' }));
    await notif({ processoId: proc(3002).ID });
    await notif({ total: 1 });
    await notif({ principal: 1000000, total: 1001087.25 });
    assert.equal(qtd(), antes);
    await notif({});
    const [nova] = consultar('SELECT N.EMITIDA_EM, N.MODELO_VERSAO, M.VERSAO FROM CC_NOTIFICACAO_EXTRAJUDICIAL N JOIN CC_MODELO_MENSAGEM M ON M.CODIGO = ? WHERE N.CLIENTE_ID = ? ORDER BY N.ID DESC LIMIT 1',
      'JUR_NOTIF_EXTRAJUDICIAL', cid);
    assert.deepEqual([qtd(), nova.EMITIDA_EM, n(nova.MODELO_VERSAO)], [antes + 1, dia(0), n(nova.VERSAO)]);
    // Pela SF, processo de outro cliente também não vale: fica o processo do próprio cliente.
    const r = aceito(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: cid, carteira: 'PRIVADA', processoId: proc(3002).ID })));
    assert.equal(n(consultar('SELECT PROCESSO_ID FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE ID = ?', r.notificacaoId)[0].PROCESSO_ID || 0), 0);
  });

  await teste('C-018 (documento): texto da notificação', async () => {
    const t = aceito(await como('ana', () => chamar('ccJurNotificacaoPreparar', { clienteId: idDe(3001), carteira: 'PRIVADA' }))).texto;
    for (const h of ['1. Do débito', '2. Da constituição em mora e do prazo', '3. Da forma de pagamento e do contato', '4. Das medidas judiciais', '5. Da solução amigável']) {
      assert.ok(t.includes(h), h);
    }
    for (const s of ['R$ 31.087,25', '15 (quinze) dias corridos', 'Brasília/DF, 19 de novembro de 2026.']) assert.ok(t.includes(s), s);
    await salvarParametros('gustavo', [{ chave: 'enc.multa', valor: '0', carteira: 'PRIVADA', vigenciaInicio: dia(0) }]);
    const t2 = aceito(await como('ana', () => chamar('ccJurNotificacaoPreparar', { clienteId: idDe(3001), carteira: 'PRIVADA' }))).texto;
    assert.ok(t2.includes('R$ 30.487,25'));
  });

  await teste('RN-024: CNPJ ou CPF e prazo da notificação', async () => {
    const filial = { RAZAO_SOCIAL: 'X', CNPJ: '20720905000143', CIDADE_UF: 'Brasília/DF' };
    const enc = { linhas: [], principal: 0, multa: 0, juros: 0, correcao: 0, total: 0 };
    assert.match(montarNotificacao('1. Do débito', { filial, cliente: { NOME: 'A', DOCUMENTO: '12345678000190' }, encargos: enc, data: '2026-11-19' }), /CNPJ/);
    assert.match(montarNotificacao('1. Do débito', { filial, cliente: { NOME: 'A', DOCUMENTO: '12345678901' }, encargos: enc, data: '2026-11-19' }), /CPF/);
    await salvarParametros('gustavo', [{ chave: 'jur.notifPrazoDias', valor: '10' }]);
    assert.equal(aceito(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA' }))).prazoAte, '2026-11-29');
  });

  await teste('RN-025: modelo validado, contato e filial no texto', async () => {
    consultar("UPDATE CC_MODELO_MENSAGEM SET VALIDADO_VERSAO = NULL, VALIDADO_EM = NULL WHERE CODIGO = 'JUR_NOTIF_EXTRAJUDICIAL' RETURNING 1");
    recusado(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA' })), /validação/);
    aceito(await julia('ccBaseModeloValidar', { codigo: 'JUR_NOTIF_EXTRAJUDICIAL' }));
    aceito(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: idDe(3001), carteira: 'PRIVADA' })));
    const t = aceito(await como('ana', () => chamar('ccJurNotificacaoPreparar', { clienteId: idDe(3001), carteira: 'PRIVADA' }))).texto;
    const [tel] = consultar("SELECT VALOR FROM CC_PARAMETRO WHERE CHAVE = 'com.telefone' ORDER BY ID DESC LIMIT 1");
    if (tel && tel.VALOR) assert.ok(t.includes(tel.VALOR));
    assert.ok(t.includes('Banco do Brasil, agência 1234-5'));
    assert.ok(t.includes('Gustavo Lima · Gerente Financeiro'));
  });

  await teste('C-019 · RN-026: demonstrativo da Iota igual ao cálculo de encargos', async () => {
    const d = aceito(await como('ana', () => chamar('ccJurDemonstrativoPreparar', { clienteId: idDe(3013), carteira: 'PRIVADA' })));
    assert.deepEqual(d.linhas.map((l) => [n(l.SALDO), l.DIAS, l.JUROS, l.CORRECAO]), [[20000, 52, 346.67, 138.87], [13000, 40, 173.33, 69.38]]);
    assert.deepEqual([d.principal, d.multa, d.juros, d.correcao, d.total], [33000, 660, 520, 208.25, 34388.25]);
    const e = aceito(await como('ana', () => chamar('ccCobEncargosCalcular', { clienteId: idDe(3013), carteira: 'PRIVADA', data: '2026-11-19' })));
    assert.deepEqual([d.principal, d.multa, d.juros, d.correcao, d.total], [e.principal, e.multa, e.juros, e.correcao, e.total]);
    assert.deepEqual([d.rotulos.multa, d.rotulos.juros, d.rotulos.correcao],
      ['Multa (2%)', 'Juros de mora (1% ao mês, pro rata por título)', 'Correção monetária (0,4% ao mês)']);
  });

  /* ── carga inicial ── */

  await teste('C-020 · RN-027: prévia e aplicação da planilha de teste', async () => {
    const pr = aceito(await julia('ccJurCargaPrevia', { linhas: JSON.stringify(PLANILHA_TESTE) }));
    assert.equal(pr.linhas.length, 5);
    assert.ok(pr.linhas.every((l) => l.acao === 'NOVO'));
    const cont = (f) => PLANILHA_TESTE.filter(f).length;
    assert.deepEqual([cont((l) => l.faseChave === 'citacao'), cont((l) => l.faseChave === 'peticao'), cont((l) => l.faseChave === 'acordo'), cont((l) => l.faseChave === 'encerrado')], [1, 2, 1, 1]);
    assert.equal(pr.linhas.filter((l) => l.candidatos.some((c) => c.motivo === 'CODIGO')).length, 3);
    const xi = pr.linhas[1].candidatos;
    assert.deepEqual(xi.map((c) => [c.codcli, c.motivo, c.semelhanca]), [[3018, 'NOME', 1]]);
    assert.equal(pr.linhas[4].candidatos.length, 0);
    assert.ok(pr.linhas[0].alertas.some((a) => /Divergência/.test(a)));
    assert.equal(semelhanca('Xi Distribuidra', 'XI DISTRIBUIDORA LTDA'), 1);
    assert.equal(await pendencias(), 1);
    const total = () => contar('SELECT COUNT(*) AS N FROM CC_PROCESSO');
    const antes = total();
    for (const l of PLANILHA_TESTE) assert.equal(aceito(await aplicar('julia', l)).acao, 'NOVO');
    assert.equal(total(), antes + 5);
    const nu = proc(3017);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PROCESSO_ANDAMENTO WHERE PROCESSO_ID = ?', nu.ID), 4);
    assert.equal(n(nu.SUBSTABELECER), 1);
    assert.equal(consultar("SELECT CLIENTE_ID FROM CC_PROCESSO WHERE CHAVE_CARGA = 'XI DISTRIBUIDRA'")[0].CLIENTE_ID, null);
    const pi = proc(3019);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = PA.ACORDO_ID WHERE AJ.PROCESSO_ID = ?', pi.ID), 3);
    assert.equal(await pendencias(), 5);
    recusado(await julia('ccJurCargaAplicar', { linhas: JSON.stringify(PLANILHA_TESTE.slice(0, 2)) }), /um processo/);
    for (const l of PLANILHA_TESTE) assert.equal(aceito(await aplicar('julia', l)).acao, 'IGNORA');
    assert.equal(total(), antes + 5);
  });

  await teste('C-020: conclusão da carga', async () => {
    recusado(await julia('ccJurCargaConcluir', {}));
    recusado(await como('sergio', () => chamar('ccJurCargaConcluir', {})));
    aceito(await como('nara', () => chamar('ccJurCargaConcluir', {})));
    recusado(await julia('ccJurCargaPrevia', { linhas: JSON.stringify(PLANILHA_TESTE.slice(0, 1)) }), /concluída/);
    recusado(await aplicar('julia', PLANILHA_TESTE[0]), /concluída/);
    // Quem administra não reabre a carga pela escrita direta da base (RF-038: conclusão definitiva).
    await direto('nara', 'ccEscBaseEstado', { chave: 'jur.cargaConcluida', valor: '0' });
    assert.equal(consultar("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'jur.cargaConcluida'")[0].VALOR, '1');
    recusado(await julia('ccJurCargaPrevia', { linhas: JSON.stringify(PLANILHA_TESTE.slice(0, 1)) }), /concluída/);
    // Nem a escrita da carga nem a exceção do acordo valem depois de concluída.
    await direto('julia', 'ccEscJurAcordoInserir', { processoId: proc(3010).ID, valor: 1000, entrada: 1000, nParcelas: 0, honorarios: 0, situacaoTexto: '', carga: 1 });
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', proc(3010).ID), 0);
  });

  await teste('C-021: acordo da Pi e pendências da carga', async () => {
    for (const l of PLANILHA_TESTE) aceito(await aplicar('julia', l));
    const [ac] = consultar('SELECT ID FROM CC_ACORDO_JUDICIAL WHERE PROCESSO_ID = ?', proc(3019).ID);
    const ps = parcelasDe(ac.ID);
    assert.deepEqual(ps.map((p) => [p.NUMERO, p.SITUACAO, p.ORIGEM_SITUACAO]), [[0, 'PAGA', 'COR_PLANILHA'], [1, 'ABERTA', 'COR_PLANILHA'], [2, 'A_CONFIRMAR', 'COR_PLANILHA']]);
    assert.equal(await pendencias(), 5);
    aceito(await julia('ccJurAcordoParcelaSituacao', { parcelaId: ps[2].ID, situacao: 'ABERTA' }));
    assert.equal(parcelasDe(ac.ID)[2].ORIGEM_SITUACAO, 'MANUAL');
    assert.equal(await pendencias(), 4);
    const nu = proc(3017);
    aceito(await julia('ccJurCargaConferir', { processoId: nu.ID }));
    assert.equal(await pendencias(), 3);
    assert.equal((await alertas({ tipo: 'carga' })).linhas.some((l) => n(l.processoId) === n(nu.ID)), false);
    assert.equal((JSON.parse(proc(3017).VALORES_JSON).etiquetas || []).includes(chaveDeRotulo('Carga a conferir')), false);
  });

  await teste('RN-029: chave da carga e reaplicação', async () => {
    assert.equal(chaveDaCarga(PLANILHA_TESTE[0]), '08012345520258070001');
    assert.equal(chaveDaCarga(PLANILHA_TESTE[1]), 'XI DISTRIBUIDRA');
    for (const l of PLANILHA_TESTE) aceito(await aplicar('julia', l));
    aceito(await aplicar('julia', { ...PLANILHA_TESTE[0], valor: 99999 }));
    assert.equal(n(proc(3017).VALOR), 8000);
    const ro = proc(3020);
    consultar('UPDATE CC_PROCESSO SET CARD_ID = NULL WHERE ID = ? RETURNING 1', ro.ID);
    assert.equal(aceito(await aplicar('julia', PLANILHA_TESTE[3])).acao, 'ATUALIZA');
    assert.ok(procPorId(ro.ID).CARD_ID);
  });

  await teste('C-023: Hospital Santa Maria sem código', async () => {
    const pr = aceito(await julia('ccJurCargaPrevia', { linhas: JSON.stringify(PLANILHA_SANTA_MARIA) }));
    assert.deepEqual(pr.linhas[0].candidatos.map((c) => [c.codcli, c.motivo]).sort(), [[3015, 'NOME'], [3016, 'NOME']]);
    const r = aceito(await aplicar('julia', { ...PLANILHA_SANTA_MARIA[0], clienteId: 999999 }));
    assert.equal(procPorId(r.processoId).CLIENTE_ID, null);
    const achado = await como('gustavo', () => chamar('ccBaseClienteListar', { busca: '30160000000130', limite: '20', offset: '0', setor: '', carteira: '', agenteId: '0',
      analistaId: '0', buId: '-1', uf: '', tipoPessoa: '', soVencidos: '0', ordem: 'NOME', situacaoFicha: '', ativo: '-1', semBu: '0', comAtraso: '0' }));
    assert.deepEqual(achado.rows.map((l) => n(l.CODCLI)), [3016]);
    aceito(await julia('ccJurProcessoVincularCliente', { processoId: r.processoId, clienteId: idDe(3016) }));
    assert.equal(n(procPorId(r.processoId).CLIENTE_ID), idDe(3016));
    recusado(await julia('ccJurProcessoVincularCliente', { processoId: r.processoId, clienteId: 999999 }), /não encontrado/);
  });

  await teste('RN-011: vínculo pelo cliente escolhido; setor e pendência', async () => {
    const r = aceito(await aplicar('julia', { ...PLANILHA_SANTA_MARIA[0], clienteId: idDe(3016) }));
    const p = procPorId(r.processoId);
    assert.deepEqual([n(p.CLIENTE_ID), p.SETOR], [idDe(3016), 'PRIVADO']);
    const doc = (busca) => como('gustavo', () => chamar('ccBaseClienteListar', { busca, limite: '20', offset: '0', setor: '', carteira: '', agenteId: '0', analistaId: '0',
      buId: '-1', uf: '', tipoPessoa: '', soVencidos: '0', ordem: 'NOME', situacaoFicha: '', ativo: '-1', semBu: '0', comAtraso: '0' }));
    // ccBaseClienteListar (001) compara DOCUMENTO só com dígitos: a tela tira a pontuação antes de buscar.
    const a = await doc('30.160.000/0001-30'.replace(/\D/g, ''));
    const b = await doc('30160000000130');
    assert.deepEqual(a.rows.map((l) => n(l.CODCLI)), [3016]);
    assert.deepEqual(b.rows.map((l) => n(l.CODCLI)), [3016]);
    const sem = aceito(await aplicar('julia', { ...PLANILHA_SANTA_MARIA[0], nomeDevedor: 'Hospital Santa Maria Filial', valor: 100 }));
    const antes = await pendencias();
    aceito(await julia('ccJurProcessoVincularCliente', { processoId: sem.processoId, clienteId: idDe(3015) }));
    assert.equal(await pendencias(), antes - 1);
  });

  /* ── permissões ── */

  await teste('C-022: visibilidade e quem move', async () => {
    const quantos = async (login) => n((await totais(login)).TOTAL);
    const esperado = { ana: 3, bruno: 8, carlos: 1, sergio: 11, silvia: 1, julia: 12, gustavo: 12, diana: 12, nara: 12 };
    for (const [login, qtd] of Object.entries(esperado)) assert.equal(await quantos(login), qtd, login);
    const r = aceito(await aplicar('julia', PLANILHA_TESTE[4]));
    assert.equal(aceito(await ficha('julia', r.processoId)).processo.ID, r.processoId);
    recusado(await ficha('bruno', r.processoId), /não encontrado/);
    recusado(await mover('ana', proc(3001), 'peticao'), /Só o Jurídico/);
    recusado(await mover('sergio', proc(3002), 'sentenca'), /Só o Jurídico/);
    recusado(await como('bruno', () => chamar('ccJurCustoLancar', { processoId: proc(3005).ID, tipo: 'OUTROS', valor: 10 })));
  });

  await teste('RN-030: matriz de permissões', async () => {
    recusado(await abrir('bruno', 3001));
    recusado(await abrir('silvia', 3013));
    recusado(await julia('ccJurFilialCredoraSalvar', { codigo: '2', razaoSocial: 'X' }));
    aceito(await como('gustavo', () => chamar('ccJurFilialCredoraSalvar', { codigo: '2', razaoSocial: 'BENENUTRI GOIAS LTDA', uf: 'GO' })));
    recusado(await como('ana', () => chamar('ccJurCargaPrevia', { linhas: JSON.stringify(PLANILHA_TESTE.slice(0, 1)) })));
    const antes = contar('SELECT COUNT(*) AS N FROM CC_PROCESSO');
    aceito(await julia('ccJurCargaPrevia', { linhas: JSON.stringify(PLANILHA_TESTE.slice(0, 1)) }));
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PROCESSO'), antes);
    assert.equal(n((await totais('rita')).TOTAL), 0);
    recusado(await como('visitante', () => chamar('ccJurProcessoFicha', { processoId: proc(3001).ID })), /equipe/);
  });

  /* ── orçamento (RNF) ── */

  await teste('Orçamento: execuções por clique', async () => {
    const abrirIota = await execucoes(async () => aceito(await abrir('ana', 3013)));
    assert.ok(abrirIota <= 20, `abrir ${abrirIota}`);
    const p = await completarAtlas();
    const enviar = await execucoes(async () => aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: p.ID }))));
    assert.ok(enviar <= 30, `enviar ${enviar}`);
    const carga = await execucoes(async () => aceito(await aplicar('julia', PLANILHA_TESTE[2])));
    assert.ok(carga <= 20, `carga ${carga}`);
    const ac = await execucoes(async () => aceito(await acordo('julia', proc(3009).ID, 30000, 6000, 5)));
    assert.ok(ac <= 20, `acordo ${ac}`);
    const and = await execucoes(async () => aceito(await julia('ccJurAndamentoRegistrar', { processoId: proc(3005).ID, texto: 'Petição juntada' })));
    assert.ok(and <= 12, `andamento ${and}`);
    // Aba Processos (plan, Superfície): sessão + 2 da lib + alertas + indicadores + parâmetros do grupo jur.
    const boardId = consultar("SELECT ID FROM KB_BOARD WHERE SLUG = 'juridico'")[0].ID;
    const aba = await execucoes(() => como('julia', async () => {
      await chamar('ccBaseSessao');
      await chamar('kbBoardCarregar', { boardId, slug: '' });
      await chamar('kbCardsListar', { boardId, slug: '', faseId: 0, busca: '', responsavelId: 0, etiqueta: '', filtrosJson: '', atrasados: 0, ordem: '',
        incluirConcluidos: 0, limite: 50, offset: 0 });
      aceito(await chamar('ccJurAlertas', {}));
      aceito(await chamar('ccJurIndicadores', {}));
      await chamar('ccBaseParametroListar', { data: '', carteira: '', grupo: 'jur' });
    }));
    assert.ok(aba <= 6, `aba ${aba}`);
    // Card (em dossie, privada e pública) = detalhe da lib + ficha; rota do dossiê = sessão + ficha.
    const pub = aceito(await abrir('carlos', 3004, 'PUBLICA'));
    for (const [login, pid] of [['ana', n(proc(3013).ID)], ['carlos', pub.processoId]]) {
      assert.equal(procPorId(pid).FASE, 'dossie');
      const card = await execucoes(() => como(login, async () => {
        await chamar('kbCardDetalheSql', { cardId: procPorId(pid).CARD_ID });
        aceito(await chamar('ccJurProcessoFicha', { processoId: pid }));
      }));
      const rota = await execucoes(() => como(login, async () => { await chamar('ccBaseSessao'); aceito(await chamar('ccJurProcessoFicha', { processoId: pid })); }));
      assert.deepEqual([card, rota], [2, 2], login);
    }
    const sug = await execucoes(async () => aceito(await como('ana', () => chamar('ccJurDossieSugestao', { processoId: proc(3013).ID }))));
    assert.ok(sug <= 6, `sugestões ${sug}`);
  });
}
