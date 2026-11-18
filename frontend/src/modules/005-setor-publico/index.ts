// Módulo 005 — setor público (T-203): só o que não existe no privado (D-05). A cobrança e a concessão do órgão são as
// telas da 002 e da 004; a 005 soma blocos ao card por `extensoes.tsx` e entrega as quatro telas abaixo.
// Import relativo com extensão: os testes importam os módulos no Node.

import { lazy } from 'react';
import type { Modulo } from '../../lib/base/menu.ts';

export const modulo: Modulo = {
  spec: '005-setor-publico',
  rotas: [
    { caminho: '/publico/notas-fiscais', tela: lazy(() => import('./FluxoNfPage')) },
    { caminho: '/publico/regras-ente', tela: lazy(() => import('./RegrasEntePage')) },
    { caminho: '/publico/comunicacao', tela: lazy(() => import('./ComunicacaoPage')) },
    { caminho: '/publico/certidoes', tela: lazy(() => import('./CertidoesPage')) },
  ],
  menu: [
    { grupo: 'OPERACAO', rotulo: 'Notas fiscais públicas', caminho: '/publico/notas-fiscais', icone: 'landmark', ordem: 47 },
    { grupo: 'CADASTROS', rotulo: 'Regras por ente', caminho: '/publico/regras-ente', icone: 'scale', ordem: 45 },
    { grupo: 'CADASTROS', rotulo: 'Comunicação com o órgão', caminho: '/publico/comunicacao', icone: 'mail', ordem: 46 },
    { grupo: 'CADASTROS', rotulo: 'Certidões da empresa', caminho: '/publico/certidoes', icone: 'shield-check', ordem: 47 },
  ],
};
