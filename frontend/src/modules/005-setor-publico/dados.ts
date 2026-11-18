// Apoio das telas da 005: leitura sem reler sozinha (RNF-004), escrita com a recusa para o Alert, e o que os blocos
// do card dividem (as NFs do órgão e a análise lida, uma leitura por card aberto — 01 §10, DT-42).

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useOutletContext } from 'react-router-dom';
import { acao, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import type { MembroSessao } from '@/lib/base/menu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Linha = Record<string, any>;

export const useMembro = () => useOutletContext<MembroSessao>();
export const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const vazio = (v: unknown) => v === null || v === undefined || v === '';
/** Moeda, ou '' sem valor (a tela mostra `Dash`). */
export const brl = (v: unknown) => (vazio(v) ? '' : moeda(n(v)));
/** Singular ou plural pela contagem. */
export const pl = (q: unknown, um: string, varios: string) => (Number(q) === 1 ? um : varios);
export const pct = (v: unknown) => `${n(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Carrega quando `chave` muda (ou em `recarregar()`), mantendo o dado anterior enquanto relê. */
export function useDados<T>(carregar: () => Promise<T>, chave: string) {
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<{ chave: string; dados?: T; erro?: string } | null>(null);
  const k = `${chave}#${versao}`;
  useEffect(() => {
    let vivo = true;
    carregar().then(
      (dados) => vivo && setEstado({ chave: k, dados }),
      (e: unknown) => vivo && setEstado((s) => ({ chave: k, dados: s?.dados, erro: e instanceof Error ? e.message : String(e) })),
    );
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  const atual = estado?.chave === k;
  return { dados: estado?.dados, carregando: !atual, erro: atual ? estado?.erro ?? '' : '', recarregar: () => setVersao((v) => v + 1) };
}

/** Busca com espera de 400 ms. */
export function useEspera(valor: string, ms = 400) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

/** Resposta de uma JS: `{ ok: true, … }` ou `{ erro }` com a recusa do servidor. */
export async function executar(nome: Parameters<typeof acao>[0], input: Record<string, unknown>): Promise<Linha & { erro?: string }> {
  try {
    const r = await acao(nome, input);
    return r.ok === false ? { erro: String(r.error ?? 'O servidor recusou.') } : r;
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Falha ao gravar.' };
  }
}

/** Hoje pelo relógio do servidor (`ccBaseSessao.hoje`): dias que faltam numa certidão. */
export { hojeDaSessao as hojeLocal } from '@/lib/base/hoje';

/** Filtros de ccPubNfListar todos presentes (desligado = '' / 0 / -1). */
export const NF_FILTRO = { clienteId: 0, analiseId: 0, agenteId: 0, situacao: '', acima2m: -1, de: '', ate: '', busca: '', limite: 20, offset: 0 };

/* ── Estado dividido entre os blocos do card (conteúdo da fase, abas, ações e o espelho de "Mover para") ── */

const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
const avisar = () => ouvintes.forEach((f) => f());

// ponytail: cache em memória do módulo; limpo por chave a cada gravação do bloco.
const nfs = new Map<number, Promise<Linha[]>>();
const nfsLidas = new Map<number, { lista?: Linha[]; erro?: string }>();

/** NFs em aberto do órgão (ccPubNfListar com `clienteId`), uma leitura por card; `forcar` relê depois de gravar. */
export function lerNfsDoOrgao(clienteId: number, forcar = false): Promise<Linha[]> {
  let p = nfs.get(clienteId);
  if (!p || forcar) {
    p = linhas('ccPubNfListar', { ...NF_FILTRO, clienteId, limite: 50 });
    nfs.set(clienteId, p);
    p.then((lista) => { nfsLidas.set(clienteId, { lista }); avisar(); }, (e: unknown) => { nfsLidas.set(clienteId, { erro: e instanceof Error ? e.message : String(e) }); avisar(); });
  }
  return p;
}

export function useNfsDoOrgao(clienteId: number) {
  const estado = useSyncExternalStore(assinar, () => (clienteId ? nfsLidas.get(clienteId) : undefined));
  useEffect(() => { if (clienteId) void lerNfsDoOrgao(clienteId); }, [clienteId]);
  return { lista: estado?.lista, erro: estado?.erro ?? '', recarregar: () => lerNfsDoOrgao(clienteId, true) };
}

