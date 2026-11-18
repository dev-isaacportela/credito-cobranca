// add-010 — Server Functions da 001-base (04 §1): 50 públicas e 26 internas, todas aqui.
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// `definitions` vai para o simulador, que roda o MESMO SQL e o MESMO JavaScript publicados.
//
// Publicação (DT-39): roda duas vezes no PUBLISH_ORDER e de novo depois de cada spec publicada sozinha.
// Cada execução é upsert pelo nome (ids mantidos): publica, lê os ids do projeto e republica as JS com o
// mapa completo (`__CC_IDS__`), o jdbcId do Winthor (`__JDBC_WINTHOR__`) e o `ccPodeMover` remontado com
// os `lib/quadros/NNN` presentes.
//
// Entradas das escritas internas (forma A, 01 §5; `membroId` = quem age, 0 = rotina; `agora` vem da JS):
//   ccEscBaseAuditoria          area, entidade, n, entidadeIds, clienteIds, campos, antes, depois (listas por ¦), membroId, agora
//   ccEscBaseEstado             chave, valor, membroId, agora
//   ccEscBaseRotinaPasso        sincronizacaoId, passo, situacao, inicio, fim, processados, pendentes, execucoes, erro, membroId
//   ccEscBaseParametro          n, chaves, carteiras, valores, nulos, vigencias (listas por ¦), membroId, agora
//   ccEscBaseClienteAgente      ids (lista por vírgula), agenteId (0 = sem agente), membroId, agora
//   ccEscBaseClienteClassificar clienteId, grupoEconomico, esfera, membroId, agora
//   ccEscBaseClienteAnalista    clienteId, analistaId (0 = limpa), membroId, agora   ← chamada pela 004/005
//   ccEscBaseClienteJuridico    clienteId, noJuridico (0/1), membroId, agora         ← chamada pela 003
//   ccEscBaseContatoInserir     clienteId, nome, area, funcao, telefone, whatsapp, email, situacao, obs, principal, busca, membroId, agora
//   ccEscBaseContatoAtualizar   id, clienteId, (os mesmos campos), mudou (0/1), membroId, agora
//   ccEscBaseContatosRevisar    clienteId, membroId, agora
//   ccEscBaseMembroInserir      nome, nomeChave, userEmail, cargo, superiorId, admin, ativo, membroId, agora
//   ccEscBaseMembroAtualizar    id, nome, nomeChave, userEmail, cargo, superiorId, admin, ativo, caminhoAntigo (o gravado), membroId, agora
//                               (NIVEL sai do cargo e CAMINHO do caminho gravado do superior, na própria SQL: B-01)
//   ccEscBaseBuSalvar           buId (0 = nova), nome, carteira, ordem, ativa, membroId
//   ccEscBaseBuDepto            codepto, buId (0 = sem BU), membroId, agora
//   ccEscBaseFeriado            feriadoId (0 = novo), data, nome, abrangencia, uf, municipio, membroId
//   ccEscBaseFeriadoRemover     feriadoId, membroId
//   ccEscBaseFeriadosInserir    n, datas, nomes (listas por ¦), membroId
//   ccEscBaseModelo             codigo, assunto, corpo, versaoAtual, membroId, agora
//   ccEscBaseModeloValidar      codigo, versao, membroId, agora
//   ccEscBaseEmailInserir       modeloId, modeloCodigo, modeloVersao, clienteId, para, assunto, corpo, origem, referencia, resultado, erro, membroId, agora
//   ccEscBaseAnexoInserir       entidade, entidadeId, clienteId, tipoDoc, nomeArquivo, mime, tamanhoBytes, url, membroId, agora
//   ccEscBaseAnexoRemover       anexoId, membroId, agora
//   ccEscBaseSincronizacaoPedir membroId, agora
// Leituras Oracle (SQL com jdbcId do Winthor): ccBaseWinthorTitulos (codcli) · ccBaseWinthorCliente (codcli, documento).

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { js, MSG, injetarIds } from './lib/escritas.mjs';
import { q } from './lib/texto-sql.mjs';
import { ATOR, ROTINA, PODE_ADMINISTRAR, NIVEL_MIN, clienteVisivelA, NUMEROS_20, ITEM, podeAdministrarEm, numerosComoParametro } from './lib/guarda.mjs';
import { EU, MEMBRO_A, clienteVisivel, veTudo } from './lib/visibilidade.mjs';
import { PARAM_NUM, carregarArquivosDeParametros, fundir } from './lib/parametros.mjs';
import { HOJE_SQL, AGORA_SQL } from './lib/tempo.mjs';
import * as W from './lib/winthor-sql.mjs';
import { FONTE as FONTE_POSICAO } from './lib/base/posicao.mjs';
import { FONTE as FONTE_SETOR, normalizarTexto } from './lib/base/setor.mjs';
import { FONTE as FONTE_MODELO } from './lib/base/modelo.mjs';
import { FONTE as FONTE_EQUIPE, nivelDoCargo } from './lib/base/equipe.mjs';
import { FONTE as FONTE_DIAS_UTEIS } from './lib/dias-uteis.mjs';
import { carregarArquivosDeQuadros, trechosDosGanchos, montarPodeMover, SQL_PODE_EXCLUIR } from './lib/quadros.mjs';
import { NOME_JDBC_WINTHOR } from './add-002-jdbc-winthor.mjs';

/* ── texto que entra nos corpos JAVASCRIPT ── */

/** `const nome = valor;` sem `{{` literal no corpo (regra da lib: a plataforma não deve ver parâmetro em JS). */
const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;

function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function listaIds(v) {
  return [...new Set(String(v ?? '').split(',').map((x) => Math.trunc(Number(x))).filter((x) => Number.isFinite(x) && x > 0))];
}
function digitos(v) { return String(v ?? '').replace(/\D/g, ''); }
function texto(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function emailValido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim()); }
// D-014 (arquitetura D-09): chaves de alçada — só cargo de nível >= 3 altera (01 §4).
const CHAVES_ALCADA = ['jur.envioNivelMin', 'jur.acordoAlcadaNivel', 'jur.acordoAlcadaValor', 'com.modeloValidaNivel'];
function ehAlcada(c) { return c.startsWith('alcada.') || CHAVES_ALCADA.includes(c); }
const UTIL = [constante('CHAVES_ALCADA', CHAVES_ALCADA), ...[q, inteiro, listaIds, normalizarTexto, digitos, texto, emailValido, ehAlcada].map(String)].join('\n');

/** Cliente pelo id, se visível ao membro de `quem()` (MEMBRO_A + clienteVisivelA, DT-34); rotina vê todos. */
async function clienteVisivelAo(m, clienteId) {
  const id = inteiro(clienteId);
  if (!id) return null;
  const sql = m.rotina
    ? `SELECT C.* FROM CC_CLIENTE C WHERE C.ID = ${id}`
    : `SELECT C.* FROM CC_CLIENTE C ${SQL_MEMBRO_A.split('#M#').join(String(inteiro(m.membroId)))} WHERE C.ID = ${id} AND ${SQL_VISIVEL_A}`;
  const [c] = await ler(sql);
  return c || null;
}
const FONTE_VISIVEL = [constante('SQL_MEMBRO_A', MEMBRO_A('#M#')), constante('SQL_VISIVEL_A', clienteVisivelA('C', 'A')), String(clienteVisivelAo)].join('\n');

/** Corpo de SF JAVASCRIPT: preâmbulo + UTIL + fontes + a função. */
const sf = (fn, ...fontes) => js(`${[UTIL, ...fontes].join('\n')}\nreturn await (${fn})();`);

/* ── fragmentos SQL da 001 ── */

const A_ADMIN = `${ATOR('{{membroId}}', PODE_ADMINISTRAR)}`;
const A_VE_CLIENTE = (id = '{{clienteId}}') => ATOR('{{membroId}}', `EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = ${id} AND ${clienteVisivelA('C', 'A')})`);
/**
 * ATOR dentro de tabela derivada: escrita em CC_MEMBRO não pode ler CC_MEMBRO direto (erro 1093, 06 §5).
 * O DISTINCT impede o MySQL de fundir a derivada na consulta de fora (derived_merge), o que traria o 1093 de volta.
 */
const ATOR_DERIVADO = (cond) => `EXISTS (SELECT 1 FROM (${ATOR('{{membroId}}', cond).replace(/^EXISTS \(SELECT 1 /, 'SELECT DISTINCT 1 AS U ').replace(/\)$/, '')}) G)`;
/** Linha de CC_MEMBRO lida dentro de UPDATE/INSERT em CC_MEMBRO, pela mesma derivada materializada. */
const EXISTE_MEMBRO = (cond) => `EXISTS (SELECT 1 FROM (SELECT DISTINCT X.ID FROM CC_MEMBRO X WHERE ${cond}) X2)`;
/** Nível pelo cargo, na SQL (definição do sistema, 01 §4): o nível nunca vem do parâmetro. Cargo desconhecido = NULL. */
const NIVEL_CARGO = `(CASE '{{cargo}}' ${['AGENTE', 'ANALISTA', 'SUPERVISOR', 'GERENTE', 'DIRETORIA', 'JURIDICO']
  .map((c) => `WHEN '${c}' THEN ${nivelDoCargo(c)}`).join(' ')} END)`;
/** Superior ativo de cargo que chefia (RN-011); `fora` = condição extra sobre `X` (ciclo). */
const SUPERIOR_VALIDO = (fora = 'TRUE') => EXISTE_MEMBRO(`X.ID = {{superiorId}} AND X.ATIVO = TRUE
    AND X.CARGO IN ('SUPERVISOR','GERENTE','DIRETORIA') AND ${fora}`);
/** Caminho novo do membro {{id}}: o caminho GRAVADO do superior + id; sem superior, o topo `/id/` (01 §6). */
const CAMINHO_NOVO = `(CASE WHEN {{superiorId}} = 0 THEN CONCAT('/', {{id}}, '/')
    ELSE CONCAT((SELECT S.CAMINHO FROM (SELECT MAX(S0.CAMINHO) AS CAMINHO FROM CC_MEMBRO S0 WHERE S0.ID = {{superiorId}}) S), {{id}}, '/') END)`;

/** Hoje e a validade da ficha de contatos, uma vez por consulta. */
const PRM = `JOIN (SELECT ${HOJE_SQL} AS HOJE, ${PARAM_NUM('base.fichaValidadeDias')} AS FICHA_DIAS) PRM ON 1 = 1`;
const SIT_FICHA = (c = 'C') => `(CASE WHEN ${c}.CONTATOS_REVISADO_EM IS NULL THEN 'NUNCA'
    WHEN DATEDIFF(PRM.HOJE, SUBSTRING(${c}.CONTATOS_REVISADO_EM, 1, 10)) > PRM.FICHA_DIAS THEN 'VENCIDA' ELSE 'EM_DIA' END)`;
const FILTRO_SIT_FICHA = (c = 'C') => `('{{situacaoFicha}}' = '' OR ${SIT_FICHA(c)} = '{{situacaoFicha}}'
    OR ('{{situacaoFicha}}' = 'A_REVISAR' AND ${SIT_FICHA(c)} <> 'EM_DIA'))`;

/* ── leituras SQL ── */

const FILTRO_CLIENTE = `${clienteVisivel('C')}
  AND ('{{busca}}' = '' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%') OR C.DOCUMENTO = '{{busca}}' OR CAST(C.CODCLI AS CHAR) = '{{busca}}')
  AND ('{{setor}}' = '' OR C.SETOR = '{{setor}}')
  AND ('{{carteira}}' = '' OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_CARTEIRA PC WHERE PC.CLIENTE_ID = C.ID
       AND PC.CARTEIRA = '{{carteira}}' AND (PC.VENCIDO + PC.A_VENCER) > 0))
  AND ({{agenteId}} = 0 OR ({{agenteId}} = -1 AND C.AGENTE_ID IS NULL) OR C.AGENTE_ID = {{agenteId}})
  AND ({{analistaId}} = 0 OR C.ANALISTA_ID = {{analistaId}})
  AND ({{buId}} = -1 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PB WHERE PB.CLIENTE_ID = C.ID
       AND PB.BU_ID = {{buId}} AND (PB.VENCIDO + PB.A_VENCER) > 0))
  AND ('{{uf}}' = '' OR C.UF = '{{uf}}')
  AND ('{{tipoPessoa}}' = '' OR C.TIPO_PESSOA = '{{tipoPessoa}}')
  AND ({{soVencidos}} = 0 OR COALESCE(P.VENCIDO, 0) > 0)
  AND ${FILTRO_SIT_FICHA('C')}`;

const FROM_CLIENTE = `FROM CC_CLIENTE C
${EU}
${PRM}
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = C.ID`;

const SQL_CLIENTE_LISTAR = `SELECT C.ID, C.CODCLI, C.NOME, C.FANTASIA, C.DOCUMENTO, C.TIPO_PESSOA, C.SETOR, C.UF, C.MUNICIPIO, C.AGENTE_ID,
  COALESCE(AG.NOME, '') AS AGENTE_NOME, COALESCE(AN.NOME, '') AS ANALISTA_NOME,
  COALESCE(P.VENCIDO, 0) AS VENCIDO, COALESCE(P.A_VENCER, 0) AS A_VENCER, COALESCE(P.DIAS_ATRASO, 0) AS DIAS_ATRASO,
  COALESCE(P.LIMITE, 0) AS LIMITE, COALESCE(P.UTILIZADO, 0) AS UTILIZADO, COALESCE(P.DISPONIVEL, 0) AS DISPONIVEL,
  ${SIT_FICHA('C')} AS SITUACAO_FICHA, C.CONTATOS_REVISADO_EM,
  COALESCE((SELECT GROUP_CONCAT(B.NOME ORDER BY B.ORDEM SEPARATOR ', ') FROM CC_POSICAO_CLIENTE_BU PB2 JOIN CC_BU B ON B.ID = PB2.BU_ID
    WHERE PB2.CLIENTE_ID = C.ID AND (PB2.VENCIDO + PB2.A_VENCER) > 0), '') AS BUS_SALDO
${FROM_CLIENTE}
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
WHERE ${FILTRO_CLIENTE}
ORDER BY CASE WHEN '{{ordem}}' = 'VENCIDO' THEN COALESCE(P.VENCIDO, 0) ELSE 0 END DESC,
  CASE WHEN '{{ordem}}' = 'DIAS_ATRASO' THEN COALESCE(P.DIAS_ATRASO, 0) ELSE 0 END DESC, C.NOME, C.ID
LIMIT {{limite}} OFFSET {{offset}}`;

const SQL_CLIENTE_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(P.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(P.A_VENCER), 0) AS A_VENCER,
  COALESCE(SUM(CASE WHEN COALESCE(P.VENCIDO, 0) > 0 THEN 1 ELSE 0 END), 0) AS EM_ATRASO,
  COALESCE(MAX(P.DIAS_ATRASO), 0) AS MAIOR_ATRASO,
  COALESCE(SUM(CASE WHEN C.AGENTE_ID IS NULL THEN 1 ELSE 0 END), 0) AS SEM_AGENTE,
  COALESCE(SUM(CASE WHEN ${SIT_FICHA('C')} <> 'EM_DIA' THEN 1 ELSE 0 END), 0) AS FICHA_A_REVISAR
${FROM_CLIENTE}
WHERE ${FILTRO_CLIENTE}`;

const FILTRO_RECEBIMENTO = `R.ESTORNADO = FALSE AND ${clienteVisivel('C')}
  AND ({{clienteId}} = 0 OR R.CLIENTE_ID = {{clienteId}})
  AND ('{{carteira}}' = '' OR R.CARTEIRA = '{{carteira}}')
  AND ('{{de}}' = '' OR R.DATA_PAGAMENTO >= '{{de}}')
  AND ('{{ate}}' = '' OR R.DATA_PAGAMENTO <= '{{ate}}')
  AND ({{comAtraso}} = 0 OR R.DIAS_ATRASO_PAGAMENTO > 0)
  AND ('{{busca}}' = '' OR R.TITULO LIKE CONCAT('%', '{{busca}}', '%'))`;
const FROM_RECEBIMENTO = `FROM CC_RECEBIMENTO R
JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID
${EU}`;

const CONTATO_COLUNAS = `K.ID, K.CLIENTE_ID, K.NOME, K.AREA, K.FUNCAO, K.TELEFONE, K.WHATSAPP, K.EMAIL, K.SITUACAO, K.OBS, K.PRINCIPAL,
  K.BUSCA, K.ATUALIZADO_EM, K.ATUALIZADO_POR, ${SIT_FICHA('C')} AS SITUACAO_FICHA, C.CODCLI, C.NOME AS CLIENTE_NOME,
  COALESCE(AG.NOME, '') AS AGENTE_NOME`;
const CONTATO_BASE = `FROM CC_CONTATO_CLIENTE K
JOIN CC_CLIENTE C ON C.ID = K.CLIENTE_ID
${EU}
${PRM}
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
WHERE ${clienteVisivel('C')}
  AND ('{{area}}' = '' OR K.AREA = '{{area}}')
  AND ({{soPrincipais}} = 0 OR K.PRINCIPAL = TRUE)
  AND ('{{busca}}' = '' OR K.BUSCA LIKE CONCAT('%', '{{busca}}', '%'))
  AND ${FILTRO_SIT_FICHA('C')}`;
// Com clienteId > 0 é lista fixa (todos os contatos do cliente); com 0, página de todos os clientes visíveis.
const SQL_CONTATO_LISTAR = `SELECT * FROM (SELECT ${CONTATO_COLUNAS} ${CONTATO_BASE} AND {{clienteId}} > 0 AND K.CLIENTE_ID = {{clienteId}}
  ORDER BY C.NOME, K.PRINCIPAL DESC, K.NOME, K.ID LIMIT 500) FIXA
UNION ALL
SELECT * FROM (SELECT ${CONTATO_COLUNAS} ${CONTATO_BASE} AND {{clienteId}} = 0
  ORDER BY C.NOME, K.PRINCIPAL DESC, K.NOME, K.ID LIMIT {{limite}} OFFSET {{offset}}) PAGINA
ORDER BY CLIENTE_NOME, PRINCIPAL DESC, NOME, ID`;
const SQL_CONTATO_TOTAL = `SELECT T.TOTAL, T.CLIENTES_COM_FICHA, T.FICHAS_VENCIDAS, S.CLIENTES_SEM_CONTATO FROM (
  SELECT COUNT(*) AS TOTAL, COUNT(DISTINCT K.CLIENTE_ID) AS CLIENTES_COM_FICHA,
    COUNT(DISTINCT CASE WHEN ${SIT_FICHA('C')} = 'VENCIDA' THEN K.CLIENTE_ID END) AS FICHAS_VENCIDAS
  ${CONTATO_BASE} AND ({{clienteId}} = 0 OR K.CLIENTE_ID = {{clienteId}})) T
JOIN (SELECT COUNT(*) AS CLIENTES_SEM_CONTATO FROM CC_CLIENTE C
  ${EU}
  WHERE ${clienteVisivel('C')} AND NOT EXISTS (SELECT 1 FROM CC_CONTATO_CLIENTE K2 WHERE K2.CLIENTE_ID = C.ID)) S ON 1 = 1`;

const FILTRO_MEMBRO = `('{{cargo}}' = '' OR M.CARGO = '{{cargo}}')
  AND ({{ativo}} = -1 OR M.ATIVO = ({{ativo}} = 1))
  AND ('{{busca}}' = '' OR UPPER(M.NOME_CHAVE) LIKE CONCAT('%', '{{busca}}', '%') OR UPPER(M.USER_EMAIL) LIKE CONCAT('%', '{{busca}}', '%'))`;

// Parâmetro em vigor na carteira pedida (D-05): a coluna de catálogo D.CHAVE no lugar do literal de PARAM().
const REF_PARAM = `(CASE WHEN D.COM_VIGENCIA = TRUE AND '{{data}}' <> '' THEN '{{data}}' ELSE ${HOJE_SQL} END)`;
const CART_PARAM = `(CASE WHEN D.POR_CARTEIRA = TRUE AND '{{carteira}}' IN ('ESTETICA', 'PUBLICA') THEN '{{carteira}}' ELSE '-' END)`;
const LINHA_PARAM = (coluna, carteira) => `(SELECT P.${coluna} FROM CC_PARAMETRO P WHERE P.CHAVE = D.CHAVE AND P.CARTEIRA = ${carteira}
      AND P.VIGENCIA_INICIO <= ${REF_PARAM} ORDER BY P.VIGENCIA_INICIO DESC LIMIT 1)`;

const SQL_PARAMETRO_LISTAR = `SELECT D.CHAVE, D.GRUPO, D.ORDEM, D.ROTULO, D.TIPO, D.UNIDADE, D.OPCOES, D.POR_CARTEIRA, D.COM_VIGENCIA,
  D.SPEC_DONA, D.USADO_POR, D.DESCRICAO, D.PADRAO, D.MINIMO, D.MAXIMO,
  ${LINHA_PARAM('VALOR', "''")} AS VALOR_PADRAO,
  ${LINHA_PARAM('VALOR', CART_PARAM)} AS VALOR_CARTEIRA,
  COALESCE(${LINHA_PARAM('VALOR', CART_PARAM)}, ${LINHA_PARAM('VALOR', "''")}) AS VALOR_EFETIVO,
  CASE WHEN ${LINHA_PARAM('VALOR', CART_PARAM)} IS NOT NULL THEN ${LINHA_PARAM('VIGENCIA_INICIO', CART_PARAM)}
       ELSE ${LINHA_PARAM('VIGENCIA_INICIO', "''")} END AS VIGENCIA_INICIO,
  D.VALIDADO
