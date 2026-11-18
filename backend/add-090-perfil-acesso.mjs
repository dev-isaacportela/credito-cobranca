// add-090 — Perfil único "Crédito e Cobrança" (01 §14, T-011).
//
// Usuário business precisa de perfil para executar SF ("User has no profile assigned"). O perfil libera
// todas as SFs (públicas e internas, que as JS chamam por id) menos FORA_DO_PERFIL (a rotina e os
// passos, que só o cron chama, e as leituras Oracle do Winthor, que só a JS da casa chama — sem sessão
// no Oracle não há visibilidade; B5 C-02), SELECT em CC_* e KB_*, e tem como usuários os dos membros ativos.
// Se a S-03 mostrar que JS de business não chama SF fora do perfil, as duas Oracle voltam (R-003 da 001).
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, POR ÚLTIMO (depois da publicação completa, DT-39).
// Nunca entra no PUBLISH_ORDER do simulador. Aditivo e idempotente: reaproveita o perfil se existir.
// Membro cadastrado depois: o passo ACESSOS tenta incluí-lo (S-15); se não puder, rode este de novo.

import 'dotenv/config';
import { pathToFileURL } from 'node:url';

export const NOME_PERFIL = 'Crédito e Cobrança';
export const FORA_DO_PERFIL = ['ccRotina', 'ccBaseSincronizar', 'ccBaseAcessosConciliar', 'ccCobRotina', 'ccCredRotina', 'ccPubRotina', 'ccPainelRotina',
  'ccBaseWinthorTitulos', 'ccBaseWinthorCliente'];
export const definitions = [];

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

  // createProfileMitra não devolve o id de forma confiável: relê a lista.
  const acharPerfil = async () => ((await sdk.listProfilesMitra({ projectId })).result ?? []).find((p) => p.name === NOME_PERFIL);
  let perfil = await acharPerfil();
  if (!perfil) {
    await sdk.createProfileMitra({ projectId, name: NOME_PERFIL, color: '#1f5f8b' });
    perfil = await acharPerfil();
  }
  const profileId = perfil.id;
  console.log(`Perfil: ${NOME_PERFIL} (id ${profileId})`);

  const sfs = ((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).filter((f) => !FORA_DO_PERFIL.includes(f.name));
  await sdk.setProfileServerFunctionsMitra({ projectId, profileId, serverFunctionIds: sfs.map((f) => f.id) });
  console.log(`Server functions liberadas: ${sfs.length} (fora: ${FORA_DO_PERFIL.join(', ')})`);

  const tabelas = ((await sdk.listTablesMitra({ projectId })).result ?? [])
    .map((t) => t.name ?? t.NAME ?? t.tableName)
    .filter((n) => /^(CC|KB)_/.test(String(n)));
  await sdk.setProfileSelectTablesMitra({ projectId, profileId, jdbcConnectionConfigId: 1, tables: tabelas.map((tableName) => ({ tableName })) });
  console.log(`Tabelas liberadas para SELECT: ${tabelas.length}`);

  const membros = (await sdk.runQueryMitra({ projectId, sql: `SELECT DISTINCT U.ID FROM CC_MEMBRO M
JOIN INT_USER U ON LOWER(U.DESCR) = M.USER_EMAIL WHERE M.ATIVO = TRUE` }))?.result?.rows ?? [];
  const userIds = membros.map((l) => Number(l.ID)).filter(Boolean);
  await sdk.setProfileUsersMitra({ projectId, profileId, userIds });
  console.log(`Usuários no perfil: ${userIds.length} (membros ativos com usuário)`);
}
