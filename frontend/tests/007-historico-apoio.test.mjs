// Regra de tela da 007 (tasks T-251 a T-261). Funções puras de src/lib/historico-apoio/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ABAS, AUDITADA, CATEGORIAS, categoriasDaAba, filtroDeCategoria, totalDaAba } from '../src/lib/historico-apoio/categorias.ts';
import { formatarTexto, normalizar, partesDoTexto, termoDeBusca } from '../src/lib/historico-apoio/texto.ts';
import {
  agruparPorDia, avisoDeCorte, camposDoResumo, cssDaPagina, horaDoEvento, nomeDoDocumento,
} from '../src/lib/historico-apoio/documento.ts';
import { celula, prazoLegivel, regrasPorGrupo, valoresProprios } from '../src/lib/historico-apoio/regras.ts';
import { modulo } from '../src/modules/007-historico-apoio/index.ts';

test('C-001: valores e datas do texto em formato brasileiro', () => {
  assert.equal(formatarTexto('Promessa de {R$:12500.00} até {D:2026-11-24}'), 'Promessa de R$ 12.500,00 até 24/11/2026');
  assert.equal(formatarTexto('{R$:12500}'), 'R$ 12.500,00');
  assert.equal(formatarTexto(null), '');
});

test('C-002: categoria vai ao servidor separada por vírgula sem espaço; total da aba pelas contagens', () => {
  assert.equal(filtroDeCategoria(['Acordos e baixas', 'Recebimentos']), 'Acordos e baixas,Recebimentos');
  const contagens = { Cobrança: 9, 'Acordos e baixas': 5, Recebimentos: 2, Crédito: 4, Comunicação: 3 };
  assert.equal(totalDaAba(contagens, 'cobranca'), 16);
  assert.equal(totalDaAba(contagens, 'tudo'), 23);
  assert.equal(totalDaAba({}, 'juridico'), 0);
});

test('C-003: termo de busca de nome e de documento', () => {
  assert.equal(termoDeBusca('alfa'), 'ALFA');
  assert.equal(termoDeBusca('ÁLFA'), 'ALFA');
  assert.equal(termoDeBusca('70.010.000/0001-70'), '70010000000170');
  assert.equal(termoDeBusca('70010000000170'), '70010000000170');
});

test('C-007: nome do documento e @page A4 com cliente, documento e "Página i de n"', () => {
  assert.equal(nomeDoDocumento('ALFA DISTRIBUIDORA LTDA'), 'Histórico - ALFA DISTRIBUIDORA LTDA');
  const css = cssDaPagina({ nome: 'ALFA DISTRIBUIDORA LTDA', documento: '70.010.000/0001-70' });
  for (const trecho of ['size: A4', 'ALFA DISTRIBUIDORA LTDA', '70.010.000/0001-70', 'counter(page)', 'counter(pages)']) {
    assert.ok(css.includes(trecho), trecho);
  }
});

test('C-017: célula própria com "desde", herdada e não se aplica', () => {
  const regra = {
    chave: 'enc.correcao', grupo: 'enc', tipo: 'PERCENTUAL', unidade: '%', padrao: { valor: '0.4', desde: '2026-01-01' },
    carteiras: {
      PRIVADA: { valor: '0.4', proprio: false, desde: null, aplica: true },
      ESTETICA: { valor: '0.3', proprio: true, desde: '2026-11-19', aplica: true },
      PUBLICA: { valor: '0.4', proprio: false, desde: null, aplica: true },
    },
  };
  assert.deepEqual(celula(regra, 'PRIVADA'), { tipo: 'padrao', texto: '0,4%', desde: '2026-01-01' });
  assert.deepEqual(celula(regra, 'ESTETICA'), { tipo: 'propria', texto: '0,3%', desde: '2026-11-19' });
  assert.deepEqual(celula(regra, 'PUBLICA'), { tipo: 'herdada', texto: '0,4%', desde: null });
  const regua = { ...regra, chave: 'regua.notif', grupo: 'regua', carteiras: { ...regra.carteiras, PUBLICA: { valor: '7', proprio: false, aplica: false } } };
  assert.deepEqual(celula(regua, 'PUBLICA'), { tipo: 'nao_se_aplica', texto: '—', desde: null });
  assert.equal(valoresProprios([regra]), 1);
  assert.deepEqual(regrasPorGrupo([regua, regra]).map((g) => g.codigo), ['regua', 'enc']);
});

