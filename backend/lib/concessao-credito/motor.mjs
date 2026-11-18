// Motor de crédito da 004 (RN-011 a RN-021): função pura `motor(entradas, p)`.
// Entra no corpo das SFs JAVASCRIPT por `FONTE` (toString) e é importada pelo smoke: uma implementação só
// (D-001). Cada função é autocontida — só usa as outras deste arquivo e as de regras.mjs que também vão
// na FONTE. `p` = `{ 'grupo.chave': valor }` da carteira (parametros() do preâmbulo).
//
// entradas: { tipoCliente, tipoPessoa, scoreSerasa (null = não informado; 0 vale), pontualidade (null),
//   diasAtraso, compraMedia, prazoMedio, fatMensal, pl, ac, pc, divida, ebitda, garantia, alertas (lista de
//   NEGATIVACAO | DADOS | PEDIDO), consultas { data, receita, protesto, processo, socios }, cnpjAbertura,
//   fpTipo, fpPrazoDias, valor, carteiraLimites (null = sem concentração), exposicaoGrupo, hoje,
//   docsAtendidos ({ codigo: true }) }

const FAIXAS_MOTOR = ['AA', 'A', 'B', 'C', 'D', 'E'];

export function arredMilhar(v) {
  return Math.round(Number(v) / 1000) * 1000;
}

/** Meses completos de `de` até `ate` (AAAA-MM-DD). Igual ao fragmento MESES_ENTRE de sql.mjs. */
export function mesesEntre(de, ate) {
  const [a1, m1, d1] = String(de).slice(0, 10).split('-').map(Number);
  const [a2, m2, d2] = String(ate).slice(0, 10).split('-').map(Number);
  return (a2 * 12 + m2) - (a1 * 12 + m1) - (d2 < d1 ? 1 : 0);
}

/** Dias corridos de `de` até `ate` (AAAA-MM-DD). */
export function diasEntreDatas(de, ate) {
  const ms = (d) => { const [a, m, x] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(a, m - 1, x); };
  return Math.round((ms(ate) - ms(de)) / 86400000);
}

export function faixaPorScore(score, p) {
  if (score === null || score === undefined) return null;
  if (score >= p['farol.scoreAA']) return 'AA';
  if (score >= p['farol.scoreA']) return 'A';
  if (score >= p['farol.scoreB']) return 'B';
  if (score >= p['farol.scoreC']) return 'C';
  return 'D';
}

export function faixaPorAtraso(dias, p) {
  const d = Number(dias) || 0;
  if (d <= 0) return 'AA';
  if (d <= p['farol.atrasoA']) return 'A';
  if (d <= p['farol.atrasoB']) return 'B';
  if (d <= p['farol.atrasoC']) return 'C';
  if (d <= p['farol.atrasoD']) return 'D';
  return 'E';
}

/** RN-011: as quatro consultas feitas (sócios só para PJ) e a data dentro da validade. */
export function consultasValidas(c, tipoPessoa, hoje, p) {
  if (!c || !c.data) return false;
  const feitas = ['receita', 'protesto', 'processo', ...(tipoPessoa === 'F' ? [] : ['socios'])]
    .every((k) => c[k] && c[k] !== 'NAO_CONSULTADO');
  return feitas && diasEntreDatas(c.data, hoje) <= Number(p['limite.consultaValidadeDias']);
}

/** RN-013: índices da análise financeira. */
export function indicesFinanceiros(e) {
  const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const ac = n(e.ac); const pc = n(e.pc); const pl = n(e.pl); const div = n(e.divida); const eb = n(e.ebitda);
  return {
    lc: ac !== null && pc ? Math.round((ac / pc) * 100) / 100 : null,
    divEbitda: div !== null && eb ? Math.round((div / eb) * 10) / 10 : null,
    divPl: div !== null && pl ? Math.round((div / pl) * 100) / 100 : null,
  };
}

