// Aba Acordos judiciais (T-217, opção A "Tabela de acordos"): 4 números, a tabela com as parcelas abrindo sob a
// linha, "Aprovar" (alçada, quem registrou não aprova) e "Marcar paga". A situação de cada parcela é escolhida aqui.

import { Fragment, useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, CampoBusca, CorpoPainel, Dash, EmptyState, Field, GradeKpi, Kpi, MetaDot, PageHeader,
  Pagination, Panel, RowMeta, RowTitle, SearchInput, SelectMenu, Stat, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { aposParcela, brl, CARTEIRA_NOME, ehJur, FILTRO_GESTAO, hojeLocal, normalizarBusca, num, OPCOES_CARTEIRA, SITUACAO_ACORDO, useDados, useEspera, useGravar, type Linha, type PropsAba } from './comum';
import { AprovarAcordoDialog } from './card/AcoesDoProcesso';
import { Parcelas } from './card/Parcelas';

const POR_PAGINA = 20;
const OPCOES_SITUACAO = [{ value: '', label: 'Todas as situações' }, ...Object.entries(SITUACAO_ACORDO).map(([value, s]) => ({ value, label: s.texto }))];

export default function AcordosAba({ membro, abas }: PropsAba) {
  const jur = ehJur(membro);
  const [f, setF] = useState({ situacao: '', carteira: '', busca: '' });
  const busca = useEspera(f.busca);
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState(0);
  const [aprovar, setAprovar] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState('');
  const { gravar, gravando, erro } = useGravar();
  const filtro = { processoId: 0, situacao: f.situacao, carteira: f.carteira, filial: '', busca: normalizarBusca(busca) };
  const chave = JSON.stringify(filtro);
  const total = useDados(() => linhas('ccJurAcordoTotal', filtro), chave);
  const lista = useDados(() => linhas('ccJurAcordoListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), `${chave}:${pagina}`);
  const alertas = useDados(() => acao('ccJurAlertas', { ...FILTRO_GESTAO, tipo: 'parcela' }), 'parcela');
  const parcelas = useDados(async () => (aberto ? linhas('ccJurAcordoParcelaListar', { acordoId: aberto }) : []), `p:${aberto}`);
  const t = total.dados?.[0] ?? {};
  const n = num(t.TOTAL);
  const honorarios = (lista.dados ?? []).filter((a) => !Number(a.HONORARIOS_PAGOS) && a.SITUACAO !== 'RECUSADO').reduce((s, a) => s + num(a.HONORARIOS), 0);
  const vencidas: Linha[] = alertas.dados?.ok ? alertas.dados.linhas ?? [] : [];
  const mudar = (campo: keyof typeof f) => (v: string) => { setF({ ...f, [campo]: v }); setPagina(1); };
  const recarregar = () => { total.recarregar(); lista.recarregar(); parcelas.recarregar(); alertas.recarregar(); };
  const podeAprovar = (a: Linha) => membro.nivel >= num(a.NIVEL_EXIGIDO) && num(a.REGISTRADO_POR) !== membro.membroId;

  async function honorariosPagos(a: Linha) {
    const r = await gravar('ccJurAcordoHonorariosPagar', { acordoId: Number(a.ID), pagoEm: hojeLocal() }, 'Honorários registrados como pagos.');
    if (r) recarregar();
  }

  return (
    <>
      <PageHeader module="Jurídico" title="Acordos judiciais" description="Acordos registrados nos processos, com parcelas, honorários e aprovação."
        meta={<><Stat>{n}</Stat> acordos<MetaDot /><Stat>{num(t.AGUARDANDO)}</Stat> aguardando aprovação</>} />
      {abas}
      <GradeKpi>
        <Kpi rotulo="A receber" valor={brl(t.VALOR_A_RECEBER) || <Dash />} hint="só acordos em andamento (aprovados)" />
        <Kpi rotulo="Parcelas vencidas" valor={vencidas.length} hint={vencidas[0] ? `${vencidas[0].cliente}${vencidas.length > 1 ? ` e mais ${vencidas.length - 1}` : ''}` : 'nenhuma'} />
        <Kpi rotulo="Aguardando aprovação" valor={num(t.AGUARDANDO)} hint={num(t.AGUARDANDO) ? brl(t.VALOR_AGUARDANDO) : 'nenhum'} />
        <Kpi rotulo="Honorários a pagar" valor={brl(honorarios) || <Dash />} hint="nos acordos listados" />
      </GradeKpi>
      {aviso ? <Alert tone="warn">{aviso}</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {lista.erro ? <Alert tone="error">{lista.erro}</Alert> : null}
      <Panel>
        <Toolbar>
          <CampoBusca><SearchInput value={f.busca} onChange={(e) => mudar('busca')(e.target.value)} placeholder="Cliente" aria-label="Buscar acordo" /></CampoBusca>
          <Field label="Situação"><SelectMenu label="Situação" value={f.situacao} options={OPCOES_SITUACAO} onChange={mudar('situacao')} /></Field>
          <Field label="Carteira"><SelectMenu label="Carteira" value={f.carteira} options={OPCOES_CARTEIRA} onChange={mudar('carteira')} /></Field>
        </Toolbar>
        {!lista.dados?.length ? <EmptyState title={lista.carregando ? 'Carregando…' : 'Nenhum acordo com estes filtros.'} /> : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th><Th numeric>Valor</Th><Th numeric>Entrada</Th><Th>Parcelas pagas</Th><Th numeric>A receber</Th><Th>Vencidas</Th>
                <Th>Próximo vencimento</Th><Th>Honorários</Th><Th>Aprovação</Th><Th />
              </tr>
            </thead>
            <tbody>
              {lista.dados.map((a) => {
                const s = SITUACAO_ACORDO[a.SITUACAO] ?? SITUACAO_ACORDO.ANDAMENTO;
                return (
                  <Fragment key={a.ID}>
                    <Tr>
                      <Td><RowTitle>{a.NOME_DEVEDOR}</RowTitle><RowMeta>{`${CARTEIRA_NOME[a.CARTEIRA] ?? a.CARTEIRA}${a.FILIAL ? ` · filial ${a.FILIAL}` : ''}`}</RowMeta></Td>
                      <Td numeric>{brl(a.VALOR)}</Td>
                      <Td numeric>{brl(a.ENTRADA)}</Td>
                      <Td>{`${num(a.PARCELAS_PAGAS)} de ${num(a.PARCELAS_TOTAL)}`}</Td>
                      <Td numeric>{brl(a.A_RECEBER) || <Dash />}</Td>
                      <Td>{num(a.PARCELAS_VENCIDAS) ? <Status tone="alert">{num(a.PARCELAS_VENCIDAS)}</Status> : <Dash />}</Td>
                      <Td>{a.PROXIMA_PARCELA ? fmtData(a.PROXIMA_PARCELA) : <Dash />}</Td>
                      <Td>
                        {brl(a.HONORARIOS)}
                        <RowMeta>{Number(a.HONORARIOS_PAGOS) ? `pagos em ${fmtData(a.HONORARIOS_PAGOS_EM)}` : 'a pagar'}</RowMeta>
                        {!Number(a.HONORARIOS_PAGOS) && a.SITUACAO !== 'RECUSADO' ? (
                          <Button size="sm" variant="ghost" disabled={!jur || gravando} title={jur ? undefined : 'Só o Jurídico registra os honorários.'}
                            onClick={() => honorariosPagos(a)}>Marcar pagos</Button>
                        ) : null}
                      </Td>
                      <Td>
                        <Status tone={s.tom}>{s.texto}</Status>
                        <RowMeta>{a.APROVADO_POR_NOME ? `aprovado por ${a.APROVADO_POR_NOME}` : `registrado por ${a.REGISTRADO_POR_NOME}`}</RowMeta>
                      </Td>
                      <Td numeric>
                        {a.SITUACAO === 'AGUARDANDO' ? (
                          <Button size="sm" disabled={!podeAprovar(a)} title={podeAprovar(a) ? undefined : `Exige nível ${num(a.NIVEL_EXIGIDO)} e não ter registrado o acordo.`}
                            onClick={() => setAprovar(a)}>Aprovar</Button>
                        ) : null}
                        <Button size="sm" variant="ghost" aria-expanded={aberto === a.ID} onClick={() => setAberto(aberto === a.ID ? 0 : a.ID)}>
                          {aberto === a.ID ? 'Fechar parcelas' : 'Parcelas'}
                        </Button>
                      </Td>
                    </Tr>
                    {aberto === a.ID ? (
                      <tr>
                        <td colSpan={10}>
                          <CorpoPainel>
                            {parcelas.erro ? <Alert tone="error">{parcelas.erro}</Alert> : null}
                            <Parcelas parcelas={parcelas.dados ?? []} acordo={a} pode={jur} hoje={hojeLocal()}
                              onAlterado={async ({ quitado }) => { setAviso(await aposParcela(quitado, num(a.PROCESSO_ID))); recarregar(); }} />
                          </CorpoPainel>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
        {n > POR_PAGINA ? (
          <Pagination page={pagina} lastPage={Math.ceil(n / POR_PAGINA)} total={n} unit="acordos" busy={lista.carregando}
            onPrevious={() => setPagina(pagina - 1)} onNext={() => setPagina(pagina + 1)} />
        ) : null}
      </Panel>
      {aprovar ? (
        <AprovarAcordoDialog aberto acordo={aprovar} onFechar={() => setAprovar(null)}
          onFeito={(ok) => { setAprovar(null); setAviso(ok ? 'Acordo aprovado.' : 'Acordo recusado.'); recarregar(); }} />
      ) : null}
    </>
  );
}
