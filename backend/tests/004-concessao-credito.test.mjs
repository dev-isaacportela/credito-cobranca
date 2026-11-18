// Regra pura da 004 (node --test): motor (RN-011 a RN-021) e regras (alçadas, pedido, risco, farol).
// São as mesmas funções que entram no corpo das SFs por FONTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motor, consultasValidas, docsExigidos, scoreComportamental, scoreFinal, faixaPorScore, faixaPorAtraso, alertasDoMotor } from '../lib/concessao-credito/motor.mjs';
import {
  prazoDecisao, alcadaConcessao, excessoPedido, alcadaPedido, ratingAtual, criticidade, saude, indiceSaude, classeRisco, flexibilizacao, gatilhos,
  destinoCredito, leituraFarol,
} from '../lib/concessao-credito/regras.mjs';
import { carregarArquivosDeParametros } from '../lib/parametros.mjs';
import { somarMeses } from '../lib/tempo.mjs';

const DEFS = (await carregarArquivosDeParametros()).flatMap((m) => m.PARAMETROS || []);
const P = (carteira = 'PRIVADA', extra = {}) => ({ ...Object.fromEntries(DEFS.map((d) => [d.chave, d.carteiras?.[carteira] ?? d.padrao])), ...extra });
const p = P();
const HOJE = '2026-11-14';
const IOTA = { tipoCliente: 'RECORRENTE', tipoPessoa: 'J', scoreSerasa: 750, pontualidade: 95, diasAtraso: 0, compraMedia: 20000, prazoMedio: 30,
  fatMensal: 200000, valor: 25000, alertas: [], carteiraLimites: null, hoje: HOJE };

test('C-007: motor aprova dentro da política (1000 / 850 / AA / 24.000–29.000 / Aprovar / Supervisor)', () => {
  const r = motor(IOTA, p);
  assert.equal(r.detalhes.scoreComp, 1000);
  assert.equal(r.score, 850);
  assert.equal(r.rating, 'AA');
  assert.deepEqual([r.detalhes.limite.minimo, r.detalhes.limite.maximo], [24000, 29000]);
  assert.match(r.resultado, /^Aprovar/);
  assert.equal(r.codigo, 'APROVAR');
  assert.equal(alcadaConcessao({ carteira: 'PRIVADA', valor: 25000, limiteProposto: 25000, motorLimite: 29000 }, 0, p).rotulo, 'Supervisor');
});

test('C-008: atraso 10 + negativação → 810, atraso B, rating C rebaixado, 12.000 e "108%"', () => {
  const r = motor({ ...IOTA, diasAtraso: 10, alertas: ['NEGATIVACAO'] }, p);
  assert.equal(r.score, 810);
  assert.equal(r.detalhes.faixaScore, 'AA');
  assert.equal(r.detalhes.faixaAtraso, 'B');
  assert.equal(r.rating, 'C');
  assert.equal(r.detalhes.rebaixado, true);
  assert.equal(r.limiteSugerido, 12000);
  assert.match(r.resultado, /12\.000/);
  assert.match(r.resultado, /108%/);
});

test('C-009: faixa D nega a prazo; com aval, exceção com garantia', () => {
  const xi = { tipoCliente: 'NOVO', tipoPessoa: 'J', scoreSerasa: 150, pontualidade: null, diasAtraso: 0, fatMensal: 100000, valor: 20000, alertas: [], carteiraLimites: null, hoje: HOJE };
  const r = motor(xi, p);
  assert.equal(r.rating, 'D');
  assert.equal(r.limiteSugerido, 0);
  assert.equal(r.resultado, 'Negar a prazo: somente à vista');
  assert.equal(motor({ ...xi, garantia: 'Aval dos sócios' }, p).resultado, 'Exceção com garantia: levar ao comitê');
});