/** RN-018 (com RN-011 e RN-013): alertas manuais e automáticos. Cada um rebaixa uma faixa (RN-017). */
export function alertasDoMotor(e, p) {
  const lista = [];
  const add = (codigo, texto, tipo) => lista.push({ codigo, texto, tipo });
  const manuais = { NEGATIVACAO: 'Negativação', DADOS: 'Dados inconsistentes', PEDIDO: 'Pedido fora da realidade' };
  for (const a of e.alertas || []) if (manuais[a]) add(a, manuais[a], 'manual');
  const c = e.consultas || {};
  if (c.receita === 'IRREGULAR') add('RECEITA', 'Situação irregular na Receita', 'consulta');
  if (c.protesto === 'COM') add('PROTESTO', 'Com protesto', 'consulta');
  if (c.processo === 'COM') add('PROCESSO', 'Com processo relevante', 'consulta');
  if (c.socios === 'COM') add('SOCIOS', 'Sócios com restrição', 'consulta');
  if (e.cnpjAbertura && e.hoje && mesesEntre(e.cnpjAbertura, e.hoje) < Number(p['limite.fraudeMeses'])) {
    add('CNPJ_RECENTE', `CNPJ aberto há menos de ${p['limite.fraudeMeses']} meses`, 'fraude');
  }
  const fat = Number(e.fatMensal) || 0;
  if (e.tipoCliente === 'NOVO' && fat > 0 && Number(e.valor) > fat * Number(p['limite.fraudePct']) / 100) add('PEDIDO_ALTO', 'Pedido inicial alto', 'fraude');
  const ind = indicesFinanceiros(e);
  if (ind.lc !== null && ind.lc < Number(p['limite.lcMin'])) add('LIQUIDEZ', `Liquidez corrente abaixo de ${p['limite.lcMin']}`, 'financeiro');
  const div = e.divida === null || e.divida === undefined || e.divida === '' ? null : Number(e.divida);
  const eb = e.ebitda === null || e.ebitda === undefined || e.ebitda === '' ? null : Number(e.ebitda);
  if (div !== null && eb !== null && div > Number(p['limite.divEbitdaMax']) * eb) add('DIVIDA', `Dívida acima de ${p['limite.divEbitdaMax']}× o EBITDA`, 'financeiro');
  if (e.pl !== null && e.pl !== undefined && e.pl !== '' && Number(e.pl) <= 0) add('PL', 'Patrimônio líquido negativo ou zero', 'financeiro');
  return lista;
}

/** RN-015: score comportamental (null = não há). */
export function scoreComportamental(e, p) {
  const temPont = e.pontualidade !== null && e.pontualidade !== undefined && e.pontualidade !== '';
  if (!temPont && e.tipoCliente === 'NOVO') return null;
  let s = temPont ? Math.min(Number(e.pontualidade), 100) * 10 : Number(p['score.semHistorico']);
  s -= Math.min((Number(e.diasAtraso) || 0) * Number(p['score.penalDia']), Number(p['score.penalMax']));
  if (e.tipoCliente === 'RECORRENTE') s += Number(p['score.bonusRecorrente']);
  if (e.tipoCliente === 'INATIVO') s -= Number(p['score.penalInativo']);
  return Math.round(Math.max(0, Math.min(1000, s)));
}

/** RN-016: score final (null sem Serasa; 0 é score válido). */
export function scoreFinal(serasa, comp, p) {
  if (serasa === null || serasa === undefined || serasa === '') return null;
  if (comp === null || comp === undefined) return Number(serasa);
  const peso = Number(p['limite.pesoSerasa']) / 100;
  return Math.round(peso * Number(serasa) + (1 - peso) * comp);
}

/** RN-012: documentos exigidos pela faixa de valor; `atendidos` = { codigo: true }. */
export function docsExigidos(e, p, atendidos = {}) {
  const pj = e.tipoPessoa !== 'F';
  const valor = Number(e.valor) || 0;
  const lista = [
    ['SERASA', 'Relatório Serasa'], ['PROTESTOS', 'Pesquisa de protestos'], ['PROCESSOS', 'Consulta de processos'],
    ...(pj ? [['CNPJ', 'Comprovante do CNPJ (Receita)'], ['SOCIOS', 'Consulta dos sócios']] : []),
    ...(valor > Number(p['limite.docF1']) ? [['FATURAMENTO', 'Comprovante de faturamento']] : []),
    ...(valor > Number(p['limite.docF2']) ? [['BALANCO', 'Balanço / DRE']] : []),
    ...(String(e.garantia || '') !== '' && e.garantia !== 'Sem garantia' ? [['GARANTIA', 'Garantia (aval, promissória, fiança)']] : []),
    ['FICHA', 'Ficha de contatos do cliente em dia'],
  ];
  return lista.map(([codigo, nome]) => ({ codigo, nome, atendido: !!atendidos[codigo] }));
}

