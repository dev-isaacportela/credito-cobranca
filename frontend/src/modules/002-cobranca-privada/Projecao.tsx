// Projeção de possível inadimplência (T-073, opção A "Ranking por valor", RF-020, RN-016): quanto do saldo a vencer
// tende a atrasar, pela pontualidade de cada cliente. Ao abrir: lista + total + parâmetros da faixa (3 chamadas).

import { useState } from 'react';
import { linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { CARTEIRAS, useCarteira } from '@/lib/base/carteira';
import { corChance } from '@/lib/cobranca-privada/listas';
import {
  Alert, Code, Dash, EmptyState, Field, GradeKpi, Kpi, PageHeader, Pagination, Panel, RowTitle, SelectMenu, Status, Table, Tabs, TabsList,
  TabsTrigger, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { brl, num, parametrosDe, pct, useDados } from './comum';

const LIMITE = 10;
const JANELAS = [15, 30, 60, 90].map((d) => ({ value: String(d), label: `Vence em até ${d} dias` }));

export default function Projecao() {
  const [carteira, setCarteira] = useCarteira('cobranca-projecao');
  const [dias, setDias] = useState('30');
  const [pagina, setPagina] = useState(1);
  const filtro = { carteira, agenteId: 0, buId: -1, dias: Number(dias) };
  const total = useDados(() => linha('ccCobProjecaoTotal', filtro), `${carteira}:${dias}`);
  const lista = useDados(() => linhas('ccCobProjecaoListar', { ...filtro, limite: LIMITE, offset: (pagina - 1) * LIMITE }), `${carteira}:${dias}:${pagina}`);
  const p = useDados(() => parametrosDe(carteira, 'cob'), carteira);
  const forte = num(p.dados?.['cob.probForte'] ?? 40);
  const medio = num(p.dados?.['cob.probMedio'] ?? 15);
  const t = total.dados;
  const n = num(t?.TOTAL);

  return (
    <>
      <PageHeader module="Listas de trabalho" title="Projeção de possível inadimplência"
        description="Quanto do saldo a vencer tende a atrasar, pela pontualidade de cada cliente nos últimos 12 meses. Serve para antecipar o contato antes do vencimento." />
      <Tabs value={carteira} onValueChange={(c) => { setCarteira(c as typeof carteira); setPagina(1); }}>
        <TabsList>{CARTEIRAS.map((c) => <TabsTrigger key={c.codigo} value={c.codigo}>{c.nome}</TabsTrigger>)}</TabsList>
        {total.erro || lista.erro ? <Alert tone="error">{total.erro || lista.erro}</Alert> : null}
        <GradeKpi>
          <Kpi rotulo="Valor projetado" valor={t ? brl(t.VALOR_ESPERADO) : <Dash />} hint="saldo a vencer × chance de atraso" />
          <Kpi rotulo="Saldo a vencer" valor={t ? brl(t.A_VENCER) : <Dash />} hint={`${n} clientes com vencimento em até ${dias} dias`} />
          <Kpi rotulo="Chance forte" valor={t ? num(t.CLIENTES_FORTE) : <Dash />} hint={`clientes com ${forte}% ou mais`} />
          <Kpi rotulo="Projetado sobre o a vencer" valor={t && num(t.A_VENCER) > 0 ? pct((num(t.VALOR_ESPERADO) / num(t.A_VENCER)) * 100) : <Dash />} />
        </GradeKpi>
        <Panel>
          <Toolbar>
            <Field label="Janela"><SelectMenu label="Janela de vencimento" value={dias} options={JANELAS} onChange={(d) => { setDias(d); setPagina(1); }} /></Field>
          </Toolbar>
          {(lista.dados ?? []).length ? (
            <Table>
              <thead><tr><Th>Cliente</Th><Th numeric>Saldo a vencer</Th><Th>Próximo vencimento</Th><Th>Chance de atraso</Th><Th numeric>Valor projetado</Th></tr></thead>
              <tbody>
                {(lista.dados ?? []).map((l) => {
                  const c = corChance(num(l.PROB_ATRASO), forte, medio);
                  return (
                    <Tr key={`${l.CLIENTE_ID}:${l.CARTEIRA}`}>
                      <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle> <Code>{l.CODCLI}</Code></Td>
                      <Td numeric>{brl(l.A_VENCER)}</Td>
                      <Td>{l.PROX_VENC ? `${fmtData(l.PROX_VENC)} · ${brl(l.PROX_VENC_VALOR)}` : <Dash />}</Td>
                      <Td><Status tone={c.tom}>{pct(l.PROB_ATRASO)} {c.rotulo}</Status></Td>
                      <Td numeric>{brl(l.VALOR_ESPERADO)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          ) : lista.carregando ? null : <EmptyState title="Nenhum vencimento na janela." hint="Aumente a janela ou escolha outra carteira." />}
          <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(n / LIMITE))} total={n} unit="clientes · maior valor projetado primeiro" busy={lista.carregando}
            onPrevious={() => setPagina((x) => x - 1)} onNext={() => setPagina((x) => x + 1)} />
        </Panel>
        <Alert tone="info">
          Chance de atraso = 100% menos a pontualidade. Sem pagamentos no período vale o padrão da carteira; com saldo vencido hoje, há um piso; nunca acima do teto.
          Destaque forte a partir de {forte}%, médio a partir de {medio}%.
        </Alert>
      </Tabs>
    </>
  );
}
