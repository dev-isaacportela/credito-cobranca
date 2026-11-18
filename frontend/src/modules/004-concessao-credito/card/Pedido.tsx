// Card do pedido acima do limite, opção A: mostrador de limite e flexibilização (SVG, `zonaFlex`),
// recomendação do analista e liberação (planos lidos só ao clicar em "Liberar": card = 2, C-7).

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, Button, Field, LabelledField, Panel, PanelHeader, RowMeta, SelectMenu, Status, Textarea, Toolbar,
} from '@/components/page';
import { motivoNaoLibera, ROTULO_ZONA, zonaFlex } from '@/lib/concessao-credito/regras';
import { executar, FORMAS, invalidarFicha, n, opcoes, pct, ROTULO_RESULTADO, useFicha, useMembro, type Linha } from '../dados';
import { Pares, Reais, Txt } from '../pecas';

const CONDICOES = ['Liberação pontual (só este pedido)', 'Aumento temporário', 'Mediante garantia adicional', 'Pagamento antecipado ou sinal', 'Liberação parcial'];
const TOM_ZONA = { dentro: 'live', flexivel: 'attention', acima: 'alert' } as const;

export function ConteudoPedido({ ctx }: { ctx: ExtensaoContexto }) {
  const { ficha, erro } = useFicha('ccCredPedidoFicha', ctx.card);
  if (erro) return <Alert tone="error">{erro}</Alert>;
  if (!ficha) return <RowMeta>Carregando o pedido…</RowMeta>;
  const p = ficha.pedido as Linha;
  const risco = (ficha.risco ?? {}) as Linha;
  const limite = n(p.LIMITE_NA_DATA);
  const exposicao = n(p.UTILIZADO_NA_DATA) + n(p.VALOR);
  const flex = n(risco.FLEX_VALOR);
  const zona = zonaFlex(exposicao, limite, flex);
  return (
    <>
      <Panel>
        <PanelHeader title="Limite e flexibilização"
          hint={`Exposição com o pedido ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(exposicao)}${limite ? ` · ${pct((exposicao / limite) * 100, 0)} do limite` : ''}`}>
          <Status tone={TOM_ZONA[zona]}>{ROTULO_ZONA[zona]}</Status>
        </PanelHeader>
        <Toolbar>
          <Mostrador limite={limite} utilizado={n(p.UTILIZADO_NA_DATA)} pedido={n(p.VALOR)} flex={flex} />
        </Toolbar>
        <Pares itens={[
          ['Limite na data do pedido', <Reais v={limite} />],
          ['Utilizado antes do pedido', <Reais v={p.UTILIZADO_NA_DATA} />],
          ['Flexibilização da faixa', flex ? <>até <Reais v={flex} /> ({pct(risco.FLEX_PCT, 0)})</> : <Txt v={risco.FLEX_MOTIVOS ? `não flexibiliza: ${risco.FLEX_MOTIVOS}` : ''} />],
          ['Excesso', <><Reais v={p.EXCESSO} /> ({pct(p.EXCESSO_PCT)})</>],
          ['Maior atraso em aberto', <Txt v={n(p.ATRASO_NA_DATA) ? `${p.ATRASO_NA_DATA} dias` : ''} />],
          ['Alçada exigida', <>{p.ALCADA_EXIGIDA}{Number(p.CRITICA) ? <RowMeta>liberação crítica: parecer obrigatório</RowMeta> : null}</>],
          ['Justificativa', <Txt v={p.JUSTIFICATIVA} />],
        ]} />
      </Panel>
      <Recomendacao ctx={ctx} ficha={ficha} />
      {p.DECISAO_RESULTADO ? (
        <Alert tone={p.DECISAO_RESULTADO === 'LIBERADO' ? 'success' : 'info'}>
          Pedido {ROTULO_RESULTADO[p.DECISAO_RESULTADO]?.toLowerCase() ?? p.DECISAO_RESULTADO}
          {(ficha.decisao as Linha | null)?.RESPONSAVEL_NOME ? ` por ${(ficha.decisao as Linha).RESPONSAVEL_NOME}` : ''}
          {(ficha.decisao as Linha | null)?.CONDICAO ? ` · ${(ficha.decisao as Linha).CONDICAO}` : ''}
          {p.MOTIVO_RECUSA ? ` · ${p.MOTIVO_RECUSA}` : ''}.
        </Alert>
      ) : <Liberacao ctx={ctx} ficha={ficha} />}
    </>
  );
}

/** Duas barras: utilizado + pedido sobre as zonas até o limite, flexível e acima do teto. */
function Mostrador({ limite, utilizado, pedido, flex }: { limite: number; utilizado: number; pedido: number; flex: number }) {
  const teto = limite + flex;
  const escala = Math.max(teto * 1.15, utilizado + pedido, 1);
  const x = (v: number) => (v / escala) * 100;
  return (
    <svg width="100%" height="34" viewBox="0 0 100 34" preserveAspectRatio="none" role="img"
      aria-label={`Utilizado ${utilizado}, pedido ${pedido}, limite ${limite}, teto flexível ${teto}`}>
      <rect x="0" y="0" width="100" height="12" rx="1" style={{ fill: 'var(--muted)' }} />
      <rect x="0" y="0" width={x(utilizado)} height="12" style={{ fill: 'var(--data-seq-2)' }} />
      <rect x={x(utilizado)} y="0" width={x(pedido)} height="12" style={{ fill: 'var(--data-seq-4)' }} />
      <rect x="0" y="18" width={x(limite)} height="12" style={{ fill: 'var(--primary)' }} />
      <rect x={x(limite)} y="18" width={x(flex)} height="12" style={{ fill: 'var(--attention)' }} />
      <rect x={x(teto)} y="18" width={Math.max(0, 100 - x(teto))} height="12" style={{ fill: 'var(--destructive)' }} />
    </svg>
  );
}

