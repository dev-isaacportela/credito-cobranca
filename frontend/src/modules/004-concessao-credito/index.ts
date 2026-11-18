// Módulo 004 — concessão e gestão de crédito (01 §14, DT-39). Uma tela por processo para as três
// carteiras (D-05): `/credito/:carteira/:aba`, com a carteira e as visões como abas (casca C).
// Import relativo com extensão: os testes importam os módulos no Node.

import { lazy } from 'react';
import type { MembroSessao, Modulo } from '../../lib/base/menu.ts';

const Credito = lazy(() => import('./Credito'));

export const modulo: Modulo = {
  spec: '004-concessao-credito',
  rotas: [
    { caminho: '/credito', tela: Credito },
    { caminho: '/credito/:carteira', tela: Credito },
    { caminho: '/credito/:carteira/:aba', tela: Credito },
    { caminho: '/semaforo', tela: lazy(() => import('./Semaforo')) },
  ],
  menu: [
    { grupo: 'OPERACAO', rotulo: 'Análise de crédito', caminho: '/credito', icone: 'hand-coins', ordem: 30,
      pode: (m: MembroSessao) => m.cargo !== 'JURIDICO' },
    // Semáforo: leituras de validação e revisão são N2 (04 §4).
    { grupo: 'OPERACAO', rotulo: 'Semáforo de crédito', caminho: '/semaforo', icone: 'shield-check', ordem: 35,
      pode: (m: MembroSessao) => m.nivel >= 2 || m.admin },
  ],
};
