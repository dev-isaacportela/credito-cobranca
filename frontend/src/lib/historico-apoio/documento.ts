// Linha do tempo agrupada, resumo de 12 campos e o documento de impressão (RF-008, RN-001, RN-005, RN-006,
// RN-018). Puras: testadas em tests/007-historico-apoio.test.mjs.

import { fmtData, moeda } from '../formato.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** `2026-11-13` → `13/11/2026 · sexta-feira` (dia da semana da própria data, sem relógio). */
export function rotuloDoDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  if (!a || !m || !d) return fmtData(dia);
  return `${fmtData(dia)} · ${DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}`;
}

/**
 * RN-001 na tela: primeiro o grupo "Agendado" (AGENDADO = 1, na ordem que veio: do mais próximo ao mais
 * distante); depois um grupo por dia, do mais recente ao mais antigo, mantendo a ordem do servidor dentro do dia.
 */
export function agruparPorDia(eventos: Linha[]): { chave: string; rotulo: string; eventos: Linha[] }[] {
  const agendados = eventos.filter((e) => Number(e.AGENDADO) === 1);
  const dias = new Map<string, Linha[]>();
  for (const e of eventos) {
    if (Number(e.AGENDADO) === 1) continue;
    const dia = String(e.EM ?? '').slice(0, 10);
    dias.set(dia, [...(dias.get(dia) ?? []), e]);
  }
  const grupos = [...dias.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((dia) => ({ chave: dia, rotulo: rotuloDoDia(dia), eventos: dias.get(dia)! }));
  return agendados.length ? [{ chave: 'agendado', rotulo: 'Agendado', eventos: agendados }, ...grupos] : grupos;
}

/** Hora do registro (`10:05`); data sem hora (`T00:00:00`) não inventa hora. Agendado mostra o dia. */
export function horaDoEvento(e: Linha): string {
  const em = String(e.EM ?? '');
  if (Number(e.AGENDADO) === 1) return fmtData(em).slice(0, 5);
  const hora = em.slice(11, 16);
  return hora && hora !== '00:00' ? hora : '';
}

/** RN-006: "Histórico - {nome}" sem `\ / : * ? " < > |` (o nome que o navegador sugere ao salvar o PDF). */
export function nomeDoDocumento(nome: unknown): string {
  return `Histórico - ${String(nome ?? '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()}`;
}

const cssTexto = (t: unknown) => String(t ?? '').replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** `@page` da impressão: A4, rodapé com cliente e documento e "Página i de n" (Chrome/Edge ≥ 131). */
export function cssDaPagina({ nome, documento }: { nome: unknown; documento: unknown }): string {
  return `@page { size: A4; margin: 16mm 14mm 18mm;
  @bottom-left { content: "${cssTexto(nome)} · ${cssTexto(documento)}"; font-size: 9pt; }
  @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 9pt; } }`;
}

/** RN-018: aviso no documento quando a emissão passou do teto. */
export function avisoDeCorte({ eventos, total, cortado }: { eventos: number; total: number; cortado: boolean }): string {
  return cortado ? `Mostrando os ${eventos.toLocaleString('pt-BR')} registros mais recentes de ${total.toLocaleString('pt-BR')}.` : '';
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const CARTEIRA: Record<string, string> = { PRIVADA: 'Privada', ESTETICA: 'Estética', PUBLICA: 'Pública' };

/**
 * RN-005: os 12 campos do resumo (saída de ccHistResumo). Sem dado = null (a tela mostra "—"), nunca zero
 * inventado; zero que o servidor mandou (contatos, documentos) é dado.
 */
export function camposDoResumo(r: Linha): { rotulo: string; valor: string | null }[] {
  const p = r.posicao as Linha | null;
  const c = (r.cliente ?? {}) as Linha;
  const risco = r.risco as Linha | null;
  const din = (v: unknown) => (v === null || v === undefined || v === '' ? null : moeda(v as number));
  const juntar = (partes: unknown[]) => partes.filter((x) => x !== null && x !== undefined && x !== '').join(' · ') || null;
  const cobrancas = ((r.cobrancas ?? []) as Linha[]).filter((x) => x.FASE_NOME);
  return [
    { rotulo: 'Etapa de crédito', valor: r.credito?.etapa ?? null },
    { rotulo: 'Etapa de cobrança', valor: cobrancas.map((x) => `${x.FASE_NOME}${cobrancas.length > 1 ? ` (${CARTEIRA[x.CARTEIRA] ?? x.CARTEIRA})` : ''}`).join('; ') || null },
    { rotulo: 'Agente e supervisor', valor: juntar([c.AGENTE_NOME, c.SUPERVISOR_NOME]) },
    { rotulo: 'Criticidade, rating e score', valor: juntar([risco?.CRITICIDADE, r.ratingPub ?? risco?.RATING_ATUAL, risco?.SCORE_FINAL]) },
    { rotulo: 'Limite', valor: din(p?.LIMITE) },
    { rotulo: 'Utilizado', valor: din(p?.UTILIZADO) },
    { rotulo: 'Vencido e dias de atraso', valor: p ? `${din(p.VENCIDO) ?? '—'}${Number(p.DIAS_ATRASO) > 0 ? ` · ${plural(Number(p.DIAS_ATRASO), 'dia', 'dias')}` : ''}` : null },
    { rotulo: 'A vencer', valor: din(p?.A_VENCER) },
    { rotulo: 'Fonte pagadora', valor: r.fontePagadora || null },
    { rotulo: 'Recuperado', valor: din(r.recuperado) },
    { rotulo: 'Contatos e promessas', valor: `${plural(Number(r.contatos) || 0, 'contato', 'contatos')} · ${plural(Number(r.promessasAbertas) || 0, 'promessa em aberto', 'promessas em aberto')}` },
    { rotulo: 'Documentos', valor: plural(Number(r.documentos) || 0, 'anexado', 'anexados') },
  ];
}