test('C-010 · RN-020: concentração reduz o limite; grupo cheio leva ao comitê', () => {
  const q = { ...p, 'limite.folga': 1 };
  const base = { ...IOTA, tipoCliente: 'NOVO', pontualidade: null, scoreSerasa: 650, compraMedia: 50000, fatMensal: 1000000, prazoMedio: 30, valor: 50000 };
  const sem = motor({ ...base, carteiraLimites: null }, q);
  assert.equal(sem.limiteSugerido, 50000, 'política de 50.000 (premissa do cenário)');
  const r = motor({ ...base, carteiraLimites: 900000, exposicaoGrupo: 80000 }, q);
  assert.equal(r.detalhes.concentracao.teto, 95000);
  assert.equal(r.detalhes.concentracao.disponivel, 15000);
  assert.equal(r.limiteSugerido, 15000);
  assert.equal(r.detalhes.concentracao.reduzido, true);
  assert.match(r.detalhes.limite.como, /reduzido pela concentração/);
  assert.equal(motor({ ...base, carteiraLimites: 900000, exposicaoGrupo: 95000 }, q).resultado, 'Levar ao comitê: concentração');
  // RN-020: sem grupo, a exposição é só a do próprio cliente (0 dos outros)
  assert.equal(motor({ ...base, carteiraLimites: 900000, exposicaoGrupo: 0 }, q).limiteSugerido, 50000);
});

test('C-024 · RN-026: flexibilização pela faixa', () => {
  const aa = { rating: 'AA', limite: 100000, vencido: 0, pontualidade: 95, bloqueado: false, validadeVencida: false, rebaixado: false, temScore: true, disponivel: null };
  assert.deepEqual(flexibilizacao(aa, p), { pct: 20, valor: 20000, motivos: [] });
  const b = flexibilizacao({ ...aa, rating: 'B' }, p);
  assert.equal(b.valor, 0);
  assert.match(b.motivos.join(), /faixa B não permite flexibilizar/);
  const venc = flexibilizacao({ ...aa, vencido: 1 }, p);
  assert.equal(venc.valor, 0);
  assert.match(venc.motivos.join(), /títulos vencidos/);
  // RN-026
  assert.equal(flexibilizacao({ ...aa, rating: 'A' }, p).valor, 10000);
  assert.equal(flexibilizacao({ ...aa, pontualidade: 85 }, p).valor, 0);
  assert.equal(flexibilizacao({ ...aa, pontualidade: null }, p).valor, 20000);
  assert.equal(flexibilizacao({ ...aa, rebaixado: true }, p).valor, 0);
  assert.equal(flexibilizacao({ ...aa, disponivel: 105000 }, p).valor, 5000);
});

test('C-027: simulador do semáforo (650 / 30 / 20.000 / 200.000 → A, 24.000; prazo 50 → 40.000 e aviso 45)', () => {
  const e = { tipoCliente: 'RECORRENTE', scoreSerasa: 650, pontualidade: null, diasAtraso: 0, compraMedia: 20000, prazoMedio: 30, fatMensal: 200000, valor: 0, carteiraLimites: null, hoje: HOJE };
  const sim = (x) => motor({ ...x, tipoCliente: 'NOVO' }, p); // sem histórico: só o Serasa conta
  const r = sim(e);
  assert.equal(r.rating, 'A');
  assert.equal(r.limiteSugerido, 24000);
  const r50 = sim({ ...e, prazoMedio: 50 });
  assert.equal(r50.limiteSugerido, 40000);
  assert.match(r50.detalhes.avisos.join(), /Prazo de 50 dias acima do máximo da faixa \(45\)/);
});

