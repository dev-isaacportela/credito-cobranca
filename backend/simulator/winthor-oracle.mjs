// Winthor REAL no simulador — opcional, só numa máquina com acesso ao Oracle do ERP.
//
// Por padrão a SQL com jdbcId do Winthor roda sobre as PC* imitadas em SQLite (schema-winthor.mjs):
// check.mjs e smoke.mjs ficam determinísticos e sem rede. Com SIMULATOR_WINTHOR=oracle no
// backend/.env, o server.mjs entrega este executor ao runtime e toda SQL do Winthor (definition com
// jdbcId, ou runQueryMitra com o jdbcId do Winthor) vai literal ao Oracle, com as credenciais que
// add-002-jdbc-winthor.mjs lê. Nada é escrito no ERP: só SELECT/WITH.
//
// Driver: oracledb (devDependency), modo thick com o Oracle Instant Client (ORACLE_CLIENT_LIB_DIR);
// se o cliente não carregar, segue em thin.

import 'dotenv/config';
import { parseWinthorUrl } from '../add-002-jdbc-winthor.mjs';
import { JDBC_WINTHOR_SIM } from './config.mjs';

/** SQL do Winthor: a definition com jdbcId (no simulador, JDBC_WINTHOR_SIM). */
export function ehWinthor(definition) {
  return definition?.type === 'SQL' && Number(definition.jdbcId) === JDBC_WINTHOR_SIM;
}

/** DATE do Oracle chega como Date; o projeto trafega datas em VARCHAR(10)/(19). */
export function normalizarLinha(row) {
  const saida = {};
  for (const [coluna, valor] of Object.entries(row)) saida[coluna] = valor instanceof Date ? textoDeData(valor) : valor;
  return saida;
}

function textoDeData(d) {
  const p = (n) => String(n).padStart(2, '0');
  const data = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const hora = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return hora === '00:00:00' ? data : `${data} ${hora}`;
}

/**
 * Abre o pool do WinThor se SIMULATOR_WINTHOR=oracle; senao devolve null e o
 * simulador fica no SQLite. Devolve { descricao, aceita, query, fechar }.
 */
export async function abrirWinthor({ env = process.env, log = console } = {}) {
  if (env.SIMULATOR_WINTHOR !== 'oracle') return null;

  const faltam = ['WINTHOR_JDBC_URL', 'WINTHOR_USER', 'WINTHOR_PASSWORD'].filter((chave) => !env[chave]);
  if (faltam.length) throw new Error(`SIMULATOR_WINTHOR=oracle exige ${faltam.join(', ')} no backend/.env (nunca commitado).`);

  const { host, port, database } = parseWinthorUrl(env.WINTHOR_JDBC_URL);
  const connectString = `${host}:${port}/${database}`;

  const { default: oracledb } = await import('oracledb');
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.fetchAsString = [oracledb.CLOB];
  try {
    oracledb.initOracleClient(env.ORACLE_CLIENT_LIB_DIR ? { libDir: env.ORACLE_CLIENT_LIB_DIR } : {});
  } catch (erro) {
    log.warn(`[winthor] Instant Client nao carregou (${String(erro.message).split('\n')[0]}); seguindo em modo thin.`);
  }

  const pool = await oracledb.createPool({
    connectString, user: env.WINTHOR_USER, password: env.WINTHOR_PASSWORD,
    poolMin: 0, poolMax: 4, poolIncrement: 1, queueTimeout: 15000,
  });
  // Falha de login ou de rede aparece AQUI, ao subir, e nao na primeira tela.
  const prova = await pool.getConnection();
  const versao = prova.oracleServerVersionString;
  await prova.close();

  const modo = oracledb.thin ? 'thin' : `thick ${oracledb.oracleClientVersionString}`;
  const descricao = `oracle ${versao} em ${connectString} (${modo})`;
  log.log(`[winthor] SQL do Winthor no Oracle REAL: ${descricao}`);

  return {
    descricao,
    aceita: ehWinthor,
    async query(sql) {
      if (!/^\s*(SELECT|WITH)\b/i.test(sql)) throw new Error('O WinThor e somente leitura: o simulador so manda SELECT/WITH ao Oracle.');
      const conexao = await pool.getConnection();
      try {
        const { rows } = await conexao.execute(sql);
        return rows.map(normalizarLinha);
      } finally {
        await conexao.close();
      }
    },
    fechar: () => pool.close(0),
  };
}
