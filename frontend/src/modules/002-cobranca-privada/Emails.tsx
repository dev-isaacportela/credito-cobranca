// E-mails da régua (T-070, opção C "Abas por situação"): Para enviar, Para aprovar, Sem e-mail, Enviados hoje e Modos
// de envio. Envio manual item a item e aprovação de 2 em 2 (DT-29), sempre um pedido por vez, com progresso.
// Ao abrir: 4 totais + a lista da aba + os parâmetros da régua (nome das etapas e modos) = 6 chamadas.

import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtDataHora } from '@/lib/formato';
import { CARTEIRAS, useCarteira } from '@/lib/base/carteira';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';
import { nomeDaFase } from '@/lib/cobranca-privada/fases';
import { emLotes, situacaoFila, type SituacaoFila } from '@/lib/cobranca-privada/listas';
import {
  Alert, Button, Code, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, EmptyState, GradeKpi, Input, Kpi, LabelledField, Marcar, PageHeader, Pagination, Panel,
  PanelHeader, RowMeta, RowTitle, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Th, Tr,
} from '@/components/page';
import { brl, caminhoDoCard, erroDe, num, useDados, type Linha } from './comum';

const LIMITE = 20;
const ABAS: { aba: SituacaoFila; rotulo: string; vazio: string }[] = [
  { aba: 'ENVIAR', rotulo: 'Para enviar', vazio: 'Nenhum e-mail para enviar manualmente agora.' },
  { aba: 'APROVAR', rotulo: 'Para aprovar', vazio: 'Nenhum e-mail aguardando aprovação.' },
  { aba: 'SEM_EMAIL', rotulo: 'Sem e-mail', vazio: 'Todos os clientes da fila têm e-mail na ficha.' },
  { aba: 'ENVIADO', rotulo: 'Enviados hoje', vazio: 'Nenhum e-mail da régua enviado hoje.' },
];
const MODOS: Record<string, string> = { MANUAL: 'Manual: o agente envia pelo botão Enviar', APROVAR: 'Com aprovação: sai quando o supervisor ou acima aprova',
  AUTOMATICO: 'Automático: a rotina envia' };