test('C-028 · RN-033: leitura do farol', () => {
  const l = leituraFarol({ AA: { saldo: 1000000, vencido: 5000 }, A: { saldo: 2000000, vencido: 100000 }, B: { saldo: 1000000, vencido: 30000 } }, 1, p);
  const por = Object.fromEntries(l.leituras.map((x) => [x.faixa, x.leitura]));
  assert.equal(por.AA, 'Dentro do esperado');
  assert.equal(por.A, 'Fora da ordem');
  assert.equal(por.B, 'Dentro do esperado');
  assert.equal(por.C, 'Sem carteira');
  assert.equal(por.D, 'Faixa sem crédito a prazo');
  assert.equal(por.E, 'Faixa sem crédito a prazo');
  assert.equal(l.aviso, 'Base de 1 de 12 meses: leitura ainda não conclusiva');
  // RN-033
  assert.equal(leituraFarol({ AA: { saldo: 1000, vencido: 10 } }, 12, p).leituras[0].leitura, 'Dentro do esperado');
  assert.equal(leituraFarol({ AA: { saldo: 1000, vencido: 11 } }, 12, p).leituras[0].leitura, 'Acima do esperado: revisar o corte');
  assert.equal(leituraFarol({}, 0, p), null);
});

test('C-030 · RN-029: saúde das análises e índice', () => {
  const s = [{ diasAtraso: 0, usoPct: 50 }, { diasAtraso: 12, usoPct: 10 }, { diasAtraso: 0, usoPct: 95 }, { diasAtraso: 31, usoPct: 10 },
    { diasAtraso: 0, usoPct: 10, validadeVencida: true }].map((e) => saude(e, p).saude);
  assert.deepEqual(s, ['SAUDAVEL', 'ATENCAO', 'ATENCAO', 'RISCO', 'ATENCAO']);
  assert.deepEqual(indiceSaude(1, 5, p), { indice: 20, cor: 'VERMELHO' });
  assert.equal(saude({ diasAtraso: 30 }, p).saude, 'ATENCAO');
  assert.equal(saude({ diasAtraso: 31 }, p).saude, 'RISCO');
  assert.equal(saude({ diasAtraso: 0, usoPct: 89 }, p).saude, 'SAUDAVEL');
  assert.equal(indiceSaude(4, 5, p).cor, 'VERDE');
});

test('C-035 · RN-008: alçada da concessão por valor e carteira', () => {
  const al = (valor, carteira = 'PRIVADA', aprovado = 0, extra = {}) => alcadaConcessao({ carteira, valor, limiteProposto: valor, motorLimite: 1e12, ...extra },
    aprovado, P(carteira)).rotulo;
  assert.equal(al(50000), 'Supervisor');
  assert.equal(al(50001), 'Gerente');
  assert.equal(al(500001), 'Comitê regional');
  assert.equal(al(2000001), 'Comitê executivo');
  assert.equal(alcadaConcessao({ carteira: 'PRIVADA', valor: 40000, limiteProposto: 40000, motorLimite: 1e12 }, 55000, p).rotulo, 'Gerente');
  assert.equal(al(100000, 'PUBLICA'), 'Supervisor');
  assert.equal(al(100001, 'PUBLICA'), 'Gerente');
  assert.equal(al(1000001, 'PUBLICA'), 'Diretoria');
  assert.equal(al(80000), 'Gerente');
  assert.equal(al(1200000), 'Comitê regional');
  // Pública: exceção só acima da exposição do motor do órgão (DT-36)
  const pub = { carteira: 'PUBLICA', valor: 80000, limiteProposto: 80000, exposicao: 80000, ajusteSituacao: 'APROVADO', motorResultado: 'EXCECAO_GARANTIA', cnpjAbertura: '2026-10-01', hoje: HOJE };
  assert.equal(alcadaConcessao(pub, 80000, P('PUBLICA')).rotulo, 'Supervisor');
  assert.equal(alcadaConcessao(pub, 80001, P('PUBLICA')).rotulo, 'Comitê de crédito');
});

test('RN-010: exceção ao motor exige o Comitê de crédito', () => {
  const s = { carteira: 'PRIVADA', valor: 29000, limiteProposto: 29000, motorLimite: 29000, tipoCliente: 'RECORRENTE', hoje: HOJE };
  assert.deepEqual([alcadaConcessao(s, 29000, p).rotulo, alcadaConcessao(s, 29000, p).excecao], ['Supervisor', false]);
  assert.equal(alcadaConcessao({ ...s, cnpjAbertura: '2026-03-14' }, 29000, p).rotulo, 'Comitê de crédito');
  assert.equal(alcadaConcessao(s, 29001, p).rotulo, 'Comitê de crédito');
});

