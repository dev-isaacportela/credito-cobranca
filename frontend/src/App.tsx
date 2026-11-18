/**
 * Registro de módulos, rotas e guarda de sessão (integrador, 01 §14, DT-39).
 *
 * "Módulo entregue" = módulo cujo `index.ts` está em MODULOS: as rotas e o menu dele aparecem;
 * os outros não existem para a casca. O integrador acrescenta a linha quando a spec entrega a
 * primeira tela, e importa uma vez o `extensoes.ts` de cada módulo (dona do quadro antes da 005).
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useOutletContext } from 'react-router-dom';
import { KanbanProvider, criarKanbanApi } from '@benenutri/mitra-kanban';
import { clearSession, initMitra } from '@/lib/mitra-auth';
import { acao, linhas } from '@/lib/mitra-api';
import { enviarArquivo } from '@/lib/base/arquivos';
import { definirHoje } from '@/lib/base/hoje';
import { menuDoMembro, telaInicial, type MembroSessao, type Modulo } from '@/lib/base/menu';
import AdminLayout from '@/AdminLayout';
import { EmptyState, PageHeader, Panel } from '@/components/page';
import { MonogramLoader } from '@/components/Logo';
import { Entrar } from '@/modules/001-base/entrar/Entrar';
import { modulo as base } from '@/modules/001-base';
import { modulo as cobranca } from '@/modules/002-cobranca-privada';
import { modulo as juridico } from '@/modules/003-juridico';
import { modulo as credito } from '@/modules/004-concessao-credito';
import { modulo as publico } from '@/modules/005-setor-publico';
import { modulo as painel } from '@/modules/006-painel-consolidado';
import { modulo as historico } from '@/modules/007-historico-apoio';

// Extensões do card aberto (01 §14), uma vez cada: as donas dos quadros (002, 004) antes da 005.
import '@/modules/002-cobranca-privada/extensoes';
import '@/modules/003-juridico/extensoes';
import '@/modules/004-concessao-credito/extensoes';
import '@/modules/005-setor-publico/extensoes';
import { ligarLeitorXlsx } from '@/lib/juridico/planilha';

// Leitura da planilha da carga do Jurídico (SheetJS), carregada só quando a carga abre um arquivo.
ligarLeitorXlsx(() => import('xlsx'));

const MODULOS: Modulo[] = [base, cobranca, juridico, credito, publico, painel, historico];

/** Rota sem tela entregue: o item está no menu, a tela chega com a spec. */
function TelaNaoEntregue() {
  const membro = useOutletContext<MembroSessao>();
  return (
    <>
      <PageHeader module="Crédito e Cobrança" title="Tela ainda não entregue" />
      <Panel>
        <EmptyState
          title="Esta tela ainda não está disponível."
          hint={`${membro.nome}, o item já está no menu e a tela entra numa próxima entrega.`}
        />
      </Panel>
    </>
  );
}

type Estado = { fase: 'carregando' } | { fase: 'erro' } | { fase: 'sem-acesso' } | { fase: 'ok'; membro: MembroSessao };

function Autenticado({ onSair }: { onSair: () => void }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });

  const ler = useCallback(() => {
    acao('ccBaseSessao')
      .then((r) => {
        const m = r?.membro;
        definirHoje(String(r?.hoje ?? ''));
        if (!m) return setEstado({ fase: r?.ok === false ? 'erro' : 'sem-acesso' });
        setEstado({
          fase: 'ok',
          membro: {
            userId: Number(m.userId), membroId: Number(m.membroId), nome: String(m.nome ?? ''), cargo: String(m.cargo ?? ''),
            nivel: Number(m.nivel ?? 0), admin: Boolean(Number(m.admin)), veTudo: Boolean(Number(m.veTudo)),
            hoje: String(r.hoje ?? ''),
          },
        });
      })
      .catch(() => setEstado({ fase: 'erro' }));
  }, []);

  useEffect(ler, [ler]);
  const conferir = () => {
    setEstado({ fase: 'carregando' });
    ler();
  };

  if (estado.fase === 'carregando') return <MonogramLoader rotulo="Conferindo o acesso" />;
  if (estado.fase !== 'ok') {
    return <Entrar onLogin={conferir} bloqueio={estado.fase} onSair={onSair} onTentarDeNovo={conferir} />;
  }

  const inicio = telaInicial(estado.membro, menuDoMembro(estado.membro, MODULOS));
  return (
    <Routes>
      <Route element={<AdminLayout membro={estado.membro} modulos={MODULOS} onSair={onSair} />}>
        <Route index element={<Navigate to={inicio} replace />} />
        {MODULOS.flatMap((m) => m.rotas).map(({ caminho, tela: Tela }) => (
          <Route key={caminho} path={caminho} element={<Suspense fallback={<MonogramLoader rotulo="Carregando a tela" />}><Tela /></Suspense>} />
        ))}
        <Route path="*" element={<TelaNaoEntregue />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [configurado, setConfigurado] = useState(initMitra);

  // A lib de quadros fala pelo transporte do projeto e sobe anexos por `enviarArquivo` (01 §12).
  const api = useMemo(
    () => criarKanbanApi({
      acao: (nome, input) => acao(nome as Parameters<typeof acao>[0], input),
      linhas: (nome, input) => linhas(nome as Parameters<typeof linhas>[0], input),
      enviarArquivo,
    }),
    [],
  );

  const sair = useCallback(() => {
    clearSession();
    setConfigurado(false);
    navigate('/entrar', { replace: true });
  }, [navigate]);

  return (
    <KanbanProvider api={api}>
      <Routes>
        <Route
          path="/entrar"
          element={configurado ? <Navigate to="/" replace /> : <Entrar onLogin={() => setConfigurado(initMitra())} />}
        />
        <Route path="/*" element={configurado ? <Autenticado onSair={sair} /> : <Navigate to="/entrar" replace />} />
      </Routes>
    </KanbanProvider>
  );
}
