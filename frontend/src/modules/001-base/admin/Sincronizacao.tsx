/**
 * /admin/sincronizacao — opção `adm-sincronizacao` B "Linha do tempo" com o pedido "a+b" do usuário
 * (telas-07-adm-operacao.html): os quatro números e a tabela de leituras da A, mais a faixa do dia (um
 * traço por leitura) e a leitura marcada da B. "Ler agora" desabilitado com pedido pendente (C-006).
 * Bloco "Conferir campos do Winthor" (não desenhado, RF-050) só para quem administra.
 */
import { useState } from 'react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import { podeAdministrar } from '@/lib/base/menu';
import { situacaoDaPosicao } from '@/lib/base/posicao';
import { somarDias } from '@/lib/base/dias-uteis';
import { contarLeituras, diaDaSemana, duracao, faixaDoDia, proximaLeitura } from '@/lib/base/telas';
import {
  Alert, Button, CorpoPainel, Dash, EmptyState, Ficha, Field, Grade, GradeKpi, ItemFicha, Kpi, LegendaPulso,
  Linha as LinhaUi, MetaDot, Nota, PageHeader, Pagination, Panel, PanelHeader, Pilha, Pulsos, Regua, RowMeta,
  SelectMenu, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { motivo, nivelDois, useDados, useMembro } from '../comum';

type Linha = Record<string, unknown>;
const POR_PAGINA = 20;
const n = (v: unknown) => Number(v ?? 0);
const hora = (iso: unknown) => /[T ](\d{2}:\d{2})/.exec(String(iso ?? ''))?.[1] ?? '';
const SITUACAO: Record<string, { tom: 'live' | 'alert' | 'attention'; texto: string }> = {
  OK: { tom: 'live', texto: 'Concluída' },
  ERRO: { tom: 'alert', texto: 'Erro' },
  EM_ANDAMENTO: { tom: 'attention', texto: 'Em andamento' },
  SOLICITADA: { tom: 'attention', texto: 'Pedida' },
};
const situacao = (s: unknown) => SITUACAO[String(s)] ?? { tom: 'attention' as const, texto: String(s) };
const numero = (v: unknown) => (n(v) ? n(v).toLocaleString('pt-BR') : <Dash />);

export default function Sincronizacao() {
  const membro = useMembro();
  const admin = podeAdministrar(membro);
  const [dia, setDia] = useState('');
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [marcada, setMarcada] = useState(0);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);

  const status = useDados(() => linha('ccBaseSincronizacaoStatus'), 'status');
  const st = status.dados;
  // "Hoje" é o dia da última leitura registrada no servidor (relógio único), nunca o do navegador.
  const hoje = String(st?.INICIO ?? st?.ULTIMA_OK_EM ?? '').slice(0, 10);
  const diaVisto = dia || hoje;

  const doDia = useDados(async () => {
    if (!diaVisto) return { lista: [] as Linha[], total: null };
    const [lista, total] = await Promise.all([
      linhas('ccBaseSincronizacaoListar', { dia: diaVisto, situacao: '', limite: 300, offset: 0 }),
      linha('ccBaseSincronizacaoTotal', { dia: diaVisto, situacao: '' }),
    ]);
    return { lista, total };
  }, `${diaVisto}|${status.carregando}`);

  const leituras = doDia.dados?.lista ?? [];
  const conta = contarLeituras(leituras);
  const intervalo = n(st?.INTERVALO_MIN) || 15;
  const posicao = situacaoDaPosicao({ minutosDesde: st?.MINUTOS_DESDE, intervaloMin: st?.INTERVALO_MIN });
  const escolhida = leituras.find((l) => n(l.ID) === marcada) ?? leituras[0];
  const filtradas = leituras.filter((l) => !filtro || l.SITUACAO === filtro);
  const pagina_ = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const pendente = n(st?.PEDIDO_PENDENTE) === 1;
  const ultimaOk = leituras.find((l) => l.SITUACAO === 'OK');

  async function lerAgora() {
    setAviso(null);
    try {
      const r = await acao('ccBaseSincronizacaoPedir');
      if (r.ok === false) return setAviso({ tom: 'error', texto: motivo(r) });
      setAviso({ tom: 'success', texto: 'Leitura pedida: é atendida na próxima verificação da rotina (até 5 minutos).' });
      status.reler();
    } catch (e) {
      setAviso({ tom: 'error', texto: motivo(e) });
    }
  }

  const irPara = (d: string) => {
    setDia(d === hoje ? '' : d);
    setMarcada(0);
    setPagina(1);
  };

  return (
    <>
      <PageHeader
        module="Administração"
        title="Sincronização com o Winthor"
        description="A leitura atualiza clientes, posição e recebimentos. Nada é gravado no Winthor."
        meta={st ? (
          <>
            {posicao === 'atual' ? <Status tone="live">Posição atual</Status> : <Status tone="attention">{posicao === 'nunca' ? 'Posição nunca lida' : 'Posição desatualizada'}</Status>}
            <MetaDot />
            <span>{st.ULTIMA_OK_EM ? `última leitura concluída em ${fmtDataHora(String(st.ULTIMA_OK_EM))}, há ${n(st.MINUTOS_DESDE)} min` : 'nenhuma leitura concluída'}</span>
            {st.ULTIMA_OK_EM ? <><MetaDot /><span>próxima às {proximaLeitura(st.ULTIMA_OK_EM, intervalo)}</span></> : null}
          </>
        ) : undefined}
        actions={
          <Button variant="primary" onClick={lerAgora} disabled={!nivelDois(membro) || pendente} title={pendente ? 'Já há um pedido pendente' : undefined}>
            {pendente ? 'Leitura pedida' : 'Ler agora'}
          </Button>
        }
      />
      <Pilha>
        {status.erro ? <Alert tone="error">{status.erro}</Alert> : null}
        {!admin ? <Alert tone="info">A lista de leituras é de quem administra; aqui aparece só a situação.</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <GradeKpi>
          <Kpi rotulo="Última leitura concluída" valor={st?.ULTIMA_OK_EM ? hora(st.ULTIMA_OK_EM) : <Dash />} hint={ultimaOk ? `começou às ${hora(ultimaOk.INICIO)} · ${duracao(ultimaOk.INICIO, ultimaOk.FIM)}` : undefined} />
          <Kpi rotulo="Próxima leitura" valor={proximaLeitura(st?.ULTIMA_OK_EM, intervalo) || <Dash />} hint={`intervalo de ${intervalo} minutos`} />
          <Kpi rotulo={diaVisto === hoje ? 'Leituras hoje' : 'Leituras no dia'} valor={conta.total} hint={conta.erro ? `${conta.erro} com erro` : 'nenhuma com erro'} />
          <Kpi rotulo="Clientes novos no dia" valor={n(doDia.dados?.total?.CLIENTES_NOVOS)} />
        </GradeKpi>
        <Panel>
          <PanelHeader title={diaVisto ? `${diaDaSemana(diaVisto).replace(/^./, (c) => c.toUpperCase())}, ${fmtData(diaVisto)}` : 'Leituras do dia'}>
            <Button size="sm" onClick={() => irPara(somarDias(diaVisto, -1))} disabled={!diaVisto}>Dia anterior</Button>
            <Button size="sm" onClick={() => irPara(somarDias(diaVisto, 1))} disabled={!diaVisto || diaVisto >= hoje}>Dia seguinte</Button>
          </PanelHeader>
          <CorpoPainel>
            <LinhaUi>
              <LegendaPulso tom="ok">Concluída · {conta.ok}</LegendaPulso>
              <LegendaPulso tom="erro">Erro · {conta.erro}</LegendaPulso>
              <LegendaPulso tom="andamento">Em andamento ou pedida · {conta.total - conta.ok - conta.erro}</LegendaPulso>
              <LegendaPulso tom="vazio">Sem leitura</LegendaPulso>
            </LinhaUi>
            <Pulsos
              rotulo={`${conta.total} leituras no dia: ${conta.ok} concluídas e ${conta.erro} com erro`}
              pulsos={faixaDoDia(leituras, intervalo)}
              marcado={escolhida ? n(escolhida.ID) : undefined}
              onEscolher={setMarcada}
            />
            <Regua><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></Regua>
          </CorpoPainel>
        </Panel>
        <Grade>
          <Panel>
            {escolhida ? (
              <>
                <PanelHeader title={`Leitura das ${hora(escolhida.INICIO ?? escolhida.SOLICITADA_EM)}`}>
                  <Status tone={situacao(escolhida.SITUACAO).tom}>{situacao(escolhida.SITUACAO).texto}</Status>
                </PanelHeader>
                <CorpoPainel>
                  <Ficha>
                    <ItemFicha rotulo="Início">{escolhida.INICIO ? fmtDataHora(String(escolhida.INICIO)) : <Dash />}</ItemFicha>
                    <ItemFicha rotulo="Fim">{escolhida.FIM ? `${fmtDataHora(String(escolhida.FIM))} · ${duracao(escolhida.INICIO, escolhida.FIM)}` : <Dash />}</ItemFicha>
                    <ItemFicha rotulo="Origem">{escolhida.SOLICITADA_POR_NOME ? `Pedida por ${escolhida.SOLICITADA_POR_NOME}` : 'Automática'}</ItemFicha>
                    <ItemFicha rotulo="Clientes lidos">{numero(escolhida.CLIENTES_LIDOS)}</ItemFicha>
                    <ItemFicha rotulo="Clientes novos">{numero(escolhida.CLIENTES_NOVOS)}</ItemFicha>
                    <ItemFicha rotulo="Posições gravadas">{numero(escolhida.POSICOES_GRAVADAS)}</ItemFicha>
                    <ItemFicha rotulo="Posições zeradas">{numero(escolhida.POSICOES_ZERADAS)}</ItemFicha>
                    <ItemFicha rotulo="Recebimentos novos">{numero(escolhida.RECEBIMENTOS_NOVOS)}</ItemFicha>
                    <ItemFicha rotulo="Estornados">{numero(escolhida.RECEBIMENTOS_ESTORNADOS)}</ItemFicha>
                  </Ficha>
                  {escolhida.ERRO ? <Alert tone="error">{String(escolhida.ERRO)} Nenhuma posição foi alterada por esta leitura.</Alert> : null}
                </CorpoPainel>
              </>
            ) : (
              <EmptyState title={doDia.carregando ? 'Carregando as leituras…' : 'Nenhuma leitura neste dia.'} hint="Clique num traço da faixa para abrir a leitura." />
            )}
          </Panel>
          <ConferirCampos admin={admin} />
        </Grade>
        <Panel>
          <Toolbar>
            <Field label="Situação"><SelectMenu
              label="Situação" value={filtro} onChange={(v) => { setFiltro(v); setPagina(1); }}
              options={[{ value: '', label: 'Todas as situações' }, ...Object.entries(SITUACAO).map(([value, s]) => ({ value, label: s.texto }))]}
            /></Field>
          </Toolbar>
          {doDia.erro ? <CorpoPainel><Alert tone="error">{doDia.erro}</Alert></CorpoPainel> : null}
          {pagina_.length === 0 ? <EmptyState title="Nenhuma leitura com esse filtro neste dia." /> : (
            <>
              <Table>
                <thead><tr><Th>Início</Th><Th>Fim</Th><Th>Situação</Th><Th numeric>Clientes lidos</Th><Th numeric>Novos</Th><Th numeric>Recebimentos novos</Th><Th numeric>Estornados</Th><Th>Erro</Th></tr></thead>
                <tbody>
                  {pagina_.map((l) => (
                    <Tr key={String(l.ID)}>
                      <Td>{hora(l.INICIO ?? l.SOLICITADA_EM) || <Dash />}{l.SOLICITADA_POR_NOME ? <RowMeta>pedida por {String(l.SOLICITADA_POR_NOME)}</RowMeta> : null}</Td>
                      <Td>{hora(l.FIM) || <Dash />}</Td>
                      <Td><Status tone={situacao(l.SITUACAO).tom}>{situacao(l.SITUACAO).texto}</Status></Td>
                      <Td numeric>{numero(l.CLIENTES_LIDOS)}</Td>
                      <Td numeric>{numero(l.CLIENTES_NOVOS)}</Td>
                      <Td numeric>{numero(l.RECEBIMENTOS_NOVOS)}</Td>
                      <Td numeric>{numero(l.RECEBIMENTOS_ESTORNADOS)}</Td>
                      <Td>{l.ERRO ? String(l.ERRO) : <Dash />}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={pagina} lastPage={Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))} total={filtradas.length}
                unit={`${filtradas.length === 1 ? 'leitura' : 'leituras'} em ${fmtData(diaVisto)}`} busy={doDia.carregando}
                onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)}
              />
            </>
          )}
        </Panel>
        <Nota>"Ler agora" é atendido na verificação seguinte (até 5 minutos). Com mais de 2 intervalos sem leitura concluída, a posição vira "desatualizada" aqui e em toda tela que mostra posição.</Nota>
      </Pilha>
    </>
  );
}

