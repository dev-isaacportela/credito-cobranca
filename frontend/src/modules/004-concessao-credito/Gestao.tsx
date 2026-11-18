// Gestão de crédito, opção B (fila do que vence): grupos por motivo de ação com o botão na linha.
// Abre com 5 leituras (resumo, vencidos, vencendo em 15 dias, a revisar, pendências; listas com limite 21
// e sem …Total); "Em reanálise", "Limite diverge" e "Em dia" ficam recolhidos e leem ao abrir; grupo com
// 21 linhas mostra 20 e "Ver todos" (aí entra o …Total, C-6).

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Carteira } from '@/lib/base/carteira';
import { linha, linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, GradeKpi, Kpi, LabelledField,
  Pagination, Panel, PanelHeader, RowMeta, RowTitle, Status, Table, Td, TextLink, Textarea, Th, Tr,
} from '@/components/page';
import { grupoDaFila, type GrupoFila } from '@/lib/concessao-credito/regras';
import { CARTEIRA_URL, executar, inteiro, lerTodas, n, nivel2, pct, useLeitura, useMembro, type Linha } from './dados';
import { Rating, Reais, Txt } from './pecas';

const LIMITE = 21;
const filtroCred = (carteira: Carteira, f: Partial<Record<string, unknown>> = {}) => ({
  carteira, situacao: '', analistaId: 0, vencendoEmDias: 0, vencidos: 0, divergeWinthor: 0, busca: '', limite: LIMITE, offset: 0, ...f,
});

type Acao = { rotulo: string; principal?: boolean; perigo?: boolean; pode: boolean; motivo?: string; fazer: (l: Linha) => void };

const ROTULO_SITUACAO: Record<string, string> = { GESTAO: 'em gestão', REANALISE: 'em reanálise', OBSOLETO: 'obsoleto', ENCERRADO: 'encerrado' };

