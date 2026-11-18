// Fragmentos SQL da B1 (guarda, visibilidade, parâmetro, ccPodeMover) sobre o banco do elenco: o MESMO
// texto que vai ao MySQL, passado só pelo dialeto do simulador. A visibilidade em SQL tem de bater com a
// regra em memória `visivel()` do preâmbulo.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { montarBanco, descartarBanco } from '../simulator/seed.mjs';
import { bindParams } from '../simulator/runtime.mjs';
import { toSqlite } from '../simulator/mysql-dialect.mjs';
import { EU, MEMBRO_A, clienteVisivel, membroVisivel, visivel } from '../lib/visibilidade.mjs';
import { ATOR, ROTINA, PODE_ADMINISTRAR, NIVEL_MIN, clienteVisivelA } from '../lib/guarda.mjs';
import { PARAM, PARAM_NUM } from '../lib/parametros.mjs';
import { montarPodeMover } from '../lib/quadros.mjs';
import { USUARIOS, EQUIPE, U, M } from '../simulator/seed/000-elenco.mjs';

let banco;
const AGENTES = { 1001: 'ana', 1002: 'ana', 1010: 'ana', 1004: 'bruno', 1005: 'bruno', 1012: 'bruno', 1006: 'carlos', 1007: 'carlos', 1008: 'sergio' };
const CLIENTES = Array.from({ length: 12 }, (_, i) => 1001 + i);

/** SQL com {{params}} e :VAR_USER ligados como a plataforma, traduzido para o SQLite. */
const rodar = (sql, input = {}, userId = 0) => banco.db.prepare(toSqlite(bindParams(sql, input, userId))).all().map((l) => ({ ...l }));

before(async () => {
  banco = await montarBanco({
    ate: 3,
    quadros: [{ slug: 'teste-gancho', nome: 'Teste do gancho', fases: [{ chave: 'a', nome: 'A' }, { chave: 'b', nome: 'B' }] }],
  });
  const inserir = banco.db.prepare('INSERT INTO CC_CLIENTE (CODCLI, NOME, AGENTE_ID, ANALISTA_ID, NO_JURIDICO) VALUES (?, ?, ?, ?, ?)');
  for (const codcli of CLIENTES) {
    inserir.run(codcli, `CLIENTE ${codcli}`, AGENTES[codcli] ? M[AGENTES[codcli]] : null, codcli === 1003 ? M.rita : null, codcli === 1004 ? 1 : 0);
  }
});

after(() => descartarBanco(banco));

test('C-009: visibilidade por EU (sessão) = visivel() em memória, para os 12 usuários', () => {
  const clientes = rodar(`SELECT C.CODCLI, C.NO_JURIDICO, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO FROM CC_CLIENTE C
    LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID`);
  const contagem = {};
  for (const u of USUARIOS) {
    const sql = rodar(`SELECT C.CODCLI FROM CC_CLIENTE C ${EU} WHERE ${clienteVisivel('C')} ORDER BY C.CODCLI`, {}, u.id).map((l) => l.CODCLI);
    const m = EQUIPE.find((e) => e.login === u.login && e.ativo !== false);
    const membro = m ? { membroId: m.id, cargo: m.cargo, caminho: m.caminho, veTudo: m.admin === true || ['GERENTE', 'DIRETORIA'].includes(m.cargo) } : null;
    assert.deepEqual(sql, clientes.filter((c) => visivel(membro, c)).map((c) => c.CODCLI), u.login);
    contagem[u.login] = sql.length;
  }
  // Sérgio: 3 da Ana, 3 do Bruno, o próprio 1008 e o 1003 da Rita (analista abaixo dele).
  assert.deepEqual(contagem, {
    nara: 12, diana: 12, gustavo: 12, sergio: 8, silvia: 2, ana: 3, bruno: 3, carlos: 2, julia: 1, otavio: 0, visitante: 0, rita: 1,
  });
});

