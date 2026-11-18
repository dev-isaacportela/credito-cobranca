// Notificação extrajudicial e demonstrativo do débito (T-221, opção C "Conferência em passos"): 4 passos e 2 passos;
// a prévia é o papel em HTML. O texto, o débito e a filial vêm do servidor (ccJurNotificacaoPreparar,
// ccJurDemonstrativoPreparar); a emissão da notificação fica registrada (ccJurNotificacaoRegistrar). Impressão/PDF:
// uma janela só com o papel e a folha A4 (o navegador salva em PDF). Órgão público: a recusa do servidor cita o ofício.

import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, Code, CorpoPainel, Dash, Faixa, Folha, GradeCampos, Input, LabelledField, Linha as Junto, Nota,
  PageHeader, Panel, ParagrafoDaFolha, Passos, Pilha, SelectMenu, Status, Subtitulo, Table, Td, Th,
  TituloDaFolha, Tr,
} from '@/components/page';
import { BuscaCliente } from './BuscaCliente';
import { brl, CARTEIRA_NOME, erroDe, hojeLocal, num, useDados, useGravar, type Linha } from './comum';

const OPCOES_CARTEIRA = Object.entries(CARTEIRA_NOME).map(([value, label]) => ({ value, label }));
const esc = (t: unknown) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Abre o papel numa janela própria (A4, sem a casca do app) e chama a impressão: dali sai o PDF. */
function imprimir(titulo: string, corpo: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
@page{size:A4;margin:20mm}body{font:11pt/1.5 Georgia,serif;color:#000;margin:0}h1{font-size:13pt;text-align:center;text-transform:uppercase}
p{margin:0 0 8pt;text-align:justify;white-space:pre-wrap}table{width:100%;border-collapse:collapse;margin:8pt 0}
th,td{border-bottom:1px solid #999;padding:3pt 4pt;text-align:left}td.n,th.n{text-align:right}
</style></head><body>${corpo}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

const tabelaDebito = (d: Linha, rotulos?: Linha) => `<table><thead><tr><th>Título</th><th>Vencimento</th><th class="n">Saldo</th><th class="n">Dias</th>
<th class="n">Total</th></tr></thead><tbody>${(d.linhas ?? []).map((l: Linha) => `<tr><td>${esc(l.TITULO)}${l.PARCELA ? `-${esc(l.PARCELA)}` : ''}</td>
<td>${esc(fmtData(l.VENCIMENTO))}</td><td class="n">${esc(brl(l.SALDO))}</td><td class="n">${esc(l.DIAS)}</td><td class="n">${esc(brl(l.TOTAL))}</td></tr>`).join('')}
</tbody></table><table><tbody>${(['principal', 'multa', 'juros', 'correcao', 'total'] as const).map((k) => `<tr><td>${esc(rotulos?.[k] ?? k)}</td>
<td class="n">${esc(brl(d[k]))}</td></tr>`).join('')}</tbody></table>`;

const ROTULOS_PADRAO = { principal: 'Valor principal', multa: 'Multa', juros: 'Juros de mora', correcao: 'Correção monetária', total: 'Total atualizado' };

function TabelaDebito({ d, rotulos = ROTULOS_PADRAO }: { d: Linha; rotulos?: Linha }) {
  return (
    <>
      <Table>
        <thead><tr><Th>Título</Th><Th>Vencimento</Th><Th numeric>Saldo</Th><Th numeric>Dias</Th><Th numeric>Total</Th></tr></thead>
        <tbody>
          {(d.linhas ?? []).map((l: Linha) => (
            <Tr key={`${l.TITULO}-${l.PARCELA}`}>
              <Td>{l.TITULO}{l.PARCELA ? `-${l.PARCELA}` : ''}</Td><Td>{fmtData(l.VENCIMENTO)}</Td><Td numeric>{brl(l.SALDO)}</Td><Td numeric>{l.DIAS}</Td>
              <Td numeric>{brl(l.TOTAL)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Table>
        <tbody>
          {(['principal', 'multa', 'juros', 'correcao', 'total'] as const).map((k) => (
            <Tr key={k}><Td>{rotulos[k]}</Td><Td numeric>{brl(d[k])}</Td></Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default function DocumentoPassos() {
  const { tipo = 'notificacao' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<{ id: number; nome: string }>({ id: Number(params.get('clienteId')) || 0, nome: '' });
  const [carteira, setCarteira] = useState(params.get('carteira') || 'PRIVADA');
  const processoId = Number(params.get('processoId')) || 0;
  const notificacao = tipo !== 'demonstrativo';
  const outro = notificacao ? 'demonstrativo' : 'notificacao';

  return (
    <Pilha>
      <PageHeader module="Jurídico · Documentos" title="Gerar documento" description="Confira um bloco por vez; a prévia do papel fecha o processo."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/juridico/documentos/${outro}?${params.toString()}`, { replace: true })}>
              {notificacao ? 'Demonstrativo do débito' : 'Notificação extrajudicial'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          </>
        } />
      {notificacao
        ? <Notificacao cliente={cliente} setCliente={setCliente} carteira={carteira} setCarteira={setCarteira} processoId={processoId} />
        : <Demonstrativo cliente={cliente} setCliente={setCliente} carteira={carteira} setCarteira={setCarteira} processoId={processoId} />}
    </Pilha>
  );
}

interface PropsDoc {
  cliente: { id: number; nome: string }; setCliente: (c: { id: number; nome: string }) => void;
  carteira: string; setCarteira: (c: string) => void; processoId: number;
}

function EscolhaCliente({ cliente, setCliente, carteira, setCarteira }: PropsDoc) {
  return (
    <GradeCampos>
      <LabelledField label="Cliente" obrigatorio>
        {cliente.id ? (
          <Junto>
            <Code prefix="cliente ">{cliente.nome || cliente.id}</Code>
            <Button size="sm" variant="ghost" onClick={() => setCliente({ id: 0, nome: '' })}>Trocar</Button>
          </Junto>
        ) : <BuscaCliente onEscolher={(c) => setCliente({ id: Number(c.ID), nome: c.NOME })} />}
      </LabelledField>
      <LabelledField label="Carteira">
        <SelectMenu label="Carteira" value={carteira} options={OPCOES_CARTEIRA} onChange={setCarteira} />
      </LabelledField>
    </GradeCampos>
  );
}

function Notificacao(props: PropsDoc) {
  const { cliente, carteira, processoId } = props;
  const [passo, setPasso] = useState(0);
  const [filial, setFilial] = useState('');
  const [prazoDias, setPrazoDias] = useState(0);
  const { gravar, gravando, erro, ok } = useGravar();
  const filiais = useDados(() => linhas('ccJurFilialCredoraListar', { ativa: 1 }), 'filiais');
  const prep = useDados(async () => (cliente.id ? acao('ccJurNotificacaoPreparar', { clienteId: cliente.id, carteira, filial, prazoDias }) : null),
    `${cliente.id}:${carteira}:${filial}:${prazoDias}`);
  const p: Linha | null = prep.dados?.ok ? prep.dados : null;
  const recusa = prep.erro || (prep.dados && prep.dados.ok === false ? String(prep.dados.error) : '');
  const f: Linha = p?.filial ?? {};
  const d: Linha = p?.demonstrativo ?? {};
  const pronto = !!p;

  async function registrar() {
    await gravar('ccJurNotificacaoRegistrar', {
      clienteId: cliente.id, carteira, cobrancaId: 0, processoId, filial: filial || f.CODIGO || '', prazoDias, enviarEmail: 0, contatoId: 0,
    }, `Emissão registrada: prazo até ${fmtData(p?.prazoAte)}.`);
  }

  return (
    <>
      <Passos atual={passo} onEscolher={setPasso} passos={[
        { titulo: 'Partes', resumo: p ? `${f.CODIGO} notifica ${cliente.nome || p.assunto?.split('·').pop()?.trim()}` : 'escolha o cliente' },
        { titulo: 'Débito', resumo: p ? `${(d.linhas ?? []).length} título(s) · ${brl(d.total)}` : undefined, liberado: pronto },
        { titulo: 'Pagamento e assinatura', resumo: p ? `${f.REPRESENTANTE ?? ''} · ${f.REPRESENTANTE_CARGO ?? ''}` : undefined, liberado: pronto },
        { titulo: 'Prévia e emissão', resumo: p ? `prazo até ${fmtData(p.prazoAte)}` : undefined, liberado: pronto },
      ]} />
      {recusa ? <Alert tone="error">{recusa}</Alert> : null}
      <Panel>
        <CorpoPainel>
          {passo === 0 ? (
            <>
              <Subtitulo>Partes</Subtitulo>
              <EscolhaCliente {...props} />
              <LabelledField label="Filial credora (notificante)" hint="Vazio: a filial do processo ou a da UF do cliente.">
                <SelectMenu label="Filial credora" value={filial} onChange={setFilial}
                  options={[{ value: '', label: 'Pela regra' }, ...(filiais.dados ?? []).map((x) => ({ value: String(x.CODIGO), label: `${x.CODIGO} · ${x.RAZAO_SOCIAL} · ${x.CIDADE_UF}` }))]} />
              </LabelledField>
              {p ? <Nota>{`Notificante: ${f.RAZAO_SOCIAL}, CNPJ ${f.CNPJ}, ${f.ENDERECO}, ${f.CIDADE_UF}. ${p.assunto}.`}</Nota> : null}
            </>
          ) : passo === 1 ? (
            <>
              <Subtitulo extra={`atualizado até ${fmtData(d.data)}`}>Débito</Subtitulo>
              <TabelaDebito d={d} />
              <Nota>Mesmo cálculo da cobrança (encargos do dia); não há campo editável.</Nota>
            </>
          ) : passo === 2 ? (
            <>
              <Subtitulo>Pagamento e assinatura</Subtitulo>
              <GradeCampos>
                <LabelledField label="Prazo para pagar (dias corridos)" hint="0: o padrão do parâmetro jur.notifPrazoDias.">
                  <Input type="number" min={0} max={90} value={prazoDias} onChange={(e) => setPrazoDias(Number(e.target.value) || 0)} />
                </LabelledField>
              </GradeCampos>
              <Nota>{`Pagamento: ${f.BANCO || 'sem dados bancários na filial'}. Assina: ${f.REPRESENTANTE || '—'} · ${f.REPRESENTANTE_CARGO || '—'}.`}</Nota>
            </>
          ) : (
            <>
              <Folha justificado>
                {String(p?.texto ?? '').split('\n\n').map((par, i) => (i === 0 ? <TituloDaFolha key={i}>{par}</TituloDaFolha> : <ParagrafoDaFolha key={i}>{par}</ParagrafoDaFolha>))}
              </Folha>
            </>
          )}
        </CorpoPainel>
        {passo === 3 && p ? (
          <Faixa embaixo>
            <Junto>
              {p.validado ? <Status tone="live">Pode ser emitida</Status> : <Status tone="alert">Modelo aguardando validação</Status>}
              <Nota>{`Modelo versão ${p.modeloVersao}. A emissão fica registrada com prazo até ${fmtData(p.prazoAte)}.`}</Nota>
            </Junto>
            <Junto>
              <Button variant="secondary" onClick={() => imprimir(p.assunto, String(p.texto).split('\n\n').map((par: string, i: number) => (i === 0 ? `<h1>${esc(par)}</h1>` : `<p>${esc(par)}</p>`)).join('')
                + `<h1>Demonstrativo atualizado do débito</h1>${tabelaDebito(d)}`) || window.alert('Libere a janela de impressão no navegador.')}>Imprimir / PDF</Button>
              <Button variant="primary" disabled={gravando || !p.validado} title={p.validado ? undefined : 'O modelo aguarda validação.'} onClick={registrar}>Registrar a emissão</Button>
            </Junto>
          </Faixa>
        ) : (
          <Faixa embaixo>
            <Button variant="ghost" disabled={passo === 0} onClick={() => setPasso(passo - 1)}>Voltar</Button>
            <Button variant="primary" disabled={!pronto} onClick={() => setPasso(passo + 1)}>Conferido, próximo</Button>
          </Faixa>
        )}
      </Panel>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
    </>
  );
}

function Demonstrativo(props: PropsDoc) {
  const { cliente, carteira, processoId } = props;
  const [passo, setPasso] = useState(0);
  const [data, setData] = useState('');
  const [aviso, setAviso] = useState('');
  const prep = useDados(async () => (cliente.id || processoId ? acao('ccJurDemonstrativoPreparar', { processoId: cliente.id ? 0 : processoId, clienteId: cliente.id, carteira, data }) : null),
    `${cliente.id}:${processoId}:${carteira}:${data}`);
  const d: Linha | null = prep.dados?.ok ? prep.dados : null;
  const recusa = prep.erro || (prep.dados && prep.dados.ok === false ? String(prep.dados.error) : '');
  const cab: Linha = d?.cabecalho ?? {};

  function pdf() {
    try {
      const ok = imprimir(`Demonstrativo · ${cab.cliente}`, `<h1>Demonstrativo atualizado do débito</h1><p>${esc(`${cab.cliente} · ${cab.documento} · cobrança ${
        (CARTEIRA_NOME[cab.carteira] ?? cab.carteira ?? '').toLowerCase()} · posição em ${fmtData(cab.data)}`)}</p>${tabelaDebito(d!, d!.rotulos)}
<p>Critérios: juros simples pro rata die sobre o principal vencido. Valores sujeitos a conferência pelo Jurídico na data do ajuizamento.</p>`);
      setAviso(ok ? '' : 'Libere a janela de impressão no navegador.');
    } catch (e) {
      setAviso(erroDe(e));
    }
  }

  return (
    <>
      <Passos atual={passo} onEscolher={setPasso} passos={[
        { titulo: 'Cliente e data', resumo: d ? `${cab.cliente} · ${fmtData(cab.data)}` : 'escolha o cliente' },
        { titulo: 'Prévia e emissão', resumo: d ? brl(d.total) : undefined, liberado: !!d },
      ]} />
      {recusa ? <Alert tone="error">{recusa}</Alert> : null}
      {aviso ? <Alert tone="warn">{aviso}</Alert> : null}
      <Panel>
        <CorpoPainel>
          {passo === 0 ? (
            <>
              <EscolhaCliente {...props} />
              <LabelledField label="Data da posição" hint="Vazio: hoje. Os encargos são calculados até esta data.">
                <Input type="date" value={data} max={hojeLocal()} onChange={(e) => setData(e.target.value)} />
              </LabelledField>
              {d ? <Nota>{`${cab.cliente} · cód. ${cab.codcli} · ${cab.documento} · total ${brl(d.total)}.`}</Nota> : null}
            </>
          ) : d ? (
            <Folha justificado>
              <TituloDaFolha>Demonstrativo atualizado do débito</TituloDaFolha>
              <Nota>{`${cab.cliente} · ${cab.documento} · cobrança ${(CARTEIRA_NOME[cab.carteira] ?? cab.carteira ?? '').toLowerCase()} · posição em ${fmtData(cab.data)}`}</Nota>
              {(d.linhas ?? []).length ? <TabelaDebito d={d} rotulos={d.rotulos} /> : <Dash />}
              <Nota>Critérios: juros simples pro rata die sobre o principal vencido. Valores sujeitos a conferência pelo Jurídico na data do ajuizamento.</Nota>
            </Folha>
          ) : null}
        </CorpoPainel>
        <Faixa embaixo>
          <Button variant="ghost" disabled={passo === 0} onClick={() => setPasso(0)}>Voltar</Button>
          {passo === 0
            ? <Button variant="primary" disabled={!d} onClick={() => setPasso(1)}>Conferido, próximo</Button>
            : <Button variant="primary" disabled={!d || !num(d.total)} onClick={pdf}>Imprimir / PDF</Button>}
        </Faixa>
      </Panel>
    </>
  );
}
