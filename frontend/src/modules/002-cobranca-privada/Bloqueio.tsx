// Lista de bloqueio para o Winthor (T-072, opção A "Abas por situação", RF-019): a diferença entre o bloqueio devido e o
// registrado como aplicado. O sistema não escreve no Winthor: aplica-se lá e registra-se aqui. Sem "valor atualizado" (PA-14).
// Ao abrir: 4 totais + a lista da aba (5 chamadas).

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { linha, linhas } from '@/lib/mitra-api';
import { fmtDataHora } from '@/lib/formato';
import { CARTEIRAS, useCarteira } from '@/lib/base/carteira';
import {
  Alert, Button, Code, Dash, EmptyState, MetaDot, PageHeader, Pagination, Panel, RowMeta, RowTitle, SearchInput, Stat, Status, Table, Tabs,
  TabsContent, TabsList, TabsTrigger, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { brl, caminhoDoCard, num, useDados, useEspera, useGravar, type Linha } from './comum';

const LIMITE = 20;
const ABAS = [
  { aba: 'BLOQUEAR_PEDIDOS', rotulo: 'A bloquear: novos pedidos', vazio: 'Nenhum cliente a bloquear novos pedidos.' },
  { aba: 'BLOQUEAR_TOTAL', rotulo: 'A bloquear: total', vazio: 'Nenhum cliente a bloquear todo o crédito.' },
  { aba: 'LIBERAR', rotulo: 'A liberar', vazio: 'Nenhum cliente a liberar no ERP.' },
  { aba: 'BLOQUEADOS', rotulo: 'Bloqueados', vazio: 'Nenhum cliente bloqueado nesta carteira.' },
];
const NO_ERP: Record<string, string> = { '': 'sem bloqueio no ERP', PEDIDOS: 'novos pedidos bloqueados', TOTAL: 'bloqueio total' };

export default function Bloqueio() {
  const navigate = useNavigate();
  // Vindo da agenda (?carteira=…&aba=…): abre onde o cliente do evento está; trocar de aba volta à preferência.
  const [params] = useSearchParams();
  const [escolhida, setCarteira] = useCarteira('cobranca-bloqueio');
  const [daUrl, setDaUrl] = useState(params.get('carteira'));
  const carteira = daUrl === 'PRIVADA' || daUrl === 'ESTETICA' ? daUrl : escolhida;
  const carteiraValida = carteira === 'PUBLICA' ? 'PRIVADA' : carteira;
  const [aba, setAba] = useState(ABAS.find((a) => a.aba === params.get('aba'))?.aba ?? ABAS[0].aba);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const buscaEspera = useEspera(busca);
  const { gravar, gravando, erro, ok } = useGravar();

  const totais = useDados(() => Promise.all(ABAS.map((a) => linha('ccCobBloqueioTotal', { carteira: carteiraValida, situacao: a.aba, busca: buscaEspera }))),
    `${carteiraValida}:${buscaEspera}`);
  const lista = useDados(() => linhas('ccCobBloqueioListar', { carteira: carteiraValida, situacao: aba, busca: buscaEspera, limite: LIMITE, offset: (pagina - 1) * LIMITE }),
    `${carteiraValida}:${aba}:${buscaEspera}:${pagina}`);
  const total = (s: string) => num(totais.dados?.[ABAS.findIndex((a) => a.aba === s)]?.TOTAL);

  async function registrar(l: Linha) {
    const r = await gravar('ccCobBloqueioAplicar', { cobrancaId: l.COBRANCA_ID, aplicado: l.DEVIDO }, `${l.CLIENTE_NOME}: aplicado no ERP registrado.`);
    if (r) { totais.recarregar(); lista.recarregar(); }
  }

  return (
    <>
      <PageHeader module="Listas de trabalho" title="Lista de bloqueio para o Winthor"
        description="A diferença entre o bloqueio que o cliente deveria ter e o que está registrado como aplicado. O sistema não escreve no Winthor: aplique lá e registre aqui."
        meta={totais.dados ? <><Stat>{total('BLOQUEAR_PEDIDOS')}</Stat> a bloquear novos pedidos<MetaDot /><Stat>{total('BLOQUEAR_TOTAL')}</Stat> bloqueio total<MetaDot />
          <Stat>{total('LIBERAR')}</Stat> a liberar<MetaDot /><Stat>{total('BLOQUEADOS')}</Stat> bloqueados</> : undefined} />
      <Tabs value={carteiraValida} onValueChange={(c) => { setDaUrl(null); setCarteira(c as typeof carteira); setPagina(1); }}>
        <TabsList>{CARTEIRAS.filter((c) => c.codigo !== 'PUBLICA').map((c) => <TabsTrigger key={c.codigo} value={c.codigo}>{c.nome}</TabsTrigger>)}</TabsList>
        <Alert tone="info">Registrar "aplicado no ERP" marca o item do checklist da etapa (cobrança ativa e protesto) e a liberação do regularizado.</Alert>
        {erro || totais.erro || lista.erro ? <Alert tone="error">{erro || totais.erro || lista.erro}</Alert> : null}
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        <Panel>
          <Tabs value={aba} onValueChange={(a) => { setAba(a); setPagina(1); }}>
            <TabsList>{ABAS.map((a) => <TabsTrigger key={a.aba} value={a.aba}>{a.rotulo} {total(a.aba)}</TabsTrigger>)}</TabsList>
            <Toolbar><SearchInput placeholder="Cliente ou código do Winthor" value={busca} aria-label="Buscar cliente" onChange={(e) => { setBusca(e.target.value); setPagina(1); }} /></Toolbar>
            {ABAS.map((a) => (
              <TabsContent key={a.aba} value={a.aba}>
                {aba === a.aba && (lista.dados ?? []).length ? (
                  <Table>
                    <thead><tr><Th>Cliente</Th><Th numeric>Dias de atraso</Th><Th numeric>Saldo vencido</Th><Th>No ERP hoje</Th><Th /></tr></thead>
                    <tbody>
                      {(lista.dados ?? []).map((l) => (
                        <Tr key={l.COBRANCA_ID}>
                          <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta><Code>{l.CODCLI}</Code>{l.AGENTE_NOME ? ` · ${l.AGENTE_NOME}` : ''}{l.ENCERRADO_EM ? ' · caso encerrado' : ''}</RowMeta></Td>
                          <Td numeric>{num(l.DIAS_ATRASO) > 0 ? num(l.DIAS_ATRASO) : <Dash />}</Td>
                          <Td numeric>{num(l.VENCIDO) > 0 ? brl(l.VENCIDO) : <Dash />}</Td>
                          <Td>
                            <Status tone={l.APLICADO ? (l.APLICADO === 'TOTAL' ? 'alert' : 'attention') : 'off'}>{NO_ERP[String(l.APLICADO)] ?? l.APLICADO}</Status>
                            {l.BLOQUEIO_APLICADO_EM ? <RowMeta>desde {fmtDataHora(l.BLOQUEIO_APLICADO_EM)}</RowMeta> : null}
                          </Td>
                          <Td>
                            {a.aba !== 'BLOQUEADOS' ? <Button size="sm" disabled={gravando} onClick={() => registrar(l)}>Registrar aplicado no ERP</Button> : null}
                            {l.CARD_ID ? <Button size="sm" variant="ghost" onClick={() => navigate(caminhoDoCard({ carteira: l.CARTEIRA, cardId: l.CARD_ID }))}>Abrir card</Button> : null}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                ) : lista.carregando ? null : <EmptyState title={a.vazio} />}
              </TabsContent>
            ))}
          </Tabs>
          <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(total(aba) / LIMITE))} total={total(aba)} unit="clientes" busy={lista.carregando}
            onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
        </Panel>
      </Tabs>
    </>
  );
}
