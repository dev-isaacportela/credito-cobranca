/**
 * Casca do sistema — opção `casca` C "Menu por função" (docs/opcoes-tela/001-base/telas-02-casca.html)
 * sobre o layout do design.md §10: janela que não rola, menu recolhível com estado em localStorage,
 * gaveta no mobile. O menu vem de `menuDoMembro` (Operação, Cadastros, Administração); a carteira
 * não está no menu: é aba dentro das telas de Crédito e Cobrança (`useCarteira`).
 * A faixa de posição desatualizada (RF-006) lê ccBaseSincronizacaoStatus com cache de 60 s (RNF-004).
 * Arquivo do integrador (01 §14). As telas recebem o membro por `useOutletContext<MembroSessao>()`.
 */
import * as React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen, Building2, CalendarCheck, CalendarDays, CalendarRange, ChartColumn, Circle, Contact, FileText, Gavel,
  HandCoins, History, Landmark, Layers, LayoutDashboard, ListChecks, LogOut, Mail, Menu, PanelLeftClose,
  PanelLeftOpen, RefreshCw, Scale, ShieldCheck, SlidersHorizontal, Users, Wallet, X, type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { linha } from '@/lib/mitra-api';
import { fmtDataHora } from '@/lib/formato';
import { menuDoMembro, type MembroSessao, type Modulo } from '@/lib/base/menu';
import { situacaoDaPosicao } from '@/lib/base/posicao';
import { Alert } from '@/components/page';
import { BRAND_GREEN, Monogram, Wordmark } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * Ícones que um `ItemMenu.icone` pode citar (kebab-case do lucide). Lista fechada para o bundle não
 * levar os 1.600 ícones; nome fora da lista vira um círculo. Ícone novo: o integrador acrescenta aqui.
 */
const ICONES: Record<string, LucideIcon> = {
  'book-open': BookOpen, 'building-2': Building2, 'calendar-check': CalendarCheck, 'calendar-days': CalendarDays,
  'calendar-range': CalendarRange, 'chart-column': ChartColumn, contact: Contact, 'file-text': FileText, gavel: Gavel,
  'hand-coins': HandCoins, history: History, landmark: Landmark, layers: Layers, 'layout-dashboard': LayoutDashboard,
  'list-checks': ListChecks, mail: Mail, 'refresh-cw': RefreshCw, scale: Scale, 'shield-check': ShieldCheck,
  'sliders-horizontal': SlidersHorizontal, users: Users, wallet: Wallet,
};

const CARGOS: Record<string, string> = {
  AGENTE: 'Agente', ANALISTA: 'Analista', SUPERVISOR: 'Supervisor', GERENTE: 'Gerente', DIRETORIA: 'Diretoria', JURIDICO: 'Jurídico',
};

const CHAVE_RECOLHIDO = 'cc-menu-recolhido';
const CACHE_MS = 60_000;

// Uma leitura por minuto no máximo, para o sistema todo (RNF-004): a faixa não relê sozinha,
// só ao trocar de tela com o cache vencido.
let statusCache: { em: number; linha: Record<string, unknown> | null } | null = null;

function useStatusDaLeitura() {
  const { pathname } = useLocation();
  const [status, setStatus] = React.useState(statusCache?.linha ?? null);
  React.useEffect(() => {
    if (statusCache && Date.now() - statusCache.em < CACHE_MS) return;
    let vivo = true;
    linha('ccBaseSincronizacaoStatus')
      .then((l) => {
        statusCache = { em: Date.now(), linha: l };
        if (vivo) setStatus(l);
      })
      .catch(() => undefined); // sem status, sem faixa: a tela continua
    return () => {
      vivo = false;
    };
  }, [pathname]);
  return status;
}

function FaixaDaPosicao() {
  const status = useStatusDaLeitura();
  if (!status) return null;
  const situacao = situacaoDaPosicao({ minutosDesde: status.MINUTOS_DESDE, intervaloMin: status.INTERVALO_MIN });
  if (situacao === 'atual') return null;
  return (
    <div className="mb-4">
      <Alert tone="warn">
        {situacao === 'nunca'
          ? 'A posição dos clientes ainda não foi lida do Winthor: valores em aberto e atraso aparecem depois da primeira leitura.'
          : `Posição do Winthor desatualizada: a última leitura completa foi em ${fmtDataHora(String(status.ULTIMA_OK_EM))}. Pagamentos recentes podem não aparecer.`}
      </Alert>
    </div>
  );
}

