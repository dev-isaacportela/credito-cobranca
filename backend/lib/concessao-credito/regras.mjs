// Regras puras da 004 (alçadas, pedido, risco do cliente, encaminhamento, prazo, farol). Entram no corpo
// das SFs JAVASCRIPT por `FONTE` (toString) e são importadas pelo smoke: cada função é autocontida.
// `p` = `{ 'grupo.chave': valor }` da carteira.

/** RN-002: data de abertura + ⌈horas ÷ 24⌉ dias (AAAA-MM-DD). */
export function prazoDecisao(criadoEm, slaHoras) {
  const [a, m, d] = String(criadoEm).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + Math.ceil(Number(slaHoras) / 24))).toISOString().slice(0, 10);
}

/** Carteira com motor da 004 (D-05): tudo menos a Pública. */
export function temMotorProprio(carteira) {
  return carteira !== 'PUBLICA';
}

/**
 * RN-008 e RN-010: alçada da concessão. `s` = { carteira, valor, limiteProposto, motorLimite, motorResultado,
 * ajusteSituacao, cnpjAbertura, tipoCliente, fatMensal, hoje, exposicao (só Pública) }; `limiteAprovado` 0 = sem decisão.
 * Igual ao fragmento NIVEL_CONCESSAO de sql.mjs.
 */
/** Faixa da concessão e da renovação pelo valor, sem exceção (03 §7; igual a FAIXA_CONCESSAO de sql.mjs). */
export function faixaConcessao(valor, p) {
  const v = Number(valor) || 0;
  if (v <= Number(p['alcada.concSupervisor'])) return { nivel: Number(p['alcada.nivelSupervisor']), rotulo: 'Supervisor' };
  if (v <= Number(p['alcada.concGerente'])) return { nivel: Number(p['alcada.nivelGerente']), rotulo: 'Gerente' };
  if (Number(p['alcada.concRegional']) > Number(p['alcada.concGerente']) && v <= Number(p['alcada.concRegional'])) {
    return { nivel: Number(p['alcada.nivelComiteRegional']), rotulo: 'Comitê regional' };
  }
  return { nivel: Number(p['alcada.nivelComiteExecutivo']), rotulo: String(p['alcada.concRotuloTopo']) };
}

export function alcadaConcessao(s, limiteAprovado, p) {
  const aprovado = Number(limiteAprovado) || 0;
  const proposto = Number(s.limiteProposto) || 0;
  const valor = Math.max(proposto, aprovado) > 0 ? Math.max(proposto, aprovado) : Number(s.valor) || 0;
  let { nivel, rotulo } = faixaConcessao(valor, p);
  const motivos = [];
  const comparado = aprovado > 0 ? aprovado : proposto;
  if (s.carteira !== 'PUBLICA') {
    if (comparado > (Number(s.motorLimite) || 0)) motivos.push('limite acima do sugerido pelo motor');
    if (s.ajusteSituacao === 'APROVADO') motivos.push('rating ajustado');
    if (s.motorResultado === 'EXCECAO_GARANTIA' || s.motorResultado === 'COMITE_CONCENTRACAO') motivos.push('resultado do motor leva ao comitê');
    if (s.cnpjAbertura && s.hoje) {
      const [a1, m1, d1] = String(s.cnpjAbertura).slice(0, 10).split('-').map(Number);
      const [a2, m2, d2] = String(s.hoje).slice(0, 10).split('-').map(Number);
      if ((a2 * 12 + m2) - (a1 * 12 + m1) - (d2 < d1 ? 1 : 0) < Number(p['limite.fraudeMeses'])) motivos.push('CNPJ recente');
    }
    if (s.tipoCliente === 'NOVO' && Number(s.fatMensal) > 0 && Number(s.valor) > Number(s.fatMensal) * Number(p['limite.fraudePct']) / 100) motivos.push('pedido inicial alto');
  } else if (s.exposicao !== null && s.exposicao !== undefined && aprovado > Number(s.exposicao)) {
    motivos.push('limite acima da exposição do motor do órgão');
  }
  if (motivos.length) {
    const nc = Number(p['alcada.nivelComiteCredito']);
    if (nc >= nivel) { nivel = nc; rotulo = 'Comitê de crédito'; }
  }
  return { nivel, rotulo, valor, excecao: motivos.length > 0, motivos };
}

