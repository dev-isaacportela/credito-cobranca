// Dados comuns das telas da 004: leitura com estado, a ficha do card aberto (uma chamada por card,
// dividida entre conteúdo da fase, abas e ações), carteira na URL e formatação.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useOutletContext } from 'react-router-dom';
import { acao, linhas } from '@/lib/mitra-api';
import type { MembroSessao } from '@/lib/base/menu';
import type { Carteira } from '@/lib/base/carteira';
import { chaveDaFicha } from '@/lib/concessao-credito/regras';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Linha = Record<string, any>;

export const useMembro = () => useOutletContext<MembroSessao>();

export const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const vazio = (v: unknown) => v === null || v === undefined || v === '';
export const pct = (v: unknown, casas = 1) =>
  vazio(v) ? '' : `${n(v).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;
export const inteiro = (v: unknown) => n(v).toLocaleString('pt-BR');

export const CARTEIRA_URL: Record<Carteira, string> = { PRIVADA: 'privada', ESTETICA: 'estetica', PUBLICA: 'publica' };
export const carteiraDaUrl = (s: string | undefined): Carteira | null =>
  (Object.entries(CARTEIRA_URL).find(([, u]) => u === s)?.[0] as Carteira | undefined) ?? null;
export const slugConcessao = (c: Carteira) => `concessao-${CARTEIRA_URL[c]}`;
/** Carteira com o motor da 004 (Semáforo, Saúde, Sinalizados e flexibilização só nelas: E-4). */
export const temMotorProprio = (c: string) => c !== 'PUBLICA';
/** Leituras `N2` (Desempenho, validação do farol): nível ≥ 2 ou a marca Administrador. */
export const nivel2 = (m: MembroSessao) => m.nivel >= 2 || m.admin;

/** Leitura ao abrir: `carregar` devolve a promessa; `recarregar` refaz (nenhuma tela relê sozinha). */
export function useLeitura<T>(carregar: () => Promise<T>, deps: unknown[]) {
  const [estado, setEstado] = useState<{ dados: T | null; erro: string; carregando: boolean }>({ dados: null, erro: '', carregando: true });
  const [versao, setVersao] = useState(0);
  // As dependências da leitura são os `deps` de quem chama (valores simples), comparados pelo texto.
  const chave = JSON.stringify(deps);
  useEffect(() => {
    let vivo = true;
    carregar()
      .then((dados) => vivo && setEstado({ dados, erro: '', carregando: false }))
      .catch((e: unknown) => vivo && setEstado({ dados: null, erro: e instanceof Error ? e.message : 'Falha ao ler.', carregando: false }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, versao]);
  return { ...estado, recarregar: () => setVersao((v) => v + 1) };
}

type NomeSql = Parameters<typeof linhas>[0];

/** `Promise.allSettled` das leituras de abertura: cada uma devolve linhas ou [] e o primeiro erro vira aviso. */
export async function lerTodas(pedidos: [NomeSql, Record<string, unknown>][]) {
  const r = await Promise.allSettled(pedidos.map(([nome, input]) => linhas(nome, input)));
  const falha = r.find((x) => x.status === 'rejected') as PromiseRejectedResult | undefined;
  return { listas: r.map((x) => (x.status === 'fulfilled' ? x.value : [])), erro: falha ? String(falha.reason?.message ?? falha.reason) : '' };
}

/** Resposta de uma JS: `null` = ok; texto = recusa para o `Alert`. */
export async function executar(nome: Parameters<typeof acao>[0], input: Record<string, unknown>): Promise<string | null> {
  try {
    const r = await acao(nome, input);
    return r.ok === false ? String(r.error ?? 'O servidor recusou.') : null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Falha ao gravar.';
  }
}

/* ── Ficha do card aberto: uma leitura por card ─────────────────────────────
   Conteúdo da fase, abas e ações do mesmo card leem a mesma promessa (card = kbCardDetalheSql + ficha,
   RNF-004). A chave muda com a fase e com a última alteração do card; `invalidarFicha` relê depois de uma
   ação da 004 que não altera o card. ponytail: cache em memória do módulo, limpo a cada 50 chaves. */

type NomeFicha = 'ccCredSolicitacaoFicha' | 'ccCredPedidoFicha';
const fichas = new Map<string, Promise<Linha>>();
const versoes = new Map<number, number>();
const ouvintes = new Set<() => void>();

export function invalidarFicha(cardId: number) {
  versoes.set(cardId, (versoes.get(cardId) ?? 0) + 1);
  ouvintes.forEach((f) => f());
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
};

export function useFicha(nome: NomeFicha, card: { id: number; faseId: number; atualizadoEm: string | null; valores?: unknown }) {
  const versao = useSyncExternalStore(assinar, () => versoes.get(card.id) ?? 0);
  const chave = chaveDaFicha(nome, card, versao);
  const [lida, setLida] = useState<{ chave: string; ficha: Linha | null; erro: string } | null>(null);
  useEffect(() => {
    let vivo = true;
    let p = fichas.get(chave);
    if (!p) {
      if (fichas.size > 50) fichas.clear();
      p = acao(nome, { cardId: card.id, [nome === 'ccCredPedidoFicha' ? 'pedidoId' : 'solicitacaoId']: 0 });
      fichas.set(chave, p);
    }
    p.then((r) => vivo && setLida({ chave, ficha: r.ok === false ? null : r, erro: r.ok === false ? String(r.error ?? 'Falha ao ler.') : '' }))
      .catch((e: unknown) => vivo && setLida({ chave, ficha: null, erro: e instanceof Error ? e.message : 'Falha ao ler.' }));
    return () => {
      vivo = false;
    };
  }, [chave, nome, card.id]);
  const atual = lida?.chave === chave ? lida : null;
  // Enquanto relê, mostra a anterior (sem piscar).
  return { ficha: atual?.ficha ?? lida?.ficha ?? null, erro: atual?.erro ?? '', carregando: !atual };
}

type CardLido = { id: number; faseId: number; atualizadoEm: string | null };

// A análise do órgão (ccPubAnaliseObter) do card aberto da Pública: uma leitura por versão do card, dividida entre o
// bloco do órgão (005), a decisão do comitê (004) e o espelho de "Mover para" (005), que lê `analiseDoCard`.
// Ao chegar, avisa os ouvintes: o quadro redesenha o "Mover para" com a análise já lida.
const analises = new Map<string, Promise<Linha>>();
const analisePorCard = new Map<number, Linha | null>();
let analisesLidas = 0;

export function lerAnalisePublica(card: CardLido, solicitacaoId: number): Promise<Linha> {
  const chave = `${card.id}:${card.faseId}:${card.atualizadoEm}:${versoes.get(card.id) ?? 0}:${solicitacaoId}`;
  let p = analises.get(chave);
  if (!p) {
    if (analises.size > 50) analises.clear();
    p = acao('ccPubAnaliseObter', { solicitacaoId }).then((r) => {
      if (r.ok === false) throw new Error(String(r.error ?? 'Análise não encontrada.'));
      analisePorCard.set(card.id, (r.analise ?? null) as Linha | null);
      analisesLidas += 1;
      ouvintes.forEach((f) => f());
      return r as Linha;
    });
    p.catch(() => analises.delete(chave));
    analises.set(chave, p);
  }
  return p;
}

/** A análise já lida do card (`undefined` = ainda não lida; `null` = sem análise). */
export const analiseDoCard = (cardId: number) => analisePorCard.get(cardId);

/** Redesenha quem chama a cada análise que chega (a Esteira, para o "Mover para"). */
export const useAnalisesLidas = () => useSyncExternalStore(assinar, () => analisesLidas);

/** A resposta de ccPubAnaliseObter para a tela (`null` enquanto lê ou quando `ativo` é falso). */
export function useAnalisePublica(card: CardLido, solicitacaoId: number, ativo: boolean) {
  const versao = useSyncExternalStore(assinar, () => versoes.get(card.id) ?? 0);
  const chave = `${card.id}:${card.faseId}:${card.atualizadoEm}:${versao}:${solicitacaoId}`;
  const [lida, setLida] = useState<{ chave: string; r: Linha | null } | null>(null);
  useEffect(() => {
    if (!ativo || !solicitacaoId) return;
    let vivo = true;
    lerAnalisePublica(card, solicitacaoId).then((r) => vivo && setLida({ chave, r }), () => vivo && setLida({ chave, r: null }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, chave, solicitacaoId]);
  return lida?.chave === chave ? lida.r : null;
}

export const FORMAS = ['Boleto bancário', 'PIX', 'Cartão de crédito', 'Cartão BNDES', 'Transferência (TED)', 'Depósito antecipado', 'Cheque'];
export const opcoes = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

export const ROTULO_FONTE: Record<string, string> = {
  RECURSOS_PROPRIOS: 'Recursos próprios', OPERADORA: 'Operadora de plano de saúde / convênio', SUS: 'SUS', PACIENTE: 'Paciente particular',
  MISTO: 'Misto', OUTRA: 'Outra',
};

export const ROTULO_RESULTADO: Record<string, string> = {
  APROVADA: 'Aprovada', PRE_APROVADA: 'Pré-aprovada', RECUSADA: 'Recusada', RENOVADA: 'Renovada', OBSOLETO: 'Obsoleto',
  LIBERADO: 'Liberado', RECUSADO: 'Recusado',
};