test('RN-002: prazo de decisão = abertura + SLA da esteira', () => {
  assert.equal(prazoDecisao('2026-11-30T10:00:00', 216), '2026-12-09');
  assert.equal(prazoDecisao('2026-11-14T10:00:00', 216), '2026-11-23');
});

test('RN-011: consultas válidas por 30 dias e Receita irregular', () => {
  const c = (data) => ({ data, receita: 'ATIVA', protesto: 'SEM', processo: 'SEM', socios: 'SEM' });
  assert.equal(consultasValidas(c('2026-10-15'), 'J', HOJE, p), true);
  assert.equal(consultasValidas(c('2026-10-14'), 'J', HOJE, p), false);
  assert.equal(consultasValidas({ ...c('2026-11-01'), socios: 'NAO_CONSULTADO' }, 'F', HOJE, p), true);
  assert.ok(alertasDoMotor({ consultas: { receita: 'IRREGULAR' } }, p).some((a) => a.texto === 'Situação irregular na Receita'));
});

test('RN-012: documentos exigidos pela faixa de valor', () => {
  assert.equal(docsExigidos({ tipoPessoa: 'J', valor: 150000 }, p).length, 7);
  assert.equal(docsExigidos({ tipoPessoa: 'J', valor: 600000, garantia: 'Aval dos sócios' }, p).length, 9);
  const pf = docsExigidos({ tipoPessoa: 'F', valor: 50000 }, p);
  assert.deepEqual(pf.map((d) => d.codigo), ['SERASA', 'PROTESTOS', 'PROCESSOS', 'FICHA']);
  assert.equal(docsExigidos({ tipoPessoa: 'F', valor: 50000 }, p, { SERASA: true }).filter((d) => d.atendido).length, 1);
});

test('RN-013: índices financeiros e alertas de liquidez e dívida', () => {
  const r = motor({ ...IOTA, ac: 80000, pc: 100000, pl: 500000, divida: 350000, ebitda: 100000 }, p);
  assert.deepEqual(r.detalhes.indices, { lc: 0.8, divEbitda: 3.5, divPl: 0.7 });
  assert.ok(r.alertas.some((a) => /Liquidez/.test(a)));
  assert.ok(r.alertas.some((a) => /Dívida acima de 3/.test(a)));
});

test('RN-014: avisos da fonte pagadora não mudam a faixa', () => {
  const r = motor({ ...IOTA, fpTipo: 'SUS', fpPrazoDias: 60 }, p);
  assert.ok(r.detalhes.avisos.some((a) => /descasamento de prazo/.test(a)));
  assert.ok(r.detalhes.avisos.some((a) => /repasse público/.test(a)));
  assert.equal(r.rating, motor(IOTA, p).rating);
});

test('RN-015: score comportamental', () => {
  assert.equal(scoreComportamental({ tipoCliente: 'RECORRENTE', pontualidade: 120, diasAtraso: 0 }, p), 1000);
  assert.equal(scoreComportamental({ tipoCliente: 'RECORRENTE', pontualidade: null, diasAtraso: 0 }, p), 750);
  const base = scoreComportamental({ tipoCliente: 'INATIVO', pontualidade: 100, diasAtraso: 0 }, { ...p, 'score.penalInativo': 0 });
  assert.equal(base - scoreComportamental({ tipoCliente: 'INATIVO', pontualidade: 100, diasAtraso: 70 }, { ...p, 'score.penalInativo': 0 }), 600);
  assert.equal(scoreComportamental({ tipoCliente: 'NOVO', pontualidade: null }, p), null);
});

test('RN-016: score final', () => {
  assert.equal(scoreFinal(600, 400, p), 520);
  assert.equal(scoreFinal(600, null, p), 600);
  assert.equal(scoreFinal(null, 400, p), null);
  assert.equal(scoreFinal(0, 1000, p), 400);
});

