// Apoio das telas da 003: leitura sem reler sozinha (RNF-004), escrita com a recusa no fluxo, formatos, os catálogos
// que a tela mostra (cópia dos rótulos de backend/lib/juridico/catalogos.mjs) e o membro da sessão para o espelho do
// "Mover para" (o `podeMover` da lib não recebe o membro).

import { useEffect, useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';

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
      (e: unknown) => vivo && setEstado((s) => ({ chave: k, dados: s?.dados, erro: e instanceof Error ? e.message : String(e) })),
    );
    return () => { vivo = false; };
    // A chave é a dependência: `carregar` muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  const atual = estado?.chave === k;
  return { dados: estado?.dados, carregando: !atual, erro: atual ? estado?.erro ?? '' : '', recarregar: () => setVersao((v) => v + 1) };
}

/** Busca com espera de 400 ms. */
export function useEspera(valor: string, ms = 400) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

/** Texto da recusa de uma JS (`{ ok: false, error }`) ou da exceção. */
export const erroDe = (e: unknown) => (e instanceof Error ? e.message : String((e as Linha)?.error ?? e ?? 'Falha ao gravar.'));

/** JS-L ou JS-E: a resposta com `ok`, ou lança a recusa (para `useDados`). */
export async function lerAcao(nome: Parameters<typeof acao>[0], input: Record<string, unknown>) {
  const r = await acao(nome, input);
  if (r.ok === false) throw new Error(String(r.error ?? 'Não foi possível ler.'));
  return r;
}

/** Escrita com a recusa num `Alert` que não some sozinho. `gravar` devolve a resposta quando `ok`, senão null. */
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

/**
 * Data de hoje do navegador, em Brasília — só padrão de campo e limite do `<input type="date">`.
 * O que é regra (vencida, prazo, dias) vem calculado pelo servidor no relógio único.
 */
export { hojeDaSessao as hojeLocal } from '@/lib/base/hoje';

