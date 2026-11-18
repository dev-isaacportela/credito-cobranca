// Regra pura de tela da 004 (plan "Superfície de interação"): nenhuma regra de negócio, só leitura do
// que o servidor devolveu e o espelho do gancho `ccPodeMover` para desabilitar destino impossível.
// Import relativo com extensão e `import type`: o Node importa este arquivo direto nos testes.

import type { Card, Estrutura, Fase } from '@benenutri/mitra-kanban';

type Linha = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/* ── RN-001: tipo de cliente sugerido ─────────────────────────────────────── */

export const TIPOS_CLIENTE = [
  { value: 'NOVO', label: 'Novo' },
  { value: 'RECORRENTE', label: 'Recorrente' },
  { value: 'INATIVO', label: 'Inativo' },
];

/**
 * Rótulo e motivo da sugestão de `ccCredTipoClienteSugerir` (RN-001). O motivo vem da SQL (`MOTIVO`);
 * sem ele, sai da mesma ordem da regra: crédito vigente → cadastro obsoleto → solicitação anterior → novo.
 */
export function motivoTipoCliente(l: Linha | null | undefined): { tipo: string; rotulo: string; motivo: string } {
  const tipo = String(l?.TIPO_CLIENTE ?? 'NOVO');
  const rotulo = TIPOS_CLIENTE.find((t) => t.value === tipo)?.label ?? tipo;
  let motivo = String(l?.MOTIVO ?? '');
  if (!motivo) {
    if (tipo === 'INATIVO') motivo = 'cadastro obsoleto';
    else if (tipo === 'RECORRENTE') motivo = Number(l?.TEM_CREDITO_VIGENTE) ? 'crédito ativo na carteira' : 'já tem solicitação registrada';
    else motivo = 'sem solicitação anterior';
  }
  return { tipo, rotulo, motivo };
}

/* ── RN-013: índices financeiros na ficha ─────────────────────────────────── */

/** `razao` = duas casas (liquidez 0,80); `multiplo` = uma casa e "×" (dívida/EBITDA 3,5×). Sem valor = ''. */
export function fmtIndice(v: unknown, tipo: 'razao' | 'multiplo' = 'razao'): string {
  const n = num(v);
  if (n === null) return '';
  const casas = tipo === 'multiplo' ? 1 : 2;
  const texto = n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return tipo === 'multiplo' ? `${texto}×` : texto;
}

/* ── C-024: zonas do mostrador de limite ──────────────────────────────────── */

export type Zona = 'dentro' | 'flexivel' | 'acima';

/** Exposição (utilizado + pedido) contra o limite e o teto flexível (limite + flexibilização). */
export function zonaFlex(exposicao: number, limite: number, flexValor: number): Zona {
  if (exposicao <= limite) return 'dentro';
  if (exposicao <= limite + Math.max(0, flexValor)) return 'flexivel';
  return 'acima';
}

export const ROTULO_ZONA: Record<Zona, string> = {
  dentro: 'Dentro do limite',
  flexivel: 'Dentro da flexibilização',
  acima: 'Acima do teto',
};

/* ── Gestão de crédito: grupo da fila (opção B) ───────────────────────────── */

export type GrupoFila = 'VENCIDO' | 'REANALISE' | 'VENCE_15' | 'DIVERGE' | 'EM_DIA';

/**
 * Em que grupo da fila a linha de `ccCredCreditoListar` entra. `vencido` = a linha veio da leitura com
 * `vencidos = 1` (o servidor tem o relógio; a tela não compara datas). Ordem: reanálise, vencido,
 * vence em até 15 dias (leitura com `vencendoEmDias = 15`), limite divergente, em dia.
 */
export function grupoDaFila(l: Linha, origem: { vencido?: boolean; vencendo?: boolean } = {}): GrupoFila {
  if (String(l.SITUACAO ?? '') === 'REANALISE') return 'REANALISE';
  if (origem.vencido) return 'VENCIDO';
  if (origem.vencendo) return 'VENCE_15';
  if (Number(l.LIMITE_DIVERGE)) return 'DIVERGE';
  return 'EM_DIA';
}

/* ── RN-032: estado da célula na matriz cliente × sinal ───────────────────── */

