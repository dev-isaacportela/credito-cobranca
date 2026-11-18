// Smoke da 006-painel-consolidado (plan, seção Testes). Dois bancos (D-10 do plan): o A é o do arquivo (só o seed da
// 006: todo número é do painel) e cada teste começa de uma cópia dele; o B (seeds de 002 a 005 + 006) é montado uma
// vez, pelo mesmo pipeline, e só lido: o que é de outro módulo é conferido contra a SF do dono ou a conta registro a
// registro (um SELECT cru + laço em JS no próprio teste).

import {
  teste as testeBase, consultar, db, como, chamar, rodarRotinaAte, execucoes, assert, U, M, fixarRelogio, montarBanco,
} from './base.mjs';
import { descartarBanco } from '../seed.mjs';
import { faixaHhi } from '../../lib/painel-consolidado/calculo.mjs';
import { somarDiasUteis } from '../../lib/dias-uteis.mjs';

export const SEEDS = ['006'];
export const RELOGIO = '2026-11-14T10:00:00';
export const BANCO_POR_TESTE = true;
const SEEDS_B = ['002', '003', '004', '005', '006'];

// SO=C-016 node simulator/smoke.mjs 006 → só os testes cujo título contém o texto.
const teste = (titulo, fn) => (!process.env.SO || titulo.includes(process.env.SO) ? testeBase(titulo, fn) : null);

/* ── ajudantes ── */

