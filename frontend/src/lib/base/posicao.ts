// Situação da posição lida do Winthor (RF-006, C-005). Desatualizada = mais de 2 intervalos sem
// leitura OK (01 §11 decisão 2, PA-12). Entrada: colunas MINUTOS_DESDE e INTERVALO_MIN de
// ccBaseSincronizacaoStatus.

export type SituacaoPosicao = 'atual' | 'desatualizada' | 'nunca';

export function situacaoDaPosicao({ minutosDesde, intervaloMin }: { minutosDesde: unknown; intervaloMin: unknown }): SituacaoPosicao {
  if (minutosDesde === null || minutosDesde === undefined || minutosDesde === '') return 'nunca';
  return Number(minutosDesde) > 2 * Number(intervaloMin || 15) ? 'desatualizada' : 'atual';
}