/** RN-014: avisos da fonte pagadora (não rebaixam). */
export function avisosFonte(e, p) {
  const t = String(e.fpTipo || '');
  if (!t) return ['Fonte pagadora não informada: informe de onde vem o dinheiro.'];
  const avisos = [];
  if ((Number(e.fpPrazoDias) || 0) > (Number(e.prazoMedio) || 0) + Number(p['limite.fonteDescasDias'])) avisos.push('Fonte pagadora com descasamento de prazo.');
  if (t === 'SUS') avisos.push('SUS: depende de repasse público, sujeito a atrasos.');
  if (t === 'OPERADORA') avisos.push('Operadora: sujeito a glosas e atraso das operadoras.');
  return avisos;
}

/** RN-019: limite pela política, antes da concentração. null = sem base de cálculo. */
export function limitePolitica(e, faixa, p) {
  const prazo = Math.max(Number(e.prazoMedio) || 0, 30);
  const fat = Number(e.fatMensal) || 0;
  const compra = Number(e.compraMedia) || 0;
  let base = compra > 0 ? compra * prazo / 30 * Number(p['limite.folga']) : (fat > 0 ? fat * Number(p['limite.novoPct']) / 100 : null);
  if (base === null) return null;
  let como = compra > 0 ? `compra média × ${prazo} dias ÷ 30 × ${p['limite.folga']}` : `${p['limite.novoPct']}% do faturamento`;
  if (e.pl !== null && e.pl !== undefined && e.pl !== '') {
    const tetoPl = Math.max(0, Number(e.pl) * Number(p['limite.plPct']) / 100);
    if (base > tetoPl) { base = tetoPl; como += `, limitada a ${p['limite.plPct']}% do PL`; }
  }
  const tetoFat = (pct) => (fat > 0 ? fat * Number(pct) / 100 : Infinity);
  if (!faixa) {
    const v = arredMilhar(Math.min(base, tetoFat(p['limite.tetoPct'])));
    return { base: arredMilhar(base), minimo: v, maximo: v, como: `${como} (sem score)` };
  }
  if (faixa === 'D' || faixa === 'E') return { base: arredMilhar(base), minimo: 0, maximo: 0, como: `faixa ${faixa}: sem crédito a prazo` };
  const f = faixa.toLowerCase();
  const teto = tetoFat(p[`farol.${f}Teto`]);
  return {
    base: arredMilhar(base),
    minimo: arredMilhar(Math.min(base * Number(p[`farol.${f}Fmin`]) / 100, teto)),
    maximo: arredMilhar(Math.min(base * Number(p[`farol.${f}Fmax`]) / 100, teto)),
    como: `${como}; faixa ${faixa}: ${p[`farol.${f}Fmin`]}% a ${p[`farol.${f}Fmax`]}% da base, teto ${p[`farol.${f}Teto`]}% do faturamento`,
  };
}

/** RN-020: concentração. `carteiraLimites` null = não se aplica (simulação sem carteira). */
export function concentracao(maximo, e, p) {
  const tetoPct = Number(p['limite.concMax']);
  if (e.carteiraLimites === null || e.carteiraLimites === undefined) return { tetoPct, teto: null, exposicaoGrupo: 0, disponivel: null, reduzido: false };
  const teto = Math.round((Number(e.carteiraLimites) + maximo) * tetoPct) / 100;
  const exposicaoGrupo = Number(e.exposicaoGrupo) || 0;
  const disponivel = Math.max(0, Math.round((teto - exposicaoGrupo) * 100) / 100);
  return { tetoPct, teto, exposicaoGrupo, disponivel, reduzido: maximo > disponivel };
}

const fmtMilhar = (v) => Math.round(Number(v)).toLocaleString('pt-BR');