test('C-020: prazo da etapa legível', () => {
  assert.equal(prazoLegivel(240), '10 dias');
  assert.equal(prazoLegivel(24), '1 dia');
  assert.equal(prazoLegivel(4), '4 horas');
  assert.equal(prazoLegivel(0), 'sem prazo');
});

test('RN-001: grupo "Agendado" primeiro, depois os dias do mais recente ao mais antigo', () => {
  const ev = [
    { EM: '2026-11-20T00:00:00', AGENDADO: 1, ORIGEM: 'PROX_ACAO' },
    { EM: '2026-12-19T00:00:00', AGENDADO: 1, ORIGEM: 'ACORDO_PARCELA' },
    { EM: '2026-11-17T09:00:00', AGENDADO: 0, ORIGEM: 'CONTATO' },
    { EM: '2026-11-19T10:05:00', AGENDADO: 0, ORIGEM: 'EMAIL' },
    { EM: '2026-11-19T09:00:00', AGENDADO: 0, ORIGEM: 'NOTA' },
  ];
  const g = agruparPorDia(ev);
  assert.deepEqual(g.map((x) => x.chave), ['agendado', '2026-11-19', '2026-11-17']);
  assert.deepEqual(g[0].eventos.map((e) => e.ORIGEM), ['PROX_ACAO', 'ACORDO_PARCELA']);
  assert.deepEqual(g[1].eventos.map((e) => e.ORIGEM), ['EMAIL', 'NOTA']);
  assert.equal(g[1].rotulo, '19/11/2026 · quinta-feira');
  assert.equal(horaDoEvento(ev[3]), '10:05');
  assert.equal(horaDoEvento(ev[0]), '20/11');
  assert.equal(horaDoEvento({ EM: '2026-11-18T00:00:00', AGENDADO: 0 }), '');
});

test('RN-004: 8 categorias com cor distinta e abas cobrindo as 8 sem repetir', () => {
  assert.deepEqual(CATEGORIAS.map((c) => c.nome), [
    'Cobrança', 'Acordos e baixas', 'Crédito', 'Jurídico', 'Setor público', 'Comunicação', 'Recebimentos', 'Alteração auditada']);
  assert.equal(new Set(CATEGORIAS.map((c) => c.cor)).size, 8);
  const nasAbas = ABAS.filter((a) => a.id !== 'tudo').flatMap((a) => a.categorias);
  assert.equal(nasAbas.length, 8);
  assert.deepEqual([...nasAbas].sort(), CATEGORIAS.map((c) => c.nome).sort());
});

test('RN-016: "Alteração auditada" fora das categorias da aba para quem não a vê', () => {
  assert.deepEqual(categoriasDaAba('juridico', true), ['Jurídico', AUDITADA]);
  assert.deepEqual(categoriasDaAba('juridico', false), ['Jurídico']);
});

test('RN-005: 12 campos do resumo, com "—" (null) no que o cliente não tem', () => {
  const beta = {
    cliente: { NOME: 'BETA', AGENTE_NOME: 'Ana Costa', SUPERVISOR_NOME: 'Sérgio Nunes' },
    posicao: { LIMITE: null, UTILIZADO: 0, VENCIDO: 0, A_VENCER: 4000, DIAS_ATRASO: 0 },
    credito: null, cobrancas: [], risco: null, ratingPub: null, fontePagadora: null, recuperado: null, contatos: 0, promessasAbertas: 0, documentos: 0,
  };
  const campos = camposDoResumo(beta);
  assert.equal(campos.length, 12);
  const v = Object.fromEntries(campos.map((c) => [c.rotulo, c.valor]));
  assert.equal(v['Etapa de crédito'], null);
  assert.equal(v['Etapa de cobrança'], null);
  assert.equal(v['Fonte pagadora'], null);
  assert.equal(v.Recuperado, null);
  assert.equal(v.Limite, null);
  assert.equal(v['A vencer'].replace(/ /g, ' '), 'R$ 4.000,00');
  assert.equal(v['Agente e supervisor'], 'Ana Costa · Sérgio Nunes');
  const alfa = camposDoResumo({ ...beta, credito: { etapa: '1 · Solicitação recebida' }, cobrancas: [{ CARTEIRA: 'PRIVADA', FASE_NOME: 'Acordo em andamento' }],
    posicao: { ...beta.posicao, VENCIDO: 12500, DIAS_ATRASO: 37 }, recuperado: 3000, contatos: 3, promessasAbertas: 1 });
  const a = Object.fromEntries(alfa.map((c) => [c.rotulo, c.valor]));
  assert.equal(a['Etapa de cobrança'], 'Acordo em andamento');
  assert.equal(a['Vencido e dias de atraso'].replace(/ /g, ' '), 'R$ 12.500,00 · 37 dias');
  assert.equal(a['Contatos e promessas'], '3 contatos · 1 promessa em aberto');
});

