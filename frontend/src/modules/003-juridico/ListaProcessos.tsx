// Lista de processos (T-212): três grupos (em andamento, a ajuizar, encerrados — este só com "Mostrar encerrados"),
// cada um paginado no servidor, com os filtros da barra. Ordem do servidor: prazo, depois valor.

import { useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { tomDoPrazo } from '@/lib/juridico/prazo';
import {
  Alert, Button, CampoBusca, Code, Dash, EmptyState, Field, FilterChip, Marcar, Pagination, Panel, PanelHeader,
  RowMeta, RowTitle, SearchInput, SelectMenu, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { brl, FASES, filtroParaServidor, nomeCurto, num, OPCOES_CARTEIRA, OPCOES_LINHA, useDados, useEspera, useLimiares, type FiltroProcesso, type Linha } from './comum';

const POR_PAGINA = 20;
const GRUPOS = [
  { grupo: 'ANDAMENTO', titulo: 'Em andamento', hint: 'ajuizados, com número dos autos' },
  { grupo: 'AJUIZAR', titulo: 'A ajuizar', hint: 'dossiê, recebidos, petição e custas, ainda sem autos' },
  { grupo: 'ENCERRADO', titulo: 'Encerrados', hint: 'com o motivo do encerramento' },
];
const OPCOES_FASE = [{ value: '', label: 'Todas as etapas' }, ...FASES.map((f) => ({ value: f.chave, label: f.nome }))];

export function ListaProcessos({ filtro, onFiltro, onAbrir }: {
  filtro: FiltroProcesso; onFiltro: (f: FiltroProcesso) => void; onAbrir: (p: Linha) => void;
}) {
  const [texto, setTexto] = useState(filtro.busca);
  const busca = useEspera(texto);
  const [encerrados, setEncerrados] = useState(false);
  const efetivo = { ...filtro, busca };
  const chave = JSON.stringify(efetivo);
  const total = useDados(() => linhas('ccJurProcessoTotal', filtroParaServidor(efetivo)), chave);
  const t = total.dados?.[0] ?? {};
  const set = (campo: keyof FiltroProcesso) => (v: string) => onFiltro({ ...efetivo, [campo]: v });

  return (
    <Panel>
      <Toolbar>
        <CampoBusca>
          <SearchInput value={texto} onChange={(e) => { setTexto(e.target.value); onFiltro({ ...filtro, busca: e.target.value }); }}
            placeholder="Cliente, número dos autos ou código" aria-label="Buscar processo" />
        </CampoBusca>
        <Field label="Carteira"><SelectMenu label="Carteira" value={filtro.carteira} options={OPCOES_CARTEIRA} onChange={set('carteira')} /></Field>
        <Field label="Etapa"><SelectMenu label="Etapa" value={filtro.faseChave} options={OPCOES_FASE} onChange={set('faseChave')} /></Field>
        <Field label="Linha"><SelectMenu label="Linha" value={filtro.linha} options={OPCOES_LINHA} onChange={set('linha')} /></Field>
        <Marcar checked={encerrados} onChange={setEncerrados}>Mostrar encerrados</Marcar>
      </Toolbar>
      {filtro.faseChave ? <Toolbar><FilterChip label="Etapa" value={nomeCurto(filtro.faseChave)} onClear={() => set('faseChave')('')} /></Toolbar> : null}
      {total.erro ? <Alert tone="error">{total.erro}</Alert> : null}
      {GRUPOS.filter((g) => encerrados || g.grupo !== 'ENCERRADO').map((g) => (
        <Grupo key={g.grupo} {...g} filtro={efetivo} chave={chave} total={num(t[`TOTAL_${g.grupo}`])} valor={num(t[`VALOR_${g.grupo}`])} onAbrir={onAbrir} />
      ))}
    </Panel>
  );
}

function Grupo({ grupo, titulo, hint, filtro, chave, total, valor, onAbrir }: {
  grupo: string; titulo: string; hint: string; filtro: FiltroProcesso; chave: string; total: number; valor: number; onAbrir: (p: Linha) => void;
}) {
  const [pag, setPag] = useState({ chave, pagina: 1 });
  const pagina = pag.chave === chave ? pag.pagina : 1;
  const lim = useLimiares();
  const lista = useDados(() => linhas('ccJurProcessoListar', { ...filtroParaServidor(filtro), grupo, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
    `${chave}:${grupo}:${pagina}`);
  const encerrado = grupo === 'ENCERRADO';

  return (
    <>
      <PanelHeader title={`${titulo} · ${total}`} hint={`${brl(valor) || 'R$ 0,00'} · ${hint}`} />
      {lista.erro ? <Alert tone="error">{lista.erro}</Alert> : null}
      {!lista.dados?.length ? (
        <EmptyState title={lista.carregando ? 'Carregando…' : `Nenhum processo ${titulo.toLowerCase()} com estes filtros.`} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Cliente e processo</Th><Th>Etapa</Th><Th numeric>Valor</Th><Th>{encerrado ? 'Encerramento' : 'Prazo'}</Th><Th>Situação atual</Th><Th>Responsável</Th><Th />
            </tr>
          </thead>
          <tbody>
            {lista.dados.map((p) => {
              const prazo = tomDoPrazo(p.DIAS_PRAZO, lim.vermelho, lim.amarelo);
              return (
                <Tr key={p.ID}>
                  <Td>
                    <RowTitle>{p.NOME_DEVEDOR}</RowTitle>
                    <RowMeta>{[p.AUTOS || 'sem autos', p.TRIBUNAL, p.FILIAL && `filial ${p.FILIAL}`, p.LINHA === 'GALDERMA' && 'Galderma'].filter(Boolean).join(' · ')}</RowMeta>
                    {p.ALERTA_CARGA ? <Status tone="attention">Carga a conferir</Status> : null}
                  </Td>
                  <Td>{nomeCurto(p.FASE_CHAVE)}</Td>
                  <Td numeric>{brl(p.VALOR)}</Td>
                  <Td>
                    {encerrado ? <Code>{p.MOTIVO_ENCERRAMENTO || '—'}</Code>
                      : p.PRAZO ? <Status tone={prazo.tom}>{`${fmtData(p.PRAZO)} · ${prazo.texto}`}</Status> : <Dash />}
                  </Td>
                  <Td>{p.STATUS || <Dash />}</Td>
                  <Td>{p.RESPONSAVEL_NOME || <Dash />}</Td>
                  <Td numeric><Button size="sm" variant="ghost" onClick={() => onAbrir(p)}>Abrir</Button></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {total > POR_PAGINA ? (
        <Pagination page={pagina} lastPage={Math.ceil(total / POR_PAGINA)} total={total} unit="processos" busy={lista.carregando}
          onPrevious={() => setPag({ chave, pagina: pagina - 1 })} onNext={() => setPag({ chave, pagina: pagina + 1 })} />
      ) : null}
    </>
  );
}
