// Seed da 007-historico-apoio (plan §Simulador, 06 §2.5): Winthor de 7001–7003 e, no domínio, a carga inicial
// de fontes e material (tabelas da própria 007, pelo mesmo texto da publicação). A história de 7001 e 7003 é
// montada no smoke pelas SFs das donas (D-014); a atribuição a Ana é do elenco (passo 7).

import { cliente, nota, dia, bancoDoSeed, execSqlite } from './000-elenco.mjs';
import { agora } from '../../lib/tempo.mjs';
import { cargaInicial } from '../../lib/historico-apoio/carga-inicial.mjs';

/** Uma nota de parcela única, só Nutrição (codprod 101); emissão 30 dias antes do vencimento (nunca no futuro). */
const titulo = (codcli, n, valor, venc, extra = {}) => nota({
  codcli, n, emissao: dia(Math.min(venc - 30, -5)), itens: [{ codprod: 101, valor }],
  parcelas: [{ prest: 1, valor, venc: dia(venc), ...extra }],
});

export function winthor() {
  cliente({ codcli: 7001, nome: 'ALFA DISTRIBUIDORA LTDA', ramo: 1, uf: 'DF', limite: 80000 });
  titulo(7001, 1, 12500, -37);
  titulo(7001, 2, 20000, 15);
  titulo(7001, 3, 3000, -22, { pago: true, pagoEm: dia(-12) });
  titulo(7001, 4, 2000, -20, { pago: true, pagoEm: dia(-25) });
  cliente({ codcli: 7002, nome: 'BETA SEM HISTORICO LTDA', ramo: 2, uf: 'DF', limite: 10000 });
  titulo(7002, 1, 4000, 60);
  cliente({ codcli: 7003, nome: 'GAMA EM JUIZO LTDA', ramo: 3, uf: 'DF', limite: 15000 });
  titulo(7003, 1, 9000, -90);
}

export async function dominio() {
  const exec = execSqlite(bancoDoSeed().db);
  await cargaInicial(exec, agora());
}
