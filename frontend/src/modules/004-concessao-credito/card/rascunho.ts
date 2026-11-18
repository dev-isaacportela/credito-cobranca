// Formulário do card que grava ao sair do campo (ccCredSolicitacaoSalvar só com o campo alterado).

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { executar, invalidarFicha, vazio, type Linha } from '../dados';

/** Valor da linha da solicitação como texto de campo ('' = vazio). */
const comoTexto = (v: unknown) => (vazio(v) ? '' : String(v));

/**
 * `valores[k]` começa no que a ficha devolveu; `salvar(k)` grava só se mudou e relê a ficha e o card.
 * `campos` = { chaveDaEntrada: COLUNA }.
 */
export function useRascunho(ctx: ExtensaoContexto, s: Linha, campos: Record<string, string>) {
  const inicial = Object.fromEntries(Object.entries(campos).map(([k, col]) => [k, comoTexto(s[col])]));
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);

  const salvar = async (k: string, valor = valores[k]) => {
    if (valor === inicial[k]) return;
    setGravando(true);
    const r = await executar('ccCredSolicitacaoSalvar', { solicitacaoId: s.ID, [k]: valor });
    setGravando(false);
    setErro(r ?? '');
    if (!r) {
      invalidarFicha(ctx.card.id);
      void ctx.recarregar();
    }
  };
  const mudar = (k: string) => (v: string) => setValores((x) => ({ ...x, [k]: v }));
  /** Seleção grava na hora (não há "sair do campo"). */
  const escolher = (k: string) => (v: string) => {
    setValores((x) => ({ ...x, [k]: v }));
    void salvar(k, v);
  };
  return { valores, mudar, escolher, salvar, erro, gravando };
}
