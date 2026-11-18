// Smoke da 005-setor-publico (plan, seção Testes). Banco único, testes em sequência por blocos (validador C-5):
// B leituras do estado do seed · C concessão pública (função da 004, dados e motor da 005) · D escritas, na ordem
// da tabela do plan. O bloco A (lib pura) está em tests/005-setor-publico.test.mjs. Escrita do bloco D que muda um
// dado que outro teste lê devolve o estado no fim do próprio teste.

import {
  teste as testeBase, pular, consultar, como, chamar, rodarCron, rodarRotinaAte, execucoes, nasDuasSessoes, existe, assert, U, M, dia,
} from './base.mjs';
import { db } from './base.mjs';

export const SEEDS = ['005'];
export const RELOGIO = '2026-12-01T10:00:00';
export const BANCO_POR_TESTE = false;

const teste = (titulo, fn) => (!process.env.SO || titulo.includes(process.env.SO) ? testeBase(titulo, fn) : null);

/* ── ajudantes ── */

const PADRAO = {
  busca: '', limite: '200', offset: '0', carteira: '', faseChave: '', agenteId: '0', analistaId: '0', buId: '-1', membroId: '0', clienteId: '0',
  cobrancaId: '0', nfId: '0', analiseId: '0', solicitacaoId: '0', situacao: '', acima2m: '-1', soAlerta: '0', todas: '0', ativo: '-1', de: '', ate: '',
  mes: '', filtro: '', retorno: '', promessa: '', dias: '30', creditoId: '0', pedidoId: '0', pendenciaId: '0', gravar: '0', agrupar: '', classe: '',
  vencendoEmDias: '0', vencidos: '0', divergeWinthor: '0', gatilho: '', tipo: '', rating: '', rebaixado: '-1', saude: '', criticidade: '', tipoPessoa: '',
  entradas: '{}',
};
const linhas = async (nome, input = {}) => (await chamar(nome, { ...PADRAO, ...input })).rows;
const linha = async (nome, input) => (await linhas(nome, input))[0];
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => {
  assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 300)}`);
  if (re) assert.match(r.error, re);
  return r;
};
const n = (v) => Number(v);
const um = (sql, ...p) => consultar(sql, ...p)[0];
const contar = (sql, ...p) => n(um(sql, ...p).N);
const idDe = (codcli) => n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
const nf = (numnota) => um('SELECT * FROM CC_NF_PUBLICA WHERE NUMNOTA = ?', numnota);
const nfId = (numnota) => n(nf(numnota).ID);
const SOL = `SELECT S.*, F.CHAVE AS FASE, C.CODCLI FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID`;
const solDe = (codcli) => um(`${SOL} WHERE C.CODCLI = ? AND S.CARTEIRA = 'PUBLICA' ORDER BY S.ID DESC`, codcli);
const analiseDe = (codcli) => um('SELECT AO.* FROM CC_ANALISE_ORGAO AO JOIN CC_SOLICITACAO S ON S.ID = AO.SOLICITACAO_ID JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID WHERE C.CODCLI = ? ORDER BY AO.ID DESC', codcli);
const casoDe = (codcli) => um(`SELECT CB.*, F.CHAVE AS FASE, K.PRAZO AS CARD_PRAZO FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE C.CODCLI = ? AND CB.CARTEIRA = 'PUBLICA' ORDER BY CB.ID DESC`, codcli);
const faseId = (quadro, chave) => n(um('SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ? AND CHAVE = ?', quadro, chave).FASE_ID);
const valores = (cardId) => JSON.parse(um('SELECT VALORES_JSON FROM KB_CARD WHERE ID = ?', cardId).VALORES_JSON || '{}');
/** Marca campos do card direto no banco (o que a tela grava pelo kbCardAtualizar). */
const marcar = (cardId, campos) => db().prepare('UPDATE KB_CARD SET VALORES_JSON = ? WHERE ID = ?').run(JSON.stringify({ ...valores(cardId), ...campos }), cardId);
const levar = (cardId, chave) => como(null, () => chamar('kbCardMover', { cardId, faseId: faseId('concessao-publica', chave), ordem: 0, movidoPor: U.gustavo, origem: 'sistema' }));
const DECISAO = (extra = {}) => ({ resultado: 'APROVADA', planoCod: '30', forma: 'Boleto bancário', parecer: 'Órgão com contrato e saldo.', ...extra });
const ANALISE_C008 = { esfera: 'MUNICIPAL', capag: 'B', pessoalPct: 50, cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', empenhoPrevio: 'SIM',
  contratoVigente: 'SIM', base: 'CONTRATO' };
const salvarAnalise = (login, solicitacaoId, dados) => como(login, () => chamar('ccPubAnaliseSalvar', { solicitacaoId, ...dados }));
const ficha = (numnota, login = 'carlos') => como(login, () => chamar('ccPubNfFicha', { nfId: nfId(numnota) }));
const passo = (f, p) => f.passos.find((x) => x.passo === p);
const datas = (numnota) => {
  const x = nf(numnota);
  return { nfId: x.ID, empenho: x.EMPENHO, protocolo: x.PROTOCOLO || '', atesto: x.ATESTO || '', liquidacao: x.LIQUIDACAO || '', op: x.OP || '', filaPosicao: 0, analiseId: 0 };
};
const salvarDatas = (login, numnota, extra = {}) => como(login, () => chamar('ccPubNfDatasSalvar', { ...datas(numnota), ...extra }));
const registrar = (login, numnota, p, extra = {}) => como(login, () => chamar('ccPubNfPassoRegistrar', { nfId: nfId(numnota), passo: p, ...extra }));
const leitura = async () => {
  aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
  await rodarRotinaAte();
};
/** A decisão pública é da 004: sem ela o seed fica sem contratação (aviso do seed). */
const comDecisao004 = () => { if (solDe(5001)?.DECISAO_RESULTADO !== 'APROVADA') pular('depende de 004 (decisão na carteira Pública)'); };
const MOTIVO_ANALISE = /Análise do órgão incompleta/;

export async function suite() {
  /* ── B: leituras do estado do seed ── */

  await teste('C-001 · RN-001: concessão pública em três etapas; 5002 em análise fora do prazo', async () => {
    const sla = Object.fromEntries(consultar(`SELECT F.CHAVE, KF.SLA_HORAS FROM CC_FASE F JOIN KB_FASE KF ON KF.ID = F.FASE_ID
