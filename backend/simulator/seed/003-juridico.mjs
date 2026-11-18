// Seed da 003-juridico (plan, seção Simulador; tabela de processos da spec): clientes 3001–3020 no Winthor simulado,
// o protesto da Iota no passado e, no domínio, P01–P12 pelas SFs da 003 (datas carimbadas com comRelogio, sem rotina).
// A atribuição dos 3001–3020 já está no elenco (000-elenco.mjs).

import { cliente, nota, dia, chamarComo, bancoDoSeed } from './000-elenco.mjs';
import { comRelogio } from '../relogio.mjs';

const BU = { N: 101, E: 201, M: 301, S: 401 };

/** Títulos de parcela única: [valor, venc (dia n), bu, filial, pagoEm (dia n)?]. */
function titulos(codcli, lista) {
  lista.forEach(([valor, venc, bu = 'N', filial = '1', pagoEm], i) => nota({
    codcli, n: i + 1, emissao: dia(venc - 30), codfilial: filial, itens: [{ codprod: BU[bu], valor }],
    parcelas: [{ prest: 1, valor, venc: dia(venc), ...(pagoEm !== undefined ? { pago: true, pagoEm: dia(pagoEm) } : {}) }],
  }));
}

const CLIENTES = [
  [3001, 'COMERCIAL ATLAS LTDA', [[18000, -38], [12000, -30]]],
  [3002, 'HOSPITAL VALE VERDE', [[40000, -60]]],
  [3003, 'CLINICA NOVA ERA', [[60000, -60, 'S', '2']]],
  [3004, 'FUNDO MUNICIPAL DE SAUDE DE LUZIANIA', [[22000, -45]], { ramo: 13, uf: 'GO', municipio: 'LUZIANIA' }],
  [3005, 'DISTRIBUIDORA GAMA', [[25000, -60]]],
  [3006, 'HOSPITAL DELTA', [[80000, -60]]],
  [3007, 'EPSILON COMERCIO', [[150000, -60, 'N', '2']]],
  [3008, 'ZETA HOSPITALAR', [[5000, -20]]],
  [3009, 'ETA SAUDE', [[45000, -90, 'N', '1', -80]]],
  [3010, 'TETA NUTRICAO', [[15000, -60, 'N', '2']], { uf: 'GO' }],
  [3011, 'KAPPA CLINICA', [[10000, -200, 'N', '1', -190]]],
  [3012, 'LAMBDA MEDICA', [[12000, -25]]],
  [3013, 'IOTA FARMA', [[20000, -52], [13000, -40]]],
  [3014, 'SECRETARIA DE SAUDE DE MU', [[50000, -60]], { ramo: 13 }],
  [3015, 'HOSPITAL SANTA MARIA LTDA', [[1000, 20]]],
  [3016, 'HOSPITAL SANTA MARIA DO SUL LTDA', [[1000, 20]]],
  [3017, 'NU HOSPITALAR', [[1000, 20]]],
  [3018, 'XI DISTRIBUIDORA LTDA', [[1000, 20]]],
  [3019, 'PI CLINICA MEDICA', [[1000, 20]]],
  [3020, 'RO MEDICAMENTOS', [[1000, 20]]],
];

export function winthor() {
  const { db } = bancoDoSeed();
  for (const [codcli, nome, lista, extra = {}] of CLIENTES) {
    cliente({ codcli, nome, ramo: 2, limite: 10000, ...extra });
    titulos(codcli, lista);
    // RN-003: a Lambda (3012) fica sem endereço; os demais têm.
    if (codcli !== 3012) db.prepare('UPDATE PCCLIENT SET ENDERENT = ? WHERE CODCLI = ?').run(`RUA ${codcli}, 100`, codcli);
  }
}

/** A Iota (3013) chega ao protesto com 12 dias de atraso: o banco começa em dia(-40). */
export const INICIO = () => dia(-40);

const idDe = (codcli) => Number(bancoDoSeed().db.prepare('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?').get(codcli).ID);
const caso = (codcli, carteira = 'PRIVADA') => bancoDoSeed().db.prepare(`SELECT CB.ID, CB.CARD_ID FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
WHERE C.CODCLI = ? AND CB.CARTEIRA = ? AND CB.ENCERRADO_EM IS NULL`).get(codcli, carteira);

