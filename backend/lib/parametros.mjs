// Parâmetros no código (01 §9, 03). Catálogo em CC_PARAMETRO_DEF, valores em CC_PARAMETRO.
//
// Valor efetivo (D-05) numa carteira e data: a vigência mais recente até a data da linha da
// carteira (ESTETICA, PUBLICA); se ela não existe ou tem VALOR nulo ("volta a herdar"), a vigência
// mais recente da linha padrão (CARTEIRA = ''), que é o valor da PRIVADA.
//
// `validarValor`, `converter` e `efetivos` entram nas SFs JAVASCRIPT por `FONTE` (autocontidas).

import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { HOJE_SQL } from './tempo.mjs';
import { txt as sql } from './texto-sql.mjs';

export const TIPOS = ['INTEIRO', 'DECIMAL', 'PERCENTUAL', 'MOEDA', 'RATING', 'TEXTO', 'LISTA', 'OPCAO', 'DATA'];
export const VIGENCIA_PADRAO = '2000-01-01';

const valorEm = (chave, carteira, data) => `(SELECT P.VALOR FROM CC_PARAMETRO P WHERE P.CHAVE = '${chave}' AND P.CARTEIRA = ${carteira}
      AND P.VIGENCIA_INICIO <= ${data} ORDER BY P.VIGENCIA_INICIO DESC LIMIT 1)`;

/** Subconsulta escalar com o valor efetivo (texto). `carteira` e `data` são expressões SQL. */
export const PARAM = (chave, carteira = "''", data = HOJE_SQL) =>
  `COALESCE(CASE WHEN ${carteira} <> '' THEN ${valorEm(chave, carteira, data)} END, ${valorEm(chave, "''", data)})`;

export const PARAM_NUM = (chave, carteira = "''", data = HOJE_SQL) => `CAST(${PARAM(chave, carteira, data)} AS DECIMAL(15,4))`;

/** '' quando o valor serve para a definição; senão o motivo, com o rótulo. */
export function validarValor(def, valor) {
  const rotulo = def.rotulo || def.ROTULO || def.chave || def.CHAVE;
  const tipo = def.tipo || def.TIPO;
  const minimo = def.minimo ?? def.MINIMO;
  const maximo = def.maximo ?? def.MAXIMO;
  const texto = valor === null || valor === undefined ? '' : String(valor).trim();
  if (texto === '') return tipo === 'TEXTO' || tipo === 'LISTA' ? '' : `${rotulo}: valor obrigatório.`;
  const numerico = ['INTEIRO', 'DECIMAL', 'PERCENTUAL', 'MOEDA'].includes(tipo);
  if (tipo === 'INTEIRO' && !/^-?\d+$/.test(texto)) return `${rotulo}: informe um número inteiro.`;
  if (numerico && !/^-?\d+(\.\d+)?$/.test(texto)) return `${rotulo}: informe um número.`;
  if (numerico) {
    const n = Number(texto);
    if (tipo === 'PERCENTUAL' && (n < 0 || n > 100)) return `${rotulo}: deve ser de 0 a 100.`;
    if (tipo === 'MOEDA' && n < 0) return `${rotulo}: não pode ser negativo.`;
    const temMin = minimo !== null && minimo !== undefined && minimo !== '';
    const temMax = maximo !== null && maximo !== undefined && maximo !== '';
    if ((temMin && n < Number(minimo)) || (temMax && n > Number(maximo))) {
      if (temMin && temMax) return `${rotulo}: deve ser de ${Number(minimo)} a ${Number(maximo)}.`;
      return temMin ? `${rotulo}: deve ser pelo menos ${Number(minimo)}.` : `${rotulo}: deve ser no máximo ${Number(maximo)}.`;
    }
  }
  if (tipo === 'RATING' && !['AA', 'A', 'B', 'C', 'D', 'E'].includes(texto)) return `${rotulo}: use AA, A, B, C, D ou E.`;
  if (tipo === 'OPCAO') {
    const bruto = def.opcoes ?? def.OPCOES ?? '';
    const opcoes = (Array.isArray(bruto) ? bruto : String(bruto).split(',')).map((o) => String(o).trim()).filter(Boolean);
    if (!opcoes.includes(texto)) return `${rotulo}: use ${opcoes.join(', ')}.`;
  }
  if (tipo === 'DATA') {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(texto) && new Date(`${texto}T00:00:00Z`).toISOString().slice(0, 10) === texto;
    if (!ok) return `${rotulo}: informe a data como AAAA-MM-DD.`;
  }
  if (tipo === 'LISTA' && texto.split(',').some((item) => item.trim() === '')) return `${rotulo}: lista com item vazio.`;
  return '';
}

