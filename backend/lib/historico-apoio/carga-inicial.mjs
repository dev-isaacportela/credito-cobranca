// Carga inicial da 007 (plan D-005): 41 fontes em 6 grupos (21 a revisar pelo Jurídico: Legislação e Fluxo da
// NF) e 7 materiais sem arquivo. Uma lista só, lida pelo add-070 (isEntrypoint) e pelo seed do simulador.
// Textos do estudo (A-regras-parametros-etapas.md, "Fontes de consulta"; B-winthor-planos-nf-publica.md,
// "Material de apoio") e do mockup escolhido. URL nula: o estudo não traz endereço (P-32, "sem link").

import { normalizar } from './texto.mjs';

const PR = 'Presidência da República';
const SISTEMA = 'Fontes de dados do sistema';

// [grupo, revisar, [[título, responsável, uso], …]]
const GRUPOS = [
  ['Consultas cadastrais e de crédito', false, [
    ['Comprovante de inscrição do CNPJ', 'Receita Federal', 'Situação cadastral, atividade e data de abertura; CNPJ com menos de 12 meses é sinal de fraude.'],
    ['Sintegra', 'Secretarias de Fazenda', 'Inscrição estadual e situação do contribuinte.'],
    ['Pesquisa de protestos (CENPROT)', 'IEPTB', 'Protestos em cartório, antes de liberar limite e antes de enviar título ao cartório.'],
    ['Serasa Experian', 'Serasa', 'Score, restrições e Cadastro Positivo.'],
    ['Boa Vista SCPC', 'Boa Vista', 'Segunda fonte de score.'],
    ['Escavador', 'Escavador', 'Processos judiciais do cliente e dos sócios.'],
  ]],
  ['Certidões da empresa', false, [
    ['CND Federal (tributos e dívida ativa)', 'Receita Federal e PGFN', 'Certidão da Benenutri pedida pelo órgão antes de pagar.'],
    ['CRF do FGTS', 'Caixa Econômica Federal', 'Certificado de regularidade do FGTS.'],
    ['CNDT (débitos trabalhistas)', 'TST', 'Certidão negativa de débitos trabalhistas.'],
  ]],
  ['Fluxo da NF e pagamento no setor público', true, [
    ['TCU: Licitações e Contratos, pagamento', 'TCU', 'Prazos de liquidação e de pagamento: 10 + 10 dias úteis.'],
    ['Compras.gov.br: ordem cronológica de pagamentos', 'Ministério da Gestão (SEGES)', 'IN SEGES/ME 77/2022: fila de pagamento por fonte de recurso.'],
    ['Regulamentos da Lei 14.133 por ente', 'Ministério da Gestão (SEGES)', 'Qual decreto vale em cada estado e município.'],
    ['Decreto DF 44.330/2023', 'Governo do Distrito Federal', 'Regulamenta a Lei 14.133 no Distrito Federal.'],
    ['Decreto GO 9.561/2019', 'Governo de Goiás', 'Ordem cronológica de pagamentos em Goiás.'],
    ['Decreto GO 10.240/2023', 'Governo de Goiás', 'Regulamento de contratações de Goiás.'],
    ['IN TCE/TO 1/2023', 'TCE do Tocantins', 'Ordem cronológica nos órgãos do Tocantins.'],
    ['Resolução Atricon 03/2022', 'Atricon', 'Diretriz dos tribunais de contas para a ordem cronológica.'],
    ['Decreto 12.807/2025', PR, 'Pequeno valor (art. 75, II) e prazos pela metade.'],
  ]],
  ['Setor público', false, [
    ['CAPAG', 'Tesouro Nacional', 'Capacidade de pagamento do estado ou município, de A a D.'],
    ['Siconfi (RGF e RREO)', 'Tesouro Nacional', 'Relatórios fiscais do ente: despesa com pessoal e restos a pagar.'],
    ['CAUC', 'Tesouro Nacional', 'Pendências do ente que travam transferências.'],
    ['PNCP', 'Governo Federal', 'Contratos, atas e empenhos publicados.'],
    ['Portal da Transparência', 'CGU', 'Pagamentos e ordens bancárias do governo federal.'],
  ]],
  ['Legislação', true, [
    ['Lei 14.133/2021 (licitações e contratos)', PR, 'Arts. 92, 137, 141 e 143: atualização monetária, atraso acima de 2 meses, ordem cronológica e parcela incontroversa.'],
    ['Lei 4.320/1964', PR, 'Arts. 60 e 63: empenho prévio e liquidação da despesa.'],
    ['Código Civil', PR, 'Arts. 389, 394 e 397: mora e perdas e danos.'],
    ['Código de Processo Civil', PR, 'Arts. 784, III e §4º, e 922: título executivo e suspensão por acordo.'],
    ['Código de Defesa do Consumidor', PR, 'Arts. 42 e 52, §1º: cobrança sem constrangimento; multa de até 2%.'],
    ['Lei de Acesso à Informação (12.527/2011)', PR, 'Pedido de posição na fila de pagamento do órgão.'],
    ['Código Penal, art. 337-H', PR, 'Pagar fatura fora da ordem cronológica.'],
    ['Lei de Responsabilidade Fiscal (LC 101/2000)', PR, 'Arts. 20 e 42: limite de pessoal e restos a pagar em fim de mandato.'],
    ['Lei 9.492/1997', PR, 'Protesto de títulos.'],
    ['Lei 5.474/1968', PR, 'Duplicatas; art. 15: execução.'],
    ['LGPD (Lei 13.709/2018)', PR, 'Tratamento dos dados de contato do cliente.'],
    ['Cadastro Positivo (LC 166/2019)', PR, 'Uso do histórico de pagamento na análise.'],
  ]],
  [SISTEMA, false, [
    ['Títulos a receber, planos de pagamento e clientes por plano', 'Winthor', 'Atraso, saldo a vencer, vencimentos e pagamentos, lidos direto do Winthor.'],
    ['Notas fiscais públicas', 'Agente do setor público', 'Empenho, protocolo, atesto, liquidação e ordem de pagamento.'],
    ['Regras de pagamento por ente', 'Gerência Financeira', 'Prazos de liquidação e pagamento por esfera e UF.'],
    ['Relatórios de crédito e evidências', 'Analista de crédito', 'Anexados na solicitação de crédito.'],
    ['Contatos, agenda e régua', 'Agente de cobrança', 'Registro do agente a cada contato.'],
    ['Equipe, alçadas, regras e metas', 'Gerência Financeira', 'Parâmetros do sistema, mantidos pelo Administrador.'],
  ]],
];

