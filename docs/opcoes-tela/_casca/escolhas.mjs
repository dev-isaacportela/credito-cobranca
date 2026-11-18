// Gera escolhas.md a partir das escolhas lidas dos artefatos (coleção `escolhas`).
// Uso: node _casca/escolhas.mjs   (edite ESCOLHAS quando o usuário mudar algo)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// tela: [opção, observação do usuário]
const ESCOLHAS = {
  '001-base': { login: ['A'], casca: ['C'], 'clientes-busca': ['C'], 'cliente-ficha': ['B'], contatos: ['C'],
    'equipe-organograma': ['C', 'sem organogranama'], 'equipe-cadastro': ['A'], 'equipe-redistribuicao': ['A'],
    'adm-parametros': ['A'], 'adm-bus': ['A'], 'adm-feriados': ['C'], 'adm-modelos': ['B'],
    'adm-sincronizacao': ['B', 'a+b'], 'adm-auditoria': ['B', 'b+c'] },
  '002-cobranca-privada': { 'cobranca-visao-gerencial-2': ['C'], 'cobranca-quadro': ['B'],
    'cobranca-card': ['A'], 'cobranca-emails': ['C'], 'cobranca-historico': ['B'], 'registrar-contato': ['B'],
    'acordo-pagamento': ['C'], 'baixa-perda': ['B'], 'lista-bloqueio': ['A'], 'projecao-inadimplencia': ['A'],
    'minha-agenda': ['B', 'b + c'], 'regras-cobranca': ['B'] },
  '003-juridico': { 'juridico-visao-gerencial': ['C'], 'juridico-processos': ['B'], 'juridico-card-processo': ['B'],
    'juridico-acordos': ['A'], 'juridico-custos': ['A'], 'juridico-alertas': ['A'], 'juridico-dossie': ['B'],
    'juridico-previa-documentos': ['C'], 'juridico-carga-inicial': ['C'] },
  '004-concessao-credito': { 'credito-visao-gerencial': ['A'], 'credito-esteira': ['B'], 'credito-gestao': ['B'],
    'pedidos-limite': ['A'], 'credito-saude': ['A'], 'credito-desempenho': ['A'], 'credito-sinalizados': ['C'],
    'nova-solicitacao': ['B'], 'card-solicitacao': ['B'], 'card-motor': ['C'], 'card-decisao': ['C'], semaforo: ['A'] },
  '005-setor-publico': { 'concessao-motor': ['B'], 'nf-etapas-prazos': ['A'], 'nf-tramitacao': ['C'], 'nf-datas': ['B'],
    'regras-ente': ['B'], 'comunicacao-orgao': ['C'], certidoes: ['B'] },
  '006-painel-consolidado': { 'painel-organizacao': ['B'], 'painel-visao-saude': ['C'], 'painel-indicadores': ['B'],
    'painel-evolucao': ['A'], 'painel-aging-pdd': ['B'], 'painel-roll-rate': ['B'], 'painel-movimento': ['B'],
    'painel-concentracao': ['A'], 'painel-agentes': ['B'], 'painel-planos': ['C'], 'painel-credito': ['A'],
    'painel-juridico-publico': ['B'], 'painel-equipe': ['A'] },
  '007-historico-apoio': { 'historico-cliente': ['C'], 'historico-pdf': ['A'], 'fontes-links': ['A'],
    'material-apoio': ['A'], 'regras-vigor': ['B'] },
};

const attr = (tag, n) => (tag.match(new RegExp(`[ ]${n}="([^"]*)"`)) ?? [])[1] ?? "";
let md = '# Opções de tela escolhidas\n\nLidas dos artefatos em 14/11/2026 (coleção `escolhas`). O mockup de cada opção está em\n`docs/opcoes-tela/<módulo>/telas*.html`, no `<template data-opcao>` da tela. Gerado por `_casca/escolhas.mjs`.\n\nPela decisão D-05, o que foi escolhido em 002 e 004 vale para as carteiras privada, Estética e pública.\n';
let faltam = 0;
for (const [slug, esc] of Object.entries(ESCOLHAS)) {
  const html = readdirSync(join(RAIZ, slug)).filter((f) => /^telas.*\.html$/.test(f)).sort()
    .map((f) => readFileSync(join(RAIZ, slug, f), 'utf8').replace(/<section\b[^>]*\bdata-tela=/g, (m) => `\u0000${f}\u0001${m}`)).join('\n');
  md += `\n## ${slug}\n\n| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |\n|---|---|---|---|---|---|\n`;
  for (const pedaco of html.split('\u0000').slice(1)) {
    const [arq, corpo] = pedaco.split('\u0001');
    const id = attr(corpo.slice(0, corpo.indexOf('>')), 'data-tela');
    if (!esc[id]) continue; // tela fora da escolha (D-05)
    const [op, nota = ''] = esc[id];
    const t = [...corpo.matchAll(/<template\b[^>]*>/g)].map((m) => m[0]).find((x) => attr(x, 'data-opcao') === op);
    if (!t) { faltam++; continue; }
    md += `| ${attr(corpo.slice(0, corpo.indexOf('>')), 'data-titulo')} | \`${id}\` | **${op}** | ${attr(t, 'data-nome')} | ${nota} | \`${arq}\` |\n`;
  }
}
writeFileSync(join(RAIZ, 'escolhas.md'), md);
console.log(md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Tela')).length, 'telas;', faltam, 'sem template');
