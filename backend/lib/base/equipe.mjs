// Equipe (01 §4, §6; RN-011; RF-049). Puras; entram nas SFs por `FONTE`.

/** Nome para a chave única: minúsculo, sem acento, espaços colapsados. */
export function nomeChave(nome) {
  return String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Nível do cargo (definição do sistema); null para cargo desconhecido. `ADMIN` é marca, não nível. */
export function nivelDoCargo(cargo) {
  const niveis = { AGENTE: 1, ANALISTA: 1, SUPERVISOR: 2, GERENTE: 3, DIRETORIA: 5, JURIDICO: 0 };
  return Object.prototype.hasOwnProperty.call(niveis, cargo) ? niveis[cargo] : null;
}

/**
 * Conferência em memória sobre a lista inteira de CC_MEMBRO (ID, NOME, CARGO, SUPERIOR_ID, CAMINHO,
 * ATIVO e, se a consulta trouxe, TEM_USUARIO). Devolve listas de { id, nome }:
 * semUsuario, semSuperior (ativo fora do topo sem superior ativo de cargo SUPERVISOR/GERENTE/DIRETORIA,
 * ou topo a mais), ciclos (a cadeia de superiores volta nele) e caminhoInconsistente (CAMINHO diferente
 * do que a cadeia dá).
 */
export function conferirEquipe(membros) {
  const lista = (membros || []).map((m) => ({ ...m, ID: Number(m.ID), SUPERIOR_ID: m.SUPERIOR_ID ? Number(m.SUPERIOR_ID) : null,
    ATIVO: m.ATIVO === true || Number(m.ATIVO) === 1 }));
  const porId = new Map(lista.map((m) => [m.ID, m]));
  const item = (m) => ({ id: m.ID, nome: m.NOME });
  const ativos = lista.filter((m) => m.ATIVO);
  const saida = { semUsuario: [], semSuperior: [], ciclos: [], caminhoInconsistente: [] };

  for (const m of ativos) if ('TEM_USUARIO' in m && !(m.TEM_USUARIO === true || Number(m.TEM_USUARIO) === 1)) saida.semUsuario.push(item(m));

  const topos = ativos.filter((m) => !m.SUPERIOR_ID);
  const topo = topos.find((m) => m.CAMINHO === `/${m.ID}/`) || topos[0];
  for (const m of ativos) {
    if (!m.SUPERIOR_ID) { if (m !== topo) saida.semSuperior.push(item(m)); continue; }
    const sup = porId.get(m.SUPERIOR_ID);
    if (!sup || !sup.ATIVO || !['SUPERVISOR', 'GERENTE', 'DIRETORIA'].includes(sup.CARGO)) saida.semSuperior.push(item(m));
  }

  for (const m of lista) {
    const cadeia = [];
    let atual = m;
    let ciclo = false;
    while (atual) {
      if (cadeia.includes(atual.ID)) { ciclo = true; break; }
      cadeia.unshift(atual.ID);
      atual = atual.SUPERIOR_ID ? porId.get(atual.SUPERIOR_ID) : null;
    }
    if (ciclo) { saida.ciclos.push(item(m)); continue; }
    if (m.CAMINHO !== `/${cadeia.join('/')}/`) saida.caminhoInconsistente.push(item(m));
  }
  return saida;
}

export const FONTE = [nomeChave, nivelDoCargo, conferirEquipe].map(String).join('\n');
