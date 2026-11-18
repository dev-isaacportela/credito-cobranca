// Chaves da 003 (03 §14): as 31 `jur.*`, sem carteira nem vigência, e a validação cruzada do grupo.
// `validarConjunto.jur(valores)` é autocontida: a 001 cola o texto dela em ccBaseParametroSalvar.

const p = (chave, ordem, rotulo, tipo, unidade, padrao, extra = {}) =>
  ({ chave, grupo: 'jur', ordem, rotulo, tipo, unidade, padrao, minimo: null, maximo: null,
    porCarteira: false, comVigencia: false, usadoPor: '003', descricao: '', ...extra });

export const PARAMETROS = [
  p('jur.prazoInicialDu', 1, 'Prazo inicial do processo enviado', 'INTEIRO', 'du', 5, { minimo: 1, maximo: 60 }),
  p('jur.envioNivelMin', 2, 'Nível mínimo para enviar o dossiê', 'INTEIRO', 'nível', 3, { minimo: 1, maximo: 5, usadoPor: '001, 002, 003' }),
  p('jur.prazoVermelhoDias', 3, 'Prazo em vermelho até', 'INTEIRO', 'd', 3, { minimo: 0 }),
  p('jur.prazoAmareloDias', 4, 'Prazo em amarelo até', 'INTEIRO', 'd', 7, { minimo: 0 }),
  p('jur.prazoCriticoDias', 5, 'Prazo vencido crítico acima de', 'INTEIRO', 'd', 7, { minimo: 1 }),
  p('jur.paradoAtencaoDias', 6, 'Sem andamento (atenção) acima de', 'INTEIRO', 'd', 30, { minimo: 1 }),
  p('jur.paradoCriticoDias', 7, 'Sem andamento (crítico) acima de', 'INTEIRO', 'd', 60, { minimo: 1 }),
  p('jur.custoMetaPct', 8, 'Meta de custo ÷ valor', 'PERCENTUAL', '%', 10),
  p('jur.custoBomPct', 9, 'Custo ÷ valor bom até', 'PERCENTUAL', '%', 5),
  p('jur.dossieParadoDias', 10, 'Dossiê incompleto há mais de', 'INTEIRO', 'd', 10, { minimo: 1 }),
  p('jur.custoAPagarAntigoDias', 11, 'Custo a pagar antigo há mais de', 'INTEIRO', 'd', 15, { minimo: 1 }),
  p('jur.acordoEntradaMinPct', 12, 'Entrada mínima do acordo judicial', 'PERCENTUAL', '%', 20),
  p('jur.acordoParcelasMax', 13, 'Parcelas máximas do acordo judicial', 'INTEIRO', 'qtd', 5, { minimo: 1, maximo: 60 }),
  p('jur.acordoAlcadaValor', 14, 'Valor de alçada do acordo judicial', 'MOEDA', 'R$', 50000, { minimo: 0.01 }),
  p('jur.acordoAlcadaNivel', 15, 'Nível que aprova acordo judicial', 'INTEIRO', 'nível', 3, { minimo: 1, maximo: 5 }),
  p('jur.honorariosPct', 16, 'Honorários do acordo judicial', 'PERCENTUAL', '%', 10),
  p('jur.notifPrazoDias', 17, 'Prazo da notificação extrajudicial', 'INTEIRO', 'd', 15, { minimo: 1, maximo: 90, usadoPor: '002, 003' }),
  p('jur.faixasValor', 18, 'Faixas de valor da visão gerencial', 'TEXTO', 'lista R$', '10000;50000;100000',
    { descricao: 'Valores crescentes separados por ponto e vírgula.' }),
  p('jur.indAjuizarAtencaoPct', 19, 'A ajuizar em atenção acima de', 'PERCENTUAL', '%', 40),
  p('jur.indRecupBomPct', 20, 'Taxa de recuperação boa a partir de', 'PERCENTUAL', '%', 30),
  p('jur.indRecupRuimPct', 21, 'Taxa de recuperação ruim até', 'PERCENTUAL', '%', 10),
  p('jur.indRetornoBom', 22, 'Retorno sobre o custo bom a partir de', 'DECIMAL', 'vezes', 3, { minimo: 0 }),
  p('jur.indRetornoRuim', 23, 'Retorno sobre o custo ruim até', 'DECIMAL', 'vezes', 1, { minimo: 0 }),
  p('jur.indSemAndBomDias', 24, 'Dias médios sem andamento bom até', 'INTEIRO', 'd', 30, { minimo: 0 }),
  p('jur.indSemAndRuimDias', 25, 'Dias médios sem andamento ruim a partir de', 'INTEIRO', 'd', 60, { minimo: 0 }),
  p('jur.indParadosBomPct', 26, 'Parados há mais de 30 dias bom até', 'PERCENTUAL', '%', 20),
  p('jur.indParadosRuimPct', 27, 'Parados há mais de 30 dias ruim a partir de', 'PERCENTUAL', '%', 50),
  p('jur.indExitoBomPct', 28, 'Taxa de êxito boa a partir de', 'PERCENTUAL', '%', 70),
  p('jur.indExitoRuimPct', 29, 'Taxa de êxito ruim até', 'PERCENTUAL', '%', 40),
  p('jur.indEditalBomPct', 30, 'Citação por edital boa até', 'PERCENTUAL', '%', 15),
  p('jur.indEditalRuimPct', 31, 'Citação por edital ruim a partir de', 'PERCENTUAL', '%', 30),
];

export const validarConjunto = {
  jur: (v) => {
    const n = (k) => Number(v[`jur.${k}`]);
    const motivos = [];
    if (!(n('prazoVermelhoDias') < n('prazoAmareloDias'))) motivos.push('Prazo: o limite do vermelho deve ser menor que o do amarelo.');
    if (!(n('paradoAtencaoDias') < n('paradoCriticoDias'))) motivos.push('Sem andamento: o limite de atenção deve ser menor que o crítico.');
    if (!(n('custoBomPct') < n('custoMetaPct'))) motivos.push('Custo: o limite bom deve ser menor que a meta.');
    const faixas = String(v['jur.faixasValor'] ?? '').split(';').map((s) => s.trim());
    if (!faixas.length || faixas.some((s) => !/^\d+(\.\d+)?$/.test(s)) || faixas.some((s, i) => i > 0 && Number(s) <= Number(faixas[i - 1]))) {
      motivos.push('Faixas de valor: números crescentes separados por ponto e vírgula.');
    }
    const maior = [['indRecupBomPct', 'indRecupRuimPct', 'Taxa de recuperação'], ['indRetornoBom', 'indRetornoRuim', 'Retorno sobre o custo'],
      ['indExitoBomPct', 'indExitoRuimPct', 'Taxa de êxito']];
    for (const [bom, ruim, rotulo] of maior) if (!(n(bom) > n(ruim))) motivos.push(`${rotulo}: o limite bom deve ser maior que o ruim.`);
    const menor = [['indSemAndBomDias', 'indSemAndRuimDias', 'Dias sem andamento'], ['indParadosBomPct', 'indParadosRuimPct', 'Parados'],
      ['indEditalBomPct', 'indEditalRuimPct', 'Citação por edital']];
    for (const [bom, ruim, rotulo] of menor) if (!(n(bom) < n(ruim))) motivos.push(`${rotulo}: o limite bom deve ser menor que o ruim.`);
    return motivos;
  },
};
