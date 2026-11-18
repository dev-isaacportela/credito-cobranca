// Chaves da 005 (03 §15 `pub.*`, §16 `pubMotor.*`) e a validação cruzada dos dois grupos. Carteira única
// (porCarteira false): a 005 só existe no público. `pub.pequenoValor` é a única com vigência (P-47).
// `validarConjunto[grupo](valores)` é autocontida: a 001 cola o texto dela em ccBaseParametroSalvar.

const c = (chave, ordem, rotulo, tipo, unidade, padrao, extra = {}) =>
  ({ chave, grupo: chave.split('.')[0], ordem, rotulo, tipo, unidade, padrao, minimo: null, maximo: null,
    porCarteira: false, comVigencia: false, usadoPor: '005', descricao: '', ...extra });
const pts = (chave, ordem, rotulo, padrao) => c(`pubMotor.${chave}`, ordem, rotulo, 'INTEIRO', 'pts', padrao, { minimo: 0 });

export const PARAMETROS = [
  c('pub.rpConf', 1, 'Régua da NF: confirmar (dias úteis após o protocolo)', 'INTEIRO', 'du', 3, { minimo: 1 }),
  c('pub.rpL1', 2, 'Régua da NF: L1 (dias úteis após o liquidar até)', 'INTEIRO', 'du', 1, { minimo: 0 }),
  c('pub.rpL2', 3, 'Régua da NF: L2', 'INTEIRO', 'du', 5, { minimo: 0 }),
  c('pub.rpL3', 4, 'Régua da NF: L3 (ofício)', 'INTEIRO', 'du', 10, { minimo: 0 }),
  c('pub.rpG1', 5, 'Régua da NF: G1 (dias úteis após o pagar até)', 'INTEIRO', 'du', 1, { minimo: 0 }),
  c('pub.rpG2', 6, 'Régua da NF: G2 (LAI)', 'INTEIRO', 'du', 5, { minimo: 0 }),
  c('pub.rpG3', 7, 'Régua da NF: G3', 'INTEIRO', 'du', 15, { minimo: 0 }),
  c('pub.rpG4', 8, 'Régua da NF: G4 (ofício)', 'INTEIRO', 'du', 30, { minimo: 0 }),
  c('pub.rpG5', 9, 'Régua da NF: G5 (jurídico)', 'INTEIRO', 'du', 90, { minimo: 0 }),
  c('pub.rpFeitoAntecedencia', 10, 'Marcar passo feito: antecedência máxima', 'INTEIRO', 'du', 2, { minimo: 0 }),
  c('pub.pequenoValor', 11, 'Pequeno valor (Lei 14.133/2021, art. 75, II)', 'MOEDA', 'R$', 65492.11, {
    minimo: 0.01, comVigencia: true, vigencias: [{ inicio: '2025-01-01', valor: 62725.59 }, { inicio: '2026-01-01', valor: 65492.11 }],
    descricao: 'Vale o limite em vigor na emissão da NF (P-47); atualizado pela Gerência Financeira todo janeiro.' }),
  c('pub.contratoVigDias', 12, 'Contrato em alerta: vigência em até', 'INTEIRO', 'd', 60, { minimo: 1, usadoPor: '005, 006' }),
  c('pub.contratoSaldoPct', 13, 'Contrato em alerta: saldo abaixo de', 'PERCENTUAL', '%', 20, { minimo: 0, maximo: 100 }),
  c('pub.nfDataCorte', 14, 'NF pública: emitidas a partir de', 'DATA', 'data', '2026-01-01'),
  c('pub.certAlertaDias', 15, 'Certidão em alerta: dias antes da validade', 'INTEIRO', 'd', 15, { minimo: 1, usadoPor: '005, 006' }),

  pts('capagA', 1, 'CAPAG A', 30), pts('capagB', 2, 'CAPAG B', 22), pts('capagC', 3, 'CAPAG C', 10), pts('capagD', 4, 'CAPAG D', 0),
  pts('capagNd', 5, 'CAPAG não divulgada', 12), pts('capagUniao', 6, 'CAPAG não se aplica (União)', 30),
  pts('capagSemFed', 7, 'CAPAG não consultada (federal)', 30), pts('capagSem', 8, 'CAPAG não consultada (demais)', 12),
  c('pubMotor.limPessoalMun', 9, 'Limite de pessoal: municípios', 'PERCENTUAL', '%', 54, { minimo: 0, maximo: 100 }),
  c('pubMotor.limPessoalEst', 10, 'Limite de pessoal: estados', 'PERCENTUAL', '%', 49, { minimo: 0, maximo: 100 }),
  c('pubMotor.limPessoalFed', 11, 'Limite de pessoal: União', 'PERCENTUAL', '%', 37.9, { minimo: 0, maximo: 100 }),
  c('pubMotor.pessoalF1', 12, 'Pessoal: faixa 1 (% do limite)', 'PERCENTUAL', '%', 90, { minimo: 0, maximo: 100 }),
  pts('pessoalP1', 13, 'Pessoal: pontos até a faixa 1', 15),
  c('pubMotor.pessoalF2', 14, 'Pessoal: faixa 2 (% do limite)', 'PERCENTUAL', '%', 95, { minimo: 0, maximo: 100 }),
  pts('pessoalP2', 15, 'Pessoal: pontos até a faixa 2', 10), pts('pessoalP3', 16, 'Pessoal: pontos até 100% do limite', 5),
  pts('pessoalSemFed', 17, 'Pessoal não informado (federal)', 15), pts('pessoalSem', 18, 'Pessoal não informado (demais)', 7),
  pts('caucRegular', 19, 'CAUC regular', 10), pts('caucPendencia', 20, 'CAUC com pendência', 3), pts('caucSem', 21, 'CAUC não consultado', 5),
  pts('fonteSus', 22, 'Fonte vinculada (SUS fundo a fundo)', 15), pts('fonteVinculada', 23, 'Outra fonte vinculada', 10),
  pts('fonteOutra', 24, 'Recursos próprios ou não informada', 6),
  pts('histPontual', 25, 'Histórico: pontual', 20), pts('histEventuais', 26, 'Histórico: atrasos eventuais', 12),
  pts('histFrequentes', 27, 'Histórico: atrasos frequentes', 4), pts('histSem', 28, 'Histórico: sem perfil e sem atraso médio', 10),
  c('pubMotor.atrasoF1', 29, 'Atraso médio: faixa 1', 'INTEIRO', 'd', 15, { minimo: 0 }), pts('atrasoP1', 30, 'Atraso médio: pontos até a faixa 1', 18),
  c('pubMotor.atrasoF2', 31, 'Atraso médio: faixa 2', 'INTEIRO', 'd', 45, { minimo: 0 }), pts('atrasoP2', 32, 'Atraso médio: pontos até a faixa 2', 12),
  c('pubMotor.atrasoF3', 33, 'Atraso médio: faixa 3', 'INTEIRO', 'd', 90, { minimo: 0 }), pts('atrasoP3', 34, 'Atraso médio: pontos até a faixa 3', 6),
  pts('atrasoP4', 35, 'Atraso médio: pontos acima da faixa 3', 2), pts('atrasoTeto', 36, 'Atraso médio acima da faixa 3: teto do histórico', 4),
  pts('empenho', 37, 'Empenho prévio', 5), pts('contrato', 38, 'Contrato vigente', 5), pts('edital', 39, 'Base edital sem empenho nem contrato', 5),
  pts('fimMandato', 40, 'Fim de mandato (desconto)', 5),
  c('pubMotor.corteP1', 41, 'Rating P1 a partir da nota', 'INTEIRO', 'pts', 80, { minimo: 0, maximo: 100 }),
  c('pubMotor.corteP2', 42, 'Rating P2 a partir da nota', 'INTEIRO', 'pts', 60, { minimo: 0, maximo: 100 }),
  c('pubMotor.corteP3', 43, 'Rating P3 a partir da nota', 'INTEIRO', 'pts', 40, { minimo: 0, maximo: 100 }),
  c('pubMotor.fatorP1', 44, 'Exposição: fator P1', 'DECIMAL', 'fator', 1, { minimo: 0, maximo: 1 }),
  c('pubMotor.fatorP2', 45, 'Exposição: fator P2', 'DECIMAL', 'fator', 0.8, { minimo: 0, maximo: 1 }),
  c('pubMotor.fatorP3', 46, 'Exposição: fator P3', 'DECIMAL', 'fator', 0.5, { minimo: 0, maximo: 1 }),
  c('pubMotor.fatorP4', 47, 'Exposição: fator P4', 'DECIMAL', 'fator', 0.25, { minimo: 0, maximo: 1 }),
];

