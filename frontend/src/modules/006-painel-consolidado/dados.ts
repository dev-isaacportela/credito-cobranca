// T-044: as leituras do painel por nome de SF, com cache por (SF, entrada) — os filtros entram na entrada, então
// cabeçalho e blocos que pedem a mesma `ccPainelPosicao` dividem uma execução. O cache é limpo quando o filtro
// muda (PainelPage) e depois de salvar um fechamento. Nada relê sozinho (RNF-001).

import { useEffect, useRef, useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { SERVER_FUNCTIONS } from '@/lib/server-functions';
import { feriadosNacionais, somarDiasUteis } from '@/lib/base/dias-uteis';
import type { MembroSessao } from '@/lib/base/menu';
import type { BlocosDoCargo } from '@/lib/painel-consolidado/visao';

type Chave = keyof typeof SERVER_FUNCTIONS;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Linha = Record<string, any>;

export interface Filtros {
  /** AAAA-MM, sempre preenchido (mês corrente do servidor por padrão). */
  mes: string;
  buId: number;
  /** '' | PRIVADA | ESTETICA | PUBLICA */
  carteira: string;
  /** Mês corrente do servidor. */
  corrente: string;
  /** Dia de hoje do servidor (dia da última leitura do Winthor), para o 7º dia útil da agenda. */
  hoje: string;
}

export interface PropsBloco {
  f: Filtros;
  cargo: BlocosDoCargo;
  membro: MembroSessao;
}

/** Chave de carga de um bloco: muda com qualquer filtro. */
export const chaveDe = (nome: string, f: Filtros, extra: unknown = '') => [nome, f.mes, f.buId, f.carteira, f.hoje, extra].join('|');

/** SF com id 0 no mapa = módulo ainda não publicado ("módulo não instalado", C-023). */
export const instalada = (c: Chave) => Number(SERVER_FUNCTIONS[c]) > 0;

const cache = new Map<string, Promise<unknown>>();
export const limparCache = () => cache.clear();

function memo<T>(chave: Chave, input: Record<string, unknown>, ler: () => Promise<T>): Promise<T> {
  const k = JSON.stringify([chave, input]);
  let p = cache.get(k) as Promise<T> | undefined;
  if (!p) {
    p = ler().catch((e) => {
      cache.delete(k);
      throw e;
    });
    cache.set(k, p);
  }
  return p;
}

/** SF SQL. `null` = SF não instalada. */
export function lerLinhas(chave: Chave, input: Record<string, unknown>): Promise<Linha[] | null> {
  return instalada(chave) ? memo(chave, input, () => linhas(chave, input)) : Promise.resolve(null);
}

/** SF JS de leitura: recusa (`ok: false`) vira erro do bloco. `null` = SF não instalada. */
export function lerAcao<T = Linha>(chave: Chave, input: Record<string, unknown>): Promise<T | null> {
  if (!instalada(chave)) return Promise.resolve(null);
  return memo(chave, input, async () => {
    const r = await acao(chave, input);
    if (r && !Array.isArray(r) && r.ok === false) throw new Error(String(r.error || 'Não foi possível carregar.'));
    return r as T;
  });
}

const base = (f: Filtros) => ({ mes: f.mes, carteira: f.carteira, buId: f.buId });
/** Janela de janeiro até o mês do filtro: Indicadores e Evolução dividem a mesma resposta. */
const doAno = (f: Filtros) => ({ meses: Number(f.mes.slice(5, 7)), ate: f.mes });

export const posicaoInput = (f: Pick<Filtros, 'mes' | 'carteira' | 'buId'>) => ({ ...base(f as Filtros), agenteId: 0 });
export const lerPosicao = (f: Pick<Filtros, 'mes' | 'carteira' | 'buId'>) => lerAcao('ccPainelPosicao', posicaoInput(f));
export const lerSerieDoAno = (f: Filtros) => lerAcao('ccPainelSerie', { ...base(f), ...doAno(f) });
export const lerSerie6 = (f: Filtros) => lerAcao('ccPainelSerie', { ...base(f), meses: 6, ate: f.mes });
export const lerSerieCreditoDoAno = (f: Filtros) => lerLinhas('ccPainelSerieCredito', { ...base(f), ...doAno(f) });
export const lerCredito = (f: Filtros) => lerAcao('ccPainelCredito', base(f));
export const lerConcentracao = (f: Filtros, b: 'VENCIDO' | 'LIMITE') => lerAcao('ccPainelConcentracao', { ...base(f), base: b });
export const lerRollRate = (f: Filtros) => lerLinhas('ccPainelRollRate', base(f));
export const lerAgentes = (f: Filtros) => lerLinhas('ccPainelAgentes', base(f));
export const lerPlanos = (f: Filtros) => lerLinhas('ccPainelPlanos', base(f));
export const lerSaude = (f: Filtros) => lerAcao('ccPainelSaude', base(f));
export const lerEquipe = (f: Filtros) => lerLinhas('ccPainelEquipe', base(f));
export const lerAtencao = (f: Filtros) => lerAcao<Linha[]>('ccPainelAtencao', base(f));
export const lerJurResumo = (f: Filtros) => lerLinhas('ccJurResumo', base(f)).then((r) => (r ? r[0] ?? {} : null));
/** O resumo público só vale sem carteira ou na Pública. `undefined` = filtro não se aplica. */
export const pubSeAplica = (f: Filtros) => f.carteira === '' || f.carteira === 'PUBLICA';
export const lerPubResumo = (f: Filtros) => (pubSeAplica(f)
  ? lerLinhas('ccPubResumo', { mes: f.mes, buId: f.buId }).then((r) => (r ? r[0] ?? {} : null))
  : Promise.resolve(null));
/** D-08: acordos judiciais aguardando aprovação, à parte do "a receber" (hoje; sem filtro de BU). */
export const lerAcordosJudiciais = (f: Filtros) => lerLinhas('ccJurAcordoTotal', { processoId: 0, situacao: '', carteira: f.carteira, filial: '', busca: '' })
  .then((r) => (r ? r[0] ?? {} : null));

/**
 * 7º dia útil depois de hoje (RF-017: `ate` da agenda).
 * ponytail: só feriados nacionais (`feriadosNacionais`); os da UF do calendário ficam de fora para não gastar a
 * 7ª execução do bloco (RNF-001). Se a agenda divergir num feriado estadual, ler `ccBaseFeriadoListar` uma vez por sessão.
 */
export function seteDiasUteis(hoje: string): string {
  const ano = Number(hoje.slice(0, 4));
  return somarDiasUteis(hoje, 7, [...feriadosNacionais(ano), ...feriadosNacionais(ano + 1)].map((x) => x.data));
}
export const lerAgendaResumo = (f: Filtros) => lerLinhas('ccCobAgendaResumo', { carteira: f.carteira, buId: f.buId, ate: seteDiasUteis(f.hoje), mes: f.mes });

/**
 * Carga de um bloco: refaz quando `chave` muda (a chave traz os filtros). Sem setState síncrono no efeito:
 * "carregando" é a resposta guardada ser de outra chave.
 */
export function useCarga<T>(chave: string, carregar: () => Promise<T>) {
  const [estado, setEstado] = useState<{ chave: string | null; dados: T | null; erro: string | null }>({ chave: null, dados: null, erro: null });
  const ref = useRef(carregar);
  useEffect(() => {
    ref.current = carregar;
  });
  useEffect(() => {
    let vivo = true;
    ref.current().then(
      (dados) => vivo && setEstado({ chave, dados, erro: null }),
      (e) => vivo && setEstado({ chave, dados: null, erro: e instanceof Error ? e.message : 'Não foi possível carregar.' }),
    );
    return () => {
      vivo = false;
    };
  }, [chave]);
  const pronto = estado.chave === chave;
  return { dados: pronto ? estado.dados : null, erro: pronto ? estado.erro : null, carregando: !pronto };
}

/** Resultado de `Promise.allSettled` → valor ou `null`, e a primeira mensagem de erro. */
export function assentado<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}
export function primeiroErro(rs: PromiseSettledResult<unknown>[]): string | null {
  const falha = rs.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  return falha ? (falha.reason instanceof Error ? falha.reason.message : 'Não foi possível carregar.') : null;
}
