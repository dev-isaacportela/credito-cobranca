// Monta dist/<slug>.html = casca + design system + telas do módulo.
// Uso: node _casca/build.mjs 002-cobranca-privada "Cobrança privada"   (ou sem args: todos)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const ler = (p) => readFileSync(p, 'utf8');

const NOMES = {
  '001-base': 'Base',
  '002-cobranca-privada': 'Cobrança privada',
  '003-juridico': 'Jurídico',
  '004-concessao-credito': 'Concessão de crédito',
  '005-setor-publico': 'Setor público',
  '006-painel-consolidado': 'Painel consolidado',
  '007-historico-apoio': 'Histórico e apoio',
};

// Telas fora da escolha (D-05: público e Estética reaproveitam o privado). O arquivo
// fica como está; a tela só não entra na página.
const PULAR = {
  '005-setor-publico': ['concessao-esteira', 'concessao-card', 'cobranca-quadro', 'cobranca-card', 'cobranca-gerencial'],
};

// Corta cada tela pulada: do seu <section data-tela> até a próxima tela do arquivo ou,
// se for a última, até o último </section> (mockup tem <section> aninhada; <style> no
// fim do arquivo fica).
function semPuladas(html, ids) {
  for (const id of ids) {
    const ini = html.search(new RegExp(`<section\\b[^>]*\\bdata-tela="${id}"`));
    if (ini < 0) continue;
    const prox = html.slice(ini + 1).search(/<section\b[^>]*\bdata-tela="/);
    const fim = prox >= 0 ? ini + 1 + prox : html.lastIndexOf('</section>') + '</section>'.length;
    html = html.slice(0, ini) + html.slice(fim);
  }
  return html;
}

// Regras da vitrine que só servem à página da vitrine e atrapalhariam os mockups.
const ds = ler(join(AQUI, 'ds.css'))
  .replace(/^\s*main \{[^}]*\}\s*$/m, '')
  .replace(/^\s*section > header[^{]*\{[^}]*\}\s*$/gm, '')
  .replace(/^\s*\.topbar[^{]*\{[^}]*\}\s*$/gm, '');

function montar(slug) {
  // Um módulo pode dividir as telas em vários arquivos: telas.html, telas-01-x.html…
  const pasta = join(RAIZ, slug);
  const arquivos = existsSync(pasta) ? readdirSync(pasta).filter((f) => /^telas.*\.html$/.test(f)).sort() : [];
  if (!arquivos.length) return null;
  const telas = arquivos.map((f) => semPuladas(ler(join(pasta, f)), PULAR[slug] ?? [])).join('\n');
  const problemas = [];
  // Cada tela vai do seu <section data-tela> até o próximo (ou o fim): comentário ou
  // <style> entre telas não funde duas.
  const inicios = [...telas.matchAll(/<section\b[^>]*\bdata-tela="([^"]+)"[^>]*>/g)];
  const secoes = inicios.map((m, i) => [m[0], m[1], telas.slice(m.index, i + 1 < inicios.length ? inicios[i + 1].index : telas.length)]);
  const ids = new Set();
  for (const [, id, corpo] of secoes) {
    if (ids.has(id)) problemas.push(`tela repetida: ${id}`);
    ids.add(id);
    const letras = [...corpo.matchAll(/<template[^>]*data-opcao="([A-C])"/g)].map((m) => m[1]).join('');
    if (letras !== 'ABC') problemas.push(`${id}: opções "${letras}" (esperado ABC)`);
  }
  if (!secoes.length) problemas.push('nenhuma <section data-tela>');
  if (/<script/i.test(telas)) problemas.push('há <script> nas telas (não roda dentro de template)');
  const semCor = telas.replace(/<svg[\s\S]*?<\/svg>/g, '');
  const hex = semCor.match(/#[0-9a-fA-F]{3,8}\b(?![^<]*<\/use>)/g)?.filter((h) => !/^#(i-|bn)/.test(h)) ?? [];
  const cores = hex.filter((h) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(h));
  if (cores.length) problemas.push(`cor literal: ${[...new Set(cores)].slice(0, 8).join(' ')}`);

  const html = ler(join(AQUI, 'casca.html'))
    .replaceAll('{{MODULO}}', NOMES[slug] ?? slug)
    .replaceAll('{{SLUG}}', slug)
    .replace('{{DS_CSS}}', () => ds)
    .replace('{{MOCK_CSS}}', () => ler(join(AQUI, 'mock.css')))
    .replace('{{ICONES}}', () => ler(join(AQUI, 'icones.html')))
    .replace('{{WORDMARK}}', () => ler(join(AQUI, 'wordmark.txt')).trim())
    .replace('{{TELAS}}', () => telas);
  const destino = join(RAIZ, 'dist', `${slug}.html`);
  writeFileSync(destino, html);
  return { slug, telas: secoes.length, kb: Math.round(html.length / 1024), problemas };
}

const alvo = process.argv[2];
const slugs = alvo ? [alvo] : readdirSync(RAIZ).filter((d) => /^\d{3}-/.test(d));
for (const slug of slugs) {
  const r = montar(slug);
  if (!r) { console.log(`${slug}: sem telas.html`); continue; }
  console.log(`${r.slug}: ${r.telas} telas, ${r.kb} KB${r.problemas.length ? '\n  ! ' + r.problemas.join('\n  ! ') : ''}`);
}
