// Extensões do card do quadro `juridico` (01 §14, D-05; plan §telas, card B "Tudo em Nesta fase"). A tela do quadro
// importa este arquivo uma vez. "Mover para": espelho do gancho (`motivoDeDestino`, lib/juridico/mover.ts) sobre a
// ficha que o quadro pediu ao abrir o card e o membro da sessão.

import { registrarExtensao } from '@/lib/base/extensoes';
import { motivoDeDestino } from '@/lib/juridico/mover';
import { chaveDaFase, membroAtual } from './comum';
import { erroDaFicha, fichaGuardada } from './ficha';
import { AbaCobrancaOrigem, AbaProcessoCompleto } from './card/Abas';
import { AcoesDoProcesso } from './card/AcoesDoProcesso';
import { NestaFase } from './card/BlocosDoProcesso';

// Em desenvolvimento, reexecutar este arquivo registraria tudo de novo (abas e blocos em dobro): recarrega a página.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

registrarExtensao('juridico', {
  conteudoDaFase: (ctx) => <NestaFase {...ctx} />,
  abasExtras: [
    { id: 'processo', rotulo: 'Processo completo', render: (ctx) => <AbaProcessoCompleto {...ctx} /> },
    { id: 'origem', rotulo: 'Cobrança de origem', render: (ctx) => <AbaCobrancaOrigem {...ctx} /> },
  ],
  acoesExtras: [(ctx) => <AcoesDoProcesso {...ctx} />],
  podeMover: (card, fase, estrutura) => {
    const ficha = fichaGuardada(card.id);
    if (!ficha && erroDaFicha(card.id)) return erroDaFicha(card.id)!;
    const membro = membroAtual();
    const de = estrutura.fases.find((f) => f.id === card.faseId);
    if (!ficha || !membro || !de) return 'Carregando a situação do processo…';
    return motivoDeDestino(membro, ficha.processo, chaveDaFase(de.nome), chaveDaFase(fase.nome));
  },
}, '003');
