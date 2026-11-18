// Regra pura da 005 (node --test), bloco A do plan: motor do órgão (RN-009 a RN-016, C-008 a C-011, C-004),
// prazos e régua da NF (RN-019 a RN-030, C-015, C-016, C-020, C-022, C-028), certidões e contratos (RN-036, RN-037).
// As mesmas funções entram no corpo das SFs por FONTE. Variações que mudariam o seed ficam aqui (validador C-4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motorOrgao, podeAprovar, capacidadeSugerida, fimMandato } from '../lib/setor-publico/motor.mjs';
import {
  REGRAS_INICIAIS, regraDaNf, limitePequenoValor, prazosNf, mais2Meses, situacaoNf, validarDatas, reguaNf, passoAtual, etapaOrgao, tipoMensagem,
  historicoPagamento, situacaoCertidao, alertaContrato,
} from '../lib/setor-publico/nf.mjs';
import { alcadaConcessao } from '../lib/concessao-credito/regras.mjs';
import { feriadosNacionais } from '../lib/dias-uteis.mjs';
import { carregarArquivosDeParametros } from '../lib/parametros.mjs';
import { PARAMETROS as PARAM_PUB } from '../lib/parametros/005-setor-publico.mjs';

const DEFS = (await carregarArquivosDeParametros()).flatMap((m) => m.PARAMETROS || []);
const P = Object.fromEntries(DEFS.map((d) => [d.chave, d.carteiras?.PUBLICA ?? d.padrao]));
const HOJE = '2026-12-01';
const NACIONAIS = [...feriadosNacionais(2026), ...feriadosNacionais(2027)].map((f) => f.data);
const DF = [...NACIONAIS, '2026-11-30'];
const REGRAS = REGRAS_INICIAIS.map((r, i) => ({ ...r, ID: i + 1, ATIVO: 1 }));
const regra = (nome) => REGRAS.find((r) => r.NOME === nome);
const VIGENCIAS = PARAM_PUB.find((d) => d.chave === 'pub.pequenoValor').vigencias;

const C008 = { esfera: 'MUNICIPAL', capag: 'B', pessoalPct: 50, cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', atrasoMedio: null,
  empenhoPrevio: 'SIM', contratoVigente: 'SIM', base: 'CONTRATO', valorEstimado: 200000, saldoContrato: 200000, vigenciaFim: '2027-06-30', valorSolicitado: 200000 };

test('C-008 · RN-010 · RN-014: nota 87, P1, exposição 200.000, aprovar', () => {
  const r = motorOrgao(C008, P, HOJE);
  assert.deepEqual([r.nota, r.ratingPub, r.exposicao, r.decisaoSugerida, r.podeAprovar], [87, 'P1', 200000, 'APROVAR', true]);
  assert.deepEqual(Object.values(r.pontos), [22, 10, 10, 15, 20, 0, 10]);
});

test('C-009 · RN-015: CAPAG D trava o rating em P3', () => {
  const r = motorOrgao({ ...C008, capag: 'D', pessoalPct: 45, saldoContrato: 300000, valorSolicitado: 300000 }, P, HOJE);
  assert.deepEqual([r.nota, r.ratingPub, r.travas.capagD, r.exposicao, r.decisaoSugerida], [70, 'P3', true, 150000, 'REDUZIR']);
});

test('C-010 · RN-013: fim de mandato estadual desconta 5; municipal não', () => {
  const a = { ...C008, esfera: 'ESTADUAL', pessoalPct: 40, perfilPag: 'EVENTUAIS', saldoContrato: 500000, valorSolicitado: 500000 };
  const e = motorOrgao(a, P, HOJE);
  assert.deepEqual([e.nota, e.ratingPub, e.exposicao, e.travas.fimMandato], [79, 'P2', 400000, true]);
  const m = motorOrgao({ ...a, esfera: 'MUNICIPAL' }, P, HOJE);
  assert.deepEqual([m.nota, m.ratingPub, m.exposicao], [84, 'P1', 500000]);
  assert.equal(fimMandato('ESTADUAL', '2026-04-30'), false);
  assert.equal(fimMandato('MUNICIPAL', '2028-05-01'), true);
  assert.equal(fimMandato('FEDERAL', '2027-12-01'), false);
});

