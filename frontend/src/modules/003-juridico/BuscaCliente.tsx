// Busca de cliente da base (ccBaseClienteListar) com espera de 400 ms: nome (sem acento, maiúsculas), CNPJ/CPF ou
// código só com dígitos. Usada no novo processo, no vínculo da ficha, no "Outro" da carga e nos documentos.

import { useEffect, useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, Button, CampoBusca, Code, Item, ListaItens, Resto, SearchInput,
} from '@/components/page';
import { erroDe, termoDeBusca, useEspera, type Linha } from './comum';

export function BuscaCliente({ setor = '', onEscolher, rotulo = 'Escolher', desabilitado }: {
  setor?: string; onEscolher: (c: Linha) => void; rotulo?: string; desabilitado?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const termo = useEspera(texto.trim());
  const [res, setRes] = useState<{ termo: string; linhas: Linha[]; erro: string }>({ termo: '', linhas: [], erro: '' });

  useEffect(() => {
    if (termo.length < 2) return;
    let vivo = true;
    linhas('ccBaseClienteListar', {
      setor, carteira: '', agenteId: 0, analistaId: 0, buId: -1, uf: '', tipoPessoa: '', soVencidos: 0, situacaoFicha: '', ordem: 'NOME',
      busca: termoDeBusca(termo), limite: 8, offset: 0,
    }).then((l) => vivo && setRes({ termo, linhas: l, erro: '' }), (e) => vivo && setRes({ termo, linhas: [], erro: erroDe(e) }));
    return () => { vivo = false; };
  }, [termo, setor]);

  const atual = termo.length >= 2 && res.termo === termo;
  return (
    <CampoBusca>
      <SearchInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome, CNPJ/CPF ou código do cliente" aria-label="Buscar cliente" />
      {atual && res.erro ? <Alert tone="error">{res.erro}</Alert> : null}
      {atual && !res.erro ? (
        <ListaItens>
          {res.linhas.map((c) => (
            <Item key={c.ID}>
              <Resto>{c.NOME}</Resto>
              <Code prefix="cód. ">{c.CODCLI}</Code>
              <Code>{c.DOCUMENTO}</Code>
              <Button size="sm" disabled={desabilitado} onClick={() => onEscolher(c)}>{rotulo}</Button>
            </Item>
          ))}
          {!res.linhas.length ? <Item><Resto>Nenhum cliente encontrado.</Resto></Item> : null}
        </ListaItens>
      ) : null}
    </CampoBusca>
  );
}
