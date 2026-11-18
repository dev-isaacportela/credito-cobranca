// Chaves da 002 (03 §4, §5, §6, §7, §13) e a validação cruzada dos grupos `regua` e `cob` (RN-028).
// `validarConjunto[grupo](valores)` é autocontida: a 001 cola o texto dela em ccBaseParametroSalvar.
// ponytail: o grupo `alcada` tem duas donas (002 e 004) e `fundir` aceita um validarConjunto por grupo;
// as regras cruzadas das chaves `alcada.baixa*`/`alcada.acordoNivel*` ficam para quem declarar o grupo.

const p = (chave, ordem, rotulo, tipo, unidade, padrao, extra = {}) =>
  ({ chave, grupo: chave.split('.')[0], ordem, rotulo, tipo, unidade, padrao, minimo: null, maximo: null,
    porCarteira: true, comVigencia: false, usadoPor: '002', descricao: '', ...extra });

const MODOS = ['MANUAL', 'APROVAR', 'AUTOMATICO'];
const EMAIL = [
  ['prev_d5', 'D-5 · Lembrete', 'MANUAL'], ['prev_d1', 'D-1 · Confirmação', 'MANUAL'], ['venc_d0', 'D+0 · Vencimento', 'MANUAL'],
  ['pag_nao_ident', 'Pagamento não identificado', 'MANUAL'], ['cob_ativa', 'Cobrança ativa', 'MANUAL'],
  ['notif_formal', 'Notificação formal', 'APROVAR'], ['protesto', 'Protesto em cartório', 'APROVAR'],
  ['neg_pos_protesto', 'Negociação pós-protesto', 'APROVAR'], ['extrajudicial', 'Extrajudicial', 'APROVAR'],
  ['juridico', 'Cobrança judicial', 'MANUAL'],
];

