// Card do processo, opção B "Tudo em Nesta fase" (T-213): blocos que abrem e fecham — prazo e situação, andamentos,
// custos, acordo e dossiê. Na fase `dossie` (dossiê da cobrança ainda não enviado) o bloco é o próprio dossiê.
// Os mesmos blocos, sem ações, são a ficha de leitura (T-216).

import { useState } from 'react';
import { fmtData, fmtDataHora } from '@/lib/formato';
import { tomDoPrazo } from '@/lib/juridico/prazo';
import {
  Alert, Code, Evento, Forte, Linha, LinhaDoTempo, Nota, Progresso, Recolhivel, Status,
} from '@/components/page';
import { aposParcela, brl, CARTEIRA_NOME, hojeLocal, MOTIVOS, num, pct, rotuloCusto, SITUACAO_ACORDO, useLimiares } from '../comum';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { recarregarFicha, useFicha, type Ficha } from '../ficha';
import { DossiePendencias } from '../DossiePendencias';
import { Parcelas } from './Parcelas';


export function BlocosDoProcesso({ ficha, onAlterado, leitura }: { ficha: Ficha; onAlterado: () => Promise<void> | void; leitura?: boolean }) {
  const limiares = useLimiares();
  const [aviso, setAviso] = useState('');
  const { processo: pr, custoResumo: cr, acordo } = ficha;
  if (!leitura && pr.FASE_CHAVE === 'dossie' && pr.ORIGEM === 'COBRANCA' && !pr.DOSSIE_ENVIADO_EM && !pr.ENCERRADO_EM) {
    return <DossiePendencias ficha={ficha} onAlterado={onAlterado} />;
  }
  const prazo = tomDoPrazo(pr.DIAS_PRAZO, limiares.vermelho, limiares.amarelo);
  const acimaMeta = cr.pct > limiares.meta;
  const ac = acordo ? SITUACAO_ACORDO[acordo.SITUACAO] ?? SITUACAO_ACORDO.ANDAMENTO : null;
  const pagas = ficha.parcelas.filter((p) => p.SITUACAO === 'PAGA').length;
  const vencidas = ficha.parcelas.filter((p) => Number(p.VENCIDA)).length;

  return (
    <>
      {pr.ENCERRADO_EM ? (
        <Alert tone="info">
          Encerrado em {fmtData(pr.ENCERRADO_EM)} · {MOTIVOS[pr.MOTIVO_ENCERRAMENTO] ?? pr.MOTIVO_ENCERRAMENTO}
          {pr.MOTIVO_TEXTO ? ` · ${pr.MOTIVO_TEXTO}` : ''} · recuperado {brl(pr.RECUPERADO) || 'R$ 0,00'}.
        </Alert>
      ) : null}
      {pr.ALERTA_CARGA && !pr.CARGA_CONFERIDA_EM ? <Alert tone="warn">Carga a conferir: {pr.ALERTA_CARGA}</Alert> : null}

      <Recolhivel titulo="Prazo e situação atual" aberto dica={pr.PRAZO ? <Status tone={prazo.tom}>{prazo.texto}</Status> : 'sem prazo'}>
        <Nota>{pr.PRAZO ? `Prazo de ${fmtData(pr.PRAZO)}${pr.PRAZO_DESCRICAO ? `: ${pr.PRAZO_DESCRICAO}` : ''}.` : 'Sem prazo registrado.'}</Nota>
        <Forte>{pr.STATUS || 'Sem situação registrada.'}</Forte>
        <Linha>
          <Code prefix="Carteira ">{CARTEIRA_NOME[pr.CARTEIRA] ?? pr.CARTEIRA}</Code>
          <Code prefix="Filial ">{pr.FILIAL || '—'}</Code>
          <Code prefix="Linha ">{pr.LINHA === 'GALDERMA' ? 'Galderma' : 'demais'}</Code>
          {pr.TRIBUNAL ? <Code prefix="Tribunal ">{pr.TRIBUNAL}</Code> : null}
          {pr.FORMA_CITACAO ? <Code prefix="Citação ">{pr.FORMA_CITACAO.toLowerCase()}</Code> : null}
          {Number(pr.SUBSTABELECER) ? <Status tone="attention">Substabelecer</Status> : null}
        </Linha>
      </Recolhivel>

      <Recolhivel titulo="Andamentos" aberto={!leitura}
        dica={pr.DIAS_SEM_ANDAMENTO === null ? 'nenhum' : `último há ${pr.DIAS_SEM_ANDAMENTO} dia(s)`}>
        {ficha.andamentos.length ? (
          <LinhaDoTempo>
            {ficha.andamentos.map((a) => (
              <Evento key={a.ID} meta={`${fmtDataHora(a.EM)} · ${a.AUTOR_NOME || (a.TIPO === 'CARGA' ? 'carga inicial' : 'sistema')}${a.PERIODO ? ` · ${a.PERIODO}` : ''}`}>
                {a.TEXTO}
              </Evento>
            ))}
          </LinhaDoTempo>
        ) : <Nota>Nenhum andamento registrado.</Nota>}
      </Recolhivel>

      <Recolhivel titulo="Custos" dica={cr.total ? `${brl(cr.total)} · ${pct(cr.pct)} do valor${cr.aPagar ? ` · ${brl(cr.aPagar)} a pagar` : ''}` : 'sem custo'}>
        {cr.total ? (
          <Linha>
            <Status tone={acimaMeta ? 'attention' : 'live'}>Custo ÷ valor {pct(cr.pct)}</Status>
            <Nota>meta de {limiares.meta}% do valor em cobrança</Nota>
          </Linha>
        ) : null}
        {ficha.custos.map((c) => (
          <Linha key={c.ID}>
            <Forte>{rotuloCusto(c.TIPO)}</Forte>
            <Code>{fmtData(c.DATA)}</Code>
            <Code>{brl(c.VALOR)}</Code>
            <Status tone={Number(c.PAGO) ? 'live' : 'attention'}>{Number(c.PAGO) ? 'Pago' : 'A pagar'}</Status>
            {c.guia ? <Code prefix="guia ">{c.guia.nome}</Code> : null}
            {c.comprovante ? <Code prefix="comprovante ">{c.comprovante.nome}</Code> : null}
          </Linha>
        ))}
        {!ficha.custos.length ? <Nota>Nenhum custo lançado.</Nota> : null}
      </Recolhivel>

      <Recolhivel titulo="Acordo judicial" aberto={!!acordo && !leitura}
        dica={acordo ? <Status tone={ac!.tom}>{ac!.texto} · {pagas} de {ficha.parcelas.length} pagas{vencidas ? ` · ${vencidas} vencida(s)` : ''}</Status>
          : `política: entrada de ${limiares.entradaMin}%, até ${limiares.parcelasMax} parcelas, honorários de ${limiares.honorarios}%`}>
        {acordo ? (
          <>
            <Linha>
              <Code prefix="Valor ">{brl(acordo.VALOR)}</Code>
              <Code prefix="Entrada ">{brl(acordo.ENTRADA)}</Code>
              <Code prefix="Honorários ">{`${brl(acordo.HONORARIOS)}${Number(acordo.HONORARIOS_PAGOS) ? ' (pagos)' : ''}`}</Code>
            </Linha>
            {aviso ? <Alert tone="warn">{aviso}</Alert> : null}
            <Parcelas parcelas={ficha.parcelas} acordo={acordo} pode={!leitura && ficha.pode.lancar} hoje={hojeLocal()}
              onAlterado={async ({ quitado }) => { setAviso(await aposParcela(quitado, pr.ID)); await onAlterado(); }} />
          </>
        ) : (
          <Nota>
            {`Use "Registrar acordo". Acima de ${brl(limiares.alcada)} ou fora da política, o acordo nasce aguardando aprovação.`}
          </Nota>
        )}
      </Recolhivel>

      {pr.ORIGEM === 'COBRANCA' ? (
        <Recolhivel titulo="Dossiê" dica={`${ficha.progresso.ok} de ${ficha.progresso.total}${pr.DOSSIE_ENVIADO_EM ? ` · enviado em ${fmtData(pr.DOSSIE_ENVIADO_EM)}` : ''}`}>
          <Progresso valor={ficha.progresso.ok} total={ficha.progresso.total} rotulo="Progresso do dossiê" />
          {ficha.itens.map((i) => (
            <Linha key={i.ID}>
              <Code>{i.SITUACAO === 'OK' ? 'conferido' : i.SITUACAO === 'NA' ? 'não se aplica' : 'pendente'}</Code>
              <span>{i.TEXTO}</span>
              {i.anexos.map((a) => <Code key={a.id}>{a.nome}</Code>)}
            </Linha>
          ))}
        </Recolhivel>
      ) : null}

      {num(pr.VALOR_ATUALIZADO) > 0 ? <Nota>Valor atualizado no envio: {brl(pr.VALOR_ATUALIZADO)}.</Nota> : null}
    </>
  );
}

/** "Nesta fase" do card: os blocos sobre a ficha que o quadro pediu ao abrir o card. */
export function NestaFase(ctx: ExtensaoContexto) {
  const { ficha, erro } = useFicha(ctx.card.id);
  if (erro) return <Nota>{erro}</Nota>;
  if (!ficha) return <Nota>Carregando o processo…</Nota>;
  return <BlocosDoProcesso ficha={ficha} onAlterado={async () => { await recarregarFicha(ctx.card.id); await ctx.recarregar(); }} />;
}