/** RF-050: compara as colunas reais das tabelas PC* do Winthor com as que a leitura usa. */
function ConferirCampos({ admin }: { admin: boolean }) {
  const [estado, setEstado] = useState<{ ocupado?: boolean; erro?: string; tabelas?: Linha[] } | null>(null);
  async function conferir() {
    setEstado({ ocupado: true });
    try {
      const r = await acao('ccBaseWinthorDescobrir', { tabelas: '' });
      setEstado(r.ok === false ? { erro: motivo(r) } : { tabelas: r.tabelas ?? [] });
    } catch (e) {
      setEstado({ erro: motivo(e) });
    }
  }
  const tabelas = estado?.tabelas;
  return (
    <Panel>
      <PanelHeader title="Conferir campos do Winthor" hint="As colunas que a leitura usa existem no Winthor?">
        <Button size="sm" onClick={conferir} disabled={!admin || estado?.ocupado}>{tabelas ? 'Conferir de novo' : 'Conferir agora'}</Button>
      </PanelHeader>
      {estado?.erro ? <CorpoPainel><Alert tone="error">{estado.erro}</Alert></CorpoPainel> : null}
      {tabelas ? (
        <Table>
          <thead><tr><Th>Tabela</Th><Th numeric>Colunas no Winthor</Th><Th>Faltando</Th></tr></thead>
          <tbody>
            {tabelas.map((t) => (
              <Tr key={String(t.tabela)}>
                <Td>{String(t.tabela)}</Td>
                <Td numeric>{(t.colunas as string[]).length}</Td>
                <Td>{(t.ausentes as string[]).length ? <Status tone="alert">{(t.ausentes as string[]).join(', ')}</Status> : <Status tone="live">Nenhuma</Status>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <CorpoPainel><Nota>{admin ? 'Consulta o Winthor ao vivo e grava o resultado da conferência.' : 'Só quem administra confere os campos.'}</Nota></CorpoPainel>
      )}
    </Panel>
  );
}
