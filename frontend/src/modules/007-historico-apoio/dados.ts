// Apoio das telas da 007: carga sem reler sozinha (RNF-004), busca com espera de 400 ms e a recusa da JS.

import { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Linha = Record<string, any>;

/** Carrega quando `chave` muda (ou em `recarregar()`); mantém o dado anterior enquanto relê. */
export function useDados<T>(carregar: () => Promise<T>, chave: string) {
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<{ chave: string; dados?: T; erro?: string } | null>(null);
  const k = `${chave}#${versao}`;
  useEffect(() => {
    let vivo = true;
    carregar().then(
      (dados) => vivo && setEstado({ chave: k, dados }),
      (e: unknown) => vivo && setEstado((s) => ({ chave: k, dados: s?.dados, erro: mensagem(e) })),
    );
    return () => { vivo = false; };
    // A chave é a dependência: `carregar` muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  const atual = estado?.chave === k;
  return { dados: estado?.dados, carregando: !atual, erro: atual ? estado?.erro ?? '' : '', recarregar: () => setVersao((v) => v + 1) };
}

/** O texto só depois que a pessoa parou de digitar. */
export function useEspera(valor: string, ms = 400) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

export const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Recusa de JS (`{ ok: false, error }`) ou falha de rede viram a frase do Alert; sucesso devolve a resposta. */
export async function executar(fn: () => Promise<Linha>): Promise<{ ok: true; r: Linha } | { ok: false; erro: string }> {
  try {
    const r = await fn();
    return r?.ok === false ? { ok: false, erro: String(r.error ?? 'Não foi possível concluir.') } : { ok: true, r };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}
