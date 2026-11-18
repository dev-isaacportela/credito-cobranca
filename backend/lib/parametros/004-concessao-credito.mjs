// Chaves da 004 (03 §7, §9–§13) e a validação cruzada dos grupos que a 004 declara.
// `validarConjunto[grupo](valores)` é autocontida: a 001 cola o texto dela em ccBaseParametroSalvar.
// O grupo `alcada` tem duas donas (004 e 002): a 004 declara o validarConjunto do grupo inteiro,
// com as regras cruzadas das chaves da 002 também (`fundir` aceita um por grupo). O grupo `meta` também
// tem três donas (004, 002, 006): a 004 declara o validarConjunto dele (03 §13: `aprovacaoMinPct < aprovacaoMaxPct`);
// regra cruzada de `meta.*` da 002 ou da 006 entra aqui, conferida só quando as chaves estão presentes.

const c = (chave, ordem, rotulo, tipo, unidade, padrao, extra = {}) =>
  ({ chave, grupo: chave.split('.')[0], ordem, rotulo, tipo, unidade, padrao, minimo: null, maximo: null,
    porCarteira: true, comVigencia: false, usadoPor: '004', descricao: '', ...extra });
const unico = { porCarteira: false };

const FAIXAS = [
  ['aa', 'AA', 100, 120, 30, 60, 1], ['a', 'A', 100, 100, 25, 45, 2], ['b', 'B', 70, 90, 20, 42, 5], ['c', 'C', 0, 50, 15, 35, 10],
];

