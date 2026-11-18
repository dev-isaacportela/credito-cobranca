// Schema do simulador, derivado do DDL real. Nada é copiado: o `DDL` exportado por cada módulo de
// DDL_SOURCES (schema/NNN-*.mjs, o schema da lib, schema-winthor.mjs) é traduzido de MySQL para
// SQLite a cada banco novo. Mudou a tabela no schema, o próximo banco acompanha.

import { pathToFileURL } from 'node:url';
import { DDL_SOURCES } from './config.mjs';
import { preencherColunasWinthor } from './schema-winthor.mjs';

/** Tabelas do tenant Mitra (já existem lá) e as que só o simulador tem. */
const TABELAS_DO_SIMULADOR = [
  // INT_USER é a tabela de usuários da plataforma: DESCR guarda o e-mail.
  `CREATE TABLE IF NOT EXISTS INT_USER (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    DESCR TEXT NOT NULL,
    NOME TEXT,
    ACCESS_LEVEL TEXT DEFAULT 'MEMBER',
    ATIVO INTEGER DEFAULT 1
  )`,
  // Cada sendEmailMitra das SFs cai aqui (06 §4): o smoke confere destinatário, assunto e corpo.
  `CREATE TABLE IF NOT EXISTS SIM_EMAIL (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    PARA TEXT NOT NULL,
    ASSUNTO TEXT,
    CORPO TEXT,
    EM TEXT
  )`,
];

/** Os blocos `CREATE TABLE` de cada módulo, na ordem de DDL_SOURCES. */
export async function lerDdl(fontes = DDL_SOURCES) {
  const blocos = [];
  for (const fonte of fontes) {
    const modulo = await import(pathToFileURL(fonte).href);
    for (const sql of modulo.DDL || []) blocos.push(String(sql));
  }
  return blocos;
}

/**
 * CREATE TABLE do MySQL -> SQLite. Índices viram CREATE INDEX separados (o SQLite não aceita INDEX
 * dentro da tabela); prefixo de índice (`NOME_BUSCA(100)`) sai.
 */
export function translateCreateTable(mysqlDdl) {
  const table = mysqlDdl.match(/CREATE TABLE IF NOT EXISTS\s+([A-Z0-9_]+)/i)?.[1];
  if (!table) throw new Error(`DDL sem nome de tabela: ${mysqlDdl.slice(0, 60)}`);
  const body = mysqlDdl.slice(mysqlDdl.indexOf('(') + 1, mysqlDdl.lastIndexOf(')'));
  const indexes = [];
  const keep = [];
  for (const raw of splitTopLevel(body)) {
    const line = raw.trim().replace(/,$/, '');
    if (!line) continue;
    const indexMatch = line.match(/^(?:UNIQUE\s+)?(?:KEY|INDEX)\s+([A-Z0-9_]+)\s*\((.*)\)$/i);
    if (indexMatch) {
      const unique = /^UNIQUE/i.test(line) ? 'UNIQUE ' : '';
      const colunas = indexMatch[2].replace(/\(\s*\d+\s*\)/g, '');
      indexes.push(`CREATE ${unique}INDEX IF NOT EXISTS ${indexMatch[1]} ON ${table} (${colunas})`);
      continue;
    }
    if (/^PRIMARY\s+KEY\s*\(/i.test(line) || /^UNIQUE\s*\(/i.test(line)) { keep.push(line); continue; }
    keep.push(translateColumn(line));
  }
  return { table, ddl: `CREATE TABLE IF NOT EXISTS ${table} (\n  ${keep.join(',\n  ')}\n)`, indexes };
}

function translateColumn(line) {
  return line
    .replace(/\bINT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY\b/i, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, 'TEXT')
    .replace(/\bLONGTEXT\b|\bMEDIUMTEXT\b/gi, 'TEXT')
    .replace(/\bDECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'REAL')
    .replace(/\bDOUBLE\b|\bFLOAT\b/gi, 'REAL')
    .replace(/\bBOOLEAN\b/gi, 'INTEGER')
    .replace(/\bDEFAULT\s+TRUE\b/gi, 'DEFAULT 1')
    .replace(/\bDEFAULT\s+FALSE\b/gi, 'DEFAULT 0')
    .replace(/\bINT\b(?!EGER)/gi, 'INTEGER')
    .trim();
}

/** Divide por vírgulas de primeiro nível. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let buffer = '';
  for (const char of body) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { parts.push(buffer); buffer = ''; continue; }
    buffer += char;
  }
  parts.push(buffer);
  return parts;
}

/** Cria todas as tabelas (tenant, módulos, lib, Winthor) e preenche ALL_TAB_COLUMNS. Devolve os nomes. */
export async function createSchema(db) {
  const criadas = [];
  for (const sql of TABELAS_DO_SIMULADOR) {
    db.exec(sql);
    criadas.push(sql.match(/EXISTS\s+([A-Z0-9_]+)/i)[1]);
  }
  for (const bloco of await lerDdl()) {
    const { table, ddl, indexes } = translateCreateTable(bloco);
    db.exec(ddl);
    for (const index of indexes) db.exec(index);
    criadas.push(table);
  }
  preencherColunasWinthor(db);
  return criadas;
}