export const validarConjunto = {
  pub: (v) => {
    const n = (k) => Number(v[`pub.${k}`]);
    const motivos = [];
    if (!(n('rpL1') < n('rpL2') && n('rpL2') < n('rpL3'))) motivos.push('Régua da NF: os dias de L1, L2 e L3 devem ser crescentes.');
    if (!(n('rpG1') < n('rpG2') && n('rpG2') < n('rpG3') && n('rpG3') < n('rpG4') && n('rpG4') < n('rpG5'))) motivos.push('Régua da NF: os dias de G1 a G5 devem ser crescentes.');
    return motivos;
  },
  pubMotor: (v) => {
    const n = (k) => Number(v[`pubMotor.${k}`]);
    const motivos = [];
    if (!(n('pessoalF1') < n('pessoalF2'))) motivos.push('Pessoal: a faixa 1 deve ser menor que a faixa 2.');
    if (!(n('atrasoF1') < n('atrasoF2') && n('atrasoF2') < n('atrasoF3'))) motivos.push('Atraso médio: as faixas devem ser crescentes.');
    if (!(n('corteP1') > n('corteP2') && n('corteP2') > n('corteP3'))) motivos.push('Cortes do rating: P1 > P2 > P3.');
    for (const r of ['P1', 'P2', 'P3', 'P4']) if (!(n(`fator${r}`) >= 0 && n(`fator${r}`) <= 1)) motivos.push(`Fator de exposição ${r}: entre 0 e 1.`);
    return motivos;
  },
};
