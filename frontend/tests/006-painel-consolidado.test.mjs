// Regra de tela da 006 (tasks T-140 a T-149). Funções puras de src/lib/painel-consolidado/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { indice, rotuloPct, naMeta, indicadoresExecutivos, resumoDaSerie } from '../src/lib/painel-consolidado/calculo.ts';
import { destinosRollRate } from '../src/lib/painel-consolidado/rollRate.ts';
import { somarAcoesNaArvore } from '../src/lib/painel-consolidado/equipe.ts';
import {
  blocosDoCargo, estadoDoBloco, avisosDeTopo, mesesOferecidos, atencaoDosResumos, funilJuridicoPublico, juntarSinais, textoDoSinal,
} from '../src/lib/painel-consolidado/visao.ts';
import { modulo } from '../src/modules/006-painel-consolidado/index.ts';

const METAS = {
  'meta.inadPct': 5, 'meta.vencido90Pct': 2, 'meta.pddPct': 3, 'meta.recuperacaoPct': 80, 'meta.conversaoPct': 60,
  'meta.promessaPct': 70, 'meta.tempoDecisaoDias': 9, 'meta.slaPct': 85, 'meta.aprovacaoMinPct': 60, 'meta.aprovacaoMaxPct': 85,
};

test('RN-002: índice de inadimplência', () => {
  assert.equal(indice(24000, 94000), 0.2553);
  assert.equal(indice(0, 0), null);
  assert.equal(rotuloPct(null), '—');
  assert.equal(rotuloPct(25.53), '25,53%');
});

test('RN-013: estado da meta', () => {
  assert.equal(naMeta(25.53, { max: 5 }), false);
  assert.equal(naMeta(8.67, { max: 9 }), true);
  assert.equal(naMeta(166.67, { min: 80 }), true);
  assert.equal(naMeta(66.67, { min: 60, max: 85 }), true);
  assert.equal(naMeta(86, { min: 60, max: 85 }), false);
  assert.equal(naMeta(null, { max: 5 }), null);
});

test('C-012: destinos do roll rate', () => {
  const m = (FAIXA_DE, FAIXA_PARA, VALOR) => ({ FAIXA_DE, FAIXA_PARA, VALOR, CLIENTES: 1 });
  const { faixas } = destinosRollRate([
    m(0, 0, 24000), m(0, 1, 15000), m(1, -1, 3000), m(1, 2, 4000), m(1, 6, 2000),
    m(2, 1, 3000), m(2, 3, 5000), m(3, 4, 38000), m(4, 5, 4000),
  ]);
  const [aVencer, f1, f2, f3, f4] = faixas;
  assert.deepEqual([aVencer.saldo, aVencer.manteve, aVencer.piorou, aVencer.taxa], [39000, 24000, 15000, 38.46]);
  assert.deepEqual([f1.saldo, f1.pagou, f1.piorou, f1.taxa], [9000, 3000, 6000, 66.67]);
  assert.deepEqual([f2.melhorou, f2.piorou, f2.taxa], [3000, 5000, 62.5]);
  assert.deepEqual([f3.piorou, f4.piorou], [38000, 4000]);
});

test('C-023: estados do bloco', () => {
  assert.equal(estadoDoBloco({ instalado: false, erro: 'x' }).tipo, 'NAO_INSTALADO');
  assert.equal(estadoDoBloco({ instalado: false }).texto, 'Módulo não instalado.');
  assert.equal(estadoDoBloco({ erro: 'Falhou.' }).tipo, 'ERRO');
  assert.equal(estadoDoBloco({ origem: 'SEM', mes: '2026-08' }).texto, 'Sem dado para 08/2026.');
  assert.equal(estadoDoBloco({ origem: 'ATUAL', vazio: true }).texto, 'Nenhum cliente no recorte.');
  assert.equal(estadoDoBloco({ origem: 'ATUAL', vazio: false }), null);
  const avisos = avisosDeTopo({ sincronizacao: { em: '2026-11-14T10:00:00', atrasada: true }, fotoPendente: '2026-11' });
  assert.deepEqual(avisos.map((a) => a.tipo), ['LEITURA_ATRASADA', 'FOTO_PENDENTE']);
  assert.match(avisos[0].texto, /desde 10:00/);
  assert.match(avisos[1].texto, /11\/2026 pendente/);
  assert.deepEqual(avisosDeTopo({ sincronizacao: { em: '2026-11-14T10:00:00', atrasada: false }, fotoPendente: null }), []);
});