FROM CC_PARAMETRO_DEF D
WHERE ('{{grupo}}' = '' OR D.GRUPO = '{{grupo}}')
ORDER BY D.GRUPO, D.ORDEM, D.CHAVE
LIMIT 500`;

const MES_INDICE = (expr) => `(CAST(SUBSTRING(${expr}, 1, 4) AS SIGNED) * 12 + CAST(SUBSTRING(${expr}, 6, 2) AS SIGNED))`;
const VALIDACAO_VENCIDA = `(${MES_INDICE(HOJE_SQL)} - ${MES_INDICE('X.VALIDADO_EM')} > ${PARAM_NUM('com.modeloRevalidarMeses')}
  OR (${MES_INDICE(HOJE_SQL)} - ${MES_INDICE('X.VALIDADO_EM')} = ${PARAM_NUM('com.modeloRevalidarMeses')}
      AND CAST(SUBSTRING(${HOJE_SQL}, 9, 2) AS SIGNED) >= CAST(SUBSTRING(X.VALIDADO_EM, 9, 2) AS SIGNED)))`;

const FILTRO_EMAIL = `((({{clienteId}} > 0 AND E.CLIENTE_ID = {{clienteId}}) AND C.ID IS NOT NULL AND ${clienteVisivel('C')})
    OR ({{clienteId}} = 0 AND EU.VE_TUDO = 1))
  AND ('{{origem}}' = '' OR E.ORIGEM = '{{origem}}')
  AND ('{{de}}' = '' OR E.ENVIADO_EM >= '{{de}}')
  AND ('{{ate}}' = '' OR E.ENVIADO_EM <= CONCAT('{{ate}}', 'T23:59:59'))
  AND ('{{busca}}' = '' OR E.PARA LIKE CONCAT('%', '{{busca}}', '%') OR E.ASSUNTO LIKE CONCAT('%', '{{busca}}', '%'))`;
const FROM_EMAIL = `FROM CC_EMAIL_ENVIADO E
${EU}
LEFT JOIN CC_CLIENTE C ON C.ID = E.CLIENTE_ID`;

const FILTRO_AUDITORIA = `(${podeAdministrarEm('EU')}
    OR ({{clienteId}} > 0 AND ${NIVEL_MIN(2, 'EU')} AND C.ID IS NOT NULL AND ${clienteVisivel('C')}))
  AND ('{{area}}' = '' OR X.AREA = '{{area}}')
  AND ('{{entidade}}' = '' OR X.ENTIDADE = '{{entidade}}')
  AND ({{entidadeId}} = 0 OR X.ENTIDADE_ID = {{entidadeId}})
  AND ({{clienteId}} = 0 OR X.CLIENTE_ID = {{clienteId}})
  AND ({{membroId}} = 0 OR X.POR = {{membroId}})
  AND ('{{de}}' = '' OR X.EM >= '{{de}}')
  AND ('{{ate}}' = '' OR X.EM <= CONCAT('{{ate}}', 'T23:59:59'))`;
const FROM_AUDITORIA = `FROM CC_AUDITORIA X
${EU}
LEFT JOIN CC_CLIENTE C ON C.ID = X.CLIENTE_ID`;

const FILTRO_SINCRONIZACAO = `${podeAdministrarEm('EU')}
  AND ('{{dia}}' = '' OR SUBSTRING(COALESCE(S.INICIO, S.SOLICITADA_EM), 1, 10) = '{{dia}}')
  AND ('{{situacao}}' = '' OR S.SITUACAO = '{{situacao}}')`;

/* ── constantes de definição do sistema ── */

const AREAS_CONTATO = ['Financeiro', 'Diretoria / gabinete', 'Compras / licitações', 'Gestão do contrato', 'Jurídico', 'Recepção / geral', 'Outro'];
const FUNCOES_CONTATO = ['Contas a pagar', 'Tesoureiro(a)', 'Gerente financeiro', 'Sócio(a)', 'Diretor(a)', 'Secretário(a)', 'Ordenador de despesa',
  'Fiscal do contrato', 'Gestor do contrato', 'Comprador(a)', 'Pregoeiro(a)', 'Advogado(a)', 'Recepcionista'];
const SITUACOES_CONTATO = ['CONFIRMADO', 'PENDENTE', 'SEM_SUCESSO', 'NAO_USAR'];
const FORMATOS_ANEXO = { pdf: ['application/pdf'], png: ['image/png'], jpg: ['image/jpeg', 'image/jpg'], jpeg: ['image/jpeg', 'image/jpg'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] };
// Ordem fixa da rotina (01 §11). Passo cuja SF não foi publicada (id 0) é pulado sem linha.
const PASSOS = [['ACESSOS', 'ccBaseAcessosConciliar'], ['REGUA', 'ccCobRotina'], ['CREDITO', 'ccCredRotina'], ['PUBLICO', 'ccPubRotina'], ['FOTO', 'ccPainelRotina']];

/* ── regra pura colada nas JS ── */

// montarEmail da lib, inlinado como a própria lib faz (01 §13): o bloco "modelo de e-mail" do motor.
const MOTOR = readFileSync(fileURLToPath(import.meta.resolve('@benenutri/mitra-kanban/motor')), 'utf8');
const [INI_EMAIL, FIM_EMAIL] = [MOTOR.indexOf('export const EMAIL_CORES'), MOTOR.indexOf('// Data ISO')];
if (INI_EMAIL < 0 || FIM_EMAIL <= INI_EMAIL) throw new Error('@benenutri/mitra-kanban/motor mudou: marcadores do bloco de e-mail não encontrados.');
const FONTE_EMAIL = MOTOR.slice(INI_EMAIL, FIM_EMAIL).replace(/^export /gm, '');

// validarConjunto de cada grupo, dos lib/parametros presentes (cada função é autocontida, 01 §9).
const { validacoes } = fundir(await carregarArquivosDeParametros());
const FONTE_VALIDACOES = `const VALIDAR_CONJUNTO = {\n${Object.entries(validacoes).map(([g, fn]) => `  ${JSON.stringify(g)}: ${String(fn)},`).join('\n')}\n};`;

/** Contexto de `calcularPosicao` (leitura e títulos ao vivo), lido uma vez por chamada. */
async function contextoPosicao() {
  const p = await parametros('');
  const pe = await parametros('ESTETICA');
  const pp = await parametros('PUBLICA');
  const uf = String(p['base.calendarioUf'] || 'DF').toUpperCase();
  const feriados = (await ler(`SELECT DATA FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL' OR (ABRANGENCIA = 'UF' AND UF = ${q(uf)})`)).map((l) => l.DATA);
  const buDoDepto = {};
  for (const l of await ler('SELECT CODEPTO, BU_ID FROM CC_BU_DEPTO')) buDoDepto[inteiro(l.CODEPTO)] = l.BU_ID === null || l.BU_ID === undefined ? null : inteiro(l.BU_ID);
  const carteiraDaBu = {};
  const nomeDaBu = {};
  for (const b of await ler('SELECT ID, NOME, CARTEIRA FROM CC_BU')) { carteiraDaBu[inteiro(b.ID)] = b.CARTEIRA; nomeDaBu[inteiro(b.ID)] = b.NOME; }
  return {
    hoje: hoje(), feriados, buDoDepto, carteiraDaBu, nomeDaBu, params: p,
    cobrancasExcluidas: p['base.cobrancasExcluidas'] || '',
    vencimentoDiaNaoUtil: { PRIVADA: p['base.vencimentoDiaNaoUtil'], ESTETICA: pe['base.vencimentoDiaNaoUtil'], PUBLICA: pp['base.vencimentoDiaNaoUtil'] },
    comprasJanelaDias: Number(p['base.comprasJanelaDias']) || 90,
  };
}

/** Destinatário, valores e texto de um e-mail (prévia e envio usam o mesmo preenchimento, RF-036). */
async function prepararEmail(m, e) {
  const clienteId = inteiro(e.clienteId);
  const codigo = texto(e.codigo, 40);
  let extras = {};
  try {
    extras = e.extras && typeof e.extras === 'object' ? e.extras : (JSON.parse(String(e.extras || '{}')) || {});
  } catch { return { erro: 'Campos extras inválidos.' }; }
  const cliente = await clienteVisivelAo(m, clienteId);
  if (!cliente) return { erro: MSG.CLIENTE_NAO_ENCONTRADO };
  const [modelo] = await ler(`SELECT * FROM CC_MODELO_MENSAGEM WHERE CODIGO = ${q(codigo)} AND ATIVO = TRUE`);
  if (!modelo) return { erro: 'Modelo não encontrado.' };
  const carteira = cliente.SETOR === 'PUBLICO' ? 'PUBLICA' : (extras.carteira === 'ESTETICA' ? 'ESTETICA' : '');
  const p = await parametros(carteira);
  const hojeData = hoje();
  const revalidar = Number(p['com.modeloRevalidarMeses']) || 12;
  const validado = !ehVerdade(modelo.EFEITO_LEGAL)
    || (inteiro(modelo.VALIDADO_VERSAO) === inteiro(modelo.VERSAO) && String(modelo.VALIDADO_EM || '').slice(0, 10) > somarMeses(hojeData, -revalidar));
  const contatos = await ler(`SELECT ID, NOME, EMAIL, PRINCIPAL, SITUACAO FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ${clienteId} ORDER BY ID`);
  const comEmail = contatos.filter((c) => String(c.EMAIL || '').trim() !== '' && c.SITUACAO !== 'NAO_USAR');
  const escolhido = inteiro(e.contatoId) ? contatos.find((c) => inteiro(c.ID) === inteiro(e.contatoId)) : null;
  if (inteiro(e.contatoId) && !escolhido) return { erro: 'Contato não encontrado.' };
  const contato = escolhido || comEmail.find((c) => ehVerdade(c.PRINCIPAL)) || comEmail[0] || null;
  const informado = texto(e.para, 500);
  const para = informado || String(contato?.EMAIL || '').trim();
  const [posicao] = extras.carteira
    ? await ler(`SELECT * FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ${clienteId} AND CARTEIRA = ${q(extras.carteira)}`)
    : await ler(`SELECT * FROM CC_POSICAO_CLIENTE WHERE CLIENTE_ID = ${clienteId}`);
  const [agente] = cliente.AGENTE_ID ? await ler(`SELECT NOME FROM CC_MEMBRO WHERE ID = ${inteiro(cliente.AGENTE_ID)}`) : [];
  const valores = valoresComuns({ cliente, posicao: posicao || {}, contato: informado ? null : contato, agente: agente ? agente.NOME : null, com: p, hoje: hojeData });
  for (const [k, v] of Object.entries(extras)) if (k !== 'carteira') valores[String(k).replace(/^\[|\]$/g, '')] = v;
  const r = renderizar({ assunto: e.assunto || modelo.ASSUNTO, corpo: e.corpo || modelo.CORPO }, valores);
  return { cliente, modelo, validado, para, assunto: r.assunto, corpo: r.corpo, faltando: r.faltando, com: p };
}

/* ── corpos JAVASCRIPT ── */

const corpoSessao = async () => {
  const s = await sessao();
  // `hoje`: o dia do relógio único (01 §3; o mesmo de HOJE_SQL), para a tela não usar a data do navegador.
  if (!s.membroId) return { ok: true, membro: null, hoje: hoje() };
  return { ok: true, membro: { userId: s.userId, membroId: s.membroId, nome: s.nome, cargo: s.cargo, nivel: s.nivel, admin: s.admin, veTudo: s.veTudo }, hoje: hoje() };
};

const corpoClienteFicha = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const id = inteiro(event.clienteId);
  const codcli = inteiro(event.codcli);
  const doc = digitos(event.documento);
  if (!id && !codcli && !doc) return recusar('Informe o cliente.');
  const onde = id ? `C.ID = ${id}` : (codcli ? `C.CODCLI = ${codcli}` : `C.DOCUMENTO = ${q(doc)}`);
  const [existe] = await ler(`SELECT C.ID FROM CC_CLIENTE C WHERE ${onde} ORDER BY C.ID LIMIT 1`);
  if (!existe) {
    // Fora do sistema (RF-012): só quem vê tudo consulta o cadastro do Winthor.
    if (id || !m.veTudo) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
    let w;
    try {
      w = linhasDe(await escrever('ccBaseWinthorCliente', { codcli, documento: doc }));
    } catch {
      return { ok: true, cliente: null, foraDoSistema: true, winthor: null, erroWinthor: MSG.WINTHOR_FORA };
    }
    if (!w.length) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
    const c = w[0];
    return {
      ok: true, cliente: null, foraDoSistema: true,
      winthor: { codcli: inteiro(c.CODCLI), nome: c.CLIENTE, documento: digitos(c.CGCENT), uf: c.ESTENT || '', municipio: c.MUNICENT || '', ramo: c.RAMO || '', limite: Number(c.LIMCRED || 0) },
    };
  }
  const cliente = await clienteVisivelAo(m, existe.ID);
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const cid = inteiro(cliente.ID);
  const [extra] = await ler(`SELECT COALESCE(PL.DESCRICAO, '') AS PLANO_DESCRICAO, COALESCE(PL.PRAZO_MEDIO, 0) AS PLANO_PRAZO,
  AG.ID AS AGENTE_ID, AG.NOME AS AGENTE_NOME, AN.ID AS ANALISTA_ID, AN.NOME AS ANALISTA_NOME, ${SQL_SIT_FICHA} AS SITUACAO_FICHA
FROM CC_CLIENTE C ${SQL_PRM}
LEFT JOIN CC_PLANO_PAGAMENTO PL ON PL.CODIGO = C.PLANO_COD
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
WHERE C.ID = ${cid}`);
  const [posicao] = await ler(`SELECT * FROM CC_POSICAO_CLIENTE WHERE CLIENTE_ID = ${cid}`);
  const porBu = await ler(`SELECT PB.*, COALESCE(B.NOME, 'Sem BU') AS BU_NOME FROM CC_POSICAO_CLIENTE_BU PB LEFT JOIN CC_BU B ON B.ID = PB.BU_ID
WHERE PB.CLIENTE_ID = ${cid} AND (PB.VENCIDO + PB.A_VENCER) > 0 ORDER BY COALESCE(B.ORDEM, 999), PB.BU_ID`);
  const porCarteira = await ler(`SELECT * FROM CC_POSICAO_CLIENTE_CARTEIRA WHERE CLIENTE_ID = ${cid} AND (VENCIDO + A_VENCER) > 0 ORDER BY CARTEIRA`);
  const contatos = await ler(`SELECT * FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ${cid} ORDER BY PRINCIPAL DESC, NOME, ID`);
  return {
    ok: true,
    cliente: { ...cliente, PLANO_DESCRICAO: extra.PLANO_DESCRICAO, PLANO_PRAZO: extra.PLANO_PRAZO, AGENTE_NOME: extra.AGENTE_NOME || '', ANALISTA_NOME: extra.ANALISTA_NOME || '', SITUACAO_FICHA: extra.SITUACAO_FICHA },
    posicao: posicao || null, porBu, porCarteira, contatos,
    agente: extra.AGENTE_ID ? { id: inteiro(extra.AGENTE_ID), nome: extra.AGENTE_NOME } : null,
    analista: extra.ANALISTA_ID ? { id: inteiro(extra.ANALISTA_ID), nome: extra.ANALISTA_NOME } : null,
  };
};

const corpoTitulosAbertos = async () => {
  const m = await quem();
  if (!m.membroId && !m.rotina) return recusar(MSG.NAO_MEMBRO);
  const cliente = await clienteVisivelAo(m, event.clienteId);
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  let rows;
  try {
    rows = linhasDe(await escrever('ccBaseWinthorTitulos', { codcli: inteiro(cliente.CODCLI) }));
  } catch {
    return { ok: true, linhas: [], total: 0, erroWinthor: MSG.WINTHOR_FORA };
  }
  // Uma linha por título × departamento → títulos e itens para o mesmo cálculo da leitura.
  const titulos = new Map();
  const itens = new Map();
  for (const r of rows) {
    titulos.set(`${r.NUMTRANSVENDA}|${r.PREST}`, r);
    if (r.CODEPTO !== null && r.CODEPTO !== undefined) itens.set(`${r.NUMTRANSVENDA}|${r.CODEPTO}`, { NUMTRANSVENDA: r.NUMTRANSVENDA, CODEPTO: r.CODEPTO, VALOR: r.ITEM_VALOR });
  }
  const ctx = await contextoPosicao();
  const calc = calcularPosicao([...titulos.values()], [...itens.values()], { ...ctx, publicos: cliente.SETOR === 'PUBLICO' ? [cliente.CODCLI] : [] });
  const carteira = texto(event.carteira, 10);
  const linhas = calc.linhas
    .filter((l) => (!carteira || l.CARTEIRA === carteira) && (!inteiro(event.soVencidos) || l.DIAS_ATRASO > 0))
    .map(({ CODCLI, ...l }) => l)
    .sort((a, b) => (a.VENCIMENTO_EFETIVO < b.VENCIMENTO_EFETIVO ? -1 : a.VENCIMENTO_EFETIVO > b.VENCIMENTO_EFETIVO ? 1 : 0));
  return { ok: true, linhas, total: linhas.length };
};

const corpoEquipeConferir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const membros = await ler(`SELECT M.ID, M.NOME, M.CARGO, M.SUPERIOR_ID, M.CAMINHO, M.ATIVO,
  CASE WHEN EXISTS (SELECT 1 FROM INT_USER U WHERE LOWER(U.DESCR) = M.USER_EMAIL) THEN 1 ELSE 0 END AS TEM_USUARIO FROM CC_MEMBRO M`);
  const [s] = await ler('SELECT COUNT(*) AS N FROM CC_CLIENTE WHERE AGENTE_ID IS NULL');
  return { ok: true, ...conferirEquipe(membros), clientesSemAgente: inteiro(s.N) };
};

const corpoWinthorDescobrir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const pedidas = String(event.tabelas || '').split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  let colunas;
  try {
    colunas = linhasDe(await sdk.runQueryMitra({ projectId, sql: SQL_COLUNAS, jdbcId: Number('__JDBC_WINTHOR__') }));
  } catch {
    return recusar(MSG.WINTHOR_FORA);
  }
  const reais = {};
  for (const c of colunas) (reais[c.TABLE_NAME] ||= []).push(c.COLUMN_NAME);
  const tabelas = Object.entries(COLUNAS_LIDAS)
    .filter(([t]) => !pedidas.length || pedidas.includes(t))
    .map(([tabela, lidas]) => ({ tabela, colunas: reais[tabela] || [], ausentes: lidas.filter((c) => !(reais[tabela] || []).includes(c)) }));
  const resumo = tabelas.map((t) => `${t.tabela}:${t.colunas.length}/${t.ausentes.length}`).join(' ');
  await escrever('ccEscBaseEstado', { chave: 'winthor.descoberta', valor: texto(resumo, 500), membroId: m.membroId, agora: agora() });
  return { ok: true, tabelas };
};

