// Módulo 006 — painel consolidado (01 §14): rota /painel (?aba=) e item "Painel" em Operação (ordem 10).
// Import relativo com extensão: o teste de tela (tests/006-painel-consolidado.test.mjs) importa este arquivo no Node.

import { lazy } from 'react';
import type { Modulo } from '../../lib/base/menu.ts';

export const modulo: Modulo = {
  spec: '006-painel-consolidado',
  rotas: [{ caminho: '/painel', tela: lazy(() => import('./PainelPage')) }],
  menu: [{
    grupo: 'OPERACAO', rotulo: 'Painel', caminho: '/painel', icone: 'layout-dashboard', ordem: 10,
    // O Jurídico não acessa o painel (RN-015); a recusa de verdade é do servidor.
    pode: (m) => m.cargo !== 'JURIDICO',
  }],
};
