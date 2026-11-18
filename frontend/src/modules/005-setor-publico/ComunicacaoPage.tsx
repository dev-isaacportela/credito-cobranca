// /publico/comunicacao — Comunicação com o órgão (comunicacao-orgao C, "Editor com campos", T-209): o modelo aberto
// em edição — prévia preenchida com uma NF real (ccPubMensagemPreparar), texto com os campos e versões (só a atual,
// PA-23) em abas —, e ao lado os campos disponíveis, a validação do Jurídico e os sete modelos.
// Abrir = modelos + NFs em aberto + a prévia (3 leituras). Salvar sobe a versão e derruba a validação.

import { useRef, useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { podeAdministrar } from '@/lib/base/menu';
import {
  Alert, Button, CorpoPainel, Field, Grade, Input, LabelledField, Linha as LinhaUi, MetaDot, PageHeader, Panel,
  Pilha, Previa, RowMeta, RowTitle, SelectMenu, Stat, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger,
  Td, Textarea, TextLink, Toolbar, Tr,
} from '@/components/page';
import { passoDoModelo, PASSOS_REGUA } from '@/lib/setor-publico/formato';
import { brl, executar, NF_FILTRO, pl, useDados, useMembro, type Linha } from './dados';

const CAMPOS = ['CLIENTE', 'ORGAO', 'NUMERO_NF', 'EMISSAO_NF', 'VALOR_NF', 'EMPENHO', 'CONTRATO', 'PROTOCOLO', 'DATA_LIQUIDAR_ATE', 'DATA_PAGAR_ATE',
  'DIAS_ATRASO_NF', 'AGENTE', 'ASSINATURA', 'TELEFONE_CONTATO', 'EMAIL_CONTATO'];
const SITUACAO: Record<string, { tom: 'live' | 'attention' | 'off'; texto: (m: Linha) => string }> = {
  NAO_EXIGE: { tom: 'off', texto: () => 'não exige validação' },
  VALIDO: { tom: 'live', texto: (m) => `versão ${m.VERSAO} validada` },
  AGUARDANDO: { tom: 'attention', texto: (m) => `versão ${m.VERSAO} aguardando o Jurídico` },
  VENCIDA: { tom: 'attention', texto: () => 'validação vencida: valide de novo' },
};
const situacaoDe = (m: Linha | undefined) => SITUACAO[String(m?.SITUACAO_VALIDACAO)] ?? SITUACAO.NAO_EXIGE;

export default function ComunicacaoPage() {
  const membro = useMembro();
  const pode = podeAdministrar(membro);
  // P-06: cargo Jurídico ou nível ≥ com.modeloValidaNivel (padrão Gerente); o servidor confere o parâmetro.
  const podeValidar = membro.cargo === 'JURIDICO' || membro.nivel >= 3;
  const [codigo, setCodigo] = useState('');
  const [nfId, setNfId] = useState('');
  const [aba, setAba] = useState('previa');
  const [rascunho, setRascunho] = useState<{ codigo: string; assunto: string; corpo: string } | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const corpoRef = useRef<HTMLTextAreaElement>(null);

  const d = useDados(async () => {
    const [modelos, nfs] = await Promise.all([
      linhas('ccBaseModeloListar', { specDona: '005', codigo: '' }),
      linhas('ccPubNfListar', { ...NF_FILTRO, limite: 50 }),
    ]);
    return { modelos, nfs };
  }, 'comunicacao');
  const modelos = d.dados?.modelos ?? [];
  const nfs = d.dados?.nfs ?? [];
  const atual = codigo || String(modelos.find((m) => m.CODIGO === 'PUB_LIQ')?.CODIGO ?? modelos[0]?.CODIGO ?? '');
  const modelo = modelos.find((m) => m.CODIGO === atual);
  const nf = nfId || String(nfs[0]?.ID ?? '');
  const passo = passoDoModelo(atual);
  const texto = rascunho?.codigo === atual ? rascunho : { codigo: atual, assunto: String(modelo?.ASSUNTO ?? ''), corpo: String(modelo?.CORPO ?? '') };
  const mudou = !!modelo && (texto.assunto !== String(modelo.ASSUNTO ?? '') || texto.corpo !== String(modelo.CORPO ?? ''));
  const sit = situacaoDe(modelo);

  // Prévia da versão salva com a NF escolhida; o modelo da análise não tem passo: prévia só no card da concessão.
  const previa = useDados(async () => (atual && nf && passo ? acao('ccPubMensagemPreparar', { nfId: Number(nf), passo }) : null), `${atual}:${nf}`);
  const pv = previa.dados as Linha | null | undefined;

  function inserir(campo: string) {
    const el = corpoRef.current;
    const pos = el ? el.selectionStart : texto.corpo.length;
    setRascunho({ ...texto, corpo: `${texto.corpo.slice(0, pos)}[${campo}]${texto.corpo.slice(el ? el.selectionEnd : pos)}` });
  }
  async function executarAcao(nome: 'ccBaseModeloSalvar' | 'ccBaseModeloValidar', input: Linha, sucesso: (r: Linha) => string) {
    setOcupado(true);
    setAviso(null);
    const r = await executar(nome, input);
    setOcupado(false);
    if (r.erro) return setAviso({ tom: 'error', texto: r.erro });
    setRascunho(null);
    setAviso({ tom: 'success', texto: sucesso(r) });
    d.recarregar();
    previa.recarregar();
  }

  const legais = modelos.filter((m) => Number(m.EFEITO_LEGAL)).length;
  const aguardando = modelos.filter((m) => ['AGUARDANDO', 'VENCIDA'].includes(String(m.SITUACAO_VALIDACAO))).length;

  return (
    <>
      <PageHeader
        module="Setor público"
        title="Comunicação com o órgão"
        description="Sete modelos de mensagem, um para cada situação da nota. No card do órgão eles já saem preenchidos com órgão, NF, empenho, valor e prazos."
        meta={d.dados ? (
          <>
            <span><Stat>{modelos.length}</Stat> modelos</span><MetaDot />
            <span><Stat>{legais}</Stat> {pl(legais, 'exige', 'exigem')} validação do Jurídico</span><MetaDot />
            <span><Stat>{aguardando}</Stat> aguardando validação</span>
          </>
        ) : undefined}
      />
      <Pilha>
        {d.erro ? <Alert tone="error">{d.erro}</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        {!pode ? <Alert tone="info">Somente Gerente, Diretoria ou Administrador edita o texto dos modelos.</Alert> : null}
        <Panel>
          <Toolbar>
            <Field label="Modelo">
              <SelectMenu label="Modelo" value={atual} onChange={(v) => { setCodigo(v); setAviso(null); }}
                options={modelos.map((m) => ({ value: String(m.CODIGO), label: String(m.NOME), hint: `versão ${m.VERSAO} · ${situacaoDe(m).texto(m)}` }))} />
            </Field>
            <RowMeta>{passo ? `Passo ${passo} · ${PASSOS_REGUA[passo].acao}` : 'Análise de crédito: pedido do fluxo de pagamento ao órgão'}</RowMeta>
            <Button variant="ghost" onClick={() => setRascunho(null)} disabled={!mudou || ocupado}>Descartar</Button>
            <Button variant="primary" disabled={!pode || !mudou || ocupado}
              onClick={() => executarAcao('ccBaseModeloSalvar', { codigo: atual, assunto: texto.assunto, corpo: texto.corpo }, (r) => `${modelo?.NOME ?? atual} salvo como versão ${r.versao}.`)}>
              Salvar nova versão
            </Button>
          </Toolbar>
          <Grade colunas={2}>
            <Tabs value={aba} onValueChange={setAba}>
              <TabsList variant="line" aria-label="Modelo">
                <TabsTrigger value="previa">Prévia preenchida</TabsTrigger>
                <TabsTrigger value="texto">Texto do modelo</TabsTrigger>
                <TabsTrigger value="versoes">Versões</TabsTrigger>
              </TabsList>
              <TabsContent value="previa">
                <CorpoPainel>
                  {passo ? (
                    <Field label="Prévia com a NF">
                      <SelectMenu label="NF da prévia" value={nf} onChange={setNfId}
                        options={nfs.map((x) => ({ value: String(x.ID), label: `NF ${x.NUMNOTA} · ${x.CLIENTE_NOME}`, hint: brl(x.VALOR) }))} />
                    </Field>
                  ) : null}
                  {!passo ? <RowMeta>O modelo da análise sai preenchido no card da concessão pública ("Pedir fluxo de pagamento ao órgão").</RowMeta>
                    : !nfs.length ? <RowMeta>{d.carregando ? 'Carregando as notas…' : 'Sem nota em aberto para a prévia.'}</RowMeta>
                    : pv?.ok === false ? <Alert tone="error">{String(pv.error)}</Alert>
                    : pv ? (
                      <>
                        <RowMeta>Para: {pv.para ? String(pv.para) : 'contato principal do órgão'} · versão salva{mudou ? ' (o rascunho ainda não entra na prévia)' : ''}</RowMeta>
                        <Previa><RowTitle>{String(pv.assunto ?? '')}</RowTitle>{'\n'}{String(pv.corpo ?? '')}</Previa>
                        {(pv.faltando ?? []).length ? <Alert tone="warn">Sem valor na prévia: {(pv.faltando as string[]).join(', ')}. Campo sem valor recusa o envio.</Alert> : null}
                      </>
                    ) : <RowMeta>{previa.carregando ? 'Preparando a prévia…' : ''}</RowMeta>}
                </CorpoPainel>
              </TabsContent>
              <TabsContent value="texto">
                <CorpoPainel>
                  <LabelledField label="Assunto"><Input value={texto.assunto} maxLength={300} disabled={!pode} onChange={(e) => setRascunho({ ...texto, assunto: e.target.value })} /></LabelledField>
                  <LabelledField label="Corpo">
                    <Textarea ref={corpoRef} rows={12} value={texto.corpo} disabled={!pode} onChange={(e) => setRascunho({ ...texto, corpo: e.target.value })} />
                  </LabelledField>
                </CorpoPainel>
              </TabsContent>
              <TabsContent value="versoes">
                <CorpoPainel>
                  {modelo ? (
                    <>
                      <RowTitle>Versão {String(modelo.VERSAO)} · em uso</RowTitle>
                      <RowMeta>{sit.texto(modelo)}{modelo.VALIDADO_POR_NOME ? ` · validada por ${modelo.VALIDADO_POR_NOME} em ${fmtData(modelo.VALIDADO_EM)}` : ''}</RowMeta>
                      <RowMeta>As versões anteriores não são guardadas; a auditoria registra quem salvou cada uma.</RowMeta>
                    </>
                  ) : null}
                </CorpoPainel>
              </TabsContent>
            </Tabs>
            <CorpoPainel>
              <Panel>
                <CorpoPainel>
                  <RowMeta>Validação do Jurídico</RowMeta>
                  <Status tone={sit.tom}>{modelo ? sit.texto(modelo) : '—'}</Status>
                  <RowMeta>Ofício e Requerimento só saem com a versão atual validada. Salvar uma versão nova desses dois modelos pede nova validação.</RowMeta>
                  {modelo && Number(modelo.EFEITO_LEGAL) ? (
                    <LinhaUi>
                      <Button onClick={() => executarAcao('ccBaseModeloValidar', { codigo: atual }, (r) => `Versão ${r.versao} validada.`)}
                        disabled={modelo.SITUACAO_VALIDACAO === 'VALIDO' || !podeValidar || ocupado || mudou}
                        title={podeValidar ? (mudou ? 'Salve ou descarte o rascunho antes de validar.' : undefined) : 'A validação é do Jurídico ou de quem tem nível de Gerente para cima.'}>
                        Registrar validação
                      </Button>
                    </LinhaUi>
                  ) : null}
                </CorpoPainel>
              </Panel>
              <Field label="Campos disponíveis" hint={pode ? 'Clique para pôr o campo no texto, onde está o cursor.' : undefined}>
                <LinhaUi>
                  {CAMPOS.map((c) => (
                    <Button key={c} size="sm" variant="ghost" disabled={!pode} onClick={() => { setAba('texto'); inserir(c); }}>[{c}]</Button>
                  ))}
                </LinhaUi>
              </Field>
              <Table>
                <tbody>
                  {modelos.map((m) => (
                    <Tr key={m.CODIGO}>
                      <Td>
                        {m.CODIGO === atual ? <RowTitle>{m.NOME}</RowTitle> : <TextLink onClick={() => setCodigo(String(m.CODIGO))}>{m.NOME}</TextLink>}
                        <RowMeta>v{m.VERSAO} · {situacaoDe(m).texto(m)}</RowMeta>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </CorpoPainel>
          </Grade>
        </Panel>
      </Pilha>
    </>
  );
}
