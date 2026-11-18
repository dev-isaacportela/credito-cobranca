// T-002 da 001 — confirmação no sandbox das hipóteses de 01 §15 (S-01 a S-16) e das observações da
// validação B1 (O-01 parâmetro numérico, O-02 erro 1093, O-03 SELECT direto por business, VARCHAR em
// modo estrito). Imprime uma linha por item: `S-nn · resultado · plano B se falhou`. O resultado vai para
// a tabela "Depende do sandbox" do plan.md da 001; item que falhar aciona o plano B antes de publicar.
//
// NÃO EXECUTE DA MÁQUINA LOCAL. Só no sandbox, com o .env real. Não existe staging: tudo aqui toca o projeto de
// produção. Por isso o roteiro só cria SFs `zzT002*`, a tabela `ZZ_T002`, chaves `t002.*` em CC_ESTADO e o quadro
// `zz-t002`, e apaga tudo no fim (também se falhar).
//
// QUANDO (CLAUDE.md "Como subir para o Mitra"; contrato 00 §5): depois da publicação COMPLETA e ANTES de liberar o
// sistema aos usuários (cadastrar a equipe além do topo, divulgar o endereço). Item que falhar: não libere; aplique o
// plano B da linha (01 §15), suba de novo o que mudou e rode este roteiro outra vez.
//
// Validação B5 (C-03): roda depois da publicação COMPLETA (todas as specs, kb*, add-090 e o sync), porque também confere
// o caminho real da rotina (cron → JS → JS aninhada com runDmlMitra e Winthor; teto de 60 s na cadeia), S-13, S-14,
// o 1093 das escritas que leem a própria tabela, a união das 39 partes do histórico, HEX × utf8mb4 e o e-mail por
// business. S-03 decide também a Ficha: `ccBaseWinthorTitulos`/`ccBaseWinthorCliente` ficam FORA_DO_PERFIL (B5 C-02);
// se a JS de business não alcançar SF fora do perfil, as duas voltam ao perfil (R-003 da 001).
//
// .env (além dos MITRA_*): T002_BUSINESS_TOKEN — token de sessão de um usuário business que é membro
// ativo com a marca ADMIN (obtido por login no app; nunca commitado); T002_EMAIL — caixa para o S-11.

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { FORA_DO_PERFIL, NOME_PERFIL } from '../add-090-perfil-acesso.mjs';
import { jdbcIdWinthor } from '../add-002-jdbc-winthor.mjs';
import { SQL_COLUNAS, COLUNAS_LIDAS } from '../lib/winthor-sql.mjs';
import { NUMEROS_20, ITEM } from '../lib/guarda.mjs';

