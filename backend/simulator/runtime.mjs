// Executor de Server Function do simulador (06 §4).
//
// Não existe handler reimplementado: roda a MESMA definition que os add-*.mjs publicam — o SQL literal
// das `SQL` e o corpo literal das `JAVASCRIPT`. O que este arquivo imita é a plataforma em volta:
// `{{param}}` por texto, `:VAR_USER`, SF por id com o mapa `__CC_IDS__`, `runQueryMitra` (com o jdbcId
// do Winthor indo às PC*), `runDmlMitra` só em cron, `sendEmailMitra` → SIM_EMAIL, upload falso,
// sessão aninhada (`SIM_SESSAO_ANINHADA`), `Date` no relógio, o contador de execuções e o perfil
// (SF em `FORA_DO_PERFIL` chamada direto por pessoa é recusada; aninhada e cron passam, S-03).

import { PUBLISH_ORDER, MARCADOR_JDBC_WINTHOR, JDBC_WINTHOR_SIM } from './config.mjs';
import { toSqlite } from './mysql-dialect.mjs';
import { dateDoRelogio } from './relogio.mjs';
import { MARCADOR_IDS } from '../lib/escritas.mjs';
import { agora } from '../lib/tempo.mjs';
import { FORA_DO_PERFIL } from '../add-090-perfil-acesso.mjs';

/**
 * Carrega as definitions dos scripts de publicação, na ordem. Os scripts só falam com a plataforma no
 * `isEntrypoint()`; importar é seguro. Nome repetido: vale o último (registrado em `overridden`).
 */
export async function loadDefinitions(order = PUBLISH_ORDER) {
  process.env.MITRA_PROJECT_ID ||= '1';
  const byName = new Map();
  const overridden = [];
  for (const file of order) {
    const mod = await import(`../${file}`);
    for (const definition of mod.definitions ?? []) {
      if (byName.has(definition.name)) overridden.push({ name: definition.name, de: byName.get(definition.name).file, para: file });
      byName.set(definition.name, { ...definition, file, jdbcId: jdbcDe(definition) });
    }
  }
  return { byName, overridden };
}

/** Marcador do jdbcId do Winthor → id do simulador. */
function jdbcDe(definition) {
  if (definition.jdbcId === undefined || definition.jdbcId === null) return undefined;
  return definition.jdbcId === MARCADOR_JDBC_WINTHOR ? JDBC_WINTHOR_SIM : Number(definition.jdbcId);
}

/**
 * `{{param}}` e `:VAR_USER` por texto, como a plataforma. Valor entre aspas (`'{{x}}'`) é dado: a aspa
 * simples é dobrada. Sem aspas é número ou fragmento; a aspa também é dobrada (nunca abre literal).
 * Ausente vira '' (as SFs testam `'{{x}}' = ''` para filtro desligado).
 */
