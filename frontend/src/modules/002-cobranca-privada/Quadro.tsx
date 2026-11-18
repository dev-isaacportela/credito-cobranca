// Quadro de cobrança (T-063, opção B "Capa com a situação"): um quadro por carteira (`/cobranca/:carteira`), a capa é
// dado do quadro (05 §3.4), a faixa de números vem de ccCobQuadroResumo. Sem novo card e sem excluir: o card nasce e
// fecha pela régua. O card aberto vive na URL (?card=ID) e a ficha dele é lida uma vez (RNF-003).

import { useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { KanbanBoard } from '@benenutri/mitra-kanban';
import { extensoesDoQuadro } from '@/lib/base/extensoes';
import { CARTEIRAS, type Carteira } from '@/lib/base/carteira';
import { linhas } from '@/lib/mitra-api';
import { Alert, AreaQuadro, MetaDot, PageHeader, Stat, Tabs, TabsList, TabsTrigger } from '@/components/page';
import { brl, num, useDados } from './comum';
import { guardarChaves, useFicha } from './ficha';
import './extensoes';

export default function Quadro() {
  const { carteira = 'privada' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const codigo = carteira.toUpperCase() as Carteira;
  const valida = CARTEIRAS.some((c) => c.codigo === codigo);
  const slug = `cobranca-${carteira}`;
  const cardId = Number(params.get('card')) || null;

  const resumo = useDados(() => linhas('ccCobQuadroResumo', { carteira: codigo, agenteId: 0, buId: -1 }), codigo);
  useEffect(() => { if (resumo.dados) guardarChaves(slug, resumo.dados); }, [slug, resumo.dados]);
  // A ficha do card aberto: o quadro relê ao abrir; ela redesenha o "Mover para" (podeMover lê a mesma).
  useFicha(cardId, true);
  const extensoes = extensoesDoQuadro(slug);

  const totais = useMemo(() => {
    const abertas = (resumo.dados ?? []).filter((f) => !['regularizado', 'pago_no_prazo', 'baixado'].includes(String(f.FASE_CHAVE)));
    const finais = (resumo.dados ?? []).filter((f) => ['regularizado', 'pago_no_prazo', 'baixado'].includes(String(f.FASE_CHAVE)));
    const soma = (lista: typeof abertas, col: string) => lista.reduce((s, f) => s + num(f[col]), 0);
    return { casos: soma(abertas, 'CASOS'), vencido: soma(abertas, 'VENCIDO'), aVencer: soma(abertas, 'A_VENCER'), encerrados: soma(finais, 'CASOS') };
  }, [resumo.dados]);

  if (!valida) return <Navigate to="/cobranca/privada" replace />;

  // Mesmo padrão da Análise de crédito: cabeçalho da página com as carteiras à direita e os números numa linha,
  // e o quadro com a altura da janela logo abaixo (antes, quatro cartões empurravam o quadro e ele ficava curto).
  return (
    <>
      <PageHeader
        module="Cobrança"
        title="Quadro de cobrança"
        actions={
          <Tabs value={carteira} onValueChange={(c) => navigate(`/cobranca/${c}`)}>
            <TabsList aria-label="Carteira">
              {CARTEIRAS.map((c) => <TabsTrigger key={c.codigo} value={c.codigo.toLowerCase()}>{c.nome}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        }
        meta={resumo.dados ? (
          <>
            <Stat>{totais.casos}</Stat> casos em cobrança<MetaDot />
            <Stat>{totais.vencido > 0 ? brl(totais.vencido) : 'R$ 0'}</Stat> vencidos<MetaDot />
            <Stat>{totais.aVencer > 0 ? brl(totais.aVencer) : 'R$ 0'}</Stat> a vencer nas preventivas<MetaDot />
            <Stat>{totais.encerrados}</Stat> encerrados no mês (regularizados, pagos no vencimento e baixados)
          </>
        ) : undefined}
      />
      {resumo.erro ? <Alert tone="error">{resumo.erro}</Alert> : null}
      <AreaQuadro>
        <KanbanBoard
          key={slug}
          slug={slug}
          cardId={cardId}
          onCardChange={(id) => setParams(id ? { card: String(id) } : {})}
          novoCard={false}
          atualizarACadaMs={60000}
          podeExcluir={() => false}
          {...extensoes}
        />
      </AreaQuadro>
    </>
  );
}
