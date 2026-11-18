// Smoke da 007-historico-apoio (plan, seção Testes). Banco único, testes em sequência (plan: história → leituras
// → fontes e material, com o C-010 primeiro → regras → emissões → RN-017 → Órgão público → RN-019). A história
// de 7001 e 7003 é montada no primeiro teste pelas SFs das donas (001 a 004), um passo por minuto (D-014).
// Seeds: 001 (elenco de clientes da visibilidade), 005 (órgãos 5001 e 5002) e 007; não o da 004 (o 4001
// "CLINICA ALFA" mudaria a busca do C-003).

import {
  teste as testeBase, pular, consultar, como, chamar, rodarRotinaAte, execucoes, nasDuasSessoes, existe, assert, M, U, dia, diaUtil, banco,
  comRelogio,
} from './base.mjs';
import { definitions } from '../../add-070-historico-apoio.mjs';
import { origens, CID_SQL, CATEGORIAS } from '../../lib/historico-apoio/eventos.mjs';
import { normalizar } from '../../lib/historico-apoio/texto.mjs';
import { FONTES, MATERIAIS } from '../../lib/historico-apoio/carga-inicial.mjs';

export const SEEDS = ['001', '005', '007'];
export const RELOGIO = '2026-11-19T10:00:00';
export const BANCO_POR_TESTE = false;

const teste = (titulo, fn) => (!process.env.SO || titulo.startsWith('Preparação') || titulo.includes(process.env.SO) ? testeBase(titulo, fn) : null);

/* ── ajudantes ── */