test('C-011 · RN-012: histórico do órgão e atraso médio no motor', () => {
  const pagas = [
    { PAGO_EM: '2026-09-15', PAGAR_ATE: '2026-09-15', PROTOCOLO: '2026-09-01', LIQUIDACAO: '2026-09-08' },
    { PAGO_EM: '2026-08-10', PAGAR_ATE: '2026-07-15', PROTOCOLO: '2026-07-03', LIQUIDACAO: '2026-07-08' },
  ];
  const h = historicoPagamento(pagas);
  assert.deepEqual([h.pagas, h.noPrazo, h.liquidacaoMedia, h.pagamentoMedio, h.atrasoMedio], [2, 1, 6, 20, 13]);
  const r = motorOrgao({ ...C008, perfilPag: '', atrasoMedio: 13 }, P, HOJE);
  assert.deepEqual([r.pontos.atraso, r.nota, r.ratingPub], [18, 85, 'P1']);
});

test('RN-011: capacidade sugerida pela CAPAG', () => {
  assert.deepEqual(['A', 'UNIAO', 'B', 'C', 'D', 'ND', ''].map(capacidadeSugerida), ['ALTA', 'ALTA', 'MEDIA', 'BAIXA', 'BAIXA', '', '']);
});

test('RN-009 · RN-016: sem dado, pontos de não informado e o que falta; teto do histórico acima da faixa 3', () => {
  const r = motorOrgao({ esfera: 'FEDERAL', base: '' }, P, HOJE);
  assert.equal(r.decisaoSugerida, 'INFORME_BASE');
  assert.equal(r.pontos.capag, 30);
  assert.equal(r.pontos.pessoal, 15);
  assert.equal(r.pontos.historico, 10);
  assert.ok(r.faltando.includes('CAPAG') && r.faltando.includes('base da análise'));
  const t = motorOrgao({ ...C008, perfilPag: 'PONTUAL', atrasoMedio: 120 }, P, HOJE);
  assert.equal(t.travas.atrasoTeto, true);
  assert.equal(t.pontos.historico, 4);
  const acima = motorOrgao({ ...C008, pessoalPct: 60 }, P, HOJE);
  assert.deepEqual([acima.travas.pessoalAcima, acima.pontos.pessoal], [true, 0]);
  assert.ok(['P3', 'P4'].includes(acima.ratingPub));
});

test('C-003 (regra): edital pré-aprova com 87, P1 e a exposição do estimado', () => {
  const r = motorOrgao({ esfera: '', capag: 'A', cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', base: 'EDITAL', valorEstimado: 1200000,
    valorSolicitado: 1200000 }, P, HOJE);
  assert.deepEqual([r.nota, r.ratingPub, r.exposicao, r.decisaoSugerida, r.podeAprovar], [87, 'P1', 1200000, 'PRE_APROVAR', false]);
});

test('C-004 · RN-005: sem vigência ou sem saldo só recusar', () => {
  const v = podeAprovar({ base: 'CONTRATO', saldoContrato: 80000, vigenciaFim: '2026-11-30' }, HOJE);
  assert.equal(v.pode, false);
  assert.match(v.motivo, /vigência/);
  const s = podeAprovar({ base: 'CONTRATO', saldoContrato: 0, vigenciaFim: '2027-06-30' }, HOJE);
  assert.equal(s.pode, false);
  assert.match(s.motivo, /saldo/);
  assert.equal(podeAprovar({ base: 'CONTRATO', saldoContrato: 1, vigenciaFim: '2026-12-01' }, HOJE).pode, true);
  assert.match(podeAprovar({ base: 'EDITAL' }, HOJE).motivo, /contrato/);
});

test('RN-007: alçada da carteira Pública e exceção acima da exposição do órgão', () => {
  const faixa = (v, exposicao = 2000000) => alcadaConcessao({ carteira: 'PUBLICA', valor: v, limiteProposto: v, exposicao }, v, P).rotulo;
  assert.equal(faixa(100000), 'Supervisor');
  assert.equal(faixa(100000.01), 'Gerente');
  assert.equal(faixa(1000000), 'Gerente');
  assert.equal(faixa(1000000.01), 'Diretoria');
  assert.equal(faixa(200000.01, 200000), 'Comitê de crédito');
});

