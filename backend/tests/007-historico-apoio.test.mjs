// Regras puras da 007-historico-apoio (node --test): carga inicial, link, data, busca normalizada, regras em vigor e
// a montagem da linha do tempo. O que depende do banco (visibilidade, ordem, emissão) está no smoke.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FONTES, MATERIAIS, sqlCargaInicial, cargaInicial } from '../lib/historico-apoio/carga-inicial.mjs';
import { linkValido, dataValida, normalizar } from '../lib/historico-apoio/texto.mjs';
import { aplica, montarRegras } from '../lib/historico-apoio/regras.mjs';
import { readFileSync } from 'node:fs';
import { origens, CATEGORIAS, CID_SQL, EVENTOS_SQL, ECO_AUDITORIA } from '../lib/historico-apoio/eventos.mjs';
import { definitions } from '../add-070-historico-apoio.mjs';

test('C-010 · C-016: carga inicial — 41 fontes em 6 grupos (21 a revisar) e 7 materiais sem arquivo', () => {
  const grupos = [...new Set(FONTES.map((f) => f.GRUPO))];
  assert.deepEqual(grupos.map((g) => FONTES.filter((f) => f.GRUPO === g).length), [6, 3, 9, 5, 12, 6]);
  assert.equal(FONTES.filter((f) => f.REVISAR_JURIDICO).length, 21);
  assert.ok(FONTES.every((f) => !f.URL && f.BUSCA === normalizar(`${f.TITULO} ${f.RESPONSAVEL} ${f.USO}`)));
  assert.equal(new Set(FONTES.map((f) => `${f.GRUPO}|${f.TITULO}`)).size, 41);
  assert.equal(MATERIAIS.length, 7);
  const sql = sqlCargaInicial('2026-11-19T10:00:00');
  assert.equal(sql.length, 2);
  assert.ok(sql.every((s) => s.startsWith('INSERT IGNORE')));
});

test('RN-011: link vazio, http e https aceitos; sem protocolo, ftp e javascript recusados', () => {
  for (const ok of ['', null, 'http://a.gov.br', 'https://a.gov.br/x?y=1']) assert.equal(linkValido(ok), true, String(ok));
  for (const nao of ['a.gov.br', 'ftp://a', 'javascript:alert(1)', 'https://a b']) assert.equal(linkValido(nao), false, nao);
});

test('RF-018: vigente desde é data AAAA-MM-DD válida ou vazia', () => {
  assert.equal(dataValida(''), true);
  assert.equal(dataValida('', false), false);
  assert.equal(dataValida('2026-11-19'), true);
  for (const nao of ['2026-02-30', '19/11/2026', '2026-1-1']) assert.equal(dataValida(nao), false, nao);
});

test('RN-013: busca sem acento e sem caixa', () => {
  assert.equal(normalizar('Licitações e Contratos'), normalizar('LICITACOES E CONTRATOS'));
  assert.equal(normalizar('  Política  '), 'POLITICA');
});

test('C-017 · RN-014: regras por carteira — próprio só fora da Privada, desde só no próprio, régua não se aplica na Pública', () => {
  const linha = (chave, grupo, efetivo, carteira, desde) => ({ CHAVE: chave, GRUPO: grupo, ORDEM: 1, ROTULO: chave, TIPO: 'NUMERO', UNIDADE: '%',
    DESCRICAO: '', POR_CARTEIRA: 1, VALOR_PADRAO: 0.5, VALOR_EFETIVO: efetivo, VALOR_CARTEIRA: carteira, VIGENCIA_INICIO: desde });
  const [r] = montarRegras({
    PRIVADA: [linha('enc.correcao', 'enc', 0.5, null, '2026-01-01')],
    ESTETICA: [linha('enc.correcao', 'enc', 0.3, 0.3, '2026-11-19')],
    PUBLICA: [linha('enc.correcao', 'enc', 0.5, null, '2026-01-01')],
  });
  assert.deepEqual(r.padrao, { valor: 0.5, desde: '2026-01-01' });
  assert.deepEqual(r.carteiras.ESTETICA, { valor: 0.3, proprio: true, desde: '2026-11-19', aplica: true });
  assert.deepEqual(r.carteiras.PUBLICA, { valor: 0.5, proprio: false, desde: null, aplica: true });
  assert.deepEqual([aplica('PUBLICA', 'regua.notif', 'regua'), aplica('PRIVADA', 'pub.x', 'pub'), aplica('PUBLICA', 'cob.emailModo', 'cob')],
    [false, false, false]);
  assert.equal(aplica('PUBLICA', 'enc.multa', 'enc'), true);
});

test('RN-004: 39 origens, cada uma com uma das 8 categorias e as mesmas 9 colunas; cliente por CAST', () => {
  const lista = origens(CID_SQL);
  assert.equal(lista.length, 39);
  assert.ok(lista.every((o) => CATEGORIAS.includes(o.categoria)));
  assert.equal(new Set(lista.map((o) => o.categoria)).size, 8);
  const sql = EVENTOS_SQL(CID_SQL);
  assert.ok(!/NOW\(\)|CURDATE\(\)|CURRENT_TIMESTAMP/i.test(sql), 'relógio único');
  assert.ok(!sql.includes("= '{{clienteId}}'") && !sql.includes('= {{clienteId}}'), 'clienteId só pelo CAST');
});

test('C-004 · C-012: nenhum parâmetro numérico entra cru na SQL da 007 (só LIMIT/OFFSET, que o MySQL exige literal)', () => {
  for (const d of definitions.filter((x) => x.type === 'SQL')) {
    const crus = d.code.replace(/LIMIT \{\{limite\}\} OFFSET \{\{offset\}\}/g, '').match(/(?<!')\{\{\w+\}\}(?!')/g);
    assert.equal(crus, null, `${d.name}: ${crus}`);
  }
});

test('C-022: os pares do eco (ENTIDADE|CAMPO) ainda são o que as donas gravam (B4 O-06)', () => {
  const donas = ['add-010-base.mjs', 'add-020-cobranca-privada.mjs', 'add-030-juridico.mjs', 'add-040-concessao-credito.mjs']
    .map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n');
  for (const par of ECO_AUDITORIA) {
    const [entidade, campo] = par.split('|');
    assert.ok(donas.includes(`campo: '${campo}'`), `${par}: campo`);
    assert.ok(donas.includes(`'${entidade}'`), `${par}: entidade`);
  }
  assert.ok(ECO_AUDITORIA.includes('CREDITO|Crédito') && ECO_AUDITORIA.includes('CREDITO|Crédito renovado'));
});