test('01 §6: MEMBRO_A e clienteVisivelA dão o mesmo que EU, sem sessão', () => {
  for (const m of EQUIPE.filter((e) => e.ativo !== false)) {
    const porEu = rodar(`SELECT C.CODCLI FROM CC_CLIENTE C ${EU} WHERE ${clienteVisivel('C')} ORDER BY C.CODCLI`, {}, USUARIOS.find((u) => u.login === m.login).id);
    const porA = rodar(`SELECT C.CODCLI FROM CC_CLIENTE C ${MEMBRO_A(m.id)} WHERE ${clienteVisivelA('C', 'A')} ORDER BY C.CODCLI`);
    assert.deepEqual(porA, porEu, m.login);
  }
  const subordinados = rodar(`SELECT X.ID FROM CC_MEMBRO X ${EU} WHERE ${membroVisivel('X.ID')} ORDER BY X.ID`, {}, U.sergio).map((l) => l.ID);
  assert.deepEqual(subordinados, [3, 5, 6, 10, 11]);
});

test('01 §5: guarda ATOR, ROTINA, PODE_ADMINISTRAR e NIVEL_MIN', () => {
  const passa = (cond, membroId, userId) => rodar(`SELECT 1 AS OK WHERE ${cond}`, { membroId }, userId).length === 1;
  assert.equal(passa(ATOR(), M.ana, U.ana), true, 'sessão = o próprio membro');
  assert.equal(passa(ATOR(), M.gustavo, U.ana), false, 'com sessão, não age por outro');
  assert.equal(passa(ATOR(), M.gustavo, 0), true, 'sem sessão, em nome de');
  assert.equal(passa(ATOR(), M.otavio, 0), false, 'inativo');
  assert.equal(passa(ROTINA, 0, 0), true);
  assert.equal(passa(ROTINA, 0, U.ana), false);
  assert.equal(passa(ATOR('{{membroId}}', PODE_ADMINISTRAR), M.nara, 0), true, 'marca ADMIN');
  assert.equal(passa(ATOR('{{membroId}}', PODE_ADMINISTRAR), M.sergio, 0), false);
  assert.equal(passa(ATOR('{{membroId}}', NIVEL_MIN(2)), M.sergio, 0), true);
  assert.equal(passa(ATOR('{{membroId}}', NIVEL_MIN(2)), M.ana, 0), false);
  const cliente = (codcli) => `EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.CODCLI = ${codcli} AND ${clienteVisivelA('C', 'A')})`;
  assert.equal(passa(ATOR('{{membroId}}', cliente(1001)), M.ana, U.ana), true);
  assert.equal(passa(ATOR('{{membroId}}', cliente(1006)), M.ana, U.ana), false);
});

test('01 §9: PARAM — carteira com valor nulo herda o padrão; vigência futura não vale hoje', () => {
  const v = (chave, carteira) => rodar(`SELECT ${PARAM_NUM(chave, `'${carteira}'`)} AS V`)[0].V;
  const padrao = v('crit.atrasoCritico', '');
  assert.ok(Number(padrao) > 0);
  banco.db.exec("INSERT INTO CC_PARAMETRO (CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO) VALUES ('crit.atrasoCritico', 'ESTETICA', NULL, '2000-01-01')");
  assert.equal(v('crit.atrasoCritico', 'ESTETICA'), padrao);
  banco.db.exec("INSERT INTO CC_PARAMETRO (CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO) VALUES ('crit.atrasoCritico', 'PUBLICA', '99', '2000-01-01')");
  assert.equal(Number(v('crit.atrasoCritico', 'PUBLICA')), 99);
  banco.db.exec("INSERT INTO CC_PARAMETRO (CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO) VALUES ('crit.atrasoCritico', '', '77', '2027-01-01')");
  assert.equal(v('crit.atrasoCritico', ''), padrao);
  assert.equal(rodar(`SELECT ${PARAM('base.vencimentoDiaNaoUtil')} AS V`)[0].V, 'CORRIDO');
});

