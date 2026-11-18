// Lê os blocos de frontend/src/lib/server-functions.ts (lib kb* 8001–9032 e as cc* de cada spec,
// faixas de 01 §14) e devolve { nomeDaSF: idLocal } — o mapa INTEIRO, por nome (o lerIdsDoMapa da lib
// devolve só as kbEsc*). O simulador injeta este mapa no marcador __CC_IDS__ e resolve chamadas por id
// a partir dele. Na publicação real os ids vêm por NOME (listServerFunctionsMitra), nunca deste arquivo.

import { readFileSync } from 'node:fs';

function bloco(fonte, marcador) {
  const inicio = fonte.indexOf(`export const ${marcador} = {`);
  if (inicio === -1) return {};
  const abre = fonte.indexOf('{', inicio);
  const fecha = fonte.indexOf('}', abre);
  return Object.fromEntries(fonte.slice(abre + 1, fecha).split('\n')
    .map((linha) => linha.trim().replace(/,$/, ''))
    .filter((linha) => linha && !linha.startsWith('//'))
    .map((linha) => {
      const [chave, bruto] = linha.split(':').map((parte) => parte.trim());
      return [chave, String(bruto || '').replace(/^'|'$/g, '')];
    }));
}

/** `caminho` = frontend/src/lib/server-functions.ts (ou equivalente). */
export function idsDoMapa(caminho) {
  const fonte = readFileSync(caminho, 'utf8');
  const nomes = bloco(fonte, 'SERVER_FUNCTION_NAMES');
  const idsPorChave = bloco(fonte, 'SERVER_FUNCTIONS');
  const porNome = {};
  for (const [chave, nome] of Object.entries(nomes)) {
    const id = idsPorChave[chave];
    if (id) porNome[nome] = Number(id);
  }
  return porNome;
}
