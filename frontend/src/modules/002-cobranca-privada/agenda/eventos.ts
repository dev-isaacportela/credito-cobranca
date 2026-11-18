// Rótulo e destino de cada TIPO de ccCobAgendaListar (RN-025).

import type { Linha } from '../comum';
import { caminhoDoCard } from '../comum';
import { abaDoBloqueio } from '@/lib/cobranca-privada/agenda';

export const ROTULO_TIPO: Record<string, string> = {
  ACAO_REGUA: 'Régua', PROX_ACAO: 'Próxima ação', PROMESSA: 'Promessa', PARCELA_ACORDO: 'Parcela de acordo', ANUENCIA: 'Anuência',
  EMAIL_APROVAR: 'E-mail a aprovar', ACORDO_DECIDIR: 'Acordo a decidir', BAIXA_PARECER: 'Parecer da baixa', BAIXA_DECIDIR: 'Baixa a decidir',
  BLOQUEIO_APLICAR: 'ERP', FICHA_REVISAR: 'Ficha de contatos',
};

export const APROVACOES = ['EMAIL_APROVAR', 'ACORDO_DECIDIR', 'BAIXA_PARECER', 'BAIXA_DECIDIR'];

/** Para onde o evento leva: a tela da decisão ou o card do cliente. */
export function destinoDoEvento(e: Linha): string {
  switch (e.TIPO) {
    case 'EMAIL_APROVAR': return '/cobranca/emails';
    case 'ACORDO_DECIDIR': return `/cobranca/caso/${e.COBRANCA_ID}/acordo`;
    case 'BAIXA_PARECER': case 'BAIXA_DECIDIR': return `/cobranca/caso/${e.COBRANCA_ID}/baixa`;
    case 'BLOQUEIO_APLICAR': return `/cobranca/bloqueio?carteira=${e.CARTEIRA}&aba=${abaDoBloqueio(String(e.TEXTO))}`;
    default: return caminhoDoCard({ carteira: e.CARTEIRA, cardId: e.CARD_ID });
  }
}
