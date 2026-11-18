// Registrar contato (T-067, opção B "Formulário com contexto"): o formulário em três blocos e, ao lado, os contatos
// da ficha, os últimos contatos e o que a etapa pede. A promessa mostra o limite em dias úteis (RN-007, RN-019);
// o servidor confere de novo e leva data não útil ao próximo útil.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { motivoNaoUtil } from '@/lib/base/dias-uteis';
import { limitePromessa } from '@/lib/cobranca-privada/agenda';
import { retornosDa } from '@/lib/cobranca-privada/listas';
import {
  Alert, Button, Card, Dash, EmptyState, Field, Grade, GradeCampos, Input, LabelledField, PageHeader, Panel,
  PanelHeader, RowMeta, RowTitle, SelectMenu, Status, Table, Td, Textarea, Th, Tr,
} from '@/components/page';
import { brl, caminhoDoCard, CANAIS, feriadosDaTela, hojeLocal, num, opcoes, parametrosDe, RETORNOS, useDados, useGravar, type Linha } from './comum';
import type { Ficha } from './ficha';

export default function RegistrarContato() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const carga = useDados(async () => {
    const ficha = await acao('ccCobCasoFicha', { cobrancaId: Number(id), cardId: 0 });
    if (ficha.ok === false) throw new Error(String(ficha.error));
    const f = ficha as unknown as Ficha;
    const [contatos, p, feriados] = await Promise.all([
      linhas('ccBaseContatoListar', { clienteId: f.cliente.id, area: '', situacaoFicha: '', soPrincipais: 0, busca: '', limite: 50, offset: 0 }),
      parametrosDe(f.caso.carteira as never, 'cob'),
      feriadosDaTela(),
    ]);
    return { ficha: f, contatos, maxUteis: num(p['cob.promessaMaxUteis']), feriados };
  }, id);
  const [form, setForm] = useState({ data: '', canal: 'Telefone', falouCom: '', feedback: '', retorno: '', previsao: '', valor: '', proxAcao: '', proxAcaoData: '' });
  const { gravar, gravando, erro } = useGravar();
  const muda = (campo: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [campo]: e.target.value });

  if (carga.erro && !carga.dados) return <><PageHeader module="Cliente em cobrança" title="Registrar contato" /><Alert tone="error">{carga.erro}</Alert></>;
  if (!carga.dados) return <PageHeader module="Cliente em cobrança" title="Registrar contato" description="Carregando o caso…" />;
  const { ficha, contatos, maxUteis, feriados } = carga.dados;
  const { caso, posicao } = ficha;
  const data = form.data || hojeLocal();
  const limite = limitePromessa(data, maxUteis, feriados);
  const naoUtil = form.previsao ? motivoNaoUtil(form.previsao, feriados) : '';
  const voltar = () => navigate(caminhoDoCard(caso));

  async function registrar() {
    const r = await gravar('ccCobContatoRegistrar', {
        clienteId: ficha.cliente.id, carteira: caso.carteira, cobrancaId: caso.id, nfId: 0, data: form.data, canal: form.canal, falouCom: form.falouCom.trim(),
        retorno: form.retorno, previsao: form.previsao, valor: form.valor || 0, feedback: form.feedback.trim(), proxAcao: form.proxAcao.trim(),
        proxAcaoData: form.proxAcaoData, origem: 'MANUAL', emailEnviadoId: 0, membroId: 0,
    });
    if (r) voltar();
  }

  return (
    <>
      <PageHeader module="Cliente em cobrança" title={`Registrar contato · ${ficha.cliente.nome}`}
        description={`${caso.faseNome}${num(posicao.VENCIDO) > 0 ? ` · ${brl(posicao.VENCIDO)} vencidos há ${num(posicao.DIAS_ATRASO)} dias` : ''}`}
        actions={<Button onClick={voltar}>Voltar ao card</Button>} />
      <Grade>
        <Panel>
          <PanelHeader title="A conversa" />
          <Card>
            <GradeCampos>
              <LabelledField label="Data do contato" hint="Vazio = hoje; não pode ser futura.">
                <Input type="date" value={form.data} onChange={muda('data')} />
              </LabelledField>
              <Field label="Canal" obrigatorio><SelectMenu label="Canal" value={form.canal} options={opcoes(CANAIS)} onChange={(canal) => setForm({ ...form, canal })} /></Field>
              <LabelledField label="Falou com"><Input value={form.falouCom} onChange={muda('falouCom')} /></LabelledField>
              <Field label="Retorno" obrigatorio><SelectMenu label="Retorno" value={form.retorno} options={opcoes(retornosDa(caso.carteira, RETORNOS))} placeholder="Como foi o contato"
                onChange={(retorno) => setForm({ ...form, retorno })} /></Field>
            </GradeCampos>
            <LabelledField label="Feedback da conversa" obrigatorio hint="O que ficou combinado.">
              <Textarea value={form.feedback} onChange={muda('feedback')} />
            </LabelledField>
          </Card>
          <PanelHeader title="Promessa de pagamento" hint="Opcional: com a previsão, a promessa vira a próxima ação “Conferir pagamento prometido”." />
          <Card>
            <GradeCampos>
              <LabelledField label="Previsão de pagamento" hint={naoUtil ? `Cai em ${naoUtil}: vai para o próximo dia útil.` : undefined}>
                <Input type="date" value={form.previsao} min={data} onChange={muda('previsao')} />
              </LabelledField>
              <LabelledField label="Valor prometido"><Input type="number" min="0" step="0.01" value={form.valor} onChange={muda('valor')} /></LabelledField>
            </GradeCampos>
            <Alert tone={limite && form.previsao > limite ? 'error' : 'info'}>
              {limite ? `Promessa aceita até ${fmtData(limite)}: ${maxUteis} dias úteis depois do contato. Acima disso, registre um acordo formal com entrada.`
                : 'Sem limite de dias para a promessa nesta carteira.'}
            </Alert>
          </Card>
          <PanelHeader title="Próximo passo" hint="Sem promessa, vira a próxima ação da agenda." />
          <Card>
            <GradeCampos>
              <LabelledField label="Próxima ação"><Input value={form.proxAcao} maxLength={200} onChange={muda('proxAcao')} /></LabelledField>
              <LabelledField label="Data da próxima ação"><Input type="date" value={form.proxAcaoData} onChange={muda('proxAcaoData')} /></LabelledField>
            </GradeCampos>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <Button variant="primary" disabled={gravando || !form.retorno || !form.feedback.trim()} onClick={registrar}>Registrar contato</Button>
          </Card>
        </Panel>
        <Panel>
          <PanelHeader title="Contatos da ficha" />
          {contatos.length ? (
            <Table>
              <tbody>
                {contatos.map((c: Linha) => (
                  <Tr key={c.ID}>
                    <Td><RowTitle>{c.NOME}</RowTitle>{Number(c.PRINCIPAL) ? <Status tone="live">preferido</Status> : null}
                      <RowMeta>{[c.FUNCAO || c.AREA, c.TELEFONE, c.WHATSAPP, c.EMAIL].filter(Boolean).join(' · ')}</RowMeta></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState title="Ficha de contatos vazia." hint="Cadastre os contatos do cliente na ficha de contatos." />}
          <PanelHeader title="Últimos contatos" />
          {ficha.contatos.length ? (
            <Table>
              <tbody>
                {ficha.contatos.map((c: Linha) => (
                  <Tr key={c.ID}>
                    <Td><RowTitle>{fmtData(c.DATA)} · {c.CANAL}</RowTitle><RowMeta>{c.RETORNO || 'Sem retorno registrado'} · {c.AGENTE_NOME}</RowMeta><RowMeta>{c.FEEDBACK}</RowMeta></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState title="Nenhum contato ainda." />}
          <PanelHeader title="O que a etapa pede" hint={caso.faseNome} />
          {ficha.acoes.length ? (
            <Table>
              <thead><tr><Th>Item</Th><Th>Situação</Th></tr></thead>
              <tbody>
                {ficha.acoes.map((a) => (
                  <Tr key={a.n}><Td>{a.n}. {a.texto}</Td><Td>{a.marcado ? <Status tone="live">Feito</Status> : <Dash />}</Td></Tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState title="Esta etapa não tem checklist." />}
        </Panel>
      </Grade>
    </>
  );
}
