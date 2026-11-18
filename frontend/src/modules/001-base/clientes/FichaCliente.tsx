/**
 * /clientes/:codcli — opção `cliente-ficha` B "Cabeçalho fixo e abas" (telas-03-clientes.html).
 * Cabeçalho com identidade e a data da leitura, quatro números da posição e as abas Títulos (em aberto
 * ao vivo · pagos em 90 dias), Posição por BU, Contatos, E-mails e anexos, Cadastro. Estados não
 * desenhados: Winthor fora do ar (sem dado antigo, com "Tentar de novo"), cliente fora do sistema
 * (RF-012) e "Cliente não encontrado." (C-007). Diálogos em `dialogos.tsx` (T-092).
 */
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paperclip, Trash2 } from 'lucide-react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora, moeda } from '@/lib/formato';
import { formatarDocumento } from '@/lib/base/documento';
import { situacaoDaPosicao } from '@/lib/base/posicao';
import { somarDias } from '@/lib/base/dias-uteis';
import { destinosDaAtribuicao, tamanhoLegivel } from '@/lib/base/telas';
import {
  AbasDoPainel, Alert, Badge, Button, Code, CorpoPainel, Dash, EmptyState, Faixa, Ficha, GradeKpi, IconButton,
  ItemFicha, Kpi, Linha as LinhaUi, MetaDot, Nota, PageHeader, Pagination, Panel, Pilha, RowMeta, RowTitle,
  Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, TextLink, Th, Tr,
} from '@/components/page';
import { CARTEIRA_NOME, SETORES, cidade, dias, executar, motivo, nivelDois, useDados, useMembro, valorOuNada } from '../comum';
import { Confirmar, DialogoAgente, DialogoAnexar, DialogoClassificar, DialogoEmail } from './dialogos';
import { EditorFicha, FaixaDaFicha, TabelaContatos } from '../contatos/FichaContatos';

type Linha = Record<string, unknown>;
type Dialogo = 'agente' | 'classificar' | 'email' | 'anexar' | 'contatos' | null;

const n = (v: unknown) => Number(v ?? 0);
const valor = (v: unknown) => (valorOuNada(v) === null ? <Dash /> : moeda(n(v)));
const POR_PAGINA = 20;

