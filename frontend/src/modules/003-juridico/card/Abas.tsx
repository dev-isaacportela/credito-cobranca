// Abas extras do card do processo (T-213): "Processo completo" (a ficha editável, todos os andamentos, os custos com
// remoção, o vínculo do cliente e a conferência da carga) e "Cobrança de origem" (a situação do cliente na cobrança).

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import {
  Alert, Button, Code, Dash, EmptyState, Evento, Ficha as Pares, GradeCampos, Input, ItemFicha, LabelledField,
  LinhaDoTempo, Marcar, Nota, Pagination, SelectMenu, Status, Subtitulo, Table, Td, Textarea, Th, Tr,
} from '@/components/page';
import { brl, CARTEIRA_NOME, num, rotuloCusto, useDados, useGravar, type Linha } from '../comum';
import { recarregarFicha, useFicha, type Ficha } from '../ficha';
import { BuscaCliente } from '../BuscaCliente';

const FORMAS = [{ value: '', label: 'Não informada' }, { value: 'PESSOAL', label: 'Pessoal' }, { value: 'EDITAL', label: 'Por edital' }, { value: 'CURADOR', label: 'Curador especial' }];
const SENTENCAS = [{ value: '', label: 'Sem sentença' }, { value: 'FAVORAVEL', label: 'Favorável' }, { value: 'PARCIAL', label: 'Parcial' }, { value: 'DESFAVORAVEL', label: 'Desfavorável' }];
const LINHAS = [{ value: 'DEMAIS', label: 'Demais linhas' }, { value: 'GALDERMA', label: 'Galderma' }];
const POR_PAGINA = 20;

export function AbaProcessoCompleto(ctx: ExtensaoContexto) {
  const { ficha, erro } = useFicha(ctx.card.id);
  if (erro) return <Alert tone="error">{erro}</Alert>;
  if (!ficha) return <Nota>Carregando o processo…</Nota>;
  const recarregar = async () => { await recarregarFicha(ctx.card.id); await ctx.recarregar(); };
  return <ProcessoCompleto key={ficha.processo.ID} ficha={ficha} travado={ctx.travado} onAlterado={recarregar} avisar={ctx.avisar} />;
}

