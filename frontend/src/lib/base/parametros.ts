// Parâmetros na tela (RN-027) e os nomes dos grupos de 03 (01 §9). `GRUPOS_PARAMETRO` é importado
// também pela 007 (consulta de regras em vigor). Entrada: colunas de ccBaseParametroListar.

export const GRUPOS_PARAMETRO: { codigo: string; nome: string; ordem: number }[] = [
  { codigo: 'base', nome: 'Leitura do Winthor e calendário', ordem: 1 },
  { codigo: 'com', nome: 'Identidade da comunicação', ordem: 2 },
  { codigo: 'crit', nome: 'Criticidade do cliente', ordem: 3 },
  { codigo: 'regua', nome: 'Régua de cobrança', ordem: 4 },
  { codigo: 'cob', nome: 'Cobrança, promessas e acordos', ordem: 5 },
  { codigo: 'enc', nome: 'Encargos de atraso', ordem: 6 },
  { codigo: 'alcada', nome: 'Alçadas', ordem: 7 },
  { codigo: 'pdd', nome: 'Provisão por faixa de atraso', ordem: 8 },
  { codigo: 'limite', nome: 'Política de limite', ordem: 9 },
  { codigo: 'score', nome: 'Score comportamental', ordem: 10 },
  { codigo: 'farol', nome: 'Semáforo de rating', ordem: 11 },
  { codigo: 'cred', nome: 'Gestão do crédito', ordem: 12 },
  { codigo: 'flex', nome: 'Flexibilização do crédito', ordem: 13 },
  { codigo: 'saude', nome: 'Saúde da carteira de crédito', ordem: 14 },
  { codigo: 'meta', nome: 'Metas', ordem: 15 },
  { codigo: 'painel', nome: 'Leitura dos painéis', ordem: 16 },
  { codigo: 'jur', nome: 'Jurídico', ordem: 17 },
  { codigo: 'pub', nome: 'Nota fiscal de órgão público', ordem: 18 },
  { codigo: 'pubMotor', nome: 'Motor do órgão público', ordem: 19 },
];

type Linha = Record<string, unknown>;

const numero = (v: number, casas: number, minimo = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: minimo, maximumFractionDigits: casas });

const plural = (n: number, um: string, varios: string) => `${numero(n, 0)} ${n === 1 ? um : varios}`;

/**
 * RN-027: reais com 2 casas (R$ 65.492,11), percentual com até 2 (0,5%), dias e quantidades
 * inteiros (D+4 na régua, 180 dias), fator com 1 casa (1,2). Vazio volta '' (a tela mostra `Dash`).
 * `def` = linha de ccBaseParametroListar (CHAVE ou GRUPO, TIPO, UNIDADE).
 */
export function formatarParametro(def: Linha, valor: unknown): string {
  if (valor === null || valor === undefined || String(valor).trim() === '') return '';
  const tipo = String(def.TIPO ?? '');
  const unidade = String(def.UNIDADE ?? '');
  const grupo = String(def.GRUPO ?? String(def.CHAVE ?? '').split('.')[0]);
  const n = Number(valor);
  const texto = String(valor);

  if (['TEXTO', 'LISTA', 'OPCAO', 'RATING'].includes(tipo) || Number.isNaN(n)) return texto;
  if (tipo === 'DATA') return texto.slice(0, 10).split('-').reverse().join('/');
  if (tipo === 'MOEDA' || unidade === 'R$') return `R$ ${numero(n, 2, 2)}`;
  if (tipo === 'PERCENTUAL' || unidade.startsWith('%')) return `${numero(n, 2)}${unidade === '%' || !unidade ? '%' : unidade}`;
  if (grupo === 'regua' && unidade === 'd antes') return `D-${numero(Math.abs(n), 0)}`;
  if (grupo === 'regua' && unidade === 'd') return n < 0 ? `D${numero(n, 0)}` : `D+${numero(n, 0)}`;
  switch (unidade) {
    case 'd': return plural(n, 'dia', 'dias');
    case 'd antes': return `${plural(n, 'dia', 'dias')} antes`;
    case 'du': return plural(n, 'dia útil', 'dias úteis');
    case 'm': return plural(n, 'mês', 'meses');
    case 'min': return `${numero(n, 0)} min`;
    case 'nível': return `nível ${numero(n, 0)}`;
    case 'pts': case 'pts/dia': return `${numero(n, 0)} ${unidade}`;
    case 'qtd': return numero(n, 0);
    case 'fator': return numero(n, 1, 1);
    case 'vezes': return `${numero(n, 2)}×`;
    default: return numero(n, 2);
  }
}

/** "Salvar grupo" manda só o que mudou: chaves cujo valor editado difere do carregado. */
export function oQueMudou(originais: Record<string, unknown>, editados: Record<string, unknown>): { chave: string; valor: string }[] {
  return Object.entries(editados)
    .filter(([chave, valor]) => String(valor ?? '').trim() !== String(originais[chave] ?? '').trim())
    .map(([chave, valor]) => ({ chave, valor: String(valor ?? '').trim() }));
}