const corpoClienteAtribuir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor, Gerente, Diretoria ou Administrador redistribui clientes.');
  const ids = listaIds(event.clienteIds);
  if (!ids.length) return recusar('Informe os clientes.');
  if (ids.length > 20) return recusar('Até 20 clientes por vez.');
  const agenteId = inteiro(event.agenteId);
  const clientes = await ler(`SELECT C.ID, C.NOME, C.AGENTE_ID, C.NO_JURIDICO, AG.NOME AS AGENTE_NOME, AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO
FROM CC_CLIENTE C LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
WHERE C.ID IN (${ids.join(', ')})`);
  if (clientes.length !== ids.length || clientes.some((c) => !visivel(m, c))) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  if (!m.veTudo && clientes.some((c) => !c.AGENTE_ID)) return recusar('Só quem vê todos os clientes atribui cliente sem agente.');
  let destino = { NOME: '' };
  if (!agenteId) {
    if (!m.veTudo) return recusar('Só quem vê todos os clientes pode deixar cliente sem agente.');
  } else {
    [destino] = await ler(`SELECT ID, NOME, CARGO, CAMINHO, ATIVO FROM CC_MEMBRO WHERE ID = ${agenteId}`);
    if (!destino || !ehVerdade(destino.ATIVO) || !['AGENTE', 'SUPERVISOR', 'GERENTE'].includes(destino.CARGO)) {
      return recusar('O destino precisa ser um Agente, Supervisor ou Gerente ativo.');
    }
    if (!m.veTudo && !String(destino.CAMINHO).startsWith(m.caminho)) return recusar('O destino está fora da sua equipe.');
  }
  const mudam = clientes.filter((c) => inteiro(c.AGENTE_ID) !== agenteId);
  if (!mudam.length) return { ok: true, alterados: 0 };
  await escrever('ccEscBaseClienteAgente', { ids: mudam.map((c) => c.ID).join(','), agenteId, membroId: m.membroId, agora: agora() });
  const [conf] = await ler(`SELECT COUNT(*) AS N FROM CC_CLIENTE WHERE ID IN (${mudam.map((c) => c.ID).join(', ')}) AND COALESCE(AGENTE_ID, 0) = ${agenteId}`);
  if (inteiro(conf.N) !== mudam.length) return recusar(MSG.SEM_PERMISSAO);
  await auditarLinhas('Atribuição', 'CLIENTE', mudam.map((c) => ({
    entidadeId: c.ID, clienteId: c.ID, campo: 'Agente', antes: c.AGENTE_NOME || '', depois: destino.NOME || '', nome: c.NOME,
  })), m);
  return { ok: true, alterados: mudam.length };
};

const corpoClienteClassificar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor, Gerente, Diretoria ou Administrador classifica o cliente.');
  const cliente = await clienteVisivelAo(m, event.clienteId);
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const grupo = texto(event.grupoEconomico, 120);
  const esfera = texto(event.esfera, 10).toUpperCase();
  if (esfera && !['MUNICIPAL', 'ESTADUAL', 'FEDERAL'].includes(esfera)) return recusar('Esfera: use Municipal, Estadual ou Federal.');
  if (esfera && cliente.SETOR !== 'PUBLICO') return recusar('Esfera só se informa para cliente do setor público.');
  const mudancas = [];
  if ((cliente.GRUPO_ECONOMICO || '') !== grupo) mudancas.push({ campo: 'Grupo econômico', antes: cliente.GRUPO_ECONOMICO || '', depois: grupo });
  if ((cliente.ESFERA || '') !== esfera) mudancas.push({ campo: 'Esfera', antes: cliente.ESFERA || '', depois: esfera });
  if (!mudancas.length) return { ok: true };
  await escrever('ccEscBaseClienteClassificar', { clienteId: cliente.ID, grupoEconomico: grupo, esfera, membroId: m.membroId, agora: agora() });
  const [c] = await ler(`SELECT GRUPO_ECONOMICO FROM CC_CLIENTE WHERE ID = ${inteiro(cliente.ID)}`);
  if (!c || (c.GRUPO_ECONOMICO || '') !== grupo) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Clientes', 'CLIENTE', cliente.ID, cliente.ID, mudancas, m);
  return { ok: true };
};

const corpoContatoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const cliente = await clienteVisivelAo(m, event.clienteId);
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const clienteId = inteiro(cliente.ID);
  const c = {
    nome: texto(event.nome, 120), area: texto(event.area, 40), funcao: texto(event.funcao, 60), telefone: texto(event.telefone, 40),
    whatsapp: texto(event.whatsapp, 40), email: texto(event.email, 160).toLowerCase(), situacao: texto(event.situacao, 12) || 'PENDENTE', obs: texto(event.obs, 500),
  };
  if (!c.nome) return recusar('Informe o nome do contato.');
  if (!c.telefone && !c.whatsapp && !c.email) return recusar('Informe telefone, WhatsApp ou e-mail.');
  if (c.email && !emailValido(c.email)) return recusar('E-mail inválido: use nome@domínio.ext.');
  if (!SITUACOES_CONTATO.includes(c.situacao)) return recusar('Situação do contato inválida.');
  if (c.area && !AREAS_CONTATO.includes(c.area)) return recusar('Área do contato inválida.');
  if (c.funcao && !FUNCOES_CONTATO.includes(c.funcao)) return recusar('Função do contato inválida.');
  const todos = await ler(`SELECT * FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ${clienteId} ORDER BY ID`);
  const contatoId = inteiro(event.contatoId);
  const atual = contatoId ? todos.find((x) => inteiro(x.ID) === contatoId) : null;
  if (contatoId && !atual) return recusar('Contato não encontrado.');
  const outroPrincipal = todos.find((x) => ehVerdade(x.PRINCIPAL) && inteiro(x.ID) !== contatoId);
  // Primeiro contato do cliente nasce principal; o único principal não perde a marca (RN-021).
  let principal = inteiro(event.principal) === 1 || !outroPrincipal;
  if (atual && ehVerdade(atual.PRINCIPAL) && !principal && !outroPrincipal) principal = true;
  if (principal && c.situacao === 'NAO_USAR') return recusar('O contato principal não pode estar como Não usar mais.');
  const busca = normalizarTexto(`${c.nome} ${c.email} ${c.telefone}`);
  const agoraTxt = agora();
  const base = { clienteId, ...c, principal: principal ? 1 : 0, busca, membroId: m.membroId, agora: agoraTxt };
  let id = contatoId;
  const mudancas = [];
  if (!atual) {
    await escrever('ccEscBaseContatoInserir', { ...base, principal: principal && !outroPrincipal ? 1 : 0 });
    const [novo] = await ler(`SELECT MAX(ID) AS ID FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ${clienteId} AND ATUALIZADO_EM = ${q(agoraTxt)} AND NOME = ${q(c.nome)}`);
    id = inteiro(novo && novo.ID);
    if (!id) return recusar(MSG.SEM_PERMISSAO);
    if (principal && outroPrincipal) await escrever('ccEscBaseContatoAtualizar', { ...base, id, mudou: 1 });
    mudancas.push({ campo: '(criação)', antes: '', depois: `${c.nome}${c.email ? ` <${c.email}>` : ''}${principal ? ' (principal)' : ''}` });
  } else {
    const rotulos = { nome: 'NOME', area: 'AREA', funcao: 'FUNCAO', telefone: 'TELEFONE', whatsapp: 'WHATSAPP', email: 'EMAIL', situacao: 'SITUACAO', obs: 'OBS' };
    for (const [k, col] of Object.entries(rotulos)) if (String(atual[col] ?? '') !== c[k]) mudancas.push({ campo: col, antes: atual[col] ?? '', depois: c[k] });
    if (ehVerdade(atual.PRINCIPAL) !== principal) mudancas.push({ campo: 'PRINCIPAL', antes: ehVerdade(atual.PRINCIPAL), depois: principal });
    if (mudancas.length) {
      await escrever('ccEscBaseContatoAtualizar', { ...base, id, mudou: 1 });
      const [rel] = await ler(`SELECT NOME, PRINCIPAL FROM CC_CONTATO_CLIENTE WHERE ID = ${id}`);
      if (!rel || rel.NOME !== c.nome || ehVerdade(rel.PRINCIPAL) !== principal) return recusar(MSG.SEM_PERMISSAO);
    }
  }
  await escrever('ccEscBaseContatosRevisar', { clienteId, membroId: m.membroId, agora: agoraTxt });
  if (mudancas.length) await auditar('Contatos', 'CONTATO_CLIENTE', id, clienteId, mudancas, m);
  return { ok: true, contatoId: id };
};

const corpoContatosRevisar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const cliente = await clienteVisivelAo(m, event.clienteId);
  if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const agoraTxt = agora();
  await escrever('ccEscBaseContatosRevisar', { clienteId: cliente.ID, membroId: m.membroId, agora: agoraTxt });
  const [c] = await ler(`SELECT CONTATOS_REVISADO_EM FROM CC_CLIENTE WHERE ID = ${inteiro(cliente.ID)}`);
  if (!c || c.CONTATOS_REVISADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Contatos', 'CLIENTE', cliente.ID, cliente.ID, [{ campo: 'Ficha revisada', antes: cliente.CONTATOS_REVISADO_EM || '', depois: agoraTxt }], m);
  return { ok: true, revisadoEm: agoraTxt };
};

const corpoMembroSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const todos = await ler('SELECT ID, NOME, NOME_CHAVE, USER_EMAIL, CARGO, NIVEL, SUPERIOR_ID, CAMINHO, ADMIN, ATIVO FROM CC_MEMBRO');
  const id = inteiro(event.membroId);
  const atual = id ? todos.find((x) => inteiro(x.ID) === id) : null;
  if (id && !atual) return recusar('Membro não encontrado.');
  const nome = texto(event.nome, 120).replace(/\s+/g, ' ');
  const chave = nomeChave(nome);
  const email = texto(event.userEmail, 160).toLowerCase();
  const cargo = texto(event.cargo, 12).toUpperCase();
  const superiorId = inteiro(event.superiorId);
  const admin = inteiro(event.admin) === 1;
  const ativo = event.ativo === undefined || event.ativo === '' ? true : inteiro(event.ativo) === 1;
  if (!nome) return recusar('Informe o nome.');
  if (todos.some((x) => x.NOME_CHAVE === chave && inteiro(x.ID) !== id)) return recusar('Já existe um membro com esse nome.');
  if (!emailValido(email)) return recusar('Informe o e-mail de login.');
  if (todos.some((x) => x.USER_EMAIL === email && inteiro(x.ID) !== id)) return recusar('E-mail já usado por outro membro.');
  const nivel = nivelDoCargo(cargo);
  if (nivel === null) return recusar('Cargo inválido.');
  // D-014: ninguém altera o próprio cargo, superior, marca ou situação; cargo de nível ≥ 3 só é dado por quem
  // tem CARGO de nível igual ou maior (a marca ADMIN não conta).
  const PROPRIO = 'Ninguém altera o próprio cargo, superior, marca ou situação.';
  if (atual && id === inteiro(m.membroId) && (cargo !== atual.CARGO || superiorId !== inteiro(atual.SUPERIOR_ID)
    || admin !== ehVerdade(atual.ADMIN) || ativo !== ehVerdade(atual.ATIVO))) return recusar(PROPRIO);
  if (nivel >= 3 && (!atual || atual.CARGO !== cargo) && !(m.nivel >= nivel)) {
    return recusar('Cargo de Gerente ou Diretoria só é dado por quem tem cargo de nível igual ou maior.');
  }
  let superior = null;
  const trocaDeTopo = !superiorId && atual && cargo === 'DIRETORIA' && ativo && ehVerdade(atual.ATIVO) && atual.SUPERIOR_ID !== null && atual.SUPERIOR_ID !== undefined;
  const jaETopo = !superiorId && atual && (atual.SUPERIOR_ID === null || atual.SUPERIOR_ID === undefined);
  const topo = trocaDeTopo ? todos.find((x) => (x.SUPERIOR_ID === null || x.SUPERIOR_ID === undefined) && ehVerdade(x.ATIVO) && inteiro(x.ID) !== id) : null;
  if (!superiorId) {
    if (!trocaDeTopo && !jaETopo) return recusar('Já existe o topo da hierarquia: informe o superior.');
    if (topo && inteiro(topo.ID) === inteiro(m.membroId)) return recusar(PROPRIO);
  } else {
    superior = todos.find((x) => inteiro(x.ID) === superiorId);
    if (!superior || !ehVerdade(superior.ATIVO) || !['SUPERVISOR', 'GERENTE', 'DIRETORIA'].includes(superior.CARGO)) {
      return recusar('O superior precisa ser Supervisor, Gerente ou Diretoria ativo.');
    }
    if (atual && (superiorId === id || String(superior.CAMINHO).includes(`/${id}/`))) return recusar('A mudança criaria um ciclo na hierarquia.');
  }
  const mudaMarca = atual ? admin !== ehVerdade(atual.ADMIN) : admin;
  if (mudaMarca && !m.admin) return recusar('Só quem tem a marca de Administrador pode marcá-la ou desmarcá-la.');
  if (atual && ehVerdade(atual.ADMIN) && ehVerdade(atual.ATIVO) && (!admin || !ativo)
    && !todos.some((x) => inteiro(x.ID) !== id && ehVerdade(x.ADMIN) && ehVerdade(x.ATIVO))) {
    return recusar('É preciso manter ao menos um Administrador.');
  }
  if (atual && ehVerdade(atual.ATIVO) && !ativo) {
    const [cl] = await ler(`SELECT COUNT(*) AS N FROM CC_CLIENTE WHERE AGENTE_ID = ${id}`);
    const subs = todos.filter((x) => inteiro(x.SUPERIOR_ID) === id && ehVerdade(x.ATIVO)).length;
    const nCli = inteiro(cl.N);
    if (nCli || subs) {
      const partes = [nCli ? `${nCli} ${nCli === 1 ? 'cliente' : 'clientes'}` : '', subs ? `${subs} ${subs === 1 ? 'subordinado ativo' : 'subordinados ativos'}` : ''].filter(Boolean);
      return recusar(`Não é possível inativar: tem ${partes.join(' e ')}. Redistribua antes.`);
    }
  }
  // RN-011: quem tem subordinado ativo só tem cargo que chefia.
  const subordinados = atual ? todos.filter((x) => inteiro(x.SUPERIOR_ID) === id && ehVerdade(x.ATIVO)).length : 0;
  if (subordinados && !['SUPERVISOR', 'GERENTE', 'DIRETORIA'].includes(cargo)) {
    return recusar(`Não é possível mudar o cargo: tem ${subordinados} ${subordinados === 1 ? 'subordinado ativo' : 'subordinados ativos'}. Redistribua antes.`);
  }
  const agoraTxt = agora();
  // Nível e caminho saem da própria SQL (B-01); `caminhoAntigo` é o caminho gravado, conferido pela guarda.
  const campos = { nome, nomeChave: chave, userEmail: email, cargo, superiorId, admin: admin ? 1 : 0, ativo: ativo ? 1 : 0, membroId: m.membroId, agora: agoraTxt };
  let membroId = id;
  if (!atual) {
    // Nasce com CAMINHO '' (não vê ninguém pela hierarquia, C-01) e ganha o caminho na segunda escrita.
    await escrever('ccEscBaseMembroInserir', campos);
    const [novo] = await ler(`SELECT ID FROM CC_MEMBRO WHERE USER_EMAIL = ${q(email)}`);
    membroId = inteiro(novo && novo.ID);
    if (!membroId) return recusar(MSG.SEM_PERMISSAO);
    await escrever('ccEscBaseMembroAtualizar', { ...campos, id: membroId, caminhoAntigo: '' });
  } else if (trocaDeTopo) {
    // (1) o novo topo e a sua subárvore passam a /novo/…; (2) o topo antigo e o resto passam a /novo/antigo/….
    await escrever('ccEscBaseMembroAtualizar', { ...campos, id, superiorId: 0, caminhoAntigo: atual.CAMINHO });
    if (topo) {
      await escrever('ccEscBaseMembroAtualizar', {
        id: topo.ID, nome: topo.NOME, nomeChave: topo.NOME_CHAVE, userEmail: topo.USER_EMAIL, cargo: topo.CARGO,
        superiorId: id, admin: ehVerdade(topo.ADMIN) ? 1 : 0, ativo: 1, caminhoAntigo: topo.CAMINHO, membroId: m.membroId, agora: agoraTxt,
      });
    }
  } else {
    await escrever('ccEscBaseMembroAtualizar', { ...campos, id, caminhoAntigo: atual.CAMINHO });
  }
  const caminho = superior ? `${superior.CAMINHO}${membroId}/` : `/${membroId}/`;
  const [rel] = await ler(`SELECT NOME, CARGO, ADMIN, ATIVO, CAMINHO FROM CC_MEMBRO WHERE ID = ${membroId}`);
  if (!rel || rel.NOME !== nome || rel.CARGO !== cargo || ehVerdade(rel.ADMIN) !== admin || ehVerdade(rel.ATIVO) !== ativo
    || rel.CAMINHO !== caminho) return recusar(MSG.SEM_PERMISSAO);
  const mudancas = [];
  if (!atual) mudancas.push({ campo: '(criação)', antes: '', depois: `${nome} <${email}> ${cargo}` });
  else {
    const antes = { NOME: atual.NOME, USER_EMAIL: atual.USER_EMAIL, CARGO: atual.CARGO, SUPERIOR_ID: atual.SUPERIOR_ID ?? '', ADMIN: ehVerdade(atual.ADMIN), ATIVO: ehVerdade(atual.ATIVO) };
    const depois = { NOME: nome, USER_EMAIL: email, CARGO: cargo, SUPERIOR_ID: superiorId || '', ADMIN: admin, ATIVO: ativo };
    for (const k of Object.keys(antes)) if (String(antes[k]) !== String(depois[k])) mudancas.push({ campo: k, antes: antes[k], depois: depois[k] });
  }
  if (mudancas.length) await auditar('Equipe', 'MEMBRO', membroId, null, mudancas, m);
  return { ok: true, membroId, caminho: rel.CAMINHO };
};

const corpoBuSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const buId = inteiro(event.buId);
  const nome = texto(event.nome, 80).replace(/\s+/g, ' ');
  const carteira = texto(event.carteira, 10).toUpperCase();
  const ordem = inteiro(event.ordem);
  const ativa = event.ativa === undefined || event.ativa === '' ? 1 : (inteiro(event.ativa) === 1 ? 1 : 0);
  if (!nome) return recusar('Informe o nome da BU.');
  if (!['PRIVADA', 'ESTETICA'].includes(carteira)) return recusar('Carteira da BU: Privada ou Estética.');
  const bus = await ler('SELECT ID, NOME, CARTEIRA, ORDEM, ATIVA FROM CC_BU');
  const atual = buId ? bus.find((b) => inteiro(b.ID) === buId) : null;
  if (buId && !atual) return recusar('BU não encontrada.');
  if (bus.some((b) => normalizarTexto(b.NOME) === normalizarTexto(nome) && inteiro(b.ID) !== buId)) return recusar('Já existe uma BU com esse nome.');
  await escrever('ccEscBaseBuSalvar', { buId, nome, carteira, ordem, ativa, membroId: m.membroId });
  const [rel] = await ler(`SELECT ID, NOME FROM CC_BU WHERE NOME = ${q(nome)}`);
  if (!rel) return recusar(MSG.SEM_PERMISSAO);
  const mudancas = [];
  if (!atual) mudancas.push({ campo: '(criação)', antes: '', depois: `${nome} (${carteira})` });
  else {
    for (const [k, v] of [['NOME', nome], ['CARTEIRA', carteira], ['ORDEM', ordem], ['ATIVA', ativa === 1]]) {
      const antes = k === 'ATIVA' ? ehVerdade(atual.ATIVA) : atual[k];
      if (String(antes) !== String(v)) mudancas.push({ campo: k, antes, depois: v });
    }
  }
  if (mudancas.length) await auditar('BUs', 'BU', rel.ID, null, mudancas, m);
  return { ok: true, buId: inteiro(rel.ID) };
};

const corpoBuDeptoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const codepto = inteiro(event.codepto);
  const buId = inteiro(event.buId);
  const [d] = await ler(`SELECT D.CODEPTO, D.BU_ID, COALESCE(B.NOME, '') AS BU_NOME FROM CC_BU_DEPTO D LEFT JOIN CC_BU B ON B.ID = D.BU_ID WHERE D.CODEPTO = ${codepto}`);
  if (!d) return recusar('Departamento não encontrado.');
  let destino = { NOME: '' };
  if (buId) {
    [destino] = await ler(`SELECT ID, NOME, ATIVA FROM CC_BU WHERE ID = ${buId}`);
    if (!destino || !ehVerdade(destino.ATIVA)) return recusar('A BU precisa existir e estar ativa.');
  }
  if (inteiro(d.BU_ID) === buId) return { ok: true };
  await escrever('ccEscBaseBuDepto', { codepto, buId, membroId: m.membroId, agora: agora() });
  const [rel] = await ler(`SELECT BU_ID FROM CC_BU_DEPTO WHERE CODEPTO = ${codepto}`);
  if (!rel || inteiro(rel.BU_ID) !== buId) return recusar(MSG.SEM_PERMISSAO);
  await auditar('BUs', 'BU_DEPTO', codepto, null, [{ campo: 'BU', antes: d.BU_NOME || 'Sem BU', depois: destino.NOME || 'Sem BU' }], m);
  return { ok: true };
};

const corpoParametroSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  let itens;
  try { itens = typeof event.itens === 'string' ? JSON.parse(event.itens) : event.itens; } catch { itens = null; }
  if (!Array.isArray(itens) || !itens.length) return recusar('Informe os parâmetros.');
  if (itens.length > 20) return recusar('Até 20 parâmetros por vez.');
  // D-014: alçada não se atende pela marca, nem se altera por ela (alcada.* e as chaves de nível/valor de alçada de 01 §4).
  if (itens.some((i) => ehAlcada(String((i && i.chave) || ''))) && !(m.nivel >= 3)) {
    return recusar('Parâmetros de alçada só são alterados por quem tem cargo de Gerente ou Diretoria.');
  }
  const hojeData = hoje();
  // O catálogo e os valores inteiros (poucas centenas de linhas): regra cruzada entre grupos vê o conjunto todo.
  const defs = await ler('SELECT * FROM CC_PARAMETRO_DEF ORDER BY GRUPO, ORDEM');
  const defDe = new Map(defs.map((d) => [d.CHAVE, d]));
  const linhas = await ler('SELECT CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO FROM CC_PARAMETRO');
  const motivos = [];
  const lote = [];
  for (const i of itens) {
    const d = defDe.get(texto(i && i.chave, 60));
    if (!d) { motivos.push(`${texto(i && i.chave, 60)}: parâmetro não existe.`); continue; }
    const carteira = ['ESTETICA', 'PUBLICA'].includes(String(i.carteira || '').toUpperCase()) ? String(i.carteira).toUpperCase() : '';
    if (i.carteira && !['', 'PRIVADA', 'ESTETICA', 'PUBLICA'].includes(String(i.carteira).toUpperCase())) { motivos.push(`${d.ROTULO}: carteira inválida.`); continue; }
    if (carteira && !ehVerdade(d.POR_CARTEIRA)) { motivos.push(`${d.ROTULO}: não aceita valor por carteira.`); continue; }
    const vigencia = texto(i.vigenciaInicio, 10) || hojeData;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vigencia)) { motivos.push(`${d.ROTULO}: informe a vigência como AAAA-MM-DD.`); continue; }
    if (vigencia !== hojeData && !ehVerdade(d.COM_VIGENCIA)) { motivos.push(`${d.ROTULO}: não tem vigência; vale a partir de hoje.`); continue; }
    // Vigência só de hoje em diante (B4-006 C-03): mudar o parâmetro não reescreve o passado (mês fechado, PDD por faixa).
    if (vigencia < hojeData) { motivos.push(`${d.ROTULO}: a vigência não pode começar antes de hoje.`); continue; }
    const nulo = i.valor === null || i.valor === undefined;
    // Nulo na carteira = volta a herdar; nulo na linha padrão = restaura o padrão do catálogo (RN-017).
    const valor = nulo ? (carteira ? null : String(d.PADRAO ?? '')) : String(i.valor).trim();
    if (valor !== null) { const motivo = validarValor(d, valor); if (motivo) { motivos.push(motivo); continue; } }
    lote.push({ chave: d.CHAVE, grupo: d.GRUPO, carteira, valor, vigencia });
  }
  // Conjunto final de cada carteira afetada (a linha padrão vale também para Estética e Pública) e cada data.
  const depois = linhas.filter((l) => !lote.some((x) => x.chave === l.CHAVE && x.carteira === l.CARTEIRA && x.vigencia === l.VIGENCIA_INICIO))
    .concat(lote.map((x) => ({ CHAVE: x.chave, CARTEIRA: x.carteira, VALOR: x.valor, VIGENCIA_INICIO: x.vigencia })));
  if (!motivos.length) {
    const carteiras = new Set(lote.flatMap((x) => (x.carteira ? [x.carteira] : ['', 'ESTETICA', 'PUBLICA'])));
    const datas = new Set([hojeData, ...lote.map((x) => x.vigencia)]);
    // Todo grupo valida o conjunto vigente inteiro (grupo salvo sobreposto aos atuais): a regra cruzada vale nos dois sentidos
    // (ex.: painel.sincAtrasoMin ≥ base.syncIntervaloMin recusa tanto o painel quanto a base).
    for (const c of carteiras) for (const data of datas) {
      const conjunto = efetivos(defs, depois, c, data, hojeData);
      for (const validar of Object.values(VALIDAR_CONJUNTO)) for (const mot of validar(conjunto)) if (!motivos.includes(mot)) motivos.push(mot);
    }
  }
  if (motivos.length) return recusar(motivos[0], { faltam: motivos });
  const col = (f) => lote.map((x) => String(f(x) ?? '').split('¦').join('|')).join('¦');
  await escrever('ccEscBaseParametro', {
    n: lote.length, chaves: col((x) => x.chave), carteiras: col((x) => x.carteira), valores: col((x) => x.valor),
    nulos: col((x) => (x.valor === null ? '1' : '0')), vigencias: col((x) => x.vigencia), membroId: m.membroId, agora: agora(),
  });
  const gravadas = await ler(`SELECT CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO FROM CC_PARAMETRO WHERE CHAVE IN (${lote.map((x) => q(x.chave)).join(', ')})`);
  for (const x of lote) {
    const g = gravadas.find((l) => l.CHAVE === x.chave && l.CARTEIRA === x.carteira && l.VIGENCIA_INICIO === x.vigencia);
    if (!g || (g.VALOR === null ? null : String(g.VALOR)) !== x.valor) return recusar(MSG.SEM_PERMISSAO);
  }
  const auditoria = [];
  for (const x of lote) {
    const d = [defDe.get(x.chave)];
    const antes = efetivos(d, linhas, x.carteira, x.vigencia, hojeData)[x.chave];
    const agoraVale = efetivos(d, depois, x.carteira, x.vigencia, hojeData)[x.chave];
    if (String(antes ?? '') !== String(agoraVale ?? '')) {
      auditoria.push({ entidadeId: 0, clienteId: null, campo: x.carteira ? `${x.chave}@${x.carteira}` : x.chave, antes: antes ?? '', depois: `${agoraVale ?? ''} (a partir de ${x.vigencia})` });
    }
  }
  if (auditoria.length) await auditarLinhas('Parâmetros', 'PARAMETRO', auditoria, m);
  return { ok: true, gravados: lote.length };
};

const corpoFeriadoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const feriadoId = inteiro(event.feriadoId);
  const ano = inteiro(event.gerarAno);
  if (ano > 0) {
    if (ano < 2000 || ano > 2100) return recusar('Ano inválido.');
    const lista = feriadosNacionais(ano);
    const [antes] = await ler(`SELECT COUNT(*) AS N FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL' AND DATA LIKE '${ano}-%'`);
    await escrever('ccEscBaseFeriadosInserir', { n: lista.length, datas: lista.map((f) => f.data).join('¦'), nomes: lista.map((f) => f.nome).join('¦'), membroId: m.membroId });
    const [depois] = await ler(`SELECT COUNT(*) AS N FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL' AND DATA LIKE '${ano}-%'`);
    const inseridos = inteiro(depois.N) - inteiro(antes.N);
    await auditar('Feriados', 'FERIADO', 0, null, [{ campo: '(geração)', antes: '', depois: `Nacionais de ${ano}: ${inseridos} incluídos` }], m);
    return { ok: true, inseridos };
  }
  if (inteiro(event.remover) === 1) {
    const [f] = await ler(`SELECT * FROM CC_FERIADO WHERE ID = ${feriadoId}`);
    if (!f) return recusar('Feriado não encontrado.');
    await escrever('ccEscBaseFeriadoRemover', { feriadoId, membroId: m.membroId });
    const [ainda] = await ler(`SELECT ID FROM CC_FERIADO WHERE ID = ${feriadoId}`);
    if (ainda) return recusar(MSG.SEM_PERMISSAO);
    await auditar('Feriados', 'FERIADO', feriadoId, null, [{ campo: '(remoção)', antes: `${f.DATA} ${f.NOME} (${f.ABRANGENCIA}${f.UF ? ` ${f.UF}` : ''}${f.MUNICIPIO ? ` ${f.MUNICIPIO}` : ''})`, depois: '' }], m);
    return { ok: true };
  }
  const data = texto(event.data, 10);
  const nome = texto(event.nome, 120);
  const abrangencia = texto(event.abrangencia, 10).toUpperCase();
  const uf = abrangencia === 'NACIONAL' ? '' : texto(event.uf, 2).toUpperCase();
  const municipio = abrangencia === 'MUNICIPIO' ? texto(event.municipio, 80).toUpperCase() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return recusar('Informe a data como AAAA-MM-DD.');
  if (!nome) return recusar('Informe o nome do feriado.');
  if (!['NACIONAL', 'UF', 'MUNICIPIO'].includes(abrangencia)) return recusar('Abrangência: Nacional, UF ou Município.');
  if (abrangencia !== 'NACIONAL' && !/^[A-Z]{2}$/.test(uf)) return recusar('Informe a UF.');
  if (abrangencia === 'MUNICIPIO' && !municipio) return recusar('Informe o município.');
  const [dup] = await ler(`SELECT ID FROM CC_FERIADO WHERE DATA = ${q(data)} AND ABRANGENCIA = ${q(abrangencia)} AND UF = ${q(uf)} AND MUNICIPIO = ${q(municipio)} AND ID <> ${feriadoId}`);
  if (dup) return recusar('Já existe esse feriado.');
  const [atual] = feriadoId ? await ler(`SELECT * FROM CC_FERIADO WHERE ID = ${feriadoId}`) : [];
  if (feriadoId && !atual) return recusar('Feriado não encontrado.');
  await escrever('ccEscBaseFeriado', { feriadoId, data, nome, abrangencia, uf, municipio, membroId: m.membroId });
  const [rel] = await ler(`SELECT ID FROM CC_FERIADO WHERE DATA = ${q(data)} AND ABRANGENCIA = ${q(abrangencia)} AND UF = ${q(uf)} AND MUNICIPIO = ${q(municipio)} AND NOME = ${q(nome)}`);
  if (!rel) return recusar(MSG.SEM_PERMISSAO);
  const resumo = (f) => (f ? `${f.DATA} ${f.NOME} (${f.ABRANGENCIA}${f.UF ? ` ${f.UF}` : ''}${f.MUNICIPIO ? ` ${f.MUNICIPIO}` : ''})` : '');
  await auditar('Feriados', 'FERIADO', rel.ID, null, [{ campo: atual ? 'FERIADO' : '(criação)', antes: resumo(atual), depois: resumo({ DATA: data, NOME: nome, ABRANGENCIA: abrangencia, UF: uf, MUNICIPIO: municipio }) }], m);
  return { ok: true, feriadoId: inteiro(rel.ID) };
};

const corpoModeloSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const codigo = texto(event.codigo, 40);
  const assunto = texto(event.assunto, 300);
  const corpo = String(event.corpo ?? '').trim();
  const [modelo] = await ler(`SELECT * FROM CC_MODELO_MENSAGEM WHERE CODIGO = ${q(codigo)}`);
  if (!modelo) return recusar('Modelo não encontrado.');
  if (!corpo) return recusar('Informe o corpo do modelo.');
  const desconhecidos = camposDesconhecidos(`${assunto}\n${corpo}`, modelo.CAMPOS_EXTRAS);
  if (desconhecidos.length) return recusar(`Campo desconhecido no texto: ${desconhecidos.map((c) => `[${c}]`).join(', ')}.`, { faltam: desconhecidos });
  if (assunto === (modelo.ASSUNTO || '') && corpo === modelo.CORPO) return { ok: true, versao: inteiro(modelo.VERSAO) };
  await escrever('ccEscBaseModelo', { codigo, assunto, corpo, versaoAtual: inteiro(modelo.VERSAO), membroId: m.membroId, agora: agora() });
  const [rel] = await ler(`SELECT VERSAO FROM CC_MODELO_MENSAGEM WHERE CODIGO = ${q(codigo)}`);
  if (!rel || inteiro(rel.VERSAO) !== inteiro(modelo.VERSAO) + 1) return recusar(MSG.SEM_PERMISSAO);
  const mudancas = [];
  if (assunto !== (modelo.ASSUNTO || '')) mudancas.push({ campo: 'ASSUNTO', antes: modelo.ASSUNTO || '', depois: assunto });
  if (corpo !== modelo.CORPO) mudancas.push({ campo: 'CORPO', antes: modelo.CORPO, depois: corpo });
  mudancas.push({ campo: 'VERSAO', antes: inteiro(modelo.VERSAO), depois: inteiro(rel.VERSAO) });
  await auditar('Modelos', 'MODELO_MENSAGEM', modelo.ID, null, mudancas, m);
  return { ok: true, versao: inteiro(rel.VERSAO) };
};

