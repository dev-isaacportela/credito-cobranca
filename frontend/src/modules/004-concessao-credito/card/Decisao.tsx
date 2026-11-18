// Decisão no card, opção C: três passos — conferir (da ficha), decidir (planos lidos só ao clicar em
// "Registrar decisão": card = 2, C-7) e o que acontece até o Winthor. Quem propõe não decide: o botão
// fica desabilitado com o motivo. Erros do servidor no Alert do passo.

import { useState, type ReactNode } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, Field, Input, LabelledField, Panel, PanelHeader, RowMeta, SelectMenu, Status, Table, Td, Textarea, Toolbar, Tr,
} from '@/components/page';
import { motivoNaoDecide } from '@/lib/concessao-credito/regras';
import { executar, FORMAS, invalidarFicha, n, opcoes, ROTULO_FONTE, useAnalisePublica, useMembro, type Linha } from '../dados';
import { Pares, Rating, Reais, Txt } from '../pecas';

type Conferencia = [boolean | 'aviso', string, string];

export default function Decisao({ ctx, ficha }: { ctx: ExtensaoContexto; ficha: Linha }) {
  const membro = useMembro();
  const s = ficha.solicitacao as Linha;
  const alcada = (ficha.alcada ?? {}) as Linha;
  const m = (ficha.motor ?? null) as Linha | null;
  const publica = s.CARTEIRA === 'PUBLICA';
  const docs = ((m?.detalhes?.docs ?? []) as Linha[]);
  const motivo = motivoNaoDecide(ficha, membro);
  const limiteMotor = n(s.MOTOR_LIMITE || m?.limiteSugerido);
  // Na Pública o rating efetivo, a exposição e a trava de aprovar (contrato) são da análise do órgão (005).
  const pub = useAnalisePublica(ctx.card, Number(s.ID), publica);
  const orgao = (pub?.analise ?? null) as Linha | null;
  const motorOrgao = (pub?.motor ?? null) as Linha | null;
  const naoAprova = !publica ? null
    : !pub ? 'Carregando a análise do órgão…'
      : !motorOrgao ? 'Calcule o motor do órgão antes de aprovar.'
        : motorOrgao.podeAprovar ? null : `Aprovar não será aceito: ${String(motorOrgao.motivoNaoAprovar)}`;
  const ratingEfetivo = publica ? String(orgao?.RATING_PUB ?? '') : String(ficha.ratingEfetivo ?? '');

  const conferencias: Conferencia[] = [
    [!motivo || !/exige/.test(motivo), 'Alçada', `${alcada.rotulo ?? '—'} · você tem nível ${membro.nivel}`],
    [!(Number(s.ANALISTA_ID) === membro.membroId || String(s.PROPOSTA_POR ?? '').split(',').map(Number).includes(membro.membroId)),
      'Segregação de funções', 'Quem analisou ou propôs não decide'],
    ...(publica ? [] : [
      [!!ficha.consultasValidas, 'Consultas obrigatórias válidas', s.CONS_DATA ? `Feitas em ${fmtData(s.CONS_DATA)}` : 'Não registradas'] as Conferencia,
      [docs.every((d) => d.atendido) ? true : 'aviso', 'Documentos exigidos', `${docs.filter((d) => d.atendido).length} de ${docs.length}`] as Conferencia,
      [s.AJUSTE_SITUACAO !== 'PENDENTE' && !!ratingEfetivo, 'Rating efetivo definido', ratingEfetivo || 'Sem rating'] as Conferencia,
    ]),
    [alcada.excecao ? 'aviso' : true, 'Exceção ao motor', alcada.excecao ? `Exige justificativa: ${((alcada.motivos ?? []) as string[]).join(', ')}` : 'Dentro do motor'],
  ];

  return (
    <>
      <Panel>
        <PanelHeader title="1 · Conferir" hint="O sistema confere de novo no servidor antes de aceitar a decisão." />
        <Table>
          <tbody>
            {conferencias.map(([ok, rotulo, detalhe]) => (
              <Tr key={rotulo}>
                <Td><Status tone={ok === true ? 'live' : ok === 'aviso' ? 'attention' : 'alert'}>{rotulo}</Status></Td>
                <Td>{detalhe}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Panel>
        <PanelHeader title="2 · Decidir" hint={`Alçada exigida: ${alcada.rotulo ?? '—'} (valor da alçada ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n(alcada.valor))}).`} />
        <Pares itens={[
          ['Rating efetivo', <Rating r={ratingEfetivo} />],
          ...(publica ? [] : [
            ['Score final', <Txt v={m?.score ?? ''} />] as [string, ReactNode],
            ['Resultado do motor', <Txt v={m?.resultado} />] as [string, ReactNode],
            ['Fonte pagadora', <Txt v={[ROTULO_FONTE[s.FP_TIPO] ?? s.FP_TIPO, n(s.FP_PRAZO_DIAS) ? `recebe em ${s.FP_PRAZO_DIAS} dias` : ''].filter(Boolean).join(' · ')} />] as [string, ReactNode],
            ['Garantia', <Txt v={s.GARANTIA} />] as [string, ReactNode],
          ]),
          [publica ? 'Exposição do órgão' : 'Limite sugerido pelo motor', <Reais v={publica ? orgao?.EXPOSICAO : limiteMotor} />],
          ['Limite proposto pelo analista', <Reais v={s.LIMITE_PROPOSTO} />],
          ['Parecer do analista', <Txt v={s.PARECER_ANALISTA} />],
        ]} />
        <FormularioDecisao ctx={ctx} ficha={ficha} motivo={motivo} naoAprova={naoAprova} publica={publica} limiteMotor={limiteMotor} />
      </Panel>
      <Panel>
        <PanelHeader title="3 · Aplicar no Winthor" hint="O sistema não escreve no Winthor." />
        <Table>
          <tbody>
            <Tr><Td><Status tone="live">Ao registrar a aprovação</Status></Td>
              <Td>O rating na concessão fica congelado e nasce a pendência para o Winthor: aplicar o limite, o plano e a forma aprovados.</Td></Tr>
            <Tr><Td><Status tone="attention">Formalização e Liberação</Status></Td>
              <Td>{publica ? 'Na Pública o crédito nasce na própria decisão (o quadro não tem Liberação).' : 'Termo assinado na Formalização; na Liberação, quem aplica no ERP marca a pendência como aplicada.'}</Td></Tr>
            <Tr><Td><Status tone="off">Pendência aplicada</Status></Td>
              <Td>Só então o crédito vai para Gestão de crédito, vigente pela validade da política.</Td></Tr>
          </tbody>
        </Table>
      </Panel>
    </>
  );
}

function FormularioDecisao({ ctx, ficha, motivo, naoAprova, publica, limiteMotor }: {
  ctx: ExtensaoContexto; ficha: Linha; motivo: string | null; naoAprova: string | null; publica: boolean; limiteMotor: number;
}) {
  const s = ficha.solicitacao as Linha;
  const alcada = (ficha.alcada ?? {}) as Linha;
  const [planos, setPlanos] = useState<Linha[] | null>(null);
  const [f, setF] = useState({ limiteAprovado: String(n(s.LIMITE_PROPOSTO) || ''), planoCod: '', forma: '', parecer: '', justificativaExcecao: '' });
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const mudar = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const excecao = !!alcada.excecao || (!publica && n(f.limiteAprovado) > limiteMotor);

  const abrir = async () => {
    setErro('');
    try {
      setPlanos(await linhas('ccBasePlanoListar', { ativo: 1 }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao ler os planos.');
    }
  };
  const decidir = async (resultado: 'APROVADA' | 'PRE_APROVADA' | 'RECUSADA') => {
    setGravando(true);
    const e = await executar('ccCredDecisaoRegistrar', {
      solicitacaoId: s.ID, resultado, limiteAprovado: resultado === 'RECUSADA' ? 0 : n(f.limiteAprovado), planoCod: f.planoCod, forma: f.forma,
      parecer: f.parecer.trim(), cargoAlcada: '', justificativaExcecao: f.justificativaExcecao.trim(),
    });
    setGravando(false);
    setErro(e ?? '');
    if (!e) {
      invalidarFicha(ctx.card.id);
      await ctx.recarregar();
    }
  };

  if (!planos) {
    return (
      <>
        {erro ? <Toolbar><Alert tone="error">{erro}</Alert></Toolbar> : null}
        <Toolbar>
          <Button variant="primary" onClick={abrir} disabled={!!motivo || ctx.travado} title={motivo ?? undefined}>Registrar decisão</Button>
          {motivo ? <RowMeta>{motivo}</RowMeta> : naoAprova ? <RowMeta>{naoAprova} Recusar continua possível.</RowMeta> : null}
        </Toolbar>
      </>
    );
  }
  return (
    <>
      {erro ? <Toolbar><Alert tone="error">{erro}</Alert></Toolbar> : null}
      <Toolbar>
        <LabelledField label="Limite aprovado (R$)" obrigatorio>
          <Input type="number" min={0} value={f.limiteAprovado} onChange={(e) => mudar('limiteAprovado')(e.target.value)} />
        </LabelledField>
        <Field label="Plano de pagamento" obrigatorio hint="Planos do Winthor">
          <SelectMenu label="Plano" value={f.planoCod} onChange={mudar('planoCod')}
            options={planos.map((p) => ({ value: String(p.CODIGO), label: String(p.DESCRICAO), hint: p.PRAZO_MEDIO ? `prazo médio ${p.PRAZO_MEDIO} dias` : undefined }))} />
        </Field>
        <Field label="Forma de pagamento" obrigatorio>
          <SelectMenu label="Forma" value={f.forma} onChange={mudar('forma')} options={opcoes(FORMAS)} />
        </Field>
      </Toolbar>
      <Toolbar>
        <LabelledField label="Parecer técnico" obrigatorio hint="Capacidade de pagamento, garantias, exposição, condicionantes.">
          <Textarea cols={50} rows={3} value={f.parecer} onChange={(e) => mudar('parecer')(e.target.value)} />
        </LabelledField>
        {excecao ? (
          <LabelledField label="Justificativa de exceção" obrigatorio hint="O limite passa do motor ou a análise tem exceção.">
            <Textarea cols={50} rows={3} value={f.justificativaExcecao} onChange={(e) => mudar('justificativaExcecao')(e.target.value)} />
          </LabelledField>
        ) : null}
      </Toolbar>
      <Toolbar>
        <Button variant="danger" onClick={() => decidir('RECUSADA')} disabled={gravando || !f.parecer.trim()}>Recusar</Button>
        {publica ? <Button onClick={() => decidir('PRE_APROVADA')} disabled={gravando || !!naoAprova} title={naoAprova ?? undefined}>Pré-aprovar</Button> : null}
        <Button variant="primary" onClick={() => decidir('APROVADA')} disabled={gravando || !!naoAprova} title={naoAprova ?? undefined}>Registrar aprovação</Button>
        <Button variant="ghost" onClick={() => setPlanos(null)}>Cancelar</Button>
        <RowMeta>{naoAprova ?? 'Recusar exige parecer. Aprovar exige também limite, plano e forma de pagamento.'}</RowMeta>
      </Toolbar>
    </>
  );
}

