// O que a 005 soma ao card de `cobranca-publica` (T-212, T-213): o bloco "Régua da NF" (passo atual de cada NF em
// aberto, "Feito" e "Enviar" com confirmação, os dez passos ao expandir), a aba "Regra do ente" e as ações "Lançar
// datas da NF" e "Preparar mensagem ao órgão". O órgão vem da ficha que a 002 já leu para o card (mesma promessa);
// as NFs, de uma leitura por card (ccPubNfListar com clienteId), dividida entre bloco, aba e ações.

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { acao } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogoLargo, DialogTitle, Field, Input, LabelledField, LinhaNf, Panel, PanelHeader, Pilha, Previa, RowMeta,
  RowTitle, SelectMenu, Status, Table, Td, Textarea, Th, Tr,
} from '@/components/page';
import { diaMes, etiquetaRegra, PASSOS_REGUA, textoSituacao, tomSituacao } from '@/lib/setor-publico/formato';
import { recarregarFicha, useFicha } from '@/modules/002-cobranca-privada/ficha';
import { brl, executar, lerNfsDoOrgao, useDados, useMembro, useNfsDoOrgao, type Linha } from './dados';
import NfDatasDialog from './NfDatasDialog';
import NotasFiscaisLista from './NotasFiscaisLista';

const aberta = (nf: Linha) => nf.SITUACAO !== 'PAGA' && !Number(nf.BAIXADA);
const rotuloNf = (nf: Linha) => `NF ${nf.NUMNOTA}${nf.SERIE ? `-${nf.SERIE}` : ''}`;

/** O órgão do card e as NFs dele; `pode` = quem opera NF (Jurídico só lê; card travado não grava). */
function useOrgao(ctx: ExtensaoContexto) {
  const membro = useMembro();
  const { ficha, erro: erroFicha } = useFicha(ctx.card.id);
  const clienteId = ficha?.cliente.id ?? 0;
  const nfs = useNfsDoOrgao(clienteId);
  const depois = (texto: string) => {
    void lerNfsDoOrgao(clienteId, true);
    void recarregarFicha(ctx.card.id);
    void ctx.recarregar();
    ctx.avisar('success', texto);
  };
  return { clienteId, nfs, erro: erroFicha || nfs.erro, pode: membro.cargo !== 'JURIDICO' && !ctx.travado, depois };
}

type Marcar = { nf: Linha; passo: string; enviar: boolean };

/** conteudoDaFase de `cobranca-publica`: "Régua da NF". */
export function ReguaNf({ ctx }: { ctx: ExtensaoContexto }) {
  const o = useOrgao(ctx);
  const [marcar, setMarcar] = useState<Marcar | null>(null);
  const [aberto, setAberto] = useState(0);
  if (!o.clienteId && !o.erro) return null;
  const lista = (o.nfs.lista ?? []).filter(aberta);
  const semPermissao = o.pode ? undefined : 'Só o agente da carteira ou o superior marca passo da régua.';
  return (
    <Panel>
      <PanelHeader title="Régua da NF" hint="Passo atual de cada nota em aberto; o passo só pode ser marcado perto do prazo." />
      {o.erro ? <Alert tone="error">{o.erro}</Alert> : null}
      {!o.nfs.lista && !o.erro ? <RowMeta>Carregando as notas do órgão…</RowMeta> : null}
      {o.nfs.lista && !lista.length ? <RowMeta>Sem nota fiscal em tramitação deste órgão.</RowMeta> : null}
      {lista.map((nf) => {
        const passo = String(nf.PROXIMO_PASSO ?? '');
        const def = PASSOS_REGUA[passo];
        return (
          <div key={nf.ID}>
            <LinhaNf
              esquerda={<><RowTitle>{rotuloNf(nf)}</RowTitle><RowMeta>{brl(nf.SALDO_ABERTO ?? nf.VALOR)} · emitida em {fmtData(nf.EMISSAO)}</RowMeta></>}
              meio={(
                <>
                  <Status tone={tomSituacao(nf)}>{textoSituacao(nf)}</Status>
                  <RowMeta>{def ? `${passo} · ${def.acao}${nf.PROXIMO_PASSO_DATA ? ` · até ${diaMes(nf.PROXIMO_PASSO_DATA)}` : ''}` : 'Sem passo da régua agora'}</RowMeta>
                </>
              )}
              direita={(
                <>
                  {def ? <Button size="sm" disabled={!o.pode} title={semPermissao} onClick={() => setMarcar({ nf, passo, enviar: false })}>Feito</Button> : null}
                  {def?.modelo ? <Button size="sm" disabled={!o.pode} title={semPermissao} onClick={() => setMarcar({ nf, passo, enviar: true })}>Enviar</Button> : null}
                  <Button size="sm" variant="ghost" aria-expanded={aberto === nf.ID} onClick={() => setAberto(aberto === nf.ID ? 0 : Number(nf.ID))}>
                    {aberto === nf.ID ? 'Esconder os passos' : 'Ver os passos'}
                  </Button>
                </>
              )}
            />
            {aberto === nf.ID ? <PassosDaNf nfId={Number(nf.ID)} pode={o.pode} onMarcar={(p) => setMarcar({ nf, passo: p, enviar: false })} /> : null}
          </div>
        );
      })}
      {marcar ? (
        <DialogoPasso {...marcar} onFechar={() => setMarcar(null)} onFeito={(t) => { setMarcar(null); setAberto(0); o.depois(t); }} />
      ) : null}
    </Panel>
  );
}

