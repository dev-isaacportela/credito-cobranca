// Carga inicial da planilha do escritório (T-222, opção C "Passo a passo"): arquivo → leitura por aba → vínculo com
// clientes → pendências → aplicar e concluir. A planilha é lida no navegador (planilha.ts + carga.ts); o servidor
// refaz chave, vínculo e etapa (ccJurCargaPrevia, até 5 por chamada) e grava 1 processo por chamada
// (ccJurCargaAplicar), no máximo 10 por minuto, com progresso e pausa. Nada é gravado antes do último passo.
// C-023: devedor com dois candidatos pelo nome — a pessoa escolhe um deles ou busca "Outro".

import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';
import { acao } from '@/lib/mitra-api';
import { interpretar, paraServidor, type ProcessoInterpretado, type ResumoAba } from '@/lib/juridico/carga';
import { leitorInstalado, lerPlanilha } from '@/lib/juridico/planilha';
import {
  Alert, Button, Code, CorpoPainel, Dash, Faixa, Input, Item, LabelledField, Linha as Junto, ListaItens, Nota,
  PageHeader, Panel, PanelHeader, Passos, Pilha, Progresso, Resto, RowMeta, RowTitle, Status, Table, Td, Th, Tr,
} from '@/components/page';
import { BuscaCliente } from './BuscaCliente';
import { brl, ehJur, erroDe, nomeCurto } from './comum';

const POR_MINUTO = 10;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Previa { acao: string; alertas: string[]; candidatos: { clienteId: number; codcli: number; nome: string; motivo: string; semelhanca: number }[] }
interface Escolha { clienteId: number; nome: string; como: 'CODIGO' | 'CONFIRMADO' | 'ESCOLHIDO' | 'OUTRO' | '' }
interface Aplicado { ok: boolean; texto: string }