function Recomendacao({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const p = ficha.pedido as Linha;
  const pode = ficha.pode as Linha;
  const [texto, setTexto] = useState(String(p.RECOMENDACAO ?? ''));
  const [erro, setErro] = useState('');
  const salvar = async () => {
    if (texto === String(p.RECOMENDACAO ?? '')) return;
    const e = await executar('ccCredPedidoSalvar', { pedidoId: p.ID, recomendacao: texto, analistaId: 0 });
    setErro(e ?? '');
    if (!e) invalidarFicha(ctx.card.id);
  };
  return (
    <Panel>
      <PanelHeader title="Recomendação do analista" hint="Quem recomenda não libera o pedido (segregação de funções)." />
      {erro ? <Toolbar><Alert tone="error">{erro}</Alert></Toolbar> : null}
      <Toolbar>
        <LabelledField label="Recomendação" hint={pode.salvar ? 'Grava ao sair do campo.' : 'Só o analista do caso ou o superior recomenda.'}>
          <Textarea cols={70} rows={3} value={texto} disabled={!pode.salvar || !!p.DECISAO_RESULTADO || ctx.travado}
            onChange={(e) => setTexto(e.target.value)} onBlur={salvar} />
        </LabelledField>
      </Toolbar>
    </Panel>
  );
}

function Liberacao({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const membro = useMembro();
  const p = ficha.pedido as Linha;
  const motivo = motivoNaoLibera(ficha, membro);
  const [planos, setPlanos] = useState<Linha[] | null>(null);
  const [f, setF] = useState({ condicao: '', planoCod: '', forma: '', parecer: '', motivo: '' });
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const mudar = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const abrir = async () => {
    try {
      setPlanos(await linhas('ccBasePlanoListar', { ativo: 1 }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao ler os planos.');
    }
  };
  const decidir = async (resultado: 'LIBERADO' | 'RECUSADO') => {
    setGravando(true);
    const e = await executar('ccCredPedidoDecidir', { pedidoId: p.ID, resultado, ...f, cargoAlcada: '' });
    setGravando(false);
    setErro(e ?? '');
    if (!e) {
      invalidarFicha(ctx.card.id);
      await ctx.recarregar();
    }
  };
  return (
    <Panel>
      <PanelHeader title="Liberação" hint={`Alçada: ${p.ALCADA_EXIGIDA}. Liberar cria a pendência "Liberar pedido ${p.NUMERO_PEDIDO}" no Winthor.`} />
      {erro ? <Toolbar><Alert tone="error">{erro}</Alert></Toolbar> : null}
      {!planos ? (
        <Toolbar>
          <Button variant="primary" onClick={abrir} disabled={!!motivo || ctx.travado} title={motivo ?? undefined}>Liberar ou recusar</Button>
          {motivo ? <RowMeta>{motivo}</RowMeta> : null}
        </Toolbar>
      ) : (
        <>
          <Toolbar>
            <Field label="Condição de liberação" obrigatorio>
              <SelectMenu label="Condição" value={f.condicao} onChange={mudar('condicao')} options={opcoes(CONDICOES)} />
            </Field>
            <Field label="Plano de pagamento" obrigatorio>
              <SelectMenu label="Plano" value={f.planoCod} onChange={mudar('planoCod')} options={planos.map((x) => ({ value: String(x.CODIGO), label: String(x.DESCRICAO) }))} />
            </Field>
            <Field label="Forma de pagamento" obrigatorio>
              <SelectMenu label="Forma" value={f.forma} onChange={mudar('forma')} options={opcoes(FORMAS)} />
            </Field>
          </Toolbar>
          <Toolbar>
            <LabelledField label="Parecer" hint="Obrigatório em liberação crítica ou com o cliente bloqueado pela régua de cobrança.">
              <Textarea cols={40} rows={3} value={f.parecer} onChange={(e) => mudar('parecer')(e.target.value)} />
            </LabelledField>
            <LabelledField label="Motivo da recusa" hint="Obrigatório para recusar; o comercial é avisado.">
              <Textarea cols={40} rows={3} value={f.motivo} onChange={(e) => mudar('motivo')(e.target.value)} />
            </LabelledField>
          </Toolbar>
          <Toolbar>
            <Button variant="danger" onClick={() => decidir('RECUSADO')} disabled={gravando || !f.motivo.trim()}>Recusar</Button>
            <Button variant="primary" onClick={() => decidir('LIBERADO')} disabled={gravando}>Liberar</Button>
            <Button variant="ghost" onClick={() => setPlanos(null)}>Cancelar</Button>
          </Toolbar>
        </>
      )}
    </Panel>
  );
}
