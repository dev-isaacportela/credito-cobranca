// Regras puras da B1 (node --test): dias úteis, tempo, posição, setor, modelo, parâmetros e equipe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  feriadosNacionais, pascoa, somarDiasUteis, ehDiaUtil, motivoNaoUtil, diasUteisEntre, proximoUtil, FONTE as FONTE_DU,
} from '../lib/dias-uteis.mjs';
import { agora, hoje, somarMeses } from '../lib/tempo.mjs';
import { calcularPosicao, ratear } from '../lib/base/posicao.mjs';
import { setorDoRamo, esferaDoRamo } from '../lib/base/setor.mjs';
import { renderizar, camposDoTexto, camposDesconhecidos, formatarDinheiro, formatarData, formatarDocumento, valoresComuns } from '../lib/base/modelo.mjs';
import { nomeChave, nivelDoCargo, conferirEquipe } from '../lib/base/equipe.mjs';
import { efetivos, validarValor, fundir, carregarArquivosDeParametros } from '../lib/parametros.mjs';
import { montarPodeMover, trechosDosGanchos } from '../lib/quadros.mjs';

const NAC_2026 = feriadosNacionais(2026);
const DF = [...NAC_2026, { data: '2026-11-30', nome: 'Dia do Evangélico' }];

test('C-021 · RN-019/020: dias úteis com Páscoa e feriados móveis', () => {
  assert.equal(pascoa(2026), '2026-04-05');
  assert.equal(NAC_2026.length, 13);
  const datas = NAC_2026.map((f) => f.data);
  for (const d of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-11-20']) assert.ok(datas.includes(d), d);
  assert.equal(somarDiasUteis('2026-11-13', 1, NAC_2026), '2026-11-16');
  assert.equal(somarDiasUteis('2026-11-19', 1, NAC_2026), '2026-11-23');
  assert.equal(ehDiaUtil('2026-02-17', NAC_2026), false);
  assert.equal(motivoNaoUtil('2026-02-17', NAC_2026), 'Carnaval');
  assert.equal(motivoNaoUtil('2026-11-21', NAC_2026), 'sábado', 'minúscula no meio da frase');
  assert.equal(motivoNaoUtil('2026-11-22', NAC_2026), 'domingo');
  assert.equal(somarDiasUteis('2026-11-15', 0, NAC_2026), '2026-11-16');
  assert.equal(ehDiaUtil('2026-11-30', DF), false);
  assert.equal(ehDiaUtil('2026-11-30', NAC_2026), true, 'útil em GO');
  const semCarnaval = NAC_2026.filter((f) => f.data !== '2026-02-17');
  assert.equal(ehDiaUtil('2026-02-17', semCarnaval), true, 'feriado removido some da conta');
  assert.equal(somarDiasUteis('2026-11-23', -1, NAC_2026), '2026-11-19');
  assert.equal(diasUteisEntre('2026-11-19', '2026-11-24', NAC_2026), 2);
  assert.equal(proximoUtil('2026-11-21', NAC_2026), '2026-11-23');
  // FONTE autocontida: as funções coladas numa SF funcionam sozinhas.
  const f = new Function(`${FONTE_DU}\nreturn somarDiasUteis('2026-11-19', 7, feriadosNacionais(2026));`);
  assert.equal(f(), '2026-12-01');
});

test('RN-026: hoje de Brasília e soma de meses', () => {
  const antes = process.env.CC_AGORA;
  delete process.env.CC_AGORA;
  try {
    assert.equal(hoje(Date.parse('2026-11-15T02:30:00Z')), '2026-11-14');
    assert.equal(hoje(Date.parse('2026-11-15T03:00:00Z')), '2026-11-15');
    assert.equal(agora(Date.parse('2026-11-15T03:00:00Z')), '2026-11-15T00:00:00');
    process.env.CC_AGORA = '2026-11-19T10:00:00';
    assert.equal(agora(), '2026-11-19T10:00:00');
    assert.equal(hoje(), '2026-11-19');
  } finally {
    if (antes === undefined) delete process.env.CC_AGORA; else process.env.CC_AGORA = antes;
  }
  assert.equal(somarMeses('2026-11-30', 3), '2027-02-28');
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
});

test('C-001: posição do 1001 (faixas, 7 dias úteis, rateio por BU, composição)', () => {
  const hojeD = '2026-11-19';
  const t = (n, prest, valor, venc, extra = {}) => ({ CODCLI: 1001, NUMTRANSVENDA: 100100 + n, PREST: prest, DUPLIC: 100100 + n, VALOR: valor, VPAGO: 0, DTVENC: venc, CODCOB: 'BK', ...extra });
  const titulos = [
    t(1, '1', 1000, '2026-11-07'), t(2, '1', 500, '2026-11-16'), t(3, '1', 2000, '2026-11-24'), t(3, '2', 300, '2026-11-24'),
    t(4, '1', 800, '2026-12-09'), t(5, '1', 700, '2026-10-20', { DTPAG: '2026-10-22', VPAGO: 700 }), t(6, '1', 1200, '2026-10-01', { DTCANCEL: '2026-09-10' }),
  ];
  const itens = [
    { NUMTRANSVENDA: 100101, CODEPTO: 10, VALOR: 600 }, { NUMTRANSVENDA: 100101, CODEPTO: 20, VALOR: 400 },
    { NUMTRANSVENDA: 100102, CODEPTO: 10, VALOR: 500 }, { NUMTRANSVENDA: 100103, CODEPTO: 20, VALOR: 2300 },
    { NUMTRANSVENDA: 100104, CODEPTO: 30, VALOR: 800 },
  ];
  const ctx = {
    hoje: hojeD, feriados: NAC_2026, buDoDepto: { 10: 1, 20: 2, 30: 3, 40: 4 }, carteiraDaBu: { 1: 'PRIVADA', 2: 'PRIVADA', 3: 'PRIVADA', 4: 'ESTETICA' },
    nomeDaBu: { 1: 'Nutrição', 2: 'Enfermagem', 3: 'Medicamento', 4: 'Estética' }, publicos: [], cobrancasExcluidas: 'DESD',
    vencimentoDiaNaoUtil: {}, comprasJanelaDias: 90,
    cadastro: { 1001: { LIMITE: 10000, COMPRAS_QTD: 5, COMPRAS_VALOR: 5300, SOMA_VALOR_PRAZO: 5300 * 30, ULTIMA_COMPRA: '2026-11-09' } },
  };
  const { linhas, clientes: [c] } = calcularPosicao(titulos, itens, ctx);
  const p = c.total;
  assert.equal(p.VENCIDO, 1500);
  assert.equal(p.A_VENCER, 3100);
  assert.equal(p.DIAS_ATRASO, 12);
  assert.equal(p.VENC_MAIS_ANTIGO, '2026-11-07');
  assert.equal(p.PROX_VENC, '2026-11-24');
  assert.equal(p.PROX_VENC_VALOR, 2300);
  assert.equal(p.A_VENCER_7DU, 2300, 'o 800 de dia(20) fica fora');
  assert.equal(p.TITULOS_ABERTOS, 5);
  assert.equal(p.TITULOS_VENCIDOS, 2);
  assert.equal(p.VDIAS, 13500);
  assert.equal(p.UTILIZADO, 4600);
  assert.equal(p.DISPONIVEL, 5400);
  assert.equal(p.COMPRA_MEDIA_MENSAL, 1766.67);
  assert.equal(p.PRAZO_MEDIO_DIAS, 30);
  assert.equal(linhas.length, 5);
  assert.deepEqual(c.porBu.map((b) => [b.BU_ID, b.VENCIDO + b.A_VENCER]), [[1, 1100], [2, 2700], [3, 800]]);
  assert.equal(c.porCarteira.length, 1);
  assert.equal(c.porCarteira[0].COMPOSICAO_BU, 'Enfermagem 59% · Nutrição 24% · Medicamento 17%');
  // Cobrança excluída some; regra de dia não útil desloca o vencimento.
  const desd = calcularPosicao([t(7, '1', 300, '2026-11-10', { CODCOB: 'DESD' })], [], ctx).clientes[0].total;
  assert.equal(desd.VENCIDO, 0);
  const sabado = calcularPosicao([t(8, '1', 100, '2026-11-21')], [], { ...ctx, vencimentoDiaNaoUtil: { PRIVADA: 'PROXIMO_UTIL' } });
  assert.equal(sabado.linhas[0].VENCIMENTO_EFETIVO, '2026-11-23');
});

test('RN-028: rateio com a sobra na última parte', () => {
  assert.deepEqual(ratear(10000, [1, 1, 1]), [3333, 3333, 3334]);
  assert.deepEqual(ratear(1000, [60, 40]), [600, 400]);
  assert.deepEqual(ratear(500, []), [500]);
});

test('RN-018: setor e esfera pelo ramo', () => {
  assert.equal(setorDoRamo(13, 'ORGAO PUBLICO MUNICIPAL', '11,12,13,14,15', 'ORGAO PUBLICO'), 'PUBLICO');
  assert.equal(setorDoRamo(20, 'ÓRGÃO PÚBLICO AUTARQUIA', '11,12,13', 'ORGAO PUBLICO'), 'PUBLICO', 'pelo prefixo, sem acento');
  assert.equal(setorDoRamo(2, 'CLINICA', '11,12,13', 'ORGAO PUBLICO'), 'PRIVADO');
  assert.equal(setorDoRamo(20, 'ORGAO PUBLICO AUTARQUIA', '11,12,13', ''), 'PRIVADO');
  assert.equal(setorDoRamo(13, 'X', '', ''), 'PRIVADO');
  assert.equal(esferaDoRamo(13, '13=MUNICIPAL,12=ESTADUAL'), 'MUNICIPAL');
  assert.equal(esferaDoRamo(2, '13=MUNICIPAL'), null);
  assert.equal(esferaDoRamo(null, '13=MUNICIPAL'), null);
});

test('RN-022/023: modelo renderizado com campos comuns e extras', () => {
  assert.equal(formatarDinheiro(1500), 'R$ 1.500,00');
  assert.equal(formatarDinheiro(1234567.891), 'R$ 1.234.567,89');
  assert.equal(formatarData('2026-11-07'), '07/11/2026');
  assert.equal(formatarDocumento('12345678000190'), '12.345.678/0001-90');
  assert.equal(formatarDocumento('12345678901'), '123.456.789-01');
  const corpo = 'Prezado [CLIENTE], o valor de [VALOR_VENCIDO] venceu em [VENCIMENTO_MAIS_ANTIGO]. Prazo: [DATA_LIMITE]. [AGENTE]';
  assert.deepEqual(camposDoTexto(corpo), ['CLIENTE', 'VALOR_VENCIDO', 'VENCIMENTO_MAIS_ANTIGO', 'DATA_LIMITE', 'AGENTE']);
  assert.deepEqual(camposDesconhecidos(corpo, ''), ['DATA_LIMITE']);
  assert.deepEqual(camposDesconhecidos(corpo, 'DATA_LIMITE'), []);
  const valores = valoresComuns({
    cliente: { NOME: 'HOSPITAL SAO LUCAS LTDA', CODCLI: 1001, DOCUMENTO: '12345678000190' },
    posicao: { VENCIDO: 1500, DIAS_ATRASO: 12, VENC_MAIS_ANTIGO: '2026-11-07' }, contato: { NOME: 'Marta' }, agente: 'Ana Costa', hoje: '2026-11-19',
  });
  const r = renderizar({ assunto: '[RAZAO_SOCIAL]', corpo }, valores);
  assert.equal(r.assunto, 'HOSPITAL SAO LUCAS LTDA');
  assert.equal(r.corpo, 'Prezado Marta, o valor de R$ 1.500,00 venceu em 07/11/2026. Prazo: [DATA_LIMITE]. Ana Costa');
  assert.deepEqual(r.faltando, ['DATA_LIMITE']);
  assert.deepEqual(renderizar({ assunto: '', corpo }, { ...valores, DATA_LIMITE: '30/11/2026' }).faltando, []);
});

test('RN-016 · 03: catálogo de 38 chaves, efetivos por carteira e vigência, validação', async () => {
  const { definicoes, validacoes } = fundir(await carregarArquivosDeParametros());
  // Só o catálogo da 001: as outras specs acrescentam as suas chaves e grupos.
  assert.equal(definicoes.filter((d) => d.specDona === '001').length, 38);
  for (const g of ['base', 'com', 'crit', 'pdd']) assert.equal(typeof validacoes[g], 'function', g);
  const defs = [{ CHAVE: 'a.x', TIPO: 'INTEIRO', COM_VIGENCIA: 0 }, { CHAVE: 'a.v', TIPO: 'PERCENTUAL', COM_VIGENCIA: 1 }];
  const linhas = [
    { CHAVE: 'a.x', CARTEIRA: '', VALOR: '30', VIGENCIA_INICIO: '2000-01-01' },
    { CHAVE: 'a.x', CARTEIRA: 'ESTETICA', VALOR: null, VIGENCIA_INICIO: '2000-01-01' },
    { CHAVE: 'a.x', CARTEIRA: 'PUBLICA', VALOR: '60', VIGENCIA_INICIO: '2000-01-01' },
    { CHAVE: 'a.v', CARTEIRA: '', VALOR: '1', VIGENCIA_INICIO: '2000-01-01' },
    { CHAVE: 'a.v', CARTEIRA: '', VALOR: '2', VIGENCIA_INICIO: '2026-12-01' },
  ];
  assert.deepEqual(efetivos(defs, linhas, 'ESTETICA', '2026-11-19', '2026-11-19'), { 'a.x': 30, 'a.v': 1 }, 'carteira nula herda');
  assert.deepEqual(efetivos(defs, linhas, 'PUBLICA', '2026-12-05', '2026-11-19'), { 'a.x': 60, 'a.v': 2 }, 'vigência lida na data');
  const pct = definicoes.find((d) => d.tipo === 'PERCENTUAL');
  assert.match(String(validarValor(pct, '150')), /0 a 100/);
  assert.equal(validarValor(pct, '50'), '');
});

test('RN-011: equipe — chave do nome, nível e conferência', () => {
  assert.equal(nomeChave('  Sérgio   Nunes '), 'sergio nunes');
  assert.equal(nivelDoCargo('GERENTE'), 3);
  assert.equal(nivelDoCargo('JURIDICO'), 0);
  assert.equal(nivelDoCargo('ESTAGIARIO'), null);
  const r = conferirEquipe([
    { ID: 1, NOME: 'Diana', CARGO: 'DIRETORIA', SUPERIOR_ID: null, CAMINHO: '/1/', ATIVO: 1, TEM_USUARIO: 1 },
    { ID: 2, NOME: 'Gustavo', CARGO: 'GERENTE', SUPERIOR_ID: 1, CAMINHO: '/1/2/', ATIVO: 1, TEM_USUARIO: 0 },
    { ID: 5, NOME: 'Ana', CARGO: 'AGENTE', SUPERIOR_ID: 2, CAMINHO: '/1/5/', ATIVO: 1, TEM_USUARIO: 1 },
  ]);
  assert.deepEqual(r.semUsuario.map((m) => m.id), [2]);
  assert.deepEqual(r.caminhoInconsistente.map((m) => m.id), [5]);
  assert.deepEqual(r.ciclos, []);
});

test('01 §14: ccPodeMover montado só com os trechos não vazios', () => {
  const modulos = [
    { spec: '004', QUADROS: [], gancho: (slug) => (slug === 'concessao-publica' ? "        WHEN 1 = 1 THEN 'da 004'" : '') },
    { spec: '005', gancho: (slug) => (slug === 'concessao-publica' ? "        WHEN 1 = 1 THEN 'da 005'" : '') },
  ];
  const trechos = trechosDosGanchos(modulos);
  assert.deepEqual(trechos.map((t) => t.slug), ['concessao-publica']);
  assert.ok(trechos[0].clausulas.indexOf('da 004') < trechos[0].clausulas.indexOf('da 005'), '004 antes de 005');
  const sql = montarPodeMover(trechos);
  assert.match(sql, /WHEN PARA\.QUADRO = 'concessao-publica' THEN \(CASE/);
  assert.doesNotMatch(montarPodeMover([]), /PARA\.QUADRO =/);
});

test('F5 C-04: toda automação de quadro tem nome legível (é o que o card mostra ao mover)', async () => {
  const { carregarArquivosDeQuadros } = await import('../lib/quadros.mjs');
  const automacoes = (await carregarArquivosDeQuadros()).flatMap((m) => (m.QUADROS || []).flatMap((q) => q.automacoes || []));
  assert.ok(automacoes.length > 0);
  for (const a of automacoes) {
    assert.ok(a.nome, `automação sem nome: ${a.gatilho} ${a.faseChave}`);
    assert.doesNotMatch(a.nome, /_|→/, a.nome);
  }
});
