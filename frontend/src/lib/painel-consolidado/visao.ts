// Regra de tela da 006 sobre o que aparece e de onde vem cada número: blocos por cargo (RN-015), estado do bloco,
// avisos de topo (C-006, RN-021), rótulo da fonte (RF-003), meses do filtro (RF-001), pontos de atenção montados
// a partir dos resumos de 002/003/005 (DT-34) e o funil Jurídico/Público (opção B, D-06 do plan).

import { fmtDataHora } from '../formato.ts';
import type { MembroSessao } from '../base/menu.ts';
import { moedaCurta } from './calculo.ts';

type Linha = Record<string, unknown>;
const n = (v: unknown) => Number(v) || 0;

/* ── Cargo ── */

export interface BlocosDoCargo {
  /** Jurídico, sem vínculo ou inativo não abrem o painel. */
  acesso: boolean;
  escopo: 'carteira' | 'equipe' | 'tudo';
  /** Indicadores por nível da equipe (ccPainelEquipe é N2: nível 2 ou a marca ADMIN). */
  equipe: boolean;
  /** Fechamento manual (ADM: nível 3 ou a marca ADMIN, D-06). */
  fechamento: boolean;
  /** Gráficos de comparação entre agentes (com uma linha só, só a tabela). */
  comparacao: boolean;
}

/** RN-015: o que cada cargo encontra. Só evita chamar o que o servidor recusaria; a decisão é do servidor. */
export function blocosDoCargo(m: Pick<MembroSessao, 'cargo' | 'nivel' | 'admin' | 'veTudo'> | null): BlocosDoCargo {
  if (!m || m.cargo === 'JURIDICO') return { acesso: false, escopo: 'carteira', equipe: false, fechamento: false, comparacao: false };
  const n2 = m.nivel >= 2 || m.admin;
  return {
    acesso: true,
    escopo: m.veTudo ? 'tudo' : n2 ? 'equipe' : 'carteira',
    equipe: n2,
    fechamento: m.nivel >= 3 || m.admin,
    comparacao: n2 || m.veTudo,
  };
}

export const ROTULO_ESCOPO = { carteira: 'a sua carteira', equipe: 'a sua equipe', tudo: 'carteira inteira' } as const;

/* ── Mês ── */

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** `'2026-11'` → `'11/2026'`. */
export const mesBarra = (mes: string) => `${String(mes).slice(5, 7)}/${String(mes).slice(0, 4)}`;
/** `'2026-11'` → `'Novembro de 2026'`. */
export const nomeMes = (mes: string) => `${NOMES_MES[Number(String(mes).slice(5, 7)) - 1] ?? mes} de ${String(mes).slice(0, 4)}`;

