// Orquestrador dos smokes (06 §3): roda smoke/000-esqueleto.mjs e os smoke/NNN-*.mjs que existirem, na
// ordem das specs, cada um num banco novo montado pelo pipeline (seed.mjs) com os SEEDS, o RELOGIO e os
// QUADROS_TESTE que ele exporta. Termina com código 1 se algum teste falhou.
//
// Uso: cd backend && npm run sim:smoke            (todos)
//      node simulator/smoke.mjs 001                (só os arquivos que começam por 001)

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { iniciarArquivo, encerrarArquivo, resultado } from './smoke/base.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'smoke');
const filtros = process.argv.slice(2);
const arquivos = readdirSync(DIR)
  .filter((n) => /^\d{3}-.+\.mjs$/.test(n))
  .filter((n) => !filtros.length || filtros.some((f) => n.startsWith(f)))
  .sort();

for (const arquivo of arquivos) {
  const modulo = await import(pathToFileURL(join(DIR, arquivo)).href);
  console.log(`\n${arquivo}`);
  const banco = await iniciarArquivo(modulo);
  for (const aviso of banco.avisos) console.log(`  aviso   ${aviso}`);
  try {
    await modulo.suite();
  } finally {
    encerrarArquivo();
  }
}

const { ok, pulados, falhas } = resultado();
console.log(`\n  ${ok} passaram, ${pulados} pulados, ${falhas.length} falharam.`);
for (const titulo of falhas) console.log(`  FALHOU  ${titulo}`);
process.exitCode = falhas.length ? 1 : 0;
