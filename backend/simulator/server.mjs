// Simulador local do Mitra — Crédito e Cobrança (porta 3115).
//
// Fala o MESMO protocolo HTTP que o mitra-interactions-sdk usa em produção (/interactions/*): a tela
// só aponta o baseURL para http://localhost:<PORT>. O que roda são as definitions dos add-*.mjs.
// Relógio: CC_AGORA do ambiente ou D (06 §1). Banco: DB_PATH, montado pelo pipeline (seed.mjs) com
// todos os seeds presentes quando não existe; `npm run sim:seed` refaz.
//
// Cron à mão: POST /sim/cron?nome=ccRotina (06 §4). Uso: cd backend && npm run sim

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { DB_PATH, PORT, PROJECT_ID, PROJECT_LABEL, DEFAULT_PASSWORD, HEALTH_TABLE } from './config.mjs';
import { montarBanco, abrirBancoExistente, rodarCron, seedsPresentes } from './seed.mjs';
import { D, fixarRelogio, relogio } from './relogio.mjs';
import { toSqlite } from './mysql-dialect.mjs';
import { abrirWinthor } from './winthor-oracle.mjs';

if (!process.env.CC_AGORA) fixarRelogio(D);

if (!existsSync(DB_PATH)) {
  console.log('[simulador] banco não encontrado — montando pelo pipeline...');
  const novo = await montarBanco({ seeds: seedsPresentes(), arquivo: DB_PATH, log: console.log });
  novo.db.close();
}

const winthor = await abrirWinthor();
const banco = await abrirBancoExistente(DB_PATH, { winthor });
const { db, runner } = banco;
const idsSemDefinicao = new Set();
const errosPorId = new Map();

/* ── sessão: JWT não assinado; o payload diz o userId (:VAR_USER) ── */

function criarToken(user) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const agoraS = Math.floor(Date.now() / 1000);
  const payload = b64({
    sub: user.DESCR, email: user.DESCR, name: user.NOME, userId: user.ID, accessLevel: user.ACCESS_LEVEL,
    projectId: PROJECT_ID, iat: agoraS, exp: agoraS + 60 * 60 * 24 * 30,
  });
  return `${b64({ alg: 'none', typ: 'JWT' })}.${payload}.simulador`;
}

function userIdFrom(req) {
  const payload = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim().split('.')[1];
  if (!payload) return 0;
  try {
    return Number(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).userId) || 0;
  } catch {
    return 0;
  }
}

/* ── HTTP ── */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-TenantID',
  'Access-Control-Max-Age': '86400',
};

function responder(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(body ?? null));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', (parte) => partes.push(parte));
    req.on('end', () => {
      const texto = Buffer.concat(partes).toString('utf8');
      if (!texto) return resolve({});
      try { resolve(JSON.parse(texto)); } catch { reject(new Error('Corpo da requisição não é JSON válido.')); }
    });
    req.on('error', reject);
  });
}

async function executarPorId(serverFunctionId, input, userId) {
  const id = Number(serverFunctionId);
  const definition = runner.porId(id);
  if (!definition) {
    if (!idsSemDefinicao.has(id)) {
      idsSemDefinicao.add(id);
      console.warn(`[simulador] Server Function ${id} sem definição — devolvendo lista vazia.`);
    }
    return { output: { rows: [] }, status: 'COMPLETED' };
  }
  try {
    return { output: await runner.executar(definition, input || {}, { userId }), status: 'COMPLETED' };
  } catch (erro) {
    const mensagem = erro?.message || String(erro);
    errosPorId.set(id, { name: definition.name, erro: mensagem });
    console.error(`[simulador] ${definition.name} (id ${id}) falhou: ${mensagem}`);
    return { output: null, status: 'FAILED', error: `${definition.name}: ${mensagem}` };
  }
}