WHERE F.QUADRO = 'concessao-publica' AND F.CHAVE IN ('entrada', 'analise', 'comite')`).map((l) => [l.CHAVE, n(l.SLA_HORAS)]));
    assert.deepEqual(sla, { entrada: 24, analise: 192, comite: 48 });
    const s = solDe(5002);
    assert.equal(s.PRAZO_DECISAO, '2026-12-01');
    assert.equal(s.FASE, 'analise');
    assert.ok(String(um('SELECT FASE_DESDE FROM KB_CARD WHERE ID = ?', s.CARD_ID).FASE_DESDE).startsWith('2026-11-21'));
    const est = (await como('gustavo', () => linhas('ccCredEsteiraResumo', { carteira: 'PUBLICA' }))).find((l) => l.FASE_CHAVE === 'analise');
    assert.equal(n(est.QTD), 1);
    assert.equal(n(est.ATRASADAS), 1);
  });

  await teste('C-013: NFs do Winthor — 7 abertas e 2 pagas, sem a cancelada nem a do privado; nova rodada não duplica', async () => {
    await como('gustavo', async () => {
      assert.equal(n((await linha('ccPubNfTotal')).TOTAL), 7);
      assert.equal(n((await linha('ccPubNfTotal', { situacao: 'PAGA' })).TOTAL), 2);
    });
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_NF_PUBLICA WHERE NUMNOTA IN (1010, 1099)'), 0);
    await leitura();
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_NF_PUBLICA'), 9);
  });

  await teste('C-014 · C-015 · C-016 · RN-020 · RN-021 · RN-022 · RN-023 · RN-024: prazos gravados batem com a lista e a ficha', async () => {
    const x = nf(1001);
    assert.deepEqual([x.LIQUIDAR_ATE, x.PAGAR_ATE], ['2026-10-16', '2026-10-30']);
    const l1001 = (await como('carlos', () => linhas('ccPubNfListar', { busca: '1001' })))[0];
    assert.equal(l1001.SITUACAO, 'LIQUIDACAO_VENCIDA');
    assert.equal(n(l1001.DIAS_ATRASO), 32);
    const f = aceito(await ficha(1001));
    assert.equal(f.nf.SITUACAO, 'LIQUIDACAO_VENCIDA');
    assert.equal(f.nf.DIAS_ATRASO, 32);
    const x1003 = nf(1003);
    assert.deepEqual([x1003.LIQUIDAR_ATE, x1003.PAGAR_ATE, n(x1003.PEQUENO_VALOR)], ['2026-11-10', '2026-11-17', 1]);
    const x1004 = nf(1004);
    assert.deepEqual([x1004.PAGAR_ATE, n(x1004.PRAZO_CONTRATO), x1004.ETAPA_NF], comDecisaoOu(['2026-12-01', 1, 'OP']));
    assert.equal(nf(1005).LIQUIDAR_ATE, '2026-12-09');
    assert.equal(nf(1002).PAGAR_ATE, '2026-11-04');
    const l1004 = (await como('carlos', () => linhas('ccPubNfListar', { busca: '1004' })))[0];
    assert.equal(l1004.SITUACAO, 'NO_PRAZO');
  });

  await teste('C-028 · RN-019: regra aplicada por NF', async () => {
    const regra = (numnota) => um('SELECT R.NOME FROM CC_NF_PUBLICA N JOIN CC_REGRA_PAGAMENTO_ENTE R ON R.ID = N.REGRA_ID WHERE N.NUMNOTA = ?', numnota).NOME;
    assert.equal(regra(1004), 'Distrito Federal');
    assert.equal(regra(1001), 'Municípios');
    assert.equal(regra(1003), 'Municípios');
    assert.equal(regra(1002), 'Federal');
  });

  await teste('C-017 · RF-017: acima de 2 meses, ordem da lista e busca', async () => {
    await como('gustavo', async () => {
      assert.deepEqual((await linhas('ccPubNfListar', { acima2m: '1' })).map((l) => n(l.NUMNOTA)).sort(), [1002, 1009]);
      const ordem = (await linhas('ccPubNfListar')).map((l) => n(l.NUMNOTA));
      assert.deepEqual(ordem.slice(0, 4), [1009, 1001, 1002, 1003]);
      assert.equal(ordem[4], 1004);
      assert.equal(ordem.length, 7);
      assert.deepEqual((await linhas('ccPubNfListar', { busca: '2026NE000812' })).map((l) => n(l.NUMNOTA)), [1001]);
      assert.deepEqual((await linhas('ccPubNfListar', { busca: 'GOIANIA' })).map((l) => n(l.NUMNOTA)), [1001]);
    });
  });

  await teste('C-019 · RN-026: resumo, funil e totais por papel; capa do card do órgão', async () => {
    const r = await como('gustavo', () => linha('ccPubResumo'));
    const ver = (k, v) => assert.equal(n(r[k]), v, k);
    [['NFS_ABERTAS', 7], ['VALOR_ABERTO', 222000], ['A_PROTOCOLAR', 1], ['LIQUIDACAO_VENCIDA', 2], ['PAGAMENTO_VENCIDO', 2], ['ACIMA_2M', 2],
      ['VALOR_ACIMA_2M', 60000], ['SEM_ATESTO', 4], ['VALOR_SEM_ATESTO', 137000], ['AGUARDANDO_LIQUIDACAO', 0], ['VALOR_AGUARDANDO_LIQUIDACAO', 0],
      ['LIQUIDADAS_SEM_PAGAMENTO', 3], ['VALOR_LIQUIDADAS_SEM_PAGAMENTO', 85000], ['VALOR_PAGAMENTO_VENCIDO', 60000], ['RECEBIDO_MES', 0],
      ['NFS_RECEBIDAS_MES', 0]].forEach(([k, v]) => ver(k, v));
    const set = await como('gustavo', () => linha('ccPubResumo', { mes: '2026-09' }));
    assert.deepEqual([n(set.RECEBIDO_MES), n(set.NFS_RECEBIDAS_MES)], [18000, 1]);
    const t = await como('gustavo', () => linha('ccPubNfTotal'));
    assert.deepEqual([n(t.ORGAOS), n(t.VENCIDAS), n(t.VALOR_VENCIDO)], [4, 4, 170000]);
    for (const [login, total] of [['carlos', 7], ['silvia', 7], ['ana', 0]]) {
      assert.equal(n((await como(login, () => linha('ccPubNfTotal'))).TOTAL), total, login);
    }
    const c = casoDe(5001);
    const capa = JSON.parse(c.CAPA_ENVIADA);
    assert.deepEqual([capa.valor_aberto, capa.nfs_abertas], [52000, 3]);
    assert.equal(c.CARD_PRAZO, comDecisaoOu('2026-12-01'));
    const pos = () => JSON.stringify(um('SELECT * FROM CC_POSICAO_CLIENTE WHERE CLIENTE_ID = ?', idDe(5003)));
    const antes = pos();
    await rodarCron();
    assert.equal(pos(), antes);
  });

  await teste('C-020 · RN-028: passo atual, agenda do órgão e mensagem do ofício', async () => {
    const esperado = { 1001: ['G3', '2026-11-24'], 1002: ['M2', '2026-11-30'], 1009: ['G5', '2026-10-30'], 1003: ['L3', '2026-11-25'], 1005: ['CONF', '2026-11-27'] };
    const lista = await como('carlos', () => linhas('ccPubNfListar'));
    for (const [numnota, [p, data]] of Object.entries(esperado)) {
      const l = lista.find((x) => n(x.NUMNOTA) === n(numnota));
      assert.deepEqual([l.PROXIMO_PASSO, l.PROXIMO_PASSO_DATA], [p, data], numnota);
    }
    const agenda = (await como('carlos', () => linhas('ccCobAgendaListar', { carteira: 'PUBLICA', ate: dia(30) }))).filter((l) => l.TIPO === 'PROX_ACAO');
    assert.deepEqual(agenda.map((l) => [n(l.CODCLI), l.DATA, n(l.ATRASADO)]),
      [[5003, '2026-10-30', 1], [5002, '2026-11-24', 1], [5004, '2026-11-25', 1], [5001, '2026-11-27', 1]]);
    const m = aceito(await como('carlos', () => chamar('ccPubMensagemPreparar', { nfId: nfId(1001), passo: 'G4' })));
    assert.equal(m.codigo, 'PUB_OFICIO');
    for (const t of ['1001', '2026NE000812', '30/10/2026']) assert.ok(m.corpo.includes(t), t);
    assert.equal(m.validado, false);
  });

  await teste('C-022 · RN-030: etapa do órgão no quadro de cobrança pública; mover à mão é recusado', async () => {
    const q = Object.fromEntries((await como('gustavo', () => linhas('ccCobQuadroResumo', { carteira: 'PUBLICA' }))).map((l) => [l.FASE_CHAVE, n(l.CASOS)]));
    assert.deepEqual([q.nf_protocolar, q.liquidacao_vencida, q.pagamento_vencido, q.oficio, q.requerimento], [1, 0, 0, 2, 1]);
    const r = await como('carlos', () => chamar('kbCardMover', { cardId: casoDe(5001).CARD_ID, faseId: faseId('cobranca-publica', 'oficio'), ordem: 0 }));
    recusado(r, /acompanha as notas fiscais/);
  });

  await teste('C-025: Pública sem bloqueio, fila de e-mail ou acordo do privado', async () => {
    await como('gustavo', async () => {
      assert.equal((await linhas('ccCobBloqueioListar', { carteira: 'PUBLICA' })).filter((l) => n(l.CODCLI) >= 5001 && n(l.CODCLI) <= 5005).length, 0);
      assert.equal((await linhas('ccCobEmailFilaListar', { carteira: 'PUBLICA' })).filter((l) => n(l.CODCLI) >= 5001 && n(l.CODCLI) <= 5005).length, 0);
      assert.ok(!(await linhas('ccCobQuadroResumo', { carteira: 'PRIVADA' })).some((l) => n(l.CLIENTE_ID) === idDe(5003)));
      assert.ok((await linhas('ccCobSituacao', { clienteId: idDe(5003) })).every((l) => !l.BLOQUEIO_DEVIDO));
    });
    const r = await como('carlos', () => chamar('ccCobAcordoPropor', { cobrancaId: casoDe(5003).ID, entrada: 0, parcelas: 2, primeiroVencimento: dia(10), obs: '' }));
    assert.equal(r?.ok, false);
  });

  await teste('C-029: certidões vigentes por situação e no resumo', async () => {
    const l = Object.fromEntries((await como('carlos', () => linhas('ccPubCertidaoListar'))).map((x) => [x.TIPO, x.SITUACAO]));
    assert.deepEqual(l, { CND_FEDERAL: 'VENCENDO', CND_ESTADUAL: 'VENCENDO', CRF_FGTS: 'VENCIDA', CNDT: 'VALIDA' });
    const r = await como('gustavo', () => linha('ccPubResumo'));
    assert.deepEqual([n(r.CERTIDOES_VENCENDO), n(r.CERTIDOES_VENCIDAS)], [2, 1]);
  });

  await teste('RN-027 · RN-024: passos da 1001 e da 1002 na ficha', async () => {
    const f = aceito(await ficha(1001));
    const devido = Object.fromEntries(f.passos.map((x) => [x.passo, x.devido]));
    assert.deepEqual(devido, { CONF: '2026-10-06', L1: '2026-10-19', L2: '2026-10-23', L3: '2026-10-30', G1: '2026-11-03', G2: '2026-11-09',
      G3: '2026-11-24', G4: '2026-12-15', G5: devido.G5, M2: '2026-12-02' });
    assert.ok(passo(f, 'L1').feitoEm && passo(f, 'L2').feitoEm);
    const f2 = aceito(await ficha(1002));
    assert.ok(!f2.passos.some((x) => x.passo === 'CONF' || x.passo.startsWith('L')));
    assert.equal(nf(1004).ETAPA_NF, 'OP');
  });

  await teste('RN-033 (tipo): mensagem pela situação da NF', async () => {
    const tipo = async (numnota) => aceito(await como('carlos', () => chamar('ccPubMensagemPreparar', { nfId: nfId(numnota), passo: '' }))).codigo;
    assert.equal(await tipo(1002), 'PUB_REQUERIMENTO');
    assert.equal(await tipo(1008), 'PUB_PROTOCOLO');
    assert.equal(await tipo(1005), 'PUB_PROTOCOLO');
    assert.equal(await tipo(1001), 'PUB_LIQ');
    assert.equal(await tipo(1004), 'PUB_FILA');
  });

  await teste('C-011: histórico do órgão e motor da análise sem gravar (DT-42)', async () => {
    comDecisao004();
    const s = solDe(5004);
    const o = aceito(await como('carlos', () => chamar('ccPubAnaliseObter', { solicitacaoId: s.ID })));
    assert.deepEqual([o.historico.pagas, o.historico.noPrazo, o.historico.liquidacaoMedia, o.historico.pagamentoMedio, o.historico.atrasoMedio], [2, 1, 6, 20, 13]);
    assert.equal(o.sugestoes.atrasoMedio, 13);
    const calc = aceito(await como('carlos', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.ID, gravar: 0 })));
    assert.deepEqual([calc.nota, calc.ratingPub, calc.exposicao], [79, 'P2', 40000]);
    assert.deepEqual([o.motor.nota, o.motor.ratingPub, o.motor.exposicao], [calc.nota, calc.ratingPub, calc.exposicao]);
  });

  await teste('RN-035 (B): cinco regras iniciais, todas a confirmar', async () => {
    const l = await como('carlos', () => linhas('ccPubRegraEnteListar'));
    assert.equal(l.length, 5);
    assert.ok(l.every((x) => x.SITUACAO === 'A_CONFIRMAR'));
  });

  await teste('RN-002 · RN-031: quadros públicos semeados (itens e SLA da etapa do órgão)', async () => {
    const sla = Object.fromEntries(consultar(`SELECT F.CHAVE, KF.SLA_HORAS FROM CC_FASE F JOIN KB_FASE KF ON KF.ID = F.FASE_ID WHERE F.QUADRO = 'cobranca-publica'`)
      .map((l) => [l.CHAVE, n(l.SLA_HORAS)]));
    assert.deepEqual([sla.nf_protocolar, sla.liquidacao_vencida, sla.pagamento_vencido, sla.oficio], [48, 120, 240, 240]);
    const itens = (chave) => contar(`SELECT COUNT(*) AS N FROM KB_CAMPO KC JOIN CC_FASE F ON F.FASE_ID = KC.FASE_ID