const corpoModeloValidar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const p = await parametros('');
  // Alçada (01 §4): cargo Jurídico ou nível ≥ com.modeloValidaNivel; a marca ADMIN não conta.
  if (m.cargo !== 'JURIDICO' && !(m.nivel >= Number(p['com.modeloValidaNivel'] || 3))) {
    return recusar('A validação de modelo é do Jurídico ou de quem tem nível de Gerente para cima.');
  }
  const codigo = texto(event.codigo, 40);
  const [modelo] = await ler(`SELECT * FROM CC_MODELO_MENSAGEM WHERE CODIGO = ${q(codigo)}`);
  if (!modelo) return recusar('Modelo não encontrado.');
  if (!ehVerdade(modelo.EFEITO_LEGAL)) return recusar('Este modelo não tem efeito legal: não precisa de validação.');
  const agoraTxt = agora();
  await escrever('ccEscBaseModeloValidar', { codigo, versao: inteiro(modelo.VERSAO), membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT VALIDADO_VERSAO, VALIDADO_EM FROM CC_MODELO_MENSAGEM WHERE CODIGO = ${q(codigo)}`);
  if (!rel || inteiro(rel.VALIDADO_VERSAO) !== inteiro(modelo.VERSAO) || rel.VALIDADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Modelos', 'MODELO_MENSAGEM', modelo.ID, null, [{ campo: 'Validação', antes: modelo.VALIDADO_VERSAO ? `versão ${modelo.VALIDADO_VERSAO}` : '', depois: `versão ${modelo.VERSAO}` }], m);
  return { ok: true, versao: inteiro(modelo.VERSAO) };
};

const corpoModeloPrever = async () => {
  const m = await quem();
  if (!m.membroId && !m.rotina) return recusar(MSG.NAO_MEMBRO);
  const r = await prepararEmail(m, event);
  if (r.erro) return recusar(r.erro);
  return { ok: true, assunto: r.assunto, corpo: r.corpo, para: r.para, validado: r.validado, faltando: r.faltando };
};

const corpoEmailEnviar = async () => {
  const m = await quem();
  if (!m.membroId && !m.rotina) return recusar(MSG.NAO_MEMBRO);
  const r = await prepararEmail(m, event);
  if (r.erro) return recusar(r.erro);
  if (!r.validado) return recusar('Modelo aguardando validação: o envio com efeito legal exige validação vigente.');
  if (!r.para) return recusar('Sem e-mail cadastrado para este cliente.');
  if (r.faltando.length) return recusar(`Faltam campos no texto: ${r.faltando.join(', ')}.`, { faltam: r.faltando });
  let anexos = [];
  try { anexos = Array.isArray(event.anexos) ? event.anexos : JSON.parse(String(event.anexos || '[]')); } catch { anexos = []; }
  const { assunto, html } = montarEmail({
    sistema: 'Crédito e Cobrança', rotulo: r.modelo.NOME, titulo: r.assunto, corpo: r.corpo, anexos,
    rodape: [r.com['com.assinatura'], r.com['com.telefone'], r.com['com.email']].filter(Boolean).join(' · '),
  });
  let resultado = 'ENVIADO';
  let erro = '';
  try {
    const envio = await sdk.sendEmailMitra({ projectId, to: r.para.split(/[;,]/).map((s) => s.trim()).filter(Boolean), subject: assunto, body: html });
    const falha = envio && (envio.status === 'error' || (envio.result && envio.result.error));
    if (falha) { resultado = 'FALHOU'; erro = texto(envio.result?.error || envio.message || 'Falha no envio.', 500); }
  } catch (e) {
    resultado = 'FALHOU';
    erro = texto(e && e.message ? e.message : String(e), 500);
  }
  const agoraTxt = agora();
  const clienteId = inteiro(r.cliente.ID);
  await escrever('ccEscBaseEmailInserir', {
    modeloId: inteiro(r.modelo.ID), modeloCodigo: r.modelo.CODIGO, modeloVersao: inteiro(r.modelo.VERSAO), clienteId, para: r.para,
    assunto: texto(r.assunto, 300), corpo: r.corpo, origem: texto(event.origem, 30) || '001-manual', referencia: texto(event.referencia, 80),
    resultado, erro, membroId: m.membroId || 0, agora: agoraTxt,
  });
  const [linha] = await ler(`SELECT MAX(ID) AS ID FROM CC_EMAIL_ENVIADO WHERE CLIENTE_ID = ${clienteId} AND ENVIADO_EM = ${q(agoraTxt)} AND MODELO_CODIGO = ${q(r.modelo.CODIGO)}`);
  const emailId = inteiro(linha && linha.ID);
  if (!emailId) return recusar(MSG.SEM_PERMISSAO);
  await auditar('E-mail', 'EMAIL_ENVIADO', emailId, clienteId, [{
    campo: '(envio)', antes: '', depois: `${r.modelo.CODIGO} v${r.modelo.VERSAO} para ${r.para}: ${resultado}${erro ? ` (${erro})` : ''}`,
  }], m);
  return resultado === 'ENVIADO' ? { ok: true, emailId, resultado } : { ok: false, error: `O envio falhou: ${erro}`, emailId, resultado };
};

const corpoAnexoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const entidade = texto(event.entidade, 20).toUpperCase();
  const entidadeId = inteiro(event.entidadeId);
  const nomeArquivo = texto(event.nomeArquivo, 255);
  const mime = texto(event.mime, 80).toLowerCase();
  const tamanho = inteiro(event.tamanhoBytes);
  const url = String(event.url ?? '').trim();
  const tipoDoc = texto(event.tipoDoc, 40);
  if (!['CLIENTE', 'MATERIAL', 'CERTIDAO'].includes(entidade)) return recusar('Tipo de registro inválido.');
  const ext = (nomeArquivo.split('.').pop() || '').toLowerCase();
  if (!FORMATOS_ANEXO[ext] || (mime && !FORMATOS_ANEXO[ext].includes(mime))) return recusar('Formato não aceito: só PDF, PNG, JPG, XLSX ou DOCX.');
  if (tamanho <= 0 || tamanho > 20 * 1024 * 1024) return recusar('O arquivo precisa ter até 20 MB.');
  if (!/^https:\/\/\S+$/.test(url)) return recusar('Endereço do arquivo inválido.');
  if (!tipoDoc) return recusar('Informe o tipo de documento.');
  let clienteId = 0;
  if (entidade === 'CLIENTE') {
    const cliente = await clienteVisivelAo(m, entidadeId);
    if (!cliente) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
    clienteId = inteiro(cliente.ID);
  } else if (entidade === 'MATERIAL' && !podeAdministrar(m)) {
    return recusar(MSG.NAO_ADMINISTRA);
  } else if (entidade === 'CERTIDAO' && !nivelMin(m, 2)) {
    return recusar('Somente Supervisor, Gerente, Diretoria ou Administrador registra certidão.');
  }
  const agoraTxt = agora();
  await escrever('ccEscBaseAnexoInserir', { entidade, entidadeId, clienteId, tipoDoc, nomeArquivo, mime, tamanhoBytes: tamanho, url, membroId: m.membroId, agora: agoraTxt });
  const [novo] = await ler(`SELECT MAX(ID) AS ID FROM CC_ANEXO WHERE ENTIDADE = ${q(entidade)} AND ENTIDADE_ID = ${entidadeId} AND ENVIADO_EM = ${q(agoraTxt)} AND ENVIADO_POR = ${inteiro(m.membroId)}`);
  const anexoId = inteiro(novo && novo.ID);
  if (!anexoId) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Anexos', 'ANEXO', anexoId, clienteId || null, [{ campo: '(criação)', antes: '', depois: `${tipoDoc}: ${nomeArquivo} (${tamanho} bytes)` }], m);
  return { ok: true, anexoId };
};

const corpoAnexoRemover = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const anexoId = inteiro(event.anexoId);
  const [a] = await ler(`SELECT * FROM CC_ANEXO WHERE ID = ${anexoId} AND REMOVIDO_EM IS NULL`);
  if (!a) return recusar('Anexo não encontrado.');
  if (a.ENTIDADE === 'CLIENTE' && !(await clienteVisivelAo(m, a.CLIENTE_ID))) return recusar('Anexo não encontrado.');
  if (inteiro(a.ENVIADO_POR) !== inteiro(m.membroId) && !nivelMin(m, 2)) return recusar('Remove quem anexou ou Supervisor para cima.');
  await escrever('ccEscBaseAnexoRemover', { anexoId, membroId: m.membroId, agora: agora() });
  const [rel] = await ler(`SELECT REMOVIDO_EM FROM CC_ANEXO WHERE ID = ${anexoId}`);
  if (!rel || !rel.REMOVIDO_EM) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Anexos', 'ANEXO', anexoId, a.CLIENTE_ID || null, [{ campo: '(remoção)', antes: `${a.TIPO_DOC}: ${a.NOME_ARQUIVO}`, depois: '' }], m);
  return { ok: true };
};

const corpoSincronizacaoPedir = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor, Gerente, Diretoria ou Administrador pede leitura.');
  const [pendente] = await ler("SELECT ID FROM CC_SINCRONIZACAO WHERE SITUACAO IN ('SOLICITADA', 'EM_ANDAMENTO') LIMIT 1");
  if (pendente) return recusar('Já há uma leitura pendente; ela roda em até 5 minutos.');
  const agoraTxt = agora();
  await escrever('ccEscBaseSincronizacaoPedir', { membroId: m.membroId, agora: agoraTxt });
  const [novo] = await ler(`SELECT ID FROM CC_SINCRONIZACAO WHERE SITUACAO = 'SOLICITADA' AND SOLICITADA_POR = ${inteiro(m.membroId)} AND SOLICITADA_EM = ${q(agoraTxt)}`);
  if (!novo) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Leitura do Winthor', 'SINCRONIZACAO', novo.ID, null, [{ campo: '(pedido)', antes: '', depois: 'Ler agora' }], m);
  return { ok: true, sincronizacaoId: inteiro(novo.ID) };
};

/* ── rotina ── */

const corpoRotina = async () => {
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina agendada executa a rotina.');
  const inicioMs = Date.now();
  const agoraTxt = agora();
  const ms = (t) => Date.parse(`${String(t).slice(0, 19)}-03:00`);
  const minutosDesde = (t) => (ms(agoraTxt) - ms(t)) / 60000;
  const dml = (sql) => sdk.runDmlMitra({ projectId, sql });
  const upsertEstado = (chave, valor) => dml(`INSERT INTO CC_ESTADO (CHAVE, VALOR, ATUALIZADO_EM) VALUES (${q(chave)}, ${q(valor)}, ${q(agoraTxt)})
ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR), ATUALIZADO_EM = VALUES(ATUALIZADO_EM)`);

  // 1. Trava: outra rodada há menos de 4 min sai; o token relido confirma quem ficou com a vez (sem rowsAffected, S-04).
  const [trava] = await ler("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'rotina.trava'");
  if (trava && minutosDesde(String(trava.VALOR).split('¦')[0]) < 4) return { ok: true, pulado: 'trava' };
  const token = `${agoraTxt}¦${Math.random().toString(36).slice(2, 10)}`;
  await upsertEstado('rotina.trava', token);
  const [relida] = await ler("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'rotina.trava'");
  if (!relida || relida.VALOR !== token) return { ok: true, pulado: 'trava' };
  await dml(`UPDATE CC_ROTINA_PASSO SET SITUACAO = 'ERRO', FIM = ${q(agoraTxt)}, ERRO = 'Passo interrompido: mais de 10 minutos em andamento.'
WHERE SITUACAO = 'EM_ANDAMENTO' AND INICIO < ${q(agora(ms(agoraTxt) - 600000))}`);

  // 2. Rodada de leitura: pedido, intervalo vencido, leitura em andamento (retoma) ou a última falhou.
  const p = await parametros('');
  const intervalo = Number(p['base.syncIntervaloMin']) || 15;
  const leituras = await ler(`SELECT ID, SITUACAO, INICIO FROM CC_SINCRONIZACAO
WHERE SITUACAO IN ('SOLICITADA', 'EM_ANDAMENTO') OR ID = (SELECT MAX(X.ID) FROM CC_SINCRONIZACAO X) ORDER BY ID`);
  const ultima = leituras[leituras.length - 1];
  let andamento = leituras.filter((l) => l.SITUACAO === 'EM_ANDAMENTO').pop() || null;
  const pedida = leituras.find((l) => l.SITUACAO === 'SOLICITADA') || null;
  let interrompida = false;
  if (andamento && minutosDesde(andamento.INICIO) >= 2 * intervalo) {
    await dml(`UPDATE CC_SINCRONIZACAO SET SITUACAO = 'ERRO', FIM = ${q(agoraTxt)},
  ERRO = 'Leitura interrompida: parada há mais de ${2 * intervalo} minutos.' WHERE ID = ${inteiro(andamento.ID)}`);
    andamento = null;
    interrompida = true;
  }
  const [inicio] = await ler('SELECT MAX(INICIO) AS INICIO FROM CC_SINCRONIZACAO');
  const ultimoInicio = inicio && inicio.INICIO;
  // B5 O-02: o intervalo não abre leitura nova enquanto a última leitura OK tem passo por fazer (até 4 intervalos,
  // para um passo que erra sempre não parar as leituras). Pedido e erro continuam abrindo leitura.
  const processando = async () => {
    const [ok] = await ler("SELECT MAX(ID) AS ID FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK'");
    if (!ok || !ok.ID) return false;
    const feitos = new Set((await ler(`SELECT PASSO FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ${inteiro(ok.ID)}
  AND SITUACAO = 'OK' AND PENDENTES = 0`)).map((l) => l.PASSO));
    return PASSOS.some(([passo, nome]) => idDe(nome) && !feitos.has(passo));
  };
  const porIntervalo = ultimoInicio && minutosDesde(ultimoInicio) >= intervalo - 1
    && (minutosDesde(ultimoInicio) >= 4 * intervalo || !ultima || ultima.SITUACAO !== 'OK' || !(await processando()));
  const lerAgora = andamento || pedida || interrompida || !ultimoInicio || (ultima && ultima.SITUACAO === 'ERRO') || porIntervalo;
  if (lerAgora) {
    let id = andamento ? inteiro(andamento.ID) : 0;
    if (!id && pedida) {
      await dml(`UPDATE CC_SINCRONIZACAO SET SITUACAO = 'EM_ANDAMENTO', INICIO = ${q(agoraTxt)} WHERE ID = ${inteiro(pedida.ID)} AND SITUACAO = 'SOLICITADA'`);
      id = inteiro(pedida.ID);
    }
    if (!id) {
      await dml(`INSERT INTO CC_SINCRONIZACAO (SITUACAO, INICIO) VALUES ('EM_ANDAMENTO', ${q(agoraTxt)})`);
      const [nova] = await ler(`SELECT MAX(ID) AS ID FROM CC_SINCRONIZACAO WHERE SITUACAO = 'EM_ANDAMENTO' AND INICIO = ${q(agoraTxt)}`);
      id = inteiro(nova && nova.ID);
    }
    try {
      const r = await escrever('ccBaseSincronizar', { sincronizacaoId: id, orcamentoExec: 149, orcamentoMs: 45000 - (Date.now() - inicioMs), membroId: 0 });
      return { ok: true, rodada: 'leitura', sincronizacaoId: id, resultado: r };
    } catch (e) {
      await dml(`UPDATE CC_SINCRONIZACAO SET SITUACAO = 'ERRO', FIM = ${q(agora())}, ERRO = ${q(texto(e.message, 1000))} WHERE ID = ${id}`);
      return { ok: false, error: e.message, rodada: 'leitura', sincronizacaoId: id };
    }
  }

  // 3. Rodada de processamento: os passos não OK da última leitura OK, em ordem, enquanto houver orçamento.
  const [ok] = await ler("SELECT MAX(ID) AS ID FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK'");
  const sincId = inteiro(ok && ok.ID);
  if (!sincId) return { ok: true, rodada: 'nada' };
  const estado = new Map((await ler(`SELECT PASSO, SITUACAO, PENDENTES FROM CC_ROTINA_PASSO WHERE SINCRONIZACAO_ID = ${sincId}`)).map((l) => [l.PASSO, l]));
  let gasto = 1;
  const executados = [];
  for (const [passo, nome] of PASSOS) {
    if (!idDe(nome)) continue;
    const linha = estado.get(passo);
    if (linha && linha.SITUACAO === 'OK' && inteiro(linha.PENDENTES) === 0) continue;
    const restanteMs = 45000 - (Date.now() - inicioMs);
    if (150 - gasto < 4 || restanteMs <= 0) break;
    const base = { sincronizacaoId: sincId, passo, membroId: 0 };
    await escrever('ccEscBaseRotinaPasso', { ...base, situacao: 'EM_ANDAMENTO', inicio: agora(), fim: '', processados: 0, pendentes: inteiro(linha && linha.PENDENTES), execucoes: 0, erro: '' });
    gasto += 1;
    let r = null;
    let erro = '';
    try {
      r = await escrever(nome, { sincronizacaoId: sincId, orcamentoExec: 150 - gasto - 1, orcamentoMs: restanteMs, membroId: 0 });
      if (r && r.ok === false) erro = r.error || 'O passo recusou.';
    } catch (e) {
      erro = e && e.message ? e.message : String(e);
    }
    const usadas = Math.max(1, inteiro(r && r.execucoes));
    gasto += usadas + 1;
    const pendentes = erro ? 0 : inteiro(r && r.pendentes);
    await escrever('ccEscBaseRotinaPasso', {
      ...base, situacao: erro ? 'ERRO' : 'OK', inicio: '', fim: agora(), processados: inteiro(r && r.processados),
      pendentes, execucoes: usadas, erro: texto(erro, 1000),
    });
    if (!erro && !pendentes) await upsertEstado(`rotina.diaCompleto.${passo}`, hoje());
    executados.push(passo);
  }
  return { ok: true, rodada: 'processamento', sincronizacaoId: sincId, executados, execucoes: gasto };
};

// Leitura do Winthor (passo SINC): cron, sem sessão; lê por runQueryMitra com o jdbcId e grava por runDmlMitra.
// Fases: PLANOS (planos e departamentos novos) → CLIENTES (página de clientes do universo: cadastro, compras,
// posição nas três tabelas, recebimentos e faturamento, o cliente inteiro na mesma página) → FECHAR (zera quem
// não veio, OK). Retomável: FASE e CURSOR (último CODCLI gravado).
const corpoSincronizar = async () => {
  const LINHAS_POR_CONSULTA = 500;
  const PAGINAS_POR_RODADA = 1000;
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina agendada lê o Winthor.');
  const id = inteiro(event.sincronizacaoId);
  const inicioMs = Date.now();
  const orcamentoMs = Number(event.orcamentoMs) || 45000;
  const jdbcId = Number('__JDBC_WINTHOR__');
  const oracle = async (sql, valores) => linhasDe(await sdk.runQueryMitra({ projectId, sql: preencher(sql, valores), jdbcId }));
  const dml = async (sql) => { await sdk.runDmlMitra({ projectId, sql }); };
  const lotes = async (linhas, montar) => { for (let i = 0; i < linhas.length; i += 500) await dml(montar(linhas.slice(i, i + 500))); };
  const v = (x) => (x === null || x === undefined ? 'NULL' : (typeof x === 'number' ? String(x) : (typeof x === 'boolean' ? (x ? 'TRUE' : 'FALSE') : q(x))));
  const tupla = (l, cols) => `(${cols.map((c) => v(l[c])).join(', ')})`;
  const upsert = (tabela, cols, chaves, linhas) => lotes(linhas, (lote) => `INSERT INTO ${tabela} (${cols.join(', ')}) VALUES ${lote.map((l) => tupla(l, cols)).join(',\n')}
ON DUPLICATE KEY UPDATE ${cols.filter((c) => !chaves.includes(c)).map((c) => `${c} = VALUES(${c})`).join(', ')}`);
  const norm = (x) => (x === null || x === undefined || x === '' ? null
    : (typeof x === 'number' || /^-?\d+(\.\d+)?$/.test(String(x)) ? Math.round(Number(x) * 100) / 100 : String(x)));
  const SALDOS = ['A_VENCER', 'V_1_30', 'V_31_60', 'V_61_90', 'V_91_180', 'V_180', 'VENCIDO', 'VDIAS', 'DIAS_ATRASO', 'VENC_MAIS_ANTIGO',
    'PROX_VENC', 'PROX_VENC_VALOR', 'A_VENCER_7DU', 'TITULOS_ABERTOS', 'TITULOS_VENCIDOS'];
  const EXTRA = ['LIMITE', 'UTILIZADO', 'DISPONIVEL', 'ULTIMA_COMPRA', 'COMPRAS_QTD', 'COMPRAS_VALOR', 'COMPRA_MEDIA_MENSAL', 'PRAZO_MEDIO_DIAS', 'PONTUALIDADE_PCT'];
  const zerados = () => Object.fromEntries(SALDOS.map((c) => [c, c === 'VENC_MAIS_ANTIGO' || c === 'PROX_VENC' ? null : 0]));
  const pegar = (o, cols) => Object.fromEntries(cols.map((c) => [c, o[c] === undefined ? null : o[c]]));

  const [s] = await ler(`SELECT ID, SITUACAO, FASE, \`CURSOR\` AS POSICAO_CURSOR FROM CC_SINCRONIZACAO WHERE ID = ${id}`);
  if (!s || s.SITUACAO !== 'EM_ANDAMENTO') return recusar('A leitura não está em andamento.');
  try {
    const ctx = await contextoPosicao();
    const p = ctx.params;
    const hojeData = ctx.hoje;
    let fase = s.FASE || 'PLANOS';
    let cursor = inteiro(s.POSICAO_CURSOR);
    const mudarFase = async (nova) => { fase = nova; cursor = 0; await dml(`UPDATE CC_SINCRONIZACAO SET FASE = ${q(nova)}, \`CURSOR\` = 0 WHERE ID = ${id}`); };

    if (fase === 'PLANOS') {
      const planos = await oracle(SQL_PLANOS, {});
      await upsert('CC_PLANO_PAGAMENTO', ['CODIGO', 'DESCRICAO', 'PRAZO_MEDIO', 'ATIVO'], ['CODIGO'],
        planos.map((l) => ({ CODIGO: String(l.CODPLPAG), DESCRICAO: texto(l.DESCRICAO, 80), PRAZO_MEDIO: inteiro(l.NUMDIAS), ATIVO: true })));
      await dml(`UPDATE CC_PLANO_PAGAMENTO SET ATIVO = FALSE WHERE CODIGO NOT IN (${planos.map((l) => q(l.CODPLPAG)).join(', ') || "''"})`);
      const deptos = await oracle(SQL_DEPARTAMENTOS, {});
      if (deptos.length) {
        await lotes(deptos, (lote) => `INSERT IGNORE INTO CC_BU_DEPTO (CODEPTO, DEPTO_NOME, BU_ID, ATUALIZADO_EM)
VALUES ${lote.map((d) => `(${inteiro(d.CODEPTO)}, ${q(texto(d.DESCRICAO, 200))}, NULL, ${q(agora())})`).join(',\n')}`);
      }
      await mudarFase('CLIENTES');
    }

    if (fase === 'CLIENTES') {
      const inicioJanela = somarMeses(hojeData, -(Number(p['base.syncJanelaMeses']) || 12));
      const inicioCompras = somarDias(hojeData, -ctx.comprasJanelaDias);
      const [recAntigo] = await ler(`SELECT COUNT(*) AS N FROM CC_RECEBIMENTO WHERE SINCRONIZACAO_ID <> ${id}`);
      const [fatAntigo] = await ler(`SELECT COUNT(*) AS N FROM CC_FATURAMENTO_MES WHERE SINCRONIZACAO_ID <> ${id}`);
      const anoAnterior = Number(hojeData.slice(0, 4)) - 1;
      // Primeira carga desde janeiro do ano anterior; depois, recebimentos de 40 dias e faturamento do mês anterior.
      const inicioRec = inteiro(recAntigo.N) ? somarDias(hojeData, -40) : `${anoAnterior}-01-01`;
      const mesFat = inteiro(fatAntigo.N) ? somarMeses(`${hojeData.slice(0, 7)}-01`, -1).slice(0, 7) : `${anoAnterior}-01`;
      const inicioPont = somarMeses(hojeData, -(Number(p['base.pontualidadeMeses']) || 12));
      // O universo cobre a janela mais antiga das três: na primeira carga, recebimentos e faturamento vêm de
      // janeiro do ano anterior, e o cliente pago nesse intervalo também entra (C-06).
      const inicioUniverso = [inicioJanela, inicioRec, `${mesFat}-01`].sort()[0];
      const prazoPlano = {};
      for (const l of await ler('SELECT CODIGO, PRAZO_MEDIO FROM CC_PLANO_PAGAMENTO')) prazoPlano[l.CODIGO] = inteiro(l.PRAZO_MEDIO);
      let paginas = 0;
      for (;;) {
        if (paginas >= PAGINAS_POR_RODADA || Date.now() - inicioMs > orcamentoMs) {
          return { ok: true, pendentes: 1, execucoes: 1, resumo: `Leitura continua do cliente ${cursor + 1}.` };
        }
        const cad = await oracle(SQL_CLIENTES_PAGINA, { cursor, linhas: LINHAS_POR_CONSULTA, inicioJanela: inicioUniverso });
        paginas += 1;
        if (cad.length) {
          const de = inteiro(cad[0].CODCLI);
          const ate = inteiro(cad[cad.length - 1].CODCLI);
          const compras = await oracle(SQL_COMPRAS_PAGINA, { de, ate, inicioCompras });
          const titulos = await oracle(SQL_TITULOS_ABERTOS, { de, ate });
          const itens = await oracle(SQL_ITENS_POR_DEPTO, { de, ate });
          const pagos = await oracle(SQL_RECEBIMENTOS, { de, ate, inicioJanela: inicioRec });
          const fat = await oracle(SQL_FATURAMENTO, { de, ate, inicio: `${mesFat}-01` });

          // Cadastro (só colunas do Winthor, setor e esfera mapeada; RN-010).
          const codigos = cad.map((c) => inteiro(c.CODCLI));
          const antes = new Set((await ler(`SELECT CODCLI FROM CC_CLIENTE WHERE CODCLI BETWEEN ${de} AND ${ate}`)).map((l) => inteiro(l.CODCLI)));
          const publicos = new Set();
          const agoraTxt = agora();
          const CLI = ['CODCLI', 'DOCUMENTO', 'TIPO_PESSOA', 'NOME', 'FANTASIA', 'NOME_BUSCA', 'UF', 'MUNICIPIO', 'ENDERECO', 'TELEFONE', 'EMAIL',
            'RAMO_COD', 'RAMO', 'RCA_COD', 'RCA_NOME', 'PLANO_COD', 'BLOQUEADO_WINTHOR', 'CADASTRO_EM', 'SETOR', 'ESFERA', 'WINTHOR_LIDO_EM', 'CRIADO_EM'];
          const cadastros = cad.map((c) => {
            const setor = setorDoRamo(c.CODATV1, c.RAMO, p['base.ramosPublicos'], p['base.ramoPublicoPrefixo']);
            if (setor === 'PUBLICO') publicos.add(inteiro(c.CODCLI));
            return {
              CODCLI: inteiro(c.CODCLI), DOCUMENTO: digitos(c.CGCENT).slice(0, 14), TIPO_PESSOA: c.TIPOFJ === 'F' ? 'F' : 'J', NOME: texto(c.CLIENTE, 200),
              FANTASIA: texto(c.FANTASIA, 200), NOME_BUSCA: normalizarTexto(`${c.CLIENTE || ''} ${c.FANTASIA || ''}`).slice(0, 400), UF: texto(c.ESTENT, 2),
              MUNICIPIO: texto(c.MUNICENT, 80), ENDERECO: texto([c.ENDERENT, c.BAIRROENT, c.CEPENT].filter(Boolean).join(', '), 300),
              TELEFONE: texto(c.TELENT, 40), EMAIL: texto(c.EMAIL, 160), RAMO_COD: c.CODATV1 === null || c.CODATV1 === undefined ? null : inteiro(c.CODATV1),
              RAMO: texto(c.RAMO, 60), RCA_COD: c.CODUSUR1 === null || c.CODUSUR1 === undefined ? null : inteiro(c.CODUSUR1), RCA_NOME: texto(c.RCA_NOME, 80),
              PLANO_COD: texto(c.CODPLPAG, 10), BLOQUEADO_WINTHOR: String(c.BLOQUEIO || '').toUpperCase() === 'S', CADASTRO_EM: c.DTCADASTRO || null,
              SETOR: setor, ESFERA: esferaDoRamo(c.CODATV1, p['base.ramosEsfera']), WINTHOR_LIDO_EM: agoraTxt, CRIADO_EM: agoraTxt,
            };
          });
          await lotes(cadastros, (lote) => `INSERT INTO CC_CLIENTE (${CLI.join(', ')}) VALUES ${lote.map((l) => tupla(l, CLI)).join(',\n')}
ON DUPLICATE KEY UPDATE ${CLI.filter((c) => !['CODCLI', 'CRIADO_EM', 'ESFERA'].includes(c)).map((c) => `${c} = VALUES(${c})`).join(', ')},
  ESFERA = CASE WHEN VALUES(ESFERA) IS NOT NULL THEN VALUES(ESFERA) ELSE ESFERA END`);
          const ids = new Map((await ler(`SELECT ID, CODCLI FROM CC_CLIENTE WHERE CODCLI BETWEEN ${de} AND ${ate}`))
            .filter((l) => codigos.includes(inteiro(l.CODCLI))).map((l) => [inteiro(l.CODCLI), inteiro(l.ID)]));
          const listaIdsSql = [...ids.values()].join(', ');
          const novos = codigos.filter((c) => !antes.has(c)).length;

          // Recebimentos (RN-007): chave lida de novo não duplica; chave que sumiu da janela é estornada.
          const pesos = new Map();
          for (const i of itens) {
            const venda = String(i.NUMTRANSVENDA);
            const bu = inteiro(ctx.buDoDepto[inteiro(i.CODEPTO)]);
            if (!pesos.has(venda)) pesos.set(venda, new Map());
            pesos.get(venda).set(bu, (pesos.get(venda).get(bu) || 0) + Number(i.VALOR || 0));
          }
          const buMaior = (venda) => {
            const porBu = pesos.get(String(venda));
            if (!porBu) return 0;
            let melhor = 0;
            let maior = -1;
            for (const [bu, valor] of [...porBu.entries()].sort((a, b) => a[0] - b[0])) if (valor > maior) { melhor = bu; maior = valor; }
            return melhor;
          };
          const carteiraDe = (codcli, bu) => (publicos.has(codcli) ? 'PUBLICA' : (bu ? (ctx.carteiraDaBu[bu] || 'PRIVADA') : 'PRIVADA'));
          const recs = pagos.filter((r) => ids.has(inteiro(r.CODCLI))).map((r) => {
            const bu = buMaior(r.NUMTRANSVENDA);
            return {
              CHAVE: `${r.NUMTRANSVENDA}|${r.PREST}|${r.DTPAG}`, CLIENTE_ID: ids.get(inteiro(r.CODCLI)), CODCLI: inteiro(r.CODCLI),
              TITULO: texto(r.DUPLIC ?? r.NUMTRANSVENDA, 20), PARCELA: texto(r.PREST, 4), FILIAL: texto(r.CODFILIAL, 4), BU_ID: bu,
              CARTEIRA: carteiraDe(inteiro(r.CODCLI), bu), VENCIMENTO: r.DTVENC, DATA_PAGAMENTO: r.DTPAG, VALOR_PAGO: Math.round(Number(r.VPAGO || 0) * 100) / 100,
              DIAS_ATRASO_PAGAMENTO: Math.max(0, diasEntre(r.DTVENC, r.DTPAG)), SINCRONIZACAO_ID: id, LIDO_EM: agoraTxt,
            };
          });
          const existentes = listaIdsSql ? await ler(`SELECT CHAVE, ESTORNADO FROM CC_RECEBIMENTO WHERE CLIENTE_ID IN (${listaIdsSql}) AND DATA_PAGAMENTO >= ${q(inicioRec)}`) : [];
          const lidas = new Set(recs.map((r) => r.CHAVE));
          const conhecidas = new Set(existentes.map((e) => e.CHAVE));
          const recNovos = recs.filter((r) => !conhecidas.has(r.CHAVE));
          const REC = Object.keys(recs[0] || { CHAVE: 1 });
          if (recNovos.length) await lotes(recNovos, (lote) => `INSERT IGNORE INTO CC_RECEBIMENTO (${REC.join(', ')}) VALUES ${lote.map((l) => tupla(l, REC)).join(',\n')}`);
          const estornar = existentes.filter((e) => !ehVerdade(e.ESTORNADO) && !lidas.has(e.CHAVE)).map((e) => q(e.CHAVE));
          if (estornar.length) await dml(`UPDATE CC_RECEBIMENTO SET ESTORNADO = TRUE, ESTORNADO_EM = ${q(agoraTxt)}, SINCRONIZACAO_ID = ${id} WHERE CHAVE IN (${estornar.join(', ')})`);
          const voltar = existentes.filter((e) => ehVerdade(e.ESTORNADO) && lidas.has(e.CHAVE)).map((e) => q(e.CHAVE));
          if (voltar.length) await dml(`UPDATE CC_RECEBIMENTO SET ESTORNADO = FALSE, ESTORNADO_EM = NULL, SINCRONIZACAO_ID = ${id} WHERE CHAVE IN (${voltar.join(', ')})`);
          const pont = new Map();
          if (listaIdsSql) {
            for (const l of await ler(`SELECT CLIENTE_ID, SUM(VALOR_PAGO) AS TOTAL, SUM(CASE WHEN DIAS_ATRASO_PAGAMENTO = 0 THEN VALOR_PAGO ELSE 0 END) AS EM_DIA
FROM CC_RECEBIMENTO WHERE CLIENTE_ID IN (${listaIdsSql}) AND ESTORNADO = FALSE AND DATA_PAGAMENTO >= ${q(inicioPont)} GROUP BY CLIENTE_ID`)) {
              if (Number(l.TOTAL) > 0) pont.set(inteiro(l.CLIENTE_ID), Math.round((Number(l.EM_DIA) / Number(l.TOTAL)) * 10000) / 100);
            }
          }

          // Posição (calcularPosicao, a mesma dos títulos ao vivo) e gravação só do que mudou (D-003).
          const comprasDe = new Map(compras.map((c) => [inteiro(c.CODCLI), c]));
          const cadastro = {};
          for (const c of cad) {
            const cp = comprasDe.get(inteiro(c.CODCLI)) || {};
            cadastro[inteiro(c.CODCLI)] = {
              LIMITE: Number(c.LIMCRED || 0), COMPRAS_QTD: cp.COMPRAS_QTD, COMPRAS_VALOR: cp.COMPRAS_VALOR, SOMA_VALOR_PRAZO: cp.SOMA_VALOR_PRAZO,
              ULTIMA_COMPRA: c.DTULTCOMP || null, PRAZO_PLANO: prazoPlano[String(c.CODPLPAG)] || 0,
            };
          }
          const calc = calcularPosicao(titulos, itens, { ...ctx, publicos: [...publicos], cadastro });
          const alvo = { total: [], bu: [], carteira: [] };
          for (const c of calc.clientes) {
            const cid = ids.get(c.CODCLI);
            if (!cid) continue;
            alvo.total.push({ CLIENTE_ID: cid, CODCLI: c.CODCLI, ...pegar(c.total, SALDOS), ...pegar(c.total, EXTRA), PONTUALIDADE_PCT: pont.has(cid) ? pont.get(cid) : null });
            for (const b of c.porBu) alvo.bu.push({ CLIENTE_ID: cid, BU_ID: b.BU_ID, CARTEIRA: b.CARTEIRA, ...pegar(b, SALDOS) });
            for (const k of c.porCarteira) alvo.carteira.push({ CLIENTE_ID: cid, CARTEIRA: k.CARTEIRA, ...pegar(k, SALDOS), COMPOSICAO_BU: k.COMPOSICAO_BU || '' });
          }
          const sincronizarTabela = async (tabela, chaves, colunas, linhasAlvo, comSincronizadoEm, zerar) => {
            const atuais = listaIdsSql ? await ler(`SELECT ID, ${[...chaves, ...colunas].filter((c, i, a) => a.indexOf(c) === i).join(', ')} FROM ${tabela} WHERE CLIENTE_ID IN (${listaIdsSql})`) : [];
            const k = (l) => chaves.map((c) => String(l[c])).join('|');
            const doBanco = new Map(atuais.map((l) => [k(l), l]));
            const desejado = new Map(linhasAlvo.map((l) => [k(l), l]));
            for (const l of atuais) if (!desejado.has(k(l))) desejado.set(k(l), { ...pegar(l, chaves), ...zerar(l) });
            const mudar = [];
            const iguais = [];
            for (const [chave, novo] of desejado) {
              const atual = doBanco.get(chave);
              if (atual && colunas.every((c) => norm(atual[c]) === norm(novo[c]))) iguais.push(inteiro(atual.ID));
              else mudar.push({ ...novo, SINCRONIZACAO_ID: id, ALTERADO_EM: agoraTxt, ...(comSincronizadoEm ? { SINCRONIZADO_EM: agoraTxt } : {}) });
            }
            if (mudar.length) {
              const cols = [...new Set([...chaves, ...colunas, 'SINCRONIZACAO_ID', 'ALTERADO_EM', ...(comSincronizadoEm ? ['SINCRONIZADO_EM'] : [])])];
              await upsert(tabela, cols, chaves, mudar);
            }
            if (iguais.length) await dml(`UPDATE ${tabela} SET SINCRONIZACAO_ID = ${id}${comSincronizadoEm ? `, SINCRONIZADO_EM = ${q(agoraTxt)}` : ''} WHERE ID IN (${iguais.join(', ')})`);
            return mudar.length;
          };
          const gravadas = await sincronizarTabela('CC_POSICAO_CLIENTE', ['CLIENTE_ID'], ['CODCLI', ...SALDOS, ...EXTRA], alvo.total, true, () => zerados());
          await sincronizarTabela('CC_POSICAO_CLIENTE_BU', ['CLIENTE_ID', 'BU_ID'], ['CARTEIRA', ...SALDOS], alvo.bu, false, (l) => ({ CARTEIRA: l.CARTEIRA, ...zerados() }));
          await sincronizarTabela('CC_POSICAO_CLIENTE_CARTEIRA', ['CLIENTE_ID', 'CARTEIRA'], [...SALDOS, 'COMPOSICAO_BU'], alvo.carteira, false, () => ({ ...zerados(), COMPOSICAO_BU: '' }));

          // Faturamento por cliente × BU × mês; mês da janela que não veio vai a 0.
          const somaFat = new Map();
          for (const f of fat) {
            const cid = ids.get(inteiro(f.CODCLI));
            if (!cid) continue;
            const chave = `${cid}|${inteiro(ctx.buDoDepto[inteiro(f.CODEPTO)])}|${f.MES}`;
            somaFat.set(chave, (somaFat.get(chave) || 0) + Number(f.VALOR || 0));
          }
          const linhasFat = [...somaFat.entries()].map(([chave, valor]) => {
            const [cid, bu, mes] = chave.split('|');
            return { CLIENTE_ID: inteiro(cid), BU_ID: inteiro(bu), MES: mes, VALOR: Math.round(valor * 100) / 100, SINCRONIZACAO_ID: id };
          });
          if (linhasFat.length) await upsert('CC_FATURAMENTO_MES', ['CLIENTE_ID', 'BU_ID', 'MES', 'VALOR', 'SINCRONIZACAO_ID'], ['CLIENTE_ID', 'BU_ID', 'MES'], linhasFat);
          if (listaIdsSql) await dml(`UPDATE CC_FATURAMENTO_MES SET VALOR = 0, SINCRONIZACAO_ID = ${id} WHERE CLIENTE_ID IN (${listaIdsSql}) AND MES >= ${q(mesFat)} AND SINCRONIZACAO_ID <> ${id}`);

          cursor = ate;
          await dml(`UPDATE CC_SINCRONIZACAO SET \`CURSOR\` = ${ate}, CLIENTES_LIDOS = CLIENTES_LIDOS + ${cad.length}, CLIENTES_NOVOS = CLIENTES_NOVOS + ${novos},
  POSICOES_GRAVADAS = POSICOES_GRAVADAS + ${gravadas}, RECEBIMENTOS_NOVOS = RECEBIMENTOS_NOVOS + ${recNovos.length},
  RECEBIMENTOS_ESTORNADOS = RECEBIMENTOS_ESTORNADOS + ${estornar.length} WHERE ID = ${id}`);
        }
        if (cad.length < LINHAS_POR_CONSULTA) break;
      }
      await mudarFase('FECHAR');
    }

    // FECHAR: só aqui alguém é zerado (RN-008, RN-009).
    const agoraTxt = agora();
    const ZERAR = SALDOS.map((c) => (c === 'VENC_MAIS_ANTIGO' || c === 'PROX_VENC' ? `${c} = NULL` : `${c} = 0`)).join(', ');
    const tinhaSaldo = `SINCRONIZACAO_ID <> ${id} AND (A_VENCER <> 0 OR VENCIDO <> 0 OR TITULOS_ABERTOS <> 0)`;
    const [zerar] = await ler(`SELECT COUNT(*) AS N FROM CC_POSICAO_CLIENTE WHERE ${tinhaSaldo}`);
    await dml(`UPDATE CC_POSICAO_CLIENTE SET ${ZERAR}, UTILIZADO = 0, DISPONIVEL = LIMITE, ALTERADO_EM = ${q(agoraTxt)}, SINCRONIZACAO_ID = ${id} WHERE ${tinhaSaldo}`);
    await dml(`UPDATE CC_POSICAO_CLIENTE_BU SET ${ZERAR}, ALTERADO_EM = ${q(agoraTxt)}, SINCRONIZACAO_ID = ${id} WHERE ${tinhaSaldo}`);
    await dml(`UPDATE CC_POSICAO_CLIENTE_CARTEIRA SET ${ZERAR}, COMPOSICAO_BU = '', ALTERADO_EM = ${q(agoraTxt)}, SINCRONIZACAO_ID = ${id} WHERE ${tinhaSaldo}`);
    await dml(`UPDATE CC_SINCRONIZACAO SET SITUACAO = 'OK', FIM = ${q(agoraTxt)}, FASE = 'FECHAR', POSICOES_ZERADAS = ${inteiro(zerar.N)} WHERE ID = ${id}`);
    return { ok: true, pendentes: 0, execucoes: 1, resumo: `Leitura ${id} concluída.` };
  } catch (e) {
    await dml(`UPDATE CC_SINCRONIZACAO SET SITUACAO = 'ERRO', FIM = ${q(agora())}, ERRO = ${q(texto(e && e.message ? e.message : String(e), 1000))} WHERE ID = ${id}`);
    return { ok: false, error: e && e.message ? e.message : String(e), pendentes: 0, execucoes: 1 };
  }
};

