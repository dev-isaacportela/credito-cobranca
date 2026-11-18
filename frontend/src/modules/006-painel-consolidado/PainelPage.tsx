/**
 * Painel consolidado (006) — organização B "Abas por assunto" (escolhas.md). Filtro único no topo (mês, BU,
 * carteira) valendo para todos os blocos; cada aba empilha os blocos escolhidos, e cada bloco busca os próprios
 * dados ao ficar visível (BlocoPreguicoso, PA-14). O artefato desenhou a visão do gerente; agente, analista e
 * supervisor veem o mesmo desenho com o recorte que as SFs aplicam e sem o que o cargo não usa (RN-015, T-062).
 */
import * as React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Alert, Badge, BlocoPreguicoso, CampoFiltro, EmptyState, FonteDosNumeros, MetaDot, PageHeader, Panel,
  Pilha, RolagemHorizontal, SelectMenu, Stat, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar,
} from '@/components/page';
import type { MembroSessao } from '@/lib/base/menu';
import {
  avisosDeTopo, blocosDoCargo, mesesOferecidos, ROTULO_ESCOPO, rotuloFonte, type BlocosDoCargo,
} from '@/lib/painel-consolidado/visao';
import { rotuloNum } from '@/lib/painel-consolidado/calculo';
import { lerLinhas, lerPosicao, limparCache, useCarga, type Filtros, type Linha } from './dados';
import { VisaoSaude } from './blocos/VisaoSaude';
import { Indicadores } from './blocos/Indicadores';
import { Evolucao } from './blocos/Evolucao';
import { AgingPdd } from './blocos/AgingPdd';
import { RollRate } from './blocos/RollRate';
import { Movimento } from './blocos/Movimento';
import { Concentracao } from './blocos/Concentracao';
import { Agentes } from './blocos/Agentes';
import { Planos } from './blocos/Planos';
import { Credito } from './blocos/Credito';
import { JuridicoPublico } from './blocos/JuridicoPublico';
import { Equipe } from './blocos/Equipe';

const CARTEIRAS = [
  { value: '', label: 'Todas' },
  { value: 'PRIVADA', label: 'Privada' },
  { value: 'ESTETICA', label: 'Estética' },
  { value: 'PUBLICA', label: 'Pública' },
];

const ABAS = ['resumo', 'carteira', 'cobranca', 'credito', 'outras'] as const;
type Aba = (typeof ABAS)[number];

export default function PainelPage() {
  const membro = useOutletContext<MembroSessao>();
  const cargo = blocosDoCargo(membro);
  if (!cargo.acesso) {
    return (
      <>
        <PageHeader module="Painel consolidado" title="Painel consolidado" />
        <Panel>
          <EmptyState title="Sem acesso ao painel consolidado." hint="O painel não está disponível para o Jurídico; os números do jurídico aparecem aqui para os demais perfis." />
        </Panel>
      </>
    );
  }
  return <Painel membro={membro} cargo={cargo} />;
}

// As BUs do filtro só são lidas quando o seletor de BU é tocado: a primeira abertura do painel fica nas 6 execuções
// do resumo (RNF-001). Uma leitura por usuário na sessão; a lista de BUs não muda com o filtro.
const busDoUsuario = new Map<number, Promise<Linha[]>>();
const lerBus = (userId: number) => {
  let p = busDoUsuario.get(userId);
  if (!p) {
    p = lerLinhas('ccBaseBuListar', { ativa: -1 }).then((r) => r ?? []);
    p.catch(() => busDoUsuario.delete(userId));
    busDoUsuario.set(userId, p);
  }
  return p;
};

function Painel({ membro, cargo }: { membro: MembroSessao; cargo: BlocosDoCargo }) {
  // Mês corrente e "hoje" vêm da sessão (relógio único, 01 §3): a posição já sai pedida com o mês explícito, a mesma
  // entrada que os blocos usam (uma execução só). Cada entrada na tela lê de novo: o cache do módulo é limpo antes
  // de qualquer bloco montar e não atravessa troca de usuário nem de dia.
  React.useState(limparCache);
  return <PainelPronto membro={membro} cargo={cargo} corrente={membro.hoje.slice(0, 7)} hoje={membro.hoje} />;
}