/** Passo 9: protesto da Iota pela régua (grava PROTESTADO), como Ana. Sem a 002, nada. */
export async function passado() {
  const c = caso(3013);
  if (c) await chamarComo('ana', 'ccCobAcaoRegistrar', { cobrancaId: c.ID, itens: '1' });
}

/* ── planilhas da carga (C-020, C-023): "processos interpretados" como a tela manda ── */

export const PLANILHA_TESTE = [
  { nomeDevedor: 'Nu Hospitalar', codcli: '3017', carteira: 'PRIVADA', uf: 'DF', valor: 8000, autos: '0801234-55.2025.8.07.0001', tribunal: 'TJDFT',
    faseChave: 'citacao', status: '[Marcos] 05/11: AR devolvido, pesquisar endereço', substabelecer: 1,
    divergencia: 'Divergência na carga: valor da planilha (8.000,00) diferente do Winthor (1.000,00).',
    andamentos: [{ data: '05/11', autor: 'Marcos', texto: 'AR devolvido, pesquisar endereço' }, { data: '20/12', texto: 'Distribuída a ação' },
      { data: '', texto: 'Conferido na carga' }, { data: '02/10/2025', texto: 'Petição inicial protocolada' }] },
  { nomeDevedor: 'Xi Distribuidra', carteira: 'PRIVADA', uf: 'DF', valor: 4000, faseChave: 'peticao', status: 'Novo' },
  { nomeDevedor: 'Pi Clínica Médica', codcli: '3019', carteira: 'PRIVADA', uf: 'DF', valor: 12000, autos: '0802222-22.2025.8.07.0001', tribunal: 'TJDFT',
    faseChave: 'acordo', status: 'Acordo homologado',
    acordo: { valor: 12000, entrada: 4000, nParcelas: 2, situacaoTexto: 'Homologado', parcelas: [
      { numero: 0, valor: 4000, vencimento: '2026-09-10', situacao: 'PAGA' }, { numero: 1, valor: 4000, vencimento: '2026-10-10', situacao: 'ABERTA' },
      { numero: 2, valor: 4000, vencimento: '2026-11-10', situacao: 'A_CONFIRMAR' }] } },
  { nomeDevedor: 'Rô Medicamentos', codcli: '3020', carteira: 'PRIVADA', uf: 'DF', valor: 7250.30, faseChave: 'peticao', status: 'Verificar' },
  { nomeDevedor: 'Antiga Farmácia Ltda', codcli: '3090', carteira: 'PRIVADA', uf: 'DF', valor: 3000, faseChave: 'encerrado', motivo: 'QUITADO', status: 'Quitado' },
];

export const PLANILHA_SANTA_MARIA = [
  { nomeDevedor: 'Hospital Santa Maria', carteira: 'PRIVADA', uf: 'DF', valor: 9000, faseChave: 'peticao', status: 'Novo' },
];

/* ── domínio (passo 10) ── */

