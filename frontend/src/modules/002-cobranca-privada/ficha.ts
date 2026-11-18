// A ficha do caso aberto no quadro (ccCobCasoFicha), uma leitura por abertura de card (RNF-003: detalhe + ficha).
// O quadro, o bloco "Ação da fase", as abas, as ações e o espelho de "Mover para" leem a mesma, por `cardId`.

import { useEffect, useSyncExternalStore } from 'react';
import { acao } from '@/lib/mitra-api';
import type { Linha } from './comum';

export interface Ficha {
  /** Decisor de outra equipe (DT-35): a ficha traz só o necessário para decidir. */
  restrito?: boolean;
  caso: Linha & { id: number; cardId: number; carteira: string; aberto: boolean; faseChave: string; faseNome: string; faseDevida: string };
  cliente: { id: number; codcli: number; nome: string; agenteId: number; setor: string };
  posicao: Linha;
  porBu: Linha[];
  acoes: { n: number; texto: string; define: boolean; email: boolean; marcado: boolean }[];
  acaoFeita: Linha | null;
  promessas: Linha[];
  acordo: Linha | null;
  parcelas: Linha[];
  baixa: Linha | null;
  contatos: Linha[];
  fila: Linha[];
  bloqueio: { devido: string; aplicado: string; aplicadoEm: string | null };
  pode: Record<'operar' | 'registrarAcao' | 'registrarContato' | 'enviarEmail' | 'proporAcordo' | 'decidirAcordo' | 'pagarParcela' | 'cancelarAcordo'
    | 'proporBaixa' | 'parecerBaixa' | 'decidirBaixa' | 'registrarBloqueio' | 'registrarAnuencia' | 'montarDossie', boolean>;
}

export type EstadoFicha = { ficha?: Ficha; erro?: string };

const valores = new Map<number, EstadoFicha>();
const emCurso = new Map<number, Promise<void>>();
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

/** Lê a ficha do card; `forcar` relê mesmo com valor guardado (abrir o card de novo). Leituras simultâneas viram uma. */
export function pedirFicha(cardId: number, forcar = false): Promise<void> {
  const andando = emCurso.get(cardId);
  if (andando) return andando;
  if (!forcar && valores.has(cardId)) return Promise.resolve();
  const p = acao('ccCobCasoFicha', { cobrancaId: 0, cardId })
    .then((r) => { valores.set(cardId, r.ok === false ? { erro: String(r.error ?? 'Caso não encontrado.') } : { ficha: r as unknown as Ficha }); })
    .catch((e: unknown) => { valores.set(cardId, { erro: e instanceof Error ? e.message : String(e) }); })
    .finally(() => { emCurso.delete(cardId); avisar(); });
  emCurso.set(cardId, p);
  return p;
}

/** Depois de gravar: relê a ficha e avisa quem a mostra. */
export const recarregarFicha = (cardId: number) => pedirFicha(cardId, true);

/** Valor já lido, sem pedir (o espelho síncrono de "Mover para"). */
export const fichaGuardada = (cardId: number) => valores.get(cardId)?.ficha;
export const erroDaFicha = (cardId: number) => valores.get(cardId)?.erro;

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/** A ficha do card; `abrindo` relê ao montar (o quadro, quando o card abre). */
export function useFicha(cardId: number | null, abrindo = false): EstadoFicha {
  const estado = useSyncExternalStore(assinar, () => (cardId ? valores.get(cardId) : undefined));
  useEffect(() => {
    if (cardId) void pedirFicha(cardId, abrindo);
  }, [cardId, abrindo]);
  return estado ?? {};
}

/* Chave de cada fase do quadro (CC_FASE), pelo nome de KB_FASE que a mesma leitura devolve (ccCobQuadroResumo). */
const chaves = new Map<string, Map<string, string>>();
export const guardarChaves = (slug: string, resumo: Linha[]) =>
  chaves.set(slug, new Map(resumo.map((l) => [String(l.FASE_NOME), String(l.FASE_CHAVE)])));
export const chavesDoQuadro = (slug: string) => chaves.get(slug);