export const PARAMETROS = [
  // 7. alcada.* da 004
  c('alcada.nivelSupervisor', 1, 'Nível da alçada Supervisor', 'INTEIRO', 'nível', 2, { ...unico, minimo: 1, maximo: 5, usadoPor: '004, 002' }),
  c('alcada.nivelGerente', 2, 'Nível da alçada Gerente', 'INTEIRO', 'nível', 3, { ...unico, minimo: 1, maximo: 5, usadoPor: '004, 002' }),
  c('alcada.nivelComiteRegional', 3, 'Nível do Comitê regional', 'INTEIRO', 'nível', 3, { ...unico, minimo: 1, maximo: 5 }),
  c('alcada.nivelComiteExecutivo', 4, 'Nível do Comitê executivo', 'INTEIRO', 'nível', 5, { ...unico, minimo: 1, maximo: 5 }),
  c('alcada.nivelDiretorFinanceiro', 5, 'Nível do Diretor financeiro', 'INTEIRO', 'nível', 5, { ...unico, minimo: 1, maximo: 5, usadoPor: '004, 002' }),
  c('alcada.nivelComiteCredito', 6, 'Nível do Comitê de crédito', 'INTEIRO', 'nível', 5, { ...unico, minimo: 1, maximo: 5 }),
  c('alcada.concSupervisor', 7, 'Concessão: até este valor, Supervisor', 'MOEDA', 'R$', 50000, { minimo: 0.01, comVigencia: true, carteiras: { PUBLICA: 100000 } }),
  c('alcada.concGerente', 8, 'Concessão: até este valor, Gerente', 'MOEDA', 'R$', 500000, { minimo: 0.01, comVigencia: true, carteiras: { PUBLICA: 1000000 } }),
  c('alcada.concRegional', 9, 'Concessão: até este valor, Comitê regional', 'MOEDA', 'R$', 2000000, { minimo: 0.01, comVigencia: true, carteiras: { PUBLICA: 1000000 },
    descricao: 'Igual ao valor do Gerente = a faixa não existe.' }),
  c('alcada.concRotuloTopo', 10, 'Concessão: rótulo da faixa de cima', 'TEXTO', 'txt', 'Comitê executivo', { carteiras: { PUBLICA: 'Diretoria' } }),
  c('alcada.pedAtrasoComiteDias', 11, 'Pedido: atraso que leva ao Comitê de crédito', 'INTEIRO', 'd', 15, { minimo: 0 }),
  c('alcada.pedSupPct', 12, 'Pedido: excesso até este % do limite, Supervisor', 'PERCENTUAL', '%', 10),
  c('alcada.pedSupValor', 13, 'Pedido: e até este valor, Supervisor', 'MOEDA', 'R$', 20000, { minimo: 0.01 }),
  c('alcada.pedGerPct', 14, 'Pedido: excesso até este %, Gerente', 'PERCENTUAL', '%', 25),
  c('alcada.pedDirPct', 15, 'Pedido: excesso até este %, Diretor financeiro', 'DECIMAL', '%', 50, { minimo: 0, maximo: 1000 }),

  // 9. limite.*
  c('limite.folga', 1, 'Folga sobre a compra média', 'DECIMAL', 'fator', 1.2, { minimo: 1, maximo: 3 }),
  c('limite.novoPct', 2, 'Cliente sem compras: % do faturamento', 'PERCENTUAL', '%', 10),
  c('limite.tetoPct', 3, 'Sem score: teto em % do faturamento', 'PERCENTUAL', '%', 30),
  c('limite.plPct', 4, 'Limite máximo em % do PL', 'PERCENTUAL', '%', 10),
  c('limite.pesoSerasa', 5, 'Peso do Serasa no score final', 'PERCENTUAL', '%', 60),
  c('limite.concMax', 6, 'Concentração máxima por grupo', 'PERCENTUAL', '%', 10, { usadoPor: '004, 006' }),
  c('limite.docF1', 7, 'Faixa de documentos 1 (faturamento)', 'MOEDA', 'R$', 100000),
  c('limite.docF2', 8, 'Faixa de documentos 2 (balanço)', 'MOEDA', 'R$', 500000),
  c('limite.consultaValidadeDias', 9, 'Validade das consultas obrigatórias', 'INTEIRO', 'd', 30, { minimo: 1, maximo: 365 }),
  c('limite.fraudeMeses', 10, 'CNPJ recente (alerta de fraude)', 'INTEIRO', 'm', 12, { minimo: 1, maximo: 120 }),
  c('limite.fraudePct', 11, 'Pedido inicial alto: % do faturamento', 'DECIMAL', '%', 50, { minimo: 0, maximo: 1000 }),
  c('limite.lcMin', 12, 'Liquidez corrente mínima', 'DECIMAL', 'índice', 1, { minimo: 0 }),
  c('limite.divEbitdaMax', 13, 'Dívida / EBITDA máxima', 'DECIMAL', 'índice', 3, { minimo: 0 }),
  c('limite.fonteDescasDias', 14, 'Descasamento da fonte pagadora', 'INTEIRO', 'd', 15, { minimo: 0 }),

  // 10. score.*
  c('score.semHistorico', 1, 'Score sem histórico de pagamento', 'INTEIRO', 'pts', 700, { minimo: 0, maximo: 1000 }),
  c('score.penalDia', 2, 'Penalidade por dia de atraso', 'INTEIRO', 'pts/dia', 10, { minimo: 0 }),
  c('score.penalMax', 3, 'Penalidade máxima por atraso', 'INTEIRO', 'pts', 600, { minimo: 0, maximo: 1000 }),
  c('score.bonusRecorrente', 4, 'Bônus de cliente recorrente', 'INTEIRO', 'pts', 50, { minimo: 0 }),
  c('score.penalInativo', 5, 'Penalidade de cliente inativo', 'INTEIRO', 'pts', 50, { minimo: 0 }),

  // 11. farol.*
  c('farol.scoreAA', 1, 'Score mínimo da faixa AA', 'INTEIRO', 'pts', 800, { minimo: 0, maximo: 1000 }),
  c('farol.scoreA', 2, 'Score mínimo da faixa A', 'INTEIRO', 'pts', 600, { minimo: 0, maximo: 1000 }),
  c('farol.scoreB', 3, 'Score mínimo da faixa B', 'INTEIRO', 'pts', 400, { minimo: 0, maximo: 1000 }),
  c('farol.scoreC', 4, 'Score mínimo da faixa C', 'INTEIRO', 'pts', 200, { minimo: 0, maximo: 1000 }),
  c('farol.atrasoA', 5, 'Atraso máximo da faixa A', 'INTEIRO', 'd', 5, { minimo: 0 }),
  c('farol.atrasoB', 6, 'Atraso máximo da faixa B', 'INTEIRO', 'd', 15, { minimo: 0 }),
  c('farol.atrasoC', 7, 'Atraso máximo da faixa C', 'INTEIRO', 'd', 30, { minimo: 0 }),
  c('farol.atrasoD', 8, 'Atraso máximo da faixa D', 'INTEIRO', 'd', 45, { minimo: 0 }),
  ...FAIXAS.flatMap(([f, F, fmin, fmax, teto, prazo, inad], i) => [
    c(`farol.${f}Fmin`, 10 + i * 5, `Faixa ${F}: limite mínimo (% do motor)`, 'DECIMAL', '%', fmin, { minimo: 0, maximo: 1000 }),
    c(`farol.${f}Fmax`, 11 + i * 5, `Faixa ${F}: limite máximo (% do motor)`, 'DECIMAL', '%', fmax, { minimo: 0, maximo: 1000 }),
    c(`farol.${f}Teto`, 12 + i * 5, `Faixa ${F}: teto (% do faturamento)`, 'PERCENTUAL', '%', teto),
    c(`farol.${f}Prazo`, 13 + i * 5, `Faixa ${F}: prazo máximo`, 'INTEIRO', 'd', prazo, { minimo: 0 }),
    c(`farol.${f}Inad`, 14 + i * 5, `Faixa ${F}: inadimplência esperada`, 'PERCENTUAL', '%', inad),
  ]),
  c('farol.dInad', 30, 'Faixa D: inadimplência esperada', 'PERCENTUAL', '%', 20),

  // 12. cred.*, flex.*, saude.*
  c('cred.validadeMeses', 1, 'Validade do crédito', 'INTEIRO', 'm', 3, { minimo: 1, maximo: 36, usadoPor: '004, 005' }),
  c('cred.comprasRecorrentes', 2, 'Compras para renovar (recorrente)', 'INTEIRO', 'qtd', 2, { minimo: 1 }),
  c('cred.diasSemCompra', 3, 'Dias sem compra para obsoleto', 'INTEIRO', 'd', 90, { minimo: 1, usadoPor: '004, 001' }),
  c('cred.revAtrasoDias', 4, 'Gatilho de revisão: atraso', 'INTEIRO', 'd', 15, { minimo: 1 }),
  c('cred.revUsoPct', 5, 'Gatilho de revisão: uso do limite', 'DECIMAL', '%', 90, { minimo: 0, maximo: 1000 }),
  c('cred.revValidadeDias', 6, 'Gatilho de revisão: validade vencendo', 'INTEIRO', 'd', 15, { minimo: 1 }),
  c('cred.baixoRiscoScore', 7, 'Baixo risco: score mínimo', 'INTEIRO', 'pts', 600, { minimo: 0, maximo: 1000 }),
  c('cred.baixoRiscoRating', 8, 'Baixo risco: rating mínimo', 'RATING', 'op', 'B'),
  c('cred.calibMinMeses', 9, 'Meses mínimos para calibrar o farol', 'INTEIRO', 'm', 12, { ...unico, minimo: 1, maximo: 60 }),
  c('cred.calibRevisaoMeses', 10, 'Intervalo da revisão do semáforo', 'INTEIRO', 'm', 3, { ...unico, minimo: 1, maximo: 24 }),
  c('cred.riscoCorteRating', 11, 'Corte do risco (rating)', 'RATING', 'op', 'C'),
  c('flex.riscoMinimoPct', 1, 'Flexibilização: risco mínimo', 'PERCENTUAL', '%', 20),
  c('flex.riscoBaixoPct', 2, 'Flexibilização: risco baixo', 'PERCENTUAL', '%', 10),
  c('flex.metaTaxaPct', 3, 'Meta da taxa de flexibilização', 'PERCENTUAL', '%', 30, { ...unico, usadoPor: '004, 006' }),
  c('flex.metaConfPct', 4, 'Meta de liberações dentro da regra', 'PERCENTUAL', '%', 90, { ...unico, usadoPor: '004, 006' }),
  c('saude.riscoDias', 1, 'Saúde: atraso de risco', 'INTEIRO', 'd', 30, { minimo: 1, usadoPor: '004, 006' }),
  c('saude.usoAtencaoPct', 2, 'Saúde: uso do limite de atenção', 'DECIMAL', '%', 90, { minimo: 0, maximo: 1000, usadoPor: '004, 006' }),
  c('saude.indiceVerde', 3, 'Saúde: índice verde', 'PERCENTUAL', '%', 80, { ...unico, usadoPor: '004, 006' }),
  c('saude.indiceVermelho', 4, 'Saúde: índice vermelho', 'PERCENTUAL', '%', 60, { ...unico, usadoPor: '004, 006' }),

  // 13. meta.* da 004
  c('meta.tempoDecisaoDias', 1, 'Meta de tempo de decisão', 'INTEIRO', 'd', 9, { ...unico, minimo: 1, usadoPor: '004, 006' }),
  c('meta.slaPct', 2, 'Meta de decisões no prazo', 'PERCENTUAL', '%', 85, { ...unico, usadoPor: '004, 006' }),
  c('meta.aprovacaoMinPct', 3, 'Taxa de aprovação mínima', 'PERCENTUAL', '%', 60, { ...unico, usadoPor: '004, 006' }),
  c('meta.aprovacaoMaxPct', 4, 'Taxa de aprovação máxima', 'PERCENTUAL', '%', 85, { ...unico, usadoPor: '004, 006' }),
];

