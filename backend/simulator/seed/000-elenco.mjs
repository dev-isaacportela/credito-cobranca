// Elenco único (06 §2): usuários, equipe, dados de referência do Winthor simulado e os ajudantes que
// os seeds das specs usam (`dia`, `diaUtil`, `nota`, `atribuir`). Ninguém cria usuário, membro, BU,
// ramo ou filial fora daqui. Parâmetros, modelos, BUs e feriados nacionais pela MESMA semeadura do
// setup-backend.mjs (`semearReferencia`).
//
// Os ajudantes trabalham sobre o banco que o pipeline (seed.mjs) está montando: `usarBanco()` é
// chamado por ele antes do passo 2 e fixa o banco, o runner e o RELOGIO do banco (base de `dia(n)`).

import { semearReferencia } from '../../setup-backend.mjs';
import { somarDias, somarDiasUteis } from '../../lib/dias-uteis.mjs';
import { nomeChave } from '../../lib/base/equipe.mjs';
import { agora } from '../../lib/tempo.mjs';
import { toSqlite } from '../mysql-dialect.mjs';
import { DEFAULT_PASSWORD } from '../config.mjs';
import { txt } from '../../lib/texto-sql.mjs';

/* ── 06 §2.1 ── */

// INT_USER na ordem (id = posição); membro = CC_MEMBRO.ID.
export const USUARIOS = [
  { id: 1, login: 'nara', nome: 'Nara Admin', membro: 9 },
  { id: 2, login: 'diana', nome: 'Diana Rocha', membro: 1 },
  { id: 3, login: 'gustavo', nome: 'Gustavo Lima', membro: 2 },
  { id: 4, login: 'sergio', nome: 'Sérgio Nunes', membro: 3 },
  { id: 5, login: 'silvia', nome: 'Silvia Prado', membro: 4 },
  { id: 6, login: 'ana', nome: 'Ana Costa', membro: 5 },
  { id: 7, login: 'bruno', nome: 'Bruno Dias', membro: 6 },
  { id: 8, login: 'carlos', nome: 'Carlos Melo', membro: 7 },
  { id: 9, login: 'julia', nome: 'Júlia Farias', membro: 8 },
  { id: 10, login: 'otavio', nome: 'Otávio Reis', membro: 10 },
  { id: 11, login: 'visitante', nome: 'Visitante', membro: 0 },
  { id: 12, login: 'rita', nome: 'Rita Alves', membro: 11 },
].map((u) => ({ ...u, email: `${u.login}@benenutri.local`, senha: DEFAULT_PASSWORD }));

export const EQUIPE = [
  { id: 1, login: 'diana', cargo: 'DIRETORIA', nivel: 5, superior: null, caminho: '/1/' },
  { id: 2, login: 'gustavo', cargo: 'GERENTE', nivel: 3, superior: 1, caminho: '/1/2/' },
  { id: 3, login: 'sergio', cargo: 'SUPERVISOR', nivel: 2, superior: 2, caminho: '/1/2/3/' },
  { id: 4, login: 'silvia', cargo: 'SUPERVISOR', nivel: 2, superior: 2, caminho: '/1/2/4/' },
  { id: 5, login: 'ana', cargo: 'AGENTE', nivel: 1, superior: 3, caminho: '/1/2/3/5/' },
  { id: 6, login: 'bruno', cargo: 'AGENTE', nivel: 1, superior: 3, caminho: '/1/2/3/6/' },
  { id: 7, login: 'carlos', cargo: 'AGENTE', nivel: 1, superior: 4, caminho: '/1/2/4/7/' },
  { id: 8, login: 'julia', cargo: 'JURIDICO', nivel: 0, superior: 2, caminho: '/1/2/8/' },
  { id: 9, login: 'nara', cargo: 'AGENTE', nivel: 1, superior: 2, caminho: '/1/2/9/', admin: true },
  { id: 10, login: 'otavio', cargo: 'AGENTE', nivel: 1, superior: 3, caminho: '/1/2/3/10/', ativo: false },
  { id: 11, login: 'rita', cargo: 'ANALISTA', nivel: 1, superior: 3, caminho: '/1/2/3/11/' },
];