export type Sinal = 'atraso' | 'pontualidade' | 'score' | 'uso' | 'prazo' | 'rating' | 'rebaixado';
export type EstadoSinal = 'critico' | 'alerta' | 'normal' | 'sem';

const ORDEM_RATING = ['AA', 'A', 'B', 'C', 'D', 'E'];

/** Mesmos cortes de `criticidade()` (backend), com os parâmetros `crit.*` da carteira (`VALOR_EFETIVO`). */
export function estadoSinal(sinal: Sinal, valor: unknown, p: Record<string, unknown>, extra: { rating?: string } = {}): EstadoSinal {
  const P = (k: string) => Number(p[`crit.${k}`]);
  if (sinal === 'rebaixado') {
    if (!Number(valor)) return 'normal';
    return ORDEM_RATING.indexOf(String(extra.rating ?? '')) >= ORDEM_RATING.indexOf('C') ? 'critico' : 'alerta';
  }
  if (sinal === 'rating') {
    const r = ORDEM_RATING.indexOf(String(valor ?? ''));
    if (r < 0) return 'sem';
    if (r >= ORDEM_RATING.indexOf(String(p['crit.ratingCritico']))) return 'critico';
    return r >= ORDEM_RATING.indexOf(String(p['crit.ratingAlerta'])) ? 'alerta' : 'normal';
  }
  const n = num(valor);
  if (n === null) return 'sem';
  switch (sinal) {
    case 'atraso': return n >= P('atrasoCritico') ? 'critico' : n >= P('atrasoAlerta') ? 'alerta' : 'normal';
    case 'pontualidade': return n < P('pontCritico') ? 'critico' : n < P('pontAlerta') ? 'alerta' : 'normal';
    case 'score': return n < P('scoreCritico') ? 'critico' : n < P('scoreAlerta') ? 'alerta' : 'normal';
    case 'uso': return n >= P('usoCritico') ? 'critico' : n >= P('usoAlerta') ? 'alerta' : 'normal';
    case 'prazo': return n > P('prazoCritico') ? 'critico' : n > P('prazoAlerta') ? 'alerta' : 'normal';
    default: return 'normal';
  }
}

/* ── Fases: chave pelo nome (o quadro da lib não guarda a chave do domínio) ── */

// ponytail: espelho dos nomes de backend/lib/quadros/004-concessao-credito.mjs; fase renomeada na
// administração vira "chave desconhecida" e o espelho deixa o destino livre (o gancho do servidor decide).
const FASES_CONCESSAO: [string, string][] = [
  ['entrada', '1 · Solicitação recebida'], ['cadastral', '2 · Documentação e análise cadastral'], ['credito', '3 · Análise de crédito'],
  ['comite', '4 · Comitê / Alçada'], ['formalizacao', '5 · Formalização'], ['liberacao', '6 · Liberação'], ['gestao', 'Gestão de crédito'],
  ['reanalise', 'Reanálise'], ['obsoleto', 'Cadastro obsoleto'], ['recusada', 'Recusadas'], ['encerrada', 'Encerradas (crédito substituído)'],
  ['entrada', '1 · Recebimento da solicitação'], ['analise', '2 · Análise documental e financeira'],
  ['comite', '3 · Classificação de risco e aprovação'], ['gestao', 'Monitoramento (crédito ativo)'], ['reanalise', 'Reavaliação de risco'],
  ['encerrada', 'Encerradas'],
];
const FASES_PEDIDO: [string, string][] = [
  ['retido', 'Retido por limite'], ['analise', 'Análise do excesso'], ['alcada', 'Aprovação da alçada'], ['liberado', 'Liberado'], ['recusado', 'Recusado'],
];

export function chaveDaFase(fase: Pick<Fase, 'nome'> | null | undefined, pedido = false): string {
  const nome = String(fase?.nome ?? '');
  return (pedido ? FASES_PEDIDO : FASES_CONCESSAO).find(([, n]) => n === nome)?.[0] ?? '';
}

/** Nome da fase sem o número da ordem ("4 · Comitê / Alçada" → "Comitê / Alçada"). */
export function rotuloFase(nome: unknown): string {
  return String(nome ?? '').replace(/^\d+\s*·\s*/, '');
}