export const num = (v: unknown) => Number(v ?? 0) || 0;
/** Moeda, ou '' sem valor (a tela mostra `Dash`). */
export const brl = (v: unknown) => (v === null || v === undefined || v === '' ? '' : moeda(Number(v)));
/** "R$ 320 mil" para a faixa de números. */
export const mil = (v: unknown) => (num(v) >= 1000 ? `R$ ${Math.round(num(v) / 1000).toLocaleString('pt-BR')} mil` : brl(v));
export const pct = (v: unknown, casas = 1) => `${num(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

/** Jurídico ou quem administra (`JUR` de 04 §0): opera e gere os processos. */
export const ehJur = (m: MembroSessao) => m.cargo === 'JURIDICO' || podeAdministrar(m);

/* ── membro da sessão para o espelho de "Mover para" ── */
let membroDaTela: MembroSessao | null = null;
export const guardarMembro = (m: MembroSessao) => { membroDaTela = m; };
export const membroAtual = () => membroDaTela;

/* ── catálogos (rótulos) ── */

export const FASES: { chave: string; nome: string; curto: string }[] = [
  ['dossie', '01 · Dossiê em montagem', '01 Dossiê'], ['recebido', '02 · Recebido · contato amigável', '02 Recebido'],
  ['peticao', '03 · Petição inicial', '03 Petição'], ['custas', '04 · Custas e protocolo', '04 Custas'], ['citacao', '05 · Citação', '05 Citação'],
  ['defesa', '06 · Defesa e instrução', '06 Defesa'], ['sentenca', '07 · Sentença e recursos', '07 Sentença'],
  ['execucao', '08 · Cumprimento e execução', '08 Cumprimento'], ['acordo', '09 · Acordo judicial', '09 Acordo'],
  ['suspenso', '10 · Suspenso · RJ · arquivado', '10 Suspenso'], ['encerrado', 'Encerrado', 'Encerrado'],
].map(([chave, nome, curto]) => ({ chave, nome, curto }));

/** Chave da fase pelo nome do KB_FASE (o quadro só dá o nome). */
export const chaveDaFase = (nome: string) => FASES.find((f) => f.nome === nome)?.chave ?? '';
export const nomeCurto = (chave: string) => FASES.find((f) => f.chave === chave)?.curto ?? chave;

export const CARTEIRA_NOME: Record<string, string> = { PRIVADA: 'Privada', ESTETICA: 'Estética', PUBLICA: 'Pública' };
export const OPCOES_CARTEIRA = [{ value: '', label: 'Todas as carteiras' }, ...Object.entries(CARTEIRA_NOME).map(([value, label]) => ({ value, label }))];
export const OPCOES_LINHA = [{ value: '', label: 'Todas as linhas' }, { value: 'GALDERMA', label: 'Galderma' }, { value: 'DEMAIS', label: 'Demais linhas' }];

export const GRUPOS_CUSTO: Record<string, string> = { CUSTAS: 'Custas processuais', HONORARIOS: 'Honorários', DILIGENCIAS: 'Diligências e pesquisas', OUTROS: 'Outros' };
export const TIPOS_CUSTO: { codigo: string; rotulo: string; grupo: string }[] = [
  ['CUSTAS_INICIAIS', 'Custas iniciais', 'CUSTAS'], ['CUSTAS_CITACAO', 'Custas de citação e postais', 'CUSTAS'], ['EDITAL', 'Edital', 'CUSTAS'],
  ['RECURSOS', 'Recursos e preparo', 'CUSTAS'], ['HON_CONTRATUAIS', 'Honorários advocatícios contratuais', 'HONORARIOS'],
  ['HON_EXITO', 'Honorários de êxito', 'HONORARIOS'], ['DILIGENCIA', 'Diligência e oficial de justiça', 'DILIGENCIAS'],
  ['LOCOMOCAO', 'Locomoção', 'DILIGENCIAS'], ['PESQUISAS', 'Pesquisas (SISBAJUD, RENAJUD, INFOJUD, endereço)', 'DILIGENCIAS'],
  ['PERICIA', 'Perícia', 'OUTROS'], ['CARTORIO', 'Cartório e protesto', 'OUTROS'], ['OUTROS', 'Outros', 'OUTROS'],
].map(([codigo, rotulo, grupo]) => ({ codigo, rotulo, grupo }));
export const rotuloCusto = (tipo: string) => TIPOS_CUSTO.find((t) => t.codigo === tipo)?.rotulo ?? tipo;

export const MOTIVOS: Record<string, string> = {
  QUITADO: 'Quitado', ACORDO_CUMPRIDO: 'Acordo cumprido', BAIXA_PERDA: 'Baixa como perda', EXTINTO: 'Extinto sem recuperação', OUTRO: 'Outro',
};

export const DESVIOS: { tipo: string; nome: string; curto: string }[] = [
  ['prazo', 'Prazo processual vencido', 'Prazo vencido'], ['parcela', 'Parcela de acordo vencida', 'Parcela vencida'],
  ['politica', 'Acordo fora da política', 'Fora da política'], ['semdossie', 'Cliente pronto para o Jurídico sem dossiê', 'Sem dossiê'],
  ['parado', 'Processo sem andamento', 'Sem andamento'], ['custo', 'Custo acima da meta', 'Custo acima da meta'],
  ['custas', 'Custas sem lançamento', 'Custas sem lançamento'], ['carga', 'Divergência na carga', 'Divergência na carga'],
  ['subst', 'Substabelecimento pendente', 'Substabelecimento'], ['suspenso', 'Suspenso ou em recuperação judicial', 'Suspenso ou RJ'],
  ['dossie', 'Dossiê incompleto', 'Dossiê parado'], ['encsaldo', 'Encerrado com saldo na cobrança', 'Encerrado com saldo'],
  ['atvreg', 'Processo ativo com cliente regularizado', 'Ativo regularizado'],
].map(([tipo, nome, curto]) => ({ tipo, nome, curto }));

/** Situações do acordo judicial (02 §003). */
export const SITUACAO_ACORDO: Record<string, { texto: string; tom: 'live' | 'off' | 'attention' | 'alert' }> = {
  AGUARDANDO: { texto: 'Aguardando aprovação', tom: 'attention' }, ANDAMENTO: { texto: 'Em andamento', tom: 'live' },
  QUITADO: { texto: 'Quitado', tom: 'off' }, RECUSADO: { texto: 'Recusado', tom: 'off' },
};

/** Parâmetros `jur.*` em vigor (`{ chave: número }`), lidos uma vez por sessão. */
let parametrosCache: Promise<Record<string, number>> | null = null;
export function parametrosJur(): Promise<Record<string, number>> {
  parametrosCache ??= linhas('ccBaseParametroListar', { grupo: 'jur', carteira: '', data: '' })
    .then((l) => Object.fromEntries(l.map((p) => [String(p.CHAVE), Number(p.VALOR_EFETIVO)])))
    .catch((e) => { parametrosCache = null; throw e; });
  return parametrosCache;
}

/** Filtros completos de `ccJurProcessoListar`/`Total` (todo campo presente: número 0 ou -1, texto ''). */
export const FILTRO_PROCESSO = {
  faseChave: '', carteira: '', filial: '', buId: -1, linha: '', grupo: '', situacao: '', responsavelId: 0, semAndamentoDias: 0,
  valorDe: 0, valorAte: 0, busca: '',
};

/** Busca no texto normalizado da SQL (maiúsculas, sem acento). */
export const normalizarBusca = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Baixa um texto como arquivo (CSV). */
export function baixar(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Limiares de tela vindos dos parâmetros `jur.*` (com o padrão do catálogo enquanto carregam). */
export interface Limiares { vermelho: number; amarelo: number; meta: number; entradaMin: number; parcelasMax: number; alcada: number; honorarios: number }
export function useLimiares(): Limiares {
  const { dados: p = {} } = useDados(parametrosJur, 'jur');
  const v = (k: string, padrao: number) => (Number.isFinite(p[k]) ? p[k] : padrao);
  return {
    vermelho: v('jur.prazoVermelhoDias', 3), amarelo: v('jur.prazoAmareloDias', 7), meta: v('jur.custoMetaPct', 10),
    entradaMin: v('jur.acordoEntradaMinPct', 20), parcelasMax: v('jur.acordoParcelasMax', 5), alcada: v('jur.acordoAlcadaValor', 50000),
    honorarios: v('jur.honorariosPct', 10),
  };
}

/** O que cada aba da casca recebe: o membro da sessão e as abas (desenhadas abaixo do cabeçalho de cada uma). */
export interface PropsAba { membro: MembroSessao; abas: import('react').ReactNode }

/** Os filtros de gestão (Visão gerencial, Custos): BU, setor/carteira, linha e filial. */
export const FILTRO_GESTAO = { carteira: '', filial: '', linha: '', buId: -1 };

/** Termo da busca de cliente: só dígitos (CNPJ/CPF, código) ou o nome normalizado. */
export function termoDeBusca(t: string) {
  const digitos = t.replace(/\D/g, '');
  return /^[\d./\-\s]+$/.test(t.trim()) && digitos ? digitos : normalizarBusca(t);
}

/** Depois de marcar a última parcela: encerra com "acordo cumprido" (segundo toque, D-08). */
export async function aposParcela(quitado: boolean, processoId: number): Promise<string> {
  if (!quitado) return '';
  try {
    const r = await acao('ccJurProcessoEncerrar', { processoId, motivo: 'ACORDO_CUMPRIDO', motivoTexto: '' });
    return r.ok === false ? `Acordo quitado, mas o encerramento foi recusado: ${r.error}. Use "Encerrar processo".` : '';
  } catch (e) {
    return `Acordo quitado, mas o encerramento falhou: ${erroDe(e)}. Use "Encerrar processo".`;
  }
}

export type FiltroProcesso = typeof FILTRO_PROCESSO;
/** Filtro pronto para a SF: busca normalizada. */
export const filtroParaServidor = (f: FiltroProcesso) => ({ ...f, busca: normalizarBusca(f.busca) });

/** Todas as páginas da lista com o filtro (para o CSV), 200 por chamada. */
export async function todosOsProcessos(filtro: FiltroProcesso): Promise<Linha[]> {
  const todos: Linha[] = [];
  for (let offset = 0; ; offset += 200) {
    const l = await linhas('ccJurProcessoListar', { ...filtroParaServidor(filtro), limite: 200, offset });
    todos.push(...l);
    if (l.length < 200) return todos;
  }
}
