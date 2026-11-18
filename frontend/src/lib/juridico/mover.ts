// Espelho do trecho de `gancho('juridico')` (backend/lib/quadros/003-juridico.mjs, 04 §8, DT-35) para o "Mover para"
// do card: as 7 regras na mesma ordem, com as mesmas frases. Só desabilita destino; quem decide é o servidor.
// D-07 (P-48): o Supervisor vê todos os cards, mas o movimento livre é só do Jurídico ou de quem administra.

import { podeAdministrar, type MembroSessao } from '../base/menu.ts';

/** O que o espelho lê de `ccJurProcessoFicha().processo`. */
export interface ProcessoParaMover {
  ORIGEM?: string | null;
  DOSSIE_ENVIADO_EM?: string | null;
  ENCERRADO_EM?: string | null;
  AUTOS?: string | null;
}

export type Persona = Pick<MembroSessao, 'cargo' | 'nivel' | 'admin'>;

export const FASES_COM_AUTOS = ['citacao', 'defesa', 'sentenca', 'execucao'];

/** Motivo de recusa do destino `para` saindo de `de` (chaves de fase), ou null (livre). */
export function motivoDeDestino(persona: Persona, processo: ProcessoParaMover, de: string, para: string): string | null {
  const emMontagem = processo.ORIGEM === 'COBRANCA' && !processo.DOSSIE_ENVIADO_EM;
  const livre = para !== 'encerrado' && !(de === 'dossie' && para === 'recebido');
  const moveALivre = persona.cargo === 'JURIDICO' || podeAdministrar(persona as MembroSessao);
  if (para === 'dossie') return 'Processo não volta para o dossiê.';
  if (de === 'encerrado') return 'Processo encerrado não volta.';
  if (para === 'encerrado' && !processo.ENCERRADO_EM) return 'Encerre pelo botão Encerrar processo, com o motivo.';
  if (de === 'dossie' && para === 'recebido' && emMontagem) return 'Envie o dossiê para sair desta etapa.';
  if (livre && !moveALivre) return 'Só o Jurídico move processos.';
  if (de === 'dossie' && !['recebido', 'encerrado'].includes(para) && emMontagem) return 'Envie o dossiê para sair desta etapa.';
  if (FASES_COM_AUTOS.includes(para) && !String(processo.AUTOS ?? '').trim()) return 'Informe o número dos autos.';
  return null;
}