export async function dominio() {
  const { db } = bancoDoSeed();
  const em = (n, fn) => comRelogio(`${dia(n)}T10:00:00`, fn);
  const julia = (nome, input) => chamarComo('julia', nome, input);

  // (a) Filial 1 completa (Gustavo) e o modelo da notificação validado pela Júlia.
  await em(-31, () => julia('ccBaseModeloValidar', { codigo: 'JUR_NOTIF_EXTRAJUDICIAL' }));
  await chamarComo('gustavo', 'ccJurFilialCredoraSalvar', { codigo: '1', razaoSocial: 'BENENUTRI COMERCIAL LTDA', cnpj: '20720905000143',
    endereco: 'SIA Trecho 3, Lote 625', cidadeUf: 'Brasília/DF', uf: 'DF', banco: 'Banco do Brasil, agência 1234-5, conta 67890-1, PIX 20.720.905/0001-43',
    representante: 'Gustavo Lima', representanteCargo: 'Gerente Financeiro', ativa: 1 });

  // Casos públicos do Fundo de Luziânia e da Secretaria de Mu (a rotina da 005 os abriria; aqui como rotina, sem sessão).
  for (const codcli of [3004, 3014]) {
    if (!caso(codcli, 'PUBLICA')) {
      await chamarComo(null, 'ccCobCasoSincronizar', { clienteId: idDe(codcli), carteira: 'PUBLICA', faseChave: 'liquidacao_vencida', capaJson: '{}',
        nota: 'Etapa do órgão: Liquidação vencida' }).catch(() => null);
    }
  }

  // (b) Notificação da Iota em 20/10.
  if (caso(3013)) await em(-30, () => chamarComo('ana', 'ccJurNotificacaoRegistrar', { clienteId: idDe(3013), carteira: 'PRIVADA', filial: '1' }));

  // (d) P06: dossiê da Atlas aberto por Ana em 02/11, 7 de 10 (notificação, cadastro e aprovação pendentes).
  if (caso(3001)) {
    const { processoId } = await em(-17, () => chamarComo('ana', 'ccJurDossieAbrir', { clienteId: idDe(3001), carteira: 'PRIVADA' }));
    const item = (codigo) => Number(db.prepare('SELECT ID FROM CC_DOSSIE_ITEM WHERE PROCESSO_ID = ? AND ITEM = ?').get(processoId, codigo).ID);
    await em(-16, async () => {
      for (const codigo of ['nf', 'entrega', 'pedido', 'titulo']) await chamarComo('ana', 'ccJurDossieItemMarcar', { itemId: item(codigo), situacao: 'OK', obs: 'Conferido' });
      await chamarComo('ana', 'ccJurDossieItemMarcar', { itemId: item('protesto'), situacao: 'NA', obs: 'Título não protestado: notificação no lugar' });
    });
  }

  // (c) Processos manuais da Júlia.
  const criar = async (codcli, input) => {
    const r = await julia('ccJurProcessoCriar', { clienteId: idDe(codcli), responsavelId: 8, ...input });
    return r.processoId;
  };
  const andamento = (processoId, n, texto, extra = {}) => julia('ccJurAndamentoRegistrar', { processoId, em: dia(n), texto, ...extra });
  const anexo = async (processoId, nome) => {
    const { CARD_ID } = db.prepare('SELECT CARD_ID FROM CC_PROCESSO WHERE ID = ?').get(processoId);
    const r = await julia('kbAnexoRegistrar', { cardId: CARD_ID, tipo: 'arquivo', nome, url: `https://arquivos.test/${nome}`, tamanho: 1000 });
    return Number(r.id);
  };

  const p01 = await criar(3002, { carteira: 'PRIVADA', faseChave: 'citacao', valor: 40000, autos: '0712345-11.2024.8.07.0001', tribunal: 'TJDFT', filial: '1', prazo: dia(-9),
    prazoDescricao: 'Manifestar sobre a citação por edital' });
  await julia('ccJurProcessoSalvar', { processoId: p01, formaCitacao: 'EDITAL' });
  await julia('ccJurCustoLancar', { processoId: p01, tipo: 'CUSTAS_INICIAIS', valor: 1200, data: dia(-16), guiaKbAnexoId: await anexo(p01, 'guia-custas.pdf'),
    comprovanteKbAnexoId: await anexo(p01, 'comprovante-custas.pdf') });
  await julia('ccJurCustoLancar', { processoId: p01, tipo: 'DILIGENCIA', valor: 300, data: dia(-30) });
  await andamento(p01, -10, 'Citação por edital deferida', { prazo: dia(-9), prazoDescricao: 'Manifestar sobre a citação por edital' });

  const p02 = await criar(3003, { carteira: 'ESTETICA', faseChave: 'acordo', valor: 60000, autos: '0700001-01.2023.8.07.0001', tribunal: 'TJDFT', filial: '2', linha: 'GALDERMA' });
  await julia('ccJurAcordoCriar', { processoId: p02, valor: 60000, entrada: 12000, nParcelas: 4, primeiroVencimento: dia(-14) });
  await andamento(p02, -7, 'Proposta de acordo apresentada');

  const p03 = await criar(3005, { carteira: 'PRIVADA', faseChave: 'execucao', valor: 25000, autos: '0700002-02.2022.8.07.0001', tribunal: 'TJDFT', filial: '1' });
  await julia('ccJurProcessoSalvar', { processoId: p03, resultadoSentenca: 'FAVORAVEL' });
  await julia('ccJurCustoLancar', { processoId: p03, tipo: 'HON_CONTRATUAIS', valor: 3000, data: dia(-101), comprovanteKbAnexoId: await anexo(p03, 'recibo-honorarios.pdf') });
  await andamento(p03, -50, 'Penhora on-line requerida');

  const p04 = await criar(3006, { carteira: 'PRIVADA', faseChave: 'custas', valor: 80000, filial: '1' });
  await julia('ccJurProcessoSalvar', { processoId: p04, substabelecer: 1 });
  await andamento(p04, -3, 'Guia de custas emitida');

  const p05 = await criar(3007, { carteira: 'PRIVADA', faseChave: 'suspenso', valor: 150000, autos: '0700003-03.2021.8.09.0051', tribunal: 'TJGO', filial: '2' });
  await andamento(p05, -171, 'Suspenso: recuperação judicial do devedor');

  const p07 = await criar(3008, { carteira: 'PRIVADA', faseChave: 'sentenca', valor: 20000, autos: '0700004-04.2023.8.07.0001', tribunal: 'TJDFT', filial: '1' });
  await andamento(p07, -35, 'Pagamento integral comprovado');
  await em(-35, () => julia('ccJurProcessoEncerrar', { processoId: p07, motivo: 'QUITADO' }));

  const p08 = await criar(3009, { carteira: 'PRIVADA', faseChave: 'defesa', valor: 45000, autos: '0700005-05.2024.8.07.0001', tribunal: 'TJDFT', filial: '1' });
  await andamento(p08, -2, 'Embargos apresentados pelo devedor');

  const p10 = await criar(3011, { carteira: 'PRIVADA', faseChave: 'acordo', valor: 10000, autos: '0700006-06.2022.8.07.0001', tribunal: 'TJDFT', filial: '1' });
  const { parcelas } = await julia('ccJurAcordoCriar', { processoId: p10, valor: 10000, entrada: 2000, nParcelas: 2, primeiroVencimento: dia(-160) });
  const ids = db.prepare('SELECT PA.ID, PA.NUMERO FROM CC_ACORDO_JUDICIAL_PARCELA PA JOIN CC_ACORDO_JUDICIAL AJ ON AJ.ID = PA.ACORDO_ID WHERE AJ.PROCESSO_ID = ? ORDER BY PA.NUMERO').all(p10);
  const pagos = [-160, -130, -100];
  for (let i = 0; i < parcelas.length; i += 1) await julia('ccJurAcordoParcelaSituacao', { parcelaId: ids[i].ID, situacao: 'PAGA', pagoEm: dia(pagos[i]) });
  await andamento(p10, -79, 'Acordo integralmente cumprido');
  await em(-79, () => julia('ccJurProcessoEncerrar', { processoId: p10, motivo: 'ACORDO_CUMPRIDO' }));

  const p11 = await criar(3012, { carteira: 'PRIVADA', faseChave: 'execucao', valor: 12000, autos: '0700007-07.2020.8.07.0001', tribunal: 'TJDFT', filial: '1' });
  await andamento(p11, -110, 'Sem bens penhoráveis');
  await em(-110, () => julia('ccJurProcessoEncerrar', { processoId: p11, motivo: 'BAIXA_PERDA' }));

  const p12 = await criar(3014, { carteira: 'PUBLICA', faseChave: 'recebido', valor: 50000, filial: '1', prazo: dia(5), prazoDescricao: 'Requerimento administrativo' });
  await andamento(p12, -1, 'Requerimento administrativo em preparo', { prazo: dia(5), prazoDescricao: 'Requerimento administrativo' });

  // (e) P09: Teta pela carga em 14/11, com divergência não conferida.
  await em(-5, () => julia('ccJurCargaAplicar', { linhas: JSON.stringify([{ nomeDevedor: 'Teta Nutrição', codcli: '3010', carteira: 'PRIVADA', uf: 'GO', valor: 15000,
    faseChave: 'recebido', status: 'Recebido do escritório', divergencia: 'Divergência na carga: endereço da planilha diferente do cadastro.',
    andamentos: [{ data: '14/11', texto: 'Recebido do escritório' }] }]) }));
}
