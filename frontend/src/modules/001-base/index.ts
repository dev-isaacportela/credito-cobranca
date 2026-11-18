// Módulo 001 — base (01 §14, DT-39): rotas e itens de menu da base em Cadastros e Administração.
// Import relativo com extensão: o teste de menu (tests/001-base.test.mjs) importa este arquivo no Node
// (o `lazy` só resolve o import da tela quando a rota é desenhada, nunca no teste).

import { lazy } from 'react';
import { podeAdministrar, type Modulo } from '../../lib/base/menu.ts';

export const modulo: Modulo = {
  spec: '001-base',
  rotas: [
    { caminho: '/clientes', tela: lazy(() => import('./clientes/Clientes')) },
    { caminho: '/clientes/:codcli', tela: lazy(() => import('./clientes/FichaCliente')) },
    { caminho: '/contatos', tela: lazy(() => import('./contatos/Contatos')) },
    { caminho: '/equipe', tela: lazy(() => import('./equipe/Equipe')) },
    { caminho: '/equipe/redistribuir', tela: lazy(() => import('./equipe/Redistribuir')) },
    { caminho: '/cadastros/planos', tela: lazy(() => import('./cadastros/Planos')) },
    { caminho: '/admin/parametros', tela: lazy(() => import('./admin/Parametros')) },
    { caminho: '/admin/bus', tela: lazy(() => import('./admin/Bus')) },
    { caminho: '/admin/feriados', tela: lazy(() => import('./admin/Feriados')) },
    { caminho: '/admin/modelos', tela: lazy(() => import('./admin/Modelos')) },
    { caminho: '/admin/sincronizacao', tela: lazy(() => import('./admin/Sincronizacao')) },
    { caminho: '/admin/auditoria', tela: lazy(() => import('./admin/Auditoria')) },
  ],
  menu: [
    { grupo: 'CADASTROS', rotulo: 'Clientes', caminho: '/clientes', icone: 'building-2', ordem: 10 },
    { grupo: 'CADASTROS', rotulo: 'Contatos', caminho: '/contatos', icone: 'contact', ordem: 20 },
    { grupo: 'CADASTROS', rotulo: 'Equipe', caminho: '/equipe', icone: 'users', ordem: 30 },
    { grupo: 'CADASTROS', rotulo: 'Planos de pagamento', caminho: '/cadastros/planos', icone: 'calendar-range', ordem: 40 },
    ...[
      { rotulo: 'Parâmetros', caminho: '/admin/parametros', icone: 'sliders-horizontal' },
      { rotulo: 'BUs e segmentos', caminho: '/admin/bus', icone: 'layers' },
      { rotulo: 'Feriados', caminho: '/admin/feriados', icone: 'calendar-days' },
      { rotulo: 'Modelos de mensagem', caminho: '/admin/modelos', icone: 'mail' },
      { rotulo: 'Sincronização', caminho: '/admin/sincronizacao', icone: 'refresh-cw' },
      { rotulo: 'Auditoria', caminho: '/admin/auditoria', icone: 'history' },
    ].map((item, i) => ({ ...item, grupo: 'ADMINISTRACAO' as const, ordem: (i + 1) * 10, pode: podeAdministrar })),
  ],
};