const envelope = ({ output, status, error }, id) => ({ result: { executionStatus: status, serverFunctionId: id, output, error } });

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const rota = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (rota === '/health') {
      return responder(res, 200, {
        status: 'ok', projeto: PROJECT_LABEL, db: DB_PATH, projectId: PROJECT_ID, relogio: relogio(),
        winthor: winthor ? winthor.descricao : 'sqlite (PC* do simulador)',
        [HEALTH_TABLE]: db.prepare(`SELECT COUNT(*) AS n FROM ${HEALTH_TABLE}`).get().n,
        serverFunctions: Object.keys(runner.idsInjetados()).length,
        semDefinicao: [...idsSemDefinicao].sort((a, b) => a - b),
        erros: [...errosPorId.entries()].map(([id, info]) => ({ id, ...info })),
      });
    }

    if (rota === '/auth/login' && req.method === 'POST') {
      const body = await lerCorpo(req);
      const email = String(body?.email || '').trim().toLowerCase();
      const senha = String(body?.password || '');
      const user = db.prepare('SELECT * FROM INT_USER WHERE LOWER(DESCR) = ? AND ATIVO = 1').get(email);
      if (!user || (senha && senha !== DEFAULT_PASSWORD)) {
        return responder(res, 401, { success: false, error: { message: 'Usuário ou senha inválidos no simulador.' } });
      }
      const base = `http://localhost:${PORT}`;
      return responder(res, 200, {
        success: true, token: criarToken(user), backURL: base, baseURL: base, integrationURL: base,
        user: { id: user.ID, name: user.NOME, email: user.DESCR, accessLevel: user.ACCESS_LEVEL },
        projects: [{ id: PROJECT_ID, name: PROJECT_LABEL }],
      });
    }

    if (rota === '/auth/users' && req.method === 'GET') {
      const users = db.prepare('SELECT ID, NOME, DESCR AS EMAIL, ACCESS_LEVEL FROM INT_USER WHERE ATIVO = 1 ORDER BY ID').all();
      return responder(res, 200, { rows: users.map((l) => ({ ...l })), senha: DEFAULT_PASSWORD });
    }

    if ((rota === '/interactions/executeServerFunction' || rota === '/interactions/executeServerFunctionAsync') && req.method === 'POST') {
      const body = await lerCorpo(req);
      const id = Number(body?.serverFunctionId);
      return responder(res, 200, envelope(await executarPorId(id, body?.input, userIdFrom(req)), id));
    }

    // uploadFilePublicMitra da tela: endereço falso (06 §4); o arquivo não é guardado.
    if (rota === '/interactions/uploadFilePublic' && req.method === 'POST') {
      for await (const parte of req) void parte;
      const nome = `${Date.now()}-arquivo`;
      return responder(res, 200, { status: 'ok', result: { fileName: nome, currentPath: 'PUBLIC', publicUrl: `https://simulador.local/uploads/${nome}`, message: 'simulado' } });
    }

    // runQueryMitra da tela: só leitura.
    if (rota === '/interactions/runQuery' && req.method === 'POST') {
      const body = await lerCorpo(req);
      const sql = toSqlite(String(body?.sql || body?.query || ''));
      if (!/^\s*(SELECT|WITH)/i.test(sql)) return responder(res, 400, { message: 'Apenas leitura é aceita aqui.' });
      return responder(res, 200, { rows: db.prepare(sql).all().map((l) => ({ ...l })) });
    }

    if (rota === '/sim/cron' && req.method === 'POST') {
      const nome = url.searchParams.get('nome') || 'ccRotina';
      return responder(res, 200, { nome, relogio: relogio(), resultado: await rodarCron(banco, nome) });
    }

    return responder(res, 404, { message: `Rota não implementada no simulador: ${req.method} ${rota}` });
  } catch (erro) {
    console.error('[simulador] erro:', erro);
    return responder(res, 500, { message: erro?.message || 'Erro interno do simulador.' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ${PROJECT_LABEL}\n  Simulador em  http://localhost:${PORT}\n  Relógio       ${relogio()}\n  Banco         ${DB_PATH}`);
  console.log(`  Winthor       ${winthor ? winthor.descricao : 'sqlite (PC* do simulador)'}\n  Logins (senha única: ${DEFAULT_PASSWORD}):`);
  for (const u of db.prepare('SELECT DESCR FROM INT_USER WHERE ATIVO = 1 ORDER BY ID').all()) console.log(`    ${u.DESCR}`);
});
