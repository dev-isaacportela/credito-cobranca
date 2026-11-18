// Motor do órgão (005 RN-009 a RN-016): nota 0–100, rating P1–P4, exposição e decisão sugerida.
// Puras e autocontidas: entram no corpo das SFs JAVASCRIPT por `FONTE` (toString) e no teste.
// `p` = { 'pubMotor.chave': número } (parametros('PUBLICA')); `a` = a análise em camelCase (ver `motorOrgao`).

/** RN-011: capacidade financeira sugerida pela CAPAG. */
export function capacidadeSugerida(capag) {
  if (capag === 'A' || capag === 'UNIAO') return 'ALTA';
  if (capag === 'B') return 'MEDIA';
  if (capag === 'C' || capag === 'D') return 'BAIXA';
  return '';
}

/** RN-013: a partir de 1º de maio do último ano do mandato (estadual/federal 2026, 2030…; municipal 2028, 2032…). */
export function fimMandato(esfera, hoje) {
  const ano = Number(String(hoje).slice(0, 4));
  const ultimo = esfera === 'MUNICIPAL' ? (ano - 2028) % 4 === 0 : (esfera === 'ESTADUAL' || esfera === 'FEDERAL') && (ano - 2026) % 4 === 0;
  return ultimo && String(hoje).slice(5, 10) >= '05-01';
}

/** RN-005: aprovar exige base CONTRATO, saldo > 0 e vigência ≥ hoje. */
export function podeAprovar(a, hoje) {
  if (a.base !== 'CONTRATO') return { pode: false, motivo: 'Sem contrato ativo: aprovar exige a base "Saldo de contrato ativo"; com o edital, só pré-aprovar ou recusar.' };
  if (!a.vigenciaFim || String(a.vigenciaFim) < String(hoje)) {
    const fim = a.vigenciaFim ? String(a.vigenciaFim).slice(0, 10).split('-').reverse().join('/') : '';
    return { pode: false, motivo: fim ? `A vigência do contrato terminou em ${fim}: só recusar.` : 'Informe a vigência do contrato.' };
  }
  if (!(Number(a.saldoContrato) > 0)) return { pode: false, motivo: 'O contrato não tem saldo: só recusar.' };
  return { pode: true, motivo: '' };
}

/**
 * RN-010 a RN-016. `a` = { esfera, capag, pessoalPct (null = não informado), cauc, fonteTipo, perfilPag,
 * atrasoMedio (null = sem histórico), empenhoPrevio, contratoVigente, base, valorEstimado, saldoContrato,
 * vigenciaFim, valorSolicitado }.
 */
