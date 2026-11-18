// Alertas de desvio (RN-022) e indicadores (RN-023) numa passada em memória (plan D-03), usados por ccJurAlertas
// e ccJurIndicadores. Entra nas SFs por `FONTE`, com DESVIOS, INDICADORES, FASES e TIPOS_CUSTO como constantes.
// ponytail: a carteira inteira em memória, teto de ~5.000 processos; acima disso, agregar em SQL.
//
// `dados` = { processos[], acordos[] (o acordo de cada processo: o mais recente não RECUSADO), custos[], prontos[] }
// com as colunas que as SFs leem (add-030); `p` = parâmetros `jur.*`; `hoje` = AAAA-MM-DD.

import { DESVIOS, INDICADORES, FASES, TIPOS_CUSTO } from './catalogos.mjs';

export { DESVIOS, INDICADORES, FASES, TIPOS_CUSTO };

function diasEntreDatas(a, b) {
  return Math.round((Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000);
}

function moeda(v) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  const [i, c] = Math.abs(n).toFixed(2).split('.');
  return `R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`;
}

function pct1(v) {
  return `${(Math.round(v * 10) / 10).toFixed(1).replace('.', ',')}%`;
}

/** Alertas (RN-022), críticos primeiro e depois a ordem dos tipos. */
export function calcularAlertas(dados, p, hoje) {
  const ordem = DESVIOS.map((d) => d.tipo);
  const nomeDe = Object.fromEntries(DESVIOS.map((d) => [d.tipo, d]));
  const acordoDe = new Map((dados.acordos || []).map((a) => [Number(a.PROCESSO_ID), a]));
  const custosDe = new Map();
  for (const c of dados.custos || []) custosDe.set(Number(c.PROCESSO_ID), [...(custosDe.get(Number(c.PROCESSO_ID)) || []), c]);
  const grupoDe = Object.fromEntries(TIPOS_CUSTO.map((t) => [t.codigo, t.grupo]));
  const saida = [];
  const add = (tipo, gravidade, pr, texto, extra = {}) => saida.push({
    tipo, nome: nomeDe[tipo].nome, gravidade, processoId: pr ? Number(pr.ID) : 0, clienteId: pr ? Number(pr.CLIENTE_ID) || 0 : 0,
    cliente: pr ? pr.NOME_DEVEDOR : '', carteira: pr ? pr.CARTEIRA : '', texto, acao: nomeDe[tipo].acao, ...extra,
  });
  for (const pr of dados.processos || []) {
    const ativo = !pr.ENCERRADO_EM;
    const custos = custosDe.get(Number(pr.ID)) || [];
    const custo = custos.reduce((s, c) => s + Number(c.VALOR), 0);
    const ac = acordoDe.get(Number(pr.ID));
    if (ativo && pr.PRAZO && pr.PRAZO < hoje) {
      const d = diasEntreDatas(pr.PRAZO, hoje);
      add('prazo', d > Number(p['jur.prazoCriticoDias']) ? 'critico' : 'atencao', pr, `Prazo de ${pr.PRAZO.split('-').reverse().join('/')} (vencido há ${d} ${d === 1 ? 'dia' : 'dias'}).`);
    }
    if (ac && !['QUITADO', 'RECUSADO'].includes(ac.SITUACAO) && Number(ac.VENCIDAS) > 0) {
      add('parcela', 'critico', pr, `${Number(ac.VENCIDAS)} parcela(s) vencida(s), ${moeda(ac.VENCIDO_VALOR)}.`);
    }
    if (ac && ac.SITUACAO === 'AGUARDANDO') {
      const acima = Number(ac.VALOR) > Number(p['jur.acordoAlcadaValor']);
      add('politica', acima ? 'critico' : 'atencao', pr, `Acordo de ${moeda(ac.VALOR)} aguardando aprovação${acima ? ` (acima do valor de alçada de ${moeda(p['jur.acordoAlcadaValor'])})` : ' (fora da política)'}.`);
    }
    if (ativo && !['dossie', 'suspenso'].includes(pr.FASE) && pr.ULTIMO_ANDAMENTO_EM) {
      const d = diasEntreDatas(pr.ULTIMO_ANDAMENTO_EM, hoje);
      if (d > Number(p['jur.paradoAtencaoDias'])) add('parado', d > Number(p['jur.paradoCriticoDias']) ? 'critico' : 'atencao', pr, `${d} dias sem andamento.`);
    }
    if (ativo && custo > 0 && Number(pr.VALOR) > 0 && custo / Number(pr.VALOR) * 100 > Number(p['jur.custoMetaPct'])) {
      add('custo', 'atencao', pr, `Custo de ${pct1(custo / Number(pr.VALOR) * 100)} do valor (meta ${Number(p['jur.custoMetaPct'])}%).`);
    }
    if (ativo && pr.FASE === 'custas' && !custos.some((c) => grupoDe[c.TIPO] === 'CUSTAS')) add('custas', 'atencao', pr, 'Na etapa Custas e protocolo sem custo de custas processuais.');
    if (pr.ORIGEM === 'CARGA' && !pr.CARGA_CONFERIDA_EM) {
      if (pr.ALERTA_CARGA) add('carga', 'atencao', pr, pr.ALERTA_CARGA);
      if (!pr.CLIENTE_ID) add('carga', 'atencao', pr, pr.SUGESTAO_CLIENTES ? 'Sugestão de cliente pelo nome aguardando confirmação.' : 'Processo sem cliente vinculado.');
    }
    for (let i = 0; ac && i < Number(ac.A_CONFIRMAR || 0); i += 1) add('carga', 'atencao', pr, 'Parcela do acordo com situação a confirmar (cor da planilha).');
    if (ativo && (pr.SUBSTABELECER === true || Number(pr.SUBSTABELECER) === 1)) add('subst', 'atencao', pr, 'Substabelecimento marcado.');
    if (ativo && pr.FASE === 'suspenso') add('suspenso', 'atencao', pr, `${pr.STATUS || 'Suspenso'} · ${moeda(pr.VALOR)}.`);
    if (ativo && pr.FASE === 'dossie' && pr.DOSSIE_ABERTO_EM) {
      const d = diasEntreDatas(pr.DOSSIE_ABERTO_EM, hoje);
      if (d > Number(p['jur.dossieParadoDias'])) add('dossie', 'atencao', pr, `Dossiê aberto há ${d} dias, ${Number(pr.DOSSIE_OK)} de ${Number(pr.DOSSIE_TOTAL)} documentos.`);
    }
    if (!ativo && pr.CLIENTE_ID && ['QUITADO', 'ACORDO_CUMPRIDO'].includes(pr.MOTIVO_ENCERRAMENTO) && Number(pr.SALDO_VENCIDO) > 0) {
      add('encsaldo', 'atencao', pr, `Encerrado (${pr.MOTIVO_ENCERRAMENTO === 'QUITADO' ? 'quitado' : 'acordo cumprido'}); cliente com ${moeda(pr.SALDO_VENCIDO)} vencidos.`);
    }
    if (ativo && pr.CLIENTE_ID && !(Number(pr.SALDO_VENCIDO) > 0)) add('atvreg', 'atencao', pr, 'Cliente sem saldo vencido na cobrança.');
  }
  for (const c of dados.prontos || []) {
    if (Number(c.DIAS_ATRASO) < Number(c.REGUA_JUR)) continue;
    saida.push({ tipo: 'semdossie', nome: nomeDe.semdossie.nome, gravidade: 'critico', processoId: 0, clienteId: Number(c.CLIENTE_ID), cliente: c.NOME,
      carteira: c.CARTEIRA, texto: `${Number(c.DIAS_ATRASO)} dias de atraso, ${moeda(c.VENCIDO)} vencidos.`, acao: nomeDe.semdossie.acao });
  }
  return saida.map((a, i) => ({ ...a, i })).sort((a, b) => (a.gravidade === b.gravidade ? 0 : a.gravidade === 'critico' ? -1 : 1)
    || ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo) || a.i - b.i).map(({ i, ...a }) => a);
}

