// Extensões da 004 nos quadros dela (01 §14, D-05). A dona registra primeiro; a 005 acrescenta ao
// `concessao-publica` o bloco do órgão ("Calcular") pelo mesmo registrarExtensao, e a tela da Esteira
// monta tudo com `extensoesDoQuadro(slug)`. O App importa este arquivo uma vez, antes do da 005.

import { registrarExtensao } from '@/lib/base/extensoes';
import { podeMoverConcessao, podeMoverPedido } from '@/lib/concessao-credito/regras';
import { AbaAnaliseCompleta, AbaHistorico, AbaPosicao, AcoesSolicitacao, ConteudoSolicitacao } from './card/Solicitacao';
import { ConteudoPedido } from './card/Pedido';

// Em desenvolvimento, reexecutar este arquivo registraria tudo de novo (abas e blocos em dobro): recarrega a página.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

for (const slug of ['concessao-privada', 'concessao-estetica', 'concessao-publica']) {
  registrarExtensao(slug, {
    conteudoDaFase: (ctx) => <ConteudoSolicitacao ctx={ctx} />,
    abasExtras: [
      { id: 'historico', rotulo: 'Histórico de crédito', render: (ctx) => <AbaHistorico ctx={ctx} /> },
      { id: 'posicao', rotulo: 'Posição', render: (ctx) => <AbaPosicao ctx={ctx} /> },
      { id: 'completa', rotulo: 'Análise completa', render: (ctx) => <AbaAnaliseCompleta ctx={ctx} /> },
    ],
    acoesExtras: [(ctx) => <AcoesSolicitacao ctx={ctx} />],
    podeMover: podeMoverConcessao,
  }, '004');
}

registrarExtensao('pedidos-limite', {
  conteudoDaFase: (ctx) => <ConteudoPedido ctx={ctx} />,
  podeMover: podeMoverPedido,
}, '004');
