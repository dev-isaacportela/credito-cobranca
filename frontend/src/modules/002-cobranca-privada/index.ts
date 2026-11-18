// Módulo 002 — cobrança das três carteiras (01 §14, D-05): as 11 rotas do plan e os itens de Operação.
// Import relativo com extensão: o teste do módulo (tests/002-cobranca-privada.test.mjs) importa este arquivo no Node.

import { lazy } from 'react';
import type { MembroSessao, Modulo } from '../../lib/base/menu.ts';

const naoJuridico = (m: MembroSessao) => m.cargo !== 'JURIDICO';

export const modulo: Modulo = {
  spec: '002-cobranca-privada',
  rotas: [
    { caminho: '/cobranca/:carteira', tela: lazy(() => import('./Quadro')) },
    { caminho: '/cobranca/caso/:id/contato', tela: lazy(() => import('./RegistrarContato')) },
    { caminho: '/cobranca/caso/:id/acordo', tela: lazy(() => import('./Acordo')) },
    { caminho: '/cobranca/caso/:id/baixa', tela: lazy(() => import('./Baixa')) },
    { caminho: '/cobranca/emails', tela: lazy(() => import('./Emails')) },
    { caminho: '/cobranca/contatos', tela: lazy(() => import('./Historico')) },
    { caminho: '/cobranca/bloqueio', tela: lazy(() => import('./Bloqueio')) },
    { caminho: '/cobranca/projecao', tela: lazy(() => import('./Projecao')) },
    { caminho: '/agenda', tela: lazy(() => import('./Agenda')) },
    { caminho: '/cobranca/regras', tela: lazy(() => import('./Regras')) },
    { caminho: '/cobranca/visao-gerencial', tela: lazy(() => import('./VisaoGerencial')) },
  ],
  menu: [
    { grupo: 'OPERACAO', rotulo: 'Minha agenda', caminho: '/agenda', icone: 'calendar-check', ordem: 20 },
    { grupo: 'OPERACAO', rotulo: 'Cobrança', caminho: '/cobranca/privada', icone: 'wallet', ordem: 40, pode: naoJuridico },
    { grupo: 'OPERACAO', rotulo: 'E-mails da régua', caminho: '/cobranca/emails', icone: 'mail', ordem: 41, pode: naoJuridico },
    { grupo: 'OPERACAO', rotulo: 'Histórico de contatos', caminho: '/cobranca/contatos', icone: 'file-text', ordem: 42, pode: naoJuridico },
    { grupo: 'OPERACAO', rotulo: 'Lista de bloqueio', caminho: '/cobranca/bloqueio', icone: 'shield-check', ordem: 43, pode: naoJuridico },
    { grupo: 'OPERACAO', rotulo: 'Projeção de atraso', caminho: '/cobranca/projecao', icone: 'hand-coins', ordem: 44, pode: naoJuridico },
    { grupo: 'OPERACAO', rotulo: 'Visão da cobrança', caminho: '/cobranca/visao-gerencial', icone: 'chart-column', ordem: 45, pode: naoJuridico },
    { grupo: 'OPERACAO', rotulo: 'Regras de cobrança', caminho: '/cobranca/regras', icone: 'list-checks', ordem: 46 },
  ],
};