export function motorOrgao(a, p, hoje) {
  const n = (k) => Number(p[`pubMotor.${k}`]);
  const esfera = a.esfera || '';
  const federal = esfera === 'FEDERAL';
  const capag = { A: n('capagA'), B: n('capagB'), C: n('capagC'), D: n('capagD'), ND: n('capagNd'), UNIAO: n('capagUniao') }[a.capag]
    ?? (federal ? n('capagSemFed') : n('capagSem'));
  const limite = { MUNICIPAL: n('limPessoalMun'), ESTADUAL: n('limPessoalEst'), FEDERAL: n('limPessoalFed') }[esfera];
  const temPessoal = a.pessoalPct !== null && a.pessoalPct !== undefined && a.pessoalPct !== '';
  let pessoal;
  let pessoalAcima = false;
  if (!temPessoal || !limite) pessoal = federal ? n('pessoalSemFed') : n('pessoalSem');
  else {
    const uso = Math.round((Number(a.pessoalPct) / limite) * 1000000) / 10000;
    if (uso <= n('pessoalF1')) pessoal = n('pessoalP1');
    else if (uso <= n('pessoalF2')) pessoal = n('pessoalP2');
    else if (uso <= 100) pessoal = n('pessoalP3');
    else { pessoal = 0; pessoalAcima = true; }
  }
  const cauc = { REGULAR: n('caucRegular'), PENDENCIA: n('caucPendencia') }[a.cauc] ?? n('caucSem');
  const fonte = { SUS: n('fonteSus'), VINCULADA: n('fonteVinculada') }[a.fonteTipo] ?? n('fonteOutra');
  const temAtraso = a.atrasoMedio !== null && a.atrasoMedio !== undefined && a.atrasoMedio !== '';
  const atraso = temAtraso ? Number(a.atrasoMedio) : null;
  const perfil = { PONTUAL: n('histPontual'), EVENTUAIS: n('histEventuais'), FREQUENTES: n('histFrequentes') }[a.perfilPag];
  let historico = 0;
  let pontosAtraso = 0;
  if (perfil !== undefined) historico = perfil;
  else if (!temAtraso) historico = n('histSem');
  else if (atraso <= n('atrasoF1')) pontosAtraso = n('atrasoP1');
  else if (atraso <= n('atrasoF2')) pontosAtraso = n('atrasoP2');
  else if (atraso <= n('atrasoF3')) pontosAtraso = n('atrasoP3');
  else pontosAtraso = n('atrasoP4');
  const atrasoTeto = temAtraso && atraso > n('atrasoF3');
  if (atrasoTeto) { historico = Math.min(historico, n('atrasoTeto')); pontosAtraso = Math.min(pontosAtraso, n('atrasoTeto')); }
  let operacao = (a.empenhoPrevio === 'SIM' ? n('empenho') : 0) + (a.contratoVigente === 'SIM' ? n('contrato') : 0);
  if (a.base === 'EDITAL' && a.empenhoPrevio !== 'SIM' && a.contratoVigente !== 'SIM') operacao = n('edital');
  const mandato = fimMandato(esfera, hoje);
  const soma = capag + pessoal + cauc + fonte + historico + pontosAtraso + operacao - (mandato ? n('fimMandato') : 0);
  const nota = Math.max(0, Math.min(100, Math.round(soma)));
  let ratingPub = nota >= n('corteP1') ? 'P1' : nota >= n('corteP2') ? 'P2' : nota >= n('corteP3') ? 'P3' : 'P4';
  const capagD = a.capag === 'D';
  if ((capagD || pessoalAcima) && (ratingPub === 'P1' || ratingPub === 'P2')) ratingPub = 'P3';
  const base = a.base === 'EDITAL' ? Number(a.valorEstimado) || 0 : a.base === 'CONTRATO' ? Number(a.saldoContrato) || 0 : Number(a.valorSolicitado) || 0;
  const fator = n(`fator${ratingPub}`);
  const exposicao = Math.round((base * fator) / 1000) * 1000;
  const aprovar = podeAprovar(a, hoje);
  let decisaoSugerida;
  if (!a.base) decisaoSugerida = 'INFORME_BASE';
  else if (a.base === 'EDITAL') decisaoSugerida = 'PRE_APROVAR';
  else if (!aprovar.pode) decisaoSugerida = 'NAO_FORNECER';
  else if (a.empenhoPrevio === 'NAO') decisaoSugerida = 'SEM_EMPENHO';
  else if (a.contratoVigente === 'NAO') decisaoSugerida = 'SEM_CONTRATO';
  else decisaoSugerida = { P1: 'APROVAR', P2: 'REDUZIR', P3: 'REDUZIR', P4: 'DIRETORIA' }[ratingPub];
  const faltando = [];
  if (!a.capag) faltando.push('CAPAG');
  if (!temPessoal) faltando.push('despesa com pessoal');
  if (!a.cauc) faltando.push('CAUC');
  if (!a.fonteTipo) faltando.push('tipo de fonte do recurso');
  if (perfil === undefined && !temAtraso) faltando.push('histórico de pagamento');
  if (!a.base) faltando.push('base da análise');
  return {
    nota, pontos: { capag, pessoal, cauc, fonte, historico, atraso: pontosAtraso, operacao }, ratingPub, exposicao, decisaoSugerida, faltando,
    podeAprovar: aprovar.pode, motivoNaoAprovar: aprovar.motivo, travas: { capagD, pessoalAcima, fimMandato: mandato, atrasoTeto },
  };
}

/** `capag:22;pessoal:10;…` (02 `CC_ANALISE_ORGAO.PONTOS`). */
export function pontosTexto(pontos) {
  return Object.entries(pontos).map(([k, v]) => `${k}:${v}`).join(';');
}

export const FONTE = [capacidadeSugerida, fimMandato, podeAprovar, motorOrgao, pontosTexto].map(String).join('\n');
