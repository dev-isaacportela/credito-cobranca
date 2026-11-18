// Regra pura de tela da 005 (T-201): texto e rótulo do que o servidor devolveu. Prazos, régua e motor são do
// servidor (D-003); aqui só se diz em palavras. Sem React, sem relógio próprio: `hoje` entra pronto.
// Import relativo com extensão: o Node importa este arquivo direto nos testes (tests/005-setor-publico.test.mjs).

type Linha = Record<string, unknown>;

const txt = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const sim = (v: unknown) => v === true || Number(v) === 1;
/** `2026-10-16` → `16/10`. */
export const diaMes = (iso: unknown) => {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(txt(iso));
  return m ? `${m[2]}/${m[1]}` : '';
};

/* ── RF-016: situação da NF ───────────────────────────────────────────────── */

export type Tom = 'live' | 'off' | 'attention' | 'alert';

/** "Liquidação vencida desde 16/10", "Paga com 26 dias de atraso"… (colunas de ccPubNfListar / ccPubNfFicha). */
export function textoSituacao(nf: Linha): string {
  switch (txt(nf.SITUACAO)) {
    case 'A_PROTOCOLAR': return 'Protocolar a NF';
    case 'LIQUIDACAO_VENCIDA': return `Liquidação vencida desde ${diaMes(nf.LIQUIDAR_ATE)}`;
    case 'PAGAMENTO_VENCIDO': return `Pagamento vencido desde ${diaMes(nf.PAGAR_ATE)}`;
    case 'PAGA': return Number(nf.DIAS_ATRASO) > 0 ? `Paga com ${Number(nf.DIAS_ATRASO)} dias de atraso` : 'Paga no prazo';
    case 'NO_PRAZO': return 'No prazo';
    default: return txt(nf.SITUACAO);
  }
}

export function tomSituacao(nf: Linha): Tom {
  const s = txt(nf.SITUACAO);
  if (s === 'LIQUIDACAO_VENCIDA' || s === 'PAGAMENTO_VENCIDO') return 'alert';
  if (s === 'A_PROTOCOLAR') return 'attention';
  if (s === 'PAGA') return Number(nf.DIAS_ATRASO) > 0 ? 'attention' : 'live';
  return 'live';
}

/** "Distrito Federal · a confirmar · prazo do contrato" (REGRA_NOME, REGRA_SITUACAO, PEQUENO_VALOR, PRAZO_CONTRATO). */
export function etiquetaRegra(nf: Linha): string {
  return [
    txt(nf.REGRA_NOME),
    txt(nf.REGRA_SITUACAO) === 'A_CONFIRMAR' ? 'a confirmar' : '',
    sim(nf.PEQUENO_VALOR) ? 'pequeno valor' : '',
    sim(nf.PRAZO_CONTRATO) ? 'prazo do contrato' : '',
  ].filter(Boolean).join(' · ');
}

export const ESFERA: Record<string, string> = { FEDERAL: 'Federal', ESTADUAL: 'Estadual', MUNICIPAL: 'Municipal' };

/* ── RN-034 / C-030: onde o recebível vencido travou ──────────────────────── */

export function documentoRecebivel(nf: Linha): string {
  if (!['LIQUIDACAO_VENCIDA', 'PAGAMENTO_VENCIDO'].includes(txt(nf.SITUACAO))) return '';
  if (!txt(nf.EMPENHO)) return 'Sem empenho';
  if (!nf.LIQUIDACAO) return 'Aguardando liquidação';
  if (!nf.OP) return 'Liquidada sem ordem de pagamento';
  return 'Ordem de pagamento emitida';
}

/* ── Trilho da nota (nf-tramitacao C, nf-datas B) ─────────────────────────── */

export type EstadoPasso = 'feito' | 'agora' | 'atraso' | '';
export interface PassoTrilho { chave: 'empenho' | 'protocolo' | 'atesto' | 'liquidacao' | 'op' | 'pagamento'; rotulo: string; sub: string; estado: EstadoPasso }