const PADRAO = { mes: '', ate: '', meses: '12', buId: '-1', carteira: '', agenteId: '0', base: 'VENCIDO', busca: '', limite: '100', offset: '0' };
const sfA = (login, nome, input = {}) => como(login, () => chamar(nome, { ...PADRAO, ...input }));
const linhasA = async (login, nome, input) => (await sfA(login, nome, input)).rows;
const n = (v) => Number(v);
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const pct = (a, b) => r2((a * 100) / b);
const um = (sql, ...p) => consultar(sql, ...p)[0];
const idDe = (codcli) => n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => {
  assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 300)}`);
  if (re) assert.match(r.error, re);
  return r;
};
const posicao = (login, input) => sfA(login, 'ccPainelPosicao', input).then(aceito);
const serie = (login, input) => sfA(login, 'ccPainelSerie', input).then(aceito);
const doMes = (s, mes) => s.linhas.find((l) => l.MES === mes);
const agosto = (login = 'gustavo', extra = {}) => sfA(login, 'ccPainelFechamentoSalvar', { mes: '2026-08', total: 60000, vencido: 22000, vencido90: 4000, pdd: 5000, ...extra });
const fotoDoMes = (mes) => consultar('SELECT F.*, C.CODCLI FROM CC_FOTO_AGING F JOIN CC_CLIENTE C ON C.ID = F.CLIENTE_ID WHERE F.MES = ?', mes);
const soma = (linhas, f) => r2(linhas.reduce((s, l) => s + Number(typeof f === 'function' ? f(l) : l[f]), 0));

// Banco B: montado na primeira vez que um teste pede; lido pela sessão do login.
let B = null;
async function bancoB() {
  B ||= await montarBanco({ seeds: SEEDS_B, relogio: RELOGIO });
  return B;
}
const sfB = async (login, nome, input = {}) => (await bancoB()).runner.executar(nome, { ...PADRAO, ...input }, { userId: login ? U[login] : 0 });
const linhasB = async (login, nome, input) => (await sfB(login, nome, input)).rows;
const consultarB = (sql, ...p) => B.db.prepare(sql).all(...p).map((l) => ({ ...l }));

// As 13 SFs de leitura do painel (C-002: quem não acessa recebe recusa ou nenhuma linha).
const LEITURAS_JS = ['ccPainelPosicao', 'ccPainelSerie', 'ccPainelCredito', 'ccPainelConcentracao', 'ccPainelSaude', 'ccPainelAtencao'];
const LEITURAS_SQL = ['ccPainelRollRate', 'ccPainelSerieCredito', 'ccPainelAgentes', 'ccPainelPlanos', 'ccPainelEquipe', 'ccPainelFechamentoListar'];

export async function suite() {
  /* ── leituras (banco A) ── */

  await teste('C-001, RN-004: visão do gerente no mês corrente', async () => {
    const p = await posicao('gustavo');
    assert.equal(p.origem, 'ATUAL');
    assert.deepEqual([p.total, p.aVencer, p.vencido, p.vencido90, p.pdd, p.clientes, p.clientesAtraso], [94000, 70000, 24000, 12000, 10270, 8, 6]);
    assert.equal(p.inadPct, 25.53);
    assert.equal(p.vencido90Pct, 12.77);
    assert.ok(String(p.sincronizacao.em).startsWith('2026-11-14T10:00'), p.sincronizacao.em);
    assert.equal(p.posicaoEm, p.sincronizacao.em);
    assert.equal(p.sincronizacao.atrasada, false);
    assert.equal(p.fotoPendente, null);
    assert.deepEqual(p.faixas.map((x) => x.saldo), [70000, 4000, 3000, 5000, 8000, 4000]);
    assert.equal(soma(p.faixas, 'pdd'), 10270);
    assert.deepEqual(p.anterior, { mes: '2026-10', vencido: 28000, inadPct: 28.57 });
  });

  await teste('C-002, RN-015: cada cargo vê a sua parte', async () => {
    for (const [login, total, vencido] of [['ana', 45000, 11000], ['sergio', 45000, 11000], ['carlos', 49000, 13000], ['silvia', 49000, 13000],
      ['gustavo', 94000, 24000], ['diana', 94000, 24000], ['nara', 94000, 24000]]) {
      const p = await posicao(login);
      assert.deepEqual([login, p.total, p.vencido], [login, total, vencido]);
    }
    const bruno = await posicao('bruno');
    assert.deepEqual([bruno.clientes, bruno.total, bruno.inadPct, bruno.porBu.length], [0, 0, null, 0]);
    assert.equal((await sfA('bruno', 'ccPainelCredito')).utilizado, 0);
    assert.equal((await sfA('bruno', 'ccPainelConcentracao')).clientes, 0);
    assert.equal((await linhasA('bruno', 'ccPainelAgentes')).length, 0);
    assert.equal((await linhasA('bruno', 'ccPainelRollRate', { mes: '2026-11' })).length, 0);
    // Agente: só a própria linha na comparação entre agentes; supervisor: as da equipe.
    assert.deepEqual((await linhasA('ana', 'ccPainelAgentes')).map((l) => n(l.AGENTE_ID)), [M.ana]);
    assert.deepEqual((await linhasA('sergio', 'ccPainelAgentes')).map((l) => n(l.AGENTE_ID)), [M.ana]);
    // Jurídico, usuário sem vínculo e membro inativo: recusa nas JS, nenhuma linha nas SQL.
    for (const login of ['julia', 'visitante', 'otavio']) {
      for (const nome of LEITURAS_JS) recusado(await sfA(login, nome), /equipe|Jurídico/);
      for (const nome of LEITURAS_SQL) assert.equal((await linhasA(login, nome)).length, 0, `${login} ${nome}`);
      assert.equal(n((await linhasA(login, 'ccPainelFechamentoTotal'))[0].TOTAL), 0);
    }
  });

  await teste('C-003, RN-017: filtros de carteira e BU', async () => {
    const est = await posicao('gustavo', { carteira: 'ESTETICA' });
    assert.deepEqual([est.total, est.vencido, est.clientes, est.inadPct], [4000, 4000, 1, 100]);
    const pub = await posicao('gustavo', { carteira: 'PUBLICA' });
    assert.deepEqual([pub.total, pub.vencido, pub.clientes], [38000, 8000, 1]);
    const pri = await posicao('gustavo', { carteira: 'PRIVADA' });
    assert.deepEqual([pri.total, pri.vencido], [52000, 12000]);
    const todas = await posicao('gustavo');
    assert.equal(todas.clientes, 8, '6004 conta uma vez no total');
    assert.equal(soma(todas.porCarteira, 'total'), 94000);
    assert.deepEqual(todas.porCarteira.map((c) => [c.chave, c.total, c.vencido]), [['PRIVADA', 52000, 12000], ['ESTETICA', 4000, 4000], ['PUBLICA', 38000, 8000]]);
    const enf = await posicao('gustavo', { buId: '2' });
    assert.deepEqual([enf.total, enf.vencido], [10000, 10000]);
    const nada = await posicao('gustavo', { buId: '2', carteira: 'ESTETICA' });
    assert.deepEqual([nada.ok, nada.origem, nada.clientes, nada.total, nada.inadPct], [true, 'ATUAL', 0, 0, null]);
  });

  await teste('C-004: mês passado vem da foto do fechamento', async () => {
    const p = await posicao('gustavo', { mes: '2026-10' });
    assert.deepEqual([p.origem, p.total, p.vencido, p.pdd, p.posicaoEm], ['FOTO', 98000, 28000, 5720, '2026-11-01T00:15:00']);
    assert.equal(soma(p.faixas, 'pdd'), 5720);
    const set = await posicao('gustavo', { mes: '2026-09' });
    assert.deepEqual([set.origem, set.total, set.vencido, set.pdd], ['FOTO', 54000, 25000, 4955]);
  });

  await teste('C-012, RN-010: roll rate de outubro para novembro', async () => {
    const m = await linhasA('gustavo', 'ccPainelRollRate', { mes: '2026-11' });
    const celula = Object.fromEntries(m.map((l) => [`${l.FAIXA_DE}>${l.FAIXA_PARA}`, n(l.VALOR)]));
    assert.deepEqual(celula, { '0>0': 24000, '0>1': 15000, '1>-1': 3000, '1>2': 4000, '1>6': 2000, '2>1': 3000, '2>3': 5000, '3>4': 38000, '4>5': 4000 });
    assert.ok(m.every((l) => l.BASE_EM === '2026-11-01T00:15:00'));
    // Taxas da spec (a tela traduz a matriz: piorou = faixa maior ou baixado).
    const piorou = (de) => soma(m.filter((l) => n(l.FAIXA_DE) === de && (n(l.FAIXA_PARA) > de)), 'VALOR');
    const base = (de) => soma(m.filter((l) => n(l.FAIXA_DE) === de), 'VALOR');
    assert.deepEqual([pct(piorou(0), base(0)), pct(piorou(1), base(1)), pct(piorou(2), base(2))], [38.46, 66.67, 62.5]);
    // Sem mês = maior mês com foto (outubro, sobre setembro).
    assert.ok((await linhasA('gustavo', 'ccPainelRollRate')).length > 0);
  });

  await teste('C-015, RN-020: indicadores executivos da massa de referência', async () => {
    const p = await posicao('gustavo');
    assert.deepEqual([p.inadPct, p.vencido90Pct, pct(p.pdd, p.total), p.atrasoMedioDias], [25.53, 12.77, 10.93, 86.79]);
    const nov = doMes(await serie('gustavo', { ate: '2026-11', meses: 1 }), '2026-11');
    assert.equal(pct(nov.RECUPERADO, nov.GERADA), 166.67);
    assert.equal(pct(nov.RECUPERADO, nov.VENCIDO_INICIAL + nov.GERADA), 16.13);
    const c = aceito(await sfA('gustavo', 'ccPainelCredito'));
    assert.deepEqual([c.utilizado, c.limite, c.usoPct], [94000, 176300, 53.32]);
    for (const chave of ['meta.inadPct', 'meta.vencido90Pct', 'meta.pddPct', 'meta.recuperacaoPct', 'meta.conversaoPct', 'meta.slaPct']) {
      assert.ok(p.metas[chave] !== undefined, chave);
    }
  });

  await teste('C-018, RN-018: concentração da inadimplência', async () => {
    const c = aceito(await sfA('gustavo', 'ccPainelConcentracao', { base: 'VENCIDO' }));
    assert.deepEqual([c.total, c.clientes], [24000, 6]);
    assert.deepEqual([c.top10[0].chave, c.top10[0].valor, c.top10[0].pct], ['6006', 8000, 33.33]);
    assert.equal(c.top10.length, 6);
    assert.equal(c.top10[5].pctAcum, 100);
    assert.equal(c.porGrupo.linhas.find((l) => l.rotulo === 'Grupo Alfa').valor, 7000);
    assert.equal(c.porGrupo.linhas.find((l) => l.rotulo === 'Grupo Alfa').pct, 29.17);
    assert.deepEqual(c.porRegiao.linhas.map((l) => [l.chave, l.valor]), [['Sudeste', 12000], ['Centro-Oeste', 8000], ['Sul', 4000]]);
    assert.equal(c.porRegiao.linhas[0].pct, 50);
    assert.deepEqual(c.porBu.linhas.map((l) => [l.rotulo, l.valor]).sort(), [['Enfermagem', 10000], ['Estética', 4000], ['Nutrição', 10000]].sort());
    assert.deepEqual([c.porCliente.hhi, c.porCliente.hhiFaixa], [2187.5, 'moderada']);
    assert.deepEqual([c.porRegiao.hhi, c.porRegiao.hhiFaixa], [3888.9, 'alta']);
    assert.deepEqual(c.acimaDoMaximo, []);
  });

  await teste('C-019: crédito por carteira e por BU (banco A)', async () => {
    const c = aceito(await sfA('gustavo', 'ccPainelCredito'));
    assert.deepEqual(c.porCarteira.map((x) => [x.carteira, x.utilizado, x.vencido]), [['PRIVADA', 52000, 12000], ['ESTETICA', 4000, 4000], ['PUBLICA', 38000, 8000]]);
    assert.deepEqual(c.porBu.map((x) => [x.nome, x.utilizado, x.vencido, x.clientes]), [['Nutrição', 80000, 10000, 5], ['Enfermagem', 10000, 10000, 3], ['Estética', 4000, 4000, 1]]);
  });

  await teste('C-020: exposição por faixa de risco (banco A)', async () => {
    const c = aceito(await sfA('gustavo', 'ccPainelCredito'));
    assert.equal(soma(c.porRating, 'saldo'), 94000);
    const pub = aceito(await sfA('gustavo', 'ccPainelCredito', { carteira: 'PUBLICA' }));
    assert.ok(pub.porRating.every((x) => x.grupo !== 'PRIVADO'), '6006 nunca nas faixas AA a E');
    assert.equal(soma(pub.porRating, 'saldo'), 38000);
    // Pedido da tela: "Sem rating" é uma linha só (pública e privada juntas).
    assert.ok(c.porRating.filter((x) => x.grupo === 'SEM').length <= 1, JSON.stringify(c.porRating));
  });

  await teste('C-014: texto dos pontos de atenção em pt-BR (vírgula decimal)', async () => {
    db().prepare("UPDATE CC_PARAMETRO SET VALOR = '2.5' WHERE CHAVE = 'meta.inadIndiceAlerta' AND CARTEIRA = ''").run();
    const itens = await sfA('gustavo', 'ccPainelAtencao');
    const inad = itens.find((x) => x.tipo === 'INAD_ACIMA_ALERTA');
    assert.ok(inad, JSON.stringify(itens));
    assert.match(inad.texto, /^Inadimplência de \d+(,\d+)?% acima do alerta de 2,5%$/);
    assert.ok(itens.every((x) => !/\d\.\d/.test(x.texto.replace(/R\$ [\d.,]+/g, ''))), JSON.stringify(itens.map((x) => x.texto)));
  });

  await teste('C-021: inadimplência por agente e por BU', async () => {
    const ag = await linhasA('gustavo', 'ccPainelAgentes');
    assert.equal(n(ag[0].AGENTE_ID), M.carlos, 'ordenados por vencido');
    const de = (id) => ag.find((l) => n(l.AGENTE_ID) === id);
    const cols = (l) => [n(l.TOTAL), n(l.VENCIDO), n(l.VENCIDO_90), n(l.CLIENTES_ATRASO)];
    assert.deepEqual(cols(de(M.carlos)), [49000, 13000, 12000, 3]);
    assert.deepEqual(cols(de(M.ana)), [45000, 11000, 0, 3]);
    assert.equal(pct(n(de(M.carlos).VENCIDO), 24000), 54.17);
    const p = await posicao('gustavo');
    const bu = (id) => p.porBu.find((x) => x.chave === id);
    assert.deepEqual([bu(1).total, bu(1).vencido, bu(1).clientesAtraso, bu(1).vencido90], [80000, 10000, 2, 8000]);
    assert.deepEqual([bu(2).total, bu(2).vencido, bu(2).clientesAtraso], [10000, 10000, 3]);
    assert.equal(pct(bu(1).vencido, 24000), 41.67);
  });

  await teste('C-022: planos de pagamento', async () => {
    const plano = (await linhasA('gustavo', 'ccPainelPlanos')).find((l) => l.PLANO_COD === '30');
    assert.deepEqual([n(plano.CLIENTES), n(plano.CLIENTES_ATRASO), n(plano.TOTAL), n(plano.VENCIDO), n(plano.A_VENCER), n(plano.PRAZO_MEDIO)],
      [4, 2, 43000, 7000, 36000, 30]);
    assert.deepEqual([5, 4, 3, 2, 1, 0].map((i) => n(plano[`FAT_M${i}`])), [20000, 20000, 25000, 20000, 35000, 28000]);
    const fat6 = [0, 1, 2, 3, 4, 5].reduce((s, i) => s + n(plano[`FAT_M${i}`]), 0);
    assert.deepEqual([fat6, r2(fat6 / 6), pct(n(plano.VENCIDO), n(plano.TOTAL)), pct(n(plano.VENCIDO), n(plano.FAT_M0))], [148000, 24666.67, 16.28, 25]);
  });

  await teste('C-024, RN-019: indicadores por nível da equipe (banco A)', async () => {
    const linha = (rows, id) => rows.find((l) => n(l.MEMBRO_ID) === id);
    const cols = (l) => [n(l.CLIENTES_ATRASO), n(l.VENCIDO), n(l.RECUPERADO)];
    const sergio = await linhasA('sergio', 'ccPainelEquipe');
    assert.deepEqual(sergio.map((l) => n(l.MEMBRO_ID)).sort(), [M.sergio, M.ana, M.bruno, M.rita].sort());
    assert.deepEqual(cols(linha(sergio, M.sergio)), [3, 11000, 0]);
    const silvia = await linhasA('silvia', 'ccPainelEquipe');
    assert.equal(silvia.length, 2);
    assert.deepEqual(cols(linha(silvia, M.silvia)), [3, 13000, 5000]);
    const gustavo = await linhasA('gustavo', 'ccPainelEquipe');
    assert.equal(gustavo.length, 9);
    assert.deepEqual(cols(linha(gustavo, M.gustavo)), [6, 24000, 5000]);
    assert.deepEqual(cols(linha(gustavo, M.diana)), [6, 24000, 5000]);
    assert.equal((await linhasA('nara', 'ccPainelEquipe')).length, 9, 'a marca ADMIN atende o N2 (D-06)');
    assert.equal((await linhasA('ana', 'ccPainelEquipe')).length, 0);
  });

  await teste('C-025, RN-022: concentração da carteira de limites', async () => {
    const c = aceito(await sfA('gustavo', 'ccPainelConcentracao', { base: 'LIMITE' }));
    assert.equal(c.total, 186300);
    assert.deepEqual([c.top10[0].chave, c.top10[0].valor, c.top10[0].pct], ['6006', 80000, 42.94]);
    const alfa = c.porGrupo.linhas.find((l) => l.rotulo === 'Grupo Alfa');
    assert.deepEqual([alfa.valor, alfa.pct], [30000, 16.1]);
    assert.deepEqual([c.porCliente.hhi, c.porCliente.hhiFaixa], [2518.1, 'alta']);
    assert.deepEqual(c.acimaDoMaximo.map((x) => `${x.tipo}:${x.rotulo === 'Grupo Alfa' ? 'Alfa' : x.chave}`), ['CLIENTE:6006', 'CLIENTE:6003', 'CLIENTE:6001', 'GRUPO:Alfa']);
  });

  await teste('C-026, RN-023: prazo médio de recebimento', async () => {
    const c = aceito(await sfA('gustavo', 'ccPainelCredito'));
    const pcs = consultar('SELECT PRAZO_MEDIO_DIAS, UTILIZADO FROM CC_POSICAO_CLIENTE WHERE UTILIZADO > 0');
    assert.equal(pcs.length, 8);
    assert.equal(c.pmrDias, r2(soma(pcs, (x) => x.PRAZO_MEDIO_DIAS * x.UTILIZADO) / soma(pcs, 'UTILIZADO')));
    assert.equal(c.prazoMedioDias, r2(soma(pcs, 'PRAZO_MEDIO_DIAS') / pcs.length));
  });

  await teste('RN-001: faixa da linha é a do título mais antigo', async () => {
    const l = um(`SELECT P.* FROM CC_POSICAO_CLIENTE_BU P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE C.CODCLI = 6004 AND P.BU_ID = 4`);
    assert.deepEqual([n(l.V_1_30), n(l.V_31_60), n(l.DIAS_ATRASO)], [1000, 3000, 40]);
    const p = await posicao('gustavo');
    assert.equal(p.faixas[1].saldo, 4000);
    // A linha 6004/Estética vai para a faixa 2 (31–60) no roll rate: (1 → 2) 4000.
    const m = await linhasA('gustavo', 'ccPainelRollRate', { mes: '2026-11' });
    assert.equal(n(m.find((x) => n(x.FAIXA_DE) === 1 && n(x.FAIXA_PARA) === 2).VALOR), 4000);
  });

  await teste('RN-002: índice de inadimplência e recorte sem carteira', async () => {
    assert.equal((await posicao('gustavo')).inadPct, 25.53);
    const vazio = await posicao('bruno');
    assert.deepEqual([vazio.total, vazio.inadPct, vazio.vencido90Pct, vazio.atrasoMedioDias], [0, null, null, null]);
  });

  await teste('RN-014: faixa do índice de concentração', async () => {
    assert.equal(faixaHhi(2187.5, 1500, 2500), 'moderada');
    assert.equal(faixaHhi(1499, 1500, 2500), 'pulverizada');
    assert.equal(faixaHhi(2500, 1500, 2500), 'alta');
  });

  await teste('RNF-001: orçamento por bloco', async () => {
    const bloco = (login, chamadas) => execucoes(async () => { for (const [nome, input] of chamadas) await sfA(login, nome, input); });
    const ate7 = somarDiasUteis('2026-11-14', 7, consultar("SELECT DATA FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL'").map((l) => l.DATA));
    const visao = await bloco('gustavo', [['ccPainelPosicao'], ['ccPainelSaude'], ['ccPainelAtencao'], ['ccCobAgendaResumo', { ate: ate7 }], ['ccJurResumo'], ['ccPubResumo']]);
    assert.equal(visao, 6);
    assert.ok(await bloco('gustavo', [['ccPainelPosicao'], ['ccPainelSerie'], ['ccPainelSerieCredito'], ['ccPainelCredito']]) <= 6);
    assert.ok(await bloco('gustavo', [['ccPainelAgentes'], ['ccPainelPosicao'], ['ccPainelSerie', { meses: 6 }], ['ccCobAgendaResumo', { ate: ate7 }]]) <= 6);
    assert.ok(await bloco('gustavo', [['ccPainelCredito'], ['ccPainelSerieCredito'], ['ccPainelConcentracao', { base: 'LIMITE' }]]) <= 6);
    assert.equal(await bloco('gustavo', [['ccPainelAtencao']]), 1);
    assert.equal(await bloco('gustavo', [['ccPainelRollRate', { mes: '2026-11' }]]), 1);
    const id = n(um("SELECT MAX(ID) AS ID FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK'").ID);
    assert.ok(await execucoes(() => como(null, () => chamar('ccPainelRotina', { sincronizacaoId: id }))) <= 2);
  });

  /* ── escritas e relógio (banco A; cada teste numa cópia) ── */

  await teste('C-017, RN-011: conversão da cobrança por agente', async () => {
    const agentes = async () => Object.fromEntries((await linhasA('gustavo', 'ccPainelAgentes')).map((l) => [n(l.AGENTE_ID), l]));
    const antes = await agentes();
    const cols = (l) => [n(l.COBRADO), n(l.RECUPERADO), n(l.CLIENTES_COBRADOS)];
    assert.deepEqual(cols(antes[M.carlos]), [18000, 5000, 4]);
    assert.deepEqual(cols(antes[M.ana]), [13000, 0, 4]);
    assert.deepEqual([soma(Object.values(antes), 'COBRADO'), soma(Object.values(antes), 'RECUPERADO')], [31000, 5000]);
    const contato = (login, codcli, extra) => sfA(login, 'ccCobContatoRegistrar', { clienteId: idDe(codcli), carteira: 'PRIVADA', canal: 'Telefone',
      retorno: 'Sem retorno / não atendeu', feedback: 'Contato do teste C-017.', ...extra }).then(aceito);
    await contato('ana', 6001, { retorno: 'Promessa de pagamento', previsao: '2026-11-18', valor: 2000 });
    await contato('ana', 6002);
    await contato('carlos', 6007);
    const depois = await agentes();
    const delta = (id, col) => n(depois[id][col]) - n(antes[id][col]);
    assert.deepEqual([delta(M.ana, 'CONTATOS'), delta(M.carlos, 'CONTATOS'), delta(M.ana, 'PROMESSAS'), delta(M.carlos, 'PROMESSAS')], [2, 1, 1, 0]);
  });

  await teste('C-008: fechamento manual de mês sem foto', async () => {
    const auditoria = () => consultar("SELECT * FROM CC_AUDITORIA WHERE AREA = 'Fechamento' ORDER BY ID");
    const gasto = await execucoes(async () => aceito(await agosto()));
    assert.ok(gasto <= 12, `${gasto} execuções`);
    assert.equal(n((await linhasA('gustavo', 'ccPainelFechamentoTotal'))[0].TOTAL), 1);
    const l = (await linhasA('gustavo', 'ccPainelFechamentoListar'))[0];
    assert.deepEqual([l.MES, n(l.TOTAL), n(l.VENCIDO), n(l.VENCIDO_90), n(l.PDD), n(l.TEM_FOTO)], ['2026-08', 60000, 22000, 4000, 5000, 0]);
    assert.equal(auditoria().length, 1);
    assert.equal(auditoria()[0].CAMPO, '(criação)');
    const ago = doMes(await serie('gustavo', { ate: '2026-08', meses: 1 }), '2026-08');
    assert.deepEqual([ago.ORIGEM, ago.TOTAL, ago.VENCIDO], ['MANUAL', 60000, 22000]);
    assert.equal(pct(ago.VENCIDO, ago.TOTAL), 36.67);
    aceito(await agosto('gustavo', { pdd: 5500 }));
    assert.equal(n((await linhasA('gustavo', 'ccPainelFechamentoTotal'))[0].TOTAL), 1);
    const ult = auditoria().pop();
    assert.deepEqual([ult.CAMPO, ult.ANTES, ult.DEPOIS, ult.CLIENTE_ID], ['PDD', '5000.00', '5500.00', null]);
    assert.equal(auditoria().length, 2);
  });

  await teste('C-009, RN-016: fechamento manual recusado', async () => {
    aceito(await agosto('gustavo', { pdd: 5500 }));
    recusado(await agosto('gustavo', { vencido: 70000 }), /carteira/);
    recusado(await agosto('gustavo', { vencido90: 25000 }), /90/);
    recusado(await agosto('gustavo', { mes: '2026-09' }), /foto/);
    recusado(await agosto('gustavo', { mes: '2026-11' }), /mês/);
    recusado(await agosto('sergio', { mes: '2026-07' }), /permiss/);
    // Chamada direta às internas pelo supervisor (como ele mesmo e fingindo ser o gerente): a guarda não grava.
    for (const membroId of [M.sergio, M.gustavo]) {
      await sfA('sergio', 'ccEscPainelFechamentoInserir', { mes: '2026-07', total: 1000, vencido: 0, vencido90: 0, pdd: 0, membroId, agora: '2026-11-14T10:00:00' });
      await sfA('sergio', 'ccEscPainelFechamentoAtualizar', { mes: '2026-08', total: 60000, vencido: 22000, vencido90: 4000, pdd: 1, membroId, agora: '2026-11-14T10:00:00' });
    }
    // Nem o gerente grava pela interna o que a regra recusa.
    await sfA('gustavo', 'ccEscPainelFechamentoInserir', { mes: '2026-07', total: 100, vencido: 200, vencido90: 0, pdd: 0, membroId: M.gustavo, agora: '2026-11-14T10:00:00' });
    await sfA('gustavo', 'ccEscPainelFechamentoInserir', { mes: '2026-11', total: 100, vencido: 0, vencido90: 0, pdd: 0, membroId: M.gustavo, agora: '2026-11-14T10:00:00' });
    assert.deepEqual(consultar('SELECT MES, PDD FROM CC_FECHAMENTO').map((l) => [l.MES, n(l.PDD)]), [['2026-08', 5500]]);
    for (const login of ['sergio', 'ana']) {
      assert.equal((await linhasA(login, 'ccPainelFechamentoListar')).length, 0);
      assert.equal(n((await linhasA(login, 'ccPainelFechamentoTotal'))[0].TOTAL), 0);
    }
    assert.equal(n((await linhasA('gustavo', 'ccPainelFechamentoTotal'))[0].TOTAL), 1);
    // Administrador (agente com a marca ADMIN) corrige (PA-12 b, D-06) e volta.
    aceito(await agosto('nara', { pdd: 5400 }));
    assert.equal(n(um("SELECT PDD FROM CC_FECHAMENTO WHERE MES = '2026-08'").PDD), 5400);
    aceito(await agosto('nara', { pdd: 5500 }));
    assert.equal(n(um("SELECT MES_SEGUINTE FROM CC_FECHAMENTO WHERE MES = '2026-08'").MES_SEGUINTE === '2026-09' ? 1 : 0), 1);
  });

  await teste('C-009, RN-016: interna do fechamento recusa mês inválido e grava a data do servidor', async () => {
    const direto = (nome, mes, extra = {}) => sfA('gustavo', nome, { mes, total: 1000, vencido: 0, vencido90: 0, pdd: 0, membroId: M.gustavo, agora: '2001-01-01T00:00:00', ...extra });
    await direto('ccEscPainelFechamentoInserir', '2025-13');
    await direto('ccEscPainelFechamentoInserir', '2025-00');
    assert.equal(consultar('SELECT COUNT(*) AS N FROM CC_FECHAMENTO')[0].N, 0);
    await direto('ccEscPainelFechamentoInserir', '2026-07');
    await direto('ccEscPainelFechamentoAtualizar', '2026-07', { pdd: 10 });
    const l = um("SELECT * FROM CC_FECHAMENTO WHERE MES = '2026-07'");
    assert.deepEqual([l.LANCADO_EM.slice(0, 10), l.ATUALIZADO_EM.slice(0, 10), n(l.PDD)], ['2026-11-14', '2026-11-14', 10]);
  });

  await teste('C-002, RN-015: agentes contam contato, promessa e ação só de cliente visível (Rita)', async () => {
    db().prepare('UPDATE CC_CLIENTE SET ANALISTA_ID = ? WHERE CODCLI = 6006').run(M.rita);
    const contatos = async (login) => n((await linhasA(login, 'ccPainelAgentes')).find((l) => n(l.AGENTE_ID) === M.carlos)?.CONTATOS ?? -1);
    const [rita0, gus0] = [await contatos('rita'), await contatos('gustavo')];
    aceito(await sfA('carlos', 'ccCobContatoRegistrar', { clienteId: idDe(6007), carteira: 'PRIVADA', canal: 'Telefone',
      retorno: 'Promessa de pagamento', previsao: '2026-11-18', valor: 500, feedback: 'Contato do teste C-002 (Rita).' }));
    assert.equal(await contatos('gustavo'), gus0 + 1, 'o gerente vê o contato no 6007');
    assert.equal(await contatos('rita'), rita0, 'Rita (analista do 6006) não conta o contato no 6007');
    const ritaCarlos = (await linhasA('rita', 'ccPainelAgentes')).find((l) => n(l.AGENTE_ID) === M.carlos);
    assert.equal(n(ritaCarlos.PROMESSAS), 0);
  });

  await teste('C-002, C-009 · DT-45: número com texto de injeção não vaza na leitura nem grava pela interna', async () => {
    // Leitura: `buId` que fecharia o parêntese do filtro e abriria um OR vira número (-1 = todas as BUs).
    assert.deepEqual((await linhasA('ana', 'ccPainelAgentes', { buId: '-1) OR (1=1' })).map((l) => n(l.AGENTE_ID)), [M.ana]);
    // Interna: `membroId` com OR satisfaria o ATOR pelo próprio supervisor; agora é só o id dele, que não administra.
    aceito(await agosto());
    await sfA('sergio', 'ccEscPainelFechamentoAtualizar', { mes: '2026-08', total: 60000, vencido: 22000, vencido90: 4000, pdd: 1, membroId: `${M.sergio} OR 1=1`, agora: '' });
    await sfA('sergio', 'ccEscPainelFechamentoInserir', { mes: '2026-07', total: 1, vencido: 0, vencido90: 0, pdd: 0, membroId: `${M.sergio} OR 1=1`, agora: '' });
    assert.deepEqual(consultar('SELECT MES, PDD FROM CC_FECHAMENTO').map((l) => [l.MES, n(l.PDD)]), [['2026-08', 5000]]);
  });

  await teste('C-010: fechamento manual não vale para recorte', async () => {
    aceito(await agosto());
    const ago = (s) => doMes(s, '2026-08');
    assert.equal(ago(await serie('gustavo', { ate: '2026-08', meses: 1, buId: '1' })), undefined);
    assert.equal(ago(await serie('ana', { ate: '2026-08', meses: 1 })), undefined);
    assert.equal(ago(await serie('gustavo', { ate: '2026-08', meses: 1 })).ORIGEM, 'MANUAL');
    assert.equal((await posicao('gustavo', { mes: '2026-08' })).origem, 'MANUAL');
    assert.equal((await posicao('gustavo', { mes: '2026-08', buId: '1' })).origem, 'SEM');
    assert.equal((await posicao('ana', { mes: '2026-08' })).origem, 'SEM');
  });

  await teste('C-011, RN-007, RN-008, RN-009: movimento da inadimplência', async () => {
    const s = await serie('gustavo', { ate: '2026-11', meses: 3 });
    const nov = doMes(s, '2026-11');
    assert.deepEqual([nov.ORIGEM, nov.VENCIDO_INICIAL, nov.GERADA, nov.RECUPERADO, nov.BAIXADO, nov.VENCIDO, nov.ENTRARAM, nov.REGULARIZADOS, nov.BAIXADOS],
      ['ATUAL', 28000, 3000, 5000, 2000, 24000, 1, 1, 1]);
    assert.equal(nov.VENCIDO_INICIAL + nov.GERADA - nov.RECUPERADO - nov.VENCIDO, 2000, 'baixas e outros ajustes');
    assert.equal(nov.VENCIDO - nov.VENCIDO_INICIAL, -4000);
    // Fora do recuperado: os 5.000 pagos em dia por 6001 e os 5.000 estornados de 6002.
    const rec = consultar(`SELECT C.CODCLI, R.VALOR_PAGO, R.DIAS_ATRASO_PAGAMENTO, R.ESTORNADO FROM CC_RECEBIMENTO R JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID
WHERE R.DATA_PAGAMENTO >= '2026-11-01' AND C.CODCLI IN (6001, 6002)`);
    assert.ok(rec.some((r) => r.CODCLI === 6001 && n(r.DIAS_ATRASO_PAGAMENTO) === 0));
    assert.ok(rec.some((r) => r.CODCLI === 6002 && n(r.ESTORNADO) === 1));
    const out = doMes(s, '2026-10');
    assert.deepEqual([out.ORIGEM, out.VENCIDO_INICIAL, out.GERADA, out.RECUPERADO, out.VENCIDO, out.ENTRARAM], ['FOTO', 25000, 9000, 6000, 28000, 3]);
    assert.equal(doMes(s, '2026-09').GERADA, null, 'setembro sem fechamento anterior');
    // Com o fechamento manual de agosto, a gerada de setembro é estimada, só na visão consolidada.
    aceito(await agosto());
    const set = doMes(await serie('gustavo', { ate: '2026-09', meses: 1 }), '2026-09');
    assert.deepEqual([set.GERADA, set.ESTIMADO], [3000, 1]);
    assert.equal(doMes(await serie('gustavo', { ate: '2026-09', meses: 1, buId: '1' }), '2026-09').GERADA, null);
  });

  await teste('C-016: evolução no ano', async () => {
    aceito(await agosto());
    const s = await serie('gustavo', { ate: '2026-12', meses: 12 });
    assert.deepEqual(s.linhas.map((l) => [l.MES, l.ORIGEM]), [['2026-08', 'MANUAL'], ['2026-09', 'FOTO'], ['2026-10', 'FOTO'], ['2026-11', 'ATUAL']]);
    const indices = s.linhas.map((l) => pct(l.VENCIDO, l.TOTAL));
    assert.deepEqual(indices, [36.67, 46.3, 28.57, 25.53]);
    assert.equal(r2(indices.reduce((a, b) => a + b, 0) / 4), 34.27);
  });

  await teste('C-007, RN-006: redistribuir cliente não reescreve o passado', async () => {
    aceito(await sfA('gustavo', 'ccBaseClienteAtribuir', { clienteIds: String(idDe(6002)), agenteId: M.carlos }));
    assert.equal((await posicao('ana')).total, 40000);
    assert.equal((await posicao('carlos')).total, 54000);
    const anaOut = await posicao('ana', { mes: '2026-10' });
    assert.deepEqual([anaOut.total, anaOut.vencido], [50000, 10000]);
    const carlosOut = await posicao('carlos', { mes: '2026-10' });
    assert.deepEqual([carlosOut.total, carlosOut.vencido], [48000, 18000]);
  });

  await teste('RN-003: PDD por carteira com vigência', async () => {
    aceito(await sfA('gustavo', 'ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'pdd.f2', carteira: 'ESTETICA', valor: '20' }]) }));
    assert.equal((await posicao('gustavo', { carteira: 'ESTETICA' })).pdd, 630);
    assert.equal((await posicao('gustavo')).pdd, 10570);
    assert.equal((await posicao('gustavo', { mes: '2026-10' })).pdd, 5720, 'mês fechado não muda');
  });

  await teste('RNF-004: metas e tolerância vêm dos parâmetros', async () => {
    aceito(await sfA('gustavo', 'ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'meta.inadPct', valor: '30' }]) }));
    const p = await posicao('gustavo');
    assert.equal(p.metas['meta.inadPct'], 30);
    assert.ok(p.inadPct <= p.metas['meta.inadPct'], 'C-015 passa a "na meta"');
    recusado(await sfA('gustavo', 'ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'painel.hhiModerado', valor: '3000' }]) }), /moderado/);
  });

  await teste('RN-021: leitura do Winthor atrasada', async () => {
    fixarRelogio('2026-11-14T10:25:00');
    assert.equal((await posicao('gustavo')).sincronizacao.atrasada, false);
    assert.ok(!(await sfA('gustavo', 'ccPainelAtencao')).some((x) => x.tipo === 'LEITURA_ATRASADA'));
    fixarRelogio('2026-11-14T10:35:00');
    assert.equal((await posicao('gustavo')).sincronizacao.atrasada, true);
    const item = (await sfA('gustavo', 'ccPainelAtencao')).find((x) => x.tipo === 'LEITURA_ATRASADA');
    assert.match(item.texto, /desde 10:00/);
  });

  await teste('C-006: foto não é tirada sem base (virada antes da leitura)', async () => {
    fixarRelogio('2026-12-01T00:02:00');
    assert.equal(fotoDoMes('2026-11').length, 0);
    assert.equal((await posicao('gustavo')).fotoPendente, '2026-11');
    const item = (await sfA('gustavo', 'ccPainelAtencao')).find((x) => x.tipo === 'FOTO_PENDENTE');
    assert.equal(item.texto, 'Foto de 11/2026 pendente');
    const r = await como(null, () => chamar('ccPainelRotina', { sincronizacaoId: 0 }));
    assert.deepEqual([r.ok, r.pendentes], [true, 0]);
    assert.equal(fotoDoMes('2026-11').length, 0);
    await assert.rejects(sfA('gustavo', 'ccPainelRotina', { sincronizacaoId: 0 }), /fora do perfil/);
  });

  await teste('C-005, RN-005: foto tirada sozinha na virada do mês', async () => {
    fixarRelogio('2026-12-01T00:10:00');
    await rodarRotinaAte();
    const foto = fotoDoMes('2026-11');
    assert.equal(foto.length, 11);
    assert.deepEqual([soma(foto, 'VENCIDO'), soma(foto, 'PDD'), soma(foto, 'BAIXADO')], [24000, 10340, 2000]);
    const zeradas = foto.filter((l) => n(l.A_VENCER) + n(l.VENCIDO) === 0).map((l) => `${l.CODCLI}/${l.BU_ID}`).sort();
    assert.deepEqual(zeradas, ['6005/1', '6009/1']);
    assert.ok(foto.every((l) => l.SINCRONIZACAO_EM.startsWith('2026-12-01') && l.MES_SEGUINTE === '2026-12' && n(l.SINCRONIZACAO_ID) > 0));
    assert.equal(soma(foto, 'VENCIDO_INICIAL'), 28000);
    assert.equal(soma(foto, 'RECUPERADO'), 5000);
    assert.ok(!(await sfA('gustavo', 'ccPainelAtencao')).some((x) => x.tipo === 'FOTO_PENDENTE'));
    // Nova leitura e nova rodada: a foto de um mês nunca é regravada.
    fixarRelogio('2026-12-01T00:30:00');
    await rodarRotinaAte();
    assert.equal(fotoDoMes('2026-11').length, 11);
    assert.equal(soma(fotoDoMes('2026-11'), 'PDD'), 10340);
    const p = await posicao('gustavo', { mes: '2026-11' });
    assert.deepEqual([p.origem, p.total, p.vencido, p.pdd], ['FOTO', 94000, 24000, 10340]);
  });

  await teste('C-006: mês sem leitura no mês seguinte fica sem foto', async () => {
    fixarRelogio('2027-02-01T00:10:00');
    await rodarRotinaAte();
    assert.ok(fotoDoMes('2027-01').length > 0, 'janeiro com a posição da primeira leitura de fevereiro');
    assert.equal(fotoDoMes('2026-12').length, 0);
  });

  /* ── banco B (seeds de 002 a 005 + 006): conferência com o dono, registro a registro ── */

  await teste('C-002, RN-015 (banco B): a analista vê só os clientes que analisa', async () => {
    await bancoB();
    const meus = consultarB(`SELECT COUNT(DISTINCT P.CLIENTE_ID) AS N, COALESCE(SUM(P.A_VENCER + P.VENCIDO), 0) AS TOTAL
