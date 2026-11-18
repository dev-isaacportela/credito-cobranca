// Card da solicitação, opção B ("tudo dentro de Nesta fase"): o conteúdo muda com a fase do card
// (chave da ficha), com "Para avançar" no topo; abas "Histórico de crédito", "Posição" e "Análise
// completa" (só leitura); ações conforme `pode` da ficha. Card aberto = kbCardDetalheSql + ficha.

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyState, Field, Input,
  LabelledField, Panel, PanelHeader, RowMeta, SelectMenu, Status, Table, Td, Textarea, Th, Toolbar, Tr,
} from '@/components/page';
import { fmtIndice, TIPOS_CLIENTE } from '@/lib/concessao-credito/regras';
import { executar, invalidarFicha, n, pct, ROTULO_FONTE, ROTULO_RESULTADO, useFicha, useLeitura, type Linha } from '../dados';
import { ParaAvancar, Pares, Rating, Reais, Txt } from '../pecas';
import { useRascunho } from './rascunho';
import Motor from './Motor';
import Decisao from './Decisao';

const ANTES_DA_DECISAO = ['entrada', 'cadastral', 'credito', 'analise', 'formalizacao'];

/** Conteúdo da aba "Nesta fase" (conteudoDaFase). */
export function ConteudoSolicitacao({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha, erro } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  if (erro) return <Alert tone="error">{erro}</Alert>;
  if (!ficha) return <RowMeta>Carregando a solicitação…</RowMeta>;
  const s = ficha.solicitacao as Linha;
  const fase = String(s.FASE_CHAVE ?? '');
  const proprio = s.CARTEIRA !== 'PUBLICA';
  return (
    <>
      {ANTES_DA_DECISAO.includes(fase) ? (
        <Panel>
          <PanelHeader title="Para avançar" hint="O que falta para a próxima etapa; o servidor confere de novo ao mover." />
          <ParaAvancar itens={(ficha.pendencias as string[]) ?? []} />
        </Panel>
      ) : null}
      {fase === 'entrada' ? <DadosSolicitacao key={s.ID} ctx={ctx} ficha={ficha} /> : null}
      {fase === 'cadastral' ? <Consultas key={s.ID} ctx={ctx} ficha={ficha} /> : null}
      {fase === 'credito' && proprio ? <Motor key={s.ID} ctx={ctx} ficha={ficha} /> : null}
      {fase === 'comite' ? <Decisao ctx={ctx} ficha={ficha} /> : null}
      {fase === 'formalizacao' ? (
        <Alert tone="info">Anexe o termo de concessão assinado no campo da etapa; com garantia informada, marque "Garantias formalizadas" antes da Liberação.</Alert>
      ) : null}
      {['comite', 'formalizacao', 'liberacao'].includes(fase) ? <PendenciasWinthor ctx={ctx} ficha={ficha} /> : null}
      {['gestao', 'reanalise', 'obsoleto', 'encerrada'].includes(fase) ? <CreditoDoCard ctx={ctx} ficha={ficha} /> : null}
      {fase === 'recusada' ? (
        <Alert tone="info">Solicitação recusada{s.MOTIVO_RECUSA ? `: ${s.MOTIVO_RECUSA}` : ' na decisão da alçada'}.</Alert>
      ) : null}
    </>
  );
}

