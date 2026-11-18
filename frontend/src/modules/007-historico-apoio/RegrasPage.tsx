// Regras em vigor (T-210, opção B "Comparar segmentos"): uma aba por grupo de parâmetros (`GRUPOS_PARAMETRO`)
// e "Etapas e prazos"; matriz Privada (padrão) × Estética × Pública com o valor próprio em destaque e a data de
// início, o herdado esmaecido e "—" onde a carteira não usa a regra (C-017). Somente leitura (C-018, RF-022).
// Uma chamada: ccHistRegrasVigentes('') (4 execuções).

import { useState } from 'react';
import { acao } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { celula, COLUNAS, prazoLegivel, regrasPorGrupo, valoresProprios } from '@/lib/historico-apoio/regras';
import {
  AbasDoPainel, Alert, Dash, EmptyState, Faixa, MetaDot, PageHeader, Panel, PanelHeader, Pilha, RowMeta,
  RowTitle, Stat, Status, Table, Tabs, TabsTrigger, Td, Th, Tr, ValorHerdado, ValorPadrao, ValorProprio,
} from '@/components/page';
import { type Linha, useDados } from './dados';

const ETAPAS = 'etapas';

export default function RegrasPage() {
  const dados = useDados(() => acao('ccHistRegrasVigentes', { carteira: '' }), 'regras');
  const r = dados.dados;
  const regras = (r?.ok ? r.regras : []) as Linha[];
  const quadros = (r?.ok ? r.quadros : []) as Linha[];
  const grupos = regrasPorGrupo(regras);
  const [aba, setAba] = useState('');
  const atual = aba || grupos[0]?.codigo || ETAPAS;
  const erro = dados.erro || (r?.ok === false ? String(r.error) : '');

  return (
    <>
      <PageHeader module="Histórico e apoio" title="Regras de negócio em vigor"
        description="Os parâmetros que valem hoje, por carteira, num só lugar, e as etapas e prazos dos quadros. Somente consulta."
        meta={r?.ok ? <><Stat>{regras.length}</Stat> regras<MetaDot /><Stat>{valoresProprios(regras)}</Stat> valores próprios de carteira
          {r.versao ? <><MetaDot />política versão <Stat>{r.versao}</Stat></> : null}</> : undefined} />
      <Pilha>
        <Alert tone="info">
          <b>Somente leitura.</b> Os valores vêm dos parâmetros em vigor hoje; valor com vigência futura não aparece. Para alterar, quem
          administra usa a área de Parâmetros (Administração); etapas e prazos se alteram na administração de cada quadro.
        </Alert>
        {erro ? <Alert tone="error">{erro}</Alert> : null}
        {r?.ok ? (
          <Panel>
            <Tabs value={atual} onValueChange={setAba}>
              <AbasDoPainel>
                {grupos.map((g) => <TabsTrigger key={g.codigo} value={g.codigo}>{g.nome}</TabsTrigger>)}
                <TabsTrigger value={ETAPAS}>Etapas e prazos</TabsTrigger>
              </AbasDoPainel>
            </Tabs>
            {atual === ETAPAS ? <Etapas quadros={quadros} /> : <Matriz regras={grupos.find((g) => g.codigo === atual)?.regras ?? []} />}
          </Panel>
        ) : dados.carregando ? <Panel><EmptyState title="Carregando as regras…" /></Panel> : null}
      </Pilha>
    </>
  );
}

function Matriz({ regras }: { regras: Linha[] }) {
  return (
    <>
      <Faixa>
        <span>{regras.length} {regras.length === 1 ? 'regra' : 'regras'}</span>
        <span><ValorProprio>Em destaque</ValorProprio>: valor próprio da carteira · <ValorHerdado>esmaecido</ValorHerdado>: segue o padrão · —: não se aplica</span>
      </Faixa>
      <Table>
        <thead><tr><Th>Regra</Th>{COLUNAS.map((c) => <Th key={c.carteira} numeric>{c.nome}</Th>)}</tr></thead>
        <tbody>
          {regras.map((regra) => (
            <Tr key={regra.chave}>
              <Td><RowTitle>{regra.rotulo}</RowTitle>{regra.descricao ? <RowMeta>{regra.descricao}</RowMeta> : null}</Td>
              {COLUNAS.map(({ carteira }) => {
                const c = celula(regra, carteira);
                return (
                  <Td key={carteira} numeric>
                    {c.tipo === 'nao_se_aplica' ? <Dash />
                      : c.tipo === 'propria' ? <><ValorProprio>{c.texto}</ValorProprio><RowMeta>próprio da carteira{c.desde ? `, desde ${fmtData(c.desde)}` : ''}</RowMeta></>
                        : c.tipo === 'herdada' ? <ValorHerdado>{c.texto}</ValorHerdado>
                          : <><ValorPadrao>{c.texto}</ValorPadrao>{c.desde ? <RowMeta>desde {fmtData(c.desde)}</RowMeta> : null}</>}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function Etapas({ quadros }: { quadros: Linha[] }) {
  if (!quadros.length) return <EmptyState title="Nenhum quadro configurado" />;
  return (
    <>
      <Faixa><span>Nome e prazo de cada etapa como estão hoje no quadro, na ordem do quadro.</span></Faixa>
      {quadros.map((q) => (
        <section key={q.quadro}>
          <PanelHeader title={q.nome} hint={`${q.fases.length} etapas`} />
          <Table>
            <thead><tr><Th>Etapa</Th><Th numeric>Prazo</Th></tr></thead>
            <tbody>
              {(q.fases as Linha[]).map((f) => (
                <Tr key={f.chave}>
                  <Td><RowTitle>{f.nome}</RowTitle>{f.final ? <RowMeta><Status tone="off">etapa final</Status></RowMeta> : null}</Td>
                  <Td numeric>{prazoLegivel(f.slaHoras)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      ))}
    </>
  );
}