export const PARAMETROS = [
  // 4. regua.* — dias da régua (por carteira)
  p('regua.prevAviso1', 1, 'Primeiro aviso preventivo', 'INTEIRO', 'd antes', 5, { minimo: 1, maximo: 30 }),
  p('regua.prevAviso2', 2, 'Segundo aviso preventivo', 'INTEIRO', 'd antes', 1, { minimo: 1, maximo: 30 }),
  p('regua.confPag', 3, 'Pagamento não identificado', 'INTEIRO', 'd', 2, { minimo: 1, maximo: 365 }),
  p('regua.lig', 4, 'Cobrança ativa', 'INTEIRO', 'd', 4, { minimo: 1, maximo: 365, usadoPor: '002, 004' }),
  p('regua.notif', 5, 'Notificação formal', 'INTEIRO', 'd', 7, { minimo: 1, maximo: 365 }),
  p('regua.neg', 6, 'Protesto em cartório', 'INTEIRO', 'd', 10, { minimo: 1, maximo: 365 }),
  p('regua.prop', 7, 'Negociação pós-protesto', 'INTEIRO', 'd', 20, { minimo: 1, maximo: 365 }),
  p('regua.extra', 8, 'Extrajudicial', 'INTEIRO', 'd', 30, { minimo: 1, maximo: 365, usadoPor: '002, 003' }),
  p('regua.jur', 9, 'Pronto para o Jurídico', 'INTEIRO', 'd', 45, { minimo: 1, maximo: 365, usadoPor: '002, 003' }),
  p('regua.jurMax', 10, 'Prazo máximo para o Jurídico', 'INTEIRO', 'd', 60, { minimo: 1, maximo: 365, usadoPor: '002, 003' }),
  p('regua.bloqTotal', 11, 'Bloqueio total do crédito', 'INTEIRO', 'd', 10, { minimo: 1, maximo: 365, usadoPor: '002, 004' }),

  // 5. cob.* — cobrança, promessas, acordos
  p('cob.quebraDias', 1, 'Tolerância da parcela do acordo', 'INTEIRO', 'd', 5, { minimo: 1, maximo: 60 }),
  p('cob.promessaToleranciaDias', 2, 'Tolerância da promessa', 'INTEIRO', 'd', 3, { minimo: 0, maximo: 30, usadoPor: '002, 006' }),
  p('cob.promessaMaxUteis', 3, 'Prazo máximo da promessa', 'INTEIRO', 'du', 5, { minimo: 0, maximo: 30, carteiras: { PUBLICA: 0 },
    descricao: '0 = sem limite.' }),
  p('cob.promessasQuebradas', 4, 'Promessas quebradas que exigem acordo', 'INTEIRO', 'qtd', 2, { minimo: 1, maximo: 10 }),
  p('cob.anuenciaDiasUteis', 5, 'Prazo da carta de anuência', 'INTEIRO', 'du', 5, { minimo: 1, maximo: 30 }),
  p('cob.emailPrazoMinDias', 6, 'Prazo mínimo da data-limite do e-mail', 'INTEIRO', 'd', 3, { minimo: 1, maximo: 30 }),
  p('cob.semContatoDias', 7, 'Dias sem contato', 'INTEIRO', 'd', 7, { minimo: 1, maximo: 60 }),
  p('cob.acordoEntradaMinPct', 8, 'Entrada mínima do acordo', 'PERCENTUAL', '%', 20),
  p('cob.acordoMaxParcelas', 9, 'Parcelas no padrão do acordo', 'INTEIRO', 'qtd', 5, { minimo: 1, maximo: 60 }),
  p('cob.acordoValorGerente', 10, 'Débito acima do qual o acordo exige garantia', 'MOEDA', 'R$', 50000, { minimo: 0.01 }),
  p('cob.acordoParcelasPadrao', 11, 'Parcelas sugeridas', 'INTEIRO', 'qtd', 3, { minimo: 1, maximo: 60 }),
  p('cob.acordoPrimeiroDias', 12, 'Primeira parcela em', 'INTEIRO', 'd', 7, { minimo: 0, maximo: 60 }),
  p('cob.acordoIntervaloDias', 13, 'Intervalo entre parcelas', 'INTEIRO', 'd', 30, { minimo: 1, maximo: 90 }),
  p('cob.probSemHistorico', 14, 'Chance de atraso sem histórico', 'PERCENTUAL', '%', 5, { usadoPor: '002, 004' }),
  p('cob.probPisoAtraso', 15, 'Chance mínima com vencido', 'PERCENTUAL', '%', 50, { usadoPor: '002, 004' }),
  p('cob.probTeto', 16, 'Chance máxima', 'PERCENTUAL', '%', 95, { usadoPor: '002, 004' }),
  p('cob.probForte', 17, 'Destaque forte a partir de', 'PERCENTUAL', '%', 40),
  p('cob.probMedio', 18, 'Destaque médio a partir de', 'PERCENTUAL', '%', 15),
  ...EMAIL.map(([fase, nome, padrao], i) => p(`cob.emailModo.${fase}`, 19 + i, `E-mail da fase ${nome}`, 'OPCAO', 'op', padrao, { opcoes: MODOS })),

  // 6. enc.* — encargos (com vigência)
  p('enc.multa', 1, 'Multa', 'PERCENTUAL', '%', 2, { maximo: 20, comVigencia: true, carteiras: { PUBLICA: 0 }, usadoPor: '002, 003, 005' }),
  p('enc.juros', 2, 'Juros ao mês', 'PERCENTUAL', '%', 1, { maximo: 20, comVigencia: true, carteiras: { PUBLICA: 0.5 }, usadoPor: '002, 003, 005' }),
  p('enc.correcao', 3, 'Correção ao mês', 'PERCENTUAL', '%', 0.4, { maximo: 20, comVigencia: true, usadoPor: '002, 003, 005' }),

  // 7. alcada.* da 002
  p('alcada.baixaGerente', 20, 'Baixa: até este valor, gerente', 'MOEDA', 'R$', 10000, { minimo: 0.01, comVigencia: true }),
  p('alcada.baixaDiretor', 21, 'Baixa: até este valor, diretor financeiro', 'MOEDA', 'R$', 100000, { minimo: 0.01, comVigencia: true }),
  p('alcada.baixaNivel1', 22, 'Nível da baixa até o valor do gerente', 'INTEIRO', 'nível', 3, { minimo: 1, maximo: 5, porCarteira: false }),
  p('alcada.baixaNivel2', 23, 'Nível da baixa até o valor do diretor', 'INTEIRO', 'nível', 5, { minimo: 1, maximo: 5, porCarteira: false }),
  p('alcada.baixaNivel3', 24, 'Nível da baixa acima', 'INTEIRO', 'nível', 5, { minimo: 1, maximo: 5, porCarteira: false }),
  p('alcada.acordoNivelPadrao', 25, 'Nível do acordo no padrão', 'INTEIRO', 'nível', 2, { minimo: 1, maximo: 5, porCarteira: false }),
  p('alcada.acordoNivelFora', 26, 'Nível do acordo fora do padrão', 'INTEIRO', 'nível', 3, { minimo: 1, maximo: 5, porCarteira: false }),
  p('alcada.emailAprovaNivel', 27, 'Nível que aprova e-mail da fila', 'INTEIRO', 'nível', 2, { minimo: 1, maximo: 5, porCarteira: false }),

  // 13. meta.* da 002
  p('meta.conversaoPct', 5, 'Meta de conversão', 'PERCENTUAL', '%', 60, { porCarteira: false, usadoPor: '002, 006' }),
  p('meta.promessaPct', 6, 'Meta de promessas cumpridas', 'PERCENTUAL', '%', 70, { porCarteira: false, usadoPor: '002, 006' }),
];

export const validarConjunto = {
  regua: (v) => {
    const n = (k) => Number(v[`regua.${k}`]);
    const motivos = [];
    if (!(n('prevAviso1') > n('prevAviso2') && n('prevAviso2') >= 1)) {
      motivos.push('Avisos preventivos: o primeiro deve ser maior que o segundo, e o segundo de 1 dia ou mais.');
    }
    const ordem = ['confPag', 'lig', 'notif', 'neg', 'prop', 'extra', 'jur'];
    const crescentes = n('confPag') >= 1 && ordem.every((k, i) => i === 0 || n(ordem[i - 1]) < n(k));
    if (!crescentes) motivos.push(`Os dias da régua devem ser estritamente crescentes: ${ordem.map(n).join(', ')}.`);
    if (!(n('jurMax') >= n('jur'))) motivos.push('Prazo máximo para o Jurídico: deve ser maior ou igual ao dia do Jurídico.');
    if (!(n('lig') <= n('bloqTotal') && n('bloqTotal') <= n('jur'))) motivos.push('Bloqueio total: deve ficar entre o dia da cobrança ativa e o do Jurídico.');
    return motivos;
  },
  cob: (v) => {
    const n = (k) => Number(v[`cob.${k}`]);
    const motivos = [];
    if (!(n('probTeto') >= n('probPisoAtraso'))) motivos.push('Chance máxima: deve ser maior ou igual à chance mínima com vencido.');
    if (!(n('probForte') > n('probMedio'))) motivos.push('Destaque forte: deve ser maior que o destaque médio.');
    if (!(n('acordoParcelasPadrao') <= n('acordoMaxParcelas'))) motivos.push('Parcelas sugeridas: no máximo as parcelas do padrão do acordo.');
    return motivos;
  },
};
