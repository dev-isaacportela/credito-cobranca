// Acordo de pagamento (T-068, opção C "Cenários lado a lado"): aba Proposta com três cenários prontos e a alçada de
// cada um, o ajuste e a prévia das parcelas (o servidor recalcula ao propor); aba Acompanhamento com a decisão da
// alçada, as parcelas e o cancelamento.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { acao } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import { somarDias } from '@/lib/base/dias-uteis';
import { cenariosAcordo, rotuloNivel, simularParcelas } from '@/lib/cobranca-privada/acordo';
import { abasDoAcordo } from '@/lib/cobranca-privada/agenda';
import {
  Linha as LinhaUi, Alert, Button, Card, CardTitle, Dash, EmptyState, GradeCampos, GradeKpi, Input, Kpi, LabelledField, PageHeader,
  Panel, PanelHeader, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Textarea, Th, Tr,
} from '@/components/page';
import { brl, caminhoDoCard, feriadosDaTela, hojeLocal, num, parametrosDe, useDados, useGravar, type Linha } from './comum';
import type { Ficha } from './ficha';

const SITUACAO: Record<string, [string, 'live' | 'off' | 'attention' | 'alert']> = {
  PROPOSTO: ['Aguardando a alçada', 'attention'], ATIVO: ['Ativo', 'live'], QUITADO: ['Quitado', 'live'], QUEBRADO: ['Quebrado', 'alert'],
  CANCELADO: ['Cancelado', 'off'], RECUSADO: ['Recusado', 'off'],
};