export function bindParams(sql, input, userId) {
  return String(sql)
    .replace(/:VAR_USER\b/g, String(Number(userId) || 0))
    .replace(/'?\{\{(\w+)\}\}'?/g, (marcador, key) => {
      const entreAspas = marcador.startsWith("'") && marcador.endsWith("'");
      const value = input?.[key];
      const texto = (value === undefined || value === null ? '' : String(value)).replace(/'/g, "''");
      if (entreAspas) return `'${texto}'`;
      return (marcador.startsWith("'") ? "'" : '') + texto + (marcador.endsWith("'") ? "'" : '');
    });
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/** Coluna como a plataforma devolve: MAIÚSCULA, objeto plano. */
function plain(row) {
  const saida = {};
  for (const [k, v] of Object.entries(row)) saida[k.toUpperCase()] = v;
  return saida;
}

const ehLeitura = (sql) => /^\s*(SELECT|WITH)\b/i.test(sql);

/** Winthor no SQLite (PC* de schema-winthor.mjs): só SELECT/WITH, pelo dialeto Oracle → SQLite. */
export function winthorSqlite(db) {
  return {
    descricao: 'sqlite (PC* do simulador)',
    async query(sql) {
      if (!ehLeitura(sql)) throw new Error('O Winthor é somente leitura: só SELECT/WITH.');
      return db.prepare(toSqlite(sql)).all().map(plain);
    },
  };
}

/**
 * @param db          DatabaseSync com registerMysqlFunctions
 * @param definicoes  Map nome → definition (de loadDefinitions)
 * @param mapa        { nome: idLocal } do frontend (ids-do-mapa.mjs)
 * @param winthor     executor { query(sql) } do Winthor (padrão: PC* no SQLite; Oracle real com
 *                    SIMULATOR_WINTHOR=oracle, winthor-oracle.mjs)
 * Devolve { executar(nomeOuDefinition, input, { userId, cron }), porId, substituir, contador, idsInjetados }.
 */
export function createRunner(db, { definicoes, mapa = {}, winthor = null, onQuery } = {}) {
  const byName = new Map(definicoes);
  const ids = { ...mapa };
  const ERP = winthor || winthorSqlite(db);
  let execucoes = 0;
  let proximoIdExtra = 99001;

  /** O mapa injetado só tem SF que existe: nome sem definition = id 0 = "não publicada". */
  const idsInjetados = () => Object.fromEntries(Object.entries(ids).filter(([nome]) => byName.has(nome)));
  const porId = (id) => {
    const nome = Object.keys(ids).find((n) => Number(ids[n]) === Number(id));
    return nome ? byName.get(nome) ?? null : null;
  };

  const run = (sql) => {
    const traduzido = toSqlite(sql);
    if (onQuery) onQuery(traduzido, sql);
    const statement = db.prepare(traduzido);
    if (ehLeitura(traduzido)) return { rows: statement.all().map(plain) };
    const r = statement.run();
    return { rows: [], rowsAffected: Number(r.changes) };
  };

  // Aninhada (SF chamando SF por id): sem sessão (userId 0), salvo SIM_SESSAO_ANINHADA=1; cron nunca tem.
  const userIdAninhado = (ctx) => (ctx.cron ? 0 : (process.env.SIM_SESSAO_ANINHADA === '1' ? ctx.userId : 0));

  async function runJavascript(definition, input, ctx) {
    const sdk = {
      runQueryMitra: async ({ sql, jdbcId }) => {
        if (Number(jdbcId) === JDBC_WINTHOR_SIM) return { result: { rows: await ERP.query(bindParams(sql, {}, ctx.userId)) } };
        return { result: run(bindParams(sql, {}, ctx.userId)) };
      },
      runDmlMitra: async ({ sql }) => {
        // Business leva BUSINESS_ACCESS_DENIED na plataforma: escrita fora do cron é pela SF SQL.
        if (!ctx.cron) throw new Error('BUSINESS_ACCESS_DENIED: runDmlMitra só roda em cron (token do projeto).');
        const r = run(bindParams(sql, {}, 0));
        return { result: { rowsAffected: r.rowsAffected ?? 0, message: 'ok' } };
      },
      executeServerFunctionMitra: async ({ serverFunctionId, input: entrada }) => {
        const alvo = porId(serverFunctionId);
        if (!alvo) return { result: { executionStatus: 'FAILED', serverFunctionId, error: `Server Function ${serverFunctionId} não existe no simulador.` } };
        try {
          const output = await execute(alvo, entrada || {}, { userId: userIdAninhado(ctx), cron: ctx.cron });
          return { result: { executionStatus: 'COMPLETED', serverFunctionId, output } };
        } catch (erro) {
          return { result: { executionStatus: 'FAILED', serverFunctionId, error: erro?.message || String(erro) } };
        }
      },
      sendEmailMitra: async ({ to, subject, body }) => {
        const destinos = [].concat(to ?? []).map(String);
        const falha = destinos.find((d) => /@falha\.test$/i.test(d.trim()));
        if (falha) throw new Error(`Falha no envio para ${falha} (simulada).`);
        const inserir = db.prepare('INSERT INTO SIM_EMAIL (PARA, ASSUNTO, CORPO, EM) VALUES (?, ?, ?, ?)');
        for (const para of destinos) inserir.run(para, String(subject ?? ''), String(body ?? ''), agora());
        return { result: { message: 'simulado', recipientCount: destinos.length } };
      },
      uploadFilePublicMitra: async ({ fileName } = {}) => {
        const nome = `${Date.now()}-${String(fileName || 'arquivo').replace(/[^\w.-]+/g, '_')}`;
        return { status: 'ok', result: { fileName: nome, currentPath: 'PUBLIC', publicUrl: `https://simulador.local/uploads/${nome}`, message: 'simulado' } };
      },
    };
    const requireFalso = (nome) => {
      if (nome === 'mitra-sdk') return sdk;
      throw new Error(`Módulo não disponível na server function: ${nome}`);
    };
    const code = String(definition.code)
      .split(MARCADOR_IDS).join(JSON.stringify(idsInjetados()))
      .split(MARCADOR_JDBC_WINTHOR).join(String(JDBC_WINTHOR_SIM));
    const corpo = new AsyncFunction('event', 'require', 'process', 'Date', code);
    return corpo(input || {}, requireFalso, { env: { ...process.env } }, dateDoRelogio());
  }

  async function execute(definition, input, ctx) {
    execucoes += 1;
    if (definition.type === 'JAVASCRIPT') return runJavascript(definition, input, ctx);
    if (definition.jdbcId === JDBC_WINTHOR_SIM) return { rows: await ERP.query(bindParams(definition.code, input, ctx.userId)) };
    return run(bindParams(definition.code, input, ctx.userId));
  }

  return {
    /** Execução raiz (tela ou cron). Erro lança. */
    executar(nomeOuDefinition, input = {}, { userId = 0, cron = false } = {}) {
      const definition = typeof nomeOuDefinition === 'string' ? byName.get(nomeOuDefinition) : nomeOuDefinition;
      if (!definition) throw new Error(`Server Function ${nomeOuDefinition} não carregada.`);
      if (!cron && Number(userId) > 0 && FORA_DO_PERFIL.includes(definition.name)) throw new Error(`FORBIDDEN: ${definition.name} fora do perfil "Crédito e Cobrança".`);
      return execute(definition, input, { userId: cron ? 0 : Number(userId) || 0, cron });
    },
    existe: (nome) => byName.has(nome),
    definicao: (nome) => byName.get(nome),
    definicoes: () => byName,
    porId,
    idsInjetados,
    /** Dublê (06 §3): troca ou cria a definition de `nome`; nome fora do mapa ganha id 99001+. */
    substituir(nome, definition) {
      byName.set(nome, { name: nome, ...definition, jdbcId: jdbcDe(definition) });
      if (!ids[nome]) ids[nome] = proximoIdExtra++;
    },
    remover(nome) { byName.delete(nome); },
    contador: () => execucoes,
  };
}
