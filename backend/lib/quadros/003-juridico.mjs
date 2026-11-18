// Quadro `juridico` da 003 (05 §6, §7) e o trecho do gancho ccPodeMover (04 §8, DT-35).
// Capa: campos fixos do quadro (noCard) e, por fase, `dossie` (progresso) em dossie/recebido, `custo` de custas a
// execucao e `acordo` (progresso) em acordo. Etiquetas só Custo a pagar, Carga a conferir e Substabelecer (PJ-07).

import { podeAdministrarEm } from '../guarda.mjs';
import { FASES } from '../juridico/catalogos.mjs';

export const ETIQUETAS = ['Custo a pagar', 'Carga a conferir', 'Substabelecer'];
const COR = { 'Custo a pagar': 'data-5', 'Carga a conferir': 'data-3', Substabelecer: 'data-8' };
const opcoes = (pares) => pares.map(([valor, label]) => ({ valor, label }));

export const CAMPOS = [
  { chave: 'valor', label: 'Valor', tipo: 'moeda', noCard: true },
  { chave: 'carteira', label: 'Carteira', tipo: 'selecao', noCard: true,
    config: { opcoes: opcoes([['PRIVADA', 'Privada'], ['ESTETICA', 'Estética'], ['PUBLICA', 'Pública']]), filtro: true } },
  { chave: 'autos', label: 'Nº dos autos', tipo: 'texto', noCard: true },
  { chave: 'prazo_descricao', label: 'Prazo', tipo: 'texto', noCard: true },
  { chave: 'situacao', label: 'Situação atual', tipo: 'texto', noCard: true },
  { chave: 'tribunal', label: 'Tribunal', tipo: 'texto', noCard: true },
  // ponytail: opções semeadas com as filiais e BUs do elenco; outra filial ou BU entra pela administração do quadro
  // (valor sem opção não vai à capa, a SF descarta).
  { chave: 'filial', label: 'Filial', tipo: 'selecao', noCard: true, config: { opcoes: opcoes([['1', 'Filial 1'], ['2', 'Filial 2']]), filtro: true } },
  { chave: 'bu', label: 'BU', tipo: 'selecao', noCard: true,
    config: { opcoes: opcoes([['0', 'Sem BU'], ['1', 'Nutrição'], ['2', 'Enfermagem'], ['3', 'Medicamento'], ['4', 'Estética']]), filtro: true } },
  { chave: 'linha', label: 'Linha', tipo: 'selecao', noCard: true, config: { opcoes: opcoes([['GALDERMA', 'Galderma'], ['DEMAIS', 'Demais linhas']]), filtro: true } },
  { chave: 'dossie', label: 'Dossiê', tipo: 'progresso', noCard: false },
  { chave: 'custo', label: 'Custo', tipo: 'texto', noCard: false },
  { chave: 'acordo', label: 'Acordo', tipo: 'progresso', noCard: false },
];

const CAPA_DA_FASE = { dossie: ['dossie'], recebido: ['dossie'], custas: ['custo'], citacao: ['custo'], defesa: ['custo'], sentenca: ['custo'],
  execucao: ['custo'], acordo: ['acordo'] };

export const QUADROS = [{
  slug: 'juridico', nome: 'Jurídico', descricao: 'Processos do Jurídico, do dossiê ao encerramento', config: { semEmail: false },
  fases: FASES.map((f) => ({
    chave: f.chave, nome: f.nome, tipo: f.chave === 'encerrado' ? 'sucesso' : 'comum', slaHoras: f.slaHoras, cor: f.cor,
    descricao: `${f.acontece} Saída: ${f.saida}`, capa: CAPA_DA_FASE[f.chave] || [], campos: [],
  })),
  campos: CAMPOS,
  etiquetas: ETIQUETAS.map((rotulo) => ({ rotulo, cor: COR[rotulo] })),
  automacoes: [{ nome: 'E-mail ao responsável (dossiê recebido)', gatilho: 'card_movido', faseChave: 'recebido', acao: 'enviar_email',
    config: { para: ['$responsavel'], assunto: 'Dossiê recebido pelo Jurídico', corpo: 'Dossiê recebido pelo Jurídico.' } }],
}];

/* ── gancho (04 §8, DT-35): destinos controlados primeiro (só domínio), depois "quem move" no movimento livre ── */

const PROC = (cond) => `EXISTS (SELECT 1 FROM CC_PROCESSO P WHERE P.CARD_ID = K.ID AND ${cond})`;
/** Dossiê vindo da cobrança e ainda não enviado (processo manual ou da carga nasce no card e é levado à fase pela SF). */
const EM_MONTAGEM = PROC("P.ORIGEM = 'COBRANCA' AND P.DOSSIE_ENVIADO_EM IS NULL");
const LIVRE = "PARA.CHAVE <> 'encerrado' AND NOT (DE.CHAVE = 'dossie' AND PARA.CHAVE = 'recebido')";

export function gancho(slug) {
  if (slug !== 'juridico') return '';
  return `        WHEN PARA.CHAVE = 'dossie' THEN 'Processo não volta para o dossiê.'
        WHEN DE.CHAVE = 'encerrado' THEN 'Processo encerrado não volta.'
        WHEN PARA.CHAVE = 'encerrado' AND NOT ${PROC('P.ENCERRADO_EM IS NOT NULL')} THEN 'Encerre pelo botão Encerrar processo, com o motivo.'
        WHEN DE.CHAVE = 'dossie' AND PARA.CHAVE = 'recebido' AND ${EM_MONTAGEM} THEN 'Envie o dossiê para sair desta etapa.'
        WHEN ${LIVRE} AND NOT (M.CARGO = 'JURIDICO' OR ${podeAdministrarEm('M')}) THEN 'Só o Jurídico move processos.'
        WHEN DE.CHAVE = 'dossie' AND PARA.CHAVE NOT IN ('recebido', 'encerrado') AND ${EM_MONTAGEM} THEN 'Envie o dossiê para sair desta etapa.'
        WHEN PARA.CHAVE IN ('citacao', 'defesa', 'sentenca', 'execucao') AND ${PROC("P.AUTOS = ''")} THEN 'Informe o número dos autos.'`;
}
