// Extensões do card aberto dos três quadros de cobrança (01 §14, D-05; 05 §3.5). A 002 é a dona: registra primeiro;
// a 005 soma as dela em `cobranca-publica` no próprio `extensoes.tsx`. O App importa este arquivo uma vez.

import { registrarExtensao } from '@/lib/base/extensoes';
import { motivoDeDestino } from '@/lib/cobranca-privada/mover';
import { AcaoDaFase } from './card/AcaoDaFase';
import { AbaContatos } from './card/AbaContatos';
import { AbaTitulos } from './card/AbaTitulos';
import { AcoesDoCaso } from './card/AcoesDoCaso';
import { chavesDoQuadro, erroDaFicha, fichaGuardada } from './ficha';

// Em desenvolvimento, reexecutar este arquivo registraria tudo de novo (abas e blocos em dobro): recarrega a página.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

for (const slug of ['cobranca-privada', 'cobranca-estetica', 'cobranca-publica']) {
  registrarExtensao(slug, {
    conteudoDaFase: (ctx) => <AcaoDaFase {...ctx} />,
    abasExtras: [
      { id: 'contatos', rotulo: 'Contatos e promessas', render: (ctx) => <AbaContatos {...ctx} /> },
      { id: 'titulos', rotulo: 'Títulos do Winthor', render: (ctx) => <AbaTitulos {...ctx} /> },
    ],
    acoesExtras: [(ctx) => <AcoesDoCaso {...ctx} />],
    // Espelho do gancho (mover.ts): lê a ficha que o quadro pediu ao abrir o card e as chaves das fases do resumo.
    podeMover: (card, fase, estrutura) => {
      const ficha = fichaGuardada(card.id);
      if (!ficha && erroDaFicha(card.id)) return erroDaFicha(card.id)!;
      const chaves = chavesDoQuadro(slug);
      const de = estrutura.fases.find((f) => f.id === card.faseId);
      if (!ficha || !chaves || !de) return 'Carregando a situação do caso…';
      const chave = (f: { nome: string }) => chaves.get(f.nome) ?? '';
      return motivoDeDestino(ficha, { chave: chave(de), final: de.tipo !== 'comum' }, { chave: chave(fase), final: fase.tipo !== 'comum' },
        [...chaves.values()].includes('negociacao'));
    },
  });
}