export default function Acordo() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const carga = useDados(async () => {
    const r = await acao('ccCobCasoFicha', { cobrancaId: Number(id), cardId: 0 });
    if (r.ok === false) throw new Error(String(r.error));
    const ficha = r as unknown as Ficha;
    const [p, feriados] = await Promise.all([parametrosDe(ficha.caso.carteira as never), feriadosDaTela()]);
    return { ficha, p, feriados };
  }, id);
  const { gravar, gravando, erro, ok } = useGravar();
  const [aba, setAba] = useState('');
  const [termos, setTermos] = useState<Record<string, string> | null>(null);
  const [texto, setTexto] = useState({ parecer: '', motivo: '', pagoEm: '' });

  if (carga.erro && !carga.dados) return <><PageHeader module="Cliente em cobrança" title="Acordo de pagamento" /><Alert tone="error">{carga.erro}</Alert></>;
  if (!carga.dados) return <PageHeader module="Cliente em cobrança" title="Acordo de pagamento" description="Carregando o caso…" />;
  const { ficha, p, feriados } = carga.dados;
  const { caso, pode } = ficha;
  const debito = num(ficha.posicao.VENCIDO);
  const acordo = ficha.acordo;
  const abas = abasDoAcordo(!!ficha.restrito);
  const abaAtual = abas.includes(aba) ? aba : acordo && ['PROPOSTO', 'ATIVO'].includes(acordo.SITUACAO) ? 'acompanhamento' : abas[0];
  const hoje = hojeLocal();
  const cenarios = cenariosAcordo(debito, p);
  const padrao = (c = cenarios.find((x) => x.chave === 'padrao') ?? cenarios[0]) => ({
    valor: String(debito), entrada: String(c.entrada), entradaData: hoje, nParcelas: String(c.n),
    primeiroVenc: somarDias(hoje, num(p['cob.acordoPrimeiroDias']) || 7), intervaloDias: String(num(p['cob.acordoIntervaloDias']) || 30), garantia: '', escolhido: c.chave,
  });
  const t = termos ?? padrao();
  const muda = (campo: string) => (e: { target: { value: string } }) => setTermos({ ...t, [campo]: e.target.value });
  const parcelas = simularParcelas(num(t.valor), num(t.entrada), num(t.nParcelas), t.entradaData, t.primeiroVenc, num(t.intervaloDias), feriados);
  const teto = num(p['cob.acordoValorGerente']);
  const minPct = num(p['cob.acordoEntradaMinPct']);
  const maxN = num(p['cob.acordoMaxParcelas']);
  const dentro = num(t.valor) > 0 && num(t.entrada) * 100 >= minPct * num(t.valor) && num(t.nParcelas) <= maxN && debito <= teto;
  const nivel = dentro ? num(p['alcada.acordoNivelPadrao']) || 2 : num(p['alcada.acordoNivelFora']) || 3;
  const pagas = ficha.parcelas.filter((x: Linha) => x.PAGO_EM);
  const pago = pagas.reduce((s: number, x: Linha) => s + num(x.VALOR), 0);
  const depois = async (r: Linha | null) => { if (r) { setTermos(null); if (!ficha.restrito) carga.recarregar(); } };
  // Decisor de outra equipe (DT-35): decidido, a ficha não abre mais para ele; fica a confirmação e a volta à agenda.
  if (ficha.restrito && ok) {
    return (
      <>
        <PageHeader module="Cliente em cobrança" title={`Acordo de pagamento · ${ficha.cliente.nome}`} actions={<Button onClick={() => navigate('/agenda')}>Voltar à agenda</Button>} />
        <Alert tone="success">{ok}</Alert>
      </>
    );
  }


  return (
    <>
      <PageHeader module="Cliente em cobrança" title={`Acordo de pagamento · ${ficha.cliente.nome}`}
        description={`Débito em cobrança de ${brl(debito)}. A proposta gera as parcelas, sobe para a alçada e, aprovada, tira o cliente da régua automática.`}
        actions={<Button onClick={() => navigate(caminhoDoCard(caso))}>Voltar ao card</Button>} />
      {ficha.restrito ? <Alert tone="info">Cliente de outra equipe: você vê o necessário para decidir na sua alçada (débito, proposta e parcelas).</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      <Tabs value={abaAtual} onValueChange={setAba}>
        <TabsList>
          {abas.includes('proposta') ? <TabsTrigger value="proposta">Proposta</TabsTrigger> : null}
          <TabsTrigger value="acompanhamento">Acompanhamento{acordo ? ` ${pagas.length}/${ficha.parcelas.length}` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="proposta">
          <Panel>
            <PanelHeader title="Compare e escolha um ponto de partida" hint={`Entrada de ${minPct}%, até ${maxN} parcelas e débito até ${brl(teto)}: dentro do padrão.`} />
            <Card>
              <GradeKpi>
                {cenarios.map((c) => {
                  const ps = simularParcelas(debito, c.entrada, c.n, hoje, padrao(c).primeiroVenc, num(padrao(c).intervaloDias), feriados);
                  return (
                    <Card key={c.chave}>
                      <CardTitle>{c.nome} · {c.entradaPct}% + {c.n} parcelas</CardTitle>
                      <Kpi rotulo="Entrada" valor={brl(c.entrada)} hint={`${c.n} parcelas de cerca de ${brl((debito - c.entrada) / c.n)} · termina em ${fmtData(ps[ps.length - 1]?.venc)}`} />
                      <Status tone={c.dentroDoPadrao ? 'live' : 'attention'}>{c.dentroDoPadrao ? 'Padrão' : 'Fora do padrão'}: aprova {rotuloNivel(c.nivel)}</Status>
                      <Button size="sm" variant={t.escolhido === c.chave ? 'primary' : 'secondary'} onClick={() => setTermos(padrao(c))}>
                        {t.escolhido === c.chave ? 'Escolhido' : 'Usar este'}
                      </Button>
                    </Card>
                  );
                })}
              </GradeKpi>
            </Card>
            <PanelHeader title="Ajuste do cenário escolhido" />
            <Card>
              <GradeCampos>
                <LabelledField label="Valor do acordo" obrigatorio><Input type="number" min="0" step="0.01" value={t.valor} onChange={muda('valor')} /></LabelledField>
                <LabelledField label="Entrada"><Input type="number" min="0" step="0.01" value={t.entrada} onChange={muda('entrada')} /></LabelledField>
                <LabelledField label="Data da entrada"><Input type="date" value={t.entradaData} onChange={muda('entradaData')} /></LabelledField>
                <LabelledField label="Número de parcelas" obrigatorio><Input type="number" min="1" max="60" value={t.nParcelas} onChange={muda('nParcelas')} /></LabelledField>
                <LabelledField label="Primeiro vencimento" obrigatorio><Input type="date" value={t.primeiroVenc} onChange={muda('primeiroVenc')} /></LabelledField>
                <LabelledField label="Intervalo em dias"><Input type="number" min="1" max="90" value={t.intervaloDias} onChange={muda('intervaloDias')} /></LabelledField>
              </GradeCampos>
              <LabelledField label={`Garantia (exigida acima de ${brl(teto)})`} obrigatorio={debito > teto}>
                <Textarea value={t.garantia} onChange={muda('garantia')} />
              </LabelledField>
            </Card>
            {parcelas.length ? (
              <Table>
                <thead><tr><Th>Parcela</Th><Th>Vencimento</Th><Th numeric>Valor</Th></tr></thead>
                <tbody>
                  {parcelas.map((x) => (
                    <Tr key={x.n}><Td>{x.n === 0 ? 'Entrada' : `Parcela ${x.n} de ${num(t.nParcelas)}`}</Td><Td>{fmtData(x.venc)}</Td><Td numeric>{brl(x.valor)}</Td></Tr>
                  ))}
                  <Tr><Td>Total do acordo</Td><Td><Dash /></Td><Td numeric>{brl(parcelas.reduce((s, x) => s + x.valor, 0))}</Td></Tr>
                </tbody>
              </Table>
            ) : <EmptyState title="Preencha valor, parcelas e primeiro vencimento para ver as parcelas." />}
            <Card>
              <Alert tone={dentro ? 'info' : 'warn'}>
                {dentro ? 'Dentro do padrão' : 'Fora do padrão'}: aprova {rotuloNivel(nivel)}. Quem propôs não aprova. O servidor confere o saldo e recalcula as parcelas ao propor.
              </Alert>
              <Button variant="primary" disabled={!pode.proporAcordo || gravando} title={pode.proporAcordo ? undefined : 'Sem permissão, ou já há acordo em aberto neste caso.'}
                onClick={async () => depois(await gravar('ccCobAcordoPropor', {
                  cobrancaId: caso.id, debito, valor: num(t.valor), entrada: num(t.entrada), entradaData: num(t.entrada) > 0 ? t.entradaData : '',
                  nParcelas: num(t.nParcelas), primeiroVenc: t.primeiroVenc, intervaloDias: num(t.intervaloDias), garantia: t.garantia.trim(),
                }, 'Acordo enviado para aprovação.'))}>Enviar para aprovação</Button>
            </Card>
          </Panel>
        </TabsContent>

        <TabsContent value="acompanhamento">
          {!acordo ? <Panel><EmptyState title="Este caso ainda não tem acordo." hint="Monte a proposta na aba Proposta." /></Panel> : (
            <Panel>
              <PanelHeader title={`Acordo de ${brl(acordo.VALOR)}`} hint={`proposto em ${fmtDataHora(acordo.PROPOSTO_EM)}${acordo.DECIDIDO_EM ? ` · decidido em ${fmtDataHora(acordo.DECIDIDO_EM)}` : ''}${acordo.MOTIVO_NIVEL ? ` · ${acordo.MOTIVO_NIVEL}` : ''}`}>
                <Status tone={SITUACAO[acordo.SITUACAO]?.[1] ?? 'off'}>{SITUACAO[acordo.SITUACAO]?.[0] ?? acordo.SITUACAO}</Status>
              </PanelHeader>
              <Card>
                <GradeKpi>
                  <Kpi rotulo="Pago" valor={brl(pago)} hint={`de ${brl(acordo.VALOR)}`} />
                  <Kpi rotulo="Parcelas pagas" valor={`${pagas.length} de ${ficha.parcelas.length}`} />
                  <Kpi rotulo="Alçada" valor={rotuloNivel(acordo.NIVEL_EXIGIDO)} />
                  <Kpi rotulo="Garantia" valor={acordo.GARANTIA ? 'Sim' : <Dash />} hint={acordo.GARANTIA || undefined} />
                </GradeKpi>
                {acordo.PARECER ? <Alert tone="info">Parecer: {acordo.PARECER}</Alert> : null}
                {acordo.SITUACAO === 'PROPOSTO' ? (
                  <>
                    <LabelledField label="Parecer da decisão" hint="Obrigatório para recusar."><Textarea value={texto.parecer} onChange={(e) => setTexto({ ...texto, parecer: e.target.value })} /></LabelledField>
                    <LinhaUi>
                      <Button variant="primary" disabled={!pode.decidirAcordo || gravando} title={pode.decidirAcordo ? undefined : 'Exige a alçada do acordo; quem propôs não aprova.'}
                        onClick={async () => depois(await gravar('ccCobAcordoDecidir', { acordoId: acordo.ID, aprovar: 1, parecer: texto.parecer.trim() }, 'Acordo aprovado.'))}>Aprovar acordo</Button>
                      <Button variant="danger" disabled={!pode.decidirAcordo || gravando || !texto.parecer.trim()}
                        onClick={async () => depois(await gravar('ccCobAcordoDecidir', { acordoId: acordo.ID, aprovar: 0, parecer: texto.parecer.trim() }, 'Acordo recusado.'))}>Recusar</Button>
                    </LinhaUi>
                  </>
                ) : null}
              </Card>
              <Table>
                <thead><tr><Th>Parcela</Th><Th>Vencimento</Th><Th numeric>Valor</Th><Th>Situação</Th><Th /></tr></thead>
                <tbody>
                  {ficha.parcelas.map((x: Linha) => {
                    const vencida = !x.PAGO_EM && String(x.VENC) < hoje;
                    return (
                      <Tr key={x.ID}>
                        <Td>{num(x.N) === 0 ? 'Entrada' : `Parcela ${x.N} de ${acordo.N_PARCELAS}`}</Td>
                        <Td>{fmtData(x.VENC)}</Td>
                        <Td numeric>{brl(x.VALOR)}</Td>
                        <Td><Status tone={x.PAGO_EM ? 'live' : vencida ? 'alert' : 'off'}>{x.PAGO_EM ? `Paga em ${fmtData(x.PAGO_EM)}` : vencida ? 'Vencida' : 'A vencer'}</Status></Td>
                        <Td>{x.PAGO_EM || acordo.SITUACAO !== 'ATIVO' ? null : (
                          <Button size="sm" disabled={!pode.pagarParcela || gravando} title={pode.pagarParcela ? undefined : 'Só quem opera o caso registra pagamento.'}
                            onClick={async () => depois(await gravar('ccCobAcordoParcelaPagar', { parcelaId: x.ID, pagoEm: texto.pagoEm }, 'Pagamento registrado.'))}>Registrar pagamento</Button>
                        )}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              {acordo.SITUACAO === 'ATIVO' || acordo.SITUACAO === 'PROPOSTO' ? (
                <Card>
                  <GradeCampos>
                    <LabelledField label="Pago em" hint="Vazio = hoje; vale para o próximo “Registrar pagamento”."><Input type="date" max={hoje} value={texto.pagoEm} onChange={(e) => setTexto({ ...texto, pagoEm: e.target.value })} /></LabelledField>
                    <LabelledField label="Motivo do cancelamento"><Input value={texto.motivo} onChange={(e) => setTexto({ ...texto, motivo: e.target.value })} /></LabelledField>
                  </GradeCampos>
                  <Alert tone="info">Com todas as parcelas pagas o acordo fica quitado; o cliente regulariza quando o Winthor mostrar o saldo vencido zerado.</Alert>
                  <Button variant="danger" disabled={!pode.cancelarAcordo || gravando || !texto.motivo.trim()} title={pode.cancelarAcordo ? undefined : 'Cancelar acordo exige supervisor ou acima.'}
                    onClick={async () => depois(await gravar('ccCobAcordoCancelar', { acordoId: acordo.ID, motivo: texto.motivo.trim() }, 'Acordo cancelado; a rotina devolve o card à régua.'))}>Cancelar acordo</Button>
                </Card>
              ) : null}
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
