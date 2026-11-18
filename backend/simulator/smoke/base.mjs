// Base dos smokes (06 §3). Cada smoke/NNN-*.mjs exporta `SEEDS` (seeds declarados), `RELOGIO`
// (padrão D), `QUADROS_TESTE`, `BANCO_POR_TESTE` e `suite()`, que registra os `teste()`. O smoke.mjs
// monta o banco do arquivo pelo pipeline (seed.mjs) e chama `suite()`.
//
// Os ajudantes agem sobre o banco ATUAL (o do arquivo, ou a cópia do teste com BANCO_POR_TESTE):
// `chamar` executa como a sessão de `como()`; sem `como`, sem sessão.

import assert from 'node:assert/strict';
import { copyFileSync, rmSync } from 'node:fs';
import { abrirBancoExistente, rodarCron as rodarCronDoBanco, rodarAte, montarBanco } from '../seed.mjs';
import { usarBanco, U, M } from '../seed/000-elenco.mjs';
import { D, fixarRelogio } from '../relogio.mjs';

export { assert, U, M, montarBanco };
export { dia, diaUtil, nota, cliente, documentoDe, USUARIOS, EQUIPE } from '../seed/000-elenco.mjs';
export { fixarRelogio, comRelogio, D } from '../relogio.mjs';

class Pulado extends Error {}

let atual = null;
let sessao = 0;
let porTeste = false;
let snapshotDoArquivo = null;
let relogioDoArquivo = D;
let metaDoArquivo = {};
const placar = { ok: 0, pulados: 0, falhas: [] };

const removerArquivo = (arquivo) => { for (const s of ['', '-wal', '-shm']) rmSync(`${arquivo}${s}`, { force: true }); };

/** Cópia consistente do banco num arquivo novo. */
function snapshot(banco) {
  const destino = `${banco.arquivo}.${Date.now()}-${Math.random().toString(36).slice(2)}.snap`;
  banco.db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  return destino;
}

/** Abre uma cópia do snapshot com os mesmos dublês. */
async function abrirCopia(arquivoSnapshot, dubles = {}) {
  const arquivo = `${arquivoSnapshot}.${Math.random().toString(36).slice(2)}.db`;
  copyFileSync(arquivoSnapshot, arquivo);
  const banco = await abrirBancoExistente(arquivo);
  Object.assign(banco, metaDoArquivo, { relogio: relogioDoArquivo });
  banco.dubles = { ...dubles };
  for (const [nome, def] of Object.entries(banco.dubles)) banco.runner.substituir(nome, def);
  return banco;
}

function fechar(banco) {
  banco.db.close();
  removerArquivo(banco.arquivo);
}

/** Usado pelo smoke.mjs: monta o banco do arquivo e prepara os testes. */
export async function iniciarArquivo(modulo, { log } = {}) {
  relogioDoArquivo = modulo.RELOGIO || D;
  porTeste = modulo.BANCO_POR_TESTE === true;
  atual = await montarBanco({ seeds: modulo.SEEDS || [], relogio: relogioDoArquivo, quadros: modulo.QUADROS_TESTE || [], log });
  atual.dubles = {};
  metaDoArquivo = { quadros: atual.quadros || [], avisos: atual.avisos || [] };
  sessao = 0;
  if (porTeste) snapshotDoArquivo = snapshot(atual);
  return atual;
}

export function encerrarArquivo() {
  if (atual) fechar(atual);
  if (snapshotDoArquivo) removerArquivo(snapshotDoArquivo);
  atual = null;
  snapshotDoArquivo = null;
}

export const resultado = () => placar;

