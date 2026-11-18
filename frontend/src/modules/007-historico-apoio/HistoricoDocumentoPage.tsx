// Prévia do documento do histórico (T-207, opção A "Relato corrido"): ccHistExportar uma vez por abertura
// (2 execuções e 1 linha de auditoria, RN-008), a folha na tela e a cópia de impressão por portal. Um botão só
// (D-007): a janela do navegador imprime ou salva em PDF com o nome sugerido pelo título (RN-006).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { acao } from '@/lib/mitra-api';
import { formatarDocumento } from '@/lib/base/documento';
import { rotuloDoFiltro } from '@/lib/historico-apoio/categorias';
import { cssDaPagina, nomeDoDocumento } from '@/lib/historico-apoio/documento';
import {
  Alert, Button, CopiaDeImpressao, EmptyState, PageHeader, Panel, Pilha,
} from '@/components/page';
import { executar, type Linha } from './dados';
import { DocumentoHistorico } from './DocumentoHistorico';
import './impressao.css';

export default function HistoricoDocumentoPage() {
  const { clienteId } = useParams();
  const id = Number(clienteId) || 0;
  const categoria = useSearchParams()[0].get('categoria') ?? '';
  const navigate = useNavigate();
  const [estado, setEstado] = useState<{ doc?: Linha; erro?: string } | null>(null);
  const pedido = useRef('');

  // Uma emissão por abertura: o StrictMode roda o efeito duas vezes e a auditoria contaria duas.
  useEffect(() => {
    const chave = `${id}|${categoria}`;
    if (pedido.current === chave) return;
    pedido.current = chave;
    executar(() => acao('ccHistExportar', { clienteId: id, categoria, de: '', ate: '' }))
      .then((x) => setEstado(x.ok ? { doc: x.r } : { erro: x.erro }));
  }, [id, categoria]);

  const doc = estado?.doc;
  const nome = String(doc?.cliente?.NOME ?? '');
  const documento = formatarDocumento(doc?.cliente?.DOCUMENTO);

  // @page do cliente, título = nome sugerido do PDF e papel claro, enquanto a prévia está aberta (Ctrl+P incluso).
  useEffect(() => {
    if (!nome) return;
    const estilo = document.createElement('style');
    estilo.textContent = cssDaPagina({ nome, documento });
    document.head.appendChild(estilo);
    const raiz = document.documentElement;
    const titulo = document.title;
    let escuro = false;
    const antes = () => { escuro = raiz.classList.contains('dark'); raiz.classList.remove('dark'); document.title = nomeDoDocumento(nome); };
    const depois = () => { if (escuro) raiz.classList.add('dark'); escuro = false; document.title = titulo; };
    window.addEventListener('beforeprint', antes);
    window.addEventListener('afterprint', depois);
    return () => {
      depois();
      estilo.remove();
      window.removeEventListener('beforeprint', antes);
      window.removeEventListener('afterprint', depois);
    };
  }, [nome, documento]);

  const total = Number(doc?.total) || 0;
  const voltar = <Button variant="ghost" onClick={() => navigate(`/historico/${id}`)}>Voltar ao histórico</Button>;
  return (
    <>
      <PageHeader module="Histórico do cliente" title="Prévia do documento"
        description={doc ? `${nomeDoDocumento(nome)}.pdf · A4 · ${rotuloDoFiltro(categoria)} (${total} ${total === 1 ? 'registro' : 'registros'})` : 'Montando o documento…'}
        actions={<>{voltar}<Button variant="primary" disabled={!doc} onClick={() => window.print()}>Imprimir ou salvar em PDF</Button></>} />
      <Pilha>
        {estado?.erro ? <Alert tone="error">{estado.erro}</Alert> : null}
        {doc ? (
          <>
            <Alert tone="info">
              <b>A emissão fica registrada.</b> Quem emitiu, quando, o cliente e o filtro de categoria entram na auditoria. O documento traz todos
              os registros do filtro, não só a página visível. Na janela de impressão, escolha a impressora ou “Salvar como PDF”.
            </Alert>
            <DocumentoHistorico doc={doc} categoria={categoria} />
            {createPortal(<CopiaDeImpressao><DocumentoHistorico doc={doc} categoria={categoria} /></CopiaDeImpressao>, document.body)}
          </>
        ) : estado ? null : <Panel><EmptyState title="Montando o documento…" /></Panel>}
      </Pilha>
    </>
  );
}
