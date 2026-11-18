// Trilha de auditoria na tela (RF-041, C-026): a mesma página de registros de ccBaseAuditoriaListar
// vista por dia (linha do tempo) ou por item alterado (opção "b+c" de escolhas.md). Somente leitura.

type Registro = Record<string, unknown>;

const texto = (v: unknown) => String(v ?? '').trim();

/** "Sérgio Nunes alterou Agente de Bruno Dias para Ana Costa." — criação e remoção com o resumo. */
export function fraseDoRegistro(r: Registro): string {
  const quem = texto(r.POR_NOME) || 'Rotina';
  const campo = texto(r.CAMPO);
  const antes = texto(r.ANTES);
  const depois = texto(r.DEPOIS);
  if (campo === '(criação)') return `${quem} criou ${depois}.`;
  if (campo === '(remoção)') return `${quem} removeu ${antes}.`;
  if (!antes) return `${quem} definiu ${campo} como ${depois || 'vazio'}.`;
  return `${quem} alterou ${campo} de ${antes} para ${depois || 'vazio'}.`;
}

const comFrase = (r: Registro): Registro & { frase: string } => ({ ...r, frase: fraseDoRegistro(r) });

/** Grupos por dia (`EM` AAAA-MM-DD), na ordem em que os registros chegam (mais recente primeiro). */
export function agruparPorDia(registros: Registro[]) {
  const grupos = new Map<string, ReturnType<typeof comFrase>[]>();
  for (const r of registros) {
    const dia = texto(r.EM).slice(0, 10);
    grupos.set(dia, [...(grupos.get(dia) ?? []), comFrase(r)]);
  }
  return [...grupos].map(([dia, itens]) => ({ dia, registros: itens }));
}

const nomeDaEntidade = (e: string) => e.charAt(0) + e.slice(1).toLowerCase().replace(/_/g, ' ');

/**
 * Grupos por item alterado: a entidade (cliente 1004, membro 5…) ou, quando ela não tem id (parâmetro,
 * `ENTIDADE_ID` 0), o campo (`crit.atrasoCritico`). Dentro do grupo, a sequência do mais antigo ao mais novo.
 */
export function agruparPorItem(registros: Registro[]) {
  const grupos = new Map<string, { item: string; registros: ReturnType<typeof comFrase>[] }>();
  for (const r of registros) {
    const entidade = texto(r.ENTIDADE);
    const id = Number(r.ENTIDADE_ID ?? 0);
    const chave = id ? `${entidade}:${id}` : `${entidade}:${texto(r.CAMPO)}`;
    const grupo = grupos.get(chave) ?? { item: id ? `${nomeDaEntidade(entidade)} ${id}` : texto(r.CAMPO), registros: [] };
    grupo.registros.push(comFrase(r));
    grupos.set(chave, grupo);
  }
  return [...grupos.values()].map((g) => ({
    ...g,
    registros: g.registros.sort((a, b) => texto(a.EM).localeCompare(texto(b.EM)) || Number(a.ID ?? 0) - Number(b.ID ?? 0)),
  }));
}
