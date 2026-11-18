// Seed da 001 (06 §2.4): clientes 1001 a 1012 no Winthor simulado e, no domínio, o contato do 1002
// (ficha vencida) e os dois modelos de teste. Não grava CC_CLIENTE: nasce na leitura do passo 6.

import { cliente, nota, dia, chamarComo, bancoDoSeed } from './000-elenco.mjs';
import { comRelogio } from '../relogio.mjs';

/** Uma nota de parcela única: `itens` = [[codprod, valor], …]; vence 30 dias depois da emissão. */
const simples = (codcli, n, emissao, itens, extra = {}) => nota({
  codcli, n, emissao,
  itens: itens.map(([codprod, valor]) => ({ codprod, valor })),
  parcelas: [{ prest: 1, valor: itens.reduce((s, [, v]) => s + v, 0), venc: extra.venc, ...extra }],
});

export function winthor() {
  cliente({ codcli: 1001, nome: 'HOSPITAL SAO LUCAS LTDA', ramo: 1, limite: 10000, plano: '35', rca: 10 });
  simples(1001, 1, dia(-42), [[101, 600], [201, 400]], { venc: dia(-12) });
  simples(1001, 2, dia(-33), [[101, 500]], { venc: dia(-3) });
  nota({ codcli: 1001, n: 3, emissao: dia(-25), itens: [{ codprod: 201, valor: 2300 }],
    parcelas: [{ prest: 1, valor: 2000, venc: dia(5) }, { prest: 2, valor: 300, venc: dia(5) }] });
  simples(1001, 4, dia(-10), [[301, 800]], { venc: dia(20) });
  simples(1001, 5, dia(-60), [[101, 700]], { venc: dia(-30), pago: true, pagoEm: dia(-28) });
  nota({ codcli: 1001, n: 6, emissao: dia(-70), itens: [{ codprod: 101, valor: 1200 }],
    parcelas: [{ prest: 1, valor: 1200, venc: dia(-40) }], cancelEm: dia(-70) });

  cliente({ codcli: 1002, nome: 'CLINICA VIDA ME', ramo: 2, limite: 5000 });
  simples(1002, 1, dia(-38), [[101, 2500]], { venc: dia(-8) });
  cliente({ codcli: 1003, nome: 'FARMACIA NOVA LTDA', ramo: 3, uf: 'GO', limite: 3000 });
  simples(1003, 1, dia(-20), [[301, 1000]], { venc: dia(10) });
  cliente({ codcli: 1004, nome: 'LABORATORIO CENTRAL SA', ramo: 2, limite: 8000 });
  simples(1004, 1, dia(-75), [[201, 3000]], { venc: dia(-45) });
  cliente({ codcli: 1005, nome: 'CASA DE REPOUSO BEM VIVER', ramo: 4, limite: 2000 });
  simples(1005, 1, dia(-30), [[101, 600]], { venc: dia(0) });
  cliente({ codcli: 1006, nome: 'DROGARIA POPULAR LTDA', ramo: 3, uf: 'GO', limite: 6000 });
  simples(1006, 1, dia(-50), [[301, 4000]], { venc: dia(-20) });
  cliente({ codcli: 1007, nome: 'SECRETARIA MUNICIPAL DE SAUDE DE ANAPOLIS', ramo: 13, uf: 'GO', limite: 0, municipio: 'ANAPOLIS' });
  simples(1007, 1, dia(-90), [[101, 12000]], { venc: dia(-60) });
  cliente({ codcli: 1008, nome: 'HOME CARE ALFA LTDA', ramo: 4, limite: 4000 });
  simples(1008, 1, dia(-27), [[201, 900]], { venc: dia(3) });
  cliente({ codcli: 1009, nome: 'ESTETICA BELLA LTDA', ramo: 2, limite: 3000 });
  simples(1009, 1, dia(-32), [[401, 1500]], { venc: dia(-2) });
  cliente({ codcli: 1010, nome: 'CLINICA DERMA LTDA', ramo: 2, limite: 5000 });
  simples(1010, 1, dia(-45), [[401, 1100], [101, 1100]], { venc: dia(-15) });
  cliente({ codcli: 1011, nome: 'CLIENTE SEM MOVIMENTO LTDA', ramo: 1, limite: 0 });
  simples(1011, 1, dia(-760), [[101, 300]], { venc: dia(-730), pago: true, pagoEm: dia(-730) });
  cliente({ codcli: 1012, nome: 'JOAO PEREIRA DA SILVA', ramo: 2, tipo: 'F', limite: 1000 });
  simples(1012, 1, dia(-36), [[101, 400]], { venc: dia(-6) });
  simples(1012, 2, dia(-39), [[101, 300]], { venc: dia(-9), codcob: 'DESD' });
}

export async function dominio() {
  const { db } = bancoDoSeed();
  const [c1002] = db.prepare('SELECT ID FROM CC_CLIENTE WHERE CODCLI = 1002').all();
  if (c1002) {
    await comRelogio(dia(-181), () => chamarComo('ana', 'ccBaseContatoSalvar', {
      clienteId: c1002.ID, nome: 'Paulo Financeiro', area: 'Financeiro', funcao: 'Contas a pagar',
      telefone: '(61) 3333-1002', email: 'financeiro@clinicavida.com.br', situacao: 'CONFIRMADO', principal: 1,
    }));
  }
  const agora = `${dia(0)}T10:00:00`;
  const modelo = db.prepare(`INSERT OR IGNORE INTO CC_MODELO_MENSAGEM (CODIGO, NOME, SPEC_DONA, ASSUNTO, CORPO, CAMPOS_EXTRAS, EFEITO_LEGAL, VERSAO, ATIVO, ATUALIZADO_EM)
VALUES (?, ?, '001', ?, ?, ?, ?, 1, 1, ?)`);
  modelo.run('TESTE_AVISO', 'Aviso de teste', 'Aviso de vencimento', 'Prezado(a) [CLIENTE], há valores em aberto em nome de [RAZAO_SOCIAL].', '', 0, agora);
  modelo.run('TESTE_LEGAL', 'Notificação de teste', 'Notificação', 'Prezado(a) [CLIENTE], regularize [VALOR_VENCIDO] até [DATA_LIMITE].', 'DATA_LIMITE', 1, agora);
}