function PainelPronto({ membro, cargo, corrente, hoje }: { membro: MembroSessao; cargo: BlocosDoCargo; corrente: string; hoje: string }) {
  const [params, setParams] = useSearchParams();
  const aba: Aba = (ABAS as readonly string[]).includes(params.get('aba') ?? '') ? (params.get('aba') as Aba) : 'resumo';

  // O seletor mostra a escolha na hora; os blocos refazem 400 ms depois da última troca (debounce), com o cache limpo.
  const [escolha, setEscolha] = React.useState({ mes: corrente, buId: -1, carteira: '' });
  const [aplicado, setAplicado] = React.useState(escolha);
  React.useEffect(() => {
    if (escolha === aplicado) return;
    const t = setTimeout(() => {
      limparCache();
      setAplicado(escolha);
    }, 400);
    return () => clearTimeout(t);
  }, [escolha, aplicado]);

  const f: Filtros = React.useMemo(() => ({ ...aplicado, corrente, hoje }), [aplicado, corrente, hoje]);
  const posicao = useCarga(`cabecalho|${f.mes}|${f.buId}|${f.carteira}`, () => lerPosicao(f));
  const p = posicao.dados;

  const [querBus, setQuerBus] = React.useState(false);
  const bus = useCarga(querBus ? `bus|${membro.userId}` : 'bus-fechado', () => (querBus ? lerBus(membro.userId) : Promise.resolve([] as Linha[])));
  const meses = React.useMemo(() => mesesOferecidos(corrente, 24), [corrente]);
  const opcoesBu = React.useMemo(
    () => [{ value: '-1', label: 'Todas' }, ...(bus.dados ?? []).filter((b) => Number(b.ATIVA) === 1).map((b) => ({ value: String(b.ID), label: String(b.NOME) }))],
    [bus.dados],
  );
  const avisos = avisosDeTopo(p);
  const props = { f, cargo, membro };

  return (
    <>
      <PageHeader
        module="Painel consolidado"
        title="Painel consolidado"
        description="Crédito, cobrança, jurídico e setor público das carteiras Privada, Estética e Pública numa só visão."
        meta={(
          <>
            {p ? <><Stat>{rotuloNum(Number(p.clientes) || 0)}</Stat> clientes com saldo <MetaDot /></> : null}
            visão de {membro.nome}: {ROTULO_ESCOPO[cargo.escopo]}
          </>
        )}
      />
      <Pilha>
        <Panel>
          <Toolbar>
            <CampoFiltro label="Mês">
              <SelectMenu label="Mês" value={escolha.mes} options={meses} onChange={(mes) => setEscolha((e) => ({ ...e, mes }))} />
            </CampoFiltro>
            <CampoFiltro label="BU">
              <div onPointerDown={() => setQuerBus(true)} onFocus={() => setQuerBus(true)}>
                <SelectMenu label="BU" value={String(escolha.buId)} options={opcoesBu} onChange={(v) => setEscolha((e) => ({ ...e, buId: Number(v) }))} />
              </div>
            </CampoFiltro>
            <CampoFiltro label="Carteira">
              <SelectMenu label="Carteira" value={escolha.carteira} options={CARTEIRAS} onChange={(carteira) => setEscolha((e) => ({ ...e, carteira }))} />
            </CampoFiltro>
            <FonteDosNumeros>{posicao.carregando ? 'Carregando…' : rotuloFonte(p)}</FonteDosNumeros>
          </Toolbar>
        </Panel>

        {posicao.erro ? <Alert tone="error">{posicao.erro}</Alert> : null}
        {avisos.map((a) => <Alert key={a.tipo} tone="warn">{a.texto}</Alert>)}

        <Tabs value={aba} onValueChange={(v) => setParams((q) => { q.set('aba', v); return q; }, { replace: true })}>
          <RolagemHorizontal>
            <TabsList>
              <TabsTrigger value="resumo">Resumo <Badge>3</Badge></TabsTrigger>
              <TabsTrigger value="carteira">Carteira e risco <Badge>4</Badge></TabsTrigger>
              <TabsTrigger value="cobranca">Cobrança <Badge>2</Badge></TabsTrigger>
              <TabsTrigger value="credito">Crédito <Badge>1</Badge></TabsTrigger>
              <TabsTrigger value="outras">{cargo.equipe ? 'Jurídico, público e equipe' : 'Jurídico e público'} <Badge>{cargo.equipe ? 2 : 1}</Badge></TabsTrigger>
            </TabsList>
          </RolagemHorizontal>

          <TabsContent value="resumo">
            <Pilha>
              <BlocoPreguicoso altura="alta"><VisaoSaude {...props} /></BlocoPreguicoso>
              <BlocoPreguicoso><Indicadores {...props} /></BlocoPreguicoso>
              <BlocoPreguicoso><Evolucao {...props} /></BlocoPreguicoso>
            </Pilha>
          </TabsContent>
          <TabsContent value="carteira">
            <Pilha>
              <BlocoPreguicoso altura="alta"><AgingPdd {...props} /></BlocoPreguicoso>
              <BlocoPreguicoso><RollRate {...props} /></BlocoPreguicoso>
              <BlocoPreguicoso><Movimento {...props} /></BlocoPreguicoso>
              <BlocoPreguicoso altura="alta"><Concentracao {...props} base="VENCIDO" /></BlocoPreguicoso>
            </Pilha>
          </TabsContent>
          <TabsContent value="cobranca">
            <Pilha>
              <BlocoPreguicoso altura="alta"><Agentes {...props} /></BlocoPreguicoso>
              <BlocoPreguicoso><Planos {...props} /></BlocoPreguicoso>
            </Pilha>
          </TabsContent>
          <TabsContent value="credito">
            <Pilha>
              <BlocoPreguicoso altura="alta"><Credito {...props} /></BlocoPreguicoso>
            </Pilha>
          </TabsContent>
          <TabsContent value="outras">
            <Pilha>
              <BlocoPreguicoso><JuridicoPublico {...props} /></BlocoPreguicoso>
              {cargo.equipe ? <BlocoPreguicoso><Equipe {...props} /></BlocoPreguicoso> : null}
            </Pilha>
          </TabsContent>
        </Tabs>
      </Pilha>
    </>
  );
}
