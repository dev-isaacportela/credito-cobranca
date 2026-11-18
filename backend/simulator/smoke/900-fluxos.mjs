// Fluxos entre módulos (06 §3, "Fluxos entre módulos"): o roteiro ponta a ponta do validador B5
// (`docs/validacao/B5-backend-final.md`, 85 conferências) como testes encadeados num banco só.
// Sem seed de spec: os clientes entram pelo Winthor simulado e toda chamada é de sessão, como a tela.
// Card editado por `kbCardAtualizar` (card inteiro) e movido por `kbCardMover`, sem escrita direta em KB_*.
//
//   F-0x cobrança → acordo → quebra → dossiê → Jurídico → acordo judicial → painel → histórico (8801)
//   F-1x concessão privada até o crédito em gestão (8802)
//   F-2x concessão pública até o crédito com contrato (8803)
//
// Os testes dependem um do outro (estado e relógio passam adiante); o primeiro que falhar derruba os seguintes.

import { teste, como, chamar, consultar, rodarRotinaAte, execucoes, fixarRelogio, assert, M, D, cliente, nota, dia } from './base.mjs';

export const SEEDS = [];
export const RELOGIO = D;

/* ── ajudantes ── */

const n = (v) => Number(v);
const um = (sql, ...p) => consultar(sql, ...p)[0];
const confere = (rotulo, cond, extra = '') => assert.ok(cond, `${rotulo} ${extra}`);
const ok = (rotulo, r) => { assert.notEqual(r?.ok, false, `${rotulo}: ${r?.error}`); return r; };
const recusa = (rotulo, r) => assert.equal(r?.ok, false, `${rotulo}: esperava recusa, veio ${JSON.stringify(r).slice(0, 200)}`);
const hoje = () => String(process.env.CC_AGORA).slice(0, 10);

// O relógio anda entre os testes (teste() volta a D): cada passo começa onde o anterior parou.
let relogio = D;
const passo = (titulo, fn) => teste(titulo, async () => {
  fixarRelogio(relogio);
  try { await fn(); } finally { relogio = String(process.env.CC_AGORA).slice(0, 19); }
});
const avancar = (dias) => fixarRelogio(new Date(Date.parse(`${process.env.CC_AGORA}Z`) + dias * 86400000).toISOString().slice(0, 19));