test('C-028 · RN-019: regra de pagamento por ente', () => {
  assert.equal(regraDaNf(REGRAS, { esfera: 'ESTADUAL', uf: 'GO' }, null).NOME, 'Estado de Goiás');
  assert.equal(regraDaNf(REGRAS, { esfera: '', uf: 'GO' }, null).NOME, 'Federal');
  assert.equal(regraDaNf(REGRAS, { esfera: 'MUNICIPAL', uf: 'GO' }, regra('Estado do Tocantins').ID).NOME, 'Estado do Tocantins');
  const semDf = REGRAS.map((r) => (r.NOME === 'Distrito Federal' ? { ...r, ATIVO: 0 } : r));
  assert.equal(regraDaNf(semDf, { esfera: 'ESTADUAL', uf: 'DF' }, null).NOME, 'Federal');
});

test('C-014 · C-015 · RN-020 · RN-021 · RN-022: prazos da NF, pequeno valor e contratação de 70.000', () => {
  const mun = regra('Municípios');
  const n1001 = prazosNf({ EMISSAO: '2026-10-01', PROTOCOLO: '2026-10-01' }, mun, null, NACIONAIS, 0);
  assert.deepEqual([n1001.liquidarAte, n1001.pagarAte], ['2026-10-16', '2026-10-30']);
  const n1003 = { EMISSAO: '2026-11-03', PROTOCOLO: '2026-11-03' };
  const lim = limitePequenoValor(VIGENCIAS, '2026-11-03');
  assert.equal(lim, 65492.11);
  assert.equal(limitePequenoValor(VIGENCIAS, '2025-06-01'), 62725.59);
  const pv = prazosNf(n1003, mun, { VALOR_ESTIMADO: 50000, PRAZO_CONTRATO_DIAS: 0 }, NACIONAIS, lim);
  assert.deepEqual([pv.liquidarAte, pv.pagarAte, pv.pequenoValor], ['2026-11-10', '2026-11-17', true]);
  const grande = prazosNf(n1003, mun, { VALOR_ESTIMADO: 70000, PRAZO_CONTRATO_DIAS: 0 }, NACIONAIS, lim);
  assert.deepEqual([grande.liquidarAte, grande.pagarAte, grande.pequenoValor], ['2026-11-17', '2026-12-02', false]);
  const contrato = prazosNf(n1003, mun, { VALOR_ESTIMADO: 50000, PRAZO_CONTRATO_DIAS: 30 }, NACIONAIS, lim);
  assert.deepEqual([contrato.liquidarAte, contrato.pagarAte, contrato.prazoContrato], ['2026-11-10', '2026-12-03', true]);
});

test('C-016: prazo do contrato da SES-DF com e sem o feriado distrital', () => {
  const df = regra('Distrito Federal');
  const c = { VALOR_ESTIMADO: 600000, PRAZO_CONTRATO_DIAS: 30 };
  const n1004 = { EMISSAO: '2026-10-30', PROTOCOLO: '2026-10-30', LIQUIDACAO: '2026-11-12' };
  assert.equal(prazosNf(n1004, df, c, DF, 65492.11).pagarAte, '2026-12-01');
  assert.equal(prazosNf(n1004, df, c, NACIONAIS, 65492.11).pagarAte, '2026-11-30');
  assert.equal(prazosNf({ EMISSAO: '2026-11-24', PROTOCOLO: '2026-11-24' }, df, c, DF, 65492.11).liquidarAte, '2026-12-09');
});

test('RN-023 · RN-024 · C-017: dois meses da emissão e situação da NF', () => {
  assert.equal(mais2Meses('2026-09-28'), '2026-11-28');
  assert.equal(mais2Meses('2026-10-01'), '2026-12-01');
  const n1002 = { EMISSAO: '2026-09-28', PROTOCOLO: '2026-09-29', LIQUIDACAO: '2026-10-20', PAGAR_ATE: '2026-11-04', LIMITE_2M: '2026-11-28' };
  assert.equal(situacaoNf(n1002, HOJE).acima2m, true);
  assert.equal(situacaoNf({ ...n1002, LIMITE_2M: '2026-12-01' }, HOJE).acima2m, false);
  assert.equal(situacaoNf({ EMISSAO: '2026-12-20', PAGAR_ATE: '2027-01-20' }, '2027-01-31').situacao, 'A_PROTOCOLAR');
  const n1001 = { PROTOCOLO: '2026-10-01', LIQUIDAR_ATE: '2026-10-16', PAGAR_ATE: '2026-10-30' };
  assert.deepEqual(situacaoNf(n1001, HOJE), { situacao: 'LIQUIDACAO_VENCIDA', diasAtraso: 32, acima2m: false });
});