FROM CC_POSICAO_CLIENTE_BU P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE P.A_VENCER + P.VENCIDO > 0 AND (C.ANALISTA_ID = ? OR C.AGENTE_ID = ?)`, M.rita, M.rita)[0];
    assert.ok(n(meus.N) > 0);
    const rita = aceito(await sfB('rita', 'ccPainelPosicao'));
    assert.deepEqual([rita.clientes, rita.total], [n(meus.N), r2(meus.TOTAL)]);
    const out = aceito(await sfB('rita', 'ccPainelPosicao', { mes: '2026-10' }));
    assert.deepEqual([out.origem, out.clientes, out.total], ['FOTO', 0, 0]);
  });

  await teste('C-013, RN-012: saúde da carteira igual à da concessão', async () => {
    await bancoB();
    for (const login of ['gustavo', 'sergio']) {
      const s = aceito(await sfB(login, 'ccPainelSaude'));
      const dono = (await linhasB(login, 'ccCredSaudeResumo', { agrupar: '' }))[0] || { SAUDAVEL: 0, ATENCAO: 0, RISCO: 0 };
      assert.deepEqual(s.niveis.map((x) => x.clientes), [n(dono.SAUDAVEL), n(dono.ATENCAO), n(dono.RISCO)], login);
      const total = s.niveis.reduce((a, x) => a + x.clientes, 0);
      if (total) assert.equal(s.indice, r2((s.niveis[0].clientes * 100) / total));
      for (const nivel of s.niveis) {
        assert.ok(nivel.maiores.length <= 4);
        assert.deepEqual(nivel.maiores.map((x) => x.saldo), [...nivel.maiores.map((x) => x.saldo)].sort((a, b) => b - a));
      }
    }
    const s = aceito(await sfB('gustavo', 'ccPainelSaude'));
    assert.ok(s.niveis.reduce((a, x) => a + x.clientes, 0) > 0, 'banco B tem clientes classificados');
    const reg = consultarB(`SELECT R.SAUDE, COUNT(*) AS N, COALESCE(SUM(P.UTILIZADO), 0) AS SALDO FROM CC_RISCO_CLIENTE R JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID
JOIN CC_CREDITO CR ON CR.ID = R.CREDITO_ID LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = R.CLIENTE_ID
WHERE CR.VIGENTE_CHAVE IS NOT NULL AND R.SAUDE <> '' GROUP BY R.SAUDE`);
    for (const nivel of s.niveis) {
      const x = reg.find((l) => l.SAUDE === nivel.nivel);
      assert.deepEqual([nivel.clientes, nivel.saldo], [n(x ? x.N : 0), r2(x ? x.SALDO : 0)], nivel.nivel);
    }
    const publicos = new Set(consultarB("SELECT ID FROM CC_CLIENTE WHERE SETOR = 'PUBLICO'").map((l) => n(l.ID)));
    assert.ok(s.niveis.every((x) => x.maiores.every((c) => !publicos.has(c.clienteId))));
  });

  await teste('C-014: pontos de atenção', async () => {
    await bancoB();
    const itens = aceito(await sfB('gustavo', 'ccPainelAtencao'));
    assert.ok(Array.isArray(itens));
    const tipo = (t) => itens.find((x) => x.tipo === t);
    const qtd = (sql) => n(consultarB(sql)[0].N);
    const conta = {
      PEDIDO_RETIDO: qtd("SELECT COUNT(*) AS N FROM CC_PEDIDO_RETIDO WHERE DECISAO_RESULTADO = ''"),
      BAIXA_PENDENTE: qtd("SELECT COUNT(*) AS N FROM CC_BAIXA WHERE SITUACAO = 'PENDENTE'"),
      BLOQUEIO_NAO_APLICADO: qtd('SELECT COUNT(*) AS N FROM CC_COBRANCA WHERE ENCERRADO_EM IS NULL AND BLOQUEIO_DEVIDO <> BLOQUEIO_APLICADO'),
      LIMITE_VENCIDO: qtd("SELECT COUNT(*) AS N FROM CC_CREDITO WHERE VIGENTE_CHAVE IS NOT NULL AND FIM_VALIDADE < '2026-11-14'"),
      CLIENTE_CRITICO: qtd("SELECT COUNT(*) AS N FROM CC_RISCO_CLIENTE WHERE CRITICIDADE = 'CRITICO'"),
    };
    const minimo = { PEDIDO_RETIDO: 2, BAIXA_PENDENTE: 1, BLOQUEIO_NAO_APLICADO: 2, LIMITE_VENCIDO: 1, CLIENTE_CRITICO: 1 };
    for (const [t, q] of Object.entries(conta)) {
      assert.ok(q >= minimo[t], `${t}: ${q}`);
      assert.equal(tipo(t)?.quantidade, q, t);
    }
    // 2005 e 2007 entre os bloqueios; 4007 e 4010 entre os pedidos retidos; 2014 na baixa; 4005 e 4010.
    const cods = (sql) => consultarB(sql).map((l) => n(l.CODCLI));
    assert.ok([2005, 2007].every((c) => cods(`SELECT C.CODCLI FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