/** RN-011 a RN-021: o motor inteiro. */
export function motor(e, p) {
  const alertas = alertasDoMotor(e, p);
  const scoreComp = scoreComportamental(e, p);
  const score = scoreFinal(e.scoreSerasa, scoreComp, p);
  const faixaScore = faixaPorScore(score, p);
  const faixaAtraso = faixaPorAtraso(e.diasAtraso, p);
  let rating = null;
  let rebaixado = false;
  if (faixaScore) {
    const pior = Math.max(FAIXAS_MOTOR.indexOf(faixaScore), FAIXAS_MOTOR.indexOf(faixaAtraso));
    const final = Math.min(pior + alertas.length, FAIXAS_MOTOR.length - 1);
    rebaixado = final > pior;
    rating = FAIXAS_MOTOR[final];
  }
  const politica = limitePolitica(e, rating, p);
  let limite = politica ? { ...politica } : { base: null, minimo: 0, maximo: 0, como: 'sem base de cálculo' };
  const conc = concentracao(limite.maximo, e, p);
  let zeradoConc = false;
  if (politica && conc.reduzido) {
    const novo = Math.floor(conc.disponivel / 1000) * 1000;
    zeradoConc = limite.maximo > 0 && novo === 0;
    limite = { ...limite, maximo: novo, minimo: Math.min(limite.minimo, novo), como: `${limite.como}; reduzido pela concentração` };
  }
  const temGarantia = String(e.garantia || '') !== '' && e.garantia !== 'Sem garantia';
  const valor = Number(e.valor) || 0;
  let codigo;
  let resultado;
  if (!politica || score === null) { codigo = 'DADOS_INSUFICIENTES'; resultado = 'Dados insuficientes'; }
  else if (rating === 'E' || (rating === 'D' && !temGarantia)) { codigo = 'NEGAR'; resultado = 'Negar a prazo: somente à vista'; }
  else if (rating === 'D') { codigo = 'EXCECAO_GARANTIA'; resultado = 'Exceção com garantia: levar ao comitê'; }
  else if (zeradoConc) { codigo = 'COMITE_CONCENTRACAO'; resultado = 'Levar ao comitê: concentração'; }
  else if (valor <= limite.maximo) { codigo = 'APROVAR'; resultado = 'Aprovar'; }
  else {
    codigo = 'APROVAR_LIMITE';
    const acima = limite.maximo > 0 ? Math.round(((valor - limite.maximo) / limite.maximo) * 100) : 100;
    resultado = `Aprovar com limite de R$ ${fmtMilhar(limite.maximo)} (solicitado ${acima}% acima do motor)`;
  }
  const docs = docsExigidos(e, p, e.docsAtendidos || {});
  const faltam = docs.filter((d) => !d.atendido);
  if (codigo === 'APROVAR' && faltam.length) resultado = `Aprovar (faltam documentos: ${faltam.map((d) => d.nome).join(', ')})`;
  const avisos = avisosFonte(e, p);
  if (rating && !['D', 'E'].includes(rating)) {
    const max = Number(p[`farol.${rating.toLowerCase()}Prazo`]);
    if ((Number(e.prazoMedio) || 0) > max) avisos.push(`Prazo de ${Number(e.prazoMedio)} dias acima do máximo da faixa (${max})`);
  }
  const excecao = codigo === 'EXCECAO_GARANTIA' || codigo === 'COMITE_CONCENTRACAO' || alertas.some((a) => a.tipo === 'fraude');
  const podeAprovar = rating !== null;
  return {
    rating, limiteSugerido: limite.maximo, resultado, codigo, score, alertas: alertas.map((a) => a.texto),
    detalhes: {
      scoreComp, faixaScore, faixaAtraso, rebaixado, alertas, limite, concentracao: conc,
      indices: indicesFinanceiros(e), docs, avisos, excecao, podeAprovar,
    },
    podeAprovar, motivoNaoAprovar: podeAprovar ? '' : resultado,
  };
}

export const FUNCOES_MOTOR = [arredMilhar, mesesEntre, diasEntreDatas, faixaPorScore, faixaPorAtraso, consultasValidas,
  indicesFinanceiros, alertasDoMotor, scoreComportamental, scoreFinal, docsExigidos, avisosFonte, limitePolitica, concentracao, motor];
export const FONTE = `const FAIXAS_MOTOR = ${JSON.stringify(FAIXAS_MOTOR)};\nconst fmtMilhar = ${fmtMilhar};\n${FUNCOES_MOTOR.map(String).join('\n')}`;
