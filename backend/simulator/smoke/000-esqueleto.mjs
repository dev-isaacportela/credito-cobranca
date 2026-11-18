// Esqueleto (integrador, T-010): o simulador imita a plataforma como o contrato pede (06 §1, §4, §5).
// Banco: só o elenco e o quadro de teste (nenhum seed de spec). Cada teste numa cópia do banco.

import {
  teste, assert, como, chamar, consultar, db, banco, execucoes, substituir, nasDuasSessoes, winthorFora,
  comRelogio, dia, diaUtil, nota, cliente, documentoDe, U, M, montarBanco,
} from './base.mjs';
import { toSqlite } from '../mysql-dialect.mjs';
import { winthorSqlite } from '../runtime.mjs';
import { descartarBanco, seedsPresentes } from '../seed.mjs';
import { FRONTEND_MAP } from '../config.mjs';
import { js, MARCADOR_IDS } from '../../lib/escritas.mjs';
import { AGORA_SQL, HOJE_SQL } from '../../lib/tempo.mjs';
import { NUMEROS_20, ITEM } from '../../lib/guarda.mjs';
import { PARAM, PARAM_NUM } from '../../lib/parametros.mjs';
import { TODOS, preencher } from '../../lib/winthor-sql.mjs';
import { nomesAusentesNoMapa } from '@benenutri/mitra-kanban/backend';

export const SEEDS = [];
export const BANCO_POR_TESTE = true;
export const QUADROS_TESTE = [{
  slug: 'esqueleto-teste',
  nome: 'Esqueleto (teste)',
  fases: [
    { chave: 'entrada', nome: 'Entrada' },
    { chave: 'andamento', nome: 'Em andamento', slaHoras: 24 },
    { chave: 'feito', nome: 'Feito', tipo: 'sucesso' },
  ],
  etiquetas: [{ rotulo: 'Urgente', cor: '#d33' }],
}];

/** Linha única de uma consulta MySQL traduzida para o SQLite. */
const um = (sql) => ({ ...db().prepare(toSqlite(sql)).get() });

