// Baixa como perda (T-069, opção B "Trilha e decisão"): a trilha de quem fez o quê à esquerda e, à direita, só o
// que a pessoa da vez precisa decidir — propor, dar o parecer (Jurídico) ou decidir na alçada (RN-012 a RN-014).

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { acao } from '@/lib/mitra-api';
import { fmtDataHora } from '@/lib/formato';
import { rotuloNivel } from '@/lib/cobranca-privada/acordo';
import {
  Alert, Button, Card, Dash, Field, Grade, GradeCampos, Input, LabelledField, Linha, PageHeader, Panel,
  PanelHeader, RowMeta, RowTitle, SelectMenu, Status, Table, Td, Textarea, Tr,
} from '@/components/page';
import { brl, caminhoDoCard, MOTIVOS_BAIXA, num, opcoes, useDados, useGravar } from './comum';
import type { Ficha } from './ficha';

const DOCS = [['docRegua', 'Régua de cobrança cumprida até o Jurídico'], ['docParecer', 'Parecer do Jurídico sobre a chance de recuperação'],
  ['docProtesto', 'Título protestado ou negativado'], ['docAcordo', 'Tentativa de acordo registrada']] as const;

export default function Baixa() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const carga = useDados(async () => {
    const r = await acao('ccCobCasoFicha', { cobrancaId: Number(id), cardId: 0 });
    if (r.ok === false) throw new Error(String(r.error));
    return r as unknown as Ficha;
  }, id);
  const { gravar, gravando, erro, ok } = useGravar();
  const [proposta, setProposta] = useState<{ valor: string; motivo: string; obs: string; docs: Record<string, boolean> } | null>(null);
  const [parecer, setParecer] = useState({ resultado: '', texto: '' });
  const [decisao, setDecisao] = useState('');

  if (carga.erro && !carga.dados) return <><PageHeader module="Cliente em cobrança" title="Baixa como perda" /><Alert tone="error">{carga.erro}</Alert></>;
  if (!carga.dados) return <PageHeader module="Cliente em cobrança" title="Baixa como perda" description="Carregando o caso…" />;
  const ficha = carga.dados;
  const { caso, pode } = ficha;
  const vencido = num(ficha.posicao.VENCIDO);
  const disponivel = Math.max(0, Math.round((vencido - num(caso.valorBaixado)) * 100) / 100);
  const b = ficha.baixa;
  const pendente = b?.SITUACAO === 'PENDENTE' ? b : null;
  const f = proposta ?? { valor: String(disponivel), motivo: '', obs: '', docs: {} };
  const depois = (r: unknown) => { if (r) { setProposta(null); if (!ficha.restrito) carga.recarregar(); } };
  // Decisor de outra equipe (DT-35): decidido, a ficha não abre mais para ele; fica a confirmação e a volta à agenda.
  if (ficha.restrito && ok) {
    return (
      <>
        <PageHeader module="Cliente em cobrança" title={`Baixa como perda · ${ficha.cliente.nome}`} actions={<Button onClick={() => navigate('/agenda')}>Voltar à agenda</Button>} />
        <Alert tone="success">{ok}</Alert>
      </>
    );
  }


  const passo = (titulo: string, feito: boolean, meta: string, vez = false) => (
    <Tr key={titulo}>
      <Td><RowTitle>{titulo}</RowTitle><RowMeta>{meta}</RowMeta></Td>
      <Td><Status tone={feito ? 'live' : vez ? 'attention' : 'off'}>{feito ? 'Feito' : vez ? 'Aguardando' : 'Depois'}</Status></Td>
    </Tr>
  );

  return (
    <>
      <PageHeader module="Cliente em cobrança" title={`Baixa como perda · ${ficha.cliente.nome}`}
        description={`${brl(vencido)} vencidos há ${num(ficha.posicao.DIAS_ATRASO)} dias. A baixa é proposta por quem cobra, recebe o parecer do Jurídico e é decidida na alçada do valor.`}
        actions={<Button onClick={() => navigate(caminhoDoCard(caso))}>Voltar ao card</Button>} />
      {ficha.restrito ? <Alert tone="info">Cliente de outra equipe: você vê o necessário para decidir na sua alçada (débito, proposta e parecer).</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      <Grade>
        <Panel>
          <PanelHeader title="Trilha da baixa" hint={num(caso.valorBaixado) > 0 ? `Já baixado neste caso: ${brl(caso.valorBaixado)}` : undefined} />
          <Table>
            <tbody>
              {b ? (
                <>
                  {passo('Proposta', true, `${brl(b.VALOR)} · ${b.MOTIVO} · ${fmtDataHora(b.PROPOSTO_EM)}`)}
                  {passo('Parecer do Jurídico', !!b.PARECER_EM, b.PARECER_EM ? `${b.PARECER_RESULTADO === 'FAVORAVEL' ? 'Favorável' : 'Desfavorável'} · ${fmtDataHora(b.PARECER_EM)}` : 'obrigatório antes da decisão', !b.PARECER_EM)}
                  {passo('Decisão na alçada', !!b.DECIDIDO_EM, b.DECIDIDO_EM ? `${b.SITUACAO === 'APROVADA' ? 'Aprovada' : 'Recusada'} · ${fmtDataHora(b.DECIDIDO_EM)}` : `decide ${rotuloNivel(b.NIVEL_EXIGIDO)}`, !!b.PARECER_EM && !b.DECIDIDO_EM)}
                  {passo('Lançamento contábil', false, 'fora do sistema, depois da aprovação; cliente mantido bloqueado')}
                </>
              ) : passo('Proposta', false, 'nenhuma baixa proposta neste caso', true)}
            </tbody>
          </Table>
        </Panel>

        <Panel>
          {!pendente ? (
            <>
              <PanelHeader title="Propor baixa" hint="Uma proposta pendente por caso; o nível da alçada sai do valor desta baixa." />
              <Card>
                <GradeCampos>
                  <LabelledField label="Valor da baixa" obrigatorio hint={`Até ${brl(disponivel)} (o vencido ainda não baixado).`}>
                    <Input type="number" min="0" step="0.01" value={f.valor} onChange={(e) => setProposta({ ...f, valor: e.target.value })} />
                  </LabelledField>
                  <Field label="Motivo" obrigatorio>
                    <SelectMenu label="Motivo da baixa" value={f.motivo} options={opcoes(MOTIVOS_BAIXA)} placeholder="Escolha o motivo" onChange={(motivo) => setProposta({ ...f, motivo })} />
                  </Field>
                </GradeCampos>
                <Field label="Documentos de suporte" hint="Marque o que já está no card.">
                  <Linha>
                    {DOCS.map(([k, rotulo]) => (
                      <Button key={k} size="sm" variant={f.docs[k] ? 'primary' : 'secondary'} aria-pressed={!!f.docs[k]}
                        onClick={() => setProposta({ ...f, docs: { ...f.docs, [k]: !f.docs[k] } })}>{rotulo}</Button>
                    ))}
                  </Linha>
                </Field>
                <LabelledField label="Observação"><Textarea value={f.obs} onChange={(e) => setProposta({ ...f, obs: e.target.value })} /></LabelledField>
                <Button variant="primary" disabled={!pode.proporBaixa || gravando || !f.motivo || !(num(f.valor) > 0)}
                  title={pode.proporBaixa ? undefined : 'Só quem opera o caso propõe a baixa.'}
                  onClick={async () => depois(await gravar('ccCobBaixaPropor', {
                    cobrancaId: caso.id, valor: num(f.valor), motivo: f.motivo, obs: f.obs.trim(),
                    ...Object.fromEntries(DOCS.map(([k]) => [k, f.docs[k] ? 1 : 0])),
                  }, 'Baixa proposta; aguarda o parecer do Jurídico.'))}>Propor baixa</Button>
              </Card>
            </>
          ) : !pendente.PARECER_EM ? (
            <>
              <PanelHeader title="Parecer do Jurídico" hint="A baixa só é decidida com o parecer registrado." />
              <Card>
                <Proposta b={pendente} />
                <Field label="Resultado" obrigatorio>
                  <SelectMenu label="Resultado do parecer" value={parecer.resultado} onChange={(resultado) => setParecer({ ...parecer, resultado })}
                    options={[{ value: 'FAVORAVEL', label: 'Favorável à baixa' }, { value: 'DESFAVORAVEL', label: 'Desfavorável à baixa' }]} />
                </Field>
                <LabelledField label="Parecer" obrigatorio><Textarea value={parecer.texto} onChange={(e) => setParecer({ ...parecer, texto: e.target.value })} /></LabelledField>
                <Button variant="primary" disabled={!pode.parecerBaixa || gravando || !parecer.resultado || !parecer.texto.trim()}
                  title={pode.parecerBaixa ? undefined : 'O parecer é do Jurídico.'}
                  onClick={async () => depois(await gravar('ccCobBaixaParecer', { baixaId: pendente.ID, resultado: parecer.resultado, texto: parecer.texto.trim() }, 'Parecer registrado.'))}>Registrar parecer</Button>
              </Card>
            </>
          ) : (
            <>
              <PanelHeader title="Decisão na alçada" hint={`Decide ${rotuloNivel(pendente.NIVEL_EXIGIDO)}. Quem propôs a baixa não pode aprová-la.`} />
              <Card>
                <Proposta b={pendente} />
                <Alert tone={pendente.PARECER_RESULTADO === 'FAVORAVEL' ? 'info' : 'warn'}>
                  Parecer do Jurídico ({pendente.PARECER_RESULTADO === 'FAVORAVEL' ? 'favorável' : 'desfavorável'}): {pendente.PARECER_TEXTO}
                </Alert>
                <LabelledField label="Parecer da decisão"><Textarea value={decisao} onChange={(e) => setDecisao(e.target.value)} /></LabelledField>
                <GradeCampos>
                  <Button variant="primary" disabled={!pode.decidirBaixa || gravando} title={pode.decidirBaixa ? undefined : 'Exige a alçada da baixa; quem propôs não decide.'}
                    onClick={async () => depois(await gravar('ccCobBaixaDecidir', { baixaId: pendente.ID, aprovar: 1, texto: decisao.trim() }, 'Baixa aprovada.'))}>Aprovar baixa</Button>
                  <Button variant="danger" disabled={!pode.decidirBaixa || gravando}
                    onClick={async () => depois(await gravar('ccCobBaixaDecidir', { baixaId: pendente.ID, aprovar: 0, texto: decisao.trim() }, 'Baixa recusada.'))}>Recusar</Button>
                </GradeCampos>
                <Alert tone="info">Aprovada a baixa que alcança todo o vencido, o cliente vai para “Baixados como perda”, mantido bloqueado. O lançamento contábil é feito fora do sistema.</Alert>
              </Card>
            </>
          )}
        </Panel>
      </Grade>
    </>
  );
}

function Proposta({ b }: { b: Record<string, unknown> }) {
  return (
    <Table>
      <tbody>
        <Tr><Td>Valor da baixa</Td><Td numeric>{brl(b.VALOR)}</Td></Tr>
        <Tr><Td>Motivo</Td><Td>{String(b.MOTIVO)}</Td></Tr>
        <Tr><Td>Proposta em</Td><Td>{fmtDataHora(String(b.PROPOSTO_EM))}</Td></Tr>
        <Tr><Td>Documentos</Td><Td>{DOCS.filter(([k]) => Number(b[k.replace('doc', 'DOC_').toUpperCase()])).map(([, r]) => r).join(' · ') || <Dash />}</Td></Tr>
        {b.OBS ? <Tr><Td>Observação</Td><Td>{String(b.OBS)}</Td></Tr> : null}
      </tbody>
    </Table>
  );
}