/** userId e membroId por login: `U.ana` = 6, `M.ana` = 5. */
export const U = Object.fromEntries(USUARIOS.map((u) => [u.login, u.id]));
export const M = Object.fromEntries(EQUIPE.map((m) => [m.login, m.id]));

/* ── 06 §2.2 ── */

export const DEPARTAMENTOS = [
  { codepto: 10, nome: 'NUTRICAO', bu: 1 },
  { codepto: 20, nome: 'ENFERMAGEM', bu: 2 },
  { codepto: 30, nome: 'MEDICAMENTOS', bu: 3 },
  { codepto: 40, nome: 'ESTETICA E INJETAVEIS', bu: 4 },
  { codepto: 90, nome: 'DIVERSOS', bu: null },
];
export const PRODUTOS = [[101, 10], [201, 20], [301, 30], [401, 40], [901, 90]];
export const RAMOS = [
  [1, 'HOSPITAL'], [2, 'CLINICA'], [3, 'FARMACIA'], [4, 'HOME CARE'], [11, 'ORGAO PUBLICO FEDERAL'],
  [12, 'ORGAO PUBLICO ESTADUAL'], [13, 'ORGAO PUBLICO MUNICIPAL'], [20, 'ORGAO PUBLICO AUTARQUIA'],
];
export const RCAS = [[10, 'CARLOS LIMA'], [11, 'MARIA SOUZA']];
export const PLANOS = [['1', 'A VISTA', 0], ['30', '30 DIAS', 30], ['35', '28/35/42 DIAS', 35]];
export const COBRANCAS = [['BK', 'BOLETO'], ['PIX', 'PIX'], ['DESD', 'DESDOBRADO'], ['CANC', 'CANCELADO']];
export const FILIAIS = [['1', 'BENENUTRI MATRIZ', 'DF'], ['2', 'BENENUTRI GOIAS', 'GO']];
export const FERIADO_DF = { data: '2026-11-30', nome: 'Dia do Evangélico', uf: 'DF' };

/* ── atribuição (06 §2.4, coluna Agente, e §2.5, linha "Atribuição") ── */

const faixa = (de, ate, extra) => Array.from({ length: ate - de + 1 }, (_, i) => ({ codcli: de + i, ...extra }));
export const ATRIBUICAO = [
  ...[1001, 1002, 1010].map((codcli) => ({ codcli, agente: 'ana' })),
  ...[1004, 1005, 1012].map((codcli) => ({ codcli, agente: 'bruno' })),
  ...[1006, 1007].map((codcli) => ({ codcli, agente: 'carlos' })),
  { codcli: 1008, agente: 'sergio' },
  ...faixa(2001, 2007, { agente: 'ana' }),
  ...faixa(2008, 2014, { agente: 'bruno' }),
  ...faixa(3001, 3003, { agente: 'ana' }),
  { codcli: 3013, agente: 'ana' },
  ...faixa(3005, 3012, { agente: 'bruno' }),
  ...faixa(3017, 3020, { agente: 'bruno' }),
  { codcli: 3014, agente: 'carlos' },
  { codcli: 3004, agente: 'carlos' },
  ...faixa(5001, 5005, { agente: 'carlos' }),
  ...faixa(4001, 4010, { agente: 'bruno', analista: 'rita' }),
  ...faixa(6001, 6005, { agente: 'ana' }),
  ...faixa(6006, 6010, { agente: 'carlos' }),
  ...faixa(7001, 7003, { agente: 'ana' }),
];

/* ── banco atual (fixado pelo pipeline) ── */

let banco = null;

/** `{ db, runner, relogio }` do banco em montagem. */
export function usarBanco(ctx) {
  banco = ctx;
}

function atual() {
  if (!banco) throw new Error('Ajudante do elenco fora do pipeline: chame montarBanco() (seed.mjs).');
  return banco;
}

