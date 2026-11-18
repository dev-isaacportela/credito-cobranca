// Esteira de concessão, opção B (capa completa): o quadro da lib da carteira com os indicadores da
// RF-039 e a faixa "Aguardando você" (PA-12: 5 primeiros da fila + "Ver todos (N)" num diálogo).
// Abrir: quadro (2) + ccCredSolicitacaoTotal × 2 + ccCredAgendaListar + ccCredAgendaTotal = 6.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KanbanBoard, useKanban, type Card, type Estrutura, type Fase } from '@benenutri/mitra-kanban';
import { extensoesDoQuadro } from '@/lib/base/extensoes';
import type { Carteira } from '@/lib/base/carteira';
import { linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, GradeKpi, Kpi,
  LabelledField, Pagination, Panel, PanelHeader, RowMeta, RowTitle, Status, Table, Td, TextLink, Textarea, Th, Tr,
} from '@/components/page';
import { ehVolta, rotuloFase } from '@/lib/concessao-credito/regras';
import { CARTEIRA_URL, inteiro, lerTodas, n, pct, slugConcessao, useAnalisesLidas, useLeitura, type Linha } from './dados';
import NovaSolicitacao from './NovaSolicitacao';

const filtroSol = (carteira: Carteira, situacao: string) => ({
  carteira, faseChave: '', analistaId: 0, situacao, tipoPessoa: '', de: '', ate: '', busca: '',
});
const AGENDA = { membroId: 0, busca: '', limite: 5, offset: 0 };