const ehEntrada = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ehEntrada) {
  for (const k of ['MITRA_BASE_URL', 'MITRA_TOKEN', 'MITRA_PROJECT_ID', 'T002_BUSINESS_TOKEN']) {
    if (!process.env[k]) throw new Error(`${k} ausente: este roteiro roda só no sandbox do Mitra, com o .env real.`);
  }
  const sdk = await import('mitra-sdk');
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  const configurar = (token) => sdk.configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
  configurar(process.env.MITRA_TOKEN);

  /** Roda `fn` com o token do usuário business e volta ao token dev. */
  async function comoBusiness(fn) {
    configurar(process.env.T002_BUSINESS_TOKEN);
    try { return await fn(); } finally { configurar(process.env.MITRA_TOKEN); }
  }
  const linhas = (r) => r?.result?.rows ?? r?.result ?? [];
  const consultar = async (sql, jdbcId) => linhas(await sdk.runQueryMitra({ projectId, sql, ...(jdbcId ? { jdbcId } : {}) }));
  const dml = (sql) => sdk.runDmlMitra({ projectId, sql });
  const mapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const temporarias = [];
  async function criar(name, type, code, extra = {}) {
    const r = await sdk.createServerFunctionMitra({ projectId, name, type, code, description: 'T-002 (temporária)', ...extra });
    const id = r?.result?.serverFunctionId ?? (await mapa())[name];
    temporarias.push(id);
    return id;
  }
  const executar = async (serverFunctionId, input = {}) => {
    const r = await sdk.executeServerFunctionMitra({ projectId, serverFunctionId, input });
    return r?.result ?? r;
  };
  const saida = (r) => { let o = r?.output ?? r; if (typeof o === 'string') { try { o = JSON.parse(o); } catch { /* texto */ } } return o; };
  const relatorio = [];
  const linha = (item, resultado, planoB = '') => {
    const t = `${item} · ${resultado}${planoB ? ` · plano B: ${planoB}` : ''}`;
    relatorio.push(t);
    console.log(t);
  };
  const tentar = async (item, planoB, fn) => {
    try { linha(item, await fn(), planoB); } catch (e) { linha(item, `ERRO ${e?.message ?? e}`, planoB); }
  };
  const perfilId = async () => ((await sdk.listProfilesMitra({ projectId })).result ?? []).find((p) => p.name === NOME_PERFIL)?.id;
  /** Perfil = todas as SFs menos FORA_DO_PERFIL e `fora` (como o add-090). */
  async function refazerPerfil(fora = []) {
    const sfs = ((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).filter((f) => !FORA_DO_PERFIL.includes(f.name) && !fora.includes(f.name));
    await sdk.setProfileServerFunctionsMitra({ projectId, profileId: await perfilId(), serverFunctionIds: sfs.map((f) => f.id) });
  }

  const jdbc = await jdbcIdWinthor(projectId);
  try {
    await sdk.runDdlMitra({ projectId, sql: 'CREATE TABLE IF NOT EXISTS ZZ_T002 (ID INT AUTO_INCREMENT PRIMARY KEY, CHAVE VARCHAR(20) NOT NULL, V VARCHAR(5), UNIQUE KEY UK_ZZ_T002 (CHAVE))' });

    // Temporárias. zzT002Fora fica FORA do perfil (S-03).
    const idVarUser = await criar('zzT002VarUser', 'SQL', 'SELECT COALESCE(:VAR_USER, -1) AS U');
    const idFora = await criar('zzT002Fora', 'SQL', 'SELECT 1 AS OK');
    const idNum = await criar('zzT002Num', 'SQL', 'SELECT COUNT(*) AS N FROM CC_MEMBRO WHERE ID = {{id}}');
    // S-16: o mesmo com CAST (DT-45), a página por LIMIT/OFFSET (literal exigido pelo MySQL) e texto com barra invertida.
    const idNumCast = await criar('zzT002NumCast', 'SQL', "SELECT COUNT(*) AS N FROM CC_MEMBRO WHERE ID = CAST('{{id}}' AS SIGNED)");
    const idPagina = await criar('zzT002Pagina', 'SQL', 'SELECT ID FROM CC_MEMBRO ORDER BY ID LIMIT {{limite}} OFFSET {{offset}}');
    const idTexto = await criar('zzT002Texto', 'SQL', "SELECT COUNT(*) AS N FROM CC_MEMBRO WHERE USER_EMAIL = '{{email}}'");
    const idEscrita = await criar('zzT002Escrita', 'SQL', "INSERT INTO ZZ_T002 (CHAVE, V) SELECT '{{chave}}', '{{v}}' FROM DUAL");
    const idLote = await criar('zzT002Lote', 'SQL', `INSERT INTO ZZ_T002 (CHAVE, V) SELECT CONCAT('lote', N.N), ${ITEM('lista')} FROM ${NUMEROS_20} WHERE N.N <= {{n}}
  AND FIND_IN_SET('b', '{{csv}}') > 0`);
    const corpoAninhada = `const sdk = require('mitra-sdk'); const projectId = Number(process.env.MITRA_PROJECT_ID || event.projectId);
const r = async (sql, jdbcId) => { try { return await sdk.runQueryMitra({ projectId, sql, ...(jdbcId ? { jdbcId } : {}) }); } catch (e) { return { erro: String(e && e.message || e) }; } };
const x = async (id) => { try { return await sdk.executeServerFunctionMitra({ projectId, serverFunctionId: id, input: {} }); } catch (e) { return { erro: String(e && e.message || e) }; } };
return { varUserAninhada: await x(${idVarUser}), fora: await x(${idFora}), varUserQuery: await r('SELECT :VAR_USER AS U'),
  winthor: await r('SELECT COUNT(*) AS N FROM PCPREST WHERE ROWNUM <= 10', ${jdbc}) };`;
    const idAninhada = await criar('zzT002Aninhada', 'JAVASCRIPT', corpoAninhada);
    await refazerPerfil(['zzT002Fora']);

    // S-01, S-02, S-03, S-07 (JS de business): :VAR_USER aninhado, runQueryMitra, SF fora do perfil, JDBC do Winthor.
    const dev = saida(await executar(idAninhada));
    const bus = saida(await comoBusiness(() => executar(idAninhada)));
    linha('S-01', `:VAR_USER aninhado — dev: ${JSON.stringify(saida(dev?.varUserAninhada?.result))}; business: ${JSON.stringify(saida(bus?.varUserAninhada?.result))}`, '01 §5 plano B');
    linha('S-02', `runQueryMitra com :VAR_USER por business: ${JSON.stringify(bus?.varUserQuery?.result?.rows ?? bus?.varUserQuery)}`, '01 §4 plano C');
    linha('S-03', `SF fora do perfil por id, de JS de business: ${JSON.stringify(bus?.fora?.result?.executionStatus ?? bus?.fora)}`, 'manter ccEsc… no perfil com guarda');
    linha('S-07', `JDBC do Winthor em JS de business: ${JSON.stringify(bus?.winthor?.result?.rows ?? bus?.winthor)}`, 'SF SQL Oracle com jdbcId chamada pela JS');

    // S-04: forma da resposta de uma escrita SQL (há rowsAffected?).
    await tentar('S-04', 'reler a linha (já é o padrão)', async () => JSON.stringify(await executar(idEscrita, { chave: 's04', v: 'a' })).slice(0, 300));
    // S-05: SUBSTRING_INDEX/FIND_IN_SET com parâmetro ligado em INSERT … SELECT.
    await tentar('S-05', 'uma execução por linha; tetos de lote ÷ 4', async () => {
      await executar(idLote, { lista: 'a¦b¦c', n: 3, csv: 'a,b' });
      const l = await consultar("SELECT CHAVE, V FROM ZZ_T002 WHERE CHAVE LIKE 'lote%' ORDER BY CHAVE");
      return `${l.map((x) => `${x.CHAVE}=${x.V}`).join(' ')} (esperado lote1=a lote2=b lote3=c)`;
    });
    // S-06: versão e funções.
    await tentar('S-06', 'upsert em duas instruções; sem função de janela', async () => {
      const [v] = await consultar("SELECT VERSION() AS V, CONVERT_TZ('2026-11-19 10:00:00', '+00:00', '-03:00') AS TZ, JSON_UNQUOTE(JSON_EXTRACT('{\"a\":1}', '$.a')) AS J, @@SESSION.sql_mode AS MODO");
      const [w] = await consultar('SELECT ROW_NUMBER() OVER (ORDER BY ID) AS RN FROM CC_MEMBRO LIMIT 1');
      await dml("INSERT INTO ZZ_T002 (CHAVE, V) VALUES ('s06', 'a') ON DUPLICATE KEY UPDATE V = VALUES(V)");
      await dml("INSERT IGNORE INTO ZZ_T002 (CHAVE, V) VALUES ('s06', 'b')");
      const [x] = await consultar("SELECT V FROM ZZ_T002 WHERE CHAVE = 's06'");
      return `versão ${v?.V}; CONVERT_TZ ${v?.TZ}; JSON ${v?.J}; ROW_NUMBER ${w?.RN}; upsert/ignore → ${x?.V} (esperado a); sql_mode ${v?.MODO}`;
    });
    // VARCHAR em modo estrito (C-08 da B1): valor maior que a coluna falha ou é cortado?
    await tentar('VARCHAR', 'cortar todo texto renderizado ao tamanho da coluna antes do INSERT (já feito no assunto)', async () => {
      const r = await executar(idEscrita, { chave: 'varchar', v: 'abcdefgh' });
      const [x] = await consultar("SELECT V FROM ZZ_T002 WHERE CHAVE = 'varchar'");
      return `INSERT de 8 caracteres em VARCHAR(5): ${r?.executionStatus} ${r?.error ?? ''} → gravado ${JSON.stringify(x?.V ?? null)}`;
    });
    // O-01: parâmetro numérico sem aspas com texto de injeção.
    await tentar('O-01', 'envolver todo número em CAST(\'{{x}}\' AS SIGNED) nas guardas', async () => {
      const [total] = await consultar('SELECT COUNT(*) AS N FROM CC_MEMBRO');
      const r = await comoBusiness(() => executar(idNum, { id: '1 OR 1=1' }));
      return `id = '1 OR 1=1' → ${r?.executionStatus} ${JSON.stringify(saida(r)?.rows ?? r?.error ?? '')} (total de membros ${total?.N}; igual ao total = injeção passou)`;
    });
    // S-16: a plataforma liga {{x}} como parâmetro (não concatena)? Sem isso, LIMIT/OFFSET e todo texto entre aspas dependem só
    // do que a SF faz com o valor. Ligado = número com texto dá erro ou 0/1 linha; concatenado = total de membros ou erro de sintaxe do resto.
    await tentar('S-16', 'LIMIT/OFFSET: a JS valida inteiro antes; texto: q() sem barra invertida na JS (já) e recusar barra invertida na entrada', async () => {
      const [total] = await consultar('SELECT COUNT(*) AS N FROM CC_MEMBRO');
      const r1 = await comoBusiness(() => executar(idNumCast, { id: '1 OR 1=1' }));
      const r2 = await comoBusiness(() => executar(idPagina, { limite: '1 UNION SELECT ID FROM CC_MEMBRO', offset: '0' }));
      const r3 = await comoBusiness(() => executar(idPagina, { limite: 'abc', offset: '0' }));
      const r4 = await comoBusiness(() => executar(idTexto, { email: "x\\' OR 1=1 -- " }));
      const mostra = (r) => `${r?.executionStatus} ${JSON.stringify(saida(r)?.rows ?? r?.error ?? '').slice(0, 120)}`;
      return `total de membros ${total?.N}; CAST com '1 OR 1=1' → ${mostra(r1)}; LIMIT com UNION → ${mostra(r2)}; LIMIT 'abc' → ${mostra(r3)}; ` +
        `texto com barra e aspa → ${mostra(r4)} (N = total ou mais linhas que o LIMIT = concatenou)`;
    });
    // O-02: as escritas de membro (UPDATE/INSERT com CC_MEMBRO em derivada) não dão erro 1093. Guarda recusa (0 linha): só o parse conta.
    const ids = await mapa();
    await tentar('O-02', 'materializar a derivada (já com DISTINCT/MAX) ou separar em duas instruções', async () => {
      const comum = { nome: 'zz', nomeChave: 'zz', userEmail: 'zz@t002.local', cargo: 'AGENTE', superiorId: 0, admin: 0, ativo: 1, membroId: 0, agora: '2000-01-01T00:00:00' };
      const a = await executar(ids.ccEscBaseMembroAtualizar, { ...comum, id: -1, caminhoAntigo: '/-1/' });
      const i = await executar(ids.ccEscBaseMembroInserir, comum);
      return `Atualizar: ${a?.executionStatus} ${a?.error ?? ''}; Inserir: ${i?.executionStatus} ${i?.error ?? ''} (procurar 1093)`;
    });
    // O-03: business lê CC_* direto (fora de SF)?
    await tentar('O-03', 'tirar o SELECT em CC_*/KB_* do perfil (add-090)', async () => {
      const q = await comoBusiness(async () => { try { return await sdk.runQueryMitra({ projectId, sql: 'SELECT COUNT(*) AS N FROM CC_AUDITORIA' }); } catch (e) { return { erro: e?.message }; } });
      const rest = typeof sdk.listRecordsMitra === 'function'
        ? await comoBusiness(async () => { try { return await sdk.listRecordsMitra({ projectId, tableName: 'CC_AUDITORIA' }); } catch (e) { return { erro: e?.message }; } })
        : 'listRecordsMitra ausente no mitra-sdk';
      return `runQueryMitra por business: ${JSON.stringify(q).slice(0, 200)}; REST: ${JSON.stringify(rest).slice(0, 200)} (esperado: negado)`;
    });

    // S-08: tempo da leitura completa, pelo histórico (a rotina já roda depois de publicada).
    await tentar('S-08', 'leitura retomável (já); cadastro e faturamento 1 vez por hora', async () => {
      const l = await consultar("SELECT ID, INICIO, FIM, CLIENTES_LIDOS FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK' ORDER BY ID LIMIT 3");
      return l.length ? l.map((x) => `#${x.ID} ${x.INICIO} → ${x.FIM} (${x.CLIENTES_LIDOS} clientes)`).join('; ') : 'nenhuma leitura OK ainda: rode de novo depois da primeira';
    });

    // S-09, S-01 (cron) e S-15: cron de 1 min chama SF por id, grava por runDmlMitra e refaz os usuários do perfil (mesma lista).
    const corpoCron = `const sdk = require('mitra-sdk'); const projectId = Number(process.env.MITRA_PROJECT_ID || event.projectId);
const grava = (k, v) => sdk.runDmlMitra({ projectId, sql: "INSERT INTO CC_ESTADO (CHAVE, VALOR, ATUALIZADO_EM) VALUES ('" + k + "', '" + String(v).replace(/'/g, "''").slice(0, 490) + "', '') ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR)" });
let v; try { v = JSON.stringify(await sdk.executeServerFunctionMitra({ projectId, serverFunctionId: ${idVarUser}, input: {} })); } catch (e) { v = 'erro ' + e.message; }
await grava('t002.cron', v);
let p; try {
  const usuarios = ((await sdk.listProjectUsersMitra({ projectId })).result || []).filter((u) => u.profile === ${JSON.stringify(NOME_PERFIL)}).map((u) => u.userId);
  const perfis = (await sdk.listProfilesMitra({ projectId })).result || [];
  const perfil = perfis.find((x) => x.name === ${JSON.stringify(NOME_PERFIL)});
  await sdk.setProfileUsersMitra({ projectId, profileId: perfil.id, userIds: usuarios }); p = 'ok (' + usuarios.length + ')';
} catch (e) { p = 'erro ' + e.message; }
await grava('t002.perfil', p);
return { ok: true };`;
    await criar('zzT002Cron', 'JAVASCRIPT', corpoCron, { cronExpression: '0 * * * * *' });
    console.log('Aguardando o cron de teste (75 s)…');
    await new Promise((r) => setTimeout(r, 75000));
    const estado = Object.fromEntries((await consultar("SELECT CHAVE, VALOR FROM CC_ESTADO WHERE CHAVE IN ('t002.cron', 't002.perfil')")).map((l) => [l.CHAVE, l.VALOR]));
    linha('S-09', estado['t002.cron'] ? `cron chamou SF por id e gravou por runDmlMitra: ${estado['t002.cron'].slice(0, 200)}` : 'cron não gravou em 75 s', '01 §11 plano B (um cron por passo)');
    linha('S-01 (cron)', `:VAR_USER no cron: ${String(estado['t002.cron'] ?? '').slice(0, 200)}`, '01 §5 plano B');
    linha('S-15', `setProfileUsersMitra no cron: ${estado['t002.perfil'] ?? 'sem registro'}`, 'rodar o add-090 de novo; aviso no cadastro');

    // S-10: upload por business (assinatura a conferir no README do mitra-sdk).
    await tentar('S-10', 'anexo como link', async () => JSON.stringify(await comoBusiness(() => sdk.uploadFilePublicMitra({
      projectId, fileName: 't002.txt', file: Buffer.from('T-002'), contentType: 'text/plain',
    }))).slice(0, 300));
    // S-11: e-mail pelo token dev (como o cron) e pela ccEmailEnviar já publicada fica para a tela; replyTo.
    await tentar('S-11', 'envio pela rotina a partir da fila da 002', async () => {
      if (!process.env.T002_EMAIL) return 'T002_EMAIL ausente: pulado';
      const r = await sdk.sendEmailMitra({ projectId, to: [process.env.T002_EMAIL], subject: 'T-002 (teste)', body: '<p>T-002</p>', replyTo: process.env.T002_EMAIL });
      return `${JSON.stringify(r).slice(0, 200)} — conferir remetente e Responder-para na caixa`;
    });
    // S-12: colunas do Winthor, marcadores de cancelado/estorno, chave da parcela, CODCOB e ramos.
    await tentar('S-12', 'só lib/winthor-sql.mjs muda; setor pelo prefixo', async () => {
      const cols = await consultar(SQL_COLUNAS, jdbc);
      const reais = {};
      for (const c of cols) (reais[c.TABLE_NAME] ||= []).push(c.COLUMN_NAME);
      const faltam = Object.entries(COLUNAS_LIDAS).map(([t, lidas]) => `${t}: ${lidas.filter((c) => !(reais[t] || []).includes(c)).join(',') || 'ok'}`);
      const extras = (reais.PCPREST || []).filter((c) => /CANC|ESTORN|DESD|STATUS|SITUAC/.test(c));
      const cob = await consultar('SELECT CODCOB, COUNT(*) AS N FROM PCPREST WHERE DTPAG IS NULL AND DTCANCEL IS NULL GROUP BY CODCOB ORDER BY 2 DESC', jdbc);
      const dup = await consultar('SELECT COUNT(*) AS N FROM (SELECT NUMTRANSVENDA, PREST FROM PCPREST GROUP BY NUMTRANSVENDA, PREST HAVING COUNT(*) > 1)', jdbc);
      const ramos = await consultar("SELECT CODATIV, RAMO FROM PCATIVI WHERE UPPER(RAMO) LIKE '%PUBLIC%' OR UPPER(RAMO) LIKE '%ORGAO%' OR UPPER(RAMO) LIKE '%PREFEIT%'", jdbc);
      return `ausentes → ${faltam.join(' | ')}; marcadores em PCPREST: ${extras.join(',')}; CODCOB em aberto: ${cob.map((c) => `${c.CODCOB}=${c.N}`).join(' ')}; `
        + `parcelas repetidas (NUMTRANSVENDA, PREST): ${dup[0]?.N}; ramos públicos: ${ramos.map((x) => `${x.CODATIV}=${x.RAMO}`).join('; ')}`;
    });
    // S-07: teto de linhas de uma consulta Oracle.
    await tentar('S-07 (teto)', 'baixar LINHAS_POR_CONSULTA', async () => `${(await consultar('SELECT CODCLI FROM PCPREST WHERE ROWNUM <= 20000', jdbc)).length} de 20000 linhas pedidas`);

    /* ── B5 C-03: o que a T-002 ainda não cobria ── */

    // Rotina pelo caminho real: cron → JS → JS aninhada que grava por runDmlMitra e lê o Winthor (jdbcId) — S-07 por cron —
    // e o teto de 60 s numa cadeia aninhada (a Nivel1 chama a Nivel2 duas vezes, ~35 s cada: ~70 s no total).
    const gravaJs = `const grava = (k, v) => sdk.runDmlMitra({ projectId, sql: "INSERT INTO CC_ESTADO (CHAVE, VALOR, ATUALIZADO_EM) VALUES ('" + k + "', '" + String(v).replace(/'/g, "''").slice(0, 490) + "', '') ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR)" });`;
    const cabecalho = `const sdk = require('mitra-sdk'); const projectId = Number(process.env.MITRA_PROJECT_ID || event.projectId);\n${gravaJs}`;
    const idNivel2 = await criar('zzT002Nivel2', 'JAVASCRIPT', `${cabecalho}
const t0 = Date.now(); const k = 't002.n2.' + String(event.passo || 'x');
let dml; try { await grava(k + '.dml', 'ok'); dml = 'ok'; } catch (e) { dml = 'erro ' + e.message; }
let w; try { const r = await sdk.runQueryMitra({ projectId, sql: 'SELECT COUNT(*) AS N FROM PCPREST WHERE ROWNUM <= 10', jdbcId: ${jdbc} }); w = JSON.stringify(r && r.result && r.result.rows); } catch (e) { w = 'erro ' + e.message; }
await new Promise((r) => setTimeout(r, Number(event.esperaMs) || 0));
try { await grava(k, 'dml=' + dml + ' winthor=' + w + ' ms=' + (Date.now() - t0)); } catch (e) { /* sem gravação = o teto cortou */ }
return { ok: true, dml, winthor: w, ms: Date.now() - t0 };`);
    const idNivel1 = await criar('zzT002Nivel1', 'JAVASCRIPT', `${cabecalho}
const t0 = Date.now(); const x = (passo) => sdk.executeServerFunctionMitra({ projectId, serverFunctionId: ${idNivel2}, input: { passo, esperaMs: 35000 } });
const a = await x('a'); await grava('t002.n1.a', JSON.stringify(a && a.result).slice(0, 300) + ' em ' + (Date.now() - t0) + ' ms');
const b = await x('b'); await grava('t002.n1.fim', JSON.stringify(b && b.result).slice(0, 300) + ' em ' + (Date.now() - t0) + ' ms');
return { ok: true };`);
    await criar('zzT002CronAninhada', 'JAVASCRIPT', `${cabecalho}
const [ja] = ((await sdk.runQueryMitra({ projectId, sql: "SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 't002.cron2.inicio'" })).result || {}).rows || [];
if (ja) return { ok: true, pulado: true };
const t0 = Date.now(); await grava('t002.cron2.inicio', new Date(t0).toISOString());
let r; try { r = await sdk.executeServerFunctionMitra({ projectId, serverFunctionId: ${idNivel1}, input: {} }); } catch (e) { r = 'erro ' + e.message; }
await grava('t002.cron2.fim', JSON.stringify(r && r.result ? r.result.executionStatus : r) + ' em ' + (Date.now() - t0) + ' ms');
return { ok: true };`, { cronExpression: '0 * * * * *' });

    // S-13 (custo dos kb* em execuções e tempo) e S-14 (kb* chamado por JS de business: chega com sessão?), num quadro temporário.
    const { semearQuadro } = await import('../lib/quadros.mjs');
    const execDev = { consultar: (s) => consultar(s), executar: (s) => dml(s) };
    const [qz] = await semearQuadro(execDev, { slug: 'zz-t002', nome: 'T-002 (temporário)', fases: [{ chave: 'a', nome: 'A' }, { chave: 'b', nome: 'B' }] });
    const [u0] = await consultar('SELECT MIN(USER_ID) AS U FROM CC_MEMBRO WHERE ATIVO = TRUE AND USER_ID IS NOT NULL');
    const uid = Number(u0?.U) || 0;
    const tempo = async (fn) => { const t = Date.now(); const r = await fn(); return [Date.now() - t, r]; };
    await tentar('S-13', 'ajustar CUSTO.* da 002/003 e o teto por rodada (01 §10)', async () => {
      const [mc, c] = await tempo(() => executar(ids.kbCardCriar, { boardId: qz.boardId, titulo: 'T-002', valoresJson: '{}', responsavelId: uid, prazo: '', criadoPor: uid, origem: 'sistema' }));
      const cardId = Number(saida(c)?.id);
      const [mm, m] = await tempo(() => executar(ids.kbCardMover, { cardId, faseId: qz.fases.b, ordem: 0, movidoPor: uid, origem: 'sistema' }));
      const [ma, a] = await tempo(() => executar(ids.kbCardAtualizar, { cardId, titulo: 'T-002', valoresJson: '{"x":"1"}', responsavelId: uid, prazo: '', atualizadoPor: uid, origem: 'sistema' }));
      return `kbCardCriar ${mc} ms (${c?.executionStatus}), kbCardMover ${mm} ms (${m?.executionStatus}), kbCardAtualizar ${ma} ms (${a?.executionStatus}); `
        + 'conferir no histórico de execuções do Mitra quantas execuções cada chamada gerou (gancho ccPodeMover, automações)';
    });
    const idKbBus = await criar('zzT002KbAninhada', 'JAVASCRIPT', `const sdk = require('mitra-sdk'); const projectId = Number(process.env.MITRA_PROJECT_ID || event.projectId);
const r = await sdk.executeServerFunctionMitra({ projectId, serverFunctionId: ${ids.kbCardMover}, input: { cardId: Number(event.cardId), faseId: Number(event.faseId), ordem: 0, movidoPor: 999999, origem: 'sistema' } });
return { r: r && r.result };`);
    await tentar('S-14', '05 §1 "duas situações" (o código já vale nas duas)', async () => {
      const [card] = await consultar(`SELECT MAX(ID) AS ID FROM KB_CARD WHERE BOARD_ID = ${qz.boardId}`);
      const r = await comoBusiness(() => executar(idKbBus, { cardId: card.ID, faseId: qz.fases.a }));
      const [mov] = await consultar(`SELECT USUARIO_ID, ORIGEM FROM KB_MOVIMENTO WHERE CARD_ID = ${Number(card.ID)} ORDER BY ID DESC LIMIT 1`);
      return `kbCardMover aninhado em JS de business: ${JSON.stringify(saida(r)).slice(0, 200)}; movimento gravado com USUARIO_ID ${mov?.USUARIO_ID} ORIGEM ${mov?.ORIGEM} `
        + '(999999/sistema = chegou sem sessão, situação i; id do usuário business = levou a sessão, situação ii)';
    });

    // 1093 nas escritas que leem a própria tabela (B5 B-01/C-01): guarda recusa (entradas 0), só o parse conta.
    await tentar('O-02 (todas)', 'derivada com DISTINCT/agregado (06 §5); o teste estático tests/sql.test.mjs acusa', async () => {
      const { loadDefinitions } = await import('../simulator/runtime.mjs');
      const { byName } = await loadDefinitions();
      const alvos = ['ccEscJurProcessoCard', 'ccEscCredSolicitacaoCard', 'ccEscCredCreditoSituacao', 'ccEscCredPedidoAtualizar', 'ccEscBaseMembroAtualizar'];
      const res = [];
      for (const nome of alvos) {
        const entrada = Object.fromEntries([...String(byName.get(nome)?.code ?? '').matchAll(/\{\{(\w+)\}\}/g)].map((m) => [m[1], '0']));
        const r = await executar(ids[nome], entrada);
        res.push(`${nome}: ${r?.executionStatus} ${String(r?.error ?? '').slice(0, 80)}`);
      }
      return `${res.join('; ')} (procurar 1093)`;
    });

    // B4-007 O-05: a união das 39 partes do histórico no MySQL, por business, num cliente com nota, e-mail e auditoria.
    await tentar('HIST-39', 'separar a união por categoria (uma SF por grupo)', async () => {
      const [c] = await consultar(`SELECT A.CLIENTE_ID FROM CC_AUDITORIA A WHERE A.CLIENTE_ID IS NOT NULL
  AND EXISTS (SELECT 1 FROM CC_EMAIL_ENVIADO E WHERE E.CLIENTE_ID = A.CLIENTE_ID) ORDER BY A.ID DESC LIMIT 1`);
      if (!c) return 'nenhum cliente com auditoria e e-mail ainda: rode de novo depois do uso';
      const entrada = { clienteId: c.CLIENTE_ID, busca: '', limite: 200, offset: 0, categoria: '', de: '', ate: '' };
      const [ml, l] = await tempo(() => comoBusiness(() => executar(ids.ccHistEventoListar, entrada)));
      const [mr, r] = await tempo(() => comoBusiness(() => executar(ids.ccHistResumo, { clienteId: c.CLIENTE_ID })));
      return `ccHistEventoListar ${l?.executionStatus} em ${ml} ms (${saida(l)?.rows?.length ?? l?.error} linhas); ccHistResumo ${r?.executionStatus} em ${mr} ms ${String(r?.error ?? '').slice(0, 120)}`;
    });

    // B4-007 O-01: HEX() compara byte a byte a coluna utf8mb4 com o literal (charset da conexão); com acento tem de dar igual.
    const idHex = await criar('zzT002Hex', 'SQL', "SELECT CASE WHEN HEX(V) = HEX('{{v}}') THEN 1 ELSE 0 END AS IGUAL, HEX(V) AS COL, HEX('{{v}}') AS LIT, CHARSET('{{v}}') AS CS, COLLATION(V) AS CV FROM ZZ_T002 WHERE CHAVE = 'hex'");
    await tentar('HEX', 'comparar CONVERT(... USING utf8mb4) ou BINARY no SELO_VOLTA da 007', async () => {
      await executar(idEscrita, { chave: 'hex', v: 'ação' });
      const igual = saida(await executar(idHex, { v: 'ação' }))?.rows?.[0];
      const caixa = saida(await executar(idHex, { v: 'Ação' }))?.rows?.[0];
      return `'ação' × 'ação' → IGUAL ${igual?.IGUAL} (esperado 1; COL ${igual?.COL} LIT ${igual?.LIT} ${igual?.CS}/${igual?.CV}); 'ação' × 'Ação' → IGUAL ${caixa?.IGUAL} (esperado 0)`;
    });

    // S-11 por business: sendEmailMitra dentro de JS chamada por um usuário business (a fila da 002 e o reenvio da tela).
    const idEmail = await criar('zzT002Email', 'JAVASCRIPT', `const sdk = require('mitra-sdk'); const projectId = Number(process.env.MITRA_PROJECT_ID || event.projectId);
try { const r = await sdk.sendEmailMitra({ projectId, to: [String(event.para)], subject: 'T-002 (business)', body: '<p>T-002 por business</p>' }); return { ok: true, r: r && r.result }; }
catch (e) { return { ok: false, erro: String(e && e.message || e) }; }`);
    await tentar('S-11 (business)', 'envio só pela rotina (cron), a tela grava na fila', async () => {
      if (!process.env.T002_EMAIL) return 'T002_EMAIL ausente: pulado';
      return JSON.stringify(saida(await comoBusiness(() => executar(idEmail, { para: process.env.T002_EMAIL })))).slice(0, 300);
    });

    // Resultado da rotina aninhada (o cron de 1 min começou lá em cima; a cadeia leva ~70 s).
    console.log('Aguardando o cron da rotina aninhada (150 s)…');
    await new Promise((r) => setTimeout(r, 150000));
    const est2 = Object.fromEntries((await consultar("SELECT CHAVE, VALOR FROM CC_ESTADO WHERE CHAVE LIKE 't002.n%' OR CHAVE LIKE 't002.cron2.%'")).map((l) => [l.CHAVE, l.VALOR]));
    linha('ROTINA aninhada', `runDmlMitra e Winthor na JS aninhada do cron: ${est2['t002.n2.a'] ?? 'sem registro'}`, 'passos gravam por SF SQL (ccEsc…) em vez de runDmlMitra; Winthor por SF SQL com jdbcId');
    linha('TETO 60 s', `cadeia de ~70 s: n1.a ${est2['t002.n1.a'] ?? '—'}; n1.fim ${est2['t002.n1.fim'] ?? 'não gravou'}; cron ${est2['t002.cron2.fim'] ?? 'não gravou'} `
      + '(fim gravado = sem teto de cadeia; sem fim = o teto da raiz corta a cadeia)', 'orçamento de 45 s por rodada inclui as aninhadas (já)');
  } finally {
    // Quadro temporário zz-t002 (S-13/S-14), se chegou a ser criado.
    try {
      const [b] = await consultar("SELECT ID FROM KB_BOARD WHERE SLUG = 'zz-t002'");
      if (b) {
        const boardId = Number(b.ID);
        for (const t of ['KB_MOVIMENTO', 'KB_LOG', 'KB_CARD_RESPONSAVEL']) await dml(`DELETE FROM ${t} WHERE CARD_ID IN (SELECT K.ID FROM KB_CARD K WHERE K.BOARD_ID = ${boardId})`);
        for (const t of ['KB_CARD', 'KB_CAMPO', 'KB_AUTOMACAO', 'KB_FASE']) await dml(`DELETE FROM ${t} WHERE BOARD_ID = ${boardId}`);
        await dml(`DELETE FROM KB_BOARD WHERE ID = ${boardId}`);
      }
      await dml("DELETE FROM CC_FASE WHERE QUADRO = 'zz-t002'");
    } catch (e) { console.log(`Quadro zz-t002 não apagado (${e?.message}): apague à mão.`); }
    // Limpeza, também em falha: temporárias, tabela, chaves t002.* e o perfil como o add-090 deixa.
    for (const id of temporarias) { try { await sdk.deleteServerFunctionMitra({ projectId, serverFunctionId: id }); } catch { /* segue */ } }
    try { await dml("DELETE FROM CC_ESTADO WHERE CHAVE LIKE 't002.%'"); } catch { /* segue */ }
    try { await sdk.runDdlMitra({ projectId, sql: 'DROP TABLE IF EXISTS ZZ_T002' }); } catch { /* segue */ }
    try { await refazerPerfil(); } catch (e) { console.log(`Perfil não refeito (${e?.message}): rode o add-090.`); }
    console.log(`\n${relatorio.length} itens. Copie as linhas para a tabela "Depende do sandbox" do plan.md da 001.`);
  }
}