export function somarMes(mes: string, delta: number): string {
  const i = Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1 + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** RF-001: do mês corrente para trás (`quantos` meses); nunca mês futuro. O primeiro é o padrão. */
export function mesesOferecidos(corrente: string, quantos = 24): { value: string; label: string }[] {
  return Array.from({ length: quantos }, (_, i) => somarMes(corrente, -i)).map((value) => ({ value, label: nomeMes(value) }));
}

/** Os `quantos` meses que terminam em `ate`, do mais antigo ao mais novo. */
export function janelaMeses(ate: string, quantos: number): string[] {
  return Array.from({ length: quantos }, (_, i) => somarMes(ate, i - quantos + 1));
}

/** Janeiro a dezembro do ano do mês. */
export const mesesDoAno = (mes: string) => janelaMeses(`${String(mes).slice(0, 4)}-12`, 12);

/* ── Fonte e estado ── */

/** RF-003: de onde vêm os números do mês. */
export function rotuloFonte(p: Linha | null | undefined): string {
  if (!p) return '';
  const mes = String(p.mes ?? '');
  switch (p.origem) {
    case 'ATUAL': {
      const em = (p.sincronizacao as Linha | undefined)?.em ?? p.posicaoEm;
      return em ? `Posição de hoje · Winthor lido em ${fmtDataHora(String(em)).replace(' ', ' às ')}` : 'Posição de hoje';
    }
    case 'FOTO': return `Foto do fechamento de ${mesBarra(mes)}, tirada em ${fmtDataHora(String(p.posicaoEm ?? ''))}`;
    case 'MANUAL': return `Fechamento manual de ${mesBarra(mes)}`;
    default: return `Sem dado para ${mesBarra(mes)}`;
  }
}

export interface Aviso {
  tipo: 'LEITURA_ATRASADA' | 'FOTO_PENDENTE';
  texto: string;
}

/** C-006 e C-014: avisos fixos acima das abas. */
export function avisosDeTopo(p: Linha | null | undefined): Aviso[] {
  if (!p) return [];
  const avisos: Aviso[] = [];
  const s = p.sincronizacao as Linha | undefined;
  if (s?.atrasada) avisos.push({ tipo: 'LEITURA_ATRASADA', texto: `Dados do Winthor desatualizados desde ${String(s.em ?? '').slice(11, 16) || '—'}.` });
  if (p.fotoPendente) avisos.push({ tipo: 'FOTO_PENDENTE', texto: `Foto de ${mesBarra(String(p.fotoPendente))} pendente: a rotina tira na primeira leitura do Winthor com sucesso.` });
  return avisos;
}

export type EstadoBloco =
  | { tipo: 'NAO_INSTALADO'; texto: string }
  | { tipo: 'ERRO'; texto: string }
  | { tipo: 'SEM_DADO'; texto: string }
  | { tipo: 'VAZIO'; texto: string };

/**
 * C-023 e estados do plan: módulo ausente (SF com id 0) vem antes de tudo; depois erro do bloco; depois mês
 * passado sem foto nem fechamento visível; depois recorte sem cliente. `null` = mostra o bloco.
 */
export function estadoDoBloco(e: { instalado?: boolean; erro?: string | null; origem?: string | null; mes?: string; vazio?: boolean }): EstadoBloco | null {
  if (e.instalado === false) return { tipo: 'NAO_INSTALADO', texto: 'Módulo não instalado.' };
  if (e.erro) return { tipo: 'ERRO', texto: e.erro };
  if (e.origem === 'SEM') return { tipo: 'SEM_DADO', texto: `Sem dado para ${mesBarra(e.mes ?? '')}.` };
  if (e.vazio) return { tipo: 'VAZIO', texto: 'Nenhum cliente no recorte.' };
  return null;
}

/* ── Pontos de atenção ── */

export interface Sinal {
  tipo: string;
  texto: string;
  quantidade: number;
  valor: number | null;
  gravidade: 'ALTA' | 'MEDIA' | 'BAIXA';
}

/**
 * C-014 / C-023: os 7 tipos que vêm dos resumos dos módulos donos (a SF da 006 não chama outro módulo, DT-34).
 * Resumo `null` (módulo ausente ou não chamado) = os tipos dele não entram; só quantidade > 0.
 */
export function atencaoDosResumos(agenda: Linha[] | null, jur: Linha | null, pub: Linha | null): Sinal[] {
  const itens: Sinal[] = [];
  const add = (tipo: string, texto: string, quantidade: number, valor: number | null, gravidade: Sinal['gravidade']) => {
    if (quantidade > 0) itens.push({ tipo, texto, quantidade, valor, gravidade });
  };
  if (agenda) {
    add('PROMESSA_VENCIDA', 'promessas vencidas', agenda.reduce((s, l) => s + n(l.PROMESSAS_VENCIDAS), 0), null, 'MEDIA');
    add('ACAO_ATRASADA', 'ações de cobrança atrasadas', agenda.reduce((s, l) => s + n(l.ATRASADAS), 0), null, 'MEDIA');
  }
  if (jur) {
    add('JURIDICO_SEM_ANDAMENTO', 'processos sem andamento', n(jur.SEM_ANDAMENTO), null, 'MEDIA');
    add('JURIDICO_PRAZO', 'processos com prazo vencendo', n(jur.PRAZOS_VENCENDO), null, 'MEDIA');
  }
  if (pub) {
    add('NF_PAGAMENTO_VENCIDO', 'notas públicas com pagamento vencido', n(pub.PAGAMENTO_VENCIDO), n(pub.VALOR_PAGAMENTO_VENCIDO), 'ALTA');
    add('NF_ACIMA_2M', 'notas públicas vencidas há mais de 2 meses', n(pub.ACIMA_2M), n(pub.VALOR_ACIMA_2M), 'ALTA');
    add('CERTIDAO', 'certidões vencendo ou vencidas', n(pub.CERTIDOES_VENCENDO) + n(pub.CERTIDOES_VENCIDAS), null, 'MEDIA');
  }
  return itens;
}

/** Texto do selo a partir do tipo (o mesmo desenho para os sinais próprios e os dos resumos). */
const TEXTO_DO_TIPO: Record<string, string> = {
  INAD_ACIMA_ALERTA: 'clientes em atraso com a inadimplência acima do alerta',
  CONCENTRACAO: 'clientes e grupos acima do teto de concentração',
  LIMITE_VENCIDO: 'limites com validade vencida',
  CLIENTE_CRITICO: 'clientes críticos',
  CLIENTE_EM_RISCO: 'clientes em risco',
  BLOQUEIO_NAO_APLICADO: 'bloqueios devidos e não aplicados',
  ACORDO_QUEBRADO: 'acordos quebrados no mês',
  BAIXA_PENDENTE: 'baixas aguardando decisão',
  SOLICITACAO_FORA_PRAZO: 'solicitações de crédito fora do prazo',
  PEDIDO_RETIDO: 'pedidos retidos',
};

/** Com quantidade 1 (F5, tropeço 16: "1 pedidos retidos"). */
const SINGULAR: Record<string, string> = {
  INAD_ACIMA_ALERTA: 'cliente em atraso com a inadimplência acima do alerta',
  CONCENTRACAO: 'cliente ou grupo acima do teto de concentração',
  LIMITE_VENCIDO: 'limite com validade vencida',
  CLIENTE_CRITICO: 'cliente crítico',
  CLIENTE_EM_RISCO: 'cliente em risco',
  BLOQUEIO_NAO_APLICADO: 'bloqueio devido e não aplicado',
  ACORDO_QUEBRADO: 'acordo quebrado no mês',
  BAIXA_PENDENTE: 'baixa aguardando decisão',
  SOLICITACAO_FORA_PRAZO: 'solicitação de crédito fora do prazo',
  PEDIDO_RETIDO: 'pedido retido',
  PROMESSA_VENCIDA: 'promessa vencida',
  ACAO_ATRASADA: 'ação de cobrança atrasada',
  JURIDICO_SEM_ANDAMENTO: 'processo sem andamento',
  JURIDICO_PRAZO: 'processo com prazo vencendo',
  NF_PAGAMENTO_VENCIDO: 'nota pública com pagamento vencido',
  NF_ACIMA_2M: 'nota pública vencida há mais de 2 meses',
  CERTIDAO: 'certidão vencendo ou vencida',
};

export function textoDoSinal(s: Sinal): string {
  if (s.tipo === 'FOTO_PENDENTE' || s.tipo === 'LEITURA_ATRASADA') return s.texto;
  const nome = (s.quantidade === 1 ? SINGULAR[s.tipo] : undefined) ?? TEXTO_DO_TIPO[s.tipo] ?? s.texto;
  return `${s.quantidade.toLocaleString('pt-BR')} ${nome}${s.valor ? ` · ${moedaCurta(s.valor)}` : ''}`;
}

/** Lista mostrada = sinais próprios + dos resumos, pela gravidade (ALTA primeiro), sem quantidade 0. */
export function juntarSinais(proprios: Sinal[] | null, dosResumos: Sinal[]): Sinal[] {
  const ordem = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
  return [...(proprios || []), ...dosResumos]
    .filter((s) => Number(s.quantidade) > 0)
    .sort((a, b) => (ordem[a.gravidade] ?? 3) - (ordem[b.gravidade] ?? 3));
}

/* ── Funil Jurídico / Público (painel-juridico-publico B) ── */

export interface Etapa {
  chave: string;
  rotulo: string;
  quantidade: number | null;
  valor: number;
  /** Etapa do funil (barra); as outras são números ao lado. */
  noGrafico: boolean;
}

/**
 * C-023: etapas na ordem do mockup, com a quantidade e o valor da coluna certa de cada resumo.
 * Resumo ausente = `null` no lugar do funil dele.
 */
export function funilJuridicoPublico(jur: Linha | null, pub: Linha | null) {
  const e = (chave: string, rotulo: string, quantidade: number | null, valor: number, noGrafico = true): Etapa => ({ chave, rotulo, quantidade, valor, noGrafico });
  return {
    juridico: jur ? {
      etapas: [
        e('AJUIZAR', 'A ajuizar', n(jur.AJUIZAR), n(jur.VALOR_AJUIZAR)),
        e('ATIVOS', 'Em andamento', n(jur.ATIVOS), n(jur.VALOR_ATIVOS)),
        e('ACORDOS_A_RECEBER', 'Acordo judicial a receber', n(jur.ACORDOS_A_RECEBER), n(jur.VALOR_ACORDOS_A_RECEBER)),
        e('ACORDOS_PARCELA_VENCIDA', 'Acordo com parcela vencida', n(jur.ACORDOS_PARCELA_VENCIDA), n(jur.VALOR_PARCELA_VENCIDA)),
        e('RECUPERADO_MES', 'Recuperado no mês', null, n(jur.RECUPERADO_MES), false),
        e('CUSTO_MES', 'Custo no mês', null, n(jur.CUSTO_MES), false),
        e('RECUPERADO_ANO', 'Recuperado no ano', null, n(jur.RECUPERADO_ANO), false),
      ],
      desvios: n(jur.DESVIOS_PRAZO),
      criticos: n(jur.DESVIOS_CRITICOS),
    } : null,
    publico: pub ? {
      etapas: [
        e('NFS_ABERTAS', 'Em tramitação', n(pub.NFS_ABERTAS), n(pub.VALOR_ABERTO)),
        e('SEM_ATESTO', 'Entre a entrega e o atesto', n(pub.SEM_ATESTO), n(pub.VALOR_SEM_ATESTO)),
        e('AGUARDANDO_LIQUIDACAO', 'Aguardando liquidação', n(pub.AGUARDANDO_LIQUIDACAO), n(pub.VALOR_AGUARDANDO_LIQUIDACAO)),
        e('LIQUIDADAS_SEM_PAGAMENTO', 'Liquidadas sem pagamento', n(pub.LIQUIDADAS_SEM_PAGAMENTO), n(pub.VALOR_LIQUIDADAS_SEM_PAGAMENTO)),
        e('PAGAMENTO_VENCIDO', 'Com pagamento vencido', n(pub.PAGAMENTO_VENCIDO), n(pub.VALOR_PAGAMENTO_VENCIDO)),
        e('RECEBIDO_MES', 'Recebido no mês', null, n(pub.RECEBIDO_MES), false),
      ],
      pagamentoVencido: n(pub.PAGAMENTO_VENCIDO),
    } : null,
  };
}
