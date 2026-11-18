// Histórico de contatos (T-071, opção B "Linha do tempo por dia", RF-034): contatos agrupados por dia, cada um com o
// feedback inteiro e a promessa logo abaixo. Ao abrir: lista + total (2 chamadas).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { CARTEIRAS, useCarteira } from '@/lib/base/carteira';
import { agruparPorDia, rotuloDoDia } from '@/lib/cobranca-privada/agenda';
import {
  Alert, Button, CampoBusca, Code, EmptyState, Field, FilterChip, Input, LabelledField, MetaDot, PageHeader,
  Pagination, Panel, PanelHeader, RowMeta, RowTitle, SearchInput, SelectMenu, Stat, Status, Table, Tabs,
  TabsList, TabsTrigger, Td, TextLink, Toolbar, Tr,
} from '@/components/page';
import { brl, hojeLocal, num, opcoes, RETORNOS, useDados, useEspera, type Linha } from './comum';

const LIMITE = 20;
const PROMESSAS = [{ value: '', label: 'Todas as promessas' }, { value: 'ABERTA', label: 'Promessas em aberto' }, { value: 'QUEBRADA', label: 'Promessas quebradas' }];
const TOM: Record<string, 'live' | 'attention' | 'alert' | 'off'> = { ABERTA: 'attention', CUMPRIDA: 'live', QUEBRADA: 'alert' };

export default function Historico() {
  const [carteira, setCarteira] = useCarteira('cobranca-contatos');
  const [filtro, setFiltro] = useState({ retorno: '', promessa: '', de: '', ate: '' });
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const buscaEspera = useEspera(busca.trim());
  const navigate = useNavigate();
  const entrada = { clienteId: 0, cobrancaId: 0, nfId: 0, agenteId: 0, carteira, ...filtro, busca: buscaEspera };
  const chave = JSON.stringify(entrada);
  const total = useDados(() => linha('ccCobContatoTotal', entrada), chave);
  const lista = useDados(() => linhas('ccCobContatoListar', { ...entrada, limite: LIMITE, offset: (pagina - 1) * LIMITE }), `${chave}:${pagina}`);
  const muda = (campo: keyof typeof filtro, valor: string) => { setFiltro({ ...filtro, [campo]: valor }); setPagina(1); };
  const t = total.dados;
  const n = num(t?.TOTAL);
  const hoje = hojeLocal();
  const ativos = Object.values(filtro).filter(Boolean).length;

  return (
    <>
      <PageHeader module="Cobrança" title="Histórico de contatos"
        description="Tudo o que a equipe registrou de conversa com os clientes: retorno, promessa e feedback."
        meta={t ? <><Stat>{n}</Stat> contatos<MetaDot /><Stat>{num(t.PROMESSAS_ABERTAS)}</Stat> promessas em aberto<MetaDot />
          <Stat>{num(t.PROMESSAS_QUEBRADAS)}</Stat> promessas quebradas<MetaDot /><Stat>{n ? Math.round((num(t.SEM_RETORNO) / n) * 100) : 0}%</Stat> sem retorno</> : undefined} />
      <Tabs value={carteira} onValueChange={(c) => { setCarteira(c as typeof carteira); setPagina(1); }}>
        <TabsList>{CARTEIRAS.map((c) => <TabsTrigger key={c.codigo} value={c.codigo}>{c.nome}</TabsTrigger>)}</TabsList>
        <Panel>
          <PanelHeader title="Filtros" hint={ativos ? undefined : 'Os mais recentes primeiro.'}>
            {ativos ? <Button size="sm" variant="ghost" onClick={() => { setFiltro({ retorno: '', promessa: '', de: '', ate: '' }); setPagina(1); }}>Limpar tudo</Button> : null}
          </PanelHeader>
          <Toolbar>
            <CampoBusca>
              <Field label="Cliente">
                <SearchInput placeholder="Nome ou código do Winthor" value={busca} aria-label="Buscar cliente"
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }} />
              </Field>
            </CampoBusca>
            <Field label="Retorno"><SelectMenu label="Retorno" value={filtro.retorno} options={[{ value: '', label: 'Todos os retornos' }, ...opcoes(RETORNOS)]} onChange={(v) => muda('retorno', v)} /></Field>
            <Field label="Promessa"><SelectMenu label="Promessa" value={filtro.promessa} options={PROMESSAS} onChange={(v) => muda('promessa', v)} /></Field>
            <LabelledField label="De"><Input type="date" value={filtro.de} max={hoje} onChange={(e) => muda('de', e.target.value)} /></LabelledField>
            <LabelledField label="Até"><Input type="date" value={filtro.ate} max={hoje} onChange={(e) => muda('ate', e.target.value)} /></LabelledField>
          </Toolbar>
          {ativos ? (
            <Toolbar>
              {filtro.retorno ? <FilterChip label="Retorno" value={filtro.retorno} onClear={() => muda('retorno', '')} /> : null}
              {filtro.promessa ? <FilterChip label="Promessa" value={PROMESSAS.find((x) => x.value === filtro.promessa)?.label ?? ''} onClear={() => muda('promessa', '')} /> : null}
              {filtro.de ? <FilterChip label="De" value={fmtData(filtro.de)} onClear={() => muda('de', '')} /> : null}
              {filtro.ate ? <FilterChip label="Até" value={fmtData(filtro.ate)} onClear={() => muda('ate', '')} /> : null}
            </Toolbar>
          ) : null}
          {lista.erro || total.erro ? <Alert tone="error">{lista.erro || total.erro}</Alert> : null}
          {(lista.dados ?? []).length ? agruparPorDia(lista.dados ?? []).map((g) => (
            <section key={g.dia}>
              <PanelHeader title={rotuloDoDia(g.dia, hoje)} hint={`${g.contatos.length} ${g.contatos.length === 1 ? 'contato' : 'contatos'}`} />
              <Table>
                <tbody>
                  {g.contatos.map((c: Linha) => (
                    <Tr key={c.ID}>
                      <Td><Code>{String(c.CRIADO_EM ?? '').slice(11, 16)}</Code></Td>
                      <Td>
                        <RowTitle>{c.CLIENTE_NOME}</RowTitle> <Code>{c.CODCLI}</Code>
                        <RowMeta>{[c.CANAL, c.FALOU_COM].filter(Boolean).join(' · ')}{c.RETORNO ? ` · ${c.RETORNO}` : ''}</RowMeta>
                        <p>{c.FEEDBACK}</p>
                        {c.PREVISAO ? (
                          <Status tone={TOM[c.PROMESSA_SITUACAO] ?? 'off'}>
                            Promessa de {brl(c.VALOR)} para {fmtData(c.PREVISAO)}{c.PROMESSA_SITUACAO ? ` · ${String(c.PROMESSA_SITUACAO).toLowerCase()}` : ''}
                          </Status>
                        ) : null}
                      </Td>
                      <Td>{c.AGENTE_NOME}</Td>
                      <Td numeric>
                        <TextLink disabled={!Number(c.CARD_ID)} title={Number(c.CARD_ID) ? undefined : 'Contato sem caso de cobrança aberto.'}
                          onClick={() => navigate(`/cobranca/${String(carteira).toLowerCase()}?card=${c.CARD_ID}`)}>Abrir caso</TextLink>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </section>
          )) : lista.carregando ? null : <EmptyState title="Nenhum contato com estes filtros." hint="Limpe os filtros ou escolha outra carteira." />}
          <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(n / LIMITE))} total={n} unit="contatos" busy={lista.carregando}
            onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
        </Panel>
      </Tabs>
    </>
  );
}
