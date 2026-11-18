// Relógio único do simulador (06 §1): `CC_AGORA` (hora de Brasília, AAAA-MM-DDTHH:MM:SS) no ambiente do
// processo. Quem lê: `agora()`/`hoje()` do preâmbulo, `UTC_TIMESTAMP()` do dialeto (= CC_AGORA + 3 h) e
// o `Date` que o runtime entrega às SFs JAVASCRIPT. Em produção a variável não existe.

export const D = '2026-11-19T10:00:00';

/** Data só (`dia(n)`) mantém a hora do relógio atual; sem relógio, 10:00. */
function normalizar(iso) {
  const texto = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return `${texto}T${String(process.env.CC_AGORA || D).slice(11, 19)}`;
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(texto.slice(0, 19))) throw new Error(`Relógio inválido: ${iso}`);
  return texto.slice(0, 19).replace(' ', 'T');
}

export const relogio = () => process.env.CC_AGORA || D;

export function fixarRelogio(iso) {
  process.env.CC_AGORA = normalizar(iso);
  return process.env.CC_AGORA;
}

/** Roda `fn` com o relógio em `iso` e devolve o relógio anterior no fim (mesmo com erro). */
export async function comRelogio(iso, fn) {
  const antes = process.env.CC_AGORA;
  fixarRelogio(iso);
  try {
    return await fn();
  } finally {
    if (antes === undefined) delete process.env.CC_AGORA;
    else process.env.CC_AGORA = antes;
  }
}

/** `Date` parado no relógio (instante UTC = CC_AGORA − (−3 h)); sem relógio, o `Date` real. */
export function dateDoRelogio() {
  const fixo = process.env.CC_AGORA;
  if (!fixo) return Date;
  const instante = Date.parse(`${fixo.slice(0, 19)}-03:00`);
  return class DataDoSimulador extends Date {
    constructor(...args) {
      if (args.length) super(...args);
      else super(instante);
    }

    static now() { return instante; }
  };
}
