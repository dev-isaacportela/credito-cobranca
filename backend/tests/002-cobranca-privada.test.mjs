// Regras puras da 002-cobranca (node --test): régua, bloqueio, parcelas do acordo, encargos, e-mail e prazo da ação.
// A alçada do acordo e da baixa é da SQL do INSERT (D-003): testada no smoke (RN-009, RN-013).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feriadosNacionais, somarDiasUteis, proximoUtil } from '../lib/dias-uteis.mjs';
import { faseDevida, bloqueioDevido, nomeDaFase, etiquetas, capaDoCaso, prazoDaAcao } from '../lib/cobranca-privada/regua.mjs';
import { parcelasAcordo } from '../lib/cobranca-privada/acordo.mjs';
import { encargosTitulo, calcularEncargos } from '../lib/cobranca-privada/encargos.mjs';
import { dataLimite } from '../lib/cobranca-privada/email.mjs';
import { PARAMETROS } from '../lib/parametros/002-cobranca-privada.mjs';
import { MODELOS } from '../lib/modelos/002-cobranca-privada.mjs';

const FER = feriadosNacionais(2026).concat(feriadosNacionais(2027));
const SO_20 = [{ data: '2026-11-20', nome: 'Consciência Negra' }];
const P = Object.fromEntries(PARAMETROS.map((d) => [d.chave, d.padrao]));
const PUB = Object.fromEntries(PARAMETROS.map((d) => [d.chave, d.carteiras?.PUBLICA ?? d.padrao]));

test('RN-001 · RN-030: fase devida pelos dias, marcas do Jurídico e nome da coluna', () => {
  const dias = [1, 2, 3, 4, 6, 7, 9, 10, 19, 20, 29, 30, 44, 45, 61];
  assert.deepEqual(dias.map((d) => faseDevida({ vencido: 100, diasAtraso: d }, P)), ['venc_d0', 'pag_nao_ident', 'pag_nao_ident', 'cob_ativa', 'cob_ativa',
    'notif_formal', 'notif_formal', 'protesto', 'protesto', 'neg_pos_protesto', 'neg_pos_protesto', 'extrajudicial', 'extrajudicial', 'extrajudicial', 'extrajudicial']);
  const marca = (d) => etiquetas({ vencido: 100, diasAtraso: d }, { ...P, 'regua.jurMax': 60 }).filter((e) => /Jurídico/.test(e));
  assert.deepEqual([44, 45, 59, 60, 61].map(marca), [[], ['Pronto para o Jurídico'], ['Pronto para o Jurídico'], ['Jurídico atrasado'], ['Jurídico atrasado']]);
  assert.equal(nomeDaFase('cob_ativa', { 'regua.lig': 6 }), 'D+6 · Cobrança ativa');
});

test('RN-002: preventiva pelos dias até o vencimento', () => {
  assert.deepEqual([6, 5, 2, 1, 0].map((f) => faseDevida({ vencido: 0, diasParaVencer: f }, P)), ['', 'prev_d5', 'prev_d5', 'prev_d1', 'venc_d0']);
  assert.equal(faseDevida({ vencido: 100, diasAtraso: 5, diasParaVencer: 3 }, P), 'cob_ativa');
  assert.equal(faseDevida({ vencido: 0, diasParaVencer: null }, P), '');
});

test('RN-004: bloqueio devido', () => {
  assert.deepEqual([3, 4, 10].map((d) => bloqueioDevido({ vencido: 100, diasAtraso: d }, P)), ['', 'PEDIDOS', 'TOTAL']);
  assert.equal(bloqueioDevido({ vencido: 100, diasAtraso: 20 }, P, true), '');
  assert.equal(bloqueioDevido({ vencido: 0, diasAtraso: 0 }, P), '');
});

test('RN-007 · C-010: limite da promessa em dias úteis com feriado', () => {
  assert.equal(somarDiasUteis('2026-11-13', 5, SO_20), '2026-11-23');
});

test('RN-010: parcelas do acordo truncadas no centavo e em dia útil', () => {
  assert.deepEqual(parcelasAcordo(10000, 0, 3, '2026-11-21', 30, FER), [
    { n: 1, venc: '2026-11-23', valor: 3333.33 }, { n: 2, venc: '2026-12-21', valor: 3333.33 }, { n: 3, venc: '2027-01-20', valor: 3333.34 }]);
});

