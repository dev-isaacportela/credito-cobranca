// Preâmbulo das SFs JAVASCRIPT (01 §4, §5, §7, §9) e ajudantes de publicação.
//
// `js(corpo)` cola o PREAMBULO na frente do corpo. O preâmbulo traz `CC_IDS = __CC_IDS__`, o mapa
// nome → id de todas as SFs do projeto, trocado por `injetarIds(code, mapa)`: no simulador com os ids
// locais de frontend/src/lib/server-functions.ts; no sandbox, na segunda passada da publicação
// (DT-39). Nome ausente = id 0 = SF não publicada (`idDe(nome)` devolve 0; `escrever` lança).
//
// Escrita interna recebe valores CRUS: a plataforma liga cada `{{param}}` como parâmetro.

import { agora, hoje, somarMeses } from './tempo.mjs';
import { visivel } from './visibilidade.mjs';
import { FONTE as FONTE_PARAMETROS } from './parametros.mjs';
import { chamarKb } from './quadros.mjs';
import { txt } from './texto-sql.mjs';

export const MARCADOR_IDS = '__CC_IDS__';

export function injetarIds(code, mapa) {
  return String(code).split(MARCADOR_IDS).join(JSON.stringify(mapa || {}));
}

export const MSG = {
  NAO_MEMBRO: 'Você não faz parte da equipe de Crédito e Cobrança.',
  SEM_PERMISSAO: 'Sem permissão para esta ação, ou a situação mudou. Atualize e tente de novo.',
  NAO_ADMINISTRA: 'Somente Gerente, Diretoria ou Administrador.',
  CLIENTE_NAO_ENCONTRADO: 'Cliente não encontrado.',
  WINTHOR_FORA: 'Não foi possível consultar o Winthor agora.',
};

/* Funções do preâmbulo escritas como código (vão por toString; usam o que o preâmbulo declara). */

function linhasDe(resposta) {
  let saida = resposta?.result ?? resposta;
  if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { return []; } }
  if (saida?.output !== undefined) saida = saida.output;
  if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { return []; } }
  return saida?.rows ?? saida?.result?.rows ?? (Array.isArray(saida?.result) ? saida.result : (Array.isArray(saida) ? saida : []));
}

async function ler(sql) {
  return linhasDe(await sdk.runQueryMitra({ projectId, sql }));
}

function idDe(nome) {
  return Number(CC_IDS[nome]) || 0;
}

/** Executa uma SF por nome (escrita interna ou outra JS). Falha da plataforma lança (01 §8). */
async function escrever(nome, params) {
  const serverFunctionId = idDe(nome);
  if (!serverFunctionId) throw new Error(`Server Function não publicada: ${nome}`);
  const resposta = await sdk.executeServerFunctionMitra({ projectId, serverFunctionId, input: params || {} });
  const r = resposta?.result ?? resposta;
  if (r?.executionStatus === 'FAILED') throw new Error(`Falha em ${nome}: ${r.error || 'sem detalhe'}`);
  let saida = r?.output ?? r;
  if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { /* texto */ } }
  return saida;
}

const ehVerdade = (v) => v === true || Number(v) === 1;

function membroDaLinha(l, userId) {
  if (!l || !l.MEMBRO_ID) return { userId, membroId: 0, nome: '', cargo: '', nivel: 0, admin: false, veTudo: false, caminho: '' };
  const admin = ehVerdade(l.ADMIN);
  return {
    userId, membroId: Number(l.MEMBRO_ID), nome: l.NOME, cargo: l.CARGO, nivel: Number(l.NIVEL) || 0, admin,
    veTudo: admin || l.CARGO === 'GERENTE' || l.CARGO === 'DIRETORIA', caminho: l.CAMINHO || '',
  };
}

