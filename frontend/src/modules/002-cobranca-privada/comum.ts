// Apoio das telas da 002: carga de dados sem reler sozinha (RNF-004), feriados da tela e formatos.

import { useEffect, useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import type { Carteira } from '@/lib/base/carteira';
import { feriadosNacionais } from '@/lib/base/dias-uteis';
import { hojeDaSessao } from '@/lib/base/hoje';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Linha = Record<string, any>;

/**
 * Carrega quando `chave` muda (ou em `recarregar()`); mantém o dado anterior enquanto relê, sem piscar.
 * `carregando` = a leitura da chave atual ainda não voltou.
 */
export function useDados<T>(carregar: () => Promise<T>, chave: string) {
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<{ chave: string; dados?: T; erro?: string } | null>(null);
  const k = `${chave}#${versao}`;
  useEffect(() => {
    let vivo = true;
    carregar().then(
      (dados) => vivo && setEstado({ chave: k, dados }),
      (e: unknown) => vivo && setEstado((s) => ({ chave: k, dados: s?.dados, erro: e instanceof Error ? e.message : String(e) })),
    );
    return () => { vivo = false; };
    // A chave é a dependência: `carregar` muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  const atual = estado?.chave === k;
  return { dados: estado?.dados, carregando: !atual, erro: atual ? estado?.erro ?? '' : '', recarregar: () => setVersao((v) => v + 1) };
}

/** Busca com espera de 400 ms (LEIA-frontend): devolve o texto só depois que a pessoa parou de digitar. */
export function useEspera(valor: string, ms = 400) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

/** Hoje pelo relógio do servidor (`ccBaseSessao.hoje`): coluna "Hoje" da agenda, padrão e limite de campo de data. */
export { hojeDaSessao as hojeLocal } from '@/lib/base/hoje';

let feriadosCache: Promise<Linha[]> | null = null;

/** Feriados que a régua usa (os nacionais e os da UF de `base.calendarioUf`), lidos uma vez por sessão. */
export function feriadosDaTela(): Promise<Linha[]> {
  feriadosCache ??= Promise.all([linhas('ccBaseFeriadoListar', { ano: 0 }), linhas('ccBaseParametroListar', { grupo: 'base', carteira: '', data: '' })])
    .then(([feriados, base]) => {
      const uf = String(base.find((p) => p.CHAVE === 'base.calendarioUf')?.VALOR_EFETIVO ?? '');
      // A lista do servidor é do ano corrente; parcela e prazo passam do ano: soma os nacionais do próximo (F5 O-07).
      const proximo = feriadosNacionais(Number(hojeDaSessao().slice(0, 4)) + 1).map((x) => ({ DATA: x.data, NOME: x.nome, ABRANGENCIA: 'NACIONAL' } as Linha));
      return [...feriados, ...proximo].filter((f) => f.ABRANGENCIA === 'NACIONAL' || (f.ABRANGENCIA === 'UF' && f.UF === uf));
    })
    .catch((e) => { feriadosCache = null; throw e; });
  return feriadosCache;
}

/** Parâmetros efetivos da carteira como `{ chave: valor }` (ccBaseParametroListar). */
export async function parametrosDe(carteira: Carteira | '', grupo = ''): Promise<Record<string, unknown>> {
  const lista = await linhas('ccBaseParametroListar', { grupo, carteira, data: '' });
  return Object.fromEntries(lista.map((p) => [String(p.CHAVE), p.VALOR_EFETIVO]));
}

export const num = (v: unknown) => Number(v ?? 0) || 0;

/** Moeda, ou '' sem valor (a tela mostra `Dash`). */
export const brl = (v: unknown) => (v === null || v === undefined || v === '' ? '' : moeda(Number(v)));

export const pct = (v: unknown) => `${num(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export const NOME_CARTEIRA: Record<string, string> = { PRIVADA: 'privada', ESTETICA: 'Estética', PUBLICA: 'pública' };

export const CANAIS = ['Telefone', 'WhatsApp', 'E-mail', 'Visita', 'Carta', 'Ofício', 'Portal do órgão'];
export const RETORNOS = ['Promessa de pagamento', 'Pagou', 'Pediu negociação / parcelamento', 'Contestou o débito', 'Sem retorno / não atendeu',
  'Recusou pagar', 'Aguardando liquidação (órgão)'];
export const MOTIVOS_BAIXA = ['Esgotadas as vias de cobrança', 'Falência ou recuperação judicial', 'Dívida prescrita',
  'Valor menor que o custo da cobrança judicial', 'Desconto concedido em acordo'];

export const opcoes = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

/** Texto da recusa de uma JS (`{ ok: false, error }`) ou da exceção. */
export const erroDe = (e: unknown) => (e instanceof Error ? e.message : String((e as Linha)?.error ?? e ?? 'Falha ao gravar.'));

/** O card do caso no quadro da carteira. */
export const caminhoDoCard = (caso: Linha) => `/cobranca/${String(caso.carteira).toLowerCase()}${caso.cardId ? `?card=${caso.cardId}` : ''}`;

/**
 * Escrita por JS-E com o aviso no fluxo da tela: `gravar` devolve a resposta quando `ok`, ou null (a recusa fica em `erro`,
 * para um `Alert` que não some sozinho). `ok` guarda a frase de sucesso da última escrita.
 */
export function useGravar() {
  const [estado, setEstado] = useState({ gravando: false, erro: '', ok: '' });
  async function gravar(nome: Parameters<typeof acao>[0], input: Record<string, unknown>, sucesso = ''): Promise<Linha | null> {
    setEstado({ gravando: true, erro: '', ok: '' });
    try {
      const r = await acao(nome, input);
      if (r.ok === false) {
        setEstado({ gravando: false, erro: String(r.error ?? 'Não foi possível gravar.'), ok: '' });
        return null;
      }
      setEstado({ gravando: false, erro: '', ok: [sucesso, r.aviso].filter(Boolean).join(' ') });
      return r;
    } catch (e) {
      setEstado({ gravando: false, erro: erroDe(e), ok: '' });
      return null;
    }
  }
  return { ...estado, gravar, limpar: () => setEstado({ gravando: false, erro: '', ok: '' }) };
}
