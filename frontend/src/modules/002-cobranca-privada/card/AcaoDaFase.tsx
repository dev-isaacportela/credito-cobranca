// Bloco "Ação da fase" dentro de "Nesta fase" (opção A "Tudo em Nesta fase", T-064): o que a etapa pede, o prazo, a
// ação da régua, os valores, a promessa, o acordo, a baixa, o e-mail da etapa e o registro rápido de contato.
// Lê a ficha do card (a mesma do quadro); cada botão é uma JS-E e, gravado, relê a ficha e o card.

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { acao } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import {
  Alert, Button, Card, Dash, Field, GradeCampos, GradeKpi, Input, Kpi, LabelledField, PanelHeader, SelectMenu,
  Status, Table, Td, Textarea, Th, Tr,
} from '@/components/page';
import { brl, CANAIS, erroDe, num, opcoes, RETORNOS, type Linha } from '../comum';
import { recarregarFicha, useFicha } from '../ficha';
import { retornosDa } from '@/lib/cobranca-privada/listas';

const SITUACAO_ACORDO: Record<string, string> = { PROPOSTO: 'aguardando a alçada', ATIVO: 'ativo', QUITADO: 'quitado', QUEBRADO: 'quebrado',
  CANCELADO: 'cancelado', RECUSADO: 'recusado' };

