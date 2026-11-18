// Listas de trabalho na tela: projeção (RN-016) e fila de e-mails (RN-021).

export type Tom = 'live' | 'off' | 'attention' | 'alert';

/** Faixa da chance de atraso (RN-016): ≥ `cob.probForte` forte, ≥ `cob.probMedio` média, abaixo baixa. */
export function corChance(prob: number, forte = 40, medio = 15): { faixa: 'FORTE' | 'MEDIA' | 'BAIXA'; rotulo: string; tom: Tom } {
  const n = Number(prob);
  if (n >= forte) return { faixa: 'FORTE', rotulo: 'forte', tom: 'alert' };
  if (n >= medio) return { faixa: 'MEDIA', rotulo: 'média', tom: 'attention' };
  return { faixa: 'BAIXA', rotulo: 'baixa', tom: 'off' };
}

export type SituacaoFila = 'ENVIAR' | 'APROVAR' | 'SEM_EMAIL' | 'ENVIADO';

/** Situação de tela da linha da fila (o `SITUACAO_TELA` da SQL, RN-021): enviado; sem destinatário; modo com aprovação; senão manual. */
export function situacaoFila(l: { SITUACAO?: unknown; PARA?: unknown; MODO?: unknown }): { situacao: SituacaoFila; rotulo: string; tom: Tom } {
  if (l.SITUACAO === 'ENVIADO') return { situacao: 'ENVIADO', rotulo: 'Enviado', tom: 'live' };
  if (!String(l.PARA ?? '')) return { situacao: 'SEM_EMAIL', rotulo: 'Sem e-mail', tom: 'alert' };
  if (l.MODO === 'APROVAR') return { situacao: 'APROVAR', rotulo: 'Com aprovação', tom: 'attention' };
  return { situacao: 'ENVIAR', rotulo: 'Enviar manualmente', tom: 'off' };
}

/** Lotes de até `tamanho` ids, na ordem (DT-29: a aprovação vai de 2 em 2, em sequência). */
export function emLotes<T>(itens: T[], tamanho = 2): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** Retornos do contato na carteira: os "(órgão)" só no Público (F5, tropeço 6). */
export const retornosDa = (carteira: string, retornos: string[]) => retornos.filter((r) => carteira === 'PUBLICA' || !r.endsWith('(órgão)'));
