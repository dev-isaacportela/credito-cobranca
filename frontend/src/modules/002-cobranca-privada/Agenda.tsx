// Minha agenda (T-074/T-075, opção B "Semana em colunas" com as abas da C): "Ações atrasadas" + os 7 dias úteis em
// colunas, números no topo e o seletor de pessoa; abas Clientes, Aprovações e Indicadores, cada uma lida na primeira vez.
// Ao abrir: membros, feriados (2, guardados na sessão), agenda e resumo = 5 chamadas.

import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { CARTEIRAS } from '@/lib/base/carteira';
import type { MembroSessao } from '@/lib/base/menu';
import { colunaDoEvento, rotuloDoDia, semanaUteis } from '@/lib/cobranca-privada/agenda';
import {
  Alert, Board, BoardCard, BoardColumn, Button, Dash, EmptyState, Field, GradeKpi, Kpi, MetaDot, PageHeader, Panel, RowMeta, RowTitle, SelectMenu,
  Stat, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Th, TextLink, Toolbar, Tr,
} from '@/components/page';
import { brl, feriadosDaTela, hojeLocal, num, useDados, type Linha } from './comum';
import { APROVACOES, destinoDoEvento, ROTULO_TIPO } from './agenda/eventos';
import { Clientes } from './agenda/Clientes';
import { Indicadores } from './agenda/Indicadores';

const CARTEIRA_TODAS = [{ value: '', label: 'Todas as carteiras' }, ...CARTEIRAS.map((c) => ({ value: c.codigo, label: c.nome }))];