/** RN-027: excesso do pedido. */
export function excessoPedido(limite, utilizado, valor) {
  const excesso = Math.max(0, Math.round((Number(utilizado) + Number(valor) - Number(limite)) * 100) / 100);
  const pct = Number(limite) > 0 ? Math.round((excesso / Number(limite)) * 10000) / 100 : 100;
  return { excesso, pct };
}

/** RN-027: alçada do pedido, primeira condição que casar (03 §7). */
export function alcadaPedido(excesso, pct, atraso, p) {
  const comite = { nivel: Number(p['alcada.nivelComiteCredito']), rotulo: 'Comitê de crédito', critica: true };
  if (Number(atraso) > Number(p['alcada.pedAtrasoComiteDias'])) return comite;
  if (pct <= Number(p['alcada.pedSupPct']) && excesso <= Number(p['alcada.pedSupValor'])) return { nivel: Number(p['alcada.nivelSupervisor']), rotulo: 'Supervisor', critica: false };
  if (pct <= Number(p['alcada.pedGerPct'])) return { nivel: Number(p['alcada.nivelGerente']), rotulo: 'Gerente', critica: false };
  if (pct <= Number(p['alcada.pedDirPct'])) return { nivel: Number(p['alcada.nivelDiretorFinanceiro']), rotulo: 'Diretor financeiro', critica: true };
  return comite;
}

const ORDEM_RATING = ['AA', 'A', 'B', 'C', 'D', 'E'];

/** RN-022: rating atual = motor; o ajuste aprovado vale enquanto o motor der a faixa da fotografia. */
export function ratingAtual(ratingMotorHoje, s) {
  if (s && s.AJUSTE_SITUACAO === 'APROVADO' && s.RATING_AJUSTE && ratingMotorHoje === s.RATING_MOTOR) return s.RATING_AJUSTE;
  return ratingMotorHoje || '';
}

/** RN-032: criticidade. `e` = { diasAtraso, pontualidade, scoreSerasa, usoPct, prazoMedio, rating, rebaixado }. */
export function criticidade(e, p) {
  const alertas = [];
  const criticos = [];
  const sinal = (critico, alerta, texto) => { if (critico) criticos.push(texto); else if (alerta) alertas.push(texto); };
  const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const atraso = n(e.diasAtraso) || 0;
  sinal(atraso >= Number(p['crit.atrasoCritico']), atraso >= Number(p['crit.atrasoAlerta']), `Atraso de ${atraso} dias`);
  const pont = n(e.pontualidade);
  if (pont !== null) sinal(pont < Number(p['crit.pontCritico']), pont < Number(p['crit.pontAlerta']), `Pontualidade de ${pont}%`);
  const score = n(e.scoreSerasa);
  if (score !== null) sinal(score < Number(p['crit.scoreCritico']), score < Number(p['crit.scoreAlerta']), `Score Serasa ${score}`);
  const uso = n(e.usoPct);
  if (uso !== null) sinal(uso >= Number(p['crit.usoCritico']), uso >= Number(p['crit.usoAlerta']), `Uso do limite de ${uso}%`);
  const prazo = n(e.prazoMedio) || 0;
  sinal(prazo > Number(p['crit.prazoCritico']), prazo > Number(p['crit.prazoAlerta']), `Prazo médio de ${prazo} dias`);
  const r = ORDEM_RATING.indexOf(String(e.rating || ''));
  if (r >= 0) sinal(r >= ORDEM_RATING.indexOf(String(p['crit.ratingCritico'])), r >= ORDEM_RATING.indexOf(String(p['crit.ratingAlerta'])), `Rating atual ${e.rating}`);
  if (e.rebaixado) sinal(r >= ORDEM_RATING.indexOf('C'), true, 'Faixa rebaixada por alerta');
  if (criticos.length) return { nivel: 'CRITICO', motivos: criticos.concat(alertas) };
  if (alertas.length >= Number(p['crit.alertasParaCritico'])) return { nivel: 'CRITICO', motivos: [`${alertas.length} sinais de alerta ao mesmo tempo`, ...alertas] };
  if (alertas.length) return { nivel: 'ALERTA', motivos: alertas };
  return { nivel: 'NORMAL', motivos: [] };
}

