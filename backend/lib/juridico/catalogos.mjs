// Catálogos da 003 (definição do sistema, RN-031): documentos do dossiê (05 §8), tipos de custo e grupos
// (RN-013), motivos de encerramento, fases, desvios (RN-022, E §4.5) e indicadores (RN-023, E §4.7).
// Vão para as SFs JAVASCRIPT como constantes e para a SQL por CASE gerado daqui.

/** 17 documentos: [código, texto, obrigatório, privado (privada e Estética), público]. */
export const DOCUMENTOS = [
  ['nf', 'Notas fiscais (DANFE e XML) das faturas em aberto', true, true, true],
  ['entrega', 'Comprovantes de entrega assinados (canhoto, CT-e ou recibo)', true, true, true],
  ['pedido', 'Pedido de compra, proposta comercial ou contrato com o cliente', true, true, false],
  ['contrato', 'Contrato administrativo ou ata de registro de preços', true, false, true],
  ['empenho', 'Nota de empenho e ordem de fornecimento', true, false, true],
  ['atesto', 'Protocolo da NF no órgão e atesto ou termo de recebimento', true, false, true],
  ['titulo', 'Boletos ou duplicatas e posição dos títulos no Winthor', true, true, false],
  ['protesto', 'Instrumento de protesto e comprovante de negativação', true, true, false],
  ['notif', 'Notificação extrajudicial (modelo padrão) e comprovante de recebimento', true, true, false],
  ['oficio', 'Ofícios de cobrança e requerimento administrativo protocolados', true, false, true],
  ['lai', 'Posição na ordem cronológica de pagamentos (resposta à LAI)', false, false, true],
  ['certidoes', 'Certidões de regularidade da Benenutri na data do faturamento', true, false, true],
  ['demonst', 'Demonstrativo atualizado do débito (principal, multa, juros e correção)', true, true, true],
  ['hist', 'Histórico de cobrança (régua, contatos, promessas e propostas)', true, true, true],
  ['cadastro', 'Cadastro do devedor: cartão CNPJ/CPF, contrato social, sócios, endereço', true, true, true],
  ['garantia', 'Garantias e confissões: aval, fiança ou termo de acordo anterior', false, true, true],
  ['alcada', 'Aprovação do encaminhamento ao Jurídico pela Gestão Financeira', true, true, true],
].map(([codigo, texto, obrigatorio, privado, publico]) => ({ codigo, texto, obrigatorio, privado, publico }));

/** Itens que valem para a carteira (PUBLICA = coluna Público; as outras = Privado). */
export const documentosDa = (carteira) => DOCUMENTOS.filter((d) => (carteira === 'PUBLICA' ? d.publico : d.privado));

/** 12 tipos de custo e o grupo de cada um (RN-013). */
export const GRUPOS_CUSTO = { CUSTAS: 'Custas processuais', HONORARIOS: 'Honorários', DILIGENCIAS: 'Diligências e pesquisas', OUTROS: 'Outros' };
export const TIPOS_CUSTO = [
  ['CUSTAS_INICIAIS', 'Custas iniciais', 'CUSTAS'],
  ['CUSTAS_CITACAO', 'Custas de citação e postais', 'CUSTAS'],
  ['EDITAL', 'Edital', 'CUSTAS'],
  ['RECURSOS', 'Recursos e preparo', 'CUSTAS'],
  ['HON_CONTRATUAIS', 'Honorários advocatícios contratuais', 'HONORARIOS'],
  ['HON_EXITO', 'Honorários de êxito', 'HONORARIOS'],
  ['DILIGENCIA', 'Diligência e oficial de justiça', 'DILIGENCIAS'],
  ['LOCOMOCAO', 'Locomoção', 'DILIGENCIAS'],
  ['PESQUISAS', 'Pesquisas (SISBAJUD, RENAJUD, INFOJUD, endereço)', 'DILIGENCIAS'],
  ['PERICIA', 'Perícia', 'OUTROS'],
  ['CARTORIO', 'Cartório e protesto', 'OUTROS'],
  ['OUTROS', 'Outros', 'OUTROS'],
].map(([codigo, rotulo, grupo]) => ({ codigo, rotulo, grupo }));

/** Grupo em que se espera guia (RN-013). */
export const GRUPOS_COM_GUIA = ['CUSTAS', 'DILIGENCIAS'];

/** `CASE` SQL que dá o grupo do custo pelo tipo (coluna `col`). */
export const GRUPO_SQL = (col) => `(CASE ${TIPOS_CUSTO.map((t) => `WHEN ${col} = '${t.codigo}' THEN '${t.grupo}'`).join(' ')} ELSE 'OUTROS' END)`;

export const MOTIVOS = {
  QUITADO: 'Quitado', ACORDO_CUMPRIDO: 'Acordo cumprido', BAIXA_PERDA: 'Baixa como perda', EXTINTO: 'Extinto sem recuperação', OUTRO: 'Outro',
};

