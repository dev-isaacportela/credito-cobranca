// Relógio único (01 §3). Hora de Brasília = UTC−3 fixo (o Brasil não tem horário de verão).
//
// `agora()` e `hoje()` entram no preâmbulo das SFs JAVASCRIPT por `toString()`: por isso cada
// função é autocontida (sem constante de fora). `CC_AGORA` só existe no simulador.

/** `AAAA-MM-DDTHH:MM:SS` de Brasília. `ms` (instante UTC) serve aos testes; sem ele vale `CC_AGORA` ou o relógio. */
export function agora(ms) {
  if (ms === undefined && typeof process !== 'undefined' && process.env && process.env.CC_AGORA) {
    return String(process.env.CC_AGORA).slice(0, 19);
  }
  const instante = ms === undefined ? Date.now() : (ms instanceof Date ? ms.getTime() : Number(ms));
  return new Date(instante - 3 * 3600 * 1000).toISOString().slice(0, 19);
}

/** `AAAA-MM-DD` de Brasília. */
export function hoje(ms) {
  return agora(ms).slice(0, 10);
}

/** Soma meses a `AAAA-MM-DD`; fim de mês cai no último dia do mês de destino (30/11 + 3 = 28/02). */
export function somarMeses(data, n) {
  const [ano, mes, dia] = String(data).slice(0, 10).split('-').map(Number);
  const alvo = mes - 1 + Number(n);
  const ultimo = new Date(Date.UTC(ano, alvo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, alvo, Math.min(dia, ultimo))).toISOString().slice(0, 10);
}

export const HOJE_SQL = "DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00'), '%Y-%m-%d')";
export const AGORA_SQL = "DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00'), '%Y-%m-%dT%H:%i:%s')";

/** Coluna `KB_*` (UTC) lida em hora de Brasília. */
export const KB_BRASILIA = (coluna) => `DATE_FORMAT(CONVERT_TZ(${coluna}, '+00:00', '-03:00'), '%Y-%m-%dT%H:%i:%s')`;
