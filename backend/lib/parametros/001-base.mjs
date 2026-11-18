// Chaves da 001 (03 §1, §2, §3, §8) e a validação cruzada de cada grupo (RN-016).
// `validarConjunto[grupo](valores)` recebe `{ 'grupo.chave': valor tipado }` do conjunto em vigor
// da carteira (todas as chaves de todos os grupos), já com o lote aplicado, e devolve a lista de motivos.
// ccBaseParametroSalvar roda todo grupo a cada salvamento, então a regra cruzada vale nos dois sentidos. Cada função é autocontida:
// a 001 cola o texto dela (`toString()`) no corpo de ccBaseParametroSalvar.

const b = (chave, ordem, rotulo, tipo, unidade, padrao, extra = {}) =>
  ({ chave, grupo: chave.split('.')[0], ordem, rotulo, tipo, unidade, padrao, minimo: null, maximo: null,
    porCarteira: false, comVigencia: false, usadoPor: '001', descricao: '', ...extra });

export const PARAMETROS = [
  // 1. base.* — leitura do Winthor e calendário
  b('base.syncIntervaloMin', 1, 'Intervalo da leitura do Winthor', 'INTEIRO', 'min', 15, { minimo: 5, maximo: 120, usadoPor: '001, 006' }),
  b('base.syncJanelaMeses', 2, 'Janela de movimento da leitura', 'INTEIRO', 'm', 12, { minimo: 1, maximo: 36 }),
  b('base.comprasJanelaDias', 3, 'Janela das compras', 'INTEIRO', 'd', 90, { minimo: 30, maximo: 365, usadoPor: '001, 004' }),
  b('base.pontualidadeMeses', 4, 'Janela da pontualidade', 'INTEIRO', 'm', 12, { minimo: 1, maximo: 36, usadoPor: '001, 002, 004' }),
  b('base.calendarioUf', 5, 'UF do calendário da empresa', 'TEXTO', 'txt', 'DF'),
  b('base.fichaValidadeDias', 6, 'Validade da ficha de contatos', 'INTEIRO', 'd', 180, { minimo: 30, maximo: 730, usadoPor: '001, 004' }),
  b('base.ramosPublicos', 7, 'Ramos de atividade do setor público', 'LISTA', 'lista', '11,12,13,14,15',
    { descricao: 'Códigos de PCATIVI separados por vírgula; pode ser vazio.' }),
  b('base.ramoPublicoPrefixo', 8, 'Prefixo do nome do ramo público', 'TEXTO', 'txt', 'ORGAO PUBLICO',
    { descricao: 'Pode ser vazio; vazio junto com a lista de ramos = ninguém é público (recusado).' }),
  b('base.ramosEsfera', 9, 'Esfera por ramo', 'LISTA', 'lista', '',
    { usadoPor: '001, 005', descricao: 'Pares código=FEDERAL|ESTADUAL|MUNICIPAL separados por vírgula.' }),
  b('base.vencimentoDiaNaoUtil', 10, 'Vencimento em dia não útil', 'OPCAO', 'op', 'CORRIDO',
    { opcoes: ['CORRIDO', 'PROXIMO_UTIL', 'UTIL_ANTERIOR'], porCarteira: true, comVigencia: true }),
  b('base.cobrancasExcluidas', 11, 'Tipos de cobrança excluídos da posição', 'LISTA', 'lista', '',
    { descricao: 'Códigos de PCCOB separados por vírgula.' }),
  b('base.rotinaUsuarioEmail', 12, 'Usuário da rotina nos quadros', 'TEXTO', 'txt', '',
    { descricao: 'E-mail de usuário existente; vazio = primeiro ADMIN ativo.' }),

  // 2. com.* — identidade da comunicação
  b('com.telefone', 1, 'Telefone de contato', 'TEXTO', 'txt', '(61) 3033-3116', { porCarteira: true, usadoPor: '001, 002, 003, 005' }),
  b('com.email', 2, 'E-mail de contato', 'TEXTO', 'txt', 'cobranca@benenutri.com', { porCarteira: true, usadoPor: '001, 002, 003, 005' }),
  b('com.assinatura', 3, 'Assinatura dos e-mails', 'TEXTO', 'txt', 'Equipe de Crédito e Cobrança – Grupo Benenutri',
    { porCarteira: true, usadoPor: '001, 002, 003, 005' }),
  b('com.politicaVersao', 4, 'Versão da Política de Crédito e Cobrança', 'TEXTO', 'txt', '5.2', { comVigencia: true, usadoPor: '001, 007' }),
  b('com.modeloRevalidarMeses', 5, 'Validade da validação de modelo', 'INTEIRO', 'm', 12, { minimo: 1, maximo: 60 }),
  b('com.modeloValidaNivel', 6, 'Nível que valida modelo com efeito legal', 'INTEIRO', 'nível', 3, { minimo: 1, maximo: 5 }),

  // 3. crit.* — criticidade do cliente (calcula a 004)
  b('crit.atrasoAlerta', 1, 'Atraso de alerta', 'INTEIRO', 'd', 1, { porCarteira: true, usadoPor: '004, 006' }),
  b('crit.atrasoCritico', 2, 'Atraso crítico', 'INTEIRO', 'd', 30, { porCarteira: true, usadoPor: '004, 006' }),
  b('crit.pontAlerta', 3, 'Pontualidade de alerta', 'PERCENTUAL', '%', 90, { porCarteira: true, usadoPor: '004' }),
  b('crit.pontCritico', 4, 'Pontualidade crítica', 'PERCENTUAL', '%', 80, { porCarteira: true, usadoPor: '004' }),
  b('crit.scoreAlerta', 5, 'Score de alerta', 'INTEIRO', 'pts', 600, { minimo: 0, maximo: 1000, porCarteira: true, usadoPor: '004' }),
  b('crit.scoreCritico', 6, 'Score crítico', 'INTEIRO', 'pts', 400, { minimo: 0, maximo: 1000, porCarteira: true, usadoPor: '004' }),
  b('crit.usoAlerta', 7, 'Uso do limite de alerta', 'PERCENTUAL', '%', 90, { porCarteira: true, usadoPor: '004, 006' }),
  b('crit.usoCritico', 8, 'Uso do limite crítico', 'PERCENTUAL', '%', 100, { porCarteira: true, usadoPor: '004, 006' }),
  b('crit.prazoAlerta', 9, 'Prazo médio de alerta', 'INTEIRO', 'd', 60, { porCarteira: true, usadoPor: '004' }),
  b('crit.prazoCritico', 10, 'Prazo médio crítico', 'INTEIRO', 'd', 90, { porCarteira: true, usadoPor: '004' }),
  b('crit.ratingAlerta', 11, 'Rating de alerta', 'RATING', 'op', 'D', { porCarteira: true, usadoPor: '004' }),
  b('crit.ratingCritico', 12, 'Rating crítico', 'RATING', 'op', 'E', { porCarteira: true, usadoPor: '004' }),
  b('crit.alertasParaCritico', 13, 'Alertas simultâneos que viram crítico', 'INTEIRO', 'qtd', 3, { minimo: 1, maximo: 6, porCarteira: true, usadoPor: '004' }),
  b('crit.inadDias', 14, 'Inadimplente a partir de', 'INTEIRO', 'd', 1, { minimo: 1, porCarteira: true, usadoPor: '002, 004, 006' }),

  // 8. pdd.* — provisão por faixa de atraso (calculam 002 e 006)
  ...[['a vencer', 0.5], ['1 a 30 dias', 3], ['31 a 60 dias', 10], ['61 a 90 dias', 30], ['91 a 180 dias', 50], ['acima de 180 dias', 100]]
    .map(([faixa, padrao], i) => b(`pdd.f${i}`, i + 1, `Provisão — ${faixa}`, 'PERCENTUAL', '%', padrao,
      { porCarteira: true, comVigencia: true, usadoPor: '002, 006' })),
];

