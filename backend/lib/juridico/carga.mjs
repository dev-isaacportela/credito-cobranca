// Carga inicial no servidor (plan, "Carga inicial", RN-027 a RN-029): o servidor não confia na tela. Confere o
// formato do "processo interpretado", recalcula a chave, refaz o vínculo (código; nome só sugere), resolve a
// filial pela UF e infere a data dos andamentos (RN-010). Funções autocontidas: entram nas SFs por `FONTE`.
// `semelhanca` tem cópia na tela (frontend/src/lib/juridico/nomes.ts), com os mesmos casos de teste (D-09).

/** Maiúsculas, sem acento, só [A-Z0-9 ] e espaços simples. */
export function normalizarNome(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Palavras do nome (E §2.4): sem parênteses, sem código inicial, sem stopwords nem números. */
export function tokensDoNome(nome) {
  const PARADAS = ['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'LTDA', 'EIRELI', 'ME', 'EPP', 'SA', 'S', 'A', 'EM', 'LTD', 'CIA', 'O'];
  const t = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/\([^)]*\)/g, ' ').replace(/^\s*\d+\s*-?\s*/, '').replace(/[^A-Z0-9 ]+/g, ' ');
  return t.split(/\s+/).filter((w) => w && !PARADAS.includes(w) && !/^\d+$/.test(w));
}

/** Uma palavra "quase igual" à outra: no máximo um erro de digitação (troca, transposição, inserção). */
export function quaseIgual(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a.length === b.length) {
    const dif = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) dif.push(i);
    if (dif.length === 1) return true;
    return dif.length === 2 && dif[1] === dif[0] + 1 && a[dif[0]] === b[dif[1]] && a[dif[1]] === b[dif[0]];
  }
  if (Math.abs(a.length - b.length) !== 1) return false;
  const [curta, longa] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < longa.length; i += 1) if (longa.slice(0, i) + longa.slice(i + 1) === curta) return true;
  return false;
}

/** Semelhança de nomes em [0, 1] (E §2.4): menor contida na maior = 1; senão acertos ÷ palavras distintas. */
export function semelhanca(a, b) {
  const A = tokensDoNome(a);
  const B = tokensDoNome(b);
  if (!A.length || !B.length) return 0;
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  const hit = s.filter((w) => l.some((x) => quaseIgual(x, w))).length;
  if (s.length >= 2 && hit === s.length) return 1;
  return hit / new Set([...A, ...B]).size;
}

/** RN-010: data do andamento da planilha → ISO. 'dd/mm' ganha o ano da carga (ou o anterior, se ficaria no futuro); vazio = data da carga. */
export function inferirData(texto, dataCarga) {
  const t = String(texto ?? '').trim();
  const completa = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const curta = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
  const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (completa) return iso(completa[3], completa[2], completa[1]);
  if (curta) {
    const ano = Number(String(dataCarga).slice(0, 4));
    const data = iso(ano, curta[2], curta[1]);
    return data > String(dataCarga).slice(0, 10) ? iso(ano - 1, curta[2], curta[1]) : data;
  }
  return String(dataCarga).slice(0, 10);
}

/** RN-029: dígitos dos autos; senão código + nome normalizado; senão o nome. */
export function chaveDaCarga(l) {
  const autos = String(l.autos ?? '').replace(/\D/g, '');
  if (autos.length >= 15) return autos.slice(0, 80);
  const nome = normalizarNome(l.nomeDevedor);
  const cod = String(l.codcli ?? '').replace(/\D/g, '');
  return (cod ? `${cod}|${nome}` : nome).slice(0, 80);
}

/**
 * Confere formato e teto de um processo interpretado. Devolve `{ motivos[], linha }` com a linha normalizada
 * (números, datas e listas limpos); `motivos` vazio = aceito. `fases` = chaves válidas (sem `dossie`).
 */
