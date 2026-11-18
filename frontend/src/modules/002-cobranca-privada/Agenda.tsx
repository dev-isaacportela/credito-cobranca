// Minha agenda (T-074/T-075): calendário de verdade, nas visões Mês e Semana (pedido do usuário, 18/11), com os
// números no topo e o seletor de pessoa; abas Clientes, Aprovações e Indicadores, cada uma lida na primeira vez.
// Ao abrir: membros, feriados (2, guardados na sessão), agenda e resumo = 5 chamadas.

import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { linhas } from '@/lib/mitra-api';
import { CARTEIRAS } from '@/lib/base/carteira';
import type { MembroSessao } from '@/lib/base/menu';
import { periodoDaVisao, semanaUteis, type VisaoAgenda } from '@/lib/cobranca-privada/agenda';
import {
  Alert, Button, Dash, EmptyState, Field, GradeKpi, Kpi, MetaDot, PageHeader, Panel, Pilha, RowMeta, RowTitle, SelectMenu,
  Stat, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Th, TextLink, Toolbar, Tr,
} from '@/components/page';
import { brl, feriadosDaTela, hojeLocal, num, useDados } from './comum';
import { APROVACOES, destinoDoEvento, ROTULO_TIPO } from './agenda/eventos';
import { Clientes } from './agenda/Clientes';
import { Indicadores } from './agenda/Indicadores';
import { CalendarioAgenda } from './agenda/CalendarioAgenda';

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
  const [visao, setVisao] = useState<VisaoAgenda>('mes');
  const [refDia, setRefDia] = useState(hoje);
  const periodo = periodoDaVisao(visao, refDia);

  const membros = useDados(async () => (escolhe ? linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 200, offset: 0 }) : []), String(escolhe));
  const semana = useDados(async () => {
    const feriados = await feriadosDaTela();
    const dias = semanaUteis(hoje, feriados);
    // Os números do topo seguem os 7 dias úteis; o calendário lê até o fim do período mostrado (nunca antes de hoje).
    const ate7 = dias[dias.length - 1];
    const ate = [periodo.ate, ate7].sort()[1];
    const [eventos, resumo] = await Promise.all([
      linhas('ccCobAgendaListar', { carteira, membroId: Number(quem), ate, limite: 300, offset: 0 }),
      linhas('ccCobAgendaResumo', { carteira, buId: -1, ate: ate7 }),
    ]);
    return { feriados, ate7, eventos, resumo: resumo.find((r) => num(r.AGENTE_ID) === alvo) ?? null };
  }, `${carteira}:${quem}:${periodo.ate}`);

  const s = semana.dados;
  const eventos = s?.eventos ?? [];
  const aprovacoes = eventos.filter((e) => APROVACOES.includes(e.TIPO));
  // As aprovações têm aba própria: no calendário elas lotavam o dia de hoje (49 e-mails para a diretoria).
  const daAgenda = eventos.filter((e) => !APROVACOES.includes(e.TIPO));
  const daSemana = s ? daAgenda.filter((e) => String(e.DATA).slice(0, 10) <= s.ate7) : [];
  const nome = quem === '0' ? membro.nome : String(membros.dados?.find((m) => String(m.ID) === quem)?.NOME ?? '');
  const atrasados = daSemana.filter((e) => Number(e.ATRASADO));
  const trocarAba = (a: string) => { setAba(a); setVistas((v) => (v.includes(a) ? v : [...v, a])); };


  return (
    <>
      <PageHeader module="Operação" title="Minha agenda"
        description="O que fazer hoje e nos próximos 7 dias úteis: ações da régua, promessas, parcelas de acordo, bloqueios, anuências e aprovações."
        meta={s ? <><Stat>{atrasados.length}</Stat> atrasadas<MetaDot /><Stat>{daSemana.length - atrasados.length}</Stat> nos próximos 7 dias úteis</> : undefined} />
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
          <TabsTrigger value="semana">Agenda</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="aprovacoes">Aprovações {aprovacoes.length || ''}</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>
        {semana.erro ? <Alert tone="error">{semana.erro}</Alert> : null}

        <TabsContent value="semana">
          <Pilha>
          <GradeKpi>
            <Kpi rotulo="Atrasados na agenda" valor={s?.resumo ? num(s.resumo.ATRASADAS) : atrasados.length} hint={`agenda de ${nome}`} />
            {/* Sem carteira própria (supervisor), o resumo não tem linha: conta o que está na agenda (F5, tropeço 4). */}
            <Kpi rotulo="Para hoje" valor={s?.resumo ? num(s.resumo.PARA_HOJE) : daSemana.filter((e) => !Number(e.ATRASADO) && String(e.DATA).slice(0, 10) === hoje).length} />
            <Kpi rotulo="Promessas vencidas" valor={s?.resumo ? num(s.resumo.PROMESSAS_VENCIDAS) : daSemana.filter((e) => e.TIPO === 'PROMESSA' && Number(e.ATRASADO)).length} hint={s?.resumo ? `${num(s.resumo.PROXIMOS)} eventos nos próximos dias` : undefined} />
            <Kpi rotulo="Sem contato recente" valor={s?.resumo ? num(s.resumo.SEM_CONTATO) : <Dash />}
              hint={s?.resumo && num(s.resumo.A_VENCER_7DU) > 0 ? `${brl(s.resumo.A_VENCER_7DU)} a vencer em 7 dias úteis` : undefined} />
          </GradeKpi>
          {aprovacoes.length ? (
            <Alert tone="info">
              {aprovacoes.length === 1 ? '1 aprovação aguarda' : `${aprovacoes.length} aprovações aguardam`} {quem === '0' ? 'você' : nome} e
              {' '}não entram no calendário. <TextLink onClick={() => trocarAba('aprovacoes')}>Ver aprovações</TextLink>
            </Alert>
          ) : null}
          {s ? (
            <CalendarioAgenda visao={visao} refDia={refDia} hoje={hoje} feriados={s.feriados} eventos={daAgenda}
              onVisao={setVisao} onRef={setRefDia} onAbrir={(e) => navigate(destinoDoEvento(e))} />
          ) : semana.carregando ? <Panel><EmptyState title="Montando a agenda…" /></Panel> : null}
          </Pilha>
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
