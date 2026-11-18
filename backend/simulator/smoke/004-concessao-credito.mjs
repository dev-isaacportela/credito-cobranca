// Smoke da 004-concessao-credito (plan, seção Testes). Cada teste() começa de uma cópia do banco do passo 11.
// Regra pura sem banco fica em tests/004-concessao-credito.test.mjs. Os testes de fluxo abrem a própria
// solicitação nos clientes genéricos (4070–4099) com os ajudantes de `fluxo` (RN-038).

import {
  teste as testeBase, pular, consultar, como, chamar, rodarCron, rodarRotinaAte, execucoes, nasDuasSessoes, existe,
  assert, U, M, dia, nota, fixarRelogio, comRelogio,
} from './base.mjs';
import { db } from './base.mjs';
import { somarMeses } from '../../lib/tempo.mjs';

export const SEEDS = ['004'];
export const RELOGIO = '2026-11-14T10:00:00';
export const BANCO_POR_TESTE = true;

// SO=C-016 node simulator/smoke.mjs 004 → só os testes cujo título contém o texto.
const teste = (titulo, fn) => (!process.env.SO || titulo.includes(process.env.SO) ? testeBase(titulo, fn) : null);

/* ── ajudantes ── */

const PADRAO = {
  busca: '', limite: '200', offset: '0', carteira: '', faseChave: '', analistaId: '0', situacao: '', clienteId: '0', solicitacaoId: '0', cardId: '0',
  creditoId: '0', pedidoId: '0', pendenciaId: '0', gravar: '0', agrupar: '', classe: '', vencendoEmDias: '0', vencidos: '0', divergeWinthor: '0',
  gatilho: '', tipo: '', membroId: '0', rating: '', rebaixado: '-1', saude: '', criticidade: '', tipoPessoa: '', de: '', ate: '', entradas: '{}',
};
const linhas = async (nome, input = {}) => (await chamar(nome, { ...PADRAO, ...input })).rows;
const linha = async (nome, input) => (await linhas(nome, input))[0];
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => {
  assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 300)}`);
  if (re) assert.match(r.error, re);
  return r;
};
const n = (v) => Number(v);
const um = (sql, ...p) => consultar(sql, ...p)[0];
const contar = (sql, ...p) => n(um(sql, ...p).N);
const idDe = (codcli) => n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
const SOL = `SELECT S.*, F.CHAVE AS FASE, C.CODCLI FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID`;
const sol = (id) => um(`${SOL} WHERE S.ID = ?`, id);
const solDe = (codcli, carteira = 'PRIVADA') => um(`${SOL} WHERE C.CODCLI = ? AND S.CARTEIRA = ? ORDER BY S.ID DESC`, codcli, carteira);
const credDe = (codcli) => um(`SELECT CR.*, F.CHAVE AS FASE, S.CARD_ID FROM CC_CREDITO CR JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID JOIN CC_SOLICITACAO S ON S.ID = CR.SOLICITACAO_ID
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE C.CODCLI = ? ORDER BY CR.ID DESC`, codcli);
const ped = (id) => um(`SELECT P.*, F.CHAVE AS FASE FROM CC_PEDIDO_RETIDO P LEFT JOIN KB_CARD K ON K.ID = P.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE P.ID = ?`, id);
const faseDoCard = (cardId) => um('SELECT F.CHAVE FROM KB_CARD K JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE K.ID = ?', cardId)?.CHAVE;
const faseId = (quadro, chave) => n(um('SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ? AND CHAVE = ?', quadro, chave).FASE_ID);
const quadroDe = (carteira) => `concessao-${carteira.toLowerCase()}`;
const valores = (cardId) => JSON.parse(um('SELECT VALORES_JSON FROM KB_CARD WHERE ID = ?', cardId).VALORES_JSON || '{}');
/** Marca campos do card direto no banco (o que a tela grava pelo kbCardAtualizar). */
function marcar(cardId, campos) {
  db().prepare('UPDATE KB_CARD SET VALORES_JSON = ? WHERE ID = ?').run(JSON.stringify({ ...valores(cardId), ...campos }), cardId);
}
/** Move como a sessão atual (a tela chama kbCardMover direto). */
const mover = (cardId, quadro, chave) => chamar('kbCardMover', { cardId, faseId: faseId(quadro, chave), ordem: 0 });
/** Leva o card sem sessão (como a rotina); a condição de entrada da fase vale. */
const levar = (cardId, quadro, chave) => como(null, () => chamar('kbCardMover', { cardId, faseId: faseId(quadro, chave), ordem: 0, movidoPor: U.gustavo, origem: 'sistema' }));

const DADOS_OK = (extra = {}) => ({ consData: dia(-2), consReceita: 'ATIVA', consProtesto: 'SEM', consProcesso: 'SEM', consSocios: 'SEM', scoreSerasa: 850,
  fpTipo: 'RECURSOS_PROPRIOS', fatMensal: 200000, ...extra });
const DECISAO = (extra = {}) => ({ resultado: 'APROVADA', planoCod: '30', forma: 'Boleto bancário', parecer: 'Aprovado dentro da política.', ...extra });

/** A 005 instalada: `add-050-setor-publico.mjs` no PUBLISH_ORDER com o motor e a análise do órgão. */
const tem005 = () => existe('ccPubMotorCalcular') && existe('ccPubAnaliseSalvar');
const com005 = () => { if (!tem005()) pular('depende de 005'); };
/** Análise de órgão com contrato ativo (pode aprovar). */
const ANALISE = (extra = {}) => ({ esfera: 'MUNICIPAL', capag: 'A', pessoalPct: 40, cauc: 'REGULAR', fonteTipo: 'SUS', fontePagadora: 'Fundo Municipal de Saúde',
  perfilPag: 'PONTUAL', empenhoPrevio: 'SIM', contratoVigente: 'SIM', base: 'CONTRATO', contrato: 'CT 12/2026', saldoContrato: 500000, vigenciaFim: '2027-12-31',
  valorEstimado: 500000, ...extra });
const ao = (solicitacaoId) => um('SELECT * FROM CC_ANALISE_ORGAO WHERE SOLICITACAO_ID = ?', solicitacaoId);
/** Limite até a exposição do motor do órgão (sem exceção ao motor, DT-36). */
const ateExposicao = (s, valor = s.valor) => {
  const e = n(ao(s.id).EXPOSICAO);
  assert.ok(e > 0, `exposição ${e}`);
  return Math.min(valor, e);
};
const decisoes = (entidade, id) => contar('SELECT COUNT(*) AS N FROM CC_DECISAO WHERE ENTIDADE = ? AND ENTIDADE_ID = ?', entidade, id);
const AGORA = () => `${dia(0)}T10:00:00`;

/** Ajudantes de fluxo (RN-038): cada etapa devolve o estado; quem grava a proposta é o analista. */
const fluxo = {
  async abrir(analista, codcli, { carteira = 'PRIVADA', valor = 30000, tipoCliente = 'NOVO' } = {}) {
    const r = aceito(await como(analista, () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(codcli), carteira, tipoCliente, valor, prazoMeses: 3,
      justificativa: 'Compras recorrentes.', analistaId: M[analista], rca: 'CARLOS LIMA' })));
    return { id: r.id, cardId: r.cardId, carteira, quadro: quadroDe(carteira), analista, valor };
  },
  /** Dados, consultas, motor e proposta (limite proposto = sugerido, se não vier). */
  async analisar(s, { dados = {}, limiteProposto, parecer = 'Cliente pontual.' } = {}) {
    if (s.carteira === 'PUBLICA') return s;
    aceito(await como(s.analista, () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.id, ...DADOS_OK(dados) })));
    const lp = limiteProposto ?? Math.min(s.valor, n(sol(s.id).MOTOR_LIMITE));
    aceito(await como(s.analista, () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.id, limiteProposto: lp, parecer })));
    return s;
  },
  async aoComite(s) {
    marcar(s.cardId, s.carteira === 'PUBLICA' ? { analise_1: '1', analise_2: '1' } : { cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' });
    for (const chave of s.carteira === 'PUBLICA' ? ['analise', 'comite'] : ['cadastral', 'credito', 'comite']) aceito(await levar(s.cardId, s.quadro, chave));
    assert.equal(sol(s.id).FASE, 'comite');
    return s;
  },
  async decidir(s, decisor = 'sergio', extra = {}) {
    const limiteAprovado = extra.limiteAprovado ?? n(sol(s.id).LIMITE_PROPOSTO);
    return aceito(await como(decisor, () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado, ...extra }) })));
  },
  async liberar(s) {
    marcar(s.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    aceito(await levar(s.cardId, s.quadro, 'liberacao'));
    const pend = um("SELECT ID FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM = 'SOLICITACAO' AND ORIGEM_ID = ? AND APLICADA_EM IS NULL", s.id);
    aceito(await como(s.analista, () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID, obs: 'Aplicado no Winthor.' })));
    return um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.id);
  },
  /** Pública (005): grava a análise do órgão como `login` (a fotografia do motor nasce junto) e devolve a linha. */
  async orgao(s, login = s.analista, extra = {}) {
    aceito(await como(login, () => chamar('ccPubAnaliseSalvar', { solicitacaoId: s.id, ...ANALISE(extra) })));
    return ao(s.id);
  },
  async ateGestao(analista, codcli, opcoes = {}) {
    const s = await fluxo.abrir(analista, codcli, opcoes);
    await fluxo.analisar(s, opcoes);
    await fluxo.aoComite(s);
    await fluxo.decidir(s, opcoes.decisor || 'sergio');
    s.credito = await fluxo.liberar(s);
    return s;
  },
};

/* ── testes ── */

const leitura = async () => {
  aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
  await rodarRotinaAte();
};
const pedido = async (login, codcli, valor, numeroPedido = `N${codcli}${valor}`) => aceito(await como(login, () => chamar('ccCredPedidoCriar', {
  clienteId: idDe(codcli), numeroPedido, valor, rca: 'CARLOS LIMA', justificativa: 'Pedido do mês.' })));
const LIBERAR = { resultado: 'LIBERADO', condicao: 'Entrada de 10% à vista', planoCod: '30', forma: 'Boleto bancário', parecer: 'Cliente pontual.' };
const auditorias = (entidade, id) => consultar('SELECT * FROM CC_AUDITORIA WHERE ENTIDADE = ? AND ENTIDADE_ID = ? ORDER BY ID', entidade, id);

export async function suite() {
  /* ── abertura e esteira ── */

  await teste('C-001: sugestão recorrente; abertura cria solicitação, card em entrada e prazo de decisão', async () => {
    await como('rita', async () => {
      const sug = await linha('ccCredTipoClienteSugerir', { clienteId: idDe(4011) });
      assert.equal(sug.TIPO_CLIENTE, 'RECORRENTE');
      assert.equal(n(sug.TEM_CREDITO_VIGENTE), 1);
      assert.equal(sug.MOTIVO, 'crédito ativo na carteira');
      const r = aceito(await chamar('ccCredSolicitacaoCriar', { clienteId: idDe(4011), carteira: 'PRIVADA', tipoCliente: 'RECORRENTE', valor: 25000, prazoMeses: 3,
        justificativa: 'Aumento de compras.', rca: 'CARLOS LIMA' }));
      const s = sol(r.id);
      assert.equal(s.FASE, 'entrada');
      assert.ok(n(s.CARD_ID) > 0);
      assert.equal(s.PRAZO_DECISAO, '2026-11-23');
    });
  });

  await teste('C-002 · RN-001: tipo de cliente — inativo, novo e recorrente só com recusada', async () => {
    await como('rita', async () => {
      assert.equal((await linha('ccCredTipoClienteSugerir', { clienteId: idDe(4012) })).TIPO_CLIENTE, 'INATIVO');
      assert.equal((await linha('ccCredTipoClienteSugerir', { clienteId: idDe(4016) })).TIPO_CLIENTE, 'NOVO');
      const s = await fluxo.abrir('rita', 4071);
      aceito(await chamar('ccCredSolicitacaoRecusar', { solicitacaoId: s.id, motivo: 'Documentação incompleta.' }));
      const sug = await linha('ccCredTipoClienteSugerir', { clienteId: idDe(4071) });
      assert.equal(sug.TIPO_CLIENTE, 'RECORRENTE');
      assert.equal(n(sug.TEM_CREDITO_VIGENTE), 0);
    });
  });

  await teste('C-003: justificativa em branco recusada; nada gravado', async () => {
    const antes = contar('SELECT COUNT(*) AS N FROM CC_SOLICITACAO');
    recusado(await como('rita', () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(4072), carteira: 'PRIVADA', tipoCliente: 'NOVO', valor: 20000, prazoMeses: 3,
      justificativa: '   ' })), /justificativa/i);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_SOLICITACAO'), antes);
  });

  await teste('C-005: Análise de crédito exige endereço e contato financeiro confirmados', async () => {
    const s = await fluxo.abrir('rita', 4073);
    await fluxo.analisar(s);
    aceito(await levar(s.cardId, s.quadro, 'cadastral'));
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'credito')));
    assert.equal(sol(s.id).FASE, 'cadastral');
    const ficha = aceito(await como('rita', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id })));
    const falta = ficha.pendencias.join(' ');
    assert.match(falta, /endereço/i);
    assert.match(falta, /contato financeiro/i);
  });

  await teste('C-006 · RN-009: consultas com mais de 30 dias travam a análise e a aprovação', async () => {
    const s = await fluxo.abrir('rita', 4074);
    await fluxo.analisar(s, { dados: { consData: dia(-35) } });
    marcar(s.cardId, { cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' });
    aceito(await levar(s.cardId, s.quadro, 'cadastral'));
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'credito')), /[Cc]onsultas/);
    // RN-009: com o card na decisão, consultas de 31 dias recusam a aprovação; o responsável é sempre a sessão
    const t = await fluxo.abrir('rita', 4075);
    await fluxo.analisar(t);
    await fluxo.aoComite(t);
    db().prepare('UPDATE CC_SOLICITACAO SET CONS_DATA = ? WHERE ID = ?').run(dia(-31), t.id);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: t.id, ...DECISAO({ limiteAprovado: 29000 }) })), /consultas/i);
    db().prepare('UPDATE CC_SOLICITACAO SET CONS_DATA = ? WHERE ID = ?').run(dia(-2), t.id);
    await fluxo.decidir(t, 'sergio', { membroId: M.gustavo });
    assert.equal(n(um("SELECT RESPONSAVEL_ID FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", t.id).RESPONSAVEL_ID), M.sergio);
  });

  await teste('C-007 · C-027: motor pela SF (simulação não grava nada)', async () => {
    const antes = consultar('SELECT ID, MOTOR_EM FROM CC_SOLICITACAO ORDER BY ID');
    await como('rita', async () => {
      const entradas = { tipoCliente: 'RECORRENTE', scoreSerasa: 750, pontualidade: 95, diasAtraso: 0, compraMedia: 20000, prazoMedio: 30, fatMensal: 200000, valor: 25000 };
      const r = aceito(await chamar('ccCredMotorCalcular', { solicitacaoId: 0, entradas: JSON.stringify(entradas) }));
      assert.deepEqual([r.detalhes.scoreComp, r.score, r.rating, r.detalhes.limite.minimo, r.detalhes.limite.maximo], [1000, 850, 'AA', 24000, 29000]);
      assert.match(r.resultado, /^Aprovar/);
      const sim = { scoreSerasa: 650, prazoMedio: 30, compraMedia: 20000, fatMensal: 200000 };
      const a = aceito(await chamar('ccCredMotorCalcular', { solicitacaoId: 0, entradas: JSON.stringify(sim) }));
      assert.deepEqual([a.rating, a.limiteSugerido], ['A', 24000]);
      const b = aceito(await chamar('ccCredMotorCalcular', { solicitacaoId: 0, entradas: JSON.stringify({ ...sim, prazoMedio: 50 }) }));
      assert.equal(b.limiteSugerido, 40000);
      assert.match(b.detalhes.avisos.join(), /45/);
    });
    assert.deepEqual(consultar('SELECT ID, MOTOR_EM FROM CC_SOLICITACAO ORDER BY ID'), antes);
  });

  /* ── ajuste, decisão e segregação ── */

  await teste('C-011: ajuste de rating com justificativa, pendente trava o Comitê, só o superior aprova', async () => {
    const s = await fluxo.abrir('rita', 4076);
    await fluxo.analisar(s, { dados: { scoreSerasa: 200, flagDados: 1 } });
    assert.equal(sol(s.id).RATING_MOTOR, 'C');
    await como('rita', async () => {
      recusado(await chamar('ccCredRatingAjustar', { solicitacaoId: s.id, rating: 'B', justificativa: '' }), /justificativa/i);
      aceito(await chamar('ccCredRatingAjustar', { solicitacaoId: s.id, rating: 'B', justificativa: 'Garantia real.' }));
    });
    assert.equal(sol(s.id).AJUSTE_SITUACAO, 'PENDENTE');
    marcar(s.cardId, { cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' });
    for (const f of ['cadastral', 'credito']) aceito(await levar(s.cardId, s.quadro, f));
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'comite')), /ajuste/i);
    recusado(await como('ana', () => chamar('ccCredRatingAjusteDecidir', { solicitacaoId: s.id, aprovar: 1, texto: 'ok' })));
    const antes = contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.id);
    aceito(await como('sergio', () => chamar('ccCredRatingAjusteDecidir', { solicitacaoId: s.id, aprovar: 1, texto: 'De acordo.' })));
    assert.equal(sol(s.id).AJUSTE_SITUACAO, 'APROVADO');
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.id), antes + 1);
    const ficha = aceito(await como('rita', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id })));
    assert.equal(ficha.ratingEfetivo, 'B');
    assert.equal(ficha.alcada.rotulo, 'Comitê de crédito');
  });

  await teste('C-012: o analista não decide a própria solicitação', async () => {
    const s = await fluxo.abrir('sergio', 4077);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 29000 }) })), /analista|segrega/i);
  });

  await teste('C-013: limite de 60.000 exige Gerente; a decisão congela o rating efetivo', async () => {
    const s = { id: solDe(4002).ID, cardId: n(solDe(4002).CARD_ID), carteira: 'PRIVADA', quadro: 'concessao-privada', analista: 'rita', valor: 300000 };
    await fluxo.analisar(s, { limiteProposto: 60000, dados: { fatMensal: 1000000 } });
    assert.ok(n(sol(s.id).MOTOR_LIMITE) >= 60000, `motor ${sol(s.id).MOTOR_LIMITE}`);
    await fluxo.aoComite(s);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 60000 }) })), /exige Gerente/);
    await fluxo.decidir(s, 'gustavo', { limiteAprovado: 60000 });
    assert.equal(sol(s.id).FASE, 'formalizacao');
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.id);
    assert.equal(d.RATING, sol(s.id).RATING_MOTOR);
  });

  await teste('C-014: decisão sem plano, forma e parecer', async () => {
    const s = await fluxo.abrir('rita', 4078);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    const r = recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, resultado: 'APROVADA', limiteAprovado: 29000 })));
    for (const x of [/plano/, /forma/, /parecer/]) assert.match(r.error, x);
  });

  await teste('C-015: aprovar acima do motor é exceção do Comitê de crédito, com justificativa', async () => {
    const s = await fluxo.abrir('rita', 4079);
    await fluxo.analisar(s, { dados: { scoreSerasa: 200, flagDados: 1 }, limiteProposto: 20000 });
    assert.equal(n(sol(s.id).MOTOR_LIMITE), 12000);
    await fluxo.aoComite(s);
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 20000 }) })), /Comitê de crédito/);
    recusado(await como('diana', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 20000 }) })), /justificativa/);
    await fluxo.decidir(s, 'diana', { limiteAprovado: 20000, justificativaExcecao: 'Garantia de aval dos sócios.' });
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.id);
    assert.equal(d.CARGO_ALCADA, 'Comitê de crédito');
    assert.equal(d.JUSTIFICATIVA_EXCECAO, 'Garantia de aval dos sócios.');
  });

  await teste('C-016 · RN-023: pendência na aprovação, termo trava a Liberação, aplicar cria o crédito', async () => {
    const s = await fluxo.abrir('rita', 4080);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    await fluxo.decidir(s, 'sergio', { limiteAprovado: 29000 });
    const pend = consultar("SELECT * FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM_ID = ?", s.id);
    assert.equal(pend.length, 1);
    assert.equal(n(pend[0].VALOR), 29000);
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'liberacao')));
    marcar(s.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    aceito(await como('rita', () => mover(s.cardId, s.quadro, 'liberacao')));
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'gestao')));
    aceito(await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend[0].ID, obs: 'Feito.' })));
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.id);
    assert.equal(cr.SITUACAO, 'GESTAO');
    assert.equal(cr.FIM_VALIDADE, somarMeses('2026-11-14', 3));
    assert.equal(cr.FIM_VALIDADE, '2027-02-14');
    assert.equal(faseDoCard(s.cardId), 'gestao');
  });

  await teste('C-017: crédito diferente do limite do Winthor marca divergência', async () => {
    const r = await como('rita', () => linhas('ccCredCreditoListar', { divergeWinthor: 1 }));
    assert.ok(r.some((x) => n(x.CODCLI) === 4014), JSON.stringify(r.map((x) => x.CODCLI)));
  });

  await teste('C-018 · RN-024 · RN-025: encaminhamento no vencimento (reanálise, obsoletos, gestão) e bloqueios', async () => {
    assert.equal(credDe(4005).SITUACAO, 'REANALISE');
    assert.equal(credDe(4005).FASE, 'reanalise');
    for (const [codcli, re] of [[4018, /1 compra/], [4006, /100 dias/]]) {
      const cr = credDe(codcli);
      assert.equal(cr.SITUACAO, 'OBSOLETO');
      assert.match(cr.MOTIVO_ENCAMINHAMENTO, re);
      assert.equal(cr.FASE, 'obsoleto');
    }
    assert.equal(credDe(4019).SITUACAO, 'GESTAO');
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'BLOQUEAR_LIMITE'"), 2);
    // RN-025: aplicar grava quem e quando e some das pendentes (estava nela antes)
    const pend = um("SELECT P.ID FROM CC_PENDENCIA_WINTHOR P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE C.CODCLI = 4006");
    const pendentes = async () => (await como('rita', () => linhas('ccCredPendenciaListar', { situacao: 'PENDENTE' }))).map((x) => n(x.ID));
    assert.ok((await pendentes()).includes(n(pend.ID)), 'a pendência estava nas pendentes');
    aceito(await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID, obs: 'Bloqueado.' })));
    const depois = um('SELECT * FROM CC_PENDENCIA_WINTHOR WHERE ID = ?', pend.ID);
    assert.equal(n(depois.APLICADA_POR), M.rita);
    assert.ok(depois.APLICADA_EM);
    assert.ok(!(await pendentes()).includes(n(pend.ID)));
    // RN-025: aplicar limite com a solicitação ainda em Formalização → recusado
    const s = await fluxo.abrir('rita', 4081);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    await fluxo.decidir(s);
    const ap = um("SELECT ID FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM_ID = ?", s.id);
    recusado(await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: ap.ID })), /Liberação/);
    // RN-024: crédito sem compra, início há 91 dias → obsoleto por "sem compras"
    const k = await fluxo.ateGestao('rita', 4082);
    db().prepare('UPDATE CC_CREDITO SET INICIO_VALIDADE = ?, FIM_VALIDADE = ? WHERE ID = ?').run(dia(-91), dia(10), k.credito.ID);
    db().prepare('UPDATE CC_POSICAO_CLIENTE SET ULTIMA_COMPRA = NULL, COMPRAS_QTD = 0 WHERE CLIENTE_ID = ?').run(idDe(4082));
    await rodarCron('ccCredRotina');
    const ob = um('SELECT * FROM CC_CREDITO WHERE ID = ?', k.credito.ID);
    assert.equal(ob.SITUACAO, 'OBSOLETO');
    assert.match(ob.MOTIVO_ENCAMINHAMENTO, /sem compras/i);
  });

  await teste('C-019: renovação — a analista não decide, parecer obrigatório, novo período', async () => {
    const cr = credDe(4005);
    recusado(await como('rita', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Ok.' })));
    recusado(await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: '' })), /parecer/);
    await nasDuasSessoes(async () => {
      aceito(await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Cliente comprando e pagando em dia.' })));
      const lista = consultar('SELECT * FROM CC_CREDITO WHERE CLIENTE_ID = ? ORDER BY ID', cr.CLIENTE_ID);
      assert.equal(lista.length, 2);
      assert.equal(lista[0].SITUACAO, 'ENCERRADO');
      assert.deepEqual([lista[1].SITUACAO, n(lista[1].LIMITE), lista[1].FIM_VALIDADE], ['GESTAO', 40000, '2027-02-14']);
      assert.equal(faseDoCard(cr.CARD_ID), 'gestao');
      return lista.length;
    });
  });

  await teste('C-020: recusa da solicitação exige motivo', async () => {
    const s = await fluxo.abrir('rita', 4083);
    recusado(await como('rita', () => chamar('ccCredSolicitacaoRecusar', { solicitacaoId: s.id, motivo: '' })));
    aceito(await como('rita', () => chamar('ccCredSolicitacaoRecusar', { solicitacaoId: s.id, motivo: 'Cliente desistiu.' })));
    assert.equal(sol(s.id).FASE, 'recusada');
    assert.equal(sol(s.id).MOTIVO_RECUSA, 'Cliente desistiu.');
  });

  /* ── pedidos ── */

  await teste('C-004: pedido acima do limite fica retido com excesso e alçada', async () => {
    const r = await pedido('rita', 4017, 15000);
    const p = ped(r.id);
    assert.deepEqual([n(p.EXCESSO), n(p.EXCESSO_PCT), p.ALCADA_EXIGIDA, p.FASE], [5000, 5, 'Supervisor', 'retido']);
  });

  await teste('C-021: alçadas do pedido; atraso leva ao Comitê; pedido que cabe é recusado', async () => {
    const rot = [];
    for (const v of [15000, 30000, 50000, 80000]) { const r = await pedido('rita', 4017, v); rot.push([ped(r.id).ALCADA_EXIGIDA, n(ped(r.id).CRITICA)]); }
    assert.deepEqual(rot, [['Supervisor', 0], ['Gerente', 0], ['Diretor financeiro', 1], ['Comitê de crédito', 1]]);
    assert.equal(um("SELECT P.ALCADA_EXIGIDA FROM CC_PEDIDO_RETIDO P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID WHERE C.CODCLI = 4010").ALCADA_EXIGIDA, 'Comitê de crédito');
    recusado(await como('rita', () => chamar('ccCredPedidoCriar', { clienteId: idDe(4017), numeroPedido: 'X1', valor: 5000, rca: '', justificativa: 'x' })), /cabe no limite/);
  });

  await teste('C-022 · RN-028: liberação crítica — segregação, parecer, condição e pendência', async () => {
    const r = await pedido('rita', 4017, 50000);
    aceito(await como('rita', () => chamar('ccCredPedidoSalvar', { pedidoId: r.id, recomendacao: 'Liberar com entrada.' })));
    assert.equal(ped(r.id).RECOMENDACAO, 'Liberar com entrada.');
    recusado(await como('rita', () => chamar('ccCredPedidoDecidir', { pedidoId: r.id, ...LIBERAR })), /segrega/);
    recusado(await como('diana', () => chamar('ccCredPedidoDecidir', { pedidoId: r.id, ...LIBERAR, condicao: '' })), /condição/);
    recusado(await como('diana', () => chamar('ccCredPedidoDecidir', { pedidoId: r.id, ...LIBERAR, parecer: '' })), /crítica/i);
    recusado(await como('diana', () => chamar('ccCredPedidoDecidir', { pedidoId: r.id, resultado: 'RECUSADO', motivo: '' })));
    await nasDuasSessoes(async () => {
      aceito(await como('diana', () => chamar('ccCredPedidoDecidir', { pedidoId: r.id, ...LIBERAR })));
      assert.equal(ped(r.id).DECISAO_RESULTADO, 'LIBERADO');
      assert.equal(ped(r.id).FASE, 'liberado');
      assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'LIBERAR_PEDIDO' AND ORIGEM_ID = ?", r.id), 1);
      return true;
    });
  });

  await teste('C-023: cliente bloqueado pela régua exige parecer na liberação', async () => {
    if (!existe('ccCobRotina')) pular('depende de 002');
    const bloq = contar("SELECT COUNT(*) AS N FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID WHERE C.CODCLI = 4013 AND CB.ENCERRADO_EM IS NULL AND CB.BLOQUEIO_DEVIDO <> ''");
    assert.ok(bloq > 0, 'o seed deixa 4013 bloqueado pela régua');
    const r = await pedido('rita', 4013, 50000);
    assert.equal(ped(r.id).ALCADA_EXIGIDA, 'Gerente');
    recusado(await como('gustavo', () => chamar('ccCredPedidoDecidir', { pedidoId: r.id, ...LIBERAR, parecer: '' })), /bloqueado/i);
  });

  await teste('C-024: ficha do pedido traz a flexibilização do cliente', async () => {
    const r = await pedido('rita', 4017, 15000);
    const f = aceito(await como('rita', () => chamar('ccCredPedidoFicha', { pedidoId: r.id })));
    assert.ok(f.risco, 'risco do cliente');
    assert.equal(n(f.risco.FLEX_VALOR), n(um('SELECT FLEX_VALOR FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ?', idDe(4017)).FLEX_VALOR));
  });

  await teste('C-025: fora do SLA na esteira e nos pedidos', async () => {
    await como('ana', async () => {
      const est = await linhas('ccCredEsteiraResumo', { carteira: 'PRIVADA' });
      assert.equal(n(est.find((x) => x.FASE_CHAVE === 'cadastral').ATRASADAS), 1);
      assert.equal(n((await linha('ccCredPedidoTotal')).ATRASADOS), 1);
    });
  });

  await teste('C-026 · RN-030: rating atual recalculado após a sincronização; risco não previsto', async () => {
    nota({ codcli: 4015, n: 60, emissao: dia(-65), itens: [{ codprod: 101, valor: 5000 }], parcelas: [{ prest: 1, valor: 5000, venc: dia(-35) }] });
    await leitura();
    const r = um('SELECT * FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ?', idDe(4015));
    assert.deepEqual([r.RATING_ATUAL, n(r.SCORE_FINAL), r.FAIXA_SCORE, r.FAIXA_ATRASO], ['D', 710, 'A', 'D']);
    assert.equal(credDe(4015).RATING_CONCESSAO, 'AA');
    const risco = await como('rita', () => linhas('ccCredRiscoListar', { carteira: 'PRIVADA' }));
    assert.equal(risco.find((x) => n(x.CODCLI) === 4015)?.CLASSE, 'NAO_PREVISTO');
  });

  await teste('C-028: validação do farol pela SF', async () => {
    const r = aceito(await como('silvia', () => chamar('ccCredFarolValidacao', { carteira: 'PRIVADA' })));
    const por = Object.fromEntries(r.leituras.map((x) => [x.faixa, x.leitura]));
    assert.deepEqual([por.AA, por.A, por.B, por.C, por.D], ['Dentro do esperado', 'Fora da ordem', 'Dentro do esperado', 'Sem carteira', 'Faixa sem crédito a prazo']);
    assert.equal(r.mesesDeBase, 1);
  });

  await teste('C-029: revisão trimestral do semáforo (D-06: a marca administra)', async () => {
    const antes = await como('gustavo', () => linha('ccCredCalibracaoRevisaoListar'));
    assert.equal(n(antes.VENCIDA), 1);
    recusado(await como('sergio', () => chamar('ccCredCalibracaoRevisar', { parecer: 'Revisado.' })));
    aceito(await como('gustavo', () => chamar('ccCredCalibracaoRevisar', { parecer: 'Cortes conferidos.' })));
    const depois = await como('gustavo', () => linha('ccCredCalibracaoRevisaoListar'));
    assert.equal(n(depois.VENCIDA), 0);
    assert.equal(n(depois.POR_ID), M.gustavo);
    aceito(await como('nara', () => chamar('ccCredCalibracaoRevisar', { parecer: 'Conferido pela administração.' })));
  });

  /* ── chamadas diretas às internas (validação B2: B-01, C-01 a C-04) ── */

  await teste('RN-027 · RN-028 (chamada direta): o pedido relê posição e alçada; o forjado não é liberado pelo Supervisor', async () => {
    const forjado = { clienteId: idDe(4017), creditoId: 0, valor: 500000, limite: 10000000, utilizado: 0, atraso: 0, excesso: 400000, excessoPct: 4,
      alcadaExigida: 'Supervisor', nivelExigido: 2, critica: 0, rca: '', tipoCliente: 'RECORRENTE', justificativa: 'Pedido grande.', analistaId: M.rita,
      membroId: M.rita, agora: AGORA() };
    await como('rita', () => chamar('ccEscCredPedidoInserir', { ...forjado, numeroPedido: 'FORJADO' }));
    const p = um("SELECT * FROM CC_PEDIDO_RETIDO WHERE NUMERO_PEDIDO = 'FORJADO'");
    const pos = um('SELECT * FROM CC_POSICAO_CLIENTE WHERE CLIENTE_ID = ?', idDe(4017));
    assert.deepEqual([n(p.LIMITE_NA_DATA), n(p.UTILIZADO_NA_DATA), n(p.EXCESSO), p.ALCADA_EXIGIDA, n(p.NIVEL_EXIGIDO), n(p.CRITICA), n(p.CREDITO_ID)],
      [n(pos.LIMITE), n(pos.UTILIZADO), n(pos.UTILIZADO) + 500000 - n(pos.LIMITE), 'Comitê de crédito', 5, 1, n(credDe(4017).ID)]);
    recusado(await como('sergio', () => chamar('ccCredPedidoDecidir', { pedidoId: p.ID, ...LIBERAR })), /exige Comitê de crédito/);
    await como('sergio', () => chamar('ccEscCredDecisaoInserir', { entidade: 'PEDIDO', entidadeId: p.ID, creditoId: 0, resultado: 'LIBERADO', limiteAprovado: 0,
      planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: 'x', parecer: 'x', justificativaExcecao: '', motorJson: '{}',
      membroId: M.sergio, agora: AGORA() }));
    assert.equal(decisoes('PEDIDO', p.ID), 0);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'LIBERAR_PEDIDO' AND ORIGEM_ID = ?", p.ID), 0);
    // pedido que cabe no limite da posição não grava, diga o que disser o excesso
    await como('rita', () => chamar('ccEscCredPedidoInserir', { ...forjado, numeroPedido: 'CABE', valor: 1 }));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PEDIDO_RETIDO WHERE NUMERO_PEDIDO = 'CABE'"), 0);
  });

  await teste('RN-023 (chamada direta): a pendência do Winthor copia valor e texto da decisão', async () => {
    const s = await fluxo.abrir('rita', 4086);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    await fluxo.decidir(s, 'sergio', { limiteAprovado: 29000 });
    const SQL_P = "SELECT * FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM_ID = ?";
    const p0 = um(SQL_P, s.id);
    assert.equal(p0.DESCRICAO, 'Aplicar no Winthor: limite R$ 29.000, plano 30 DIAS, boleto bancário');
    db().prepare('DELETE FROM CC_PENDENCIA_WINTHOR WHERE ID = ?').run(p0.ID);
    const forjada = { tipo: 'APLICAR_LIMITE', origem: 'SOLICITACAO', origemId: s.id, clienteId: idDe(4086), descricao: 'Aplicar no Winthor: limite R$ 1.000.000',
      valor: 1000000, agora: AGORA() };
    await como('rita', () => chamar('ccEscCredPendenciaInserir', { ...forjada, membroId: M.rita }));
    assert.equal(um(SQL_P, s.id), undefined, 'quem não decidiu não gera a pendência');
    await como('sergio', () => chamar('ccEscCredPendenciaInserir', { ...forjada, membroId: M.sergio }));
    const p1 = um(SQL_P, s.id);
    assert.deepEqual([n(p1.VALOR), p1.DESCRICAO, n(p1.CLIENTE_ID)], [29000, p0.DESCRICAO, idDe(4086)]);
  });

  await teste('RN-043 · RN-025 (chamada direta): encerrar, criar e aplicar só o caso, com o card em Liberação e a validade da SQL', async () => {
    // crédito novo (4085): fora de Liberação nada nasce; em Liberação a validade é a da SQL, não a da entrada
    const c = await fluxo.abrir('rita', 4085);
    await fluxo.analisar(c);
    await fluxo.aoComite(c);
    const { decisaoId } = await fluxo.decidir(c, 'sergio');
    const criar = () => como('rita', () => chamar('ccEscCredCreditoInserir', { decisaoId, inicio: '2020-01-01', fim: '2099-12-31', membroId: M.rita, agora: AGORA() }));
    await criar();
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', c.id), 0, 'card em Formalização');
    marcar(c.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    aceito(await levar(c.cardId, c.quadro, 'liberacao'));
    await criar();
    const novoC = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', c.id);
    assert.deepEqual([novoC.INICIO_VALIDADE, novoC.FIM_VALIDADE], [dia(0), somarMeses(dia(0), 3)]);

    // substituição (4017): aumento aprovado, card em Formalização
    const antigo = credDe(4017);
    const vigente = () => n(um('SELECT ID FROM CC_CREDITO WHERE VIGENTE_CHAVE = ?', idDe(4017)).ID);
    const s = await fluxo.abrir('rita', 4017, { valor: 130000, tipoCliente: 'RECORRENTE' });
    await fluxo.analisar(s, { limiteProposto: 130000 });
    await fluxo.aoComite(s);
    await fluxo.decidir(s, 'diana', { limiteAprovado: 130000, justificativaExcecao: 'Aumento negociado com garantia.' });
    const encerrar = (login) => como(login, () => chamar('ccEscCredCreditoSituacao', { creditoId: antigo.ID, situacao: 'ENCERRADO', motivo: 'x',
      membroId: M[login], agora: AGORA() }));
    for (const login of ['carlos', 'rita']) await encerrar(login); // fora do caso; caso com o card ainda em Formalização
    assert.equal(vigente(), n(antigo.ID));
    marcar(s.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    aceito(await levar(s.cardId, s.quadro, 'liberacao'));
    await encerrar('carlos'); // em Liberação, mas não é caso nem decisor
    assert.equal(vigente(), n(antigo.ID));
    // Bruno (agente do cliente, não é superior de Rita) não aplica: pela SF nem pela interna; nada muda
    const pend = um("SELECT ID FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM_ID = ?", s.id);
    recusado(await como('bruno', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID })), /caso/);
    await como('bruno', () => chamar('ccEscCredPendenciaAplicar', { pendenciaId: pend.ID, obs: '', membroId: M.bruno, agora: AGORA() }));
    assert.equal(um('SELECT APLICADA_EM FROM CC_PENDENCIA_WINTHOR WHERE ID = ?', pend.ID).APLICADA_EM, null);
    assert.equal(vigente(), n(antigo.ID));
    // Rita (caso) aplica: encerra o anterior e cria o novo, os dois auditados
    aceito(await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID })));
    const novo = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.id);
    assert.deepEqual([vigente(), um('SELECT SITUACAO FROM CC_CREDITO WHERE ID = ?', antigo.ID).SITUACAO], [n(novo.ID), 'ENCERRADO']);
    assert.ok(auditorias('CREDITO', antigo.ID).some((x) => /ENCERRADO/.test(x.DEPOIS)));
  });

  /* ── carteira, saúde, risco, desempenho ── */

  await teste('C-030 · RF-024 · RF-032: saúde, resumo e farol da carteira de Carlos', async () => {
    await como('carlos', async () => {
      const sr = await linha('ccCredSaudeResumo', { carteira: 'PRIVADA' });
      assert.deepEqual([n(sr.SAUDAVEL), n(sr.ATENCAO), n(sr.RISCO), n(sr.INDICE)], [1, 3, 1, 20]);
      assert.equal((await linhas('ccCredSaudeListar', { carteira: 'PRIVADA', saude: 'ATENCAO' })).length, 3);
      assert.equal((await linhas('ccCredSaudeListar', { carteira: 'PRIVADA', saude: 'RISCO' })).length, 1);
      const res = await linha('ccCredCreditoResumo', { carteira: 'PRIVADA' });
      assert.deepEqual([n(res.VIGENTES), n(res.LIMITE_TOTAL), n(res.EM_REANALISE)], [5, 500000, 1]);
      const farol = Object.fromEntries((await linhas('ccCredFarolCarteira', { carteira: 'PRIVADA' })).map((x) => [x.RATING, n(x.CLIENTES)]));
      assert.deepEqual([farol.AA, farol.B, farol.D], [3, 1, 1]);
      const d = await linhas('ccCredFarolClienteListar', { carteira: 'PRIVADA', rating: 'D' });
      assert.equal(d.length, 1);
      assert.equal(n(d[0].ACIMA_SUGERIDO), 1);
    });
  });

  await teste('C-031 · RN-031: desempenho dos analistas (Silvia vê Carlos)', async () => {
    const r = aceito(await como('silvia', () => chamar('ccCredDesempenho', { carteira: 'PRIVADA', de: dia(-90), ate: dia(0) })));
    const c = r.analistas.find((x) => x.analistaId === M.carlos);
    assert.deepEqual([c.slaPct, c.tempoMedio, c.aprovacaoPct, c.foraDoPrazo], [60, 12, 80, 1]);
    assert.equal(r.kpis.pedidoTempoMedioHoras, 6);
  });

  await teste('C-032 · RN-032: clientes sinalizados de Ana', async () => {
    const r = await como('ana', () => linhas('ccCredCriticidadeListar', { carteira: 'PRIVADA' }));
    const por = Object.fromEntries(r.map((x) => [n(x.CODCLI), x]));
    assert.equal(r.length, 3, JSON.stringify(r.map((x) => [x.CODCLI, x.CRITICIDADE, x.CRIT_MOTIVOS])));
    assert.equal(por[4030].CRITICIDADE, 'CRITICO');
    assert.match(por[4030].CRIT_MOTIVOS, /3 sinais/);
    assert.equal(por[4031].CRITICIDADE, 'CRITICO');
    assert.match(por[4031].CRIT_MOTIVOS, /Atraso/);
    assert.equal(por[4032].CRITICIDADE, 'ALERTA');
    assert.ok(!por[4033]);
    assert.equal(n((await como('ana', () => linha('ccCredCriticidadeTotal', { carteira: 'PRIVADA' }))).TOTAL), 3);
    // RN-032: cliente só da Pública não tem risco calculado
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ?', idDe(4040)), 0);
  });

  await teste('C-033 · RN-035 · DT-45: número com texto de injeção não vaza na leitura nem grava pela interna', async () => {
    // Leitura: `analistaId` que fecharia o parêntese do filtro vira número (0 = sem filtro, pela visibilidade).
    const total = async (login, extra = {}) => n((await como(login, () => linha('ccCredSolicitacaoTotal', { carteira: 'ESTETICA', situacao: 'ABERTA', ...extra }))).TOTAL);
    assert.ok(await total('ana') < await total('gustavo'));
    assert.equal(await total('ana', { analistaId: '0) OR (1=1' }), await total('ana'));
    // Interna: Carlos (nível 1) não manda crédito à reanálise; o OR no `membroId` passaria o ATOR pela própria linha dele.
    const cr = credDe(4017);
    assert.equal(cr.SITUACAO, 'GESTAO');
    await como('carlos', () => chamar('ccEscCredCreditoSituacao', { creditoId: cr.ID, situacao: 'REANALISE', motivo: 'x', membroId: `${M.carlos} OR 1=1`, agora: AGORA() }));
    assert.equal(um('SELECT SITUACAO FROM CC_CREDITO WHERE ID = ?', cr.ID).SITUACAO, cr.SITUACAO);
  });

  await teste('C-033 · RN-035: listagem pela visibilidade e total igual às linhas', async () => {
    for (const [login, esperado] of [['rita', 2], ['ana', 1], ['sergio', 3], ['gustavo', 3]]) {
      const r = await como(login, () => linhas('ccCredSolicitacaoListar', { carteira: 'ESTETICA', situacao: 'ABERTA' }));
      const t = await como(login, () => linha('ccCredSolicitacaoTotal', { carteira: 'ESTETICA', situacao: 'ABERTA' }));
      assert.equal(r.length, esperado, login);
      assert.equal(n(t.TOTAL), esperado, login);
    }
    assert.equal((await como('rita', () => linhas('ccCredSolicitacaoListar', { analistaId: M.ana }))).length, 0);
    const bruno = await como('bruno', () => linhas('ccCredCreditoListar'));
    assert.ok(bruno.some((x) => n(x.CODCLI) === 4011));
  });

  /* ── Pública, Estética, sem vínculo ── */

  await teste('C-034: órgão na Pública; trocas de carteira recusadas', async () => {
    const s = await fluxo.abrir('ana', 4048, { carteira: 'PUBLICA' });
    assert.equal(sol(s.id).FASE, 'entrada');
    assert.equal(um('SELECT F.QUADRO FROM KB_CARD K JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE K.ID = ?', s.cardId).QUADRO, 'concessao-publica');
    assert.equal(sol(s.id).PRAZO_DECISAO, '2026-11-25');
    const antes = contar('SELECT COUNT(*) AS N FROM CC_SOLICITACAO');
    recusado(await como('ana', () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(4049), carteira: 'PRIVADA', tipoCliente: 'NOVO', valor: 1000, prazoMeses: 3, justificativa: 'x' })));
    recusado(await como('ana', () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(4030), carteira: 'PUBLICA', tipoCliente: 'NOVO', valor: 1000, prazoMeses: 3, justificativa: 'x' })));
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_SOLICITACAO'), antes);
  });

  await teste('C-035: alçada da Pública na ficha', async () => {
    for (const [valor, rotulo] of [[80000, 'Supervisor'], [1200000, 'Diretoria']]) {
      const s = await fluxo.abrir('ana', valor === 80000 ? 4048 : 4049, { carteira: 'PUBLICA', valor });
      const f = aceito(await como('ana', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id })));
      assert.equal(f.alcada.rotulo, rotulo);
    }
  });

  await teste('C-036: pré-aprovada na Privada é recusada', async () => {
    const s = await fluxo.abrir('rita', 4084);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ resultado: 'PRE_APROVADA', limiteAprovado: 29000 }) })), /Pública/);
  });

  await teste('C-036 (Pública): sem contrato só pré-aprova; com contrato aprova e cria o crédito', async () => {
    com005();
    const s = await fluxo.abrir('ana', 4048, { carteira: 'PUBLICA', valor: 80000 });
    await fluxo.orgao(s, 'ana', { base: 'EDITAL', edital: 'PE 7/2026', contrato: '', saldoContrato: 0, vigenciaFim: '' });
    await fluxo.aoComite(s);
    const decidir = (extra) => como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: ateExposicao(s), ...extra }) }));
    recusado(await decidir(), /contrato/i);
    aceito(await decidir({ resultado: 'PRE_APROVADA' }));
    assert.deepEqual([sol(s.id).DECISAO_RESULTADO, sol(s.id).FASE], ['PRE_APROVADA', 'comite']);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.id), 0);
    // contrato assinado: a analista completa a análise (a fotografia é regravada)
    const a = await fluxo.orgao(s, 'ana', { base: 'CONTRATO' });
    // fotografia mexida depois do cálculo → recalcular
    db().prepare('UPDATE CC_ANALISE_ORGAO SET EXPOSICAO = EXPOSICAO + 1000 WHERE ID = ?').run(a.ID);
    recusado(await decidir(), /Recalcule no bloco do órgão/);
    db().prepare('UPDATE CC_ANALISE_ORGAO SET EXPOSICAO = ? WHERE ID = ?').run(a.EXPOSICAO, a.ID);
    const custo = await execucoes(async () => aceito(await decidir()));
    assert.ok(custo <= 20, `decisão pública ${custo}`);
    const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ? AND RESULTADO = 'APROVADA'", s.id);
    assert.deepEqual([d.RATING_PUB, n(d.LIMITE_MOTOR), d.RATING], [a.RATING_PUB, n(a.EXPOSICAO), '']);
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.id);
    assert.deepEqual([cr.SITUACAO, n(cr.ANALISE_ORGAO_ID), cr.RATING_CONCESSAO, cr.INICIO_VALIDADE, cr.FIM_VALIDADE],
      ['GESTAO', n(a.ID), '', dia(0), somarMeses(dia(0), 3)]);
    assert.equal(faseDoCard(s.cardId), 'gestao');
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM_ID = ?", s.id), 1);
    const ficha = aceito(await como('ana', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id })));
    assert.equal(ficha.analiseOrgaoId, n(a.ID));
  });

  await teste('C-037 · RN-036: Estética — carteira sugerida, quadro próprio, alçada e concentração da carteira', async () => {
    const s = solDe(4009, 'ESTETICA');
    assert.equal((await como('rita', () => linha('ccCredTipoClienteSugerir', { clienteId: idDe(4009) }))).CARTEIRA_SUGERIDA, 'ESTETICA');
    assert.equal(um('SELECT F.QUADRO FROM KB_CARD K JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID WHERE K.ID = ?', s.CARD_ID).QUADRO, 'concessao-estetica');
    const f = aceito(await como('rita', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.ID })));
    assert.equal(f.alcada.rotulo, 'Gerente');
    // RN-036: concMax da Estética = 15
    aceito(await como('gustavo', () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'limite.concMax', carteira: 'ESTETICA', valor: '15' }]) })));
    const e = aceito(await como('rita', () => chamar('ccCredMotorCalcular', { solicitacaoId: s.ID })));
    const pr = aceito(await como('rita', () => chamar('ccCredMotorCalcular', { solicitacaoId: solDe(4001).ID })));
    assert.equal(e.detalhes.concentracao.tetoPct, 15);
    assert.equal(pr.detalhes.concentracao.tetoPct, 10);
  });

  await teste('C-038 · RN-042: sem vínculo (visitante e inativo) não abre, não decide, não lista', async () => {
    for (const login of ['visitante', 'otavio']) {
      recusado(await como(login, () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(4085), carteira: 'PRIVADA', tipoCliente: 'NOVO', valor: 1000, prazoMeses: 3,
        justificativa: 'x' })), /equipe/i);
      recusado(await como(login, () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: solDe(4001).ID, ...DECISAO({ limiteAprovado: 1000 }) })), /equipe/i);
      assert.equal((await como(login, () => linhas('ccCredSolicitacaoListar'))).length, 0);
    }
  });

  await teste('C-039 · RN-043: aumento substitui o crédito vigente; card antigo encerrado pela rotina', async () => {
    const antigo = credDe(4017);
    const s = await fluxo.abrir('rita', 4017, { valor: 130000, tipoCliente: 'RECORRENTE' });
    await fluxo.analisar(s, { limiteProposto: 130000 });
    await fluxo.aoComite(s);
    await fluxo.decidir(s, 'diana', { limiteAprovado: 130000, justificativaExcecao: 'Aumento negociado com garantia.' });
    const novo = await fluxo.liberar(s);
    assert.equal(n(novo.LIMITE), 130000);
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_CREDITO WHERE VIGENTE_CHAVE = ?', idDe(4017)), 1);
    assert.equal(um('SELECT SITUACAO FROM CC_CREDITO WHERE ID = ?', antigo.ID).SITUACAO, 'ENCERRADO');
    assert.equal(n(valores(s.cardId).valor), 130000);
    assert.ok(auditorias('CREDITO', antigo.ID).some((a) => /ENCERRADO/.test(a.DEPOIS)), JSON.stringify(auditorias('CREDITO', antigo.ID)));
    await leitura();
    assert.equal(faseDoCard(antigo.CARD_ID), 'encerrada');
  });

  await teste('C-040 · RN-039: revisão da carteira Estética de Carlos', async () => {
    await como('carlos', async () => {
      const r = await linhas('ccCredRevisaoListar', { carteira: 'ESTETICA' });
      assert.equal(r.length, 4, JSON.stringify(r.map((x) => [x.CODCLI, x.REVISAO_GATILHOS])));
      const g = Object.fromEntries(r.map((x) => [n(x.CODCLI), x.REVISAO_GATILHOS]));
      assert.deepEqual([g[4035], g[4036], g[4037], g[4038]], ['ATRASO', 'USO', 'NEGATIVACAO', 'VALIDADE']);
      assert.equal((await linhas('ccCredRevisaoListar', { carteira: 'ESTETICA', gatilho: 'USO' })).length, 1);
    });
  });

  await teste('C-041 · RN-040: taxa de flexibilização e conformidade', async () => {
    const r = await como('carlos', () => linha('ccCredFlexResumo'));
    assert.deepEqual([n(r.PEDIDOS), n(r.FLEXIBILIZADOS), n(r.TAXA_PCT), n(r.DENTRO_REGRA_PCT)], [4, 3, 75, 67]);
    const vazio = await como('carlos', () => linha('ccCredFlexResumo', { de: '2020-01-01', ate: '2020-01-31' }));
    assert.equal(vazio.TAXA_PCT, null);
    assert.equal(vazio.DENTRO_REGRA_PCT, null);
    // Pedido da tela: filtro `carteira` (a do crédito do pedido; sem crédito, pelo setor). As três somam o todo.
    const porCarteira = await Promise.all(['PRIVADA', 'ESTETICA', 'PUBLICA'].map((carteira) => como('carlos', () => linha('ccCredFlexResumo', { carteira }))));
    assert.equal(porCarteira.reduce((s, x) => s + n(x.PEDIDOS), 0), 4);
  });

  await teste('C-042 · RN-041: "Aguardando você" de Rita e de Sérgio', async () => {
    // Rita: prazo de decisão vencido e pendência do Winthor; Sérgio: ajuste a decidir e decisão na alçada
    const a = await fluxo.abrir('rita', 4086);
    db().prepare('UPDATE CC_SOLICITACAO SET PRAZO_DECISAO = ? WHERE ID = ?').run(dia(-1), a.id);
    const b = await fluxo.abrir('rita', 4087);
    await fluxo.analisar(b);
    await fluxo.aoComite(b);
    await fluxo.decidir(b);
    marcar(b.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    aceito(await levar(b.cardId, b.quadro, 'liberacao'));
    const c = await fluxo.abrir('rita', 4088);
    await fluxo.analisar(c, { dados: { scoreSerasa: 200, flagDados: 1 } });
    aceito(await como('rita', () => chamar('ccCredRatingAjustar', { solicitacaoId: c.id, rating: 'B', justificativa: 'Garantia.' })));
    const d = await fluxo.abrir('rita', 4089);
    await fluxo.analisar(d);
    await fluxo.aoComite(d);
    const grande = await fluxo.abrir('rita', 4090, { valor: 60000 });
    await fluxo.analisar(grande, { limiteProposto: 60000 });
    db().prepare('UPDATE CC_SOLICITACAO SET MOTOR_LIMITE = 60000 WHERE ID = ?').run(grande.id);
    await fluxo.aoComite(grande);
    const fila = async (login, membroId = 0) => (await como(login, () => linhas('ccCredAgendaListar', { membroId })));
    const rita = await fila('rita');
    const tipo = (lista, cardId) => lista.filter((x) => n(x.CARD_ID) === cardId).map((x) => x.TIPO);
    assert.deepEqual(tipo(rita, a.cardId), ['SOLICITACAO_PRAZO']);
    assert.deepEqual(tipo(rita, b.cardId), ['PENDENCIA_WINTHOR']);
    // Pedido da tela: CARTEIRA do card, para abrir no quadro certo.
    assert.deepEqual(rita.filter((x) => [a.cardId, b.cardId].includes(n(x.CARD_ID))).map((x) => x.CARTEIRA), ['PRIVADA', 'PRIVADA']);
    assert.deepEqual(tipo(rita, d.cardId), [], 'a decisão em que Rita é analista não entra na fila dela');
    const sergio = await fila('sergio');
    assert.deepEqual(tipo(sergio, c.cardId), ['AJUSTE_DECIDIR']);
    assert.deepEqual(tipo(sergio, d.cardId), ['DECISAO_ALCADA']);
    assert.deepEqual(tipo(sergio, grande.cardId), [], '60.000 não é da alçada do Supervisor');
    assert.ok(!sergio.some((x) => ['SOLICITACAO_PRAZO', 'PENDENCIA_WINTHOR'].includes(x.TIPO) && [a.cardId, b.cardId].includes(n(x.CARD_ID))));
    assert.ok(!rita.some((x) => ['AJUSTE_DECIDIR', 'DECISAO_ALCADA'].includes(x.TIPO)));
    assert.equal(n((await como('rita', () => linha('ccCredAgendaTotal', { membroId: 0 }))).TOTAL), rita.length);
    // RN-041: Ana pedindo a fila de Rita → nada; Sérgio pedindo a fila de Rita → a de Rita
    assert.equal((await fila('ana', M.rita)).length, 0);
    assert.deepEqual((await fila('sergio', M.rita)).map((x) => x.TIPO).sort(), rita.map((x) => x.TIPO).sort());
  });

  await teste('C-043 · RN-005: o gancho recusa pular etapa, Comitê com análise incompleta e mover crédito à mão', async () => {
    const s = await fluxo.abrir('rita', 4091);
    aceito(await levar(s.cardId, s.quadro, 'cadastral'));
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'comite')), /uma etapa/);
    marcar(s.cardId, { cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' });
    await fluxo.analisar(s);
    aceito(await como('rita', () => mover(s.cardId, s.quadro, 'credito')));
    db().prepare("UPDATE CC_SOLICITACAO SET PARECER_ANALISTA = '' WHERE ID = ?").run(s.id);
    recusado(await como('rita', () => mover(s.cardId, s.quadro, 'comite')), /Análise de crédito incompleta/);
    assert.equal(sol(s.id).FASE, 'credito');
    // RN-005: voltar de Análise de crédito para a cadastral é aceito
    aceito(await como('rita', () => mover(s.cardId, s.quadro, 'cadastral')));
    const g = credDe(4011);
    recusado(await como('rita', () => mover(n(g.CARD_ID), 'concessao-privada', 'reanalise')));
    assert.equal(faseDoCard(n(g.CARD_ID)), 'gestao');
    // RN-005: voltar de Formalização → recusado
    const f = await fluxo.abrir('rita', 4092);
    await fluxo.analisar(f);
    await fluxo.aoComite(f);
    await fluxo.decidir(f);
    recusado(await como('rita', () => mover(f.cardId, f.quadro, 'comite')));
    assert.equal(sol(f.id).FASE, 'formalizacao');
  });

  /* ── regras de fluxo ── */

  await teste('RN-002: SLA de 72 h na cadastral (72 h no prazo, 73 h fora)', async () => {
    fixarRelogio('2026-11-11T10:00:00');
    const s = await fluxo.abrir('rita', 4093);
    aceito(await levar(s.cardId, s.quadro, 'cadastral'));
    const atrasada = async () => n((await como('rita', () => linhas('ccCredSolicitacaoListar', { carteira: 'PRIVADA' }))).find((x) => n(x.ID) === s.id).ATRASADA);
    fixarRelogio('2026-11-14T10:00:00');
    assert.equal(await atrasada(), 0);
    fixarRelogio('2026-11-14T11:00:00');
    assert.equal(await atrasada(), 1);
  });

  await teste('RN-003: checklists semeados e autor da marcação', async () => {
    const campos = (quadro, fase) => consultar(`SELECT KC.LABEL FROM KB_CAMPO KC JOIN CC_FASE F ON F.FASE_ID = KC.FASE_ID
