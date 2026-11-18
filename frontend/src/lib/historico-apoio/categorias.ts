// As 8 categorias do histórico (RN-004) e as abas da opção C (por assunto). Puras: testadas em
// tests/007-historico-apoio.test.mjs. A cor é um token da rampa de dados (série, não estado).

export const AUDITADA = 'Alteração auditada';

export const CATEGORIAS: { nome: string; cor: string }[] = [
  { nome: 'Cobrança', cor: 'data-1' },
  { nome: 'Acordos e baixas', cor: 'data-2' },
  { nome: 'Crédito', cor: 'data-3' },
  { nome: 'Jurídico', cor: 'data-4' },
  { nome: 'Setor público', cor: 'data-5' },
  { nome: 'Comunicação', cor: 'data-6' },
  { nome: 'Recebimentos', cor: 'data-7' },
  { nome: AUDITADA, cor: 'data-8' },
];

export const corDaCategoria = (nome: string) => CATEGORIAS.find((c) => c.nome === nome)?.cor ?? 'data-1';

/** Aba → categorias. "Tudo" não filtra (lista vazia). */
export const ABAS: { id: string; rotulo: string; categorias: string[] }[] = [
  { id: 'tudo', rotulo: 'Tudo', categorias: [] },
  { id: 'credito', rotulo: 'Crédito', categorias: ['Crédito'] },
  { id: 'cobranca', rotulo: 'Cobrança e acordos', categorias: ['Cobrança', 'Acordos e baixas', 'Recebimentos'] },
  { id: 'comunicacao', rotulo: 'Comunicação e notas fiscais', categorias: ['Comunicação', 'Setor público'] },
  { id: 'juridico', rotulo: 'Jurídico e auditoria', categorias: ['Jurídico', AUDITADA] },
];

/**
 * Categorias da aba que a pessoa vê: "Alteração auditada" só para nível 2 ou Administrador (RN-016, a mesma
 * regra do servidor, que é quem corta de verdade).
 */
export function categoriasDaAba(aba: string, veAuditada: boolean): string[] {
  const cats = ABAS.find((a) => a.id === aba)?.categorias ?? [];
  return veAuditada ? cats : cats.filter((c) => c !== AUDITADA);
}

/** Total da aba pelas contagens do resumo (D-004): "Tudo" soma todas as que vieram. */
export function totalDaAba(contagens: Record<string, number>, aba: string): number {
  const cats = ABAS.find((a) => a.id === aba)?.categorias ?? [];
  const usar = cats.length ? cats : Object.keys(contagens);
  return usar.reduce((s, c) => s + (Number(contagens[c]) || 0), 0);
}

/** O `categoria` que vai ao servidor: separado por vírgula sem espaço; '' = todas. */
export const filtroDeCategoria = (categorias: string[]) => categorias.join(',');

/** O filtro por extenso no documento: "Acordos e baixas, Recebimentos" ou "Todas as categorias". */
export const rotuloDoFiltro = (categoria: string) => (categoria ? categoria.split(',').join(', ') : 'Todas as categorias');
