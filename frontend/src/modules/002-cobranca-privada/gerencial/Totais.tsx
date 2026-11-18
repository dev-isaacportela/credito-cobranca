// Os quatro totais do time (visão gerencial C, T-077), de ccCobPainelKpis.

import { Dash, GradeKpi, Kpi } from '@/components/page';
import { brl, num, pct, type Linha } from '../comum';

export function Totais({ k }: { k: Linha | null }) {
  if (!k) return null;
  return (
    <GradeKpi>
      <Kpi rotulo="Saldo vencido sob gestão" valor={num(k.VENCIDO) > 0 ? brl(k.VENCIDO) : <Dash />}
        hint={`${num(k.CLIENTES_VENCIDOS)} clientes · índice de ${pct(k.INAD_PCT)}${num(k.META_INAD) ? `, meta até ${pct(k.META_INAD)}` : ''}`} />
      <Kpi rotulo="Recuperado no período" valor={num(k.RECUPERADO) > 0 ? brl(k.RECUPERADO) : <Dash />}
        hint={`conversão de ${pct(k.CONVERSAO_PCT)}${num(k.META_CONVERSAO) ? ` · meta ${pct(k.META_CONVERSAO)}` : ''}`} />
      <Kpi rotulo="Promessas cumpridas" valor={num(k.PROMESSAS) ? pct(k.PROMESSAS_CUMPRIDAS_PCT) : <Dash />}
        hint={`${num(k.META_PROMESSA) ? `meta ${pct(k.META_PROMESSA)} · ` : ''}${num(k.PROMESSAS)} promessas em ${num(k.CONTATOS)} contatos`} />
      <Kpi rotulo="Ações da régua atrasadas" valor={num(k.ACOES_ATRASADAS)}
        hint={`${num(k.ACOES_PENDENTES)} ações da régua pendentes · ${num(k.SEM_PROX_ACAO)} clientes sem próxima ação`} />
    </GradeKpi>
  );
}
