// RF-026 / RN-019 na tela: "ações atrasadas" de `ccCobAgendaResumo` somadas pela árvore de `ccPainelEquipe`
// (cada linha soma a pessoa e todos abaixo dela, como as demais colunas da SF).

type Linha = Record<string, unknown>;

/** membroId → ações atrasadas da pessoa e de toda a equipe abaixo dela (só quem está nas linhas da equipe). */
export function somarAcoesNaArvore(equipe: Linha[], agenda: Linha[] | null): Map<number, number> {
  const superior = new Map<number, number>();
  for (const l of equipe) superior.set(Number(l.MEMBRO_ID), Number(l.SUPERIOR_ID) || 0);
  const soma = new Map<number, number>(equipe.map((l) => [Number(l.MEMBRO_ID), 0]));
  for (const a of agenda || []) {
    const n = Number(a.ATRASADAS) || 0;
    const vistos = new Set<number>();
    // Sobe do agente até a raiz visível; `vistos` corta ciclo de cadastro.
    for (let id = Number(a.AGENTE_ID); soma.has(id) && !vistos.has(id); id = superior.get(id) || 0) {
      vistos.add(id);
      soma.set(id, (soma.get(id) || 0) + n);
    }
  }
  return soma;
}
