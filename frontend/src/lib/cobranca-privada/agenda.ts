// Agenda e contatos na tela (RF-027, RF-034, RN-007, RN-019). Datas `AAAA-MM-DD`; `feriados` como em lib/base/dias-uteis.

import { proximoUtil, somarDias, somarDiasUteis } from '../base/dias-uteis.ts';

type Feriados = Parameters<typeof proximoUtil>[1];

/** Os 7 dias úteis a partir de `hoje` (inclusive, se útil): as colunas da semana da agenda. */
export function semanaUteis(hoje: string, feriados: Feriados, n = 7): string[] {
  const dias = [proximoUtil(hoje, feriados)];
  while (dias.length < n) dias.push(somarDiasUteis(dias[dias.length - 1], 1, feriados));
  return dias;
}

/** Coluna do evento: 'atrasadas' antes de hoje; senão o primeiro dia útil da semana ≥ a data; fora da janela, null. */
export function colunaDoEvento(data: string, hoje: string, semana: string[]): string | null {
  const d = String(data ?? '').slice(0, 10);
  if (!d || d < hoje) return 'atrasadas';
  return semana.find((dia) => dia >= d) ?? null;
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