/** RN-029: saúde do crédito aprovado. `e` = { diasAtraso, usoPct, validadeVencida }. */
export function saude(e, p) {
  const atraso = Number(e.diasAtraso) || 0;
  if (atraso > Number(p['saude.riscoDias'])) return { saude: 'RISCO', sinais: [`Atraso de ${atraso} dias`] };
  const sinais = [];
  if (atraso >= 1) sinais.push(`Atraso de ${atraso} dias`);
  if (e.usoPct !== null && e.usoPct !== undefined && Number(e.usoPct) >= Number(p['saude.usoAtencaoPct'])) sinais.push(`Uso do limite de ${Number(e.usoPct)}%`);
  if (e.validadeVencida) sinais.push('Validade vencida');
  return { saude: sinais.length ? 'ATENCAO' : 'SAUDAVEL', sinais };
}

/** RN-029: índice de saúde (null sem aprovadas) e a cor pela meta. */
export function indiceSaude(saudaveis, total, p) {
  if (!Number(total)) return { indice: null, cor: '' };
  const indice = Math.round((Number(saudaveis) / Number(total)) * 10000) / 100;
  return { indice, cor: indice >= Number(p['saude.indiceVerde']) ? 'VERDE' : (indice < Number(p['saude.indiceVermelho']) ? 'VERMELHO' : 'AMARELO') };
}

/** RN-030: classe de risco pelo corte. */
export function classeRisco(ratingConcessao, ratingAtualHoje, corte) {
  const c = ORDEM_RATING.indexOf(String(ratingConcessao || ''));
  const a = ORDEM_RATING.indexOf(String(ratingAtualHoje || ''));
  const k = ORDEM_RATING.indexOf(String(corte));
  if (c >= k && c >= 0) return 'ACEITO';
  if (c >= 0 && a >= k) return 'NAO_PREVISTO';
  return '';
}

/**
 * RN-026: flexibilização. `e` = { rating, limite, vencido, pontualidade, bloqueado, validadeVencida, rebaixado,
 * temScore, disponivel (concentração; null = sem teto) }.
 */
export function flexibilizacao(e, p) {
  const r = String(e.rating || '');
  const pct = r === 'AA' ? Number(p['flex.riscoMinimoPct']) : (r === 'A' ? Number(p['flex.riscoBaixoPct']) : 0);
  const motivos = [];
  if (!pct) motivos.push(r ? `faixa ${r} não permite flexibilizar` : 'sem faixa');
  if (Number(e.vencido) > 0) motivos.push('títulos vencidos em aberto');
  if (e.pontualidade !== null && e.pontualidade !== undefined && e.pontualidade !== '' && Number(e.pontualidade) < Number(p['crit.pontAlerta'])) motivos.push('pontualidade abaixo da meta');
  if (e.bloqueado) motivos.push('bloqueio da régua de cobrança');
  if (e.validadeVencida) motivos.push('validade vencida');
  if (e.rebaixado) motivos.push('faixa rebaixada por alerta');
  if (e.temScore === false) motivos.push('sem score');
  if (motivos.length) return { pct: 0, valor: 0, motivos };
  let valor = Math.round((Number(e.limite) * pct / 100) / 1000) * 1000;
  if (e.disponivel !== null && e.disponivel !== undefined) valor = Math.min(valor, Math.max(0, Number(e.disponivel) - Number(e.limite)));
  return { pct, valor, motivos: [] };
}

/** RN-039: gatilhos de revisão. `e` = { diasAtraso, usoPct, negativacao, fimValidade, hoje }. */
export function gatilhos(e, p) {
  const lista = [];
  if ((Number(e.diasAtraso) || 0) >= Number(p['cred.revAtrasoDias'])) lista.push('ATRASO');
  if (e.usoPct !== null && e.usoPct !== undefined && Number(e.usoPct) >= Number(p['cred.revUsoPct'])) lista.push('USO');
  if (e.negativacao) lista.push('NEGATIVACAO');
  if (e.fimValidade && e.hoje) {
    const ms = (d) => { const [a, m, x] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(a, m - 1, x); };
    if ((ms(e.fimValidade) - ms(e.hoje)) / 86400000 <= Number(p['cred.revValidadeDias'])) lista.push('VALIDADE');
  }
  return lista;
}