test('C-026 · C-029 · RN-015: encargos título a título', () => {
  assert.deepEqual(encargosTitulo(10000, 30, P), { multa: 200, juros: 100, correcao: 40, total: 10340 });
  assert.deepEqual(encargosTitulo(50000, 40, PUB), { multa: 0, juros: 333.33, correcao: 266.84, total: 50600.17 });
  const dois = calcularEncargos([
    { TITULO: '1', PARCELA: '1', VENCIMENTO: '2026-11-09', SALDO: 5000 },
    { TITULO: '2', PARCELA: '1', VENCIMENTO: '2026-09-30', SALDO: 5000 },
  ], '2026-11-19', P);
  assert.deepEqual(dois.linhas.map((l) => [l.JUROS, l.CORRECAO]), [[16.67, 6.66], [83.33, 33.38]]);
  assert.deepEqual([dois.juros, dois.correcao, dois.total], [100, 40.04, 10340.04]);
  const v = calcularEncargos([
    { TITULO: '3', PARCELA: '1', VENCIMENTO: '2026-10-03', SALDO: 20000 },
    { TITULO: '4', PARCELA: '1', VENCIMENTO: '2026-11-02', SALDO: 10000 },
    { TITULO: '5', PARCELA: '1', VENCIMENTO: '2026-12-02', SALDO: 999 },
  ], '2026-11-19', P);
  assert.deepEqual([v.multa, v.juros, v.correcao, v.total], [600, 370, 148.13, 31118.13]);
});

test('RN-023: data-limite do e-mail e os 11 modelos', () => {
  assert.equal(dataLimite('notif_formal', 8, '2026-11-17', P, FER), '2026-11-19');
  assert.equal(dataLimite('juridico', 62, '2026-11-18', { ...P, 'regua.jurMax': 60 }, FER), '2026-11-23');
  assert.equal(dataLimite('extrajudicial', 31, '2026-11-18', P, FER), '2026-12-03');
  assert.equal(dataLimite('cob_ativa', 5, '2026-11-18', P, FER), '');
  assert.equal(MODELOS.filter((m) => m.codigo.startsWith('COB_')).length, 11);
});

test('RN-033 · RN-029: prazo da ação mostrado na ficha', () => {
  assert.equal(prazoDaAcao('2026-11-19T09:00:00', SO_20), '2026-11-19');
  assert.equal(prazoDaAcao('2026-11-20T09:00:00', SO_20), '2026-11-23');
  assert.equal(prazoDaAcao('2026-11-09T10:00:00', SO_20, 240), '2026-11-19T10:00:00');
});

test('C-022: semana de 7 dias úteis da agenda e evento em dia não útil', () => {
  const semana = Array.from({ length: 7 }, (_, i) => somarDiasUteis('2026-11-19', i, SO_20));
  assert.deepEqual(semana, ['2026-11-19', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-30']);
  assert.equal(proximoUtil('2026-11-21', SO_20), '2026-11-23');
});

test('RF-005: capa do card', () => {
  const prev = capaDoCaso({ preventivo: true, vencido: 0, aVencer: 8000, proxVenc: '2026-11-22', bus: [{ nome: 'Nutrição', valor: 8000 }] }, P);
  assert.deepEqual([prev.prazo, prev.campos.a_vencer, prev.campos.vencido, prev.campos.bloqueio], ['2026-11-22', 8000, '', '']);
  const c = capaDoCaso({ vencido: 3200, diasAtraso: 5, vencMaisAntigo: '2026-11-14', bus: [{ nome: 'Nutrição', valor: 3200 }], bloqueioDevido: 'PEDIDOS',
    bloqueioAplicado: '', temAcao: true, acaoFeita: false }, P);
  assert.deepEqual([c.campos.vencido, c.campos.bus, c.campos.acao_fase, c.campos.acordo, c.campos.ultimo_contato, c.campos.bloqueio],
    [3200, 'Nutrição 100%', 'a_fazer', '', '', 'pedidos']);
  assert.deepEqual(c.etiquetas, ['Bloqueio a aplicar']);
  assert.match(capaDoCaso({ vencido: 100, acordo: { pagas: 1, n: 4 } }, P).campos.acordo, /1 de 4/);
  assert.equal(capaDoCaso({ vencido: 100, protestado: true }, P).etiquetas.includes('Protestado'), true);
});