/** Texto gravado → valor tipado (número para os tipos numéricos; texto para os demais). */
export function converter(tipo, texto) {
  if (texto === null || texto === undefined) return null;
  if (['INTEIRO', 'DECIMAL', 'PERCENTUAL', 'MOEDA'].includes(tipo)) {
    return String(texto).trim() === '' ? null : Number(texto);
  }
  return String(texto);
}

/**
 * Valores efetivos `{ 'grupo.chave': valor tipado }` a partir de `defs` (CHAVE, TIPO, COM_VIGENCIA) e de
 * `linhas` (CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO). Chave com vigência é lida em `data`; as demais,
 * sempre em `hojeData` (03, coluna Vig.).
 */
export function efetivos(defs, linhas, carteira, data, hojeData) {
  const cart = carteira === 'ESTETICA' || carteira === 'PUBLICA' ? carteira : '';
  const comVigencia = new Set(defs.filter((d) => d.COM_VIGENCIA === true || Number(d.COM_VIGENCIA) === 1).map((d) => d.CHAVE));
  const ultima = {};
  for (const l of linhas) {
    const ref = comVigencia.has(l.CHAVE) ? data : hojeData;
    if (String(l.VIGENCIA_INICIO) > String(ref)) continue;
    const lado = l.CARTEIRA === '' ? 'padrao' : (cart && l.CARTEIRA === cart ? 'carteira' : null);
    if (!lado) continue;
    const atual = ultima[`${l.CHAVE}|${lado}`];
    if (!atual || String(l.VIGENCIA_INICIO) > String(atual.VIGENCIA_INICIO)) ultima[`${l.CHAVE}|${lado}`] = l;
  }
  const saida = {};
  for (const d of defs) {
    const daCarteira = ultima[`${d.CHAVE}|carteira`];
    const linha = daCarteira && daCarteira.VALOR !== null && daCarteira.VALOR !== undefined ? daCarteira : ultima[`${d.CHAVE}|padrao`];
    saida[d.CHAVE] = converter(d.TIPO, linha ? linha.VALOR : null);
  }
  return saida;
}

export const FONTE = [validarValor, converter, efetivos].map(String).join('\n');

/* ── catálogo: fusão dos arquivos de chaves e semeadura (setup-backend e elenco do simulador) ── */

const PASTA = fileURLToPath(new URL('./parametros/', import.meta.url));

/** Importa os `NNN-*.mjs` presentes numa pasta, em ordem de nome, com `spec` = NNN. Pasta ausente = nenhum. */
export async function importarPresentes(pasta) {
  if (!existsSync(pasta)) return [];
  const nomes = readdirSync(pasta).filter((n) => /^\d{3}-.+\.mjs$/.test(n)).sort();
  const modulos = [];
  for (const nome of nomes) modulos.push({ spec: nome.slice(0, 3), ...(await import(pathToFileURL(join(pasta, nome)).href)) });
  return modulos;
}

/** Os `lib/parametros/NNN-*.mjs` presentes. Spec sem arquivo é pulada (01 §9). */
export const carregarArquivosDeParametros = (pasta = PASTA) => importarPresentes(pasta);

/** `{ definicoes, validacoes }`: chaves de todos os arquivos e o `validarConjunto` de cada grupo. */
export function fundir(modulos) {
  const definicoes = [];
  const vistas = new Set();
  const validacoes = {};
  for (const m of modulos) {
    for (const d of m.PARAMETROS || []) {
      if (vistas.has(d.chave)) throw new Error(`Parâmetro ${d.chave} declarado duas vezes (spec ${m.spec}).`);
      if (!TIPOS.includes(d.tipo)) throw new Error(`Parâmetro ${d.chave}: tipo ${d.tipo} desconhecido.`);
      vistas.add(d.chave);
      definicoes.push({ specDona: m.spec, ...d });
    }
    for (const [grupo, fn] of Object.entries(m.validarConjunto || {})) {
      if (validacoes[grupo]) throw new Error(`Grupo ${grupo} com validarConjunto em duas specs.`);
      validacoes[grupo] = fn;
    }
  }
  return { definicoes, validacoes };
}