test('C-024: ações atrasadas pela árvore', () => {
  const eq = (MEMBRO_ID, SUPERIOR_ID) => ({ MEMBRO_ID, SUPERIOR_ID });
  // sergio (3) supervisiona ana (5), bruno (6) e rita (11).
  const soma = somarAcoesNaArvore([eq(3, 2), eq(5, 3), eq(6, 3), eq(11, 3)], [
    { AGENTE_ID: 5, ATRASADAS: 2 }, { AGENTE_ID: 6, ATRASADAS: 4 }, { AGENTE_ID: 7, ATRASADAS: 9 },
  ]);
  assert.equal(soma.get(3), 6);
  assert.equal(soma.get(5), 2);
  assert.equal(soma.get(11), 0);
  assert.equal(soma.has(7), false);
  assert.equal(somarAcoesNaArvore([eq(3, 2)], null).get(3), 0);
});

test('RN-015: blocos de cada cargo', () => {
  const m = (cargo, nivel, admin = false, veTudo = false) => ({ cargo, nivel, admin, veTudo });
  const agente = blocosDoCargo(m('AGENTE', 1));
  const analista = blocosDoCargo(m('ANALISTA', 1));
  for (const b of [agente, analista]) assert.deepEqual([b.acesso, b.equipe, b.fechamento, b.comparacao, b.escopo], [true, false, false, false, 'carteira']);
  const sup = blocosDoCargo(m('SUPERVISOR', 2));
  assert.deepEqual([sup.equipe, sup.fechamento, sup.comparacao, sup.escopo], [true, false, true, 'equipe']);
  for (const b of [blocosDoCargo(m('GERENTE', 3, false, true)), blocosDoCargo(m('DIRETORIA', 5, false, true)), blocosDoCargo(m('AGENTE', 1, true, true))]) {
    assert.deepEqual([b.acesso, b.equipe, b.fechamento, b.comparacao, b.escopo], [true, true, true, true, 'tudo']);
  }
  const jur = blocosDoCargo(m('JURIDICO', 0));
  assert.deepEqual([jur.acesso, jur.equipe, jur.fechamento], [false, false, false]);
  assert.equal(blocosDoCargo(null).acesso, false);
  // Menu: o Jurídico não vê o item.
  const item = modulo.menu[0];
  assert.equal(item.caminho, '/painel');
  assert.equal(item.pode(m('JURIDICO', 0)), false);
  assert.equal(item.pode(m('AGENTE', 1)), true);
});

