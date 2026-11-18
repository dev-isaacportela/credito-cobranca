/**
 * /admin/modelos — opção `adm-modelos` B "Editor com prévia" (telas-07-adm-operacao.html): seletor de
 * modelo, assunto e corpo com campos clicáveis, prévia com um cliente escolhido (ccBaseModeloPrever com o
 * texto ainda não salvo), situação da validação e "Registrar validação". Sem "Novo modelo" e sem editar
 * o efeito legal: o contrato não cria modelo (plan.md). Salvar sobe a versão e derruba a validação (C-023).
 */
import { useRef, useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { podeAdministrar } from '@/lib/base/menu';
import { CAMPOS_COMUNS, camposDesconhecidos, camposExtras } from '@/lib/base/telas';
import {
  Alert, Button, Code, CorpoPainel, Field, Forte, Grade, Input, LabelledField, Linha as LinhaUi, MetaDot, Nota,
  PageHeader, Panel, Pilha, Previa, SelectMenu, Stat, Status, Textarea, Toolbar,
} from '@/components/page';
import { motivo, useDados, useEspera, useMembro } from '../comum';

type Linha = Record<string, unknown>;
const SITUACAO: Record<string, { tom: 'live' | 'attention' | 'off'; texto: (m: Linha) => string }> = {
  NAO_EXIGE: { tom: 'off', texto: () => 'Sem efeito legal: não precisa de validação' },
  VALIDO: { tom: 'live', texto: (m) => `Versão ${m.VERSAO} validada` },
  AGUARDANDO: { tom: 'attention', texto: (m) => `Versão ${m.VERSAO} aguardando validação` },
  VENCIDA: { tom: 'attention', texto: () => 'Validação vencida: valide de novo' },
};

export default function Modelos() {
  const membro = useMembro();
  const pode = podeAdministrar(membro);
  const [codigo, setCodigo] = useState('');
  const [rascunho, setRascunho] = useState<{ codigo: string; assunto: string; corpo: string } | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const corpoRef = useRef<HTMLTextAreaElement>(null);

  const dados = useDados(async () => {
    const [modelos, com, clientes] = await Promise.all([
      linhas('ccBaseModeloListar', { specDona: '', codigo: '' }),
      linhas('ccBaseParametroListar', { data: '', carteira: '', grupo: 'com' }),
      linhas('ccBaseClienteListar', {
        busca: '', setor: '', carteira: '', agenteId: 0, analistaId: 0, buId: -1, uf: '', tipoPessoa: '', soVencidos: 0, situacaoFicha: '', ordem: 'NOME', limite: 100, offset: 0,
      }),
    ]);
    return { modelos, com, clientes };
  }, 'modelos');

  const modelos = dados.dados?.modelos ?? [];
  const atual = codigo || String(modelos[0]?.CODIGO ?? '');
  const modelo = modelos.find((m) => m.CODIGO === atual);
  const texto = rascunho?.codigo === atual ? rascunho : { codigo: atual, assunto: String(modelo?.ASSUNTO ?? ''), corpo: String(modelo?.CORPO ?? '') };
  const mudou = !!modelo && (texto.assunto !== String(modelo.ASSUNTO ?? '') || texto.corpo !== String(modelo.CORPO ?? ''));
  const extrasDoModelo = camposExtras(modelo?.CAMPOS_EXTRAS);
  const desconhecidos = camposDesconhecidos(`${texto.assunto}\n${texto.corpo}`, modelo?.CAMPOS_EXTRAS);
  const nivelValida = Number(dados.dados?.com.find((p) => p.CHAVE === 'com.modeloValidaNivel')?.VALOR_EFETIVO ?? 3);
  const podeValidar = membro.cargo === 'JURIDICO' || membro.nivel >= nivelValida;
  const cliente = clienteId || String(dados.dados?.clientes[0]?.ID ?? '');
  const situacao = SITUACAO[String(modelo?.SITUACAO_VALIDACAO)] ?? SITUACAO.NAO_EXIGE;

  // Prévia do texto como está na tela (salvo ou não), com espera de 400 ms enquanto se digita.
  const pedido = useEspera(JSON.stringify({
    codigo: atual, clienteId: Number(cliente), contatoId: 0, assunto: texto.assunto, corpo: texto.corpo,
    extras: JSON.stringify(Object.fromEntries(extrasDoModelo.map((c) => [c, c.startsWith('DATA') && extras[c] ? fmtData(extras[c]) : extras[c] ?? '']))),
  }));
  const previa = useDados(async () => {
    const p = JSON.parse(pedido);
    return p.codigo && p.clienteId ? acao('ccBaseModeloPrever', p) : null;
  }, pedido);
  const pv = previa.dados;

  const escrever = (campo: 'assunto' | 'corpo', valor: string) => setRascunho({ ...texto, [campo]: valor });
  function inserir(campo: string) {
    const el = corpoRef.current;
    const pos = el ? el.selectionStart : texto.corpo.length;
    escrever('corpo', `${texto.corpo.slice(0, pos)}[${campo}]${texto.corpo.slice(el ? el.selectionEnd : pos)}`);
  }

  async function executarAcao(nome: 'ccBaseModeloSalvar' | 'ccBaseModeloValidar', input: Linha, sucesso: (r: Linha) => string) {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await acao(nome, input);
      setOcupado(false);
      if (r.ok === false) return setAviso({ tom: 'error', texto: motivo(r) });
      setRascunho(null);
      setAviso({ tom: 'success', texto: sucesso(r) });
      dados.reler();
    } catch (e) {
      setOcupado(false);
      setAviso({ tom: 'error', texto: motivo(e) });
    }
  }

  const legais = modelos.filter((m) => Number(m.EFEITO_LEGAL)).length;
  const aguardando = modelos.filter((m) => ['AGUARDANDO', 'VENCIDA'].includes(String(m.SITUACAO_VALIDACAO))).length;

  return (
    <>
      <PageHeader
        module="Administração"
        title="Modelos de mensagem"
        description="Os campos entre colchetes são preenchidos com os dados do cliente na hora do envio. Cada módulo entrega os seus modelos; aqui se edita o texto."
        meta={dados.dados ? (
          <>
            <span><Stat>{modelos.length}</Stat> modelos</span><MetaDot />
            <span><Stat>{legais}</Stat> com efeito legal</span><MetaDot />
            <span><Stat>{aguardando}</Stat> aguardando validação</span>
          </>
        ) : undefined}
      />
      <Pilha>
        {!pode ? <Alert tone="info">Somente Gerente, Diretoria ou Administrador edita o texto dos modelos.</Alert> : null}
        {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          <Toolbar>
            <Field label="Modelo"><SelectMenu
              label="Modelo" value={atual} onChange={(v) => { setCodigo(v); setExtras({}); setAviso(null); }}
              options={modelos.map((m) => ({ value: String(m.CODIGO), label: `${m.CODIGO} · ${m.NOME}`, hint: `módulo ${m.SPEC_DONA}` }))}
            /></Field>
            {modelo ? <Status tone={situacao.tom}>{situacao.texto(modelo)}</Status> : null}
            <Button
              onClick={() => executarAcao('ccBaseModeloValidar', { codigo: atual }, (r) => `Versão ${r.versao} de ${atual} validada.`)}
              disabled={!modelo || !Number(modelo.EFEITO_LEGAL) || modelo.SITUACAO_VALIDACAO === 'VALIDO' || !podeValidar || ocupado || mudou}
              title={podeValidar ? undefined : 'A validação é do Jurídico ou de quem tem nível de Gerente para cima.'}
            >
              Registrar validação
            </Button>
            <Button
              variant="primary"
              onClick={() => executarAcao('ccBaseModeloSalvar', { codigo: atual, assunto: texto.assunto, corpo: texto.corpo }, (r) => `${atual} salvo como versão ${r.versao}.`)}
              disabled={!pode || !mudou || ocupado || desconhecidos.length > 0}
            >
              Salvar como versão {Number(modelo?.VERSAO ?? 0) + 1}
            </Button>
          </Toolbar>
          {modelo ? (
            <Grade>
              <CorpoPainel>
                <Forte>Texto do modelo</Forte>
                <Nota><Code>{String(modelo.CODIGO)}</Code> · {String(modelo.NOME)} · versão {String(modelo.VERSAO)}{Number(modelo.EFEITO_LEGAL) ? ' · com efeito legal: só envia depois de validado' : ''}</Nota>
                <LabelledField label="Assunto">
                  <Input value={texto.assunto} maxLength={300} onChange={(e) => escrever('assunto', e.target.value)} disabled={!pode} />
                </LabelledField>
                <LabelledField label="Corpo">
                  <Textarea ref={corpoRef} rows={10} value={texto.corpo} onChange={(e) => escrever('corpo', e.target.value)} disabled={!pode} />
                </LabelledField>
                {desconhecidos.length ? <Alert tone="error">Campo desconhecido no texto: {desconhecidos.map((c) => `[${c}]`).join(', ')}. Use um campo da lista abaixo.</Alert> : null}
                <Field label="Inserir campo" hint="Clique para pôr o campo no corpo, onde está o cursor.">
                  <LinhaUi>
                    {[...CAMPOS_COMUNS, ...extrasDoModelo].map((c) => (
                      <Button key={c} size="sm" variant="ghost" onClick={() => inserir(c)} disabled={!pode}>
                        [{c}]{extrasDoModelo.includes(c) ? ' · extra' : ''}
                      </Button>
                    ))}
                  </LinhaUi>
                </Field>
              </CorpoPainel>
              <CorpoPainel>
                <Forte>Como o cliente recebe</Forte>
                <Field label="Cliente da prévia">
                  <SelectMenu
                    label="Cliente da prévia" value={cliente} onChange={setClienteId}
                    options={(dados.dados?.clientes ?? []).map((c) => ({ value: String(c.ID), label: `${c.CODCLI} · ${c.NOME}` }))}
                  />
                </Field>
                {extrasDoModelo.map((c) => (
                  <LabelledField key={c} label={`Valor de [${c}] para a prévia`}>
                    <Input type={c.startsWith('DATA') ? 'date' : 'text'} value={extras[c] ?? ''} onChange={(e) => setExtras({ ...extras, [c]: e.target.value })} />
                  </LabelledField>
                ))}
                {pv && pv.ok === false ? <Alert tone="error">{motivo(pv)}</Alert> : pv ? (
                  <>
                    <Nota>Para: {pv.para ? String(pv.para) : 'cliente sem e-mail na ficha'}</Nota>
                    <Previa>
                      <Forte>{String(pv.assunto ?? '')}</Forte>
                      {String(pv.corpo ?? '')}
                    </Previa>
                    {(pv.faltando ?? []).length ? <Alert tone="warn">Sem valor na prévia: {(pv.faltando as string[]).join(', ')}. Campo extra sem valor também recusa o envio.</Alert> : null}
                  </>
                ) : <Nota>{previa.carregando ? 'Preparando a prévia…' : 'Escolha um cliente para ver a prévia.'}</Nota>}
                {modelo.SITUACAO_VALIDACAO === 'AGUARDANDO' || modelo.SITUACAO_VALIDACAO === 'VENCIDA' ? (
                  <Alert tone="warn">
                    {modelo.SITUACAO_VALIDACAO === 'VENCIDA' ? 'Validação vencida' : 'Aguardando validação'}: este modelo não pode ser enviado.
                    {modelo.VALIDADO_VERSAO ? ` A última validação é da versão ${modelo.VALIDADO_VERSAO}${modelo.VALIDADO_POR_NOME ? ` (${modelo.VALIDADO_POR_NOME}, ${fmtData(String(modelo.VALIDADO_EM))})` : ''}.` : ' Nunca foi validado.'}
                  </Alert>
                ) : modelo.SITUACAO_VALIDACAO === 'VALIDO' ? (
                  <Alert tone="success">Validado{modelo.VALIDADO_POR_NOME ? ` por ${modelo.VALIDADO_POR_NOME}` : ''} em {fmtData(String(modelo.VALIDADO_EM))}. Editar o texto volta a pedir validação.</Alert>
                ) : null}
              </CorpoPainel>
            </Grade>
          ) : (
            <CorpoPainel><Nota>{dados.carregando ? 'Carregando os modelos…' : 'Nenhum modelo entregue pelos módulos.'}</Nota></CorpoPainel>
          )}
        </Panel>
      </Pilha>
    </>
  );
}
