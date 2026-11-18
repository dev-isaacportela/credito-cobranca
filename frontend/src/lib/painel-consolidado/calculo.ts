// Regra de tela da 006 (plan "Fluxo", passo 4; D-03): as SFs devolvem somas, a tela faz razão e estado da meta.
// Funções puras, testadas em frontend/tests/006-painel-consolidado.test.mjs. Import relativo com extensão (Node).

const r2 = (v: number) => Math.round(v * 100) / 100;
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

/** RN-002: vencido ÷ carteira, com 4 casas (0,2553). Carteira zero = `null` ("—"), nunca 0%. */
export function indice(vencido: number, carteira: number): number | null {
  return carteira > 0 ? Math.round((vencido / carteira) * 10000) / 10000 : null;
}

/** Percentual com 2 casas (25,53). Base zero ou ausente = `null`. */
export function pct(parte: number | null | undefined, base: number | null | undefined): number | null {
  const p = num(parte);
  const b = num(base);
  return p === null || b === null || !(b > 0) ? null : r2((p * 100) / b);
}

/** `25.53` → `'25,53%'`; `null` → `'—'`. */
export function rotuloPct(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

/** Número pt-BR; `null` → `'—'`. */
export function rotuloNum(valor: number | null | undefined, casas = 0): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Moeda cheia sem centavos (R$ 94.000); `null` → `'—'`. */
export function moedaInteira(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/** Moeda abreviada para KPI (R$ 1,52 mi · R$ 462,8 mil · R$ 940); o valor cheio vai na tabela. */
export function moedaCurta(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  const a = Math.abs(valor);
  const s = valor < 0 ? '−' : '';
  if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  if (a >= 1e3) return `${s}R$ ${(a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `${s}R$ ${a.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

export interface Meta {
  min?: number | null;
  max?: number | null;
}

/**
 * RN-013: "no máximo" (só `max`) = valor ≤ meta; "no mínimo" (só `min`) = valor ≥ meta; faixa = entre os dois.
 * Sem valor ou sem meta: `null` (sem estado).
 */
export function naMeta(valor: number | null | undefined, meta: Meta | null | undefined): boolean | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor) || !meta) return null;
  const temMin = meta.min !== null && meta.min !== undefined;
  const temMax = meta.max !== null && meta.max !== undefined;
  if (!temMin && !temMax) return null;
  return (!temMin || valor >= Number(meta.min)) && (!temMax || valor <= Number(meta.max));
}

/** Texto da meta: "meta até 5%", "meta a partir de 85%", "meta entre 60% e 85%", "meta até 9 dias". */
export function rotuloMeta(meta: Meta | null, unidade: Unidade): string {
  if (!meta) return 'informativo';
  const f = (v: number | null | undefined) => (unidade === 'dias' ? `${rotuloNum(Number(v), 0)} dias` : rotuloPct(Number(v), 0));
  if (meta.min !== null && meta.min !== undefined && meta.max !== null && meta.max !== undefined) return `meta entre ${f(meta.min)} e ${f(meta.max)}`;
  if (meta.max !== null && meta.max !== undefined) return `meta até ${f(meta.max)}`;
  return `meta a partir de ${f(meta.min)}`;
}

export type Unidade = 'pct' | 'dias' | 'moeda';
export type EstadoMeta = 'NA_META' | 'FORA' | 'SEM_META' | 'SEM_VALOR';
export type GrupoIndicador = 'CONCESSAO' | 'CARTEIRA' | 'COBRANCA';

export interface Indicador {
  chave: string;
  grupo: GrupoIndicador;
  rotulo: string;
  valor: number | null;
  unidade: Unidade;
  meta: Meta | null;
  estado: EstadoMeta;
  /** Uso do limite (só exposição): % do limite. */
  uso?: number | null;
  limite?: number | null;
  hint?: string;
}

type Linha = Record<string, unknown>;
type Metas = Record<string, unknown>;

/** Linhas do mês (de `ccPainelSerie` e `ccPainelSerieCredito`) → as razões de cada indicador mensal. */
export function razoesDoMes(serie: Linha | null | undefined, credito: Linha | null | undefined) {
  const n = (l: Linha | null | undefined, k: string) => (l ? num(l[k]) : null);
  const ini = n(serie, 'VENCIDO_INICIAL');
  const ger = n(serie, 'GERADA');
  const cobrado = ini === null || ger === null ? null : ini + ger;
  const cumpridas = n(serie, 'PROMESSAS_CUMPRIDAS') ?? 0;
  const quebradas = n(serie, 'PROMESSAS_QUEBRADAS') ?? 0;
  const decididas = n(credito, 'DECIDIDAS');
  return {
    inadimplencia: pct(n(serie, 'VENCIDO'), n(serie, 'TOTAL')),
    vencido90: pct(n(serie, 'VENCIDO_90'), n(serie, 'TOTAL')),
    pdd: pct(n(serie, 'PDD'), n(serie, 'TOTAL')),
    recuperacao: ger === null ? null : pct(n(serie, 'RECUPERADO'), ger),
    conversao: cobrado === null ? null : pct(n(serie, 'RECUPERADO'), cobrado),
    promessas: pct(cumpridas, cumpridas + quebradas),
    tempoAnalise: decididas ? n(credito, 'TEMPO_MEDIO_DIAS') : null,
    sla: pct(n(credito, 'NO_PRAZO'), decididas),
    aprovacao: pct(n(credito, 'APROVADAS'), decididas),
    concedido: credito ? n(credito, 'LIMITE_CONCEDIDO') : null,
  };
}

export type ChaveMensal = keyof ReturnType<typeof razoesDoMes>;

/** A meta de cada indicador, lida das `meta.*` que `ccPainelPosicao` devolve (RNF-004: nada fixo aqui). */
export function metaDe(chave: ChaveMensal | 'exposicao' | 'atraso', metas: Metas): Meta | null {
  const m = (k: string) => num(metas[k]);
  switch (chave) {
    case 'inadimplencia': return { max: m('meta.inadPct') };
    case 'vencido90': return { max: m('meta.vencido90Pct') };
    case 'pdd': return { max: m('meta.pddPct') };
    case 'recuperacao': return { min: m('meta.recuperacaoPct') };
    case 'conversao': return { min: m('meta.conversaoPct') };
    case 'promessas': return { min: m('meta.promessaPct') };
    case 'tempoAnalise': return { max: m('meta.tempoDecisaoDias') };
    case 'sla': return { min: m('meta.slaPct') };
    case 'aprovacao': return { min: m('meta.aprovacaoMinPct'), max: m('meta.aprovacaoMaxPct') };
    default: return null;
  }
}

function estadoDe(valor: number | null, meta: Meta | null): EstadoMeta {
  if (!meta) return 'SEM_META';
  const ok = naMeta(valor, meta);
  return ok === null ? 'SEM_VALOR' : ok ? 'NA_META' : 'FORA';
}

export const ROTULOS_MENSAIS: Record<ChaveMensal, { rotulo: string; unidade: Unidade }> = {
  tempoAnalise: { rotulo: 'Tempo médio de análise', unidade: 'dias' },
  sla: { rotulo: 'SLA da análise', unidade: 'pct' },
  aprovacao: { rotulo: 'Taxa de aprovação', unidade: 'pct' },
  concedido: { rotulo: 'Crédito concedido', unidade: 'moeda' },
  inadimplencia: { rotulo: 'Índice de inadimplência', unidade: 'pct' },
  vencido90: { rotulo: 'Vencido acima de 90 dias', unidade: 'pct' },
  pdd: { rotulo: 'PDD', unidade: 'pct' },
  recuperacao: { rotulo: 'Recuperado ÷ gerado', unidade: 'pct' },
  conversao: { rotulo: 'Conversão da cobrança', unidade: 'pct' },
  promessas: { rotulo: 'Promessas cumpridas', unidade: 'pct' },
};

export interface EntradaIndicadores {
  /** Resposta de `ccPainelPosicao` (total, vencido, vencido90, pdd, atrasoMedioDias, metas). */
  posicao: Linha;
  /** Linha do mês de `ccPainelSerie` (ou nula). */
  serie: Linha | null;
  /** Linha do mês de `ccPainelSerieCredito` (ou nula). */
  serieCredito: Linha | null;
  /** Resposta de `ccPainelCredito` (limite, utilizado, usoPct). */
  credito: Linha | null;
}

/** C-015 / RF-006: os 12 indicadores executivos em três grupos de quatro, cada um com valor, meta e estado. */
export function indicadoresExecutivos({ posicao, serie, serieCredito, credito }: EntradaIndicadores): Indicador[] {
  const metas = (posicao.metas as Metas) || {};
  const total = num(posicao.total) ?? 0;
  const r = razoesDoMes(serie, serieCredito);
  // Carteira do mês pela posição (a mesma fonte dos KPIs), não pela série.
  r.inadimplencia = pct(num(posicao.vencido), total);
  r.vencido90 = pct(num(posicao.vencido90), total);
  r.pdd = pct(num(posicao.pdd), total);
  const ind = (chave: ChaveMensal, grupo: GrupoIndicador): Indicador => {
    const meta = metaDe(chave, metas);
    return { chave, grupo, ...ROTULOS_MENSAIS[chave], valor: r[chave], meta, estado: estadoDe(r[chave], meta) };
  };
  const limite = credito ? num(credito.limite) : null;
  const utilizado = credito ? num(credito.utilizado) : null;
  return [
    ind('tempoAnalise', 'CONCESSAO'),
    ind('sla', 'CONCESSAO'),
    ind('aprovacao', 'CONCESSAO'),
    { ...ind('concedido', 'CONCESSAO'), hint: 'limites aprovados nas decisões do mês' },
    {
      chave: 'exposicao', grupo: 'CARTEIRA', rotulo: 'Exposição e utilização do limite', unidade: 'moeda', valor: utilizado,
      meta: null, estado: 'SEM_META', uso: pct(utilizado, limite), limite,
    },
    ind('inadimplencia', 'CARTEIRA'),
    ind('vencido90', 'CARTEIRA'),
    ind('pdd', 'CARTEIRA'),
    ind('recuperacao', 'COBRANCA'),
    ind('conversao', 'COBRANCA'),
    ind('promessas', 'COBRANCA'),
    {
      chave: 'atraso', grupo: 'COBRANCA', rotulo: 'Tempo médio de atraso', unidade: 'dias', valor: num(posicao.atrasoMedioDias),
      meta: null, estado: 'SEM_META', hint: 'média ponderada pelo saldo vencido',
    },
  ];
}

export interface PontoSerie {
  mes: string;
  valor: number | null;
  /** ATUAL (mês corrente, parcial), FOTO ou MANUAL. */
  origem: string;
}

/**
 * C-016: o cartão da evolução — último valor, média no ano e meses na meta, sobre os meses com valor.
 * `rotulos` marca o mês manual e o parcial no eixo (não por cor, D-07).
 */
export function resumoDaSerie(pontos: PontoSerie[], meta: Meta | null) {
  const comValor = pontos.filter((p) => p.valor !== null && Number.isFinite(p.valor));
  const ultimo = comValor.length ? comValor[comValor.length - 1] : null;
  const media = comValor.length ? r2(comValor.reduce((s, p) => s + Number(p.valor), 0) / comValor.length) : null;
  const naMetaQtd = meta ? comValor.filter((p) => naMeta(p.valor, meta) === true).length : null;
  return {
    ultimo: ultimo ? ultimo.valor : null,
    ultimoNaMeta: ultimo ? naMeta(ultimo.valor, meta) : null,
    media,
    naMeta: naMetaQtd,
    meses: comValor.length,
    rotulos: Object.fromEntries(pontos.map((p) => [p.mes, rotuloMesDaSerie(p.mes, p.origem)])),
  };
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** `'2026-08', 'MANUAL'` → `'Ago (manual)'`; `ATUAL` → `'Nov (parcial)'`. */
export function rotuloMesDaSerie(mes: string, origem: string): string {
  const base = MESES_CURTOS[Number(String(mes).slice(5, 7)) - 1] ?? mes;
  if (origem === 'MANUAL') return `${base} (manual)`;
  if (origem === 'ATUAL') return `${base} (parcial)`;
  return base;
}

export function mesCurto(mes: string): string {
  return MESES_CURTOS[Number(String(mes).slice(5, 7)) - 1] ?? mes;
}

/** Diferença em reais para o `Delta` (que escreve número + sufixo): −4.000 → { valor: −4, sufixo: ' mil' }. */
export function deltaMoeda(diff: number | null): { valor: number | null; sufixo: string } {
  if (diff === null || !Number.isFinite(diff)) return { valor: null, sufixo: '' };
  const a = Math.abs(diff);
  return a >= 1e6 ? { valor: diff / 1e6, sufixo: ' mi' } : a >= 1e3 ? { valor: diff / 1e3, sufixo: ' mil' } : { valor: diff, sufixo: '' };
}

/** Valor de um indicador na unidade dele (25,53% · 8,7 dias · R$ 2,14 mi); `null` → '—'. */
export function rotuloDoValor(valor: number | null | undefined, unidade: Unidade): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  if (unidade === 'pct') return rotuloPct(valor);
  if (unidade === 'dias') return `${rotuloNum(valor, 1)} dias`;
  return moedaCurta(valor);
}