export const validarConjunto = {
  base: (v) => {
    const motivos = [];
    if (Number(v['base.syncIntervaloMin']) % 5 !== 0) motivos.push('Intervalo da leitura do Winthor: precisa ser múltiplo de 5.');
    const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
    if (!UFS.includes(String(v['base.calendarioUf'] ?? '').toUpperCase())) motivos.push('UF do calendário da empresa: informe uma UF válida.');
    const ramos = String(v['base.ramosPublicos'] ?? '').trim();
    const prefixo = String(v['base.ramoPublicoPrefixo'] ?? '').trim();
    if (ramos !== '' && !/^\d+(\s*,\s*\d+)*$/.test(ramos)) motivos.push('Ramos de atividade do setor público: use códigos separados por vírgula.');
    if (ramos === '' && prefixo === '') motivos.push('A lista de ramos públicos e o prefixo do nome do ramo não podem ficar vazios ao mesmo tempo.');
    const esferas = String(v['base.ramosEsfera'] ?? '').trim();
    if (esferas !== '' && !esferas.split(',').every((p) => /^\s*\d+\s*=\s*(FEDERAL|ESTADUAL|MUNICIPAL)\s*$/.test(p))) {
      motivos.push('Esfera por ramo: use pares código=FEDERAL, ESTADUAL ou MUNICIPAL separados por vírgula.');
    }
    const email = String(v['base.rotinaUsuarioEmail'] ?? '').trim();
    if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) motivos.push('Usuário da rotina nos quadros: e-mail inválido.');
    return motivos;
  },
  com: (v) => {
    const motivos = [];
    if (String(v['com.telefone'] ?? '').trim() === '') motivos.push('Telefone de contato: valor obrigatório.');
    if (String(v['com.assinatura'] ?? '').trim() === '') motivos.push('Assinatura dos e-mails: valor obrigatório.');
    if (String(v['com.politicaVersao'] ?? '').trim() === '') motivos.push('Versão da Política: valor obrigatório.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v['com.email'] ?? '').trim())) motivos.push('E-mail de contato: informe um e-mail válido.');
    return motivos;
  },
  crit: (v) => {
    const motivos = [];
    const n = (k) => Number(v[`crit.${k}`]);
    const brando = (nome, ok, regra) => { if (!ok) motivos.push(`${nome}: o alerta precisa ser mais brando que o crítico (${regra}).`); };
    brando('Atraso', n('atrasoAlerta') < n('atrasoCritico'), 'alerta < crítico');
    brando('Pontualidade', n('pontAlerta') > n('pontCritico'), 'alerta > crítico');
    brando('Score', n('scoreAlerta') > n('scoreCritico'), 'alerta > crítico');
    brando('Uso do limite', n('usoAlerta') < n('usoCritico'), 'alerta < crítico');
    brando('Prazo médio', n('prazoAlerta') < n('prazoCritico'), 'alerta < crítico');
    const ordem = ['AA', 'A', 'B', 'C', 'D', 'E'];
    brando('Rating', ordem.indexOf(String(v['crit.ratingAlerta'])) < ordem.indexOf(String(v['crit.ratingCritico'])), 'alerta melhor que o crítico');
    return motivos;
  },
  pdd: (v) => {
    const faixas = [0, 1, 2, 3, 4, 5].map((i) => Number(v[`pdd.f${i}`]));
    for (let i = 1; i < faixas.length; i += 1) {
      if (faixas[i] < faixas[i - 1]) return ['Provisão: os percentuais não podem diminuir da faixa "a vencer" até "acima de 180 dias".'];
    }
    return [];
  },
};
