// Crédito: a carteira (Privado, Estética, Público) e as visões da concessão como abas de uma tela só
// (casca C, D-05). A carteira fica na URL e guardada como preferência; a visão também está na URL.

import { useEffect, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CARTEIRAS, useCarteira, type Carteira } from '@/lib/base/carteira';
import type { MembroSessao } from '@/lib/base/menu';
import {
  PageHeader, Pilha, Tabs, TabsList, TabsTrigger,
} from '@/components/page';
import { CARTEIRA_URL, carteiraDaUrl, nivel2, temMotorProprio, useMembro } from './dados';
import VisaoGerencial from './VisaoGerencial';
import Esteira from './Esteira';
import Gestao from './Gestao';
import Pedidos from './Pedidos';
import Saude from './Saude';
import Desempenho from './Desempenho';
import Sinalizados from './Sinalizados';

type Aba = { id: string; rotulo: string; tela: (p: { carteira: Carteira }) => ReactNode; pode?: (c: Carteira, m: MembroSessao) => boolean };

const ABAS: Aba[] = [
  { id: 'visao', rotulo: 'Visão gerencial', tela: VisaoGerencial },
  { id: 'esteira', rotulo: 'Esteira de concessão', tela: Esteira },
  { id: 'gestao', rotulo: 'Gestão de crédito', tela: Gestao },
  { id: 'pedidos', rotulo: 'Pedidos acima do limite', tela: Pedidos },
  // Na Pública não há Saúde nem Sinalizados (E-4); Desempenho é leitura N2 (aba sem permissão não aparece, design §9.4).
  { id: 'saude', rotulo: 'Saúde das análises', tela: Saude, pode: (c) => temMotorProprio(c) },
  { id: 'desempenho', rotulo: 'Desempenho', tela: Desempenho, pode: (_c, m) => nivel2(m) },
  { id: 'sinalizados', rotulo: 'Clientes sinalizados', tela: Sinalizados, pode: (c) => temMotorProprio(c) },
];

export default function Credito() {
  const { carteira: naUrl, aba: abaUrl } = useParams();
  const [preferida, setPreferida] = useCarteira('credito');
  const membro = useMembro();
  const navigate = useNavigate();
  const carteira = carteiraDaUrl(naUrl);

  useEffect(() => {
    if (carteira && carteira !== preferida) setPreferida(carteira);
  }, [carteira, preferida, setPreferida]);

  if (!carteira) return <Navigate to={`/credito/${CARTEIRA_URL[preferida]}/esteira`} replace />;
  const abas = ABAS.filter((a) => !a.pode || a.pode(carteira, membro));
  const aba = abas.find((a) => a.id === abaUrl);
  if (!aba) return <Navigate to={`/credito/${CARTEIRA_URL[carteira]}/esteira`} replace />;
  const Tela = aba.tela;

  return (
    <>
      <PageHeader
        module="Crédito e Cobrança"
        title="Crédito"
        actions={
          <Tabs value={carteira} onValueChange={(c) => navigate(`/credito/${CARTEIRA_URL[c as Carteira]}/${aba.id}`)}>
            <TabsList aria-label="Carteira">
              {CARTEIRAS.map((c) => (
                <TabsTrigger key={c.codigo} value={c.codigo}>
                  {c.nome}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
      <Tabs value={aba.id} onValueChange={(a) => navigate(`/credito/${CARTEIRA_URL[carteira]}/${a}`)}>
        <Pilha>
        <TabsList variant="line" aria-label="Visão">
          {abas.map((a) => (
            <TabsTrigger key={a.id} value={a.id}>
              {a.rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
        <Tela key={`${carteira}:${aba.id}`} carteira={carteira} />
        </Pilha>
      </Tabs>
    </>
  );
}