WHERE F.QUADRO = 'concessao-publica' AND F.CHAVE = ? AND KC.TIPO = 'sim_nao'`, chave);
    assert.deepEqual([itens('entrada'), itens('analise'), itens('comite')], [3, 5, 2]);
  });

  await teste('orçamento (B): abrir a lista de NFs e os cards públicos', async () => {
    assert.ok(await execucoes(() => como('carlos', async () => {
      await linhas('ccPubNfListar'); await linha('ccPubNfTotal'); await linha('ccPubResumo');
    })) <= 6);
    const s = solDe(5002);
    const card = await execucoes(() => como('carlos', async () => {
      await chamar('kbCardDetalheSql', { cardId: s.CARD_ID });
      await chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.ID });
      await chamar('ccPubAnaliseObter', { solicitacaoId: s.ID });
    }));
    assert.equal(card, 3, 'card da concessão');
    const c = casoDe(5001);
    const cob = await execucoes(() => como('carlos', async () => {
      await chamar('kbCardDetalheSql', { cardId: c.CARD_ID });
      await chamar('ccCobCasoFicha', { cobrancaId: c.ID });
      await linhas('ccPubNfListar', { clienteId: idDe(5001) });
    }));
    assert.equal(cob, 3, 'card da cobrança pública');
  });

  /* ── C: concessão pública ── */

  await teste('C-002 · RN-003 · C-008: análise incompleta não vai ao comitê; com a análise do C-008, vai', async () => {
    const s = solDe(5002);
    const mover = () => como('carlos', () => chamar('kbCardMover', { cardId: s.CARD_ID, faseId: faseId('concessao-publica', 'comite'), ordem: 0 }));
    assert.equal((await mover())?.ok, false);
    marcar(s.CARD_ID, { analise_1: '1', analise_2: '1' });
    recusado(await mover(), MOTIVO_ANALISE);
    const r = aceito(await salvarAnalise('carlos', s.ID, { ...ANALISE_C008, contrato: '101/2026', valorEstimado: 200000, saldoContrato: 200000,
      vigenciaFim: '2027-06-30' }));
    assert.deepEqual([r.motor.nota, r.motor.ratingPub, r.motor.exposicao, r.motor.decisaoSugerida, r.motor.podeAprovar], [87, 'P1', 200000, 'APROVAR', true]);
    assert.deepEqual(Object.values(r.motor.pontos), [22, 10, 10, 15, 20, 0, 10]);
    const ao = analiseDe(5002);
    assert.deepEqual([ao.RATING_PUB, n(ao.EXPOSICAO), n(ao.NOTA)], ['P1', 200000, 87]);
    assert.ok(ao.CALCULADO_EM);
    aceito(await mover());
    assert.equal(solDe(5002).FASE, 'comite');
  });

  await teste('B-01 · RN-007 · DT-40: motor forjado por chamada direta torna proponente; a decisão não aprova', async () => {
    comDecisao004();
    const s = solDe(5002);
    const AG = '2026-12-01T10:00:00';
    const decisoes = () => contar("SELECT COUNT(*) AS N FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.ID);
    // Silvia (Supervisor, superior de Carlos, nunca salvou a análise): as três chamadas diretas da B3
    await como('silvia', () => chamar('ccEscPubAnaliseMotor', { solicitacaoId: s.ID, nota: 99, pontos: 'capag:30', ratingPub: 'P1', exposicao: 10000000,
      decisaoSugerida: 'APROVAR', membroId: M.silvia, agora: AG }));
    const forjada = analiseDe(5002);
    assert.equal(n(forjada.EXPOSICAO), 10000000);
    assert.ok(String(forjada.PROPOSTA_POR).split(',').includes(String(M.silvia)), forjada.PROPOSTA_POR);
    await como('silvia', () => chamar('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: s.ID, creditoId: 0, resultado: 'APROVADA', limiteAprovado: 90000,
      planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: '', parecer: 'ok', justificativaExcecao: '', motorJson: '{}', membroId: M.silvia, agora: AG }));
    assert.equal(decisoes(), 0);
    const ultima = n(um('SELECT COALESCE(MAX(ID), 0) AS ID FROM CC_DECISAO').ID);
    await como('silvia', () => chamar('ccEscCredSolicitacaoDecisao', { solicitacaoId: s.ID, resultado: 'APROVADA', decisaoId: ultima, motivo: '', membroId: M.silvia, agora: AG }));
    assert.equal(solDe(5002).DECISAO_RESULTADO, '');
    // pela SF: Silvia propôs; Gustavo recalcula o motor e ele não bate com a fotografia
    recusado(await como('silvia', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.ID, ...DECISAO({ limiteAprovado: 90000 }) })), /propôs/);
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.ID, ...DECISAO({ limiteAprovado: 200000 }) })), /O motor mudou/);
    assert.equal(decisoes(), 0);
    // Carlos (já proponente) recalcula: a fotografia volta e o C-012 segue
    aceito(await como('carlos', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.ID, gravar: 1 })));
    assert.deepEqual([analiseDe(5002).RATING_PUB, n(analiseDe(5002).EXPOSICAO)], ['P1', 200000]);
  });

  await teste('C-012 · RN-018: Gustavo aprova o 5002 na faixa Gerente; rating público, sem rating privado', async () => {
    comDecisao004();
    const s = solDe(5002);
    aceito(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.ID, ...DECISAO({ limiteAprovado: 200000 }) })));
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ? ORDER BY ID DESC", s.ID);
    assert.deepEqual([d.ALCADA_EXIGIDA, d.RATING_PUB, n(d.LIMITE_MOTOR), d.RATING || ''], ['Gerente', 'P1', 200000, '']);
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.ID);
    assert.equal(n(cr.ANALISE_ORGAO_ID), n(analiseDe(5002).ID));
    await rodarCron();
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ?', idDe(5002)), 0);
  });

  await teste('RN-011 · C-005: capacidade sugerida pela CAPAG; alçada pública do 5003 em três faixas', async () => {
    comDecisao004();
    const s = aceito(await como('carlos', () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(5003), carteira: 'PUBLICA', tipoCliente: 'NOVO', valor: 350000,
      prazoMeses: 12, justificativa: 'Contrato do hospital.', rca: 'CARLOS LIMA', analistaId: M.carlos })));
    const dados = { esfera: 'FEDERAL', capag: 'A', cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', empenhoPrevio: 'SIM', contratoVigente: 'SIM',
      base: 'CONTRATO', contrato: '077/2026', valorEstimado: 350000, saldoContrato: 350000, vigenciaFim: '2027-06-30' };
    await levar(s.cardId, 'analise');
    aceito(await salvarAnalise('carlos', s.id, dados));
    assert.equal(analiseDe(5003).CAPACIDADE, 'ALTA');
    aceito(await salvarAnalise('carlos', s.id, { ...dados, capacidade: 'BAIXA' }));
    assert.deepEqual([analiseDe(5003).CAPACIDADE, n(analiseDe(5003).CAPACIDADE_MANUAL)], ['BAIXA', 1]);
    aceito(await salvarAnalise('carlos', s.id, { ...dados, capag: 'B' }));
    assert.equal(analiseDe(5003).CAPACIDADE, 'BAIXA');
    const r = aceito(await salvarAnalise('carlos', s.id, dados));
    assert.deepEqual([r.motor.nota, r.motor.ratingPub, r.motor.exposicao], [95, 'P1', 350000]);
    if (existe('ccCredSolicitacaoSalvar')) aceito(await como('carlos', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.id, limiteProposto: 350000, parecer: 'Contrato com saldo.' })));
    marcar(s.cardId, { analise_1: '1', analise_2: '1' });
    aceito(await levar(s.cardId, 'comite'));
    recusado(await como('silvia', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 350000 }) })), /Gerente/);
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 350000.01 }) })), /Comitê de crédito/);
    aceito(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 350000 }) })));
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ? ORDER BY ID DESC", s.id);
    assert.deepEqual([d.ALCADA_EXIGIDA, n(d.LIMITE_MOTOR)], ['Gerente', 350000]);
    const d4 = um("SELECT D.* FROM CC_DECISAO D WHERE D.ENTIDADE = 'SOLICITACAO' AND D.ENTIDADE_ID = ?", solDe(5004).ID);
    assert.deepEqual([n(d4.RESPONSAVEL_ID), d4.ALCADA_EXIGIDA, d4.RATING_PUB, n(d4.LIMITE_MOTOR)], [M.silvia, 'Supervisor', 'P2', 40000]);
  });

  await teste('C-003: edital pré-aprova e não aprova; pré-aprovação de 1.200.000 é da Diretoria', async () => {
    comDecisao004();
    const s = aceito(await como('carlos', () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(5005), carteira: 'PUBLICA', tipoCliente: 'NOVO', valor: 1200000,
      prazoMeses: 12, justificativa: 'Pregão da autarquia.', rca: 'CARLOS LIMA', analistaId: M.carlos })));
    await levar(s.cardId, 'analise');
    aceito(await salvarAnalise('carlos', s.id, { capag: 'A', cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', base: 'EDITAL', edital: 'PE 12/2026',
      valorEstimado: 1200000 }));
    const m = aceito(await como('carlos', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.id, gravar: 0 })));
    assert.deepEqual([m.nota, m.ratingPub, m.exposicao, m.decisaoSugerida, m.podeAprovar], [87, 'P1', 1200000, 'PRE_APROVAR', false]);
    if (existe('ccCredSolicitacaoSalvar')) aceito(await como('carlos', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.id, limiteProposto: 1200000, parecer: 'Edital.' })));
    marcar(s.cardId, { analise_1: '1', analise_2: '1' });
    aceito(await levar(s.cardId, 'comite'));
    recusado(await como('diana', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 1200000 }) })), /contrato/);
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ resultado: 'PRE_APROVADA', limiteAprovado: 1200000 }) })), /Diretoria/);
    aceito(await como('diana', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ resultado: 'PRE_APROVADA', limiteAprovado: 1200000 }) })));
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ? ORDER BY ID DESC", s.id);
    assert.deepEqual([d.ALCADA_EXIGIDA, d.RATING_PUB], ['Diretoria', 'P1']);
    assert.equal(solDe(5005).FASE, 'comite');
    await leitura();
    assert.equal(n(analiseDe(5005).PRE_APROVADA), 1);
  });

  await teste('B-01 · DT-40: o "Calcular" (gravar = 1) torna proponente; quem recalcula não decide', async () => {
    comDecisao004();
    const s = solDe(5005);
    const autores = () => String(analiseDe(5005).PROPOSTA_POR).split(',');
    assert.ok(!autores().includes(String(M.silvia)));
    aceito(await como('silvia', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.ID, gravar: 1 })));
    assert.ok(autores().includes(String(M.silvia)), autores().join(','));
    const a = um("SELECT * FROM CC_AUDITORIA WHERE AREA = 'Setor público' AND CAMPO = 'PROPOSTA_POR' ORDER BY ID DESC");
    assert.equal(n(a.POR), M.silvia);
    recusado(await como('silvia', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.ID, ...DECISAO({ resultado: 'RECUSADA', parecer: 'Sem contrato.' }) })),
      /propôs/);
  });

  await teste('C-031 · RN-037: contratos dos créditos públicos e alertas', async () => {
    comDecisao004();
    await como('gustavo', async () => {
      assert.deepEqual((await linhas('ccPubContratoListar')).map((l) => n(l.CODCLI)).sort(), [5001, 5002, 5003, 5004]);
      const alerta = Object.fromEntries((await linhas('ccPubContratoListar', { soAlerta: '1' })).map((l) => [n(l.CODCLI), l.ALERTA]));
      assert.deepEqual(alerta, { 5001: 'SALDO', 5004: 'VIGENCIA' });
      assert.equal(n((await linha('ccPubResumo')).CONTRATOS_ALERTA), 2);
    });
  });

  /* ── D: escritas ── */

  await teste('C-018 · RN-025: datas da NF fora de ordem são recusadas', async () => {
    recusado(await salvarDatas('carlos', 1005, { atesto: '2026-11-20' }), /protocolo/);
    recusado(await salvarDatas('carlos', 1005, { atesto: '2026-11-25', liquidacao: '2026-12-05' }), /hoje/);
    recusado(await salvarDatas('carlos', 1005, { atesto: '2026-11-25', op: '2026-11-30' }), /liquidação/);
    recusado(await salvarDatas('carlos', 1008, { atesto: '2026-11-28' }), /protocolo/);
    assert.equal(nf(1005).ATESTO, null);
  });

  await teste('RF-013: datas da 1004 movem o card da SES-DF no mesmo clique, em nome de Carlos', async () => {
    comDecisao004();
    await nasDuasSessoes(async (modo) => {
      const ida = { protocolo: '2026-10-30', atesto: '2026-11-06', liquidacao: '', op: '' };
      let r;
      const ex = await execucoes(async () => { r = aceito(await salvarDatas('carlos', 1004, ida)); });
      assert.equal(r.nf.LIQUIDAR_ATE, '2026-11-16');
      assert.equal(r.nf.SITUACAO, 'LIQUIDACAO_VENCIDA');
      const c = casoDe(5001);
      assert.equal(c.FASE, 'liquidacao_vencida');
      assert.equal(c.FASE_DEVIDA, 'liquidacao_vencida');
      const log = um("SELECT L.* FROM KB_LOG L WHERE L.CARD_ID = ? ORDER BY L.ID DESC", c.CARD_ID);
      assert.equal(n(log.USUARIO_ID), U.carlos);
      assert.ok(consultar("SELECT DETALHE FROM KB_LOG WHERE CARD_ID = ? AND EVENTO = 'nota'", c.CARD_ID).some((x) => String(x.DETALHE).includes('Etapa do órgão: Liquidação vencida · cobrar atesto')));
      aceito(await salvarDatas('carlos', 1004, { ...ida, liquidacao: '2026-11-12', op: '2026-11-26' }));
      assert.equal(casoDe(5001).FASE, 'nf_protocolar');
      assert.ok(consultar("SELECT DETALHE FROM KB_LOG WHERE CARD_ID = ? AND EVENTO = 'nota'", c.CARD_ID).some((x) => String(x.DETALHE).includes('Etapa do órgão: NF a protocolar')));
      // O-03 da B3: medido pelo contador — 15 com SIM_SESSAO_ANINHADA=0 e 16 com =1 (uma execução a mais dentro da 002)
      assert.equal(ex, modo === '0' ? 15 : 16, `execuções com mudança de fase (sessão aninhada ${modo})`);
      return ex <= 20;
    });
  });

  await teste('RF-004: análise decidida só muda contrato, saldo, vigência, prazo e regra', async () => {
    comDecisao004();
    const s = solDe(5002);
    const base = { ...ANALISE_C008, contrato: '101/2026', valorEstimado: 200000, saldoContrato: 200000, vigenciaFim: '2027-06-30' };
    recusado(await salvarAnalise('carlos', s.ID, { ...base, capag: 'X' }), /Opção inválida/);
    recusado(await salvarAnalise('carlos', s.ID, { ...base, capag: 'A' }), /decidida/);
    aceito(await salvarAnalise('carlos', s.ID, { ...base, saldoContrato: 190000 }));
    assert.equal(n(analiseDe(5002).SALDO_CONTRATO), 190000);
    assert.equal(n(analiseDe(5002).EXPOSICAO), 190000, 'fotografia regravada');
    aceito(await salvarAnalise('carlos', s.ID, base));
    assert.equal(n(analiseDe(5002).SALDO_CONTRATO), 200000);
  });

  await teste('RF-014: NF ligada à contratação mais recente do órgão; contratação de outro órgão recusada', async () => {
    comDecisao004();
    await leitura();
    assert.equal(n(nf(1001).ANALISE_ID), n(analiseDe(5002).ID));
    const antes = nf(1003).ANALISE_ID;
    recusado(await salvarDatas('carlos', 1003, { analiseId: analiseDe(5001).ID }), /Contratação/);
    assert.equal(nf(1003).ANALISE_ID, antes);
    aceito(await salvarDatas('carlos', 1003, { analiseId: 0 }));
    assert.equal(n(nf(1003).ANALISE_ID), n(analiseDe(5004).ID));
  });

  await teste('RN-038: visibilidade, ator da sessão e motor chamado em nome de (DT-34, B-C3)', async () => {
    const ida = datas(1002);
    recusado(await como('ana', () => chamar('ccPubNfDatasSalvar', ida)), /não encontrada/);
    aceito(await como('carlos', () => chamar('ccPubNfDatasSalvar', { ...ida, membroId: M.gustavo })));
    assert.equal(n(nf(1002).ATUALIZADO_POR), M.carlos);
    recusado(await como('visitante', () => chamar('ccPubNfDatasSalvar', ida)), /não faz parte da equipe/);
    const s2 = solDe(5002);
    const proprio = aceito(await como('carlos', () => chamar('ccPubMotorCalcular', { solicitacaoId: s2.ID, gravar: 0 })));
    const emNome = aceito(await como(null, () => chamar('ccPubMotorCalcular', { solicitacaoId: s2.ID, gravar: 0, membroId: M.carlos })));
    assert.deepEqual(emNome, proprio);
    recusado(await como(null, () => chamar('ccPubMotorCalcular', { solicitacaoId: s2.ID, gravar: 0, membroId: M.ana })), /Solicitação não encontrada/);
    if (solDe(5005)?.FASE !== 'comite') pular('depende de 004 (C-003: 5005 pré-aprovado no comitê)');
    const s5 = solDe(5005);
    const calc = analiseDe(5005).CALCULADO_EM;
    await nasDuasSessoes(async () => {
      const r = aceito(await como('sergio', () => chamar('ccPubMotorCalcular', { solicitacaoId: s5.ID, gravar: 0 })));
      recusado(await como('sergio', () => chamar('ccPubMotorCalcular', { solicitacaoId: s5.ID, gravar: 1 })), /Solicitação não encontrada/);
      assert.equal(analiseDe(5005).CALCULADO_EM, calc);
      recusado(await como('sergio', () => chamar('ccPubMotorCalcular', { solicitacaoId: s2.ID, gravar: 0 })), /Solicitação não encontrada/);
      return [r.nota, r.ratingPub];
    }).then((v) => assert.deepEqual(v, [87, 'P1']));
  });

  await teste('RN-038 · DT-40 (B-02): interna chamada direto com membroId "4.0" grava o autor como "4"', async () => {
    const s = solDe(5002);
    const ao = analiseDe(5002);
    await como(null, () => chamar('ccEscPubAnaliseAtualizar', {
      solicitacaoId: s.ID, membroId: '4.0', agora: '2026-12-01T10:00:00', esfera: ao.ESFERA, capag: ao.CAPAG, capacidade: ao.CAPACIDADE, capacidadeManual: 0,
      pessoalPct: ao.PESSOAL_PCT ?? '', cauc: ao.CAUC, fonteTipo: ao.FONTE_TIPO, fontePagadora: '', perfilPag: ao.PERFIL_PAG, atrasoMedio: '', atrasoMedioManual: 0,
      restosAPagar: '', empenhoPrevio: ao.EMPENHO_PREVIO, contratoVigente: ao.CONTRATO_VIGENTE, base: ao.BASE, edital: ao.EDITAL, valorEstimado: ao.VALOR_ESTIMADO,
      contrato: ao.CONTRATO, saldoContrato: ao.SALDO_CONTRATO, vigenciaFim: ao.VIGENCIA_FIM || '', regraId: 0, prazoContratoDias: ao.PRAZO_CONTRATO_DIAS,
    }));
    const autores = String(analiseDe(5002).PROPOSTA_POR).split(',');
    assert.ok(autores.includes(String(M.silvia)), autores.join(','));
    assert.ok(!autores.some((x) => x.includes('.')), autores.join(','));
  });

  await teste('RN-027 · DT-45: número com texto de injeção não vaza na leitura nem grava pela interna', async () => {
    // Leitura: `agenteId` que fecharia o parêntese do filtro vira número (0 = todos os que a pessoa vê).
    const ana = n((await como('ana', () => linha('ccPubNfTotal'))).TOTAL);
    assert.ok(ana < n((await como('gustavo', () => linha('ccPubNfTotal'))).TOTAL));
    assert.equal(n((await como('ana', () => linha('ccPubNfTotal', { agenteId: '0) OR (1=1' }))).TOTAL), ana);
    // Interna: Ana não opera o órgão do Carlos; o OR no `membroId` passaria o ATOR pela própria linha dela.
    await como('ana', () => chamar('ccEscPubNfAcaoInserir', { nfId: nfId(1001), passo: 'L3', prazo: '2099-12-31', protocoloOrgao: '',
      emailEnviadoId: 0, obs: '', membroId: `${M.ana} OR 1=1`, agora: '' }));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_NF_ACAO WHERE NF_ID = ? AND PASSO = 'L3'", nfId(1001)), 0);
  });

  await teste('C-01 (B3) · RN-027: passo gravado direto — hora e "no prazo" pelo relógio da SQL; a rotina acerta o prazo e audita', async () => {
    const direto = (numnota, p, prazo) => como('carlos', () => chamar('ccEscPubNfAcaoInserir', { nfId: nfId(numnota), passo: p, prazo, protocoloOrgao: '',
      emailEnviadoId: 0, obs: '', membroId: M.carlos, agora: '2026-10-01T10:00:00' }));
    await direto(1005, 'G1', '2099-12-31');
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_NF_ACAO WHERE NF_ID = ? AND PASSO = 'G1'", nfId(1005)), 0, 'G1 não se aplica à 1005');
    await direto(1001, 'L3', '2099-12-31');
    const a = um("SELECT * FROM CC_NF_ACAO WHERE NF_ID = ? AND PASSO = 'L3'", nfId(1001));
    assert.ok(a.FEITO_EM.startsWith('2026-12-01'), a.FEITO_EM);
    await leitura();
    const b = um('SELECT * FROM CC_NF_ACAO WHERE ID = ?', a.ID);
    assert.deepEqual([b.PRAZO, n(b.NO_PRAZO)], ['2026-10-30', 0]);
    const au = um("SELECT * FROM CC_AUDITORIA WHERE AREA = 'Notas fiscais' AND CAMPO = 'NF 1001 · passo L3' ORDER BY ID DESC");
    assert.ok(au && au.ANTES.includes('2099-12-31') && au.DEPOIS.includes('fora do prazo'), JSON.stringify(au));
    // devolve o estado: o C-021 marca o L3 pela SF
    db().prepare('DELETE FROM CC_NF_ACAO WHERE ID = ?').run(a.ID);
    await leitura();
  });

  await teste('C-021: passos da 1001 — L3 fora do prazo, M2 no prazo, G4 antes da antecedência; cumprimento e contatos', async () => {
    let r;
    const ex1 = await execucoes(async () => { r = aceito(await registrar('carlos', 1001, 'L3')); });
    assert.equal(r.noPrazo, false);
    assert.equal(nf(1001).PROX_PASSO, r.proximoPasso.passo);
    const ex2 = await execucoes(async () => { r = aceito(await registrar('carlos', 1001, 'M2')); });
    assert.equal(r.noPrazo, true);
    const lista = (await como('carlos', () => linhas('ccPubNfListar', { busca: '1001' })))[0];
    assert.equal(lista.PROXIMO_PASSO, r.proximoPasso.passo);
    recusado(await registrar('carlos', 1001, 'G4'), /antecedência/);
    assert.equal(passo(aceito(await ficha(1001)), 'G4').podeFeito, false);
    const c = (await como('carlos', () => linhas('ccPubReguaCumprimento', { de: '2026-12-01', ate: '2026-12-31' })))[0];
    assert.deepEqual([n(c.FEITOS), n(c.NO_PRAZO), n(c.DEVIDOS)], [2, 1, 7]);
    const contatos = consultar('SELECT * FROM CC_CONTATO_COBRANCA WHERE NF_ID = ? ORDER BY ID', nfId(1001));
    assert.equal(contatos.length, 2);
    assert.ok(contatos.every((x) => x.ORIGEM === 'REGUA_PUB' && !x.RETORNO && !x.EMAIL_ENVIADO_ID));
    assert.ok(contatos[0].FEEDBACK.startsWith('L3 feito') && contatos[1].FEEDBACK.startsWith('M2 feito'));
    assert.deepEqual([ex1, ex2], [10, 10], 'execuções sem e-mail (O-03 da B3)');
  });

  await teste('RN-029: com antecedência de 15 dias úteis o G4 da 1001 pode ser marcado', async () => {
    const salvar = (valor) => como('gustavo', () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'pub.rpFeitoAntecedencia', valor }]) }));
    aceito(await salvar('15'));
    assert.equal(passo(aceito(await ficha(1001)), 'G4').podeFeito, true);
    aceito(await salvar('2'));
    assert.equal(passo(aceito(await ficha(1001)), 'G4').podeFeito, false);
  });

  await teste('RN-033 (envio) · C-024: e-mail de liquidação sai sem validação; ofício só depois de validado', async () => {
    const emails = () => contar('SELECT COUNT(*) AS N FROM SIM_EMAIL');
    const antes = emails();
    aceito(await registrar('carlos', 1003, 'L1', { enviarEmail: 1 }));
    assert.equal(emails(), antes + 1);
    recusado(await registrar('carlos', 1003, 'L3', { enviarEmail: 1 }), /validação/);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_NF_ACAO WHERE NF_ID = ? AND PASSO = 'L3'", nfId(1003)), 0);
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'PUB_OFICIO' })));
    let r;
    const ex = await execucoes(async () => { r = aceito(await registrar('carlos', 1003, 'L3', { enviarEmail: 1 })); });
    const e = um('SELECT * FROM CC_EMAIL_ENVIADO WHERE ID = ?', r.emailEnviadoId);
    assert.deepEqual([e.ORIGEM, e.REFERENCIA], ['005-regua-publica', `nf:${nfId(1003)}:L3`]);
    assert.equal(n(um("SELECT EMAIL_ENVIADO_ID FROM CC_NF_ACAO WHERE NF_ID = ? AND PASSO = 'L3'", nfId(1003)).EMAIL_ENVIADO_ID), r.emailEnviadoId);
    const ct = um("SELECT * FROM CC_CONTATO_COBRANCA WHERE NF_ID = ? ORDER BY ID DESC", nfId(1003));
    assert.deepEqual([ct.ORIGEM, n(ct.EMAIL_ENVIADO_ID)], ['REGUA_PUB', r.emailEnviadoId]);
    assert.equal(ex, 16, 'execuções com e-mail (O-03 da B3)');
  });

  await teste('C-027 · RN-035: validar regra por ente; mudar o prazo volta a confirmar', async () => {
    assert.equal(aceito(await ficha(1005)).regra.SITUACAO, 'A_CONFIRMAR');
    const df = um("SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE NOME = 'Distrito Federal'");
    const to = um("SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE NOME = 'Estado do Tocantins'");
    const salvar = (login, input) => como(login, () => chamar('ccPubRegraEnteSalvar', input));
    recusado(await salvar('silvia', { regraId: df.ID, validar: 1, link: 'https://www.sinj.df.gov.br/norma' }), /Gerente/);
    recusado(await salvar('gustavo', { regraId: df.ID, validar: 1, link: '' }), /link/);
    aceito(await salvar('gustavo', { regraId: df.ID, validar: 1, link: 'https://www.sinj.df.gov.br/norma' }));
    const v = um('SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE ID = ?', df.ID);
    assert.deepEqual([v.SITUACAO, n(v.VALIDADO_POR)], ['VERIFICADO', M.gustavo]);
    assert.ok(v.VALIDADO_EM.startsWith('2026-12-01'));
    const editar = (pagDias) => ({ regraId: to.ID, nome: to.NOME, esfera: to.ESFERA, uf: to.UF, liqDias: to.LIQ_DIAS, pagDias, contagem: to.CONTAGEM,
      baseLegal: to.BASE_LEGAL, link: '', ativo: 1 });
    recusado(await salvar('ana', editar(12)), /Supervisor/);
    aceito(await salvar('gustavo', { regraId: to.ID, validar: 1, link: 'https://www.to.gov.br/norma' }));
    aceito(await salvar('silvia', editar(12)));
    const t = um('SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE ID = ?', to.ID);
    assert.deepEqual([t.SITUACAO, t.VALIDADO_POR, n(t.PAG_DIAS)], ['A_CONFIRMAR', null, 12]);
  });

  await teste('RN-036: certidão renovada vira a vigente', async () => {
    aceito(await como('silvia', () => chamar('ccPubCertidaoSalvar', { tipo: 'CND_FEDERAL', cnpj: '11.222.333/0001-81', abrangencia: '', numero: 'CND-2027',
      emissao: '2026-12-01', validade: '2027-05-30', anexoId: 0 })));
    const l = (await como('carlos', () => linhas('ccPubCertidaoListar'))).find((x) => x.TIPO === 'CND_FEDERAL');
    assert.deepEqual([l.VALIDADE, l.SITUACAO], ['2027-05-30', 'VALIDA']);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_CERTIDAO WHERE TIPO = 'CND_FEDERAL'"), 2);
  });

  await teste('C-023: G5 da 1009 vencido e HU Federal em requerimento; dossiê ao Jurídico', async () => {
    const g5 = passo(aceito(await ficha(1009)), 'G5');
    assert.deepEqual([g5.devido, g5.atrasado], ['2026-10-30', true]);
    assert.equal(casoDe(5003).FASE, 'requerimento');
    if (!existe('ccJurDossieAbrir') || !existe('ccJurDossieEnviar')) pular('depende de 003');
    const r = aceito(await como('carlos', () => chamar('ccJurDossieAbrir', { clienteId: idDe(5003), carteira: 'PUBLICA' })));
    for (const i of consultar("SELECT ID FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ? AND SITUACAO <> 'OK'", r.processoId)) {
      await como('carlos', () => chamar('ccJurDossieItemMarcar', { itemId: i.ID, situacao: 'OK', obs: 'Conferido.' }));
    }
    aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: r.processoId })));
    assert.equal(casoDe(5003).FASE, 'juridico');
    await leitura();
    assert.equal(casoDe(5003).FASE, 'juridico');
  });

  await teste('C-013 (D): NF de duas parcelas só fica paga com as duas pagas', async () => {
    db().prepare(`INSERT INTO PCNFSAID (NUMTRANSVENDA, CODFILIAL, NUMNOTA, SERIE, CODCLI, DTSAIDA, VLTOTAL, DTCANCEL, TIPOVENDA, CODFISCAL, CONDVENDA)