// Passo ACESSOS (05 §2): USER_ID dos membros; ADMINS_IDS e ACESSO_JSON de cada quadro pelo cargo, só quando muda.
const corpoAcessos = async () => {
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina agendada concilia os acessos.');
  const dml = (sql) => sdk.runDmlMitra({ projectId, sql });
  const usuario = '(SELECT MIN(U.ID) FROM INT_USER U WHERE LOWER(U.DESCR) = CC_MEMBRO.USER_EMAIL)';
  await dml(`UPDATE CC_MEMBRO SET USER_ID = ${usuario} WHERE COALESCE(USER_ID, 0) <> COALESCE(${usuario}, 0)`);
  const quadros = await ler('SELECT DISTINCT F.QUADRO, F.BOARD_ID, B.ADMINS_IDS, B.ACESSO_JSON FROM CC_FASE F JOIN KB_BOARD B ON B.ID = F.BOARD_ID ORDER BY F.BOARD_ID');
  const membros = await ler('SELECT ID, CARGO, NIVEL, ADMIN, USER_ID FROM CC_MEMBRO WHERE ATIVO = TRUE AND USER_ID IS NOT NULL');
  const administra = (x) => Number(x.NIVEL) >= 3 || ehVerdade(x.ADMIN);
  const admins = [...new Set(membros.filter(administra).map((x) => inteiro(x.USER_ID)))].sort((a, b) => a - b).join(',');
  const PAPEL = { cobranca: { SUPERVISOR: 'membro', JURIDICO: 'leitor' }, concessao: { SUPERVISOR: 'membro' }, juridico: { SUPERVISOR: 'membro', JURIDICO: 'membro' } };
  const colunaDe = (slug) => (slug.startsWith('cobranca-') ? 'cobranca'
    : (slug.startsWith('concessao-') || slug === 'pedidos-limite') ? 'concessao' : (slug.startsWith('juridico') ? 'juridico' : null));
  const ordenado = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, o[k]]));
  let alterados = 0;
  for (const qd of quadros) {
    const coluna = colunaDe(String(qd.QUADRO));
    let atual = {};
    try { atual = JSON.parse(qd.ACESSO_JSON || '{}') || {}; } catch { atual = {}; }
    let acesso = atual;
    if (coluna) {
      const pessoas = {};
      for (const x of membros) if (!administra(x) && PAPEL[coluna][x.CARGO]) pessoas[String(inteiro(x.USER_ID))] = PAPEL[coluna][x.CARGO];
      acesso = { ...atual, padrao: 'restrito', pessoas };
    }
    const mudouAcesso = coluna && (atual.padrao !== 'restrito' || ordenado(atual.pessoas) !== ordenado(acesso.pessoas));
    if (String(qd.ADMINS_IDS || '') === admins && !mudouAcesso) continue;
    await dml(`UPDATE KB_BOARD SET ADMINS_IDS = ${q(admins)}, ACESSO_JSON = ${q(JSON.stringify(acesso))} WHERE ID = ${inteiro(qd.BOARD_ID)}`);
    alterados += 1;
  }
  return { ok: true, pendentes: 0, execucoes: 1, processados: alterados, resumo: `${alterados} quadro(s) atualizados.` };
};

/* ── definitions ── */

// Números como parâmetro (DT-45): todo {{x}} fora de aspas vira CAST; DECIMAIS = os valores em dinheiro desta spec.
const DECIMAIS = [];
const sql = (name, code, extra = {}) => ({ name, type: 'SQL', code: numerosComoParametro(code, DECIMAIS, extra.jdbcId === undefined ? 'SIGNED' : 'INTEGER'), ...extra });
const jsDef = (name, code, extra = {}) => ({ name, type: 'JAVASCRIPT', code, ...extra });
const ganchos = trechosDosGanchos(await carregarArquivosDeQuadros());