const PADRAO = { busca: '', limite: '100', offset: '0', categoria: '', de: '', ate: '', grupo: '', revisar: '-1', ativo: '1', clienteId: '0' };
const n = (v) => Number(v);
const um = (sql, ...p) => consultar(sql, ...p)[0];
const contarSql = (sql, ...p) => n(um(sql, ...p).N);
const idDe = (codcli) => n(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
const aceito = (r) => { assert.notEqual(r?.ok, false, r?.error); return r; };
const recusado = (r, re) => {
  assert.equal(r?.ok, false, `esperava recusa, veio ${JSON.stringify(r).slice(0, 300)}`);
  if (re) assert.match(r.error, re);
  return r;
};
const linhas = async (nome, input = {}) => (await chamar(nome, { ...PADRAO, ...input })).rows;
const eventos = (login, codcli, extra = {}) => como(login, () => linhas('ccHistEventoListar', { clienteId: idDe(codcli), ...extra }));
const totalEventos = (login, codcli, extra = {}) => como(login, async () => n((await linhas('ccHistEventoTotal', { clienteId: idDe(codcli), ...extra }))[0].TOTAL));
const resumo = (login, codcli) => como(login, () => chamar('ccHistResumo', { clienteId: idDe(codcli) }));
const exportar = (login, codcli, extra = {}) => como(login, () => chamar('ccHistExportar', { clienteId: idDe(codcli), categoria: '', de: '', ate: '', ...extra }));
const buscar = (login, busca) => como(login, () => linhas('ccHistClienteBuscar', { busca }));
const buscarTotal = (login, busca) => como(login, async () => n((await linhas('ccHistClienteBuscarTotal', { busca }))[0].TOTAL));
const porOrigem = (lista, origem) => lista.filter((l) => l.ORIGEM === origem);
const chaveDe = (l) => `${l.ORIGEM}:${l.ORIGEM_ID}`;
const casoDe = (codcli) => um(`SELECT CB.* FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
WHERE C.CODCLI = ? AND CB.CARTEIRA = 'PRIVADA' AND CB.ENCERRADO_EM IS NULL ORDER BY CB.ID DESC`, codcli);
const auditoria = (area, depoisDe = 0) => consultar('SELECT * FROM CC_AUDITORIA WHERE AREA = ? AND ID > ? ORDER BY ID', area, depoisDe);
const ultimaAuditoria = () => n(um('SELECT COALESCE(MAX(ID), 0) AS N FROM CC_AUDITORIA').N);
const leitura = async () => {
  aceito(await como('gustavo', () => chamar('ccBaseSincronizacaoPedir')));
  await rodarRotinaAte();
};

// Fontes e material: salvar é sempre o registro inteiro (a tela manda todos os campos).
const fonte = (titulo) => um('SELECT * FROM CC_FONTE_LINK WHERE TITULO = ?', titulo);
const dadosFonte = (f) => ({ fonteId: f.ID, grupo: f.GRUPO, titulo: f.TITULO, url: f.URL || '', responsavel: f.RESPONSAVEL, uso: f.USO, ordem: f.ORDEM,
  ativo: n(f.ATIVO), revisarJuridico: 0 });
const salvarFonte = (login, dados) => como(login, () => chamar('ccHistFonteSalvar', { fonteId: 0, url: '', responsavel: '', uso: '', ordem: 0, ativo: 1,
  revisarJuridico: 0, ...dados }));
const editarFonte = (login, titulo, mudancas) => salvarFonte(login, { ...dadosFonte(fonte(titulo)), ...mudancas });
const fontes = (login, extra) => como(login, () => linhas('ccHistFonteListar', extra));
const fonteTotal = (login, extra) => como(login, async () => (await linhas('ccHistFonteTotal', extra))[0]);
const material = (titulo) => um('SELECT * FROM CC_MATERIAL WHERE TITULO = ?', titulo);
const dadosMaterial = (x) => ({ materialId: x.ID, grupo: x.GRUPO, titulo: x.TITULO, descricao: x.DESCRICAO, tags: x.TAGS, vigenteDesde: x.VIGENTE_DESDE || '',
  ordem: x.ORDEM, ativo: n(x.ATIVO), anexoId: 0 });
const salvarMaterial = (login, dados) => como(login, () => chamar('ccHistMaterialSalvar', { materialId: 0, descricao: '', tags: '', vigenteDesde: '', ordem: 0,
  ativo: 1, anexoId: 0, ...dados }));
const materiais = (login, extra) => como(login, () => linhas('ccHistMaterialListar', extra));
const materialTotal = (login, extra) => como(login, async () => (await linhas('ccHistMaterialTotal', extra))[0]);
const contarFontes = () => contarSql('SELECT COUNT(*) AS N FROM CC_FONTE_LINK');
const contarMateriais = () => contarSql('SELECT COUNT(*) AS N FROM CC_MATERIAL');
const anexar = (login, materialId, nomeArquivo, mime, tamanhoBytes) => como(login, () => chamar('ccBaseAnexoRegistrar', {
  entidade: 'MATERIAL', entidadeId: materialId, tipoDoc: 'Material de apoio', nomeArquivo, mime, tamanhoBytes,
  url: `https://simulador.local/uploads/${nomeArquivo}` }));

const regras = (login, carteira = '') => como(login, () => chamar('ccHistRegrasVigentes', { carteira }));
const regra = (r, chave) => r.regras.find((x) => x.chave === chave);
const salvarParametros = (login, itens) => como(login, () => chamar('ccBaseParametroSalvar', { itens: JSON.stringify(itens) }));

/* ── estado montado no primeiro teste ── */

const historia = { pronta: false };

export async function suite() {
  await teste('Preparação: 7001–7003 com Ana e a história de 7001 e 7003 pelas SFs das donas (06 §2.5, D-014)', async () => {
    for (const codcli of [7001, 7002, 7003]) {
      assert.equal(n(um('SELECT AGENTE_ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli)?.AGENTE_ID), M.ana, `o elenco atribui o ${codcli} à Ana (PA-16)`);
    }
    const faltam = ['ccBaseContatoSalvar', 'ccCobContatoRegistrar', 'ccCobProxAcaoDefinir', 'ccEmailEnviar', 'ccCobAcordoPropor', 'ccCobAcordoDecidir',
      'ccCobAcordoParcelaPagar', 'ccCredSolicitacaoCriar', 'ccCredPedidoCriar', 'kbNotaRegistrar', 'ccJurProcessoCriar', 'ccJurAndamentoRegistrar']
      .filter((nome) => !existe(nome));
    if (faltam.length) throw new Error(`SFs das donas ausentes: ${faltam.join(', ')}`);
    const alfa = idDe(7001);
    // Um passo por minuto a partir das 09:00 (a ordem fica determinística, RN-001).
    const passo = (k, login, nome, input) => comRelogio(`${dia(0)}T09:${String(k).padStart(2, '0')}:00`,
      async () => aceito(await como(login, () => chamar(nome, input))));
    await passo(0, 'ana', 'ccBaseContatoSalvar', { clienteId: alfa, nome: 'Helena Prado', area: 'Financeiro', funcao: 'Contas a pagar',
      telefone: '(61) 3333-7001', email: 'helena@alfa.test', situacao: 'CONFIRMADO', principal: 1 });
    const contato = (k, extra) => passo(k, 'ana', 'ccCobContatoRegistrar', { clienteId: alfa, carteira: 'PRIVADA', canal: 'Telefone', ...extra });
    await contato(1, { retorno: 'Sem retorno / não atendeu', feedback: 'Ninguém atendeu no financeiro.' });
    await contato(2, { falouCom: 'Helena Prado', retorno: 'Pediu negociação / parcelamento', feedback: 'Pediu proposta de parcelamento.' });
    await contato(3, { falouCom: 'Helena Prado', retorno: 'Promessa de pagamento', previsao: diaUtil(3), valor: 12500, feedback: 'Promete pagar o vencido.' });
    const caso = casoDe(7001);
    assert.ok(caso, 'caso de cobrança da Alfa aberto pela rotina');
    await passo(4, 'ana', 'ccCobProxAcaoDefinir', { cobrancaId: caso.ID, proxAcao: 'Confirmar o pagamento prometido', proxAcaoData: diaUtil(1) });
    await passo(5, 'ana', 'ccEmailEnviar', { codigo: 'COB_ATIVA', clienteId: alfa, origem: '001-manual', referencia: 'hist:7001' });
    const debito = n(um("SELECT VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ? AND CARTEIRA = 'PRIVADA'", alfa).VENCIDO);
    const acordo = await passo(6, 'ana', 'ccCobAcordoPropor', { cobrancaId: caso.ID, debito, valor: 12500, entrada: 2500, entradaData: dia(0),
      nParcelas: 2, primeiroVenc: dia(30), intervaloDias: 30 });
    await passo(7, 'sergio', 'ccCobAcordoDecidir', { acordoId: acordo.acordoId, aprovar: 1, parecer: 'Entrada à vista e duas parcelas.' });
    const entrada = um('SELECT ID FROM CC_ACORDO_PARCELA WHERE ACORDO_ID = ? AND N = 0', acordo.acordoId);
    await passo(8, 'ana', 'ccCobAcordoParcelaPagar', { parcelaId: entrada.ID, pagoEm: dia(0) });
    // A-C1 (v3): só nível ≥ 2 indica outro analista na abertura — quem abre é o Sérgio, supervisor da Ana.
    await passo(9, 'sergio', 'ccCredSolicitacaoCriar', { clienteId: alfa, carteira: 'PRIVADA', tipoCliente: 'RECORRENTE', valor: 100000, prazoMeses: 12,
      justificativa: 'Aumento de compras para 2027.', rca: 'CARLOS LIMA', analistaId: M.rita });
    await passo(10, 'rita', 'ccCredPedidoCriar', { clienteId: alfa, numeroPedido: '771204', valor: 60000, rca: 'CARLOS LIMA', justificativa: 'Pedido de dezembro.' });
    await passo(11, 'ana', 'kbNotaRegistrar', { cardId: casoDe(7001).CARD_ID, texto: 'Cliente pediu o boleto da entrada por e-mail.' });
    const proc = await passo(12, 'julia', 'ccJurProcessoCriar', { clienteId: idDe(7003), carteira: 'PRIVADA', faseChave: 'recebido', valor: 9000 });
    await passo(13, 'julia', 'ccJurAndamentoRegistrar', { processoId: proc.processoId, texto: 'Petição inicial protocolada.' });
    await passo(14, 'julia', 'ccJurAndamentoRegistrar', { processoId: proc.processoId, texto: 'Citação do devedor expedida.' });
    historia.pronta = true;
  });

  const exigeHistoria = () => { if (!historia.pronta) throw new Error('a preparação da história falhou'); };

  await teste('sim:check das 39 origens: cada subconsulta roda sozinha e a união soma as partes', async () => {
    exigeHistoria();
    const lista = origens(CID_SQL);
    assert.equal(lista.length, 39);
    assert.equal(new Set(lista.map((o) => o.categoria)).size, 8);
    let soma = 0;
    for (const o of lista) {
      const { rows } = await banco().runner.executar({ type: 'SQL', code: o.sql }, { clienteId: idDe(7001) }, { userId: 0 });
      soma += rows.length;
    }
    assert.equal(await totalEventos('gustavo', 7001), soma);
  });

  /* ── histórico: leituras ── */

  await teste('C-001: linha do tempo de Alfa para a Ana — agendados no topo, contagens por origem e total = soma', async () => {
    exigeHistoria();
    let lista;
    let r;
    const custo = await execucoes(async () => {
      r = aceito(await resumo('ana', 7001));
      lista = await eventos('ana', 7001);
    });
    assert.equal(custo, 2, 'abrir o histórico: resumo + lista');
    const agendados = lista.slice(0, 3);
    assert.deepEqual(agendados.map((l) => n(l.AGENDADO)), [1, 1, 1]);
    // A aprovação do acordo leva a próxima ação para o vencimento da parcela 1: mesmo instante, por origem.
    assert.deepEqual(agendados.map((l) => l.ORIGEM), ['ACORDO_PARCELA', 'PROX_ACAO', 'ACORDO_PARCELA']);
    assert.ok(agendados[0].EM === agendados[1].EM && agendados[1].EM < agendados[2].EM, 'agendados em data crescente');
    const passados = lista.slice(3);
    assert.ok(passados.every((l) => n(l.AGENDADO) === 0));
    for (let i = 1; i < passados.length; i += 1) assert.ok(passados[i - 1].EM >= passados[i].EM, `passados em ordem decrescente (${i})`);
    const esperado = { CONTATO: 3, PROMESSA: 1, PROX_ACAO: 1, ACORDO: 1, ACORDO_DECISAO: 1, ACORDO_PARCELA: 3, RECEBIMENTO: 2, EMAIL: 1, SOLICITACAO: 1, PEDIDO: 1 };
    for (const [origem, qtd] of Object.entries(esperado)) assert.equal(porOrigem(lista, origem).length, qtd, origem);
    assert.equal(porOrigem(porOrigem(lista, 'ACORDO_PARCELA'), 'ACORDO_PARCELA').filter((l) => n(l.AGENDADO) === 0).length, 1, '1 parcela paga');
    assert.ok(porOrigem(lista, 'MOV_COB').length >= 1, 'mudança de etapa da cobrança');
    assert.ok(porOrigem(lista, 'NOTA').length >= 1, 'nota de card');
    assert.equal(porOrigem(lista, 'AUDITORIA').length, 0);
    assert.ok(!('Alteração auditada' in r.contagens));
    const soma = Object.values(r.contagens).reduce((s, x) => s + x, 0);
    assert.equal(r.total, soma);
    assert.equal(lista.length, soma);
    assert.equal(await totalEventos('ana', 7001), soma);
    for (const l of lista) assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(l.EM), `EM com data e hora: ${l.EM}`);
  });

  await teste('RN-001: no mesmo instante o contato vem antes da promessa (CONTATO < NOTA < PROMESSA) e a ordem é estável', async () => {
    exigeHistoria();
    const lista = await eventos('ana', 7001);
    const promessa = porOrigem(lista, 'PROMESSA')[0];
    const doMesmoInstante = lista.filter((l) => l.EM === promessa.EM).map((l) => l.ORIGEM);
    assert.ok(doMesmoInstante.includes('CONTATO') && doMesmoInstante.includes('NOTA'), doMesmoInstante.join(','));
    assert.deepEqual(doMesmoInstante, [...doMesmoInstante].sort(), 'mesmo instante: por origem');
    assert.ok(doMesmoInstante.indexOf('CONTATO') < doMesmoInstante.indexOf('NOTA') && doMesmoInstante.indexOf('NOTA') < doMesmoInstante.indexOf('PROMESSA'));
    const outra = await eventos('ana', 7001);
    assert.deepEqual(outra.map(chaveDe), lista.map(chaveDe));
  });

  await teste('C-002: filtro "Acordos e baixas" — 5 registros, 2 agendados no topo, contagens e resumo iguais', async () => {
    exigeHistoria();
    const antes = aceito(await resumo('ana', 7001));
    const lista = await eventos('ana', 7001, { categoria: 'Acordos e baixas' });
    assert.equal(lista.length, 5);
    assert.equal(await totalEventos('ana', 7001, { categoria: 'Acordos e baixas' }), 5);
    assert.deepEqual(lista.slice(0, 2).map((l) => n(l.AGENDADO)), [1, 1]);
    assert.ok(lista.every((l) => l.CATEGORIA === 'Acordos e baixas'));
    const depois = aceito(await resumo('ana', 7001));
    assert.equal(depois.contagens['Acordos e baixas'], 5);
    assert.equal(depois.contagens.Recebimentos, 2);
    for (const cat of ['Cobrança', 'Crédito', 'Comunicação']) assert.ok(depois.contagens[cat] > 0, cat);
    assert.deepEqual(depois, antes);
  });

  await teste('C-019: "Acordos e baixas" + "Recebimentos" em páginas de 3 — 3, 3 e 1, sem repetir; total 7', async () => {
    exigeHistoria();
    const categoria = 'Acordos e baixas,Recebimentos';
    const paginas = [];
    for (const offset of [0, 3, 6]) paginas.push(await eventos('ana', 7001, { categoria, limite: 3, offset }));
    assert.deepEqual(paginas.map((p) => p.length), [3, 3, 1]);
    assert.equal(new Set(paginas.flat().map(chaveDe)).size, 7);
    assert.equal(await totalEventos('ana', 7001, { categoria }), 7);
  });

  await teste('C-003: busca do Sérgio por nome e por CNPJ; a Ana só acha o que é dela', async () => {
    const codigos = (ls) => ls.map((l) => n(l.CODCLI)).sort();
    assert.deepEqual(codigos(await buscar('sergio', 'ALFA')), [1008, 7001]);
    assert.equal(await buscarTotal('sergio', 'ALFA'), 2);
    assert.deepEqual(codigos(await buscar('sergio', '70010000000170')), [7001]);
    assert.equal(await buscarTotal('sergio', '70010000000170'), 1);
    assert.deepEqual(codigos(await buscar('sergio', '7001')), [7001]);
    assert.deepEqual(codigos(await buscar('ana', 'ALFA')), [7001]);
    const l = (await buscar('ana', 'ALFA'))[0];
    assert.deepEqual([l.NOME, l.DOCUMENTO, l.AGENTE_NOME, n(l.VENCIDO)], ['ALFA DISTRIBUIDORA LTDA', '70010000000170', 'Ana Costa', 12500]);
  });

  await teste('C-004: visibilidade pela hierarquia — quem não vê recebe "Cliente não encontrado." e zero linha', async () => {
    exigeHistoria();
    const veem = { 7001: ['ana', 'sergio', 'gustavo'], 1006: ['carlos', 'silvia', 'gustavo'] };
    for (const [codcli, quemVe] of Object.entries(veem)) {
      for (const login of ['ana', 'sergio', 'carlos', 'silvia', 'gustavo']) {
        const r = await resumo(login, n(codcli));
        if (quemVe.includes(login)) {
          aceito(r);
          assert.ok((await eventos(login, n(codcli))).length > 0, `${login} vê ${codcli}`);
        } else {
          recusado(r, /^Cliente não encontrado\.$/);
          recusado(await exportar(login, n(codcli)), /^Cliente não encontrado\.$/);
          assert.equal((await eventos(login, n(codcli))).length, 0, `${login} × ${codcli}: lista`);
          assert.equal(await totalEventos(login, n(codcli)), 0, `${login} × ${codcli}: total`);
        }
      }
    }
    assert.equal((await buscar('ana', 'DROGARIA')).length, 0);
    assert.equal(await buscarTotal('ana', 'DROGARIA'), 0);
    assert.equal((await buscar('gustavo', 'DROGARIA')).length, 1);
  });

  await teste('RN-002: Diana e Nara veem tudo; Rita (analista da solicitação) abre 7001 e não 1006; visitante não abre nada', async () => {
    exigeHistoria();
    for (const login of ['diana', 'nara']) for (const codcli of [7001, 1006]) aceito(await resumo(login, codcli));
    aceito(await resumo('rita', 7001));
    assert.ok((await eventos('rita', 7001)).length > 0);
    recusado(await resumo('rita', 1006), /Cliente não encontrado/);
    assert.equal((await eventos('rita', 1006)).length, 0);
    for (const codcli of [7001, 1006]) {
      recusado(await resumo('visitante', codcli));
      recusado(await exportar('visitante', codcli));
      assert.equal((await eventos('visitante', codcli)).length, 0);
      assert.equal(await totalEventos('visitante', codcli), 0);
    }
    assert.equal((await buscar('visitante', 'ALFA')).length, 0);
    assert.equal(await buscarTotal('visitante', ''), 0);
  });

  await teste('C-005: Beta sem registro — total 0, lista vazia e resumo com os campos ausentes nulos', async () => {
    const r = aceito(await resumo('ana', 7002));
    assert.equal(r.total, 0);
    assert.deepEqual(r.contagens, {});
    assert.equal((await eventos('ana', 7002)).length, 0);
    assert.equal(await totalEventos('ana', 7002), 0);
    assert.equal(r.credito, null);
    assert.deepEqual(r.cobrancas, []);
    assert.ok(!r.risco || !r.risco.RATING_ATUAL, 'sem rating');
    assert.equal(r.recuperado, null);
    assert.equal(r.fontePagadora, null);
    assert.equal(r.posicao.A_VENCER, 4000);
  });

  await teste('C-006: resumo de Alfa com os 12 campos', async () => {
    exigeHistoria();
    const r = aceito(await resumo('ana', 7001));
    assert.equal(r.credito.etapa, '1 · Solicitação recebida');
    assert.deepEqual([r.cobrancas.length, r.cobrancas[0].CARTEIRA, r.cobrancas[0].FASE_NOME], [1, 'PRIVADA', 'Acordo em andamento']);
    assert.deepEqual([r.cliente.AGENTE_NOME, r.cliente.SUPERVISOR_NOME], ['Ana Costa', 'Sérgio Nunes']);
    const p = r.posicao;
    assert.deepEqual([p.LIMITE, p.UTILIZADO, p.VENCIDO, p.DIAS_ATRASO, p.A_VENCER], [80000, 32500, 12500, 37, 20000]);
    assert.equal(r.recuperado, 3000);
    assert.deepEqual([r.contatos, r.promessasAbertas], [3, 1]);
    assert.equal(typeof r.documentos, 'number');
    const risco = um('SELECT * FROM CC_RISCO_CLIENTE WHERE CLIENTE_ID = ?', idDe(7001));
    if (risco) {
      assert.deepEqual([r.risco.RATING_ATUAL, r.risco.SCORE_FINAL, r.risco.CRITICIDADE],
        [risco.RATING_ATUAL, risco.SCORE_FINAL === null ? null : n(risco.SCORE_FINAL), risco.CRITICIDADE]);
    } else {
      assert.equal(r.risco, null);
    }
  });

  await teste('RN-005: os 12 campos existem mesmo vazios (Beta); órgão 5001 para o Carlos com rating P1', async () => {
    const r = aceito(await resumo('ana', 7002));
    for (const k of ['credito', 'cobrancas', 'cliente', 'risco', 'ratingPub', 'posicao', 'fontePagadora', 'recuperado', 'contatos', 'promessasAbertas',
      'documentos', 'processos', 'ultimoContato', 'contagens', 'total']) assert.ok(k in r, k);
    assert.deepEqual([r.credito, r.fontePagadora, r.recuperado, r.cobrancas.length], [null, null, null, 0]);
    const orgao = um("SELECT AO.RATING_PUB FROM CC_ANALISE_ORGAO AO JOIN CC_SOLICITACAO S ON S.ID = AO.SOLICITACAO_ID WHERE AO.CLIENTE_ID = ? AND S.DECISAO_RESULTADO = 'APROVADA'",
      idDe(5001));
    if (!orgao) pular('depende de 004 (decisão pública do 5001)');
    const o = aceito(await resumo('carlos', 5001));
    assert.equal(o.ratingPub, 'P1');
  });

  await teste('C-021: Júlia acha Gama (com processo) e não Alfa; processo e 2 andamentos em "Jurídico", sem auditoria', async () => {
    exigeHistoria();
    assert.deepEqual((await buscar('julia', 'GAMA')).map((l) => n(l.CODCLI)), [7003]);
    assert.equal((await buscar('julia', 'ALFA')).length, 0);
    recusado(await resumo('julia', 7001), /^Cliente não encontrado\.$/);
    const lista = await eventos('julia', 7003, { categoria: 'Jurídico' });
    assert.equal(porOrigem(lista, 'PROCESSO').length, 1);
    assert.equal(porOrigem(lista, 'ANDAMENTO').length, 2);
    assert.ok(lista.every((l) => l.CATEGORIA === 'Jurídico'));
    const r = aceito(await resumo('julia', 7003));
    assert.ok(!('Alteração auditada' in r.contagens));
    assert.equal(porOrigem(await eventos('julia', 7003), 'AUDITORIA').length, 0);
    assert.ok(n(um('SELECT COUNT(*) AS N FROM CC_AUDITORIA WHERE CLIENTE_ID = ?', idDe(7003)).N) > 0, 'há auditoria do 7003 que a Júlia não vê');
    // A emissão pela JS segue a mesma regra: a categoria auditada pedida sai vazia; o Jurídico emite o que vê.
    assert.equal(aceito(await exportar('julia', 7003, { categoria: 'Alteração auditada' })).eventos.length, 0);
    const doc = aceito(await exportar('julia', 7003));
    assert.ok(doc.eventos.length > 0 && !doc.eventos.some((l) => l.CATEGORIA === 'Alteração auditada'));
    recusado(await exportar('julia', 7001), /^Cliente não encontrado\.$/);
  });

  await teste('C-022: "Alteração auditada" — Sérgio vê a alteração da ficha de contatos; Ana não vê a categoria', async () => {
    exigeHistoria();
    const rs = aceito(await resumo('sergio', 7001));
    const ra = aceito(await resumo('ana', 7001));
    assert.ok(rs.contagens['Alteração auditada'] > 0);
    assert.ok(!('Alteração auditada' in ra.contagens));
    assert.equal(ra.total, rs.total - rs.contagens['Alteração auditada']);
    const aud = await eventos('sergio', 7001, { categoria: 'Alteração auditada' });
    const ficha = aud.find((l) => l.TITULO.startsWith('Contatos:'));
    assert.ok(ficha, 'linha da ficha de contatos');
    assert.equal(ficha.AUTOR_NOME, 'Ana Costa');
    assert.match(ficha.TEXTO, /Helena Prado/);
    assert.equal((await eventos('ana', 7001, { categoria: 'Alteração auditada' })).length, 0);
    assert.equal(await totalEventos('ana', 7001, { categoria: 'Alteração auditada' }), 0);
    // D-011: a criação que já é fato de outra categoria não ecoa (contato de cobrança, acordo, e-mail, solicitação, pedido).
    assert.ok(!aud.some((l) => /^(Cobrança: \(contato\)|Acordos: \(proposta\)|E-mail: \(envio\)|Crédito: Solicitação|Pedidos: Pedido)$/.test(l.TITULO)));
  });

  await teste('RN-016: analista sem a categoria auditada; administradora com ela; emissão da agente sem auditoria', async () => {
    exigeHistoria();
    assert.ok(!('Alteração auditada' in aceito(await resumo('rita', 7001)).contagens));
    assert.ok(aceito(await resumo('nara', 7001)).contagens['Alteração auditada'] > 0);
    const doc = aceito(await exportar('ana', 7001));
    assert.ok(!doc.eventos.some((l) => l.CATEGORIA === 'Alteração auditada'));
    recusado(await exportar('ana', 7001, { categoria: 'Categoria inventada' }), /Categoria/);
    const pedida = aceito(await exportar('ana', 7001, { categoria: 'Alteração auditada' }));
    assert.equal(pedida.eventos.length, 0);
  });

  await teste('RN-004: toda linha de 7001, 7003 e 5002 tem uma das 8 categorias', async () => {
    exigeHistoria();
    for (const codcli of [7001, 7003, 5002]) {
      const lista = await eventos('gustavo', codcli);
      assert.ok(lista.length > 0, String(codcli));
      for (const l of lista) assert.ok(CATEGORIAS.includes(l.CATEGORIA), `${codcli}: ${l.CATEGORIA}`);
    }
    assert.equal(CATEGORIAS.length, 8);
  });

  await teste('RN-015: e-mail com o assunto no título; destinatário e resultado antes do {+}, corpo depois', async () => {
    exigeHistoria();
    const [email] = porOrigem(await eventos('ana', 7001), 'EMAIL');
    const enviado = um('SELECT * FROM CC_EMAIL_ENVIADO WHERE ID = ?', email.ORIGEM_ID);
    assert.equal(email.TITULO, enviado.ASSUNTO);
    assert.ok(email.TEXTO.startsWith(`Para ${enviado.PARA} · Enviado{+}`), email.TEXTO.slice(0, 80));
    assert.equal(email.TEXTO.split('{+}')[1], enviado.CORPO);
    assert.equal(email.AUTOR_NOME, 'Ana Costa');
  });

  await teste('RN-003: o histórico só lê; a única gravação é a linha de auditoria da emissão', async () => {
    exigeHistoria();
    const nomes = definitions.map((d) => d.name);
    assert.deepEqual(nomes.filter((x) => /^ccHist(Cliente|Resumo|Evento|Exportar)/.test(x)),
      ['ccHistClienteBuscar', 'ccHistClienteBuscarTotal', 'ccHistResumo', 'ccHistEventoListar', 'ccHistEventoTotal', 'ccHistExportar']);
    assert.deepEqual(nomes.filter((x) => x.startsWith('ccEscHist')).filter((x) => !/^ccEscHist(Fonte|Material)/.test(x)), []);
    const tabelas = ['CC_CONTATO_COBRANCA', 'CC_ACORDO', 'CC_SOLICITACAO', 'CC_PROCESSO', 'KB_LOG', 'KB_MOVIMENTO', 'CC_EMAIL_ENVIADO'];
    const foto = () => Object.fromEntries(tabelas.map((t) => [t, contarSql(`SELECT COUNT(*) AS N FROM ${t}`)]));
    const antes = foto();
    const audAntes = contarSql('SELECT COUNT(*) AS N FROM CC_AUDITORIA');
    await buscar('ana', 'ALFA');
    await buscarTotal('ana', 'ALFA');
    aceito(await resumo('ana', 7001));
    await eventos('ana', 7001);
    await totalEventos('ana', 7001);
    aceito(await exportar('ana', 7001));
    assert.deepEqual(foto(), antes);
    assert.equal(contarSql('SELECT COUNT(*) AS N FROM CC_AUDITORIA'), audAntes + 1);
  });

  /* ── fontes e links ── */

  await teste('C-010: 41 fontes ativas em 6 grupos (6, 3, 9, 5, 12, 6); 21 a revisar (12 + 9)', async () => {
    const lista = await fontes('ana');
    assert.equal(lista.length, 41);
    const grupos = [];
    for (const l of lista) {
      if (!grupos.length || grupos.at(-1).grupo !== l.GRUPO) grupos.push({ grupo: l.GRUPO, n: 0, revisar: 0 });
      grupos.at(-1).n += 1;
      grupos.at(-1).revisar += n(l.REVISAR_JURIDICO) ? 1 : 0;
    }
    assert.deepEqual(grupos.map((g) => g.n), [6, 3, 9, 5, 12, 6]);
    assert.deepEqual(grupos.map((g) => g.grupo), [...new Set(FONTES.map((f) => f.GRUPO))]);
    assert.equal(grupos.find((g) => g.grupo === 'Legislação').revisar, 12);
    assert.equal(grupos.find((g) => g.grupo === 'Fluxo da NF e pagamento no setor público').revisar, 9);
    assert.equal(lista.filter((l) => n(l.REVISAR_JURIDICO)).length, 21);
    const t = await fonteTotal('ana');
    assert.deepEqual([n(t.TOTAL), n(t.A_REVISAR), n(t.GRUPOS)], [41, 21, 6]);
    assert.ok(lista.every((l) => l.URL === null), 'carga sem link (P-32)');
  });

  const NOVA = { grupo: 'Consultas cadastrais e de crédito', titulo: 'Receita Federal — Consulta de regularidade', url: 'https://exemplo.gov.br',
    responsavel: 'Receita Federal', uso: 'Regularidade fiscal do cliente.', ordem: 99 };

  await teste('C-011: Gustavo inclui, edita o uso, reordena e inativa uma fonte; link sem http e título repetido são recusados', async () => {
    const T = n((await fonteTotal('gustavo')).TOTAL);
    let r;
    const custo = await execucoes(async () => { r = aceito(await salvarFonte('gustavo', NOVA)); });
    assert.equal(custo, 3, 'salvar = JS + interna + auditoria');
    const id = r.fonteId;
    assert.equal(n((await fonteTotal('gustavo')).TOTAL), T + 1);
    aceito(await editarFonte('gustavo', NOVA.titulo, { uso: 'Regularidade fiscal antes de liberar limite.' }));
    aceito(await editarFonte('gustavo', NOVA.titulo, { ordem: 0 }));
    const grupo = await fontes('gustavo', { grupo: NOVA.grupo });
    assert.equal(n(grupo[0].ID), id, 'primeira do grupo');
    aceito(await editarFonte('gustavo', NOVA.titulo, { ativo: 0 }));
    assert.equal(n((await fonteTotal('ana')).TOTAL), T);
    assert.equal(n((await fonteTotal('ana', { ativo: '-1' })).TOTAL), T);
    assert.equal(n((await fonteTotal('gustavo', { ativo: '-1' })).TOTAL), T + 1);
    assert.equal((await fontes('gustavo', { ativo: '0' })).length, 1);
    const aud = consultar("SELECT CAMPO, ANTES, DEPOIS FROM CC_AUDITORIA WHERE AREA = 'Fontes' AND ENTIDADE = 'FONTE_LINK' AND ENTIDADE_ID = ? ORDER BY ID", id);
    assert.deepEqual(aud.map((a) => a.CAMPO), ['(criação)', 'USO', 'ORDEM', 'ATIVO']);
    assert.deepEqual([aud[1].ANTES, aud[1].DEPOIS], ['Regularidade fiscal do cliente.', 'Regularidade fiscal antes de liberar limite.']);
    assert.deepEqual([aud[3].ANTES, aud[3].DEPOIS], ['Sim', 'Não']);
    assert.ok(consultar("SELECT CLIENTE_ID FROM CC_AUDITORIA WHERE AREA = 'Fontes' AND ENTIDADE_ID = ?", id).every((a) => a.CLIENTE_ID === null));
    recusado(await salvarFonte('gustavo', { ...NOVA, titulo: 'Outra', url: 'ftp://x' }), /http/);
    recusado(await salvarFonte('gustavo', { ...NOVA, titulo: 'Outra', url: 'exemplo.gov.br' }), /http/);
    recusado(await salvarFonte('gustavo', NOVA), /Já existe/);
    assert.equal(n((await fonteTotal('gustavo', { ativo: '-1' })).TOTAL), T + 1);
  });

  await teste('C-012: Agente, Analista, Supervisor e Jurídico não alteram fontes nem material; Gerente e Diretoria sim', async () => {
    const [f0, m0] = [contarFontes(), contarMateriais()];
    for (const login of ['ana', 'rita', 'sergio', 'julia']) {
      recusado(await salvarFonte(login, { grupo: 'Setor público', titulo: `Fonte de ${login}` }), /Gerente, Diretoria ou Administrador/);
      recusado(await editarFonte(login, 'CAUC', { uso: 'mudado' }), /Gerente, Diretoria ou Administrador/);
      recusado(await salvarMaterial(login, { grupo: 'Treinamentos', titulo: `Material de ${login}` }), /Gerente, Diretoria ou Administrador/);
    }
    assert.deepEqual([contarFontes(), contarMateriais()], [f0, m0]);
    // A interna chamada direto: a guarda ATOR + PODE_ADMINISTRAR está na SQL.
    const direto = (membroId) => como('ana', () => chamar('ccEscHistFonteInserir', { grupo: 'Setor público', titulo: 'Direto', url: '', responsavel: '', uso: '',
      busca: 'DIRETO', ordem: 0, ativo: 1, revisarJuridico: 0, membroId, agora: '2026-11-19T10:00:00' }));
    await direto(M.ana);
    await direto(M.gustavo);
    assert.equal(contarFontes(), f0, 'Ana não grava pela interna, nem em nome do Gustavo');
    aceito(await salvarFonte('gustavo', { grupo: 'Setor público', titulo: 'Fonte do Gustavo (C-012)' }));
    aceito(await salvarFonte('diana', { grupo: 'Setor público', titulo: 'Fonte da Diana (C-012)' }));
    aceito(await salvarMaterial('gustavo', { grupo: 'Treinamentos', titulo: 'Treinamento do Gustavo (C-012)' }));
    aceito(await salvarMaterial('diana', { grupo: 'Treinamentos', titulo: 'Treinamento da Diana (C-012)' }));
    assert.deepEqual([contarFontes(), contarMateriais()], [f0 + 2, m0 + 2]);
  });

  await teste('C-004 · C-012: número injetado não lê cliente alheio nem grava pelas internas (B4 C-01); Ana chama cada ccEscHist… direto', async () => {
    // Leitura: o `revisar` com UNION da prova do validador vira -1 (CAST) e a resposta é a de sempre.
    const RS = (await fonteTotal('ana', { revisar: '-1' }));
    const injetado = '-1 OR 1=1) UNION SELECT C.NOME, C.DOCUMENTO, C.ID FROM CC_CLIENTE C JOIN CC_FONTE_LINK F ON 1=1 '
      + 'JOIN (SELECT 1 AS NIVEL, 0 AS ADMIN) EU ON 1=1 WHERE C.CODCLI = 1006 -- ';
    const r = await como('ana', () => linhas('ccHistFonteTotal', { revisar: injetado }));
    assert.deepEqual(r, [RS]);
    assert.ok(!JSON.stringify(r).includes('DROGARIA'));
    const ativo = await como('ana', () => linhas('ccHistMaterialListar', { ativo: '-1) OR (1=1' }));
    assert.deepEqual(ativo.map((l) => l.ID), (await materiais('ana', { ativo: '-1' })).map((l) => l.ID));
    // Escrita: a Ana, com o próprio membroId, em nome do Gustavo, com id injetado e com membroId injetado — nada muda.
    const foto = () => JSON.stringify([consultar('SELECT * FROM CC_FONTE_LINK ORDER BY ID'), consultar('SELECT * FROM CC_MATERIAL ORDER BY ID')]);
    const antes = foto();
    const f = fonte('CAUC');
    const sel = um('SELECT * FROM CC_FONTE_LINK WHERE REVISAR_JURIDICO = 1 ORDER BY ID');
    const mt = um('SELECT * FROM CC_MATERIAL ORDER BY ID');
    const AGORA = '2026-11-19T10:00:00';
    const jeitos = [[M.ana, (x) => x], [M.gustavo, (x) => x], [M.ana, (x) => `${x} OR ID = ${x}`], [`${M.ana} OR 1=1`, (x) => x]];
    for (const [membroId, id] of jeitos) {
      const c = (nome, input) => como('ana', () => chamar(nome, { ...input, membroId, agora: AGORA }));
      await c('ccEscHistFonteInserir', { grupo: 'Setor público', titulo: 'Direto (C-01)', url: '', responsavel: '', uso: '', busca: 'DIRETO', ordem: 0, ativo: 1,
        revisarJuridico: 0 });
      await c('ccEscHistFonteAtualizar', { fonteId: id(f.ID), grupo: f.GRUPO, titulo: f.TITULO, url: 'https://phishing.example/cauc', responsavel: f.RESPONSAVEL,
        uso: f.USO, busca: f.BUSCA, ordem: f.ORDEM, ativo: 1, revisarJuridico: 0 });
      await c('ccEscHistFonteRevisar', { fonteId: id(sel.ID) });
      await c('ccEscHistMaterialInserir', { grupo: 'Treinamentos', titulo: 'Direto (C-01)', descricao: '', tags: '', busca: 'DIRETO', vigenteDesde: '', ordem: 0,
        ativo: 1 });
      await c('ccEscHistMaterialAtualizar', { materialId: id(mt.ID), grupo: mt.GRUPO, titulo: mt.TITULO, descricao: 'ALTERADO PELA ANA', tags: mt.TAGS,
        busca: mt.BUSCA, vigenteDesde: '', ordem: mt.ORDEM, ativo: 1, anexoId: 0 });
    }
    assert.equal(foto(), antes);
  });

  await teste('C-013: Júlia revisa "Lei 14.133/2021"; revisar de novo não regrava; link alterado devolve o selo; Ana não revisa', async () => {
    const titulo = 'Lei 14.133/2021 (licitações e contratos)';
    const antes = n((await fonteTotal('ana')).A_REVISAR);
    const aud0 = ultimaAuditoria();
    let r;
    const custo = await execucoes(async () => { r = aceito(await como('julia', () => chamar('ccHistFonteRevisar', { fonteId: fonte(titulo).ID }))); });
    assert.equal(custo, 3);
    const f = fonte(titulo);
    assert.deepEqual([n(f.REVISAR_JURIDICO), n(f.REVISADO_POR), f.REVISADO_EM], [0, M.julia, '2026-11-19T10:00:00']);
    assert.equal(r.revisadoPor, 'Júlia Farias');
    assert.equal(n((await fonteTotal('ana')).A_REVISAR), antes - 1);
    const aud = auditoria('Fontes', aud0);
    assert.deepEqual(aud.map((a) => [a.CAMPO, a.ANTES, a.DEPOIS]), [['REVISAR_JURIDICO', 'Sim', 'Não']]);
    const lida = (await fontes('ana', { busca: 'LEI 14.133' })).find((l) => l.TITULO === titulo);
    assert.equal(lida.REVISADO_POR_NOME, 'Júlia Farias');
    recusado(await como('julia', () => chamar('ccHistFonteRevisar', { fonteId: f.ID })), /já está revisada/);
    assert.equal(auditoria('Fontes', aud0).length, 1);
    aceito(await editarFonte('gustavo', titulo, { url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' }));
    const g = fonte(titulo);
    assert.deepEqual([n(g.REVISAR_JURIDICO), g.REVISADO_EM, g.REVISADO_POR], [1, null, null]);
    recusado(await como('ana', () => chamar('ccHistFonteRevisar', { fonteId: g.ID })), /Jurídico/);
  });

  await teste('RN-009: Agente só vê ativas (fontes e material) mesmo pedindo inativas; Gerente vê; Jurídico não edita; Administradora salva', async () => {
    const inativa = fonte(NOVA.titulo);
    assert.equal(n(inativa.ATIVO), 0, 'inativada no C-011');
    for (const ativo of ['-1', '0']) {
      assert.ok(!(await fontes('ana', { ativo })).some((l) => !n(l.ATIVO)), `fontes ativo=${ativo}`);
      assert.ok(!(await materiais('ana', { ativo })).some((l) => !n(l.ATIVO)), `material ativo=${ativo}`);
    }
    assert.ok((await fontes('gustavo', { ativo: '0' })).some((l) => n(l.ID) === n(inativa.ID)));
    recusado(await editarFonte('julia', 'CAUC', { titulo: 'CAUC (Tesouro)' }), /Gerente, Diretoria ou Administrador/);
    aceito(await salvarFonte('nara', { grupo: 'Setor público', titulo: 'Fonte da Nara (RN-009)', url: 'https://exemplo.gov.br/nara' }));
  });

  await teste('RN-010: título alterado devolve o selo e apaga a revisão; mudar só o uso não devolve', async () => {
    for (const titulo of ['Lei 4.320/1964', 'Código Civil']) aceito(await como('julia', () => chamar('ccHistFonteRevisar', { fonteId: fonte(titulo).ID })));
    aceito(await editarFonte('gustavo', 'Lei 4.320/1964', { titulo: 'Lei 4.320/1964 (normas de direito financeiro)' }));
    const a = fonte('Lei 4.320/1964 (normas de direito financeiro)');
    assert.deepEqual([n(a.REVISAR_JURIDICO), a.REVISADO_EM, a.REVISADO_POR], [1, null, null]);
    const aud = consultar("SELECT CAMPO FROM CC_AUDITORIA WHERE AREA = 'Fontes' AND ENTIDADE_ID = ? ORDER BY ID", a.ID).map((x) => x.CAMPO);
    assert.deepEqual(aud.slice(-2), ['TITULO', 'REVISAR_JURIDICO']);
    aceito(await editarFonte('gustavo', 'Código Civil', { uso: 'Arts. 389, 394 e 397: mora, perdas e danos e juros.' }));
    const b = fonte('Código Civil');
    assert.deepEqual([n(b.REVISAR_JURIDICO), n(b.REVISADO_POR)], [0, M.julia]);
    // Só a caixa do caminho muda: é outro endereço, o selo volta (HEX na SQL; no MySQL `ai_ci` acharia igual, B4 O-01).
    aceito(await editarFonte('gustavo', 'Código Civil', { url: 'https://www.planalto.gov.br/Lei' }));
    aceito(await como('julia', () => chamar('ccHistFonteRevisar', { fonteId: b.ID })));
    aceito(await editarFonte('gustavo', 'Código Civil', { url: 'https://www.planalto.gov.br/lei' }));
    assert.equal(n(fonte('Código Civil').REVISAR_JURIDICO), 1);
  });

  await teste('RN-011: http e https aceitos; sem protocolo e javascript: recusados; link vazio aceito', async () => {
    aceito(await salvarFonte('gustavo', { grupo: 'Setor público', titulo: 'Link https (RN-011)', url: 'https://a.gov.br/x' }));
    aceito(await salvarFonte('gustavo', { grupo: 'Setor público', titulo: 'Link http (RN-011)', url: 'http://a.gov.br' }));
    recusado(await salvarFonte('gustavo', { grupo: 'Setor público', titulo: 'Sem protocolo (RN-011)', url: 'a.gov.br' }), /http/);
    recusado(await salvarFonte('gustavo', { grupo: 'Setor público', titulo: 'Script (RN-011)', url: 'javascript:alert(1)' }), /http/);
    aceito(await salvarFonte('gustavo', { grupo: 'Legislação', titulo: 'Sem link (RN-011)', url: '' }));
    assert.equal(fonte('Sem link (RN-011)').URL, null);
    // A interna recusa sozinha o link fora do padrão (chamada direta pula a JS).
    const antes = contarFontes();
    await como('gustavo', () => chamar('ccEscHistFonteInserir', { grupo: 'Setor público', titulo: 'Direto (RN-011)', url: 'javascript:alert(1)', responsavel: '',
      uso: '', busca: '', ordem: 0, ativo: 1, revisarJuridico: 0, membroId: M.gustavo, agora: '2026-11-19T10:00:00' }));
    assert.equal(contarFontes(), antes);
  });

  await teste('RN-013: busca de fonte sem acento acha "Licitações"; BUSCA gravada = normalizar()', async () => {
    const titulos = (await fontes('ana', { busca: 'LICITACOES' })).map((l) => l.TITULO);
    assert.ok(titulos.includes('TCU: Licitações e Contratos, pagamento'), titulos.join(' | '));
    const f = fonte(NOVA.titulo);
    assert.equal(f.BUSCA, normalizar(`${f.TITULO} ${f.RESPONSAVEL} ${f.USO}`));
    assert.equal(normalizar('  ÁÇÃO Ltda '), normalizar('acao ltda'));
    assert.equal(n((await fonteTotal('ana', { busca: 'LICITACOES' })).TOTAL), titulos.length);
  });

  /* ── material de apoio ── */

  await teste('C-016: os 7 materiais da carga sem arquivo; material novo fica "Arquivo pendente"', async () => {
    const lista = await materiais('ana');
    for (const m of MATERIAIS) {
      const l = lista.find((x) => x.TITULO === m.TITULO);
      assert.ok(l, m.TITULO);
      assert.equal(l.ANEXO_URL, null, m.TITULO);
    }
    assert.equal(MATERIAIS.length, 7);
    const antes = n((await materialTotal('ana')).PENDENTES);
    const r = aceito(await salvarMaterial('gustavo', { grupo: 'Treinamentos', titulo: 'Treinamento: régua de cobrança (C-016)', descricao: 'Slides.' }));
    const novo = (await materiais('ana')).find((x) => n(x.ID) === r.materialId);
    assert.equal(novo.ANEXO_URL, null);
    assert.equal(n((await materialTotal('ana')).PENDENTES), antes + 1);
  });

  await teste('C-014: busca "politica", "fluxo" e "zzz"; total acompanha o filtro; inativar um material', async () => {
    const politica = await materiais('ana', { busca: 'POLITICA' });
    assert.deepEqual(politica.map((l) => l.TITULO), ['Política de Crédito e Cobrança v5.2']);
    assert.equal((await materiais('ana', { busca: 'FLUXO' })).length, 6);
    assert.equal((await materiais('ana', { busca: 'ZZZ' })).length, 0);
    for (const [busca, qtd] of [['POLITICA', 1], ['FLUXO', 6], ['ZZZ', 0]]) assert.equal(n((await materialTotal('ana', { busca })).TOTAL), qtd, busca);
    const T = n((await materialTotal('ana')).TOTAL);
    aceito(await salvarMaterial('gustavo', { ...dadosMaterial(material('Fluxo — cobrança judicial')), ativo: 0 }));
    const aud = consultar("SELECT CAMPO, ANTES, DEPOIS FROM CC_AUDITORIA WHERE AREA = 'Material' AND ENTIDADE_ID = ? ORDER BY ID", material('Fluxo — cobrança judicial').ID);
    assert.deepEqual(aud.map((a) => [a.CAMPO, a.ANTES, a.DEPOIS]), [['ATIVO', 'Sim', 'Não']]);
    assert.equal(n((await materialTotal('ana')).TOTAL), T - 1);
    assert.equal(n((await materialTotal('gustavo', { ativo: '-1' })).TOTAL), T);
  });

  const MAT = { grupo: 'Fluxos de processo', titulo: 'Fluxo de teste com arquivo (C-015)', descricao: 'Item criado pelo teste.' };

  await teste('C-015: PNG de 2 MB aceito e ligado; EXE e PDF de 25 MB recusados pelo registro; anexo de cliente recusado', async () => {
    const r = aceito(await salvarMaterial('gustavo', MAT));
    const materialId = r.materialId;
    let anexoId;
    const custo = await execucoes(async () => {
      anexoId = aceito(await anexar('gustavo', materialId, 'fluxo-teste.png', 'image/png', 2 * 1024 * 1024)).anexoId;
      aceito(await salvarMaterial('gustavo', { ...dadosMaterial(material(MAT.titulo)), anexoId }));
    });
    assert.equal(custo, 6, `anexar: ${custo} execuções`);
    const l = (await materiais('ana', { busca: 'ARQUIVO (C-015)' }))[0];
    assert.deepEqual([n(l.ANEXO_ID), l.ANEXO_NOME], [anexoId, 'fluxo-teste.png']);
    assert.ok(l.ANEXO_URL.startsWith('https://'));
    recusado(await anexar('gustavo', materialId, 'programa.exe', 'application/octet-stream', 1000), /Formato/);
    recusado(await anexar('gustavo', materialId, 'grande.pdf', 'application/pdf', 25 * 1024 * 1024), /20 MB/);
    assert.equal(n(material(MAT.titulo).ANEXO_ID), anexoId);
    const doCliente = aceito(await como('ana', () => chamar('ccBaseAnexoRegistrar', { entidade: 'CLIENTE', entidadeId: idDe(7001), tipoDoc: 'Contrato social',
      nomeArquivo: 'contrato.pdf', mime: 'application/pdf', tamanhoBytes: 1000, url: 'https://simulador.local/uploads/contrato.pdf' }))).anexoId;
    recusado(await salvarMaterial('gustavo', { ...dadosMaterial(material(MAT.titulo)), anexoId: doCliente }), /arquivo/);
    recusado(await salvarMaterial('ana', { ...dadosMaterial(material(MAT.titulo)), anexoId }), /Gerente, Diretoria ou Administrador/);
    assert.equal(n(material(MAT.titulo).ANEXO_ID), anexoId);
    // A interna recusa sozinha o anexo que não é MATERIAL deste item.
    const m = material(MAT.titulo);
    await como('gustavo', () => chamar('ccEscHistMaterialAtualizar', { materialId: m.ID, grupo: m.GRUPO, titulo: m.TITULO, descricao: m.DESCRICAO, tags: m.TAGS,
      busca: m.BUSCA, vigenteDesde: '', ordem: m.ORDEM, ativo: 1, anexoId: doCliente, membroId: M.gustavo, agora: '2026-11-19T10:00:00' }));
    assert.equal(n(material(MAT.titulo).ANEXO_ID), anexoId);
  });

  await teste('RN-012: segundo arquivo substitui o primeiro no mesmo item; o anterior sai', async () => {
    const m = material(MAT.titulo);
    const primeiro = n(m.ANEXO_ID);
    assert.ok(primeiro, 'material do C-015 com arquivo');
    let r;
    const custo = await execucoes(async () => {
      const anexoId = aceito(await anexar('gustavo', m.ID, 'fluxo-teste-v2.pdf', 'application/pdf', 3 * 1024 * 1024)).anexoId;
      r = aceito(await salvarMaterial('gustavo', { ...dadosMaterial(m), anexoId }));
      aceito(await como('gustavo', () => chamar('ccBaseAnexoRemover', { anexoId: r.anteriorAnexoId })));
    });
    assert.equal(custo, 9, `trocar o arquivo: ${custo} execuções (plan: 9)`);
    assert.equal(r.anteriorAnexoId, primeiro);
    const l = (await materiais('ana', { busca: 'ARQUIVO (C-015)' }))[0];
    assert.notEqual(n(l.ANEXO_ID), primeiro);
    assert.equal(l.ANEXO_NOME, 'fluxo-teste-v2.pdf');
    assert.ok(um('SELECT REMOVIDO_EM FROM CC_ANEXO WHERE ID = ?', primeiro).REMOVIDO_EM);
    const aud = consultar("SELECT CAMPO, ANTES, DEPOIS FROM CC_AUDITORIA WHERE AREA = 'Material' AND ENTIDADE_ID = ? AND CAMPO = 'ARQUIVO' ORDER BY ID", m.ID);
    assert.deepEqual(aud.at(-1), { CAMPO: 'ARQUIVO', ANTES: 'fluxo-teste.png', DEPOIS: 'fluxo-teste-v2.pdf' });
  });

  /* ── regras em vigor ── */

  await teste('C-017: correção e multa por carteira — próprio com "desde", herdado, vigência futura fora, régua não se aplica na Pública', async () => {
    aceito(await salvarParametros('gustavo', [
      { chave: 'enc.correcao', carteira: 'ESTETICA', valor: 0.3, vigenciaInicio: dia(0) },
      { chave: 'enc.correcao', carteira: 'ESTETICA', valor: 0.9, vigenciaInicio: '2099-01-01' },
    ]));
    let r;
    const custo = await execucoes(async () => { r = aceito(await regras('ana')); });
    assert.equal(custo, 4, `abrir as regras: ${custo} (plan: 4)`);
    const correcao = regra(r, 'enc.correcao');
    assert.equal(n(correcao.padrao.valor), 0.4);
    assert.deepEqual([n(correcao.carteiras.PRIVADA.valor), correcao.carteiras.PRIVADA.proprio], [0.4, false]);
    assert.deepEqual([n(correcao.carteiras.ESTETICA.valor), correcao.carteiras.ESTETICA.proprio, correcao.carteiras.ESTETICA.desde], [0.3, true, dia(0)]);
    assert.deepEqual([n(correcao.carteiras.PUBLICA.valor), correcao.carteiras.PUBLICA.proprio, correcao.carteiras.PUBLICA.desde], [0.4, false, null]);
    const multa = regra(r, 'enc.multa');
    assert.equal(n(multa.padrao.valor), 2);
    assert.deepEqual([n(multa.carteiras.ESTETICA.valor), multa.carteiras.ESTETICA.proprio], [2, false]);
    assert.deepEqual([n(multa.carteiras.PUBLICA.valor), multa.carteiras.PUBLICA.proprio], [0, true]);
    assert.ok(multa.carteiras.PUBLICA.desde);
    assert.ok(!JSON.stringify(r.regras).includes('"0.9"'), 'vigência futura não aparece');
    assert.deepEqual(['PRIVADA', 'ESTETICA', 'PUBLICA'].map((c) => regra(r, 'regua.notif').carteiras[c].aplica), [true, true, false]);
    assert.equal(regra(r, 'pub.pequenoValor').carteiras.PRIVADA.aplica, false);
    assert.equal(r.versao, '5.2');
    // Leitura aninhada sem sessão ou com ela (DT-34): a mesma resposta.
    await nasDuasSessoes(async () => aceito(await regras('ana')).regras.length);
    const so = aceito(await regras('ana', 'PUBLICA'));
    assert.deepEqual(Object.keys(regra(so, 'enc.multa').carteiras), ['PUBLICA']);
    recusado(await regras('visitante'));
  });

  await teste('RN-014: novo padrão 0,5 vale para Privada e Pública; Estética segue 0,3 própria', async () => {
    aceito(await salvarParametros('gustavo', [{ chave: 'enc.correcao', carteira: '', valor: 0.5, vigenciaInicio: dia(0) }]));
    const c = regra(aceito(await regras('ana')), 'enc.correcao');
    assert.equal(n(c.padrao.valor), 0.5);
    assert.deepEqual([n(c.carteiras.PRIVADA.valor), n(c.carteiras.PUBLICA.valor), c.carteiras.PUBLICA.proprio], [0.5, 0.5, false]);
    assert.deepEqual([n(c.carteiras.ESTETICA.valor), c.carteiras.ESTETICA.proprio], [0.3, true]);
  });

  await teste('C-018: nenhuma SF da 007 escreve parâmetro; todo valor próprio de carteira traz "desde"', async () => {
    for (const d of definitions) {
      assert.ok(!/ccBaseParametroSalvar|(INSERT INTO|UPDATE) CC_PARAMETRO/.test(d.code), d.name);
    }
    const r = aceito(await regras('ana'));
    const proprios = r.regras.flatMap((x) => Object.values(x.carteiras)).filter((c) => c.proprio);
    assert.ok(proprios.length > 0);
    assert.ok(proprios.every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.desde)));
  });

  await teste('C-020: etapas e prazos vêm dos quadros, na ordem; renomear a etapa muda a consulta', async () => {
    const fasesDe = (r, quadro) => r.quadros.find((x) => x.quadro === quadro).fases;
    const r = aceito(await regras('ana'));
    const cob = fasesDe(r, 'cobranca-privada');
    assert.deepEqual(cob.find((f) => f.chave === 'negociacao'), { chave: 'negociacao', nome: 'Em negociação', slaHoras: 240, final: false });
    const ordem = consultar("SELECT CHAVE FROM CC_FASE WHERE QUADRO = 'cobranca-privada' ORDER BY ORDEM").map((x) => x.CHAVE);
    assert.deepEqual(cob.map((f) => f.chave), ordem);
    const conc = fasesDe(r, 'concessao-privada');
    assert.deepEqual([conc[0].chave, conc[0].nome, conc[0].slaHoras], ['entrada', '1 · Solicitação recebida', 24]);
    const f = um(`SELECT KF.* FROM CC_FASE CF JOIN KB_FASE KF ON KF.ID = CF.FASE_ID WHERE CF.QUADRO = 'cobranca-privada' AND CF.CHAVE = 'negociacao'`);
    const salvar = (nome) => como('nara', () => chamar('kbFaseSalvar', { id: f.ID, boardId: f.BOARD_ID, nome, cor: f.COR || '', descricao: f.DESCRICAO || '',
      tipo: f.TIPO, slaHoras: f.SLA_HORAS, condicaoJson: f.CONDICAO_JSON || '', capaJson: f.CAPA_JSON || '', ativo: 1 }));
    aceito(await salvar('Negociação em curso'));
    assert.equal(fasesDe(aceito(await regras('ana')), 'cobranca-privada').find((x) => x.chave === 'negociacao').nome, 'Negociação em curso');
    aceito(await salvar(f.NOME));
  });

  /* ── emissão do documento ── */

  await teste('C-007: emissão de Alfa com "Acordos e baixas" — 5 registros, ficha de contatos, autora, hora e 1 auditoria', async () => {
    exigeHistoria();
    const aud0 = ultimaAuditoria();
    let doc;
    const custo = await execucoes(async () => { doc = aceito(await exportar('ana', 7001, { categoria: 'Acordos e baixas' })); });
    assert.equal(custo, 2);
    assert.equal(doc.eventos.length, 5);
    assert.deepEqual([doc.total, doc.cortado], [5, false]);
    assert.deepEqual(doc.eventos.slice(0, 2).map((l) => n(l.AGENDADO)), [1, 1]);
    assert.deepEqual(doc.contatos.map((c) => c.NOME), ['Helena Prado']);
    assert.deepEqual([doc.emitidoPor, doc.emitidoEm], ['Ana Costa', '2026-11-19T10:00:00']);
    assert.deepEqual([doc.cliente.NOME, doc.cliente.DOCUMENTO], ['ALFA DISTRIBUIDORA LTDA', '70010000000170']);
    assert.equal(doc.resumo.recuperado, 3000);
    const aud = auditoria('Histórico', aud0);
    assert.equal(aud.length, 1);
    assert.deepEqual([aud[0].ENTIDADE, aud[0].CAMPO, n(aud[0].CLIENTE_ID), n(aud[0].POR)], ['CLIENTE', '(emissão)', idDe(7001), M.ana]);
    assert.match(aud[0].DEPOIS, /Acordos e baixas/);
  });

  await teste('C-009: página de 5 na tela; a emissão com "Cobrança" traz todos os registros da categoria', async () => {
    exigeHistoria();
    assert.equal((await eventos('ana', 7001, { categoria: 'Cobrança', limite: 5 })).length, 5);
    const total = await totalEventos('ana', 7001, { categoria: 'Cobrança' });
    assert.ok(total > 5, `Cobrança tem ${total}`);
    const aud0 = ultimaAuditoria();
    const doc = aceito(await exportar('ana', 7001, { categoria: 'Cobrança' }));
    assert.deepEqual([doc.eventos.length, doc.total, doc.cortado], [total, total, false]);
    assert.ok(doc.eventos.every((l) => l.CATEGORIA === 'Cobrança'));
    assert.equal(auditoria('Histórico', aud0).length, 1);
  });

  await teste('RN-008: duas emissões de Alfa = 2 linhas na área Histórico, visíveis ao supervisor', async () => {
    exigeHistoria();
    const aud0 = ultimaAuditoria();
    aceito(await exportar('ana', 7001));
    aceito(await exportar('ana', 7001, { categoria: 'Cobrança' }));
    const aud = auditoria('Histórico', aud0);
    assert.equal(aud.length, 2);
    assert.ok(aud.every((a) => n(a.POR) === M.ana && a.POR_NOME === 'Ana Costa'));
    assert.match(aud[0].DEPOIS, /Categorias: todas/);
    assert.match(aud[1].DEPOIS, /Categorias: Cobrança/);
    const vistos = (await eventos('sergio', 7001, { categoria: 'Alteração auditada' })).filter((l) => l.ORIGEM === 'AUDITORIA').map((l) => n(l.ORIGEM_ID));
    for (const a of aud) assert.ok(vistos.includes(n(a.ID)), `auditoria ${a.ID} para o Sérgio`);
  });

  await teste('RN-018: com teto de 3, a emissão traz os 3 primeiros da ordem, o total real e "cortado"', async () => {
    exigeHistoria();
    const primeiros = (await eventos('ana', 7001, { limite: 3 })).map(chaveDe);
    const total = await totalEventos('ana', 7001);
    process.env.CC_HIST_TETO = '3';
    try {
      const doc = aceito(await exportar('ana', 7001));
      assert.deepEqual(doc.eventos.map(chaveDe), primeiros);
      assert.deepEqual([doc.total, doc.cortado], [total, true]);
    } finally {
      delete process.env.CC_HIST_TETO;
    }
  });

  /* ── estados que mudam o banco (por último) ── */

  await teste('RN-004 · C-004: as 39 origens devolvem linha (régua, acordo encerrado, baixa, notificação, dossiê, acordo judicial) e nada passa a outro cliente', async () => {
    exigeHistoria();
    const [alfa, gama] = [idDe(7001), idDe(7003)];
    // Gama: acordo proposto e cancelado (ACORDO_FIM); a leitura devolve o caso à régua; ação da régua; baixa com parecer e decisão.
    const debito = n(um("SELECT VENCIDO FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ? AND CARTEIRA = 'PRIVADA'", gama).VENCIDO);
    const ac = aceito(await como('ana', () => chamar('ccCobAcordoPropor', { cobrancaId: casoDe(7003).ID, debito, valor: 9000, entrada: 1000, entradaData: dia(0),
      nParcelas: 2, primeiroVenc: dia(30), intervaloDias: 30 })));
    aceito(await como('sergio', () => chamar('ccCobAcordoCancelar', { acordoId: ac.acordoId, motivo: 'Cliente desistiu.' })));
    await leitura();
    assert.equal(aceito(await como('ana', () => chamar('ccCobAcaoRegistrar', { cobrancaId: casoDe(7003).ID, itens: '' }))).acaoFeita, true);
    const b = aceito(await como('ana', () => chamar('ccCobBaixaPropor', { cobrancaId: casoDe(7003).ID, valor: 500, motivo: 'Esgotadas as vias de cobrança' })));
    aceito(await como('julia', () => chamar('ccCobBaixaParecer', { baixaId: b.baixaId, resultado: 'FAVORAVEL', texto: 'De acordo.' })));
    aceito(await como('gustavo', () => chamar('ccCobBaixaDecidir', { baixaId: b.baixaId, aprovar: 1 })));
    // Alfa: dossiê enviado, notificação extrajudicial (filial credora completa, modelo validado), acordo judicial aprovado e processo encerrado.
    aceito(await como('gustavo', () => chamar('ccJurFilialCredoraSalvar', { codigo: '1', razaoSocial: 'BENENUTRI COMERCIAL LTDA', cnpj: '20720905000143', uf: 'DF' })));
    aceito(await como('julia', () => chamar('ccBaseModeloValidar', { codigo: 'JUR_NOTIF_EXTRAJUDICIAL' })));
    const d = aceito(await como('ana', () => chamar('ccJurDossieAbrir', { clienteId: alfa, carteira: 'PRIVADA' })));
    for (const it of consultar("SELECT ID FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ? AND SITUACAO = 'PENDENTE' AND ITEM <> 'alcada'", d.processoId)) {
      aceito(await como('ana', () => chamar('ccJurDossieItemMarcar', { itemId: it.ID, situacao: 'NA', obs: 'Teste da 007.' })));
    }
    aceito(await como('gustavo', () => chamar('ccJurDossieEnviar', { processoId: d.processoId })));
    const notif = aceito(await como('ana', () => chamar('ccJurNotificacaoRegistrar', { clienteId: alfa, carteira: 'PRIVADA' })));
    assert.equal(n(um('SELECT PROCESSO_ID FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE ID = ?', notif.notificacaoId).PROCESSO_ID), d.processoId);
    const aj = aceito(await como('julia', () => chamar('ccJurAcordoCriar', { processoId: d.processoId, valor: 9000, entrada: 1000, nParcelas: 2,
      primeiroVencimento: dia(0) })));
    aceito(await como('gustavo', () => chamar('ccJurAcordoAprovar', { acordoId: aj.acordoId, aprovar: 1 })));
    aceito(await como('julia', () => chamar('ccJurProcessoEncerrar', { processoId: d.processoId, motivo: 'OUTRO', motivoTexto: 'Teste da 007.' })));
    // Cada uma das 39 subconsultas devolve ao menos uma linha em algum cliente.
    const clientes = consultar('SELECT ID FROM CC_CLIENTE').map((c) => c.ID);
    const vazias = [];
    for (const [i, o] of origens(CID_SQL).entries()) {
      let achou = false;
      for (const c of clientes) {
        if ((await banco().runner.executar({ type: 'SQL', code: o.sql }, { clienteId: c }, { userId: 0 })).rows.length) { achou = true; break; }
      }
      if (!achou) vazias.push(`${i}:${o.origem}`);
    }
    assert.deepEqual(vazias, []);
    // As 10 que nenhum teste lia aparecem no cliente certo; nenhuma linha de Alfa ou Gama aparece em outro cliente.
    const todos = (codcli) => eventos('gustavo', codcli, { limite: 2000 });
    const [la, lg] = [await todos(7001), await todos(7003)];
    for (const o of ['ACAO', 'ACORDO_FIM', 'BAIXA', 'BAIXA_PARECER', 'BAIXA_DECISAO']) assert.ok(porOrigem(lg, o).length >= 1, `Gama: ${o}`);
    for (const o of ['DOSSIE', 'DOSSIE_ENVIO', 'ACORDO_JUD', 'ACORDO_JUD_APROV', 'NOTIFICACAO', 'PROCESSO_FIM']) assert.ok(porOrigem(la, o).length >= 1, `Alfa: ${o}`);
    const ka = new Set(la.map(chaveDe));
    const kg = new Set(lg.map(chaveDe));
    assert.ok(![...ka].some((k) => kg.has(k)), 'Alfa × Gama');
    for (const codcli of [7002, 1006, 5002]) assert.ok(!(await todos(codcli)).some((l) => ka.has(chaveDe(l)) || kg.has(chaveDe(l))), String(codcli));
    assert.equal(await totalEventos('ana', 7002), 0, 'Beta segue sem registro (C-005)');
  });

  await teste('RN-017: encerrado o processo de Gama, a Júlia deixa de encontrá-lo', async () => {
    exigeHistoria();
    assert.equal((await buscar('julia', 'GAMA')).length, 1);
    const pr = um('SELECT ID FROM CC_PROCESSO WHERE CLIENTE_ID = ? AND ENCERRADO_EM IS NULL', idDe(7003));
    aceito(await como('julia', () => chamar('ccJurProcessoEncerrar', { processoId: pr.ID, motivo: 'QUITADO' })));
    assert.equal((await buscar('julia', 'GAMA')).length, 0);
    recusado(await resumo('julia', 7003), /^Cliente não encontrado\.$/);
    recusado(await exportar('julia', 7003), /^Cliente não encontrado\.$/);
    recusado(await exportar('julia', 7003, { categoria: 'Alteração auditada' }), /^Cliente não encontrado\.$/);
    assert.equal((await eventos('julia', 7003)).length, 0);
    assert.ok(porOrigem(await eventos('ana', 7003), 'PROCESSO_FIM').length === 1, 'o encerramento entra no histórico de quem vê o cliente');
  });

  await teste('Órgão público: 5002 com 2 passos da régua e o marco de emissão; NF cancelada no Winthor sai do histórico', async () => {
    const nf = um('SELECT * FROM CC_NF_PUBLICA WHERE NUMNOTA = 1001');
    if (!nf) pular('depende de 005 (NF 1001 do 5002)');
    const antes = await eventos('carlos', 5002, { categoria: 'Setor público' });
    assert.equal(porOrigem(antes, 'NF_ACAO').length, 2);
    assert.ok(porOrigem(antes, 'NF_EMISSAO').length >= 1);
    assert.ok(antes.some((l) => l.ORIGEM === 'NF_EMISSAO' && n(l.ORIGEM_ID) === n(nf.ID)));
    const contagemAntes = aceito(await resumo('carlos', 5002)).contagens['Setor público'];
    const daNf = antes.filter((l) => (l.ORIGEM.startsWith('NF_') && l.ORIGEM !== 'NF_ACAO' && n(l.ORIGEM_ID) === n(nf.ID)) || l.ORIGEM === 'NF_ACAO').length;
    banco().db.prepare('UPDATE PCNFSAID SET DTCANCEL = ? WHERE NUMTRANSVENDA = ?').run(dia(0), nf.NUMTRANSVENDA);
    banco().db.prepare('UPDATE PCPREST SET DTCANCEL = ? WHERE NUMTRANSVENDA = ?').run(dia(0), nf.NUMTRANSVENDA);
    await leitura();
    assert.equal(n(um('SELECT CANCELADA FROM CC_NF_PUBLICA WHERE ID = ?', nf.ID).CANCELADA), 1);
    const depois = await eventos('carlos', 5002, { categoria: 'Setor público' });
    assert.ok(!depois.some((l) => (l.ORIGEM.startsWith('NF_') && n(l.ORIGEM_ID) === n(nf.ID)) || l.ORIGEM === 'NF_ACAO'));
    assert.equal(aceito(await resumo('carlos', 5002)).contagens['Setor público'] || 0, contagemAntes - daNf);
  });

  await teste('RN-019: pagamento de 3.000,00 desfeito no Winthor — Recebimentos cai de 2 para 1 e o recuperado fica vazio', async () => {
    exigeHistoria();
    assert.equal(porOrigem(await eventos('ana', 7001), 'RECEBIMENTO').length, 2);
    banco().db.prepare('UPDATE PCPREST SET VPAGO = 0, DTPAG = NULL WHERE NUMTRANSVENDA = ?').run(7001 * 100 + 3);
    await leitura();
    assert.equal(porOrigem(await eventos('ana', 7001), 'RECEBIMENTO').length, 1);
    const r = aceito(await resumo('ana', 7001));
    assert.equal(r.contagens.Recebimentos, 1);
    assert.equal(r.recuperado, null);
  });

  await teste('C-022: criação e renovação do crédito não ecoam em "Alteração auditada"; a reanálise aparece (D-011, B4 C-03)', async () => {
    exigeHistoria();
    const alfa = idDe(7001);
    const s = um('SELECT * FROM CC_SOLICITACAO WHERE CLIENTE_ID = ?', alfa);
    // Fluxo da 004 (como no smoke dela): dados e proposta da Rita, etapas até o comitê, decisão da Diana, liberação e aplicação.
    aceito(await como('rita', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.ID, consData: dia(-2), consReceita: 'ATIVA', consProtesto: 'SEM',
      consProcesso: 'SEM', consSocios: 'SEM', scoreSerasa: 850, fpTipo: 'RECURSOS_PROPRIOS', fatMensal: 200000 })));
    aceito(await como('rita', () => chamar('ccCredSolicitacaoSalvar', { solicitacaoId: s.ID, limiteProposto: 20000, parecer: 'Cliente antigo.' })));
    const marcar = (campos) => {
      const v = JSON.parse(um('SELECT VALORES_JSON FROM KB_CARD WHERE ID = ?', s.CARD_ID).VALORES_JSON || '{}');
      banco().db.prepare('UPDATE KB_CARD SET VALORES_JSON = ? WHERE ID = ?').run(JSON.stringify({ ...v, ...campos }), s.CARD_ID);
    };
    const levar = async (chave) => aceito(await como(null, () => chamar('kbCardMover', { cardId: s.CARD_ID, ordem: 0, movidoPor: U.gustavo, origem: 'sistema',
      faseId: n(um("SELECT FASE_ID FROM CC_FASE WHERE QUADRO = 'concessao-privada' AND CHAVE = ?", chave).FASE_ID) })));
    marcar({ cadastral_5: '1', cadastral_6: '1', cadastral_7: '1' });
    for (const chave of ['cadastral', 'credito', 'comite']) await levar(chave);
    aceito(await como('diana', () => chamar('ccCredDecisaoRegistrar', { solicitacaoId: s.ID, resultado: 'APROVADA', planoCod: '30', forma: 'Boleto bancário',
      parecer: 'Aprovado pelo comitê.', limiteAprovado: 20000, justificativaExcecao: 'Cliente antigo, atraso pontual.' })));
    marcar({ termo_assinado: ['https://arquivos.test/termo.pdf'] });
    await levar('liberacao');
    const pend = um("SELECT ID FROM CC_PENDENCIA_WINTHOR WHERE TIPO = 'APLICAR_LIMITE' AND ORIGEM = 'SOLICITACAO' AND ORIGEM_ID = ?", s.ID);
    aceito(await como('rita', () => chamar('ccCredPendenciaAplicar', { pendenciaId: pend.ID, obs: 'Aplicado no Winthor.' })));
    const cr = um('SELECT * FROM CC_CREDITO WHERE CLIENTE_ID = ?', alfa);
    aceito(await como('sergio', () => chamar('ccCredReanaliseAbrir', { creditoId: cr.ID, motivo: 'Teste da 007' })));
    aceito(await como('sergio', () => chamar('ccCredReanaliseConcluir', { creditoId: cr.ID, resultado: 'RENOVADA', parecer: 'Renovado.' })));
    const campos = consultar("SELECT CAMPO FROM CC_AUDITORIA WHERE CLIENTE_ID = ? AND ENTIDADE = 'CREDITO'", alfa).map((a) => a.CAMPO);
    for (const c of ['Crédito', 'Situação', 'Crédito renovado']) assert.ok(campos.includes(c), c);
    const titulos = (await eventos('sergio', 7001, { categoria: 'Alteração auditada', limite: 500 })).map((l) => l.TITULO);
    assert.ok(!titulos.includes('Crédito: Crédito') && !titulos.includes('Crédito: Crédito renovado'), 'sem eco');
    assert.ok(titulos.includes('Crédito: Situação'));
    assert.equal(porOrigem(await eventos('sergio', 7001, { categoria: 'Crédito' }), 'CREDITO').length, 2);
  });

  await teste('C-004: notificação com processo de outro cliente e passo de NF alheia não puxam card nem NF do outro cliente (B4 C-02)', async () => {
    exigeHistoria();
    const beta = idDe(7002);
    const ne = um('SELECT * FROM CC_NOTIFICACAO_EXTRAJUDICIAL WHERE PROCESSO_ID IS NOT NULL ORDER BY ID');
    const na = um('SELECT NA.*, NF.CANCELADA FROM CC_NF_ACAO NA JOIN CC_NF_PUBLICA NF ON NF.ID = NA.NF_ID ORDER BY NA.ID');
    const k = um('SELECT * FROM CC_CONTATO_COBRANCA WHERE COBRANCA_ID IS NOT NULL ORDER BY ID');
    assert.ok(ne && na && k, 'notificação com processo, passo de NF e contato com caso');
    const mover = (tabela, linha, cliente) => banco().db.prepare(`UPDATE ${tabela} SET CLIENTE_ID = ? WHERE ID = ?`).run(cliente, linha.ID);
    try {
      mover('CC_NOTIFICACAO_EXTRAJUDICIAL', ne, beta);
      mover('CC_NF_ACAO', na, beta);
      banco().db.prepare('UPDATE CC_NF_PUBLICA SET CANCELADA = 0 WHERE ID = ?').run(na.NF_ID); // a NF 1001 foi cancelada no teste do órgão
      mover('CC_CONTATO_COBRANCA', k, beta);
      const lista = await eventos('ana', 7002);
      assert.deepEqual(lista.map((l) => [l.ORIGEM, l.CARD_ID]).sort(), [['CONTATO', null], ['NOTIFICACAO', null]]);
    } finally {
      mover('CC_NOTIFICACAO_EXTRAJUDICIAL', ne, ne.CLIENTE_ID);
      mover('CC_NF_ACAO', na, na.CLIENTE_ID);
      banco().db.prepare('UPDATE CC_NF_PUBLICA SET CANCELADA = ? WHERE ID = ?').run(na.CANCELADA, na.NF_ID);
      mover('CC_CONTATO_COBRANCA', k, k.CLIENTE_ID);
    }
    assert.equal(await totalEventos('ana', 7002), 0, 'Beta segue sem registro (C-005)');
  });
}