test('RN-017: faixas por score e por atraso; alertas rebaixam até E', () => {
  assert.equal(faixaPorScore(799, p), 'A');
  assert.equal(faixaPorScore(800, p), 'AA');
  assert.equal(faixaPorAtraso(5, p), 'A');
  assert.equal(faixaPorAtraso(6, p), 'B');
  assert.equal(faixaPorAtraso(46, p), 'E');
  const r = motor({ ...IOTA, scoreSerasa: 150, pontualidade: 10, alertas: ['NEGATIVACAO', 'DADOS'] }, p);
  assert.equal(r.rating, 'E');
});

test('RN-018: alertas de fraude e manuais', () => {
  const a = alertasDoMotor({ cnpjAbertura: '2026-03-14', hoje: HOJE, tipoCliente: 'NOVO', fatMensal: 200000, valor: 150000, alertas: ['NEGATIVACAO', 'DADOS', 'PEDIDO'] }, p);
  assert.ok(a.some((x) => x.codigo === 'CNPJ_RECENTE'));
  assert.ok(a.some((x) => x.texto === 'Pedido inicial alto'));
  assert.equal(a.filter((x) => x.tipo === 'manual').length, 3);
});

test('RN-019: limite pela política', () => {
  const e = { ...IOTA, scoreSerasa: 900, compraMedia: 100000, prazoMedio: 60, pl: 1000000, fatMensal: 1000000, valor: 0 };
  const r = motor(e, p);
  assert.equal(r.rating, 'AA');
  assert.equal(r.detalhes.limite.base, 100000);
  assert.deepEqual([r.detalhes.limite.minimo, r.detalhes.limite.maximo], [100000, 120000]);
  assert.equal(motor({ ...IOTA, prazoMedio: 20 }, p).detalhes.limite.base, motor(IOTA, p).detalhes.limite.base);
  const sem = motor({ tipoCliente: 'NOVO', scoreSerasa: null, compraMedia: 20000, prazoMedio: 30, fatMensal: 50000, valor: 0, hoje: HOJE }, p);
  assert.equal(sem.detalhes.limite.base, 24000);
  assert.equal(sem.detalhes.limite.maximo, 15000);
});

test('RN-021: dados insuficientes e faixa E', () => {
  assert.equal(motor({ tipoCliente: 'NOVO', scoreSerasa: 700, compraMedia: 0, fatMensal: 0, hoje: HOJE }, p).resultado, 'Dados insuficientes');
  assert.match(motor({ ...IOTA, scoreSerasa: 100, diasAtraso: 60 }, p).resultado, /^Negar a prazo/);
});

test('RN-022: rating atual segue o motor; o ajuste vale enquanto o motor der a mesma faixa', () => {
  const s = { AJUSTE_SITUACAO: 'APROVADO', RATING_AJUSTE: 'B', RATING_MOTOR: 'C' };
  assert.equal(ratingAtual('C', s), 'B');
  assert.equal(ratingAtual('D', s), 'D');
});

test('RN-023: validade de 3 meses', () => {
  assert.equal(somarMeses('2026-11-14', 3), '2027-02-14');
  assert.equal(somarMeses('2026-11-30', 3), '2027-02-28');
  assert.equal(somarMeses('2028-01-31', 1), '2028-02-29');
});

test('RN-024: destino do crédito no encaminhamento', () => {
  const r = destinoCredito({ fimValidade: '2027-01-01', inicioValidade: '2026-08-15', ultimaCompra: null, comprasQtd: 0, hoje: HOJE }, p);
  assert.equal(r.destino, 'OBSOLETO');
  assert.match(r.motivo, /sem compras/i);
  assert.equal(destinoCredito({ fimValidade: '2026-11-13', inicioValidade: '2026-08-13', ultimaCompra: '2026-11-01', comprasQtd: 2, hoje: HOJE }, P('PUBLICA')).destino, 'REANALISE');
});