const FONTE_ANEXO = constante('FORMATOS_ANEXO', FORMATOS_ANEXO);
const FONTE_CONTATO = [constante('AREAS_CONTATO', AREAS_CONTATO), constante('FUNCOES_CONTATO', FUNCOES_CONTATO), constante('SITUACOES_CONTATO', SITUACOES_CONTATO)].join('\n');
const FONTE_FICHA = [constante('SQL_SIT_FICHA', SIT_FICHA('C')), constante('SQL_PRM', PRM)].join('\n');
const FONTE_CONTEXTO = [FONTE_POSICAO, String(contextoPosicao)].join('\n');
const FONTE_EMAIL_PREPARO = [FONTE_VISIVEL, FONTE_MODELO, String(prepararEmail)].join('\n');
const FONTE_WINTHOR = [String(W.preencher), ...['SQL_CLIENTES_PAGINA', 'SQL_COMPRAS_PAGINA', 'SQL_TITULOS_ABERTOS', 'SQL_ITENS_POR_DEPTO', 'SQL_RECEBIMENTOS',
  'SQL_FATURAMENTO', 'SQL_PLANOS', 'SQL_DEPARTAMENTOS'].map((n) => constante(n, W[n]))].join('\n');

export const definitions = [
  // ── Leituras ──
  jsDef('ccBaseSessao', sf(corpoSessao)),
  sql('ccBaseClienteListar', SQL_CLIENTE_LISTAR),
  sql('ccBaseClienteTotal', SQL_CLIENTE_TOTAL),
  jsDef('ccBaseClienteFicha', sf(corpoClienteFicha, FONTE_VISIVEL, FONTE_FICHA)),
  jsDef('ccBaseTitulosAbertos', sf(corpoTitulosAbertos, FONTE_VISIVEL, FONTE_CONTEXTO)),
  sql('ccBaseRecebimentoListar', `SELECT R.ID, R.CHAVE, R.CLIENTE_ID, R.CODCLI, R.TITULO, R.PARCELA, R.FILIAL, R.BU_ID, R.CARTEIRA, R.VENCIMENTO,
  R.DATA_PAGAMENTO, R.VALOR_PAGO, R.DIAS_ATRASO_PAGAMENTO, R.ESTORNADO, R.ESTORNADO_EM, R.SINCRONIZACAO_ID, R.LIDO_EM
${FROM_RECEBIMENTO}
WHERE ${FILTRO_RECEBIMENTO}
ORDER BY R.DATA_PAGAMENTO DESC, R.ID DESC
LIMIT {{limite}} OFFSET {{offset}}`),
  sql('ccBaseRecebimentoTotal', `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(R.VALOR_PAGO), 0) AS VALOR_PAGO
${FROM_RECEBIMENTO}
WHERE ${FILTRO_RECEBIMENTO}`),
  sql('ccBaseFaturamentoMes', `SELECT F.MES, F.BU_ID, COALESCE(B.NOME, 'Sem BU') AS BU_NOME, F.VALOR
FROM CC_FATURAMENTO_MES F
JOIN CC_CLIENTE C ON C.ID = F.CLIENTE_ID
${EU}
LEFT JOIN CC_BU B ON B.ID = F.BU_ID
WHERE F.CLIENTE_ID = {{clienteId}} AND F.VALOR <> 0 AND ${clienteVisivel('C')}
  AND ${MES_INDICE(HOJE_SQL)} - ${MES_INDICE('F.MES')} < {{meses}}
ORDER BY F.MES, F.BU_ID
LIMIT 500`),
  sql('ccBaseContatoListar', SQL_CONTATO_LISTAR),
  sql('ccBaseContatoTotal', SQL_CONTATO_TOTAL),
  sql('ccBaseMembroListar', `SELECT M.ID, M.NOME, M.USER_EMAIL, M.CARGO, M.NIVEL, M.SUPERIOR_ID, COALESCE(S.NOME, '') AS SUPERIOR_NOME, M.ADMIN, M.ATIVO,
  CASE WHEN EXISTS (SELECT 1 FROM INT_USER U WHERE LOWER(U.DESCR) = M.USER_EMAIL) THEN 1 ELSE 0 END AS TEM_USUARIO,
  (SELECT COUNT(*) FROM CC_CLIENTE C WHERE C.AGENTE_ID = M.ID) AS CLIENTES,
  (SELECT COUNT(*) FROM CC_MEMBRO X WHERE X.SUPERIOR_ID = M.ID AND X.ATIVO = TRUE) AS SUBORDINADOS_ATIVOS
FROM CC_MEMBRO M
${EU}
LEFT JOIN CC_MEMBRO S ON S.ID = M.SUPERIOR_ID
WHERE ${FILTRO_MEMBRO}
ORDER BY M.ATIVO DESC, M.CAMINHO, M.NOME
LIMIT {{limite}} OFFSET {{offset}}`),
  sql('ccBaseMembroTotal', `SELECT COUNT(*) AS TOTAL
FROM CC_MEMBRO M
${EU}
WHERE ${FILTRO_MEMBRO}`),
  jsDef('ccBaseEquipeConferir', sf(corpoEquipeConferir, FONTE_EQUIPE)),
  sql('ccBaseBuListar', `SELECT B.ID, B.NOME, B.CARTEIRA, B.ORDEM, B.ATIVA,
  COALESCE((SELECT GROUP_CONCAT(CONCAT(D.CODEPTO, ' ', D.DEPTO_NOME) ORDER BY D.CODEPTO SEPARATOR ', ') FROM CC_BU_DEPTO D WHERE D.BU_ID = B.ID), '') AS DEPTOS
FROM CC_BU B
${EU}
WHERE ({{ativa}} = -1 OR B.ATIVA = ({{ativa}} = 1))
ORDER BY B.ORDEM, B.NOME
LIMIT 500`),
  sql('ccBaseBuDeptoListar', `SELECT D.CODEPTO, D.DEPTO_NOME, D.BU_ID, COALESCE(B.NOME, '') AS BU_NOME
FROM CC_BU_DEPTO D
${EU}
LEFT JOIN CC_BU B ON B.ID = D.BU_ID
WHERE ${podeAdministrarEm('EU')} AND ({{semBu}} = 0 OR D.BU_ID IS NULL)
ORDER BY D.CODEPTO
LIMIT 500`),
  sql('ccBaseParametroListar', SQL_PARAMETRO_LISTAR),
  sql('ccBaseParametroHistorico', `SELECT P.CARTEIRA, P.VALOR, P.VIGENCIA_INICIO, P.ATUALIZADO_EM, COALESCE(M.NOME, '') AS ATUALIZADO_POR_NOME
FROM CC_PARAMETRO P
${EU}
LEFT JOIN CC_MEMBRO M ON M.ID = P.ATUALIZADO_POR
WHERE P.CHAVE = '{{chave}}' AND P.CARTEIRA = CASE WHEN '{{carteira}}' IN ('ESTETICA', 'PUBLICA') THEN '{{carteira}}' ELSE '' END
ORDER BY P.VIGENCIA_INICIO DESC
LIMIT 500`),
  sql('ccBaseFeriadoListar', `SELECT F.ID, F.DATA, F.NOME, F.ABRANGENCIA, F.UF, F.MUNICIPIO, F.ORIGEM
FROM CC_FERIADO F
${EU}
WHERE SUBSTRING(F.DATA, 1, 4) = CASE WHEN {{ano}} = 0 THEN SUBSTRING(${HOJE_SQL}, 1, 4) ELSE CAST({{ano}} AS CHAR) END
ORDER BY F.DATA, F.ABRANGENCIA, F.UF
LIMIT 500`),
  sql('ccBasePlanoListar', `SELECT PL.CODIGO, PL.DESCRICAO, PL.PRAZO_MEDIO, PL.ATIVO
FROM CC_PLANO_PAGAMENTO PL
${EU}
WHERE ({{ativo}} = -1 OR PL.ATIVO = ({{ativo}} = 1))
ORDER BY PL.PRAZO_MEDIO, PL.CODIGO
LIMIT 500`),
  sql('ccBaseModeloListar', `SELECT X.CODIGO, X.NOME, X.ASSUNTO, X.CORPO, X.EFEITO_LEGAL, X.VERSAO, X.VALIDADO_VERSAO, X.VALIDADO_EM,
  COALESCE(V.NOME, '') AS VALIDADO_POR_NOME,
  CASE WHEN X.EFEITO_LEGAL = FALSE THEN 'NAO_EXIGE'
       WHEN X.VALIDADO_VERSAO IS NULL OR X.VALIDADO_VERSAO <> X.VERSAO OR X.VALIDADO_EM IS NULL THEN 'AGUARDANDO'
       WHEN ${VALIDACAO_VENCIDA} THEN 'VENCIDA' ELSE 'VALIDO' END AS SITUACAO_VALIDACAO,
  X.CAMPOS_EXTRAS, X.SPEC_DONA
FROM CC_MODELO_MENSAGEM X
${EU}
LEFT JOIN CC_MEMBRO V ON V.ID = X.VALIDADO_POR
WHERE X.ATIVO = TRUE AND ('{{specDona}}' = '' OR X.SPEC_DONA = '{{specDona}}') AND ('{{codigo}}' = '' OR X.CODIGO = '{{codigo}}')
ORDER BY X.SPEC_DONA, X.CODIGO
LIMIT 500`),
  jsDef('ccBaseModeloPrever', sf(corpoModeloPrever, FONTE_EMAIL_PREPARO)),
  sql('ccBaseEmailListar', `SELECT E.ID, E.MODELO_ID, E.MODELO_CODIGO, E.MODELO_VERSAO, E.CLIENTE_ID, E.PARA, E.ASSUNTO, E.CORPO, E.ORIGEM, E.REFERENCIA,
  E.ENVIADO_EM, E.ENVIADO_POR, E.RESULTADO, E.ERRO
${FROM_EMAIL}
WHERE ${FILTRO_EMAIL}
ORDER BY E.ENVIADO_EM DESC, E.ID DESC
LIMIT {{limite}} OFFSET {{offset}}`),
  sql('ccBaseEmailTotal', `SELECT COUNT(*) AS TOTAL
${FROM_EMAIL}
WHERE ${FILTRO_EMAIL}`),
  sql('ccBaseAnexoListar', `SELECT X.ID, X.ENTIDADE, X.ENTIDADE_ID, X.CLIENTE_ID, X.TIPO_DOC, X.NOME_ARQUIVO, X.MIME, X.TAMANHO_BYTES, X.URL,
  X.ENVIADO_EM, X.ENVIADO_POR, X.REMOVIDO_EM, X.REMOVIDO_POR, COALESCE(M.NOME, '') AS ENVIADO_POR_NOME
FROM CC_ANEXO X
${EU}
LEFT JOIN CC_CLIENTE C ON C.ID = X.CLIENTE_ID
LEFT JOIN CC_MEMBRO M ON M.ID = X.ENVIADO_POR
WHERE X.ENTIDADE = '{{entidade}}' AND X.ENTIDADE_ID = {{entidadeId}} AND X.REMOVIDO_EM IS NULL
  AND (X.ENTIDADE <> 'CLIENTE' OR (C.ID IS NOT NULL AND ${clienteVisivel('C')}))
ORDER BY X.ENVIADO_EM DESC, X.ID DESC
LIMIT 500`),
  sql('ccBaseAuditoriaListar', `SELECT X.ID, X.EM, X.AREA, X.ENTIDADE, X.ENTIDADE_ID, X.CLIENTE_ID, X.CAMPO, X.ANTES, X.DEPOIS, X.POR, X.POR_NOME
${FROM_AUDITORIA}
WHERE ${FILTRO_AUDITORIA}
ORDER BY X.EM DESC, X.ID DESC
LIMIT {{limite}} OFFSET {{offset}}`),
  sql('ccBaseAuditoriaTotal', `SELECT COUNT(*) AS TOTAL
${FROM_AUDITORIA}
WHERE ${FILTRO_AUDITORIA}`),
  // Uma linha por passo da última leitura OK, repetindo a última leitura; sem passo, uma linha só.
  sql('ccBaseSincronizacaoStatus', `SELECT S.ID, S.SITUACAO, S.INICIO, S.FIM, S.ERRO,
  RP.PASSO, RP.SITUACAO AS PASSO_SITUACAO, RP.PENDENTES, RP.FIM AS PASSO_FIM,
  K.ULTIMA_OK_EM, CASE WHEN K.ULTIMA_OK_EM IS NULL THEN NULL ELSE TIMESTAMPDIFF(MINUTE, K.ULTIMA_OK_EM, ${AGORA_SQL}) END AS MINUTOS_DESDE,
  ${PARAM_NUM('base.syncIntervaloMin')} AS INTERVALO_MIN,
  CASE WHEN EXISTS (SELECT 1 FROM CC_SINCRONIZACAO X WHERE X.SITUACAO = 'SOLICITADA') THEN 1 ELSE 0 END AS PEDIDO_PENDENTE
FROM (SELECT 1 AS U) U1
${EU}
LEFT JOIN CC_SINCRONIZACAO S ON S.ID = (SELECT MAX(S2.ID) FROM CC_SINCRONIZACAO S2)
LEFT JOIN (SELECT MAX(O.ID) AS OK_ID, MAX(O.FIM) AS ULTIMA_OK_EM FROM CC_SINCRONIZACAO O WHERE O.SITUACAO = 'OK') K ON 1 = 1
LEFT JOIN CC_ROTINA_PASSO RP ON RP.SINCRONIZACAO_ID = K.OK_ID
ORDER BY RP.ID`),
  sql('ccBaseSincronizacaoListar', `SELECT S.ID, S.SITUACAO, S.SOLICITADA_POR, S.SOLICITADA_EM, S.INICIO, S.FIM, S.FASE, S.\`CURSOR\`, S.CLIENTES_LIDOS,
  S.CLIENTES_NOVOS, S.POSICOES_GRAVADAS, S.POSICOES_ZERADAS, S.RECEBIMENTOS_NOVOS, S.RECEBIMENTOS_ESTORNADOS, S.ERRO,
  COALESCE(M.NOME, '') AS SOLICITADA_POR_NOME
FROM CC_SINCRONIZACAO S
${EU}
LEFT JOIN CC_MEMBRO M ON M.ID = S.SOLICITADA_POR
WHERE ${FILTRO_SINCRONIZACAO}
ORDER BY S.ID DESC
LIMIT {{limite}} OFFSET {{offset}}`),
  sql('ccBaseSincronizacaoTotal', `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN S.SITUACAO = 'ERRO' THEN 1 ELSE 0 END), 0) AS COM_ERRO,
  COALESCE(SUM(S.CLIENTES_NOVOS), 0) AS CLIENTES_NOVOS
FROM CC_SINCRONIZACAO S
${EU}
WHERE ${FILTRO_SINCRONIZACAO}`),
  jsDef('ccBaseWinthorDescobrir', sf(corpoWinthorDescobrir, constante('SQL_COLUNAS', W.SQL_COLUNAS), constante('COLUNAS_LIDAS', W.COLUNAS_LIDAS))),

  // ── Escritas ──
  jsDef('ccBaseClienteAtribuir', sf(corpoClienteAtribuir)),
  jsDef('ccBaseClienteClassificar', sf(corpoClienteClassificar, FONTE_VISIVEL)),
  jsDef('ccBaseContatoSalvar', sf(corpoContatoSalvar, FONTE_VISIVEL, FONTE_CONTATO)),
  jsDef('ccBaseContatosRevisar', sf(corpoContatosRevisar, FONTE_VISIVEL)),
  jsDef('ccBaseMembroSalvar', sf(corpoMembroSalvar, FONTE_EQUIPE)),
  jsDef('ccBaseBuSalvar', sf(corpoBuSalvar)),
  jsDef('ccBaseBuDeptoSalvar', sf(corpoBuDeptoSalvar)),
  jsDef('ccBaseParametroSalvar', sf(corpoParametroSalvar, FONTE_VALIDACOES)),
  jsDef('ccBaseFeriadoSalvar', sf(corpoFeriadoSalvar, FONTE_DIAS_UTEIS)),
  jsDef('ccBaseModeloSalvar', sf(corpoModeloSalvar, FONTE_MODELO)),
  jsDef('ccBaseModeloValidar', sf(corpoModeloValidar)),
  jsDef('ccEmailEnviar', sf(corpoEmailEnviar, FONTE_EMAIL_PREPARO, FONTE_EMAIL)),
  jsDef('ccBaseAnexoRegistrar', sf(corpoAnexoRegistrar, FONTE_VISIVEL, FONTE_ANEXO)),
  jsDef('ccBaseAnexoRemover', sf(corpoAnexoRemover, FONTE_VISIVEL)),
  jsDef('ccBaseSincronizacaoPedir', sf(corpoSincronizacaoPedir)),

  // ── Rotina e ganchos ──
  jsDef('ccRotina', sf(corpoRotina, constante('PASSOS', PASSOS)), { cronExpression: '0 */5 * * * *' }),
  jsDef('ccBaseSincronizar', sf(corpoSincronizar, FONTE_CONTEXTO, FONTE_SETOR, FONTE_WINTHOR)),
  jsDef('ccBaseAcessosConciliar', sf(corpoAcessos)),
  sql('ccPodeMover', montarPodeMover(ganchos)),
  sql('ccPodeExcluir', SQL_PODE_EXCLUIR),

  // ── Internas ──
  sql('ccEscBaseAuditoria', `INSERT INTO CC_AUDITORIA (EM, AREA, ENTIDADE, ENTIDADE_ID, CLIENTE_ID, CAMPO, ANTES, DEPOIS, POR, POR_NOME)
SELECT '{{agora}}', '{{area}}', '{{entidade}}', CAST(${ITEM('entidadeIds')} AS SIGNED), CAST(NULLIF(${ITEM('clienteIds')}, '') AS SIGNED),
  ${ITEM('campos')}, ${ITEM('antes')}, ${ITEM('depois')}, NULLIF({{membroId}}, 0),
  COALESCE((SELECT M.NOME FROM CC_MEMBRO M WHERE M.ID = {{membroId}}), 'Rotina')
FROM ${NUMEROS_20}
WHERE N.N <= {{n}} AND (${ROTINA} OR ${ATOR()})`),
  sql('ccEscBaseEstado', `INSERT INTO CC_ESTADO (CHAVE, VALOR, ATUALIZADO_EM)
SELECT '{{chave}}', '{{valor}}', '{{agora}}' FROM DUAL
WHERE (${ROTINA} OR (('{{chave}}' = 'winthor.descoberta' OR ('{{chave}}' = 'jur.cargaConcluida' AND '{{valor}}' = '1')) AND ${A_ADMIN}))
ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR), ATUALIZADO_EM = VALUES(ATUALIZADO_EM)`),
  sql('ccEscBaseRotinaPasso', `INSERT INTO CC_ROTINA_PASSO (SINCRONIZACAO_ID, PASSO, SITUACAO, INICIO, FIM, PROCESSADOS, PENDENTES, EXECUCOES, ERRO)
SELECT {{sincronizacaoId}}, '{{passo}}', '{{situacao}}', NULLIF('{{inicio}}', ''), NULLIF('{{fim}}', ''), {{processados}}, {{pendentes}}, {{execucoes}}, '{{erro}}'
FROM DUAL WHERE ${ROTINA}
ON DUPLICATE KEY UPDATE SITUACAO = VALUES(SITUACAO), INICIO = COALESCE(VALUES(INICIO), INICIO), FIM = VALUES(FIM),
  PROCESSADOS = VALUES(PROCESSADOS), PENDENTES = VALUES(PENDENTES), EXECUCOES = VALUES(EXECUCOES), ERRO = VALUES(ERRO)`),
  sql('ccEscBaseParametro', `INSERT INTO CC_PARAMETRO (CHAVE, CARTEIRA, VALOR, VIGENCIA_INICIO, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT ${ITEM('chaves')}, ${ITEM('carteiras')}, CASE WHEN ${ITEM('nulos')} = '1' THEN NULL ELSE ${ITEM('valores')} END, ${ITEM('vigencias')},
  '{{agora}}', {{membroId}}
FROM ${NUMEROS_20}
WHERE N.N <= {{n}} AND ${A_ADMIN} AND ${ITEM('vigencias')} >= ${HOJE_SQL}
  AND ((${ITEM('chaves')} NOT LIKE 'alcada.%' AND ${ITEM('chaves')} NOT IN (${CHAVES_ALCADA.map((c) => `'${c}'`).join(', ')})) OR ${ATOR('{{membroId}}', 'A.NIVEL >= 3')})
ON DUPLICATE KEY UPDATE VALOR = VALUES(VALOR), ATUALIZADO_EM = VALUES(ATUALIZADO_EM), ATUALIZADO_POR = VALUES(ATUALIZADO_POR)`),
  sql('ccEscBaseClienteAgente', `UPDATE CC_CLIENTE AS C SET AGENTE_ID = NULLIF({{agenteId}}, 0)
WHERE FIND_IN_SET(C.ID, '{{ids}}') > 0
  AND ${ATOR('{{membroId}}', `${NIVEL_MIN(2)} AND ${clienteVisivelA('C', 'A')}
    AND (C.AGENTE_ID IS NOT NULL OR ${veTudo('A')})
    AND (({{agenteId}} = 0 AND ${veTudo('A')})
      OR EXISTS (SELECT 1 FROM CC_MEMBRO D WHERE D.ID = {{agenteId}} AND D.ATIVO = TRUE AND D.CARGO IN ('AGENTE','SUPERVISOR','GERENTE')
        AND (${veTudo('A')} OR (A.CAMINHO <> '' AND D.CAMINHO LIKE CONCAT(A.CAMINHO, '%')))))`)}`),
  sql('ccEscBaseClienteClassificar', `UPDATE CC_CLIENTE AS C SET GRUPO_ECONOMICO = '{{grupoEconomico}}', ESFERA = NULLIF('{{esfera}}', '')
WHERE C.ID = {{clienteId}} AND ${ATOR('{{membroId}}', `${NIVEL_MIN(2)} AND ${clienteVisivelA('C', 'A')}`)}`),
  // Analista (004/005): destino ativo e não Jurídico; o ator vê o cliente e põe a si mesmo, ou N2 põe outro e limpa.
  sql('ccEscBaseClienteAnalista', `UPDATE CC_CLIENTE AS C SET ANALISTA_ID = NULLIF({{analistaId}}, 0)
WHERE C.ID = {{clienteId}}
  AND ({{analistaId}} = 0 OR EXISTS (SELECT 1 FROM CC_MEMBRO D WHERE D.ID = {{analistaId}} AND D.ATIVO = TRUE AND D.CARGO <> 'JURIDICO'))
  AND (${ROTINA} OR ${ATOR('{{membroId}}', `${clienteVisivelA('C', 'A')} AND (A.ID = {{analistaId}} OR ${NIVEL_MIN(2)})`)})`),
  // NO_JURIDICO (003, e a 002 no envio): `JUR` de 04 (cargo Jurídico ou administra), sem exigir o cliente visível
  // (o Jurídico só vê cliente já marcado, O-09); ou nível ≥ jur.envioNivelMin com o cliente visível.
  sql('ccEscBaseClienteJuridico', `UPDATE CC_CLIENTE AS C SET NO_JURIDICO = ({{noJuridico}} = 1)
WHERE C.ID = {{clienteId}} AND (${ROTINA} OR ${ATOR('{{membroId}}', `(A.CARGO = 'JURIDICO' OR ${PODE_ADMINISTRAR}
    OR (A.NIVEL >= ${PARAM_NUM('jur.envioNivelMin')} AND ${clienteVisivelA('C', 'A')}))`)})`),
  sql('ccEscBaseContatoInserir', `INSERT INTO CC_CONTATO_CLIENTE (CLIENTE_ID, NOME, AREA, FUNCAO, TELEFONE, WHATSAPP, EMAIL, SITUACAO, OBS, PRINCIPAL, BUSCA, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT {{clienteId}}, '{{nome}}', '{{area}}', '{{funcao}}', '{{telefone}}', '{{whatsapp}}', '{{email}}', '{{situacao}}', '{{obs}}',
  ({{principal}} = 1), '{{busca}}', '{{agora}}', {{membroId}}
FROM DUAL
WHERE NOT ({{principal}} = 1 AND '{{situacao}}' = 'NAO_USAR') AND ${A_VE_CLIENTE()}`),
  // O contato e o principal anterior num UPDATE só: nunca dois principais.
  sql('ccEscBaseContatoAtualizar', `UPDATE CC_CONTATO_CLIENTE SET
  ATUALIZADO_EM = CASE WHEN ID = {{id}} AND {{mudou}} = 1 THEN '{{agora}}' WHEN ID <> {{id}} THEN '{{agora}}' ELSE ATUALIZADO_EM END,
  ATUALIZADO_POR = CASE WHEN ID = {{id}} AND {{mudou}} = 1 THEN {{membroId}} WHEN ID <> {{id}} THEN {{membroId}} ELSE ATUALIZADO_POR END,
  NOME = CASE WHEN ID = {{id}} THEN '{{nome}}' ELSE NOME END,
  AREA = CASE WHEN ID = {{id}} THEN '{{area}}' ELSE AREA END,
  FUNCAO = CASE WHEN ID = {{id}} THEN '{{funcao}}' ELSE FUNCAO END,
  TELEFONE = CASE WHEN ID = {{id}} THEN '{{telefone}}' ELSE TELEFONE END,
  WHATSAPP = CASE WHEN ID = {{id}} THEN '{{whatsapp}}' ELSE WHATSAPP END,
  EMAIL = CASE WHEN ID = {{id}} THEN '{{email}}' ELSE EMAIL END,
  SITUACAO = CASE WHEN ID = {{id}} THEN '{{situacao}}' ELSE SITUACAO END,
  OBS = CASE WHEN ID = {{id}} THEN '{{obs}}' ELSE OBS END,
  BUSCA = CASE WHEN ID = {{id}} THEN '{{busca}}' ELSE BUSCA END,
  PRINCIPAL = CASE WHEN ID = {{id}} THEN ({{principal}} = 1) ELSE FALSE END
WHERE CLIENTE_ID = {{clienteId}} AND (ID = {{id}} OR ({{principal}} = 1 AND PRINCIPAL = TRUE))
  AND NOT ({{principal}} = 1 AND '{{situacao}}' = 'NAO_USAR') AND ${A_VE_CLIENTE()}`),
  sql('ccEscBaseContatosRevisar', `UPDATE CC_CLIENTE AS C SET CONTATOS_REVISADO_EM = '{{agora}}', CONTATOS_REVISADO_POR = {{membroId}}
WHERE C.ID = {{clienteId}} AND ${ATOR('{{membroId}}', clienteVisivelA('C', 'A'))}`),
  // B-01: NIVEL pelo cargo e CAMINHO pelo superior, na SQL; o novo membro nasce com CAMINHO '' (C-01).
  // D-014: cargo de nível ≥ 3 só por quem tem nível igual ou maior (A.NIVEL, nunca a marca).
  sql('ccEscBaseMembroInserir', `INSERT INTO CC_MEMBRO (NOME, NOME_CHAVE, USER_EMAIL, USER_ID, CARGO, NIVEL, SUPERIOR_ID, CAMINHO, ADMIN, ATIVO, CRIADO_EM, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT '{{nome}}', '{{nomeChave}}', '{{userEmail}}', (SELECT MIN(U.ID) FROM INT_USER U WHERE LOWER(U.DESCR) = '{{userEmail}}'),
  '{{cargo}}', ${NIVEL_CARGO}, {{superiorId}}, '', ({{admin}} = 1), ({{ativo}} = 1), '{{agora}}', '{{agora}}', {{membroId}}
FROM DUAL
WHERE ${NIVEL_CARGO} IS NOT NULL AND {{superiorId}} > 0 AND ${SUPERIOR_VALIDO()}
  AND ${ATOR_DERIVADO(`${PODE_ADMINISTRAR} AND ({{admin}} = 0 OR A.ADMIN = TRUE)
    AND (${NIVEL_CARGO} < 3 OR A.NIVEL >= ${NIVEL_CARGO})`)}`),
  // Linha do membro por CASE e o prefixo do CAMINHO de toda a subárvore (01 §6). `caminhoAntigo` tem de ser o
  // gravado; o caminho novo é o do superior gravado + id (B-01). Guarda: D-014 (próprio e cargo ≥ 3), RN-011
  // (superior válido, sem ciclo, quem chefia não perde o cargo), marca ADMIN e último Administrador.
  sql('ccEscBaseMembroAtualizar', `UPDATE CC_MEMBRO SET
  NOME = CASE WHEN ID = {{id}} THEN '{{nome}}' ELSE NOME END,
  NOME_CHAVE = CASE WHEN ID = {{id}} THEN '{{nomeChave}}' ELSE NOME_CHAVE END,
  USER_EMAIL = CASE WHEN ID = {{id}} THEN '{{userEmail}}' ELSE USER_EMAIL END,
  CARGO = CASE WHEN ID = {{id}} THEN '{{cargo}}' ELSE CARGO END,
  NIVEL = CASE WHEN ID = {{id}} THEN ${NIVEL_CARGO} ELSE NIVEL END,
  SUPERIOR_ID = CASE WHEN ID = {{id}} THEN NULLIF({{superiorId}}, 0) ELSE SUPERIOR_ID END,
  ADMIN = CASE WHEN ID = {{id}} THEN ({{admin}} = 1) ELSE ADMIN END,
  ATIVO = CASE WHEN ID = {{id}} THEN ({{ativo}} = 1) ELSE ATIVO END,
  ATUALIZADO_EM = CASE WHEN ID = {{id}} THEN '{{agora}}' ELSE ATUALIZADO_EM END,
  ATUALIZADO_POR = CASE WHEN ID = {{id}} THEN {{membroId}} ELSE ATUALIZADO_POR END,
  CAMINHO = CASE WHEN '{{caminhoAntigo}}' <> '' AND CAMINHO LIKE CONCAT('{{caminhoAntigo}}', '%')
                   THEN CONCAT(${CAMINHO_NOVO}, SUBSTRING(CAMINHO, CHAR_LENGTH('{{caminhoAntigo}}') + 1))
                 WHEN ID = {{id}} THEN ${CAMINHO_NOVO} ELSE CAMINHO END
WHERE (ID = {{id}} OR ('{{caminhoAntigo}}' <> '' AND CAMINHO LIKE CONCAT('{{caminhoAntigo}}', '%')))
  AND ${NIVEL_CARGO} IS NOT NULL
  AND ${EXISTE_MEMBRO("X.ID = {{id}} AND X.CAMINHO = '{{caminhoAntigo}}'")}
  AND ({{superiorId}} = 0 OR ${SUPERIOR_VALIDO("X.ID <> {{id}} AND ('{{caminhoAntigo}}' = '' OR X.CAMINHO NOT LIKE CONCAT('{{caminhoAntigo}}', '%'))")})
  AND ({{superiorId}} > 0 OR '{{cargo}}' = 'DIRETORIA' OR ${EXISTE_MEMBRO('X.ID = {{id}} AND X.SUPERIOR_ID IS NULL')})
  AND (('{{cargo}}' IN ('SUPERVISOR','GERENTE','DIRETORIA') AND {{ativo}} = 1)
    OR NOT ${EXISTE_MEMBRO('X.SUPERIOR_ID = {{id}} AND X.ATIVO = TRUE')})
  AND ${ATOR_DERIVADO(`${PODE_ADMINISTRAR}
    AND (A.ADMIN = TRUE OR NOT EXISTS (SELECT 1 FROM CC_MEMBRO Y WHERE Y.ID = {{id}} AND Y.ADMIN <> ({{admin}} = 1)))
    AND (A.ID <> {{id}} OR (A.CARGO = '{{cargo}}' AND COALESCE(A.SUPERIOR_ID, 0) = {{superiorId}}
      AND A.ADMIN = ({{admin}} = 1) AND {{ativo}} = 1))
    AND (${NIVEL_CARGO} < 3 OR A.NIVEL >= ${NIVEL_CARGO}
      OR EXISTS (SELECT 1 FROM CC_MEMBRO Y WHERE Y.ID = {{id}} AND Y.CARGO = '{{cargo}}'))`)}
  AND (({{admin}} = 1 AND {{ativo}} = 1)
    OR ${EXISTE_MEMBRO('X.ADMIN = TRUE AND X.ATIVO = TRUE AND X.ID <> {{id}}')}
    OR NOT ${EXISTE_MEMBRO('X.ID = {{id}} AND X.ADMIN = TRUE AND X.ATIVO = TRUE')})`),
  sql('ccEscBaseBuSalvar', `INSERT INTO CC_BU (ID, NOME, CARTEIRA, ORDEM, ATIVA)
SELECT NULLIF({{buId}}, 0), '{{nome}}', '{{carteira}}', {{ordem}}, ({{ativa}} = 1) FROM DUAL
WHERE '{{carteira}}' IN ('PRIVADA', 'ESTETICA') AND ${A_ADMIN}
ON DUPLICATE KEY UPDATE NOME = VALUES(NOME), CARTEIRA = VALUES(CARTEIRA), ORDEM = VALUES(ORDEM), ATIVA = VALUES(ATIVA)`),
  sql('ccEscBaseBuDepto', `UPDATE CC_BU_DEPTO SET BU_ID = NULLIF({{buId}}, 0), ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = {{membroId}}
WHERE CODEPTO = {{codepto}} AND ${A_ADMIN}
  AND ({{buId}} = 0 OR EXISTS (SELECT 1 FROM CC_BU B WHERE B.ID = {{buId}} AND B.ATIVA = TRUE))`),
  sql('ccEscBaseFeriado', `INSERT INTO CC_FERIADO (ID, DATA, NOME, ABRANGENCIA, UF, MUNICIPIO, ORIGEM)
SELECT NULLIF({{feriadoId}}, 0), '{{data}}', '{{nome}}', '{{abrangencia}}', '{{uf}}', '{{municipio}}', 'MANUAL' FROM DUAL
WHERE '{{abrangencia}}' IN ('NACIONAL', 'UF', 'MUNICIPIO') AND ${A_ADMIN}
ON DUPLICATE KEY UPDATE DATA = VALUES(DATA), NOME = VALUES(NOME), ABRANGENCIA = VALUES(ABRANGENCIA), UF = VALUES(UF), MUNICIPIO = VALUES(MUNICIPIO)`),
  sql('ccEscBaseFeriadoRemover', `DELETE FROM CC_FERIADO WHERE ID = {{feriadoId}} AND ${A_ADMIN}`),
  sql('ccEscBaseFeriadosInserir', `INSERT IGNORE INTO CC_FERIADO (DATA, NOME, ABRANGENCIA, UF, MUNICIPIO, ORIGEM)
SELECT ${ITEM('datas')}, ${ITEM('nomes')}, 'NACIONAL', '', '', 'GERADO'
FROM ${NUMEROS_20}
WHERE N.N <= {{n}} AND ${A_ADMIN}`),
  sql('ccEscBaseModelo', `UPDATE CC_MODELO_MENSAGEM SET VERSAO = VERSAO + 1, ASSUNTO = '{{assunto}}', CORPO = '{{corpo}}',
  ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = {{membroId}}
WHERE CODIGO = '{{codigo}}' AND VERSAO = {{versaoAtual}} AND ${A_ADMIN}`),
  sql('ccEscBaseModeloValidar', `UPDATE CC_MODELO_MENSAGEM SET VALIDADO_VERSAO = VERSAO, VALIDADO_EM = '{{agora}}', VALIDADO_POR = {{membroId}}
WHERE CODIGO = '{{codigo}}' AND EFEITO_LEGAL = TRUE AND VERSAO = {{versao}}
  AND ${ATOR('{{membroId}}', `(A.CARGO = 'JURIDICO' OR A.NIVEL >= ${PARAM_NUM('com.modeloValidaNivel')})`)}`),
  sql('ccEscBaseEmailInserir', `INSERT INTO CC_EMAIL_ENVIADO (MODELO_ID, MODELO_CODIGO, MODELO_VERSAO, CLIENTE_ID, PARA, ASSUNTO, CORPO, ORIGEM, REFERENCIA, ENVIADO_EM, ENVIADO_POR, RESULTADO, ERRO)
SELECT NULLIF({{modeloId}}, 0), '{{modeloCodigo}}', {{modeloVersao}}, NULLIF({{clienteId}}, 0), '{{para}}', '{{assunto}}', '{{corpo}}', '{{origem}}',
  '{{referencia}}', '{{agora}}', NULLIF({{membroId}}, 0), '{{resultado}}', '{{erro}}'
FROM DUAL
WHERE '{{resultado}}' IN ('ENVIADO', 'FALHOU') AND (${ROTINA} OR ${A_VE_CLIENTE()})`),
  sql('ccEscBaseAnexoInserir', `INSERT INTO CC_ANEXO (ENTIDADE, ENTIDADE_ID, CLIENTE_ID, TIPO_DOC, NOME_ARQUIVO, MIME, TAMANHO_BYTES, URL, ENVIADO_EM, ENVIADO_POR)
SELECT '{{entidade}}', {{entidadeId}}, NULLIF({{clienteId}}, 0), '{{tipoDoc}}', '{{nomeArquivo}}', '{{mime}}', {{tamanhoBytes}}, '{{url}}', '{{agora}}', {{membroId}}
FROM DUAL
WHERE {{tamanhoBytes}} > 0 AND {{tamanhoBytes}} <= 20971520
  AND ${ATOR('{{membroId}}', `(('{{entidade}}' = 'CLIENTE' AND EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = {{entidadeId}} AND C.ID = {{clienteId}} AND ${clienteVisivelA('C', 'A')}))
    OR ('{{entidade}}' = 'MATERIAL' AND ${PODE_ADMINISTRAR})
    OR ('{{entidade}}' = 'CERTIDAO' AND ${NIVEL_MIN(2)}))`)}`),
  sql('ccEscBaseAnexoRemover', `UPDATE CC_ANEXO SET REMOVIDO_EM = '{{agora}}', REMOVIDO_POR = {{membroId}}
WHERE ID = {{anexoId}} AND REMOVIDO_EM IS NULL
  AND ${ATOR('{{membroId}}', `(A.ID = CC_ANEXO.ENVIADO_POR OR ${NIVEL_MIN(2)})
    AND (CC_ANEXO.ENTIDADE <> 'CLIENTE' OR EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = CC_ANEXO.CLIENTE_ID AND ${clienteVisivelA('C', 'A')}))`)}`),
  sql('ccEscBaseSincronizacaoPedir', `INSERT INTO CC_SINCRONIZACAO (SITUACAO, SOLICITADA_POR, SOLICITADA_EM)
SELECT 'SOLICITADA', {{membroId}}, '{{agora}}' FROM DUAL
WHERE ${ATOR('{{membroId}}', NIVEL_MIN(2))}
  AND NOT EXISTS (SELECT 1 FROM (SELECT S.ID FROM CC_SINCRONIZACAO S WHERE S.SITUACAO IN ('SOLICITADA', 'EM_ANDAMENTO')) P)`),
  sql('ccBaseWinthorTitulos', W.SQL_TITULOS_CLIENTE, { jdbcId: W.MARCADOR_JDBC_WINTHOR }),
  sql('ccBaseWinthorCliente', W.SQL_CLIENTE, { jdbcId: W.MARCADOR_JDBC_WINTHOR }),
];