export function AcaoDaFase(ctx: ExtensaoContexto) {
  const { ficha, erro } = useFicha(ctx.card.id);
  const [gravando, setGravando] = useState(false);
  const [contato, setContato] = useState({ canal: 'Telefone', retorno: '', feedback: '', proxAcaoData: '' });
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  if (erro) return <Alert tone="error">{erro}</Alert>;
  if (!ficha) return <Alert tone="info">Carregando a situação do caso…</Alert>;

  const { caso, pode, posicao } = ficha;
  const travado = ctx.travado || gravando;

  async function gravar(nome: Parameters<typeof acao>[0], input: Record<string, unknown>, ok: string) {
    setGravando(true);
    try {
      const r = await acao(nome, input);
      if (r.ok === false) return ctx.avisar('error', String(r.error ?? 'Não foi possível gravar.'));
      ctx.avisar('success', r.aviso ? `${ok} ${r.aviso}` : ok);
      await recarregarFicha(ctx.card.id);
      await ctx.recarregar();
      return true;
    } catch (e) {
      ctx.avisar('error', erroDe(e));
    } finally {
      setGravando(false);
    }
  }

  const promessa = ficha.promessas.find((p: Linha) => p.SITUACAO === 'ABERTA');
  const acordo = ficha.acordo;
  const pagas = ficha.parcelas.filter((p: Linha) => p.PAGO_EM).length;
  const baixa = ficha.baixa?.SITUACAO === 'PENDENTE' ? ficha.baixa : null;
  const naFila = ficha.fila.find((f: Linha) => f.FASE_CHAVE === caso.faseChave && f.SITUACAO === 'PENDENTE');
  const temAcao = ficha.acoes.some((a) => a.define);
  const bus = ficha.porBu.map((b: Linha) => `${b.BU_NOME} ${brl(b.VENCIDO > 0 ? b.VENCIDO : b.A_VENCER)}`).join(' · ');

  const prazo = caso.acaoPrazo ? `prazo da ação ${String(caso.acaoPrazo).length > 10 ? fmtDataHora(caso.acaoPrazo) : fmtData(caso.acaoPrazo)}` : '';
  const proxima = caso.proximaFase ? `entra em "${caso.proximaFase.nome}" em ${fmtData(caso.proximaFase.em)} se o saldo continuar vencido` : '';

  return (
    <Card>
      <PanelHeader title={`Ação da fase · ${caso.faseNome}`} hint={[caso.faseDesde ? `na fase desde ${fmtDataHora(caso.faseDesde)}` : '', prazo, proxima].filter(Boolean).join(' · ') || undefined}>
        {temAcao ? (
          caso.acaoFeita
            ? <Status tone="live">Ação feita</Status>
            : <Button variant="primary" size="sm" disabled={!pode.registrarAcao || travado} title={pode.registrarAcao ? undefined : 'Só quem opera o caso registra a ação.'}
                onClick={() => gravar('ccCobAcaoRegistrar', { cobrancaId: caso.id, itens: '' }, 'Ação da fase registrada.')}>Marcar ação como feita</Button>
        ) : null}
      </PanelHeader>

      {caso.negociacaoVencida ? <Alert tone="warn">A negociação passou do prazo da etapa: feche o acordo ou devolva o card à régua.</Alert> : null}
      {caso.juridicoAtrasado ? <Alert tone="error">Jurídico atrasado: o caso passou do prazo máximo sem o dossiê enviado.</Alert>
        : caso.prontoJuridico ? <Alert tone="warn">Pronto para o Jurídico: monte o dossiê pelo botão do card.</Alert> : null}

      {ficha.acoes.length ? (
        <Table>
          <thead><tr><Th>O que a etapa pede</Th><Th>Situação</Th></tr></thead>
          <tbody>
            {ficha.acoes.map((a) => (
              <Tr key={a.n}>
                <Td>{a.n}. {a.texto}{a.define ? ' · define a ação' : ''}{a.email ? ' · o e-mail marca' : ''}</Td>
                <Td><Status tone={a.marcado ? 'live' : 'off'}>{a.marcado ? 'Feito' : 'A fazer'}</Status></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      <GradeKpi>
        <Kpi rotulo="Vencido" valor={num(posicao.VENCIDO) > 0 ? brl(posicao.VENCIDO) : <Dash />}
          hint={num(posicao.VENCIDO) > 0 ? `${num(posicao.DIAS_ATRASO)} dias de atraso` : undefined} />
        <Kpi rotulo="A vencer" valor={num(posicao.A_VENCER) > 0 ? brl(posicao.A_VENCER) : <Dash />}
          hint={posicao.PROX_VENC ? `próximo em ${fmtData(posicao.PROX_VENC)} · ${brl(posicao.PROX_VENC_VALOR)}` : undefined} />
        <Kpi rotulo="Próxima ação" valor={caso.proxAcaoData ? fmtData(caso.proxAcaoData) : <Dash />} hint={caso.proxAcao || undefined} />
        <Kpi rotulo="Composição por BU" valor={ficha.porBu.length ? `${ficha.porBu.length} ${ficha.porBu.length === 1 ? 'BU' : 'BUs'}` : <Dash />} hint={bus || undefined} />
      </GradeKpi>

      {promessa ? (
        <Alert tone="info">Promessa aberta: {brl(promessa.VALOR)} para {fmtData(promessa.DATA_PROMETIDA)}, registrada em {fmtData(promessa.DATA_CONTATO)}.</Alert>
      ) : null}
      {acordo && ['PROPOSTO', 'ATIVO'].includes(acordo.SITUACAO) ? (
        <Alert tone={acordo.SITUACAO === 'ATIVO' ? 'success' : 'warn'}>
          Acordo de {brl(acordo.VALOR)} {SITUACAO_ACORDO[acordo.SITUACAO]}: {pagas} de {ficha.parcelas.length} parcelas pagas.
        </Alert>
      ) : null}
      {baixa ? (
        <Alert tone="warn">Baixa de {brl(baixa.VALOR)} pendente: {baixa.PARECER_EM ? 'parecer registrado, aguardando a decisão' : 'aguardando o parecer do Jurídico'}.</Alert>
      ) : null}
      {caso.anuenciaAte && !caso.anuenciaEm && caso.protestado ? (
        <Alert tone="warn">Carta de anuência até {fmtData(caso.anuenciaAte)}.</Alert>
      ) : null}

      {(pode.enviarEmail && !caso.acaoFeita) || naFila ? (
          <PanelHeader title="E-mail da etapa" hint={confirmarEmail ? 'A mensagem da etapa vai agora para o e-mail do cliente na ficha; o envio não se desfaz.'
            : naFila ? 'A mensagem desta etapa está na fila de e-mails.' : 'Envio manual pelo modelo da etapa; vira contato no histórico.'}>
            {confirmarEmail ? <Button size="sm" onClick={() => setConfirmarEmail(false)}>Cancelar</Button> : null}
            <Button size="sm" variant={confirmarEmail ? 'primary' : 'secondary'} disabled={!pode.enviarEmail || travado}
              title={pode.enviarEmail ? undefined : 'Esta etapa exige aprovação: use a fila de e-mails.'}
              onClick={() => {
                if (!confirmarEmail) return setConfirmarEmail(true);
                setConfirmarEmail(false);
                void gravar('ccCobEmailEnviar', { cobrancaId: caso.id, contatoId: 0, dataLimite: '' }, 'E-mail enviado.');
              }}>{confirmarEmail ? 'Confirmar envio ao cliente' : 'Enviar e-mail'}</Button>
          </PanelHeader>
      ) : null}

      <PanelHeader title="Registro rápido de contato" hint="Promessa, valor e com quem falou ficam no registro completo (botão Registrar contato)." />
      <GradeCampos>
        <Field label="Canal"><SelectMenu label="Canal" value={contato.canal} options={opcoes(CANAIS)} onChange={(canal) => setContato({ ...contato, canal })} /></Field>
        <Field label="Retorno" obrigatorio><SelectMenu label="Retorno" value={contato.retorno} options={opcoes(retornosDa(caso.carteira, RETORNOS))} placeholder="Como foi o contato"
          onChange={(retorno) => setContato({ ...contato, retorno })} /></Field>
        <LabelledField label="Feedback" obrigatorio>
          <Textarea value={contato.feedback} onChange={(e) => setContato({ ...contato, feedback: e.target.value })} />
        </LabelledField>
        <LabelledField label="Nova tentativa em" hint="Vira a próxima ação; dia não útil vai para o próximo útil.">
          <Input type="date" value={contato.proxAcaoData} onChange={(e) => setContato({ ...contato, proxAcaoData: e.target.value })} />
        </LabelledField>
      </GradeCampos>
      <Button size="sm" disabled={!pode.registrarContato || travado || !contato.retorno || !contato.feedback.trim()}
        title={pode.registrarContato ? undefined : 'Só quem opera o caso registra contato.'}
        onClick={async () => {
          const ok = await gravar('ccCobContatoRegistrar', {
            clienteId: ficha.cliente.id, carteira: caso.carteira, cobrancaId: caso.id, nfId: 0, data: '', canal: contato.canal, falouCom: '',
            retorno: contato.retorno, previsao: '', valor: 0, feedback: contato.feedback.trim(),
            proxAcao: contato.proxAcaoData ? 'Nova tentativa de contato' : '', proxAcaoData: contato.proxAcaoData, origem: 'MANUAL', emailEnviadoId: 0, membroId: 0,
          }, 'Contato registrado.');
          if (ok) setContato({ canal: contato.canal, retorno: '', feedback: '', proxAcaoData: '' });
        }}>Registrar contato</Button>
    </Card>
  );
}