const CONTROLADAS = ['gestao', 'reanalise', 'obsoleto', 'encerrada', 'recusada'];

/**
 * Espelho do trecho `concessao-*` do gancho (04 §8, DT-35), só com o que a estrutura do quadro diz:
 * destino que o sistema controla, volta depois da decisão, pular etapa. O que depende do domínio
 * (valor, consultas, análise completa) o servidor recusa com a frase dele.
 */
export function podeMoverConcessao(card: Pick<Card, 'faseId'>, para: Fase, estrutura: Pick<Estrutura, 'fases'>): string | null {
  const fases = [...estrutura.fases].filter((f) => f.ativo !== false).sort((a, b) => a.ordem - b.ordem);
  const de = fases.find((f) => f.id === card.faseId);
  const chPara = chaveDaFase(para);
  const chDe = chaveDaFase(de);
  if (!de || !chPara) return null;
  const comite = fases.find((f) => chaveDaFase(f) === 'comite');
  const comuns = fases.filter((f) => f.tipo === 'comum');
  const aposComite = comite ? comuns.find((f) => f.ordem > comite.ordem) : undefined;
  if (chPara === 'recusada') return 'Recuse pelo botão Recusar, com o motivo.';
  if (chPara === 'gestao') return 'O crédito entra em gestão quando o limite é aplicado.';
  if (CONTROLADAS.includes(chPara)) return 'Encaminhamento é feito pelo sistema ou pela decisão de reanálise.';
  if (aposComite && para.id === aposComite.id) {
    return de.ordem > para.ordem ? 'Solicitação decidida não volta.' : 'A solicitação sai do Comitê pela decisão.';
  }
  if (['gestao', 'reanalise'].includes(chDe) || de.tipo !== 'comum') return 'Encaminhamento é feito pelo sistema.';
  if (para.ordem < de.ordem && comite && de.ordem > comite.ordem) return 'Solicitação decidida não volta.';
  if (para.ordem > de.ordem && para.id !== comuns.find((f) => f.ordem > de.ordem)?.id) return 'Avance uma etapa por vez.';
  return null;
}

/** Espelho do trecho `pedidos-limite`: liberado/recusado só pela decisão; fase final não volta. */
export function podeMoverPedido(card: Pick<Card, 'faseId'>, para: Fase, estrutura: Pick<Estrutura, 'fases'>): string | null {
  const de = estrutura.fases.find((f) => f.id === card.faseId);
  const ch = chaveDaFase(para, true);
  if (ch === 'liberado' || ch === 'recusado') return 'O pedido é liberado ou recusado pela decisão da alçada.';
  if (de && de.tipo !== 'comum') return 'Pedido decidido não volta.';
  return null;
}

/** Volta de fase (destino antes da atual): pede o motivo na tela (`antesDeMover`). */
export function ehVolta(card: Pick<Card, 'faseId'>, para: Fase, estrutura: Pick<Estrutura, 'fases'>): boolean {
  const de = estrutura.fases.find((f) => f.id === card.faseId);
  return !!de && para.ordem < de.ordem;
}

/* ── RN-007/RN-008: quem decide (o botão desabilita com o motivo) ─────────── */

const naLista = (lista: unknown, id: number) => String(lista ?? '').split(',').map(Number).includes(Number(id));

/**
 * Motivo para o botão de decidir ficar desabilitado, na ordem das recusas de `ccCredDecisaoRegistrar`
 * (null = pode). `ficha` = saída de `ccCredSolicitacaoFicha`; `membro` = da sessão.
 */
export function motivoNaoDecide(ficha: Linha | null, membro: { membroId: number; nivel: number }): string | null {
  if (!ficha) return 'Carregando a solicitação.';
  const s = (ficha.solicitacao ?? {}) as Linha;
  const alcada = (ficha.alcada ?? {}) as Linha;
  if (s.FASE_CHAVE !== 'comite') return 'A decisão é registrada com a solicitação na fase de decisão (Comitê).';
  if (!['', 'PRE_APROVADA'].includes(String(s.DECISAO_RESULTADO ?? '')) || s.ENCERRADA_EM) return 'A solicitação já foi decidida.';
  if (Number(s.ANALISTA_ID) === membro.membroId) return 'O analista da solicitação não decide (quem propõe não decide).';
  if (naLista(s.PROPOSTA_POR, membro.membroId)) return 'Quem propôs não decide esta solicitação.';
  if (membro.nivel < Number(alcada.nivel ?? 0)) return `A decisão exige ${String(alcada.rotulo ?? 'outra alçada')}.`;
  const pode = (ficha.pode ?? {}) as Linha;
  if (!pode.decidir) return 'Quem propôs não decide esta solicitação.';
  return null;
}

