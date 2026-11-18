// Nova solicitação, opção B: assistente em três passos (tipo e cliente → dados → conferir), para
// análise de crédito (ccCredSolicitacaoCriar) e para pedido acima do limite (ccCredPedidoCriar).
// Lê ccBaseClienteListar (busca com espera de 400 ms), ccCredTipoClienteSugerir; pedido: ccBaseClienteFicha.

import { useEffect, useState } from 'react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { CARTEIRAS, type Carteira } from '@/lib/base/carteira';
import { formatarDocumento } from '@/lib/base/documento';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Field, Input, LabelledField, Pilha, RowMeta, RowTitle, SearchInput, SelectMenu, Status, Table, Td, Textarea,
  TextLink, Th, Tr,
} from '@/components/page';
import { motivoTipoCliente, TIPOS_CLIENTE } from '@/lib/concessao-credito/regras';
import { n, useMembro, type Linha } from './dados';
import { Pares, Reais, Txt } from './pecas';

type Tipo = 'analise' | 'pedido';
const PASSOS = ['Tipo e cliente', 'Dados da solicitação', 'Conferir e registrar'];

export default function NovaSolicitacao({ carteira, tipoInicial = 'analise', onFechar, onCriada }: {
  carteira: Carteira; tipoInicial?: Tipo; onFechar: () => void; onCriada: (cardId: number, tipo: Tipo) => void;
}) {
  const membro = useMembro();
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<Linha[]>([]);
  const [cliente, setCliente] = useState<Linha | null>(null);
  const [sugestao, setSugestao] = useState<Linha | null>(null);
  const [posicao, setPosicao] = useState<Linha | null>(null);
  const [form, setForm] = useState({ carteira: carteira as string, tipoCliente: 'NOVO', valor: '', prazoMeses: '', justificativa: '', rca: '', numeroPedido: '' });
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const campo = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Busca de cliente com espera de 400 ms.
  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) return;
    const t = setTimeout(() => {
      linhas('ccBaseClienteListar', {
        setor: carteira === 'PUBLICA' ? 'PUBLICO' : '', carteira: '', agenteId: 0, analistaId: 0, buId: -1, uf: '', tipoPessoa: '', soVencidos: 0,
        situacaoFicha: '', ordem: 'NOME', busca: termo, limite: 8, offset: 0,
      }).then(setClientes).catch((e: Error) => setErro(e.message));
    }, 400);
    return () => clearTimeout(t);
  }, [busca, carteira]);

  const escolher = async (c: Linha) => {
    setCliente(c);
    setErro('');
    const [s, f] = await Promise.allSettled([
      linha('ccCredTipoClienteSugerir', { clienteId: c.ID }),
      tipo === 'pedido' ? acao('ccBaseClienteFicha', { clienteId: c.ID, codcli: 0, documento: '' }) : Promise.resolve(null),
    ]);
    const sug = s.status === 'fulfilled' ? s.value : null;
    setSugestao(sug);
    if (sug) setForm((x) => ({ ...x, tipoCliente: String(sug.TIPO_CLIENTE), carteira: String(sug.CARTEIRA_SUGERIDA || carteira) }));
    setPosicao(f.status === 'fulfilled' && f.value ? (f.value.posicao ?? null) : null);
  };

  const sug = motivoTipoCliente(sugestao);
  const limite = n(posicao?.LIMITE);
  const utilizado = n(posicao?.UTILIZADO);
  const excesso = utilizado + n(form.valor) - limite;
  const nomeCarteira = CARTEIRAS.find((c) => c.codigo === form.carteira)?.nome ?? form.carteira;

  const faltaPasso1 = !cliente ? 'Escolha o cliente.' : '';
  const faltaPasso2 = tipo === 'analise'
    ? (!(n(form.valor) > 0) ? 'Informe o valor solicitado.' : !(n(form.prazoMeses) > 0) ? 'Informe o prazo em meses.' : !form.justificativa.trim() ? 'A justificativa é obrigatória.' : '')
    : (!form.numeroPedido.trim() ? 'Informe o número do pedido.' : !(n(form.valor) > 0) ? 'Informe o valor do pedido.' : !form.justificativa.trim() ? 'A justificativa é obrigatória.' : '');

  const registrar = async () => {
    if (!cliente) return;
    setGravando(true);
    setErro('');
    try {
      const r = tipo === 'analise'
        ? await acao('ccCredSolicitacaoCriar', {
          clienteId: cliente.ID, carteira: form.carteira, tipoCliente: form.tipoCliente, valor: n(form.valor), prazoMeses: n(form.prazoMeses),
          justificativa: form.justificativa.trim(), rca: form.rca.trim(), analistaId: membro.membroId,
        })
        : await acao('ccCredPedidoCriar', {
          clienteId: cliente.ID, numeroPedido: form.numeroPedido.trim(), valor: n(form.valor), rca: form.rca.trim(), justificativa: form.justificativa.trim(),
        });
      if (r.ok === false) return setErro(String(r.error ?? 'O servidor recusou.'));
      onCriada(Number(r.cardId) || 0, tipo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao registrar.');
    } finally {
      setGravando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
          <DialogDescription>Passo {passo + 1} de 3 · {PASSOS[passo]}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {passo === 0 ? (
              <>
                <Field label="O que é" obrigatorio>
                  <SelectMenu label="Tipo de solicitação" value={tipo} onChange={(v) => { setTipo(v as Tipo); setCliente(null); setSugestao(null); }}
                    options={[
                      { value: 'analise', label: 'Análise de crédito', hint: 'Novo limite, aumento ou renovação antecipada' },
                      { value: 'pedido', label: 'Liberação de pedido excedente', hint: 'Pedido acima do limite aprovado' },
                    ]} />
                </Field>
                <LabelledField label="Cliente" obrigatorio hint="Nome, código (CODCLI) ou CNPJ; mínimo de 2 letras.">
                  <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente" />
                </LabelledField>
                {cliente ? (
                  <Alert tone="success">
                    {cliente.NOME} · CODCLI {cliente.CODCLI}.{' '}
                    {sugestao ? `Tipo de cliente sugerido: ${sug.rotulo.toLowerCase()} (${sug.motivo}). A sugestão pode ser trocada no próximo passo.` : ''}
                  </Alert>
                ) : null}
                {clientes.length && busca.trim().length >= 2 ? (
                  <Table>
                    <thead><tr><Th>Cliente</Th><Th /></tr></thead>
                    <tbody>
                      {clientes.map((c) => (
                        <Tr key={c.ID}>
                          <Td>
                            <RowTitle>{c.NOME}</RowTitle>
                            <RowMeta>CODCLI {c.CODCLI} · {formatarDocumento(c.DOCUMENTO)}</RowMeta>
                          </Td>
                          <Td numeric>
                            {cliente?.ID === c.ID ? <Status tone="live">Escolhido</Status> : <TextLink onClick={() => void escolher(c)}>Escolher</TextLink>}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}
              </>
            ) : null}
            {passo === 1 && tipo === 'analise' ? (
              <>
                <LabelledField label="Valor solicitado (R$)" obrigatorio>
                  <Input type="number" min={0} step="1000" value={form.valor} onChange={(e) => campo('valor')(e.target.value)} />
                </LabelledField>
                <LabelledField label="Prazo (meses)" obrigatorio>
                  <Input type="number" min={1} value={form.prazoMeses} onChange={(e) => campo('prazoMeses')(e.target.value)} />
                </LabelledField>
                <Field label="Tipo de cliente" hint={sugestao ? `Sugerido: ${sug.rotulo} (${sug.motivo})` : 'Novo, recorrente ou inativo'}>
                  <SelectMenu label="Tipo de cliente" value={form.tipoCliente} onChange={campo('tipoCliente')} options={TIPOS_CLIENTE} />
                </Field>
                <Field label="Carteira" hint={sugestao ? `Sugerida pelo faturamento: ${CARTEIRAS.find((c) => c.codigo === sugestao.CARTEIRA_SUGERIDA)?.nome ?? '—'}` : undefined}>
                  <SelectMenu label="Carteira" value={form.carteira} onChange={campo('carteira')}
                    options={CARTEIRAS.map((c) => ({ value: c.codigo, label: c.nome }))} />
                </Field>
                <LabelledField label="RCA · executivo comercial">
                  <Input value={form.rca} onChange={(e) => campo('rca')(e.target.value)} maxLength={80} />
                </LabelledField>
                <LabelledField label="Justificativa da solicitação" obrigatorio hint="Sem ela a solicitação não é gravada.">
                  <Textarea value={form.justificativa} onChange={(e) => campo('justificativa')(e.target.value)} rows={4} maxLength={1000} />
                </LabelledField>
              </>
            ) : null}
            {passo === 1 && tipo === 'pedido' ? (
              <>
                <LabelledField label="Nº do pedido" obrigatorio>
                  <Input value={form.numeroPedido} onChange={(e) => campo('numeroPedido')(e.target.value)} maxLength={20} />
                </LabelledField>
                <LabelledField label="Valor do pedido (R$)" obrigatorio>
                  <Input type="number" min={0} value={form.valor} onChange={(e) => campo('valor')(e.target.value)} />
                </LabelledField>
                <LabelledField label="RCA · executivo comercial">
                  <Input value={form.rca} onChange={(e) => campo('rca')(e.target.value)} maxLength={80} />
                </LabelledField>
                <LabelledField label="Justificativa" obrigatorio>
                  <Textarea value={form.justificativa} onChange={(e) => campo('justificativa')(e.target.value)} rows={3} maxLength={1000} />
                </LabelledField>
                <Pares itens={[
                  ['Limite aprovado', <Reais v={posicao?.LIMITE} />],
                  ['Utilizado antes do pedido', <Reais v={posicao?.UTILIZADO} />],
                  ['Disponível', <Reais v={posicao?.DISPONIVEL} zeroEhDado />],
                  ['Excesso com o pedido', excesso > 0 ? <Reais v={excesso} /> : <Status tone="live">Cabe no limite: não entra</Status>],
                ]} />
              </>
            ) : null}
            {passo === 2 ? (
              <Pares itens={tipo === 'analise' ? [
                ['Tipo', 'Análise de crédito'],
                ['Cliente', <Txt v={cliente?.NOME} />],
                ['Carteira', nomeCarteira],
                ['Tipo de cliente', `${TIPOS_CLIENTE.find((t) => t.value === form.tipoCliente)?.label ?? form.tipoCliente}${form.tipoCliente === sug.tipo ? ` (${sug.motivo})` : ''}`],
                ['Valor e prazo', <><Reais v={form.valor} /> · {form.prazoMeses} meses</>],
                ['Entra em', 'Primeira etapa do quadro da carteira, com o prazo de decisão do SLA'],
                ['Analista', membro.nome],
              ] : [
                ['Tipo', 'Liberação de pedido excedente'],
                ['Cliente', <Txt v={cliente?.NOME} />],
                ['Pedido', <>{form.numeroPedido} · <Reais v={form.valor} /></>],
                ['Excesso', excesso > 0 ? <Reais v={excesso} /> : <Status tone="attention">O pedido parece caber no limite: o servidor recusa.</Status>],
                ['Entra em', 'Retido por limite · a alçada sai do tamanho do excesso'],
              ]} />
            ) : null}
          </Pilha>
        </DialogBody>
        <DialogFooter>
          {passo > 0 ? <Button onClick={() => setPasso((p) => p - 1)}>Voltar</Button> : <Button onClick={onFechar}>Cancelar</Button>}
          {passo < 2 ? (
            <Button variant="primary" disabled={!!(passo === 0 ? faltaPasso1 : faltaPasso2)} title={(passo === 0 ? faltaPasso1 : faltaPasso2) || undefined}
              onClick={() => setPasso((p) => p + 1)}>Continuar</Button>
          ) : (
            <Button variant="primary" disabled={gravando} onClick={registrar}>Registrar solicitação</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
