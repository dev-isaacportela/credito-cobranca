// Agenda e contatos na tela (RF-027, RF-034, RN-007, RN-019). Datas `AAAA-MM-DD`; `feriados` como em lib/base/dias-uteis.

import { motivoNaoUtil, proximoUtil, somarDias, somarDiasUteis } from '../base/dias-uteis.ts';

type Feriados = Parameters<typeof proximoUtil>[1];

/** Os 7 dias úteis a partir de `hoje` (inclusive, se útil): as colunas da semana da agenda. */
export function semanaUteis(hoje: string, feriados: Feriados, n = 7): string[] {
  const dias = [proximoUtil(hoje, feriados)];
  while (dias.length < n) dias.push(somarDiasUteis(dias[dias.length - 1], 1, feriados));
  return dias;
}

/** Limite da previsão de pagamento (RN-007): `data` + N dias úteis; N = 0 = sem limite (''). */
export function limitePromessa(data: string, maxUteis: number, feriados: Feriados): string {
  return Number(maxUteis) > 0 ? somarDiasUteis(data, Number(maxUteis), feriados) : '';
}

/** Contatos agrupados por dia (`DATA`), na ordem em que vieram (a SF já ordena por data desc). */
export function agruparPorDia<T extends Record<string, unknown>>(contatos: T[]): { dia: string; contatos: T[] }[] {
  const grupos: { dia: string; contatos: T[] }[] = [];
  for (const c of contatos) {
    const dia = String(c.DATA ?? '').slice(0, 10);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.contatos.push(c);
    else grupos.push({ dia, contatos: [c] });
  }
  return grupos;
}

/** "Hoje · quinta, 19/11", "Ontem · …" ou "Segunda, 16/11". */
export function rotuloDoDia(dia: string, hoje: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  const semana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  const data = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  if (dia === hoje) return `Hoje · ${semana}, ${data}`;
  if (dia === somarDias(hoje, -1)) return `Ontem · ${semana}, ${data}`;
  return `${semana[0].toUpperCase()}${semana.slice(1)}, ${data}`;
}

/** Aba da Lista de bloqueio onde está o cliente do evento "ERP" da agenda (pelo texto do evento; F5, tropeço 2). */
export const abaDoBloqueio = (texto: string) =>
  ({ 'Bloqueio total': 'BLOQUEAR_TOTAL', 'Liberar no ERP': 'LIBERAR' } as Record<string, string>)[texto] ?? 'BLOQUEAR_PEDIDOS';

/** Ficha só para decidir (decisor de outra equipe, DT-35): só o Acompanhamento, sem a montagem da proposta. */
export const abasDoAcordo = (restrito: boolean) => (restrito ? ['acompanhamento'] : ['proposta', 'acompanhamento']);

/* ── Calendário da agenda (visões Semana e Mês, segunda a domingo) ── */

export type VisaoAgenda = 'semana' | 'mes';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const diaDaSemana = (dia: string) => {
  const [a, m, d] = dia.split('-').map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7; // 0 = segunda
};
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/** Os 7 dias (segunda a domingo) da semana que contém `dia`. */
export function diasDaSemana(dia: string): string[] {
  const seg = somarDias(dia, -diaDaSemana(dia));
  return Array.from({ length: 7 }, (_, i) => somarDias(seg, i));
}

/** As semanas (segunda a domingo) que cobrem o mês de `dia`: de 4 a 6 linhas de 7 dias. */
export function semanasDoMes(dia: string): string[][] {
  const primeiro = `${dia.slice(0, 7)}-01`;
  const mes = dia.slice(0, 7);
  const semanas: string[][] = [];
  for (let seg = diasDaSemana(primeiro)[0]; seg.slice(0, 7) <= mes; seg = somarDias(seg, 7)) semanas.push(diasDaSemana(seg));
  return semanas;
}

/** Primeiro e último dia mostrados na visão. */
export function periodoDaVisao(visao: VisaoAgenda, ref: string): { de: string; ate: string } {
  const dias = visao === 'semana' ? diasDaSemana(ref) : semanasDoMes(ref).flat();
  return { de: dias[0], ate: dias[dias.length - 1] };
}

/** Semana ou mês seguinte (`passo` = 1) ou anterior (-1); no mês, o dia 1. */
export function andarPeriodo(visao: VisaoAgenda, ref: string, passo: number): string {
  if (visao === 'semana') return somarDias(ref, 7 * passo);
  const [a, m] = ref.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + passo, 1));
  return d.toISOString().slice(0, 10);
}

/** "16/11 a 22/11/2026" ou "Novembro de 2026". */
export function rotuloDoPeriodo(visao: VisaoAgenda, ref: string): string {
  if (visao === 'mes') return `${MESES[Number(ref.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase())} de ${ref.slice(0, 4)}`;
  const dias = diasDaSemana(ref);
  return `${ddmm(dias[0])} a ${ddmm(dias[6])}/${dias[6].slice(0, 4)}`;
}

/** Cabeçalho do dia: "seg 16/11", mais o motivo de não ser útil (feriado, fim de semana). */
export function cabecalhoDoDia(dia: string, feriados: Feriados): { semana: string; data: string; numero: number; naoUtil: string } {
  return { semana: ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'][diaDaSemana(dia)], data: ddmm(dia), numero: Number(dia.slice(8, 10)), naoUtil: motivoNaoUtil(dia, feriados) };
}

/** Eventos por dia (`DATA`, AAAA-MM-DD), na ordem em que vieram. */
export function eventosPorDia<T extends Record<string, unknown>>(eventos: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const e of eventos) {
    const dia = String(e.DATA ?? '').slice(0, 10);
    if (!dia) continue;
    mapa.set(dia, [...(mapa.get(dia) ?? []), e]);
  }
  return mapa;
}