const num = (v) => (v === null || v === undefined || v === '' ? 'NULL' : String(Number(v)));
const bool = (v) => (v ? 'TRUE' : 'FALSE');

/**
 * Grava o catálogo (upsert em CC_PARAMETRO_DEF) e o padrão só para chave sem valor: `vigencias`
 * no lugar do `padrao` quando declaradas; `carteiras` para o valor próprio semeado de cada carteira.
 * `exec` = { consultar(sql) → linhas, executar(sql) } (mitra-sdk no sandbox, SQLite no simulador).
 */
export async function semearParametros(exec, definicoes, agoraIso) {
  for (let i = 0; i < definicoes.length; i += 50) {
    const lote = definicoes.slice(i, i + 50).map((d) => `(${[
      sql(d.chave), sql(d.grupo), num(d.ordem ?? 0), sql(d.rotulo), sql(d.tipo), sql(d.unidade ?? ''),
      sql(d.padrao ?? ''), num(d.minimo), num(d.maximo), sql(Array.isArray(d.opcoes) ? d.opcoes.join(',') : (d.opcoes ?? '')),
      bool(d.porCarteira), bool(d.comVigencia), sql(d.specDona), sql(d.usadoPor ?? ''), sql(d.descricao ?? ''), bool(d.validado ?? true),
    ].join(', ')})`);
    await exec.executar(`INSERT INTO CC_PARAMETRO_DEF (CHAVE, GRUPO, ORDEM, ROTULO, TIPO, UNIDADE, PADRAO, MINIMO, MAXIMO, OPCOES,
  POR_CARTEIRA, COM_VIGENCIA, SPEC_DONA, USADO_POR, DESCRICAO, VALIDADO)
VALUES ${lote.join(',\n  ')}
ON DUPLICATE KEY UPDATE GRUPO = VALUES(GRUPO), ORDEM = VALUES(ORDEM), ROTULO = VALUES(ROTULO), TIPO = VALUES(TIPO),
  UNIDADE = VALUES(UNIDADE), PADRAO = VALUES(PADRAO), MINIMO = VALUES(MINIMO), MAXIMO = VALUES(MAXIMO), OPCOES = VALUES(OPCOES),
  POR_CARTEIRA = VALUES(POR_CARTEIRA), COM_VIGENCIA = VALUES(COM_VIGENCIA), SPEC_DONA = VALUES(SPEC_DONA),
  USADO_POR = VALUES(USADO_POR), DESCRICAO = VALUES(DESCRICAO), VALIDADO = VALUES(VALIDADO)`);
  }

  const existentes = new Set((await exec.consultar('SELECT DISTINCT CHAVE, CARTEIRA FROM CC_PARAMETRO'))
    .map((l) => `${l.CHAVE}|${l.CARTEIRA}`));
  const linhas = [];
  for (const d of definicoes) {
    if (!existentes.has(`${d.chave}|`)) {
      const vigencias = d.comVigencia && d.vigencias?.length ? d.vigencias : [{ inicio: VIGENCIA_PADRAO, valor: d.padrao ?? '' }];
      for (const v of vigencias) linhas.push([d.chave, '', v.valor, v.inicio]);
    }
    for (const [carteira, valor] of Object.entries(d.carteiras || {})) {
      if (!existentes.has(`${d.chave}|${carteira}`)) linhas.push([d.chave, carteira, valor, VIGENCIA_PADRAO]);
    }
  }
  for (let i = 0; i < linhas.length; i += 100) {
    const lote = linhas.slice(i, i + 100).map(([chave, carteira, valor, inicio]) =>
      `(${sql(chave)}, ${sql(carteira)}, ${sql(valor === null ? null : String(valor))}, ${sql(inicio)}, ${sql(agoraIso)}, NULL)`);
    await exec.executar(`INSERT INTO CC_PARAMETRO (CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO, ATUALIZADO_EM, ATUALIZADO_POR)
VALUES ${lote.join(',\n  ')}`);
  }
  return { definicoes: definicoes.length, valores: linhas.length };
}
