// Peças de exibição da 004 montadas só com o vocabulário do page.tsx.

import type { ReactNode } from 'react';
import { moeda } from '@/lib/formato';
import { CorpoPainel, Dash, Ficha, Item, ItemFicha, ListaItens, Status } from '@/components/page';
import { n, vazio } from './dados';

/** Valor em reais; ausência é `Dash`, nunca R$ 0,00. */
export function Reais({ v, zeroEhDado = false }: { v: unknown; zeroEhDado?: boolean }) {
  if (vazio(v) || (!zeroEhDado && n(v) === 0)) return <Dash />;
  return <>{moeda(n(v))}</>;
}

/** Texto ou `Dash`. */
export function Txt({ v }: { v: ReactNode }) {
  return vazio(v) ? <Dash /> : <>{v}</>;
}

/** Pares rótulo/valor (lista de definição do vocabulário), com o respiro do painel. */
export function Pares({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <CorpoPainel>
      <Ficha>
        {itens.map(([rotulo, valor]) => (
          <ItemFicha key={rotulo} rotulo={rotulo}>{valor}</ItemFicha>
        ))}
      </Ficha>
    </CorpoPainel>
  );
}

const TOM_RATING: Record<string, 'live' | 'attention' | 'alert' | 'off'> = {
  AA: 'live', A: 'live', B: 'attention', C: 'attention', D: 'alert', E: 'alert',
  P1: 'live', P2: 'live', P3: 'attention', P4: 'alert',
};

/** Rating como estado (ponto + letra); sem rating, `Dash`. */
export function Rating({ r, extra }: { r: unknown; extra?: ReactNode }) {
  const t = String(r ?? '');
  if (!t) return <Dash />;
  return (
    <Status tone={TOM_RATING[t] ?? 'off'}>
      {t}
      {extra}
    </Status>
  );
}

const TOM_CRIT: Record<string, 'live' | 'attention' | 'alert' | 'off'> = { CRITICO: 'alert', ALERTA: 'attention', NORMAL: 'live' };
const ROT_CRIT: Record<string, string> = { CRITICO: 'Crítico', ALERTA: 'Alerta', NORMAL: 'Normal' };

export function Criticidade({ c }: { c: unknown }) {
  const t = String(c ?? '');
  return t ? <Status tone={TOM_CRIT[t] ?? 'off'}>{ROT_CRIT[t] ?? t}</Status> : <Dash />;
}

const TOM_SAUDE: Record<string, 'live' | 'attention' | 'alert'> = { SAUDAVEL: 'live', ATENCAO: 'attention', RISCO: 'alert' };
const ROT_SAUDE: Record<string, string> = { SAUDAVEL: 'Saudável', ATENCAO: 'Em atenção', RISCO: 'Risco' };

export function Saude({ s }: { s: unknown }) {
  const t = String(s ?? '');
  return t ? <Status tone={TOM_SAUDE[t] ?? 'live'}>{ROT_SAUDE[t] ?? t}</Status> : <Dash />;
}

/** Lista de pendências "Para avançar" (texto do servidor). */
export function ParaAvancar({ itens }: { itens: string[] }) {
  if (!itens.length) return <CorpoPainel><Status tone="live">Nada pendente para avançar.</Status></CorpoPainel>;
  return (
    <ListaItens>
      {itens.map((i) => (
        <Item key={i}>
          <Status tone="alert">{i.charAt(0).toUpperCase() + i.slice(1)}</Status>
        </Item>
      ))}
    </ListaItens>
  );
}