/** Os seis marcos da NF com a data lançada, o prazo do que falta e onde está parada (C-014 a C-016). */
export function passosTrilho(nf: Linha): PassoTrilho[] {
  const liqVencida = txt(nf.SITUACAO) === 'LIQUIDACAO_VENCIDA';
  const ate = (d: unknown) => (d ? `até ${diaMes(d)}` : '');
  const pend = (cond: boolean, vencido: boolean): EstadoPasso => (cond ? (vencido ? 'atraso' : 'agora') : '');
  return [
    { chave: 'empenho', rotulo: 'Empenho', sub: txt(nf.EMPENHO) || 'sem número', estado: txt(nf.EMPENHO) ? 'feito' : 'agora' },
    nf.PROTOCOLO
      ? { chave: 'protocolo', rotulo: 'Protocolo', sub: diaMes(nf.PROTOCOLO), estado: 'feito' }
      : { chave: 'protocolo', rotulo: 'Protocolo', sub: 'protocolar', estado: 'agora' },
    nf.ATESTO
      ? { chave: 'atesto', rotulo: 'Atesto', sub: diaMes(nf.ATESTO), estado: 'feito' }
      : { chave: 'atesto', rotulo: 'Atesto', sub: ate(nf.LIQUIDAR_ATE), estado: pend(!!nf.PROTOCOLO, liqVencida) },
    nf.LIQUIDACAO
      ? { chave: 'liquidacao', rotulo: 'Liquidação', sub: diaMes(nf.LIQUIDACAO), estado: 'feito' }
      : { chave: 'liquidacao', rotulo: 'Liquidação', sub: nf.ATESTO ? ate(nf.LIQUIDAR_ATE) : '', estado: pend(!!nf.ATESTO, liqVencida) },
    nf.OP
      ? { chave: 'op', rotulo: 'Ordem de pagamento', sub: diaMes(nf.OP), estado: 'feito' }
      : { chave: 'op', rotulo: 'Ordem de pagamento', sub: nf.LIQUIDACAO ? 'pendente' : '', estado: nf.LIQUIDACAO ? 'agora' : '' },
    nf.PAGO_EM
      ? { chave: 'pagamento', rotulo: 'Pagamento', sub: diaMes(nf.PAGO_EM), estado: 'feito' }
      : { chave: 'pagamento', rotulo: 'Pagamento', sub: ate(nf.PAGAR_ATE), estado: Number(nf.DIAS_ATRASO) > 0 ? 'atraso' : nf.OP ? 'agora' : '' },
  ];
}

/* ── Régua da NF (RN-027): rótulos dos dez passos — o devido e o feito vêm de ccPubNfFicha ── */

export const PASSOS_REGUA: Record<string, { acao: string; canal: string; modelo: string }> = {
  CONF: { acao: 'Confirmar recebimento da NF e o atesto com o fiscal', canal: 'Telefone', modelo: 'PUB_PROTOCOLO' },
  L1: { acao: 'E-mail ao fiscal e ao financeiro: liquidação vencida', canal: 'E-mail', modelo: 'PUB_LIQ' },
  L2: { acao: 'Ligação ao fiscal: pendências e previsão de atesto', canal: 'Telefone', modelo: 'PUB_LIQ' },
  L3: { acao: 'Ofício ao ordenador de despesa pedindo a liquidação', canal: 'Ofício', modelo: 'PUB_OFICIO' },
  G1: { acao: 'E-mail cobrando o pagamento vencido', canal: 'E-mail', modelo: 'PUB_PAGAMENTO' },
  G2: { acao: 'Pedido de posição na ordem cronológica (LAI)', canal: 'Portal do órgão', modelo: 'PUB_FILA' },
  G3: { acao: 'Ligação ao setor financeiro / ordenador de despesa', canal: 'Telefone', modelo: 'PUB_PAGAMENTO' },
  G4: { acao: 'Ofício formal de cobrança ao ordenador de despesa', canal: 'Ofício', modelo: 'PUB_OFICIO' },
  M2: { acao: 'Jurídico avalia requerimento e art. 137', canal: 'Ofício', modelo: 'PUB_REQUERIMENTO' },
  G5: { acao: 'Avaliar cobrança judicial com o jurídico', canal: '', modelo: '' },
};

/** Primeiro passo da régua que usa o modelo (prévia da tela de comunicação); '' para o da análise. */
export const passoDoModelo = (codigo: string) => Object.entries(PASSOS_REGUA).find(([, p]) => p.modelo === codigo)?.[0] ?? '';

