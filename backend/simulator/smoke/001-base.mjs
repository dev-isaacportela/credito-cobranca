// Smoke da 001-base (plan, seção Testes). Cada teste() começa de uma cópia do banco do passo 11.
// "Leitura" = ccBaseSincronizacaoPedir como Gustavo + rotina até leitura e processamento terminarem.

import {
  teste, banco, consultar, como, chamar, rodarCron, rodarRotinaAte, execucoes, substituir, winthorFora, nasDuasSessoes,
  assert, U, M, montarBanco, dia, nota, cliente, fixarRelogio, D,
} from './base.mjs';
import { descartarBanco } from '../seed.mjs';
import { usarBanco } from '../seed/000-elenco.mjs';
import { js } from '../../lib/escritas.mjs';
import { visivel } from '../../lib/visibilidade.mjs';
import { PARAM_NUM } from '../../lib/parametros.mjs';
import { agora, hoje, somarMeses } from '../../lib/tempo.mjs';
import { calcularPosicao, ratear } from '../../lib/base/posicao.mjs';
import { mapaDeFeriados, somarDiasUteis, ehDiaUtil } from '../../lib/dias-uteis.mjs';
import { semearQuadro, trechosDosGanchos, montarPodeMover } from '../../lib/quadros.mjs';
import { execSqlite } from '../seed/000-elenco.mjs';
import * as W from '../../lib/winthor-sql.mjs';

export const SEEDS = ['001'];
export const RELOGIO = D;
export const BANCO_POR_TESTE = true;
export const QUADROS_TESTE = [
  {
    slug: 'cobranca-teste', nome: 'Cobrança (teste)', config: { semEmail: false, rotulo: 'teste' },
    fases: [
      { chave: 'abertura', nome: 'Abertura', campos: [{ chave: 'abertura_1', label: 'Contato feito?', tipo: 'sim_nao' }],
        condicao: { operador: 'e', regras: [{ campo: '$fase', op: 'igual', valor: 'sucesso' }] } },
      { chave: 'sucesso', nome: 'Pago', tipo: 'sucesso' },
    ],
    campos: [{ chave: 'codcli', label: 'Cliente', tipo: 'texto', noCard: true }],
    etiquetas: [{ rotulo: 'Prioritário', cor: '#d33' }],
    automacoes: [{ gatilho: 'card_entrou_fase', faseChave: 'sucesso', acao: 'notificar_responsavel', config: {} }],
  },
  { slug: 'juridico-teste', nome: 'Jurídico (teste)', fases: [{ chave: 'analise', nome: 'Análise' }, { chave: 'fim', nome: 'Fim', tipo: 'sucesso' }] },
];

/* ── ajudantes ── */

