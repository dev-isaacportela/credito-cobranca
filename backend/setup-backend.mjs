// setup-backend — tabelas e dados de referência do Crédito e Cobrança (01 §14, T-007).
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// Uso (no sandbox): cd backend && node setup-backend.mjs
//
// Idempotente: CREATE TABLE IF NOT EXISTS; catálogo de parâmetros por upsert e padrão só para chave sem
// valor; modelos e BUs por INSERT IGNORE; feriados nacionais só de ano ainda sem feriado gerado; topo
// da equipe só com CC_MEMBRO vazia. Quadros: fase/campo inativado volta (05 §1 regra 1: a regra depende da chave).
// `semearReferencia()` é a MESMA semeadura que o elenco do simulador usa (06 §2.2).

import 'dotenv/config';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { carregarArquivosDeParametros, fundir, semearParametros, importarPresentes } from './lib/parametros.mjs';
import { semearModelos } from './lib/escritas.mjs';
import { feriadosNacionais } from './lib/dias-uteis.mjs';
import { agora } from './lib/tempo.mjs';
import { nomeChave } from './lib/base/equipe.mjs';
import { txt } from './lib/texto-sql.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SCHEMA = join(HERE, 'schema');
const MODELOS = join(HERE, 'lib', 'modelos');

export const BUS = [
  { id: 1, nome: 'Nutrição', carteira: 'PRIVADA' },
  { id: 2, nome: 'Enfermagem', carteira: 'PRIVADA' },
  { id: 3, nome: 'Medicamento', carteira: 'PRIVADA' },
  { id: 4, nome: 'Estética', carteira: 'ESTETICA' },
];


/** Os blocos DDL de `schema/NNN-*.mjs` presentes, em ordem de spec. */
export async function ddlDosModulos() {
  if (!existsSync(SCHEMA)) return [];
  const blocos = [];
  for (const nome of readdirSync(SCHEMA).filter((n) => /^\d{3}-.+\.mjs$/.test(n)).sort()) {
    blocos.push(...((await import(pathToFileURL(join(SCHEMA, nome)).href)).DDL || []));
  }
  return blocos;
}

/**
 * Parâmetros (fusão de `lib/parametros/*`), modelos (`lib/modelos/*`; spec sem arquivo é pulada), as 4
 * BUs e os feriados nacionais dos `anos`. `exec` = { consultar(sql) → linhas, executar(sql) }.
 */
export async function semearReferencia(exec, { agoraIso = agora(), anos } = {}) {
  const ano = Number(agoraIso.slice(0, 4));
  const { definicoes } = fundir(await carregarArquivosDeParametros());
  await semearParametros(exec, definicoes, agoraIso);
  const modelos = await semearModelos(exec, await importarPresentes(MODELOS), agoraIso);
  await exec.executar(`INSERT IGNORE INTO CC_BU (ID, NOME, CARTEIRA, ORDEM, ATIVA) VALUES
  ${BUS.map((b) => `(${b.id}, ${txt(b.nome)}, ${txt(b.carteira)}, ${b.id}, TRUE)`).join(',\n  ')}`);
  // Só ano ainda sem feriado gerado (B5 O-01): republicar não devolve o feriado que o gestor removeu.
  const gerados = new Set((await exec.consultar("SELECT DATA FROM CC_FERIADO WHERE ORIGEM = 'GERADO'")).map((l) => String(l.DATA).slice(0, 4)));
  const feriados = (anos || [ano, ano + 1]).filter((a) => !gerados.has(String(a))).flatMap(feriadosNacionais);
  if (feriados.length) {
    await exec.executar(`INSERT IGNORE INTO CC_FERIADO (DATA, NOME, ABRANGENCIA, UF, MUNICIPIO, ORIGEM) VALUES
  ${feriados.map((f) => `(${txt(f.data)}, ${txt(f.nome)}, 'NACIONAL', '', '', 'GERADO')`).join(',\n  ')}`);
  }
  return { parametros: definicoes.length, modelos, bus: BUS.length, feriados: feriados.length };
}

/** Topo da equipe (Diretoria, nível 5) a partir de CC_ADMIN_NOME/CC_ADMIN_EMAIL, só com CC_MEMBRO vazia. */
export async function semearTopo(exec, { nome, email, agoraIso = agora() }) {
  const [{ N }] = await exec.consultar('SELECT COUNT(*) AS N FROM CC_MEMBRO');
  if (Number(N) > 0) return false;
  if (!nome || !email) throw new Error('CC_MEMBRO vazia: informe CC_ADMIN_NOME e CC_ADMIN_EMAIL no .env para criar o topo da equipe.');
  const e = String(email).trim().toLowerCase();
  await exec.executar(`INSERT INTO CC_MEMBRO (NOME, NOME_CHAVE, USER_EMAIL, USER_ID, CARGO, NIVEL, SUPERIOR_ID, CAMINHO, ADMIN, ATIVO, CRIADO_EM, ATUALIZADO_EM)
SELECT ${txt(nome)}, ${txt(nomeChave(nome))}, ${txt(e)}, (SELECT MIN(U.ID) FROM INT_USER U WHERE LOWER(U.DESCR) = ${txt(e)}),
  'DIRETORIA', 5, NULL, '/', TRUE, TRUE, ${txt(agoraIso)}, ${txt(agoraIso)}`);
  await exec.executar(`UPDATE CC_MEMBRO SET CAMINHO = CONCAT('/', ID, '/') WHERE USER_EMAIL = ${txt(e)}`);
  return true;
}

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntrypoint()) {
  if (!process.env.MITRA_BASE_URL) throw new Error('MITRA_BASE_URL ausente: este script roda no sandbox do Mitra, com o .env real.');
  const sdk = await import('mitra-sdk');
  sdk.configureSdkMitra({
    baseURL: process.env.MITRA_BASE_URL,
    token: process.env.MITRA_TOKEN,
    integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS,
  });
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  const linhas = (r) => r?.result?.rows ?? r?.result ?? [];
  const exec = {
    consultar: async (sql) => linhas(await sdk.runQueryMitra({ projectId, sql })),
    executar: (sql) => sdk.runDmlMitra({ projectId, sql }),
  };

  const ddl = await ddlDosModulos();
  for (const sql of ddl) await sdk.runDdlMitra({ projectId, sql });
  console.log(`  ${ddl.length} tabelas garantidas`);
  const r = await semearReferencia(exec);
  console.log(`  ${r.parametros} parâmetros, ${r.modelos} modelos, ${r.bus} BUs, ${r.feriados} feriados nacionais`);
  const topo = await semearTopo(exec, { nome: process.env.CC_ADMIN_NOME, email: process.env.CC_ADMIN_EMAIL });
  console.log(topo ? `  topo da equipe criado: ${process.env.CC_ADMIN_EMAIL}` : '  equipe já tem membros: topo não tocado');
}