/** Entrada: valor, prazo, tipo de cliente, RCA e justificativa; Supervisor atribui o analista. */
function DadosSolicitacao({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const s = ficha.solicitacao as Linha;
  const pode = ficha.pode as Linha;
  const r = useRascunho(ctx, s, { valor: 'VALOR', prazoMeses: 'PRAZO_MESES', tipoCliente: 'TIPO_CLIENTE', rca: 'RCA', justificativa: 'JUSTIFICATIVA' });
  const bloqueado = !pode.salvar || ctx.travado;
  return (
    <>
      {r.erro ? <Alert tone="error">{r.erro}</Alert> : null}
      <Panel>
        <PanelHeader title="Dados da solicitação" hint={bloqueado ? 'Só o analista do caso ou o superior altera.' : 'Grava ao sair do campo.'}>
          <Atribuir ctx={ctx} ficha={ficha} />
        </PanelHeader>
        <Toolbar>
          <LabelledField label="Valor solicitado (R$)" obrigatorio>
            <Input type="number" min={0} value={r.valores.valor} disabled={bloqueado} onChange={(e) => r.mudar('valor')(e.target.value)} onBlur={() => r.salvar('valor')} />
          </LabelledField>
          <LabelledField label="Prazo (meses)" obrigatorio>
            <Input type="number" min={1} size={6} value={r.valores.prazoMeses} disabled={bloqueado} onChange={(e) => r.mudar('prazoMeses')(e.target.value)} onBlur={() => r.salvar('prazoMeses')} />
          </LabelledField>
          <Field label="Tipo de cliente">
            <SelectMenu label="Tipo de cliente" value={r.valores.tipoCliente} disabled={bloqueado} onChange={r.escolher('tipoCliente')} options={TIPOS_CLIENTE} />
          </Field>
          <LabelledField label="RCA">
            <Input value={r.valores.rca} disabled={bloqueado} onChange={(e) => r.mudar('rca')(e.target.value)} onBlur={() => r.salvar('rca')} />
          </LabelledField>
        </Toolbar>
        <Toolbar>
          <LabelledField label="Justificativa" obrigatorio>
            <Textarea cols={70} rows={3} value={r.valores.justificativa} disabled={bloqueado} onChange={(e) => r.mudar('justificativa')(e.target.value)} onBlur={() => r.salvar('justificativa')} />
          </LabelledField>
        </Toolbar>
      </Panel>
    </>
  );
}

/** Supervisor ou acima troca o analista antes do Comitê (membros lidos só ao clicar). */
function Atribuir({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const s = ficha.solicitacao as Linha;
  const pode = ficha.pode as Linha;
  const [aberto, setAberto] = useState(false);
  const [membros, setMembros] = useState<Linha[]>([]);
  const [escolhido, setEscolhido] = useState(String(s.ANALISTA_ID ?? ''));
  const [erro, setErro] = useState('');
  const abrir = async () => {
    setAberto(true);
    setMembros(await linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 100, offset: 0 }).catch(() => []));
  };
  const gravar = async () => {
    const e = await executar('ccCredSolicitacaoAtribuir', { solicitacaoId: s.ID, analistaId: Number(escolhido) });
    if (e) return setErro(e);
    setAberto(false);
    invalidarFicha(ctx.card.id);
    void ctx.recarregar();
  };
  return (
    <>
      <Button size="sm" onClick={abrir} disabled={!pode.atribuir || ctx.travado}
        title={pode.atribuir ? undefined : 'Só Supervisor ou acima atribui o analista, antes do Comitê.'}>Trocar analista</Button>
      {aberto ? (
        <Dialog open onOpenChange={setAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analista da solicitação</DialogTitle>
              <DialogDescription>O analista vira o responsável do card e do cliente.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              {erro ? <Alert tone="error">{erro}</Alert> : null}
              <Field label="Analista">
                <SelectMenu label="Analista" value={escolhido} onChange={setEscolhido}
                  options={membros.filter((m) => m.CARGO !== 'JURIDICO').map((m) => ({ value: String(m.ID), label: m.NOME, hint: m.CARGO }))} />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setAberto(false)}>Cancelar</Button>
              <Button variant="primary" onClick={gravar} disabled={!escolhido}>Atribuir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

const CONSULTA = [
  { value: 'NAO_CONSULTADO', label: 'Não consultado' }, { value: 'SEM', label: 'Sem ocorrência' }, { value: 'COM', label: 'Com ocorrência' },
];
const RECEITA = [{ value: 'NAO_CONSULTADO', label: 'Não consultado' }, { value: 'ATIVA', label: 'Ativa' }, { value: 'IRREGULAR', label: 'Irregular' }];

/** Documentação e análise cadastral: consultas obrigatórias (RF-008) e documentos exigidos (RN-012). */
function Consultas({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const s = ficha.solicitacao as Linha;
  const pode = ficha.pode as Linha;
  const r = useRascunho(ctx, s, {
    consData: 'CONS_DATA', cnpjAbertura: 'CNPJ_ABERTURA', consReceita: 'CONS_RECEITA', consProtesto: 'CONS_PROTESTO', consProcesso: 'CONS_PROCESSO', consSocios: 'CONS_SOCIOS',
  });
  const bloqueado = !pode.salvar || ctx.travado;
  const docs = ((ficha.motor as Linha | null)?.detalhes?.docs ?? []) as Linha[];
  return (
    <>
      {r.erro ? <Alert tone="error">{r.erro}</Alert> : null}
      <Alert tone={ficha.consultasValidas ? 'success' : 'warn'}>
        {ficha.consultasValidas
          ? `Consultas obrigatórias registradas e válidas (feitas em ${fmtData(s.CONS_DATA)}).`
          : 'Consultas obrigatórias pendentes ou vencidas: valem 30 dias a partir da data; resultado com ocorrência vira alerta e rebaixa o rating.'}
      </Alert>
      <Panel>
        <PanelHeader title="Consultas obrigatórias" hint={bloqueado ? 'Só o analista do caso ou o superior altera.' : 'Grava ao sair do campo.'} />
        <Toolbar>
          <LabelledField label="Data das consultas">
            <Input type="date" value={r.valores.consData} disabled={bloqueado} onChange={(e) => r.escolher('consData')(e.target.value)} />
          </LabelledField>
          <LabelledField label="Abertura do CNPJ">
            <Input type="date" value={r.valores.cnpjAbertura} disabled={bloqueado} onChange={(e) => r.escolher('cnpjAbertura')(e.target.value)} />
          </LabelledField>
          <Field label="Situação na Receita">
            <SelectMenu label="Situação na Receita" value={r.valores.consReceita} disabled={bloqueado} onChange={r.escolher('consReceita')} options={RECEITA} />
          </Field>
          <Field label="Protestos (CENPROT)">
            <SelectMenu label="Protestos" value={r.valores.consProtesto} disabled={bloqueado} onChange={r.escolher('consProtesto')} options={CONSULTA} />
          </Field>
          <Field label="Processos judiciais">
            <SelectMenu label="Processos" value={r.valores.consProcesso} disabled={bloqueado} onChange={r.escolher('consProcesso')} options={CONSULTA} />
          </Field>
          <Field label="Sócios" hint={(ficha.cliente as Linha)?.TIPO_PESSOA === 'F' ? 'Não se aplica a pessoa física' : 'Obrigatória para PJ'}>
            <SelectMenu label="Sócios" value={r.valores.consSocios} disabled={bloqueado} onChange={r.escolher('consSocios')} options={CONSULTA} />
          </Field>
        </Toolbar>
      </Panel>
      {docs.length ? (
        <Panel>
          <PanelHeader title={`Documentos exigidos para ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n(s.VALOR))}`}
            hint={`${docs.filter((d) => d.atendido).length} de ${docs.length} atendidos; o item do checklist marca o documento.`} />
          <Table>
            <tbody>
              {docs.map((d) => (
                <Tr key={d.codigo}>
                  <Td><Status tone={d.atendido ? 'live' : 'attention'}>{d.nome}</Status></Td>
                  <Td>{d.atendido ? 'Atendido' : 'Pendente'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      ) : null}
    </>
  );
}

/** Pendências para o Winthor do cliente (nascem na aprovação): marcar como aplicada. */
function PendenciasWinthor({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const lista = (ficha.pendenciasWinthor as Linha[]) ?? [];
  const pode = ficha.pode as Linha;
  const [erro, setErro] = useState('');
  if (!lista.length) return null;
  const aplicar = async (id: number) => {
    const e = await executar('ccCredPendenciaAplicar', { pendenciaId: id, obs: '' });
    setErro(e ?? '');
    if (!e) {
      invalidarFicha(ctx.card.id);
      await ctx.recarregar();
    }
  };
  return (
    <>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Panel>
        <PanelHeader title="Aplicar no Winthor" hint="O sistema não escreve no Winthor: quem aplica no ERP marca aqui; fica registrado quem e quando." />
        <Table>
          <tbody>
            {lista.map((p) => (
              <Tr key={p.ID}>
                <Td><Status tone="attention">{p.DESCRICAO}</Status><RowMeta>Gerada em {fmtDataHora(p.GERADA_EM)}</RowMeta></Td>
                <Td numeric>
                  <Button size="sm" onClick={() => aplicar(p.ID)} disabled={!pode.aplicar || ctx.travado}
                    title={pode.aplicar ? undefined : 'Só o analista do caso ou o superior aplica a pendência.'}>Marcar como aplicada</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}

/** Gestão, reanálise e finais: o crédito nascido desta solicitação, antecipar e concluir a reanálise. */
function CreditoDoCard({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const cr = ficha.credito as Linha | null;
  const pode = ficha.pode as Linha;
  const [dialogo, setDialogo] = useState<'' | 'abrir' | 'concluir'>('');
  if (!cr) return <Alert tone="info">Sem crédito nascido desta solicitação.</Alert>;
  const risco = (cr.risco ?? {}) as Linha;
  return (
    <>
      <Panel>
        <PanelHeader title="Crédito" hint={`Situação: ${String(cr.SITUACAO ?? '').toLowerCase()}${cr.MOTIVO_ENCAMINHAMENTO ? ` · ${cr.MOTIVO_ENCAMINHAMENTO}` : ''}`}>
          {cr.SITUACAO === 'GESTAO' ? (
            <Button size="sm" onClick={() => setDialogo('abrir')} disabled={!pode.reanaliseAbrir || ctx.travado}
              title={pode.reanaliseAbrir ? undefined : 'Somente Supervisor ou acima antecipa a reanálise.'}>Antecipar reanálise</Button>
          ) : null}
          {cr.SITUACAO === 'REANALISE' ? (
            <Button size="sm" variant="primary" onClick={() => setDialogo('concluir')} disabled={!pode.reanaliseConcluir || ctx.travado}
              title={pode.reanaliseConcluir ? undefined : 'Quem analisou o crédito não decide a renovação; a alçada é a do limite.'}>Concluir reanálise</Button>
          ) : null}
        </PanelHeader>
        <Pares itens={[
          ['Limite', <Reais v={cr.LIMITE} />],
          ['Plano e forma', <Txt v={[cr.PLANO_DESCR, cr.FORMA].filter(Boolean).join(' · ')} />],
          ['Rating na concessão', <Rating r={cr.RATING_CONCESSAO || ctx.card.valores.rating} />],
          ['Rating atual', <Rating r={risco.RATING_ATUAL} />],
          ['Validade', `${fmtData(cr.INICIO_VALIDADE)} a ${fmtData(cr.FIM_VALIDADE)}`],
          ['Destino ao vencer', <Txt v={risco.DESTINO ? String(risco.DESTINO).toLowerCase() : ''} />],
        ]} />
      </Panel>
      {dialogo ? (
        <DialogoReanalise ctx={ctx} creditoId={Number(cr.ID)} modo={dialogo} onFechar={() => setDialogo('')} />
      ) : null}
    </>
  );
}

function DialogoReanalise({ ctx, creditoId, modo, onFechar }: { ctx: ExtensaoContexto; creditoId: number; modo: 'abrir' | 'concluir'; onFechar: () => void }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const fazer = async (resultado?: string) => {
    setGravando(true);
    const e = modo === 'abrir'
      ? await executar('ccCredReanaliseAbrir', { creditoId, motivo: texto.trim() })
      : await executar('ccCredReanaliseConcluir', { creditoId, resultado, parecer: texto.trim() });
    setGravando(false);
    if (e) return setErro(e);
    invalidarFicha(ctx.card.id);
    onFechar();
    await ctx.recarregar();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modo === 'abrir' ? 'Antecipar reanálise' : 'Concluir reanálise'}</DialogTitle>
          <DialogDescription>
            {modo === 'abrir' ? 'A rotina abre sozinha no vencimento; aqui se antecipa com o motivo.'
              : 'Renovar abre um novo período com o mesmo limite, plano e forma; obsoleto bloqueia o limite no Winthor.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <LabelledField label={modo === 'abrir' ? 'Motivo' : 'Parecer'} obrigatorio={modo === 'concluir'}>
            <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </LabelledField>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          {modo === 'abrir' ? (
            <Button variant="primary" onClick={() => fazer()} disabled={gravando}>Antecipar</Button>
          ) : (
            <>
              <Button variant="danger" onClick={() => fazer('OBSOLETO')} disabled={gravando || !texto.trim()}>Encerrar como obsoleto</Button>
              <Button variant="primary" onClick={() => fazer('RENOVADA')} disabled={gravando || !texto.trim()}>Renovar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Ações extras: recusar (antes do Comitê) ─────────────────────────────── */

export function AcoesSolicitacao({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const pode = (ficha?.pode ?? {}) as Linha;
  const s = (ficha?.solicitacao ?? {}) as Linha;
  if (!ficha || s.FASE_CHAVE === 'comite' || s.ENCERRADA_EM || s.DECIDIDA_EM) return null;
  const recusar = async () => {
    const e = await executar('ccCredSolicitacaoRecusar', { solicitacaoId: s.ID, motivo: motivo.trim() });
    if (e) return setErro(e);
    setAberto(false);
    invalidarFicha(ctx.card.id);
    await ctx.recarregar();
  };
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setAberto(true)} disabled={!pode.recusar || ctx.travado}
        title={pode.recusar ? 'Recusar exige motivo; a solicitação não se exclui.' : 'Só o analista do caso ou o superior recusa, antes do Comitê.'}>Recusar</Button>
      {aberto ? (
        <Dialog open onOpenChange={setAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recusar a solicitação</DialogTitle>
              <DialogDescription>Encerra a solicitação e leva o card para Recusadas. No Comitê a recusa é decisão da alçada.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              {erro ? <Alert tone="error">{erro}</Alert> : null}
              <LabelledField label="Motivo da recusa" obrigatorio>
                <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
              </LabelledField>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setAberto(false)}>Cancelar</Button>
              <Button variant="danger" onClick={recusar} disabled={!motivo.trim()}>Recusar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/* ── Abas extras ─────────────────────────────────────────────────────────── */

/** "Histórico de crédito": solicitações e decisões anteriores do cliente (lido ao abrir a aba). */
export function AbaHistorico({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  const clienteId = Number((ficha?.cliente as Linha)?.ID ?? 0);
  const h = useLeitura(() => (clienteId ? linhas('ccCredSolicitacaoHistorico', { clienteId }) : Promise.resolve([])), [clienteId]);
  if (h.erro) return <Alert tone="error">{h.erro}</Alert>;
  if (!h.dados?.length) return h.carregando ? <RowMeta>Carregando o histórico…</RowMeta> : <EmptyState title="Sem histórico de crédito" hint="É a primeira solicitação deste cliente." />;
  return (
    <Table>
      <thead><tr><Th>Aberta em</Th><Th>Carteira</Th><Th numeric>Valor</Th><Th>Resultado</Th><Th numeric>Limite</Th><Th>Rating</Th><Th>Decidiu</Th></tr></thead>
      <tbody>
        {h.dados.map((l, i) => (
          <Tr key={`${l.SOLICITACAO_ID}:${i}`}>
            <Td>{fmtData(l.CRIADO_EM)}</Td>
            <Td>{String(l.CARTEIRA ?? '').toLowerCase()}</Td>
            <Td numeric><Reais v={l.VALOR} /></Td>
            <Td><Txt v={ROTULO_RESULTADO[l.RESULTADO] ?? l.RESULTADO} /></Td>
            <Td numeric><Reais v={l.LIMITE_APROVADO} /></Td>
            <Td><Rating r={l.RATING || l.RATING_PUB} /></Td>
            <Td><Txt v={l.RESPONSAVEL_NOME} />{l.EM ? <RowMeta>{fmtData(l.EM)}</RowMeta> : null}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

/** "Posição": limite, uso e atraso do Winthor e o faturamento por mês e BU (da ficha, sem leitura nova). */
export function AbaPosicao({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  if (!ficha) return <RowMeta>Carregando…</RowMeta>;
  const p = (ficha.posicao ?? {}) as Linha;
  const fat = (ficha.faturamento ?? []) as Linha[];
  return (
    <>
      <Pares itens={[
        ['Limite no Winthor', <Reais v={p.LIMITE} />],
        ['Utilizado', <Reais v={p.UTILIZADO} />],
        ['Disponível', <Reais v={p.DISPONIVEL} zeroEhDado />],
        ['Saldo vencido', <Reais v={p.VENCIDO} />],
        ['Dias de atraso', <Txt v={n(p.DIAS_ATRASO) ? `${p.DIAS_ATRASO} dias` : ''} />],
        ['Pontualidade', <Txt v={pct(p.PONTUALIDADE_PCT)} />],
        ['Compra média mensal', <Reais v={p.COMPRA_MEDIA_MENSAL} />],
        ['Prazo médio', <Txt v={n(p.PRAZO_MEDIO_DIAS) ? `${p.PRAZO_MEDIO_DIAS} dias` : ''} />],
        ['Última compra', <Txt v={fmtData(p.ULTIMA_COMPRA)} />],
      ]} />
      {fat.length ? (
        <Table>
          <thead><tr><Th>Mês</Th><Th>BU</Th><Th numeric>Faturamento</Th></tr></thead>
          <tbody>
            {fat.map((f, i) => (
              <Tr key={`${f.MES}:${f.BU_ID}:${i}`}><Td>{f.MES}</Td><Td>{f.BU_NOME}</Td><Td numeric><Reais v={f.VALOR} /></Td></Tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </>
  );
}

/** "Análise completa": o que as etapas produziram, só leitura. */
export function AbaAnaliseCompleta({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  if (!ficha) return <RowMeta>Carregando…</RowMeta>;
  const s = ficha.solicitacao as Linha;
  const m = ficha.motor as Linha | null;
  const ind = (m?.detalhes?.indices ?? {}) as Linha;
  const alcada = ficha.alcada as Linha;
  const decisoes = (ficha.decisoes ?? []) as Linha[];
  return (
    <>
      <Pares itens={[
        ['Valor e prazo', <><Reais v={s.VALOR} /> · {s.PRAZO_MESES} meses</>],
        ['Tipo de cliente', <Txt v={TIPOS_CLIENTE.find((t) => t.value === s.TIPO_CLIENTE)?.label} />],
        ['Justificativa', <Txt v={s.JUSTIFICATIVA} />],
        ['Consultas', ficha.consultasValidas ? `válidas (${fmtData(s.CONS_DATA)})` : 'pendentes ou vencidas'],
        ['Fonte pagadora', <Txt v={[ROTULO_FONTE[s.FP_TIPO] ?? s.FP_TIPO, s.FP_NOME, n(s.FP_PRAZO_DIAS) ? `recebe em ${s.FP_PRAZO_DIAS} dias` : ''].filter(Boolean).join(' · ')} />],
        ['Garantia', <Txt v={s.GARANTIA} />],
        ['Liquidez corrente', <Txt v={fmtIndice(ind.lc)} />],
        ['Dívida / EBITDA', <Txt v={fmtIndice(ind.divEbitda, 'multiplo')} />],
        ['Dívida / PL', <Txt v={fmtIndice(ind.divPl)} />],
        ['Rating efetivo', <Rating r={ficha.ratingEfetivo || ctx.card.valores.rating} />],
        ['Limite sugerido pelo motor', <Reais v={s.MOTOR_LIMITE || m?.limiteSugerido} />],
        ['Limite proposto', <Reais v={s.LIMITE_PROPOSTO} />],
        ['Parecer do analista', <Txt v={s.PARECER_ANALISTA} />],
        ['Alçada', <Txt v={alcada?.rotulo} />],
      ]} />
      {decisoes.length ? (
        <Table>
          <thead><tr><Th>Decisão</Th><Th>Quem</Th><Th numeric>Limite</Th><Th>Parecer</Th></tr></thead>
          <tbody>
            {decisoes.map((d) => (
              <Tr key={d.ID}>
                <Td>{ROTULO_RESULTADO[d.RESULTADO] ?? d.RESULTADO}<RowMeta>{fmtDataHora(d.EM)}</RowMeta></Td>
                <Td>{d.RESPONSAVEL_NOME}<RowMeta>{d.CARGO_ALCADA}</RowMeta></Td>
                <Td numeric><Reais v={d.LIMITE_APROVADO} /></Td>
                <Td>{d.PARECER}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </>
  );
}

