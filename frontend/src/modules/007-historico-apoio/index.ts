// Módulo 007 — histórico do cliente e apoio (01 §14). Histórico em Operação (ordem 60); fontes, material e
// regras em Cadastros (a partir de 50). Import relativo com extensão: o teste de tela importa este arquivo no Node.

import { lazy } from 'react';
import type { Modulo } from '../../lib/base/menu.ts';

const Historico = lazy(() => import('./HistoricoPage'));

export const modulo: Modulo = {
  spec: '007-historico-apoio',
  rotas: [
    { caminho: '/historico', tela: Historico },
    { caminho: '/historico/:clienteId', tela: Historico },
    { caminho: '/historico/:clienteId/documento', tela: lazy(() => import('./HistoricoDocumentoPage')) },
    { caminho: '/apoio/fontes', tela: lazy(() => import('./FontesPage')) },
    { caminho: '/apoio/material', tela: lazy(() => import('./MaterialPage')) },
    { caminho: '/apoio/regras', tela: lazy(() => import('./RegrasPage')) },
  ],
  menu: [
    { grupo: 'OPERACAO', rotulo: 'Histórico do cliente', caminho: '/historico', icone: 'history', ordem: 60 },
    { grupo: 'CADASTROS', rotulo: 'Fontes e links', caminho: '/apoio/fontes', icone: 'landmark', ordem: 50 },
    { grupo: 'CADASTROS', rotulo: 'Material de apoio', caminho: '/apoio/material', icone: 'book-open', ordem: 60 },
    { grupo: 'CADASTROS', rotulo: 'Regras em vigor', caminho: '/apoio/regras', icone: 'list-checks', ordem: 70 },
  ],
};
