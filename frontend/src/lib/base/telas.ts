// Regra das telas da 001 (T-090 a T-102) que vira número ou decisão na tela. Puras, sem React e sem
// relógio: testadas em tests/001-base.test.mjs. Import relativo com extensão (o Node importa direto).

import { mapaDeFeriados, motivoNaoUtil, somarDias, somarDiasUteis } from './dias-uteis.ts';

type Linha = Record<string, unknown>;

/** Divide em lotes de `tamanho` (teto de 20 por clique, 01 §10). */
export function emLotes<T>(itens: T[], tamanho = 20): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** Marca/desmarca um cliente na redistribuição; não passa de `limite` marcados (C-014: até 20 por vez). */
export function alternarSelecao(marcados: number[], id: number, limite = 20): number[] {
  if (marcados.includes(id)) return marcados.filter((x) => x !== id);
  return marcados.length >= limite ? marcados : [...marcados, id];
}

/**
 * Destinos de "Escolher agente" / "Mover para" (C-014): Agente, Supervisor ou Gerente ativos; quem vê
 * tudo escolhe qualquer um, os demais só a si e a quem está abaixo deles (SUPERIOR_ID de ccBaseMembroListar).
 */
export function destinosDaAtribuicao(membros: Linha[], membroId: number, veTudo: boolean): Linha[] {
  const validos = membros.filter((m) => Number(m.ATIVO) === 1 && ['AGENTE', 'SUPERVISOR', 'GERENTE'].includes(String(m.CARGO)));
  if (veTudo) return validos;
  const equipe = new Set([membroId]);
  for (let cresceu = true; cresceu;) {
    cresceu = false;
    for (const m of membros) {
      if (!equipe.has(Number(m.ID)) && equipe.has(Number(m.SUPERIOR_ID))) {
        equipe.add(Number(m.ID));
        cresceu = true;
      }
    }
  }
  return validos.filter((m) => equipe.has(Number(m.ID)));
}

/* ── Parâmetros (grade do grupo, C-015 a C-018) ── */

export type CarteiraParametro = '' | 'ESTETICA' | 'PUBLICA';
export interface ItemParametro { chave: string; carteira: CarteiraParametro; valor: string | null; vigenciaInicio: string }

/** Chave da célula da grade: `chave@carteira` ('' = coluna Valor, a linha padrão). */
export const celula = (chave: string, carteira: CarteiraParametro) => `${chave}@${carteira}`;

/**
 * "Salvar grupo" manda só as células que mudaram. Coluna Valor vazia = restaurar o padrão do catálogo
 * (valor nulo na linha padrão); Estética/Pública vazia = voltar a herdar (valor nulo na carteira).
 */
export function itensParaSalvar(originais: Record<string, string>, editados: Record<string, string>, vigenciaInicio: string): ItemParametro[] {
  return Object.entries(editados)
    .filter(([k, v]) => String(v ?? '').trim() !== String(originais[k] ?? '').trim())
    .map(([k, v]) => {
      const [chave, carteira] = k.split('@') as [string, CarteiraParametro];
      const valor = String(v ?? '').trim();
      return { chave, carteira, valor: valor === '' ? null : valor, vigenciaInicio };
    });
}

/* ── Sincronização (faixa do dia, C-006) ── */