export function validarProcesso(l, fases, dataCarga) {
  const motivos = [];
  const ehData = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
  const num = (v) => Number(String(v ?? '').replace(',', '.'));
  const nomeDevedor = String(l?.nomeDevedor ?? '').trim().slice(0, 200);
  if (!nomeDevedor) motivos.push('Nome do devedor obrigatório.');
  const faseChave = String(l?.faseChave ?? '').trim();
  if (!fases.includes(faseChave)) motivos.push(`Etapa inválida: ${faseChave || '(vazia)'}.`);
  const valor = num(l?.valor);
  if (!(valor >= 0)) motivos.push('Valor inválido.');
  const carteira = ['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(String(l?.carteira ?? '').toUpperCase()) ? String(l.carteira).toUpperCase() : 'PRIVADA';
  const andamentos = Array.isArray(l?.andamentos) ? l.andamentos : [];
  const custos = Array.isArray(l?.custos) ? l.custos : [];
  if (andamentos.length > 20) motivos.push('Até 20 andamentos por processo.');
  if (custos.length > 20) motivos.push('Até 20 custos por processo.');
  for (const c of custos) if (!(num(c.valor) > 0) || !ehData(c.data)) motivos.push('Custo com valor ou data inválidos.');
  const motivo = faseChave === 'encerrado' ? (['QUITADO', 'ACORDO_CUMPRIDO', 'BAIXA_PERDA', 'EXTINTO', 'OUTRO'].includes(String(l?.motivo ?? '')) ? l.motivo : 'OUTRO') : '';
  let acordo = null;
  if (l?.acordo) {
    const parcelas = Array.isArray(l.acordo.parcelas) ? l.acordo.parcelas : [];
    if (parcelas.length > 61) motivos.push('Acordo com parcelas demais.');
    for (const p of parcelas) {
      if (!['ABERTA', 'PAGA', 'A_CONFIRMAR'].includes(p.situacao) || !ehData(p.vencimento) || !(num(p.valor) >= 0)) motivos.push('Parcela do acordo inválida.');
    }
    acordo = {
      valor: num(l.acordo.valor), entrada: num(l.acordo.entrada || 0), nParcelas: Math.trunc(num(l.acordo.nParcelas || 0)),
      honorarios: num(l.acordo.honorarios || 0), situacaoTexto: String(l.acordo.situacaoTexto ?? '').slice(0, 100),
      parcelas: parcelas.map((p) => ({ numero: Math.trunc(num(p.numero)), valor: num(p.valor), vencimento: p.vencimento, situacao: p.situacao })),
    };
    if (!(acordo.valor > 0)) motivos.push('Acordo sem valor.');
  }
  const linha = {
    nomeDevedor, codcli: String(l?.codcli ?? '').replace(/\D/g, ''), documento: String(l?.documento ?? '').replace(/\D/g, '').slice(0, 14),
    clienteId: Math.trunc(num(l?.clienteId || 0)) || 0, carteira, setor: String(l?.setor ?? '').toUpperCase() === 'PUBLICO' || carteira === 'PUBLICA' ? 'PUBLICO' : 'PRIVADO',
    linha: String(l?.linha ?? '').toUpperCase() === 'GALDERMA' ? 'GALDERMA' : '', uf: String(l?.uf ?? '').toUpperCase().slice(0, 2),
    valor: Math.round((valor || 0) * 100) / 100, autos: String(l?.autos ?? '').trim(), tribunal: String(l?.tribunal ?? '').trim().slice(0, 20),
    faseChave, status: String(l?.status ?? '').trim().slice(0, 300), substabelecer: Number(l?.substabelecer) === 1 || l?.substabelecer === true ? 1 : 0,
    motivo, divergencia: String(l?.divergencia ?? '').trim().slice(0, 500),
    andamentos: andamentos.slice(0, 20).map((a) => ({ data: inferirData(a.data, dataCarga), periodo: String(a.periodo ?? a.data ?? '').slice(0, 30),
      autor: String(a.autor ?? '').slice(0, 120), texto: String(a.texto ?? '').trim().slice(0, 2000) })).filter((a) => a.texto),
    custos: custos.slice(0, 20).map((c) => ({ tipo: String(c.tipo ?? ''), data: c.data, valor: num(c.valor), pago: c.pago ? 1 : 0, obs: String(c.obs ?? '').slice(0, 500) })),
    acordo,
  };
  return { motivos: [...new Set(motivos)], linha };
}

/**
 * Vínculo (RN-011, RN-027): código existente vincula; sem ele, nome com semelhança ≥ 0,6 com um cliente só vira
 * sugestão; com dois ou mais, candidatos sem sugestão. `clientes` = [{ ID, CODCLI, NOME }].
 */
export function sugerirCliente(linha, clientes) {
  if (linha.codcli) {
    const c = clientes.find((x) => String(x.CODCLI) === linha.codcli);
    if (c) return { clienteId: Number(c.ID), candidatos: [{ clienteId: Number(c.ID), codcli: Number(c.CODCLI), nome: c.NOME, motivo: 'CODIGO', semelhanca: 1 }] };
  }
  const candidatos = clientes.map((c) => ({ clienteId: Number(c.ID), codcli: Number(c.CODCLI), nome: c.NOME, motivo: 'NOME', semelhanca: semelhanca(linha.nomeDevedor, c.NOME) }))
    .filter((c) => c.semelhanca >= 0.6).sort((x, y) => y.semelhanca - x.semelhanca);
  return { clienteId: 0, candidatos };
}

/** Filial credora pela UF: uma filial ativa na UF; senão vazia (e o aviso). */
export function resolverFilial(uf, filiais) {
  const naUf = filiais.filter((f) => String(f.UF) === String(uf) && (f.ATIVA === true || Number(f.ATIVA) === 1));
  return naUf.length === 1 ? { filial: String(naUf[0].CODIGO), aviso: '' } : { filial: '', aviso: `Filial credora não resolvida pela UF ${uf || '(vazia)'}.` };
}

/** NOVO (chave nova), ATUALIZA (gravado e incompleto: falta card, andamento ou acordo) ou IGNORA. */
export function decidirAcao(linha, existente) {
  if (!existente) return 'NOVO';
  const falta = !existente.CARD_ID || (linha.andamentos.length > 0 && !Number(existente.N_ANDAMENTOS))
    || (linha.acordo && !Number(existente.N_ACORDOS)) || (linha.custos.length > 0 && !Number(existente.N_CUSTOS));
  return falta ? 'ATUALIZA' : 'IGNORA';
}

export const FONTE = [normalizarNome, tokensDoNome, quaseIgual, semelhanca, inferirData, chaveDaCarga, validarProcesso, sugerirCliente,
  resolverFilial, decidirAcao].map(String).join('\n');