/** RN-016 da 002: chance de atraso. */
export function probAtraso(pontualidade, vencido, p) {
  const sem = pontualidade === null || pontualidade === undefined || pontualidade === '';
  let v = sem ? Number(p['cob.probSemHistorico'] ?? 5) : 100 - Number(pontualidade);
  if (Number(vencido) > 0) v = Math.max(v, Number(p['cob.probPisoAtraso'] ?? 50));
  return Math.min(v, Number(p['cob.probTeto'] ?? 95));
}

/**
 * RN-024: destino no encaminhamento. `e` = { fimValidade, inicioValidade, ultimaCompra, comprasQtd, hoje }.
 * Devolve { destino: '' | 'REANALISE' | 'OBSOLETO', motivo }.
 */
export function destinoCredito(e, p) {
  const ms = (d) => { const [a, m, x] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(a, m - 1, x); };
  const ref = e.ultimaCompra || e.inicioValidade;
  const semCompra = Math.round((ms(e.hoje) - ms(ref)) / 86400000);
  const br = (d) => String(d).slice(0, 10).split('-').reverse().join('/');
  if (semCompra >= Number(p['cred.diasSemCompra'])) {
    return { destino: 'OBSOLETO', motivo: e.ultimaCompra ? `Sem compras há ${semCompra} dias, última em ${br(e.ultimaCompra)}` : `Sem compras há ${semCompra} dias` };
  }
  if (String(e.fimValidade) < String(e.hoje)) {
    const n = Number(e.comprasQtd) || 0;
    if (n >= Number(p['cred.comprasRecorrentes'])) return { destino: 'REANALISE', motivo: `Validade vencida: reanálise (${n} compras no período)` };
    return { destino: 'OBSOLETO', motivo: `${n} compra${n === 1 ? '' : 's'} no período` };
  }
  return { destino: '', motivo: '' };
}

/**
 * RN-033: leitura do farol. `faixas` = { AA: { saldo, vencido }, … } (soma das fotos); `meses` de base.
 * Devolve { leituras: [{ faixa, indice, esperado, leitura }], aviso, mesesDeBase } ou null sem foto.
 */
export function leituraFarol(faixas, meses, p) {
  if (!Number(meses)) return null;
  const ordem = ['AA', 'A', 'B', 'C', 'D', 'E'];
  const indice = (f) => (faixas[f] && Number(faixas[f].saldo) > 0 ? Math.round((Number(faixas[f].vencido) / Number(faixas[f].saldo)) * 10000) / 100 : null);
  const leituras = ordem.map((f, i) => {
    const esperado = p[`farol.${f.toLowerCase()}Inad`] === undefined ? null : Number(p[`farol.${f.toLowerCase()}Inad`]);
    const idx = indice(f);
    let leitura;
    if (f === 'D' || f === 'E') leitura = 'Faixa sem crédito a prazo';
    else if (idx === null) leitura = 'Sem carteira';
    else {
      const proxima = ordem.slice(i + 1, 4).map(indice).find((x) => x !== null);
      if (proxima !== undefined && idx > proxima) leitura = 'Fora da ordem';
      else if (esperado !== null && idx > esperado) leitura = 'Acima do esperado: revisar o corte';
      else leitura = 'Dentro do esperado';
    }
    return { faixa: f, indice: idx, esperado, leitura };
  });
  const min = Number(p['cred.calibMinMeses']);
  const aviso = Number(meses) < min ? `Base de ${meses} de ${min} meses: leitura ainda não conclusiva` : '';
  return { leituras, aviso, mesesDeBase: Number(meses) };
}

export const FUNCOES_REGRAS = [prazoDecisao, temMotorProprio, faixaConcessao, alcadaConcessao, excessoPedido, alcadaPedido, ratingAtual, criticidade, saude,
  indiceSaude, classeRisco, flexibilizacao, gatilhos, probAtraso, destinoCredito, leituraFarol];
export const FONTE = `const ORDEM_RATING = ${JSON.stringify(ORDEM_RATING)};\n${FUNCOES_REGRAS.map(String).join('\n')}`;