export default function FichaCliente() {
  const { codcli = '' } = useParams();
  const navigate = useNavigate();
  const membro = useMembro();
  const [aba, setAba] = useState('titulos');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState('');

  // Ao abrir (plan.md, conta de execuções): ficha + status da leitura + BUs (nome da BU de cada título).
  const ficha = useDados(async (): Promise<Linha> => {
    const [f, status, bus] = await Promise.allSettled([
      acao('ccBaseClienteFicha', { clienteId: 0, codcli: Number(codcli) || 0, documento: '' }),
      linha('ccBaseSincronizacaoStatus'),
      linhas('ccBaseBuListar', { ativa: -1 }),
    ]);
    if (f.status === 'rejected') throw f.reason;
    return { ...f.value, status: status.status === 'fulfilled' ? status.value : null, bus: bus.status === 'fulfilled' ? bus.value : [] };
  }, codcli);

  const f = ficha.dados;
  const cliente = f?.cliente as Linha | null | undefined;

  const voltar = <Button onClick={() => navigate('/clientes')}>Voltar para clientes</Button>;
  if (!f) {
    return (
      <>
        <PageHeader module="Clientes · Ficha" title="Ficha do cliente" />
        <Panel>{ficha.erro ? <CorpoPainel><Alert tone="error">{ficha.erro}</Alert>{voltar}</CorpoPainel> : <EmptyState title="Abrindo a ficha…" />}</Panel>
      </>
    );
  }
  if (f.ok === false) {
    return (
      <>
        <PageHeader module="Clientes · Ficha" title="Ficha do cliente" />
        <Panel><EmptyState title={motivo(f)} hint="Confira o código ou volte à lista de clientes." action={voltar} /></Panel>
      </>
    );
  }
  if (f.foraDoSistema) return <ForaDoSistema dados={f} onTentar={ficha.reler} voltar={voltar} />;
  if (!cliente) return null;

  const pos = (f.posicao ?? {}) as Linha;
  const st = f.status as Linha | null;
  const situacao = situacaoDaPosicao({ minutosDesde: st?.MINUTOS_DESDE, intervaloMin: st?.INTERVALO_MIN });
  const lidoEm = pos.SINCRONIZADO_EM ?? cliente.WINTHOR_LIDO_EM;
  const feito = (texto: string) => {
    setDialogo(null);
    setAviso(texto);
    ficha.reler();
  };

  return (
    <>
      <PageHeader
        module="Clientes · Ficha"
        title={String(cliente.NOME)}
        description={
          <>
            <Code>{String(cliente.CODCLI)}</Code> · {formatarDocumento(cliente.DOCUMENTO)} · {cidade(cliente.MUNICIPIO, cliente.UF)} ·{' '}
            {SETORES[String(cliente.SETOR)] ?? String(cliente.SETOR)} · {cliente.AGENTE_NOME ? `agente ${cliente.AGENTE_NOME}` : 'sem agente'}
          </>
        }
        meta={
          <>
            {situacao === 'atual' ? <Status tone="live">Posição atual</Status> : <Status tone="attention">{situacao === 'nunca' ? 'Posição nunca lida' : 'Posição desatualizada'}</Status>}
            <MetaDot />
            <span>{lidoEm ? `posição da leitura de ${fmtDataHora(String(lidoEm)).replace(' ', ' às ')}` : 'sem leitura do Winthor'}</span>
          </>
        }
        actions={
          <Button onClick={() => setDialogo('agente')} disabled={!nivelDois(membro)} title={nivelDois(membro) ? undefined : 'Só Supervisor, Gerente, Diretoria ou Administrador'}>
            Trocar agente
          </Button>
        }
      />
      <Pilha>
        {aviso ? <Alert tone="success">{aviso}</Alert> : null}
        <GradeKpi>
          <Kpi rotulo="Vencido" valor={valor(pos.VENCIDO)} hint={n(pos.VENCIDO) ? `${n(pos.TITULOS_VENCIDOS)} ${n(pos.TITULOS_VENCIDOS) === 1 ? 'título' : 'títulos'} · ${dias(pos.DIAS_ATRASO)} de atraso` : undefined} />
          <Kpi rotulo="A vencer" valor={valor(pos.A_VENCER)} hint={pos.PROX_VENC ? `próximo: ${fmtData(String(pos.PROX_VENC))} · ${moeda(n(pos.PROX_VENC_VALOR))}` : undefined} />
          <Kpi rotulo="Limite disponível" valor={valor(pos.DISPONIVEL)} hint={n(pos.LIMITE) ? `usa ${moeda(n(pos.UTILIZADO))} de ${moeda(n(pos.LIMITE))}` : 'sem limite no Winthor'} />
          <Kpi rotulo="Compras em 90 dias" valor={n(pos.COMPRAS_QTD) || <Dash />} hint={n(pos.COMPRAS_QTD) ? `${moeda(n(pos.COMPRAS_VALOR))}${pos.ULTIMA_COMPRA ? ` · última em ${fmtData(String(pos.ULTIMA_COMPRA))}` : ''}` : undefined} />
        </GradeKpi>
        <Panel>
          <Tabs value={aba} onValueChange={setAba}>
            <AbasDoPainel>
              <TabsTrigger value="titulos">Títulos {n(pos.TITULOS_ABERTOS) ? <Badge>{n(pos.TITULOS_ABERTOS)}</Badge> : null}</TabsTrigger>
              <TabsTrigger value="bu">Posição por BU</TabsTrigger>
              <TabsTrigger value="contatos">Contatos <Badge>{(f.contatos as Linha[]).length}</Badge></TabsTrigger>
              <TabsTrigger value="emails">E-mails e anexos</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            </AbasDoPainel>
            <TabsContent value="titulos">
              <AbaTitulos cliente={cliente} bus={f.bus as Linha[]} referencia={String(lidoEm ?? '')} />
            </TabsContent>
            <TabsContent value="bu">
              <AbaPorBu porBu={f.porBu as Linha[]} porCarteira={f.porCarteira as Linha[]} pos={pos} />
            </TabsContent>
            <TabsContent value="contatos">
              <FaixaDaFicha cliente={cliente} onEditar={() => setDialogo('contatos')} />
              <TabelaContatos contatos={f.contatos as Linha[]} />
            </TabsContent>
            <TabsContent value="emails">
              <AbaEmails cliente={cliente} onAnexar={() => setDialogo('anexar')} onEnviar={() => setDialogo('email')} aviso={aviso} />
            </TabsContent>
            <TabsContent value="cadastro">
              <Faixa>
                <Nota>Dados do Winthor da última leitura; grupo econômico e esfera são informados aqui.</Nota>
                <Button size="sm" onClick={() => setDialogo('classificar')} disabled={!nivelDois(membro)}>Grupo econômico e esfera</Button>
              </Faixa>
              <CorpoPainel>
                <Ficha>
                  <ItemFicha rotulo="Razão social">{String(cliente.NOME)}</ItemFicha>
                  <ItemFicha rotulo="Fantasia">{cliente.FANTASIA ? String(cliente.FANTASIA) : <Dash />}</ItemFicha>
                  <ItemFicha rotulo={cliente.TIPO_PESSOA === 'F' ? 'CPF' : 'CNPJ'}>{formatarDocumento(cliente.DOCUMENTO) || <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Município">{cidade(cliente.MUNICIPIO, cliente.UF) || <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Endereço">{cliente.ENDERECO ? String(cliente.ENDERECO) : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Telefone e e-mail">{[cliente.TELEFONE, cliente.EMAIL].filter(Boolean).join(' · ') || <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Ramo de atividade">{cliente.RAMO ? `${cliente.RAMO_COD ?? ''} · ${cliente.RAMO}` : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Setor">
                    {SETORES[String(cliente.SETOR)] ?? String(cliente.SETOR)} (pelo ramo){cliente.ESFERA ? ` · esfera ${String(cliente.ESFERA).toLowerCase()}` : ''}
                  </ItemFicha>
                  <ItemFicha rotulo="RCA">{cliente.RCA_NOME ? `${cliente.RCA_COD ?? ''} · ${cliente.RCA_NOME}` : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Plano de pagamento">{cliente.PLANO_DESCRICAO ? String(cliente.PLANO_DESCRICAO) : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Limite de crédito">{valor(pos.LIMITE)}</ItemFicha>
                  <ItemFicha rotulo="Bloqueio no Winthor">{Number(cliente.BLOQUEADO_WINTHOR) ? 'Sim' : 'Não'}</ItemFicha>
                  <ItemFicha rotulo="Grupo econômico">{cliente.GRUPO_ECONOMICO ? String(cliente.GRUPO_ECONOMICO) : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Agente de cobrança">{cliente.AGENTE_NOME ? String(cliente.AGENTE_NOME) : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Analista de crédito">{cliente.ANALISTA_NOME ? String(cliente.ANALISTA_NOME) : <Dash />}</ItemFicha>
                  <ItemFicha rotulo="Cliente desde">{cliente.CADASTRO_EM ? fmtData(String(cliente.CADASTRO_EM)) : <Dash />}</ItemFicha>
                </Ficha>
              </CorpoPainel>
            </TabsContent>
          </Tabs>
        </Panel>
      </Pilha>
      {dialogo === 'agente' ? <AgenteComEquipe cliente={cliente} onFechar={() => setDialogo(null)} onFeito={feito} /> : null}
      {dialogo === 'classificar' ? <DialogoClassificar cliente={cliente} onFechar={() => setDialogo(null)} onFeito={() => feito('Grupo econômico e esfera salvos.')} /> : null}
      {dialogo === 'email' ? <DialogoEmail cliente={cliente} contatos={f.contatos as Linha[]} onFechar={() => setDialogo(null)} onEnviado={feito} /> : null}
      {dialogo === 'anexar' ? <DialogoAnexar cliente={cliente} onFechar={() => setDialogo(null)} onAnexado={feito} /> : null}
      {dialogo === 'contatos' ? <EditorFicha cliente={cliente} contatos={f.contatos as Linha[]} onFechar={() => setDialogo(null)} onSalvo={feito} /> : null}
    </>
  );
}

/** "Trocar agente" lê a equipe só quando abre (destinos da atribuição, C-014). */
function AgenteComEquipe({ cliente, onFechar, onFeito }: { cliente: Linha; onFechar: () => void; onFeito: (t: string) => void }) {
  const membro = useMembro();
  const equipe = useDados(() => linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 500, offset: 0 }), 'equipe');
  if (!equipe.dados) return null;
  return <DialogoAgente cliente={cliente} destinos={destinosDaAtribuicao(equipe.dados, membro.membroId, membro.veTudo)} onFechar={onFechar} onFeito={onFeito} />;
}

/** Títulos em aberto lidos do Winthor agora (RF-010: fora do ar, nenhum título) e pagos em 90 dias. */
function AbaTitulos({ cliente, bus, referencia }: { cliente: Linha; bus: Linha[]; referencia: string }) {
  const [vista, setVista] = useState('abertos');
  const [pagina, setPagina] = useState(1);
  const abertos = useDados(() => acao('ccBaseTitulosAbertos', { clienteId: Number(cliente.ID), carteira: '', soVencidos: 0 }), String(cliente.ID));
  // "Pagos em 90 dias" conta a partir da data da leitura (relógio do servidor, nunca o do navegador).
  const de = referencia ? somarDias(referencia.slice(0, 10), -90) : '';
  const filtro = { clienteId: Number(cliente.ID), carteira: '', de, ate: '', comAtraso: 0, busca: '' };
  const pagos = useDados(async () => {
    const [lista, total] = await Promise.all([
      linhas('ccBaseRecebimentoListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      linha('ccBaseRecebimentoTotal', filtro),
    ]);
    return { lista, total: n(total?.TOTAL) };
  }, `${cliente.ID}|${pagina}`);
  const nomeBu = (id: unknown) => (n(id) ? String(bus.find((b) => n(b.ID) === n(id))?.NOME ?? id) : 'Sem BU');
  const t = abertos.dados;
  const linhasAbertas = (t?.linhas ?? []) as Linha[];

  return (
    <Tabs value={vista} onValueChange={setVista}>
      <Faixa>
        <TabsList>
          <TabsTrigger value="abertos">Em aberto{t && !t.erroWinthor ? ` · ${linhasAbertas.length}` : ''}</TabsTrigger>
          <TabsTrigger value="pagos">Pagos em 90 dias{pagos.dados ? ` · ${pagos.dados.total}` : ''}</TabsTrigger>
        </TabsList>
        <Nota>{vista === 'abertos' ? 'lidos do Winthor agora' : 'da última leitura do Winthor'}</Nota>
      </Faixa>
      <TabsContent value="abertos">
        {abertos.erro || t?.ok === false ? (
          <CorpoPainel><Alert tone="error">{abertos.erro ?? motivo(t)}</Alert></CorpoPainel>
        ) : t?.erroWinthor ? (
          <CorpoPainel>
            <Alert tone="error">{String(t.erroWinthor)}</Alert>
            <LinhaUi><Button onClick={abertos.reler} disabled={abertos.carregando}>Tentar de novo</Button></LinhaUi>
          </CorpoPainel>
        ) : !t ? (
          <EmptyState title="Consultando o Winthor…" />
        ) : linhasAbertas.length === 0 ? (
          <EmptyState title="Nenhum título em aberto." hint="O Winthor não tem título em aberto para este cliente." />
        ) : (
          <Table>
            <thead><tr><Th>Nota · parcela</Th><Th>BU</Th><Th>Emissão</Th><Th>Vencimento</Th><Th numeric>Valor</Th><Th numeric>Atraso</Th></tr></thead>
            <tbody>
              {linhasAbertas.map((l) => (
                <Tr key={String(l.CHAVE)}>
                  <Td><Code>{String(l.NUMNOTA ?? l.TITULO)}</Code> · {String(l.PARCELA)}</Td>
                  <Td>{nomeBu(l.BU_ID)}</Td>
                  <Td>{fmtData(String(l.EMISSAO ?? ''))}</Td>
                  <Td>
                    {fmtData(String(l.VENCIMENTO_EFETIVO ?? l.VENCIMENTO))}
                    {l.VENCIMENTO_EFETIVO && l.VENCIMENTO_EFETIVO !== l.VENCIMENTO ? <RowMeta>no título: {fmtData(String(l.VENCIMENTO))}</RowMeta> : null}
                  </Td>
                  <Td numeric>{moeda(n(l.SALDO ?? l.VALOR))}</Td>
                  <Td numeric>{n(l.DIAS_ATRASO) > 0 ? <Status tone="alert">{dias(l.DIAS_ATRASO)}</Status> : <Dash />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </TabsContent>
      <TabsContent value="pagos">
        {pagos.erro ? <CorpoPainel><Alert tone="error">{pagos.erro}</Alert></CorpoPainel> : null}
        {!pagos.dados ? (
          <EmptyState title="Carregando os pagamentos…" />
        ) : pagos.dados.lista.length === 0 ? (
          <EmptyState title="Nenhum pagamento nos últimos 90 dias." />
        ) : (
          <>
            <Table>
              <thead><tr><Th>Título · parcela</Th><Th>Vencimento</Th><Th>Pagamento</Th><Th numeric>Valor pago</Th><Th numeric>Atraso no pagamento</Th></tr></thead>
              <tbody>
                {pagos.dados.lista.map((r) => (
                  <Tr key={String(r.ID)}>
                    <Td><Code>{String(r.TITULO)}</Code> · {String(r.PARCELA)}</Td>
                    <Td>{fmtData(String(r.VENCIMENTO ?? ''))}</Td>
                    <Td>{fmtData(String(r.DATA_PAGAMENTO ?? ''))}</Td>
                    <Td numeric>{moeda(n(r.VALOR_PAGO))}</Td>
                    <Td numeric>{n(r.DIAS_ATRASO_PAGAMENTO) > 0 ? dias(r.DIAS_ATRASO_PAGAMENTO) : <Dash />}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={pagina} lastPage={Math.max(1, Math.ceil(pagos.dados.total / POR_PAGINA))} total={pagos.dados.total}
              unit={pagos.dados.total === 1 ? 'pagamento' : 'pagamentos'} busy={pagos.carregando}
              onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)}
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function AbaPorBu({ porBu, porCarteira, pos }: { porBu: Linha[]; porCarteira: Linha[]; pos: Linha }) {
  if (!porBu.length) return <EmptyState title="Sem saldo em aberto." hint="Quando houver título em aberto, a posição aparece por BU e por carteira." />;
  const atraso = (v: unknown) => (n(v) ? dias(v) : <Dash />);
  return (
    <>
      <Table>
        <thead><tr><Th>BU</Th><Th>Carteira</Th><Th numeric>Vencido</Th><Th numeric>A vencer</Th><Th numeric>Atraso</Th><Th numeric>Títulos em aberto</Th></tr></thead>
        <tbody>
          {porBu.map((b) => (
            <Tr key={String(b.BU_ID)}>
              <Td>{String(b.BU_NOME)}</Td>
              <Td>{CARTEIRA_NOME[String(b.CARTEIRA)] ?? String(b.CARTEIRA)}</Td>
              <Td numeric>{valor(b.VENCIDO)}</Td>
              <Td numeric>{valor(b.A_VENCER)}</Td>
              <Td numeric>{atraso(b.DIAS_ATRASO)}</Td>
              <Td numeric>{n(b.TITULOS_ABERTOS)}</Td>
            </Tr>
          ))}
          <Tr>
            <Td><RowTitle>Total</RowTitle></Td>
            <Td />
            <Td numeric><RowTitle>{valor(pos.VENCIDO)}</RowTitle></Td>
            <Td numeric><RowTitle>{valor(pos.A_VENCER)}</RowTitle></Td>
            <Td numeric><RowTitle>{atraso(pos.DIAS_ATRASO)}</RowTitle></Td>
            <Td numeric><RowTitle>{n(pos.TITULOS_ABERTOS)}</RowTitle></Td>
          </Tr>
        </tbody>
      </Table>
      {porCarteira.length ? (
        <>
          <Faixa embaixo><Nota>Por carteira: o saldo do cliente do setor público fica na carteira Pública, qualquer que seja a BU.</Nota></Faixa>
          <Table>
            <thead><tr><Th>Carteira</Th><Th numeric>Vencido</Th><Th numeric>A vencer</Th><Th numeric>Atraso</Th><Th>Composição por BU</Th></tr></thead>
            <tbody>
              {porCarteira.map((c) => (
                <Tr key={String(c.CARTEIRA)}>
                  <Td>{CARTEIRA_NOME[String(c.CARTEIRA)] ?? String(c.CARTEIRA)}</Td>
                  <Td numeric>{valor(c.VENCIDO)}</Td>
                  <Td numeric>{valor(c.A_VENCER)}</Td>
                  <Td numeric>{atraso(c.DIAS_ATRASO)}</Td>
                  <Td>{c.COMPOSICAO_BU ? String(c.COMPOSICAO_BU) : <Dash />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : null}
    </>
  );
}

/** E-mails enviados (mais recente primeiro, RF-038) e anexos do cliente, lidos só quando a aba abre. */
function AbaEmails({ cliente, onAnexar, onEnviar, aviso }: { cliente: Linha; onAnexar: () => void; onEnviar: () => void; aviso: string }) {
  const [removendo, setRemovendo] = useState<Linha | null>(null);
  const dados = useDados(async () => {
    const [emails, total, anexos] = await Promise.all([
      linhas('ccBaseEmailListar', { clienteId: Number(cliente.ID), origem: '', de: '', ate: '', busca: '', limite: 50, offset: 0 }),
      linha('ccBaseEmailTotal', { clienteId: Number(cliente.ID), origem: '', de: '', ate: '', busca: '' }),
      linhas('ccBaseAnexoListar', { entidade: 'CLIENTE', entidadeId: Number(cliente.ID) }),
    ]);
    return { emails, total: n(total?.TOTAL), anexos };
  }, `${cliente.ID}|${aviso}`);

  const d = dados.dados;
  const itens = [
    ...(d?.emails ?? []).map((e) => ({ tipo: 'email' as const, em: String(e.ENVIADO_EM ?? ''), l: e })),
    ...(d?.anexos ?? []).map((a) => ({ tipo: 'anexo' as const, em: String(a.ENVIADO_EM ?? ''), l: a })),
  ].sort((a, b) => b.em.localeCompare(a.em));

  return (
    <>
      <Faixa>
        <Nota>
          {d ? `${d.total} ${d.total === 1 ? 'e-mail enviado' : 'e-mails enviados'} · ${d.anexos.length} ${d.anexos.length === 1 ? 'anexo' : 'anexos'}` : 'Carregando…'}
          {d && d.total > d.emails.length ? ` (os ${d.emails.length} mais recentes abaixo)` : ''}
        </Nota>
        <LinhaUi>
          <Button size="sm" onClick={onAnexar}><Paperclip aria-hidden />Anexar</Button>
          <Button size="sm" variant="primary" onClick={onEnviar}>Enviar e-mail</Button>
        </LinhaUi>
      </Faixa>
      {dados.erro ? <CorpoPainel><Alert tone="error">{dados.erro}</Alert></CorpoPainel> : null}
      {d && itens.length === 0 ? <EmptyState title="Nenhum e-mail nem anexo ainda." hint="Envie um e-mail a partir de um modelo ou anexe um documento do cliente." /> : null}
      {itens.length ? (
        <Table>
          <thead><tr><Th>Item</Th><Th>Tipo</Th><Th>Detalhe</Th><Th>Quando</Th><Th>Situação</Th><Th /></tr></thead>
          <tbody>
            {itens.map(({ tipo, l }) =>
              tipo === 'email' ? (
                <Tr key={`e${l.ID}`}>
                  <Td><RowTitle>{String(l.ASSUNTO)}</RowTitle><RowMeta>para {String(l.PARA)}</RowMeta></Td>
                  <Td>E-mail</Td>
                  <Td>Modelo <Code>{String(l.MODELO_CODIGO)}</Code> · versão {String(l.MODELO_VERSAO)}</Td>
                  <Td>{fmtDataHora(String(l.ENVIADO_EM))}</Td>
                  <Td>{l.RESULTADO === 'ENVIADO' ? <Status tone="live">Enviado</Status> : <Status tone="alert">Falhou{l.ERRO ? `: ${l.ERRO}` : ''}</Status>}</Td>
                  <Td />
                </Tr>
              ) : (
                <Tr key={`a${l.ID}`}>
                  <Td>
                    <TextLink onClick={() => window.open(String(l.URL), '_blank', 'noopener')}>{String(l.NOME_ARQUIVO)}</TextLink>
                    <RowMeta>{tamanhoLegivel(l.TAMANHO_BYTES)}</RowMeta>
                  </Td>
                  <Td>Anexo</Td>
                  <Td>{String(l.TIPO_DOC)}</Td>
                  <Td>{fmtDataHora(String(l.ENVIADO_EM))}{l.ENVIADO_POR_NOME ? <RowMeta>{String(l.ENVIADO_POR_NOME)}</RowMeta> : null}</Td>
                  <Td><Dash /></Td>
                  <Td numeric><IconButton label="Remover anexo" tone="danger" onClick={() => setRemovendo(l)}><Trash2 /></IconButton></Td>
                </Tr>
              ),
            )}
          </tbody>
        </Table>
      ) : null}
      {removendo ? (
        <Confirmar
          titulo="Remover anexo"
          texto={`${removendo.NOME_ARQUIVO} sai da lista do cliente. A remoção fica registrada na auditoria.`}
          rotulo="Remover"
          onFechar={() => setRemovendo(null)}
          onConfirmar={async () => {
            const falha = await executar(() => acao('ccBaseAnexoRemover', { anexoId: Number(removendo.ID) }));
            if (!falha) {
              setRemovendo(null);
              dados.reler();
            }
            return falha;
          }}
        />
      ) : null}
    </>
  );
}

/** Cliente que só existe no Winthor (RF-012): cadastro lido ao vivo, sem posição. */
function ForaDoSistema({ dados, onTentar, voltar }: { dados: Linha; onTentar: () => void; voltar: ReactNode }) {
  const w = dados.winthor as Linha | null;
  if (!w) {
    return (
      <>
        <PageHeader module="Clientes · Ficha" title="Cliente fora do sistema" />
        <Panel>
          <CorpoPainel>
            <Alert tone="error">{String(dados.erroWinthor ?? 'Não foi possível consultar o Winthor agora.')}</Alert>
            <LinhaUi><Button onClick={onTentar}>Tentar de novo</Button>{voltar}</LinhaUi>
          </CorpoPainel>
        </Panel>
      </>
    );
  }
  return (
    <>
      <PageHeader
        module="Clientes · Ficha"
        title={String(w.nome)}
        description={<><Code>{String(w.codcli)}</Code> · {formatarDocumento(w.documento)} · {cidade(w.municipio, w.uf)}</>}
        meta={<Badge tone="attention">Fora do sistema</Badge>}
        actions={voltar}
      />
      <Pilha>
        <Alert tone="info">Cadastro lido do Winthor agora. O cliente ainda não está na carteira: sem posição, títulos nem contatos aqui.</Alert>
        <Panel>
          <CorpoPainel>
            <Ficha>
              <ItemFicha rotulo="Razão social">{String(w.nome)}</ItemFicha>
              <ItemFicha rotulo="CPF/CNPJ">{formatarDocumento(w.documento) || <Dash />}</ItemFicha>
              <ItemFicha rotulo="Município">{cidade(w.municipio, w.uf) || <Dash />}</ItemFicha>
              <ItemFicha rotulo="Ramo de atividade">{w.ramo ? String(w.ramo) : <Dash />}</ItemFicha>
              <ItemFicha rotulo="Limite de crédito">{valor(w.limite)}</ItemFicha>
            </Ficha>
          </CorpoPainel>
        </Panel>
      </Pilha>
    </>
  );
}
