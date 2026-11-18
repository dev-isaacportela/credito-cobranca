// Configuração do simulador local do Mitra — Crédito e Cobrança.
// Único arquivo do kit que muda de projeto para projeto (skill mitra-escopo, references/simulador.md).

import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, '..');

/* ── identidade ── */

export const PROJECT_LABEL = 'Crédito e Cobrança — Simulador local';
// Semente estável enquanto o projeto não tem id na plataforma.
export const SEED = 1;

/* ── rede ── */

export const PORT = Number(process.env.SIMULATOR_PORT || 3115);
export const PROJECT_ID = Number(process.env.SIMULATOR_PROJECT_ID || 1);
export const DEFAULT_PASSWORD = process.env.SIMULATOR_PASSWORD || 'mitra123';

/* ── banco ── */

export const DB_PATH = process.env.SIMULATOR_DB_PATH || join(HERE, 'data', 'mitra-sim.db');

// Módulos com `export const DDL = [...]`: o schema de cada spec, o da lib e as PC* do Winthor
// (só do simulador; nunca no setup-backend.mjs).
const SCHEMA_DIR = join(BACKEND, 'schema');
export const DDL_SOURCES = [
  ...(existsSync(SCHEMA_DIR) ? readdirSync(SCHEMA_DIR).filter((n) => /^\d{3}-.+\.mjs$/.test(n)).sort().map((n) => join(SCHEMA_DIR, n)) : []),
  fileURLToPath(import.meta.resolve('@benenutri/mitra-kanban/backend/schema')),
  join(HERE, 'schema-winthor.mjs'),
];

export const HEALTH_TABLE = 'CC_MEMBRO';

/* ── server functions ── */

// Ordem de publicação (01 §14, DT-39). O add-090-perfil-acesso.mjs NUNCA entra aqui: roda por último
// e só no sandbox. Cada spec acrescenta o seu add-0N0 quando nasce; o que não existe é pulado.
const ORDEM = [
  'add-001-kanban.mjs',
  'add-002-jdbc-winthor.mjs',
  'add-010-base.mjs',
  'add-020-cobranca-privada.mjs',
  'add-030-juridico.mjs',
  'add-040-concessao-credito.mjs',
  'add-050-setor-publico.mjs',
  'add-060-painel-consolidado.mjs',
  'add-070-historico-apoio.mjs',
];
export const PUBLISH_ORDER = ORDEM.filter((arquivo) => existsSync(join(BACKEND, arquivo)));

// jdbcId que o simulador dá ao Winthor: troca o marcador `__JDBC_WINTHOR__` das JS e marca as
// definitions SQL com `jdbcId` (na publicação o id real vem de `jdbcIdWinthor()`, por nome).
export { MARCADOR_JDBC_WINTHOR } from '../lib/winthor-sql.mjs';
export const JDBC_WINTHOR_SIM = 3;

export const FRONTEND_MAP = join(BACKEND, '..', 'frontend', 'src', 'lib', 'server-functions.ts');
export const MAP_NAMES = 'SERVER_FUNCTION_NAMES';
export const MAP_IDS = 'SERVER_FUNCTIONS';

// Parâmetros que o sim:check passa às SFs SQL de leitura (desligado: '' no texto, 0 no número).
// Cada spec acrescenta as suas chaves (T-037 para a 001); chave repetida vale a última.
export const CHECK_INPUT = {
  busca: '', limite: '20', offset: '0',
  // lib de quadros
  usuarioId: '1', cardId: '1', boardId: '1', faseId: '1', slug: '',
  // 001-base (leituras e ccEsc…)
  setor: '', carteira: '', agenteId: '0', analistaId: '0', buId: '-1', uf: '', tipoPessoa: '', soVencidos: '0', ordem: 'NOME',
  situacaoFicha: '', soPrincipais: '0', dia: '', situacao: '', gerarAno: '0', remover: '0', clienteId: '1', codcli: '1001',
  documento: '', meses: '12', cargo: '', ativo: '-1', ativa: '-1', semBu: '0', grupo: '', data: '', chave: 'crit.atrasoCritico',
  ano: '0', specDona: '', codigo: '', origem: '', entidade: 'CLIENTE', entidadeId: '1', area: '', membroId: '0', de: '', ate: '',
  comAtraso: '0',
  // 002-cobranca
  cobrancaId: '0', nfId: '0', filtro: '', retorno: '', promessa: '', dias: '30',
  // 004-concessao-credito
  faseChave: '', solicitacaoId: '0', creditoId: '0', pedidoId: '0', pendenciaId: '0', gravar: '0', agrupar: '', classe: '',
  vencendoEmDias: '0', vencidos: '0', divergeWinthor: '0', gatilho: '', tipo: '', rating: '', rebaixado: '-1', saude: '',
  criticidade: '', entradas: '{}',
  // 005-setor-publico
  analiseId: '0', acima2m: '-1', soAlerta: '0', todas: '0', clientes: '0', aPartirDe: '0', transacoes: '0', desde: '2026-01-01', linhas: '10',
  regraId: '0', certidaoId: '0', passo: '',
  // 003-juridico
  filial: '', linha: '', responsavelId: '0', semAndamentoDias: '0', valorDe: '0', valorAte: '0', processoId: '0', acordoId: '0', pago: '-1',
  semComprovante: '0', mes: '',
  // 006-painel-consolidado: mes, ate ('' = mês corrente), meses, buId, carteira, busca, limite e offset já vêm acima
  // 007-historico-apoio (clienteId, de, ate, grupo, ativo, busca, carteira e membroId já vêm acima)
  categoria: '', revisar: '-1', fonteId: '0', titulo: '', url: '', responsavel: '', uso: '', revisarJuridico: '0', materialId: '0',
  descricao: '', tags: '', anexoId: '0', vigenteDesde: '',
};