/** 41 linhas `{ GRUPO, TITULO, RESPONSAVEL, USO, ORDEM, REVISAR_JURIDICO, BUSCA }`, na ordem da carga. */
export const FONTES = GRUPOS.flatMap(([grupo, revisar, itens]) => itens.map(([titulo, responsavel, uso], i) => ({
  GRUPO: grupo, TITULO: titulo, RESPONSAVEL: responsavel, USO: uso, ORDEM: i + 1, REVISAR_JURIDICO: revisar,
  BUSCA: normalizar(`${titulo} ${responsavel} ${uso}`).slice(0, 900),
})));

const FLUXO = 'Fluxos de processo';
// [grupo, título, descrição, marcadores]
const ITENS_MATERIAL = [
  ['Política', 'Política de Crédito e Cobrança v5.2', 'Regras de concessão, limites, alçadas, régua de cobrança, acordos e baixa.', 'política, alçadas, régua'],
  [FLUXO, 'Fluxo geral de crédito e cobrança (BPMN)', 'Desenho completo do processo, da solicitação de crédito à baixa.', 'fluxo, bpmn'],
  [FLUXO, 'Fluxo — crédito privado', 'Da solicitação à gestão de crédito, com as alçadas de aprovação.', 'fluxo, crédito'],
  [FLUXO, 'Fluxo — crédito público', 'Análise do órgão, contrato e decisão da carteira Pública.', 'fluxo, crédito, público'],
  [FLUXO, 'Fluxo — cobrança privada', 'Régua de D-5 a D+45, acordo e quebra de acordo.', 'fluxo, cobrança, régua'],
  [FLUXO, 'Fluxo — cobrança judicial', 'Dossiê, ajuizamento e acompanhamento do processo.', 'fluxo, jurídico'],
  [FLUXO, 'Fluxo — cobrança pública', 'Empenho, atesto, liquidação e pagamento por nota fiscal.', 'fluxo, público'],
];

/** 7 linhas `{ GRUPO, TITULO, DESCRICAO, TAGS, ORDEM, BUSCA }`, todas sem arquivo (P-33). */
export const MATERIAIS = ITENS_MATERIAL.map(([grupo, titulo, descricao, tags], i) => ({
  GRUPO: grupo, TITULO: titulo, DESCRICAO: descricao, TAGS: tags, ORDEM: i + 1,
  BUSCA: normalizar(`${titulo} ${descricao} ${tags}`).slice(0, 900),
}));

const txt = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

/** Os dois INSERT IGNORE da carga (chave GRUPO + TITULO): repetir não duplica nem sobrescreve o que a tela mudou. */
export function sqlCargaInicial(agoraIso) {
  return [
    `INSERT IGNORE INTO CC_FONTE_LINK (GRUPO, TITULO, URL, RESPONSAVEL, USO, BUSCA, ORDEM, ATIVO, REVISAR_JURIDICO, ATUALIZADO_EM)
VALUES ${FONTES.map((f) => `(${[txt(f.GRUPO), txt(f.TITULO), 'NULL', txt(f.RESPONSAVEL), txt(f.USO), txt(f.BUSCA), f.ORDEM, 'TRUE',
    f.REVISAR_JURIDICO ? 'TRUE' : 'FALSE', txt(agoraIso)].join(', ')})`).join(',\n')}`,
    `INSERT IGNORE INTO CC_MATERIAL (GRUPO, TITULO, DESCRICAO, TAGS, BUSCA, ORDEM, ATIVO, ATUALIZADO_EM)
VALUES ${MATERIAIS.map((m) => `(${[txt(m.GRUPO), txt(m.TITULO), txt(m.DESCRICAO), txt(m.TAGS), txt(m.BUSCA), m.ORDEM, 'TRUE', txt(agoraIso)].join(', ')})`).join(',\n')}`,
  ];
}

/**
 * Carga só na primeira publicação (B5 C-04): cada tabela recebe a carga apenas se estiver vazia, para que
 * republicar não traga de volta, ao lado do editado, a fonte ou o material que o gestor renomeou.
 * `exec` = { consultar(sql) → linhas, executar(sql) }. Devolve as tabelas carregadas.
 */
export async function cargaInicial(exec, agoraIso) {
  const [fontes, materiais] = sqlCargaInicial(agoraIso);
  const feitas = [];
  for (const [tabela, comando] of [['CC_FONTE_LINK', fontes], ['CC_MATERIAL', materiais]]) {
    const [l] = await exec.consultar(`SELECT COUNT(*) AS N FROM ${tabela}`);
    if (Number(l?.N)) continue;
    await exec.executar(comando);
    feitas.push(tabela);
  }
  return feitas;
}