test('01 §14: ccPodeMover — sem vínculo, trecho do quadro e padrão', () => {
  const fases = banco.quadros.find((q) => q.slug === 'teste-gancho').fases;
  const sql = montarPodeMover([{ slug: 'teste-gancho', clausulas: "        WHEN M.CARGO = 'AGENTE' THEN 'Agente não move neste quadro.'" }]);
  const pode = (usuarioId, faseId) => rodar(sql, { usuarioId, cardId: 0, boardId: 0, faseId })[0];
  assert.deepEqual(pode(U.visitante, fases.b), { PODE: 0, MOTIVO: 'Usuário sem vínculo na equipe.' });
  assert.deepEqual(pode(U.ana, fases.b), { PODE: 0, MOTIVO: 'Agente não move neste quadro.' });
  assert.deepEqual(pode(U.gustavo, fases.b), { PODE: 1, MOTIVO: '' });
  assert.deepEqual(pode(U.ana, 999999), { PODE: 1, MOTIVO: '' }, 'quadro sem trecho cai no padrão');
});

test('DT-45: número como parâmetro — fora de literal só LIMIT/OFFSET ficam crus; 1 OR 1=1 vira número', async () => {
  const { numerosComoParametro } = await import('../lib/guarda.mjs');
  const t = numerosComoParametro("SELECT 1 FROM T WHERE ID = {{id}} AND N = '{{nome}}' AND B LIKE '%{{b}}%' AND V <= {{valor}} LIMIT {{limite}} OFFSET {{offset}}", ['valor']);
  assert.equal(t, "SELECT 1 FROM T WHERE ID = CAST('{{id}}' AS SIGNED) AND N = '{{nome}}' AND B LIKE '%{{b}}%' AND V <= CAST('{{valor}}' AS DECIMAL(15,2)) LIMIT {{limite}} OFFSET {{offset}}");
  assert.deepEqual(rodar(numerosComoParametro('SELECT COUNT(*) AS N FROM CC_MEMBRO WHERE ID = {{id}}'), { id: '0 OR 1=1' }), [{ N: 0 }]);
  // Toda SQL publicada de 001 a 006 (a 007 tem o teste dela).
  const fora = (code) => code.split(/'(?:[^']|'')*'/).join(' ').replace(/\b(LIMIT|OFFSET)\s+\{\{\w+\}\}/g, '').match(/\{\{\w+\}\}/g);
  for (const arq of ['add-010-base', 'add-020-cobranca-privada', 'add-030-juridico', 'add-040-concessao-credito', 'add-050-setor-publico', 'add-060-painel-consolidado']) {
    const { definitions } = await import(`../${arq}.mjs`);
    for (const d of definitions.filter((x) => x.type === 'SQL')) assert.equal(fora(d.code), null, `${arq} ${d.name}`);
  }
});

/**
 * 06 §5 · erro 1093: `UPDATE`/`DELETE` de T que lê T numa subconsulta. Toda leitura de T dentro da escrita
 * tem de estar numa tabela derivada que o MySQL materialize (`SELECT DISTINCT`, `GROUP BY` ou agregado no
 * nível da derivada); derivada simples é fundida (derived_merge) e o 1093 volta. Varre o texto de toda
 * definition (SQL e JS), inclusive a lib de quadros.
 */