test('RN-025 · C-018: ordem das datas da NF', () => {
  assert.match(validarDatas({ emissao: '2026-11-24', protocolo: '2026-11-24', atesto: '2026-11-20' }, HOJE), /protocolo/);
  assert.match(validarDatas({ emissao: '2026-11-24', protocolo: '2026-11-24', atesto: '2026-11-25', liquidacao: '2026-12-05' }, HOJE), /hoje/);
  assert.match(validarDatas({ emissao: '2026-11-24', protocolo: '2026-11-24', atesto: '2026-11-25', op: '2026-11-30' }, HOJE), /liquidação/);
  assert.equal(validarDatas({ emissao: '2026-10-30', protocolo: '2026-10-30', atesto: '2026-11-06', liquidacao: '2026-11-12', op: '2026-11-26' }, HOJE), '');
});

test('RN-027 · RN-028 · RN-029 · C-020: régua da 1001 e passo atual; empate L3/G2 → L3', () => {
  const nf = { EMISSAO: '2026-10-01', PROTOCOLO: '2026-10-01', LIQUIDAR_ATE: '2026-10-16', PAGAR_ATE: '2026-10-30', LIMITE_2M: '2026-12-01' };
  const feitos = { L1: { FEITO_EM: '2026-10-19T10:00:00', NO_PRAZO: 1 }, L2: { FEITO_EM: '2026-10-23T10:00:00', NO_PRAZO: 1 } };
  const passos = reguaNf(nf, P, NACIONAIS, feitos, HOJE);
  const devido = Object.fromEntries(passos.map((x) => [x.passo, x.devido]));
  assert.deepEqual([devido.CONF, devido.L3, devido.G1, devido.G2, devido.G3, devido.G4, devido.M2],
    ['2026-10-06', '2026-10-30', '2026-11-03', '2026-11-09', '2026-11-24', '2026-12-15', '2026-12-02']);
  assert.equal(passoAtual(passos, HOJE).passo, 'G3');
  assert.equal(passos.find((x) => x.passo === 'G4').podeFeito, false);
  const com15 = reguaNf(nf, { ...P, 'pub.rpFeitoAntecedencia': 15 }, NACIONAIS, feitos, HOJE);
  assert.equal(com15.find((x) => x.passo === 'G4').podeFeito, true);
  const empate = [{ passo: 'G2', devido: '2026-11-25', feitoEm: '' }, { passo: 'L3', devido: '2026-11-25', feitoEm: '' }];
  assert.equal(passoAtual(empate, HOJE).passo, 'L3');
});

test('RN-030 · C-022: etapa do órgão pela NF mais adiantada (L3 vencido → ofício)', () => {
  const nf = { PROTOCOLO: '2026-11-03', LIQUIDAR_ATE: '2026-11-10', PAGAR_ATE: '2026-11-17' };
  const passos = [{ passo: 'L3', devido: '2026-11-25', feitoEm: '' }];
  assert.equal(etapaOrgao([{ nf, passos }], HOJE), 'oficio');
  assert.equal(etapaOrgao([{ nf: { EMISSAO: '2026-11-27' }, passos: [] }], HOJE), 'nf_protocolar');
  assert.equal(etapaOrgao([], HOJE), '');
});

test('RN-033 (regra): tipo de mensagem pela situação', () => {
  assert.equal(tipoMensagem({ EMISSAO: '2026-11-27' }, HOJE), 'PUB_PROTOCOLO');
  assert.equal(tipoMensagem({ PROTOCOLO: '2026-10-01', LIQUIDAR_ATE: '2026-10-16', PAGAR_ATE: '2026-10-30', LIMITE_2M: '2026-12-01' }, HOJE), 'PUB_LIQ');
  assert.equal(tipoMensagem({ PROTOCOLO: '2026-10-30', LIQUIDACAO: '2026-11-12', OP: '2026-11-26', PAGAR_ATE: '2026-12-01' }, HOJE), 'PUB_FILA');
});