/** `{ db, runner, relogio }` do banco em montagem (o `dominio()` grava as tabelas da própria spec por `db`). */
export const bancoDoSeed = () => atual();

/** SF executada como o login do elenco (`null` = sem sessão), para o `dominio()` dos seeds. Recusa lança. */
export async function chamarComo(login, nome, input = {}) {
  const r = await atual().runner.executar(nome, input, { userId: login ? U[login] : 0 });
  if (r && r.ok === false) throw new Error(`${nome} recusou no seed: ${r.error}`);
  return r;
}

export const execSqlite = (db) => ({
  consultar: async (sql) => db.prepare(toSqlite(sql)).all().map((l) => ({ ...l })),
  executar: async (sql) => { db.prepare(toSqlite(sql)).run(); },
});


/** `RELOGIO` do banco + n dias corridos (`dia(-12)` = 12 dias atrás). */
export function dia(n) {
  return somarDias(String(atual().relogio).slice(0, 10), n);
}

/** `RELOGIO` do banco + n dias úteis (feriados nacionais de CC_FERIADO; n = 0 = próximo útil). */
export function diaUtil(n) {
  const { db, relogio } = atual();
  const feriados = db.prepare("SELECT DATA FROM CC_FERIADO WHERE ABRANGENCIA = 'NACIONAL'").all().map((l) => l.DATA);
  return somarDiasUteis(String(relogio).slice(0, 10), n, feriados);
}

/** Documento de 06 §2.3: CNPJ `AB.CD0.000/0001-AB` (PJ) ou CPF `AB0.CD0.000-AB` (PF); 1001 é fixo. */
export function documentoDe(codcli, tipo = 'J') {
  if (Number(codcli) === 1001) return '12.345.678/0001-90';
  const c = String(codcli).padStart(4, '0');
  const [ab, cd] = [c.slice(0, 2), c.slice(2, 4)];
  return tipo === 'F' ? `${ab}0.${cd}0.000-${ab}` : `${ab}.${cd}0.000/0001-${ab}`;
}

/**
 * Cadastro do cliente no Winthor simulado (PCCLIENT). `ramo` = PCATIVI, `tipo` 'J'/'F', `limite`,
 * `uf`, `plano` (CODPLPAG), `rca` (CODUSUR), `email`, `cadastro` (data). Documento pela regra de §2.3.
 */
