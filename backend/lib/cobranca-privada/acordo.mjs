// Acordo e baixa (RN-010). Puras; entram nas SFs por `FONTE` (com o FONTE de dias-uteis).
// O nível exigido do acordo e da baixa é calculado só na SQL do INSERT (D-003).

import { proximoUtil, somarDias } from '../dias-uteis.mjs';

/**
 * Parcelas do acordo sem a entrada (RN-010): (valor − entrada) ÷ n truncado no centavo, a diferença na
 * última; vencimentos primeiroVenc + k × intervalo, cada um no próximo dia útil.
 */
export function parcelasAcordo(valor, entrada, n, primeiroVenc, intervaloDias, feriados) {
  const resto = Math.round((Number(valor) - Number(entrada)) * 100);
  const qtd = Math.trunc(Number(n));
  const centavos = Math.floor(resto / qtd);
  return Array.from({ length: qtd }, (_, k) => ({
    n: k + 1,
    venc: proximoUtil(somarDias(primeiroVenc, k * Number(intervaloDias)), feriados),
    valor: (k === qtd - 1 ? resto - centavos * (qtd - 1) : centavos) / 100,
  }));
}

/** Quem decide pelo nível (texto da recusa). */
export function rotuloNivel(nivel) {
  const n = Number(nivel);
  if (n >= 5) return 'a Diretoria';
  if (n >= 3) return 'o gerente financeiro';
  return 'o supervisor';
}

export const MOTIVOS_BAIXA = ['Esgotadas as vias de cobrança', 'Falência ou recuperação judicial', 'Dívida prescrita',
  'Valor menor que o custo da cobrança judicial', 'Desconto concedido em acordo'];

export const FONTE = [parcelasAcordo, rotuloNivel].map(String).join('\n')
  + `\nconst MOTIVOS_BAIXA = ${JSON.stringify(MOTIVOS_BAIXA)};`;