/** A sessão (:VAR_USER) e o membro ativo dela; `userId = 0` = sem sessão; `membroId = 0` com sessão = não é da equipe. */
async function sessao() {
  const [l] = await ler(`SELECT EU.ID AS USER_ID, M.ID AS MEMBRO_ID, M.NOME, M.CARGO, M.NIVEL, M.ADMIN, M.CAMINHO
FROM (SELECT :VAR_USER AS ID) EU
LEFT JOIN INT_USER U ON U.ID = EU.ID
LEFT JOIN CC_MEMBRO M ON M.USER_EMAIL = LOWER(U.DESCR) AND M.ATIVO = TRUE
WHERE EU.ID IS NOT NULL LIMIT 1`);
  const userId = l && Number(l.USER_ID) ? Number(l.USER_ID) : 0;
  return membroDaLinha(userId ? l : null, userId);
}

/**
 * Quem age (DT-34): com sessão, o membro da sessão (o `membroId` do input é ignorado); sem sessão e
 * `event.membroId > 0`, esse membro ("em nome de", aninhada); sem os dois, a rotina (`rotina: true`).
 * Membro informado inexistente ou inativo volta com `membroId = 0` e `rotina = false` (recusar).
 */
async function quem() {
  const s = await sessao();
  if (s.userId) return { ...s, rotina: false };
  const id = Math.trunc(Number(event.membroId) || 0);
  if (id > 0) {
    const [l] = await ler(`SELECT M.ID AS MEMBRO_ID, M.NOME, M.CARGO, M.NIVEL, M.ADMIN, M.CAMINHO FROM CC_MEMBRO M WHERE M.ID = ${id} AND M.ATIVO = TRUE`);
    return { ...membroDaLinha(l, 0), rotina: false, emNomeDe: true };
  }
  return { ...membroDaLinha(null, 0), nome: 'Rotina', rotina: true };
}

/** Administra (D-06): nível ≥ 3 ou a marca ADMIN. */
function podeAdministrar(m) {
  return !!m && !!m.membroId && (m.nivel >= 3 || m.admin === true);
}

/** Nível mínimo que não é alçada (N2, N3): nível ≥ n ou a marca ADMIN. */
function nivelMin(m, n) {
  return !!m && !!m.membroId && (m.nivel >= n || m.admin === true);
}

/** `{ 'grupo.chave': valor }` em vigor na carteira e na data (padrão hoje), numa consulta. */
async function parametros(carteira = '', data = '') {
  const cart = ['ESTETICA', 'PUBLICA'].includes(carteira) ? carteira : '';
  const hojeData = hoje();
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(String(data)) ? String(data) : hojeData;
  const maior = ref > hojeData ? ref : hojeData;
  const rows = await ler(`SELECT D.CHAVE, D.TIPO, D.COM_VIGENCIA, P.CARTEIRA, P.VALOR, P.VIGENCIA_INICIO
FROM CC_PARAMETRO_DEF D LEFT JOIN CC_PARAMETRO P ON P.CHAVE = D.CHAVE AND P.CARTEIRA IN ('', '${cart}') AND P.VIGENCIA_INICIO <= '${maior}'`);
  const defs = [];
  const vistas = new Set();
  for (const r of rows) if (!vistas.has(r.CHAVE)) { vistas.add(r.CHAVE); defs.push(r); }
  return efetivos(defs, rows.filter((r) => r.VIGENCIA_INICIO !== null && r.VIGENCIA_INICIO !== undefined), cart, ref, hojeData);
}

/** Valor para a auditoria: texto até 1.000 caracteres, booleano Sim/Não, sem o separador das listas. */
function textoDeAuditoria(v) {
  if (v === null || v === undefined) return '';
  const t = typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v);
  const limpo = t.split('¦').join('|');
  return limpo.length > 1000 ? `${limpo.slice(0, 999)}…` : limpo;
}

/**
 * Uma execução de `ccEscBaseAuditoria` com até 20 linhas (01 §7): `itens` = [{ entidadeId, clienteId,
 * campo, antes, depois, nome? }]. Acima de 20, as 19 primeiras e uma linha '(demais)' com os nomes.
 * Entrada da interna: area, entidade, n, entidadeIds, clienteIds ('' = nulo), campos, antes, depois
 * (listas alinhadas por '¦'), membroId (0 = rotina) e agora.
 */
