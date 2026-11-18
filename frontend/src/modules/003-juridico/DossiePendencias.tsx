// Dossiê, opção B "Pendências primeiro" (T-214): o mesmo componente na rota /juridico/dossie/:processoId e na fase
// `dossie` do card. Abre só com a ficha (ccJurProcessoFicha); "Ver sugestões do sistema" chama ccJurDossieSugestao;
// a lista de filiais carrega quando a pessoa pede para trocar. Privada e Estética: 11 documentos; pública: 13, sem
// notificação extrajudicial (RN-006). Anexo: sobe pelo `enviarArquivo` da lib para os anexos do card e marca o item.

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKanban } from '@benenutri/mitra-kanban';
import { acao, linhas } from '@/lib/mitra-api';
import { validarArquivo } from '@/lib/base/arquivos';
import { fmtData } from '@/lib/formato';
import {
  Alert, Badge, Bloco, Button, Code, Forte, Input, Linha as LinhaItens, Nota, Progresso, Recolhivel, SelectMenu,
  Subtitulo, TextLink,
} from '@/components/page';
import { brl, erroDe, useGravar, type Linha } from './comum';
import type { Ficha, ItemDossie } from './ficha';

const cumprido = (i: ItemDossie) => i.SITUACAO === 'OK' || (i.SITUACAO === 'NA' && String(i.OBS ?? '').trim() !== '');

