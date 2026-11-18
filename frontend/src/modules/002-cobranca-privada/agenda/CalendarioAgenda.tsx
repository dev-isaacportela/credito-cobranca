// Calendário da Minha agenda: visões Mês e Semana (segunda a domingo), com "‹ Hoje ›". Cada evento fica no dia
// dele; o atrasado fica no dia em que venceu, marcado em vermelho, e o atrasado de antes da visão aparece acima.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtData } from '@/lib/formato';
import { andarPeriodo, cabecalhoDoDia, diasDaSemana, eventosPorDia, rotuloDoPeriodo, semanasDoMes, type VisaoAgenda } from '@/lib/cobranca-privada/agenda';
import {
  Button, Calendario, CorpoPainel, DiaCalendario, EventoCalendario, Grade, IconButton, Linha as Junto, Panel, PanelHeader, Segmentos, TextLink,
} from '@/components/page';
import { brl, num, type Linha } from '../comum';
import { ROTULO_TIPO } from './eventos';

const NO_DIA_DO_MES = 3;

export function CalendarioAgenda({
  visao, refDia, hoje, feriados, eventos, onVisao, onRef, onAbrir,
}: {
  visao: VisaoAgenda;
  refDia: string;
  hoje: string;
  feriados: Linha[];
  eventos: Linha[];
  onVisao: (v: VisaoAgenda) => void;
  onRef: (dia: string) => void;
  onAbrir: (e: Linha) => void;
}) {
  const semanas = visao === 'semana' ? [diasDaSemana(refDia)] : semanasDoMes(refDia);
  const inicio = semanas[0][0];
  const porDia = eventosPorDia(eventos);
  const antes = eventos.filter((e) => String(e.DATA).slice(0, 10) < inicio);
  const mes = refDia.slice(0, 7);
  const andar = (passo: number) => onRef(andarPeriodo(visao, refDia, passo));
  const evento = (e: Linha, i: number, compacto: boolean) => (
    <EventoCalendario
      key={`${e.TIPO}:${e.COBRANCA_ID}:${i}`}
      titulo={String(e.CLIENTE_NOME)}
      texto={String(e.TEXTO ?? '')}
      meta={`${ROTULO_TIPO[e.TIPO] ?? e.TIPO}${num(e.VALOR) > 0 ? ` · ${brl(e.VALOR)}` : ''}${Number(e.ATRASADO) ? ` · desde ${fmtData(e.DATA)}` : ''}`}
      atrasado={Boolean(Number(e.ATRASADO))}
      compacto={compacto}
      onClick={() => onAbrir(e)}
    />
  );

  return (
    <>
      {antes.length ? (
        <Panel>
          <PanelHeader title="Atrasados de antes deste período" hint="Continuam pendentes; abra para resolver." />
          <CorpoPainel>
            <Grade colunas={3}>{antes.map((e, i) => evento(e, i, false))}</Grade>
          </CorpoPainel>
        </Panel>
      ) : null}
      <Panel>
        <PanelHeader title={rotuloDoPeriodo(visao, refDia)} hint="Clique num compromisso para abrir o caso.">
          <Junto>
            <Segmentos rotulo="Visão" valor={visao} onChange={onVisao} opcoes={[{ value: 'mes', label: 'Mês' }, { value: 'semana', label: 'Semana' }]} />
            <IconButton label={visao === 'semana' ? 'Semana anterior' : 'Mês anterior'} onClick={() => andar(-1)}><ChevronLeft /></IconButton>
            <Button size="sm" onClick={() => onRef(hoje)}>Hoje</Button>
            <IconButton label={visao === 'semana' ? 'Próxima semana' : 'Próximo mês'} onClick={() => andar(1)}><ChevronRight /></IconButton>
          </Junto>
        </PanelHeader>
        <Calendario visao={visao}>
          {semanas.flat().map((dia) => {
            const c = cabecalhoDoDia(dia, feriados);
            const doDia = porDia.get(dia) ?? [];
            const mostra = visao === 'mes' ? doDia.slice(0, NO_DIA_DO_MES) : doDia;
            return (
              <DiaCalendario
                key={dia}
                visao={visao}
                semana={c.semana}
                data={c.data}
                numero={c.numero}
                hoje={dia === hoje}
                fora={visao === 'mes' && dia.slice(0, 7) !== mes}
                naoUtil={c.naoUtil !== ''}
                feriado={c.naoUtil && c.naoUtil !== 'sábado' && c.naoUtil !== 'domingo' ? c.naoUtil : undefined}
                total={doDia.length}
              >
                {mostra.map((e, i) => evento(e, i, visao === 'mes'))}
                {visao === 'mes' && doDia.length > NO_DIA_DO_MES ? (
                  <TextLink onClick={() => { onRef(dia); onVisao('semana'); }}>+{doDia.length - NO_DIA_DO_MES} mais</TextLink>
                ) : null}
              </DiaCalendario>
            );
          })}
        </Calendario>
      </Panel>
    </>
  );
}

