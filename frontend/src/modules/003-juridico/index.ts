// Módulo 003 — Jurídico (01 §14): a casca /juridico com as 5 abas, o dossiê, a ficha de leitura, os documentos,
// a carga inicial e as filiais credoras. Some para o Analista (RN-030). Import relativo com extensão: o teste da
// spec (tests/003-juridico.test.mjs) importa este arquivo no Node.

import { lazy } from 'react';
import { podeAdministrar, type MembroSessao, type Modulo } from '../../lib/base/menu.ts';

const naoAnalista = (m: MembroSessao) => m.cargo !== 'ANALISTA';
const jur = (m: MembroSessao) => m.cargo === 'JURIDICO' || podeAdministrar(m);

export const modulo: Modulo = {
  spec: '003-juridico',
  rotas: [
    { caminho: '/juridico', tela: lazy(() => import('./JuridicoPage')) },
    { caminho: '/juridico/aba/:aba', tela: lazy(() => import('./JuridicoPage')) },
    { caminho: '/juridico/dossie/:processoId', tela: lazy(() => import('./DossieRota')) },
    { caminho: '/juridico/processos/:id', tela: lazy(() => import('./FichaLeitura')) },
    { caminho: '/juridico/documentos/:tipo', tela: lazy(() => import('./DocumentoPassos')) },
    { caminho: '/juridico/carga', tela: lazy(() => import('./CargaPassos')) },
    { caminho: '/juridico/filiais', tela: lazy(() => import('./FiliaisCredoras')) },
  ],
  menu: [
    { grupo: 'OPERACAO', rotulo: 'Jurídico', caminho: '/juridico', icone: 'scale', ordem: 50, pode: naoAnalista },
    { grupo: 'ADMINISTRACAO', rotulo: 'Carga do Jurídico', caminho: '/juridico/carga', icone: 'file-text', ordem: 70, pode: jur },
    { grupo: 'ADMINISTRACAO', rotulo: 'Filiais credoras', caminho: '/juridico/filiais', icone: 'landmark', ordem: 71, pode: jur },
  ],
};
