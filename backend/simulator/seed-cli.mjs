// Refaz o banco do simulador (DB_PATH) pelo pipeline, com todos os seeds presentes e o relógio D.
// Uso: cd backend && npm run sim:seed   (pare o `npm run sim` antes: o arquivo fica preso no Windows)
//      node simulator/seed-cli.mjs --massa 20000   (T-079: banco temporário com N clientes a mais;
//      mede ccBaseClienteListar e …Total como Gustavo e Sérgio e descarta o banco)

import { DB_PATH } from './config.mjs';
import { montarBanco, seedsPresentes, descartarBanco } from './seed.mjs';
import { U, M } from './seed/000-elenco.mjs';

const iMassa = process.argv.indexOf('--massa');

async function massa(n) {
  const banco = await montarBanco({ seeds: seedsPresentes() });
  try {
    const cliente = banco.db.prepare(`INSERT INTO CC_CLIENTE (CODCLI, DOCUMENTO, NOME, NOME_BUSCA, UF, SETOR, AGENTE_ID, CRIADO_EM)
VALUES (?, ?, ?, ?, 'DF', 'PRIVADO', ?, '2026-11-19T10:00:00')`);
    const posicao = banco.db.prepare(`INSERT INTO CC_POSICAO_CLIENTE (CLIENTE_ID, CODCLI, VENCIDO, A_VENCER, DIAS_ATRASO, LIMITE, UTILIZADO, DISPONIVEL)
VALUES (?, ?, ?, ?, ?, 10000, ?, ?)`);
    const agentes = [M.ana, M.bruno, M.carlos, null];
    banco.db.exec('BEGIN');
    for (let i = 0; i < n; i += 1) {
      const codcli = 100000 + i;
      const nome = `CLIENTE MASSA ${codcli} LTDA`;
      const id = Number(cliente.run(codcli, String(codcli).padStart(14, '0'), nome, nome, agentes[i % 4]).lastInsertRowid);
      const vencido = (i % 7) * 100;
      posicao.run(id, codcli, vencido, 500, vencido ? i % 90 : 0, vencido + 500, 10000 - vencido - 500);
    }
    banco.db.exec('COMMIT');
    const PADRAO = {
      busca: '', limite: '20', offset: '0', setor: '', carteira: '', agenteId: '0', analistaId: '0', buId: '-1', uf: '', tipoPessoa: '',
      soVencidos: '0', ordem: 'NOME', situacaoFicha: '',
    };
    for (const login of ['gustavo', 'sergio']) {
      for (const [rotulo, input] of [['lista', {}], ['busca', { busca: 'MASSA 1199' }], ['vencidos', { soVencidos: '1', ordem: 'VENCIDO' }]]) {
        for (const nome of ['ccBaseClienteListar', 'ccBaseClienteTotal']) {
          const t0 = performance.now();
          const r = await banco.runner.executar(nome, { ...PADRAO, ...input }, { userId: U[login] });
          const ms = performance.now() - t0;
          console.log(`${login.padEnd(8)} ${rotulo.padEnd(9)} ${nome.padEnd(20)} ${String(Math.round(ms)).padStart(5)} ms  ${nome.endsWith('Total') ? `TOTAL ${r.rows[0].TOTAL}` : `${r.rows.length} linhas`}`);
        }
      }
    }
  } finally {
    descartarBanco(banco);
  }
}

try {
  if (iMassa >= 0) {
    await massa(Number(process.argv[iMassa + 1]) || 20000);
  } else {
    const banco = await montarBanco({ seeds: seedsPresentes(), arquivo: DB_PATH, log: console.log });
    const contar = (t) => banco.db.prepare(`SELECT COUNT(*) AS N FROM ${t}`).get().N;
    console.log(`Banco refeito em ${DB_PATH}`);
    for (const t of ['INT_USER', 'CC_MEMBRO', 'CC_PARAMETRO', 'CC_FERIADO', 'KB_BOARD', 'PCPREST', 'CC_CLIENTE']) console.log(`  ${t.padEnd(16)} ${contar(t)}`);
    banco.db.close();
  }
} catch (erro) {
  if (erro?.code === 'EBUSY' || erro?.code === 'EPERM') {
    console.error('Não foi possível apagar o banco: o simulador está rodando. Pare o processo e tente de novo.');
    process.exitCode = 1;
  } else {
    throw erro;
  }
}
