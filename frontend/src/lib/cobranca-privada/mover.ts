// Espelho do trecho de `gancho()` da 002 (backend/lib/quadros/002-cobranca-privada.mjs, 04 §8) para o "Mover para"
// do card: mesmas cláusulas, na mesma ordem. Só desabilita destino; quem decide é o servidor.
// Além do gancho, saindo de `negociacao` a tela libera só a fase devida (D-004, C-007).

import { ehFaseDaRegua } from './fases.ts';

/** O que o espelho lê da `ccCobCasoFicha`. */
export interface FichaParaMover {
  caso: { faseDevida?: string | null; juridicoEm?: string | null; encerradoEm?: string | null; desfecho?: string | null };
  posicao: { VENCIDO?: number | string | null };
  acordo: { SITUACAO?: string } | null;
  /** `pode.registrarContato` = `opera(m, c)`: quem é do caso e não é Jurídico. */
  pode: { registrarContato?: boolean };
}

export interface FaseMover { chave: string; final: boolean }

const DESFECHO: Record<string, string> = { regularizado: 'REGULARIZADO', pago_no_prazo: 'PAGO_NO_PRAZO', baixado: 'BAIXADO' };

/** Motivo de recusa do destino, ou null (livre). `temNegociacao` = o quadro tem a fase `negociacao` (não é o do órgão). */
export function motivoDeDestino(ficha: FichaParaMover, de: FaseMover, para: FaseMover, temNegociacao = true): string | null {
  const { caso } = ficha;
  const acordo = ficha.acordo?.SITUACAO ?? '';
  const motivoRegua = temNegociacao ? 'A régua move o card pelos dias de atraso.' : 'A etapa do órgão acompanha as notas fiscais.';
  if (para.chave === 'acordo') return acordo === 'ATIVO' ? null : 'O card vai para Acordo quando o acordo é aprovado.';
  if (para.chave === 'juridico') return caso.juridicoEm ? null : 'Envie o dossiê pelo quadro Jurídico.';
  if (para.final) {
    return caso.encerradoEm && (caso.desfecho ?? '') === (DESFECHO[para.chave] ?? '-')
      ? null : 'O caso é encerrado pelo sistema (saldo zerado) ou pela decisão de baixa.';
  }
  if (ehFaseDaRegua(de) && ehFaseDaRegua(para)) return caso.faseDevida === para.chave ? null : motivoRegua;
  if (['acordo', 'juridico'].includes(de.chave) || de.final) return motivoRegua;
  if (!ficha.pode.registrarContato) return 'Só quem opera o caso move o card.';
  if (para.chave === 'negociacao' && !(Number(ficha.posicao.VENCIDO) > 0)) return 'Só cliente com saldo vencido entra em negociação.';
  if (de.chave === 'negociacao' && ['PROPOSTO', 'ATIVO'].includes(acordo)) return 'Há acordo em aberto neste caso.';
  // Tela (D-004): da negociação de volta à régua, só a fase devida; a rotina corrigiria as outras.
  if (de.chave === 'negociacao' && ehFaseDaRegua(para) && caso.faseDevida !== para.chave) return 'Da negociação o card volta para a etapa devida pelos dias de atraso.';
  return null;
}
