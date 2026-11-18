// Casca /juridico (T-210): as 5 abas com os contadores de RF-029 (prazos vencidos, parcelas vencidas, custas sem
// lançamento, desvios críticos, de ccJurAlertas). As abas de gestão são do Jurídico e de quem administra; para os
// demais ficam desabilitadas, com o motivo. A aba vive na URL (/juridico/aba/:aba).

import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { MembroSessao } from '@/lib/base/menu';
import { acao } from '@/lib/mitra-api';
import { Tabs, TabsList, TabsTrigger } from '@/components/page';
import { ehJur, FILTRO_GESTAO, guardarMembro, num, useDados, type Linha } from './comum';
import ProcessosAba from './ProcessosAba';
import VisaoGerencial from './VisaoGerencial';
import AcordosAba from './AcordosAba';
import CustosAba from './CustosAba';
import AlertasAba from './AlertasAba';

const ABAS = [
  { id: 'visao', rotulo: 'Visão gerencial', tela: VisaoGerencial, gestao: true },
  { id: 'processos', rotulo: 'Processos', tela: ProcessosAba, gestao: false },
  { id: 'acordos', rotulo: 'Acordos judiciais', tela: AcordosAba, gestao: true },
  { id: 'custos', rotulo: 'Custos dos processos', tela: CustosAba, gestao: true },
  { id: 'alertas', rotulo: 'Alertas de desvios', tela: AlertasAba, gestao: true },
];

export default function JuridicoPage() {
  const membro = useOutletContext<MembroSessao>();
  guardarMembro(membro);
  const navigate = useNavigate();
  const jur = ehJur(membro);
  const { aba: pedida = 'processos' } = useParams();
  const atual = ABAS.find((a) => a.id === pedida && (jur || !a.gestao)) ?? ABAS[1];
  const alertas = useDados(async () => (jur ? acao('ccJurAlertas', { ...FILTRO_GESTAO, tipo: '' }) : null), `alertas:${jur}`);
  const lista: Linha[] = alertas.dados?.ok ? alertas.dados.linhas ?? [] : [];
  const conta = (tipo: string) => lista.filter((l) => l.tipo === tipo).length;
  const contador: Record<string, number> = {
    processos: conta('prazo'), acordos: conta('parcela'), custos: conta('custas'), alertas: num(alertas.dados?.criticos),
  };
  const Tela = atual.tela;

  const abas = (
    <TabsList>
      {ABAS.map((a) => (
        <TabsTrigger key={a.id} value={a.id} disabled={a.gestao && !jur} title={a.gestao && !jur ? 'Só o Jurídico e quem administra veem a gestão.' : undefined}>
          {a.rotulo}{contador[a.id] ? ` ${contador[a.id]}` : ''}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <Tabs value={atual.id} onValueChange={(id) => navigate(id === 'processos' ? '/juridico' : `/juridico/aba/${id}`)}>
      <Tela membro={membro} abas={abas} />
    </Tabs>
  );
}