test('RN-027: excesso e alçada do pedido', () => {
  assert.deepEqual(excessoPedido(0, 0, 10000), { excesso: 10000, pct: 100 });
  assert.equal(alcadaPedido(10000, 100, 0, p).rotulo, 'Comitê de crédito');
  const a = excessoPedido(200000, 200000, 20000);
  assert.deepEqual([a.pct, alcadaPedido(a.excesso, a.pct, 0, p).rotulo], [10, 'Supervisor']);
  const b = excessoPedido(300000, 300000, 20001);
  assert.equal(b.pct, 6.67);
  assert.equal(alcadaPedido(b.excesso, b.pct, 0, p).rotulo, 'Gerente');
  // C-021
  const rot = (valor) => { const e = excessoPedido(100000, 90000, valor); return alcadaPedido(e.excesso, e.pct, 0, p); };
  assert.deepEqual(['Supervisor', 'Gerente', 'Diretor financeiro', 'Comitê de crédito'], [15000, 30000, 50000, 80000].map((v) => rot(v).rotulo));
  assert.equal(rot(50000).critica, true);
  assert.equal(alcadaPedido(5000, 5, 16, p).rotulo, 'Comitê de crédito');
});

test('RN-030: classe de risco pelo corte', () => {
  const corte = p['cred.riscoCorte'] ?? 'C';
  assert.equal(classeRisco('B', 'B', corte), '');
  assert.equal(classeRisco('C', 'A', corte), 'ACEITO');
  assert.equal(classeRisco('A', 'C', corte), 'NAO_PREVISTO');
});

test('RN-032: criticidade', () => {
  const n = { diasAtraso: 0, pontualidade: 95, scoreSerasa: null, usoPct: 10, prazoMedio: 30, rating: 'AA', rebaixado: false };
  assert.equal(criticidade(n, p).nivel, 'NORMAL');
  assert.equal(criticidade({ ...n, scoreSerasa: 0 }, p).nivel, 'CRITICO');
  assert.equal(criticidade({ ...n, rating: 'E' }, p).nivel, 'CRITICO');
  assert.equal(criticidade({ ...n, diasAtraso: 3, usoPct: 92 }, p).nivel, 'ALERTA');
  const tres = criticidade({ ...n, diasAtraso: 3, usoPct: 92, scoreSerasa: 550 }, p);
  assert.equal(tres.nivel, 'CRITICO');
  assert.match(tres.motivos[0], /3 sinais/);
});

test('RN-039: gatilhos de revisão', () => {
  const g = (e) => gatilhos({ diasAtraso: 0, usoPct: 10, negativacao: false, fimValidade: '2027-02-14', hoje: HOJE, ...e }, p);
  assert.deepEqual(g({ diasAtraso: 14 }), []);
  assert.deepEqual(g({ diasAtraso: 15 }), ['ATRASO']);
  assert.deepEqual(g({ usoPct: 90 }), ['USO']);
  assert.deepEqual(g({ fimValidade: '2026-11-30' }), []);
  assert.deepEqual(g({ fimValidade: '2026-11-29' }), ['VALIDADE']);
});

/* ── fragmentos SQL × regra pura, no banco do simulador (validação B2: C-09, B-01, C-02, C-03, C-10) ── */

const { montarBanco, descartarBanco } = await import('../simulator/seed.mjs');
const { bindParams } = await import('../simulator/runtime.mjs');
const { toSqlite } = await import('../simulator/mysql-dialect.mjs');
const { NIVEL_CONCESSAO, ROTULO_CONCESSAO, ALCADA_PEDIDO, SOMAR_MESES, BRL } = await import('../lib/concessao-credito/sql.mjs');
const { validarConjunto } = await import('../lib/parametros/004-concessao-credito.mjs');
const { after } = await import('node:test');

const banco = await montarBanco({ ate: 3 }); // relógio D = 2026-11-19
after(() => descartarBanco(banco));
const HOJE_D = '2026-11-19';
const sqlDo = (sql, input = {}) => banco.db.prepare(toSqlite(bindParams(sql, input, 0))).all().map((l) => ({ ...l }));
const temAnalise = !!banco.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'CC_ANALISE_ORGAO'").get();