export function cliente({ codcli, nome, ramo = 1, tipo = 'J', uf = 'DF', limite = 0, plano = '30', rca = 10, email = '', cadastro, municipio }) {
  const { db } = atual();
  db.prepare(`INSERT OR REPLACE INTO PCCLIENT (CODCLI, CLIENTE, FANTASIA, CGCENT, TIPOFJ, ESTENT, MUNICENT, EMAIL, CODATV1, CODUSUR1, CODPLPAG, LIMCRED, DTCADASTRO)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(codcli, nome, nome, documentoDe(codcli, tipo), tipo, uf,
    municipio ?? (uf === 'GO' ? 'GOIANIA' : 'BRASILIA'), email, ramo, rca, String(plano), limite, cadastro ?? dia(-800));
}

/**
 * Uma nota coerente (06 §2.3): PCNFSAID, PCMOV + PCMOVCOMPLE (é o que dá BU por item) e PCPREST.
 * NUMTRANSVENDA = codcli × 100 + n; DUPLIC = NUMTRANSVENDA; `numnota` omitido = NUMTRANSVENDA.
 * Parcela: { prest, valor, venc, pago? (true = valor; número = valor pago), pagoEm?, codcob? ('BK'),
 * cancelEm? }. `cancelEm` na nota cancela nota, itens e parcelas. Atualiza PCCLIENT.DTULTCOMP.
 */
export function nota({ codcli, n, emissao, numnota, codfilial = '1', itens = [], parcelas = [], cancelEm = null }) {
  const { db } = atual();
  const trans = Number(codcli) * 100 + Number(n);
  const num = numnota ?? trans;
  const total = itens.reduce((s, i) => s + Number(i.valor), 0);
  db.prepare(`INSERT INTO PCNFSAID (NUMTRANSVENDA, CODFILIAL, NUMNOTA, SERIE, CODCLI, DTSAIDA, VLTOTAL, DTCANCEL, TIPOVENDA, CODFISCAL, CONDVENDA)
VALUES (?, ?, ?, '1', ?, ?, ?, ?, 'VV', 5102, 1)`).run(trans, codfilial, num, codcli, emissao, total, cancelEm);
  itens.forEach((item, i) => {
    const numTransItem = trans * 100 + i + 1;
    db.prepare(`INSERT INTO PCMOV (NUMTRANSITEM, NUMTRANSVENDA, CODFILIAL, CODPROD, CODCLI, CODOPER, DTMOV, QT, PUNIT, DTCANCEL, NUMNOTA)
VALUES (?, ?, ?, ?, ?, 'S', ?, 1, ?, ?, ?)`).run(numTransItem, trans, codfilial, item.codprod, codcli, emissao, item.valor, cancelEm, num);
    db.prepare('INSERT INTO PCMOVCOMPLE (NUMTRANSITEM, VLSUBTOTITEM) VALUES (?, ?)').run(numTransItem, item.valor);
  });
  for (const p of parcelas) {
    const vpago = p.pago === true ? p.valor : Number(p.pago || 0);
    db.prepare(`INSERT INTO PCPREST (NUMTRANSVENDA, PREST, CODFILIAL, CODCLI, DUPLIC, VALOR, VPAGO, DTVENC, DTPAG, DTEMISSAO, CODCOB, DTCANCEL)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(trans, String(p.prest), codfilial, codcli, trans, p.valor, vpago,
      p.venc, p.pago ? (p.pagoEm ?? p.venc) : null, emissao, p.codcob ?? 'BK', p.cancelEm ?? cancelEm);
  }
  if (!cancelEm) {
    db.prepare("UPDATE PCCLIENT SET DTULTCOMP = ? WHERE CODCLI = ? AND (DTULTCOMP IS NULL OR DTULTCOMP < ?)").run(emissao, codcli, emissao);
  }
  return trans;
}

/**
 * Atribuição do passo 7 (06 §2.3): agente por `ccBaseClienteAtribuir` como Gustavo (lotes de até 20
 * por agente); analista por `ccEscBaseClienteAnalista` com o membroId de Gustavo, sem sessão.
 * Cliente ausente de CC_CLIENTE é pulado. SF não publicada: devolve `{ pulado }` (o pipeline avisa).
 */
export async function atribuir(linhas = ATRIBUICAO) {
  const { db, runner } = atual();
  const ids = new Map(db.prepare('SELECT ID, CODCLI FROM CC_CLIENTE').all().map((l) => [Number(l.CODCLI), Number(l.ID)]));
  const presentes = linhas.filter((l) => ids.has(Number(l.codcli)));
  const faltam = ['ccBaseClienteAtribuir', 'ccEscBaseClienteAnalista'].filter((nome) => !runner.existe(nome));
  if (faltam.length) return { pulado: faltam, clientes: presentes.length };

  const porAgente = new Map();
  for (const l of presentes.filter((x) => x.agente)) {
    const agente = M[l.agente];
    if (!agente) throw new Error(`Atribuição do ${l.codcli}: agente ${l.agente} fora do elenco.`);
    porAgente.set(agente, [...(porAgente.get(agente) || []), ids.get(Number(l.codcli))]);
  }
  for (const [agenteId, clientes] of porAgente) {
    for (let i = 0; i < clientes.length; i += 20) {
      const r = await runner.executar('ccBaseClienteAtribuir', { clienteIds: clientes.slice(i, i + 20).join(','), agenteId }, { userId: U.gustavo });
      if (r && r.ok === false) throw new Error(`ccBaseClienteAtribuir recusou: ${r.error}`);
    }
  }
  for (const l of presentes.filter((x) => x.analista)) {
    await runner.executar('ccEscBaseClienteAnalista', {
      clienteId: ids.get(Number(l.codcli)), analistaId: M[l.analista], membroId: M.gustavo, agora: agora(),
    }, { userId: 0 });
  }
  return { clientes: presentes.length };
}

