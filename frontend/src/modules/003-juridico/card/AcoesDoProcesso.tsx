// Ações do card do processo (T-213, plan §telas): na coluna de "Mover para". Sem permissão o botão desabilita com o
// motivo no `title` (`pode` da ficha; quem decide é a guarda do servidor). Acordo registrado leva o card a "09 · Acordo
// judicial" pelo `ctx.mover()` (a SF não move, plan §ccJurAcordoCriar).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  GradeCampos, Input, LabelledField, Nota, SelectMenu, Textarea,
} from '@/components/page';
import { brl, erroDe, FASES, hojeLocal, MOTIVOS, useGravar, useLimiares, type Linha } from '../comum';
import { recarregarFicha, useFicha } from '../ficha';
import { CustoDialog } from './CustoDialog';

type Dialogo = '' | 'andamento' | 'custo' | 'acordo' | 'encerrar' | 'aprovar';
const SO_JURIDICO = 'Sem permissão: só o Jurídico ou quem administra.';
const OPCOES_MOTIVO = Object.entries(MOTIVOS).map(([value, label]) => ({ value, label }));
const valorDe = (t: string) => Number(String(t).replace(/\./g, '').replace(',', '.')) || 0;

export function AcoesDoProcesso(ctx: ExtensaoContexto) {
  const navigate = useNavigate();
  const { ficha } = useFicha(ctx.card.id);
  const lim = useLimiares();
  const { gravar, gravando, erro, limpar } = useGravar();
  const [dialogo, setDialogo] = useState<Dialogo>('');
  const [and, setAnd] = useState({ em: '', texto: '', prazo: '', prazoDescricao: '' });
  const [ac, setAc] = useState({ valor: '', entrada: '', nParcelas: '1', primeiroVencimento: '', honorarios: '' });
  const [enc, setEnc] = useState({ motivo: 'QUITADO', motivoTexto: '' });
  if (!ficha) return null;

  const { processo: pr, pode, acordo } = ficha;
  const encerrado = !!pr.ENCERRADO_EM;
  const emMontagem = pr.ORIGEM === 'COBRANCA' && !pr.DOSSIE_ENVIADO_EM;
  const travado = ctx.travado || gravando;
  const abrir = (d: Dialogo) => { limpar(); setDialogo(d); };
  const botao = (rotulo: string, ok: boolean, onClick: () => void, motivo = SO_JURIDICO) => (
    <Button key={rotulo} size="sm" disabled={!ok || travado} title={ok ? undefined : motivo} onClick={onClick}>{rotulo}</Button>
  );
  const docs = (tipo: string) => navigate(`/juridico/documentos/${tipo}?clienteId=${pr.CLIENTE_ID ?? 0}&carteira=${pr.CARTEIRA}&processoId=${pr.ID}`);

  async function depois(texto: string) {
    setDialogo('');
    ctx.avisar('success', texto);
    await recarregarFicha(ctx.card.id);
    await ctx.recarregar();
  }

  async function registrarAndamento() {
    const r = await gravar('ccJurAndamentoRegistrar', { processoId: pr.ID, ...and });
    if (r) { setAnd({ em: '', texto: '', prazo: '', prazoDescricao: '' }); await depois('Andamento registrado.'); }
  }

  async function registrarAcordo() {
    const r = await gravar('ccJurAcordoCriar', {
      processoId: pr.ID, valor: valorDe(ac.valor), entrada: valorDe(ac.entrada), nParcelas: Number(ac.nParcelas) || 0,
      primeiroVencimento: ac.primeiroVencimento, honorarios: valorDe(ac.honorarios),
    });
    if (!r) return;
    const texto = r.situacao === 'AGUARDANDO'
      ? `Acordo registrado, aguardando aprovação (${(r.politica?.motivos ?? []).join(', ') || 'fora da política'}).` : 'Acordo registrado em andamento.';
    const faseAcordo = ctx.estrutura.fases.find((f) => f.nome === FASES.find((x) => x.chave === 'acordo')!.nome);
    if (faseAcordo && faseAcordo.id !== ctx.card.faseId) {
      try { await ctx.mover(faseAcordo.id); } catch (e) { ctx.avisar('error', `Acordo gravado; o card não foi movido: ${erroDe(e)}`); }
    }
    await depois(texto);
  }

  async function encerrar() {
    const r = await gravar('ccJurProcessoEncerrar', { processoId: pr.ID, ...enc });
    if (r) await depois(r.aviso ? `Processo encerrado. ${r.aviso}` : 'Processo encerrado.');
  }

  async function enviarDossie() {
    const r = await gravar('ccJurDossieEnviar', { processoId: pr.ID, obs: '' });
    if (r) await depois('Dossiê enviado ao Jurídico.');
  }

  return (
    <>
      {emMontagem && !encerrado ? botao('Enviar dossiê', pode.enviar, enviarDossie, 'Sem alçada para enviar o dossiê.') : null}
      {botao('Registrar andamento', pode.lancar && !encerrado, () => abrir('andamento'), encerrado ? 'Processo encerrado.' : SO_JURIDICO)}
      {botao('Lançar custo', pode.lancar, () => abrir('custo'))}
      {acordo?.SITUACAO === 'AGUARDANDO'
        ? botao('Aprovar acordo', pode.aprovarAcordo, () => abrir('aprovar'), 'Sem alçada, ou foi você quem registrou o acordo.')
        : botao('Registrar acordo', pode.registrarAcordo && !encerrado && acordo?.SITUACAO !== 'ANDAMENTO', () => abrir('acordo'),
          acordo?.SITUACAO === 'ANDAMENTO' ? 'O processo já tem acordo em andamento.' : encerrado ? 'Processo encerrado.' : SO_JURIDICO)}
      {botao('Gerar notificação', pode.emitirNotificacao && !!pr.CLIENTE_ID, () => docs('notificacao'),
        pr.CLIENTE_ID ? 'Sem permissão para emitir notificação.' : 'Vincule o cliente ao processo antes.')}
      {botao('Gerar demonstrativo', !!pr.CLIENTE_ID, () => docs('demonstrativo'), 'Vincule o cliente ao processo antes.')}
      {botao('Encerrar processo', pode.encerrar && !encerrado, () => abrir('encerrar'), encerrado ? 'Processo já encerrado.' : SO_JURIDICO)}
      {erro && !dialogo ? <Alert tone="error">{erro}</Alert> : null}

      <Dialog open={dialogo === 'andamento'} onOpenChange={(v) => !v && setDialogo('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar andamento</DialogTitle>
            <DialogDescription>{pr.NOME_DEVEDOR}{pr.AUTOS ? ` · autos ${pr.AUTOS}` : ''}. O andamento vira a situação atual do processo.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <LabelledField label="Data" hint="Vazio: hoje. Não pode ser futura.">
              <Input type="date" value={and.em} max={hojeLocal()} onChange={(e) => setAnd({ ...and, em: e.target.value })} />
            </LabelledField>
            <LabelledField label="Andamento" obrigatorio>
              <Textarea value={and.texto} rows={3} onChange={(e) => setAnd({ ...and, texto: e.target.value })} />
            </LabelledField>
            <GradeCampos>
              <LabelledField label="Novo prazo (opcional)">
                <Input type="date" value={and.prazo} onChange={(e) => setAnd({ ...and, prazo: e.target.value })} />
              </LabelledField>
              <LabelledField label="O que vence no prazo">
                <Input value={and.prazoDescricao} disabled={!and.prazo} onChange={(e) => setAnd({ ...and, prazoDescricao: e.target.value })} />
              </LabelledField>
            </GradeCampos>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogo('')}>Cancelar</Button>
            <Button variant="primary" disabled={gravando} onClick={registrarAndamento}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustoDialog aberto={dialogo === 'custo'} processoId={pr.ID} cardId={pr.CARD_ID} onFechar={() => setDialogo('')} onFeito={depois} />

      <Dialog open={dialogo === 'acordo'} onOpenChange={(v) => !v && setDialogo('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar acordo judicial</DialogTitle>
            <DialogDescription>
              {`Política: entrada de ${lim.entradaMin}% ou mais, até ${lim.parcelasMax} parcelas e até ${brl(lim.alcada)}. Fora dela, o acordo nasce aguardando aprovação.`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <GradeCampos>
              <LabelledField label="Valor do acordo (R$)" obrigatorio>
                <Input inputMode="decimal" value={ac.valor} onChange={(e) => setAc({ ...ac, valor: e.target.value })} />
              </LabelledField>
              <LabelledField label="Entrada (R$)">
                <Input inputMode="decimal" value={ac.entrada} onChange={(e) => setAc({ ...ac, entrada: e.target.value })} />
              </LabelledField>
              <LabelledField label="Parcelas" obrigatorio hint="Além da entrada.">
                <Input type="number" min={0} max={60} value={ac.nParcelas} onChange={(e) => setAc({ ...ac, nParcelas: e.target.value })} />
              </LabelledField>
              <LabelledField label="Vencimento da entrada" hint="Vazio: hoje. Até 31 dias a partir de hoje.">
                <Input type="date" value={ac.primeiroVencimento} onChange={(e) => setAc({ ...ac, primeiroVencimento: e.target.value })} />
              </LabelledField>
              <LabelledField label="Honorários (R$)" hint={`Vazio: ${lim.honorarios}% do valor.`}>
                <Input inputMode="decimal" value={ac.honorarios} onChange={(e) => setAc({ ...ac, honorarios: e.target.value })} />
              </LabelledField>
            </GradeCampos>
            <Nota>Parcelas iguais (a sobra vai na última), uma por mês a partir do vencimento da entrada.</Nota>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogo('')}>Cancelar</Button>
            <Button variant="primary" disabled={gravando} onClick={registrarAcordo}>Registrar acordo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === 'encerrar'} onOpenChange={(v) => !v && setDialogo('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar processo</DialogTitle>
            <DialogDescription>O card vai para Encerrado e não volta. "Acordo cumprido" exige o acordo quitado; "Outro" exige o motivo escrito.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <LabelledField label="Motivo" obrigatorio>
              <SelectMenu label="Motivo" value={enc.motivo} options={OPCOES_MOTIVO} onChange={(motivo) => setEnc({ ...enc, motivo })} />
            </LabelledField>
            <LabelledField label="Detalhe" obrigatorio={enc.motivo === 'OUTRO'}>
              <Textarea value={enc.motivoTexto} rows={2} onChange={(e) => setEnc({ ...enc, motivoTexto: e.target.value })} />
            </LabelledField>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogo('')}>Cancelar</Button>
            <Button variant="danger" disabled={gravando} onClick={encerrar}>Encerrar processo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {acordo ? (
        <AprovarAcordoDialog aberto={dialogo === 'aprovar'} acordo={acordo} onFechar={() => setDialogo('')}
          onFeito={(aprovado) => depois(aprovado ? 'Acordo aprovado.' : 'Acordo recusado.')} />
      ) : null}
    </>
  );
}

/** Aprovar ou recusar um acordo aguardando (RF-025): recusa exige o motivo. Usado no card e na aba Acordos. */
export function AprovarAcordoDialog({ aberto, acordo, onFechar, onFeito }: {
  aberto: boolean; acordo: Linha; onFechar: () => void; onFeito: (aprovado: boolean) => Promise<void> | void;
}) {
  const { gravar, gravando, erro, limpar } = useGravar();
  const [texto, setTexto] = useState('');
  async function decidir(aprovar: boolean) {
    const r = await gravar('ccJurAcordoAprovar', { acordoId: Number(acordo.ID), aprovar: aprovar ? 1 : 0, texto });
    if (r) { setTexto(''); await onFeito(aprovar); }
  }
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) { limpar(); onFechar(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar acordo judicial</DialogTitle>
          <DialogDescription>
            {`${brl(acordo.VALOR)} · entrada ${brl(acordo.ENTRADA)} + ${acordo.N_PARCELAS} parcela(s)${acordo.REGISTRADO_POR_NOME ? ` · registrado por ${acordo.REGISTRADO_POR_NOME}` : ''}.`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <LabelledField label="Motivo (obrigatório para recusar)">
            <Textarea value={texto} rows={2} onChange={(e) => setTexto(e.target.value)} />
          </LabelledField>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="danger" disabled={gravando || !texto.trim()} title={texto.trim() ? undefined : 'Escreva o motivo da recusa.'} onClick={() => decidir(false)}>Recusar</Button>
          <Button variant="primary" disabled={gravando} onClick={() => decidir(true)}>Aprovar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