const leitura = async (rotulo = '') => {
  ok(`leitura ${rotulo}`, await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
  await rodarRotinaAte();
};
/** Como a tela: kbCardAtualizar com o card inteiro (título, valoresJson mesclado, responsáveis, prazo). */
const atualizarCard = (login, cardId, campos) => {
  const k = um('SELECT * FROM KB_CARD WHERE ID = ?', cardId);
  const resp = consultar('SELECT USUARIO_ID FROM KB_CARD_RESPONSAVEL WHERE CARD_ID = ?', cardId).map((r) => r.USUARIO_ID);
  return como(login, () => chamar('kbCardAtualizar', { cardId, titulo: k.TITULO, valoresJson: JSON.stringify({ ...JSON.parse(k.VALORES_JSON || '{}'), ...campos }),
    responsaveisIds: resp.join(','), responsavelId: resp[0] ?? 0, prazo: k.PRAZO ?? '' }));
};
const fid = (quadro, chave) => n(um('SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ? AND CHAVE = ?', quadro, chave).FASE_ID);
const AGENDA = { busca: '', limite: '100', offset: '0', carteira: '', agenteId: '0', buId: '-1', membroId: '0', clienteId: '0', cobrancaId: '0', nfId: '0',
  situacao: '', filtro: '', retorno: '', promessa: '', de: '', dias: '30' };
const PAINEL = { buId: '-1', carteira: '', mes: '' };

/* ── estado do roteiro ── */

const COD = 8801;
const COD2 = 8802;
const COD3 = 8803;
let cid = 0;
let acordoId = 0;
let pid = 0;
let aj = null;
let cid2 = 0;
let sid = 0;
let cardS = 0;
let lp = 0;
let cid3 = 0;
let sidP = 0;
let cardP = 0;

const caso = () => um(`SELECT CB.*, F.CHAVE AS FASE, K.RESPONSAVEL_ID, K.VALORES_JSON FROM CC_COBRANCA CB LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID
  LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE CB.CLIENTE_ID = ? AND CB.CARTEIRA = 'PRIVADA' ORDER BY CB.ID DESC LIMIT 1`, cid);
const proc = () => um(`SELECT P.*, F.CHAVE AS FASE FROM CC_PROCESSO P LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
  WHERE P.ID = ?`, pid);
const S = () => um(`SELECT S.*, F.CHAVE AS FASE FROM CC_SOLICITACAO S LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
  WHERE S.ID = ?`, sid);
const ACAO_DO_ACORDO = 'Conferir pagamento da parcela';

export async function suite() {
  /* ── F-0x · cobrança → Jurídico (8801, 30.000 vencidos há 25 dias) ── */

  await passo('F-01 · 001 → 002: leitura, atribuição à Ana e caso aberto pela régua', async () => {
    cliente({ codcli: COD, nome: 'HOSPITAL PONTA A PONTA', ramo: 1, email: 'financeiro@pontaaponta.test', limite: 50000 });
    nota({ codcli: COD, n: 1, emissao: dia(-55), itens: [{ codprod: 101, valor: 30000 }], parcelas: [{ prest: 1, valor: 30000, venc: dia(-25) }] });
    await leitura('cliente novo');
    cid = n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', COD)?.ID);
    confere('001: cliente lido do Winthor', cid > 0);
    ok('001: atribuir à Ana', await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(cid), agenteId: M.ana })));
    await leitura('após atribuição');
    const c = caso();
    confere('002: caso aberto pela régua', c?.FASE === 'neg_pos_protesto', c?.FASE);
    const pos = um("SELECT * FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ? AND CARTEIRA = 'PRIVADA'", cid);
    confere('001: posição com vencido 30.000', n(pos?.VENCIDO) === 30000, `vencido=${pos?.VENCIDO}`);
  });

  await passo('F-02 · 002 RN-017: contato, ficha de contatos e e-mail da régua aprovado na fila', async () => {
    const c = caso();
    ok('002: Ana registra contato', await como('ana', () => chamar('ccCobContatoRegistrar', { clienteId: cid, carteira: 'PRIVADA', canal: 'Telefone',
      retorno: 'Sem retorno / não atendeu', feedback: 'Ligação sem resposta.' })));
    ok('001: Ana cadastra contato financeiro com e-mail', await como('ana', () => chamar('ccBaseContatoSalvar', { contatoId: 0, clienteId: cid, nome: 'Maria Financeiro',
      area: 'Financeiro', funcao: '', telefone: '', whatsapp: '', email: 'maria@pontaaponta.test', situacao: 'CONFIRMADO', obs: '', principal: 1 })));
    recusa('002: fase em APROVAR não envia direto', await como('ana', () => chamar('ccCobEmailEnviar', { cobrancaId: c.ID })));
    const fila = consultar("SELECT ID FROM CC_EMAIL_FILA WHERE COBRANCA_ID = ? AND SITUACAO = 'PENDENTE'", c.ID);
    confere('002: item na fila', fila.length === 1, JSON.stringify(fila));
    ok('002: Sérgio aprova o e-mail da fila', await como('sergio', () => chamar('ccCobEmailFilaDecidir', { filaIds: String(fila[0].ID) })));
    confere('002: e-mail enviado (SIM_EMAIL)', consultar('SELECT * FROM SIM_EMAIL').length >= 1);
  });

  await passo('F-03 · 002 RN-012: acordo proposto pela Ana, recusado a ela e aprovado na alçada', async () => {
    const c = caso();
    const venc = n(um("SELECT VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ? AND CARTEIRA = 'PRIVADA'", cid).VENCIDO);
    const prop = ok('002: Ana propõe acordo', await como('ana', () => chamar('ccCobAcordoPropor', { cobrancaId: c.ID, debito: venc, valor: 30000, entrada: 6000,
      nParcelas: 4, entradaData: dia(0), primeiroVenc: dia(30), intervaloDias: 30, garantia: '' })));
    acordoId = prop.acordoId;
    confere('002: nível 2', n(prop.nivelExigido) === 2, prop.nivelExigido);
    confere('002: caso em negociação', caso().FASE === 'negociacao', caso().FASE);
    recusa('002: Ana (proponente) não decide', await como('ana', () => chamar('ccCobAcordoDecidir', { acordoId, aprovar: 1, parecer: '' })));
    ok('002: Sérgio aprova o acordo', await como('sergio', () => chamar('ccCobAcordoDecidir', { acordoId, aprovar: 1, parecer: 'Ok.' })));
    confere('002: acordo ATIVO e caso em acordo', um('SELECT SITUACAO FROM CC_ACORDO WHERE ID = ?', acordoId).SITUACAO === 'ATIVO' && caso().FASE === 'acordo', caso().FASE);
    confere('002: próxima ação do acordo', caso().PROX_ACAO === ACAO_DO_ACORDO, caso().PROX_ACAO);
  });

  await passo('F-04 · 002 C-015 · B5 C-05: entrada não paga → acordo quebrado, caso de volta à régua, próxima ação do acordo limpa', async () => {
    avancar(7);
    await leitura('D+7 (quebra)');
    confere('002: acordo QUEBRADO pela rotina', um('SELECT SITUACAO FROM CC_ACORDO WHERE ID = ?', acordoId).SITUACAO === 'QUEBRADO');
    const c = caso();
    confere('002: caso volta para a régua', c.FASE !== 'acordo', c.FASE);
    confere('002: próxima ação do acordo limpa', c.PROX_ACAO === '' && !c.PROX_ACAO_DATA, `${c.PROX_ACAO} ${c.PROX_ACAO_DATA}`);
    confere('002: capa sem a próxima ação do acordo', (JSON.parse(c.VALORES_JSON || '{}').proxima_acao || '') === '', c.VALORES_JSON);
    confere('002: limpeza auditada', consultar("SELECT 1 FROM CC_AUDITORIA WHERE ENTIDADE = 'COBRANCA' AND ENTIDADE_ID = ? AND CAMPO = 'Próxima ação'", c.ID).length === 1);
  });

  await passo('F-05 · 003: Ana abre e marca o dossiê; Gustavo envia (≤ 30 execuções); caso no Jurídico', async () => {
    avancar(16);
    await leitura('D+23');
    const dos = ok('003: Ana abre o dossiê', await como('ana', () => chamar('ccJurDossieAbrir', { clienteId: cid, carteira: 'PRIVADA' })));
    pid = n(dos.processoId);
    for (const it of consultar("SELECT ID, ITEM FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ? AND SITUACAO = 'PENDENTE' AND ITEM <> 'alcada'", pid)) {
      ok(`003: item ${it.ITEM}`, await como('ana', () => chamar('ccJurDossieItemMarcar', { itemId: it.ID, situacao: 'NA', obs: 'Não se aplica neste roteiro.' })));
    }
    const custo = await execucoes(async () => ok('003: Gustavo envia o dossiê', await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: pid }))));
    confere('003: envio ≤ 30 execuções', custo <= 30, `custo=${custo}`);
    confere('003: processo recebido', proc().FASE === 'recebido', proc().FASE);
    confere('002: cobrança em juridico', caso().FASE === 'juridico', caso().FASE);
    confere('001: cliente NO_JURIDICO', n(um('SELECT NO_JURIDICO FROM CC_CLIENTE WHERE ID = ?', cid).NO_JURIDICO) === 1);
  });

  await passo('F-06 · 003: Júlia grava autos e andamento, cria o acordo judicial, move o card e recebe a entrada', async () => {
    ok('003: Júlia grava autos', await como('julia', () => chamar('ccJurProcessoSalvar', { processoId: pid, autos: '0712345-11.2024.8.07.0001' })));
    ok('003: Júlia registra andamento', await como('julia', () => chamar('ccJurAndamentoRegistrar', { processoId: pid, texto: 'Petição inicial protocolada.' })));
    aj = ok('003: Júlia cria acordo judicial', await como('julia', () => chamar('ccJurAcordoCriar', { processoId: pid, valor: 30000, entrada: 6000, nParcelas: 4,
      primeiroVencimento: hoje() })));
    confere('003: acordo judicial em ANDAMENTO', aj.situacao === 'ANDAMENTO', aj.situacao);
    ok('003: Júlia move processo para acordo', await como('julia', () => chamar('kbCardMover', { cardId: proc().CARD_ID, faseId: fid('juridico', 'acordo'), ordem: 0 })));
    const parc = consultar('SELECT * FROM CC_ACORDO_JUDICIAL_PARCELA WHERE ACORDO_ID = ? ORDER BY NUMERO', aj.acordoId);
    ok('003: entrada paga', await como('julia', () => chamar('ccJurAcordoParcelaSituacao', { parcelaId: parc[0].ID, situacao: 'PAGA', pagoEm: hoje() })));
    const ficha = ok('003: ficha', await como('julia', () => chamar('ccJurProcessoFicha', { processoId: pid })));
    confere('003: recuperado = entrada', n(ficha.processo.RECUPERADO) === 6000, `RECUPERADO=${ficha.processo.RECUPERADO}`);
  });

  await passo('F-07 · 002/003 · B5 C-05: nova rotina mantém as fases; o caso no Jurídico não mostra "Conferir pagamento da parcela"', async () => {
    await leitura('após o Jurídico');
    confere('002: cobrança continua em juridico', caso().FASE === 'juridico', caso().FASE);
    confere('003: processo continua em acordo', proc().FASE === 'acordo', proc().FASE);
    const ag = (await como('ana', () => chamar('ccCobAgendaListar', { ...AGENDA, ate: hoje() }))).rows || [];
    const doCaso = ag.filter((e) => n(e.COBRANCA_ID) === n(caso().ID));
    confere('002: agenda da Ana sem a ação do acordo', !doCaso.some((e) => e.TEXTO === ACAO_DO_ACORDO), JSON.stringify(doCaso));
    confere('002: capa sem a ação do acordo', (JSON.parse(caso().VALORES_JSON || '{}').proxima_acao || '') !== ACAO_DO_ACORDO);
  });

  await passo('F-08 · 003 D-08 · 006 RN-004: resumo do Jurídico e painel batem com as donas', async () => {
    const mes = hoje().slice(0, 7);
    const jr = (await como('gustavo', () => chamar('ccJurResumo', { buId: '-1', mes, carteira: '', filial: '' }))).rows?.[0];
    confere('003: RECUPERADO_MES = 6.000', n(jr?.RECUPERADO_MES) === 6000, `=${jr?.RECUPERADO_MES}`);
    confere('003: acordos a receber = 1 / 24.000 (D-08)', n(jr?.ACORDOS_A_RECEBER) === 1 && n(jr?.VALOR_ACORDOS_A_RECEBER) === 24000, JSON.stringify(jr));
    const pp = ok('006: ccPainelPosicao', await como('gustavo', () => chamar('ccPainelPosicao', PAINEL)));
    const kpis = (await como('gustavo', () => chamar('ccCobPainelKpis', { de: '', ate: '', buId: '-1', carteira: '', agenteId: '0' }))).rows?.[0];
    const winthor = um('SELECT SUM(VALOR - COALESCE(VPAGO, 0)) AS V FROM PCPREST WHERE CODCLI = ? AND DTPAG IS NULL', COD);
    confere('006 × 002: vencido do painel = KPI da cobrança = Winthor', n(pp.vencido) === n(kpis?.VENCIDO) && n(pp.vencido) === n(winthor.V),
      `painel=${pp.vencido} cob=${kpis?.VENCIDO} winthor=${winthor.V}`);
    confere('006: PDD 3.000', n(pp.pdd) === 3000, pp.pdd);
    ok('006: ccPainelCredito', await como('gustavo', () => chamar('ccPainelCredito', PAINEL)));
    const at = ok('006: ccPainelAtencao', await como('gustavo', () => chamar('ccPainelAtencao', PAINEL)));
    for (const tipo of ['INAD_ACIMA_ALERTA', 'BLOQUEIO_NAO_APLICADO', 'CONCENTRACAO']) confere(`006: atenção traz ${tipo}`, at.some((x) => x.tipo === tipo), JSON.stringify(at));
    recusa('006: Jurídico não abre o painel', await como('julia', () => chamar('ccPainelPosicao', PAINEL)));
  });

  await passo('F-09 · 007 RN-004 · P-27: linha do tempo do cliente com todos os módulos; Júlia sem "Alteração auditada"', async () => {
    const PADH = { busca: '', limite: '200', offset: '0', categoria: '', de: '', ate: '', clienteId: cid };
    const res = ok('007: ccHistResumo', await como('gustavo', () => chamar('ccHistResumo', { clienteId: cid })));
    const ev = (await como('gustavo', () => chamar('ccHistEventoListar', PADH))).rows || [];
    const origens = {};
    for (const e of ev) origens[e.ORIGEM] = (origens[e.ORIGEM] || 0) + 1;
    for (const o of ['CONTATO', 'EMAIL', 'ACORDO', 'ACORDO_DECISAO', 'ACORDO_FIM', 'MOV_COB', 'DOSSIE', 'DOSSIE_ENVIO', 'ANDAMENTO', 'ACORDO_JUD', 'MOV_JUR']) {
      confere(`007: linha do tempo tem ${o}`, (origens[o] || 0) > 0, JSON.stringify(origens));
    }
    confere('007: total do resumo = linhas', n(res.total) === ev.length, `resumo=${res.total} linhas=${ev.length}`);
    const evJ = (await como('julia', () => chamar('ccHistEventoListar', PADH))).rows || [];
    confere('007: Júlia vê eventos', evJ.length > 0);
    confere('007: Júlia não vê Alteração auditada (P-27)', evJ.every((e) => e.ORIGEM !== 'AUDITORIA'));
  });

  /* ── F-1x · concessão privada (8802, Rita analista) ── */

  await passo('F-10 · 004: Rita abre a solicitação, grava dados e consultas; motor e proposta', async () => {
    cliente({ codcli: COD2, nome: 'CLINICA CONCESSAO E2E', ramo: 2, email: 'fin@concessao.test', limite: 0 });
    nota({ codcli: COD2, n: 1, emissao: dia(-100), itens: [{ codprod: 101, valor: 5000 }], parcelas: [{ prest: 1, valor: 5000, venc: dia(-70), pago: true }] });
    await leitura('cliente da concessão');
    cid2 = n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', COD2).ID);
    ok('001: atribuir ao Bruno', await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(cid2), agenteId: M.bruno })));
    await como(null, () => chamar('ccEscBaseClienteAnalista', { clienteId: cid2, analistaId: M.rita, membroId: M.gustavo, agora: process.env.CC_AGORA }));
    const sol = ok('004: Rita abre a solicitação', await como('rita', () => chamar('ccCredSolicitacaoCriar', { clienteId: cid2, carteira: 'PRIVADA', tipoCliente: 'NOVO',
      valor: 30000, prazoMeses: 3, justificativa: 'Compras recorrentes.', analistaId: M.rita, rca: 'CARLOS LIMA' })));
    sid = n(sol.id);
    cardS = n(sol.cardId);
    ok('004: dados e consultas', await como('rita', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: sid, consData: dia(-2), consReceita: 'ATIVA',
      consProtesto: 'SEM', consProcesso: 'SEM', consSocios: 'SEM', scoreSerasa: 850, fpTipo: 'RECURSOS_PROPRIOS', fatMensal: 200000 })));
    confere('004: motor sugere 2.000', n(S().MOTOR_LIMITE) === 2000, S().MOTOR_LIMITE);
    lp = Math.min(30000, n(S().MOTOR_LIMITE));
    ok('004: proposta', await como('rita', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: sid, limiteProposto: lp, parecer: 'Cliente pontual.' })));
  });

  await passo('F-11 · 004 RN-005: card movido e marcado pela tela (kbCardMover/kbCardAtualizar) até o comitê', async () => {
    ok('004: Rita move para cadastral', await como('rita', () => chamar('kbCardMover', { cardId: cardS, faseId: fid('concessao-privada', 'cadastral'), ordem: 0 })));
    ok('004: Rita marca o checklist', await atualizarCard('rita', cardS, { cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' }));
    for (const ch of ['credito', 'comite']) {
      ok(`004: Rita move para ${ch}`, await como('rita', () => chamar('kbCardMover', { cardId: cardS, faseId: fid('concessao-privada', ch), ordem: 0 })));
    }
    confere('004: solicitação no comitê', S().FASE === 'comite', S().FASE);
  });

  await passo('F-12 · 004: alçada decide, pendência ao Winthor, termo, liberação e crédito em gestão', async () => {
    recusa('004: analista não decide a própria', await como('rita', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: sid, resultado: 'APROVADA',
      limiteAprovado: lp, planoCod: '30', forma: 'Boleto bancário', parecer: 'x' })));
    ok('004: Sérgio decide na alçada', await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: sid, resultado: 'APROVADA', limiteAprovado: lp,
      planoCod: '30', forma: 'Boleto bancário', parecer: 'Aprovado dentro da política.' })));
    const pend = um("SELECT * FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM = 'SOLICITACAO' AND ORIGEM_ID = ?", sid);
    confere('004: pendência ao Winthor com o valor aprovado', pend && n(pend.VALOR) === lp, `valor=${pend?.VALOR}`);
    ok('004: termo anexado pelo card', await atualizarCard('rita', cardS, { termo_assinado: ['https://arquivos.test/termo.pdf'] }));
    ok('004: Rita leva à Liberação', await como('rita', () => chamar('kbCardMover', { cardId: cardS, faseId: fid('concessao-privada', 'liberacao'), ordem: 0 })));
    ok('004: Rita aplica a pendência', await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID, obs: 'Aplicado no Winthor.' })));
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', sid);
    confere('004: crédito em GESTAO e card em gestao', cr?.SITUACAO === 'GESTAO' && S().FASE === 'gestao', `${cr?.SITUACAO} fase=${S().FASE}`);
  });

  await passo('F-13 · 006 · 007: painel de crédito conta a aprovada; histórico traz solicitação, decisão, crédito e movimentos', async () => {
    // Compra recente (paga): sem ela a rotina de 12/12 torna o crédito OBSOLETO (sem compras há 120+ dias), e o F-14 não teria o que reanalisar.
    nota({ codcli: COD2, n: 2, emissao: dia(10), itens: [{ codprod: 101, valor: 1000 }], parcelas: [{ prest: 1, valor: 1000, venc: dia(20), pago: true }] });
    await leitura('após crédito');
    const pc = ok('006: ccPainelCredito', await como('gustavo', () => chamar('ccPainelCredito', PAINEL)));
    const priv = pc.porCarteira.find((x) => x.carteira === 'PRIVADA');
    confere('006: 1 aprovada, concedido 2.000', n(priv.aprovadas) === 1 && n(priv.concedido) === 2000, JSON.stringify(priv));
    const ev = (await como('gustavo', () => chamar('ccHistEventoListar', { busca: '', limite: '200', offset: '0', categoria: '', de: '', ate: '', clienteId: cid2 }))).rows || [];
    const origens = {};
    for (const e of ev) origens[e.ORIGEM] = (origens[e.ORIGEM] || 0) + 1;
    for (const o of ['SOLICITACAO', 'DECISAO', 'CREDITO', 'MOV_CRED']) confere(`007: linha do tempo da concessão tem ${o}`, (origens[o] || 0) > 0, JSON.stringify(origens));
  });

  await passo('F-14 · B5 B-01: reanálise antecipada do crédito do 8802 (ccEscCredCreditoSituacao, sem 1093)', async () => {
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', sid);
    confere('004: crédito em gestão', cr.SITUACAO === 'GESTAO', `${cr.SITUACAO} ${cr.MOTIVO_ENCAMINHAMENTO}`);
    ok('004: Sérgio antecipa a reanálise', await como('sergio', () => chamar('ccCredReanaliseAbrir', { creditoId: cr.ID, motivo: 'Uso crescente.' })));
    confere('004: crédito em REANALISE', um('SELECT SITUACAO FROM CC_CREDITO WHERE ID = ?', cr.ID).SITUACAO === 'REANALISE');
    ok('004: Sérgio renova', await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Cliente comprando em dia.' })));
    const linhas = consultar('SELECT SITUACAO FROM CC_CREDITO WHERE CLIENTE_ID = ? ORDER BY ID', cid2).map((l) => l.SITUACAO);
    confere('004: período anterior encerrado e o novo em gestão', JSON.stringify(linhas) === '["ENCERRADO","GESTAO"]', JSON.stringify(linhas));
  });

  await passo('F-15 · B5 C-02 · R-003: Ana não lê direto o Winthor do 8802 (cliente do Bruno) nem a ficha dele', async () => {
    await assert.rejects(como('ana', () => chamar('ccBaseWinthorTitulos', { codcli: COD2 })), /fora do perfil/);
    await assert.rejects(como('ana', () => chamar('ccBaseWinthorCliente', { codcli: COD2, documento: '' })), /fora do perfil/);
    recusa('001: Ana não abre a ficha do 8802', await como('ana', () => chamar('ccBaseClienteFicha', { codcli: COD2 })));
    recusa('001: Ana não lê os títulos do 8802', await como('ana', () => chamar('ccBaseTitulosAbertos', { clienteId: cid2, carteira: '', soVencidos: 0, membroId: 0 })));
  });

  /* ── F-2x · concessão pública (órgão 8803, ramo 13) ── */

  await passo('F-20 · 005: órgão lido no setor público e solicitação aberta na Pública', async () => {
    cliente({ codcli: COD3, nome: 'FUNDO MUNICIPAL DE SAUDE E2E', ramo: 13, email: 'fms@e2e.test', limite: 0 });
    nota({ codcli: COD3, n: 1, emissao: dia(-100), itens: [{ codprod: 201, valor: 8000 }], parcelas: [{ prest: 1, valor: 8000, venc: dia(-70), pago: true }] });
    await leitura('órgão');
    cid3 = n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', COD3).ID);
    confere('001: setor PUBLICO pelo ramo', um('SELECT SETOR FROM CC_CLIENTE WHERE ID = ?', cid3).SETOR === 'PUBLICO');
    ok('001: atribuir ao Carlos', await como('gustavo', () => chamar('ccBaseClienteAtribuir', { clienteIds: String(cid3), agenteId: M.carlos })));
    const sp = ok('004: Carlos abre a solicitação na PUBLICA', await como('carlos', () => chamar('ccCredSolicitacaoCriar', { clienteId: cid3, carteira: 'PUBLICA',
      tipoCliente: 'NOVO', valor: 80000, prazoMeses: 3, justificativa: 'Contrato com o órgão.', analistaId: M.carlos, rca: 'CARLOS LIMA' })));
    sidP = n(sp.id);
    cardP = n(sp.cardId);
  });

  await passo('F-21 · 005: análise do órgão (motor P1) e card até o comitê', async () => {
    ok('005: Carlos grava a análise do órgão', await como('carlos', () => chamar('ccPubAnaliseSalvar', { solicitacaoId: sidP, esfera: 'MUNICIPAL', capag: 'A',
      pessoalPct: 40, cauc: 'REGULAR', fonteTipo: 'SUS', fontePagadora: 'Fundo Municipal de Saúde', perfilPag: 'PONTUAL', empenhoPrevio: 'SIM',
      contratoVigente: 'SIM', base: 'CONTRATO', contrato: 'CT 12/2026', saldoContrato: 500000, vigenciaFim: '2027-12-31', valorEstimado: 500000 })));
    const ao = um('SELECT * FROM CC_ANALISE_ORGAO WHERE SOLICITACAO_ID = ?', sidP);
    confere('005: P1 com exposição 500.000', ao?.RATING_PUB === 'P1' && n(ao?.EXPOSICAO) === 500000, JSON.stringify(ao).slice(0, 200));
    ok('004/005: Carlos move para analise', await como('carlos', () => chamar('kbCardMover', { cardId: cardP, faseId: fid('concessao-publica', 'analise'), ordem: 0 })));
    ok('004/005: Carlos marca a análise', await atualizarCard('carlos', cardP, { analise_1: '1', analise_2: '1' }));
    ok('004/005: Carlos move para comite', await como('carlos', () => chamar('kbCardMover', { cardId: cardP, faseId: fid('concessao-publica', 'comite'), ordem: 0 })));
  });

  await passo('F-22 · 004/005: proponente não decide; Silvia aprova; crédito com a análise do órgão e contrato listado', async () => {
    const ao = um('SELECT * FROM CC_ANALISE_ORGAO WHERE SOLICITACAO_ID = ?', sidP);
    const lim = Math.min(80000, n(ao.EXPOSICAO));
    const decidir = (login) => como(login, () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: sidP, resultado: 'APROVADA', limiteAprovado: lim, planoCod: '30',
      forma: 'Boleto bancário', parecer: 'Órgão com contrato ativo.' }));
    recusa('004: Carlos (proponente) não decide', await decidir('carlos'));
    ok('004: Silvia decide a Pública', await decidir('silvia'));
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', sidP);
    confere('004/005: crédito público em GESTAO com ANALISE_ORGAO_ID', cr?.SITUACAO === 'GESTAO' && n(cr?.ANALISE_ORGAO_ID) === n(ao.ID), `${cr?.SITUACAO} ${cr?.ANALISE_ORGAO_ID}`);
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ? ORDER BY ID DESC", sidP);
    confere('004: decisão copia RATING_PUB', d?.RATING_PUB === ao.RATING_PUB, d?.RATING_PUB);
    const ctr = (await como('carlos', () => chamar('ccPubContratoListar', { busca: '', limite: '50', offset: '0', situacao: '', clienteId: '0', vencendoEmDias: '0' }))).rows || [];
    confere('005: contrato listado com saldo 100%', ctr.some((x) => n(x.CREDITO_ID) === n(cr.ID) && n(x.SALDO_PCT) === 100), JSON.stringify(ctr).slice(0, 300));
  });
}