/** Opções fechadas da análise do órgão (RN-010), como a pessoa lê. */
export const ROTULOS: Record<string, Record<string, string>> = {
  ESFERA: { FEDERAL: 'Federal', ESTADUAL: 'Estadual', MUNICIPAL: 'Municipal' },
  CAPAG: { A: 'A', B: 'B', C: 'C', D: 'D', ND: 'Não divulgada', UNIAO: 'Não se aplica (União)' },
  CAPACIDADE: { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' },
  CAUC: { REGULAR: 'Regular', PENDENCIA: 'Com pendência' },
  FONTE_TIPO: { SUS: 'Vinculada (SUS fundo a fundo)', VINCULADA: 'Outra vinculada', PROPRIOS: 'Recursos próprios' },
  PERFIL_PAG: { PONTUAL: 'Pontual', EVENTUAIS: 'Atrasos eventuais', FREQUENTES: 'Atrasos frequentes' },
  SIM_NAO: { SIM: 'Sim', NAO: 'Não' },
  BASE: { EDITAL: 'Estimado do edital', CONTRATO: 'Saldo de contrato ativo' },
};
/** Rótulo de uma opção fechada da análise (RN-010); vazio = ''. */
export const rot = (grupo: string, v: unknown) => (v === null || v === undefined || v === '' ? '' : ROTULOS[grupo][String(v)] ?? String(v));

/* ── Motor do órgão ───────────────────────────────────────────────────────── */

const DECISAO: Record<string, string> = {
  INFORME_BASE: 'Informe a base', PRE_APROVAR: 'Pré-aprovar até a assinatura do contrato', NAO_FORNECER: 'Não fornecer',
  SEM_EMPENHO: 'Não entregar sem nota de empenho', SEM_CONTRATO: 'Não fornecer sem contrato ou ata vigente', APROVAR: 'Aprovar',
  REDUZIR: 'Reduzir à exposição máxima', DIRETORIA: 'Levar à Diretoria',
};
/** RN-016: a decisão sugerida em palavras. */
export const rotuloDecisao = (codigo: unknown) => DECISAO[txt(codigo)] ?? txt(codigo);

const SEMPRE = ['CAPAG', 'RGF/RREO', 'Extrato do CAUC', 'Certidões da empresa'];
/** RN-017: evidências pela base da análise (anexos do card da solicitação). */
export function evidenciasExigidas(base: unknown): string[] {
  if (base === 'EDITAL') return ['Edital ou termo de referência', ...SEMPRE];
  if (base === 'CONTRATO') return ['Contrato ou ata', 'Nota de empenho', ...SEMPRE];
  return SEMPRE;
}

/** Espelho do trecho `concessao-publica` do gancho (RN-003): a frase de lib/quadros/005 quando falta capacidade, perfil ou rating. */
export const MOTIVO_ANALISE = 'Análise do órgão incompleta: capacidade financeira, perfil de pagamento e rating.';
export function motivoAnaliseIncompleta(analise: Linha | null | undefined): string | null {
  return analise && txt(analise.CAPACIDADE) && txt(analise.PERFIL_PAG) && txt(analise.RATING_PUB) ? null : MOTIVO_ANALISE;
}

/** Campos da NF que o modelo da análise declara; sem NF, "não informado" (o envio recusa campo vazio). */
export function extrasAnalise(orgao: string, contrato: string): Record<string, string> {
  const ni = 'não informado';
  return { ORGAO: orgao || ni, NUMERO_NF: ni, EMISSAO_NF: ni, VALOR_NF: ni, EMPENHO: ni, CONTRATO: contrato || ni, PROTOCOLO: ni,
    DATA_LIQUIDAR_ATE: ni, DATA_PAGAR_ATE: ni, DIAS_ATRASO_NF: ni };
}

/* ── Certidões (RN-036, C-029) ────────────────────────────────────────────── */

export const TIPOS_CERTIDAO = [
  { tipo: 'CND_FEDERAL', nome: 'CND federal (RFB / PGFN)' }, { tipo: 'CRF_FGTS', nome: 'CRF do FGTS' },
  { tipo: 'CNDT', nome: 'CNDT (débitos trabalhistas)' }, { tipo: 'CND_ESTADUAL', nome: 'CND estadual' }, { tipo: 'CND_MUNICIPAL', nome: 'CND municipal' },
];
export const nomeCertidao = (tipo: unknown) => TIPOS_CERTIDAO.find((t) => t.tipo === tipo)?.nome ?? txt(tipo);

/** Tipos sem nenhuma certidão vigente cadastrada ("não cadastrada"). */
export function tiposSemCertidao(vigentes: Linha[]): { tipo: string; nome: string }[] {
  const tem = new Set(vigentes.map((c) => txt(c.TIPO)));
  return TIPOS_CERTIDAO.filter((t) => !tem.has(t.tipo));
}

/** Dias corridos de `hoje` até `data` (negativo = passou). */
export function diasAte(data: unknown, hoje: string): number {
  return Math.round((Date.parse(`${txt(data).slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86400000);
}

/** Normaliza a busca como a SQL compara (`NOME_BUSCA`, 06 §5): maiúsculas, sem acento. */
export const termoBusca = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
