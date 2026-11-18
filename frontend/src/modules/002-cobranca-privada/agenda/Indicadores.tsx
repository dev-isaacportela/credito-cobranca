// Aba "Indicadores" da agenda (T-075): os números do mês da pessoa escolhida, da linha dela em ccCobPainelAgentes.

import { linhas } from '@/lib/mitra-api';
import { Alert, Dash, EmptyState, GradeKpi, Kpi } from '@/components/page';
import { brl, num, pct, useDados } from '../comum';

export function Indicadores({ carteira, agenteId }: { carteira: string; agenteId: number }) {
  const dados = useDados(() => linhas('ccCobPainelAgentes', { carteira, buId: -1, de: '', ate: '', agenteId }), `${carteira}:${agenteId}`);
  const l = (dados.dados ?? []).find((x) => num(x.AGENTE_ID) === agenteId) ?? (dados.dados ?? [])[0];
  if (dados.erro) return <Alert tone="error">{dados.erro}</Alert>;
  if (!l) return dados.carregando ? null : <EmptyState title="Sem carteira nesta seleção." hint="Os indicadores contam os clientes de quem tem carteira." />;
  return (
    <GradeKpi>
      <Kpi rotulo="Saldo vencido" valor={num(l.VENCIDO) > 0 ? brl(l.VENCIDO) : <Dash />} hint={`${num(l.CLIENTES_ATRASO)} clientes em atraso · índice ${pct(l.INAD_PCT)}`} />
      <Kpi rotulo="Contatos no mês" valor={num(l.CONTATOS)} hint={`${num(l.PROMESSAS)} promessas · ${pct(l.PROMESSAS_CUMPRIDAS_PCT)} cumpridas`} />
      <Kpi rotulo="Recuperado no mês" valor={num(l.RECUPERADO) > 0 ? brl(l.RECUPERADO) : <Dash />} />
      <Kpi rotulo="Ações da régua atrasadas" valor={num(l.ACOES_ATRASADAS)} hint={`${pct(l.ACOES_NO_PRAZO_PCT)} das ações do mês no prazo`} />
    </GradeKpi>
  );
}