test('RN-006: nome sem caracteres proibidos e @page com aspas e barra escapadas', () => {
  assert.equal(nomeDoDocumento('Alfa / Norte: "A"?'), 'Histórico - Alfa Norte A');
  const css = cssDaPagina({ nome: 'Beta "B" \\ Sul', documento: '1' });
  assert.ok(css.includes('Beta \\"B\\" \\\\ Sul'));
});

test('RN-013: busca ignora caixa, acento e espaço sobrando', () => {
  assert.equal(normalizar('  ÁÇÃO Ltda '), normalizar('acao ltda'));
  assert.equal(normalizar('acao  ltda'), 'ACAO LTDA');
  assert.equal(termoDeBusca('70.010.000/0001-70'), '70010000000170');
});

test('RN-015: o texto do e-mail corta no {+}', () => {
  assert.deepEqual(partesDoTexto('Para a@b · Enviado{+}Prezados…'), { principal: 'Para a@b · Enviado', expandir: 'Prezados…' });
  assert.deepEqual(partesDoTexto('Falou com Helena'), { principal: 'Falou com Helena', expandir: '' });
});

test('RN-018: aviso de corte no documento', () => {
  assert.equal(avisoDeCorte({ eventos: 3, total: 40, cortado: true }), 'Mostrando os 3 registros mais recentes de 40.');
  assert.equal(avisoDeCorte({ eventos: 5, total: 5, cortado: false }), '');
});

test('RF-012: rotas do módulo (link direto para o histórico) e menu nos grupos do plan', () => {
  const caminhos = modulo.rotas.map((r) => r.caminho);
  for (const c of ['/historico', '/historico/:clienteId', '/historico/:clienteId/documento', '/apoio/fontes', '/apoio/material', '/apoio/regras']) {
    assert.ok(caminhos.includes(c), c);
  }
  assert.deepEqual(modulo.menu.map((m) => [m.grupo, m.caminho]), [
    ['OPERACAO', '/historico'], ['CADASTROS', '/apoio/fontes'], ['CADASTROS', '/apoio/material'], ['CADASTROS', '/apoio/regras']]);
});

test('F5 C-04: códigos da auditoria e da régua viram rótulos de negócio', () => {
  assert.equal(formatarTexto('Cobrança: E-mail cob_ativa'), 'Cobrança: E-mail Cobrança ativa');
  assert.equal(formatarTexto('PRIVADA · cob_ativa'), 'Privado · Cobrança ativa');
  assert.equal(formatarTexto('De PROPOSTO para ATIVO'), 'De Proposto para Ativo');
  assert.equal(formatarTexto('Cobrança: Itens de protesto'), 'Cobrança: Itens de Protesto em cartório');
  assert.equal(formatarTexto('CANCELADO: cliente desistiu'), 'Cancelado: cliente desistiu');
  assert.equal(formatarTexto('Cobrança ativa · BOTAO · no prazo'), 'Cobrança ativa · registrada no card · no prazo');
  // Nome e frase com a mesma palavra ficam como estão; o corpo do e-mail ({+}) não é tocado.
  assert.equal(formatarTexto('DISTRIBUIDORA TOTAL LTDA'), 'DISTRIBUIDORA TOTAL LTDA');
  assert.equal(formatarTexto('Título enviado a protesto'), 'Título enviado a protesto');
  assert.equal(formatarTexto('Para a@b.c · Enviado{+}ATIVO'), 'Para a@b.c · Enviado{+}ATIVO');
});

test('F5 C-04: código do modelo de e-mail da régua vira o nome da etapa', () => {
  assert.equal(formatarTexto('COB_ATIVA v1 para a@b.c: ENVIADO'), 'modelo "Cobrança ativa" (versão 1) para a@b.c: enviado');
  assert.equal(formatarTexto('COB_PREV_D5'), 'modelo "Lembrete"');
  assert.equal(formatarTexto('COB_DESCONHECIDO v2'), 'COB_DESCONHECIDO v2');
});