VALUES (500510, '1', 1020, '1', 5005, '2026-11-10', 20000, NULL, 'VV', 5102, 1)`).run();
    const parcela = db().prepare(`INSERT INTO PCPREST (NUMTRANSVENDA, PREST, CODFILIAL, CODCLI, DUPLIC, VALOR, VPAGO, DTVENC, DTPAG, DTEMISSAO, CODCOB, DTCANCEL)
VALUES (500510, ?, '1', 5005, 500510, 10000, ?, ?, ?, '2026-11-10', 'BK', NULL)`);
    parcela.run('1', 10000, '2026-11-25', '2026-11-25');
    parcela.run('2', 0, '2026-12-10', null);
    await leitura();
    assert.deepEqual([n(nf(1020).SALDO_ABERTO), nf(1020).PAGO_EM], [10000, null]);
    db().prepare("UPDATE PCPREST SET VPAGO = 10000, DTPAG = '2026-11-30' WHERE NUMTRANSVENDA = 500510 AND PREST = '2'").run();
    await leitura();
    assert.equal(nf(1020).PAGO_EM, '2026-11-30');
  });

  await teste('C-026: pagamento da 1003 regulariza o FMS Trindade', async () => {
    const antes = await como('gustavo', () => linha('ccPubResumo'));
    db().prepare("UPDATE PCPREST SET VPAGO = VALOR, DTPAG = '2026-12-01' WHERE NUMTRANSVENDA = 500401").run();
    await leitura();
    const l = (await como('carlos', () => linhas('ccPubNfListar', { situacao: 'PAGA', busca: '1003' })))[0];
    assert.deepEqual([l.SITUACAO, n(l.DIAS_ATRASO)], ['PAGA', 14]);
    const c = casoDe(5004);
    assert.deepEqual([c.DESFECHO, c.FASE], ['REGULARIZADO', 'regularizado']);
    const agenda = await como('carlos', () => linhas('ccCobAgendaListar', { carteira: 'PUBLICA', ate: dia(30) }));
    assert.ok(!agenda.some((x) => n(x.CODCLI) === 5004));
    const depois = await como('gustavo', () => linha('ccPubResumo'));
    assert.equal(n(depois.RECEBIDO_MES) - n(antes.RECEBIDO_MES), 30000);
    assert.equal(n(depois.NFS_RECEBIDAS_MES) - n(antes.NFS_RECEBIDAS_MES), 1);
  });

  await teste('RN-032: baixa do caso do FMS Goiânia baixa a NF 1001 e não reabre a cobrança', async () => {
    const c = casoDe(5002);
    const b = aceito(await como('silvia', () => chamar('ccCobBaixaPropor', { cobrancaId: c.ID, valor: 80000, motivo: 'Esgotadas as vias de cobrança' })));
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'De acordo.' })));
    aceito(await como('diana', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })));
    await leitura();
    assert.equal(n(nf(1001).BAIXADA), 1);
    assert.ok(!(await como('gustavo', () => linhas('ccPubNfListar'))).some((x) => n(x.NUMNOTA) === 1001));
    await leitura();
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE CLIENTE_ID = ? AND CARTEIRA = 'PUBLICA' AND ENCERRADO_EM IS NULL", idDe(5002)), 0);
  });

  await teste('C-05 (B3) · 05 §3.7: prazo do card diferente do devido faz a rotina chamar a 002', async () => {
    const c = casoDe(5001);
    const devido = c.CARD_PRAZO;
    assert.ok(devido);
    const passo = () => um("SELECT * FROM CC_ROTINA_PASSO WHERE PASSO = 'PUBLICO' ORDER BY SINCRONIZACAO_ID DESC");
    await leitura();
    const quieta = passo();
    db().prepare('UPDATE KB_CARD SET PRAZO = ? WHERE ID = ?').run('2027-12-31', c.CARD_ID);
    await leitura();
    const r = passo();
    // a 005 pediu a sincronização do órgão (reserva de 13) só pela diferença de prazo
    assert.deepEqual([n(r.PROCESSADOS) - n(quieta.PROCESSADOS), n(r.EXECUCOES) - n(quieta.EXECUCOES)], [1, 13]);
    // a 002 grava o prazo do card mesmo quando só ele muda: o card volta ao devido e a rodada seguinte fica quieta
    assert.equal(um('SELECT PRAZO FROM KB_CARD WHERE ID = ?', c.CARD_ID).PRAZO, devido);
    await leitura();
    const depois = passo();
    assert.equal(n(depois.PROCESSADOS), n(quieta.PROCESSADOS), 'sem novo pedido de sincronização');
  });

  await teste('C-04 (B3) · C-013: órgão que vira público depois e recuo da data de corte trazem as NFs abaixo do cursor', async () => {
    const cursor = n(um('SELECT MAX(NUMTRANSVENDA) AS N FROM CC_NF_PUBLICA').N);
    // 5006 passa a público com uma NF em aberto de transação abaixo do cursor
    assert.ok(400601 < cursor);
    db().prepare(`INSERT INTO PCNFSAID (NUMTRANSVENDA, CODFILIAL, NUMNOTA, SERIE, CODCLI, DTSAIDA, VLTOTAL, DTCANCEL, TIPOVENDA, CODFISCAL, CONDVENDA)