/** Idem para o pedido (`ccCredPedidoFicha`): quem lançou, analisou ou recomendou não libera. */
export function motivoNaoLibera(ficha: Linha | null, membro: { membroId: number; nivel: number }): string | null {
  if (!ficha) return 'Carregando o pedido.';
  const p = (ficha.pedido ?? {}) as Linha;
  if (p.DECISAO_RESULTADO) return 'O pedido já foi decidido.';
  if ([Number(p.ANALISTA_ID), Number(p.CRIADO_POR)].includes(membro.membroId) || naLista(p.RECOMENDADO_POR, membro.membroId)) {
    return 'Quem lançou, analisou ou recomendou o pedido não o libera.';
  }
  if (membro.nivel < Number(p.NIVEL_EXIGIDO ?? 0)) return `A liberação exige ${String(p.ALCADA_EXIGIDA ?? 'outra alçada')}.`;
  return ((ficha.pode ?? {}) as Linha).decidir ? null : 'Sem alçada para liberar este pedido.';
}

/* ── RN-017: régua das faixas do semáforo a partir dos parâmetros `farol.*` ── */

export interface FaixaFarol { faixa: string; score: string; atraso: string; limite: string; teto: string; prazo: string; inad: string }

/** Linhas da aba "Faixas" com os mesmos cortes de `faixaPorScore`/`faixaPorAtraso` (backend). */
export function faixasDoFarol(p: Record<string, unknown>): FaixaFarol[] {
  const P = (k: string) => Number(p[`farol.${k}`]);
  const pc = (v: number) => `${v.toLocaleString('pt-BR')}%`;
  const comPrazo = (f: string, de: string, ate: string, atraso: string): FaixaFarol => {
    const min = P(`${f}Fmin`), max = P(`${f}Fmax`);
    return {
      faixa: f.toUpperCase(), score: `${de} a ${ate}`, atraso,
      limite: min === max ? `${pc(max)} do cálculo` : min === 0 ? `até ${pc(max)} do cálculo` : `${pc(min)} a ${pc(max)} do cálculo`,
      teto: `${pc(P(`${f}Teto`))} do faturamento`, prazo: `${P(`${f}Prazo`)} dias`, inad: `até ${pc(P(`${f}Inad`))}`,
    };
  };
  return [
    comPrazo('aa', String(P('scoreAA')), '1000', 'sem atraso'),
    comPrazo('a', String(P('scoreA')), String(P('scoreAA') - 1), `até ${P('atrasoA')} dias`),
    comPrazo('b', String(P('scoreB')), String(P('scoreA') - 1), `até ${P('atrasoB')} dias`),
    comPrazo('c', String(P('scoreC')), String(P('scoreB') - 1), `até ${P('atrasoC')} dias`),
    { faixa: 'D', score: `0 a ${P('scoreC') - 1}`, atraso: `até ${P('atrasoD')} dias`, limite: 'sem crédito a prazo', teto: '', prazo: '', inad: `até ${pc(P('dInad'))}` },
    { faixa: 'E', score: 'só por rebaixamento', atraso: `acima de ${P('atrasoD')} dias`, limite: 'sem crédito', teto: '', prazo: '', inad: '' },
  ];
}

/** Chave da ficha do card aberto: muda com a fase, a última alteração e os valores do card (o checklist marcado
 *  relê "Para avançar" e "Documentos exigidos" mesmo quando a hora de alteração não muda — F5 C-03). */
export const chaveDaFicha = (nome: string, card: { id: number; faseId: number; atualizadoEm: string | null; valores?: unknown }, versao: number) =>
  `${nome}:${card.id}:${card.faseId}:${card.atualizadoEm}:${JSON.stringify(card.valores ?? null)}:${versao}`;
