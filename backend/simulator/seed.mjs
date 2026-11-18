// Pipeline do banco (06 §2.3, DT-38): o MESMO para o `sim` (relógio D) e para cada smoke.
//
//  1 DDL de todos os módulos + lib instalada (KB_META: versão, ganchos se existem, e-mail)
//  2 elenco (seed/000-elenco.mjs)
//  3 quadros: semearQuadro(QUADROS) de cada lib/quadros/NNN presente e os `quadros` extras do smoke
//  4 fixarRelogio(T0)  (T0 = menor INICIO() dos seeds, ou `relogio`)
//  5 winthor() de cada seed
//  6 rodarCron('ccRotina') até a leitura OK
//  7 atribuir() (elenco + ATRIBUICAO dos seeds + `atribuicao` extra)
//  8 rodarCron até o processamento terminar
//  9 passado() dos seeds; com T0 < relogio, fixarRelogio(relogio) + rodarCron até leitura e processamento
// 10 dominio() de cada seed
// 11 ccBaseSincronizacaoPedir como Gustavo + rodarCron até leitura e processamento
//
// Passo que depende de SF ainda não publicada (ccRotina, ccBaseClienteAtribuir, …) é pulado com aviso.

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FRONTEND_MAP } from './config.mjs';
import { createSchema } from './schema.mjs';
import { registerMysqlFunctions } from './mysql-dialect.mjs';
import { loadDefinitions, createRunner } from './runtime.mjs';
import { D, fixarRelogio } from './relogio.mjs';
import { usarBanco, semearElenco, atribuir, execSqlite, ATRIBUICAO, U } from './seed/000-elenco.mjs';
import { semearQuadro, carregarArquivosDeQuadros } from '../lib/quadros.mjs';
import { idsDoMapa } from '../ids-do-mapa.mjs';
import { EMAIL } from '../add-001-kanban.mjs';
import { VERSAO } from '@benenutri/mitra-kanban/backend';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(HERE, 'seed');
const MAX_RODADAS = 40;

let definicoesCache = null;
/** Definitions de PUBLISH_ORDER (uma vez por processo) e o mapa de ids do frontend. */
export async function carregarDefinicoes() {
  definicoesCache ||= (await loadDefinitions()).byName;
  return { definicoes: definicoesCache, mapa: existsSync(FRONTEND_MAP) ? idsDoMapa(FRONTEND_MAP) : {} };
}

/** Nomes dos seed/NNN-*.mjs presentes (o banco do `sim` declara todos). */
export const seedsPresentes = () => (existsSync(SEED_DIR) ? readdirSync(SEED_DIR) : [])
  .filter((n) => /^\d{3}-.+\.mjs$/.test(n) && !n.startsWith('000-')).sort().map((n) => n.slice(0, -4));

/** Seeds pelo nome (`'001'` ou `'001-base'`), na ordem das specs. `000-elenco` não é seed declarável. */
async function carregarSeeds(nomes = []) {
  const arquivos = existsSync(SEED_DIR) ? readdirSync(SEED_DIR).filter((n) => /^\d{3}-.+\.mjs$/.test(n) && !n.startsWith('000-')).sort() : [];
  const escolhidos = nomes.map((nome) => {
    const arquivo = arquivos.find((a) => a === `${nome}.mjs` || a.startsWith(`${nome}-`) || a.slice(0, -4) === nome);
    if (!arquivo) throw new Error(`Seed ${nome} não existe em ${SEED_DIR}.`);
    return arquivo;
  }).sort();
  const modulos = [];
  for (const a of escolhidos) modulos.push({ nome: a.slice(0, -4), ...(await import(pathToFileURL(join(SEED_DIR, a)).href)) });
  return modulos;
}

const utcDe = (isoBrasilia) => new Date(Date.parse(`${String(isoBrasilia).slice(0, 19)}-03:00`)).toISOString().slice(0, 19);