export type TomPulso = 'ok' | 'erro' | 'andamento' | 'vazio';
export interface Pulso { chave: string; tom: TomPulso; titulo: string; leituraId?: number }

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const minutoDoDia = (iso: unknown) => {
  const m = /[T ](\d{2}):(\d{2})/.exec(String(iso ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
};
const TOM_SITUACAO: Record<string, TomPulso> = { OK: 'ok', ERRO: 'erro', EM_ANDAMENTO: 'andamento', SOLICITADA: 'andamento' };

/**
 * Um traço por janela de `intervaloMin` do dia (96 com 15 min). A janela leva a leitura mais recente que
 * começou nela (erro vence: falha não some atrás de um acerto); janela sem leitura fica vazia.
 * `leituras` = linhas de ccBaseSincronizacaoListar do dia (INICIO ou SOLICITADA_EM, SITUACAO, ID).
 */
export function faixaDoDia(leituras: Linha[], intervaloMin: number): Pulso[] {
  const passo = Math.max(5, Math.trunc(Number(intervaloMin) || 15));
  const janelas = Math.ceil(1440 / passo);
  const porJanela = new Map<number, Linha>();
  for (const l of leituras) {
    const min = minutoDoDia(l.INICIO ?? l.SOLICITADA_EM);
    if (min < 0) continue;
    const j = Math.floor(min / passo);
    const atual = porJanela.get(j);
    if (!atual || (l.SITUACAO === 'ERRO' && atual.SITUACAO !== 'ERRO') || (atual.SITUACAO !== 'ERRO' && Number(l.ID) > Number(atual.ID))) porJanela.set(j, l);
  }
  return Array.from({ length: janelas }, (_, j) => {
    const l = porJanela.get(j);
    const faixa = `${hhmm(j * passo)}–${hhmm(Math.min(1440, (j + 1) * passo))}`;
    if (!l) return { chave: String(j), tom: 'vazio' as TomPulso, titulo: `${faixa}: sem leitura` };
    const tom = TOM_SITUACAO[String(l.SITUACAO)] ?? 'andamento';
    const nome = { ok: 'concluída', erro: 'com erro', andamento: 'em andamento', vazio: '' }[tom];
    return { chave: String(j), tom, titulo: `${faixa}: leitura ${nome}`, leituraId: Number(l.ID) };
  });
}

/** Contagem do dia para a legenda da faixa. */
export function contarLeituras(leituras: Linha[]) {
  return {
    total: leituras.length,
    ok: leituras.filter((l) => l.SITUACAO === 'OK').length,
    erro: leituras.filter((l) => l.SITUACAO === 'ERRO').length,
  };
}

/** Próxima leitura prevista: a última concluída + o intervalo (hora `HH:MM`, ou '' sem leitura). */
export function proximaLeitura(ultimaOkEm: unknown, intervaloMin: unknown): string {
  const min = minutoDoDia(ultimaOkEm);
  if (min < 0) return '';
  return hhmm((min + Math.trunc(Number(intervaloMin) || 15)) % 1440);
}

/** Duração de uma leitura: "1 min 29 s", "45 s"; '' sem início ou fim. */
export function duracao(inicio: unknown, fim: unknown): string {
  const seg = (iso: unknown) => {
    const m = /[T ](\d{2}):(\d{2}):(\d{2})/.exec(String(iso ?? ''));
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
  };
  const a = seg(inicio);
  const b = seg(fim);
  if (a === null || b === null || b < a) return '';
  const s = b - a;
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
}

/* ── Feriados (conferidor de dia útil, C-021) ── */

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const diaDaSemana = (data: string) => {
  const [a, m, d] = data.slice(0, 10).split('-').map(Number);
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
};

/** Feriados que valem numa localidade: nacionais + os da UF + os do município (01 §12). */
export function feriadosDaLocalidade(feriados: Linha[], uf: string, municipio = ''): Linha[] {
  return feriados.filter((f) => f.ABRANGENCIA === 'NACIONAL'
    || (f.ABRANGENCIA === 'UF' && f.UF === uf)
    || (f.ABRANGENCIA === 'MUNICIPIO' && f.UF === uf && String(f.MUNICIPIO ?? '').toUpperCase() === municipio.toUpperCase()));
}

/** "23/11/2026, segunda-feira" e o porquê dos dias pulados ("20/11 Consciência Negra; 21/11 sábado…"). */
export function conferirDiaUtil(data: string, n: number, feriados: Linha[]): { resultado: string; semana: string; pulados: string[] } {
  const mapa = mapaDeFeriados(feriados);
  const resultado = somarDiasUteis(data, n, mapa);
  const pulados: string[] = [];
  const inicio = n === 0 ? data : somarDias(data, 1);
  for (let dia = inicio; dia < resultado; dia = somarDias(dia, 1)) {
    const motivo = motivoNaoUtil(dia, mapa);
    if (motivo) pulados.push(`${dia.slice(8, 10)}/${dia.slice(5, 7)} ${motivo}`);
  }
  return { resultado, semana: diaDaSemana(resultado), pulados };
}

/* ── Modelos de mensagem (C-023) ── */

/** Campos comuns de 01 §13 (os mesmos de backend/lib/base/modelo.mjs). */
export const CAMPOS_COMUNS = [
  'CLIENTE', 'RAZAO_SOCIAL', 'CNPJ', 'CODIGO_CLIENTE', 'VALOR_VENCIDO', 'DIAS_ATRASO', 'VENCIMENTO_MAIS_ANTIGO',
  'VALOR_A_VENCER', 'PROXIMO_VENCIMENTO', 'VALOR_PROXIMO_VENCIMENTO', 'DATA_HOJE', 'AGENTE', 'TELEFONE_CONTATO',
  'EMAIL_CONTATO', 'ASSINATURA',
];

/** `[CAMPO]` do texto, na ordem, sem repetir. */
export function camposDoTexto(texto: string): string[] {
  const vistos: string[] = [];
  for (const m of String(texto ?? '').matchAll(/\[([A-Z][A-Z0-9_]*)\]/g)) if (!vistos.includes(m[1])) vistos.push(m[1]);
  return vistos;
}

/** Extras declarados no modelo (`CAMPOS_EXTRAS` = 'DATA_LIMITE,PROTOCOLO'). */
export const camposExtras = (declarados: unknown) =>
  String(declarados ?? '').split(',').map((c) => c.trim().replace(/^\[|\]$/g, '')).filter(Boolean);

/** Campos do texto que o servidor recusaria: nem comuns nem extras do modelo. */
export function camposDesconhecidos(texto: string, declarados: unknown): string[] {
  const extras = camposExtras(declarados);
  return camposDoTexto(texto).filter((c) => !CAMPOS_COMUNS.includes(c) && !extras.includes(c));
}

/* ── Anexos (C-025) ── */

/** 5242880 → "5,0 MB"; 2048 → "2 KB". */
export function tamanhoLegivel(bytes: unknown): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(n / 1024)).toLocaleString('pt-BR')} KB`;
}