export default function Gestao({ carteira }: { carteira: Carteira }) {
  const membro = useMembro();
  const navigate = useNavigate();
  const [versao, setVersao] = useState(0);
  const [dialogo, setDialogo] = useState<{ tipo: 'abrir' | 'concluir'; credito: Linha } | null>(null);
  const [erro, setErro] = useState('');
  const leitura = useLeitura(() => lerTodas([
    ['ccCredCreditoResumo', { carteira }],
    ['ccCredCreditoListar', filtroCred(carteira, { vencidos: 1 })],
    ['ccCredCreditoListar', filtroCred(carteira, { vencendoEmDias: 15 })],
    ['ccCredRevisaoListar', { carteira, gatilho: '', busca: '', limite: LIMITE, offset: 0 }],
    ['ccCredPendenciaListar', { tipo: '', situacao: 'PENDENTE', busca: '', limite: LIMITE, offset: 0 }],
  ]), [carteira, versao]);
  const [resumo, vencidos, vencendo, revisar, pendencias] = leitura.dados?.listas ?? [];
  const r = resumo?.[0];
  const n2 = nivel2(membro);
  const reler = () => setVersao((v) => v + 1);
  const abrirCard = (l: Linha) => l.CARD_ID && navigate(`/credito/${CARTEIRA_URL[carteira]}/esteira?card=${l.CARD_ID}`);
  const abrir: Acao = { rotulo: 'Abrir', pode: true, fazer: abrirCard };
  const antecipar: Acao = { rotulo: 'Encaminhar para Reanálise', principal: true, pode: n2, motivo: 'Somente Supervisor ou acima antecipa a reanálise.',
    fazer: (l) => setDialogo({ tipo: 'abrir', credito: l }) };
  const renovar: Acao = { rotulo: 'Renovar ou encerrar', principal: true, pode: true, fazer: (l) => setDialogo({ tipo: 'concluir', credito: l }) };
  const aplicar = async (l: Linha) => {
    const e = await executar('ccCredPendenciaAplicar', { pendenciaId: l.ID, obs: '' });
    setErro(e ?? '');
    if (!e) reler();
  };

  const grupo = (lista: Linha[] | undefined, g: GrupoFila, origem: { vencido?: boolean; vencendo?: boolean }) =>
    (lista ?? []).filter((l) => grupoDaFila(l, origem) === g);

  return (
    <>
      {leitura.erro || leitura.dados?.erro || erro ? <Alert tone="error">{leitura.erro || leitura.dados?.erro || erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Limite concedido" valor={r ? <Reais v={r.LIMITE_TOTAL} zeroEhDado /> : '…'} hint={`${inteiro(r?.VIGENTES)} créditos vigentes`} />
        <Kpi rotulo="Uso da carteira" valor={n(r?.LIMITE_TOTAL) ? pct((n(r?.UTILIZADO_TOTAL) / n(r?.LIMITE_TOTAL)) * 100, 0) : '—'}
          hint={<><Reais v={r?.UTILIZADO_TOTAL} /> utilizados</>} />
        <Kpi rotulo="Vencem em 30 dias" valor={inteiro(r?.VENCENDO_30D)} hint={`${inteiro(r?.VENCIDOS)} já vencidos`} />
        <Kpi rotulo="Em reanálise" valor={inteiro(r?.EM_REANALISE)} hint={`${inteiro(r?.OBSOLETOS)} obsoletos`} />
      </GradeKpi>
      <Alert tone="info">
        O crédito vale pela validade da política. Vencido, o cliente com compras suficientes no período vai para Reanálise; com menos, para
        Cadastro obsoleto; sem compra pelo prazo da política, obsoleto mesmo com a validade em dia. A rotina encaminha sozinha todo dia.
      </Alert>
      <Grupo titulo="Vence hoje ou já venceu" hint="A rotina encaminha na próxima passada; o botão antecipa."
        linhas={grupo(vencidos, 'VENCIDO', { vencido: true })} acoes={[antecipar, abrir]} filtros={filtroCred(carteira, { vencidos: 1 })} />
      <Grupo titulo="Vencem em até 15 dias" hint="Destino calculado pelas compras no período de validade."
        linhas={grupo(vencendo, 'VENCE_15', { vencendo: true })} acoes={[abrir]} filtros={filtroCred(carteira, { vencendoEmDias: 15 })} />
      <Grupo titulo="Em reanálise" hint={`${inteiro(r?.EM_REANALISE)} créditos · renovar abre um novo período, com parecer; encerrar bloqueia o limite.`}
        recolhido filtros={filtroCred(carteira, { situacao: 'REANALISE' })} acoes={[renovar, abrir]} />
      <Grupo titulo="Limite no Winthor diverge do aprovado" hint="O limite aplicado no ERP não é o da decisão." recolhido
        filtros={filtroCred(carteira, { divergeWinthor: 1 })} acoes={[abrir]} divergencia />
      <Panel>
        <PanelHeader title={`Créditos a revisar (${(revisar ?? []).length >= LIMITE ? '20+' : inteiro((revisar ?? []).length)})`}
          hint="Gatilhos de revisão: atraso, uso do limite, negativação e validade perto do fim." />
        <TabelaCreditos linhas={(revisar ?? []).slice(0, 20)} acoes={[abrir]} extra={(l) => <Txt v={String(l.REVISAO_GATILHOS ?? '').toLowerCase().replace(/,/g, ', ')} />} rotuloExtra="Gatilhos" />
      </Panel>
      <Panel>
        <PanelHeader title={`Pendências para o Winthor (${(pendencias ?? []).length >= LIMITE ? '20+' : inteiro((pendencias ?? []).length)})`}
          hint="O sistema não escreve no Winthor: alguém aplica no ERP e marca aqui." />
        <Table>
          <thead><tr><Th>Pendência</Th><Th>Cliente</Th><Th>O que fazer no Winthor</Th><Th>Gerada</Th><Th /></tr></thead>
          <tbody>
            {(pendencias ?? []).slice(0, 20).map((l) => (
              <Tr key={l.ID}>
                <Td><Status tone="attention">{String(l.TIPO ?? '').replace('_', ' ').toLowerCase()}</Status></Td>
                <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>CODCLI {l.CODCLI}</RowMeta></Td>
                <Td>{l.DESCRICAO}</Td>
                <Td>{fmtDataHora(l.GERADA_EM)}</Td>
                <Td numeric><Button size="sm" onClick={() => aplicar(l)}>Marcar como aplicada</Button></Td>
              </Tr>
            ))}
            {!(pendencias ?? []).length ? <Tr><Td colSpan={5}><Status tone="live">Nenhuma pendência aberta.</Status></Td></Tr> : null}
          </tbody>
        </Table>
      </Panel>
      <Grupo titulo="Em gestão" hint="A carteira em gestão, com todas as colunas." recolhido filtros={filtroCred(carteira, { situacao: 'GESTAO' })} acoes={[abrir]} />
      {dialogo ? <DialogoCredito {...dialogo} onFechar={() => setDialogo(null)} onFeito={() => { setDialogo(null); reler(); }} /> : null}
    </>
  );
}

/** Um grupo da fila: com `linhas` já lidas, ou recolhido e lido ao abrir. 21 linhas = há mais: "Ver todos". */
function Grupo({ titulo, hint, linhas: dadas, recolhido, filtros, acoes, divergencia }: {
  titulo: string; hint: string; linhas?: Linha[]; recolhido?: boolean; filtros: Record<string, unknown>; acoes: Acao[]; divergencia?: boolean;
}) {
  const [aberto, setAberto] = useState(!recolhido);
  const [todos, setTodos] = useState(false);
  const lerAqui = aberto && !dadas;
  const lidas = useLeitura(() => (lerAqui ? linhas('ccCredCreditoListar', filtros) : Promise.resolve([])), [lerAqui]);
  const lista = dadas ?? lidas.dados ?? [];
  const mais = lista.length >= LIMITE;
  return (
    <Panel>
      <PanelHeader title={aberto ? `${titulo} (${mais ? '20+' : lista.length})` : titulo} hint={hint}>
        {recolhido ? <Button size="sm" onClick={() => setAberto((a) => !a)}>{aberto ? 'Recolher' : 'Mostrar'}</Button> : null}
        {aberto && mais ? <TextLink onClick={() => setTodos(true)}>Ver todos</TextLink> : null}
      </PanelHeader>
      {aberto ? (
        lidas.erro ? <Alert tone="error">{lidas.erro}</Alert>
          : <TabelaCreditos linhas={lista.slice(0, 20)} acoes={acoes} divergencia={divergencia} />
      ) : null}
      {todos ? <TodosCreditos titulo={titulo} filtros={filtros} acoes={acoes} divergencia={divergencia} onFechar={() => setTodos(false)} /> : null}
    </Panel>
  );
}

function TabelaCreditos({ linhas: lista, acoes, divergencia, extra, rotuloExtra }: {
  linhas: Linha[]; acoes: Acao[]; divergencia?: boolean; extra?: (l: Linha) => ReactNode; rotuloExtra?: string;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Cliente</Th>
          <Th numeric>Limite aprovado</Th>
          {divergencia ? <><Th numeric>Limite no Winthor</Th><Th numeric>Diferença</Th></> : <><Th numeric>Uso</Th><Th>Rating atual</Th><Th>Validade</Th><Th numeric>Compras</Th><Th>Destino</Th></>}
          {extra ? <Th>{rotuloExtra}</Th> : null}
          <Th />
        </tr>
      </thead>
      <tbody>
        {lista.map((l) => (
          <Tr key={l.ID}>
            <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>CODCLI {l.CODCLI} · {ROTULO_SITUACAO[String(l.SITUACAO)] ?? String(l.SITUACAO ?? '').toLowerCase()}</RowMeta></Td>
            <Td numeric><Reais v={l.LIMITE} /></Td>
            {divergencia ? (
              <>
                <Td numeric><Reais v={l.LIMITE_WINTHOR} zeroEhDado /></Td>
                <Td numeric><Reais v={Math.abs(n(l.LIMITE_WINTHOR) - n(l.LIMITE))} /></Td>
              </>
            ) : (
              <>
                <Td numeric><Txt v={n(l.LIMITE) ? pct((n(l.UTILIZADO) / n(l.LIMITE)) * 100, 0) : ''} /></Td>
                <Td><Rating r={l.RATING_ATUAL || l.RATING_PUB} /></Td>
                <Td>{fmtData(l.FIM_VALIDADE)}</Td>
                <Td numeric>{inteiro(l.COMPRAS_QTD)}</Td>
                <Td><Txt v={l.SITUACAO === 'REANALISE' ? l.MOTIVO_ENCAMINHAMENTO : String(l.DESTINO ?? '').toLowerCase()} /></Td>
              </>
            )}
            {extra ? <Td>{extra(l)}</Td> : null}
            <Td numeric>
              {acoes.map((a) => (
                <Button key={a.rotulo} size="sm" variant={a.principal ? 'primary' : 'secondary'} disabled={!a.pode || (a.rotulo === 'Abrir' && !l.CARD_ID)}
                  title={a.pode ? undefined : a.motivo} onClick={() => a.fazer(l)}>{a.rotulo}</Button>
              ))}
            </Td>
          </Tr>
        ))}
        {!lista.length ? <Tr><Td colSpan={9}><Status tone="live">Nenhum crédito neste grupo.</Status></Td></Tr> : null}
      </tbody>
    </Table>
  );
}

const POR_PAGINA = 20;

function TodosCreditos({ titulo, filtros, acoes, divergencia, onFechar }: {
  titulo: string; filtros: Record<string, unknown>; acoes: Acao[]; divergencia?: boolean; onFechar: () => void;
}) {
  const [pagina, setPagina] = useState(1);
  const total = useLeitura(() => linha('ccCredCreditoTotal', filtros), []);
  const lista = useLeitura(() => linhas('ccCredCreditoListar', { ...filtros, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), [pagina]);
  const t = n(total.dados?.TOTAL);
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Todos os créditos do grupo.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {lista.erro ? <Alert tone="error">{lista.erro}</Alert> : null}
          <TabelaCreditos linhas={lista.dados ?? []} acoes={acoes} divergencia={divergencia} />
        </DialogBody>
        <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(t / POR_PAGINA))} total={t} unit={t === 1 ? 'crédito' : 'créditos'}
          onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
      </DialogContent>
    </Dialog>
  );
}

