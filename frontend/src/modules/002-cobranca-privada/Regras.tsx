// Regras de cobrança (T-076, opção B "Abas por assunto"): Régua, Checklists, Alçadas, Encargos e prazos e Mensagens
// padrão, por carteira. Todos consultam; quem administra edita os parâmetros na tela da 001. Quando um dia da régua mudou,
// a coluna do quadro ainda tem o nome antigo: o botão renomeia pela lib (PA-17, 05 §3.1).
// Ao abrir: parâmetros, modelos, estrutura do quadro e resumo das fases (4 chamadas).

import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useKanban } from '@benenutri/mitra-kanban';
import { linhas } from '@/lib/mitra-api';
import { CARTEIRAS, useCarteira } from '@/lib/base/carteira';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';
import { formatarParametro } from '@/lib/base/parametros';
import { FASES_REGUA, nomeDaFase } from '@/lib/cobranca-privada/fases';
import {
  Alert, Button, Code, Dash, EmptyState, PageHeader, Panel, PanelHeader, RowMeta, RowTitle, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger,
  Td, Th, Tr,
} from '@/components/page';
import { erroDe, useDados, type Linha } from './comum';

const MODO: Record<string, string> = { MANUAL: 'Manual', APROVAR: 'Com aprovação', AUTOMATICO: 'Automático' };
const BLOQUEIO: Record<string, string> = { cob_ativa: 'Novos pedidos', protesto: 'Bloqueio total' };