/* ── publicação (só no sandbox) ── */

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntrypoint()) {
  if (!process.env.MITRA_BASE_URL) throw new Error('MITRA_BASE_URL ausente: este script roda no sandbox do Mitra, com o .env real.');
  const sdk = await import('mitra-sdk');
  sdk.configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  const { jdbcIdWinthor } = await import('./add-002-jdbc-winthor.mjs');
  const jdbc = await jdbcIdWinthor(projectId);
  const lerMapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const publicar = async (def, mapa) => {
    const code = def.type === 'JAVASCRIPT' ? injetarIds(def.code, mapa).split(W.MARCADOR_JDBC_WINTHOR).join(String(jdbc)) : def.code;
    const dados = {
      name: def.name, type: def.type, code, description: `Crédito e Cobrança · 001-base · ${def.name}`,
      ...(def.jdbcId === W.MARCADOR_JDBC_WINTHOR ? { jdbcId: jdbc } : {}), ...(def.cronExpression ? { cronExpression: def.cronExpression } : {}),
    };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  // 1ª passada: cria o que falta (upsert pelo nome); 2ª: republica as JS com o mapa completo.
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 001 (conexão ${NOME_JDBC_WINTHOR} = ${jdbc}); ganchos com ${ganchos.length} quadro(s).`);
  console.log('Rode o add-001-kanban de novo (liga os ganchos), o add-090 e o sync-server-function-map.');
}