test('C-015: doze indicadores', () => {
  // Banco A, novembro (gustavo): posição, linha de novembro da série e crédito.
  const lista = indicadoresExecutivos({
    posicao: { total: 94000, vencido: 24000, vencido90: 12000, pdd: 10270, atrasoMedioDias: 86.79, metas: METAS },
    serie: { MES: '2026-11', TOTAL: 94000, VENCIDO: 24000, VENCIDO_INICIAL: 28000, GERADA: 3000, RECUPERADO: 5000, PROMESSAS_CUMPRIDAS: 0, PROMESSAS_QUEBRADAS: 0 },
    serieCredito: null,
    credito: { limite: 176300, utilizado: 94000 },
  });
  assert.equal(lista.length, 12);
  const por = Object.fromEntries(lista.map((i) => [i.chave, i]));
  assert.deepEqual([por.inadimplencia.valor, por.inadimplencia.estado], [25.53, 'FORA']);
  assert.deepEqual([por.vencido90.valor, por.vencido90.estado], [12.77, 'FORA']);
  assert.deepEqual([por.pdd.valor, por.pdd.estado], [10.93, 'FORA']);
  assert.deepEqual([por.recuperacao.valor, por.recuperacao.estado], [166.67, 'NA_META']);
  assert.deepEqual([por.conversao.valor, por.conversao.estado], [16.13, 'FORA']);
  assert.deepEqual([por.exposicao.valor, por.exposicao.uso, por.exposicao.estado], [94000, 53.32, 'SEM_META']);
  assert.deepEqual([por.atraso.valor, por.atraso.estado], [86.79, 'SEM_META']);
  assert.equal(por.concedido.estado, 'SEM_META');
  assert.equal(lista.filter((i) => i.estado === 'SEM_META').length, 3);
  assert.deepEqual(['CONCESSAO', 'CARTEIRA', 'COBRANCA'].map((g) => lista.filter((i) => i.grupo === g).length), [4, 4, 4]);
  // Crédito: 3 decididas, 2 aprovadas, 2 no prazo, 8,67 dias.
  const comCredito = indicadoresExecutivos({
    posicao: { total: 0, metas: METAS }, serie: null,
    serieCredito: { DECIDIDAS: 3, APROVADAS: 2, NO_PRAZO: 2, TEMPO_MEDIO_DIAS: 8.67, LIMITE_CONCEDIDO: 50000 }, credito: null,
  });
  const c = Object.fromEntries(comCredito.map((i) => [i.chave, i]));
  assert.deepEqual([c.tempoAnalise.estado, c.sla.valor, c.sla.estado, c.aprovacao.valor, c.aprovacao.estado], ['NA_META', 66.67, 'FORA', 66.67, 'NA_META']);
  assert.equal(c.inadimplencia.estado, 'SEM_VALOR');
});

test('RF-001: meses oferecidos', () => {
  const meses = mesesOferecidos('2026-11', 14);
  assert.equal(meses[0].value, '2026-11');
  assert.equal(meses[0].label, 'Novembro de 2026');
  assert.equal(meses.at(-1).value, '2025-10');
  assert.ok(meses.every((m) => m.value <= '2026-11'));
  assert.equal(new Set(meses.map((m) => m.value)).size, 14);
});

test('C-016: resumo da série', () => {
  const r = resumoDaSerie([
    { mes: '2026-08', valor: 36.67, origem: 'MANUAL' }, { mes: '2026-09', valor: 46.3, origem: 'FOTO' },
    { mes: '2026-10', valor: 28.57, origem: 'FOTO' }, { mes: '2026-11', valor: 25.53, origem: 'ATUAL' },
    { mes: '2026-07', valor: null, origem: '' },
  ].sort((a, b) => (a.mes < b.mes ? -1 : 1)), { max: 5 });
  assert.deepEqual([r.ultimo, r.ultimoNaMeta, r.media, r.naMeta, r.meses], [25.53, false, 34.27, 0, 4]);
  assert.equal(r.rotulos['2026-08'], 'Ago (manual)');
  assert.equal(r.rotulos['2026-11'], 'Nov (parcial)');
  assert.equal(r.rotulos['2026-09'], 'Set');
});

