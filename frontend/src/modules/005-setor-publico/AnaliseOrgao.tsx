// Bloco do órgão no card de `concessao-publica` (T-211): em `analise` e `comite`, o motor (MotorOrgao) e a ficha do
// órgão — formulário da análise, histórico de pagamento, evidências exigidas, aviso de regra a confirmar e "Pedir
// fluxo de pagamento ao órgão" (PA-22); em `gestao`, o contrato com o alerta. Uma leitura da 005 por card aberto:
// ccPubAnaliseObter (já traz `motor`, DT-42) ou, na gestão, ccPubContratoListar. "Calcular" = ccPubMotorCalcular com
// gravar = 1 (DT-36): quem calcula vira proponente e não decide (B-01 da B3) — a tela avisa antes.
// A solicitação e o `pode` vêm da ficha que a 004 já leu para o mesmo card (mesma promessa, sem leitura a mais).

import { useState, type ReactNode } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, CorpoPainel, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogoLargo, DialogTitle, Ficha, Field, Grade, Input, ItemFicha, LabelledField,
  Linha as LinhaUi, Panel, PanelHeader, Pilha, RowMeta, SelectMenu, Status, Table, Td, Textarea, Toolbar, Tr,
} from '@/components/page';
import { evidenciasExigidas, extrasAnalise, ROTULOS, termoBusca } from '@/lib/setor-publico/formato';
import { invalidarFicha, lerAnalisePublica, useFicha } from '@/modules/004-concessao-credito/dados';
import { brl, executar, n, pct, useDados, useMembro, vazio, type Linha } from './dados';
import MotorOrgao from './MotorOrgao';
import NotasFiscaisLista from './NotasFiscaisLista';

