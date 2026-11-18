// Executa toda SF SQL de leitura contra um banco novo montado pelo pipeline (relógio D) e reporta o
// que quebra. Não precisa do servidor no ar. Escrita SQL e JAVASCRIPT ficam para os smokes; da escrita
// SQL só se olha o texto: `INSERT … SELECT … WHERE` sem FROM quebra no MySQL (o SQLite aceita).
//
// Uso: cd backend && npm run sim:check

import { CHECK_INPUT } from './config.mjs';
import { montarBanco, descartarBanco } from './seed.mjs';
import { FORA_DO_PERFIL } from '../add-090-perfil-acesso.mjs';

// Com o seed da 001 e a sessão de Gustavo (vê tudo, administra): as leituras com EU voltam com linhas (O-12).
const banco = await montarBanco({ seeds: ['001'] });
const SESSAO = 3;
const resultados = [];

for (const [name, definition] of banco.runner.definicoes()) {
  if (definition.type === 'JAVASCRIPT') {
    resultados.push({ name, status: 'pulado' });
    continue;
  }
  if (!/^\s*(SELECT|WITH)/i.test(definition.code)) {
    let nivelZero = definition.code;
    for (let i = 0; i < 30 && /\([^()]*\)/.test(nivelZero); i += 1) nivelZero = nivelZero.replace(/\([^()]*\)/g, ' ');
    const semFrom = /\bINSERT\b/i.test(nivelZero) && /\bSELECT\b/i.test(nivelZero) && /\bWHERE\b/i.test(nivelZero) && !/\bFROM\b/i.test(nivelZero);
    resultados.push(semFrom
      ? { name, status: 'FALHOU', detalhe: 'INSERT … SELECT … WHERE sem FROM DUAL: quebra no MySQL' }
      : { name, status: 'pulado' });
    continue;
  }
  try {
    const { rows } = await banco.runner.executar(definition, CHECK_INPUT, { userId: FORA_DO_PERFIL.includes(name) ? 0 : SESSAO }); // fora do perfil: só aninhada
    resultados.push({ name, status: 'ok', detalhe: `${rows.length} linha(s)` });
  } catch (erro) {
    resultados.push({ name, status: 'FALHOU', detalhe: erro.message });
  }
}

const ok = resultados.filter((r) => r.status === 'ok');
const falhas = resultados.filter((r) => r.status === 'FALHOU');
const pulados = resultados.filter((r) => r.status === 'pulado');
for (const item of falhas) console.log(`  FALHOU  ${item.name}\n          ${item.detalhe}`);
for (const aviso of banco.avisos) console.log(`  aviso   ${aviso}`);
console.log(`\n  ${ok.length} funções SQL executaram, ${falhas.length} falharam, ${pulados.length} puladas (escrita/JAVASCRIPT).`);
const vazias = ok.filter((r) => r.detalhe.startsWith('0 '));
if (vazias.length) console.log(`  ${vazias.length} sem linha (o seed cobre?): ${vazias.map((r) => r.name).join(', ')}`);
descartarBanco(banco);
process.exitCode = falhas.length ? 1 : 0;