function ProcessoCompleto({ ficha, travado, onAlterado, avisar }: {
  ficha: Ficha; travado: boolean; onAlterado: () => Promise<void>; avisar: ExtensaoContexto['avisar'];
}) {
  const { processo: pr, cliente } = ficha;
  const { gravar, gravando, erro } = useGravar();
  const inicial = {
    autos: pr.AUTOS ?? '', tribunal: pr.TRIBUNAL ?? '', filial: pr.FILIAL ?? '', linha: pr.LINHA === 'GALDERMA' ? 'GALDERMA' : 'DEMAIS',
    responsavelId: String(pr.RESPONSAVEL_ID ?? ''), status: pr.STATUS ?? '', prazo: pr.PRAZO ?? '', prazoDescricao: pr.PRAZO_DESCRICAO ?? '',
    substabelecer: !!Number(pr.SUBSTABELECER), formaCitacao: pr.FORMA_CITACAO ?? '', resultadoSentenca: pr.RESULTADO_SENTENCA ?? '',
    recuperadoInformado: pr.RECUPERADO_INFORMADO === null || pr.RECUPERADO_INFORMADO === undefined ? '' : String(pr.RECUPERADO_INFORMADO),
    valor: String(pr.VALOR ?? ''), obs: pr.OBS ?? '',
  };
  const [f, setF] = useState(inicial);
  const [vincular, setVincular] = useState(false);
  const [pagina, setPagina] = useState(1);
  const membros = useDados(() => linhas('ccBaseMembroListar', { cargo: 'JURIDICO', ativo: 1, busca: '', limite: 50, offset: 0 }), 'jur');
  const filiais = useDados(() => linhas('ccJurFilialCredoraListar', { ativa: 1 }), 'filiais');
  const andamentos = useDados(() => Promise.all([
    linhas('ccJurAndamentoListar', { processoId: pr.ID, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
    linhas('ccJurAndamentoTotal', { processoId: pr.ID }),
  ]), `${pr.ID}:${pagina}:${ficha.andamentos[0]?.ID ?? 0}`);
  const totalAnd = num(andamentos.dados?.[1]?.[0]?.TOTAL);
  const pode = !!ficha.pode.editar;
  const sem = pode ? undefined : 'Sem permissão: só o Jurídico edita o processo.';
  const n = (t: string) => Number(String(t).replace(',', '.')) || 0;

  async function salvar() {
    const r = await gravar('ccJurProcessoSalvar', {
      processoId: pr.ID, ...f, responsavelId: Number(f.responsavelId) || 0, substabelecer: f.substabelecer ? 1 : 0,
      valor: n(f.valor), recuperadoInformado: n(f.recuperadoInformado),
    });
    if (r) { avisar('success', r.alterados ? `Processo salvo (${r.alterados} campo(s)).` : 'Nada mudou.'); await onAlterado(); }
  }
  async function vincularCliente(c: Linha) {
    const r = await gravar('ccJurProcessoVincularCliente', { processoId: pr.ID, clienteId: Number(c.ID) });
    if (r) { setVincular(false); avisar('success', `Processo vinculado a ${c.NOME}.`); await onAlterado(); }
  }
  async function conferir() {
    const r = await gravar('ccJurCargaConferir', { processoId: pr.ID });
    if (r) { avisar('success', 'Pendência da carga conferida.'); await onAlterado(); }
  }
  async function removerCusto(c: Linha) {
    const motivo = window.prompt(`Remover o custo "${rotuloCusto(c.TIPO)}" de ${brl(c.VALOR)}? Escreva o motivo.`);
    if (!motivo?.trim()) return;
    const r = await gravar('ccJurCustoRemover', { custoId: Number(c.ID), motivo });
    if (r) { avisar('success', 'Custo removido.'); await onAlterado(); }
  }

  return (
    <>
      <Subtitulo extra={`origem: ${pr.ORIGEM === 'CARGA' ? 'carga inicial' : pr.ORIGEM === 'MANUAL' ? 'manual' : 'cobrança'}`}>Devedor</Subtitulo>
      <Pares>
        <ItemFicha rotulo="Nome">{pr.NOME_DEVEDOR}</ItemFicha>
        <ItemFicha rotulo="Cliente da base">{cliente ? `${cliente.NOME} · cód. ${cliente.CODCLI}` : <Status tone="attention">Sem vínculo</Status>}</ItemFicha>
        <ItemFicha rotulo="CNPJ/CPF">{pr.DOCUMENTO || <Dash />}</ItemFicha>
        <ItemFicha rotulo="Carteira">{CARTEIRA_NOME[pr.CARTEIRA] ?? pr.CARTEIRA}</ItemFicha>
        <ItemFicha rotulo="Endereço">{cliente?.ENDERECO || <Dash />}</ItemFicha>
        <ItemFicha rotulo="Recuperado">{brl(pr.RECUPERADO) || <Dash />}</ItemFicha>
      </Pares>
      {pr.SUGESTAO_CLIENTES ? <Alert tone="info">Sugestão da carga: {pr.SUGESTAO_CLIENTES}</Alert> : null}
      {pr.ALERTA_CARGA && !pr.CARGA_CONFERIDA_EM ? (
        <Alert tone="warn">
          Carga: {pr.ALERTA_CARGA}{' '}
          <Button size="sm" disabled={!pode || gravando || travado} title={sem} onClick={conferir}>Marcar conferido</Button>
        </Alert>
      ) : null}
      <Button size="sm" variant="secondary" disabled={!pode || travado} title={sem} onClick={() => setVincular(!vincular)}>
        {cliente ? 'Trocar cliente vinculado' : 'Vincular cliente'}
      </Button>
      {vincular ? <BuscaCliente setor={pr.CARTEIRA === 'PUBLICA' ? 'PUBLICO' : ''} rotulo="Vincular" desabilitado={gravando} onEscolher={vincularCliente} /> : null}

      <Subtitulo>Dados do processo</Subtitulo>
      <GradeCampos>
        <LabelledField label="Número dos autos" hint="Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO">
          <Input value={f.autos} disabled={!pode} onChange={(e) => setF({ ...f, autos: e.target.value })} />
        </LabelledField>
        <LabelledField label="Tribunal">
          <Input value={f.tribunal} disabled={!pode} onChange={(e) => setF({ ...f, tribunal: e.target.value })} />
        </LabelledField>
        <LabelledField label="Filial credora">
          <SelectMenu label="Filial credora" value={f.filial} disabled={!pode} onChange={(filial) => setF({ ...f, filial })}
            options={[...(filiais.dados ?? []).map((x) => ({ value: String(x.CODIGO), label: `${x.CODIGO} · ${x.CIDADE_UF}` })),
              ...(f.filial && !(filiais.dados ?? []).some((x) => String(x.CODIGO) === f.filial) ? [{ value: f.filial, label: f.filial }] : [])]} />
        </LabelledField>
        <LabelledField label="Linha">
          <SelectMenu label="Linha" value={f.linha} disabled={!pode} options={LINHAS} onChange={(linha) => setF({ ...f, linha })} />
        </LabelledField>
        <LabelledField label="Responsável">
          <SelectMenu label="Responsável" value={f.responsavelId} disabled={!pode} onChange={(responsavelId) => setF({ ...f, responsavelId })}
            options={(membros.dados ?? []).map((m) => ({ value: String(m.ID), label: m.NOME }))} />
        </LabelledField>
        <LabelledField label="Valor em cobrança (R$)">
          <Input inputMode="decimal" value={f.valor} disabled={!pode} onChange={(e) => setF({ ...f, valor: e.target.value })} />
        </LabelledField>
        <LabelledField label="Prazo">
          <Input type="date" value={f.prazo} disabled={!pode} onChange={(e) => setF({ ...f, prazo: e.target.value })} />
        </LabelledField>
        <LabelledField label="O que vence no prazo">
          <Input value={f.prazoDescricao} disabled={!pode} onChange={(e) => setF({ ...f, prazoDescricao: e.target.value })} />
        </LabelledField>
        <LabelledField label="Forma de citação">
          <SelectMenu label="Forma de citação" value={f.formaCitacao} disabled={!pode} options={FORMAS} onChange={(formaCitacao) => setF({ ...f, formaCitacao })} />
        </LabelledField>
        <LabelledField label="Resultado da sentença">
          <SelectMenu label="Resultado da sentença" value={f.resultadoSentenca} disabled={!pode} options={SENTENCAS}
            onChange={(resultadoSentenca) => setF({ ...f, resultadoSentenca })} />
        </LabelledField>
        <LabelledField label="Recuperado informado (R$)" hint="Valor recuperado fora de acordo (penhora, depósito).">
          <Input inputMode="decimal" value={f.recuperadoInformado} disabled={!pode} onChange={(e) => setF({ ...f, recuperadoInformado: e.target.value })} />
        </LabelledField>
      </GradeCampos>
      <Marcar checked={f.substabelecer} disabled={!pode} onChange={(substabelecer) => setF({ ...f, substabelecer })}>Substabelecimento pendente</Marcar>
      <LabelledField label="Situação atual">
        <Textarea rows={2} value={f.status} disabled={!pode} onChange={(e) => setF({ ...f, status: e.target.value })} />
      </LabelledField>
      <LabelledField label="Observações">
        <Textarea rows={3} value={f.obs} disabled={!pode} onChange={(e) => setF({ ...f, obs: e.target.value })} />
      </LabelledField>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <div>
        <Button variant="primary" disabled={!pode || gravando || travado} title={sem} onClick={salvar}>Salvar processo</Button>
      </div>

      <Subtitulo extra={`${totalAnd} no total`}>Andamentos</Subtitulo>
      {andamentos.erro ? <Alert tone="error">{andamentos.erro}</Alert> : null}
      {andamentos.dados?.[0].length ? (
        <LinhaDoTempo>
          {andamentos.dados[0].map((a) => (
            <Evento key={a.ID} meta={`${fmtDataHora(a.EM)} · ${a.AUTOR_NOME || 'carga inicial'}${a.PERIODO ? ` · ${a.PERIODO}` : ''}`}>{a.TEXTO}</Evento>
          ))}
        </LinhaDoTempo>
      ) : <Nota>{andamentos.carregando ? 'Carregando…' : 'Nenhum andamento.'}</Nota>}
      {totalAnd > POR_PAGINA ? (
        <Pagination page={pagina} lastPage={Math.ceil(totalAnd / POR_PAGINA)} total={totalAnd} unit="andamentos" busy={andamentos.carregando}
          onPrevious={() => setPagina(pagina - 1)} onNext={() => setPagina(pagina + 1)} />
      ) : null}

      <Subtitulo extra={`${brl(ficha.custoResumo.total) || 'R$ 0,00'} · ${brl(ficha.custoResumo.aPagar) || 'R$ 0,00'} a pagar`}>Custos</Subtitulo>
      {ficha.custos.length ? (
        <Table>
          <thead><tr><Th>Tipo</Th><Th>Data</Th><Th numeric>Valor</Th><Th>Situação</Th><Th>Documentos</Th><Th /></tr></thead>
          <tbody>
            {ficha.custos.map((c) => (
              <Tr key={c.ID}>
                <Td>{rotuloCusto(c.TIPO)}{c.OBS ? <Nota>{c.OBS}</Nota> : null}</Td>
                <Td>{fmtData(c.DATA)}</Td>
                <Td numeric>{brl(c.VALOR)}</Td>
                <Td><Status tone={Number(c.PAGO) ? 'live' : 'attention'}>{Number(c.PAGO) ? 'Pago' : 'A pagar'}</Status></Td>
                <Td>
                  {c.guia ? <a href={c.guia.url} target="_blank" rel="noreferrer"><Code prefix="guia ">{c.guia.nome}</Code></a> : null}
                  {c.comprovante ? <a href={c.comprovante.url} target="_blank" rel="noreferrer"><Code prefix="comprovante ">{c.comprovante.nome}</Code></a> : null}
                  {!c.guia && !c.comprovante ? <Dash /> : null}
                </Td>
                <Td numeric>
                  <Button size="sm" variant="ghost" disabled={!pode || gravando || travado} title={sem} onClick={() => removerCusto(c)}>Remover</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState title="Nenhum custo lançado." />}
    </>
  );
}

export function AbaCobrancaOrigem(ctx: ExtensaoContexto) {
  const { ficha } = useFicha(ctx.card.id);
  const pr = ficha?.processo;
  const sit = useDados(async () => (pr?.CLIENTE_ID ? linhas('ccCobSituacao', { clienteId: pr.CLIENTE_ID, carteira: '' }) : []), String(pr?.CLIENTE_ID ?? 0));
  if (!ficha || !pr) return <Nota>Carregando…</Nota>;
  if (!pr.CLIENTE_ID) return <EmptyState title="Processo sem cliente vinculado." hint="Vincule o cliente em Processo completo para ver a cobrança." />;
  return (
    <>
      {sit.erro ? <Alert tone="error">{sit.erro}</Alert> : null}
      {(sit.dados ?? []).map((c) => (
        <Pares key={c.COBRANCA_ID}>
          <ItemFicha rotulo="Carteira">{CARTEIRA_NOME[c.CARTEIRA] ?? c.CARTEIRA}</ItemFicha>
          <ItemFicha rotulo="Fase na cobrança">{c.FASE_NOME || <Dash />}</ItemFicha>
          <ItemFicha rotulo="Vencido">{brl(c.VENCIDO) || <Dash />}</ItemFicha>
          <ItemFicha rotulo="Dias de atraso">{c.DIAS_ATRASO}</ItemFicha>
          <ItemFicha rotulo="Enviado ao Jurídico">{c.JURIDICO_EM ? fmtData(c.JURIDICO_EM) : <Dash />}</ItemFicha>
          <ItemFicha rotulo="Bloqueio">{c.BLOQUEIO_APLICADO || c.BLOQUEIO_DEVIDO || <Dash />}</ItemFicha>
        </Pares>
      ))}
      {sit.dados && !sit.dados.length ? <EmptyState title="Sem cobrança aberta para este cliente." hint="A cobrança foi encerrada ou o cliente não está em nenhuma carteira." /> : null}
    </>
  );
}