test('RN-008 · RN-010 (SQL × função): NIVEL_CONCESSAO/ROTULO_CONCESSAO = alcadaConcessao() nos casos da spec', () => {
  const cli = banco.db.prepare("INSERT INTO CC_CLIENTE (CODCLI, NOME) VALUES (9901, 'ALCADA')").run().lastInsertRowid;
  const base = { valor: 0, limiteProposto: 0, motorLimite: 1e9, motorResultado: 'APROVAR', ajusteSituacao: '', cnpjAbertura: null, tipoCliente: 'RECORRENTE', fatMensal: null };
  const casos = [
    ['PRIVADA', { valor: 50000, limiteProposto: 50000 }, 0], ['PRIVADA', { valor: 50001, limiteProposto: 50001 }, 0],
    ['PRIVADA', { valor: 500001, limiteProposto: 500001 }, 0], ['PRIVADA', { valor: 2000001, limiteProposto: 2000001 }, 0],
    ['PRIVADA', { valor: 40000, limiteProposto: 40000 }, 55000], ['PRIVADA', { valor: 30000 }, 0], ['ESTETICA', { valor: 60000, limiteProposto: 60000 }, 0],
    ['PUBLICA', { valor: 100000, limiteProposto: 100000 }, 0], ['PUBLICA', { valor: 100001, limiteProposto: 100001 }, 0],
    ['PUBLICA', { valor: 1000001, limiteProposto: 1000001 }, 0],
    // exceções (RN-010): acima do motor, ajuste, resultado de comitê, CNPJ recente (limite de 12 meses), pedido inicial alto
    ['PRIVADA', { valor: 30000, limiteProposto: 29000, motorLimite: 29000 }, 30000], ['PRIVADA', { valor: 29000, limiteProposto: 29000, motorLimite: 29000 }, 29000],
    ['PRIVADA', { valor: 29000, limiteProposto: 29000, ajusteSituacao: 'APROVADO' }, 29000],
    ['PRIVADA', { valor: 29000, limiteProposto: 29000, motorResultado: 'EXCECAO_GARANTIA' }, 29000],
    ['PRIVADA', { valor: 29000, limiteProposto: 29000, cnpjAbertura: '2025-11-19' }, 29000],
    ['PRIVADA', { valor: 29000, limiteProposto: 29000, cnpjAbertura: '2025-11-20' }, 29000],
    ['PRIVADA', { valor: 600000, limiteProposto: 600000, tipoCliente: 'NOVO', fatMensal: 1000000 }, 0],
    ['PRIVADA', { valor: 6000, limiteProposto: 6000, tipoCliente: 'NOVO', fatMensal: 10000 }, 0],
  ];
  // Pública (DT-36): exceção só acima da exposição do órgão, os outros termos não contam
  if (temAnalise) {
    const pub = { valor: 80000, limiteProposto: 80000, ajusteSituacao: 'APROVADO', motorResultado: 'EXCECAO_GARANTIA', cnpjAbertura: '2026-10-01', exposicao: 80000 };
    casos.push(['PUBLICA', pub, 80000], ['PUBLICA', pub, 80001], ['PUBLICA', pub, 0]);
  }
  const ins = banco.db.prepare(`INSERT INTO CC_SOLICITACAO (CLIENTE_ID, CARTEIRA, TIPO_CLIENTE, VALOR, LIMITE_PROPOSTO, MOTOR_LIMITE, MOTOR_RESULTADO,
    AJUSTE_SITUACAO, CNPJ_ABERTURA, FAT_MENSAL, CRIADO_EM, CRIADO_POR) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-19T10:00:00', 1)`);
  const sql = `SELECT ${NIVEL_CONCESSAO('S', '{{la}}', temAnalise ? 'AO' : null)} AS NIVEL, ${ROTULO_CONCESSAO('S', '{{la}}', temAnalise ? 'AO' : null)} AS ROTULO
FROM CC_SOLICITACAO S ${temAnalise ? 'LEFT JOIN CC_ANALISE_ORGAO AO ON AO.SOLICITACAO_ID = S.ID' : ''} WHERE S.ID = {{id}}`;
  for (const [carteira, extra, la] of casos) {
    const s = { ...base, ...extra, carteira, hoje: HOJE_D };
    const id = ins.run(cli, carteira, s.tipoCliente, s.valor, s.limiteProposto, s.motorLimite, s.motorResultado, s.ajusteSituacao, s.cnpjAbertura, s.fatMensal)
      .lastInsertRowid;
    if (s.exposicao !== undefined) banco.db.prepare('INSERT INTO CC_ANALISE_ORGAO (SOLICITACAO_ID, CLIENTE_ID, EXPOSICAO) VALUES (?, ?, ?)').run(id, cli, s.exposicao);
    const f = alcadaConcessao(s, la, P(carteira));
    const [r] = sqlDo(sql, { la, id });
    assert.deepEqual([Number(r.NIVEL), r.ROTULO], [f.nivel, f.rotulo], `${carteira} ${JSON.stringify(extra)} aprovado ${la}`);
  }
});

