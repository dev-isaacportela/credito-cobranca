// Chaves da 006 (03 §13): metas da carteira e leitura do painel. Valor único do sistema (sem carteira, sem
// vigência). As demais meta.* são da 002 e da 004; pdd.* da 001; limite.concMax e saude.* da 004.
// `validarConjunto[grupo](valores)` é autocontida: a 001 cola o texto dela em ccBaseParametroSalvar.

const c = (chave, ordem, rotulo, tipo, unidade, padrao, extra = {}) =>
  ({ chave, grupo: chave.split('.')[0], ordem, rotulo, tipo, unidade, padrao, minimo: null, maximo: null,
    porCarteira: false, comVigencia: false, usadoPor: '006', descricao: '', ...extra });

export const PARAMETROS = [
  c('meta.inadPct', 7, 'Meta do índice de inadimplência (máximo)', 'PERCENTUAL', '%', 5, { usadoPor: '006, 002' }),
  c('meta.vencido90Pct', 8, 'Meta do vencido acima de 90 dias (máximo)', 'PERCENTUAL', '%', 2),
  c('meta.pddPct', 9, 'Meta da PDD sobre a carteira (máximo)', 'PERCENTUAL', '%', 3),
  c('meta.recuperacaoPct', 10, 'Meta de recuperado ÷ gerado (mínimo)', 'PERCENTUAL', '%', 80, { usadoPor: '006, 002' }),
  c('meta.inadIndiceAlerta', 11, 'Inadimplência que vira ponto de atenção', 'PERCENTUAL', '%', 10),
  c('painel.hhiModerado', 1, 'Concentração moderada a partir de', 'INTEIRO', 'pts', 1500, { minimo: 0, maximo: 10000 }),
  c('painel.hhiAlto', 2, 'Concentração alta a partir de', 'INTEIRO', 'pts', 2500, { minimo: 0, maximo: 10000 }),
  c('painel.sincAtrasoMin', 3, 'Leitura do Winthor desatualizada após', 'INTEIRO', 'min', 30, { minimo: 1 }),
];

export const validarConjunto = {
  painel: (v) => {
    const motivos = [];
    if (!(Number(v['painel.hhiModerado']) < Number(v['painel.hhiAlto']))) motivos.push('Concentração: o limiar moderado deve ser menor que o alto.');
    // base.* é de outro grupo: ccBaseParametroSalvar passa o conjunto vigente inteiro e roda todo grupo (vale nos dois sentidos).
    if (v['base.syncIntervaloMin'] !== undefined && Number(v['painel.sincAtrasoMin']) < Number(v['base.syncIntervaloMin'])) {
      motivos.push('Leitura desatualizada: deve ser pelo menos o intervalo da leitura do Winthor.');
    }
    return motivos;
  },
};