const PADRAO = {
  busca: '', limite: '100', offset: '0', setor: '', carteira: '', agenteId: '0', analistaId: '0', buId: '-1', uf: '', tipoPessoa: '',
  soVencidos: '0', ordem: 'NOME', situacaoFicha: '', soPrincipais: '0', dia: '', situacao: '', clienteId: '0', meses: '12', cargo: '',
  ativo: '-1', ativa: '-1', semBu: '0', grupo: '', data: '', chave: '', ano: '0', specDona: '', codigo: '', origem: '', entidade: '',
  entidadeId: '0', area: '', membroId: '0', de: '', ate: '', comAtraso: '0',
};
/** Linhas de uma SF SQL de leitura, com os filtros desligados por padrão. */
const linhas = async (nome, input = {}) => (await chamar(nome, { ...PADRAO, ...input })).rows;
const linha = async (nome, input) => (await linhas(nome, input))[0];
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => { assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 200)}`); if (re) assert.match(r.error, re); return r; };
const idDe = (codcli) => consultar('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli)[0]?.ID;
const pos = (codcli, tabela = 'CC_POSICAO_CLIENTE', onde = '') => consultar(
  `SELECT P.* FROM ${tabela} P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE C.CODCLI = ? ${onde}`, codcli);
const n = (v) => Number(v);
const contar = (sql) => n(consultar(sql)[0].N);

/** Relógio + `min` minutos (texto local, sem fuso). */
function avancar(min) {
  const t = Date.parse(`${process.env.CC_AGORA}Z`) + min * 60000;
  return fixarRelogio(new Date(t).toISOString().slice(0, 19));
}
async function leitura() {
  avancar(1);
  aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
  await rodarRotinaAte();
}
const salvarParametros = (login, itens) => como(login, () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify(itens) }));
const totalDe = async (login) => como(login, async () => n((await linha('ccBaseClienteTotal')).TOTAL));
const listaDe = async (login) => como(login, async () => (await linhas('ccBaseClienteListar')).length);

/** JS de teste chamada como um usuário, que repassa o `membroId` dele à SF `alvo` (DT-34). */
const REPASSE = { type: 'JAVASCRIPT', code: js(async () => {
  const m = await quem();
  return escrever(event.alvo, { ...(event.entrada || {}), membroId: m.membroId });
}) };

const DUBLE_COB_1003 = { type: 'JAVASCRIPT', code: js(async () => {
  const [f] = await ler("SELECT BOARD_ID FROM CC_FASE WHERE QUADRO = 'cobranca-teste' ORDER BY ORDEM LIMIT 1");
  const [c] = await ler('SELECT M.USER_ID FROM CC_CLIENTE C LEFT JOIN CC_MEMBRO M ON M.ID = C.AGENTE_ID WHERE C.CODCLI = 1003');
  const [ja] = await ler(`SELECT ID FROM KB_CARD WHERE BOARD_ID = ${f.BOARD_ID} AND TITULO = 'Cliente 1003'`);
  if (!ja) await chamarKb('kbCardCriar', { boardId: f.BOARD_ID, titulo: 'Cliente 1003', criadoPor: c.USER_ID, responsavelId: c.USER_ID, origem: 'sistema' });
  return { ok: true, pendentes: 0, execucoes: 2, processados: ja ? 0 : 1 };
}) };

/** Dublê de passo que conta chamadas em CC_ESTADO (um '1' por chamada) e devolve `saida`. */
const passoContado = (chave, saida) => ({ type: 'JAVASCRIPT', code: js(`await sdk.runDmlMitra({ projectId, sql: "INSERT INTO CC_ESTADO (CHAVE, VALOR, ATUALIZADO_EM) VALUES ('${chave}', '1', '') ON DUPLICATE KEY UPDATE VALOR = CONCAT(VALOR, '1')" });
return ${JSON.stringify(saida)};`) });
const chamadas = (chave) => String(consultar('SELECT VALOR FROM CC_ESTADO WHERE CHAVE = ?', chave)[0]?.VALOR || '').length;

export async function suite() {
  /* ── posição ── */

  await teste('C-001 · RN-001, 003 a 006, 030: posição do 1001 após a leitura', async () => {
    const [p] = pos(1001);
    const esperado = {
      VENCIDO: 1500, A_VENCER: 3100, DIAS_ATRASO: 12, PROX_VENC_VALOR: 2300, A_VENCER_7DU: 2300, TITULOS_ABERTOS: 5, TITULOS_VENCIDOS: 2,
      LIMITE: 10000, UTILIZADO: 4600, DISPONIVEL: 5400, COMPRAS_QTD: 5, COMPRAS_VALOR: 5300, COMPRA_MEDIA_MENSAL: 1766.67,
      PRAZO_MEDIO_DIAS: 30, PONTUALIDADE_PCT: 0, VDIAS: 13500,
    };
    for (const [k, v] of Object.entries(esperado)) assert.equal(n(p[k]), v, k);
    assert.equal(p.VENC_MAIS_ANTIGO, dia(-12));
    assert.equal(p.PROX_VENC, dia(5));
    assert.equal(p.ULTIMA_COMPRA, dia(-10));
    assert.equal(pos(1005)[0].PONTUALIDADE_PCT, null);
  });

  await teste('RN-002: vencimento hoje não está vencido (1005)', async () => {
    const [p] = pos(1005);
    assert.deepEqual([n(p.VENCIDO), n(p.DIAS_ATRASO), n(p.A_VENCER), p.PROX_VENC, n(p.PROX_VENC_VALOR), n(p.A_VENCER_7DU)], [0, 0, 600, dia(0), 600, 600]);
  });

  await teste('C-002 · RN-007: recebimento sem duplicar e estorno', async () => {
    await leitura();
    const recebimentos = () => como('ana', () => linhas('ccBaseRecebimentoListar', { clienteId: idDe(1001) }));
    let r = await recebimentos();
    assert.equal(r.length, 1);
    assert.deepEqual([n(r[0].VALOR_PAGO), n(r[0].DIAS_ATRASO_PAGAMENTO)], [700, 2]);
    banco().db.prepare('UPDATE PCPREST SET VPAGO = VALOR, DTPAG = ? WHERE NUMTRANSVENDA = 100102').run(dia(0));
    await leitura();
    assert.equal((await recebimentos()).length, 2);
    assert.equal(n(pos(1001)[0].VENCIDO), 1000);
    banco().db.prepare('UPDATE PCPREST SET VPAGO = 0, DTPAG = NULL WHERE NUMTRANSVENDA = 100105').run();
    await leitura();
    r = await recebimentos();
    assert.equal(r.length, 1);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_RECEBIMENTO WHERE CHAVE LIKE '100105|%' AND ESTORNADO = 1"), 1);
    assert.equal(n(consultar('SELECT RECEBIMENTOS_ESTORNADOS FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1')[0].RECEBIMENTOS_ESTORNADOS), 1);
    const [p] = pos(1001);
    assert.deepEqual([n(p.VENCIDO), n(p.DIAS_ATRASO)], [1700, 30]);
    const total = await como('ana', () => linha('ccBaseRecebimentoTotal', { clienteId: idDe(1001) }));
    assert.equal(n(total.TOTAL), 1);
  });

  await teste('C-003 · RN-010: cliente novo, RCA trocado, sem movimento fica fora', async () => {
    const antes = await como('gustavo', () => linha('ccBaseClienteTotal'));
    assert.deepEqual([n(antes.TOTAL), n(antes.SEM_AGENTE)], [11, 2]);
    cliente({ codcli: 1013, nome: 'FARMACIA CENTRO OESTE LTDA', ramo: 3, uf: 'GO', limite: 2000 });
    nota({ codcli: 1013, n: 1, emissao: dia(-20), itens: [{ codprod: 301, valor: 500 }], parcelas: [{ prest: 1, valor: 500, venc: dia(10) }] });
    banco().db.prepare('UPDATE PCCLIENT SET CODUSUR1 = 11 WHERE CODCLI = 1004').run();
    await leitura();
    const depois = await como('gustavo', () => linha('ccBaseClienteTotal'));
    assert.deepEqual([n(depois.TOTAL), n(depois.SEM_AGENTE)], [12, 3]);
    assert.equal(n(consultar("SELECT CLIENTES_NOVOS FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK' ORDER BY ID DESC LIMIT 1")[0].CLIENTES_NOVOS), 1);
    assert.equal(consultar('SELECT AGENTE_ID FROM CC_CLIENTE WHERE CODCLI = 1013')[0].AGENTE_ID, null);
    assert.deepEqual(consultar('SELECT RCA_COD, AGENTE_ID FROM CC_CLIENTE WHERE CODCLI = 1004')[0], { RCA_COD: 11, AGENTE_ID: M.bruno });
    assert.equal(idDe(1011), undefined);
  });

  await teste('C-004 · RN-008: título pago zera as três posições', async () => {
    const antes = pos(1002)[0];
    assert.deepEqual([n(antes.VENCIDO), n(antes.DIAS_ATRASO)], [2500, 8]);
    banco().db.prepare('UPDATE PCPREST SET VPAGO = VALOR, DTPAG = ? WHERE CODCLI = 1002').run(dia(0));
    await leitura();
    const [p] = pos(1002);
    assert.deepEqual([n(p.VENCIDO), n(p.A_VENCER), n(p.DIAS_ATRASO), p.PROX_VENC], [0, 0, 0, null]);
    assert.notEqual(p.ALTERADO_EM, antes.ALTERADO_EM);
    const [bu] = pos(1002, 'CC_POSICAO_CLIENTE_BU', 'AND P.BU_ID = 1');
    const [cart] = pos(1002, 'CC_POSICAO_CLIENTE_CARTEIRA', "AND P.CARTEIRA = 'PRIVADA'");
    for (const x of [bu, cart]) assert.deepEqual([n(x.VENCIDO), n(x.A_VENCER), x.PROX_VENC], [0, 0, null]);
  });

  await teste('C-005 · RN-009: Winthor fora não zera nada', async () => {
    const antes = pos(1001)[0];
    avancar(5);
    aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
    await winthorFora(() => rodarCron());
    const [s] = consultar('SELECT ID, SITUACAO, ERRO FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1');
    assert.equal(s.SITUACAO, 'ERRO');
    assert.ok(String(s.ERRO).length > 0);
    const [p] = pos(1001);
    assert.deepEqual([n(p.VENCIDO), p.SINCRONIZADO_EM], [1500, antes.SINCRONIZADO_EM]);
    assert.equal(contar(`SELECT COUNT(*) AS N FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ${s.ID}`), 0);
    const status = await como('ana', () => linhas('ccBaseSincronizacaoStatus'));
    assert.equal(status[0].SITUACAO, 'ERRO');
    assert.equal(n(status[0].MINUTOS_DESDE), 5);
    // D-015: com a última leitura em erro, cada rodada tenta ler uma vez (uma linha nova, em erro) e não roda passo.
    const leituras = () => contar('SELECT COUNT(*) AS N FROM CC_SINCRONIZACAO');
    const antesRodada = leituras();
    avancar(5);
    await winthorFora(() => rodarCron());
    assert.equal(leituras(), antesRodada + 1);
    assert.equal(consultar('SELECT SITUACAO FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1')[0].SITUACAO, 'ERRO');
    assert.equal(n(pos(1001)[0].VENCIDO), 1500);
  });

  await teste('C-002 · RN-007: primeira carga traz o cliente pago entre 12 e 23 meses atrás', async () => {
    banco().db.exec('DELETE FROM CC_RECEBIMENTO; DELETE FROM CC_FATURAMENTO_MES;');
    cliente({ codcli: 1014, nome: 'CLINICA ANTIGA LTDA', ramo: 2, limite: 1000 });
    nota({ codcli: 1014, n: 1, emissao: dia(-435), itens: [{ codprod: 101, valor: 300 }],
      parcelas: [{ prest: 1, valor: 300, venc: dia(-405), pago: true, pagoEm: dia(-400) }] });
    await leitura();
    assert.ok(idDe(1014), 'cliente pago há 400 dias entra no universo da primeira carga');
    assert.equal(contar(`SELECT COUNT(*) AS N FROM CC_RECEBIMENTO WHERE CLIENTE_ID = ${idDe(1014)}`), 1);
    assert.equal(idDe(1011), undefined);
  });

  await teste('C-006 · RF-008: intervalo, pedido manual e leitura travada', async () => {
    const leituras = () => contar('SELECT COUNT(*) AS N FROM CC_SINCRONIZACAO');
    const inicial = leituras();
    avancar(10);
    await rodarCron();
    assert.equal(leituras(), inicial);
    avancar(6);
    await rodarCron();
    assert.equal(leituras(), inicial + 1);
    avancar(10);
    aceito(await como('sergio', () => chamar('ccBaseSincronizacaoPedir')));
    recusado(await como('sergio', () => chamar('ccBaseSincronizacaoPedir')), /pendente/);
    recusado(await como('ana', () => chamar('ccBaseSincronizacaoPedir')));
    await rodarCron();
    assert.equal(leituras(), inicial + 2);
    assert.equal(consultar('SELECT SITUACAO FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1')[0].SITUACAO, 'OK');
    const quarenta = new Date(Date.parse(`${process.env.CC_AGORA}Z`) - 40 * 60000).toISOString().slice(0, 19);
    banco().db.prepare("INSERT INTO CC_SINCRONIZACAO (SITUACAO, INICIO, FASE) VALUES ('EM_ANDAMENTO', ?, 'CLIENTES')").run(quarenta);
    const travada = consultar('SELECT MAX(ID) AS ID FROM CC_SINCRONIZACAO')[0].ID;
    await rodarCron();
    const [t] = consultar('SELECT SITUACAO, ERRO FROM CC_SINCRONIZACAO WHERE ID = ?', travada);
    assert.equal(t.SITUACAO, 'ERRO');
    assert.match(t.ERRO, /interrompida/);
    assert.equal(consultar('SELECT SITUACAO FROM CC_SINCRONIZACAO WHERE ID > ?', travada)[0].SITUACAO, 'OK');

    const lista = await como('gustavo', () => linhas('ccBaseSincronizacaoListar'));
    assert.deepEqual(lista.map((l) => l.ID), [...lista.map((l) => l.ID)].sort((a, b) => b - a));
    assert.equal(n(lista.find((l) => l.SITUACAO === 'OK').CLIENTES_LIDOS), 11);
    const total = await como('gustavo', () => linha('ccBaseSincronizacaoTotal'));
    assert.deepEqual([n(total.TOTAL), n(total.COM_ERRO)], [lista.length, 1]);
    assert.equal((await como('sergio', () => linhas('ccBaseSincronizacaoListar'))).length, 0);
  });

  await teste('C-006: leitura grande continua na rodada seguinte com a mesma posição', async () => {
    const def = banco().runner.definicao('ccBaseSincronizar');
    substituir('ccBaseSincronizar', { ...def, code: def.code.replace('LINHAS_POR_CONSULTA = 500', 'LINHAS_POR_CONSULTA = 3').replace('PAGINAS_POR_RODADA = 1000', 'PAGINAS_POR_RODADA = 1') });

    avancar(1);
    aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
    let rodadas = 0;
    while (consultar('SELECT SITUACAO FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1')[0].SITUACAO !== 'OK' && rodadas < 20) { await rodarCron(); rodadas += 1; }
    assert.ok(rodadas > 1, `rodadas: ${rodadas}`);
    const [p] = pos(1001);
    assert.deepEqual([n(p.VENCIDO), n(p.A_VENCER), n(p.DIAS_ATRASO), n(p.COMPRAS_VALOR)], [1500, 3100, 12, 5300]);
    assert.equal(n(consultar('SELECT CLIENTES_LIDOS FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1')[0].CLIENTES_LIDOS), 11);
  });

  await teste('C-006 · RF-001: intervalo de 30 minutos', async () => {
    aceito(await salvarParametros('nara', [{ chave: 'base.syncIntervaloMin', valor: '30' }]));
    const leituras = () => contar('SELECT COUNT(*) AS N FROM CC_SINCRONIZACAO');
    const inicial = leituras();
    avancar(16);
    await rodarCron();
    assert.equal(leituras(), inicial);
    avancar(15);
    await rodarCron();
    assert.equal(leituras(), inicial + 1);
  });

  /* ── ficha, busca e visibilidade ── */

  await teste('C-007 · RF-010: ficha e títulos ao vivo', async () => {
    const id1001 = idDe(1001);
    const f = aceito(await como('ana', () => chamar('ccBaseClienteFicha', { clienteId: id1001 })));
    assert.equal(f.cliente.DOCUMENTO, '12345678000190');
    assert.equal(n(f.posicao.LIMITE), 10000);
    assert.equal(f.cliente.PLANO_DESCRICAO, '28/35/42 DIAS');
    assert.equal(f.cliente.RCA_NOME, 'CARLOS LIMA');
    assert.deepEqual([f.porBu.length, f.porCarteira.length], [3, 1]);
    const t = aceito(await como('ana', () => chamar('ccBaseTitulosAbertos', { clienteId: id1001 })));
    assert.equal(t.linhas.length, 5);
    assert.deepEqual(t.linhas.filter((l) => l.DIAS_ATRASO > 0).map((l) => l.DIAS_ATRASO).sort((a, b) => b - a), [12, 3]);
    assert.ok(t.linhas.every((l) => l.BU_ID > 0));
    const fora = await winthorFora(() => como('ana', () => chamar('ccBaseTitulosAbertos', { clienteId: id1001 })));
    assert.deepEqual([fora.ok, fora.linhas.length, typeof fora.erroWinthor], [true, 0, 'string']);
    assert.equal(n(pos(1001)[0].VENCIDO), 1500);
    for (const sf of ['ccBaseClienteFicha', 'ccBaseTitulosAbertos']) {
      recusado(await como('ana', () => chamar(sf, { clienteId: idDe(1006) })), /^Cliente não encontrado\.$/);
    }
    // Aninhada (DT-34): sem sessão com membroId; e uma JS que repassa o membroId de quem chama.
    assert.equal((await como(null, () => chamar('ccBaseTitulosAbertos', { clienteId: id1001, membroId: M.ana }))).linhas.length, 5);
    recusado(await como(null, () => chamar('ccBaseTitulosAbertos', { clienteId: id1001, membroId: M.silvia })), /Cliente não encontrado/);
    substituir('zzRepasse', REPASSE);
    const repassado = await nasDuasSessoes(async () => (await como('ana', () => chamar('zzRepasse', { alvo: 'ccBaseTitulosAbertos', entrada: { clienteId: id1001 } }))).linhas.length);
    assert.equal(repassado, 5);
    const prever = { codigo: 'TESTE_AVISO', clienteId: id1001 };
    const deAna = aceito(await como('ana', () => chamar('ccBaseModeloPrever', prever)));
    assert.equal((await como(null, () => chamar('ccBaseModeloPrever', { ...prever, membroId: M.ana }))).corpo, deAna.corpo);
    recusado(await como(null, () => chamar('ccBaseModeloPrever', { ...prever, membroId: M.silvia })), /Cliente não encontrado/);
    const corpo = await nasDuasSessoes(async () => (await como('ana', () => chamar('zzRepasse', { alvo: 'ccBaseModeloPrever', entrada: prever }))).corpo);
    assert.equal(corpo, deAna.corpo);
  });

  await teste('RF-012: cliente fora do sistema pelo cadastro do Winthor', async () => {
    for (const login of ['gustavo', 'nara']) {
      for (const busca of [{ codcli: 1011 }, { documento: '10110000000110' }]) {
        const r = aceito(await como(login, () => chamar('ccBaseClienteFicha', busca)));
        assert.deepEqual([r.cliente, r.foraDoSistema, r.winthor.codcli, r.winthor.nome], [null, true, 1011, 'CLIENTE SEM MOVIMENTO LTDA']);
      }
    }
    for (const login of ['sergio', 'ana']) recusado(await como(login, () => chamar('ccBaseClienteFicha', { codcli: 1011 })), /^Cliente não encontrado\.$/);
  });

  await teste('RF-012 · R-003 (B5 C-02): leitura Oracle fora do perfil — Ana não lê direto o cliente do Bruno; a Ficha e os títulos seguem', async () => {
    // 1004 é do Bruno: Ana não vê. Direto, as duas Oracle são recusadas pelo perfil (o Oracle não tem visibilidade).
    await assert.rejects(como('ana', () => chamar('ccBaseWinthorTitulos', { codcli: 1004 })), /fora do perfil/);
    await assert.rejects(como('ana', () => chamar('ccBaseWinthorCliente', { codcli: 1004, documento: '' })), /fora do perfil/);
    // Pela JS da casa (aninhada), que confere a visibilidade: Ana lê o próprio 1001 e não lê o 1004.
    const ok = await como('ana', () => chamar('ccBaseTitulosAbertos', { clienteId: idDe(1001), carteira: '', soVencidos: 0, membroId: 0 }));
    assert.ok(Array.isArray(ok.linhas) && ok.linhas.length > 0, JSON.stringify(ok).slice(0, 200));
    recusado(await como('ana', () => chamar('ccBaseTitulosAbertos', { clienteId: idDe(1004), carteira: '', soVencidos: 0, membroId: 0 })));
  });

  await teste('C-008: busca e totais da lista de clientes', async () => {
    for (const busca of ['SAO LUCAS', '12345678000190', '1001']) {
      const r = await como('ana', () => linhas('ccBaseClienteListar', { busca }));
      assert.deepEqual(r.map((l) => l.CODCLI), [1001], busca);
    }
    assert.equal(await listaDe('ana'), 3);
    assert.equal(await totalDe('ana'), 3);
    assert.equal((await como('ana', () => linhas('ccBaseClienteListar', { soVencidos: '1' }))).length, 3);
    assert.equal((await como('gustavo', () => linhas('ccBaseClienteListar', { agenteId: '-1' }))).length, 2);
    const t = await como('gustavo', () => linha('ccBaseClienteTotal'));
    assert.deepEqual([n(t.TOTAL), n(t.VENCIDO), n(t.A_VENCER), n(t.EM_ATRASO), n(t.MAIOR_ATRASO)], [11, 27400, 5600, 8, 60]);
  });

  const VISITAM = ['ana', 'bruno', 'carlos', 'silvia', 'sergio', 'gustavo', 'diana', 'nara', 'julia', 'rita'];
  await teste('C-009 · RN-012: visibilidade pela hierarquia, SQL = preâmbulo', async () => {
    const esperado = [3, 3, 2, 2, 7, 11, 11, 11, 0, 0];
    const clientes = consultar(`SELECT C.*, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO FROM CC_CLIENTE C
      LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID`);
    assert.equal(clientes.length, 11);
    for (const [i, login] of VISITAM.entries()) {
      assert.equal(await listaDe(login), esperado[i], `lista ${login}`);
      assert.equal(await totalDe(login), esperado[i], `total ${login}`);
      const [mb] = consultar('SELECT * FROM CC_MEMBRO WHERE ID = ?', M[login]);
      const m = { membroId: mb.ID, cargo: mb.CARGO, caminho: mb.CAMINHO, veTudo: mb.ADMIN === 1 || ['GERENTE', 'DIRETORIA'].includes(mb.CARGO) };
      assert.equal(clientes.filter((c) => visivel(m, c)).length, esperado[i], `preâmbulo ${login}`);
    }
    await como(null, () => chamar('ccEscBaseClienteAnalista', { clienteId: idDe(1003), analistaId: M.rita, membroId: M.gustavo, agora: agora() }));
    assert.equal(await listaDe('rita'), 1);
    await como(null, () => chamar('ccEscBaseClienteJuridico', { clienteId: idDe(1004), noJuridico: 1, membroId: M.gustavo, agora: agora() }));
    assert.equal(await listaDe('julia'), 1);
  });

  await teste('C-009 · RN-012: analista e Jurídico só por quem pode, com destino válido (004, 003)', async () => {
    const analista = (login, codcli, analistaId) => como(login, () => chamar('ccEscBaseClienteAnalista', { clienteId: idDe(codcli), analistaId, membroId: M[login], agora: agora() }));
    const analistaDe = (codcli) => consultar('SELECT ANALISTA_ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli)[0].ANALISTA_ID;
    await analista('ana', 1001, M.carlos);
    assert.equal(analistaDe(1001), null, 'agente não põe outro membro como analista');
    await analista('ana', 1001, M.ana);
    assert.equal(analistaDe(1001), M.ana, 'agente põe a si mesmo (004 abre a solicitação com o próprio analista)');
    await analista('ana', 1001, 0);
    assert.equal(analistaDe(1001), M.ana, 'agente não limpa');
    for (const destino of [M.julia, M.otavio, 999]) await analista('gustavo', 1002, destino);
    assert.equal(analistaDe(1002), null, 'Jurídico, inativo ou inexistente não é analista');
    await analista('sergio', 1002, M.rita);
    assert.equal(analistaDe(1002), M.rita);
    await analista('sergio', 1002, 0);
    assert.equal(analistaDe(1002), null);
    const juridico = (login, codcli, noJuridico) => como(login, () => chamar('ccEscBaseClienteJuridico', { clienteId: idDe(codcli), noJuridico, membroId: M[login], agora: agora() }));
    const marcado = (codcli) => n(consultar('SELECT NO_JURIDICO FROM CC_CLIENTE WHERE CODCLI = ?', codcli)[0].NO_JURIDICO);
    await juridico('ana', 1001, 1);
    await juridico('sergio', 1001, 1);
    assert.equal(marcado(1001), 0, 'agente e supervisor (abaixo de jur.envioNivelMin) não marcam');
    await juridico('julia', 1001, 1);
    assert.equal(marcado(1001), 1, 'o Jurídico marca cliente que ainda não vê (O-09)');
    await juridico('ana', 1001, 0);
    assert.equal(marcado(1001), 1);
    await juridico('gustavo', 1001, 0);
    assert.equal(marcado(1001), 0);
  });

  await teste('RN-012: membro sem caminho gravado não vê cliente pela hierarquia (SQL = preâmbulo)', async () => {
    await como('nara', () => chamar('ccEscBaseMembroInserir', {
      nome: 'Visitante', nomeChave: 'visitante', userEmail: 'visitante@benenutri.local', cargo: 'AGENTE', superiorId: M.sergio,
      admin: 0, ativo: 1, membroId: M.nara, agora: agora(),
    }));
    const [novo] = consultar("SELECT ID, CAMINHO FROM CC_MEMBRO WHERE USER_EMAIL = 'visitante@benenutri.local'");
    assert.equal(novo.CAMINHO, '');
    assert.equal(await listaDe('visitante'), 0);
    assert.equal(await totalDe('visitante'), 0);
    const clientes = consultar(`SELECT C.*, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO FROM CC_CLIENTE C
      LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID`);
    assert.equal(clientes.filter((c) => visivel({ membroId: novo.ID, cargo: 'AGENTE', caminho: '', veTudo: false }, c)).length, 0);
  });

  await teste('C-009 · pipeline (DT-38): analista e agente no passo 7, card com o agente no passo 8', async () => {
    const proprio = await montarBanco({
      seeds: SEEDS, quadros: QUADROS_TESTE, atribuicao: [{ codcli: 1003, agente: 'ana', analista: 'rita' }], substituir: { ccCobRotina: DUBLE_COB_1003 },
    });
    try {
      const q = (sql) => proprio.db.prepare(sql).all();
      assert.deepEqual({ ...q('SELECT AGENTE_ID, ANALISTA_ID FROM CC_CLIENTE WHERE CODCLI = 1003')[0] }, { AGENTE_ID: M.ana, ANALISTA_ID: M.rita });
      const cards = q("SELECT K.RESPONSAVEL_ID FROM KB_CARD K JOIN KB_BOARD B ON B.ID = K.BOARD_ID WHERE B.SLUG = 'cobranca-teste' AND K.TITULO = 'Cliente 1003'");
      assert.deepEqual(cards.map((c) => c.RESPONSAVEL_ID), [U.ana]);
      const rita = await proprio.runner.executar('ccBaseClienteListar', { ...PADRAO }, { userId: U.rita });
      assert.deepEqual(rita.rows.map((l) => l.CODCLI), [1003]);
      const sergio = await proprio.runner.executar('ccBaseClienteListar', { ...PADRAO }, { userId: U.sergio });
      assert.equal(sergio.rows.length, 8);
    } finally {
      descartarBanco(proprio);
      usarBanco(banco());
      fixarRelogio(RELOGIO);
    }
  });

  await teste('C-010 · RN-013: fora da equipe não vê nem grava', async () => {
    // `hoje` do relógio único na sessão (pedido das telas), para membro e para quem não é.
    assert.equal((await como('ana', () => chamar('ccBaseSessao'))).hoje, '2026-11-19');
    for (const login of ['visitante', 'otavio']) {
      assert.equal((await como(login, () => chamar('ccBaseSessao'))).hoje, '2026-11-19');
      assert.equal((await como(login, () => chamar('ccBaseSessao'))).membro, null);
      assert.equal(await listaDe(login), 0);
      recusado(await como(login, () => chamar('ccBaseContatoSalvar', { clienteId: idDe(1001), nome: 'X', telefone: '1' })), /não faz parte da equipe/);
      const antes = contar('SELECT COUNT(*) AS N FROM CC_CONTATO_CLIENTE');
      await como(login, () => chamar('ccEscBaseContatoInserir', {
        clienteId: idDe(1001), nome: 'X', area: '', funcao: '', telefone: '1', whatsapp: '', email: '', situacao: 'PENDENTE', obs: '',
        principal: 0, busca: 'X', membroId: login === 'otavio' ? M.otavio : 0, agora: agora(),
      }));
      assert.equal(contar('SELECT COUNT(*) AS N FROM CC_CONTATO_CLIENTE'), antes);
    }
  });

  /* ── equipe ── */

  const membro = (dados) => ({ ativo: 1, admin: 0, ...dados });
  await teste('C-011 · RN-011: hierarquia válida', async () => {
    const salvar = (d) => como('nara', () => chamar('ccBaseMembroSalvar', membro(d)));
    recusado(await salvar({ nome: 'Ana Costa', userEmail: 'ana2@benenutri.local', cargo: 'AGENTE', superiorId: M.sergio }), /nome/);
    recusado(await como('diana', () => chamar('ccBaseMembroSalvar', membro({ nome: 'Novo Topo', userEmail: 'topo@benenutri.local', cargo: 'DIRETORIA', superiorId: 0 }))), /topo/);
    recusado(await salvar({ nome: 'Fulano', userEmail: 'fulano@benenutri.local', cargo: 'AGENTE', superiorId: M.ana }), /Supervisor, Gerente ou Diretoria/);
    recusado(await salvar({ membroId: M.gustavo, nome: 'Gustavo Lima', userEmail: 'gustavo@benenutri.local', cargo: 'GERENTE', superiorId: M.sergio }), /ciclo/);
    recusado(await salvar({ nome: 'Beltrano', userEmail: 'ana@benenutri.local', cargo: 'AGENTE', superiorId: M.sergio }), /e-mail/i);
    const nara = { membroId: M.nara, nome: 'Nara Admin', userEmail: 'nara@benenutri.local', cargo: 'AGENTE', superiorId: M.gustavo, admin: 1 };
    recusado(await como('gustavo', () => chamar('ccBaseMembroSalvar', membro({ ...nara, ativo: 0 }))), /ao menos um Administrador/);
    // RN-011: quem chefia alguém ativo não vira Agente (JS e guarda).
    const sergio = { membroId: M.sergio, nome: 'Sérgio Nunes', userEmail: 'sergio@benenutri.local', cargo: 'AGENTE', superiorId: M.gustavo };
    recusado(await salvar(sergio), /3 subordinados ativos/);
    await como('gustavo', () => chamar('ccEscBaseMembroAtualizar', {
      id: M.sergio, nome: 'Sérgio Nunes', nomeChave: 'sergio nunes', userEmail: 'sergio@benenutri.local', cargo: 'AGENTE', superiorId: M.gustavo,
      admin: 0, ativo: 1, caminhoAntigo: '/1/2/3/', membroId: M.gustavo, agora: agora(),
    }));
    assert.equal(consultar('SELECT CARGO FROM CC_MEMBRO WHERE ID = ?', M.sergio)[0].CARGO, 'SUPERVISOR');
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_MEMBRO'), 11);
  });

  await teste('C-012: novo topo da hierarquia', async () => {
    // Diretoria só é dada por quem tem cargo de Diretoria (D-014); a troca de topo não muda o cargo e a marca basta.
    const criado = aceito(await como('diana', () => chamar('ccBaseMembroSalvar', membro({ nome: 'Roberto Lima', userEmail: 'roberto@benenutri.local', cargo: 'DIRETORIA', superiorId: M.diana }))));
    recusado(await como('diana', () => chamar('ccBaseMembroSalvar', membro({ membroId: 12, nome: 'Roberto Lima', userEmail: 'roberto@benenutri.local', cargo: 'DIRETORIA', superiorId: 0 }))), /próprio/);
    assert.equal(criado.membroId, 12);
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ membroId: 12, nome: 'Roberto Lima', userEmail: 'roberto@benenutri.local', cargo: 'DIRETORIA', superiorId: 0 }))));
    const ms = consultar('SELECT ID, SUPERIOR_ID, CAMINHO FROM CC_MEMBRO');
    assert.deepEqual(ms.filter((m) => m.SUPERIOR_ID === null).map((m) => m.ID), [12]);
    assert.equal(ms.find((m) => m.ID === 12).CAMINHO, '/12/');
    assert.deepEqual(ms.find((m) => m.ID === M.diana), { ID: M.diana, SUPERIOR_ID: 12, CAMINHO: '/12/1/' });
    assert.ok(ms.filter((m) => m.ID !== 12 && m.ID !== M.diana).every((m) => m.CAMINHO.startsWith('/12/1/')));
    const esperado = [3, 3, 2, 2, 7, 11, 11, 11, 0, 0];
    for (const [i, login] of VISITAM.entries()) assert.equal(await listaDe(login), esperado[i], login);
    const c = aceito(await como('gustavo', () => chamar('ccBaseEquipeConferir')));
    assert.deepEqual([c.semSuperior.length, c.ciclos.length, c.caminhoInconsistente.length], [0, 0, 0]);
  });

  await teste('C-013: inativar só sem clientes e sem subordinados', async () => {
    const bruno = { membroId: M.bruno, nome: 'Bruno Dias', userEmail: 'bruno@benenutri.local', cargo: 'AGENTE', superiorId: M.sergio };
    recusado(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ ...bruno, ativo: 0 }))), /3 clientes/);
    recusado(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ membroId: M.sergio, nome: 'Sérgio Nunes', userEmail: 'sergio@benenutri.local', cargo: 'SUPERVISOR', superiorId: M.gustavo, ativo: 0 }))), /3 subordinados/);
    const ids = consultar('SELECT ID FROM CC_CLIENTE WHERE AGENTE_ID = ?', M.bruno).map((l) => l.ID).join(',');
    aceito(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: ids, agenteId: M.ana })));
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ ...bruno, ativo: 0 }))));
    assert.equal(consultar('SELECT ATIVO FROM CC_MEMBRO WHERE ID = ?', M.bruno)[0].ATIVO, 0);
  });

  await teste('C-009 · C-014 · DT-45: número com texto de injeção não vaza na leitura nem grava pela interna', async () => {
    // Leitura: `agenteId` que fecharia o parêntese do filtro vira número (0 = sem filtro, pela visibilidade).
    const total = async (login, extra = {}) => n((await como(login, () => linha('ccBaseClienteTotal', extra))).TOTAL);
    assert.ok(await total('ana') < await total('gustavo'));
    assert.equal(await total('ana', { agenteId: '0) OR (1=1' }), await total('ana'));
    // Interna: Ana (nível 1) não classifica cliente; o OR no `membroId` passaria o ATOR pela própria linha dela.
    const grupo = () => consultar('SELECT ID, GRUPO_ECONOMICO FROM CC_CLIENTE WHERE CODCLI = 1001')[0];
    const c = grupo();
    await como('ana', () => chamar('ccEscBaseClienteClassificar', { clienteId: c.ID, grupoEconomico: 'INJETADO', esfera: '', membroId: `${M.ana} OR 1=1`, agora: agora() }));
    assert.equal(grupo().GRUPO_ECONOMICO, c.GRUPO_ECONOMICO);
    // Winthor (Oracle): `codcli` com OR leria os títulos de todos os clientes (aninhada: fora do perfil, B5 C-02).
    const titulos = await como(null, () => chamar('ccBaseWinthorTitulos', { codcli: '1001 OR 1=1' }));
    assert.ok((titulos.rows || []).every((l) => Number(l.CODCLI) === 1001), JSON.stringify(titulos).slice(0, 200));
  });

  await teste('C-014 · RN-014: redistribuição de clientes', async () => {
    const ids = [idDe(1004), idDe(1005)];
    aceito(await como('sergio', () => chamar('ccBaseClienteAtribuir', { clienteIds: ids.join(','), agenteId: M.ana })));
    const agentes = () => Object.fromEntries(consultar('SELECT AGENTE_ID, COUNT(*) AS N FROM CC_CLIENTE GROUP BY AGENTE_ID').map((l) => [l.AGENTE_ID, l.N]));
    assert.deepEqual([agentes()[M.ana], agentes()[M.bruno]], [5, 1]);
    const aud = consultar("SELECT CLIENTE_ID, ANTES, DEPOIS, POR_NOME FROM CC_AUDITORIA WHERE AREA = 'Atribuição' AND POR = ? ORDER BY CLIENTE_ID", M.sergio);
    assert.deepEqual(aud, ids.map((id) => ({ CLIENTE_ID: id, ANTES: 'Bruno Dias', DEPOIS: 'Ana Costa', POR_NOME: 'Sérgio Nunes' })));
    recusado(await como('sergio', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1006)), agenteId: M.ana })));
    recusado(await como('sergio', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1012)), agenteId: M.carlos })));
    recusado(await como('ana', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1001)), agenteId: M.ana })));
    aceito(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1009)), agenteId: M.carlos })));
    assert.equal(agentes()[M.carlos], 3);
    recusado(await como('sergio', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1012)), agenteId: 0 })));
    recusado(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: Array.from({ length: 21 }, (_, i) => i + 1).join(','), agenteId: M.ana })));
    // Cliente sem agente só por quem vê tudo: Sérgio vê o 1003 pela analista Rita, mas não o atribui.
    await como(null, () => chamar('ccEscBaseClienteAnalista', { clienteId: idDe(1003), analistaId: M.rita, membroId: M.gustavo, agora: agora() }));
    recusado(await como('sergio', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1003)), agenteId: M.ana })), /sem agente/);
    await como('sergio', () => chamar('ccEscBaseClienteAgente', { ids: String(idDe(1003)), agenteId: M.ana, membroId: M.sergio, agora: agora() }));
    assert.equal(consultar('SELECT AGENTE_ID FROM CC_CLIENTE WHERE CODCLI = 1003')[0].AGENTE_ID, null);
    aceito(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(idDe(1003)), agenteId: M.ana })));
  });

  await teste('C-014 · RNF-006: lote cheio de 20 clientes cabe em 12 execuções', async () => {
    for (let i = 1; i <= 9; i += 1) {
      cliente({ codcli: 1100 + i, nome: `CLIENTE LOTE ${i} LTDA`, ramo: 2, limite: 1000 });
      nota({ codcli: 1100 + i, n: 1, emissao: dia(-20), itens: [{ codprod: 101, valor: 100 }], parcelas: [{ prest: 1, valor: 100, venc: dia(10) }] });
    }
    await leitura();
    const ids = consultar('SELECT ID FROM CC_CLIENTE ORDER BY ID').map((l) => l.ID);
    const auditadas = () => contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Atribuição'");
    const antes = auditadas();
    assert.equal(ids.length, 20);
    const lote = await execucoes(async () => aceito(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: ids.join(','), agenteId: M.ana }))));
    assert.ok(lote <= 12, `execuções: ${lote}`);
    assert.equal(contar(`SELECT COUNT(*) AS N FROM CC_CLIENTE WHERE AGENTE_ID = ${M.ana}`), 20);
    assert.equal(auditadas() - antes, 20 - 3, 'uma linha por cliente que mudou (Ana já tinha 3)');
  });

  /* ── parâmetros ── */

  const PARAMETRO_SF = { type: 'JAVASCRIPT', code: js('return await parametros(event.carteira || \'\', event.data || \'\');') };
  await teste('C-015 · RN-015: valor por carteira', async () => {
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoCritico', carteira: 'ESTETICA', valor: '45' }]));
    substituir('zzParametros', PARAMETRO_SF);
    substituir('zzParam', { type: 'SQL', code: `SELECT ${PARAM_NUM('crit.atrasoCritico', "'{{carteira}}'")} AS V` });
    for (const [carteira, v] of [['ESTETICA', 45], ['PRIVADA', 30], ['PUBLICA', 30]]) {
      assert.equal((await chamar('zzParametros', { carteira }))['crit.atrasoCritico'], v, carteira);
      assert.equal(n((await chamar('zzParam', { carteira })).rows[0].V), v, `PARAM ${carteira}`);
    }
    const l = (await linhas('ccBaseParametroListar', { carteira: 'ESTETICA' })).find((x) => x.CHAVE === 'crit.atrasoCritico');
    assert.deepEqual([l.VALOR_EFETIVO, l.VIGENCIA_INICIO, String(l.PADRAO)], ['45', dia(0), '30']);
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoCritico', carteira: 'ESTETICA', valor: null }]));
    assert.equal((await chamar('zzParametros', { carteira: 'ESTETICA' }))['crit.atrasoCritico'], 30);
  });

  await teste('C-016 · RN-015: vigência futura', async () => {
    aceito(await salvarParametros('nara', [{ chave: 'com.politicaVersao', valor: '5.3', vigenciaInicio: '2027-01-01' }]));
    aceito(await salvarParametros('nara', [{ chave: 'com.politicaVersao', valor: '5.4', vigenciaInicio: '2027-01-01' }]));
    substituir('zzParametros', PARAMETRO_SF);
    assert.equal((await chamar('zzParametros', { data: '2026-11-19' }))['com.politicaVersao'], '5.2');
    assert.equal((await chamar('zzParametros', { data: '2027-01-02' }))['com.politicaVersao'], '5.4');
    assert.equal((await como('nara', () => linhas('ccBaseParametroHistorico', { chave: 'com.politicaVersao' }))).length, 2);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Parâmetros' AND CAMPO = 'com.politicaVersao'"), 2);
  });

  await teste('C-016 · RN-015: vigência só de hoje em diante (B4-006 C-03)', async () => {
    const pdd = () => contar("SELECT COUNT(*) AS N FROM CC_PARAMETRO WHERE CHAVE = 'pdd.f1'");
    const antes = pdd();
    recusado(await salvarParametros('nara', [{ chave: 'pdd.f1', carteira: 'ESTETICA', valor: '10', vigenciaInicio: dia(-1) }]), /antes de hoje/);
    // A interna chamada direto pelo administrador também não grava vigência passada.
    await como('nara', () => chamar('ccEscBaseParametro', { n: 1, chaves: 'pdd.f1', carteiras: 'ESTETICA', valores: '10', nulos: '0', vigencias: dia(-1), membroId: M.nara, agora: agora() }));
    assert.equal(pdd(), antes);
    aceito(await salvarParametros('nara', [{ chave: 'pdd.f1', carteira: 'ESTETICA', valor: '10', vigenciaInicio: dia(0) }]));
    assert.equal(pdd(), antes + 1);
  });

  await teste('C-017 · RN-016: regra cruzada entre grupos nos dois sentidos (painel.sincAtrasoMin ≥ base.syncIntervaloMin)', async () => {
    recusado(await salvarParametros('nara', [{ chave: 'base.syncIntervaloMin', valor: '35' }]), /Leitura desatualizada/);
    recusado(await salvarParametros('nara', [{ chave: 'painel.sincAtrasoMin', valor: '10' }]), /Leitura desatualizada/);
    aceito(await salvarParametros('nara', [{ chave: 'base.syncIntervaloMin', valor: '30' }]));
    aceito(await salvarParametros('nara', [{ chave: 'painel.sincAtrasoMin', valor: '30' }]));
  });

  await teste('C-017 · RN-016: validação de valor e de conjunto', async () => {
    const linhasAntes = contar('SELECT COUNT(*) AS N FROM CC_PARAMETRO');
    const casos = [
      [[{ chave: 'crit.atrasoAlerta', valor: '30' }], /mais brando/],
      [[{ chave: 'crit.pontAlerta', valor: '80' }], /mais brando/],
      [[{ chave: 'crit.usoAlerta', valor: '100' }], /mais brando/],
      [[{ chave: 'base.syncIntervaloMin', valor: '7' }], /múltiplo de 5/],
      [[{ chave: 'crit.pontAlerta', valor: '120' }], /0 a 100/],
      [[{ chave: 'pdd.f1', valor: '0.1' }], /não podem diminuir/],
      [[{ chave: 'com.telefone', valor: '' }], /obrigatório/],
      [[{ chave: 'base.ramosPublicos', valor: '' }, { chave: 'base.ramoPublicoPrefixo', valor: '' }], /vazios/],
      [[{ chave: 'crit.atrasoAlerta', valor: '40' }, { chave: 'base.syncIntervaloMin', valor: '7' }], /múltiplo de 5|mais brando/],
    ];
    for (const [itens, re] of casos) recusado(await salvarParametros('nara', itens), re);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PARAMETRO'), linhasAntes);
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoAlerta', valor: '40' }, { chave: 'crit.atrasoCritico', valor: '50' }]));
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoCritico', valor: '30' }, { chave: 'crit.atrasoAlerta', valor: '1' }]));
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoCritico', valor: '50' }, { chave: 'crit.atrasoAlerta', valor: '40' }]));
    // Catálogo conferido contra 03 §1, §2, §3 e §8 (padrão, por carteira, com vigência), não contra a própria fonte.
    const S = 'sim';
    const contrato = {
      'base.syncIntervaloMin': ['15'], 'base.syncJanelaMeses': ['12'], 'base.comprasJanelaDias': ['90'], 'base.pontualidadeMeses': ['12'],
      'base.calendarioUf': ['DF'], 'base.fichaValidadeDias': ['180'], 'base.ramosPublicos': ['11,12,13,14,15'], 'base.ramoPublicoPrefixo': ['ORGAO PUBLICO'],
      'base.ramosEsfera': [''], 'base.vencimentoDiaNaoUtil': ['CORRIDO', S, S], 'base.cobrancasExcluidas': [''], 'base.rotinaUsuarioEmail': [''],
      'com.telefone': ['(61) 3033-3116', S], 'com.email': ['cobranca@benenutri.com', S], 'com.assinatura': ['Equipe de Crédito e Cobrança – Grupo Benenutri', S],
      'com.politicaVersao': ['5.2', '', S], 'com.modeloRevalidarMeses': ['12'], 'com.modeloValidaNivel': ['3'],
      'crit.atrasoAlerta': ['1', S], 'crit.atrasoCritico': ['30', S], 'crit.pontAlerta': ['90', S], 'crit.pontCritico': ['80', S],
      'crit.scoreAlerta': ['600', S], 'crit.scoreCritico': ['400', S], 'crit.usoAlerta': ['90', S], 'crit.usoCritico': ['100', S],
      'crit.prazoAlerta': ['60', S], 'crit.prazoCritico': ['90', S], 'crit.ratingAlerta': ['D', S], 'crit.ratingCritico': ['E', S],
      'crit.alertasParaCritico': ['3', S], 'crit.inadDias': ['1', S],
      'pdd.f0': ['0.5', S, S], 'pdd.f1': ['3', S, S], 'pdd.f2': ['10', S, S], 'pdd.f3': ['30', S, S], 'pdd.f4': ['50', S, S], 'pdd.f5': ['100', S, S],
    };
    const lista = await linhas('ccBaseParametroListar');
    const da001 = lista.filter((l) => l.SPEC_DONA === '001');
    assert.deepEqual(da001.map((l) => l.CHAVE).sort(), Object.keys(contrato).sort());
    for (const l of da001) {
      const [padrao, carteira = '', vigencia = ''] = contrato[l.CHAVE];
      assert.deepEqual([String(l.PADRAO), n(l.POR_CARTEIRA), n(l.COM_VIGENCIA)], [padrao, carteira ? 1 : 0, vigencia ? 1 : 0], l.CHAVE);
    }
  });

  await teste('C-018 · RN-017: restaurar padrão', async () => {
    const valor = async (chave) => (await linhas('ccBaseParametroListar')).find((l) => l.CHAVE === chave).VALOR_EFETIVO;
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoCritico', valor: '35' }]));
    aceito(await salvarParametros('nara', [{ chave: 'crit.atrasoCritico', valor: null }]));
    assert.equal(await valor('crit.atrasoCritico'), '30');
    const audita = () => contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Parâmetros' AND POR = 9");
    assert.equal(audita(), 2);
    aceito(await salvarParametros('nara', [{ chave: 'crit.pontAlerta', valor: '85' }, { chave: 'crit.atrasoAlerta', valor: '2' }]));
    const { PARAMETROS } = await import('../../lib/parametros/001-base.mjs');
    const grupo = PARAMETROS.filter((p) => p.grupo === 'crit').map((p) => ({ chave: p.chave, valor: null }));
    aceito(await salvarParametros('nara', grupo));
    assert.deepEqual([await valor('crit.pontAlerta'), await valor('crit.atrasoAlerta')], ['90', '1']);
    assert.equal(audita(), 6);
    assert.equal((await como('nara', () => linhas('ccBaseParametroHistorico', { chave: 'crit.atrasoCritico' }))).length, 2);
  });

  await teste('C-018 · RNF-006: lote cheio de 20 parâmetros cabe em 12 execuções', async () => {
    const { PARAMETROS } = await import('../../lib/parametros/001-base.mjs');
    const vinte = PARAMETROS.slice(0, 20).map((p) => p.chave);
    // Valores gravados fora do padrão nessas 20 chaves; restaurar o padrão muda as 20 (auditoria de 20 linhas).
    banco().db.prepare(`UPDATE CC_PARAMETRO SET VALOR = 'x' || COALESCE(VALOR, '') WHERE CARTEIRA = '' AND CHAVE IN (${vinte.map(() => '?').join(', ')})`).run(...vinte);
    const antes = contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Parâmetros'");
    // Gustavo (cargo Gerente): o lote inclui `com.modeloValidaNivel`, chave de alçada que a marca sozinha não altera (D-014).
    const nLote = await execucoes(async () => aceito(await salvarParametros('gustavo', vinte.map((chave) => ({ chave, valor: null })))));
    assert.ok(nLote <= 12, `execuções: ${nLote}`);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Parâmetros'") - antes, 20);
    const lista = await linhas('ccBaseParametroListar');
    for (const p of PARAMETROS.slice(0, 20)) assert.equal(String(lista.find((l) => l.CHAVE === p.chave).VALOR_EFETIVO), String(p.padrao), p.chave);
  });

  await teste('C-019: alçada de administração', async () => {
    const id1 = consultar("SELECT ID FROM CC_MODELO_MENSAGEM WHERE CODIGO = 'TESTE_AVISO'")[0].ID;
    const [aviso] = consultar('SELECT ASSUNTO, CORPO FROM CC_MODELO_MENSAGEM WHERE ID = ?', id1);
    const bruno = membro({ membroId: M.bruno, nome: 'Bruno Dias', userEmail: 'bruno@benenutri.local', cargo: 'AGENTE', superiorId: M.sergio });
    const seis = [
      ['ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'crit.atrasoCritico', valor: '30' }]) }],
      ['ccBaseMembroSalvar', bruno],
      ['ccBaseFeriadoSalvar', { gerarAno: 2026 }],
      ['ccBaseBuSalvar', { buId: 1, nome: 'Nutrição', carteira: 'PRIVADA', ordem: 1, ativa: 1 }],
      ['ccBaseBuDeptoSalvar', { codepto: 10, buId: 1 }],
      ['ccBaseModeloSalvar', { codigo: 'TESTE_AVISO', assunto: aviso.ASSUNTO, corpo: aviso.CORPO }],
    ];
    for (const [sf, input] of seis) recusado(await como('ana', () => chamar(sf, input)), /Gerente, Diretoria ou Administrador/);
    recusado(await como('sergio', () => chamar(seis[0][0], seis[0][1])), /Gerente, Diretoria ou Administrador/);
    const bu = consultar('SELECT ORDEM FROM CC_BU WHERE ID = 1')[0];
    seis[3][1].ordem = bu.ORDEM;
    for (const [sf, input] of seis) aceito(await como('gustavo', () => chamar(sf, input)));
    aceito(await como('nara', () => chamar(seis[0][0], seis[0][1])));
    const antes = contar('SELECT COUNT(*) AS N FROM CC_PARAMETRO');
    await como('ana', () => chamar('ccEscBaseParametro', { n: 1, chaves: 'crit.atrasoCritico', carteiras: 'ESTETICA', valores: '99', nulos: '0', vigencias: dia(0), membroId: M.ana, agora: agora() }));
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_PARAMETRO'), antes);
    recusado(await como('gustavo', () => chamar('ccBaseMembroSalvar', { ...bruno, admin: 1 })), /só quem tem a marca/i);
    assert.equal(consultar('SELECT ADMIN FROM CC_MEMBRO WHERE ID = ?', M.bruno)[0].ADMIN, 0);
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', { ...bruno, admin: 1 })));
    assert.equal(consultar('SELECT ADMIN FROM CC_MEMBRO WHERE ID = ?', M.bruno)[0].ADMIN, 1);
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', { ...bruno, admin: 0 })));
    assert.equal(consultar('SELECT ADMIN FROM CC_MEMBRO WHERE ID = ?', M.bruno)[0].ADMIN, 0);
  });

  /** Chamada direta da escrita interna de membro (sem a JS), a partir da linha gravada + `mudar`. */
  const escMembro = (login, id, mudar = {}) => {
    const [x] = consultar('SELECT * FROM CC_MEMBRO WHERE ID = ?', id);
    return como(login, () => chamar('ccEscBaseMembroAtualizar', {
      id, nome: x.NOME, nomeChave: x.NOME_CHAVE, userEmail: x.USER_EMAIL, cargo: x.CARGO, superiorId: x.SUPERIOR_ID || 0,
      admin: x.ADMIN, ativo: x.ATIVO, caminhoAntigo: x.CAMINHO, membroId: M[login], agora: agora(), ...mudar,
    }));
  };
  const linhaMembro = (id) => consultar('SELECT CARGO, NIVEL, SUPERIOR_ID, CAMINHO, ADMIN, ATIVO FROM CC_MEMBRO WHERE ID = ?', id)[0];

  await teste('C-019 · B-01: nível e caminho não vêm do parâmetro da escrita interna', async () => {
    const nara = linhaMembro(M.nara);
    await escMembro('nara', M.nara, { nivel: 5 });
    await escMembro('nara', M.nara, { cargo: 'DIRETORIA', nivel: 5 });
    assert.deepEqual(linhaMembro(M.nara), nara, 'Nara (Agente com a marca) não ganha nível 5');
    const ana = linhaMembro(M.ana);
    await escMembro('gustavo', M.ana, { caminhoNovo: '/', caminhoAntigo: '' });
    await escMembro('gustavo', M.ana, { caminhoNovo: '/' });
    assert.deepEqual(linhaMembro(M.ana), ana, "Gustavo não põe '/' no caminho da Ana");
    assert.equal(await listaDe('ana'), 3);
    await escMembro('gustavo', M.ana, { superiorId: M.silvia });
    assert.equal(linhaMembro(M.ana).CAMINHO, '/1/2/4/5/', 'o caminho sai do superior gravado');
    await escMembro('gustavo', M.ana, { superiorId: M.ana });
    await escMembro('gustavo', M.silvia, { superiorId: M.ana });
    assert.equal(linhaMembro(M.silvia).SUPERIOR_ID, M.gustavo, 'superior que não chefia, ou ciclo, não grava');
  });

  await teste('C-019 · D-014: ninguém se promove; Gerente e Diretoria só por cargo igual ou maior; alçada sem a marca', async () => {
    const sergio = { membroId: M.sergio, nome: 'Sérgio Nunes', userEmail: 'sergio@benenutri.local', superiorId: M.gustavo };
    const gustavo = { membroId: M.gustavo, nome: 'Gustavo Lima', userEmail: 'gustavo@benenutri.local', cargo: 'DIRETORIA', superiorId: M.diana };
    recusado(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ membroId: M.nara, nome: 'Nara Admin', userEmail: 'nara@benenutri.local', cargo: 'DIRETORIA', superiorId: M.gustavo, admin: 1 }))), /próprio/);
    recusado(await como('gustavo', () => chamar('ccBaseMembroSalvar', membro(gustavo))), /próprio/);
    await escMembro('gustavo', M.gustavo, { cargo: 'DIRETORIA' });
    assert.equal(linhaMembro(M.gustavo).CARGO, 'GERENTE');
    recusado(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ ...sergio, cargo: 'GERENTE' }))), /nível igual ou maior/);
    recusado(await como('gustavo', () => chamar('ccBaseMembroSalvar', membro({ ...sergio, cargo: 'DIRETORIA' }))), /nível igual ou maior/);
    await escMembro('nara', M.sergio, { cargo: 'GERENTE' });
    await escMembro('gustavo', M.sergio, { cargo: 'DIRETORIA' });
    assert.equal(linhaMembro(M.sergio).CARGO, 'SUPERVISOR');
    aceito(await como('gustavo', () => chamar('ccBaseMembroSalvar', membro({ ...sergio, cargo: 'GERENTE' }))));
    assert.deepEqual([linhaMembro(M.sergio).CARGO, n(linhaMembro(M.sergio).NIVEL)], ['GERENTE', 3]);
    aceito(await como('diana', () => chamar('ccBaseMembroSalvar', membro({ ...sergio, cargo: 'DIRETORIA' }))));
    assert.equal(n(linhaMembro(M.sergio).NIVEL), 5);

    banco().db.prepare(`INSERT INTO CC_PARAMETRO_DEF (CHAVE, GRUPO, ORDEM, ROTULO, TIPO, UNIDADE, PADRAO, MINIMO, MAXIMO, SPEC_DONA)
      VALUES ('alcada.nivelTeste001', 'alcada', 99, 'Alçada de teste', 'INTEIRO', 'nível', '3', 1, 5, '004')`).run();
    const alcada = () => consultar("SELECT COUNT(*) AS N FROM CC_PARAMETRO WHERE CHAVE = 'alcada.nivelTeste001'")[0].N;
    recusado(await salvarParametros('nara', [{ chave: 'alcada.nivelTeste001', valor: '1' }]), /alçada/);
    recusado(await salvarParametros('nara', [{ chave: 'com.modeloValidaNivel', valor: '1' }]), /alçada/);
    await como('nara', () => chamar('ccEscBaseParametro', { n: 1, chaves: 'alcada.nivelTeste001', carteiras: '', valores: '1', nulos: '0', vigencias: dia(0), membroId: M.nara, agora: agora() }));
    assert.equal(alcada(), 0);
    aceito(await salvarParametros('gustavo', [{ chave: 'alcada.nivelTeste001', valor: '4' }]));
    assert.equal(alcada(), 1);
  });

  /* ── BU, setor, dias úteis ── */

  await teste('C-020 · RN-018: BU do item, setor pelo ramo e departamentos', async () => {
    assert.deepEqual(consultar('SELECT SETOR, TIPO_PESSOA FROM CC_CLIENTE WHERE CODCLI IN (1007, 1012) ORDER BY CODCLI'), [{ SETOR: 'PUBLICO', TIPO_PESSOA: 'J' }, { SETOR: 'PRIVADO', TIPO_PESSOA: 'F' }]);
    const [pub] = pos(1007, 'CC_POSICAO_CLIENTE_CARTEIRA', "AND P.CARTEIRA = 'PUBLICA'");
    assert.equal(n(pub.VENCIDO), 12000);
    assert.equal(pos(1007, 'CC_POSICAO_CLIENTE_BU', 'AND P.BU_ID = 1')[0].CARTEIRA, 'PUBLICA');
    nota({ codcli: 1008, n: 2, emissao: dia(-5), itens: [{ codprod: 901, valor: 200 }], parcelas: [{ prest: 1, valor: 200, venc: dia(25) }] });
    await leitura();
    const [semBu] = pos(1008, 'CC_POSICAO_CLIENTE_BU', 'AND P.BU_ID = 0');
    assert.deepEqual([n(semBu.A_VENCER), semBu.CARTEIRA], [200, 'PRIVADA']);
    assert.ok((await como('nara', () => linhas('ccBaseBuDeptoListar', { semBu: '1' }))).some((d) => d.CODEPTO === 90));
    aceito(await como('nara', () => chamar('ccBaseBuDeptoSalvar', { codepto: 90, buId: 2 })));
    aceito(await como('sergio', () => chamar('ccBaseClienteClassificar', { clienteId: idDe(1008), grupoEconomico: 'REDE ALFA' })));
    await leitura();
    assert.equal(n(pos(1008, 'CC_POSICAO_CLIENTE_BU', 'AND P.BU_ID = 2')[0].A_VENCER), 1100);
    assert.equal(n(pos(1008, 'CC_POSICAO_CLIENTE_BU', 'AND P.BU_ID = 0')[0].A_VENCER), 0);
    assert.equal(consultar('SELECT GRUPO_ECONOMICO FROM CC_CLIENTE WHERE CODCLI = 1008')[0].GRUPO_ECONOMICO, 'REDE ALFA');
    aceito(await salvarParametros('nara', [{ chave: 'base.ramosPublicos', valor: '11,12' }]));
    await leitura();
    assert.equal(consultar('SELECT SETOR FROM CC_CLIENTE WHERE CODCLI = 1007')[0].SETOR, 'PUBLICO');
    aceito(await salvarParametros('nara', [{ chave: 'base.ramoPublicoPrefixo', valor: 'XYZ' }]));
    await leitura();
    assert.equal(consultar('SELECT SETOR FROM CC_CLIENTE WHERE CODCLI = 1007')[0].SETOR, 'PRIVADO');
    assert.equal(n(pos(1007, 'CC_POSICAO_CLIENTE_CARTEIRA', "AND P.CARTEIRA = 'PRIVADA'")[0].VENCIDO), 12000);
    assert.equal(n(pos(1007, 'CC_POSICAO_CLIENTE_CARTEIRA', "AND P.CARTEIRA = 'PUBLICA'")[0].VENCIDO), 0);
    const nova = aceito(await como('nara', () => chamar('ccBaseBuSalvar', { nome: 'Hospitalar', carteira: 'PRIVADA', ordem: 5 })));
    aceito(await como('nara', () => chamar('ccBaseBuSalvar', { buId: nova.buId, nome: 'Hospitalar', carteira: 'PRIVADA', ordem: 5, ativa: 0 })));
    const bus = await como('nara', () => linhas('ccBaseBuListar'));
    assert.equal(bus.find((b) => b.ID === nova.buId).ATIVA, 0);
    recusado(await como('silvia', () => chamar('ccBaseClienteClassificar', { clienteId: idDe(1008), grupoEconomico: 'OUTRO' })), /^Cliente não encontrado\.$/);
    assert.equal(consultar('SELECT GRUPO_ECONOMICO FROM CC_CLIENTE WHERE CODCLI = 1008')[0].GRUPO_ECONOMICO, 'REDE ALFA');
  });

  await teste('C-021 · RN-019, 020: dias úteis e feriados', async () => {
    const lista = await como('nara', () => linhas('ccBaseFeriadoListar', { ano: '2026' }));
    const nacionais = lista.filter((f) => f.ABRANGENCIA === 'NACIONAL').map((f) => f.DATA);
    const df = mapaDeFeriados([...nacionais, ...lista.filter((f) => f.UF === 'DF').map((f) => f.DATA)]);
    const go = mapaDeFeriados(nacionais);
    assert.equal(somarDiasUteis('2026-11-13', 1, df), '2026-11-16');
    assert.equal(somarDiasUteis('2026-11-19', 1, df), '2026-11-23');
    assert.equal(ehDiaUtil('2026-02-17', df), false);
    assert.equal(somarDiasUteis('2026-11-15', 0, df), '2026-11-16');
    assert.deepEqual([ehDiaUtil('2026-11-30', df), ehDiaUtil('2026-11-30', go)], [false, true]);
    for (let i = 0; i < 2; i += 1) {
      const nGerar = await execucoes(async () => aceito(await como('nara', () => chamar('ccBaseFeriadoSalvar', { gerarAno: 2026 }))));
      assert.ok(nGerar <= 3, `execuções: ${nGerar}`);
    }
    const datas = consultar("SELECT DATA FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL' AND DATA LIKE '2026-%'").map((l) => l.DATA);
    assert.equal(datas.length, 13);
    for (const d of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04']) assert.ok(datas.includes(d), d);
    const carnaval = consultar("SELECT ID FROM CC_FERIADO WHERE DATA = '2026-02-17' AND ABRANGENCIA = 'NACIONAL'")[0].ID;
    aceito(await como('nara', () => chamar('ccBaseFeriadoSalvar', { feriadoId: carnaval, remover: 1 })));
    const depois = (await como('nara', () => linhas('ccBaseFeriadoListar', { ano: '2026' }))).map((f) => f.DATA);
    assert.equal(ehDiaUtil('2026-02-17', mapaDeFeriados(depois)), true);
  });

  /* ── contatos, modelos, e-mail, anexos ── */

  const salvarContato = (login, dados) => como(login, () => chamar('ccBaseContatoSalvar', dados));
  await teste('C-022 · RN-021: ficha de contatos', async () => {
    const c = idDe(1001);
    const marta = aceito(await salvarContato('ana', { clienteId: c, nome: 'Marta', area: 'Financeiro', email: 'marta@hsl.com.br', situacao: 'CONFIRMADO' }));
    const recepcao = aceito(await salvarContato('ana', { clienteId: c, nome: 'Recepção', area: 'Recepção / geral', telefone: '(61) 3333-0000' }));
    const ficha = consultar('SELECT CONTATOS_REVISADO_POR FROM CC_CLIENTE WHERE ID = ?', c)[0];
    assert.equal(ficha.CONTATOS_REVISADO_POR, M.ana);
    assert.equal(consultar('SELECT PRINCIPAL FROM CC_CONTATO_CLIENTE WHERE ID = ?', marta.contatoId)[0].PRINCIPAL, 1);
    const lista = await como('ana', () => linhas('ccBaseClienteListar'));
    assert.equal(lista.find((l) => l.CODCLI === 1001).SITUACAO_FICHA, 'EM_DIA');
    recusado(await salvarContato('ana', { clienteId: c, nome: 'Só nome' }), /telefone, WhatsApp ou e-mail/);
    recusado(await salvarContato('ana', { clienteId: c, nome: 'Marta 2', email: 'marta@' }), /e-mail inválido/i);
    aceito(await salvarContato('ana', { clienteId: c, contatoId: recepcao.contatoId, nome: 'Recepção', area: 'Recepção / geral', telefone: '(61) 3333-0000', principal: 1 }));
    assert.deepEqual(consultar('SELECT ID FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ? AND PRINCIPAL = 1', c).map((l) => l.ID), [recepcao.contatoId]);
    recusado(await salvarContato('ana', { clienteId: c, contatoId: recepcao.contatoId, nome: 'Recepção', telefone: '(61) 3333-0000', principal: 1, situacao: 'NAO_USAR' }), /principal não pode estar como Não usar mais/);
    const sit = Object.fromEntries((await como('gustavo', () => linhas('ccBaseClienteListar'))).map((l) => [l.CODCLI, l.SITUACAO_FICHA]));
    assert.deepEqual([sit[1002], sit[1004]], ['VENCIDA', 'NUNCA']);
    const contato1002 = consultar('SELECT ATUALIZADO_EM FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ?', idDe(1002))[0];
    avancar(1);
    aceito(await como('ana', () => chamar('ccBaseContatosRevisar', { clienteId: idDe(1002) })));
    assert.equal((await como('ana', () => linhas('ccBaseClienteListar', { busca: '1002' })))[0].SITUACAO_FICHA, 'EM_DIA');
    assert.equal(consultar('SELECT ATUALIZADO_EM FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ?', idDe(1002))[0].ATUALIZADO_EM, contato1002.ATUALIZADO_EM);
    const busca = await como('ana', () => linhas('ccBaseContatoListar', { busca: 'MARTA' }));
    assert.deepEqual(busca.map((l) => l.NOME), ['Marta']);
    assert.equal(n((await como('ana', () => linha('ccBaseContatoTotal', { busca: 'MARTA' }))).TOTAL), 1);
  });

  const TEXTO_AVISO = 'Prezado(a) [CLIENTE], o valor de [VALOR_VENCIDO] venceu em [VENCIMENTO_MAIS_ANTIGO].';
  const modelo = async (codigo) => como('nara', async () => (await linhas('ccBaseModeloListar', { codigo }))[0]);
  const editarModelo = (codigo, corpo) => como('nara', () => chamar('ccBaseModeloSalvar', { codigo, assunto: 'Assunto', corpo }));
  await teste('C-023 · RN-022: modelo, versão e validação', async () => {
    const c = idDe(1001);
    aceito(await salvarContato('ana', { clienteId: c, nome: 'Marta', email: 'marta@hsl.com.br', situacao: 'CONFIRMADO' }));
    assert.equal(n((await modelo('TESTE_AVISO')).VERSAO), 1);
    aceito(await editarModelo('TESTE_AVISO', TEXTO_AVISO));
    assert.equal(n((await modelo('TESTE_AVISO')).VERSAO), 2);
    recusado(await editarModelo('TESTE_AVISO', 'Olá [XYZ]'), /XYZ/);
    const enviar = () => como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_LEGAL', clienteId: c, extras: JSON.stringify({ DATA_LIMITE: '30/11/2026' }) }));
    assert.equal((await modelo('TESTE_LEGAL')).SITUACAO_VALIDACAO, 'AGUARDANDO');
    recusado(await enviar(), /aguardando validação/);
    recusado(await como('ana', () => chamar('ccBaseModeloValidar', { codigo: 'TESTE_LEGAL' })));
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'TESTE_LEGAL' })));
    assert.equal((await modelo('TESTE_LEGAL')).SITUACAO_VALIDACAO, 'VALIDO');
    aceito(await enviar());
    aceito(await editarModelo('TESTE_LEGAL', 'Prezado(a) [CLIENTE], pague até [DATA_LIMITE].'));
    assert.deepEqual([n((await modelo('TESTE_LEGAL')).VERSAO), (await modelo('TESTE_LEGAL')).SITUACAO_VALIDACAO], [2, 'AGUARDANDO']);
    recusado(await enviar(), /aguardando validação/);
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'TESTE_LEGAL' })));
    banco().db.prepare("UPDATE CC_MODELO_MENSAGEM SET VALIDADO_EM = ? WHERE CODIGO = 'TESTE_LEGAL'").run(`${somarMeses(dia(0), -13)}T10:00:00`);
    assert.equal((await modelo('TESTE_LEGAL')).SITUACAO_VALIDACAO, 'VENCIDA');
    recusado(await enviar(), /aguardando validação/);
  });

  await teste('C-024 · RN-023: envio de e-mail', async () => {
    const c = idDe(1001);
    aceito(await salvarContato('ana', { clienteId: c, nome: 'Marta', email: 'marta@hsl.com.br', situacao: 'CONFIRMADO', principal: 1 }));
    aceito(await editarModelo('TESTE_AVISO', TEXTO_AVISO));
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'TESTE_LEGAL' })));
    const emails = () => contar('SELECT COUNT(*) AS N FROM SIM_EMAIL');
    let r;
    const nEnvio = await execucoes(async () => { r = await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_AVISO', clienteId: c })); });
    assert.ok(nEnvio <= 12, `execuções: ${nEnvio}`);
    assert.equal(aceito(r).resultado, 'ENVIADO');
    const enviado = consultar('SELECT PARA FROM SIM_EMAIL');
    assert.deepEqual(enviado.map((e) => e.PARA), ['marta@hsl.com.br']);
    const [dd, mm, aaaa] = [dia(-12).slice(8, 10), dia(-12).slice(5, 7), dia(-12).slice(0, 4)];
    const corpo = `Prezado(a) Marta, o valor de R$ 1.500,00 venceu em ${dd}/${mm}/${aaaa}.`;
    const [registro] = consultar('SELECT CORPO, ENVIADO_POR, MODELO_VERSAO, RESULTADO FROM CC_EMAIL_ENVIADO WHERE ID = ?', r.emailId);
    assert.deepEqual(registro, { CORPO: corpo, ENVIADO_POR: M.ana, MODELO_VERSAO: 2, RESULTADO: 'ENVIADO' });
    recusado(await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_AVISO', clienteId: idDe(1010) })), /Sem e-mail cadastrado/);
    assert.equal(emails(), 1);
    const semData = recusado(await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_LEGAL', clienteId: c })));
    assert.deepEqual(semData.faltam, ['DATA_LIMITE']);
    const longo = aceito(await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_AVISO', clienteId: c, assunto: `[CLIENTE] ${'x'.repeat(400)}` })));
    assert.equal(consultar('SELECT ASSUNTO FROM CC_EMAIL_ENVIADO WHERE ID = ?', longo.emailId)[0].ASSUNTO.length, 300, 'assunto cabe em VARCHAR(300)');
    const falha = await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_AVISO', clienteId: c, para: 'x@falha.test' }));
    assert.equal(falha.resultado, 'FALHOU');
    const [regFalha] = consultar('SELECT RESULTADO, ERRO FROM CC_EMAIL_ENVIADO WHERE ID = ?', falha.emailId);
    assert.equal(regFalha.RESULTADO, 'FALHOU');
    assert.ok(regFalha.ERRO.length > 0);
    recusado(await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_AVISO', clienteId: idDe(1006) })), /Cliente não encontrado/);
    assert.equal((await como('ana', () => chamar('ccBaseModeloPrever', { codigo: 'TESTE_AVISO', clienteId: c }))).corpo, corpo);
    avancar(1);
    aceito(await como('ana', () => chamar('ccEmailEnviar', { codigo: 'TESTE_AVISO', clienteId: c })));
    const lista = await como('ana', () => linhas('ccBaseEmailListar', { clienteId: c }));
    assert.equal(lista.length, 4);
    assert.ok(lista[0].ENVIADO_EM > lista[2].ENVIADO_EM);
    substituir('zzRepasse', REPASSE);
    const repassado = await nasDuasSessoes(async () => {
      const x = await como('ana', () => chamar('zzRepasse', { alvo: 'ccEmailEnviar', entrada: { codigo: 'TESTE_AVISO', clienteId: c } }));
      return [x.resultado, consultar('SELECT ENVIADO_POR FROM CC_EMAIL_ENVIADO WHERE ID = ?', x.emailId)[0].ENVIADO_POR];
    });
    assert.deepEqual(repassado, ['ENVIADO', M.ana]);
  });

  await teste('C-025 · RN-024: anexo', async () => {
    const c = idDe(1001);
    const base = { entidade: 'CLIENTE', entidadeId: c, tipoDoc: 'Contrato', mime: 'application/pdf', url: 'https://simulador.local/uploads/contrato.pdf' };
    const a = aceito(await como('ana', () => chamar('ccBaseAnexoRegistrar', { ...base, nomeArquivo: 'contrato.pdf', tamanhoBytes: 5242880 })));
    const listar = () => como('ana', () => linhas('ccBaseAnexoListar', { entidade: 'CLIENTE', entidadeId: c }));
    assert.deepEqual((await listar()).map((l) => [l.NOME_ARQUIVO, l.TIPO_DOC, n(l.TAMANHO_BYTES), l.ENVIADO_POR_NOME]), [['contrato.pdf', 'Contrato', 5242880, 'Ana Costa']]);
    recusado(await como('ana', () => chamar('ccBaseAnexoRegistrar', { ...base, nomeArquivo: 'grande.pdf', tamanhoBytes: 26214400 })), /20 MB/);
    recusado(await como('ana', () => chamar('ccBaseAnexoRegistrar', { ...base, nomeArquivo: 'virus.exe', mime: 'application/octet-stream', tamanhoBytes: 1000 })), /PDF, PNG, JPG, XLSX ou DOCX/);
    recusado(await como('bruno', () => chamar('ccBaseAnexoRemover', { anexoId: a.anexoId })));
    aceito(await como('ana', () => chamar('ccBaseAnexoRemover', { anexoId: a.anexoId })));
    assert.equal((await listar()).length, 0);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE AREA = 'Anexos' AND CAMPO = '(remoção)'"), 1);
  });

  await teste('C-026 · RN-025: auditoria só cresce e se filtra', async () => {
    aceito(await como('sergio', () => chamar('ccBaseClienteAtribuir', { clienteIds: `${idDe(1004)},${idDe(1005)}`, agenteId: M.ana })));
    for (const itens of [[{ chave: 'crit.atrasoCritico', valor: '35' }], [{ chave: 'crit.atrasoCritico', valor: null }],
      [{ chave: 'crit.pontAlerta', valor: '85' }, { chave: 'crit.atrasoAlerta', valor: '2' }],
      [{ chave: 'crit.pontAlerta', valor: null }, { chave: 'crit.atrasoAlerta', valor: null }]]) aceito(await salvarParametros('nara', itens));
    const aud = (input) => como('gustavo', () => linhas('ccBaseAuditoriaListar', input));
    assert.equal((await aud({ membroId: String(M.sergio) })).length, 2);
    assert.equal((await aud({ area: 'Parâmetros' })).length, 6);
    // Só as áreas da 001 (01 §7): as rotinas das outras specs também auditam o cliente (abertura de caso, régua).
    const AREAS_001 = ['Clientes', 'Atribuição', 'Equipe', 'Parâmetros', 'BUs', 'Feriados', 'Contatos', 'Modelos', 'E-mail', 'Anexos', 'Leitura do Winthor'];
    assert.equal((await aud({ clienteId: String(idDe(1004)) })).filter((l) => AREAS_001.includes(l.AREA)).length, 2);
    assert.equal(n((await como('gustavo', () => linha('ccBaseAuditoriaTotal', { area: 'Parâmetros' }))).TOTAL), 6);
    assert.equal((await como('ana', () => linhas('ccBaseAuditoriaListar'))).length, 0);
    for (const [nome, d] of banco().runner.definicoes()) assert.doesNotMatch(String(d.code), /(UPDATE|DELETE FROM)\s+CC_AUDITORIA/, nome);
  });

  /* ── carteiras, vencimento, cobranças ── */

  await teste('C-028 · RN-028, 029: BU e carteira', async () => {
    const bu = (b) => pos(1001, 'CC_POSICAO_CLIENTE_BU', `AND P.BU_ID = ${b}`)[0];
    assert.equal(n(bu(1).VENCIDO), 1100);
    assert.deepEqual([n(bu(2).VENCIDO), n(bu(2).A_VENCER)], [400, 2300]);
    assert.equal(n(bu(3).A_VENCER), 800);
    const [p] = pos(1001, 'CC_POSICAO_CLIENTE_CARTEIRA', "AND P.CARTEIRA = 'PRIVADA'");
    assert.deepEqual([n(p.VENCIDO), n(p.A_VENCER), n(p.V_1_30), p.COMPOSICAO_BU], [1500, 3100, 1500, 'Enfermagem 59% · Nutrição 24% · Medicamento 17%']);
    const c1010 = Object.fromEntries(pos(1010, 'CC_POSICAO_CLIENTE_CARTEIRA').map((l) => [l.CARTEIRA, n(l.VENCIDO)]));
    assert.deepEqual(c1010, { ESTETICA: 1100, PRIVADA: 1100 });
    assert.equal(n(pos(1004)[0].V_31_60), 3000);
    assert.deepEqual(ratear(10000, [1, 1, 1]), [3333, 3333, 3334]);
    const r = calcularPosicao([{ CODCLI: 1, NUMTRANSVENDA: 1, PREST: '1', VALOR: 100, VPAGO: 0, DTVENC: '2026-12-31' }],
      [{ NUMTRANSVENDA: 1, CODEPTO: 10, VALOR: 1 }, { NUMTRANSVENDA: 1, CODEPTO: 20, VALOR: 1 }, { NUMTRANSVENDA: 1, CODEPTO: 30, VALOR: 1 }],
      { hoje: '2026-11-19', buDoDepto: { 10: 1, 20: 2, 30: 3 } });
    assert.deepEqual(r.clientes[0].porBu.map((b) => b.A_VENCER), [33.33, 33.33, 33.34]);
  });

  await teste('C-029 · RN-002: vencimento em dia não útil por carteira', async () => {
    assert.equal(n(pos(1001)[0].DIAS_ATRASO), 12);
    assert.deepEqual([n(pos(1007)[0].DIAS_ATRASO), n(pos(1007)[0].V_31_60)], [60, 12000]);
    aceito(await salvarParametros('nara', [{ chave: 'base.vencimentoDiaNaoUtil', carteira: 'PUBLICA', valor: 'UTIL_ANTERIOR' }]));
    await leitura();
    const [p7] = pos(1007);
    assert.deepEqual([n(p7.DIAS_ATRASO), p7.VENC_MAIS_ANTIGO, n(p7.V_61_90)], [62, '2026-09-18', 12000]);
    assert.equal(n(pos(1001)[0].DIAS_ATRASO), 12);
    aceito(await salvarParametros('nara', [{ chave: 'base.vencimentoDiaNaoUtil', valor: 'PROXIMO_UTIL' }]));
    await leitura();
    assert.deepEqual([n(pos(1001)[0].DIAS_ATRASO), pos(1001)[0].VENC_MAIS_ANTIGO], [10, '2026-11-09']);
  });

  await teste('C-030 · RN-001: tipo de cobrança excluído', async () => {
    assert.deepEqual([n(pos(1012)[0].VENCIDO), n(pos(1012)[0].DIAS_ATRASO)], [700, 9]);
    const titulos = async () => (await como('bruno', () => chamar('ccBaseTitulosAbertos', { clienteId: idDe(1012) }))).linhas.length;
    assert.equal(await titulos(), 2);
    aceito(await salvarParametros('nara', [{ chave: 'base.cobrancasExcluidas', valor: 'DESD' }]));
    await leitura();
    assert.deepEqual([n(pos(1012)[0].VENCIDO), n(pos(1012)[0].DIAS_ATRASO)], [400, 6]);
    assert.equal(await titulos(), 1);
  });

  /* ── rotina ── */

  await teste('C-031 · RN-031: passos em ordem, erro repetido, pendente continua, trava', async () => {
    const passo = (id, p) => consultar('SELECT * FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ? AND PASSO = ?', id, p)[0];
    avancar(1);
    aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
    substituir('ccCobRotina', passoContado('t.cob', { ok: false, error: 'Régua falhou (teste).', pendentes: 0, execucoes: 1 }));
    substituir('ccCredRotina', passoContado('t.cred', { ok: true, pendentes: 1, execucoes: 1, processados: 3 }));
    const nLeitura = await execucoes(() => rodarCron());
    assert.ok(nLeitura <= 150, `execuções: ${nLeitura}`);
    const [s] = consultar("SELECT ID FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK' ORDER BY ID DESC LIMIT 1");
    assert.equal(contar(`SELECT COUNT(*) AS N FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ${s.ID}`), 0);
    const nProc = await execucoes(() => rodarCron());
    assert.ok(nProc <= 150, `execuções: ${nProc}`);
    assert.equal(passo(s.ID, 'ACESSOS').SITUACAO, 'OK');
    assert.deepEqual([passo(s.ID, 'REGUA').SITUACAO, passo(s.ID, 'REGUA').ERRO], ['ERRO', 'Régua falhou (teste).']);
    assert.deepEqual([passo(s.ID, 'CREDITO').SITUACAO, n(passo(s.ID, 'CREDITO').PENDENTES)], ['OK', 1]);
    // Passo de SF não publicada não grava linha (D-011); com a 005 o PUBLICO roda na mesma rodada.
    if (banco().runner.existe('ccPubRotina')) assert.equal(passo(s.ID, 'PUBLICO').SITUACAO, 'OK');
    else assert.equal(passo(s.ID, 'PUBLICO'), undefined);
    await rodarCron();
    assert.deepEqual([chamadas('t.cob'), chamadas('t.cred')], [2, 2]);
    banco().runner.remover('ccCobRotina');
    banco().runner.remover('ccCredRotina');
    await rodarCron();
    assert.deepEqual([chamadas('t.cob'), chamadas('t.cred')], [2, 2]);
    // Duas rodadas no mesmo minuto sem apagar a trava: a segunda não executa passo.
    substituir('ccCredRotina', passoContado('t.cred', { ok: true, pendentes: 1, execucoes: 1 }));
    banco().db.prepare("DELETE FROM CC_ESTADO WHERE CHAVE = 'rotina.trava'").run();
    await banco().runner.executar('ccRotina', {}, { cron: true });
    const segunda = await banco().runner.executar('ccRotina', {}, { cron: true });
    assert.equal(segunda.pulado, 'trava');
    assert.equal(chamadas('t.cred'), 3);
  });

  await teste('C-032: planos e faturamento mensal', async () => {
    const planos = await como('ana', () => linhas('ccBasePlanoListar'));
    assert.deepEqual(planos.map((p) => n(p.PRAZO_MEDIO)), [0, 30, 35]);
    const fat = await como('ana', () => linhas('ccBaseFaturamentoMes', { clienteId: idDe(1001) }));
    assert.deepEqual(fat.map((f) => [f.MES, f.BU_ID, n(f.VALOR)]), [['2026-09', 1, 700], ['2026-10', 1, 1100], ['2026-10', 2, 2700], ['2026-11', 3, 800]]);
    banco().db.prepare("DELETE FROM PCPLPAG WHERE CODPLPAG = '30'").run();
    await leitura();
    assert.equal((await como('ana', () => linhas('ccBasePlanoListar', { ativo: '1' }))).length, 2);
  });

  /* ── quadros e acessos ── */

  await teste('C-033 · pipeline (DT-38): quadros antes da primeira rotina, acessos no passo 8', async () => {
    const ate3 = await montarBanco({ quadros: QUADROS_TESTE, ate: 3 });
    try {
      const q = (sql) => ate3.db.prepare(sql).get().N;
      assert.equal(q("SELECT COUNT(*) AS N FROM CC_FASE WHERE QUADRO IN ('cobranca-teste', 'juridico-teste')"), 4);
      assert.equal(q('SELECT COUNT(*) AS N FROM CC_SINCRONIZACAO'), 0);
    } finally {
      descartarBanco(ate3);
    }
    const ate8 = await montarBanco({ seeds: SEEDS, quadros: QUADROS_TESTE, ate: 8 });
    try {
      const admins = ate8.db.prepare("SELECT SLUG, ADMINS_IDS FROM KB_BOARD WHERE SLUG IN ('cobranca-teste', 'juridico-teste')").all();
      assert.deepEqual(admins.map((b) => b.ADMINS_IDS), ['1,2,3', '1,2,3']);
      assert.equal(ate8.db.prepare('SELECT COUNT(*) AS N FROM CC_SINCRONIZACAO').get().N, 1);
    } finally {
      descartarBanco(ate8);
      usarBanco(banco());
      fixarRelogio(RELOGIO);
    }
  });

  await teste('C-033 · RN-032: semeadura dos quadros, acessos pelo cargo e ganchos', async () => {
    const quadro = banco().quadros.find((x) => x.slug === 'cobranca-teste');
    const [b] = consultar('SELECT CONFIG_JSON, ADMINS_IDS, ACESSO_JSON FROM KB_BOARD WHERE ID = ?', quadro.boardId);
    assert.deepEqual(JSON.parse(b.CONFIG_JSON), QUADROS_TESTE[0].config);
    assert.equal(contar(`SELECT COUNT(*) AS N FROM KB_FASE WHERE BOARD_ID = ${quadro.boardId}`), 2);
    assert.deepEqual(consultar(`SELECT CHAVE FROM KB_CAMPO WHERE BOARD_ID = ${quadro.boardId} ORDER BY CHAVE`).map((l) => l.CHAVE), ['abertura_1', 'codcli', 'etiquetas']);
    assert.equal(contar(`SELECT COUNT(*) AS N FROM KB_AUTOMACAO WHERE BOARD_ID = ${quadro.boardId}`), 1);
    assert.deepEqual(consultar("SELECT CHAVE, FINAL FROM CC_FASE WHERE QUADRO = 'cobranca-teste' ORDER BY ORDEM"), [{ CHAVE: 'abertura', FINAL: 0 }, { CHAVE: 'sucesso', FINAL: 1 }]);
    const cond = JSON.parse(consultar('SELECT CONDICAO_JSON FROM KB_FASE WHERE ID = ?', quadro.fases.abertura)[0].CONDICAO_JSON);
    assert.equal(cond.regras[0].valor, String(quadro.fases.sucesso));
    banco().db.prepare("UPDATE KB_FASE SET NOME = 'Abertura (gestor)' WHERE ID = ?").run(quadro.fases.abertura);
    banco().db.prepare("DELETE FROM KB_CAMPO WHERE BOARD_ID = ? AND CHAVE = 'abertura_1'").run(quadro.boardId);
    await semearQuadro(execSqlite(banco().db), QUADROS_TESTE, { quandoUtc: '2026-11-19T13:00:00' });
    assert.equal(consultar('SELECT NOME FROM KB_FASE WHERE ID = ?', quadro.fases.abertura)[0].NOME, 'Abertura (gestor)');
    assert.equal(contar(`SELECT COUNT(*) AS N FROM KB_CAMPO WHERE BOARD_ID = ${quadro.boardId} AND CHAVE = 'abertura_1'`), 1);

    // Acessos (o ACESSOS já rodou no pipeline).
    const todos = consultar('SELECT DISTINCT B.ADMINS_IDS FROM CC_FASE F JOIN KB_BOARD B ON B.ID = F.BOARD_ID');
    assert.deepEqual(todos.map((l) => l.ADMINS_IDS), ['1,2,3']);
    const pessoas = (slug) => JSON.parse(consultar('SELECT ACESSO_JSON FROM KB_BOARD WHERE SLUG = ?', slug)[0].ACESSO_JSON).pessoas;
    assert.deepEqual(pessoas('cobranca-teste'), { [U.sergio]: 'membro', [U.silvia]: 'membro', [U.julia]: 'leitor' });
    assert.deepEqual(pessoas('juridico-teste'), { [U.sergio]: 'membro', [U.silvia]: 'membro', [U.julia]: 'membro' });
    banco().db.prepare("UPDATE KB_BOARD SET ACESSO_JSON = ? WHERE SLUG = 'cobranca-teste'").run(JSON.stringify({ padrao: 'restrito', semEmail: true, pessoas: pessoas('cobranca-teste') }));
    const bruno = membro({ membroId: M.bruno, nome: 'Bruno Dias', userEmail: 'bruno@benenutri.local', cargo: 'SUPERVISOR', superiorId: M.gustavo });
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', bruno)));
    const deCarlos = consultar('SELECT ID FROM CC_CLIENTE WHERE AGENTE_ID = ?', M.carlos).map((l) => l.ID).join(',');
    aceito(await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: deCarlos, agenteId: M.silvia })));
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ membroId: M.carlos, nome: 'Carlos Melo', userEmail: 'carlos@benenutri.local', cargo: 'AGENTE', superiorId: M.silvia, ativo: 0 }))));
    await leitura();
    for (const slug of ['cobranca-teste', 'juridico-teste']) {
      assert.equal(pessoas(slug)[U.bruno], 'membro', slug);
      assert.equal(pessoas(slug)[U.carlos], undefined, slug);
    }
    assert.equal(JSON.parse(consultar("SELECT ACESSO_JSON FROM KB_BOARD WHERE SLUG = 'cobranca-teste'")[0].ACESSO_JSON).semEmail, true);
    await leitura();
    const [ultimo] = consultar("SELECT PROCESSADOS FROM CC_ROTINA_PASSO WHERE PASSO = 'ACESSOS' ORDER BY ID DESC LIMIT 1");
    assert.equal(n(ultimo.PROCESSADOS), 0);

    // Ganchos.
    const excluir = (await linhas('ccPodeExcluir'))[0];
    assert.equal(n(excluir.PODE), 0);
    assert.match(excluir.MOTIVO, /^Casos não são excluídos/);
    const mover = (usuarioId) => linhas('ccPodeMover', { cardId: '0', faseId: String(quadro.fases.sucesso), usuarioId: String(usuarioId) });
    const r = await nasDuasSessoes(async () => {
      const [v] = await mover(U.visitante);
      const [a] = await mover(U.ana);
      return [n(v.PODE), v.MOTIVO, n(a.PODE)];
    });
    assert.deepEqual([r[0], r[2]], [0, 1]);
    assert.match(r[1], /sem vínculo/);
    const modulos = [
      { QUADROS: [{ slug: 'cobranca-teste' }], gancho: (s) => (s === 'cobranca-teste' ? "        WHEN 1 = 1 THEN 'recusa da 004'" : '') },
      { gancho: (s) => (s === 'cobranca-teste' ? "        WHEN 1 = 1 THEN 'recusa da 005'" : '') },
    ];
    const code = montarPodeMover(trechosDosGanchos(modulos));
    assert.doesNotMatch(code, /juridico-teste|cobranca-privada/);
    substituir('ccPodeMover', { type: 'SQL', code });
    assert.equal((await mover(U.ana))[0].MOTIVO, 'recusa da 004');
  });

  await teste('C-034: conferência da equipe e dos campos do Winthor', async () => {
    aceito(await como('nara', () => chamar('ccBaseMembroSalvar', membro({ nome: 'Paulo Souza', userEmail: 'paulo@benenutri.local', cargo: 'AGENTE', superiorId: M.sergio }))));
    const c = aceito(await como('gustavo', () => chamar('ccBaseEquipeConferir')));
    assert.deepEqual([c.semUsuario.length, c.semSuperior.length, c.ciclos.length, c.clientesSemAgente], [1, 0, 0, 2]);
    recusado(await como('ana', () => chamar('ccBaseEquipeConferir')));
    const w = aceito(await como('nara', () => chamar('ccBaseWinthorDescobrir', { tabelas: '' })));
    const prest = w.tabelas.find((t) => t.tabela === 'PCPREST');
    assert.ok(prest.colunas.length > 0);
    assert.deepEqual(prest.ausentes, []);
    recusado(await como('ana', () => chamar('ccBaseWinthorDescobrir', { tabelas: '' })));
  });

  /* ── relógio, orçamento, Winthor só leitura ── */

  await teste('RN-026: relógio único', async () => {
    fixarRelogio('2026-11-19T10:00:00');
    assert.deepEqual([hoje(), agora()], ['2026-11-19', '2026-11-19T10:00:00']);
    const antes = process.env.CC_AGORA;
    delete process.env.CC_AGORA;
    try {
      assert.match(agora(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      assert.equal(hoje(), agora().slice(0, 10));
    } finally {
      process.env.CC_AGORA = antes;
    }
    assert.equal(somarMeses('2026-11-30', 3), '2027-02-28');
  });

  await teste('RNF-006: abrir a ficha cabe em 6 execuções', async () => {
    const c = idDe(1001);
    const total = await execucoes(() => como('ana', async () => {
      await chamar('ccBaseClienteFicha', { clienteId: c });
      await chamar('ccBaseTitulosAbertos', { clienteId: c });
      await linhas('ccBaseRecebimentoListar', { clienteId: c });
      await linhas('ccBaseRecebimentoTotal', { clienteId: c });
      await linhas('ccBaseSincronizacaoStatus');
    }));
    assert.ok(total <= 6, `execuções: ${total}`);
  });

  await teste('RNF-005: Winthor só leitura', async () => {
    const proibido = /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE)\b/i;
    for (const [nome, sql] of Object.entries(W).filter(([, v]) => typeof v === 'string')) assert.doesNotMatch(sql, proibido, nome);
    for (const [nome, d] of banco().runner.definicoes()) if (d.jdbcId) assert.doesNotMatch(String(d.code), proibido, nome);
  });
}