export function DossiePendencias({ ficha, onAlterado }: { ficha: Ficha; onAlterado: () => Promise<void> | void }) {
  const navigate = useNavigate();
  const kb = useKanban();
  const { processo: pr, pode, progresso } = ficha;
  const { gravar, gravando, erro, ok, limpar } = useGravar();
  const [motivo, setMotivo] = useState<{ itemId: number; texto: string } | null>(null);
  const [sugestoes, setSugestoes] = useState<{ porItem: Record<string, string>; total: number } | null>(null);
  const [filiais, setFiliais] = useState<Linha[] | null>(null);
  const [aviso, setAviso] = useState('');
  const [faltam, setFaltam] = useState<string[]>([]);
  const arquivo = useRef<HTMLInputElement>(null);
  const [anexarEm, setAnexarEm] = useState(0);
  const enviado = !!pr.DOSSIE_ENVIADO_EM;
  const publica = pr.CARTEIRA === 'PUBLICA';
  const travado = gravando || !pode.marcarItem;
  const semPermissao = enviado ? 'Dossiê já enviado: só leitura.' : 'Sem permissão para montar este dossiê.';

  const obrigatorios = ficha.itens.filter((i) => i.OBRIGATORIO && i.ITEM !== 'alcada');
  const faltando = obrigatorios.filter((i) => !cumprido(i));
  const conferidos = obrigatorios.filter(cumprido);
  const seHouver = ficha.itens.filter((i) => !i.OBRIGATORIO);
  const alcada = ficha.itens.find((i) => i.ITEM === 'alcada');

  async function marcar(item: ItemDossie, situacao: 'PENDENTE' | 'OK' | 'NA', obs = '', kbAnexoIds = '') {
    setFaltam([]);
    const r = await gravar('ccJurDossieItemMarcar', { itemId: item.ID, situacao, obs, kbAnexoIds }, 'Dossiê salvo.');
    if (r) { setMotivo(null); await onAlterado(); }
  }

  async function anexar(arquivos: FileList | null) {
    const item = ficha.itens.find((i) => i.ID === anexarEm);
    const f = arquivos?.[0];
    if (arquivo.current) arquivo.current.value = '';
    if (!item || !f) return;
    const recusa = validarArquivo({ nome: f.name, tamanho: f.size });
    if (recusa) return setAviso(recusa);
    setAviso('');
    try {
      if (!kb.enviarArquivo) throw new Error('O envio de arquivo não está disponível: anexe pela aba Anexos do card.');
      const url = await kb.enviarArquivo(f);
      const r = await kb.anexoRegistrar({ cardId: pr.CARD_ID, tipo: 'arquivo', nome: f.name, url, tamanho: f.size });
      if (!r.ok || !r.id) throw new Error(r.error ?? 'Não foi possível registrar o anexo no card.');
      await marcar(item, 'PENDENTE', '', String(r.id));
    } catch (e) {
      setAviso(erroDe(e));
    }
  }

  async function verSugestoes() {
    setAviso('');
    try {
      const r = await acao('ccJurDossieSugestao', { processoId: pr.ID });
      if (r.ok === false) return setAviso(String(r.error));
      setSugestoes({ porItem: Object.fromEntries((r.linhas ?? []).map((l: Linha) => [l.item, l.sugestao])), total: Number(r.total) || 0 });
    } catch (e) {
      setAviso(erroDe(e));
    }
  }

  async function trocarFilial() {
    try {
      setFiliais(await linhas('ccJurFilialCredoraListar', { ativa: 1 }));
    } catch (e) {
      setAviso(erroDe(e));
    }
  }

  async function enviar() {
    setFaltam([]);
    limpar();
    try {
      const r = await acao('ccJurDossieEnviar', { processoId: pr.ID, obs: '' });
      if (r.ok === false) {
        setFaltam(Array.isArray(r.faltam) ? r.faltam : []);
        return setAviso(String(r.error ?? 'Não foi possível enviar.'));
      }
      setAviso('');
      await onAlterado();
    } catch (e) {
      setAviso(erroDe(e));
    }
  }

  const sugestaoDe = (i: ItemDossie) => sugestoes?.porItem[i.ITEM] ?? '';
  const linkAnexos = (i: ItemDossie) => i.anexos.map((a) => <TextLink key={a.id} onClick={() => window.open(a.url, '_blank', 'noopener')}>{a.nome}</TextLink>);
  const botaoAnexar = (i: ItemDossie, rotulo = 'Anexar') => (
    <Button size="sm" disabled={travado} title={pode.marcarItem ? undefined : semPermissao} onClick={() => { setAnexarEm(i.ID); arquivo.current?.click(); }}>{rotulo}</Button>
  );
  const blocoNA = (i: ItemDossie) => motivo?.itemId === i.ID ? (
    <LinhaItens>
      <Input aria-label="Motivo do não se aplica" placeholder="Motivo (obrigatório)" value={motivo.texto} maxLength={500}
        onChange={(e) => setMotivo({ itemId: i.ID, texto: e.target.value })} />
      <Button size="sm" variant="primary" disabled={travado} onClick={() => marcar(i, 'NA', motivo.texto.trim())}>Confirmar</Button>
      <Button size="sm" variant="ghost" onClick={() => setMotivo(null)}>Cancelar</Button>
    </LinhaItens>
  ) : null;

  return (
    <>
      <input ref={arquivo} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" onChange={(e) => anexar(e.target.files)} />
      <Subtitulo extra={pr.DOSSIE_ABERTO_EM ? `aberto em ${fmtData(pr.DOSSIE_ABERTO_EM)}` : undefined}>
        Dossiê · {progresso.ok} de {progresso.total} obrigatórios conferidos
      </Subtitulo>
      <Progresso valor={progresso.ok} total={progresso.total} rotulo="Progresso do dossiê" />
      <Nota>
        {publica ? 'Carteira pública: 13 documentos (11 obrigatórios), sem notificação extrajudicial — use ofício e requerimento administrativo.'
          : `Carteira ${pr.CARTEIRA === 'ESTETICA' ? 'Estética' : 'privada'}: 11 documentos (10 obrigatórios).`}
        {' '}Cada marcação é gravada na hora.
      </Nota>
      {enviado ? <Alert tone="success">Dossiê enviado ao Jurídico em {fmtData(pr.DOSSIE_ENVIADO_EM)}: só leitura.</Alert> : null}
      {aviso ? <Alert tone="error">{aviso}{faltam.length ? <> Faltam: {faltam.join('; ')}.</> : null}</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}

      {!enviado ? (
        <>
          <Subtitulo extra={`${faltando.length} documento(s) e a aprovação`}>Falta para enviar</Subtitulo>
          {faltando.map((i) => (
            <Bloco key={i.ID} tom="atencao">
              <LinhaItens><Badge tone="attention">Pendente</Badge><Badge>obrigatório</Badge></LinhaItens>
              <Forte>{i.TEXTO}</Forte>
              {i.OBS ? <Nota>{i.SITUACAO === 'NA' ? `Não se aplica sem motivo: ${i.OBS}` : i.OBS}</Nota> : null}
              {sugestaoDe(i) ? <Nota>Sugestão do sistema: {sugestaoDe(i)}</Nota> : null}
              <LinhaItens>
                {i.ITEM === 'notif' ? (
                  <Button size="sm" disabled={!ficha.pode.emitirNotificacao} title={ficha.pode.emitirNotificacao ? undefined : 'A notificação é emitida pelo agente do cliente ou por quem está acima dele.'}
                    onClick={() => navigate(`/juridico/documentos/notificacao?clienteId=${pr.CLIENTE_ID}&carteira=${pr.CARTEIRA}&processoId=${pr.ID}`)}>
                    Gerar notificação extrajudicial
                  </Button>
                ) : null}
                {botaoAnexar(i)}
                <Button size="sm" disabled={travado} title={pode.marcarItem ? undefined : semPermissao} onClick={() => marcar(i, 'OK', i.OBS)}>Marcar como conferido</Button>
                <Button size="sm" variant="ghost" disabled={travado} onClick={() => setMotivo({ itemId: i.ID, texto: '' })}>Não se aplica</Button>
              </LinhaItens>
              {blocoNA(i)}
            </Bloco>
          ))}
          {alcada ? (
            <Bloco>
              <LinhaItens><Badge>No envio</Badge><Badge>obrigatório</Badge></LinhaItens>
              <Forte>{alcada.TEXTO}</Forte>
              <Nota>É cumprida pelo próprio envio: fica conferida com o nome de quem enviar e a data. O envio exige Gerente financeiro ou acima.</Nota>
            </Bloco>
          ) : null}
        </>
      ) : null}

      <Recolhivel titulo={`Conferidos · ${conferidos.length}`} dica={enviado ? undefined : 'mostrar'} aberto={enviado}>
        {conferidos.map((i) => (
          <LinhaItens key={i.ID}>
            <Forte>{i.TEXTO}</Forte>
            <Code>{i.SITUACAO === 'NA' ? `não se aplica: ${i.OBS}` : i.OBS || (i.ORIGEM === 'SUGESTAO' ? 'sugestão automática' : 'conferido')}</Code>
            {linkAnexos(i)}
            {!enviado && i.ITEM !== 'alcada' ? <TextLink disabled={travado} onClick={() => marcar(i, 'PENDENTE', '')}>Rever</TextLink> : null}
          </LinhaItens>
        ))}
        {alcada && cumprido(alcada) ? <LinhaItens><Forte>{alcada.TEXTO}</Forte><Code>{alcada.OBS}</Code></LinhaItens> : null}
      </Recolhivel>

      {seHouver.length ? (
        <Recolhivel titulo={`Se houver · ${seHouver.length}`} dica="não conta no progresso">
          {seHouver.map((i) => (
            <LinhaItens key={i.ID}>
              <Forte>{i.TEXTO}</Forte>
              <Code>{i.SITUACAO === 'OK' ? 'conferido' : i.SITUACAO === 'NA' ? 'não se aplica' : 'pendente'}</Code>
              {sugestaoDe(i) ? <Nota>{sugestaoDe(i)}</Nota> : null}
              {linkAnexos(i)}
              {!enviado ? botaoAnexar(i) : null}
            </LinhaItens>
          ))}
        </Recolhivel>
      ) : null}

      <LinhaItens>
        <Code prefix="Filial credora ">{pr.FILIAL || 'não definida'}</Code>
        {filiais ? (
          <SelectMenu label="Filial credora" value={String(pr.FILIAL ?? '')} disabled={!pode.editar || gravando}
            options={filiais.map((f) => ({ value: String(f.CODIGO), label: `${f.CODIGO} · ${f.RAZAO_SOCIAL || 'sem razão social'}`, hint: f.UF }))}
            onChange={async (filial) => { if (await gravar('ccJurProcessoSalvar', { processoId: pr.ID, filial }, 'Filial credora trocada.')) await onAlterado(); }} />
        ) : (
          <TextLink disabled={!pode.editar} title={pode.editar ? undefined : 'A filial é trocada pelo Jurídico ou por quem administra.'} onClick={trocarFilial}>Trocar filial</TextLink>
        )}
      </LinhaItens>

      <LinhaItens>
        <Button size="sm" onClick={verSugestoes}>Ver sugestões do sistema</Button>
        <Button size="sm" onClick={() => navigate(`/juridico/documentos/demonstrativo?clienteId=${pr.CLIENTE_ID}&carteira=${pr.CARTEIRA}&processoId=${pr.ID}`)}>
          Gerar demonstrativo do débito
        </Button>
        {!enviado ? (
          <Button size="sm" variant="primary" disabled={!pode.enviar || gravando}
            title={pode.enviar ? undefined : progresso.faltam.length ? `Faltam: ${progresso.faltam.join('; ')}.` : 'O envio ao Jurídico exige Gerente financeiro ou acima.'}
            onClick={enviar}>
            Enviar ao Jurídico
          </Button>
        ) : null}
      </LinhaItens>
      {sugestoes ? <Nota>Total atualizado pela cobrança hoje: {brl(sugestoes.total) || 'sem encargos calculados'}.</Nota> : null}
    </>
  );
}