export function leiturasDaMesmaTabela(code) {
  const achados = [];
  const re = /\b(UPDATE|DELETE\s+FROM)\s+([A-Z][A-Z0-9_]*)\b/g;
  let m;
  while ((m = re.exec(code))) {
    const t = m[2];
    const inicio = m.index;
    // Fim da instrução: parêntese que fecha além do início, `;` ou crase no nível 0.
    let fim = code.length;
    for (let i = inicio, d = 0; i < code.length; i++) {
      const c = code[i];
      if (c === '(') d++;
      else if (c === ')' && --d < 0) { fim = i; break; }
      else if ((c === ';' || c === '`') && d === 0) { fim = i; break; }
    }
    const instr = code.slice(inicio, fim);
    const leitura = new RegExp(String.raw`\b(FROM|JOIN)\s+${t}\b`, 'g');
    let l;
    while ((l = leitura.exec(instr))) {
      if (l.index === 0 || /^DELETE\s+FROM/.test(instr.slice(0, l.index + 4))) continue; // o alvo do DELETE
      // Parênteses abertos que contêm a leitura, do mais externo ao mais interno.
      const abertos = [];
      for (let i = 0; i < l.index; i++) {
        if (instr[i] === '(') abertos.push(i);
        else if (instr[i] === ')') abertos.pop();
      }
      const materializada = abertos.some((p) => {
        if (!/\b(FROM|JOIN)\s*$/.test(instr.slice(0, p))) return false; // não é tabela derivada
        let d = 0, topo = '';
        for (let i = p + 1; i < instr.length; i++) {
          const c = instr[i];
          if (c === '(') { if (d === 0) topo += '('; d++; continue; }
          if (c === ')') { if (d === 0) break; d--; continue; }
          if (d === 0) topo += c;
        }
        return /^\s*SELECT\s+DISTINCT\b/.test(topo) || /\bGROUP\s+BY\b/.test(topo) || /\b(COUNT|SUM|MAX|MIN|AVG)\s*\(/.test(topo);
      });
      if (!materializada) achados.push(`${m[1].replace(/\s+/g, ' ')} ${t}: ${instr.slice(l.index, l.index + 60).replace(/\s+/g, ' ')}`);
    }
  }
  return achados;
}

test('06 §5 · 1093: o detector acusa derivada simples e aceita DISTINCT/agregado', () => {
  assert.equal(leiturasDaMesmaTabela('UPDATE T SET A = 1 WHERE NOT EXISTS (SELECT 1 FROM T X WHERE X.ID = 2)').length, 1);
  assert.equal(leiturasDaMesmaTabela('UPDATE T SET A = 1 WHERE NOT EXISTS (SELECT 1 FROM (SELECT X.ID FROM T X) Y)').length, 1);
  assert.equal(leiturasDaMesmaTabela('UPDATE T SET A = 1 WHERE NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT X.ID FROM T X) Y)').length, 0);
  assert.equal(leiturasDaMesmaTabela('UPDATE T SET A = 1 WHERE (SELECT U.N FROM (SELECT COUNT(*) AS N FROM T X WHERE X.B = 1) U) = 0').length, 0);
  assert.equal(leiturasDaMesmaTabela('DELETE FROM T WHERE ID IN (SELECT Y.ID FROM (SELECT X.ID FROM T X GROUP BY X.ID) Y)').length, 0);
  assert.equal(leiturasDaMesmaTabela('UPDATE T SET A = 1 WHERE EXISTS (SELECT 1 FROM T2 X JOIN U ON U.ID = X.ID)').length, 0);
});

test('06 §5 · 1093: nenhuma escrita de nenhuma definition lê a própria tabela sem derivada materializada', async () => {
  const { loadDefinitions } = await import('../simulator/runtime.mjs');
  const { byName } = await loadDefinitions();
  const achados = [];
  for (const [nome, d] of byName) for (const a of leiturasDaMesmaTabela(String(d.code))) achados.push(`${nome} (${d.file}) · ${a}`);
  assert.deepEqual(achados, []);
});

test('B5 O-01: republicar a referência não devolve o feriado nacional que o gestor removeu', async () => {
  const { semearReferencia } = await import('../setup-backend.mjs');
  const { execSqlite } = await import('../simulator/seed/000-elenco.mjs');
  const natal = () => banco.db.prepare("SELECT COUNT(*) AS N FROM CC_FERIADO WHERE DATA = '2026-12-25'").get().N;
  assert.equal(natal(), 1);
  banco.db.exec("DELETE FROM CC_FERIADO WHERE DATA = '2026-12-25'");
  const r = await semearReferencia(execSqlite(banco.db), { agoraIso: '2026-11-19T10:00:00', anos: [2026, 2027, 2028] });
  assert.equal(natal(), 0);
  assert.equal(r.feriados, banco.db.prepare("SELECT COUNT(*) AS N FROM CC_FERIADO WHERE DATA LIKE '2028-%'").get().N, 'ano novo é gerado');
});