export const validarConjunto = {
  alcada: (v) => {
    const n = (k) => Number(v[`alcada.${k}`]);
    const motivos = [];
    const minimo = (a, b, texto) => { if (!(n(a) >= n(b))) motivos.push(texto); };
    minimo('nivelGerente', 'nivelSupervisor', 'Nível do Gerente: deve ser pelo menos o do Supervisor.');
    minimo('nivelComiteRegional', 'nivelGerente', 'Nível do Comitê regional: deve ser pelo menos o do Gerente.');
    minimo('nivelComiteExecutivo', 'nivelComiteRegional', 'Nível do Comitê executivo: deve ser pelo menos o do Comitê regional.');
    minimo('nivelDiretorFinanceiro', 'nivelGerente', 'Nível do Diretor financeiro: deve ser pelo menos o do Gerente.');
    minimo('nivelComiteCredito', 'nivelGerente', 'Nível do Comitê de crédito: deve ser pelo menos o do Gerente.');
    minimo('concGerente', 'concSupervisor', 'Concessão: o valor do Gerente deve ser pelo menos o do Supervisor.');
    minimo('concRegional', 'concGerente', 'Concessão: o valor do Comitê regional deve ser pelo menos o do Gerente.');
    if (String(v['alcada.concRotuloTopo'] ?? '').trim() === '') motivos.push('Rótulo da faixa de cima: valor obrigatório.');
    if (!(n('pedSupPct') < n('pedGerPct') && n('pedGerPct') < n('pedDirPct'))) motivos.push('Pedido: os percentuais de Supervisor, Gerente e Diretor devem ser crescentes.');
    // regras cruzadas das chaves da 002 (baixa e acordo), quando presentes
    if (v['alcada.baixaDiretor'] !== undefined) minimo('baixaDiretor', 'baixaGerente', 'Baixa: o valor do diretor deve ser pelo menos o do gerente.');
    if (v['alcada.baixaNivel2'] !== undefined) minimo('baixaNivel2', 'baixaNivel1', 'Baixa: o nível 2 deve ser pelo menos o nível 1.');
    if (v['alcada.baixaNivel3'] !== undefined) minimo('baixaNivel3', 'baixaNivel2', 'Baixa: o nível 3 deve ser pelo menos o nível 2.');
    if (v['alcada.acordoNivelFora'] !== undefined) minimo('acordoNivelFora', 'acordoNivelPadrao', 'Acordo: o nível fora do padrão deve ser pelo menos o do padrão.');
    return motivos;
  },
  limite: (v) => (Number(v['limite.docF1']) < Number(v['limite.docF2']) ? [] : ['Documentos: a faixa 1 deve ser menor que a faixa 2.']),
  farol: (v) => {
    const n = (k) => Number(v[`farol.${k}`]);
    const motivos = [];
    if (!(n('scoreAA') > n('scoreA') && n('scoreA') > n('scoreB') && n('scoreB') > n('scoreC'))) motivos.push('Farol: os scores devem diminuir de AA a C.');
    if (!(n('atrasoA') < n('atrasoB') && n('atrasoB') < n('atrasoC') && n('atrasoC') < n('atrasoD'))) motivos.push('Farol: os atrasos devem crescer de A a D.');
    for (const f of ['aa', 'a', 'b', 'c']) if (!(n(`${f}Fmin`) <= n(`${f}Fmax`))) motivos.push(`Farol ${f.toUpperCase()}: o mínimo não pode passar do máximo.`);
    return motivos;
  },
  flex: (v) => (Number(v['flex.riscoMinimoPct']) >= Number(v['flex.riscoBaixoPct']) ? [] : ['Flexibilização: o risco mínimo deve ser pelo menos o risco baixo.']),
  saude: (v) => (Number(v['saude.indiceVerde']) > Number(v['saude.indiceVermelho']) ? [] : ['Saúde: o índice verde deve ser maior que o vermelho.']),
  meta: (v) => (v['meta.aprovacaoMinPct'] === undefined || Number(v['meta.aprovacaoMinPct']) < Number(v['meta.aprovacaoMaxPct'])
    ? [] : ['Taxa de aprovação: a mínima deve ser menor que a máxima.']),
};
