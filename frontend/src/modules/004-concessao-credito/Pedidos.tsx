// Pedidos acima do limite, opção A (medidor na capa): o quadro `pedidos-limite` da lib — a capa traz o
// campo `uso` (barra) e a alçada — e o card do pedido é desta tela (extensões da 004). Abrir: quadro + total.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KanbanBoard } from '@benenutri/mitra-kanban';
import { extensoesDoQuadro } from '@/lib/base/extensoes';
import type { Carteira } from '@/lib/base/carteira';
import { linha } from '@/lib/mitra-api';
import { Alert, GradeKpi, Kpi } from '@/components/page';
import { CARTEIRA_URL, inteiro, useLeitura } from './dados';
import NovaSolicitacao from './NovaSolicitacao';

const SLUG = 'pedidos-limite';

export default function Pedidos({ carteira }: { carteira: Carteira }) {
  const [params, setParams] = useSearchParams();
  const cardId = Number(params.get('card')) || null;
  const navigate = useNavigate();
  const [novo, setNovo] = useState(false);
  const [quadro, setQuadro] = useState(0);
  const total = useLeitura(() => linha('ccCredPedidoTotal', { faseChave: '', analistaId: 0, situacao: '', busca: '' }), [quadro]);
  const abrir = (cid: number | null) => setParams(cid ? { card: String(cid) } : {}, { replace: true });
  return (
    <>
      {total.erro ? <Alert tone="error">{total.erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Pedidos" valor={total.dados ? inteiro(total.dados.TOTAL) : '…'} hint="retidos e decididos no quadro" />
        <Kpi rotulo="Fora do SLA" valor={total.dados ? inteiro(total.dados.ATRASADOS) : '…'} hint="vendas paradas além do prazo da etapa" />
      </GradeKpi>
      <KanbanBoard
        key={quadro}
        slug={SLUG}
        cardId={cardId}
        onCardChange={abrir}
        novoCard={{ rotulo: 'Pedido acima do limite', onClick: () => setNovo(true) }}
        atualizarACadaMs={60000}
        podeExcluir={() => false}
        {...extensoesDoQuadro(SLUG)}
      />
      {novo ? (
        <NovaSolicitacao carteira={carteira} tipoInicial="pedido" onFechar={() => setNovo(false)}
          onCriada={(cid, tipo) => {
          setNovo(false);
          if (tipo !== 'pedido') return navigate(`/credito/${CARTEIRA_URL[carteira]}/esteira?card=${cid}`);
          setQuadro((q) => q + 1);
          abrir(cid);
        }} />
      ) : null}
    </>
  );
}