/** `teste('C-003: …', async () => { … })`. Com BANCO_POR_TESTE, roda numa cópia do banco do passo 11. */
export async function teste(titulo, fn) {
  const doArquivo = atual;
  if (porTeste) atual = await abrirCopia(snapshotDoArquivo);
  sessao = 0;
  fixarRelogio(relogioDoArquivo);
  usarBanco(atual);
  try {
    await fn();
    placar.ok += 1;
    console.log(`  ok      ${titulo}`);
  } catch (erro) {
    if (erro instanceof Pulado) {
      placar.pulados += 1;
      console.log(`  pulado  ${titulo} (${erro.message})`);
    } else {
      placar.falhas.push(titulo);
      console.log(`  FALHOU  ${titulo}\n          ${String(erro?.stack || erro).split('\n').slice(0, 6).join('\n          ')}`);
    }
  } finally {
    delete process.env.SIM_SESSAO_ANINHADA;
    if (porTeste) {
      fechar(atual);
      atual = doArquivo;
      usarBanco(atual);
    }
  }
}

/** Interrompe o teste como pulado (módulo ausente: `pular('depende de 004')`). */
export function pular(motivo) {
  throw new Pulado(motivo);
}

export const banco = () => atual;
export const db = () => atual.db;
export const existe = (nome) => atual.runner.existe(nome);
export const consultar = (sql, ...params) => atual.db.prepare(sql).all(...params).map((l) => ({ ...l }));

/** Sessão para as chamadas de `fn`: login do elenco, userId ou null (sem sessão: cron, aninhada). */
export async function como(quem, fn) {
  const antes = sessao;
  sessao = quem === null || quem === undefined ? 0 : (typeof quem === 'number' ? quem : U[quem]);
  if (sessao === undefined) throw new Error(`Usuário ${quem} fora do elenco.`);
  try {
    return await fn();
  } finally {
    sessao = antes;
  }
}

/** Executa a SF como a sessão atual. SF não publicada: pula o teste. */
export function chamar(nome, input = {}) {
  if (!atual.runner.existe(nome)) pular(`${nome} não publicada`);
  return atual.runner.executar(nome, input, { userId: sessao });
}

/** Uma rodada de cron (apaga a trava antes, 06 §1). */
export async function rodarCron(nome = 'ccRotina') {
  const r = await rodarCronDoBanco(atual, nome);
  if (r && r.pulado) pular(`${nome} não publicada`);
  return r;
}

/** "Leitura" das linhas de teste: rotina até leitura e processamento terminarem. */
export async function rodarRotinaAte(opcoes) {
  const r = await rodarAte(atual, opcoes);
  if (r && r.pulado) pular('ccRotina não publicada');
  return r;
}

/** Quantas SFs `fn` executou (aninhadas inclusive). */
export async function execucoes(fn) {
  const antes = atual.runner.contador();
  await fn();
  return atual.runner.contador() - antes;
}

/** Dublê de SF (de outro módulo, ou de teste) no banco atual. */
export function substituir(nome, definition) {
  atual.dubles[nome] = definition;
  atual.runner.substituir(nome, definition);
}

/** Winthor fora do ar durante `fn`: a tabela some (renomeada) e volta no fim. */
export async function winthorFora(fn, tabela = 'PCPREST') {
  atual.db.exec(`ALTER TABLE ${tabela} RENAME TO ${tabela}_FORA`);
  try {
    return await fn();
  } finally {
    atual.db.exec(`ALTER TABLE ${tabela}_FORA RENAME TO ${tabela}`);
  }
}

/**
 * Roda `fn` em duas cópias do banco atual, com SIM_SESSAO_ANINHADA 0 e 1 (DT-34), e afirma o mesmo
 * resultado. `fn(modo)` devolve o que deve coincidir. O banco atual não muda.
 */
export async function nasDuasSessoes(fn) {
  const origem = atual;
  const snap = snapshot(origem);
  const resultados = [];
  try {
    for (const modo of ['0', '1']) {
      atual = await abrirCopia(snap, origem.dubles);
      usarBanco(atual);
      process.env.SIM_SESSAO_ANINHADA = modo;
      try {
        resultados.push(await fn(modo));
      } finally {
        fechar(atual);
      }
    }
  } finally {
    delete process.env.SIM_SESSAO_ANINHADA;
    atual = origem;
    usarBanco(atual);
    removerArquivo(snap);
  }
  assert.deepEqual(resultados[1], resultados[0], 'resultado difere entre SIM_SESSAO_ANINHADA=0 e =1');
  return resultados[0];
}
