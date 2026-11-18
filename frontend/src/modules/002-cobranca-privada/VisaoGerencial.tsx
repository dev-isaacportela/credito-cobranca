// Visão gerencial da cobrança (T-077/T-078, opção C "Um bloco por agente" de cobranca-visao-gerencial-2): carteira
// sempre escolhida (Privada ao abrir), BU, agente e período; resumo; 4 totais do time; um bloco por agente agrupado por
// supervisor; as abas da carteira abaixo. Ao abrir: KPIs, agentes, aging + BUs e agentes do seletor (5 chamadas).

import { useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import { CARTEIRAS, useCarteira } from '@/lib/base/carteira';
import { agruparPorSupervisor, resumoGerencial } from '@/lib/cobranca-privada/gerencial';
import {
  Alert, EmptyState, Field, Input, LabelledField, MetaDot, PageHeader, Panel, SelectMenu, Stat, Tabs, TabsList, TabsTrigger, Toolbar,
} from '@/components/page';
import { brl, NOME_CARTEIRA, num, pct, useDados } from './comum';
import { Totais } from './gerencial/Totais';
import { BlocosPorSupervisor } from './gerencial/BlocoAgente';
import { AbasDaCarteira } from './gerencial/Abas';

export default function VisaoGerencial() {
  const [carteira, setCarteira] = useCarteira('cobranca-visao-gerencial');
  const [filtro, setFiltro] = useState({ buId: '-1', agenteId: '0', de: '', ate: '' });
  const recorte = { carteira, buId: Number(filtro.buId), agenteId: Number(filtro.agenteId), de: filtro.de, ate: filtro.ate };
  const chave = JSON.stringify(recorte);

  const painel = useDados(() => Promise.all([
    linhas('ccCobPainelKpis', recorte),
    linhas('ccCobPainelAgentes', recorte),
    linhas('ccCobPainelAging', { carteira, buId: recorte.buId, agenteId: recorte.agenteId }),
  ]), chave);
  const seletores = useDados(() => Promise.all([
    linhas('ccBaseBuListar', { ativa: 1 }),
    linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 200, offset: 0 }),
  ]), 'seletores');

  const [kpis, agentes, aging] = painel.dados ?? [[], [], []];
  const k = kpis[0] ?? null;
  const bus = (seletores.dados?.[0] ?? []).filter((b) => b.CARTEIRA === carteira);
  const pessoas = (seletores.dados?.[1] ?? []).filter((m) => num(m.CLIENTES) > 0);
  const muda = (campo: keyof typeof filtro, valor: string) => setFiltro({ ...filtro, [campo]: valor });

  return (
    <>
      <PageHeader module="Cobrança" title="Visão gerencial"
        description="Como está a carteira em atraso, o que a equipe fez no período e onde a cobrança está travando."
        meta={k ? <><Stat>{num(k.CLIENTES_VENCIDOS)}</Stat> clientes em atraso<MetaDot /><Stat>{brl(k.VENCIDO)}</Stat> vencidos<MetaDot /><Stat>{pct(k.INAD_PCT)}</Stat> da carteira</> : undefined} />
      <Tabs value={carteira} onValueChange={(c) => { setCarteira(c as typeof carteira); setFiltro({ ...filtro, buId: '-1' }); }}>
        <TabsList>{CARTEIRAS.map((c) => <TabsTrigger key={c.codigo} value={c.codigo}>{c.nome}</TabsTrigger>)}</TabsList>
        <Panel>
          <Toolbar>
            <Field label="BU"><SelectMenu label="BU" value={filtro.buId} onChange={(v) => muda('buId', v)}
              options={[{ value: '-1', label: 'Todas as BUs' }, ...bus.map((b) => ({ value: String(b.ID), label: String(b.NOME) }))]} /></Field>
            <Field label="Agente"><SelectMenu label="Agente" value={filtro.agenteId} onChange={(v) => muda('agenteId', v)}
              options={[{ value: '0', label: 'Todos os agentes' }, ...pessoas.map((m) => ({ value: String(m.ID), label: String(m.NOME) }))]} /></Field>
            <LabelledField label="De" hint="Vazio = início do mês"><Input type="date" value={filtro.de} onChange={(e) => muda('de', e.target.value)} /></LabelledField>
            <LabelledField label="Até" hint="Vazio = hoje"><Input type="date" value={filtro.ate} onChange={(e) => muda('ate', e.target.value)} /></LabelledField>
          </Toolbar>
        </Panel>
        {painel.erro ? <Alert tone="error">{painel.erro}</Alert> : null}
        {k ? <Alert tone="info">{resumoGerencial(k, NOME_CARTEIRA[carteira])}</Alert> : null}
        <Totais k={k} />
        {agentes.length ? <BlocosPorSupervisor grupos={agruparPorSupervisor(agentes)} k={k} />
          : painel.carregando ? null : <Panel><EmptyState title="Nenhum agente com carteira neste recorte." /></Panel>}
        <AbasDaCarteira recorte={recorte} k={k} aging={aging} />
      </Tabs>
    </>
  );
}