export default function Agenda() {
  const membro = useOutletContext<MembroSessao>();
  const navigate = useNavigate();
  const [aba, setAba] = useState('semana');
  const [vistas, setVistas] = useState<string[]>(['semana']);
  const [carteira, setCarteira] = useState('');
  const [quem, setQuem] = useState('0');
  const escolhe = membro.nivel >= 2 || membro.admin;
  const alvo = Number(quem) || membro.membroId;
  const hoje = hojeLocal();

  const membros = useDados(async () => (escolhe ? linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 200, offset: 0 }) : []), String(escolhe));
  const semana = useDados(async () => {
    const dias = semanaUteis(hoje, await feriadosDaTela());
    const ate = dias[dias.length - 1];
    const [eventos, resumo] = await Promise.all([
      linhas('ccCobAgendaListar', { carteira, membroId: Number(quem), ate, limite: 300, offset: 0 }),
      linhas('ccCobAgendaResumo', { carteira, buId: -1, ate }),
    ]);
    return { dias, eventos, resumo: resumo.find((r) => num(r.AGENTE_ID) === alvo) ?? null };
  }, `${carteira}:${quem}`);

  const s = semana.dados;
  const eventos = s?.eventos ?? [];
  const colunas = s ? [{ chave: 'atrasadas', titulo: 'Atrasados' }, ...s.dias.map((d) => ({ chave: d, titulo: rotuloDoDia(d, hoje) }))] : [];
  // O atrasado é do servidor (ATRASADO, relógio único); a data só escolhe a coluna do dia.
  const coluna = (e: Linha) => (Number(e.ATRASADO) ? 'atrasadas' : s ? colunaDoEvento(e.DATA, hoje, s.dias) ?? s.dias[s.dias.length - 1] : '');
  const aprovacoes = eventos.filter((e) => APROVACOES.includes(e.TIPO));
  const nome = quem === '0' ? membro.nome : String(membros.dados?.find((m) => String(m.ID) === quem)?.NOME ?? '');
  const atrasados = eventos.filter((e) => Number(e.ATRASADO));
  const trocarAba = (a: string) => { setAba(a); setVistas((v) => (v.includes(a) ? v : [...v, a])); };

  const cartao = (e: Linha, i: number) => (
    <BoardCard key={`${e.TIPO}:${e.COBRANCA_ID}:${i}`}>
      <TextLink onClick={() => navigate(destinoDoEvento(e))}>{e.CLIENTE_NOME}</TextLink>
      <span>{e.TEXTO}</span>
      <RowMeta>{ROTULO_TIPO[e.TIPO] ?? e.TIPO}{num(e.VALOR) > 0 ? ` · ${brl(e.VALOR)}` : ''}{Number(e.ATRASADO) ? ` · desde ${fmtData(e.DATA)}` : ''}</RowMeta>
    </BoardCard>
  );

  return (
    <>
      <PageHeader module="Operação" title="Minha agenda"
        description="O que fazer hoje e nos próximos 7 dias úteis: ações da régua, promessas, parcelas de acordo, bloqueios, anuências e aprovações."
        meta={s ? <><Stat>{atrasados.length}</Stat> atrasadas<MetaDot /><Stat>{eventos.length - atrasados.length}</Stat> nos próximos 7 dias úteis</> : undefined} />
      <Tabs value={aba} onValueChange={trocarAba}>
        <Toolbar>
          <Field label="Agenda de">
            <SelectMenu label="Pessoa" value={quem} disabled={!escolhe} onChange={setQuem}
              options={[{ value: '0', label: `${membro.nome} (eu)` }, ...(membros.dados ?? []).filter((m) => num(m.ID) !== membro.membroId)
                .map((m) => ({ value: String(m.ID), label: String(m.NOME), hint: String(m.CARGO).toLowerCase() }))]} />
          </Field>
          <Field label="Carteira"><SelectMenu label="Carteira" value={carteira} options={CARTEIRA_TODAS} onChange={setCarteira} /></Field>
        </Toolbar>
        <TabsList>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="aprovacoes">Aprovações {aprovacoes.length || ''}</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>
        {semana.erro ? <Alert tone="error">{semana.erro}</Alert> : null}

        <TabsContent value="semana">
          <GradeKpi>
            <Kpi rotulo="Atrasados na agenda" valor={s?.resumo ? num(s.resumo.ATRASADAS) : atrasados.length} hint={`agenda de ${nome}`} />
            {/* Sem carteira própria (supervisor), o resumo não tem linha: conta o que está na agenda (F5, tropeço 4). */}
            <Kpi rotulo="Para hoje" valor={s?.resumo ? num(s.resumo.PARA_HOJE) : eventos.filter((e) => !Number(e.ATRASADO) && String(e.DATA).slice(0, 10) === hoje).length} />
            <Kpi rotulo="Promessas vencidas" valor={s?.resumo ? num(s.resumo.PROMESSAS_VENCIDAS) : eventos.filter((e) => e.TIPO === 'PROMESSA' && Number(e.ATRASADO)).length} hint={s?.resumo ? `${num(s.resumo.PROXIMOS)} eventos nos próximos dias` : undefined} />
            <Kpi rotulo="Sem contato recente" valor={s?.resumo ? num(s.resumo.SEM_CONTATO) : <Dash />}
              hint={s?.resumo && num(s.resumo.A_VENCER_7DU) > 0 ? `${brl(s.resumo.A_VENCER_7DU)} a vencer em 7 dias úteis` : undefined} />
          </GradeKpi>
          <Panel>
            <Board height="padrao">
              {colunas.map((c) => {
                const doDia = eventos.filter((e) => coluna(e) === c.chave);
                return (
                  <BoardColumn key={c.chave} title={c.titulo} count={doDia.length}>
                    {doDia.length ? doDia.map(cartao) : <RowMeta>Nada agendado</RowMeta>}
                  </BoardColumn>
                );
              })}
            </Board>
            {!s && semana.carregando ? <EmptyState title="Montando a semana…" /> : null}
          </Panel>
        </TabsContent>

        <TabsContent value="clientes">
          {vistas.includes('clientes') ? <Panel><Clientes carteira={carteira} agenteId={quem === '0' ? membro.membroId : alvo} /></Panel> : null}
        </TabsContent>

        <TabsContent value="aprovacoes">
          <Panel>
            {aprovacoes.length ? (
              <Table>
                <thead><tr><Th>Cliente</Th><Th>O que decidir</Th><Th numeric>Valor</Th><Th /></tr></thead>
                <tbody>
                  {aprovacoes.map((e, i) => (
                    <Tr key={i}>
                      <Td><RowTitle>{e.CLIENTE_NOME}</RowTitle></Td>
                      <Td><Status tone="attention">{ROTULO_TIPO[e.TIPO]}</Status><RowMeta>{e.TEXTO}</RowMeta></Td>
                      <Td numeric>{num(e.VALOR) > 0 ? brl(e.VALOR) : <Dash />}</Td>
                      <Td><Button size="sm" onClick={() => navigate(destinoDoEvento(e))}>Ver e decidir</Button></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : <EmptyState title="Nenhuma aprovação pendente." hint="E-mails com aprovação, acordos e baixas da sua alçada aparecem aqui." />}
          </Panel>
        </TabsContent>

        <TabsContent value="indicadores">
          {vistas.includes('indicadores') ? <Indicadores carteira={carteira} agenteId={quem === '0' ? membro.membroId : alvo} /> : null}
        </TabsContent>
      </Tabs>
    </>
  );
}
