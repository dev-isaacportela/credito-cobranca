// Regra pura da 006 (node --test): meses, índice de concentração (RN-014), ranking, gerada estimada (RN-008),
// região (RN-018) e a validação dos parâmetros do painel. As mesmas funções entram nas SFs por FONTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarMes, mesAnterior, mesSeguinte, hhi, faixaHhi, ranking, geradaEstimada, regiaoDaUf } from '../lib/painel-consolidado/calculo.mjs';
import { PARAMETROS, validarConjunto } from '../lib/parametros/006-painel-consolidado.mjs';

test('somarMes atravessa a virada do ano', () => {
  assert.equal(somarMes('2026-11', 2), '2027-01');
  assert.equal(mesAnterior('2027-01'), '2026-12');
  assert.equal(mesSeguinte('2026-12'), '2027-01');
  assert.equal(somarMes('2026-11', -11), '2025-12');
});

test('RN-014: índice de concentração e faixa (C-018, C-025)', () => {
  assert.equal(hhi([8000, 6000, 3000, 3000, 2000, 2000]), 2187.5);
  assert.equal(hhi([12000, 8000, 4000]), 3888.9);
  assert.equal(hhi([]), null);
  assert.equal(hhi([0, 0]), null);
  assert.equal(faixaHhi(2187.5, 1500, 2500), 'moderada');
  assert.equal(faixaHhi(1499.9, 1500, 2500), 'pulverizada');
  assert.equal(faixaHhi(2500, 1500, 2500), 'alta');
  assert.equal(faixaHhi(null, 1500, 2500), null);
});

test('RN-018: ranking soma por chave, ordena e acumula', () => {
  const r = ranking([{ chave: 'a', valor: 1000 }, { chave: 'b', valor: 3000 }, { chave: 'a', valor: 1000 }, { chave: 'c', valor: 0 }]);
  assert.deepEqual(r.map((x) => [x.chave, x.valor, x.pct, x.pctAcum]), [['b', 3000, 60, 60], ['a', 2000, 40, 100]]);
  assert.equal(regiaoDaUf('go'), 'Centro-Oeste');
  assert.equal(regiaoDaUf(''), 'Sem região');
});

test('RN-008: gerada estimada sobre fechamento manual nunca é negativa', () => {
  assert.equal(geradaEstimada(25000, 22000, 0), 3000);
  assert.equal(geradaEstimada(20000, 22000, 1000), 0);
});

test('RNF-004: parâmetros do painel e a ordem moderado < alto', () => {
  const chaves = PARAMETROS.map((p) => p.chave);
  for (const c of ['meta.inadPct', 'meta.vencido90Pct', 'meta.pddPct', 'meta.recuperacaoPct', 'painel.hhiModerado', 'painel.hhiAlto', 'painel.sincAtrasoMin']) {
    assert.ok(chaves.includes(c), c);
  }
  assert.match(validarConjunto.painel({ 'painel.hhiModerado': 3000, 'painel.hhiAlto': 2500 })[0], /moderado/);
  assert.deepEqual(validarConjunto.painel({ 'painel.hhiModerado': 1500, 'painel.hhiAlto': 2500, 'painel.sincAtrasoMin': 30 }), []);
  assert.equal(validarConjunto.painel({ 'painel.hhiModerado': 1500, 'painel.hhiAlto': 2500, 'painel.sincAtrasoMin': 5, 'base.syncIntervaloMin': 10 }).length, 1);
});