/** Indicadores (RN-023), cortes, maiores, resumo e bloco de custos. `ref` = data de referência do período (ate ou hoje). */
export function calcularIndicadores(dados, p, hoje, ref = hoje) {
  const r1 = (v) => Math.round(v * 10) / 10;
  const maior = (x, bom, ruim) => (x >= bom ? 'bom' : x <= ruim ? 'ruim' : 'atencao');
  const menor = (x, bom, ruim) => (x <= bom ? 'bom' : x >= ruim ? 'ruim' : 'atencao');
  const nP = (k) => Number(p[k]);
  const processos = dados.processos || [];
  const acordoDe = new Map((dados.acordos || []).map((a) => [Number(a.PROCESSO_ID), a]));
  const grupoDe = Object.fromEntries(TIPOS_CUSTO.map((t) => [t.codigo, t.grupo]));
  const custosDe = new Map();
  for (const c of dados.custos || []) custosDe.set(Number(c.PROCESSO_ID), [...(custosDe.get(Number(c.PROCESSO_ID)) || []), c]);
  const custoDe = (pr) => (custosDe.get(Number(pr.ID)) || []).reduce((s, c) => s + Number(c.VALOR), 0);
  const recDe = (pr) => {
    const ac = acordoDe.get(Number(pr.ID));
    const inf = pr.RECUPERADO_INFORMADO;
    if (inf !== null && inf !== undefined && inf !== '') return Number(inf);
    if (ac && Number(ac.PAGO) > 0) return Number(ac.PAGO);
    return pr.ENCERRADO_EM && pr.MOTIVO_ENCERRAMENTO === 'QUITADO' ? Number(pr.VALOR) : 0;
  };
  const soma = (xs, f) => xs.reduce((s, x) => s + Number(f(x) || 0), 0);
  const ativos = processos.filter((x) => !x.ENCERRADO_EM);
  const encerrados = processos.filter((x) => x.ENCERRADO_EM);
  const ajz = ativos.filter((x) => x.AUTOS);
  const pre = ativos.filter((x) => !x.AUTOS);
  const exe = ativos.filter((x) => x.FASE === 'execucao');
  const vAt = soma(ativos, (x) => x.VALOR);
  const rec = soma(processos, recDe);
  const custo = soma(processos, custoDe);
  const comCusto = processos.filter((x) => custoDe(x) > 0).length;
  const acordosAndamento = ativos.map((x) => acordoDe.get(Number(x.ID))).filter((a) => a && a.SITUACAO === 'ANDAMENTO');
  const aguardando = processos.map((x) => acordoDe.get(Number(x.ID))).filter((a) => a && a.SITUACAO === 'AGUARDANDO');
  const comVencida = acordosAndamento.filter((a) => Number(a.VENCIDAS) > 0);
  const semLanc = ativos.filter((x) => x.FASE === 'custas' && !(custosDe.get(Number(x.ID)) || []).some((c) => grupoDe[c.TIPO] === 'CUSTAS')).length;
  const vencidos = ativos.filter((x) => x.PRAZO && x.PRAZO < hoje).length;
  const em7 = ativos.filter((x) => x.PRAZO && x.PRAZO >= hoje && diasEntreDatas(hoje, x.PRAZO) <= 7).length;
  const conferir = processos.filter((x) => x.ORIGEM === 'CARGA' && !x.CARGA_CONFERIDA_EM && (x.ALERTA_CARGA || !x.CLIENTE_ID)).length;
  const prontos = (dados.prontos || []).filter((c) => Number(c.DIAS_ATRASO) >= Number(c.REGUA_JUR)).length;
  const comData = ajz.filter((x) => x.ULTIMO_ANDAMENTO_EM).map((x) => diasEntreDatas(x.ULTIMO_ANDAMENTO_EM, hoje));
  const diasMedios = comData.length ? Math.round(soma(comData, (d) => d) / comData.length) : 0;
  const parados = comData.filter((d) => d > 30).length;
  const anoAtual = Number(String(hoje).slice(0, 4));
  const anoDe = (x) => { const m = /^\d{7}-\d{2}\.(\d{4})\./.exec(String(x.AUTOS || '')); return m ? Number(m[1]) : 0; };
  const idades = ajz.filter((x) => anoDe(x)).map((x) => anoAtual - anoDe(x) + 0.5);
  const ajuizados = processos.filter((x) => x.AUTOS);
  const comAcordo = ajuizados.filter((x) => acordoDe.has(Number(x.ID))).length;
  const exito = encerrados.filter((x) => recDe(x) > 0).length;
  const edital = ajz.filter((x) => ['EDITAL', 'CURADOR'].includes(x.FORMA_CITACAO)).length;
  const favoraveis = processos.filter((x) => x.RESULTADO_SENTENCA === 'FAVORAVEL').length;
  const taxaRec = soma(processos, (x) => x.VALOR) > 0 ? r1(rec / soma(processos, (x) => x.VALOR) * 100) : 0;
  const custoValor = vAt > 0 ? r1(custo / vAt * 100) : 0;
  const retorno = custo > 0 ? r1(rec / custo) : 0;
  const ind = {
    '01': { valor: ajz.length, faixa: '' },
    '02': { valor: soma(ajz, (x) => x.VALOR), faixa: '', ticket: ajz.length ? Math.round(soma(ajz, (x) => x.VALOR) / ajz.length * 100) / 100 : 0, carteira: vAt },
    '03': { valor: pre.length, faixa: pre.length > ativos.length * nP('jur.indAjuizarAtencaoPct') / 100 ? 'atencao' : 'bom', total: soma(pre, (x) => x.VALOR) },
    '04': { valor: exe.length, faixa: '', total: soma(exe, (x) => x.VALOR) },
    '05': { valor: rec, faixa: 'bom' },
    '06': { valor: taxaRec, faixa: maior(taxaRec, nP('jur.indRecupBomPct'), nP('jur.indRecupRuimPct')) },
    '07': { valor: soma(acordosAndamento, (a) => a.ABERTO), faixa: '', quantidade: acordosAndamento.length },
    '08': { valor: comVencida.length, faixa: comVencida.length > 0 ? 'ruim' : 'bom', parcelas: soma(comVencida, (a) => a.VENCIDAS) },
    '09': { valor: custo, faixa: '', processos: comCusto },
    '10': { valor: custoValor, faixa: menor(custoValor, nP('jur.custoBomPct'), nP('jur.custoMetaPct')) },
    '11': { valor: retorno, faixa: custo > 0 ? maior(retorno, nP('jur.indRetornoBom'), nP('jur.indRetornoRuim')) : '' },
    '12': { valor: comCusto ? Math.round(custo / comCusto * 100) / 100 : 0, faixa: semLanc > 0 ? 'atencao' : '' },
    '13': { valor: vencidos, faixa: vencidos > 0 ? 'ruim' : 'bom' },
    '14': { valor: em7, faixa: em7 > 0 ? 'atencao' : 'bom' },
    '15': { valor: conferir, faixa: conferir > 0 ? 'atencao' : 'bom' },
    '16': { valor: prontos, faixa: prontos > 0 ? 'ruim' : 'bom' },
    '17': { valor: diasMedios, faixa: menor(diasMedios, nP('jur.indSemAndBomDias'), nP('jur.indSemAndRuimDias')) },
    '18': { valor: ajz.length ? r1(parados / ajz.length * 100) : 0, faixa: menor(ajz.length ? parados / ajz.length * 100 : 0, nP('jur.indParadosBomPct'), nP('jur.indParadosRuimPct')) },
    '19': { valor: vencidos, faixa: vencidos > 0 ? 'ruim' : 'bom' },
    '20': { valor: idades.length ? r1(soma(idades, (x) => x) / idades.length) : 0, faixa: '' },
    '21': { valor: ajuizados.length ? r1(comAcordo / ajuizados.length * 100) : 0, faixa: '' },
    '22': { valor: encerrados.length ? r1(exito / encerrados.length * 100) : 0, faixa: encerrados.length ? maior(exito / encerrados.length * 100, nP('jur.indExitoBomPct'), nP('jur.indExitoRuimPct')) : '' },
    '23': { valor: ajz.length ? r1(edital / ajz.length * 100) : 0, faixa: menor(ajz.length ? edital / ajz.length * 100 : 0, nP('jur.indEditalBomPct'), nP('jur.indEditalRuimPct')) },
    '24': { valor: favoraveis, faixa: '' },
  };
  const indicadores = INDICADORES.map((i) => ({ chave: i.chave, nome: i.nome, ...ind[i.chave] }));

  const porEtapa = FASES.filter((f) => f.chave !== 'encerrado').map((f) => {
    const xs = ativos.filter((x) => x.FASE === f.chave);
    const dias = xs.filter((x) => x.ULTIMO_ANDAMENTO_EM).map((x) => diasEntreDatas(x.ULTIMO_ANDAMENTO_EM, hoje));
    return { faseChave: f.chave, nome: f.nome, qtd: xs.length, valor: soma(xs, (x) => x.VALOR), diasMedios: dias.length ? Math.round(soma(dias, (d) => d) / dias.length) : 0,
      parados30: dias.filter((d) => d > 30).length, prazosVencidos: xs.filter((x) => x.PRAZO && x.PRAZO < hoje).length, custo: soma(xs, custoDe) };
  }).filter((e) => e.qtd > 0);
  const agrupar = (xs, chave) => {
    const m = new Map();
    for (const x of xs) { const k = chave(x); const a = m.get(k) || { rotulo: k, qtd: 0, valor: 0 }; a.qtd += 1; a.valor += Number(x.VALOR); m.set(k, a); }
    return [...m.values()].sort((a, b) => b.valor - a.valor);
  };
  const faixas = String(p['jur.faixasValor'] || '').split(';').map(Number).filter((v) => v > 0);
  const rotuloFaixa = (v) => {
    const mil = (x) => `${Math.round(x / 1000)} mil`;
    if (!faixas.length) return 'Todos';
    if (v < faixas[0]) return `Até ${mil(faixas[0])}`;
    for (let i = 1; i < faixas.length; i += 1) if (v < faixas[i]) return `${mil(faixas[i - 1])} a ${mil(faixas[i])}`;
    return `Acima de ${mil(faixas[faixas.length - 1])}`;
  };
  const faixaRotulos = faixas.length ? [rotuloFaixa(0), ...faixas.slice(1).map((f, i) => rotuloFaixa(faixas[i])), rotuloFaixa(faixas[faixas.length - 1])] : [];
  const PRE = ['dossie', 'recebido', 'peticao', 'custas'];
  const cortes = {
    filial: agrupar(ativos, (x) => x.FILIAL || 'Sem filial'),
    carteiraLinha: agrupar(ativos, (x) => (x.CARTEIRA === 'PUBLICA' ? 'Público' : `Privado · ${x.LINHA === 'GALDERMA' ? 'Galderma' : 'demais linhas'}`)),
    tribunal: agrupar(ativos, (x) => x.TRIBUNAL || (PRE.includes(x.FASE) ? 'Ainda não ajuizado' : 'Não informado')),
    faixa: faixaRotulos.map((rotulo) => { const xs = ativos.filter((x) => rotuloFaixa(Number(x.VALOR)) === rotulo); return { rotulo, qtd: xs.length, valor: soma(xs, (x) => x.VALOR) }; }),
    ano: agrupar(ajz.filter(anoDe), (x) => String(anoDe(x))).sort((a, b) => a.rotulo.localeCompare(b.rotulo)),
  };
  const maiores = [...ativos].sort((a, b) => Number(b.VALOR) - Number(a.VALOR)).slice(0, 10)
    .map((x) => ({ processoId: Number(x.ID), cliente: x.NOME_DEVEDOR, faseChave: x.FASE, filial: x.FILIAL, valor: Number(x.VALOR), custo: custoDe(x), recuperado: recDe(x), situacao: x.STATUS }));
  const concentracao = vAt > 0 ? r1(soma(maiores.slice(0, 3), (x) => x.valor) / vAt * 100) : 0;
  const resumo = [
    `Carteira judicial: ${ajz.length} processo(s) em andamento (${moeda(soma(ajz, (x) => x.VALOR))}) de ${ativos.length} ativo(s) (${moeda(vAt)}); os 3 maiores processos concentram ${String(concentracao).replace('.', ',')}% do valor.`,
    `A ajuizar: ${pre.length} (${moeda(soma(pre, (x) => x.VALOR))}).`,
    `Prazos vencidos: ${vencidos}; em 7 dias: ${em7}.`,
    `Custo lançado ${moeda(custo)}${custo > 0 ? `: para cada R$ 1 gasto, ${String(retorno).replace('.', ',')} recuperados` : ''}.`,
    ...(semLanc ? [`Custas sem lançamento: ${semLanc}.`] : []), ...(conferir ? [`Dados da carga a conferir: ${conferir}.`] : []),
    ...(prontos ? [`Clientes prontos para o Jurídico sem dossiê: ${prontos}.`] : []),
  ].join(' ');

  // Bloco de custos (RF-021).
  const custos = (dados.custos || []).map((c) => ({ ...c, GRUPO: grupoDe[c.TIPO] || 'OUTROS' }));
  const mesRef = String(ref).slice(0, 7);
  const meses = Array.from({ length: 12 }, (_, i) => { const [a, m] = mesRef.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 - (11 - i), 1)); return d.toISOString().slice(0, 7); });
  const somaPor = (xs, chave) => { const m = new Map(); for (const c of xs) m.set(chave(c), (m.get(chave(c)) || 0) + Number(c.VALOR)); return [...m.entries()].map(([rotulo, valor]) => ({ rotulo, valor })); };
  const procDe = new Map(processos.map((x) => [Number(x.ID), x]));
  const aPagar = custos.filter((c) => !(c.PAGO === true || Number(c.PAGO) === 1));
  const blocoCustos = {
    numeros: {
      total: soma(custos, (c) => c.VALOR), mes: soma(custos.filter((c) => String(c.DATA).slice(0, 7) === mesRef), (c) => c.VALOR), aPagar: soma(aPagar, (c) => c.VALOR),
      aPagarAntigo: aPagar.filter((c) => diasEntreDatas(c.DATA, hoje) > nP('jur.custoAPagarAntigoDias')).length, custoValorPct: custoValor, retorno, medio: ind['12'].valor,
      documentacaoPct: custos.length ? r1(custos.filter((c) => c.GUIA || c.COMPROVANTE).length / custos.length * 100) : 0,
      semGuia: custos.filter((c) => ['CUSTAS', 'DILIGENCIAS'].includes(c.GRUPO) && !c.GUIA).length,
      semComprovante: custos.filter((c) => (c.PAGO === true || Number(c.PAGO) === 1) && !c.COMPROVANTE).length, custasSemLancamento: semLanc,
    },
    porMesGrupo: meses.map((mes) => ({ mes, ...Object.fromEntries(['CUSTAS', 'HONORARIOS', 'DILIGENCIAS', 'OUTROS'].map((g) => [g, soma(custos.filter((c) => String(c.DATA).slice(0, 7) === mes && c.GRUPO === g), (c) => c.VALOR)])) })),
    porGrupo: somaPor(custos, (c) => c.GRUPO), porTipo: somaPor(custos, (c) => c.TIPO),
    porFilial: somaPor(custos, (c) => (procDe.get(Number(c.PROCESSO_ID)) || {}).FILIAL || 'Sem filial'),
    porBu: somaPor(custos, (c) => (procDe.get(Number(c.PROCESSO_ID)) || {}).BU_NOME || 'Sem BU'),
    porEtapa: somaPor(custos, (c) => (procDe.get(Number(c.PROCESSO_ID)) || {}).FASE || ''),
    porProcesso: processos.filter((x) => custoDe(x) > 0).map((x) => ({ processoId: Number(x.ID), cliente: x.NOME_DEVEDOR, custo: custoDe(x), valor: Number(x.VALOR),
      pct: Number(x.VALOR) > 0 ? r1(custoDe(x) / Number(x.VALOR) * 100) : 0, recuperado: recDe(x) })).sort((a, b) => b.custo - a.custo),
  };
  blocoCustos.maiores = blocoCustos.porProcesso.slice(0, 10);
  blocoCustos.custoRecuperado = [...blocoCustos.porProcesso].sort((a, b) => b.recuperado - a.recuperado).slice(0, 8);
  return {
    indicadores, acordosAguardando: { quantidade: aguardando.length, valor: soma(aguardando, (a) => a.VALOR) },
    porEtapa, cortes, maiores, concentracao, resumo, custos: blocoCustos,
  };
}

export const FONTE = [diasEntreDatas, moeda, pct1, calcularAlertas, calcularIndicadores].map(String).join('\n');
