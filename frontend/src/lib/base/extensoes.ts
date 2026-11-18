// Extensão de tela entre módulos (01 §14, D-05). A tela do quadro é uma só por processo (002 para
// cobrança, 004 para concessão); cada módulo registra, no próprio `modules/NNN-<slug>/extensoes.ts`,
// o que acrescenta ao card aberto de um quadro. O App importa esses arquivos uma vez, dona antes da 005.
//
// Combinação de vários registros no mesmo slug: abas e ações concatenadas na ordem de registro;
// `conteudoDaFase` desenha os blocos de todos, na mesma ordem, ignorando null; `podeMover` devolve a
// primeira mensagem não nula.

import { Fragment, createElement, type ReactNode } from 'react';
import type { AbaExtra, Card, Estrutura, ExtensaoContexto, Extensoes, Fase } from '@benenutri/mitra-kanban';

/** Ação extra do card aberto: desenha botões na coluna de "Mover para" (acima do Excluir). */
export type AcaoExtra = (ctx: ExtensaoContexto) => ReactNode;

export interface Extensao {
  abasExtras?: AbaExtra[];
  acoesExtras?: AcaoExtra[];
  conteudoDaFase?: (ctx: ExtensaoContexto) => ReactNode | null;
  /** Espelho do trecho de `gancho()` do módulo: texto = destino recusado com esse motivo. */
  podeMover?: (card: Card, fase: Fase, estrutura: Estrutura) => string | null;
}

const registros = new Map<string, Extensao[]>();

export function registrarExtensao(slugDoQuadro: string, ext: Extensao): void {
  registros.set(slugDoQuadro, [...(registros.get(slugDoQuadro) ?? []), ext]);
}

const emBlocos = (nos: ReactNode[]) =>
  nos.length ? createElement(Fragment, null, ...nos.map((no, i) => createElement(Fragment, { key: i }, no))) : null;

const desenhado = (no: ReactNode) => no !== null && no !== undefined && no !== false;

export function extensoesDe(slugDoQuadro: string) {
  const lista = registros.get(slugDoQuadro) ?? [];
  return {
    abasExtras: lista.flatMap((e) => e.abasExtras ?? []),
    acoesExtras: lista.flatMap((e) => e.acoesExtras ?? []),
    conteudoDaFase: (ctx: ExtensaoContexto): ReactNode =>
      emBlocos(lista.map((e) => e.conteudoDaFase?.(ctx) ?? null).filter(desenhado)),
    podeMover: (card: Card, fase: Fase, estrutura: Estrutura): string | null => {
      for (const e of lista) {
        const motivo = e.podeMover?.(card, fase, estrutura) ?? null;
        if (motivo) return motivo;
      }
      return null;
    },
  };
}

/** As mesmas extensões no formato das props de `KanbanBoard`: `<KanbanBoard slug={s} {...extensoesDoQuadro(s)} />`. */
export function extensoesDoQuadro(slugDoQuadro: string): Extensoes {
  const ext = extensoesDe(slugDoQuadro);
  return {
    abasExtras: ext.abasExtras,
    acoesExtras: (ctx) => emBlocos(ext.acoesExtras.map((acao) => acao(ctx)).filter(desenhado)),
    conteudoDaFase: ext.conteudoDaFase,
    podeMover: ext.podeMover,
  };
}