/** Uma rodada de cron (06 §1): apaga a trava antes; `{ pulado }` se a SF não existe. */
export async function rodarCron(banco, nome = 'ccRotina') {
  if (!banco.runner.existe(nome)) return { pulado: nome };
  banco.db.prepare("DELETE FROM CC_ESTADO WHERE CHAVE = 'rotina.trava'").run();
  return banco.runner.executar(nome, {}, { cron: true });
}

const ultimaLeitura = (db) => db.prepare('SELECT ID, SITUACAO, ERRO FROM CC_SINCRONIZACAO ORDER BY ID DESC LIMIT 1').get();

/** Roda a rotina até a última leitura ficar OK e, com `processamento`, até os passos terminarem. */
export async function rodarAte(banco, { processamento = true } = {}) {
  if (!banco.runner.existe('ccRotina')) return { pulado: 'ccRotina' };
  for (let i = 0; i < MAX_RODADAS; i += 1) {
    const leitura = ultimaLeitura(banco.db);
    if (leitura?.SITUACAO === 'ERRO') throw new Error(`Leitura ${leitura.ID} em ERRO: ${leitura.ERRO}`);
    const leituraOk = leitura?.SITUACAO === 'OK';
    if (leituraOk && !processamento) return { rodadas: i };
    if (leituraOk) {
      const passos = banco.db.prepare('SELECT PASSO, SITUACAO, PENDENTES, ERRO FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ?').all(leitura.ID);
      const erro = passos.find((p) => p.SITUACAO === 'ERRO');
      if (erro) throw new Error(`Passo ${erro.PASSO} em ERRO: ${erro.ERRO}`);
      // Leitura recém-feita ainda não tem passo: só termina depois de uma rodada de processamento.
      if (i > 0 && passos.length && passos.every((p) => p.SITUACAO === 'OK' && Number(p.PENDENTES) === 0)) return { rodadas: i };
    }
    await rodarCron(banco);
  }
  throw new Error(`A rotina não terminou em ${MAX_RODADAS} rodadas.`);
}

/** Banco SQLite vazio com o schema, as funções do dialeto e o runner das definitions. */
export async function abrirBancoNovo(arquivo, { winthor = null } = {}) {
  mkdirSync(dirname(arquivo), { recursive: true });
  for (const sufixo of ['', '-wal', '-shm']) rmSync(`${arquivo}${sufixo}`, { force: true });
  const db = new DatabaseSync(arquivo);
  registerMysqlFunctions(db);
  await createSchema(db);
  const { definicoes, mapa } = await carregarDefinicoes();
  return { db, arquivo, runner: createRunner(db, { definicoes, mapa, winthor }) };
}

/** Reabre um arquivo de banco já montado (cópia por teste, servidor). */
export async function abrirBancoExistente(arquivo, { winthor = null } = {}) {
  const db = new DatabaseSync(arquivo);
  registerMysqlFunctions(db);
  const { definicoes, mapa } = await carregarDefinicoes();
  return { db, arquivo, runner: createRunner(db, { definicoes, mapa, winthor }) };
}

/** Fecha e apaga um banco temporário. */
export function descartarBanco(banco) {
  banco.db.close();
  for (const sufixo of ['', '-wal', '-shm']) rmSync(`${banco.arquivo}${sufixo}`, { force: true });
}

let sequencia = 0;
const arquivoTemporario = () => join(tmpdir(), `credito-cobranca-${process.pid}-${(sequencia += 1)}.db`);

/**
 * Monta um banco pelo pipeline. `seeds` = nomes de seed/NNN-*.mjs; `relogio` = RELOGIO do banco
 * (padrão D); `quadros` = QUADROS extras (os QUADROS_TESTE do smoke); `atribuicao` = linhas extras
 * de atribuição; `substituir` = { nome: definition } de dublês ativos desde o passo 1; `ate` = para
 * depois do passo n. Devolve `{ db, runner, arquivo, relogio, quadros, avisos }`.
 */
