// Aba Processos (T-211, opção B "Capa completa por fase"): o quadro `juridico` da lib, a linha dos 6 números (RF-014,
// de ccJurIndicadores, só para quem gere o Jurídico), "Exportar CSV", "Novo processo" e a alternância Quadro/Lista.
// O card aberto vive na URL (?card=ID) e a ficha dele é lida uma vez ao abrir (RNF-003). O card não se arrasta:
// "Mover para" dentro do card aberto, com o espelho do gancho.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KanbanBoard } from '@benenutri/mitra-kanban';
import { extensoesDoQuadro } from '@/lib/base/extensoes';
import { acao } from '@/lib/mitra-api';
import { montarCsv } from '@/lib/juridico/csv';
import {
  Alert, Button, Linha as Junto, MetaDot, PageHeader, Stat,
} from '@/components/page';
import { baixar, ehJur, erroDe, FILTRO_GESTAO, FILTRO_PROCESSO, hojeLocal, mil, num, todosOsProcessos, useDados, type Linha, type PropsAba } from './comum';
import { useFicha } from './ficha';
import { ListaProcessos } from './ListaProcessos';
import { NovoProcessoDialog } from './NovoProcessoDialog';
import './extensoes';

const SO_JURIDICO = 'Só o Jurídico e quem administra cadastram processo.';

export default function ProcessosAba({ membro, abas }: PropsAba) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const jur = ehJur(membro);
  // Quem não está no quadro (agente) só vê a lista; o card abre na ficha de leitura.
  const noQuadro = jur || membro.cargo === 'SUPERVISOR';
  const lista = !noQuadro || params.get('ver') === 'lista';
  const cardId = Number(params.get('card')) || null;
  const [filtro, setFiltro] = useState(FILTRO_PROCESSO);
  const [novo, setNovo] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [exportando, setExportando] = useState(false);
  useFicha(cardId, true);
  const ind = useDados(async () => (jur ? acao('ccJurIndicadores', { de: '', ate: '', ...FILTRO_GESTAO }) : null), `ind:${jur}`);

  const abrir = (p: Linha) => (noQuadro && p.CARD_ID ? setParams({ card: String(p.CARD_ID) })
    : navigate(p.FASE_CHAVE === 'dossie' ? `/juridico/dossie/${p.ID}` : `/juridico/processos/${p.ID}`));

  async function exportar() {
    setExportando(true);
    try {
      baixar(`processos-juridicos-${hojeLocal()}.csv`, montarCsv(await todosOsProcessos(filtro)));
    } catch (e) {
      setAviso({ tom: 'error', texto: erroDe(e) });
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <PageHeader module="Jurídico" title="Processos jurídicos"
        description="Do dossiê ao encerramento, por etapa. Abra o card para registrar andamento, custo, acordo e mover."
        actions={
          <>
            <Button variant="secondary" disabled={exportando} onClick={exportar}>Exportar CSV</Button>
            <Button variant="primary" disabled={!jur} title={jur ? undefined : SO_JURIDICO} onClick={() => setNovo(true)}>Novo processo</Button>
          </>
        }
        meta={ind.dados?.ok ? <SeisNumeros r={ind.dados} /> : null} />
      {abas}
      {ind.erro ? <Alert tone="error">{ind.erro}</Alert> : null}
      {aviso ? <Alert tone={aviso.tom === 'success' ? 'success' : 'error'}>{aviso.texto}</Alert> : null}
      <Junto>
        <Button size="sm" variant={lista ? 'secondary' : 'primary'} aria-pressed={!lista} disabled={!noQuadro}
          title={noQuadro ? undefined : 'O quadro é do Jurídico e da supervisão; aqui, a lista.'} onClick={() => setParams({})}>Quadro</Button>
        <Button size="sm" variant={lista ? 'primary' : 'secondary'} aria-pressed={lista} onClick={() => setParams({ ver: 'lista' })}>Lista</Button>
      </Junto>
      {lista ? (
        <ListaProcessos filtro={filtro} onFiltro={setFiltro} onAbrir={abrir} />
      ) : (
        <KanbanBoard
          slug="juridico"
          cardId={cardId}
          onCardChange={(id) => setParams(id ? { card: String(id) } : {})}
          novoCard={false}
          atualizarACadaMs={60000}
          podeExcluir={() => false}
          {...extensoesDoQuadro('juridico')}
        />
      )}
      <NovoProcessoDialog aberto={novo} onFechar={() => setNovo(false)}
        onCriado={(r) => {
          setNovo(false);
          setAviso({ tom: 'success', texto: r.aviso ? `Processo criado. ${r.aviso}` : 'Processo criado.' });
          if (r.cardId) setParams({ card: String(r.cardId) });
        }} />
    </>
  );
}

/** A linha dos 6 números de RF-014. */
function SeisNumeros({ r }: { r: Linha }) {
  const i = (chave: string): Linha => (r.indicadores ?? []).find((x: Linha) => x.chave === chave) ?? {};
  const citacao = (r.porEtapa ?? []).find((e: Linha) => e.faseChave === 'citacao');
  const ag = r.acordosAguardando ?? {};
  return (
    <>
      <span><Stat>{num(i('01').valor)}</Stat> em andamento · {mil(i('02').valor)}</span><MetaDot />
      <span><Stat>{num(i('03').valor)}</Stat> a ajuizar · {mil(i('03').total)} ({num(i('16').valor)} sem dossiê)</span><MetaDot />
      <span><Stat>{num(citacao?.qtd)}</Stat> em citação</span><MetaDot />
      <span><Stat>{num(i('04').valor)}</Stat> em execução</span><MetaDot />
      <span>
        acordos a receber <Stat>{mil(i('07').valor) || 'R$ 0'}</Stat> ({num(i('07').quantidade)} acordo · {num(i('08').parcelas)} parcela vencida)
        {num(ag.quantidade) ? ` · ${num(ag.quantidade)} aguardando aprovação · ${mil(ag.valor)}` : ''}
      </span><MetaDot />
      <span><Stat>{num(i('13').valor) + num(i('14').valor)}</Stat> prazos vencidos ou em 7 dias</span>
    </>
  );
}
