// Contrato dos módulos com a casca (01 §14, DT-39). Cada `frontend/src/modules/NNN-<slug>/index.ts`
// exporta `modulo: Modulo`; o App importa os módulos entregues e passa a lista a `menuDoMembro`.
// `pode` só esconde o item: a permissão de verdade é do servidor.

import type { ComponentType, LazyExoticComponent } from 'react';

/** O `membro` de ccBaseSessao (04 §1). */
export interface MembroSessao {
  userId: number;
  membroId: number;
  nome: string;
  cargo: string;
  nivel: number;
  admin: boolean;
  veTudo: boolean;
  /** Hoje (AAAA-MM-DD) pelo relógio único do servidor (01 §3): telas não usam a data do navegador. */
  hoje: string;
}

export type GrupoMenu = 'OPERACAO' | 'CADASTROS' | 'ADMINISTRACAO';

export interface ItemMenu {
  grupo: GrupoMenu;
  rotulo: string;
  caminho: string;
  /** Nome do ícone (kebab-case do lucide) da lista ICONES de `src/AdminLayout.tsx`. */
  icone: string;
  ordem: number;
  /** Ausente = todo membro ativo. */
  pode?: (m: MembroSessao) => boolean;
}

export interface RotaModulo {
  caminho: string;
  tela: LazyExoticComponent<ComponentType>;
}

export interface Modulo {
  spec: string;
  rotas: RotaModulo[];
  menu: ItemMenu[];
}

/** Ordem da casca C (escolhas.md): Operação, Cadastros, Administração. */
export const GRUPOS_MENU: { grupo: GrupoMenu; nome: string }[] = [
  { grupo: 'OPERACAO', nome: 'Operação' },
  { grupo: 'CADASTROS', nome: 'Cadastros' },
  { grupo: 'ADMINISTRACAO', nome: 'Administração' },
];

/** Administrar = nível ≥ 3 ou a marca Administrador (D-06). Mesma regra de `podeAdministrar` do backend. */
export const podeAdministrar = (m: MembroSessao) => m.nivel >= 3 || m.admin;

/** Junta o menu dos módulos recebidos, guarda o que `pode(membro)` libera e agrupa; grupo vazio some. */
export function menuDoMembro(membro: MembroSessao, modulos: Modulo[]): { grupo: GrupoMenu; nome: string; itens: ItemMenu[] }[] {
  const itens = modulos.flatMap((m) => m.menu).filter((item) => !item.pode || item.pode(membro));
  return GRUPOS_MENU
    .map(({ grupo, nome }) => ({ grupo, nome, itens: itens.filter((i) => i.grupo === grupo).sort((a, b) => a.ordem - b.ordem) }))
    .filter((g) => g.itens.length > 0);
}

/** Tela do dia de cada cargo (F5, tropeço 1): quem cobra abre a agenda; o analista, a análise de crédito. */
const INICIO_DO_CARGO: Record<string, string> = { AGENTE: '/agenda', SUPERVISOR: '/agenda', ANALISTA: '/credito' };

/** Para onde a raiz leva: a tela do cargo, se está no menu do membro; senão o primeiro item do menu. */
export function telaInicial(membro: MembroSessao, menu: { itens: ItemMenu[] }[]): string {
  const caminhos = menu.flatMap((g) => g.itens.map((i) => i.caminho));
  const doCargo = INICIO_DO_CARGO[membro.cargo];
  return doCargo && caminhos.includes(doCargo) ? doCargo : caminhos[0] ?? '/clientes';
}