export default function Esteira({ carteira }: { carteira: Carteira }) {
  const slug = slugConcessao(carteira);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const cardId = Number(params.get('card')) || null;
  // A análise do órgão chega depois do card aberto: o quadro redesenha e o "Mover para" da Pública reavalia.
  useAnalisesLidas();
  const [nova, setNova] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [quadro, setQuadro] = useState(0);
  const [volta, setVolta] = useState<{ fase: Fase; card: Card; resolver: (r: { ok: boolean; erro?: string }) => void } | null>(null);
  const leitura = useLeitura(() => lerTodas([
    ['ccCredSolicitacaoTotal', filtroSol(carteira, 'ABERTA')],
    ['ccCredSolicitacaoTotal', filtroSol(carteira, 'DECIDIDA')],
    ['ccCredAgendaListar', AGENDA],
    ['ccCredAgendaTotal', AGENDA],
  ]), [carteira, quadro]);

  const [abertas, decididas, agenda, agendaTotal] = leitura.dados?.listas ?? [];
  const a = abertas?.[0];
  const d = decididas?.[0];
  const decididasQtd = n(d?.APROVADAS) + n(d?.RECUSADAS);
  const totalFila = n(agendaTotal?.[0]?.TOTAL);
  const abrir = (cid: number | null) => setParams(cid ? { card: String(cid) } : {}, { replace: true });
  // A fila é da pessoa, não da carteira: `CARTEIRA` diz o quadro do card ('' = pedidos-limite).
  const abrirDaFila = (l: Linha) => {
    const doCard = (String(l.CARTEIRA ?? '') || null) as Carteira | null;
    if (l.TIPO === 'PEDIDO' || !doCard) navigate(`/credito/${CARTEIRA_URL[doCard ?? carteira]}/pedidos?card=${l.CARD_ID}`);
    else if (doCard !== carteira) navigate(`/credito/${CARTEIRA_URL[doCard]}/esteira?card=${l.CARD_ID}`);
    else abrir(Number(l.CARD_ID) || null);
  };

  const antesDeMover = (card: Card, fase: Fase, estrutura: Estrutura) =>
    ehVolta(card, fase, estrutura)
      ? new Promise<{ ok: boolean; erro?: string }>((resolver) => setVolta({ fase, card, resolver }))
      : { ok: true };

  return (
    <>
      {leitura.erro || leitura.dados?.erro ? <Alert tone="error">{leitura.erro || leitura.dados?.erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Em análise" valor={a ? inteiro(a.TOTAL) : '…'} hint="solicitações abertas nesta carteira" />
        <Kpi rotulo="Taxa de aprovação" valor={decididasQtd ? pct((n(d?.APROVADAS) / decididasQtd) * 100, 0) : '—'}
          hint={`${inteiro(d?.APROVADAS)} de ${inteiro(decididasQtd)} decididas`} />
        <Kpi rotulo="Fora do SLA" valor={a ? inteiro(a.ATRASADAS) : '…'} hint="solicitações paradas além do prazo da etapa" />
        <Kpi rotulo="Aguardando você" valor={inteiro(totalFila)} hint="itens da sua fila de crédito" />
      </GradeKpi>
      <Panel>
        <PanelHeader title="Aguardando você" hint="Os primeiros da sua fila: prazos de decisão, ajustes, alçada, Winthor, reanálises e pedidos.">
          <TextLink onClick={() => setVerTodos(true)} disabled={!totalFila}>Ver todos ({inteiro(totalFila)})</TextLink>
        </PanelHeader>
        <FilaTabela linhas={agenda ?? []} onAbrir={abrirDaFila} vazio="Nada aguardando você agora." />
      </Panel>
      <KanbanBoard
        key={quadro}
        slug={slug}
        cardId={cardId}
        onCardChange={abrir}
        novoCard={{ rotulo: 'Nova solicitação', onClick: () => setNova(true) }}
        atualizarACadaMs={60000}
        antesDeMover={antesDeMover}
        podeExcluir={() => false}
        {...extensoesDoQuadro(slug)}
      />
      {nova ? (
        <NovaSolicitacao
          carteira={carteira}
          onFechar={() => setNova(false)}
          onCriada={(cid, tipo) => {
            setNova(false);
            if (tipo === 'pedido') navigate(`/credito/${CARTEIRA_URL[carteira]}/pedidos?card=${cid}`);
            else {
              setQuadro((q) => q + 1);
              abrir(cid);
            }
          }}
        />
      ) : null}
      {verTodos ? <FilaCompleta total={totalFila} onFechar={() => setVerTodos(false)} onAbrir={(l) => { setVerTodos(false); abrirDaFila(l); }} /> : null}
      {volta ? <MotivoVolta {...volta} onFim={() => setVolta(null)} /> : null}
    </>
  );
}

function FilaTabela({ linhas: itens, onAbrir, vazio }: { linhas: Linha[]; onAbrir: (l: Linha) => void; vazio: string }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Cliente</Th>
          <Th>O que fazer</Th>
          <Th>Data</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {itens.length ? itens.map((l, i) => (
          <Tr key={`${l.TIPO}:${l.CARD_ID}:${i}`}>
            <Td>
              <RowTitle>{l.CLIENTE_NOME}</RowTitle>
              <RowMeta>CODCLI {l.CODCLI}</RowMeta>
            </Td>
            <Td>{l.TEXTO}</Td>
            <Td>{Number(l.ATRASADO) ? <Status tone="alert">{fmtData(l.DATA)}</Status> : fmtData(l.DATA)}</Td>
            <Td numeric>
              <TextLink onClick={() => onAbrir(l)} disabled={!Number(l.CARD_ID)}>Abrir</TextLink>
            </Td>
          </Tr>
        )) : (
          <Tr>
            <Td colSpan={4}><Status tone="live">{vazio}</Status></Td>
          </Tr>
        )}
      </tbody>
    </Table>
  );
}

const POR_PAGINA = 20;

function FilaCompleta({ total, onFechar, onAbrir }: { total: number; onFechar: () => void; onAbrir: (l: Linha) => void }) {
  const [pagina, setPagina] = useState(1);
  const lida = useLeitura(() => linhas('ccCredAgendaListar', { membroId: 0, busca: '', limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), [pagina]);
  const ultima = Math.max(1, Math.ceil(total / POR_PAGINA));
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aguardando você</DialogTitle>
          <DialogDescription>A fila inteira do crédito, do mais atrasado para o mais recente.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {lida.erro ? <Alert tone="error">{lida.erro}</Alert> : null}
          <FilaTabela linhas={lida.dados ?? []} onAbrir={onAbrir} vazio="Nada aguardando você." />
        </DialogBody>
        <Pagination page={pagina} lastPage={ultima} total={total} unit={total === 1 ? 'item' : 'itens'} busy={lida.carregando}
          onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
      </DialogContent>
    </Dialog>
  );
}

/** Volta de etapa pede o motivo; ele vai como nota do card antes do movimento (04 §8). */
function MotivoVolta({ fase, card, resolver, onFim }: { fase: Fase; card: Card; resolver: (r: { ok: boolean; erro?: string }) => void; onFim: () => void }) {
  const api = useKanban();
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const cancelar = () => {
    resolver({ ok: false, erro: 'Volta cancelada: informe o motivo para voltar a etapa.' });
    onFim();
  };
  const confirmar = async () => {
    setGravando(true);
    const r = await api.notaRegistrar(card.id, `Voltou para ${rotuloFase(fase.nome)}: ${motivo.trim()}`).catch((e: Error) => ({ ok: false, error: e.message }));
    setGravando(false);
    if (r.ok === false) return setErro(r.error ?? 'Não foi possível registrar o motivo.');
    resolver({ ok: true });
    onFim();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && cancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voltar para {rotuloFase(fase.nome)}</DialogTitle>
          <DialogDescription>O motivo fica no histórico do card.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <LabelledField label="Motivo da volta" obrigatorio>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </LabelledField>
        </DialogBody>
        <DialogFooter>
          <Button onClick={cancelar}>Cancelar</Button>
          <Button variant="primary" onClick={confirmar} disabled={!motivo.trim() || gravando}>Voltar a etapa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
