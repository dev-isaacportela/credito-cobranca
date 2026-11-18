// A ficha do processo do card aberto (ccJurProcessoFicha), uma leitura por abertura de card (orçamento: detalhe da lib +
// ficha). Os blocos de "Nesta fase", as abas, as ações e o espelho de "Mover para" leem a mesma, por `cardId`.

import { useEffect, useSyncExternalStore } from 'react';
import { acao } from '@/lib/mitra-api';
import { lerAcao, useDados, type Linha } from './comum';

export interface ItemDossie {
  ID: number; ITEM: string; TEXTO: string; OBRIGATORIO: boolean; SITUACAO: string; OBS: string; ORIGEM: string;
  anexos: { id: number; nome: string; url: string }[];
}

export interface Ficha {
  processo: Linha & {
    ID: number; CARD_ID: number; CLIENTE_ID: number; CARTEIRA: string; ORIGEM: string; FASE_CHAVE: string; FASE_NOME: string; AUTOS: string;
    DOSSIE_ENVIADO_EM: string | null; ENCERRADO_EM: string | null; VALOR: number;
  };
  cliente: Linha | null;
  itens: ItemDossie[];
  progresso: { ok: number; total: number; faltam: string[] };
  andamentos: Linha[];
  custos: (Linha & { guia: { nome: string; url: string } | null; comprovante: { nome: string; url: string } | null })[];
  custoResumo: { total: number; pago: number; aPagar: number; pct: number };
  acordo: Linha | null;
  parcelas: Linha[];
  notificacao: Linha | null;
  pode: Record<'mover' | 'editar' | 'lancar' | 'registrarAcordo' | 'encerrar' | 'enviar' | 'marcarItem' | 'aprovarAcordo' | 'emitirNotificacao', boolean>;
}

export type EstadoFicha = { ficha?: Ficha; erro?: string };

const valores = new Map<number, EstadoFicha>();
const emCurso = new Map<number, Promise<void>>();
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

/** Lê a ficha do card; `forcar` relê mesmo com valor guardado. Leituras simultâneas viram uma. */
export function pedirFicha(cardId: number, forcar = false): Promise<void> {
  const andando = emCurso.get(cardId);
  if (andando) return andando;
  if (!forcar && valores.has(cardId)) return Promise.resolve();
  const p = acao('ccJurProcessoFicha', { processoId: 0, cardId })
    .then((r) => { valores.set(cardId, r.ok === false ? { erro: String(r.error ?? 'Processo não encontrado.') } : { ficha: r as unknown as Ficha }); })
    .catch((e: unknown) => { valores.set(cardId, { erro: e instanceof Error ? e.message : String(e) }); })
    .finally(() => { emCurso.delete(cardId); avisar(); });
  emCurso.set(cardId, p);
  return p;
}

export const recarregarFicha = (cardId: number) => pedirFicha(cardId, true);
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

/** A ficha por id do processo (rota do dossiê e ficha de leitura), fora do cache do card. */
export function useFichaPorId(processoId: number) {
  return useDados(async () => (await lerAcao('ccJurProcessoFicha', { processoId, cardId: 0 })) as unknown as Ficha, `ficha:${processoId}`);
}