export async function montarBanco({ seeds = [], relogio = D, quadros = [], atribuicao = [], ate = 11, arquivo = arquivoTemporario(), substituir = {}, winthor = null, log = () => {} } = {}) {
  const avisos = [];
  const avisar = (texto) => { avisos.push(texto); log(`[pipeline] ${texto}`); };

  // 1
  const banco = { ...(await abrirBancoNovo(arquivo, { winthor })), relogio, avisos };
  for (const [nome, definition] of Object.entries(substituir)) banco.runner.substituir(nome, definition);
  const { db, runner } = banco;
  const meta = db.prepare('INSERT OR REPLACE INTO KB_META (CHAVE, VALOR) VALUES (?, ?)');
  meta.run('versao', VERSAO);
  meta.run('email:sistema', EMAIL.sistema);
  if (EMAIL.urlDoCard) meta.run('email:urlDoCard', EMAIL.urlDoCard);
  const ids = runner.idsInjetados();
  for (const [chave, nome] of [['podeMover', 'ccPodeMover'], ['podeExcluir', 'ccPodeExcluir']]) {
    if (ids[nome]) meta.run(`gancho:${chave}`, String(ids[nome]));
    else avisar(`gancho ${chave} desligado: ${nome} não publicada`);
  }
  if (ate <= 1) return banco;

  // 2
  usarBanco(banco);
  fixarRelogio(relogio);
  await semearElenco();
  if (ate <= 2) return banco;

  // 3
  const exec = execSqlite(db);
  banco.quadros = [];
  for (const m of await carregarArquivosDeQuadros()) {
    if (m.QUADROS?.length) banco.quadros.push(...(await semearQuadro(exec, m.QUADROS, { quandoUtc: utcDe(relogio) })));
  }
  if (quadros.length) banco.quadros.push(...(await semearQuadro(exec, quadros, { quandoUtc: utcDe(relogio) })));
  if (ate <= 3) return banco;

  // 4 — INICIO() é função: usa dia(n) do RELOGIO do banco.
  const modulos = await carregarSeeds(seeds);
  const inicios = modulos.filter((m) => typeof m.INICIO === 'function').map((m) => String(m.INICIO()));
  const t0 = [relogio, ...inicios].map((x) => fixarRelogio(x)).sort()[0];
  fixarRelogio(t0);
  if (ate <= 4) return banco;

  // 5
  for (const m of modulos) if (typeof m.winthor === 'function') await m.winthor();
  if (ate <= 5) return banco;

  // 6
  const lida = await rodarAte(banco, { processamento: false });
  if (lida.pulado) avisar('passos 6, 8, 9 e 11 sem rotina: ccRotina não publicada (CC_CLIENTE fica vazia)');
  if (ate <= 6) return banco;

  // 7
  const linhas = [...ATRIBUICAO, ...modulos.flatMap((m) => m.ATRIBUICAO || []), ...atribuicao];
  const atribuidos = await atribuir(linhas);
  if (atribuidos.pulado) avisar(`passo 7 pulado: ${atribuidos.pulado.join(', ')} não publicada`);
  if (ate <= 7) return banco;

  // 8
  await rodarAte(banco);
  if (ate <= 8) return banco;

  // 9
  for (const m of modulos) if (typeof m.passado === 'function') await m.passado();
  if (t0 < fixarRelogio(relogio)) await rodarAte(banco);
  if (ate <= 9) return banco;

  // 10
  for (const m of modulos) if (typeof m.dominio === 'function') await m.dominio();
  fixarRelogio(relogio);
  if (ate <= 10) return banco;

  // 11
  if (runner.existe('ccBaseSincronizacaoPedir')) {
    const r = await runner.executar('ccBaseSincronizacaoPedir', {}, { userId: U.gustavo });
    if (r && r.ok === false) throw new Error(`ccBaseSincronizacaoPedir recusou: ${r.error}`);
    await rodarAte(banco);
  } else {
    avisar('passo 11 pulado: ccBaseSincronizacaoPedir não publicada');
  }
  return banco;
}