async function auditarLinhas(area, entidade, itens, m) {
  let lista = (itens || []).filter(Boolean);
  if (!lista.length) return null;
  if (lista.length > 20) {
    const resto = lista.slice(19);
    lista = [...lista.slice(0, 19), { entidadeId: 0, clienteId: null, campo: '(demais)', antes: '',
      depois: resto.map((i) => i.nome || i.entidadeId).join(', ') }];
  }
  const col = (f) => lista.map((i) => textoDeAuditoria(f(i))).join('¦');
  return escrever('ccEscBaseAuditoria', {
    area, entidade, n: lista.length,
    entidadeIds: col((i) => Number(i.entidadeId) || 0),
    clienteIds: col((i) => (i.clienteId ? Number(i.clienteId) : '')),
    campos: col((i) => textoDeAuditoria(i.campo).slice(0, 60)), antes: col((i) => i.antes), depois: col((i) => i.depois),
    membroId: m && m.membroId ? m.membroId : 0, agora: agora(),
  });
}

/** Caso de uma entidade só: `campos` = [{ campo, antes, depois }]. */
async function auditar(area, entidade, entidadeId, clienteId, campos, m) {
  return auditarLinhas(area, entidade, (campos || []).map((c) => ({ entidadeId, clienteId, ...c })), m);
}

/** O passo ainda não rodou completo hoje (`CC_ESTADO['rotina.diaCompleto.<PASSO>']`). */
async function rodadaCompleta(passo) {
  const [l] = await ler(`SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'rotina.diaCompleto.${String(passo).replace(/[^A-Z_]/g, '')}'`);
  return !l || String(l.VALOR) !== hoje();
}

function recusar(error, extra) {
  return { ok: false, error, ...(extra || {}) };
}

export const PREAMBULO = `// ── preâmbulo Crédito e Cobrança (backend/lib/escritas.mjs) ──
const sdk = require('mitra-sdk');
const projectId = Number(process.env.MITRA_PROJECT_ID || event.projectId);
const CC_IDS = ${MARCADOR_IDS};
const MSG = ${JSON.stringify(MSG)};
${[agora, hoje, somarMeses, linhasDe, ler, idDe, escrever, chamarKb, membroDaLinha, sessao, quem, podeAdministrar, nivelMin,
    visivel, parametros, textoDeAuditoria, auditarLinhas, auditar, rodadaCompleta, recusar].map(String).join('\n')}
const ehVerdade = ${ehVerdade};
${FONTE_PARAMETROS}
// ── fim do preâmbulo ──
`;

/** Código de SF JAVASCRIPT: preâmbulo + corpo (texto, ou função cujo corpo roda com `return await`). */
export function js(corpo) {
  return typeof corpo === 'function' ? `${PREAMBULO}\nreturn await (${corpo})();` : `${PREAMBULO}\n${corpo}`;
}

/* ── publicação: modelos de mensagem (01 §13) ── */


/**
 * Insere os modelos que não existem (CODIGO único). `modelos` = MODELOS de `lib/modelos/NNN-*.mjs`
 * ({ codigo, nome, assunto, corpo, camposExtras, efeitoLegal }); nasce sem validação (01 §13).
 * `exec` = { consultar(sql), executar(sql) }.
 */
export async function semearModelos(exec, modulos, agoraIso) {
  let inseridos = 0;
  for (const m of modulos) {
    for (const modelo of m.MODELOS || []) {
      const extras = Array.isArray(modelo.camposExtras) ? modelo.camposExtras.join(',') : (modelo.camposExtras || '');
      await exec.executar(`INSERT IGNORE INTO CC_MODELO_MENSAGEM (CODIGO, NOME, SPEC_DONA, ASSUNTO, CORPO, CAMPOS_EXTRAS, EFEITO_LEGAL, VERSAO, ATIVO, ATUALIZADO_EM)
VALUES (${txt(modelo.codigo)}, ${txt(modelo.nome)}, ${txt(modelo.specDona || m.spec)}, ${txt(modelo.assunto || '')}, ${txt(modelo.corpo)},
  ${txt(extras)}, ${modelo.efeitoLegal ? 'TRUE' : 'FALSE'}, 1, TRUE, ${txt(agoraIso)})`);
      inseridos += 1;
    }
  }
  return inseridos;
}
