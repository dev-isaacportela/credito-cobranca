// Visão gerencial, opção C (RF-030 a RF-033): blocos por agente agrupados por supervisor e a frase de resumo.
// Totais do grupo somados na tela (D-014). Entrada: linhas de ccCobPainelAgentes e ccCobPainelKpis.

type Linha = Record<string, unknown>;

export interface Grupo {
  supervisorId: number;
  supervisorNome: string;
  agentes: Linha[];
  clientesAtraso: number;
  vencido: number;
  recuperado: number;
  acoesAtrasadas: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

/** Um grupo por `SUPERVISOR_ID`, na ordem em que aparece (a SF ordena por supervisor e vencido). */
export function agruparPorSupervisor(agentes: Linha[]): Grupo[] {
  const grupos = new Map<number, Grupo>();
  for (const a of agentes) {
    const id = n(a.SUPERVISOR_ID);
    let g = grupos.get(id);
    if (!g) {
      g = { supervisorId: id, supervisorNome: String(a.SUPERVISOR_NOME ?? ''), agentes: [], clientesAtraso: 0, vencido: 0, recuperado: 0, acoesAtrasadas: 0 };
      grupos.set(id, g);
    }
    g.agentes.push(a);
    g.clientesAtraso += n(a.CLIENTES_ATRASO);
    g.vencido = Math.round((g.vencido + n(a.VENCIDO)) * 100) / 100;
    g.recuperado = Math.round((g.recuperado + n(a.RECUPERADO)) * 100) / 100;
    g.acoesAtrasadas += n(a.ACOES_ATRASADAS);
  }
  return [...grupos.values()];
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Frase do resumo: vencido, índice contra a meta, promessas contra a meta e ações pendentes. */
export function resumoGerencial(k: Linha, carteira: string): string {
  const inad = n(k.INAD_PCT);
  const metaInad = n(k.META_INAD);
  const prom = n(k.PROMESSAS_CUMPRIDAS_PCT);
  const metaProm = n(k.META_PROMESSA);
  const partes = [
    `A carteira ${carteira} tem ${brl(n(k.VENCIDO))} vencidos em ${n(k.CLIENTES_VENCIDOS)} ${n(k.CLIENTES_VENCIDOS) === 1 ? 'cliente' : 'clientes'}: ${pct(inad)} da carteira, ${metaInad > 0 ? (inad <= metaInad ? `dentro da meta de ${pct(metaInad)}` : `acima da meta de ${pct(metaInad)}`) : 'sem meta definida'}.`,
  ];
  if (n(k.PROMESSAS) > 0) partes.push(`As promessas cumpridas estão em ${pct(prom)}, ${prom >= metaProm ? 'na meta' : 'abaixo da meta'} de ${pct(metaProm)}.`);
  const pend = n(k.ACOES_PENDENTES);
  if (pend > 0) partes.push(`Há ${pend} ${pend === 1 ? 'ação da régua pendente' : 'ações da régua pendentes'}, ${n(k.ACOES_ATRASADAS)} atrasadas.`);
  return partes.join(' ');
}