export default function CargaPassos() {
  const membro = useOutletContext<MembroSessao>();
  const pode = ehJur(membro);
  const adm = podeAdministrar(membro);
  const [passo, setPasso] = useState(0);
  const [arquivo, setArquivo] = useState('');
  const [processos, setProcessos] = useState<ProcessoInterpretado[]>([]);
  const [abas, setAbas] = useState<ResumoAba[]>([]);
  const [previas, setPrevias] = useState<Record<string, Previa>>({});
  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>({});
  const [outro, setOutro] = useState('');
  const [aplicados, setAplicados] = useState<Record<string, Aplicado>>({});
  const [rodando, setRodando] = useState(false);
  const pausar = useRef(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const sem = pode ? undefined : 'A carga inicial é do Jurídico e de quem administra.';

  async function ler(f: File | undefined) {
    if (!f) return;
    setErro(''); setOk('');
    try {
      const r = interpretar(await lerPlanilha(f));
      setArquivo(f.name); setProcessos(r.processos); setAbas(r.abas); setPrevias({}); setEscolhas({}); setAplicados({});
      setPasso(1);
    } catch (e) {
      setErro(erroDe(e));
    }
  }

  async function preparar() {
    setErro('');
    try {
      const novas: Record<string, Previa> = {};
      const esc: Record<string, Escolha> = {};
      for (let i = 0; i < processos.length; i += 5) {
        const lote = processos.slice(i, i + 5);
        const r = await acao('ccJurCargaPrevia', { linhas: JSON.stringify(lote.map((p) => paraServidor(p))) });
        if (r.ok === false) throw new Error(String(r.error));
        (r.linhas as Previa[]).forEach((pv, j) => {
          const p = lote[j];
          novas[p.chave] = pv;
          const porCodigo = pv.candidatos.find((c) => c.motivo === 'CODIGO');
          esc[p.chave] = porCodigo ? { clienteId: porCodigo.clienteId, nome: porCodigo.nome, como: 'CODIGO' } : { clienteId: 0, nome: '', como: '' };
        });
      }
      setPrevias(novas); setEscolhas(esc); setPasso(2);
    } catch (e) {
      setErro(erroDe(e));
    }
  }

  const pendencias = processos.flatMap((p) => {
    const pv = previas[p.chave];
    const e = escolhas[p.chave];
    const l: string[] = [];
    if (pv?.acao === 'IGNORA') return [];
    if (!e?.clienteId) l.push(pv?.candidatos.length ? 'sugestão de cliente a confirmar' : 'sem cliente');
    if (p.divergencia) l.push(p.divergencia);
    l.push(...(pv?.alertas ?? []));
    if (p.acordo?.parcelas.some((x) => x.situacao === 'A_CONFIRMAR')) l.push('parcela com cor fora da legenda, entra "a confirmar"');
    return l.map((t) => `${p.nomeDevedor}: ${t}`);
  });

  async function aplicar() {
    setRodando(true); pausar.current = false; setErro('');
    const minimo = 60000 / POR_MINUTO;
    for (const p of processos) {
      if (pausar.current) break;
      if (aplicados[p.chave]?.ok || previas[p.chave]?.acao === 'IGNORA') continue;
      const inicio = performance.now();
      let res: Aplicado;
      try {
        const r = await acao('ccJurCargaAplicar', { linhas: JSON.stringify([paraServidor(p, escolhas[p.chave]?.clienteId ?? 0)]) });
        res = r.ok === false ? { ok: false, texto: String(r.error) } : { ok: true, texto: r.acao === 'IGNORA' ? 'já gravado' : r.acao === 'NOVO' ? 'gravado' : 'completado' };
      } catch (e) {
        res = { ok: false, texto: erroDe(e) };
      }
      setAplicados((a) => ({ ...a, [p.chave]: res }));
      const resto = minimo - (performance.now() - inicio);
      if (resto > 0 && !pausar.current) await espera(resto);
    }
    setRodando(false);
  }

  async function concluir() {
    if (!window.confirm('Concluir a carga é definitivo: nenhuma nova carga será aceita. Concluir?')) return;
    try {
      const r = await acao('ccJurCargaConcluir', {});
      if (r.ok === false) setErro(String(r.error)); else setOk('Carga inicial concluída.');
    } catch (e) {
      setErro(erroDe(e));
    }
  }

  const aGravar = processos.filter((p) => previas[p.chave]?.acao !== 'IGNORA');
  const feitos = aGravar.filter((p) => aplicados[p.chave]?.ok).length;
  const decididos = processos.filter((p) => escolhas[p.chave]?.clienteId).length;
  const etapas = Object.entries(processos.reduce<Record<string, number>>((s, p) => ({ ...s, [p.faseChave]: (s[p.faseChave] ?? 0) + 1 }), {}))
    .map(([f, n]) => `${n} em ${nomeCurto(f)}`).join(', ');

  return (
    <Pilha>
      <PageHeader module="Administração · Jurídico" title="Carga inicial da planilha do escritório"
        description="Leitura única da planilha de cinco abas. Nada é gravado antes do último passo." />
      <Passos atual={passo} onEscolher={setPasso} passos={[
        { titulo: 'Arquivo', resumo: arquivo || 'escolha o .xlsx' },
        { titulo: 'Leitura por aba', resumo: processos.length ? `${abas.length} abas · ${processos.length} processos` : undefined, liberado: !!processos.length },
        { titulo: 'Vínculo com clientes', resumo: Object.keys(previas).length ? `${decididos} vinculados · ${processos.length - decididos} a decidir` : undefined, liberado: !!Object.keys(previas).length },
        { titulo: 'Pendências', resumo: Object.keys(previas).length ? `${pendencias.length} no relatório` : undefined, liberado: !!Object.keys(previas).length },
        { titulo: 'Aplicar e concluir', resumo: 'grava e encerra a carga', liberado: !!Object.keys(previas).length },
      ]} />
      {!pode ? <Alert tone="warn">{sem}</Alert> : null}
      {!leitorInstalado() ? <Alert tone="warn">A leitura de planilha (.xlsx) ainda não está instalada neste ambiente.</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      <Panel>
        {passo === 0 ? (
          <CorpoPainel>
            <LabelledField label="Planilha do escritório (.xlsx)" hint="As cinco abas: Acompanhamento - Jurídico, Específicos, Extrajudicial, Processos e ACORDOS.">
              <Input type="file" accept=".xlsx" disabled={!pode || !leitorInstalado()} onChange={(e) => ler(e.target.files?.[0])} />
            </LabelledField>
          </CorpoPainel>
        ) : passo === 1 ? (
          <>
            <PanelHeader title="2 · Leitura por aba" hint={etapas ? `Etapas sugeridas: ${etapas}.` : undefined} />
            <Table>
              <thead><tr><Th>Aba</Th><Th numeric>Linhas</Th><Th>Resultado</Th></tr></thead>
              <tbody>{abas.map((a) => <Tr key={a.aba}><Td>{a.aba}</Td><Td numeric>{a.linhas}</Td><Td>{a.resultado}</Td></Tr>)}</tbody>
            </Table>
            <Faixa embaixo>
              <Button variant="ghost" onClick={() => setPasso(0)}>Trocar arquivo</Button>
              <Button variant="primary" disabled={!pode} title={sem} onClick={preparar}>Conferir com o cadastro</Button>
            </Faixa>
          </>
        ) : passo === 2 ? (
          <>
            <PanelHeader title="3 · Vínculo com clientes" hint="vale o código do cliente ou o CNPJ/CPF; o nome só sugere" />
            <Table>
              <thead><tr><Th>Na planilha</Th><Th>No cadastro</Th><Th>Como</Th><Th /></tr></thead>
              <tbody>
                {processos.map((p) => {
                  const pv = previas[p.chave];
                  const e = escolhas[p.chave] ?? { clienteId: 0, nome: '', como: '' };
                  const porNome = (pv?.candidatos ?? []).filter((c) => c.motivo === 'NOME');
                  const marcar = (x: Escolha) => setEscolhas({ ...escolhas, [p.chave]: x });
                  return (
                    <Tr key={p.chave}>
                      <Td><RowTitle>{p.nomeDevedor}</RowTitle><RowMeta>{`${p.codcli ? `cód. ${p.codcli}` : 'sem código'} · ${brl(p.valor)}`}</RowMeta></Td>
                      <Td>
                        {e.clienteId ? e.nome : porNome.length ? (
                          <ListaItens>
                            {porNome.map((c) => (
                              <Item key={c.clienteId}>
                                <Resto>{`${c.nome} · cód. ${c.codcli} · semelhança ${c.semelhanca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</Resto>
                                <Button size="sm" onClick={() => marcar({ clienteId: c.clienteId, nome: c.nome, como: porNome.length > 1 ? 'ESCOLHIDO' : 'CONFIRMADO' })}>
                                  {porNome.length > 1 ? 'Escolher' : 'Confirmar'}
                                </Button>
                              </Item>
                            ))}
                          </ListaItens>
                        ) : <Nota>{p.codcli ? `código ${p.codcli} não encontrado; sem nome parecido` : 'sem nome parecido'}</Nota>}
                        {outro === p.chave ? (
                          <BuscaCliente rotulo="Vincular" onEscolher={(c) => { marcar({ clienteId: Number(c.ID), nome: c.NOME, como: 'OUTRO' }); setOutro(''); }} />
                        ) : null}
                      </Td>
                      <Td>
                        {pv?.acao === 'IGNORA' ? <Status tone="off">Já gravado</Status>
                          : e.como === 'CODIGO' ? <Status tone="live">Pelo código</Status>
                            : e.clienteId ? <Status tone="live">{e.como === 'OUTRO' ? 'Escolhido na busca' : 'Confirmado'}</Status>
                              : porNome.length > 1 ? <Status tone="attention">{`${porNome.length} candidatos pelo nome`}</Status>
                                : porNome.length ? <Status tone="attention">Sugestão a confirmar</Status> : <Status tone="alert">Sem cliente</Status>}
                      </Td>
                      <Td numeric>
                        {e.clienteId && e.como !== 'CODIGO' ? <Button size="sm" variant="ghost" onClick={() => marcar({ clienteId: 0, nome: '', como: '' })}>Desfazer</Button> : null}
                        {e.como !== 'CODIGO' && pv?.acao !== 'IGNORA' ? (
                          <Button size="sm" variant="ghost" onClick={() => setOutro(outro === p.chave ? '' : p.chave)}>{porNome.length ? 'Outro' : 'Vincular'}</Button>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Faixa embaixo>
              <Nota>Quem ficar sem cliente entra como pendência e só aparece para quem vê todos os processos.</Nota>
              <Junto>
                <Button variant="ghost" onClick={() => setPasso(1)}>Voltar</Button>
                <Button variant="primary" onClick={() => setPasso(3)}>Continuar para pendências</Button>
              </Junto>
            </Faixa>
          </>
        ) : passo === 3 ? (
          <>
            <PanelHeader title={`4 · Pendências que virão · ${pendencias.length}`} hint="ficam no processo para conferir depois (Processo completo › Marcar conferido)" />
            <ListaItens>
              {pendencias.map((t, i) => <Item key={i}><Resto>{t}</Resto></Item>)}
              {!pendencias.length ? <Item><Resto>Nenhuma pendência.</Resto></Item> : null}
            </ListaItens>
            <Faixa embaixo>
              <Button variant="ghost" onClick={() => setPasso(2)}>Voltar</Button>
              <Button variant="primary" onClick={() => setPasso(4)}>Continuar para aplicar</Button>
            </Faixa>
          </>
        ) : (
          <>
            <PanelHeader title="5 · Aplicar e concluir"
              hint={`Aplicar grava os ${aGravar.length} processos com andamentos e acordos, um por vez (até ${POR_MINUTO} por minuto); repetir não duplica. Concluir é definitivo.`} />
            <CorpoPainel>
              <Progresso valor={feitos} total={aGravar.length} rotulo="Processos gravados" />
              <Nota>{`${feitos} de ${aGravar.length} gravados.`}</Nota>
              <Table>
                <thead><tr><Th>Processo</Th><Th>Etapa</Th><Th>Resultado</Th></tr></thead>
                <tbody>
                  {processos.map((p) => {
                    const a = aplicados[p.chave];
                    return (
                      <Tr key={p.chave}>
                        <Td><RowTitle>{p.nomeDevedor}</RowTitle><RowMeta>{p.autos || 'sem autos'}</RowMeta></Td>
                        <Td><Code>{nomeCurto(p.faseChave)}</Code></Td>
                        <Td>{previas[p.chave]?.acao === 'IGNORA' ? <Status tone="off">Já gravado</Status>
                          : a ? <Status tone={a.ok ? 'live' : 'alert'}>{a.texto}</Status> : <Dash />}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </CorpoPainel>
            <Faixa embaixo>
              <Junto>
                <Button variant="ghost" disabled={rodando} onClick={() => setPasso(3)}>Voltar</Button>
                {rodando
                  ? <Button variant="secondary" onClick={() => { pausar.current = true; }}>Pausar</Button>
                  : <Button variant="primary" disabled={!pode || feitos === aGravar.length} title={sem} onClick={aplicar}>{feitos ? 'Continuar aplicando' : 'Aplicar'}</Button>}
              </Junto>
              <Button variant="danger" disabled={!adm || rodando} title={adm ? undefined : 'Só o Gerente financeiro (ou acima) ou quem administra conclui a carga.'}
                onClick={concluir}>Concluir a carga</Button>
            </Faixa>
          </>
        )}
      </Panel>
    </Pilha>
  );
}