export default function Regras() {
  const membro = useOutletContext<MembroSessao>();
  const navigate = useNavigate();
  const api = useKanban();
  const [carteira, setCarteira] = useCarteira('cobranca-regras');
  const [aba, setAba] = useState('regua');
  const [renomeio, setRenomeio] = useState<{ tone: 'success' | 'error'; texto: string } | null>(null);
  const [renomeando, setRenomeando] = useState(false);
  const slug = `cobranca-${carteira.toLowerCase()}`;

  const dados = useDados(async () => {
    const [params, modelos, estrutura, resumo] = await Promise.all([
      linhas('ccBaseParametroListar', { grupo: '', carteira, data: '' }),
      linhas('ccBaseModeloListar', { specDona: '', codigo: '' }),
      api.boardCarregar({ slug }),
      linhas('ccCobQuadroResumo', { carteira, agenteId: 0, buId: -1 }),
    ]);
    return { params, modelos: modelos.filter((m) => String(m.CODIGO).startsWith('COB_')), estrutura, resumo };
  }, carteira);

  const d = dados.dados;
  const p = Object.fromEntries((d?.params ?? []).map((l) => [String(l.CHAVE), l.VALOR_EFETIVO]));
  const grupo = (g: string) => (d?.params ?? []).filter((l) => l.GRUPO === g);
  const chaveDe = new Map((d?.resumo ?? []).map((l) => [String(l.FASE_NOME), String(l.FASE_CHAVE)]));
  const fases = (d?.estrutura.fases ?? []).filter((f) => f.ativo).sort((a, b) => a.ordem - b.ordem).map((f) => ({ ...f, chave: chaveDe.get(f.nome) ?? '' }));
  const desatualizadas = fases.filter((f) => [...FASES_REGUA, 'juridico'].includes(f.chave) && f.nome !== nomeDaFase(f.chave, p));
  const temRegua = carteira !== 'PUBLICA';

  async function renomear() {
    if (!d) return;
    setRenomeando(true);
    setRenomeio(null);
    try {
      for (const f of desatualizadas) {
        const r = await api.faseSalvar({ id: f.id, boardId: f.boardId, nome: nomeDaFase(f.chave, p), cor: f.cor, descricao: f.descricao, tipo: f.tipo,
          slaHoras: f.slaHoras, condicaoJson: f.condicao ? JSON.stringify(f.condicao) : '', capaJson: JSON.stringify(f.capa ?? []), ativo: f.ativo });
        if (r.ok === false) throw new Error(String(r.error ?? ''));
      }
      setRenomeio({ tone: 'success', texto: 'Colunas do quadro renomeadas com os dias da régua.' });
      dados.recarregar();
    } catch {
      setRenomeio({ tone: 'error', texto: 'O nome da coluna ainda mostra o dia antigo; um administrador pode renomear na administração do quadro.' });
    } finally {
      setRenomeando(false);
    }
  }

  const tabelaParametros = (lista: Linha[]) => (lista.length ? (
    <Table>
      <thead><tr><Th>Regra</Th><Th>Valor nesta carteira</Th></tr></thead>
      <tbody>
        {lista.map((l) => (
          <Tr key={l.CHAVE}>
            <Td><RowTitle>{l.ROTULO}</RowTitle>{l.DESCRICAO ? <RowMeta>{l.DESCRICAO}</RowMeta> : null}</Td>
            <Td>{formatarParametro(l, l.VALOR_EFETIVO) || <Dash />}{l.VALOR_CARTEIRA === null || l.VALOR_CARTEIRA === undefined || l.VALOR_CARTEIRA === '' ? null : <RowMeta>valor próprio da carteira</RowMeta>}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  ) : <EmptyState title="Sem parâmetros neste assunto." />);

  return (
    <>
      <PageHeader module="Operação" title="Regras de cobrança"
        description="Régua, prazos, alçadas, encargos e mensagens padrão da cobrança, num só lugar. Todos consultam; quem administra edita os parâmetros."
        actions={<Button disabled={!podeAdministrar(membro)} title={podeAdministrar(membro) ? undefined : 'Só quem administra edita os parâmetros.'}
          onClick={() => navigate('/admin/parametros')}>Editar parâmetros</Button>} />
      <Tabs value={carteira} onValueChange={(c) => { setCarteira(c as typeof carteira); setRenomeio(null); }}>
        <TabsList>{CARTEIRAS.map((c) => <TabsTrigger key={c.codigo} value={c.codigo}>{c.nome}</TabsTrigger>)}</TabsList>
        {dados.erro ? <Alert tone="error">{erroDe(dados.erro)}</Alert> : null}
        {renomeio ? <Alert tone={renomeio.tone}>{renomeio.texto}</Alert> : null}
        {temRegua && desatualizadas.length ? (
          <Alert tone="warn">
            {desatualizadas.length} {desatualizadas.length === 1 ? 'coluna do quadro mostra' : 'colunas do quadro mostram'} o dia antigo da régua
            ({desatualizadas.map((f) => `${f.nome} → ${nomeDaFase(f.chave, p)}`).join('; ')}).{' '}
            <Button size="sm" disabled={!d?.estrutura.souAdmin || renomeando} title={d?.estrutura.souAdmin ? undefined : 'Só o administrador do quadro renomeia.'}
              onClick={renomear}>Atualizar nomes das colunas</Button>
          </Alert>
        ) : null}
        <Panel>
          <Tabs value={aba} onValueChange={setAba}>
            <TabsList>
              <TabsTrigger value="regua">Régua</TabsTrigger>
              <TabsTrigger value="checklists">Checklists</TabsTrigger>
              <TabsTrigger value="alcadas">Alçadas</TabsTrigger>
              <TabsTrigger value="encargos">Encargos e prazos</TabsTrigger>
              <TabsTrigger value="mensagens">Mensagens padrão {d?.modelos.length ?? ''}</TabsTrigger>
            </TabsList>
            <TabsContent value="regua">
              <PanelHeader title="Etapas do quadro" hint={temRegua ? 'Prazos em dias corridos a partir do vencimento do título mais antigo; o cliente muda de etapa sozinho pelos dias de atraso.'
                : 'No órgão público a etapa acompanha as notas fiscais, não os dias de atraso.'} />
              <Table>
                <thead><tr><Th>Etapa</Th><Th>Tipo</Th><Th>E-mail da etapa</Th><Th>Bloqueio no ERP</Th></tr></thead>
                <tbody>
                  {fases.map((f) => {
                    const modo = p[`cob.emailModo.${f.chave}`];
                    return (
                      <Tr key={f.id}>
                        <Td><RowTitle>{f.nome}</RowTitle> <Code>{f.chave}</Code>{f.descricao ? <RowMeta>{f.descricao}</RowMeta> : null}</Td>
                        <Td>{f.tipo === 'comum' ? (FASES_REGUA.includes(f.chave) ? 'Automática' : 'Manual ou por decisão') : <Status tone="off">Final</Status>}</Td>
                        <Td>{modo ? MODO[String(modo)] ?? String(modo) : <Dash />}</Td>
                        <Td>{temRegua && BLOQUEIO[f.chave] ? BLOQUEIO[f.chave] : <Dash />}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              {temRegua ? tabelaParametros(grupo('regua')) : null}
            </TabsContent>
            <TabsContent value="checklists">
              <Table>
                <thead><tr><Th>Etapa</Th><Th>Itens do checklist</Th></tr></thead>
                <tbody>
                  {fases.map((f) => {
                    const itens = (d?.estrutura.campos ?? []).filter((c) => c.faseId === f.id && c.ativo).sort((a, b) => a.ordem - b.ordem);
                    return (
                      <Tr key={f.id}>
                        <Td><RowTitle>{f.nome}</RowTitle></Td>
                        <Td>{itens.length ? itens.map((c, i) => <RowMeta key={c.id}>{i + 1}. {c.label}</RowMeta>) : <Dash />}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <Alert tone="info">A ação da etapa fica feita quando os itens que a definem estão marcados; quem propôs o acordo ou a baixa não aprova.</Alert>
            </TabsContent>
            <TabsContent value="alcadas">{tabelaParametros(grupo('alcada'))}</TabsContent>
            <TabsContent value="encargos">
              <PanelHeader title="Encargos" />
              {tabelaParametros(grupo('enc'))}
              <PanelHeader title="Prazos e tolerâncias" />
              {tabelaParametros(grupo('cob').filter((l) => !String(l.CHAVE).startsWith('cob.emailModo.')))}
            </TabsContent>
            <TabsContent value="mensagens">
              {(d?.modelos ?? []).length ? (
                <Table>
                  <thead><tr><Th>Mensagem</Th><Th>Assunto e texto</Th><Th>Validação</Th></tr></thead>
                  <tbody>
                    {(d?.modelos ?? []).map((m) => (
                      <Tr key={m.CODIGO}>
                        <Td><RowTitle>{m.NOME}</RowTitle> <Code>{m.CODIGO}</Code></Td>
                        <Td><RowTitle>{m.ASSUNTO}</RowTitle>{String(m.CORPO ?? '').split('\n').filter((t) => t.trim()).map((t, i) => <RowMeta key={i}>{t}</RowMeta>)}</Td>
                        <Td>{Number(m.EFEITO_LEGAL) ? <Status tone={m.SITUACAO_VALIDACAO === 'VALIDADO' ? 'live' : 'attention'}>{String(m.SITUACAO_VALIDACAO ?? '').toLowerCase() || 'a validar'}</Status> : <Dash />}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              ) : <EmptyState title="Nenhuma mensagem padrão da cobrança." />}
            </TabsContent>
          </Tabs>
        </Panel>
      </Tabs>
    </>
  );
}