export async function suite() {
  await teste('ESQ-01: dialeto MySQL das SFs roda no SQLite (06 §5)', async () => {
    const r = um(`SELECT DATE_FORMAT('2026-11-19', '%d/%m/%Y') AS F, DATEDIFF('2026-11-19', '2026-11-07') AS D,
      DATE_ADD('2026-11-19', INTERVAL 12 DAY) AS A, GREATEST(1, 5, 3) AS G, LEAST(4, 2) AS L,
      FIND_IN_SET('3', '1,3,5') AS FS, SUBSTRING_INDEX(SUBSTRING_INDEX('a¦b¦c', '¦', 2), '¦', -1) AS SI,
      JSON_UNQUOTE(JSON_EXTRACT('{"x":"y"}', '$.x')) AS J, CAST('12.5' AS DECIMAL(15,2)) AS C, 1 * 1.0 / 2 AS DIV,
      CONVERT_TZ('2026-11-19 13:00:00', '+00:00', '-03:00') AS TZ`);
    assert.equal(r.F, '19/11/2026');
    assert.equal(Number(r.D), 12);
    assert.equal(String(r.A).slice(0, 10), '2026-12-01');
    assert.equal(Number(r.G), 5);
    assert.equal(Number(r.L), 2);
    assert.equal(Number(r.FS), 2);
    assert.equal(r.SI, 'b');
    assert.equal(r.J, 'y');
    assert.equal(Number(r.C), 12.5);
    assert.equal(Number(r.DIV), 0.5);
    assert.equal(String(r.TZ).slice(0, 16).replace('T', ' '), '2026-11-19 10:00');
    const g = um("SELECT GROUP_CONCAT(NOME ORDER BY ID SEPARATOR ', ') AS N FROM CC_BU");
    assert.equal(g.N, 'Nutrição, Enfermagem, Medicamento, Estética');
    // Upsert e INSERT IGNORE pela UNIQUE KEY do DDL.
    db().prepare(toSqlite("INSERT INTO CC_ESTADO (CHAVE, VALOR) VALUES ('t', '1') ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR)")).run();
    db().prepare(toSqlite("INSERT INTO CC_ESTADO (CHAVE, VALOR) VALUES ('t', '2') ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR)")).run();
    db().prepare(toSqlite("INSERT IGNORE INTO CC_ESTADO (CHAVE, VALOR) VALUES ('t', '3')")).run();
    assert.deepEqual(consultar("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 't'"), [{ VALOR: '2' }]);
    // Listas alinhadas sem JSON_TABLE (01 §5).
    const itens = db().prepare(toSqlite(`SELECT N.N AS I, ${ITEM('lista').replace("'{{lista}}'", "'x¦y¦z'")} AS V FROM ${NUMEROS_20} WHERE N.N <= 3 ORDER BY N.N`)).all();
    assert.deepEqual(itens.map((l) => l.V), ['x', 'y', 'z']);
    // Parâmetro em vigor (padrão de 03).
    assert.equal(Number(um(`SELECT ${PARAM_NUM('crit.atrasoCritico')} AS V`).V) > 0, true);
    assert.equal(um(`SELECT ${PARAM('base.vencimentoDiaNaoUtil')} AS V`).V !== null, true);
  });

  await teste('ESQ-02: dialeto Oracle do Winthor (NVL, TO_DATE, TO_CHAR, TRUNC, SYSDATE = CC_AGORA)', async () => {
    const r = um(`SELECT NVL(NULL, 7) AS N, TO_CHAR(TO_DATE('19/11/2026', 'DD/MM/YYYY'), 'YYYY-MM-DD') AS T,
      TRUNC(TO_DATE('2026-11-19', 'YYYY-MM-DD')) AS TR, TO_CHAR(SYSDATE, 'YYYY-MM-DD') AS S FROM DUAL`);
    assert.equal(Number(r.N), 7);
    assert.equal(r.T, '2026-11-19');
    assert.equal(String(r.TR).slice(0, 10), '2026-11-19');
    assert.equal(r.S, '2026-11-19');
  });

  await teste('ESQ-03: relógio único em SQL, JS e Date (06 §1)', async () => {
    const corpo = `const [l] = await ler("SELECT ${AGORA_SQL} AS A, ${HOJE_SQL} AS H");
return { agora: agora(), hoje: hoje(), date: new Date().toISOString(), now: Date.now(), sqlAgora: l.A, sqlHoje: l.H };`;
    substituir('zzRelogio', { type: 'JAVASCRIPT', code: js(corpo) });
    const r = await chamar('zzRelogio');
    assert.deepEqual(r, {
      agora: '2026-11-19T10:00:00', hoje: '2026-11-19', date: '2026-11-19T13:00:00.000Z',
      now: Date.parse('2026-11-19T13:00:00Z'), sqlAgora: '2026-11-19T10:00:00', sqlHoje: '2026-11-19',
    });
    const depois = await comRelogio('2026-12-01T08:30:00', () => chamar('zzRelogio'));
    assert.equal(depois.sqlAgora, '2026-12-01T08:30:00');
    assert.equal(depois.date, '2026-12-01T11:30:00.000Z');
    assert.equal((await chamar('zzRelogio')).hoje, '2026-11-19');
    // Ajudantes do seed contam do RELOGIO do banco; 20/11/2026 é feriado nacional.
    assert.equal(dia(-12), '2026-11-07');
    assert.equal(diaUtil(1), '2026-11-23');
    assert.equal(diaUtil(0), '2026-11-19');
  });

  await teste('ESQ-04: sessão, quem() e chamada aninhada nas duas hipóteses (DT-34)', async () => {
    substituir('zzQuem', { type: 'JAVASCRIPT', code: js('return await quem();') });
    substituir('zzChamaQuem', { type: 'JAVASCRIPT', code: js("return await escrever('zzQuem', { membroId: Number(event.membroId) || 0 });") });
    const ana = await como('ana', () => chamar('zzQuem', { membroId: M.carlos }));
    assert.equal(ana.membroId, M.ana, 'com sessão, o membroId do input é ignorado');
    assert.equal(ana.userId, U.ana);
    assert.equal((await como('visitante', () => chamar('zzQuem'))).membroId, 0);
    assert.equal((await como('otavio', () => chamar('zzQuem'))).membroId, 0, 'membro inativo não é da equipe');
    assert.equal((await como(null, () => chamar('zzQuem'))).rotina, true);
    const emNome = await como(null, () => chamar('zzQuem', { membroId: M.bruno }));
    assert.equal(emNome.membroId, M.bruno);
    assert.equal(emNome.emNomeDe, true);
    assert.equal((await como('nara', () => chamar('zzQuem'))).veTudo, true);

    const r = await nasDuasSessoes(async (modo) => {
      const q = await como('ana', () => chamar('zzChamaQuem', { membroId: M.ana }));
      assert.equal(q.userId, modo === '1' ? U.ana : 0);
      return { membroId: q.membroId, nome: q.nome, cargo: q.cargo };
    });
    assert.deepEqual(r, { membroId: M.ana, nome: 'Ana Costa', cargo: 'AGENTE' });
  });

  await teste('ESQ-05: quadro de teste semeado no passo 3 e card criado e movido pela lib', async () => {
    const quadro = banco().quadros.find((q) => q.slug === 'esqueleto-teste');
    assert.ok(quadro, 'quadro de teste semeado');
    assert.deepEqual(consultar("SELECT CHAVE, ORDEM, FINAL FROM CC_FASE WHERE QUADRO = 'esqueleto-teste' ORDER BY ORDEM"),
      [{ CHAVE: 'entrada', ORDEM: 1, FINAL: 0 }, { CHAVE: 'andamento', ORDEM: 2, FINAL: 0 }, { CHAVE: 'feito', ORDEM: 3, FINAL: 1 }]);
    const etiquetas = consultar(`SELECT CONFIG_JSON FROM KB_CAMPO WHERE BOARD_ID = ${quadro.boardId} AND CHAVE = 'etiquetas'`);
    assert.equal(JSON.parse(etiquetas[0].CONFIG_JSON).opcoes[0].rotulo, 'Urgente');

    const r = await nasDuasSessoes(async () => {
      const criado = await como(null, () => chamar('kbCardCriar', { boardId: quadro.boardId, titulo: 'Card de teste', criadoPor: U.gustavo, origem: 'sistema' }));
      assert.equal(criado.ok, true, criado.error);
      const movido = await como(null, () => chamar('kbCardMover', { cardId: criado.id, faseId: quadro.fases.feito, movidoPor: U.gustavo, origem: 'sistema' }));
      assert.equal(movido.ok, true, movido.error);
      const [card] = consultar(`SELECT FASE_ID, CRIADO_POR, FASE_DESDE, CONCLUIDO_EM FROM KB_CARD WHERE ID = ${criado.id}`);
      const movimentos = consultar(`SELECT PARA_FASE_ID, USUARIO_ID, ORIGEM FROM KB_MOVIMENTO WHERE CARD_ID = ${criado.id} ORDER BY ID`);
      return { card, movimentos };
    });
    assert.deepEqual(r.card, { FASE_ID: quadro.fases.feito, CRIADO_POR: U.gustavo, FASE_DESDE: '2026-11-19T13:00:00', CONCLUIDO_EM: '2026-11-19T13:00:00' });
    assert.deepEqual(r.movimentos.map((m) => m.PARA_FASE_ID), [quadro.fases.entrada, quadro.fases.feito]);
    assert.ok(r.movimentos.every((m) => m.USUARIO_ID === U.gustavo && m.ORIGEM === 'sistema'));
  });

  await teste('ESQ-06: contador de execuções conta as aninhadas', async () => {
    const quadro = banco().quadros.find((q) => q.slug === 'esqueleto-teste');
    const n = await execucoes(() => como(null, () => chamar('kbCardCriar', { boardId: quadro.boardId, titulo: 'Conta', criadoPor: U.ana, origem: 'sistema' })));
    assert.ok(n >= 3, `kbCardCriar + escritas por id: ${n}`);
    assert.equal(await execucoes(async () => {}), 0);
  });

  await teste('ESQ-07: runDmlMitra só em cron; e-mail em SIM_EMAIL e falha em @falha.test (06 §4)', async () => {
    substituir('zzDml', { type: 'JAVASCRIPT', code: js(`await sdk.runDmlMitra({ projectId, sql: "INSERT INTO CC_ESTADO (CHAVE, VALOR) VALUES ('dml', 'x')" });
return { ok: true };`) });
    await assert.rejects(() => como('gustavo', () => chamar('zzDml')), /BUSINESS_ACCESS_DENIED/);
    await banco().runner.executar('zzDml', {}, { cron: true });
    assert.equal(consultar("SELECT COUNT(*) AS N FROM CC_ESTADO WHERE CHAVE = 'dml'")[0].N, 1);

    substituir('zzEmail', { type: 'JAVASCRIPT', code: js(`try { await sdk.sendEmailMitra({ projectId, to: [event.para], subject: 'Assunto', body: 'Corpo' }); return { ok: true }; }
catch (e) { return { ok: false, error: e.message }; }`) });
    assert.deepEqual(await chamar('zzEmail', { para: 'marta@hsl.com.br' }), { ok: true });
    assert.equal((await chamar('zzEmail', { para: 'x@falha.test' })).ok, false);
    assert.deepEqual(consultar('SELECT PARA, ASSUNTO, CORPO, EM FROM SIM_EMAIL'), [{ PARA: 'marta@hsl.com.br', ASSUNTO: 'Assunto', CORPO: 'Corpo', EM: '2026-11-19T10:00:00' }]);
  });

  await teste('ESQ-08: SQL do Winthor roda sobre as PC* e o executor só aceita leitura (RNF-005)', async () => {
    cliente({ codcli: 1001, nome: 'HOSPITAL SAO LUCAS LTDA', limite: 10000, plano: '35' });
    nota({ codcli: 1001, n: 1, emissao: dia(-42), itens: [{ codprod: 101, valor: 600 }, { codprod: 201, valor: 400 }], parcelas: [{ prest: '1', valor: 1000, venc: dia(-12) }] });
    const erp = winthorSqlite(db());
    const valores = {
      cursor: 0, linhas: 100, de: '2026-01-01', ate: '2026-12-31', inicio: '2025-11-19', inicioCompras: '2025-11-19',
      inicioJanela: '2025-11-19', codcli: 1001, documento: '12345678000190',
    };
    for (const [nome, sql] of Object.entries(TODOS)) {
      assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE)\b/i, nome);
      await erp.query(preencher(sql, valores));
    }
    const titulos = await erp.query(preencher(TODOS.SQL_TITULOS_CLIENTE, valores));
    assert.equal(titulos.length, 2, 'um título rateado em 2 departamentos');
    assert.equal(documentoDe(2003), '20.030.000/0001-20');
    const doc = await erp.query(preencher(TODOS.SQL_CLIENTE, { ...valores, codcli: 0 }));
    assert.equal(doc.length, 1, 'busca pelo documento só dígitos');
    await assert.rejects(() => erp.query('DELETE FROM PCPREST'), /somente leitura/);
    await winthorFora(async () => {
      await assert.rejects(() => erp.query(preencher(TODOS.SQL_TITULOS_CLIENTE, valores)));
    });
    assert.equal((await erp.query(preencher(TODOS.SQL_TITULOS_CLIENTE, valores))).length, 2);
    assert.ok(consultar("SELECT COUNT(*) AS N FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'PCPREST'")[0].N >= 12);
  });

  await teste('ESQ-09: definitions sem relógio solto, sem marcador e mapa completo', async () => {
    for (const [nome, d] of banco().runner.definicoes()) {
      // `Date.now()` do preâmbulo é o relógio único (agora()), não o NOW() do SQL.
      if (nome.startsWith('cc')) assert.doesNotMatch(d.code, /(?<!\.)\bNOW\(\)|\bCURDATE\(\)|\bCURRENT_TIMESTAMP\b|\bSYSDATE\b/i, nome);
      assert.ok(!String(d.code).includes('__KB_IDS__'), `${nome} com __KB_IDS__`);
    }
    // __CC_IDS__ é trocado na execução: o corpo executado tem o mapa, nunca o marcador.
    substituir('zzMapa', { type: 'JAVASCRIPT', code: js('return { tem: Number(CC_IDS.kbCardCriar) > 0, quem: idDe(\'zzMapa\') > 0, nada: idDe(\'ccNaoExiste\') };') });
    assert.deepEqual(await chamar('zzMapa'), { tem: true, quem: true, nada: 0 });
    assert.equal(js('return 1;').includes(MARCADOR_IDS), true);
    assert.deepEqual(nomesAusentesNoMapa(FRONTEND_MAP), []);
  });

  await teste('ESQ-10: pipeline para no passo pedido e semeia o elenco (06 §2)', async () => {
    const parcial = await montarBanco({ quadros: QUADROS_TESTE, ate: 3 });
    try {
      const q = (sql) => parcial.db.prepare(sql).get();
      assert.equal(q('SELECT COUNT(*) AS N FROM INT_USER').N, 12);
      assert.equal(q('SELECT COUNT(*) AS N FROM CC_MEMBRO WHERE ATIVO = 1').N, 10);
      assert.equal(q('SELECT CAMINHO FROM CC_MEMBRO WHERE ID = 11').CAMINHO, '/1/2/3/11/');
      assert.equal(q("SELECT COUNT(*) AS N FROM CC_FASE WHERE QUADRO = 'esqueleto-teste'").N, 3);
      assert.equal(q('SELECT COUNT(*) AS N FROM CC_SINCRONIZACAO').N, 0);
      assert.equal(q("SELECT COUNT(*) AS N FROM CC_FERIADO WHERE DATA = '2026-11-20'").N, 1);
      assert.equal(q("SELECT BU_ID FROM CC_BU_DEPTO WHERE CODEPTO = 90").BU_ID, null);
      assert.equal(q("SELECT COUNT(*) AS N FROM CC_PARAMETRO_DEF WHERE SPEC_DONA = '001'").N, 38);
    } finally {
      descartarBanco(parcial);
    }
    // O banco do arquivo passou pelos 11 passos; os que dependem de SF ainda não publicada avisam.
    const avisos = banco().avisos || [];
    if (!banco().runner.existe('ccRotina')) assert.ok(avisos.some((a) => /ccRotina/.test(a)));
  });

  await teste('ESQ-11: banco do simulador com todas as specs (npm run sim:seed) termina a rotina', async () => {
    // O pipeline padrão com todos os seeds presentes, como o seed-cli: lança "A rotina não terminou em 40 rodadas" se algum passo
    // nunca esvazia os pendentes (17/11: a preventiva do 7001 encerrava e reabria a cada rodada).
    const cheio = await montarBanco({ seeds: seedsPresentes() });
    try {
      const [l] = cheio.db.prepare('SELECT ID, SITUACAO FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1').all();
      assert.equal(l.SITUACAO, 'OK');
      const passos = cheio.db.prepare('SELECT PASSO, SITUACAO, PENDENTES FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ?').all(l.ID);
      assert.ok(passos.length && passos.every((p) => p.SITUACAO === 'OK' && Number(p.PENDENTES) === 0), JSON.stringify(passos));
    } finally {
      descartarBanco(cheio);
    }
  });
}

