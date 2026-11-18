// Smoke da 002-cobranca (plan, seção Testes). Cada teste() começa de uma cópia do banco do passo 11, em D.
// "Leitura" = ccBaseSincronizacaoPedir como Gustavo + rotina até leitura e processamento terminarem.

import {
  teste, pular, consultar, como, chamar, rodarCron, rodarRotinaAte, execucoes, nasDuasSessoes, existe,
  assert, U, M, dia, nota, cliente, fixarRelogio, comRelogio, D,
} from './base.mjs';
import { chaveDeRotulo } from '@benenutri/mitra-kanban/motor';
import { nomeDaFase } from '../../lib/cobranca-privada/regua.mjs';
import { MODELOS } from '../../lib/modelos/002-cobranca-privada.mjs';

export const SEEDS = ['002'];
export const RELOGIO = D;
export const BANCO_POR_TESTE = true;

/* ── ajudantes ── */

const PADRAO = {
  busca: '', limite: '100', offset: '0', carteira: '', agenteId: '0', buId: '-1', membroId: '0', clienteId: '0', cobrancaId: '0', nfId: '0',
  situacao: '', filtro: '', retorno: '', promessa: '', de: '', ate: '', dias: '30',
};
const linhas = async (nome, input = {}) => (await chamar(nome, { ...PADRAO, ...input })).rows;
const linha = async (nome, input) => (await linhas(nome, input))[0];
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => { assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 300)}`); if (re) assert.match(r.error, re); return r; };
const n = (v) => Number(v);
const contar = (sql, ...p) => n(consultar(sql, ...p)[0].N);
const idDe = (codcli) => consultar('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli)[0]?.ID;
const caso = (codcli, carteira = 'PRIVADA') => consultar(`SELECT CB.*, F.CHAVE AS FASE, K.VALORES_JSON, K.RESPONSAVEL_ID, F.QUADRO
FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE C.CODCLI = ? AND CB.CARTEIRA = ? ORDER BY CB.ID DESC LIMIT 1`, codcli, carteira)[0];
const valores = (c) => JSON.parse(c.VALORES_JSON || '{}');
const etiqueta = (c, rotulo) => (valores(c).etiquetas || []).includes(chaveDeRotulo(rotulo));
const faseId = (quadro, chave) => consultar('SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ? AND CHAVE = ?', quadro, chave)[0].FASE_ID;
const mover = (login, c, chave) => como(login, () => chamar('kbCardMover', { cardId: c.CARD_ID, faseId: faseId(c.QUADRO, chave), ordem: 0 }));
const notas = (c, texto) => contar("SELECT COUNT(*) AS N FROM KB_LOG WHERE CARD_ID = ? AND EVENTO = 'nota' AND DETALHE LIKE ?", c.CARD_ID, `%${texto}%`);
const auditoria = (area, por, id = 0) => contar('SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = ? AND POR = ? AND (? = 0 OR ENTIDADE_ID = ?)', area, por, id, id);
const salvarParametros = (login, itens) => como(login, () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify(itens) }));

/** Relógio + `min` minutos (cada teste roda numa cópia; o relógio volta a D no próximo). */
function avancar(min) {
  return fixarRelogio(new Date(Date.parse(`${process.env.CC_AGORA}Z`) + min * 60000).toISOString().slice(0, 19));
}
async function leitura() {
  avancar(1);
  aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
  await rodarRotinaAte();
}
/** Paga no Winthor simulado os títulos em aberto do cliente (todos ou os de `codprod`). */
function pagar(codcli, codprod) {
  const extra = codprod ? 'AND NUMTRANSVENDA IN (SELECT NUMTRANSVENDA FROM PCMOV WHERE CODPROD = ?)' : '';
  consultar(`UPDATE PCPREST SET VPAGO = VALOR, DTPAG = ? WHERE CODCLI = ? AND DTPAG IS NULL ${extra} RETURNING 1`, dia(0), codcli, ...(codprod ? [codprod] : []));
}
const contato = (login, codcli, extra) => como(login, () => chamar('ccCobContatoRegistrar', {
  clienteId: idDe(codcli), carteira: 'PRIVADA', canal: 'Telefone', retorno: 'Promessa de pagamento', feedback: 'Falou com o financeiro.', ...extra,
}));
const propor = (login, codcli, extra) => como(login, () => chamar('ccCobAcordoPropor', {
  cobrancaId: caso(codcli).ID, debito: n(consultar(`SELECT VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ? AND CARTEIRA = 'PRIVADA'`, idDe(codcli))[0].VENCIDO),
  entradaData: dia(0), primeiroVenc: dia(30), intervaloDias: 30, ...extra,
}));
const decidirAcordo = (login, acordoId, aprovar = 1, parecer = '') => como(login, () => chamar('ccCobAcordoDecidir', { acordoId, aprovar, parecer }));
const MOTIVO = 'Esgotadas as vias de cobrança';

/** Dossiê da 003 aberto por `login`, com os itens pendentes marcados "não se aplica"; devolve o processoId. */
async function dossieMontado(login, codcli, carteira = 'PRIVADA') {
  const d = aceito(await como(login, () => chamar('ccJurDossieAbrir', { clienteId: idDe(codcli), carteira })));
  for (const it of consultar("SELECT ID FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ? AND SITUACAO = 'PENDENTE' AND ITEM <> 'alcada'", d.processoId)) {
    aceito(await como(login, () => chamar('ccJurDossieItemMarcar', { itemId: it.ID, situacao: 'NA', obs: 'Teste da 002.' })));
  }
  return d.processoId;
}
const enviarDossie = (processoId) => como('gustavo', () => chamar('ccJurDossieEnviar', { processoId }));

export async function suite() {
  /* ── régua ── */

  await teste('C-001: cliente entra na régua pelo atraso', async () => {
    const c = caso(2015);
    assert.equal(c.FASE, 'cob_ativa');
    assert.equal(c.BLOQUEIO_DEVIDO, 'PEDIDOS');
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ?', c.ID), 0);
    const l = await como('ana', () => linhas('ccCobBloqueioListar', { situacao: 'BLOQUEAR_PEDIDOS', busca: '2015' }));
    assert.deepEqual(l.map((x) => [x.DEVIDO, x.APLICADO]), [['PEDIDOS', '']]);
  });

  await teste('C-002 · RN-002: preventiva antes do vencimento e pago no prazo', async () => {
    assert.deepEqual([2016, 2017, 2018].map((x) => caso(x).FASE), ['prev_d5', 'prev_d1', 'venc_d0']);
    assert.deepEqual([2016, 2017, 2018].map((x) => n(valores(caso(x)).a_vencer)), [8000, 4500, 2000]);
    assert.deepEqual([2001, 2002, 2003].map((x) => caso(x).FASE), ['prev_d5', 'prev_d1', 'venc_d0']);
    pagar(2003);
    await leitura();
    const c = caso(2003);
    assert.equal(c.DESFECHO, 'PAGO_NO_PRAZO');
    assert.equal(c.FASE, 'pago_no_prazo');
  });

  await teste('C-002 · RN-002: boleto pago no vencimento e lido depois continua pago no prazo', async () => {
    // 2003 e 2018 vencem em D. A leitura do dia seguinte ainda não traz o pagamento; ele chega com DTPAG = D.
    const id2003 = caso(2003).ID;
    const id2018 = caso(2018).ID;
    const pagarEm = (codcli, data) => consultar('UPDATE PCPREST SET VPAGO = VALOR, DTPAG = ? WHERE CODCLI = ? AND DTPAG IS NULL RETURNING 1', data, codcli);
    const porId = (id) => consultar('SELECT CB.DESFECHO, F.CHAVE AS FASE FROM CC_COBRANCA CB JOIN KB_CARD K ON K.ID = CB.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE CB.ID = ?', id)[0];
    avancar(24 * 60);
    await leitura();
    assert.equal(porId(id2003).FASE, 'venc_d0');
    pagarEm(2003, '2026-11-19');
    await leitura();
    assert.deepEqual(Object.values(porId(id2003)), ['PAGO_NO_PRAZO', 'pago_no_prazo']);
    // Três dias sem o pagamento: o card já foi a pag_nao_ident; pago em D, segue no prazo.
    avancar(2 * 24 * 60);
    await leitura();
    assert.equal(porId(id2018).FASE, 'pag_nao_ident');
    pagarEm(2018, '2026-11-19');
    await leitura();
    assert.deepEqual(Object.values(porId(id2018)), ['PAGO_NO_PRAZO', 'pago_no_prazo']);
  });

  await teste('C-003 · RF-036: quem pagou sai da cobrança', async () => {
    const antes = caso(2019);
    assert.equal(antes.FASE, 'notif_formal');
    assert.equal(antes.BLOQUEIO_APLICADO, 'PEDIDOS');
    const movs = contar("SELECT COUNT(*) AS N FROM KB_MOVIMENTO WHERE CARD_ID = ? AND ORIGEM = 'sistema'", antes.CARD_ID);
    pagar(2019);
    await leitura();
    const c = caso(2019);
    assert.equal(c.DESFECHO, 'REGULARIZADO');
    assert.equal(c.FASE, 'regularizado');
    assert.equal(contar("SELECT COUNT(*) AS N FROM KB_MOVIMENTO WHERE CARD_ID = ? AND ORIGEM = 'sistema'", c.CARD_ID), movs + 1);
    const l = await como('ana', () => linhas('ccCobBloqueioListar', { situacao: 'LIBERAR', busca: '2019' }));
    assert.equal(l.length, 1);
  });

  await teste('RF-036 · 01 §7: a rotina audita o que decide', async () => {
    const linha = (campo, id, depois) => contar('SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE POR IS NULL AND CAMPO = ? AND ENTIDADE_ID = ? AND DEPOIS LIKE ?', campo, id, `${depois}%`);
    // Do seed (passo 11): acordo de 2028 quebrado e a promessa de 2008 quebrada.
    const [ac] = consultar('SELECT ID FROM CC_ACORDO WHERE COBRANCA_ID = ?', caso(2028).ID);
    const [pr] = consultar('SELECT ID FROM CC_PROMESSA WHERE COBRANCA_ID = ? ORDER BY ID', caso(2008).ID);
    assert.deepEqual([linha('Situação', ac.ID, 'QUEBRADO'), linha('Situação', pr.ID, 'QUEBRADA')], [1, 1]);
    // Abertura, mudança de etapa pela régua e encerramento.
    cliente({ codcli: 2091, nome: 'NOVO ATRASO', ramo: 2, limite: 1000 });
    nota({ codcli: 2091, n: 1, emissao: dia(-40), itens: [{ codprod: 101, valor: 500 }], parcelas: [{ prest: 1, valor: 500, venc: dia(-5) }] });
    nota({ codcli: 2033, n: 60, emissao: dia(-40), itens: [{ codprod: 101, valor: 100 }], parcelas: [{ prest: 1, valor: 100, venc: dia(-8) }] });
    pagar(2019);
    await leitura();
    assert.equal(linha('(criação)', caso(2091).ID, 'PRIVADA · cob_ativa'), 1);
    assert.equal(linha('Etapa', caso(2033).ID, 'notif_formal'), 1);
    assert.equal(linha('Encerramento', caso(2019).ID, 'REGULARIZADO'), 1);
  });

  await teste('C-004: Estética com régua própria', async () => {
    aceito(await salvarParametros('gustavo', [{ chave: 'regua.lig', carteira: 'ESTETICA', valor: '6' }]));
    await leitura();
    assert.equal(caso(2020, 'ESTETICA').FASE, 'pag_nao_ident');
    assert.equal(caso(2020, 'ESTETICA').QUADRO, 'cobranca-estetica');
    assert.equal(caso(2015).FASE, 'cob_ativa');
    assert.equal(nomeDaFase('cob_ativa', { 'regua.lig': 6 }), 'D+6 · Cobrança ativa');
    aceito(await salvarParametros('gustavo', [{ chave: 'regua.lig', carteira: 'ESTETICA', valor: null }]));
    await leitura();
    assert.equal(caso(2020, 'ESTETICA').FASE, 'cob_ativa');
    assert.equal(caso(2012, 'ESTETICA').FASE, 'cob_ativa');
  });

  await teste('C-005: ação da régua feita', async () => {
    const c = caso(2005);
    const r1 = aceito(await como('ana', () => chamar('ccCobAcaoRegistrar', { cobrancaId: c.ID, itens: '1' })));
    assert.equal(r1.acaoFeita, false);
    const r2 = aceito(await como('ana', () => chamar('ccCobAcaoRegistrar', { cobrancaId: c.ID, itens: '2' })));
    assert.equal(r2.acaoFeita, true);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ? AND FASE_CHAVE = 'cob_ativa'", c.ID), 1);
    assert.notEqual(String(valores(caso(2005)).cob_ativa_3 ?? ''), '1');
    const agenda = await como('ana', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    assert.equal(agenda.filter((e) => e.COBRANCA_ID === c.ID && e.TIPO === 'ACAO_REGUA').length, 0);
  });

  await teste('C-006: a régua não se move à mão', async () => {
    const r = await nasDuasSessoes(async () => {
      const a = await mover('ana', caso(2016), 'negociacao');
      const b = await mover('ana', caso(2015), 'prev_d1');
      return [a.ok, /saldo vencido/.test(a.error), b.ok, /A régua move/.test(b.error), caso(2016).FASE, caso(2015).FASE];
    });
    assert.deepEqual(r, [false, true, false, true, 'prev_d5', 'cob_ativa']);
  });

  await teste('C-007: voltar da negociação para a régua', async () => {
    assert.equal(caso(2021).FASE, 'negociacao');
    aceito(await mover('ana', caso(2021), 'extrajudicial'));
    await leitura();
    assert.equal(caso(2021).FASE, 'protesto');
    aceito(await mover('ana', caso(2021), 'negociacao'));
    aceito(await propor('ana', 2021, { valor: 15000, entrada: 3000, nParcelas: 4 }));
    recusado(await mover('ana', caso(2021), 'protesto'), /acordo em aberto/);
    assert.equal(caso(2021).FASE, 'negociacao');
  });

  await teste('C-008: destinos que só o sistema alcança', async () => {
    const r = [];
    for (const destino of ['baixado', 'regularizado', 'acordo', 'juridico']) r.push((await mover('ana', caso(2015), destino)).error);
    assert.match(r[0], /encerrado pelo sistema/);
    assert.match(r[1], /encerrado pelo sistema/);
    assert.match(r[2], /acordo é aprovado/);
    assert.match(r[3], /dossiê/);
    assert.equal(caso(2015).FASE, 'cob_ativa');
  });

  /* ── contatos e promessas ── */

  await teste('C-009 · RF-036: contato com promessa de pagamento', async () => {
    const r = aceito(await contato('ana', 2034, { data: '2026-11-13', previsao: '2026-11-19', valor: 5000 }));
    const k = consultar('SELECT * FROM CC_CONTATO_COBRANCA WHERE ID = ?', r.contatoId)[0];
    assert.equal(k.AGENTE_ID, M.ana);
    const pr = consultar('SELECT * FROM CC_PROMESSA WHERE CONTATO_ID = ?', r.contatoId);
    assert.deepEqual(pr.map((p) => [p.SITUACAO, n(p.VALOR)]), [['ABERTA', 5000]]);
    const c = caso(2034);
    assert.deepEqual([c.PROX_ACAO, c.PROX_ACAO_DATA], ['Conferir pagamento prometido', '2026-11-19']);
    const lista = (extra) => como('ana', () => linhas('ccCobContatoListar', { clienteId: String(idDe(2034)), ...extra }));
    assert.equal((await lista({ retorno: 'Promessa de pagamento' })).length, 1);
    assert.equal((await lista({ promessa: 'ABERTA' })).length, 1);
    assert.equal((await lista({ promessa: 'QUEBRADA' })).length, 0);
    // Pedido da tela (Histórico abre o card): CARD_ID do caso e `busca` por código ou nome.
    assert.equal(n((await lista({}))[0].CARD_ID), n(c.CARD_ID));
    assert.equal((await lista({ busca: '2034' })).length, 1);
    assert.equal((await lista({ busca: 'NINGUEM COM ESTE NOME' })).length, 0);
    const [t] =await como('ana', () => linhas('ccCobContatoTotal', { clienteId: String(idDe(2034)) }));
    assert.deepEqual([n(t.TOTAL), n(t.PROMESSAS_ABERTAS), n(t.PROMESSAS_QUEBRADAS), n(t.SEM_RETORNO)], [1, 1, 0, 0]);
    assert.equal(auditoria('Cobrança', M.ana) >= 1, true);
  });

  await teste('C-010 · RN-007: promessa longa demais', async () => {
    recusado(await contato('ana', 2034, { data: '2026-11-13', previsao: '2026-11-24', valor: 5000 }), /5 dias úteis/);
    aceito(await contato('ana', 2034, { data: '2026-11-13', previsao: '2026-11-23', valor: 5000 }));
  });

  await teste('C-011: promessa cumprida, promessa quebrada', async () => {
    const pr = consultar(`SELECT PR.SITUACAO FROM CC_PROMESSA PR JOIN CC_CLIENTE C ON C.ID = PR.CLIENTE_ID WHERE C.CODCLI = 2035 ORDER BY PR.ID`);
    assert.deepEqual(pr.map((p) => p.SITUACAO), ['CUMPRIDA', 'QUEBRADA', 'QUEBRADA']);
    const agenda = await como('ana', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    assert.equal(agenda.some((e) => /2 promessas quebradas/.test(e.TEXTO)), true);
  });

  await teste('RN-006: contato sem feedback, data futura, próxima ação vencida e origem', async () => {
    recusado(await contato('ana', 2034, { feedback: '' }), /feedback/);
    recusado(await contato('ana', 2034, { data: dia(1) }), /futura/);
    const c = caso(2034);
    aceito(await como('ana', () => chamar('ccCobProxAcaoDefinir', { cobrancaId: c.ID, proxAcao: 'Ligar de novo', proxAcaoData: '2026-11-17' })));
    aceito(await contato('ana', 2034, { retorno: 'Sem retorno / não atendeu' }));
    assert.deepEqual([caso(2034).PROX_ACAO, caso(2034).PROX_ACAO_DATA], ['', null]);
    const pub = { clienteId: idDe(2043), carteira: 'PUBLICA', canal: 'Ofício', feedback: 'Ofício enviado.' };
    const r = aceito(await como('carlos', () => chamar('ccCobContatoRegistrar', { ...pub, origem: 'REGUA_PUB', retorno: '', emailEnviadoId: 99 })));
    assert.deepEqual(Object.values(consultar('SELECT ORIGEM, EMAIL_ENVIADO_ID FROM CC_CONTATO_COBRANCA WHERE ID = ?', r.contatoId)[0]), ['REGUA_PUB', 99]);
    recusado(await como('carlos', () => chamar('ccCobContatoRegistrar', { ...pub, origem: 'MANUAL', retorno: '' })), /retorno/);
    recusado(await como('carlos', () => chamar('ccCobContatoRegistrar', { ...pub, origem: 'EMAIL_REGUA', retorno: '' })), /Origem/);
  });

  await teste('RN-008: promessa quebrada, parcial e sem valor', async () => {
    const c = caso(2008);
    assert.equal(consultar('SELECT SITUACAO FROM CC_PROMESSA WHERE COBRANCA_ID = ? ORDER BY ID', c.ID)[0].SITUACAO, 'QUEBRADA');
    assert.equal(etiqueta(c, 'Promessa vencida'), true);
    assert.equal(notas(c, 'Promessa quebrada'), 1);
    // Datas em dia útil (a previsão vai para o próximo útil): contato em 11/11, promessas para 12/11 e 13/11.
    const a = aceito(await comRelogio(`${dia(-8)}T10:00:00`, () => contato('bruno', 2008, { previsao: dia(-7), valor: 2000 })));
    const b = aceito(await comRelogio(`${dia(-8)}T11:00:00`, () => contato('bruno', 2008, { previsao: dia(-6), valor: '' })));
    nota({ codcli: 2008, n: 50, emissao: dia(-60), itens: [{ codprod: 101, valor: 1500 }], parcelas: [{ prest: 1, valor: 1500, venc: dia(-30), pago: true, pagoEm: dia(-7) }] });
    nota({ codcli: 2008, n: 51, emissao: dia(-60), itens: [{ codprod: 101, valor: 10 }], parcelas: [{ prest: 1, valor: 10, venc: dia(-30), pago: true, pagoEm: dia(-6) }] });
    await leitura();
    const sit = (id) => consultar('SELECT SITUACAO FROM CC_PROMESSA WHERE CONTATO_ID = ?', id)[0].SITUACAO;
    assert.deepEqual([sit(a.contatoId), sit(b.contatoId)], ['QUEBRADA', 'CUMPRIDA']);
  });

  await teste('RN-019: próxima ação em dia não útil', async () => {
    const c = caso(2034);
    const def = (data) => como('ana', () => chamar('ccCobProxAcaoDefinir', { cobrancaId: c.ID, proxAcao: 'Ligar', proxAcaoData: data }));
    const sab = aceito(await def('2026-11-21'));
    assert.equal(sab.proxAcaoData, '2026-11-23');
    assert.match(sab.aviso, /^Data em sábado:/);
    const fer = aceito(await def('2026-11-20'));
    assert.equal(fer.proxAcaoData, '2026-11-23');
    assert.match(fer.aviso, /Consciência/i);
    const hoje = aceito(await def('2026-11-19'));
    assert.deepEqual([hoje.proxAcaoData, hoje.aviso], ['2026-11-19', '']);
  });

  /* ── acordo ── */

  await teste('C-012 · RF-036: acordo dentro do padrão', async () => {
    const r = aceito(await propor('ana', 2024, { valor: 10000, entrada: 2000, nParcelas: 4 }));
    assert.equal(r.nivelExigido, 2);
    assert.equal(caso(2024).FASE, 'negociacao');
    aceito(await decidirAcordo('sergio', r.acordoId));
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO WHERE ID = ?', r.acordoId)[0].SITUACAO, 'ATIVO');
    const p = consultar('SELECT N, VALOR FROM CC_ACORDO_PARCELA WHERE ACORDO_ID = ? ORDER BY N', r.acordoId);
    assert.deepEqual(p.map((x) => [x.N, n(x.VALOR)]), [[0, 2000], [1, 2000], [2, 2000], [3, 2000], [4, 2000]]);
    assert.equal(caso(2024).FASE, 'acordo');
    assert.equal(auditoria('Acordos', M.ana, r.acordoId), 1);
    assert.equal(auditoria('Acordos', M.sergio, r.acordoId), 1);
  });

  await teste('C-013: acordo fora do padrão sobe de alçada', async () => {
    const r = aceito(await propor('ana', 2025, { valor: 20000, entrada: 2000, nParcelas: 4 }));
    assert.equal(r.nivelExigido, 3);
    recusado(await decidirAcordo('sergio', r.acordoId), /gerente/);
    aceito(await decidirAcordo('gustavo', r.acordoId));
  });

  await teste('C-014 · RN-012: quem propõe não aprova', async () => {
    const r = aceito(await propor('gustavo', 2026, { valor: 60000, entrada: 12000, nParcelas: 4, garantia: 'Aval dos sócios' }));
    recusado(await decidirAcordo('gustavo', r.acordoId), /quem propôs/);
    aceito(await decidirAcordo('diana', r.acordoId));
  });

  await teste('RN-012 · DT-35: quem decide na alçada não precisa ver o cliente', async () => {
    // Silvia (Supervisor, nível 2) não enxerga os clientes de Ana e decide o acordo e a baixa de nível 2 deles (04 §0).
    const r = aceito(await propor('ana', 2024, { valor: 10000, entrada: 2000, nParcelas: 4 }));
    const agenda = await como('silvia', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    assert.equal(agenda.some((e) => e.TIPO === 'ACORDO_DECIDIR' && e.COBRANCA_ID === caso(2024).ID), true);
    aceito(await decidirAcordo('silvia', r.acordoId));
    assert.deepEqual([consultar('SELECT SITUACAO FROM CC_ACORDO WHERE ID = ?', r.acordoId)[0].SITUACAO, caso(2024).FASE], ['ATIVO', 'acordo']);
    aceito(await salvarParametros('gustavo', [{ chave: 'alcada.baixaNivel1', valor: '2' }]));
    const b = aceito(await como('ana', () => chamar('ccCobBaixaPropor', { cobrancaId: caso(2030).ID, valor: 8000, motivo: MOTIVO })));
    assert.equal(b.nivelExigido, 2);
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'De acordo.' })));
    aceito(await como('silvia', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })));
    assert.deepEqual([caso(2030).DESFECHO, caso(2030).FASE], ['BAIXADO', 'baixado']);
  });

  await teste('RN-012 · DT-35 (F5 C-02): decisor de outra equipe abre a ficha só com o necessário para decidir', async () => {
    const ficha = (login, codcli) => como(login, () => chamar('ccCobCasoFicha', { cobrancaId: caso(codcli).ID, cardId: 0 }));
    recusado(await ficha('silvia', 2024), /Cliente não encontrado/);
    const r = aceito(await propor('ana', 2024, { valor: 10000, entrada: 2000, nParcelas: 4 }));
    const f = aceito(await ficha('silvia', 2024));
    assert.equal(f.restrito, true);
    assert.equal(f.pode.decidirAcordo, true);
    assert.equal(f.acordo.ID, r.acordoId);
    assert.ok(f.parcelas.length > 0 && Number(f.posicao.VENCIDO) > 0);
    assert.deepEqual([f.contatos, f.promessas, f.fila, f.porBu, f.acoes, f.caso.proxAcao], [[], [], [], [], [], '']);
    assert.deepEqual(Object.entries(f.pode).filter(([, v]) => v).map(([k]) => k), ['decidirAcordo']);
    assert.equal(aceito(await ficha('ana', 2024)).restrito, false);
    recusado(await ficha('carlos', 2024), /Cliente não encontrado/);
    aceito(await decidirAcordo('silvia', r.acordoId));
    recusado(await ficha('silvia', 2024), /Cliente não encontrado/);
    // Baixa: abre só depois do parecer, e só para quem está na alçada.
    aceito(await salvarParametros('gustavo', [{ chave: 'alcada.baixaNivel1', valor: '2' }]));
    const b = aceito(await como('ana', () => chamar('ccCobBaixaPropor', { cobrancaId: caso(2030).ID, valor: 8000, motivo: MOTIVO })));
    recusado(await ficha('silvia', 2030), /Cliente não encontrado/);
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'De acordo.' })));
    const fb = aceito(await ficha('silvia', 2030));
    assert.deepEqual([fb.restrito, fb.pode.decidirBaixa, fb.baixa.ID, fb.contatos.length], [true, true, b.baixaId, 0]);
  });

  await teste('C-015: acordo quebrado volta para a régua', async () => {
    const quebrado = caso(2028);
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO WHERE COBRANCA_ID = ?', quebrado.ID)[0].SITUACAO, 'QUEBRADO');
    assert.equal(quebrado.FASE, 'neg_pos_protesto');
    assert.equal(notas(quebrado, 'Acordo quebrado'), 1);
    const ativo = caso(2029);
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO WHERE COBRANCA_ID = ?', ativo.ID)[0].SITUACAO, 'ATIVO');
    assert.equal(ativo.FASE, 'acordo');
    await leitura();
    assert.deepEqual([caso(2028).FASE, caso(2029).FASE], ['neg_pos_protesto', 'acordo']);
  });

  await teste('RN-009: garantia e alçada do acordo', async () => {
    // B-01: a interna chamada direto não confia no débito informado; garantia e alçada saem do vencido relido na SQL.
    const c27 = caso(2027);
    const direto = (extra) => como('ana', () => chamar('ccEscCobAcordoInserir', { cobrancaId: c27.ID, valor: 60000, entrada: 12000, entradaData: dia(0),
      nParcelas: 4, primeiroVenc: dia(30), intervaloDias: 30, garantia: '', membroId: M.ana, agora: `${dia(0)}T10:00:00`, ...extra }));
    const acordos = () => contar('SELECT COUNT(*) AS N FROM CC_ACORDO WHERE COBRANCA_ID = ?', c27.ID);
    for (const extra of [{ debito: 1 }, { debito: 1, garantia: 'Imóvel' }, { debito: 60000 }]) await direto(extra);
    assert.equal(acordos(), 0);
    recusado(await propor('ana', 2027, { valor: 60000, entrada: 12000, nParcelas: 4 }), /garantia/);
    const r = aceito(await propor('ana', 2027, { valor: 60000, entrada: 12000, nParcelas: 4, garantia: 'Imóvel' }));
    assert.equal(r.nivelExigido, 3);
    recusado(await decidirAcordo('sergio', r.acordoId), /gerente/);
    aceito(await decidirAcordo('gustavo', r.acordoId));
    const seis = aceito(await propor('ana', 2022, { valor: 10000, entrada: 2000, nParcelas: 6 }));
    assert.equal(seis.nivelExigido, 3);
  });

  await teste('RN-010: desconto do acordo', async () => {
    const r = aceito(await propor('ana', 2022, { valor: 9000, entrada: 2000, nParcelas: 3 }));
    assert.equal(n(consultar('SELECT DESCONTO FROM CC_ACORDO WHERE ID = ?', r.acordoId)[0].DESCONTO), 1000);
  });

  await teste('RN-011: quitação, cancelamento e recusa', async () => {
    const quita = consultar("SELECT PA.ID FROM CC_ACORDO_PARCELA PA JOIN CC_ACORDO AC ON AC.ID = PA.ACORDO_ID WHERE AC.COBRANCA_ID = ? AND PA.PAGO_EM IS NULL ORDER BY PA.N", caso(2042).ID);
    for (const p of quita) aceito(await como('bruno', () => chamar('ccCobAcordoParcelaPagar', { parcelaId: p.ID })));
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO WHERE COBRANCA_ID = ?', caso(2042).ID)[0].SITUACAO, 'QUITADO');
    const r = aceito(await propor('ana', 2053, { valor: 5000, entrada: 1000, nParcelas: 4 }));
    assert.equal(caso(2053).FASE, 'negociacao');
    const cancelar = (login) => como(login, () => chamar('ccCobAcordoCancelar', { acordoId: r.acordoId, motivo: 'Cliente desistiu.' }));
    recusado(await cancelar('ana'), /supervisor/);
    recusado(await cancelar('silvia'), /Cliente não encontrado/);
    aceito(await cancelar('sergio'));
    assert.equal(consultar('SELECT SITUACAO FROM CC_ACORDO WHERE ID = ?', r.acordoId)[0].SITUACAO, 'CANCELADO');
    await leitura();
    assert.equal(caso(2053).FASE, 'protesto');
    const novo = aceito(await propor('ana', 2053, { valor: 5000, entrada: 1000, nParcelas: 4 }));
    assert.notEqual(novo.acordoId, r.acordoId);
    aceito(await decidirAcordo('sergio', novo.acordoId, 0, 'Entrada baixa para o histórico.'));
    await leitura();
    assert.equal(caso(2053).FASE, 'negociacao');
  });

  await teste('RN-029: negociação além do prazo', async () => {
    const c = caso(2058);
    const ficha = aceito(await como('ana', () => chamar('ccCobCasoFicha', { cobrancaId: c.ID })));
    assert.equal(ficha.caso.negociacaoVencida, true);
    const antes = await comRelogio(`${dia(-1)}T10:00:00`, () => como('ana', () => chamar('ccCobCasoFicha', { cobrancaId: c.ID })));
    assert.equal(antes.caso.negociacaoVencida, false);
  });

  /* ── baixa ── */

  await teste('C-016 · RF-036: baixa como perda com alçada e parecer', async () => {
    const b = aceito(await como('ana', () => chamar('ccCobBaixaPropor', { cobrancaId: caso(2030).ID, valor: 8000, motivo: MOTIVO, docRegua: 1 })));
    assert.equal(b.nivelExigido, 3);
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'De acordo.' })));
    recusado(await como('sergio', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })), /gerente/);
    aceito(await como('gustavo', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })));
    assert.deepEqual([caso(2030).DESFECHO, caso(2030).FASE], ['BAIXADO', 'baixado']);
    assert.equal(auditoria('Baixas', M.gustavo, b.baixaId), 1);
    const g = aceito(await como('gustavo', () => chamar('ccCobBaixaPropor', { cobrancaId: caso(2031).ID, valor: 50000, motivo: 'Falência ou recuperação judicial' })));
    recusado(await como('diana', () => chamar('ccCobBaixaDecidir', { baixaId: g.baixaId, aprovar: 1 })), /parecer/);
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: g.baixaId, resultado: 'FAVORAVEL', texto: 'Falência decretada.' })));
    recusado(await como('gustavo', () => chamar('ccCobBaixaDecidir', { baixaId: g.baixaId, aprovar: 1 })), /quem propôs/);
    aceito(await como('diana', () => chamar('ccCobBaixaDecidir', { baixaId: g.baixaId, aprovar: 1 })));
    assert.equal(caso(2031).DESFECHO, 'BAIXADO');
  });

  await teste('RN-013: alçada e limites da baixa', async () => {
    const c = caso(2022);
    const propor = (extra) => como('ana', () => chamar('ccCobBaixaPropor', { cobrancaId: c.ID, valor: 100, motivo: MOTIVO, ...extra }));
    recusado(await propor({ valor: 0 }));
    recusado(await propor({ valor: 10000.01 }), /saldo vencido/);
    recusado(await propor({ motivo: '' }), /motivo/);
    assert.equal(consultar("SELECT NIVEL_EXIGIDO FROM CC_BAIXA WHERE COBRANCA_ID = ? AND SITUACAO = 'PENDENTE'", caso(2014).ID)[0].NIVEL_EXIGIDO, 3);
    // Fronteira da tabela de baixa na SQL (alcada.baixaGerente = 10.000): 10.000,00 → 3; 10.000,01 → 5.
    const nivel = async (login, codcli, valor) => aceito(await como(login, () => chamar('ccCobBaixaPropor', { cobrancaId: caso(codcli).ID, valor, motivo: MOTIVO }))).nivelExigido;
    assert.deepEqual([await nivel('bruno', 2026, 10000), await nivel('ana', 2027, 10000.01)], [3, 5]);
  });

  await teste('RN-014: parecer só do Jurídico e baixa parcial', async () => {
    const [b2014] = consultar("SELECT ID FROM CC_BAIXA WHERE COBRANCA_ID = ? AND SITUACAO = 'PENDENTE'", caso(2014).ID);
    recusado(await como('ana', () => chamar('ccCobBaixaParecer', { baixaId: b2014.ID, resultado: 'FAVORAVEL', texto: 'Ok.' })), /Jurídico/);
    const b = aceito(await como('bruno', () => chamar('ccCobBaixaPropor', { cobrancaId: caso(2009).ID, valor: 3000, motivo: MOTIVO })));
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'Ok.' })));
    aceito(await como('gustavo', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })));
    const c = caso(2009);
    assert.deepEqual([c.ENCERRADO_EM, c.FASE, n(c.VALOR_BAIXADO)], [null, 'extrajudicial', 3000]);
    // B-02: Gustavo repete a interna com a data da decisão: não soma de novo nem encerra BAIXADO abaixo do vencido (15.000).
    const [bx] = consultar('SELECT DECIDIDO_EM FROM CC_BAIXA WHERE ID = ?', b.baixaId);
    const encerrar = (desfecho) => como('gustavo', () => chamar('ccEscCobCasoEncerrar', { cobrancaId: c.ID, desfecho, valorBaixado: 3000, anuenciaAte: '',
      membroId: M.gustavo, agora: bx.DECIDIDO_EM }));
    for (const desfecho of ['', '', 'BAIXADO']) await encerrar(desfecho);
    const d = caso(2009);
    assert.deepEqual([d.ENCERRADO_EM, d.FASE, n(d.VALOR_BAIXADO)], [null, 'extrajudicial', 3000]);
  });

  await teste('C-017 · RN-020 · RNF-006: carta de anuência depois do protesto', async () => {
    pagar(2013);
    pagar(2057);
    await leitura();
    const c = caso(2013);
    assert.deepEqual([c.DESFECHO, c.FASE, c.ANUENCIA_ATE], ['REGULARIZADO', 'regularizado', '2026-11-27']);
    assert.equal(etiqueta(c, 'Anuência pendente'), true);
    // KB_ANEXO.CRIADO_EM é UTC: anexo das 12:30 UTC (09:30 em Brasília) é anterior ao encerramento das 10:01 e não serve.
    const anexo = (utc) => consultar("INSERT INTO KB_ANEXO (CARD_ID, NOME, URL, CRIADO_EM) VALUES (?, 'anuencia.pdf', 'https://arquivos.test/anuencia.pdf', ?) RETURNING 1", c.CARD_ID, utc);
    anexo('2026-11-19T12:30:00');
    recusado(await como('bruno', () => chamar('ccCobAnuenciaRegistrar', { cobrancaId: c.ID })), /Anexe/);
    anexo('2026-11-19T13:30:00');
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'COB_ANUENCIA' })));
    // RNF-006: o envio com e-mail (a mais cara da anuência) cabe em 20 execuções.
    let gasto = 0;
    gasto = await execucoes(async () => aceito(await como('bruno', () => chamar('ccCobAnuenciaRegistrar', { cobrancaId: c.ID }))));
    assert.equal(gasto <= 20, true, `${gasto} execuções`);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_EMAIL_ENVIADO WHERE MODELO_CODIGO = 'COB_ANUENCIA'"), 1);
    const depois = caso(2013);
    assert.equal(String(valores(depois).regularizado_3), '1');
    assert.equal(etiqueta(depois, 'Anuência pendente'), false);
    const agenda = await como('bruno', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    assert.equal(agenda.filter((e) => e.TIPO === 'ANUENCIA' && e.COBRANCA_ID === c.ID).length, 0);
    const serena = caso(2057);
    assert.deepEqual([serena.DESFECHO, serena.ANUENCIA_ATE, etiqueta(serena, 'Anuência pendente')], ['REGULARIZADO', null, false]);
    recusado(await como('ana', () => chamar('ccCobAnuenciaRegistrar', { cobrancaId: caso(2019).ID, enviarEmail: 0 })), /protestado/);
  });

  /* ── e-mail da régua ── */

  const filaDe = async (login, codcli, extra = {}) => (await como(login, () => linhas('ccCobEmailFilaListar', extra))).filter((l) => l.CLIENTE_ID === idDe(codcli));

  await teste('C-018: e-mail que precisa de aprovação', async () => {
    const [item] = await filaDe('sergio', 2006);
    assert.equal(item.SITUACAO_TELA, 'APROVAR');
    const decidir = (login) => como(login, () => chamar('ccCobEmailFilaDecidir', { filaIds: String(item.ID) }));
    recusado(await decidir('ana'), /supervisor/);
    recusado(await decidir('sergio'), /validação/);
    assert.equal(contar('SELECT COUNT(*) AS N FROM SIM_EMAIL'), 0);
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'COB_NOTIF_FORMAL' })));
    aceito(await decidir('sergio'));
    assert.equal(contar('SELECT COUNT(*) AS N FROM SIM_EMAIL'), 1);
    const c = caso(2006);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_CONTATO_COBRANCA WHERE COBRANCA_ID = ? AND ORIGEM = 'EMAIL_REGUA'", c.ID), 1);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ? AND FASE_CHAVE = 'notif_formal'", c.ID), 1);
    await leitura();
    assert.equal(String(valores(caso(2006)).notif_formal_1), '1');
    const fila = consultar('SELECT SITUACAO, EMAIL_ENVIADO_ID FROM CC_EMAIL_FILA WHERE COBRANCA_ID = ?', c.ID);
    const [email] = consultar("SELECT ID FROM CC_EMAIL_ENVIADO WHERE MODELO_CODIGO = 'COB_NOTIF_FORMAL'");
    assert.deepEqual(fila.map((f) => [f.SITUACAO, f.EMAIL_ENVIADO_ID]), [['ENVIADO', email.ID]]);
  });

  await teste('C-019 · RN-017: destinatário e cliente sem e-mail', async () => {
    const [sem] = await filaDe('ana', 2004);
    assert.equal(sem.SITUACAO_TELA, 'SEM_EMAIL');
    recusado(await como('ana', () => chamar('ccCobEmailEnviar', { cobrancaId: caso(2004).ID })), /e-mail/);
    assert.equal((await filaDe('bruno', 2044))[0].PARA, 'pagamentos@destinatarioa.test');
    assert.equal((await filaDe('bruno', 2045))[0].PARA, 'contas@destinatariob.test');
    assert.equal(sem.PARA, '');
  });

  await teste('RN-018: fila acompanha a fase e a ação', async () => {
    const antes = await filaDe('bruno', 2033);
    assert.equal(antes.length, 1);
    nota({ codcli: 2033, n: 60, emissao: dia(-40), itens: [{ codprod: 101, valor: 100 }], parcelas: [{ prest: 1, valor: 100, venc: dia(-8) }] });
    await leitura();
    assert.equal(caso(2033).FASE, 'notif_formal');
    assert.equal((await filaDe('bruno', 2033)).filter((l) => l.FASE_CHAVE === 'pag_nao_ident').length, 0);
    const c = caso(2005);
    assert.equal((await filaDe('ana', 2005)).length, 1);
    aceito(await como('ana', () => chamar('ccCobAcaoRegistrar', { cobrancaId: c.ID, itens: '1,2' })));
    assert.equal((await filaDe('ana', 2005)).length, 0);
    await leitura();
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_EMAIL_FILA WHERE COBRANCA_ID = ?', caso(2054).ID), 1);
  });

  await teste('RN-021: modos do e-mail e envio automático', async () => {
    const fila = await como('gustavo', () => linhas('ccCobEmailFilaListar'));
    assert.equal(fila.some((l) => l.SITUACAO_TELA === 'ENVIAR'), true);
    assert.equal(fila.some((l) => l.SITUACAO_TELA === 'APROVAR'), true);
    const pend = fila.filter((l) => l.SITUACAO === 'PENDENTE').map((l) => n(l.VALOR));
    assert.deepEqual(pend, [...pend].sort((a, b) => b - a));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PARAMETRO WHERE CHAVE LIKE 'cob.emailModo.%' AND VALOR = 'AUTOMATICO'"), 0);
    const filas = contar('SELECT COUNT(*) AS N FROM CC_EMAIL_FILA');
    aceito(await salvarParametros('gustavo', [{ chave: 'cob.emailModo.pag_nao_ident', carteira: 'ESTETICA', valor: 'AUTOMATICO' }]));
    await leitura();
    const c = caso(2050, 'ESTETICA');
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_EMAIL_ENVIADO WHERE REFERENCIA = ?', `cobranca:${c.ID}:pag_nao_ident`), 1);
    assert.equal(String(valores(c).pag_nao_ident_1), '1');
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ?', c.ID), 0);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_EMAIL_FILA'), filas);
    await leitura();
    assert.equal(contar('SELECT COUNT(*) AS N FROM SIM_EMAIL'), 1);
    aceito(await salvarParametros('gustavo', [{ chave: 'cob.emailModo.pag_nao_ident', carteira: 'ESTETICA', valor: null }]));
  });

  await teste('RN-022: e-mail manual marca o item ✉ e respeita a visibilidade', async () => {
    aceito(await como('bruno', () => chamar('ccCobEmailEnviar', { cobrancaId: caso(2033).ID })));
    assert.equal(String(valores(caso(2033)).pag_nao_ident_1), '1');
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ?', caso(2033).ID), 0);
    const antes = valores(caso(2005));
    aceito(await como('ana', () => chamar('ccCobEmailEnviar', { cobrancaId: caso(2005).ID })));
    assert.deepEqual(Object.keys(valores(caso(2005))).filter((k) => /^cob_ativa_\d$/.test(k)), Object.keys(antes).filter((k) => /^cob_ativa_\d$/.test(k)));
    const [item] = await filaDe('sergio', 2006);
    recusado(await como('silvia', () => chamar('ccCobEmailFilaDecidir', { filaIds: String(item.ID) })), /Cliente não encontrado/);
  });

  await teste('RN-023: modelos da régua', async () => {
    const cods = consultar("SELECT CODIGO, ASSUNTO FROM CC_MODELO_MENSAGEM WHERE CODIGO LIKE 'COB_%' ORDER BY CODIGO");
    assert.equal(cods.length, 11);
    assert.deepEqual(cods.map((x) => x.ASSUNTO), [...MODELOS].sort((a, b) => (a.codigo < b.codigo ? -1 : 1)).map((x) => x.assunto));
  });

  /* ── bloqueio ── */

  await teste('C-020 · RF-036: lista de bloqueio para o ERP', async () => {
    const lista = (login, situacao, busca) => como(login, () => linhas('ccCobBloqueioListar', { situacao, busca }));
    assert.equal((await lista('ana', 'BLOQUEAR_PEDIDOS', '2015')).length, 1);
    assert.equal((await lista('bruno', 'BLOQUEAR_TOTAL', '2023')).length, 1);
    pagar(2057);
    await leitura();
    assert.equal((await lista('ana', 'LIBERAR', '2057')).length, 1);
    const r = aceito(await como('ana', () => chamar('ccCobBloqueioAplicar', { cobrancaId: caso(2015).ID, aplicado: 'PEDIDOS' })));
    assert.equal(r.item, 'cob_ativa_2');
    assert.equal((await lista('ana', '', '2015')).length, 0);
    assert.equal((await lista('ana', 'BLOQUEADOS', '2015')).length, 1);
    assert.equal(String(valores(caso(2015)).cob_ativa_2), '1');
    assert.equal(auditoria('Bloqueio', M.ana) >= 1, true);
  });

  await teste('RN-004: bloqueio com acordo e caso baixado', async () => {
    assert.equal(caso(2029).BLOQUEIO_DEVIDO, '');
    assert.equal(caso(2007).BLOQUEIO_DEVIDO, 'TOTAL');
    assert.deepEqual([caso(2056).DESFECHO, caso(2056).BLOQUEIO_DEVIDO], ['BAIXADO', 'TOTAL']);
  });

  /* ── visibilidade, agenda, painéis ── */

  await teste('C-021 · RN-027 · DT-45: número com texto de injeção não vaza na leitura nem grava pela interna', async () => {
    // Leitura: `agenteId` que fecharia o parêntese do filtro vira número (0 = sem filtro, pela visibilidade).
    const casos = async (login, extra = {}) => (await como(login, () => linhas('ccCobQuadroResumo', { carteira: 'ESTETICA', ...extra }))).reduce((s, l) => s + n(l.CASOS), 0);
    assert.deepEqual([await casos('bruno'), await casos('gustavo')], [1, 3]);
    assert.equal(await casos('bruno', { agenteId: '0) OR (1=1' }), 1);
    // Interna: Bruno não opera o 2020 (do Carlos); o OR no `membroId` passaria a ROTINA e o ATOR.
    const antes = caso(2020, 'ESTETICA').PROX_ACAO;
    await como('bruno', () => chamar('ccEscCobCasoProxAcao', { cobrancaId: caso(2020, 'ESTETICA').ID, proxAcao: 'INJETADA', proxAcaoData: dia(1),
      membroId: `${M.bruno} OR 1=1`, agora: `${dia(0)}T10:00:00` }));
    assert.equal(caso(2020, 'ESTETICA').PROX_ACAO, antes);
  });

  await teste('C-021 · RN-027: cada um vê a sua carteira', async () => {
    const casos = async (login) => (await como(login, () => linhas('ccCobQuadroResumo', { carteira: 'ESTETICA' }))).reduce((s, l) => s + n(l.CASOS), 0);
    const tot = {};
    for (const login of ['bruno', 'carlos', 'sergio', 'silvia', 'gustavo']) tot[login] = await casos(login);
    assert.deepEqual(tot, { bruno: 1, carlos: 2, sergio: 1, silvia: 2, gustavo: 3 });
    for (const [login, esperado] of [['carlos', 1], ['silvia', 1], ['gustavo', 1], ['bruno', 0], ['sergio', 0]]) {
      assert.equal((await como(login, () => linhas('ccCobBloqueioListar', { carteira: 'ESTETICA', situacao: 'BLOQUEAR_PEDIDOS', busca: '2020' }))).length, esperado, login);
      const agenda = await como(login, () => linhas('ccCobAgendaListar', { carteira: 'ESTETICA', membroId: String(M.carlos), ate: dia(30) }));
      assert.equal(agenda.some((e) => e.CLIENTE_ID === idDe(2020)), esperado === 1, `agenda ${login}`);
      const painel = await como(login, () => linhas('ccCobPainelAgentes', { carteira: 'ESTETICA' }));
      assert.equal(painel.some((l) => l.AGENTE_ID === M.carlos), esperado === 1, `painel ${login}`);
    }
    recusado(await como('silvia', () => chamar('ccCobCasoFicha', { cobrancaId: caso(2012, 'ESTETICA').ID })), /Cliente não encontrado/);
    recusado(await como('silvia', () => chamar('ccCobContatoRegistrar', { clienteId: idDe(2012), carteira: 'ESTETICA', canal: 'Telefone', retorno: 'Pagou', feedback: 'x' })));
    // RN-027: o Jurídico só lê o caso com baixa pendente; agente de outra equipe não registra contato.
    recusado(await como('julia', () => chamar('ccCobCasoFicha', { cobrancaId: caso(2015).ID })), /Cliente não encontrado/);
    const f = aceito(await como('julia', () => chamar('ccCobCasoFicha', { cobrancaId: caso(2014).ID })));
    assert.equal(f.pode.operar, false);
    recusado(await como('julia', () => chamar('ccCobContatoRegistrar', { clienteId: idDe(2014), canal: 'Telefone', retorno: 'Pagou', feedback: 'x' })));
    recusado(await como('carlos', () => chamar('ccCobContatoRegistrar', { clienteId: idDe(2015), canal: 'Telefone', retorno: 'Pagou', feedback: 'x' })));
  });

  await teste('RN-025: eventos da agenda', async () => {
    aceito(await contato('bruno', 2011, { previsao: dia(4), valor: 1000 }));
    pagar(2052);
    await leitura();
    const agenda = await como('bruno', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    const de = (codcli, tipo) => agenda.filter((e) => e.CLIENTE_ID === idDe(codcli) && e.TIPO === tipo).map((e) => e.DATA);
    assert.deepEqual(de(2011, 'PROMESSA'), [dia(4)]);
    assert.deepEqual(de(2011, 'PARCELA_ACORDO'), [dia(5)]);
    assert.equal(de(2010, 'ACAO_REGUA').length, 1);
    assert.deepEqual(de(2052, 'ANUENCIA'), [caso(2052).ANUENCIA_ATE]);
    const sergio = async () => como('sergio', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    assert.equal((await sergio()).some((e) => e.TIPO === 'EMAIL_APROVAR' && e.CLIENTE_ID === idDe(2054)), true);
    aceito(await propor('bruno', 2054, { valor: 6500, entrada: 1300, nParcelas: 4 }));
    assert.equal((await sergio()).some((e) => e.TIPO === 'ACORDO_DECIDIR' && e.CLIENTE_ID === idDe(2054)), true);
    const ana = await como('ana', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
    assert.deepEqual(ana.filter((e) => e.TIPO === 'FICHA_REVISAR' && e.CLIENTE_ID === idDe(2004)).map((e) => e.DATA), [dia(0)]);
    const promessa = await como('bruno', () => linhas('ccCobCasoListar', { filtro: 'PROMESSA' }));
    assert.equal(promessa.some((l) => l.CLIENTE_ID === idDe(2011)), true);
    assert.equal(promessa.some((l) => l.CLIENTE_ID === idDe(2010)), false);
    const ate = dia(7);
    const lista = await como('bruno', () => linhas('ccCobAgendaListar', { ate }));
    const [res] = (await como('bruno', () => linhas('ccCobAgendaResumo', { ate }))).filter((l) => l.AGENTE_ID === M.bruno);
    assert.equal(n(res.PARA_HOJE) + n(res.ATRASADAS) + n(res.PROXIMOS), lista.length);
    const soma = n(consultar(`SELECT COALESCE(SUM(P.A_VENCER_7DU), 0) AS N FROM CC_POSICAO_CLIENTE_CARTEIRA P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID
WHERE C.AGENTE_ID = ?`, M.bruno)[0].N);
    assert.equal(n(res.A_VENCER_7DU), soma);
  });

  await teste('C-024 · RF-006: visão gerencial', async () => {
    const enf = 2;
    const k = await como('gustavo', () => linha('ccCobPainelKpis', { buId: String(enf) }));
    assert.deepEqual([n(k.INAD_PCT), n(k.VENCIDO), n(k.CLIENTES_VENCIDOS), n(k.ACIMA_90)], [30, 15000, 2, 5000]);
    const aging = await como('gustavo', () => linhas('ccCobPainelAging', { buId: String(enf) }));
    assert.deepEqual(aging.filter((a) => [1, 4].includes(n(a.ORDEM))).map((a) => n(a.VALOR)), [10000, 5000]);
    const bu = (await como('gustavo', () => linhas('ccCobPainelBu', { buId: String(enf) })))[0];
    assert.equal(n(bu.VENCIDO), 15000);
    const ag = (await como('gustavo', () => linhas('ccCobPainelAgentes', { buId: String(enf) }))).find((l) => l.AGENTE_ID === M.carlos);
    assert.equal(n(ag.VENCIDO), 15000);
    for (const agenteId of ['0', String(M.carlos)]) {
      const q = await como('gustavo', () => linhas('ccCobQuadroResumo', { carteira: 'PRIVADA', buId: String(enf), agenteId }));
      const com = q.filter((l) => n(l.CASOS) > 0).map((l) => [l.FASE_CHAVE, n(l.CASOS), n(l.VENCIDO)]);
      assert.deepEqual(com, [['neg_pos_protesto', 1, 10000], ['extrajudicial', 1, 5000]]);
    }
  });

  await teste('RN-026: conversão e maior devedor', async () => {
    const k = await como('gustavo', () => linha('ccCobPainelKpis', { buId: '3' }));
    assert.equal(n(k.CONVERSAO_PCT), 40);
    const [top] = await como('gustavo', () => linhas('ccCobPainelTopDevedores', { buId: '2', limite: '5' }));
    assert.deepEqual([n(top.VENCIDO), n(top.PARTICIPACAO_PCT)], [10000, 66.7]);
    const todos = await como('gustavo', () => linha('ccCobPainelKpis'));
    const porRetorno = ['PROMESSA', 'PAGOU', 'NEGOCIACAO', 'CONTESTOU', 'SEM_RETORNO', 'RECUSOU', 'AGUARDANDO'].reduce((s, r) => s + n(todos[`CONT_${r}`]), 0);
    const semRetorno = contar(`SELECT COUNT(*) AS N FROM CC_CONTATO_COBRANCA WHERE RETORNO = '' AND DATA >= '2026-11-01' AND DATA <= '${dia(0)}'`);
    assert.equal(porRetorno + semRetorno, n(todos.CONTATOS));
  });

  await teste('C-025 · RN-016: projeção de possível inadimplência', async () => {
    cliente({ codcli: 2090, nome: 'SEMPRE ATRASA', ramo: 2, limite: 1000 });
    nota({ codcli: 2090, n: 1, emissao: dia(-120), itens: [{ codprod: 101, valor: 1000 }], parcelas: [{ prest: 1, valor: 1000, venc: dia(-31), pago: true, pagoEm: dia(0) }] });
    nota({ codcli: 2090, n: 2, emissao: dia(-10), itens: [{ codprod: 101, valor: 2000 }], parcelas: [{ prest: 1, valor: 2000, venc: dia(20) }] });
    await leitura();
    const proj = await como('gustavo', () => linhas('ccCobProjecaoListar'));
    const de = (codcli) => proj.filter((l) => l.CLIENTE_ID === idDe(codcli)).map((l) => [n(l.PROB_ATRASO), n(l.VALOR_ESPERADO)])[0];
    assert.deepEqual([de(2039), de(2040), de(2041)], [[30, 3000], [50, 2000], [5, 50]]);
    assert.deepEqual(de(2090), [95, 1900]);
    assert.equal(proj.find((l) => l.CLIENTE_ID === idDe(2090)).FAIXA, 'FORTE');
    const [tot] = await como('gustavo', () => linhas('ccCobProjecaoTotal'));
    assert.equal(n(tot.CLIENTES_FORTE), proj.filter((l) => l.FAIXA === 'FORTE').length);
  });

  await teste('C-026 · RNF-005: valor atualizado com encargos', async () => {
    const ana = aceito(await como('ana', () => chamar('ccCobEncargosCalcular', { clienteId: idDe(2022), carteira: 'PRIVADA' })));
    assert.deepEqual([ana.multa, ana.juros, ana.correcao, ana.total], [200, 100, 40, 10340]);
    const r = await nasDuasSessoes(async () => {
      const a = await como(null, () => chamar('ccCobEncargosCalcular', { clienteId: idDe(2022), carteira: 'PRIVADA', membroId: M.ana }));
      const s = await como(null, () => chamar('ccCobEncargosCalcular', { clienteId: idDe(2022), carteira: 'PRIVADA', membroId: M.silvia }));
      return [a.total, s.error];
    });
    assert.deepEqual(r, [10340, 'Cliente não encontrado.']);
    // RNF-005: com sessão, o membroId da entrada é ignorado.
    recusado(await como('ana', () => chamar('ccCobEncargosCalcular', { clienteId: idDe(2023), carteira: 'PRIVADA', membroId: M.gustavo })), /Cliente não encontrado/);
    const antes = contar('SELECT COUNT(*) AS N FROM CC_CONTATO_COBRANCA');
    recusado(await contato('ana', 2023, { membroId: M.gustavo }), /Cliente não encontrado/);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_CONTATO_COBRANCA'), antes);
  });

  await teste('RN-015: encargos título a título', async () => {
    const r = aceito(await como('bruno', () => chamar('ccCobEncargosCalcular', { clienteId: idDe(2010), carteira: 'PRIVADA' })));
    assert.deepEqual([r.multa, r.juros, r.correcao, r.total], [600, 370, 148.13, 31118.13]);
  });

  /* ── carteira pública ── */

  await teste('C-027 · RN-032: órgão público anda pelo andamento da nota fiscal', async () => {
    const sinc = (extra) => chamar('ccCobCasoSincronizar', { clienteId: idDe(2048), carteira: 'PUBLICA', capaJson: '{}', ...extra });
    aceito(await como(null, () => sinc({ faseChave: 'nf_protocolar' })));
    const c0 = caso(2048, 'PUBLICA');
    assert.deepEqual([c0.QUADRO, c0.FASE, c0.FASE_DEVIDA], ['cobranca-publica', 'nf_protocolar', 'nf_protocolar']);
    const r = await nasDuasSessoes(async () => {
      let gasto = 0;
      gasto = await execucoes(async () => aceito(await como('carlos', () => sinc({ faseChave: 'liquidacao_vencida', proxAcao: 'Cobrar atesto',
        proxAcaoData: '2026-11-23', nota: 'Etapa do órgão: Liquidação vencida · cobrar atesto' }))));
      const c = caso(2048, 'PUBLICA');
      const agenda = await como('carlos', () => linhas('ccCobAgendaListar', { ate: dia(30) }));
      const etapa = contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Cobrança' AND ENTIDADE_ID = ? AND CAMPO = 'Etapa' AND POR = ? AND DEPOIS = 'liquidacao_vencida'", c.ID, M.carlos);
      return [c.FASE, c.FASE_DEVIDA, notas(c, 'Liquidação vencida'), agenda.some((e) => e.TIPO === 'PROX_ACAO' && e.DATA === '2026-11-23' && e.COBRANCA_ID === c.ID), etapa, gasto <= 14];
    });
    assert.deepEqual(r, ['liquidacao_vencida', 'liquidacao_vencida', 1, true, 1, true]);
    aceito(await como('carlos', () => sinc({ faseChave: 'liquidacao_vencida', proxAcao: 'Cobrar atesto', proxAcaoData: '2026-11-23' })));
    recusado(await como('ana', () => sinc({ faseChave: 'pagamento_vencido' })), /Cliente não encontrado/);
    assert.equal(aceito(await como('carlos', () => sinc({ desfecho: 'REGULARIZADO' }))).pendente, true);
    const estado = () => { const c = caso(2048, 'PUBLICA'); return [c.FASE, c.FASE_DEVIDA, c.CAPA_ENVIADA, c.ENCERRADO_EM]; };
    const movs = () => contar('SELECT COUNT(*) AS N FROM KB_MOVIMENTO');
    const antes = [estado(), movs()];
    const recusas = await nasDuasSessoes(async () => [
      (await como('carlos', () => sinc({ faseChave: 'juridico' }))).error,
      (await como('carlos', () => sinc({ faseChave: 'regularizado' }))).error,
      (await como('carlos', () => sinc({ capaJson: JSON.stringify({ etiquetas: ['Promessa vencida'] }) }))).error,
      (await como('carlos', () => chamar('ccCobCasoSincronizar', { clienteId: idDe(2020), carteira: 'ESTETICA', faseChave: 'extrajudicial', capaJson: '{}' }))).error,
      JSON.stringify([estado(), movs()]),
    ]);
    assert.match(recusas[0], /A etapa do órgão só anda/);
    assert.match(recusas[1], /A etapa do órgão só anda/);
    assert.match(recusas[2], /Etiqueta fora/);
    assert.match(recusas[3], /Só o sistema muda/);
    assert.equal(recusas[4], JSON.stringify(antes));
    // Direto nas internas, como Carlos: a guarda da SQL segura.
    const c2048 = caso(2048, 'PUBLICA');
    const c2020 = caso(2020, 'ESTETICA');
    const interna = (nome, input) => como('carlos', () => chamar(nome, { membroId: M.carlos, agora: `${dia(0)}T10:00:00`, capa: '', ...input }));
    await interna('ccEscCobCasoCapa', { cobrancaId: c2048.ID, faseDevida: 'juridico' });
    await interna('ccEscCobCasoCapa', { cobrancaId: c2020.ID, faseDevida: 'protesto' });
    assert.equal(caso(2048, 'PUBLICA').FASE_DEVIDA, 'liquidacao_vencida');
    assert.equal(caso(2020, 'ESTETICA').FASE_DEVIDA, 'cob_ativa');
    // A próxima ação é do caso em qualquer carteira (como ccCobProxAcaoDefinir): quem não opera o caso não grava, nem direto.
    await como('ana', () => chamar('ccEscCobCasoProxAcao', { cobrancaId: c2020.ID, proxAcao: 'X', proxAcaoData: dia(1), membroId: M.ana, agora: `${dia(0)}T10:00:00` }));
    assert.equal(caso(2020, 'ESTETICA').PROX_ACAO, '');
    // A pessoa não troca título nem responsável do card (só capa, prazo, próxima ação e etapa).
    const k0 = consultar('SELECT TITULO, RESPONSAVEL_ID FROM KB_CARD WHERE ID = ?', c2048.CARD_ID)[0];
    aceito(await como('carlos', () => sinc({ capaJson: JSON.stringify({ etiquetas: ['Pequeno valor'], vencido: '1.00' }), titulo: 'OUTRO', responsavelUserId: U.ana })));
    assert.deepEqual(consultar('SELECT TITULO, RESPONSAVEL_ID FROM KB_CARD WHERE ID = ?', c2048.CARD_ID)[0], k0);
    // A rotina por dias não abre nem move caso público.
    const pub = () => contar("SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE CARTEIRA = 'PUBLICA'");
    const casosPub = pub();
    const movPub = () => contar("SELECT COUNT(*) AS N FROM KB_MOVIMENTO KM JOIN CC_COBRANCA CB ON CB.CARD_ID = KM.CARD_ID WHERE CB.CARTEIRA = 'PUBLICA'");
    const m0 = movPub();
    await leitura();
    assert.deepEqual([pub(), movPub()], [casosPub, m0]);
    // Capa da 005: só as etiquetas dela; as da 002 ficam.
    consultar(`UPDATE KB_CARD SET VALORES_JSON = ? WHERE ID = ? RETURNING 1`, JSON.stringify({ ...valores(c2048), etiquetas: [chaveDeRotulo('Promessa vencida')] }), c2048.CARD_ID);
    const capa = JSON.stringify({ etiquetas: ['Pequeno valor'] });
    aceito(await como(null, () => sinc({ capaJson: capa })));
    const depois = caso(2048, 'PUBLICA');
    assert.equal(etiqueta(depois, 'Promessa vencida') && etiqueta(depois, 'Pequeno valor'), true);
    assert.equal(depois.CAPA_ENVIADA, capa);
    assert.equal(aceito(await como(null, () => sinc({ capaJson: '{}' }))).atualizado, false);
    aceito(await como(null, () => sinc({ desfecho: 'REGULARIZADO' })));
    assert.deepEqual([caso(2048, 'PUBLICA').DESFECHO, caso(2048, 'PUBLICA').FASE], ['REGULARIZADO', 'regularizado']);
    assert.equal(aceito(await como(null, () => sinc({ desfecho: 'REGULARIZADO' }))).criado, false);
    assert.equal(pub(), casosPub);
  });

  await teste('C-028 · RN-032: o que não existe para o órgão', async () => {
    const c = caso(2043, 'PUBLICA');
    recusado(await como('carlos', () => chamar('ccCobAcordoPropor', { cobrancaId: c.ID, debito: 50000, valor: 50000, entrada: 10000, nParcelas: 4,
      entradaData: dia(0), primeiroVenc: dia(30) })), /acordo parcelado/);
    assert.equal((await como('gustavo', () => linhas('ccCobBloqueioListar', { carteira: 'PUBLICA' }))).length, 0);
    assert.equal((await como('gustavo', () => linhas('ccCobEmailFilaListar', { carteira: 'PUBLICA' }))).length, 0);
    recusado(await como('carlos', () => chamar('ccCobBloqueioAplicar', { cobrancaId: c.ID, aplicado: 'TOTAL' })));
  });

  await teste('C-029: contato, previsão, encargos e Jurídico do órgão', async () => {
    const pub = { clienteId: idDe(2043), carteira: 'PUBLICA', canal: 'Ofício', retorno: 'Aguardando liquidação (órgão)', feedback: 'Ofício protocolado.' };
    const r = aceito(await como('carlos', () => chamar('ccCobContatoRegistrar', { ...pub, nfId: 1, previsao: '2026-12-18' })));
    assert.equal(consultar('SELECT NF_ID FROM CC_CONTATO_COBRANCA WHERE ID = ?', r.contatoId)[0].NF_ID, 1);
    assert.equal(consultar('SELECT DATA_PROMETIDA FROM CC_PROMESSA WHERE CONTATO_ID = ?', r.contatoId)[0].DATA_PROMETIDA, '2026-12-18');
    const v = aceito(await comRelogio(`${dia(-10)}T10:00:00`, () => como('carlos', () => chamar('ccCobContatoRegistrar', { ...pub, previsao: dia(-6) }))));
    await leitura();
    const c = caso(2043, 'PUBLICA');
    assert.equal(consultar('SELECT SITUACAO FROM CC_PROMESSA WHERE CONTATO_ID = ?', v.contatoId)[0].SITUACAO, 'QUEBRADA');
    assert.equal(etiqueta(c, 'Promessa vencida'), true);
    assert.equal(notas(c, 'Promessa quebrada'), 1);
    const e = aceito(await como('carlos', () => chamar('ccCobEncargosCalcular', { clienteId: idDe(2043), carteira: 'PUBLICA' })));
    assert.deepEqual([e.multa, e.juros, e.correcao, e.total], [0, 333.33, 266.84, 50600.17]);
    if (!existe('ccJurDossieAbrir')) pular('depende de 003');
    aceito(await enviarDossie(await dossieMontado('gustavo', 2043, 'PUBLICA')));
    assert.equal(caso(2043, 'PUBLICA').FASE, 'juridico');
    await leitura();
    assert.equal(String(valores(caso(2043, 'PUBLICA')).juridico_1), '1');
  });

  await teste('C-030: um cliente em duas carteiras', async () => {
    assert.deepEqual([caso(2012, 'ESTETICA').QUADRO, caso(2012, 'ESTETICA').FASE], ['cobranca-estetica', 'cob_ativa']);
    assert.deepEqual([caso(2012).QUADRO, caso(2012).FASE], ['cobranca-privada', 'protesto']);
    pagar(2012, 401);
    await leitura();
    assert.equal(caso(2012, 'ESTETICA').DESFECHO, 'REGULARIZADO');
    assert.equal(caso(2012).ENCERRADO_EM, null);
  });

  /* ── casos especiais da régua ── */

  await teste('RN-001 · RN-030: fases e marcas dos clientes fixos', async () => {
    assert.deepEqual([2004, 2005, 2006, 2008, 2010].map((x) => caso(x).FASE), ['pag_nao_ident', 'cob_ativa', 'notif_formal', 'neg_pos_protesto', 'extrajudicial']);
    assert.equal(etiqueta(caso(2010), 'Pronto para o Jurídico'), true);
  });

  await teste('RN-030: Jurídico (envio sem caso e processo direto)', async () => {
    if (!existe('ccJurDossieAbrir')) pular('depende de 003');
    // 2041 não tem caso: o envio grava só NO_JURIDICO (semCaso).
    const r = aceito(await enviarDossie(await dossieMontado('gustavo', 2041)));
    assert.equal(r.cobranca && r.cobranca.semCaso, true);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE CLIENTE_ID = ?', idDe(2041)), 0);
    assert.equal(consultar('SELECT NO_JURIDICO FROM CC_CLIENTE WHERE CODCLI = 2041')[0].NO_JURIDICO, 1);
    // Processo cadastrado direto pelo Jurídico para 2009: a rotina leva o caso a `juridico` (05 §3.6 linha 14).
    const p = aceito(await como('julia', () => chamar('ccJurProcessoCriar', { clienteId: idDe(2009), carteira: 'PRIVADA', faseChave: 'recebido', valor: 15000 })));
    await leitura();
    const c = caso(2009);
    assert.deepEqual([c.FASE, c.PROCESSO_ID, !!c.JURIDICO_EM], ['juridico', p.processoId, true]);
  });

  await teste('C-023: dossiê primeiro, depois a cobrança judicial', async () => {
    recusado(await mover('bruno', caso(2023), 'juridico'), /dossiê/);
    const direto = (login, processoId) => como(null, () => chamar('ccCobEnviarJuridico', { clienteId: idDe(2023), carteira: 'PRIVADA', processoId, membroId: M[login] }));
    recusado(await direto('bruno', 1), /gerente/);
    recusado(await direto('gustavo', 1), /dossiê/);
    assert.equal(caso(2023).JURIDICO_EM, null);
    if (!existe('ccJurDossieAbrir')) pular('depende de 003');
    const processoId = await dossieMontado('bruno', 2023);
    recusado(await direto('bruno', processoId), /gerente/);
    recusado(await direto('gustavo', processoId), /dossiê/);
    assert.equal(caso(2023).JURIDICO_EM, null);
    aceito(await enviarDossie(processoId));
    const c = caso(2023);
    assert.deepEqual([c.FASE, c.PROCESSO_ID, c.JURIDICO_POR, !!c.JURIDICO_EM], ['juridico', processoId, M.gustavo, true]);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ? AND FASE_CHAVE = 'juridico'", c.ID), 1);
    assert.equal(consultar('SELECT NO_JURIDICO FROM CC_CLIENTE WHERE CODCLI = 2023')[0].NO_JURIDICO, 1);
    assert.equal((await como('julia', () => linhas('ccCobSituacao', { clienteId: String(idDe(2023)) }))).length, 1);
    const antes = contar('SELECT COUNT(*) AS N FROM CC_AUDITORIA');
    assert.equal(aceito(await direto('gustavo', processoId)).jaEnviado, true);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_AUDITORIA'), antes);
    await leitura();
    assert.equal(String(valores(caso(2023)).juridico_1), '1');
  });

  await teste('RN-003: regulariza em acordo; baixado não reabre enquanto o título baixado está no ERP', async () => {
    pagar(2032);
    await leitura();
    assert.deepEqual([caso(2032).DESFECHO, caso(2032).FASE], ['REGULARIZADO', 'regularizado']);
    const n2056 = () => contar("SELECT COUNT(*) AS N FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID WHERE C.CODCLI = 2056");
    await leitura();
    assert.equal(n2056(), 1);
    nota({ codcli: 2056, n: 70, emissao: dia(-35), itens: [{ codprod: 101, valor: 500 }], parcelas: [{ prest: 1, valor: 500, venc: dia(-5) }] });
    await leitura();
    assert.equal(n2056(), 1);
    consultar('DELETE FROM PCPREST WHERE CODCLI = 2056 AND DTVENC = ? RETURNING 1', dia(-200));
    await leitura();
    assert.equal(n2056(), 2);
    assert.equal(caso(2056).ENCERRADO_EM, null);
  });

  await teste('RN-005: protesto pelo botão e pelo card', async () => {
    // O protesto só se marca com o card em `protesto`: direto na interna, 2015 (cob_ativa) não fica protestado.
    await como('ana', () => chamar('ccEscCobCasoProtesto', { cobrancaId: caso(2015).ID, membroId: M.ana, agora: `${dia(0)}T10:00:00` }));
    assert.equal(caso(2015).PROTESTADO, 0);
    const c = caso(2007);
    aceito(await como('ana', () => chamar('ccCobAcaoRegistrar', { cobrancaId: c.ID, itens: '1,3' })));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ? AND FASE_CHAVE = 'protesto'", c.ID), 1);
    assert.equal(caso(2007).PROTESTADO, 1);
    pagar(2007);
    await leitura();
    nota({ codcli: 2007, n: 80, emissao: dia(-30), itens: [{ codprod: 101, valor: 700 }], parcelas: [{ prest: 1, valor: 700, venc: dia(-2) }] });
    await leitura();
    const novo = caso(2007);
    assert.notEqual(novo.ID, c.ID);
    assert.equal(novo.PROTESTADO, 0);
    assert.equal(Object.keys(valores(novo)).some((k) => /_\d+$/.test(k) && String(valores(novo)[k]) === '1'), false);
    const k = caso(2049);
    aceito(await como('ana', () => chamar('kbCardAtualizar', { cardId: k.CARD_ID, titulo: '', valoresJson: JSON.stringify({ protesto_1: '1' }),
      responsavelId: k.RESPONSAVEL_ID, prazo: '' })));
    await leitura();
    assert.equal(caso(2049).PROTESTADO, 1);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ?', k.ID), 0);
  });

  await teste('RN-024: movimentos que o quadro recusa', async () => {
    recusado(await mover('bruno', caso(2029), 'negociacao'));
    assert.equal(caso(2029).FASE, 'acordo');
    recusado(await mover('carlos', caso(2043, 'PUBLICA'), 'pagamento_vencido'), /notas fiscais/);
    recusado(await como('ana', () => chamar('kbCardExcluir', { cardId: caso(2015).CARD_ID })));
  });

  await teste('RN-028: dias da régua validados', async () => {
    const dias = (v) => ['confPag', 'lig', 'notif', 'neg', 'prop', 'extra', 'jur'].map((k, i) => ({ chave: `regua.${k}`, valor: String(v[i]) }));
    recusado(await salvarParametros('gustavo', dias([2, 4, 7, 7, 20, 30, 45])), /crescentes/);
    recusado(await salvarParametros('gustavo', [{ chave: 'regua.confPag', valor: '0' }]));
    recusado(await salvarParametros('gustavo', [{ chave: 'regua.jurMax', valor: '40' }]));
    recusado(await salvarParametros('gustavo', [{ chave: 'regua.bloqTotal', valor: '3' }]));
    recusado(await salvarParametros('sergio', [{ chave: 'regua.lig', valor: '5' }]));
    const antes = contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Parâmetros'");
    aceito(await salvarParametros('gustavo', [{ chave: 'regua.lig', valor: '5' }]));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Parâmetros'") > antes, true);
    aceito(await salvarParametros('gustavo', [{ chave: 'regua.lig', valor: null }]));
  });

  await teste('RN-031: caso novo depois de regularizar e troca de responsável', async () => {
    pagar(2057);
    await leitura();
    nota({ codcli: 2057, n: 90, emissao: dia(-30), itens: [{ codprod: 101, valor: 800 }], parcelas: [{ prest: 1, valor: 800, venc: dia(-2) }] });
    await leitura();
    const linhas2057 = consultar('SELECT ATIVO_CHAVE FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID WHERE C.CODCLI = 2057');
    assert.equal(linhas2057.length, 2);
    assert.equal(linhas2057.filter((l) => l.ATIVO_CHAVE).length, 1);
    assert.equal(Object.keys(valores(caso(2057))).some((k) => /_\d+$/.test(k)), false);
    aceito(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(2017)), agenteId: M.ana })));
    await leitura();
    assert.equal(caso(2017).RESPONSAVEL_ID, U.ana);
  });

  await teste('RN-033: ação no prazo na visão gerencial', async () => {
    aceito(await como('nara', () => chamar('ccCobAcaoRegistrar', { cobrancaId: caso(2059).ID, itens: '1,2' })));
    // Entrada no feriado de 20/11 (12:00 UTC = 09:00 em Brasília): o prazo vai ao próximo útil, 23/11; a ação de 23/11 está no prazo.
    consultar("UPDATE KB_CARD SET FASE_DESDE = '2026-11-20T12:00:00' WHERE ID = ? RETURNING 1", caso(2061).CARD_ID);
    await comRelogio('2026-11-23T10:00:00', async () => aceito(await como('nara', () => chamar('ccCobAcaoRegistrar', { cobrancaId: caso(2061).ID, itens: '1,2' }))));
    // C-01: direto na interna, Nara não grava ação de outra fase nem escolhe o NO_PRAZO (2060 está em cob_ativa desde D; hoje = 23/11).
    const direto = (faseChave) => comRelogio('2026-11-23T10:00:00', () => como('nara', () => chamar('ccEscCobAcaoInserir', {
      cobrancaId: caso(2060).ID, faseChave, origem: 'BOTAO', noPrazo: 1, membroId: M.nara, agora: '2026-11-19T10:00:00' })));
    await direto('extrajudicial');
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ?', caso(2060).ID), 0);
    await direto('cob_ativa');
    const prazo = (codcli) => consultar('SELECT NO_PRAZO FROM CC_ACAO_REGUA WHERE COBRANCA_ID = ?', caso(codcli).ID)[0].NO_PRAZO;
    assert.deepEqual([prazo(2059), prazo(2060), prazo(2061)], [1, 0, 1]);
    const k = await como('nara', () => linha('ccCobPainelKpis', { agenteId: String(M.nara), de: '2026-11-01', ate: '2026-11-30' }));
    assert.equal(n(k.ACOES_NO_PRAZO_PCT), 66.7);
  });

  /* ── orçamento ── */

  await teste('RNF-002 · RNF-006: execuções por tela, escrita, lote e rodada', async () => {
    for (const [nome, input] of [['ccCobCasoFicha', { cobrancaId: caso(2015).ID }], ['ccCobEncargosCalcular', { clienteId: idDe(2015), carteira: 'PRIVADA' }]]) {
      assert.equal(await execucoes(() => como('ana', () => chamar(nome, input))) <= 6, true, nome);
    }
    const escrita = async (fn) => { let r; const x = await execucoes(async () => { r = aceito(await fn()); }); assert.equal(x <= 20, true, `${x} execuções`); return r; };
    await escrita(() => contato('ana', 2034, { previsao: dia(1), valor: 100 }));
    const acordo = await escrita(() => propor('ana', 2024, { valor: 10000, entrada: 2000, nParcelas: 4 }));
    // As mais caras do plan: e-mail da régua (12), decisões de acordo e baixa (11); a anuência com e-mail (10) está no C-017.
    await escrita(() => como('bruno', () => chamar('ccCobEmailEnviar', { cobrancaId: caso(2033).ID })));
    await escrita(() => decidirAcordo('sergio', acordo.acordoId));
    const b = aceito(await como('ana', () => chamar('ccCobBaixaPropor', { cobrancaId: caso(2030).ID, valor: 8000, motivo: MOTIVO })));
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'De acordo.' })));
    await escrita(() => como('gustavo', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })));
    const fila = (await como('sergio', () => linhas('ccCobEmailFilaListar'))).filter((l) => l.SITUACAO_TELA === 'APROVAR').slice(0, 3);
    recusado(await como('sergio', () => chamar('ccCobEmailFilaDecidir', { filaIds: fila.map((f) => f.ID).join(',') })), /até 2/);
    for (const codigo of ['COB_NOTIF_FORMAL', 'COB_PROTESTO', 'COB_EXTRAJUDICIAL']) {
      aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo })));
    }
    await escrita(() => como('sergio', () => chamar('ccCobEmailFilaDecidir', { filaIds: fila.slice(0, 2).map((f) => f.ID).join(',') })));
    await escrita(() => como('sergio', () => chamar('ccCobEmailFilaDecidir', { filaIds: String(fila[2].ID) })));
    // Rodada com 30 casos novos: dentro do teto, cortada pelo orçamento (ficam clientes sem caso) e com pendentes.
    for (let i = 0; i < 30; i += 1) {
      cliente({ codcli: 2200 + i, nome: `CARGA ${i}`, ramo: 2, limite: 1000 });
      nota({ codcli: 2200 + i, n: 1, emissao: dia(-40), itens: [{ codprod: 101, valor: 100 + i }], parcelas: [{ prest: 1, valor: 100 + i, venc: dia(-12) }] });
    }
    const novos = () => contar('SELECT COUNT(*) AS N FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID WHERE C.CODCLI BETWEEN 2200 AND 2229');
    avancar(1);
    aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
    await rodarRotinaAte({ processamento: false });
    let r;
    const gasto = await execucoes(async () => { r = await rodarCron('ccCobRotina'); });
    assert.equal(gasto <= 150, true, `${gasto} execuções`);
    assert.deepEqual([novos() < 30, novos() === r.resumo.abertos, r.pendentes > r.resumo.abertos], [true, true, true]);
    // Sem tempo de relógio (orcamentoMs), o passo não mexe em nada e devolve pendentes.
    const semTempo = await como(null, () => chamar('ccCobRotina', { orcamentoExec: 150, orcamentoMs: 1000 }));
    assert.deepEqual([semTempo.pendentes > 0, semTempo.processados, novos()], [true, 0, r.resumo.abertos]);
    await rodarRotinaAte();
    assert.equal(novos(), 30);
    // Fora da primeira rodada completa do dia, a rodada lê só o que mudou; sem mudança, não escreve.
    let r2;
    assert.equal(await execucoes(async () => { r2 = await rodarCron('ccCobRotina'); }), 1);
    assert.equal(r2.pendentes, 0);
    assert.equal(r2.processados < contar('SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE ENCERRADO_EM IS NULL'), true, `${r2.processados} lidos`);
  });
}