/** conteudoDaFase de `concessao-publica`: o que a 005 soma em `analise`, `comite` e `gestao`. */
export function BlocoOrgao({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  const s = (ficha?.solicitacao ?? null) as Linha | null;
  const fase = String(s?.FASE_CHAVE ?? '');
  if (!s || s.CARTEIRA !== 'PUBLICA') return null;
  if (fase === 'analise' || fase === 'comite') return <AnaliseDoOrgao key={s.ID} ctx={ctx} ficha={ficha as Linha} />;
  if (fase === 'gestao') return <ContratoDoCredito key={s.ID} ctx={ctx} ficha={ficha as Linha} />;
  return null;
}

const opcoes = (grupo: string, vazioRotulo: string) => [{ value: '', label: vazioRotulo }, ...Object.entries(ROTULOS[grupo]).map(([value, label]) => ({ value, label }))];

type Campo = { k: string; col: string; rotulo: string; tipo: 'opcao' | 'numero' | 'texto' | 'data'; grupo?: string; hint?: string };
const CAMPOS: Campo[] = [
  { k: 'esfera', col: 'ESFERA', rotulo: 'Esfera', tipo: 'opcao', grupo: 'ESFERA' },
  { k: 'capag', col: 'CAPAG', rotulo: 'CAPAG', tipo: 'opcao', grupo: 'CAPAG' },
  { k: 'capacidade', col: 'CAPACIDADE', rotulo: 'Capacidade financeira', tipo: 'opcao', grupo: 'CAPACIDADE', hint: 'Sugerida pela CAPAG até alguém escolher à mão' },
  { k: 'pessoalPct', col: 'PESSOAL_PCT', rotulo: 'Despesa com pessoal (% da RCL)', tipo: 'numero' },
  { k: 'cauc', col: 'CAUC', rotulo: 'CAUC', tipo: 'opcao', grupo: 'CAUC' },
  { k: 'fonteTipo', col: 'FONTE_TIPO', rotulo: 'Tipo de fonte do recurso', tipo: 'opcao', grupo: 'FONTE_TIPO' },
  { k: 'fontePagadora', col: 'FONTE_PAGADORA', rotulo: 'Fonte pagadora', tipo: 'texto' },
  { k: 'perfilPag', col: 'PERFIL_PAG', rotulo: 'Perfil de pagamento', tipo: 'opcao', grupo: 'PERFIL_PAG' },
  { k: 'atrasoMedio', col: 'ATRASO_MEDIO', rotulo: 'Atraso médio (dias)', tipo: 'numero' },
  { k: 'restosAPagar', col: 'RESTOS_A_PAGAR', rotulo: 'Restos a pagar', tipo: 'texto' },
  { k: 'empenhoPrevio', col: 'EMPENHO_PREVIO', rotulo: 'Empenho prévio', tipo: 'opcao', grupo: 'SIM_NAO' },
  { k: 'contratoVigente', col: 'CONTRATO_VIGENTE', rotulo: 'Contrato ou ata vigente', tipo: 'opcao', grupo: 'SIM_NAO' },
  { k: 'base', col: 'BASE', rotulo: 'Base da análise', tipo: 'opcao', grupo: 'BASE' },
  { k: 'edital', col: 'EDITAL', rotulo: 'Edital', tipo: 'texto' },
  { k: 'valorEstimado', col: 'VALOR_ESTIMADO', rotulo: 'Valor estimado da contratação (R$)', tipo: 'numero' },
  { k: 'contrato', col: 'CONTRATO', rotulo: 'Contrato', tipo: 'texto' },
  { k: 'saldoContrato', col: 'SALDO_CONTRATO', rotulo: 'Saldo do contrato (R$)', tipo: 'numero' },
  { k: 'vigenciaFim', col: 'VIGENCIA_FIM', rotulo: 'Vigência até', tipo: 'data' },
  { k: 'prazoContratoDias', col: 'PRAZO_CONTRATO_DIAS', rotulo: 'Pagamento pelo contrato (dias corridos)', tipo: 'numero', hint: '0 = vale a regra do ente' },
];
/** Número vai como número (DT-45); campo numérico vazio = "não informado" ('' no servidor vira nulo ou 0). */
const NUMERO_OU_VAZIO = ['pessoalPct', 'atrasoMedio'];

function AnaliseDoOrgao({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const membro = useMembro();
  const s = ficha.solicitacao as Linha;
  const solicitacaoId = Number(s.ID);
  const leitura = useDados(async () => {
    // A mesma leitura da decisão do comitê (004) e do espelho de "Mover para": uma por versão do card.
    return lerAnalisePublica(ctx.card, solicitacaoId);
  }, `analise:${solicitacaoId}`);
  const [calcular, setCalcular] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [pedir, setPedir] = useState(false);

  const d = leitura.dados;
  const analise = (d?.analise ?? null) as Linha | null;
  const motor = (d?.motor ?? null) as Linha | null;
  const regra = (d?.regra ?? null) as Linha | null;
  const hist = (d?.historico ?? {}) as Linha;
  const caso = !!(ficha.pode as Linha)?.salvar && !ctx.travado;
  const proponente = String(analise?.PROPOSTA_POR ?? '').split(',').map(Number).includes(membro.membroId) || Number(s.ANALISTA_ID) === membro.membroId;
  const depois = () => { invalidarFicha(ctx.card.id); leitura.recarregar(); };

  return (
    <Pilha>
      {leitura.erro ? <Alert tone="error">{leitura.erro}</Alert> : null}
      {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
      {regra?.SITUACAO === 'A_CONFIRMAR' ? (
        <Alert tone="warn">A regra de pagamento "{regra.NOME}" que vale para este órgão está a confirmar: os prazos das notas são a referência até a validação.</Alert>
      ) : null}
      {motor && analise ? (
        <MotorOrgao motor={motor} analise={analise} calculadoEm={analise.CALCULADO_EM ? String(analise.CALCULADO_EM) : undefined} acoes={
          <Button size="sm" onClick={() => setCalcular(true)} disabled={!caso}
            title={caso ? 'Grava a fotografia que a decisão confere; quem calcula vira proponente.' : 'Só o analista do caso ou o superior calcula, antes da decisão.'}>Calcular</Button>
        } />
      ) : d ? (
        <Alert tone="info">Preencha e salve a ficha do órgão: o motor calcula a nota, o rating e a exposição na gravação.</Alert>
      ) : <RowMeta>Carregando a análise do órgão…</RowMeta>}
      {d ? <FichaOrgao key={String(analise?.ATUALIZADO_EM ?? 'nova')} solicitacaoId={solicitacaoId} analise={analise} sugestoes={(d.sugestoes ?? {}) as Linha} regra={regra}
        caso={caso} proponente={proponente} onSalvo={(t) => { setAviso({ tom: 'success', texto: t }); depois(); }} /> : null}
      {d ? (
        <Grade colunas={2}>
          <Panel>
            <PanelHeader title="Histórico de pagamento do órgão" hint="Pelas notas pagas; dias corridos." />
            <CorpoPainel>
              <Ficha>
                <ItemFicha rotulo="Notas pagas">{n(hist.pagas)}</ItemFicha>
                <ItemFicha rotulo="Pagas no prazo">{n(hist.noPrazo)}</ItemFicha>
                <ItemFicha rotulo="Liquidação média">{vazio(hist.liquidacaoMedia) ? <Dash /> : `${n(hist.liquidacaoMedia)} dias`}</ItemFicha>
                <ItemFicha rotulo="Pagamento médio">{vazio(hist.pagamentoMedio) ? <Dash /> : `${n(hist.pagamentoMedio)} dias`}</ItemFicha>
                <ItemFicha rotulo="Atraso médio">{vazio(hist.atrasoMedio) ? <Dash /> : `${n(hist.atrasoMedio)} dias`}</ItemFicha>
              </Ficha>
            </CorpoPainel>
          </Panel>
          <Panel>
            <PanelHeader title="Evidências exigidas" hint="Anexe no card da solicitação; a base da análise define a lista.">
              <Button size="sm" onClick={() => setPedir(true)} disabled={ctx.travado || membro.cargo === 'JURIDICO'}>Pedir fluxo de pagamento ao órgão</Button>
            </PanelHeader>
            <Table>
              <tbody>
                {evidenciasExigidas(analise?.BASE).map((e) => <Tr key={e}><Td>{e}</Td></Tr>)}
              </tbody>
            </Table>
          </Panel>
        </Grade>
      ) : null}
      {calcular ? (
        <DialogoCalcular solicitacaoId={solicitacaoId} jaProponente={proponente} onFechar={() => setCalcular(false)}
          onFeito={(t) => { setCalcular(false); setAviso({ tom: 'success', texto: t }); depois(); }} />
      ) : null}
      {pedir ? <DialogoPedirFluxo ficha={ficha} contrato={String(analise?.CONTRATO ?? '')} onFechar={() => setPedir(false)}
        onEnviado={(t) => { setPedir(false); setAviso({ tom: 'success', texto: t }); }} /> : null}
    </Pilha>
  );
}

function FichaOrgao({ solicitacaoId, analise, sugestoes, regra, caso, proponente, onSalvo }: {
  solicitacaoId: number; analise: Linha | null; sugestoes: Linha; regra: Linha | null; caso: boolean; proponente: boolean; onSalvo: (t: string) => void;
}) {
  const inicial = Object.fromEntries(CAMPOS.map((c) => [c.k, vazio(analise?.[c.col]) ? (c.k === 'esfera' ? String(sugestoes.esfera ?? '') : '') : String(analise?.[c.col])]));
  const [v, setV] = useState<Record<string, string>>(inicial);
  const [regraId, setRegraId] = useState(analise?.REGRA_ID ? String(analise.REGRA_ID) : '0');
  const [regras, setRegras] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const mudou = CAMPOS.some((c) => v[c.k] !== inicial[c.k]) || regraId !== (analise?.REGRA_ID ? String(analise.REGRA_ID) : '0');
  const travado = !caso || gravando;

  async function salvar() {
    setGravando(true);
    setErro('');
    const entrada: Record<string, unknown> = { solicitacaoId, regraId: Number(regraId) || 0 };
    for (const c of CAMPOS) {
      const x = v[c.k].trim();
      entrada[c.k] = c.tipo !== 'numero' ? x : x === '' ? (NUMERO_OU_VAZIO.includes(c.k) ? '' : 0) : Number(x.replace(',', '.'));
    }
    const r = await executar('ccPubAnaliseSalvar', entrada);
    setGravando(false);
    if (r.erro) return setErro(r.erro);
    const m = (r.motor ?? {}) as Linha;
    onSalvo(`Análise salva: nota ${n(m.nota)}, rating ${m.ratingPub}, exposição ${brl(m.exposicao) || 'R$ 0,00'}.`);
  }
  const campo = (c: Campo) => {
    if (c.tipo === 'opcao') {
      return (
        <Field key={c.k} label={c.rotulo} hint={c.hint}>
          <SelectMenu label={c.rotulo} value={v[c.k]} disabled={travado} onChange={(x) => setV({ ...v, [c.k]: x })}
            options={opcoes(c.grupo!, c.k === 'perfilPag' ? 'Não definido' : 'Não informado')} />
        </Field>
      );
    }
    const hint = c.k === 'atrasoMedio' ? (vazio(sugestoes.atrasoMedio) ? 'Sem notas pagas: vazio = sem histórico' : `Sugerido pelas notas pagas: ${n(sugestoes.atrasoMedio)} dias; vazio = usar o sugerido`) : c.hint;
    return (
      <LabelledField key={c.k} label={c.rotulo} hint={hint}>
        <Input type={c.tipo === 'texto' ? 'text' : c.tipo === 'data' ? 'date' : 'number'} min={c.tipo === 'numero' ? 0 : undefined} value={v[c.k]} disabled={travado}
          onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />
      </LabelledField>
    );
  };

  return (
    <Panel>
      <PanelHeader title="Ficha do órgão"
        hint={caso ? `Quem salva entra como proponente e não decide esta solicitação${proponente ? ' (você já é proponente)' : ''}. Depois da decisão, só contrato, saldo, vigência, prazo e regra mudam.` : 'Só o analista do caso ou o superior altera, antes da decisão.'}>
        <Button variant="primary" size="sm" onClick={salvar} disabled={travado || !mudou}>{gravando ? 'Salvando…' : 'Salvar análise'}</Button>
      </PanelHeader>
      <CorpoPainel>
        {erro ? <Alert tone="error">{erro}</Alert> : null}
        <Grade colunas={3}>{CAMPOS.map(campo)}</Grade>
        <LinhaUi>
          {regras ? (
            <Field label="Regra de pagamento do ente" hint="Sem escolha, vale a automática por esfera e UF.">
              <SelectMenu label="Regra" value={regraId} onChange={setRegraId} disabled={travado}
                options={[{ value: '0', label: 'Automática pela esfera e UF' }, ...regras.map((r) => ({ value: String(r.ID), label: String(r.NOME), hint: r.SITUACAO === 'VERIFICADO' ? 'verificada' : 'a confirmar' }))]} />
            </Field>
          ) : (
            <>
              <RowMeta>Regra de pagamento: {regra ? `${regra.NOME} · ${n(regra.LIQ_DIAS)} + ${n(regra.PAG_DIAS)} dias${regra.SITUACAO === 'A_CONFIRMAR' ? ' · a confirmar' : ''}` : 'automática'}</RowMeta>
              <Button size="sm" variant="ghost" disabled={travado} onClick={async () => setRegras(await linhas('ccPubRegraEnteListar', { ativo: 1 }).catch(() => []))}>Escolher a regra</Button>
            </>
          )}
        </LinhaUi>
      </CorpoPainel>
    </Panel>
  );
}

function DialogoCalcular({ solicitacaoId, jaProponente, onFechar, onFeito }: { solicitacaoId: number; jaProponente: boolean; onFechar: () => void; onFeito: (t: string) => void }) {
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const calcular = async () => {
    setGravando(true);
    const r = await executar('ccPubMotorCalcular', { solicitacaoId, gravar: 1, membroId: 0 });
    setGravando(false);
    if (r.erro) return setErro(r.erro);
    onFeito(`Motor calculado e gravado: nota ${n(r.nota)}, rating ${r.ratingPub}, exposição ${brl(r.exposicao) || 'R$ 0,00'}.`);
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calcular o motor do órgão</DialogTitle>
          <DialogDescription>Grava a fotografia (nota, rating e exposição) que a decisão confere.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <Alert tone="warn">
              {jaProponente ? 'Você já é proponente desta solicitação: ' : 'Ao calcular, você passa a ser proponente desta solicitação: '}
              quem propõe ou recalcula a nota não registra a decisão, mesmo tendo a alçada.
            </Alert>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={calcular} disabled={gravando}>{gravando ? 'Calculando…' : 'Calcular e virar proponente'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** PA-22: modelo "Análise" preenchido para o órgão; enviar = ccEmailEnviar com origem 005-analise. */
function DialogoPedirFluxo({ ficha, contrato, onFechar, onEnviado }: { ficha: Linha; contrato: string; onFechar: () => void; onEnviado: (t: string) => void }) {
  const cliente = (ficha.cliente ?? {}) as Linha;
  const extras = JSON.stringify(extrasAnalise(String(cliente.NOME ?? ''), contrato));
  const previa = useDados(() => acao('ccBaseModeloPrever', { codigo: 'PUB_ANALISE', clienteId: Number(cliente.ID), contatoId: 0, extras }), `fluxo:${cliente.ID}`);
  const pv = previa.dados as Linha | undefined;
  const [texto, setTexto] = useState<{ para: string; assunto: string; corpo: string } | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const atual = texto ?? { para: String(pv?.para ?? ''), assunto: String(pv?.assunto ?? ''), corpo: String(pv?.corpo ?? '') };
  const enviar = async () => {
    setEnviando(true);
    const r = await executar('ccEmailEnviar', {
      codigo: 'PUB_ANALISE', clienteId: Number(cliente.ID), contatoId: 0, para: atual.para.trim(), assunto: atual.assunto, corpo: atual.corpo, extras, anexos: '[]',
      origem: '005-analise', referencia: `solicitacao:${Number((ficha.solicitacao as Linha).ID)}`,
    });
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    onEnviado(`Pedido de fluxo de pagamento enviado${atual.para ? ` para ${atual.para}` : ''}.`);
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogoLargo>
        <DialogHeader>
          <DialogTitle>Pedir o fluxo de pagamento ao órgão</DialogTitle>
          <DialogDescription>Modelo "Análise" preenchido com o órgão; confira o texto antes de enviar.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {pv?.ok === false ? <Alert tone="error">{String(pv.error)}</Alert> : null}
            {previa.carregando && !pv ? <RowMeta>Preparando a mensagem…</RowMeta> : null}
            <LabelledField label="Para" hint="Vazio = contato principal do órgão com e-mail"><Input value={atual.para} onChange={(e) => setTexto({ ...atual, para: e.target.value })} /></LabelledField>
            <LabelledField label="Assunto"><Input value={atual.assunto} onChange={(e) => setTexto({ ...atual, assunto: e.target.value })} /></LabelledField>
            <LabelledField label="Mensagem"><Textarea rows={10} value={atual.corpo} onChange={(e) => setTexto({ ...atual, corpo: e.target.value })} /></LabelledField>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={enviar} disabled={enviando || !pv || pv.ok === false}>{enviando ? 'Enviando…' : 'Enviar e-mail'}</Button>
        </DialogFooter>
      </DialogoLargo>
    </Dialog>
  );
}

/* ── Gestão: o contrato do crédito com o alerta (RN-037) ──────────────────── */

const ALERTA: Record<string, string> = { VIGENCIA: 'Vigência perto do fim', SALDO: 'Saldo abaixo do mínimo', VIGENCIA_SALDO: 'Vigência perto do fim e saldo baixo' };

function ContratoDoCredito({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const membro = useMembro();
  const s = ficha.solicitacao as Linha;
  const cliente = (ficha.cliente ?? {}) as Linha;
  const leitura = useDados(async () => {
    const lista = await linhas('ccPubContratoListar', { soAlerta: 0, busca: termoBusca(String(cliente.NOME ?? '')), limite: 20, offset: 0 });
    return lista.find((l) => Number(l.CLIENTE_ID) === Number(cliente.ID)) ?? null;
  }, `contrato:${s.ID}`);
  const [editar, setEditar] = useState(false);
  const [aviso, setAviso] = useState('');
  const c = leitura.dados;
  const pode = membro.cargo !== 'JURIDICO' && !ctx.travado;
  const linha = (rotulo: string, valor: ReactNode) => <ItemFicha rotulo={rotulo}>{valor}</ItemFicha>;
  return (
    <Panel>
      <PanelHeader title="Contrato do órgão" hint="Saldo e vigência continuam editáveis depois da decisão; as notas são recalculadas na próxima rodada.">
        <Button size="sm" onClick={() => setEditar(true)} disabled={!pode || !c}
          title={pode ? undefined : 'Só o analista do caso ou o superior atualiza o contrato.'}>Atualizar contrato</Button>
      </PanelHeader>
      <CorpoPainel>
        {leitura.erro ? <Alert tone="error">{leitura.erro}</Alert> : null}
        {aviso ? <Alert tone="success">{aviso}</Alert> : null}
        {c ? (
          <>
            {c.ALERTA ? <Status tone="attention">{ALERTA[c.ALERTA] ?? c.ALERTA}</Status> : <Status tone="live">Contrato sem alerta</Status>}
            <Ficha>
              {linha('Contrato', c.CONTRATO || <Dash />)}
              {linha('Vigência até', c.VIGENCIA_FIM ? `${fmtData(c.VIGENCIA_FIM)} · ${n(c.DIAS_VIGENCIA) < 0 ? 'vencida' : `${n(c.DIAS_VIGENCIA)} dias`}` : <Dash />)}
              {linha('Saldo', `${brl(c.SALDO_CONTRATO) || 'R$ 0,00'} · ${pct(c.SALDO_PCT)} do valor`)}
              {linha('Valor da contratação', brl(c.VALOR_CONTRATACAO) || <Dash />)}
              {linha('Rating público', c.RATING_PUB || <Dash />)}
            </Ficha>
          </>
        ) : <RowMeta>{leitura.carregando ? 'Carregando o contrato…' : 'Sem contrato vigente com base "Saldo de contrato ativo" para este órgão.'}</RowMeta>}
      </CorpoPainel>
      {editar && c ? (
        <DialogoContrato solicitacaoId={Number(s.ID)} atual={c} onFechar={() => setEditar(false)}
          onSalvo={() => { setEditar(false); setAviso('Contrato atualizado.'); leitura.recarregar(); }} />
      ) : null}
    </Panel>
  );
}

function DialogoContrato({ solicitacaoId, atual, onFechar, onSalvo }: { solicitacaoId: number; atual: Linha; onFechar: () => void; onSalvo: () => void }) {
  const [f, setF] = useState({ contrato: String(atual.CONTRATO ?? ''), saldoContrato: String(atual.SALDO_CONTRATO ?? ''), vigenciaFim: String(atual.VIGENCIA_FIM ?? ''), prazoContratoDias: '' });
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const salvar = async () => {
    setGravando(true);
    const entrada: Record<string, unknown> = { solicitacaoId, contrato: f.contrato.trim(), saldoContrato: Number(f.saldoContrato.replace(',', '.')) || 0, vigenciaFim: f.vigenciaFim };
    if (f.prazoContratoDias.trim()) entrada.prazoContratoDias = Number(f.prazoContratoDias) || 0;
    const r = await executar('ccPubAnaliseSalvar', entrada);
    setGravando(false);
    if (r.erro) return setErro(r.erro);
    onSalvo();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar o contrato</DialogTitle>
          <DialogDescription>Contrato, saldo, vigência e prazo de pagamento do contrato.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <Toolbar>
              <LabelledField label="Contrato"><Input value={f.contrato} maxLength={120} onChange={(e) => setF({ ...f, contrato: e.target.value })} /></LabelledField>
              <LabelledField label="Saldo (R$)"><Input type="number" min={0} value={f.saldoContrato} onChange={(e) => setF({ ...f, saldoContrato: e.target.value })} /></LabelledField>
              <LabelledField label="Vigência até"><Input type="date" value={f.vigenciaFim} onChange={(e) => setF({ ...f, vigenciaFim: e.target.value })} /></LabelledField>
              <LabelledField label="Pagamento pelo contrato (dias corridos)" hint="Vazio = manter"><Input type="number" min={0} value={f.prazoContratoDias} onChange={(e) => setF({ ...f, prazoContratoDias: e.target.value })} /></LabelledField>
            </Toolbar>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={gravando}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Aba "Notas fiscais" do card de concessão: as NFs do órgão (RF-029). */
export function AbaNotasDaSolicitacao({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha } = useFicha('ccCredSolicitacaoFicha', ctx.card);
  const clienteId = Number(ficha?.cliente?.ID) || 0;
  return clienteId ? <NotasFiscaisLista clienteId={clienteId} /> : null;
}