test('RN-027 (SQL × função): ALCADA_PEDIDO = alcadaPedido() nas faixas e no atraso', () => {
  for (const [exc, pct, atr] of [[5000, 5, 0], [20000, 10, 0], [20001, 10, 0], [30000, 25, 0], [40000, 25.01, 0], [50000, 50, 0], [80000, 50.01, 0], [5000, 5, 16]]) {
    const f = alcadaPedido(exc, pct, atr, p);
    const [r] = sqlDo(`SELECT ${['nivel', 'rotulo', 'critica'].map((o) => `${ALCADA_PEDIDO(String(exc), String(pct), String(atr), "'PRIVADA'", o)} AS ${o.toUpperCase()}`).join(', ')}`);
    assert.deepEqual([Number(r.NIVEL), r.ROTULO, Boolean(Number(r.CRITICA))], [f.nivel, f.rotulo, f.critica], `${exc} ${pct}% ${atr} d`);
  }
});

test('C-016 (SQL × função): SOMAR_MESES = somarMeses() (validade do crédito na SQL), fim de mês e ano bissexto', () => {
  for (const d of ['2026-11-14', '2026-11-30', '2026-01-31', '2027-11-29', '2026-12-15', '2028-02-29', '2026-10-31']) {
    for (const k of [0, 1, 3, 12, 15]) assert.equal(sqlDo(`SELECT ${SOMAR_MESES(`'${d}'`, k)} AS F`)[0].F, somarMeses(d, k), `${d} + ${k}`);
  }
});

test('RN-023 (SQL × função): BRL = brl() das JS no texto da pendência', () => {
  for (const v of [0, 999, 1000, 29000, 130000, 1000000, 1234567.6, 12345678901]) {
    assert.equal(sqlDo(`SELECT ${BRL(String(v))} AS T`)[0].T, `R$ ${Math.round(v).toLocaleString('pt-BR')}`, String(v));
  }
});

test('RN-031 (parâmetros, 03 §13): meta.aprovacaoMinPct menor que meta.aprovacaoMaxPct', () => {
  assert.deepEqual(validarConjunto.meta({ 'meta.aprovacaoMinPct': 60, 'meta.aprovacaoMaxPct': 85 }), []);
  assert.equal(validarConjunto.meta({ 'meta.aprovacaoMinPct': 85, 'meta.aprovacaoMaxPct': 85 }).length, 1);
  assert.equal(validarConjunto.meta({ 'meta.aprovacaoMinPct': 90, 'meta.aprovacaoMaxPct': 85 }).length, 1);
  assert.deepEqual(validarConjunto.meta({ 'meta.slaPct': 85 }), [], 'confere só com as chaves presentes');
});