WHERE CB.ENCERRADO_EM IS NULL AND CB.BLOQUEIO_DEVIDO <> CB.BLOQUEIO_APLICADO`).includes(c)));
    assert.ok([4007, 4010].every((c) => cods("SELECT C.CODCLI FROM CC_PEDIDO_RETIDO P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE P.DECISAO_RESULTADO = ''").includes(c)));
    const PROPRIOS = ['INAD_ACIMA_ALERTA', 'CONCENTRACAO', 'LIMITE_VENCIDO', 'CLIENTE_CRITICO', 'CLIENTE_EM_RISCO', 'BLOQUEIO_NAO_APLICADO', 'ACORDO_QUEBRADO',
      'BAIXA_PENDENTE', 'SOLICITACAO_FORA_PRAZO', 'PEDIDO_RETIDO', 'FOTO_PENDENTE', 'LEITURA_ATRASADA'];
    assert.ok(itens.every((x) => PROPRIOS.includes(x.tipo) && x.quantidade > 0), JSON.stringify(itens.map((x) => x.tipo)));
    assert.equal(tipo('FOTO_PENDENTE'), undefined);
    const pub = (await linhasB('gustavo', 'ccPubResumo'))[0];
    assert.ok(n(pub.ACIMA_2M) >= 1, 'nota 5003 acima de 2 meses');
  });

  await teste('C-015, RN-020: crédito e promessas do mês, registro a registro (banco B)', async () => {
    await bancoB();
    // O banco B não tem decisão em novembro: confere a janela de três meses, mês a mês.
    const serieCred = await linhasB('gustavo', 'ccPainelSerieCredito', { ate: '2026-11', meses: '3' });
    const sols = consultarB('SELECT S.*, D.LIMITE_APROVADO FROM CC_SOLICITACAO S LEFT JOIN CC_DECISAO D ON D.ID = S.DECISAO_ID');
    const dias = (s) => Math.round((Date.parse(s.DECIDIDA_EM.slice(0, 10)) - Date.parse(s.CRIADO_EM.slice(0, 10))) / 86400000);
    assert.equal(serieCred.length, 3);
    for (const linha of serieCred) {
      const dec = sols.filter((s) => s.DECIDIDA_EM && s.DECIDIDA_EM.startsWith(linha.MES) && ['APROVADA', 'PRE_APROVADA', 'RECUSADA'].includes(s.DECISAO_RESULTADO));
      const apr = dec.filter((s) => s.DECISAO_RESULTADO !== 'RECUSADA');
      assert.deepEqual([n(linha.SOLICITACOES), n(linha.APROVADAS), n(linha.RECUSADAS), n(linha.NO_PRAZO), r2(linha.LIMITE_CONCEDIDO),
        linha.TEMPO_MEDIO_DIAS === null ? null : r2(linha.TEMPO_MEDIO_DIAS)], [
        sols.filter((s) => s.CRIADO_EM.startsWith(linha.MES)).length, apr.length, dec.length - apr.length,
        dec.filter((s) => s.PRAZO_DECISAO && s.DECIDIDA_EM.slice(0, 10) <= s.PRAZO_DECISAO).length,
        soma(apr, (s) => s.LIMITE_APROVADO || 0), dec.length ? r2(soma(dec, dias) / dec.length) : null], linha.MES);
    }
    assert.ok(serieCred.some((l) => n(l.APROVADAS) > 0), 'banco B tem decisões na janela');
    const s = aceito(await sfB('gustavo', 'ccPainelSerie', { ate: '2026-11', meses: 1 }));
    const pr = consultarB("SELECT SITUACAO FROM CC_PROMESSA WHERE DATA_PROMETIDA >= '2026-11-01' AND DATA_PROMETIDA <= '2026-11-31'");
    const linha = doMes(s, '2026-11');
    assert.deepEqual([linha.PROMESSAS, linha.PROMESSAS_CUMPRIDAS, linha.PROMESSAS_QUEBRADAS],
      [pr.length, pr.filter((x) => x.SITUACAO === 'CUMPRIDA').length, pr.filter((x) => x.SITUACAO === 'QUEBRADA').length]);
  });

  await teste('C-019: decisões de crédito por carteira, registro a registro (banco B)', async () => {
    await bancoB();
    const c = aceito(await sfB('gustavo', 'ccPainelCredito'));
    const sols = consultarB('SELECT S.*, D.LIMITE_APROVADO FROM CC_SOLICITACAO S LEFT JOIN CC_DECISAO D ON D.ID = S.DECISAO_ID');
    for (const linha of c.porCarteira) {
      const da = sols.filter((s) => s.CARTEIRA === linha.carteira);
      const noMes = da.filter((s) => s.DECIDIDA_EM && s.DECIDIDA_EM.startsWith('2026-11'));
      const aberta = da.filter((s) => s.DECISAO_RESULTADO === '' && !s.ENCERRADA_EM);
      const apr = noMes.filter((s) => ['APROVADA', 'PRE_APROVADA'].includes(s.DECISAO_RESULTADO));
      assert.deepEqual([linha.emAnalise, linha.foraDoPrazo, linha.aprovadas, linha.recusadas, linha.concedido], [
        aberta.length, aberta.filter((s) => s.PRAZO_DECISAO && s.PRAZO_DECISAO < '2026-11-14').length, apr.length,
        noMes.filter((s) => s.DECISAO_RESULTADO === 'RECUSADA').length, soma(apr, (s) => s.LIMITE_APROVADO || 0)], linha.carteira);
    }
    const comBu = aceito(await sfB('gustavo', 'ccPainelCredito', { buId: '1' }));
    const decisoes = (x) => x.porCarteira.map((l) => [l.emAnalise, l.aprovadas, l.recusadas, l.concedido]);
    assert.deepEqual(decisoes(comBu), decisoes(c), 'o filtro de BU não muda as decisões (D-09)');
  });

  await teste('C-020: saldo por faixa de risco, registro a registro (banco B)', async () => {
    await bancoB();
    const c = aceito(await sfB('gustavo', 'ccPainelCredito'));
    const linhas = consultarB(`SELECT P.CLIENTE_ID, P.CARTEIRA, P.A_VENCER + P.VENCIDO AS S, COALESCE(R.RATING_ATUAL, '') AS RATING,
  COALESCE((SELECT AO.RATING_PUB FROM CC_CREDITO CR JOIN CC_ANALISE_ORGAO AO ON AO.ID = CR.ANALISE_ORGAO_ID WHERE CR.VIGENTE_CHAVE = P.CLIENTE_ID),
    (SELECT AO2.RATING_PUB FROM CC_ANALISE_ORGAO AO2 JOIN CC_SOLICITACAO S2 ON S2.ID = AO2.SOLICITACAO_ID WHERE AO2.CLIENTE_ID = P.CLIENTE_ID
      AND S2.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA') ORDER BY S2.DECIDIDA_EM DESC, AO2.ID DESC LIMIT 1), '') AS RATING_PUB
FROM CC_POSICAO_CLIENTE_BU P LEFT JOIN CC_RISCO_CLIENTE R ON R.CLIENTE_ID = P.CLIENTE_ID WHERE P.A_VENCER + P.VENCIDO > 0`);
    const esperado = {};
    for (const l of linhas) {
      const rating = l.CARTEIRA === 'PUBLICA' ? l.RATING_PUB : l.RATING;
      const chave = `${!rating ? 'SEM' : l.CARTEIRA === 'PUBLICA' ? 'PUBLICO' : 'PRIVADO'}:${rating}`;
      esperado[chave] = r2((esperado[chave] || 0) + n(l.S));
    }
    const obtido = {};
    for (const x of c.porRating) obtido[`${x.grupo}:${x.rating}`] = r2((obtido[`${x.grupo}:${x.rating}`] || 0) + x.saldo);
    assert.deepEqual(obtido, esperado);
    assert.ok(c.porRating.every((x) => x.grupo !== 'PRIVADO' || ['AA', 'A', 'B', 'C', 'D', 'E'].includes(x.rating)));
    assert.ok(c.porRating.every((x) => x.grupo !== 'PUBLICO' || ['P1', 'P2', 'P3', 'P4'].includes(x.rating)));
  });

  await teste('C-023, RF-017, RF-024, RF-025: resumos dos módulos no consolidado (banco B)', async () => {
    await bancoB();
    const itens = aceito(await sfB('gustavo', 'ccPainelAtencao', { buId: '1' }));
    const DOS_RESUMOS = ['PROMESSA_VENCIDA', 'ACAO_ATRASADA', 'JURIDICO_SEM_ANDAMENTO', 'JURIDICO_PRAZO', 'NF_PAGAMENTO_VENCIDO', 'NF_ACIMA_2M', 'CERTIDAO'];
    assert.ok(itens.every((x) => !DOS_RESUMOS.includes(x.tipo)));
    // Os três resumos chamados direto pela tela (DT-34), com sessão e sem aninhar.
    const ate7 = somarDiasUteis('2026-11-14', 7, consultarB("SELECT DATA FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL'").map((l) => l.DATA));
    const agenda = await linhasB('gustavo', 'ccCobAgendaResumo', { buId: '1', ate: ate7 });
    assert.ok(agenda.length > 0 && 'PROXIMOS' in agenda[0] && 'A_VENCER_7DU' in agenda[0]);
    const jur = (await linhasB('gustavo', 'ccJurResumo', { buId: '1', mes: '2026-11' }))[0];
    for (const col of ['AJUIZAR', 'VALOR_AJUIZAR', 'ATIVOS', 'VALOR_ATIVOS', 'ACORDOS_A_RECEBER', 'VALOR_ACORDOS_A_RECEBER', 'ACORDOS_PARCELA_VENCIDA',
      'VALOR_PARCELA_VENCIDA', 'RECUPERADO_MES', 'RECUPERADO_ANO', 'CUSTO_MES', 'DESVIOS_PRAZO', 'DESVIOS_CRITICOS', 'SEM_ANDAMENTO', 'PRAZOS_VENCENDO']) {
      assert.ok(col in jur, col);
    }
    const pub = (await linhasB('gustavo', 'ccPubResumo', { mes: '2026-11' }))[0];
    for (const col of ['NFS_ABERTAS', 'VALOR_ABERTO', 'SEM_ATESTO', 'AGUARDANDO_LIQUIDACAO', 'LIQUIDADAS_SEM_PAGAMENTO', 'PAGAMENTO_VENCIDO', 'VALOR_PAGAMENTO_VENCIDO',
      'ACIMA_2M', 'VALOR_ACIMA_2M', 'CERTIDOES_VENCENDO', 'CERTIDOES_VENCIDAS', 'RECEBIDO_MES', 'NFS_RECEBIDAS_MES']) {
      assert.ok(col in pub, col);
    }
    const pagas = consultarB("SELECT VALOR FROM CC_NF_PUBLICA WHERE CANCELADA = 0 AND PAGO_EM >= '2026-11-01' AND PAGO_EM <= '2026-11-31'");
    assert.deepEqual([n(pub.NFS_RECEBIDAS_MES), r2(pub.RECEBIDO_MES)], [pagas.length, soma(pagas, 'VALOR')]);
  });

  await teste('C-024, RN-019 (banco B): análises da analista somam na linha do supervisor', async () => {
    await bancoB();
    const rows = await linhasB('sergio', 'ccPainelEquipe');
    const linha = (id) => rows.find((l) => n(l.MEMBRO_ID) === id);
    const sols = consultarB(`SELECT S.*, AN.CAMINHO FROM CC_SOLICITACAO S JOIN CC_MEMBRO AN ON AN.ID = S.ANALISTA_ID`);
    const conta = (filtro) => {
      const da = sols.filter(filtro);
      return [da.filter((s) => s.DECISAO_RESULTADO === '' && !s.ENCERRADA_EM).length,
        da.filter((s) => s.DECIDIDA_EM && s.DECIDIDA_EM.startsWith('2026-11') && ['APROVADA', 'PRE_APROVADA', 'RECUSADA'].includes(s.DECISAO_RESULTADO)).length];
    };
    assert.deepEqual([n(linha(M.rita).ANALISES_ANDAMENTO), n(linha(M.rita).DECIDIDAS)], conta((s) => n(s.ANALISTA_ID) === M.rita));
    assert.deepEqual([n(linha(M.sergio).ANALISES_ANDAMENTO), n(linha(M.sergio).DECIDIDAS)], conta((s) => String(s.CAMINHO).startsWith('/1/2/3/')));
    assert.ok(n(linha(M.sergio).ANALISES_ANDAMENTO) + n(linha(M.sergio).DECIDIDAS) > 0, 'Rita tem análises no banco B');
  });

  await teste('R-05: vencido e PDD iguais aos do painel da cobrança (banco B)', async () => {
    await bancoB();
    const p = aceito(await sfB('gustavo', 'ccPainelPosicao'));
    const k = (await linhasB('gustavo', 'ccCobPainelKpis', { de: '', ate: '' }))[0];
    const aging = await linhasB('gustavo', 'ccCobPainelAging');
    assert.equal(p.vencido, r2(k.VENCIDO));
    assert.ok(Math.abs(p.pdd - soma(aging, 'PDD')) < 1, `${p.pdd} × ${soma(aging, 'PDD')}`);
  });

  if (B) descartarBanco(B);
  B = null;
}