/* ── passo 2 do pipeline ── */

/** Grava o elenco no banco atual. Idempotente o bastante para rodar uma vez por banco novo. */
export async function semearElenco() {
  const { db } = atual();
  const exec = execSqlite(db);
  const quando = agora();

  const usuario = db.prepare('INSERT INTO INT_USER (ID, DESCR, NOME, ACCESS_LEVEL, ATIVO) VALUES (?, ?, ?, ?, 1)');
  for (const u of USUARIOS) usuario.run(u.id, u.email, u.nome, 'MEMBER');

  const membro = db.prepare(`INSERT INTO CC_MEMBRO (ID, NOME, NOME_CHAVE, USER_EMAIL, USER_ID, CARGO, NIVEL, SUPERIOR_ID, CAMINHO, ADMIN, ATIVO, CRIADO_EM, ATUALIZADO_EM)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const m of EQUIPE) {
    const u = USUARIOS.find((x) => x.login === m.login);
    membro.run(m.id, u.nome, nomeChave(u.nome), u.email, u.id, m.cargo, m.nivel, m.superior, m.caminho,
      m.admin ? 1 : 0, m.ativo === false ? 0 : 1, quando, quando);
  }

  await semearReferencia(exec, { agoraIso: quando, anos: [2026, 2027] });
  await exec.executar(`INSERT IGNORE INTO CC_FERIADO (DATA, NOME, ABRANGENCIA, UF, MUNICIPIO, ORIGEM)
VALUES (${txt(FERIADO_DF.data)}, ${txt(FERIADO_DF.nome)}, 'UF', ${txt(FERIADO_DF.uf)}, '', 'MANUAL')`);

  for (const d of DEPARTAMENTOS) {
    db.prepare('INSERT INTO PCDEPTO (CODEPTO, DESCRICAO) VALUES (?, ?)').run(d.codepto, d.nome);
    db.prepare('INSERT INTO CC_BU_DEPTO (CODEPTO, DEPTO_NOME, BU_ID, ATUALIZADO_EM) VALUES (?, ?, ?, ?)').run(d.codepto, d.nome, d.bu, quando);
  }
  for (const [codprod, codepto] of PRODUTOS) db.prepare('INSERT INTO PCPRODUT (CODPROD, DESCRICAO, CODEPTO) VALUES (?, ?, ?)').run(codprod, `PRODUTO ${codprod}`, codepto);
  for (const [cod, ramo] of RAMOS) db.prepare('INSERT INTO PCATIVI (CODATIV, RAMO) VALUES (?, ?)').run(cod, ramo);
  for (const [cod, nome] of RCAS) db.prepare('INSERT INTO PCUSUARI (CODUSUR, NOME) VALUES (?, ?)').run(cod, nome);
  for (const [cod, descricao, dias] of PLANOS) db.prepare('INSERT INTO PCPLPAG (CODPLPAG, DESCRICAO, NUMDIAS) VALUES (?, ?, ?)').run(cod, descricao, dias);
  for (const [cod, nome] of COBRANCAS) db.prepare('INSERT INTO PCCOB (CODCOB, COBRANCA) VALUES (?, ?)').run(cod, nome);
  for (const [codigo, nome, uf] of FILIAIS) db.prepare('INSERT INTO PCFILIAL (CODIGO, RAZAOSOCIAL, FANTASIA, UF) VALUES (?, ?, ?, ?)').run(codigo, nome, nome, uf);

  // CC_FILIAL_CREDORA é da 003: só CODIGO, UF e ATIVA; sem a tabela, pula.
  const credora = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'CC_FILIAL_CREDORA'").get();
  if (credora) for (const [codigo, , uf] of FILIAIS) db.prepare('INSERT INTO CC_FILIAL_CREDORA (CODIGO, UF, ATIVA) VALUES (?, ?, 1)').run(codigo, uf);
}
