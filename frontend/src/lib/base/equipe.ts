// Equipes lado a lado (RF-017, C-011): a direção no topo, uma coluna por supervisor e quem responde
// direto a alguém da direção. Entrada: linhas de ccBaseMembroListar (ID, NOME, CARGO, NIVEL,
// SUPERIOR_ID, ATIVO, CLIENTES). Sem desenho de árvore (observação do usuário em escolhas.md).

export interface Pessoa {
  id: number;
  nome: string;
  cargo: string;
  clientes: number;
  inativo: boolean;
}

export interface Equipes {
  /** Gerente e Diretoria, do nível mais alto para o mais baixo. */
  direcao: Pessoa[];
  /** Uma coluna por supervisor; `clientes` soma o supervisor e a equipe dele. */
  equipes: { supervisor: Pessoa; membros: Pessoa[]; clientes: number }[];
  /** Quem não é supervisor e responde a alguém da direção ("Direto com Gustavo"). */
  diretos: { chefe: Pessoa; membros: Pessoa[] }[];
}

type Linha = Record<string, unknown>;

const pessoa = (l: Linha): Pessoa => ({
  id: Number(l.ID),
  nome: String(l.NOME ?? ''),
  cargo: String(l.CARGO ?? ''),
  clientes: Number(l.CLIENTES ?? 0),
  inativo: !Number(l.ATIVO ?? 1),
});

// Ativos primeiro, depois por nome.
const ordem = (a: Pessoa, b: Pessoa) => Number(a.inativo) - Number(b.inativo) || a.nome.localeCompare(b.nome, 'pt-BR');

export function montarEquipes(linhas: Linha[]): Equipes {
  const nivel = new Map(linhas.map((l) => [Number(l.ID), Number(l.NIVEL ?? 0)]));
  const chefeDe = new Map(linhas.map((l) => [Number(l.ID), Number(l.SUPERIOR_ID ?? 0)]));
  const todos = linhas.map(pessoa);
  const ehDirecao = (p: Pessoa) => (nivel.get(p.id) ?? 0) >= 3;
  const subordinados = (id: number) => todos.filter((p) => chefeDe.get(p.id) === id).sort(ordem);

  const direcao = todos.filter(ehDirecao)
    .sort((a, b) => (nivel.get(b.id) ?? 0) - (nivel.get(a.id) ?? 0) || ordem(a, b));

  const equipes = todos.filter((p) => p.cargo === 'SUPERVISOR').sort(ordem).map((supervisor) => {
    const membros = subordinados(supervisor.id);
    return { supervisor, membros, clientes: membros.reduce((soma, p) => soma + p.clientes, supervisor.clientes) };
  });

  const diretos = direcao
    .map((chefe) => ({ chefe, membros: subordinados(chefe.id).filter((p) => !ehDirecao(p) && p.cargo !== 'SUPERVISOR') }))
    .filter((grupo) => grupo.membros.length > 0);

  return { direcao, equipes, diretos };
}
