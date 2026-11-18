// Extensões da 005 nos quadros públicos (01 §14, D-05; T-213). As donas (002 cobrança, 004 concessão) registram
// primeiro; o App importa este arquivo depois dos delas. O espelho de "Mover para" repete a frase do trecho da 005
// no gancho (lib/quadros/005): entrar no Comitê exige capacidade, perfil de pagamento e rating.

import { registrarExtensao } from '@/lib/base/extensoes';
import { chaveDaFase } from '@/lib/concessao-credito/regras';
import { motivoAnaliseIncompleta } from '@/lib/setor-publico/formato';
import { AbaNotasDaSolicitacao, BlocoOrgao } from './AnaliseOrgao';
import { analiseDoCard } from '@/modules/004-concessao-credito/dados';
import { AbaNotasDoCaso, AbaRegraEnte, AcoesNf, ReguaNf } from './ReguaNf';

// Em desenvolvimento, reexecutar este arquivo registraria tudo de novo (abas e blocos em dobro): recarrega a página.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

registrarExtensao('concessao-publica', {
  conteudoDaFase: (ctx) => <BlocoOrgao ctx={ctx} />,
  abasExtras: [{ id: 'nf-publica', rotulo: 'Notas fiscais', render: (ctx) => <AbaNotasDaSolicitacao ctx={ctx} /> }],
  // Sem a análise lida ainda (card não aberto nesta fase), deixa o servidor responder.
  podeMover: (card, fase) => {
    if (chaveDaFase(fase) !== 'comite') return null;
    const analise = analiseDoCard(card.id);
    return analise === undefined ? null : motivoAnaliseIncompleta(analise);
  },
});

registrarExtensao('cobranca-publica', {
  conteudoDaFase: (ctx) => <ReguaNf ctx={ctx} />,
  abasExtras: [
    { id: 'nf-publica', rotulo: 'Notas fiscais', render: (ctx) => <AbaNotasDoCaso ctx={ctx} /> },
    { id: 'regra-ente', rotulo: 'Regra do ente', render: (ctx) => <AbaRegraEnte ctx={ctx} /> },
  ],
  acoesExtras: [(ctx) => <AcoesNf ctx={ctx} />],
});
