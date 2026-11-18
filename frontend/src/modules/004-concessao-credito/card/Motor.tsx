// Motor no card, opção C: dados da análise à esquerda (gravam ao sair do campo; o servidor recalcula e
// fotografa o motor) e o resultado à direita, com Aplicar limite sugerido, Ajustar rating e Recalcular.

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import {
  Alert, Badge, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Field, Grade, Input, LabelledField, Panel, PanelHeader, Pilha, RowMeta, SelectMenu, Textarea,
  Toolbar,
} from '@/components/page';
import { fmtIndice } from '@/lib/concessao-credito/regras';
import { fmtDataHora } from '@/lib/formato';
import { executar, invalidarFicha, n, pct, ROTULO_FONTE, type Linha } from '../dados';
import { Pares, Rating, Reais, Txt } from '../pecas';
import { useRascunho } from './rascunho';

const FONTES = Object.entries(ROTULO_FONTE).map(([value, label]) => ({ value, label }));
const SIM_NAO = [{ value: '0', label: 'Não' }, { value: '1', label: 'Sim' }];
const RATINGS = ['AA', 'A', 'B', 'C', 'D', 'E'].map((r) => ({ value: r, label: r }));

export default function Motor({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const s = ficha.solicitacao as Linha;
  const pode = ficha.pode as Linha;
  const m = (ficha.motor ?? {}) as Linha;
  const det = (m.detalhes ?? {}) as Linha;
  const e = (ficha.entradas ?? {}) as Linha;
  const alcada = (ficha.alcada ?? {}) as Linha;
  const r = useRascunho(ctx, s, {
    scoreSerasa: 'SCORE_SERASA', fatMensal: 'FAT_MENSAL', finPl: 'FIN_PL', finAc: 'FIN_AC', finPc: 'FIN_PC', finDivida: 'FIN_DIVIDA', finEbitda: 'FIN_EBITDA',
    garantia: 'GARANTIA', fpTipo: 'FP_TIPO', fpNome: 'FP_NOME', fpPrazoDias: 'FP_PRAZO_DIAS',
    flagNegativacao: 'FLAG_NEGATIVACAO', flagDados: 'FLAG_DADOS', flagPedido: 'FLAG_PEDIDO', limiteProposto: 'LIMITE_PROPOSTO', parecer: 'PARECER_ANALISTA',
  });
  const [aviso, setAviso] = useState('');
  const [ajuste, setAjuste] = useState(false);
  const bloqueado = !pode.salvar || ctx.travado;
  const texto = (k: string, rotulo: string, extra: { tipo?: string; hint?: string; size?: number } = {}) => (
    <LabelledField label={rotulo} hint={extra.hint}>
      <Input type={extra.tipo ?? 'number'} size={extra.size} value={r.valores[k]} disabled={bloqueado}
        onChange={(ev) => r.mudar(k)(ev.target.value)} onBlur={() => r.salvar(k)} />
    </LabelledField>
  );
  const flag = (k: string, rotulo: string) => (
    <Field label={rotulo}>
      <SelectMenu label={rotulo} value={r.valores[k] === 'true' || r.valores[k] === '1' ? '1' : '0'} disabled={bloqueado} onChange={r.escolher(k)} options={SIM_NAO} />
    </Field>
  );

  const recalcular = async () => {
    const x = await executar('ccCredMotorCalcular', { solicitacaoId: s.ID, gravar: 1, entradas: '{}' });
    setAviso(x ?? '');
    if (!x) {
      invalidarFicha(ctx.card.id);
      await ctx.recarregar();
    }
  };
  const aplicarSugerido = () => r.escolher('limiteProposto')(String(n(m.limiteSugerido)));
  const decidirAjuste = async (aprovar: boolean) => {
    const x = await executar('ccCredRatingAjusteDecidir', { solicitacaoId: s.ID, aprovar: aprovar ? 1 : 0, texto: '' });
    setAviso(x ?? '');
    if (!x) {
      invalidarFicha(ctx.card.id);
      await ctx.recarregar();
    }
  };
  const docs = (det.docs ?? []) as Linha[];
  const conc = (det.concentracao ?? {}) as Linha;
  const limite = (det.limite ?? {}) as Linha;
  const ind = (det.indices ?? {}) as Linha;

  return (
    <>
      {r.erro || aviso ? <Alert tone="error">{r.erro || aviso}</Alert> : null}
      {s.AJUSTE_SITUACAO === 'PENDENTE' ? (
        <Alert tone="warn">
          Ajuste de rating {s.RATING_MOTOR} → {s.RATING_AJUSTE} aguardando aprovação de um superior de quem ajustou: {s.AJUSTE_JUSTIFICATIVA}. Enquanto isso a solicitação não vai ao Comitê.
        </Alert>
      ) : null}
      <Grade>
        <Panel>
          <PanelHeader title="Dados da análise" hint={bloqueado ? 'Só o analista do caso ou o superior altera.' : 'Grava ao sair do campo; o motor é recalculado no servidor.'} />
          <Toolbar>
            {texto('scoreSerasa', 'Score Serasa (0 a 1000)', { size: 8 })}
            {texto('fatMensal', 'Faturamento mensal (R$)')}
            {texto('finPl', 'Patrimônio líquido (R$)')}
          </Toolbar>
          <Toolbar>
            {texto('finAc', 'Ativo circulante (R$)')}
            {texto('finPc', 'Passivo circulante (R$)')}
            {texto('finDivida', 'Dívida bancária (R$)')}
            {texto('finEbitda', 'EBITDA anual (R$)')}
          </Toolbar>
          <Toolbar>
            <Field label="Fonte pagadora">
              <SelectMenu label="Fonte pagadora" value={r.valores.fpTipo} disabled={bloqueado} onChange={r.escolher('fpTipo')} options={FONTES} />
            </Field>
            {texto('fpNome', 'Quem paga', { tipo: 'text' })}
            {texto('fpPrazoDias', 'Prazo de recebimento (dias)', { size: 6 })}
            {texto('garantia', 'Garantia', { tipo: 'text', hint: 'Vazio = sem garantia' })}
          </Toolbar>
          <Toolbar>
            {flag('flagNegativacao', 'Negativação')}
            {flag('flagDados', 'Dados inconsistentes')}
            {flag('flagPedido', 'Pedido fora da realidade')}
          </Toolbar>
          <Pares itens={[
            ['Pontualidade (Winthor)', <Txt v={pct(e.pontualidade)} />],
            ['Dias de atraso (Winthor)', <Txt v={n(e.diasAtraso) ? `${e.diasAtraso} dias` : ''} />],
            ['Compra média mensal', <Reais v={e.compraMedia} />],
            ['Prazo médio', <Txt v={n(e.prazoMedio) ? `${e.prazoMedio} dias` : ''} />],
            ['Liquidez corrente', <Txt v={fmtIndice(ind.lc)} />],
            ['Dívida / EBITDA', <Txt v={fmtIndice(ind.divEbitda, 'multiplo')} />],
          ]} />
        </Panel>
        <Panel>
          <PanelHeader title="Resultado do motor" hint={s.MOTOR_EM ? `Fotografado em ${fmtDataHora(String(s.MOTOR_EM))}` : 'Ainda não calculado'}>
            <Badge tone={det.rebaixado ? 'attention' : 'neutral'}>Rating {m.rating || '—'}{det.rebaixado ? ' · rebaixado' : ''}</Badge>
          </PanelHeader>
          <Pares itens={[
            ['Resultado', <Txt v={m.resultado} />],
            ['Score final', <Txt v={m.score ?? ''} />],
            ['Faixa pelo score · pelo atraso', <Txt v={[det.faixaScore, det.faixaAtraso].filter(Boolean).join(' · ')} />],
            ['Alertas que rebaixam', <Txt v={((m.alertas ?? []) as string[]).join(' · ')} />],
            ['Rating efetivo', <Rating r={ficha.ratingEfetivo} extra={s.AJUSTE_SITUACAO === 'APROVADO' ? ' · ajustado' : ''} />],
            ['Limite sugerido', <><Reais v={m.limiteSugerido} />{limite.como ? <RowMeta>{limite.como}</RowMeta> : null}</>],
            ['Concentração', conc.teto ? `Teto ${new Intl.NumberFormat('pt-BR').format(n(conc.teto))} · ${conc.reduzido ? 'reduz o limite' : 'não reduz'}` : <Txt v="" />],
            ['Alçada pelo valor', <Txt v={alcada.rotulo} />],
            ['Documentos', `${docs.filter((d) => d.atendido).length} de ${docs.length}`],
          ]} />
          {((det.avisos ?? []) as string[]).length ? <Toolbar><RowMeta>Avisos (não rebaixam): {(det.avisos as string[]).join(' · ')}</RowMeta></Toolbar> : null}
          <Toolbar>
            {texto('limiteProposto', 'Limite proposto (R$)')}
            <LabelledField label="Parecer do analista">
              <Textarea cols={40} rows={3} value={r.valores.parecer} disabled={bloqueado} onChange={(ev) => r.mudar('parecer')(ev.target.value)} onBlur={() => r.salvar('parecer')} />
            </LabelledField>
          </Toolbar>
          <Toolbar>
            <Button variant="primary" onClick={aplicarSugerido} disabled={bloqueado || !n(m.limiteSugerido)}
              title={n(m.limiteSugerido) ? 'Copia o limite sugerido para o limite proposto.' : 'Sem limite sugerido.'}>Aplicar limite sugerido</Button>
            <Button onClick={() => setAjuste(true)} disabled={!pode.ajustar || !s.RATING_MOTOR || ctx.travado}
              title={pode.ajustar ? 'Exige justificativa e aprovação de um superior.' : 'Só o analista do caso ou o superior ajusta, com o motor calculado.'}>Ajustar rating</Button>
            <Button variant="ghost" onClick={recalcular} disabled={bloqueado}>Recalcular</Button>
            {s.AJUSTE_SITUACAO === 'PENDENTE' ? (
              <>
                <Button onClick={() => decidirAjuste(true)} disabled={!pode.decidirAjuste} title={pode.decidirAjuste ? undefined : 'Só um superior de quem ajustou aprova.'}>Aprovar ajuste</Button>
                <Button variant="danger" onClick={() => decidirAjuste(false)} disabled={!pode.decidirAjuste}>Recusar ajuste</Button>
              </>
            ) : null}
          </Toolbar>
        </Panel>
      </Grade>
      {ajuste ? <AjustarRating ctx={ctx} solicitacaoId={Number(s.ID)} atual={String(s.RATING_MOTOR)} onFechar={() => setAjuste(false)} /> : null}
    </>
  );
}

function AjustarRating({ ctx, solicitacaoId, atual, onFechar }: { ctx: ExtensaoContexto; solicitacaoId: number; atual: string; onFechar: () => void }) {
  const [rating, setRating] = useState(atual);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const gravar = async () => {
    const e = await executar('ccCredRatingAjustar', { solicitacaoId, rating, justificativa: justificativa.trim() });
    if (e) return setErro(e);
    invalidarFicha(ctx.card.id);
    onFechar();
    await ctx.recarregar();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar rating</DialogTitle>
          <DialogDescription>O ajuste fica pendente até um superior aprovar; enquanto isso a solicitação não sai da Análise de crédito.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <Field label="Rating ajustado" hint={`Motor: ${atual}`}>
              <SelectMenu label="Rating" value={rating} onChange={setRating} options={RATINGS} />
            </Field>
            <LabelledField label="Justificativa" obrigatorio>
              <Textarea rows={3} value={justificativa} onChange={(ev) => setJustificativa(ev.target.value)} />
            </LabelledField>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={gravar} disabled={!justificativa.trim() || rating === atual}>Propor ajuste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