test('C-014, C-023: pontos de atenção e funil dos resumos', () => {
  const agenda = [{ PROMESSAS_VENCIDAS: 1, ATRASADAS: 5 }, { PROMESSAS_VENCIDAS: 2, ATRASADAS: 0 }];
  const jur = {
    SEM_ANDAMENTO: 1, PRAZOS_VENCENDO: 0, AJUIZAR: 4, VALOR_AJUIZAR: 175000, ATIVOS: 9, VALOR_ATIVOS: 495000, ACORDOS_A_RECEBER: 0,
    VALOR_ACORDOS_A_RECEBER: 0, ACORDOS_PARCELA_VENCIDA: 0, VALOR_PARCELA_VENCIDA: 0, RECUPERADO_MES: 0, CUSTO_MES: 1200,
    RECUPERADO_ANO: 30000, DESVIOS_PRAZO: 2, DESVIOS_CRITICOS: 1,
  };
  const pub = {
    PAGAMENTO_VENCIDO: 3, VALOR_PAGAMENTO_VENCIDO: 85000, ACIMA_2M: 6, VALOR_ACIMA_2M: 152000, CERTIDOES_VENCENDO: 2, CERTIDOES_VENCIDAS: 1,
    NFS_ABERTAS: 25, VALOR_ABERTO: 604000, SEM_ATESTO: 22, VALOR_SEM_ATESTO: 519000, AGUARDANDO_LIQUIDACAO: 0, VALOR_AGUARDANDO_LIQUIDACAO: 0,
    LIQUIDADAS_SEM_PAGAMENTO: 3, VALOR_LIQUIDADAS_SEM_PAGAMENTO: 85000, RECEBIDO_MES: 7000,
  };
  const sinais = atencaoDosResumos(agenda, jur, pub);
  const q = Object.fromEntries(sinais.map((s) => [s.tipo, s.quantidade]));
  assert.deepEqual(q, { PROMESSA_VENCIDA: 3, ACAO_ATRASADA: 5, JURIDICO_SEM_ANDAMENTO: 1, NF_PAGAMENTO_VENCIDO: 3, NF_ACIMA_2M: 6, CERTIDAO: 3 });
  assert.ok(sinais.every((s) => s.quantidade > 0));
  assert.equal(sinais.find((s) => s.tipo === 'NF_ACIMA_2M').valor, 152000);
  const semPub = atencaoDosResumos(agenda, jur, null).map((s) => s.tipo);
  assert.ok(!semPub.some((t) => t.startsWith('NF_') || t === 'CERTIDAO'));
  assert.deepEqual(atencaoDosResumos(null, null, null), []);
  const juntos = juntarSinais([{ tipo: 'BAIXA_PENDENTE', texto: '', quantidade: 1, valor: 10, gravidade: 'MEDIA' }, { tipo: 'X', texto: '', quantidade: 0, valor: null, gravidade: 'ALTA' }], sinais);
  assert.equal(juntos[0].gravidade, 'ALTA');
  assert.ok(juntos.every((s) => s.quantidade > 0));

  const f = funilJuridicoPublico(jur, pub);
  assert.deepEqual(f.juridico.etapas.map((e) => e.chave),
    ['AJUIZAR', 'ATIVOS', 'ACORDOS_A_RECEBER', 'ACORDOS_PARCELA_VENCIDA', 'RECUPERADO_MES', 'CUSTO_MES', 'RECUPERADO_ANO']);
  assert.deepEqual([f.juridico.etapas[0].quantidade, f.juridico.etapas[0].valor], [4, 175000]);
  assert.deepEqual([f.juridico.etapas[6].quantidade, f.juridico.etapas[6].valor], [null, 30000]);
  assert.deepEqual([f.juridico.desvios, f.juridico.criticos], [2, 1]);
  assert.deepEqual(f.publico.etapas.map((e) => e.chave),
    ['NFS_ABERTAS', 'SEM_ATESTO', 'AGUARDANDO_LIQUIDACAO', 'LIQUIDADAS_SEM_PAGAMENTO', 'PAGAMENTO_VENCIDO', 'RECEBIDO_MES']);
  assert.deepEqual([f.publico.etapas[1].quantidade, f.publico.etapas[1].valor], [22, 519000]);
  assert.deepEqual([f.publico.etapas[5].quantidade, f.publico.etapas[5].valor], [null, 7000]);
  assert.equal(funilJuridicoPublico(null, pub).juridico, null);
  assert.equal(funilJuridicoPublico(jur, null).publico, null);
});

test('F5 tropeço 16: sinal com quantidade 1 no singular', () => {
  assert.equal(textoDoSinal({ tipo: 'PEDIDO_RETIDO', texto: '', quantidade: 1, valor: null, gravidade: 'ALTA' }), '1 pedido retido');
  assert.equal(textoDoSinal({ tipo: 'PEDIDO_RETIDO', texto: '', quantidade: 2, valor: null, gravidade: 'ALTA' }), '2 pedidos retidos');
  assert.equal(textoDoSinal({ tipo: 'JURIDICO_PRAZO', texto: 'processos com prazo vencendo', quantidade: 1, valor: null, gravidade: 'MEDIA' }), '1 processo com prazo vencendo');
});