export default function Emails() {
  const membro = useOutletContext<MembroSessao>();
  const navigate = useNavigate();
  const [carteira, setCarteira] = useCarteira('cobranca-emails');
  const [aba, setAba] = useState<string>('ENVIAR');
  const [pagina, setPagina] = useState(1);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [progresso, setProgresso] = useState('');
  const [resultado, setResultado] = useState<{ tone: 'success' | 'error' | 'warn'; texto: string } | null>(null);
  const [previa, setPrevia] = useState<{ linha: Linha; dados?: Linha; erro?: string } | null>(null);
  const [descarte, setDescarte] = useState<string | null>(null);
  const [confirmarLote, setConfirmarLote] = useState(false);
  const carteiraValida = carteira === 'PUBLICA' ? 'PRIVADA' : carteira;

  const totais = useDados(() => Promise.all(ABAS.map((a) => linha('ccCobEmailFilaTotal', { carteira: carteiraValida, situacao: a.aba }))), carteiraValida);
  const regua = useDados(() => linhas('ccBaseParametroListar', { grupo: '', carteira: carteiraValida, data: '' }), carteiraValida);
  const listaAba = aba === 'MODOS' ? '' : aba;
  const lista = useDados(async () => (listaAba ? linhas('ccCobEmailFilaListar', { carteira: carteiraValida, situacao: listaAba, limite: LIMITE, offset: (pagina - 1) * LIMITE }) : []),
    `${carteiraValida}:${listaAba}:${pagina}`);

  const p = Object.fromEntries((regua.dados ?? []).map((l) => [String(l.CHAVE), l.VALOR_EFETIVO]));
  const modos = (regua.dados ?? []).filter((l) => String(l.CHAVE).startsWith('cob.emailModo.'));
  const total = (s: string) => num(totais.dados?.[ABAS.findIndex((a) => a.aba === s)]?.TOTAL);
  const linhasAba = lista.dados ?? [];
  const ocupado = progresso !== '';
  const reler = () => { setMarcados([]); totais.recarregar(); lista.recarregar(); };

  function trocar(novaAba: string) {
    setAba(novaAba);
    setPagina(1);
    setMarcados([]);
    setResultado(null);
  }

  /** Manual: um ccCobEmailEnviar por vez, na ordem. */
  async function enviar(itens: Linha[]) {
    setResultado(null);
    const recusas: string[] = [];
    for (const [i, l] of itens.entries()) {
      setProgresso(`Enviando ${i + 1} de ${itens.length}…`);
      try {
        const r = await acao('ccCobEmailEnviar', { cobrancaId: l.COBRANCA_ID, contatoId: 0, dataLimite: '' });
        if (r.ok === false) recusas.push(`${l.CLIENTE_NOME}: ${r.error}`);
      } catch (e) {
        recusas.push(`${l.CLIENTE_NOME}: ${erroDe(e)}`);
      }
    }
    setProgresso('');
    const enviados = itens.length - recusas.length;
    setResultado(recusas.length ? { tone: enviados ? 'warn' : 'error', texto: `${enviados} enviado(s). Recusados: ${recusas.join(' · ')}` }
      : { tone: 'success', texto: `${enviados} e-mail(s) enviado(s).` });
    reler();
  }

  /** Aprovação: lotes de 2 ids por chamada, em sequência (DT-29). */
  async function decidir(ids: number[], aprovar: 0 | 1, obs = '') {
    setResultado(null);
    const recusas: string[] = [];
    const lotes = emLotes(ids, 2);
    for (const [i, lote] of lotes.entries()) {
      setProgresso(`${aprovar ? 'Aprovando' : 'Descartando'} lote ${i + 1} de ${lotes.length}…`);
      try {
        const r = await acao('ccCobEmailFilaDecidir', { filaIds: lote.join(','), aprovar, obs });
        if (r.ok === false) recusas.push(String(r.error));
        else for (const x of r.recusados ?? []) recusas.push(String(x.error));
      } catch (e) {
        recusas.push(erroDe(e));
      }
    }
    setProgresso('');
    setResultado(recusas.length ? { tone: 'warn', texto: `Concluído com recusas: ${recusas.join(' · ')}` }
      : { tone: 'success', texto: aprovar ? `${ids.length} e-mail(s) aprovado(s) e enviado(s).` : `${ids.length} e-mail(s) descartado(s).` });
    reler();
  }

  async function verPrevia(l: Linha) {
    setPrevia({ linha: l });
    try {
      const r = await acao('ccBaseModeloPrever', { codigo: l.MODELO, clienteId: l.CLIENTE_ID, contatoId: 0, extras: JSON.stringify({ carteira: l.CARTEIRA }), membroId: 0 });
      setPrevia(r.ok === false ? { linha: l, erro: String(r.error) } : { linha: l, dados: r });
    } catch (e) {
      setPrevia({ linha: l, erro: erroDe(e) });
    }
  }

  const marca = (id: number) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  const podeAprovar = membro.nivel >= num(p['alcada.emailAprovaNivel'] ?? 2) && membro.cargo !== 'JURIDICO';
  const selecionados = linhasAba.filter((l) => marcados.includes(Number(l.ID)));

  const tabela = (s: SituacaoFila) => (
    <>
      {s === 'ENVIAR' || s === 'APROVAR' ? (
        <PanelHeader title={`${marcados.length} selecionado(s)`} hint={s === 'APROVAR' ? 'Aprovação de 2 em 2, em sequência.' : 'Envio um a um, em sequência.'}>
          {s === 'APROVAR' ? (
            <>
              <Button size="sm" disabled={!podeAprovar || ocupado || !marcados.length} onClick={() => setDescarte('')}>Descartar</Button>
              <Button size="sm" variant="primary" disabled={!podeAprovar || ocupado || !marcados.length} title={podeAprovar ? undefined : 'Aprovar exige supervisor ou acima.'}
                onClick={() => decidir(marcados, 1)}>Aprovar e enviar selecionados</Button>
            </>
          ) : (
            <Button size="sm" variant="primary" disabled={ocupado || !marcados.length} onClick={() => setConfirmarLote(true)}>Enviar selecionados</Button>
          )}
        </PanelHeader>
      ) : null}
      {s === 'SEM_EMAIL' ? <Alert tone="info">O destinatário é o contato preferido com e-mail; sem preferido, o primeiro contato com e-mail. Sem nenhum, o envio fica recusado.</Alert> : null}
      {linhasAba.length ? (
        <Table>
          <thead>
            <tr>
              {s === 'ENVIAR' || s === 'APROVAR' ? <Th><Marcar rotulo="Selecionar todos" checked={marcados.length === linhasAba.length}
                onChange={() => setMarcados(marcados.length === linhasAba.length ? [] : linhasAba.map((l) => Number(l.ID)))} /></Th> : null}
              <Th>Cliente</Th><Th>Etapa</Th><Th>Para</Th><Th numeric>Valor</Th><Th>Situação</Th><Th />
            </tr>
          </thead>
          <tbody>
            {linhasAba.map((l) => {
              const sit = situacaoFila(l);
              return (
                <Tr key={l.ID}>
                  {s === 'ENVIAR' || s === 'APROVAR' ? <Td><Marcar rotulo={`Selecionar ${l.CLIENTE_NOME}`} checked={marcados.includes(Number(l.ID))} onChange={() => marca(Number(l.ID))} /></Td> : null}
                  <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta><Code>{l.CODCLI}</Code>{Number(l.VALIDADO) ? '' : ' · modelo aguardando validação'}</RowMeta></Td>
                  <Td>{nomeDaFase(String(l.FASE_CHAVE), p)}</Td>
                  <Td>{l.PARA || <Dash />}</Td>
                  <Td numeric>{brl(l.VALOR)}</Td>
                  <Td><Status tone={sit.tom}>{s === 'ENVIADO' ? `Enviado ${fmtDataHora(l.ENVIADO_EM)}` : sit.rotulo}</Status></Td>
                  <Td>
                    {s === 'SEM_EMAIL' ? <Button size="sm" onClick={() => navigate(caminhoDoCard({ carteira: l.CARTEIRA, cardId: l.CARD_ID }))}>Abrir o card</Button> : null}
                    {s === 'ENVIAR' ? <Button size="sm" disabled={ocupado} onClick={() => verPrevia(l)}>Ver e enviar</Button> : null}
                    {s === 'APROVAR' ? <Button size="sm" variant="ghost" onClick={() => verPrevia(l)}>Ver</Button> : null}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      ) : lista.carregando ? null : <EmptyState title={ABAS.find((a) => a.aba === s)?.vazio ?? ''} />}
      <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(total(s) / LIMITE))} total={total(s)} unit="e-mails" busy={lista.carregando}
        onPrevious={() => setPagina((x) => x - 1)} onNext={() => setPagina((x) => x + 1)} />
    </>
  );

  return (
    <>
      <PageHeader module="Cobrança" title="E-mails da régua"
        description="Fila do dia com a mensagem padrão de cada etapa já preenchida. Cada etapa tem um modo de envio: manual ou com aprovação." />
      <Tabs value={carteiraValida} onValueChange={(c) => { setCarteira(c as typeof carteira); trocar(aba); }}>
        <TabsList>
          {CARTEIRAS.filter((c) => c.codigo !== 'PUBLICA').map((c) => <TabsTrigger key={c.codigo} value={c.codigo}>{c.nome}</TabsTrigger>)}
        </TabsList>
        {totais.erro || lista.erro ? <Alert tone="error">{totais.erro || lista.erro}</Alert> : null}
        {progresso ? <Alert tone="info">{progresso}</Alert> : null}
        {resultado ? <Alert tone={resultado.tone}>{resultado.texto}</Alert> : null}
        <GradeKpi>
          <Kpi rotulo="Enviar manualmente" valor={total('ENVIAR')} hint="o próprio agente envia" />
          <Kpi rotulo="Aguardando aprovação" valor={total('APROVAR')} hint="etapas com efeito formal" />
          <Kpi rotulo="Sem e-mail cadastrado" valor={total('SEM_EMAIL')} hint="corrigir na ficha de contatos" />
          <Kpi rotulo="Enviados hoje" valor={total('ENVIADO')} />
        </GradeKpi>
        <Panel>
          <Tabs value={aba} onValueChange={trocar}>
            <TabsList>
              {ABAS.map((a) => <TabsTrigger key={a.aba} value={a.aba}>{a.rotulo} {total(a.aba)}</TabsTrigger>)}
              <TabsTrigger value="MODOS">Modos de envio</TabsTrigger>
            </TabsList>
            {ABAS.map((a) => <TabsContent key={a.aba} value={a.aba}>{aba === a.aba ? tabela(a.aba) : null}</TabsContent>)}
            <TabsContent value="MODOS">
              <PanelHeader title="Modo de envio por etapa" hint="Só o Administrador altera os modos, na tela de parâmetros; a mudança é auditada.">
                <Button size="sm" disabled={!podeAdministrar(membro)} title={podeAdministrar(membro) ? undefined : 'Só o Administrador edita os parâmetros.'}
                  onClick={() => navigate('/admin/parametros')}>Editar parâmetros</Button>
              </PanelHeader>
              <Table>
                <thead><tr><Th>Etapa</Th><Th>Modo de envio</Th></tr></thead>
                <tbody>
                  {modos.map((m) => (
                    <Tr key={m.CHAVE}><Td>{nomeDaFase(String(m.CHAVE).replace('cob.emailModo.', ''), p)}</Td><Td>{MODOS[String(m.VALOR_EFETIVO)] ?? String(m.VALOR_EFETIVO)}</Td></Tr>
                  ))}
                </tbody>
              </Table>
            </TabsContent>
          </Tabs>
        </Panel>
      </Tabs>

      <Dialog open={!!previa} onOpenChange={(aberto) => !aberto && setPrevia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mensagem · {previa?.linha.CLIENTE_NOME}</DialogTitle>
            <DialogDescription>{previa?.dados ? `Para: ${previa.dados.para || 'sem e-mail'}` : 'Montando a mensagem com os dados do cliente…'}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {previa?.erro ? <Alert tone="error">{previa.erro}</Alert> : null}
            {previa?.dados ? (
              <>
                <RowTitle>{previa.dados.assunto}</RowTitle>
                {String(previa.dados.corpo ?? '').replace(/<[^>]+>/g, '\n').split('\n').filter((t) => t.trim()).map((t, i) => <p key={i}>{t}</p>)}
                {previa.dados.faltando?.length ? <Alert tone="warn">Campos sem dado: {previa.dados.faltando.join(', ')}</Alert> : null}
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setPrevia(null)}>{aba === 'ENVIAR' ? 'Cancelar' : 'Fechar'}</Button>
            {aba === 'ENVIAR' && previa ? (
              <Button variant="primary" disabled={ocupado || !previa.dados || !previa.dados.para}
                onClick={() => { const l = previa.linha; setPrevia(null); void enviar([l]); }}>Enviar ao cliente</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarLote} onOpenChange={setConfirmarLote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar {selecionados.length} e-mail(s) ao cliente</DialogTitle>
            <DialogDescription>Cada cliente recebe a mensagem da etapa no e-mail da ficha. O envio não se desfaz.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {selecionados.map((l) => <RowMeta key={l.ID}>{l.CLIENTE_NOME} · {l.PARA || 'sem e-mail'}</RowMeta>)}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setConfirmarLote(false)}>Cancelar</Button>
            <Button variant="primary" disabled={ocupado} onClick={() => { setConfirmarLote(false); void enviar(selecionados); }}>Enviar ao cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={descarte !== null} onOpenChange={(aberto) => !aberto && setDescarte(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Descartar {marcados.length} e-mail(s)</DialogTitle><DialogDescription>Sai da fila sem enviar; a ação da etapa continua a fazer.</DialogDescription></DialogHeader>
          <DialogBody>
            <LabelledField label="Motivo"><Input value={descarte ?? ''} onChange={(e) => setDescarte(e.target.value)} /></LabelledField>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setDescarte(null)}>Cancelar</Button>
            <Button variant="danger" disabled={ocupado} onClick={() => { const obs = descarte ?? ''; setDescarte(null); void decidir(marcados, 0, obs.trim()); }}>Descartar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