function DialogoCredito({ tipo, credito, onFechar, onFeito }: { tipo: 'abrir' | 'concluir'; credito: Linha; onFechar: () => void; onFeito: () => void }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const fazer = async (resultado?: string) => {
    setGravando(true);
    const e = tipo === 'abrir'
      ? await executar('ccCredReanaliseAbrir', { creditoId: credito.ID, motivo: texto.trim() })
      : await executar('ccCredReanaliseConcluir', { creditoId: credito.ID, resultado, parecer: texto.trim() });
    setGravando(false);
    if (e) return setErro(e);
    onFeito();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipo === 'abrir' ? 'Encaminhar para Reanálise' : 'Concluir a reanálise'} · {credito.CLIENTE_NOME}</DialogTitle>
          <DialogDescription>
            {tipo === 'abrir' ? 'Antecipa o que a rotina faria no vencimento.' : 'Renovar abre um novo período com o mesmo limite; obsoleto gera a pendência de bloquear o limite. A alçada é a do limite vigente; quem analisou não decide.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <LabelledField label={tipo === 'abrir' ? 'Motivo' : 'Parecer'} obrigatorio={tipo === 'concluir'}>
            <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </LabelledField>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          {tipo === 'abrir' ? <Button variant="primary" onClick={() => fazer()} disabled={gravando}>Encaminhar</Button> : (
            <>
              <Button variant="danger" onClick={() => fazer('OBSOLETO')} disabled={gravando || !texto.trim()}>Encerrar como obsoleto</Button>
              <Button variant="primary" onClick={() => fazer('RENOVADA')} disabled={gravando || !texto.trim()}>Renovar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