VALUES (400601, '1', 1021, '1', 5006, '2026-11-05', 7000, NULL, 'VV', 5102, 1)`).run();
    db().prepare(`INSERT INTO PCPREST (NUMTRANSVENDA, PREST, CODFILIAL, CODCLI, DUPLIC, VALOR, VPAGO, DTVENC, DTPAG, DTEMISSAO, CODCOB, DTCANCEL)
VALUES (400601, '1', '1', 5006, 400601, 7000, 0, '2026-12-05', NULL, '2026-11-05', 'BK', NULL)`).run();
    db().prepare('UPDATE PCCLIENT SET CODATV1 = 13 WHERE CODCLI = 5006').run();
    db().prepare("UPDATE CC_CLIENTE SET SETOR = 'PUBLICO' WHERE CODCLI = 5006").run();
    const ex = await execucoes(leitura);
    const r = um("SELECT * FROM CC_ROTINA_PASSO WHERE PASSO = 'PUBLICO' ORDER BY SINCRONIZACAO_ID DESC");
    assert.deepEqual([nf(1021)?.CLIENTE_ID, nf(1099)?.CLIENTE_ID].map(n), [idDe(5006), idDe(5006)]);
    assert.equal(casoDe(5006).FASE, 'oficio');
    // O-03 da B3: a rotina informa a reserva (1 + 13 por órgão); o contador da leitura inteira (todos os passos) fica no teto do plan
    assert.deepEqual([n(r.EXECUCOES), ex <= 150], [14, true], `rodada que cria 1 caso; contador da leitura inteira ${ex}`);
    // recuo de pub.nfDataCorte: a 1011 do 5005 (2025-11-10, paga, abaixo do cursor) entra
    assert.equal(nf(1011), undefined);
    const corte = (valor) => como('gustavo', () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'pub.nfDataCorte', valor }]) }));
    aceito(await corte('2025-11-01'));
    await leitura();
    assert.equal(nf(1011)?.PAGO_EM, '2025-12-10');
    aceito(await corte('2026-01-01'));
    await leitura();
    assert.equal(um("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'pub.nfCorteLido'").VALOR, '2026-01-01');
  });

  await teste('RN-039: auditoria das quatro áreas da 005', async () => {
    for (const area of ['Setor público', 'Notas fiscais', 'Regras por ente', 'Certidões']) {
      const a = um('SELECT * FROM CC_AUDITORIA WHERE AREA = ? ORDER BY ID DESC', area);
      assert.ok(a, area);
      assert.ok(n(a.POR) > 0 && a.CAMPO && a.DEPOIS !== undefined, area);
    }
  });
}

/** Valor esperado que depende da contratação aprovada pela 004 (sem ela, o prazo do contrato não vale). */
function comDecisaoOu(v) {
  comDecisao004();
  return v;
}