test('RN-036: certidão vencendo até 15 dias antes da validade', () => {
  assert.equal(situacaoCertidao('2026-12-16', HOJE, 15), 'VENCENDO');
  assert.equal(situacaoCertidao('2026-12-17', HOJE, 15), 'VALIDA');
  assert.equal(situacaoCertidao('2026-11-30', HOJE, 15), 'VENCIDA');
});

test('C-031 · RN-037: alerta de contrato nos limites de 60 dias e 20%', () => {
  assert.equal(alertaContrato({ vigenciaFim: '2027-01-30', saldo: 100, valor: 100 }, HOJE, P), 'VIGENCIA');
  assert.equal(alertaContrato({ vigenciaFim: '2027-01-31', saldo: 100, valor: 100 }, HOJE, P), '');
  assert.equal(alertaContrato({ vigenciaFim: '2027-06-30', saldo: 20, valor: 100 }, HOJE, P), '');
  assert.equal(alertaContrato({ vigenciaFim: '2027-06-30', saldo: 19.99, valor: 100 }, HOJE, P), 'SALDO');
  assert.equal(alertaContrato({ vigenciaFim: '2027-01-15', saldo: 1, valor: 100 }, HOJE, P), 'VIGENCIA_SALDO');
});

/**
 * C-02 da B3 (06 §5): o MySQL aplica o SET da esquerda para a direita e a coluna já alterada vale com o valor novo nas
 * expressões seguintes; o SQLite do simulador lê sempre o valor antigo. Por isso o smoke não pega a ordem errada: aqui,
 * nenhuma expressão do SET de UPDATE da 005 pode citar coluna atribuída antes dela. Com SITUACAO antes de VALIDADO_POR em
 * `ccEscPubRegraAtualizar` (a ordem antiga), o MySQL deixaria a regra editada "a confirmar" e ainda "validada por" alguém.
 */
function atribuicoesDoSet(sql) {
  const corpo = sql.slice(sql.search(/\sSET\s/) + 5, sql.search(/\nWHERE /));
  const partes = [];
  let profundidade = 0;
  let aspas = false;
  let atual = '';
  for (const ch of corpo) {
    if (ch === "'") aspas = !aspas;
    if (!aspas && ch === '(') profundidade += 1;
    if (!aspas && ch === ')') profundidade -= 1;
    if (!aspas && profundidade === 0 && ch === ',') { partes.push(atual); atual = ''; continue; }
    atual += ch;
  }
  partes.push(atual);
  return partes.map((p) => {
    const [, coluna, expressao] = p.trim().match(/^(\w+)\s*=\s*([\s\S]*)$/);
    return { coluna, expressao: expressao.replace(/'(?:[^']|'')*'/g, "''") };
  });
}

/** A expressão cita a coluna `c` da própria tabela (sem apelido na frente). */
const citou = (c) => new RegExp(String.raw`(?<![\w.])${c}(?!\w)`);

test('C-02 · RN-035: SET das internas da 005 independe da ordem de avaliação (MySQL × SQLite)', async () => {
  const { definitions } = await import('../add-050-setor-publico.mjs');
  const updates = definitions.filter((d) => d.type === 'SQL' && /^UPDATE /.test(d.code));
  assert.ok(updates.length >= 6);
  for (const d of updates) {
    const set = atribuicoesDoSet(d.code);
    set.forEach(({ coluna, expressao }, i) => {
      for (const antes of set.slice(0, i).map((x) => x.coluna)) {
        assert.ok(!citou(antes).test(expressao), `${d.name}: ${coluna} lê ${antes}, já alterada antes no SET`);
      }
    });
  }
  const regra = atribuicoesDoSet(definitions.find((d) => d.name === 'ccEscPubRegraAtualizar').code).map((x) => x.coluna);
  assert.deepEqual(regra.slice(0, 3), ['VALIDADO_POR', 'VALIDADO_EM', 'SITUACAO']);
  // a ordem antiga falha no mesmo verificador
  const antiga = "UPDATE R SET SITUACAO = CASE WHEN SITUACAO = 'VERIFICADO' THEN 'A_CONFIRMAR' ELSE SITUACAO END,\n  VALIDADO_POR = CASE WHEN SITUACAO = 'VERIFICADO' THEN NULL ELSE VALIDADO_POR END\nWHERE ID = 1";
  const [s0, v0] = atribuicoesDoSet(antiga);
  assert.ok(citou(s0.coluna).test(v0.expressao));
});