export default function AdminLayout({ membro, modulos, onSair }: { membro: MembroSessao; modulos: Modulo[]; onSair: () => void }) {
  const [recolhido, setRecolhido] = React.useState(() => {
    try {
      return localStorage.getItem(CHAVE_RECOLHIDO) === '1';
    } catch {
      return false;
    }
  });
  const [gaveta, setGaveta] = React.useState(false);

  React.useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? '1' : '0');
    } catch {
      // preferência não crítica
    }
  }, [recolhido]);

  React.useEffect(() => {
    if (!gaveta) return;
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setGaveta(false);
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [gaveta]);

  const grupos = menuDoMembro(membro, modulos);
  const iniciais = membro.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  const papel = [CARGOS[membro.cargo] ?? membro.cargo, membro.admin ? 'Administrador' : ''].filter(Boolean).join(' · ');

  const menu = (fechado: boolean) => (
    <div className="flex h-full flex-col bg-nav">
      <div className={cn('flex flex-col items-center justify-center gap-1 px-4 py-4', fechado && 'h-14 px-0 py-0')}>
        {fechado ? (
          <span style={{ color: BRAND_GREEN }}>
            <Monogram animar="monta" className="size-7" />
          </span>
        ) : (
          <>
            <Wordmark className="h-6" />
            <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-secondary">Crédito e Cobrança</p>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Menu">
        {grupos.map((grupo) => (
          <div key={grupo.grupo} className="mb-4">
            {fechado ? (
              <div className="mx-auto mb-2 h-px w-6 bg-rule-row" aria-hidden />
            ) : (
              <p className="mb-1 px-2 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">{grupo.nome}</p>
            )}
            {grupo.itens.map(({ caminho, rotulo, icone }) => {
              const Icone = ICONES[icone] ?? Circle;
              return (
                <NavLink
                  key={caminho}
                  to={caminho}
                  title={rotulo}
                  onClick={() => setGaveta(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors',
                      fechado && 'justify-center px-0',
                      isActive ? 'bg-accent font-semibold text-nav-active' : 'text-nav-text hover:bg-nav-hover hover:text-ink',
                    )
                  }
                >
                  <Icone className="size-4 shrink-0" aria-hidden />
                  {fechado ? null : <span className="truncate">{rotulo}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-rule-row p-2">
        <div className={cn('flex items-center gap-2.5 px-1.5 py-2', fechado && 'flex-col justify-center gap-2 px-0')}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-[13px] font-bold text-primary-foreground">
            {iniciais || '?'}
          </span>
          {fechado ? null : (
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-semibold text-ink">{membro.nome}</span>
              <span className="truncate text-[12px] text-ink-secondary">{papel}</span>
            </span>
          )}
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={onSair}
          aria-label="Sair"
          title="Sair"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-nav-text transition-colors',
            'hover:bg-alert-bg hover:text-alert focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
            fechado && 'justify-center px-0',
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {fechado ? null : 'Sair'}
        </button>
        <button
          type="button"
          onClick={() => setRecolhido((v) => !v)}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'mt-1 hidden w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-nav-text transition-colors lg:flex',
            'hover:bg-nav-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
            fechado && 'justify-center px-0',
          )}
        >
          {recolhido ? (
            <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" aria-hidden />
              Recolher
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ground">
      <aside className={cn('hidden shrink-0 border-r border-rule-table transition-[width] lg:block', recolhido ? 'lg:w-[4.5rem]' : 'lg:w-60')}>
        {menu(recolhido)}
      </aside>

      {gaveta ? (
        <button type="button" aria-label="Fechar menu" onClick={() => setGaveta(false)} className="fixed inset-0 z-30 bg-ink/40 lg:hidden" />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 border-r border-rule-table transition-transform lg:hidden',
          gaveta ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-end px-2">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setGaveta(false)}
            className="absolute top-3 right-2 z-50 rounded-lg p-2 text-ink-secondary hover:bg-nav-hover"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="-mt-14 h-full">{menu(false)}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule-table bg-nav px-3 lg:hidden">
          <button type="button" aria-label="Abrir menu" onClick={() => setGaveta(true)} className="rounded-lg p-2 text-ink-secondary hover:bg-nav-hover">
            <Menu className="size-5" aria-hidden />
          </button>
          <Wordmark className="h-5" />
          <span className="ml-auto flex size-8 items-center justify-center rounded-xl bg-primary text-[12px] font-bold text-primary-foreground">
            {iniciais || '?'}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <FaixaDaPosicao />
          <Outlet context={membro} />
        </main>
      </div>
    </div>
  );
}
