/**
 * Peça de domínio do painel (sem classe: o layout é do `page.tsx`, §8.8). Os nomes de layout que moravam aqui subiram
 * para o vocabulário na integração.
 */
import * as React from 'react';
import { Alert, EmptyState, Panel } from '@/components/page';
import type { EstadoBloco } from '@/lib/painel-consolidado/visao';

/** O estado do bloco que não é dado (C-023): erro só naquele bloco; vazio, sem dado e módulo ausente num painel. */
export function AvisoDoBloco({ estado, hint }: { estado: EstadoBloco; hint?: React.ReactNode }) {
  if (estado.tipo === 'ERRO') return <Alert tone="error">{estado.texto}</Alert>;
  return (
    <Panel>
      <EmptyState title={estado.texto} hint={hint} />
    </Panel>
  );
}
