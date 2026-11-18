// add-001 — Instala/atualiza o motor de quadros (@benenutri/mitra-kanban) neste projeto (01 §14).
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// Ordem completa (DT-39): setup-backend → add-001 → add-002 → add-010…add-070 duas vezes → add-001 DE
// NOVO (liga os ganchos, que só existem depois do add-010) → add-090 → sync-server-function-map.
//
// `definitions` vai para o simulador, que carrega as MESMAS SFs que a lib publica; os ids das escritas
// internas (kbEsc*) vêm do mapa do frontend, o mesmo pelo qual o simulador resolve chamadas por id.

import 'dotenv/config';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { instalar, montarDefinitions, lerIdsDoMapa } from '@benenutri/mitra-kanban/backend';

const MAPA = fileURLToPath(new URL('../frontend/src/lib/server-functions.ts', import.meta.url));

export const GANCHOS = { podeMover: 'ccPodeMover', podeExcluir: 'ccPodeExcluir' };
// Endereço do card nos e-mails do motor: CC_URL_DO_CARD com {id} (e {slug}); sem ele, e-mail sem botão.
export const EMAIL = { sistema: 'Crédito e Cobrança', ...(process.env.CC_URL_DO_CARD ? { urlDoCard: process.env.CC_URL_DO_CARD } : {}) };

export const definitions = montarDefinitions(lerIdsDoMapa(MAPA));

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntrypoint()) {
  if (!process.env.MITRA_BASE_URL) throw new Error('MITRA_BASE_URL ausente: este script roda no sandbox do Mitra, com o .env real.');
  const sdk = await import('mitra-sdk');
  sdk.configureSdkMitra({
    baseURL: process.env.MITRA_BASE_URL,
    token: process.env.MITRA_TOKEN,
    integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS,
  });
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  // Na primeira passada ccPodeMover/ccPodeExcluir ainda não existem (nascem no add-010): instala sem
  // ganchos e avisa. instalar() recusa nome inexistente, por isso a conferência antes.
  const existentes = new Set(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => f.name));
  const faltam = Object.values(GANCHOS).filter((nome) => !existentes.has(nome));
  const ganchos = faltam.length ? undefined : GANCHOS;
  const resultado = await instalar({ sdk, projectId, mapaFrontend: MAPA, ganchos, email: EMAIL });
  console.log(`Pronto: motor ${resultado.versao}, ${Object.keys(resultado.funcoes).length} server functions.`);
  if (faltam.length) console.log(`AVISO: ganchos NÃO ligados (faltam ${faltam.join(', ')}). Rode o add-010 e depois este script de novo.`);
  else console.log('Ganchos ligados: podeMover -> ccPodeMover, podeExcluir -> ccPodeExcluir.');
  console.log('Rode `node sync-server-function-map.mjs` para levar os ids ao frontend.');
}