/** Os dez passos da régua da NF (ccPubNfFicha), lidos ao expandir. */
function PassosDaNf({ nfId, pode, onMarcar }: { nfId: number; pode: boolean; onMarcar: (passo: string) => void }) {
  const leitura = useDados(async () => {
    const r = await acao('ccPubNfFicha', { nfId });
    if (r.ok === false) throw new Error(String(r.error ?? 'Nota fiscal não encontrada.'));
    return r as Linha;
  }, `passos:${nfId}`);
  const d = leitura.dados;
  const passos = (d?.passos ?? []) as Linha[];
  const marca = pode && !!(d?.pode as Linha | undefined)?.marcarPasso;
  if (leitura.erro) return <Alert tone="error">{leitura.erro}</Alert>;
  if (!d) return <RowMeta>Carregando os passos…</RowMeta>;
  return (
    <Table>
      <thead><tr><Th>Passo</Th><Th>Canal</Th><Th>Prazo</Th><Th>Feito</Th><Th>{' '}</Th></tr></thead>
      <tbody>
        {passos.map((p) => (
          <Tr key={p.passo}>
            <Td>{p.passo} · {p.acao}</Td>
            <Td>{p.canal || <Dash />}</Td>
            <Td>{p.devido ? fmtData(p.devido) : <Dash />}</Td>
            <Td>
              {p.feitoEm ? <Status tone={p.noPrazo ? 'live' : 'attention'}>{`${fmtData(p.feitoEm)} · ${p.noPrazo ? 'no prazo' : 'fora do prazo'}`}</Status>
                : p.atrasado ? <Status tone="alert">Atrasado</Status> : p.atual ? <Status tone="attention">Agora</Status> : <Dash />}
            </Td>
            <Td>{!p.feitoEm && p.atual ? <Button size="sm" disabled={!marca || !p.podeFeito} onClick={() => onMarcar(String(p.passo))}
              title={p.podeFeito ? undefined : 'Só pode ser marcado perto do prazo.'}>Feito</Button> : null}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

/** "Feito" (registro) ou "Enviar" (mensagem pronta, editável, confirmada antes de sair). */
function DialogoPasso({ nf, passo, enviar, onFechar, onFeito }: Marcar & { onFechar: () => void; onFeito: (t: string) => void }) {
  const def = PASSOS_REGUA[passo];
  const previa = useDados(() => (enviar ? acao('ccPubMensagemPreparar', { nfId: Number(nf.ID), passo }) : Promise.resolve({ ok: true } as Linha)), `msg:${nf.ID}:${passo}:${enviar}`);
  const pv = previa.dados as Linha | undefined;
  const [texto, setTexto] = useState<{ para: string; assunto: string; corpo: string } | null>(null);
  const [obs, setObs] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const msg = texto ?? { para: String(pv?.para ?? ''), assunto: String(pv?.assunto ?? ''), corpo: String(pv?.corpo ?? '') };
  const pronta = !enviar || (!!pv && pv.ok !== false);

  async function registrar() {
    setGravando(true);
    setErro('');
    const r = await executar('ccPubNfPassoRegistrar', {
      nfId: Number(nf.ID), passo, protocoloOrgao: protocolo.trim(), obs: obs.trim(), enviarEmail: enviar ? 1 : 0,
      para: enviar ? msg.para.trim() : '', assunto: enviar ? msg.assunto : '', corpo: enviar ? msg.corpo : '',
    });
    setGravando(false);
    if (r.erro) { setConfirmar(false); return setErro(r.erro); }
    if (r.jaFeito) return onFeito(`${passo} da ${rotuloNf(nf)} já estava feito.`);
    const prox = (r.proximoPasso ?? {}) as Linha;
    onFeito(`${passo} da ${rotuloNf(nf)} feito ${r.noPrazo ? 'no prazo' : 'fora do prazo'}${r.emailEnviadoId ? ', e-mail enviado' : ''}.`
      + `${prox.passo ? ` Próximo: ${prox.passo}${prox.data ? ` até ${diaMes(prox.data)}` : ''}.` : ''}`);
  }

  const Conteudo = enviar ? DialogoLargo : DialogContent;
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <Conteudo>
        <DialogHeader>
          <DialogTitle>{enviar ? `Enviar ${passo}` : `Marcar ${passo} como feito`} · {rotuloNf(nf)}</DialogTitle>
          <DialogDescription>{def?.acao}{def?.canal ? ` (${def.canal})` : ''}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {enviar && pv?.ok === false ? <Alert tone="error">{String(pv.error)}</Alert> : null}
            {enviar && previa.carregando && !pv ? <RowMeta>Preparando a mensagem…</RowMeta> : null}
            {enviar && pv && pv.ok !== false ? (
              <>
                {!pv.validado ? <Alert tone="warn">Modelo ainda não validado pelo Jurídico: confira o texto antes de enviar.</Alert> : null}
                {(pv.faltando as string[] | undefined)?.length ? <Alert tone="warn">Campos sem dado no texto: {(pv.faltando as string[]).join(', ')}.</Alert> : null}
                <LabelledField label="Para" hint="Vazio = contato do órgão para este passo"><Input value={msg.para} onChange={(e) => setTexto({ ...msg, para: e.target.value })} /></LabelledField>
                <LabelledField label="Assunto"><Input value={msg.assunto} onChange={(e) => setTexto({ ...msg, assunto: e.target.value })} /></LabelledField>
                <LabelledField label="Mensagem"><Textarea rows={10} value={msg.corpo} onChange={(e) => setTexto({ ...msg, corpo: e.target.value })} /></LabelledField>
              </>
            ) : null}
            <LabelledField label="Protocolo no órgão" hint="Opcional"><Input value={protocolo} maxLength={60} onChange={(e) => setProtocolo(e.target.value)} /></LabelledField>
            <LabelledField label="Observação" hint="Opcional; vai para o contato com o órgão"><Input value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} /></LabelledField>
            {confirmar ? <Alert tone="warn">Confirme: o e-mail sai {msg.para ? `para ${msg.para}` : 'para o contato do órgão'} e o passo {passo} fica feito.</Alert> : null}
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          {enviar && !confirmar
            ? <Button variant="primary" disabled={!pronta || gravando} onClick={() => setConfirmar(true)}>Enviar</Button>
            : <Button variant="primary" disabled={!pronta || gravando} onClick={registrar}>{gravando ? 'Gravando…' : enviar ? 'Confirmar envio' : 'Marcar feito'}</Button>}
        </DialogFooter>
      </Conteudo>
    </Dialog>
  );
}

/** Aba "Notas fiscais" do card: a mesma lista da página, filtrada pelo órgão do caso. */
export function AbaNotasDoCaso({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha(ctx.card.id);
  return ficha ? <NotasFiscaisLista clienteId={ficha.cliente.id} onGravou={() => void lerNfsDoOrgao(ficha.cliente.id, true)} /> : null;
}

/* ── Aba "Regra do ente": a regra que vale para cada NF do órgão ─────────── */

export function AbaRegraEnte({ ctx }: { ctx: ExtensaoContexto }) {
  const o = useOrgao(ctx);
  const lista = o.nfs.lista ?? [];
  return (
    <Pilha>
      {o.erro ? <Alert tone="error">{o.erro}</Alert> : null}
      {lista.some((nf) => nf.REGRA_SITUACAO === 'A_CONFIRMAR') ? (
        <Alert tone="warn">Há regra a confirmar: os prazos dessas notas são referência até o Jurídico validar a norma em Regras por ente.</Alert>
      ) : null}
      <Table>
        <thead><tr><Th>Nota</Th><Th>Regra que vale</Th><Th>Liquidar até</Th><Th>Pagar até</Th></tr></thead>
        <tbody>
          {lista.map((nf) => (
            <Tr key={nf.ID}>
              <Td>{rotuloNf(nf)}</Td>
              <Td>{etiquetaRegra(nf) || 'Regra do ente não definida'}</Td>
              <Td>{nf.LIQUIDAR_ATE ? fmtData(nf.LIQUIDAR_ATE) : <Dash />}</Td>
              <Td>{nf.PAGAR_ATE ? fmtData(nf.PAGAR_ATE) : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {o.nfs.lista && !lista.length ? <RowMeta>Sem nota fiscal deste órgão.</RowMeta> : null}
    </Pilha>
  );
}

/* ── Ações do card: escolher a NF e abrir o diálogo ────────────────────────── */

function EscolherNf({ lista, valor, onChange }: { lista: Linha[]; valor: string; onChange: (v: string) => void }) {
  return (
    <Field label="Nota fiscal">
      <SelectMenu label="Nota fiscal" value={valor} onChange={onChange}
        options={lista.map((nf) => ({ value: String(nf.ID), label: rotuloNf(nf), hint: textoSituacao(nf) }))} />
    </Field>
  );
}

export function AcoesNf({ ctx }: { ctx: ExtensaoContexto }) {
  const o = useOrgao(ctx);
  const [modo, setModo] = useState<'' | 'datas' | 'mensagem'>('');
  const [nfId, setNfId] = useState('');
  const [datas, setDatas] = useState(0);
  if (!o.clienteId) return null;
  const lista = (o.nfs.lista ?? []).filter(aberta);
  const vazioTitulo = lista.length ? undefined : 'Sem nota fiscal em tramitação.';
  const abrir = (m: 'datas' | 'mensagem') => { setNfId(String(lista[0]?.ID ?? '')); setModo(m); };
  return (
    <>
      <Button size="sm" disabled={!o.pode || !lista.length} title={o.pode ? vazioTitulo : 'O Jurídico só consulta as notas.'} onClick={() => abrir('datas')}>Lançar datas da NF</Button>
      <Button size="sm" disabled={!lista.length} title={vazioTitulo} onClick={() => abrir('mensagem')}>Preparar mensagem ao órgão</Button>
      {modo === 'datas' ? (
        <Dialog open onOpenChange={(v) => !v && setModo('')}>
          <DialogContent>
            <DialogHeader><DialogTitle>Lançar datas da NF</DialogTitle><DialogDescription>Escolha a nota fiscal do órgão.</DialogDescription></DialogHeader>
            <DialogBody><EscolherNf lista={lista} valor={nfId} onChange={setNfId} /></DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setModo('')}>Cancelar</Button>
              <Button variant="primary" disabled={!nfId} onClick={() => { setDatas(Number(nfId)); setModo(''); }}>Abrir o trilho</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      {datas ? <NfDatasDialog nfId={datas} onFechar={() => setDatas(0)} onSalvo={() => { setDatas(0); o.depois('Datas da NF salvas.'); }} /> : null}
      {modo === 'mensagem' ? <DialogoMensagem lista={lista} nfId={nfId} setNfId={setNfId} onFechar={() => setModo('')} /> : null}
    </>
  );
}

/** A mensagem que cabe à NF agora (ccPubMensagemPreparar sem passo), para copiar ou enviar pela régua. */
function DialogoMensagem({ lista, nfId, setNfId, onFechar }: { lista: Linha[]; nfId: string; setNfId: (v: string) => void; onFechar: () => void }) {
  const previa = useDados(() => (nfId ? acao('ccPubMensagemPreparar', { nfId: Number(nfId), passo: '' }) : Promise.resolve(null)), `msg-livre:${nfId}`);
  const pv = previa.dados as Linha | null | undefined;
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogoLargo>
        <DialogHeader>
          <DialogTitle>Preparar mensagem ao órgão</DialogTitle>
          <DialogDescription>O modelo que cabe à situação da nota, preenchido. O envio com registro é pelo "Enviar" da régua.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            <EscolherNf lista={lista} valor={nfId} onChange={setNfId} />
            {pv?.ok === false ? <Alert tone="error">{String(pv.error)}</Alert> : null}
            {previa.carregando ? <RowMeta>Preparando a mensagem…</RowMeta> : null}
            {pv && pv.ok !== false ? (
              <>
                <RowMeta>Modelo {String(pv.codigo)}{pv.para ? ` · para ${pv.para}` : ''}{pv.validado ? '' : ' · ainda não validado pelo Jurídico'}</RowMeta>
                <Previa>{`${pv.assunto}\n\n${pv.corpo}`}</Previa>
              </>
            ) : null}
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Fechar</Button>
          <Button variant="primary" disabled={!pv || pv.ok === false}
            onClick={() => void navigator.clipboard?.writeText(`${pv?.assunto}\n\n${pv?.corpo}`)}>Copiar texto</Button>
        </DialogFooter>
      </DialogoLargo>
    </Dialog>
  );
}