/** As 11 fases (05 §6): [chave, nome, cor, SLA (h), o que acontece, saída]. As 4 primeiras são pré-ajuizamento. */
export const FASES = [
  ['dossie', '01 · Dossiê em montagem', 'data-1', 240, 'O Financeiro reúne os documentos do checklist antes de enviar ao Jurídico.', 'Documentos obrigatórios conferidos e dossiê enviado ao Jurídico.'],
  ['recebido', '02 · Recebido · contato amigável', 'data-2', 0, 'O Jurídico confere o dossiê, faz o contato amigável e acompanha a notificação extrajudicial.', 'Acordo fechado ou decisão de ajuizar.'],
  ['peticao', '03 · Petição inicial', 'data-2', 0, 'Elaboração da inicial: execução, monitória ou cobrança.', 'Inicial pronta e guia de custas emitida.'],
  ['custas', '04 · Custas e protocolo', 'data-3', 0, 'O Financeiro paga a guia de custas e o Jurídico protocola a ação.', 'Número dos autos registrado.'],
  ['citacao', '05 · Citação', 'data-3', 0, 'Busca de endereço, carta, mandado, oficial de justiça ou edital.', 'Réu citado ou curador especial nomeado.'],
  ['defesa', '06 · Defesa e instrução', 'data-4', 0, 'Embargos, contestação, contrarrazões, provas e autos conclusos.', 'Sentença publicada.'],
  ['sentenca', '07 · Sentença e recursos', 'data-4', 0, 'Sentença, apelação, embargos de declaração e trânsito em julgado.', 'Trânsito em julgado.'],
  ['execucao', '08 · Cumprimento e execução', 'data-5', 0, 'Cumprimento de sentença, penhora (SISBAJUD, RENAJUD, INFOJUD), RPV ou precatório.', 'Valor levantado.'],
  ['acordo', '09 · Acordo judicial', 'data-6', 0, 'Parcelas do acordo em acompanhamento, com honorários.', 'Todas as parcelas pagas.'],
  ['suspenso', '10 · Suspenso · RJ · arquivado', 'data-8', 0, 'Recuperação judicial, falência, massa falida ou arquivamento provisório.', 'Crédito habilitado ou processo retomado.'],
  ['encerrado', 'Encerrado', 'data-7', 0, 'Débito quitado, acordo cumprido, baixa como perda ou extinção.', '—'],
].map(([chave, nome, cor, slaHoras, acontece, saida]) => ({ chave, nome, cor, slaHoras, acontece, saida }));

export const FASES_COM_AUTOS = ['citacao', 'defesa', 'sentenca', 'execucao'];

/** Os 13 desvios na ordem dos tipos (RN-022, plan "Alertas e indicadores") com a ação sugerida (E §4.5). */
export const DESVIOS = [
  ['prazo', 'Prazo processual vencido', 'Confirmar com o Jurídico se o prazo foi cumprido e registrar o andamento.'],
  ['parcela', 'Parcela de acordo vencida', 'Cobrar a parcela; vencida a tolerância, pedir o prosseguimento pelo saldo com os encargos do termo.'],
  ['politica', 'Acordo fora da política', 'Registrar a aprovação na alçada ou renegociar dentro da política.'],
  ['semdossie', 'Cliente pronto para o Jurídico sem dossiê', 'Montar o dossiê de cobrança jurídica.'],
  ['parado', 'Processo sem andamento', 'Pedir atualização ao Jurídico e registrar o andamento.'],
  ['custo', 'Custo acima da meta', 'Reavaliar a viabilidade da cobrança judicial.'],
  ['custas', 'Custas sem lançamento', 'Lançar a guia em Custos dos processos.'],
  ['carga', 'Divergência na carga', 'Conferir a pendência da carga inicial e corrigir o processo.'],
  ['subst', 'Substabelecimento pendente', 'Providenciar o substabelecimento.'],
  ['suspenso', 'Suspenso ou em recuperação judicial', 'Avaliar a habilitação do crédito ou a baixa como perda na alçada.'],
  ['dossie', 'Dossiê incompleto', 'Completar os documentos obrigatórios e enviar ao Jurídico.'],
  ['encsaldo', 'Encerrado com saldo na cobrança', 'Conferir a baixa no Winthor e regularizar o caso de cobrança.'],
  ['atvreg', 'Processo ativo com cliente regularizado', 'Confirmar o pagamento e pedir a extinção do processo.'],
].map(([tipo, nome, acao]) => ({ tipo, nome, acao }));

/** Os 24 indicadores (RN-023): [chave, nome]. */
export const INDICADORES = [
  ['01', 'Processos em andamento'], ['02', 'Valor em processos em andamento'], ['03', 'A ajuizar'], ['04', 'Cumprimento e execução'],
  ['05', 'Valor recuperado'], ['06', 'Taxa de recuperação'], ['07', 'Acordos a receber'], ['08', 'Acordos com parcela vencida'],
  ['09', 'Custo total'], ['10', 'Custo ÷ valor em cobrança'], ['11', 'Retorno sobre o custo'], ['12', 'Custo médio por processo'],
  ['13', 'Prazos vencidos'], ['14', 'Prazos em 7 dias'], ['15', 'Dados a conferir'], ['16', 'Dossiês pendentes'],
  ['17', 'Dias médios sem andamento'], ['18', 'Sem andamento há mais de 30 dias'], ['19', 'Prazos vencidos'], ['20', 'Idade média dos processos'],
  ['21', 'Taxa de acordo'], ['22', 'Taxa de êxito'], ['23', 'Citação por edital ou curadoria'], ['24', 'Sentenças favoráveis'],
].map(([chave, nome]) => ({ chave, nome }));
