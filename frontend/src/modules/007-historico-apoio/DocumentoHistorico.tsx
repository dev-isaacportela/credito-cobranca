// A folha do documento do histórico (T-207, opção A "Relato corrido"): cabeçalho com a marca, cliente, resumo
// em duas colunas, ficha de contatos e todos os registros do filtro com o texto inteiro (C-007, RF-008).
// Desenhada duas vezes pela prévia: na tela e na cópia de impressão (portal).

import { fmtData, fmtDataHora } from '@/lib/formato';
import { formatarDocumento } from '@/lib/base/documento';
import { Wordmark } from '@/components/Logo';
import {
  Alert, CabecalhoDoDocumento, Categoria, Dash, Ficha, Folha, ItemFicha, Nota, RegistroDoDocumento,
  RodapeDaFolha, SecaoDoDocumento, TextoDoRegistro, TituloDoDocumento, TituloDoRegistro,
} from '@/components/page';
import { corDaCategoria, rotuloDoFiltro } from '@/lib/historico-apoio/categorias';
import { avisoDeCorte, camposDoResumo } from '@/lib/historico-apoio/documento';
import { formatarTexto, partesDoTexto } from '@/lib/historico-apoio/texto';
import type { Linha } from './dados';

const quando = (em: unknown) => {
  const t = String(em ?? '');
  return t.slice(11, 16) && t.slice(11, 16) !== '00:00' ? fmtDataHora(t) : fmtData(t);
};

export function DocumentoHistorico({ doc, categoria }: { doc: Linha; categoria: string }) {
  const c = doc.cliente as Linha;
  const eventos = (doc.eventos ?? []) as Linha[];
  const contatos = (doc.contatos ?? []) as Linha[];
  const corte = avisoDeCorte({ eventos: eventos.length, total: Number(doc.total) || 0, cortado: Boolean(doc.cortado) });
  return (
    <Folha>
      <CabecalhoDoDocumento marca={<Wordmark />}>
        <TituloDoDocumento>Histórico do cliente</TituloDoDocumento>
        <Nota>Crédito e Cobrança · Núcleo Financeiro · Grupo Benenutri</Nota>
        <Nota>Emitido em {fmtDataHora(doc.emitidoEm)} por {doc.emitidoPor} · {rotuloDoFiltro(categoria)}</Nota>
      </CabecalhoDoDocumento>
      <div>
        <TituloDoRegistro>{c.NOME}</TituloDoRegistro>
        <Nota>
          {formatarDocumento(c.DOCUMENTO)} · código {c.CODCLI}{c.MUNICIPIO || c.UF ? ` · ${[c.MUNICIPIO, c.UF].filter(Boolean).join('/')}` : ''}
        </Nota>
      </div>
      <SecaoDoDocumento titulo="Resumo">
        <Ficha colunas={2}>{camposDoResumo(doc.resumo ?? {}).map((f) => <ItemFicha key={f.rotulo} rotulo={f.rotulo}>{f.valor ?? <Dash />}</ItemFicha>)}</Ficha>
      </SecaoDoDocumento>
      <SecaoDoDocumento titulo="Ficha de contatos">
        {contatos.length ? contatos.map((x) => (
          <div key={x.ID}>
            <TextoDoRegistro>
              <b>{[x.AREA, x.FUNCAO].filter(Boolean).join(' · ') || 'Contato'}:</b> {[x.NOME, x.TELEFONE, x.WHATSAPP && x.WHATSAPP !== x.TELEFONE ? `WhatsApp ${x.WHATSAPP}` : '', x.EMAIL].filter(Boolean).join(' · ')}
            </TextoDoRegistro>
            {x.OBS ? <Nota>Observação: {x.OBS}</Nota> : null}
          </div>
        )) : <Nota>Nenhum contato na ficha.</Nota>}
      </SecaoDoDocumento>
      <SecaoDoDocumento titulo={`Linha do tempo · ${Number(doc.total) || 0} ${Number(doc.total) === 1 ? 'registro' : 'registros'}`}>
        {corte ? <Alert tone="warn">{corte}</Alert> : null}
        {eventos.length ? eventos.map((e) => {
          const { principal, expandir } = partesDoTexto(e.TEXTO);
          return (
            <RegistroDoDocumento key={`${e.ORIGEM}:${e.ORIGEM_ID}`} quando={quando(e.EM)}>
              <span><Categoria nome={e.CATEGORIA} cor={corDaCategoria(e.CATEGORIA)} />{Number(e.AGENDADO) === 1 ? <i> · agendado</i> : null}</span>
              <TituloDoRegistro>{formatarTexto(e.TITULO)}</TituloDoRegistro>
              {principal ? <TextoDoRegistro>{formatarTexto(principal)}</TextoDoRegistro> : null}
              {expandir ? <TextoDoRegistro>{formatarTexto(expandir)}</TextoDoRegistro> : null}
              {e.AUTOR_NOME ? <Nota>por {e.AUTOR_NOME}</Nota> : null}
            </RegistroDoDocumento>
          );
        }) : <Nota>Nenhum registro no filtro.</Nota>}
      </SecaoDoDocumento>
      <RodapeDaFolha><span>{c.NOME} · {formatarDocumento(c.DOCUMENTO)}</span><span>A numeração das páginas sai na impressão</span></RodapeDaFolha>
    </Folha>
  );
}
