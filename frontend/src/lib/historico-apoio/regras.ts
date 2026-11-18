// Regras em vigor (RF-020 a RF-022, opção B "Comparar segmentos"): a célula de cada carteira e o prazo das
// etapas. Entrada: `regras[]` e `quadros[]` de ccHistRegrasVigentes. Puras: tests/007-historico-apoio.test.mjs.

import { formatarParametro, GRUPOS_PARAMETRO } from '../base/parametros.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export type CarteiraRegra = 'PRIVADA' | 'ESTETICA' | 'PUBLICA';
export const COLUNAS: { carteira: CarteiraRegra; nome: string }[] = [
  { carteira: 'PRIVADA', nome: 'Privada (padrão)' },
  { carteira: 'ESTETICA', nome: 'Estética' },
  { carteira: 'PUBLICA', nome: 'Pública' },
];

export interface Celula { tipo: 'padrao' | 'propria' | 'herdada' | 'nao_se_aplica'; texto: string; desde: string | null }

/**
 * Privada = o padrão (forte); Estética e Pública: valor próprio em destaque com a data de início, ou herdado
 * (esmaecido); carteira que não usa a regra = "—" (C-017, RN-014). A vigência já vem resolvida pela 001.
 */
export function celula(regra: Linha, carteira: CarteiraRegra): Celula {
  const c = regra.carteiras?.[carteira];
  if (!c || c.aplica === false) return { tipo: 'nao_se_aplica', texto: '—', desde: null };
  const texto = formatarParametro({ TIPO: regra.tipo, UNIDADE: regra.unidade, GRUPO: regra.grupo, CHAVE: regra.chave }, c.valor) || '—';
  if (carteira === 'PRIVADA') return { tipo: 'padrao', texto, desde: regra.padrao?.desde ?? null };
  return c.proprio ? { tipo: 'propria', texto, desde: c.desde ?? null } : { tipo: 'herdada', texto, desde: null };
}

/** Uma aba por grupo, na ordem de `GRUPOS_PARAMETRO`; dentro do grupo, a ordem do catálogo. */
export function regrasPorGrupo(regras: Linha[]): { codigo: string; nome: string; regras: Linha[] }[] {
  const ordem = (g: string) => GRUPOS_PARAMETRO.find((x) => x.codigo === g)?.ordem ?? 99;
  const grupos = [...new Set(regras.map((r) => String(r.grupo)))].sort((a, b) => ordem(a) - ordem(b));
  return grupos.map((g) => ({
    codigo: g,
    nome: GRUPOS_PARAMETRO.find((x) => x.codigo === g)?.nome ?? g,
    regras: regras.filter((r) => String(r.grupo) === g).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)),
  }));
}

/** Quantos valores próprios de carteira estão valendo (cabeçalho da tela). */
export const valoresProprios = (regras: Linha[]) =>
  regras.reduce((s, r) => s + (['ESTETICA', 'PUBLICA'] as const).filter((c) => celula(r, c).tipo === 'propria').length, 0);

/** C-020: 240 h → "10 dias", 24 h → "1 dia", 4 h → "4 horas", 0 → "sem prazo". */
export function prazoLegivel(horas: unknown): string {
  const h = Number(horas) || 0;
  if (h <= 0) return 'sem prazo';
  if (h % 24 === 0) return `${h / 24} ${h === 24 ? 'dia' : 'dias'}`;
  return `${h} ${h === 1 ? 'hora' : 'horas'}`;
}