WHERE F.QUADRO = ? AND F.CHAVE = ? AND KC.TIPO = 'sim_nao' ORDER BY KC.ORDEM, KC.ID`, quadro, fase);
    const cad = campos('concessao-privada', 'cadastral');
    assert.equal(cad.length, 13);
    assert.equal(cad[0].LABEL, 'Consulta Serasa / Boa Vista');
    assert.equal(campos('concessao-privada', 'liberacao').length, 2);
    assert.equal(campos('concessao-publica', 'analise').length, 5);
    const s = await fluxo.abrir('rita', 4094);
    aceito(await levar(s.cardId, s.quadro, 'cadastral'));
    const k = um('SELECT PRAZO FROM KB_CARD WHERE ID = ?', s.cardId);
    aceito(await como('rita', () => chamar('kbCardAtualizar', { cardId: s.cardId, valoresJson: JSON.stringify({ cadastral_1: '1' }), responsaveisIds: String(U.rita),
      prazo: k.PRAZO || '' })));
    assert.ok(contar('SELECT COUNT(*) AS N FROM KB_LOG WHERE CARD_ID = ? AND USUARIO_ID = ?', s.cardId, U.rita) > 0);
  });

  await teste('RN-004: travas para sair da entrada, ir ao Comitê e à Liberação', async () => {
    const s = await como('rita', () => chamar('ccCredSolicitacaoCriar', { clienteId: idDe(4095), carteira: 'PRIVADA', tipoCliente: 'NOVO', valor: 600000, prazoMeses: 3,
      justificativa: 'Grande.' }));
    db().prepare('UPDATE CC_SOLICITACAO SET ANALISTA_ID = NULL WHERE ID = ?').run(s.id);
    recusado(await como('rita', () => mover(s.cardId, 'concessao-privada', 'cadastral')), /analista/);
    const t = { id: s.id, cardId: s.cardId, carteira: 'PRIVADA', quadro: 'concessao-privada', analista: 'rita', valor: 600000 };
    db().prepare('UPDATE CC_SOLICITACAO SET ANALISTA_ID = ? WHERE ID = ?').run(M.rita, s.id);
    await fluxo.analisar(t, { limiteProposto: 29000 });
    marcar(t.cardId, { cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' });
    for (const f of ['cadastral', 'credito']) aceito(await levar(t.cardId, t.quadro, f));
    recusado(await como('rita', () => mover(t.cardId, t.quadro, 'comite')), /financeira/);
    const g = await fluxo.abrir('rita', 4096);
    await fluxo.analisar(g, { dados: { garantia: 'Aval dos sócios' } });
    await fluxo.aoComite(g);
    await fluxo.decidir(g);
    marcar(g.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    recusado(await como('rita', () => mover(g.cardId, g.quadro, 'liberacao')), /[Gg]arantia/);
  });

  await teste('RN-006: recusa no Comitê pela alçada e recusa fora do caso', async () => {
    const s = await fluxo.abrir('sergio', 4070);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, resultado: 'RECUSADA', parecer: 'Não.' })));
    aceito(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, resultado: 'RECUSADA', parecer: 'Capacidade insuficiente.' })));
    assert.equal(sol(s.id).FASE, 'recusada');
    assert.equal(um("SELECT RESULTADO FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.id).RESULTADO, 'RECUSADA');
    const t = await fluxo.abrir('rita', 4071);
    recusado(await como('carlos', () => chamar('ccCredSolicitacaoRecusar', { solicitacaoId: t.id, motivo: 'x' })));
  });

  await teste('RN-007: segregação — quem propõe não decide, pela SF e pela ccEsc direta', async () => {
    const escDecisao = (s, login) => como(login, () => chamar('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: s.id, creditoId: 0, resultado: 'APROVADA',
      limiteAprovado: 29000, planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: '', parecer: 'ok', cargoAlcada: 'Supervisor',
      justificativaExcecao: '', motorJson: '{}', membroId: M[login], agora: `${dia(0)}T10:00:00` }));
    const semDecisao = (id) => assert.equal(contar("SELECT COUNT(*) AS N FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", id), 0);
    // (a) Sérgio analista: com o card na decisão, trocar o analista é recusado (SF e ccEsc)
    const a = await fluxo.abrir('sergio', 4072);
    await fluxo.analisar(a);
    await fluxo.aoComite(a);
    recusado(await como('sergio', () => chamar('ccCredSolicitacaoAtribuir', { solicitacaoId: a.id, analistaId: M.ana })), /alçada/);
    await como('sergio', () => chamar('ccEscCredSolicitacaoAnalista', { solicitacaoId: a.id, analistaId: M.ana, membroId: M.sergio }));
    assert.equal(n(sol(a.id).ANALISTA_ID), M.sergio);
    // (a) trocado antes do Comitê, sem a nova analista refazer a proposta: Sérgio continua sem decidir
    const a2 = await fluxo.abrir('sergio', 4073);
    await fluxo.analisar(a2);
    aceito(await como('sergio', () => chamar('ccCredSolicitacaoAtribuir', { solicitacaoId: a2.id, analistaId: M.ana })));
    await fluxo.aoComite({ ...a2, analista: 'ana' });
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: a2.id, ...DECISAO({ limiteAprovado: 29000 }) })), /propôs/);
    await escDecisao(a2, 'sergio');
    semDecisao(a2.id);
    // (b) Rita analista; Sérgio grava o limite proposto → não decide; idem ajuste e score; controle: só o RCA
    for (const [cod, acao] of [[4074, { limiteProposto: 28000 }], [4075, 'ajuste'], [4076, { scoreSerasa: 840 }], [4077, { rca: 'MARIA SOUZA' }]]) {
      const b = await fluxo.abrir('rita', cod);
      await fluxo.analisar(b);
      if (acao === 'ajuste') aceito(await como('sergio', () => chamar('ccCredRatingAjustar', { solicitacaoId: b.id, rating: 'A', justificativa: 'Teste.' })));
      else aceito(await como('sergio', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: b.id, ...acao })));
      if (acao === 'ajuste') db().prepare("UPDATE CC_SOLICITACAO SET AJUSTE_SITUACAO = 'RECUSADO' WHERE ID = ?").run(b.id);
      await fluxo.aoComite(b);
      const lp = n(sol(b.id).LIMITE_PROPOSTO);
      if (acao.rca) {
        assert.ok(!sol(b.id).PROPOSTA_POR.split(',').includes(String(M.sergio)), 'RCA não entra no motor');
        await fluxo.decidir(b, 'sergio', { limiteAprovado: lp });
      } else {
        assert.ok(sol(b.id).PROPOSTA_POR.split(',').includes(String(M.sergio)), `PROPOSTA_POR ${sol(b.id).PROPOSTA_POR}`);
        recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: b.id, ...DECISAO({ limiteAprovado: lp }) })), /propôs/);
        await escDecisao(b, 'sergio');
        semDecisao(b.id);
      }
    }
    // (c) pedido de Rita: Sérgio recomenda → não libera; trocar analista na alçada → recusado
    const pc = await pedido('rita', 4017, 15000);
    aceito(await como('sergio', () => chamar('ccCredPedidoSalvar', { pedidoId: pc.id, recomendacao: 'Liberar.' })));
    recusado(await como('sergio', () => chamar('ccCredPedidoDecidir', { pedidoId: pc.id, ...LIBERAR })), /segrega/);
    await como('sergio', () => chamar('ccEscCredDecisaoInserir', { entidade: 'PEDIDO', entidadeId: pc.id, creditoId: 0, resultado: 'LIBERADO', limiteAprovado: 0,
      planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: 'x', parecer: 'x', cargoAlcada: '', justificativaExcecao: '', motorJson: '{}',
      membroId: M.sergio, agora: `${dia(0)}T10:00:00` }));
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_DECISAO WHERE ENTIDADE = 'PEDIDO' AND ENTIDADE_ID = ?", pc.id), 0);
    for (const f of ['analise', 'alcada']) aceito(await levar(pc.cardId, 'pedidos-limite', f));
    recusado(await como('sergio', () => chamar('ccCredPedidoSalvar', { pedidoId: pc.id, analistaId: M.ana })), /alçada/);
    await como('sergio', () => chamar('ccEscCredPedidoAtualizar', { pedidoId: pc.id, modo: 'ANALISTA', cardId: 0, recomendacao: '', analistaId: M.ana,
      resultado: '', motivo: '', membroId: M.sergio, agora: `${dia(0)}T10:00:00` }));
    assert.equal(n(ped(pc.id).ANALISTA_ID), M.rita);
    // quem lançou o pedido não libera
    const pl = await pedido('sergio', 4017, 15000, 'LANCOU');
    recusado(await como('sergio', () => chamar('ccCredPedidoDecidir', { pedidoId: pl.id, ...LIBERAR })), /segrega/);
    // (d) encerrar sem decisão na fase de decisão → recusado (ccEsc e SF)
    const d = await fluxo.abrir('rita', 4078);
    await fluxo.analisar(d);
    await fluxo.aoComite(d);
    await como('rita', () => chamar('ccEscCredSolicitacaoEncerrar', { solicitacaoId: d.id, motivo: 'x', membroId: M.rita, agora: `${dia(0)}T10:00:00` }));
    assert.deepEqual([sol(d.id).ENCERRADA_EM, sol(d.id).DECIDIDA_EM, sol(d.id).FASE], [null, null, 'comite']);
    recusado(await como('rita', () => chamar('ccCredSolicitacaoRecusar', { solicitacaoId: d.id, motivo: 'x' })));
    // (f) Sérgio muda só o faturamento pela ccEsc direta, e a abertura do CNPJ pela tela
    for (const [cod, viaEsc] of [[4079, true], [4080, false]]) {
      const f = await fluxo.abrir('rita', cod);
      await fluxo.analisar(f);
      if (viaEsc) {
        const atual = sol(f.id);
        await como('sergio', () => chamar('ccEscCredSolicitacaoDados', { solicitacaoId: f.id, membroId: M.sergio, valor: n(atual.VALOR), prazoMeses: n(atual.PRAZO_MESES),
          tipoCliente: atual.TIPO_CLIENTE, justificativa: atual.JUSTIFICATIVA, rca: atual.RCA, obs: '', consData: atual.CONS_DATA, consReceita: atual.CONS_RECEITA,
          consProtesto: atual.CONS_PROTESTO, consProcesso: atual.CONS_PROCESSO, consSocios: atual.CONS_SOCIOS, cnpjAbertura: '', finAc: '', finPc: '', finPl: '',
          finDivida: '', finEbitda: '', fatMensal: 250000, scoreSerasa: n(atual.SCORE_SERASA), fpTipo: atual.FP_TIPO, fpNome: '', fpPrazoDias: 0, garantia: '',
          confFinContatoId: 0, flagNegativacao: 0, flagDados: 0, flagPedido: 0 }));
        assert.equal(n(sol(f.id).FAT_MENSAL), 250000);
      } else {
        aceito(await como('sergio', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: f.id, cnpjAbertura: '2010-01-01' })));
      }
      assert.ok(sol(f.id).PROPOSTA_POR.split(',').includes(String(M.sergio)));
      await fluxo.aoComite(f);
      recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: f.id, ...DECISAO({ limiteAprovado: n(sol(f.id).LIMITE_PROPOSTO) }) })));
      await escDecisao(f, 'sergio');
      semDecisao(f.id);
    }
    // (g) todos os autores: Sérgio grava o limite e Rita o parecer depois
    const g = await fluxo.abrir('rita', 4081);
    await fluxo.analisar(g);
    aceito(await como('sergio', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: g.id, limiteProposto: 27000 })));
    aceito(await como('rita', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: g.id, parecer: 'Revisado.' })));
    assert.deepEqual(sol(g.id).PROPOSTA_POR.split(',').map(Number).sort(), [M.sergio, M.rita].sort());
    await fluxo.aoComite(g);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: g.id, ...DECISAO({ limiteAprovado: 27000 }) })), /propôs/);
    const pg = await pedido('rita', 4017, 15000, 'G2');
    aceito(await como('sergio', () => chamar('ccCredPedidoSalvar', { pedidoId: pg.id, recomendacao: 'Liberar.' })));
    aceito(await como('rita', () => chamar('ccCredPedidoSalvar', { pedidoId: pg.id, recomendacao: 'Liberar com entrada.' })));
    recusado(await como('sergio', () => chamar('ccCredPedidoDecidir', { pedidoId: pg.id, ...LIBERAR })));
    await como('sergio', () => chamar('ccEscCredDecisaoInserir', { entidade: 'PEDIDO', entidadeId: pg.id, creditoId: 0, resultado: 'LIBERADO', limiteAprovado: 0,
      planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: 'x', parecer: 'x', justificativaExcecao: '', motorJson: '{}',
      membroId: M.sergio, agora: AGORA() }));
    assert.equal(decisoes('PEDIDO', pg.id), 0);
  });

  await teste('RN-007 (e): Pública — quem salva a análise do órgão não decide', async () => {
    com005();
    const s = await fluxo.abrir('rita', 4099, { carteira: 'PUBLICA', valor: 80000 });
    aceito(await como('rita', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.id, limiteProposto: 80000, parecer: 'Órgão pontual.' })));
    await fluxo.orgao(s, 'sergio');
    const a = await fluxo.orgao(s, 'rita', { saldoContrato: 450000 });
    const ids = (lista) => String(lista).split(',').map(Number).sort((x, y) => x - y);
    assert.deepEqual([ids(a.PROPOSTA_POR), n(a.ATUALIZADO_POR)], [[M.sergio, M.rita].sort((x, y) => x - y), M.rita]);
    await fluxo.aoComite(s);
    const lim = ateExposicao(s);
    recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: lim }) })), /propôs/);
    await como('sergio', () => chamar('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: s.id, creditoId: 0, resultado: 'APROVADA', limiteAprovado: lim,
      planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: '', parecer: 'ok', justificativaExcecao: '', motorJson: '{}',
      membroId: M.sergio, agora: AGORA() }));
    assert.equal(decisoes('SOLICITACAO', s.id), 0);
    // "Calcular" (gravar = 1) torna proponente (B-01 da B3-005): Gustavo calcula e não decide; Diana decide
    aceito(await como('gustavo', () => chamar('ccCredMotorCalcular', { solicitacaoId: s.id, gravar: 1 })));
    assert.ok(ids(ao(s.id).PROPOSTA_POR).includes(M.gustavo));
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: lim }) })), /propôs/);
    await fluxo.decidir(s, 'diana', { limiteAprovado: lim });
    assert.equal(sol(s.id).DECISAO_RESULTADO, 'APROVADA');
  });

  await teste('RN-005 (B-01 da B3-005): Pública sem contrato ativo — nem a decisão direta aprova; pré-aprovar passa', async () => {
    com005();
    const s = await fluxo.abrir('carlos', 4047, { carteira: 'PUBLICA', valor: 80000 });
    await fluxo.orgao(s, 'carlos', { base: 'EDITAL', edital: 'PE 7/2026', contrato: '', saldoContrato: 0, vigenciaFim: '' });
    await fluxo.aoComite(s);
    const lim = ateExposicao(s);
    const direto = (resultado) => como('gustavo', () => chamar('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: s.id, creditoId: 0, resultado,
      limiteAprovado: lim, planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: '', parecer: 'ok', justificativaExcecao: '', motorJson: '{}',
      membroId: M.gustavo, agora: AGORA() }));
    await direto('APROVADA');
    assert.equal(decisoes('SOLICITACAO', s.id), 0);
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: lim }) })), /contrato/);
    await direto('PRE_APROVADA');
    assert.equal(decisoes('SOLICITACAO', s.id), 1);
  });

  await teste('RN-007 (B-02): membroId textual ("3.0") não fura "quem propõe não decide"', async () => {
    const s = await fluxo.abrir('rita', 4094);
    await fluxo.analisar(s);
    const textual = `${M.sergio}.0`;
    await como('sergio', () => chamar('ccEscCredSolicitacaoAnalise', { solicitacaoId: s.id, limiteProposto: 28000, parecer: 'Revisado.', membroId: textual }));
    assert.equal(n(sol(s.id).LIMITE_PROPOSTO), 28000);
    assert.deepEqual(sol(s.id).PROPOSTA_POR.split(','), [String(M.rita), String(M.sergio)], 'o id entra na forma canônica');
    await fluxo.aoComite(s);
    for (const membroId of [M.sergio, textual]) {
      await como('sergio', () => chamar('ccEscCredDecisaoInserir', { entidade: 'SOLICITACAO', entidadeId: s.id, creditoId: 0, resultado: 'APROVADA',
        limiteAprovado: 28000, planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: '', parecer: 'ok', justificativaExcecao: '',
        motorJson: '{}', membroId, agora: AGORA() }));
    }
    assert.equal(decisoes('SOLICITACAO', s.id), 0);
    // a fila também não oferece a decisão a quem propôs
    assert.ok(!(await como('sergio', () => linhas('ccCredAgendaListar'))).some((x) => x.TIPO === 'DECISAO_ALCADA' && n(x.CARD_ID) === s.cardId));
  });

  await teste('RN-008 (D-06): a marca de administrador não dá alçada (Nara)', async () => {
    const s = await fluxo.abrir('rita', 4082);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    recusado(await como('nara', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 29000 }) })), /exige Supervisor/);
    const fichaNara = await como('nara', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id }));
    if (fichaNara.ok !== false) assert.equal(fichaNara.pode.decidir, false);
    assert.equal(aceito(await como('sergio', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id }))).pode.decidir, true);
    assert.ok(!(await como('nara', () => linhas('ccCredAgendaListar'))).some((x) => x.TIPO === 'DECISAO_ALCADA'));
    const cr = credDe(4005);
    recusado(await como('nara', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Ok.' })), /exige/);
    const pd = await pedido('rita', 4017, 15000);
    recusado(await como('nara', () => chamar('ccCredPedidoDecidir', { pedidoId: pd.id, ...LIBERAR })), /exige/);
    const aj = await fluxo.abrir('rita', 4083);
    await fluxo.analisar(aj);
    aceito(await como('rita', () => chamar('ccCredRatingAjustar', { solicitacaoId: aj.id, rating: 'A', justificativa: 'x' })));
    recusado(await como('nara', () => chamar('ccCredRatingAjusteDecidir', { solicitacaoId: aj.id, aprovar: 1, texto: 'ok' })));
    const antes = contar('SELECT COUNT(*) AS N FROM CC_DECISAO');
    const base = { planoCod: '30', planoDescr: '30 DIAS', forma: 'Boleto bancário', condicao: 'x', parecer: 'x', cargoAlcada: '', justificativaExcecao: '', motorJson: '{}',
      membroId: M.nara, agora: `${dia(0)}T10:00:00` };
    await como('nara', async () => {
      await chamar('ccEscCredDecisaoInserir', { ...base, entidade: 'SOLICITACAO', entidadeId: s.id, creditoId: 0, resultado: 'APROVADA', limiteAprovado: 29000 });
      await chamar('ccEscCredDecisaoInserir', { ...base, entidade: 'SOLICITACAO', entidadeId: cr.SOLICITACAO_ID, creditoId: cr.ID, resultado: 'RENOVADA', limiteAprovado: 0 });
      await chamar('ccEscCredDecisaoInserir', { ...base, entidade: 'PEDIDO', entidadeId: pd.id, creditoId: 0, resultado: 'LIBERADO', limiteAprovado: 0 });
    });
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_DECISAO'), antes);
  });

  await teste('RN-008 (DT-35): Silvia, Supervisor de outra equipe, aprova na alçada (as duas sessões)', async () => {
    const s = await fluxo.abrir('rita', 4084);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    await nasDuasSessoes(async () => {
      await fluxo.decidir(s, 'silvia', { limiteAprovado: 29000 });
      assert.equal(sol(s.id).FASE, 'formalizacao');
      return sol(s.id).DECISAO_RESULTADO;
    });
  });

  await teste('RN-008 (DT-35): Silvia aprova solicitação pública de Rita na alçada', async () => {
    com005();
    const s = await fluxo.abrir('rita', 4097, { carteira: 'PUBLICA', valor: 80000 });
    await fluxo.orgao(s);
    await fluxo.aoComite(s);
    const lim = ateExposicao(s);
    // a leitura do motor do órgão pelo decisor fora do caso (sem gravar); gravar e quem não tem alçada → recusa
    aceito(await como('silvia', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.id, gravar: 0 })));
    const antes = ao(s.id);
    recusado(await como('silvia', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.id, gravar: 1 })), /não encontrada/);
    assert.deepEqual(ao(s.id), antes);
    recusado(await como('ana', () => chamar('ccPubMotorCalcular', { solicitacaoId: s.id, gravar: 0 })), /não encontrada/);
    await nasDuasSessoes(async () => {
      await fluxo.decidir(s, 'silvia', { limiteAprovado: lim });
      const d = um("SELECT * FROM CC_DECISAO WHERE ENTIDADE = 'SOLICITACAO' AND ENTIDADE_ID = ?", s.id);
      assert.deepEqual([sol(s.id).FASE, d.RATING_PUB, n(d.RESPONSAVEL_ID), d.CARGO_ALCADA], ['gestao', antes.RATING_PUB, M.silvia, 'Supervisor']);
      return sol(s.id).DECISAO_RESULTADO;
    });
  });

  await teste('RN-010: aprovado igual ao sugerido passa pela alçada do valor; CNPJ recente exige o Comitê', async () => {
    const s = await fluxo.abrir('rita', 4085);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    await fluxo.decidir(s, 'sergio', { limiteAprovado: n(sol(s.id).MOTOR_LIMITE) });
    const t = await fluxo.abrir('rita', 4086);
    await fluxo.analisar(t, { dados: { cnpjAbertura: '2026-03-14' } });
    await fluxo.aoComite(t);
    recusado(await como('gustavo', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: t.id, ...DECISAO({ limiteAprovado: n(sol(t.id).LIMITE_PROPOSTO) }) })),
      /Comitê de crédito/);
  });

  await teste('RN-012: item da cadastral marcado conta como documento atendido', async () => {
    const s = await fluxo.abrir('rita', 4087);
    await fluxo.analisar(s);
    marcar(s.cardId, { cadastral_1: '1' });
    const f = aceito(await como('rita', () => chamar('ccCredSolicitacaoFicha', { solicitacaoId: s.id })));
    assert.equal(f.motor.detalhes.docs.filter((d) => d.atendido).length, 1);
  });

  await teste('RN-022: rating da concessão não muda com ajuste nem sincronização', async () => {
    const s = await fluxo.ateGestao('rita', 4088);
    const conc = um('SELECT RATING_CONCESSAO FROM CC_CREDITO WHERE ID = ?', s.credito.ID).RATING_CONCESSAO;
    db().prepare("UPDATE CC_SOLICITACAO SET RATING_AJUSTE = 'C', AJUSTE_SITUACAO = 'APROVADO' WHERE ID = ?").run(s.id);
    await leitura();
    assert.equal(um('SELECT RATING_CONCESSAO FROM CC_CREDITO WHERE ID = ?', s.credito.ID).RATING_CONCESSAO, conc);
  });

  await teste('RN-031: decididas — recusa antes do Comitê não conta; pré-aprovada conta como aprovada', async () => {
    const s = await fluxo.abrir('carlos', 4028);
    const antes = aceito(await como('silvia', () => chamar('ccCredDesempenho', { carteira: 'PRIVADA', de: dia(-90), ate: dia(0) }))).analistas.find((x) => x.analistaId === M.carlos);
    aceito(await como('carlos', () => chamar('ccCredSolicitacaoRecusar', { solicitacaoId: s.id, motivo: 'Desistiu.' })));
    const depois = aceito(await como('silvia', () => chamar('ccCredDesempenho', { carteira: 'PRIVADA', de: dia(-90), ate: dia(0) }))).analistas.find((x) => x.analistaId === M.carlos);
    assert.equal(depois.decididas, antes.decididas);
  });

  await teste('RN-037: auditoria da aprovação e do encaminhamento; nada se exclui', async () => {
    const s = await fluxo.abrir('rita', 4089);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    await fluxo.decidir(s);
    const a = auditorias('SOLICITACAO', s.id).filter((x) => /APROVADA/.test(x.DEPOIS || ''));
    assert.ok(a.length >= 1);
    assert.equal(n(a[0].POR), M.sergio);
    assert.match(a.map((x) => x.DEPOIS).join(' '), /29\.000/);
    const enc = auditorias('CREDITO', credDe(4005).ID);
    assert.ok(enc.some((x) => x.POR_NOME === 'Rotina'), JSON.stringify(enc));
    if (existe('ccPodeExcluir')) {
      const r = await como('gustavo', () => chamar('ccPodeExcluir', { cardId: s.cardId, usuarioId: U.gustavo }));
      assert.equal(n((r.rows?.[0] ?? r).PODE), 0);
    }
  });

  await teste('RN-038: o mesmo fluxo nas três carteiras', async () => {
    for (const [carteira, codcli, analista] of [['PRIVADA', 4090, 'rita'], ['ESTETICA', 4091, 'rita'], ['PUBLICA', 4097, 'rita']]) {
      const s = await fluxo.abrir(analista, codcli, { carteira });
      if (carteira === 'PUBLICA') {
        if (tem005()) continue; // com a 005, a Pública da decisão em diante é o teste "RN-038 · RN-024" abaixo
        await fluxo.aoComite(s);
        recusado(await como('sergio', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, ...DECISAO({ limiteAprovado: 30000 }) })), /não está instalado/);
        continue;
      }
      await fluxo.analisar(s);
      await fluxo.aoComite(s);
      await fluxo.decidir(s);
      const cr = await fluxo.liberar(s);
      assert.equal(cr.SITUACAO, 'GESTAO');
      assert.equal(faseDoCard(s.cardId), 'gestao');
      db().prepare('UPDATE CC_CREDITO SET FIM_VALIDADE = ? WHERE ID = ?').run(dia(-1), cr.ID);
      await leitura();
      assert.equal(um('SELECT SITUACAO FROM CC_CREDITO WHERE ID = ?', cr.ID).SITUACAO, 'REANALISE', carteira);
      aceito(await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Renovado.' })));
      assert.equal(contar("SELECT COUNT(*) AS N FROM CC_CREDITO WHERE CLIENTE_ID = ? AND SITUACAO = 'GESTAO'", idDe(codcli)), 1);
    }
  });

  await teste('RN-038 · RN-024: fluxo da Pública da decisão em diante (sem risco do cliente, rating AA–E vazio)', async () => {
    com005();
    const s = await fluxo.abrir('rita', 4098, { carteira: 'PUBLICA', valor: 80000 });
    const a = await fluxo.orgao(s);
    await fluxo.aoComite(s);
    await fluxo.decidir(s, 'sergio', { limiteAprovado: ateExposicao(s) });
    const cr = um('SELECT * FROM CC_CREDITO WHERE SOLICITACAO_ID = ?', s.id);
    assert.deepEqual([cr.SITUACAO, cr.RATING_CONCESSAO, n(cr.ANALISE_ORGAO_ID), faseDoCard(s.cardId)], ['GESTAO', '', n(a.ID), 'gestao']);
    await leitura();
    assert.equal(contar('SELECT COUNT(*) AS N FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ?', idDe(4098)), 0);
    // RN-024: vencido com compras → reanálise; a renovação mantém a análise do órgão e o rating AA–E vazio
    db().prepare('UPDATE CC_CREDITO SET FIM_VALIDADE = ? WHERE ID = ?').run(dia(-1), cr.ID);
    await leitura();
    assert.deepEqual([um('SELECT SITUACAO FROM CC_CREDITO WHERE ID = ?', cr.ID).SITUACAO, faseDoCard(s.cardId)], ['REANALISE', 'reanalise']);
    aceito(await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Órgão pagando em dia.' })));
    const novo = um("SELECT * FROM CC_CREDITO WHERE CLIENTE_ID = ? AND SITUACAO = 'GESTAO'", idDe(4098));
    assert.deepEqual([novo.RATING_CONCESSAO, n(novo.ANALISE_ORGAO_ID), novo.FIM_VALIDADE, faseDoCard(s.cardId)], ['', n(a.ID), somarMeses(dia(0), 3), 'gestao']);
  });

  await teste('RF-026: antecipar a reanálise — Supervisor sim; analista e outra equipe não', async () => {
    const cr = credDe(4011);
    recusado(await como('rita', () => chamar('ccCredReanaliseAbrir', { creditoId: cr.ID, motivo: 'Antecipar.' })));
    recusado(await como('silvia', () => chamar('ccCredReanaliseAbrir', { creditoId: cr.ID, motivo: 'Antecipar.' })));
    await como('silvia', () => chamar('ccEscCredCreditoSituacao', { creditoId: cr.ID, situacao: 'REANALISE', motivo: 'x', membroId: M.silvia, agora: `${dia(0)}T10:00:00` }));
    assert.equal(credDe(4011).SITUACAO, 'GESTAO');
    aceito(await como('sergio', () => chamar('ccCredReanaliseAbrir', { creditoId: cr.ID, motivo: 'Uso crescente.' })));
    assert.equal(credDe(4011).SITUACAO, 'REANALISE');
    assert.equal(faseDoCard(n(cr.CARD_ID)), 'reanalise');
  });

  await teste('RF-039: esteira da Pública de Carlos', async () => {
    const t = await como('carlos', () => linha('ccCredSolicitacaoTotal', { carteira: 'PUBLICA' }));
    const est = await como('carlos', () => linhas('ccCredEsteiraResumo', { carteira: 'PUBLICA' }));
    const emAnalise = est.filter((x) => ['entrada', 'analise', 'comite'].includes(x.FASE_CHAVE)).reduce((a, x) => a + n(x.QTD), 0);
    assert.equal(emAnalise, 3);
    assert.equal(est.reduce((a, x) => a + n(x.ATRASADAS), 0), 1);
    assert.deepEqual([n(t.APROVADAS), n(t.RECUSADAS)], [3, 1]);
  });

  await teste('RF-041: card movido 45 vezes tem 45 passagens', async () => {
    const s = await fluxo.abrir('rita', 4092);
    const antes = contar('SELECT COUNT(*) AS N FROM KB_MOVIMENTO WHERE CARD_ID = ?', s.cardId);
    for (let i = 0; i < 45; i += 1) aceito(await levar(s.cardId, s.quadro, i % 2 === 0 ? 'cadastral' : 'entrada'));
    assert.equal(contar('SELECT COUNT(*) AS N FROM KB_MOVIMENTO WHERE CARD_ID = ?', s.cardId) - antes, 45);
  });

  await teste('RNF-004: orçamento de execuções (ficha 2, escritas ≤ 20, rotina ≤ 150)', async () => {
    const s = await fluxo.abrir('rita', 4093);
    await fluxo.analisar(s);
    await fluxo.aoComite(s);
    // abrir o card = detalhe da lib + ficha da 004
    const abrirCard = (login, cardId, ficha) => execucoes(() => como(login, async () => {
      await chamar('kbCardDetalheSql', { cardId });
      aceito(await chamar(ficha, { cardId }));
    }));
    assert.equal(await abrirCard('rita', s.cardId, 'ccCredSolicitacaoFicha'), 2);
    const dec = await execucoes(() => fluxo.decidir(s));
    assert.ok(dec <= 20, `decisão ${dec}`);
    marcar(s.cardId, { termo_assinado: ['https://arquivos.test/termo.pdf'] });
    aceito(await levar(s.cardId, s.quadro, 'liberacao'));
    const pend = um("SELECT ID FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM_ID = ?", s.id);
    const ap = await execucoes(async () => aceito(await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID }))));
    assert.ok(ap <= 20, `aplicar ${ap}`);
    const re = await execucoes(async () => aceito(await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: credDe(4005).ID, resultado: 'RENOVADA', parecer: 'ok' }))));
    assert.ok(re <= 20, `renovar ${re}`);
    const pd = await pedido('rita', 4017, 15000);
    assert.equal(await abrirCard('rita', pd.cardId, 'ccCredPedidoFicha'), 2);
    const lib = await execucoes(async () => aceito(await como('sergio', () => chamar('ccCredPedidoDecidir', { pedidoId: pd.id, ...LIBERAR }))));
    assert.ok(lib <= 20, `liberar ${lib}`);
    // abrir a Gestão: as SFs da tela (plan, Superfície: resumo, vencidos, vencendo em 15 dias, revisão, pendências)
    const gestao = await execucoes(() => como('rita', async () => {
      await linhas('ccCredCreditoResumo', { carteira: 'PRIVADA' });
      await linhas('ccCredCreditoListar', { carteira: 'PRIVADA', vencidos: 1, limite: 21 });
      await linhas('ccCredCreditoListar', { carteira: 'PRIVADA', vencendoEmDias: 15, limite: 21 });
      await linhas('ccCredRevisaoListar', { carteira: 'PRIVADA', limite: 21 });
      await linhas('ccCredPendenciaListar', { situacao: 'PENDENTE', limite: 21 });
    }));
    assert.ok(gestao <= 6, `gestão ${gestao}`);
    // rodada da rotina medida pelo contador do simulador (aninhadas inclusive)
    const rodada = await execucoes(() => rodarCron('ccCredRotina'));
    assert.ok(rodada > 0 && rodada <= 150, `rotina ${rodada}`);
  });

  // Por último: muda o relógio.
  await teste('RN-034: foto do mês na virada, uma vez só, sem a Pública', async () => {
    fixarRelogio('2026-12-01T10:00:00');
    await leitura();
    await leitura();
    const vigentes = contar("SELECT COUNT(*) AS N FROM CC_CREDITO WHERE VIGENTE_CHAVE IS NOT NULL AND CARTEIRA <> 'PUBLICA'");
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_CALIBRACAO WHERE MES = '2026-11'"), vigentes);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_CALIBRACAO WHERE MES = '2026-11' AND CARTEIRA = 'PUBLICA'"), 0);
    assert.equal(contar("SELECT COUNT(*) AS N FROM CC_CALIBRACAO WHERE MES = '2026-11' AND FAIXA = ''"), 0);
  });
}
