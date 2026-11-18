/**
 * Vocabulário do produto — design.md §8.
 *
 * Camada 2, montada sobre os primitivos de `ui/`. A fronteira: nome que só faz
 * sentido dentro deste sistema (Panel, Status, Code) mora aqui; nome genérico
 * (Button, Input, Table) é reexport ou envoltório fino.
 *
 * Uma listagem inteira se escreve com estes nomes, sem uma classe Tailwind
 * sequer no arquivo da página. Se uma tela precisou de classe crua, ou falta um
 * nome aqui ou o primitivo está mal ajustado — corrija aqui, não na tela.
 */
import * as React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Minus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button as ButtonPrimitive } from '@/components/ui/button';
import { Input as InputPrimitive } from '@/components/ui/input';
import { Badge as BadgePrimitive } from '@/components/ui/badge';
import { Alert as AlertPrimitive, AlertDescription as AlertDescriptionPrimitive } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { DialogContent } from '@/components/ui/dialog';
import { TabsList } from '@/components/ui/tabs';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { MonogramTile, Wordmark } from '@/components/Logo';
import {
  accentInsensitiveFilter,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export { Input } from '@/components/ui/input';
export { Textarea } from '@/components/ui/textarea';
export { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
/* Gráfico (§12): a tela importa tudo daqui, como importa Table e SelectMenu.
   `recharts` só é dependência de projeto que tem gráfico — se não tiver,
   apague estas duas linhas e o bloco 8.7 lá embaixo. */
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
export type { ChartConfig } from '@/components/ui/chart';
/* As marcas do recharts que as telas desenham dentro do ChartContainer: a tela importa daqui, nunca do recharts. */
export { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

// ── 8.1 Estrutura de tela ─────────────────────────────────────────────────

interface PageHeaderProps {
  module: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

/**
 * Gruda no topo só a partir de `lg`: no mobile quem já está fixo é a barra do
 * layout, e dois cabeçalhos grudados comem a tela inteira. O `-top-8` compensa
 * o `lg:p-8` do <main> — o navegador desconta o padding do container de
 * rolagem ao grudar, e com `top-0` sobraria uma faixa de 32px por onde a
 * tabela rolada continuaria aparecendo.
 */
export function PageHeader({ module, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="mb-6 bg-ground pb-4 lg:sticky lg:-top-8 lg:z-20 lg:pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            {module}
          </p>
          <h1 className="font-title text-2xl font-bold text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 text-[13px] text-ink-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? (
        <p className="mt-3 flex flex-wrap items-center gap-1 text-[12px] text-ink-secondary">
          {meta}
        </p>
      ) : null}
    </header>
  );
}

/**
 * Sem `overflow-hidden` de propósito: ele recortaria o menu de filtro na borda.
 * O canto arredondado se resolve pelo fundo branco do cabeçalho da tabela
 * (mesma cor do painel) e pela última linha sem filete inferior.
 */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-rule-table bg-card', className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-rule-row px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-title text-[15px] font-bold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[12px] text-ink-secondary">{hint}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

// ── 8.2 Filtros ───────────────────────────────────────────────────────────

/** Linha de filtros, colada na tabela que ela filtra (§9.2). */
export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 border-b border-rule-row px-4 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Um seletor fechado não mostra que está filtrando quando o rótulo saiu da
 * tela; a ficha mostra, e ainda dá o clique para desfazer.
 */
export function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-2 py-1 text-[12px] text-accent-foreground">
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remover filtro ${label}`}
        title={`Remover filtro ${label}`}
        className="rounded-lg p-0.5 transition-colors hover:bg-brand-100"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

/**
 * Filtro raro atras de um botao (§9.2): a linha fica com o que se usa toda
 * visita e o resto abre num painel, em vez de seis seletores competindo por
 * atencao. Nada filtra escondido — a contagem no botao e as fichas acima da
 * tabela continuam mostrando o que esta ativo.
 */
export function MoreFilters({
  count = 0,
  label = 'Mais filtros',
  children,
  onClear,
  className,
}: {
  count?: number;
  label?: string;
  children: React.ReactNode;
  onClear?: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    // Sem `modal`: o painel nao precisa travar a rolagem da pagina. Em
    // compensacao, abrir um SelectMenu de dentro dele move o foco para outro
    // portal — e o padrao do Radix seria fechar o painel junto. Dai o
    // `onFocusOutside` barrado; o clique realmente fora continua fechando.
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ButtonPrimitive
          type="button"
          variant="outline"
          aria-expanded={open}
          className={cn(count > 0 && 'border-brand-400 text-primary', className)}
        >
          <SlidersHorizontal aria-hidden />
          {label}
          {count > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-[11px] leading-[18px] font-semibold text-primary-foreground">
              {count}
            </span>
          ) : null}
        </ButtonPrimitive>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" onFocusOutside={(e) => e.preventDefault()}>
        <div className="flex items-center justify-between border-b border-rule-row px-4 py-2.5">
          <span className="font-title text-[13px] font-bold text-ink">{label}</span>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={count === 0}
              className="rounded-lg px-2 py-0.5 text-[12px] font-semibold text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:text-ink-muted"
            >
              Limpar
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 p-4">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function SearchInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
      <InputPrimitive type="search" className={cn('pl-9', className)} {...props} />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Popover + cmdk, não `<select>` nativo (§9.3): o nativo muda de altura e
 * largura conforme o sistema operacional, e uma linha com seis deles fica
 * irregular. Em compensação o nativo dava type-ahead de graça — por isso lista
 * acima de `searchThreshold` ganha campo de busca.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  label,
  placeholder = 'Selecione',
  className,
  disabled,
  searchThreshold = 10,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchThreshold?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    // `modal` é obrigatório: sem ele, dentro de um diálogo o FocusScope do
    // Radix rouba o foco do campo de busca e não dá para digitar (§9.3).
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-[13px] text-ink shadow-xs transition-colors',
            'focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:bg-muted disabled:text-ink-muted',
            !selected && 'text-ink-secondary',
            className
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <Command filter={accentInsensitiveFilter}>
          {options.length >= searchThreshold ? <CommandInput placeholder="Buscar..." /> : null}
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {/* A dica vai EMBAIXO do rótulo: lado a lado, um texto
                      comprido esmaga o nome até virar reticência. */}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="truncate text-[12px] text-ink-secondary">{option.hint}</span>
                    ) : null}
                  </span>
                  {option.value === value ? (
                    <Check className="ml-auto size-3.5 text-primary" aria-hidden />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Asterisco de campo obrigatório — um só desenho para todo formulário. */
function MarcaObrigatorio() {
  return (
    <span className="text-destructive" title="Campo obrigatório" aria-label="obrigatório">
      {' '}*
    </span>
  );
}

/** Rótulo + controle. Use com SelectMenu — um <label> roubaria o clique dele. */
export function Field({
  label,
  hint,
  obrigatorio,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  obrigatorio?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-[12px] font-semibold text-ink-secondary">
        {label}
        {obrigatorio ? <MarcaObrigatorio /> : null}
      </span>
      {children}
      {hint ? <span className="text-[12px] text-ink-secondary">{hint}</span> : null}
    </div>
  );
}

/** Idem, embrulhado em <label> nativo — para input, textarea e afins. */
export function LabelledField({
  label,
  hint,
  // `error` tinge a mesma linha do hint: quando o campo tem o que dizer sobre
  // o que foi digitado, a resposta fica onde o olho já está, não num alerta
  // do rodapé.
  hintTone = 'muted',
  obrigatorio,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  hintTone?: 'muted' | 'error';
  obrigatorio?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-[12px] font-semibold text-ink-secondary">
        {label}
        {obrigatorio ? <MarcaObrigatorio /> : null}
      </span>
      {children}
      {hint ? (
        <span className={cn('text-[12px]', hintTone === 'error' ? 'text-destructive' : 'text-ink-secondary')}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

// ── 8.3 Ações ─────────────────────────────────────────────────────────────

const BUTTON_VARIANT = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
} as const;

/**
 * `variant` padrão é `secondary`, não primário: numa tela com dez botões, só um
 * é a ação principal. `type` padrão é "button" — dentro de um <form> o HTML
 * assume "submit", e um botão de ação interna acabava salvando e fechando o
 * diálogo.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, 'variant' | 'size'> & {
  variant?: keyof typeof BUTTON_VARIANT;
  size?: 'sm' | 'md';
}) {
  return (
    <ButtonPrimitive
      type={type}
      variant={BUTTON_VARIANT[variant]}
      size={size === 'sm' ? 'sm' : 'default'}
      {...props}
    />
  );
}

const ICON_TONE = {
  neutral: 'text-primary hover:bg-accent',
  danger: 'text-destructive hover:bg-destructive-bg',
  attention: 'text-attention hover:bg-attention-bg',
} as const;

/**
 * Um único `label` vira `title` E `aria-label`. Quando eram dois atributos
 * separados, divergiam.
 */
export function IconButton({
  label,
  tone = 'neutral',
  className,
  type = 'button',
  ...props
}: Omit<React.ComponentProps<'button'>, 'aria-label' | 'title'> & {
  label: string;
  tone?: keyof typeof ICON_TONE;
}) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-transparent transition-colors',
        // O glifo precisa de tamanho explicito: sem isto o lucide entrega 24px
        // dentro de um botao de 32px, e o icone encosta na borda. 16px e o que a
        // vitrine (.iconbtn svg) e todo icone do AdminLayout ja usavam.
        '[&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:text-ink-muted disabled:opacity-60',
        ICON_TONE[tone],
        className
      )}
      {...props}
    />
  );
}

/**
 * Ação terciária que se lê como link, não como botão: "Esqueci minha senha",
 * "Criar conta", "Voltar". É `<button>` e não `<a>` porque não navega — troca
 * o passo da mesma tela; o sublinhado no hover é o que sinaliza que clica.
 * Um terceiro botão numa coluna de botões apaga qual é a ação principal.
 */
export function TextLink({ className, type = 'button', ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm text-[13px] font-semibold text-primary transition-colors',
        'hover:underline focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:text-ink-muted disabled:no-underline',
        className
      )}
      {...props}
    />
  );
}

// ── 8.4 Estado e sinalização ──────────────────────────────────────────────

const STATUS_TONE = {
  live: { dot: 'bg-primary', text: 'text-primary' },
  // Inativo é cinza, nunca vermelho: numa listagem em que quase tudo está
  // inativo, o vermelho vira alarme e apaga o destaque do que é crítico.
  off: { dot: 'bg-ink-muted', text: 'text-ink-secondary' },
  attention: { dot: 'bg-attention', text: 'text-attention' },
  alert: { dot: 'bg-destructive', text: 'text-destructive' },
} as const;

/** Estado dentro de tabela: ponto + texto. Selo preenchido não entra em célula. */
export function Status({
  tone,
  children,
}: {
  tone: keyof typeof STATUS_TONE;
  children: React.ReactNode;
}) {
  const style = STATUS_TONE[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', style.text)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', style.dot)} aria-hidden />
      {children}
    </span>
  );
}

const BADGE_TONE = {
  neutral: 'neutral',
  accent: 'accent',
  attention: 'attention',
  alert: 'destructive',
} as const;

/** Selo — FORA de tabela. Dentro de tabela, use Status. */
export function Badge({
  tone = 'neutral',
  ...props
}: Omit<React.ComponentProps<typeof BadgePrimitive>, 'variant'> & {
  tone?: keyof typeof BADGE_TONE;
}) {
  return <BadgePrimitive variant={BADGE_TONE[tone]} {...props} />;
}

const ALERT_TONE = {
  success: 'success',
  error: 'destructive',
  warn: 'attention',
  info: 'default',
} as const;

/** Aviso no fluxo da tela, onde a ação aconteceu — e não some sozinho. */
export function Alert({
  tone,
  children,
  className,
}: {
  tone: keyof typeof ALERT_TONE;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AlertPrimitive
      variant={ALERT_TONE[tone]}
      // role="alert" interrompe o leitor de tela: só erro merece isso.
      role={tone === 'error' ? 'alert' : 'status'}
      className={className}
    >
      {/* O primitivo é grid [0_1fr]: texto solto cai na coluna de largura
          zero e quebra palavra a palavra. A descrição o posiciona certo. */}
      <AlertDescriptionPrimitive>{children}</AlertDescriptionPrimitive>
    </AlertPrimitive>
  );
}

/** Convite para agir, com o próximo passo à mão — não uma frase triste. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <p className="font-title text-[15px] font-bold text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-[13px] text-ink-secondary">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Identificador discreto — sem selo. Precisa estar disponível, não competir. */
export function Code({
  children,
  prefix,
  className,
}: {
  children: React.ReactNode;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={cn('text-[12px] whitespace-nowrap text-ink-secondary', className)}>
      {prefix ? <span className="mr-0.5">{prefix}</span> : null}
      {children}
    </span>
  );
}

/** Ausência de dado. Nunca 0, nunca R$ 0,00 — isso seria afirmar um valor. */
export function Dash() {
  return (
    <span className="text-ink-secondary" aria-label="sem informação">
      —
    </span>
  );
}

/** Número em destaque dentro de uma frase. */
export function Stat({ children }: { children: React.ReactNode }) {
  return <span className="font-title font-bold text-ink">{children}</span>;
}

/** Separador entre contagens. */
export function MetaDot() {
  return (
    <span className="text-ink-muted" aria-hidden>
      ·
    </span>
  );
}

// ── 8.5 Quadro ────────────────────────────────────────────────────────────
//
// Colunas por estado, dentro do Panel. Sem arrastar cartão: o estado muda por
// controle explícito dentro do cartão (um SelectMenu), que funciona no teclado
// e no toque sem biblioteca de drag. Área rebaixada usa paper-sunken — nunca
// um terceiro cinza (§5).

/**
 * Altura da coluna, por nome. Mora no `Board` e não na `BoardColumn` porque a
 * altura é do quadro inteiro: se cada coluna escolhesse a sua, as fases
 * desalinhariam — que é justamente o que a altura fixa existe para evitar.
 *
 * `curto` cabe num cartão de dashboard; `padrao` é a tela de trabalho;
 * `alto` é para monitor grande, quando sobra altura e o quadro é o assunto
 * principal da tela. Precisou de outro valor? Acrescente um nome aqui, não uma
 * classe na tela.
 */
const BOARD_HEIGHT = {
  curto: '[--board-column-h:22rem]',
  padrao: '[--board-column-h:30rem]',
  alto: '[--board-column-h:40rem]',
} as const;

export function Board({
  height = 'padrao',
  children,
}: {
  height?: keyof typeof BOARD_HEIGHT;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4', BOARD_HEIGHT[height])}>
      {children}
    </div>
  );
}

/**
 * Coluna de altura FIXA em que só a pilha de cartões rola (§9.6).
 *
 * O cabeçalho da fase fica parado e visível — quem rolou trinta cartões ainda
 * sabe em que coluna está. E a coluna cheia não estica o quadro nem desalinha
 * as vizinhas: sem isto, uma fase com trinta itens empurra o rodapé para
 * milhares de pixels abaixo e as outras três viram faixas curtas no topo.
 *
 * A altura vem do `Board` pela variável `--board-column-h`; o valor no
 * fallback é o mesmo do `padrao`, para a coluna usada fora de um `Board`
 * continuar de pé em vez de colapsar.
 *
 * `min-h-0` no miolo não é enfeite: sem ele o filho de um flex container se
 * recusa a encolher abaixo do conteúdo, e o overflow nunca chega a rolar.
 */
export function BoardColumn({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-[var(--board-column-h,30rem)] flex-col gap-2 rounded-2xl bg-paper-sunken p-2">
      <header className="flex shrink-0 items-center justify-between px-1.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
        <span>{title}</span>
        <span>{count}</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">{children}</div>
    </section>
  );
}

export function BoardCard({ children }: { children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-rule-table bg-card p-3 text-[13px]">
      {children}
    </article>
  );
}

// ── 8.6 Tabela ────────────────────────────────────────────────────────────

/** Remove o filete da última linha — é o que fecha o canto do Panel. */
export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-[13px] [&_tr:last-child>td]:border-b-0',
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({ numeric, className, ...props }: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'bg-card px-4 py-2.5 text-left align-middle text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-ink-muted uppercase',
        numeric && 'text-right',
        className
      )}
      {...props}
    />
  );
}

export function Td({ numeric, className, ...props }: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      className={cn('border-b border-rule-row px-4 py-3 align-top', numeric && 'text-right', className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.ComponentProps<'tr'>) {
  // Sem fundo alternado: a hierarquia vem de tipografia, alinhamento e espaço.
  return <tr className={cn('transition-colors hover:bg-accent', className)} {...props} />;
}

export function RowTitle({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-ink">{children}</span>;
}

export function RowMeta({ children }: { children: React.ReactNode }) {
  return <span className="block text-[12px] text-ink-secondary">{children}</span>;
}

export function Pagination({
  page,
  lastPage,
  total,
  unit,
  busy,
  onPrevious,
  onNext,
}: {
  page: number;
  lastPage: number;
  total: number;
  unit: string;
  busy?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule-row px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Contagem muda sozinha ao paginar — o leitor de tela precisa saber. */}
      <p className="text-[12px] text-ink-secondary" aria-live="polite">
        Página <Stat>{page}</Stat> de <Stat>{lastPage}</Stat>
        <MetaDot />
        <Stat>{total.toLocaleString('pt-BR')}</Stat> {unit}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onPrevious} disabled={busy || page <= 1}>
          <ChevronLeft aria-hidden />
          Anterior
        </Button>
        <Button size="sm" onClick={onNext} disabled={busy || page >= lastPage}>
          Próxima
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ── 8.7 Gráficos e painel ─────────────────────────────────────────────────

/**
 * A cor de uma série. O índice é a POSIÇÃO DA SÉRIE NO CONTRATO — a ordem em
 * que o backend devolve as dimensões, os anos, as categorias —, nunca o índice
 * do array já filtrado: se o filtro apagar a série 2, a série 3 continua
 * `--data-3`. Cor que anda quando o filtro muda faz o leitor comparar duas
 * coisas diferentes achando que compara a mesma (design.md §12).
 */
export function corDeSerie(indice: number) {
  return `var(--data-${(indice % 8) + 1})`;
}

/**
 * Cor de célula por intensidade — mapa de calor, matriz de risco. Quatro
 * passos da rampa sequencial; ausência de dado devolve o fundo rebaixado, que
 * é o `Dash` da cor: célula vazia não é célula de valor mínimo.
 */
export function tomDeIntensidade(valor: number | null, maximo: number) {
  if (valor === null || maximo <= 0) return 'var(--muted)';
  const passo = Math.min(4, Math.max(1, Math.ceil((valor / maximo) * 4)));
  return `var(--data-seq-${passo})`;
}

/**
 * Variação contra o período anterior ou contra a meta. `inverso` é para o que
 * melhora caindo — turnover, custo, prazo, ruptura: aí o vermelho é a subida.
 * Variação abaixo de 0,05 p.p. é cinza, não verde: ruído não é conquista.
 */
export function Delta({
  valor,
  inverso,
  sufixo = '%',
}: {
  valor: number | null;
  inverso?: boolean;
  sufixo?: string;
}) {
  if (valor === null) return <Dash />;
  const parado = Math.abs(valor) < 0.05;
  const bom = inverso ? valor < 0 : valor > 0;
  const tom = parado ? 'text-ink-secondary' : bom ? 'text-primary' : 'text-destructive';
  const Icone = parado ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-medium', tom)}>
      <Icone className="size-3.5" aria-hidden />
      {/* O sinal já está na seta; repetir "+" é ruído. */}
      {Math.abs(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
      {sufixo}
    </span>
  );
}

/**
 * Linha de tendência sem eixo e sem lib: mora dentro de um Kpi ou de uma
 * célula, e existe para dar direção ao número ao lado, não para ser lida em
 * valor. A última leitura ganha o ponto — é a única que o olho procura.
 * A cor vem do `text-*` de quem chama (`currentColor`).
 *
 * Tamanho fixo de propósito: sparkline é glifo de linha de texto, e glifo tem
 * tamanho de glifo. A regra da proporção do §12.1 — o desenho segue o
 * container — vale para o gráfico que ocupa um `PainelGrafico`.
 */
export function Sparkline({ valores, className }: { valores: number[]; className?: string }) {
  if (valores.length < 2) return <Dash />;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;
  const x = (i: number) => (i / (valores.length - 1)) * 56 + 2;
  const y = (v: number) => 16 - ((v - min) / amplitude) * 14;
  const d = valores.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox="0 0 60 18"
      className={cn('h-[18px] w-[60px] text-primary', className)}
      aria-hidden
      focusable="false"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(valores.length - 1)} cy={y(valores[valores.length - 1])} r={2} fill="currentColor" />
    </svg>
  );
}

/** A faixa de números que abre um painel. Some abaixo de `sm` para uma coluna. */
export function GradeKpi({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

/**
 * Um número com nome. O valor é o que se lê de longe; o resto é apoio.
 * Sem dado é `Dash`, nunca 0 — a regra da tabela vale aqui (§8.6).
 */
export function Kpi({
  rotulo,
  valor,
  delta,
  hint,
  grafico,
}: {
  rotulo: string;
  valor: React.ReactNode;
  delta?: React.ReactNode;
  hint?: React.ReactNode;
  grafico?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-rule-row bg-card p-4">
      <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{rotulo}</p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-title text-2xl font-bold text-ink">{valor}</span>
          {delta}
        </div>
        {grafico}
      </div>
      {hint ? <p className="text-[12px] text-ink-secondary">{hint}</p> : null}
    </div>
  );
}

/**
 * A grade de gráficos do painel: duas colunas a partir de `lg`. Número ímpar
 * de gráficos deixa o último órfão, com meia faixa vazia ao lado — o último
 * então é `largura="total"`, e só se o dado justificar a largura (§9.7).
 */
export function GradeGraficos({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">{children}</div>;
}

/**
 * A moldura de um gráfico. Existe por uma razão mecânica: o
 * `ResponsiveContainer` do recharts mede o PAI, e pai sem altura mede zero —
 * o gráfico some sem erro nenhum no console. A altura vive aqui, uma vez, em
 * vez de virar `h-[240px]` copiado por seis telas.
 *
 * `acoes` é onde mora o par Gráfico/Tabela: todo gráfico deve poder virar
 * tabela, porque três slots da rampa não alcançam 3:1 sobre o branco e porque
 * leitor de tela não lê barra (§12).
 *
 * `largura="total"` é para o gráfico que ocupa a faixa inteira da
 * `GradeGraficos`. Não é o remédio de qualquer sobra: quatro barras esticadas
 * por 1200px não ficam mais legíveis. Merecem a faixa a série temporal longa,
 * o mapa de calor, a matriz, a pilha de muitas categorias — o que tem o que
 * fazer com o eixo x (§9.7).
 */
export function PainelGrafico({
  titulo,
  hint,
  acoes,
  altura = 'padrao',
  largura = 'padrao',
  rodape,
  children,
}: {
  titulo: string;
  hint?: React.ReactNode;
  acoes?: React.ReactNode;
  altura?: 'padrao' | 'alta';
  largura?: 'padrao' | 'total';
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Panel
      className={cn('flex min-w-0 flex-col gap-3 p-4', largura === 'total' && 'lg:col-span-2')}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-title text-[14px] font-bold text-ink">{titulo}</h3>
          {hint ? <p className="mt-0.5 text-[12px] text-ink-secondary">{hint}</p> : null}
        </div>
        {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
      </div>
      <div className={cn('w-full min-w-0', altura === 'alta' ? 'h-[320px]' : 'h-[220px]')}>
        {children}
      </div>
      {rodape}
    </Panel>
  );
}

// ── 10.1 Acesso (login) ───────────────────────────────────────────────────

/**
 * Tela de acesso em duas metades (§10.1): à esquerda a assinatura, a manchete e
 * o bloco de contexto em `brand-50`; à direita o cartão. No mobile a metade de
 * contexto some e a assinatura sobe para cima do cartão.
 */
export function TelaAcesso({
  manchete,
  rotulo,
  contexto,
  children,
}: {
  manchete: React.ReactNode;
  rotulo: string;
  contexto: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ground">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_minmax(0,27rem)] lg:gap-20 lg:px-8">
        <div className="hidden flex-col gap-7 lg:flex">
          <Wordmark className="h-9" />
          <h2 className="font-title text-4xl leading-[1.12] font-bold tracking-tight text-balance text-ink sm:text-5xl">
            {manchete}
          </h2>
          <div className="max-w-md rounded-3xl bg-brand-50 p-6">
            <p className="font-title text-[15px] font-bold text-ink">{rotulo}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{contexto}</p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-col">
          <div className="mb-7 flex flex-col items-center gap-3 lg:hidden">
            <Wordmark className="h-7" />
            <p className="text-center text-[13px] font-semibold text-ink-secondary">{rotulo}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Cartão do acesso: monograma, título do passo e, embaixo, o aviso do passo (não some sozinho). */
export function CartaoAcesso({
  titulo,
  subtitulo,
  aviso,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  aviso?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full p-8">
      <div className="mb-6 flex flex-col gap-3">
        <MonogramTile />
        <div>
          <h1 className="font-title text-2xl font-bold text-ink">{titulo}</h1>
          {subtitulo ? <p className="mt-1 text-[13px] text-ink-secondary">{subtitulo}</p> : null}
        </div>
      </div>
      {children}
      {aviso ? <div className="mt-4 flex flex-col gap-3">{aviso}</div> : null}
    </Card>
  );
}

/** Cada passo do acesso é um <form> de verdade: Enter envia e o gerenciador de senhas lê (§10.1). Botão direto no form ocupa a largura toda. */
export function FormAcesso({ onEnviar, children }: { onEnviar: () => void; children: React.ReactNode }) {
  return (
    <form
      className="flex flex-col gap-3 [&>button]:w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onEnviar();
      }}
    >
      {children}
    </form>
  );
}

/** "ou entre com e-mail" entre os botões de SSO e o formulário. */
export function ReguaAcesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <span className="h-px flex-1 bg-rule-row" />
      <span className="text-[12px] whitespace-nowrap text-ink-secondary">{children}</span>
      <span className="h-px flex-1 bg-rule-row" />
    </div>
  );
}

/** Linha dos links terciários do cartão ("Esqueci minha senha" · "Criar conta"). */
export function RodapeAcesso({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-secondary">{children}</div>;
}

/** Campo de código de 6 dígitos: grande e centralizado (o filtro de dígitos é da tela, §10.1). */
export function CampoCodigo(props: React.ComponentProps<'input'>) {
  return <InputPrimitive placeholder="000000" inputMode="numeric" autoComplete="one-time-code" className="h-12 text-center text-2xl font-bold tracking-[0.5em]" {...props} />;
}

// ── 8.8 Apoio de tela (Crédito e Cobrança) ────────────────────────────────
//
// Os nomes de layout que as telas das sete specs precisaram além do kit (docs/design.md §8.8). Um nome, um
// componente: quando dois módulos tinham peças parecidas, ficou uma só (quem virou o quê está no design.md).
// Só token; nada de `dark:`.

/** Blocos da tela empilhados (KPIs, avisos, painéis); o cabeçalho fica fora. */
export function Pilha({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-4">{children}</div>;
}

/**
 * Grade de painéis ou cartões. `2` = duas colunas a partir de `lg`; `3` = duas no `md`, três no `xl`;
 * `estreita` = coluna de 300px + resto; `lado` = resto + coluna de 320px.
 */
export function Grade({ colunas = 2, children }: { colunas?: 2 | 3 | 'estreita' | 'lado'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid min-w-0 items-start gap-4 [&>*]:min-w-0',
        colunas === 2 && 'lg:grid-cols-2',
        colunas === 3 && 'md:grid-cols-2 xl:grid-cols-3',
        colunas === 'estreita' && 'lg:grid-cols-[300px_minmax(0,1fr)]',
        colunas === 'lado' && 'lg:grid-cols-[minmax(0,1fr)_320px]',
      )}
    >
      {children}
    </div>
  );
}

/** Miolo de um Panel sem tabela: respiro e espaço entre os itens. */
export function CorpoPainel({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-3 p-4">{children}</div>;
}

/** Faixa dentro do painel (acima ou abaixo da tabela): texto à esquerda, ações à direita. */
export function Faixa({ children, embaixo, destaque }: { children: React.ReactNode; embaixo?: boolean; destaque?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-[13px]',
        embaixo ? 'border-t border-rule-row' : 'border-b border-rule-row',
        destaque && 'bg-accent',
      )}
    >
      {children}
    </div>
  );
}

/** Itens lado a lado que quebram linha (botões, selos, campos curtos). `entre` = as duas pontas da linha. */
export function Linha({ children, entre }: { children: React.ReactNode; entre?: boolean }) {
  return <div className={cn('flex min-w-0 flex-wrap items-center gap-2', entre && 'justify-between gap-x-3 gap-y-1')}>{children}</div>;
}

/** Seção de uma aba: título, dica e ações à direita, e o conteúdo embaixo. */
export function Secao({ titulo, hint, acoes, children }: { titulo: string; hint?: React.ReactNode; acoes?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-title text-[16px] font-bold text-ink">{titulo}</h2>
          {hint ? <p className="mt-0.5 text-[12px] text-ink-secondary">{hint}</p> : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** Título de bloco dentro do card ou do painel, com uma dica à direita. */
export function Subtitulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-title text-[14px] font-bold text-ink">{children}</h3>
      {extra ? <span className="text-[12px] text-ink-secondary">{extra}</span> : null}
    </div>
  );
}

/** Parágrafo de apoio (12px, tinta secundária). */
export function Nota({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-ink-secondary">{children}</p>;
}

/** Texto forte numa frase. */
export function Forte({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

/** Campo da Toolbar que ocupa a sobra da linha (a busca). */
export function CampoBusca({ children }: { children: React.ReactNode }) {
  return <div className="min-w-56 flex-1 [&_input]:w-full">{children}</div>;
}

/** Campo de filtro da barra com largura estável (o SelectMenu é `w-full`); no celular ocupa a linha. */
export function CampoFiltro({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-56">
      <span className="text-[12px] font-semibold text-ink-secondary">{label}</span>
      {children}
    </div>
  );
}

/** Texto que empurra para a direita na barra de filtros (de onde vêm os números). */
export function FonteDosNumeros({ children }: { children: React.ReactNode }) {
  return <p className="pb-2 text-[12px] text-ink-secondary sm:ml-auto">{children}</p>;
}

/** Faixa que rola na horizontal no celular em vez de estourar a largura da tela. */
export function RolagemHorizontal({ children }: { children: React.ReactNode }) {
  return <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">{children}</div>;
}

/** Abas que abrem um Panel: linha de abas com filete embaixo. */
export function AbasDoPainel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border-b border-rule-row px-3">
      <TabsList variant="line">{children}</TabsList>
    </div>
  );
}

/** Contagem discreta ao lado do rótulo de uma aba. */
export function Contagem({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] font-normal text-ink-secondary">{children}</span>;
}

/** Ações da linha de tabela (IconButton lado a lado). */
export function Acoes({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-0.5 whitespace-nowrap">{children}</div>;
}

// Pares rótulo/valor e números

/** Pares rótulo/valor. Padrão: 2 colunas no `sm`, 3 no `xl`; `4` = até 4 no `xl`; `2` = sempre 2 (documento impresso). */
export function Ficha({ colunas, children }: { colunas?: 2 | 4; children: React.ReactNode }) {
  return (
    <dl
      className={cn(
        'grid gap-x-5 gap-y-3',
        colunas === 2 ? 'grid-cols-2' : colunas === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3',
      )}
    >
      {children}
    </dl>
  );
}

export function ItemFicha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{rotulo}</dt>
      <dd className="font-medium break-words text-ink">{children}</dd>
    </div>
  );
}

/** Números pequenos lado a lado (rótulo em cima, valor embaixo). */
export function Numeros({ itens }: { itens: { rotulo: string; valor: React.ReactNode }[] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex flex-col">
          <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{i.rotulo}</dt>
          <dd className="font-title text-[15px] font-bold text-ink">{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Rótulo à esquerda, valor à direita, numa linha de cartão. */
export function ParValor({ rotulo, valor }: { rotulo: React.ReactNode; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="text-ink-secondary">{rotulo}</span>
      <span className="text-right font-semibold text-ink">{valor}</span>
    </div>
  );
}

/** Número de destaque dentro de um cartão (menor que o do Kpi), com a unidade ao lado. */
export function NumeroGrande({ children, dica }: { children: React.ReactNode; dica?: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-title text-[24px] leading-tight font-bold text-ink">{children}</span>
      {dica ? <span className="text-[12px] text-ink-secondary">{dica}</span> : null}
    </p>
  );
}

// Formulário

/** Grade de campos de formulário (diálogos): 2 colunas no `sm`; `5` = cinco no `xl` (lançamento em linha). */
export function GradeCampos({ colunas = 2, children }: { colunas?: 2 | 5; children: React.ReactNode }) {
  return <div className={cn('grid gap-x-4 gap-y-3 sm:grid-cols-2', colunas === 5 && 'xl:grid-cols-5')}>{children}</div>;
}

/** Caixa de marcar com rótulo (nativa: teclado, toque e leitor de tela de graça). */
export function Marcar({
  checked,
  onChange,
  disabled,
  children,
  rotulo,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  /** Sem `children`, o rótulo vai só para o leitor de tela (caixa de seleção em tabela). */
  rotulo?: string;
}) {
  return (
    <label className={cn('inline-flex items-start gap-2 text-[13px] text-ink', disabled && 'text-ink-secondary')}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        aria-label={children ? undefined : rotulo}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children ? <span>{children}</span> : null}
    </label>
  );
}

/** Campo numérico curto dentro de célula (grade de parâmetros). */
export function InputCurto(props: React.ComponentProps<typeof InputPrimitive>) {
  return <InputPrimitive className="ml-auto w-28 text-right" {...props} />;
}

/** Diálogo largo (e-mail com prévia, acordo, trilho editável). */
export function DialogoLargo(props: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent className="sm:max-w-3xl" {...props} />;
}

// Listas

/** Lista de itens com filete entre eles. */
export function ListaItens({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col [&>*:last-child]:border-b-0">{children}</div>;
}

/** Item da lista: clicável (`onClick`) ou só de leitura; `ativo` = o escolhido. */
export function Item({ ativo, onClick, children }: { ativo?: boolean; onClick?: () => void; children: React.ReactNode }) {
  const classe = cn(
    'flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule-row px-4 py-2.5 text-left text-[13px] text-ink',
    ativo && 'bg-accent font-semibold',
  );
  if (!onClick) return <div className={classe}>{children}</div>;
  return (
    <button type="button" onClick={onClick} aria-current={ativo || undefined} className={cn(classe, 'transition-colors hover:bg-accent')}>
      {children}
    </button>
  );
}

/** O texto que ocupa o resto da linha num Item. */
export function Resto({ children }: { children: React.ReactNode }) {
  return <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>;
}

/** Linha com título, meta e valor à direita (maiores clientes de cada nível). */
export function ItemLista({ titulo, meta, valor }: { titulo: React.ReactNode; meta?: React.ReactNode; valor?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule-row px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{titulo}</p>
        {meta ? <p className="text-[12px] text-ink-secondary">{meta}</p> : null}
      </div>
      {valor !== undefined ? <span className="shrink-0 font-semibold text-ink">{valor}</span> : null}
    </div>
  );
}

/** Item com miolo livre empilhado (indicadores de um grupo). */
export function ItemBloco({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 border-b border-rule-row px-4 py-3">{children}</div>;
}

/** Linha final da lista com uma ação ("Ver os N clientes"). */
export function RodapeLista({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-rule-row px-4 py-2.5">{children}</div>;
}

// Pessoas

/** Iniciais da pessoa em quadrado verde claro. */
export function Avatar({ nome }: { nome: string }) {
  const iniciais = nome.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span aria-hidden className="inline-grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-[11px] font-bold text-accent-foreground">
      {iniciais}
    </span>
  );
}

/** Pessoa: avatar, nome forte e linha de apoio. */
export function Pessoa({ nome, children }: { nome: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar nome={nome} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{nome}</p>
        {children ? <div className="text-[12px] text-ink-secondary">{children}</div> : null}
      </div>
    </div>
  );
}

/** Pessoa com recuo pelo nível na árvore da equipe. */
export function PessoaNaArvore({ nome, nivel }: { nome: string; nivel: number }) {
  return (
    <span className="inline-flex items-center gap-2" style={{ paddingLeft: `${Math.max(0, nivel) * 18}px` }}>
      <Avatar nome={nome} />
      <span className="font-semibold text-ink">{nome}</span>
    </span>
  );
}

// Linha do tempo

/** Linha do tempo: eventos com ponto e filete. */
export function LinhaDoTempo({ children }: { children: React.ReactNode }) {
  return <ol className="flex flex-col">{children}</ol>;
}

export function Evento({ meta, children }: { meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="relative grid grid-cols-[14px_1fr] gap-2.5 pb-3.5 text-[13px] text-ink before:absolute before:top-3 before:bottom-0 before:left-1.5 before:w-px before:bg-rule-table last:before:hidden">
      <span aria-hidden className="mt-1 ml-0.5 size-2.5 rounded-full bg-brand-400" />
      <div className="min-w-0">
        {children}
        {meta ? <p className="text-[12px] text-ink-secondary">{meta}</p> : null}
      </div>
    </li>
  );
}

/** Cabeçalho de um dia sobre fundo rebaixado; `agendado` vai em destaque de atenção. */
export function CabecalhoDia({ children, dica, agendado }: { children: React.ReactNode; dica?: React.ReactNode; agendado?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 border-b border-rule-row px-4 py-2', agendado ? 'bg-attention-bg' : 'bg-paper-sunken')}>
      <h3 className={cn('font-title text-[13px] font-bold', agendado ? 'text-attention' : 'text-ink')}>{children}</h3>
      {dica ? <span className="text-[12px] text-ink-secondary">{dica}</span> : null}
    </div>
  );
}

/** Um registro do dia: hora, categoria e o conteúdo. No celular a categoria desce para baixo da hora. */
export function ItemDaLinha({ hora, categoria, children }: { hora: React.ReactNode; categoria: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-rule-row px-4 py-3 text-[13px] text-ink last:border-b-0 md:grid-cols-[3.5rem_10rem_minmax(0,1fr)]">
      <span className="text-[12px] text-ink-secondary">{hora}</span>
      <span className="md:pt-px">{categoria}</span>
      <div className="col-start-2 flex min-w-0 flex-col gap-1 md:col-start-3 md:row-start-1">{children}</div>
    </div>
  );
}

export function TituloDoRegistro({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-ink">{children}</p>;
}

/** Texto do registro: quebra de linha preservada. */
export function TextoDoRegistro({ children }: { children: React.ReactNode }) {
  return <p className="break-words whitespace-pre-line text-ink">{children}</p>;
}

/** O que só aparece ao expandir (corpo do e-mail). */
export function Expandir({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <details>
      <summary className="cursor-pointer text-[12px] font-semibold text-primary hover:underline">{rotulo}</summary>
      <div className="mt-1.5 rounded-xl bg-paper-sunken p-3 break-words whitespace-pre-line text-ink">{children}</div>
    </details>
  );
}

// Blocos

/** Bloco com contorno leve (um contato, um item do dossiê); `tom` pinta atenção ou alerta. */
export function Bloco({ children, tom }: { children: React.ReactNode; tom?: 'atencao' | 'alerta' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-3',
        tom === 'alerta' ? 'border-destructive bg-destructive-bg' : tom === 'atencao' ? 'border-attention bg-attention-bg' : 'border-rule-row',
      )}
    >
      {children}
    </div>
  );
}

/** Texto como o destinatário recebe (e-mail, mensagem ao órgão): fundo rebaixado, quebras de linha preservadas. */
export function Previa({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-xl bg-paper-sunken p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{children}</div>;
}

/**
 * Bloco que abre e fecha (`<details>` nativo: teclado e leitor de tela de graça). `moldura`: `caixa` = bloco
 * contornado dentro do card; `painel` = um Panel no fluxo da tela; `linha` = linha de uma lista (filete embaixo).
 * `preguicoso` só monta o miolo — e só busca o dado dele — quando aberto.
 */
export function Recolhivel({
  titulo,
  dica,
  aberto,
  moldura = 'caixa',
  preguicoso,
  children,
}: {
  titulo: React.ReactNode;
  dica?: React.ReactNode;
  aberto?: boolean;
  moldura?: 'caixa' | 'painel' | 'linha';
  preguicoso?: boolean;
  children: React.ReactNode;
}) {
  const [aberta, setAberta] = React.useState(Boolean(aberto));
  const miolo = preguicoso && !aberta ? null : children;
  return (
    <details
      open={aberto}
      onToggle={(e) => setAberta(e.currentTarget.open)}
      className={cn(
        'group/rec min-w-0',
        moldura === 'caixa' && 'rounded-xl border border-rule-row',
        moldura === 'painel' && 'rounded-2xl border border-rule-table bg-card',
        moldura === 'linha' && 'border-b border-rule-row last:border-b-0',
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-0.5 [&::-webkit-details-marker]:hidden',
          moldura === 'caixa' ? 'px-3 py-2.5' : 'px-4 py-3',
        )}
      >
        <ChevronDown aria-hidden className="size-3.5 shrink-0 -rotate-90 text-ink-secondary transition-transform group-open/rec:rotate-0" />
        <span className="font-title text-[14px] font-bold text-ink">{titulo}</span>
        {dica ? <span className="text-[12px] text-ink-secondary">{dica}</span> : null}
      </summary>
      {moldura === 'caixa' ? (
        <div className="flex flex-col gap-3 border-t border-rule-row p-3">{miolo}</div>
      ) : moldura === 'painel' ? (
        <div className="border-t border-rule-row">{miolo}</div>
      ) : (
        miolo
      )}
    </details>
  );
}

/** Passo a passo (documentos e carga): cada passo com número, título e resumo; o atual em destaque. */
export function Passos({
  passos,
  atual,
  onEscolher,
}: {
  passos: { titulo: string; resumo?: React.ReactNode; liberado?: boolean }[];
  atual: number;
  onEscolher: (i: number) => void;
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {passos.map((p, i) => (
        <li key={p.titulo}>
          <button
            type="button"
            disabled={p.liberado === false}
            aria-current={i === atual ? 'step' : undefined}
            onClick={() => onEscolher(i)}
            className={cn(
              'flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors disabled:opacity-50',
              i === atual ? 'border-primary bg-accent' : 'border-rule-table bg-card hover:bg-accent',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-lg text-[12px] font-bold',
                i < atual ? 'bg-primary text-primary-foreground' : 'bg-paper-sunken text-ink-secondary',
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{p.titulo}</span>
              {p.resumo ? <span className="block truncate text-[12px] text-ink-secondary">{p.resumo}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// Barras e trilhos

const TOM_BARRA = { live: 'bg-primary', attention: 'bg-attention', alert: 'bg-destructive' } as const;

/** Quanto de um total já foi (dossiê, parcelas, prazo da certidão). Sem `tom`: verde completo, âmbar em curso. */
export function Progresso({ valor, total, rotulo, tom }: { valor: number; total: number; rotulo: string; tom?: keyof typeof TOM_BARRA }) {
  const p = total > 0 ? Math.max(0, Math.min(100, Math.round((valor / total) * 100))) : 0;
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full', TOM_BARRA[tom ?? (p >= 100 ? 'live' : 'attention')])} style={{ width: `${p}%` }} />
    </div>
  );
}

/**
 * Valor contra a meta: a barra é o valor, o traço escuro é a meta; numa faixa (mínimo e máximo), a moldura marca
 * o intervalo. Escala = o maior entre o valor e a meta, com folga, para a meta nunca ficar na borda.
 */
export function Medidor({
  valor,
  meta,
  escala,
  rotulo,
}: {
  valor: number | null;
  meta?: { min?: number | null; max?: number | null } | null;
  escala?: number;
  rotulo: string;
}) {
  const max = escala ?? Math.max(Number(valor) || 0, Number(meta?.max ?? meta?.min ?? 0)) * 1.25;
  const pos = (v: number | null | undefined) =>
    v === null || v === undefined || !(max > 0) ? null : Math.min(100, Math.max(0, (Number(v) / max) * 100));
  const temMin = meta?.min !== null && meta?.min !== undefined;
  const temMax = meta?.max !== null && meta?.max !== undefined;
  const faixa = temMin && temMax ? { de: pos(meta!.min)!, ate: pos(meta!.max)! } : null;
  const traco = faixa ? null : pos(temMax ? meta!.max : temMin ? meta!.min : null);
  return (
    <span role="img" aria-label={rotulo} className="relative block h-2.5 w-full rounded-full bg-muted">
      {faixa ? (
        <span className="absolute inset-y-[-3px] rounded-sm border border-ink-secondary" style={{ left: `${faixa.de}%`, width: `${faixa.ate - faixa.de}%` }} />
      ) : null}
      <span className="absolute inset-y-0 left-0 rounded-full bg-data-seq-3" style={{ width: `${pos(valor) ?? 0}%` }} />
      {traco !== null ? <span className="absolute inset-y-[-4px] w-0.5 rounded-full bg-ink" style={{ left: `calc(${traco}% - 1px)` }} /> : null}
    </span>
  );
}

/** Pontos de um critério contra o máximo: barra na rampa sequencial de dados. */
export function BarraPontos({ rotulo, valor, maximo }: { rotulo: string; valor: number; maximo: number }) {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (valor / maximo) * 100)) : 0;
  return (
    <div className="grid grid-cols-[minmax(90px,160px)_1fr_minmax(56px,auto)] items-center gap-2.5 text-[12px]">
      <span className="text-ink">{rotulo}</span>
      <span className="h-2.5 overflow-hidden rounded bg-muted" aria-hidden>
        <span className="block h-full bg-data-seq-3" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right font-semibold text-ink">
        {valor} de {maximo}
      </span>
    </div>
  );
}

/** A escala de rating com a faixa do rating em destaque. */
export function EscalaRating({ rating, faixas }: { rating: string; faixas: { rating: string; texto: string; peso: number }[] }) {
  return (
    <div className="grid gap-[3px] text-center text-[11px] font-semibold" style={{ gridTemplateColumns: faixas.map((f) => `${f.peso}fr`).join(' ') }}>
      {faixas.map((f) => (
        <span
          key={f.rating}
          className={cn('rounded-md py-1.5', f.rating === rating ? 'bg-accent text-accent-foreground ring-1 ring-primary ring-inset' : 'bg-muted text-ink-secondary')}
        >
          {f.rating} · {f.texto}
        </span>
      ))}
    </div>
  );
}

export type EstadoPassoTrilho = 'feito' | 'agora' | 'atraso' | '';
export interface PassoTrilho {
  rotulo: string;
  sub?: React.ReactNode;
  estado?: EstadoPassoTrilho;
  campo?: React.ReactNode;
}

const MARCA_TRILHO: Record<EstadoPassoTrilho, string> = {
  feito: 'border-primary bg-primary text-primary-foreground',
  agora: 'border-attention bg-card text-attention',
  atraso: 'border-destructive bg-card text-destructive',
  '': 'border-rule bg-card text-ink-secondary',
};

/**
 * Etapas numa linha da esquerda para a direita; abaixo de `md` vira lista. `compacto` = trilho de um item numa
 * lista; `campo` = o controle (data) sobre a etapa.
 */
export function Trilho({ passos, compacto }: { passos: PassoTrilho[]; compacto?: boolean }) {
  return (
    <ol className="grid min-w-0 gap-2.5 md:auto-cols-fr md:grid-flow-col md:gap-0">
      {passos.map((p, i) => {
        const estado = p.estado ?? '';
        return (
          <li
            key={p.rotulo}
            className="relative grid min-w-0 grid-cols-[24px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 md:grid-cols-1 md:justify-items-center md:px-1.5 md:text-center"
          >
            {i > 0 ? (
              <span
                aria-hidden
                className={cn('absolute right-1/2 -left-1/2 hidden h-0.5 md:block', compacto ? 'top-2' : 'top-[11px]', estado === 'feito' ? 'bg-primary' : 'bg-rule')}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                'relative z-10 grid place-items-center rounded-full border-2 font-bold',
                compacto ? 'size-[18px] text-[10px]' : 'size-6 text-[11px]',
                MARCA_TRILHO[estado],
              )}
            >
              {i + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-1 md:items-center">
              <span className={cn('font-semibold text-ink', compacto ? 'text-[11px]' : 'text-[12px]')}>{p.rotulo}</span>
              {p.campo}
              {p.sub ? (
                <span className={cn(compacto ? 'text-[11px]' : 'text-[12px]', estado === 'atraso' ? 'text-destructive' : 'text-ink-secondary')}>{p.sub}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Um item na lista em trilho: identificação, o trilho e a situação com a ação. */
export function LinhaNf({ esquerda, meio, direita }: { esquerda: React.ReactNode; meio: React.ReactNode; direita: React.ReactNode }) {
  return (
    <div className="grid items-center gap-x-5 gap-y-3 border-b border-rule-row px-4 py-3.5 last:border-b-0 lg:grid-cols-[minmax(180px,1fr)_minmax(0,2.4fr)_minmax(170px,1fr)]">
      <div className="min-w-0">{esquerda}</div>
      <div className="min-w-0">{meio}</div>
      <div className="flex min-w-0 flex-col items-start gap-1">{direita}</div>
    </div>
  );
}

// Faixa do dia (leituras do Winthor)

const TOM_PULSO = {
  ok: 'bg-primary',
  erro: 'bg-destructive',
  andamento: 'bg-attention',
  vazio: 'shadow-[inset_0_0_0_1px_var(--border)]',
} as const;

/** Faixa do dia: um traço por janela de leitura; clicar abre a leitura daquele traço. */
export function Pulsos({
  rotulo,
  pulsos,
  marcado,
  onEscolher,
}: {
  rotulo: string;
  pulsos: { chave: string; tom: keyof typeof TOM_PULSO; titulo: string; leituraId?: number }[];
  marcado?: number;
  onEscolher: (leituraId: number) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} className="grid h-10 grid-flow-col gap-px">
      {pulsos.map((p) =>
        p.leituraId ? (
          <button
            key={p.chave}
            type="button"
            title={p.titulo}
            aria-label={p.titulo}
            aria-pressed={marcado === p.leituraId}
            onClick={() => onEscolher(p.leituraId as number)}
            className={cn('rounded-sm transition-opacity hover:opacity-80', TOM_PULSO[p.tom], marcado === p.leituraId && 'ring-2 ring-ring ring-offset-1')}
          />
        ) : (
          <span key={p.chave} title={p.titulo} className={cn('rounded-sm', TOM_PULSO[p.tom])} />
        ),
      )}
    </div>
  );
}

/** Régua de horas embaixo dos pulsos e legendas espalhadas numa linha. */
export function Regua({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-between gap-x-3 text-[12px] text-ink-secondary">{children}</div>;
}

/** Legenda de estado da faixa do dia (quadradinho + texto). */
export function LegendaPulso({ tom, children }: { tom: keyof typeof TOM_PULSO; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-secondary">
      <span aria-hidden className={cn('size-2.5 rounded-sm', TOM_PULSO[tom])} />
      {children}
    </span>
  );
}

// Escolhas e marcas

/** Botões segmentados (Gráfico/Tabela, escolha de indicador): um só ligado. */
export function Segmentos<T extends string>({
  valor,
  opcoes,
  onChange,
  rotulo,
}: {
  valor: T;
  opcoes: { value: T; label: string }[];
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === valor}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[12px] font-semibold text-ink-secondary transition-colors hover:text-ink',
            'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
            o.value === valor && 'bg-card text-primary shadow-xs',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Linha de pílulas de filtro dentro da aba. */
export function Pilulas({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-2 border-b border-rule-row px-4 py-3">
      {children}
    </div>
  );
}

/** Pílula que liga e desliga (filtro dentro da aba, documento marcado). */
export function Pilula({ ativa, ...props }: React.ComponentProps<'button'> & { ativa: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-[12px] font-semibold transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        ativa ? 'border-brand-400 bg-accent text-accent-foreground' : 'border-rule-table bg-card text-ink hover:bg-accent',
      )}
      {...props}
    />
  );
}

/** Ponto da cor da categoria + nome (a cor identifica; o nome é quem informa). `cor` = nome do token (`data-3`). */
export function Categoria({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-ink-secondary">
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--${cor})` }} />
      {nome}
    </span>
  );
}

/** Link que abre em nova aba. */
export function LinkExterno({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Abre em nova aba"
      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      {children}
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
    </a>
  );
}

/** Valor de regra: próprio da carteira (destaque), herdado (esmaecido), padrão. */
export function ValorProprio({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-primary">{children}</span>;
}

export function ValorHerdado({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-secondary">{children}</span>;
}

export function ValorPadrao({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-ink">{children}</span>;
}

// Linhas especiais de tabela

/** Linha de total de uma tabela. */
export function TrTotal({ children }: { children: React.ReactNode }) {
  return <tr className="bg-paper-sunken font-semibold">{children}</tr>;
}

/** Linha de grupo dentro de uma tabela única ("Por carteira", um grupo do material). */
export function TrGrupo({ colunas, children }: { colunas: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colunas} className="border-b border-rule-row bg-paper-sunken px-4 py-2 text-[13px] font-semibold text-ink">
        {children}
      </td>
    </tr>
  );
}

// Gráficos do painel (complementos do §8.7)

/** O `ChartContainer` preenchendo o `PainelGrafico` (o `aspect-video` dele brigaria com a altura fixa, §12.1). */
export function Grafico({ config, children }: { config: ChartConfig; children: React.ComponentProps<typeof ChartContainer>['children'] }) {
  return (
    <ChartContainer config={config} className="h-full w-full">
      {children}
    </ChartContainer>
  );
}

/** Gráfico pequeno dentro de um cartão (seis meses de um plano). */
export function MiniGrafico({ config, children }: { config: ChartConfig; children: React.ComponentProps<typeof ChartContainer>['children'] }) {
  return (
    <div className="h-20 w-full min-w-0">
      <ChartContainer config={config} className="h-full w-full">
        {children}
      </ChartContainer>
    </div>
  );
}

/**
 * Par Gráfico/Tabela (§9.7): o mesmo painel vira tabela. A tabela não cabe na altura fixa do `PainelGrafico`,
 * então na visão de tabela o painel é um `Panel` comum.
 */
export function GraficoOuTabela({
  titulo,
  hint,
  largura = 'padrao',
  altura = 'padrao',
  grafico,
  tabela,
  topo,
  rodape,
  semGrafico,
  alturaLivre,
}: {
  titulo: string;
  hint?: React.ReactNode;
  largura?: 'padrao' | 'total';
  altura?: 'padrao' | 'alta';
  grafico: React.ReactNode;
  tabela: React.ReactNode;
  /** Conteúdo acima do desenho, nas duas visões (seletor de indicador, números). */
  topo?: React.ReactNode;
  rodape?: React.ReactNode;
  /** Dado insuficiente (§9.7): sem desenho, só a frase e a tabela. */
  semGrafico?: React.ReactNode;
  /** Desenho que não é recharts (mapa de calor): sem a altura fixa do PainelGrafico. */
  alturaLivre?: boolean;
}) {
  const [visao, setVisao] = React.useState<'grafico' | 'tabela'>('grafico');
  const alterna = (
    <Segmentos
      rotulo="Visão"
      valor={visao}
      onChange={setVisao}
      opcoes={[
        { value: 'grafico', label: 'Gráfico' },
        { value: 'tabela', label: 'Tabela' },
      ]}
    />
  );
  const total = largura === 'total' && 'lg:col-span-2';
  if (visao === 'tabela' || semGrafico) {
    return (
      <Panel className={cn('min-w-0', total)}>
        <PanelHeader title={titulo} hint={hint}>
          {semGrafico ? null : alterna}
        </PanelHeader>
        {topo || semGrafico ? (
          <CorpoPainel>
            {topo}
            {semGrafico ? <Nota>{semGrafico}</Nota> : null}
          </CorpoPainel>
        ) : null}
        {tabela}
        {rodape ? <CorpoPainel>{rodape}</CorpoPainel> : null}
      </Panel>
    );
  }
  if (alturaLivre) {
    return (
      <Panel className={cn('min-w-0', total)}>
        <PanelHeader title={titulo} hint={hint}>
          {alterna}
        </PanelHeader>
        <CorpoPainel>
          {topo}
          {grafico}
          {rodape}
        </CorpoPainel>
      </Panel>
    );
  }
  return (
    <PainelGrafico titulo={titulo} hint={hint} acoes={alterna} largura={largura} altura={altura} rodape={rodape}>
      {topo ? (
        <div className="flex h-full flex-col gap-3">
          <div className="shrink-0">{topo}</div>
          <div className="min-h-0 flex-1">{grafico}</div>
        </div>
      ) : (
        grafico
      )}
    </PainelGrafico>
  );
}

export interface SerieBarras {
  chave: string;
  rotulo: string;
  formato?: (v: number) => string;
}

/**
 * Barras horizontais por categoria com o par Gráfico/Tabela (§12). `categoria` = coluna do rótulo; `empilhar`
 * soma as séries numa barra só. Cor de série pela posição no contrato (`corDeSerie`), nunca pelo estado.
 */
export function BarrasPainel({
  titulo,
  hint,
  linhas,
  categoria,
  series,
  empilhar,
  largura,
  vazio,
}: {
  titulo: string;
  hint?: React.ReactNode;
  linhas: Record<string, unknown>[];
  categoria: string;
  series: SerieBarras[];
  empilhar?: boolean;
  largura?: 'padrao' | 'total';
  vazio: string;
}) {
  const config = Object.fromEntries(series.map((s, i) => [s.chave, { label: s.rotulo, color: corDeSerie(i) }])) satisfies ChartConfig;
  const dados = linhas.map((l) => ({
    ...l,
    [categoria]: String(l[categoria] ?? ''),
    ...Object.fromEntries(series.map((s) => [s.chave, Number(l[s.chave]) || 0])),
  }));
  const fmt = (s: SerieBarras, v: unknown) => (s.formato ? s.formato(Number(v) || 0) : (Number(v) || 0).toLocaleString('pt-BR'));
  if (!dados.length) {
    return (
      <Panel className={cn('min-w-0', largura === 'total' && 'lg:col-span-2')}>
        <PanelHeader title={titulo} hint={hint} />
        <EmptyState title={vazio} />
      </Panel>
    );
  }
  return (
    <GraficoOuTabela
      titulo={titulo}
      hint={hint}
      largura={largura}
      tabela={
        <Table>
          <thead>
            <tr>
              <Th>
                <span className="sr-only">Categoria</span>
              </Th>
              {series.map((s) => (
                <Th key={s.chave} numeric>
                  {s.rotulo}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((d, i) => (
              <Tr key={`${d[categoria]}:${i}`}>
                <Td>{String(d[categoria])}</Td>
                {series.map((s) => (
                  <Td key={s.chave} numeric>
                    {fmt(s, d[s.chave])}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </Table>
      }
      grafico={
        <Grafico config={config}>
          <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => fmt(series[0], v)} />
            <YAxis type="category" dataKey={categoria} tickLine={false} axisLine={false} width={120} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
            {series.map((s) => (
              <Bar key={s.chave} dataKey={s.chave} fill={`var(--color-${s.chave})`} stackId={empilhar ? 'a' : undefined} radius={empilhar ? 0 : 4} />
            ))}
          </BarChart>
        </Grafico>
      }
    />
  );
}

/** Legenda manual (gráfico desenhado à mão, ou estado com rótulo). `cor` = valor CSS (`var(--data-2)`). */
export function Legenda({ itens }: { itens: { rotulo: string; cor: string; tracejada?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
      {itens.map((i) => (
        <span key={i.rotulo} className="inline-flex items-center gap-1.5">
          {i.tracejada ? (
            <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: i.cor }} aria-hidden />
          ) : (
            <span className="inline-block size-2.5 rounded-sm" style={{ background: i.cor }} aria-hidden />
          )}
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}

/**
 * Mapa de calor recorte × faixa: célula pintada pela rampa sequencial (magnitude, §12.2), com o valor escrito.
 * A tinta de cada passo é o token `--on-data-seq-N`, que acompanha a rampa nos dois temas. Colunas extras sem cor.
 */
export function MapaDeCalor({
  colunas,
  extras,
  linhas,
  maximo,
}: {
  colunas: string[];
  extras: string[];
  linhas: ({ grupo: string } | { rotulo: string; celulas: { valor: number | null; texto: string; sub?: string }[]; extras: React.ReactNode[] })[];
  maximo: number;
}) {
  const passo = (v: number | null) => (v === null || maximo <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((v / maximo) * 4))));
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-[12px]">
        <thead>
          <tr>
            <th className="sr-only">Recorte</th>
            {[...colunas, ...extras].map((c) => (
              <th key={c} scope="col" className="px-2 py-1 text-center text-[11px] font-semibold whitespace-nowrap text-ink-secondary">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) =>
            'grupo' in l ? (
              <tr key={`g${i}`}>
                <td colSpan={colunas.length + extras.length + 1} className="px-1 pt-2 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                  {l.grupo}
                </td>
              </tr>
            ) : (
              <tr key={`${i}${l.rotulo}`}>
                <th scope="row" className="pr-2 text-left font-semibold whitespace-nowrap text-ink">
                  {l.rotulo}
                </th>
                {l.celulas.map((c, j) => {
                  const p = passo(c.valor);
                  return (
                    <td
                      key={colunas[j]}
                      className="h-10 min-w-16 rounded-md px-1 text-center font-semibold"
                      style={p ? { background: `var(--data-seq-${p})`, color: `var(--on-data-seq-${p})` } : { background: 'var(--muted)', color: 'var(--foreground)' }}
                    >
                      {c.texto}
                      {c.sub ? <span className="block text-[10.5px] font-normal opacity-80">{c.sub}</span> : null}
                    </td>
                  );
                })}
                {l.extras.map((x, j) => (
                  <td key={extras[j]} className="rounded-md bg-paper-sunken px-2 text-right font-semibold whitespace-nowrap text-ink">
                    {x}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

const ALTURA_ESQUELETO = { baixa: 260, media: 440, alta: 680 } as const;

/** Esqueleto de um bloco enquanto as SFs respondem, com a altura final (a página não pula quando o dado chega). */
export function Esqueleto({ altura = 'media' }: { altura?: keyof typeof ALTURA_ESQUELETO }) {
  return <div aria-busy="true" className="animate-pulse rounded-2xl border border-rule-table bg-card" style={{ height: ALTURA_ESQUELETO[altura] }} />;
}

/** O bloco só monta — e só busca os dados — quando entra na área visível; até lá, o esqueleto. */
export function BlocoPreguicoso({ altura = 'media', children }: { altura?: keyof typeof ALTURA_ESQUELETO; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  if (visivel) return <>{children}</>;
  return <div ref={ref} aria-busy="true" className="animate-pulse rounded-2xl border border-rule-table bg-card" style={{ height: ALTURA_ESQUELETO[altura] }} />;
}

// Documento na tela (folha A4)

/**
 * A folha do documento na tela: papel do tamanho do A4. `justificado` = texto corrido de notificação. As classes
 * `ha-*` são ganchos do `impressao.css` da 007 (não Tailwind): na impressão a cópia do portal ocupa a página.
 */
export function Folha({ children, justificado }: { children: React.ReactNode; justificado?: boolean }) {
  return (
    <article
      className={cn(
        'ha-folha mx-auto flex w-full max-w-[210mm] flex-col rounded-2xl border border-rule-table bg-card text-ink shadow-sm',
        justificado ? 'gap-3 px-5 py-8 text-justify text-[13px] leading-relaxed sm:px-8 sm:py-10' : 'gap-4 p-6 text-[12px] sm:p-10',
      )}
    >
      {children}
    </article>
  );
}

/** Título centrado em caixa alta (notificação). */
export function TituloDaFolha({ children }: { children: React.ReactNode }) {
  return <h2 className="text-center font-title text-[15px] font-bold tracking-wide text-ink uppercase">{children}</h2>;
}

/** Parágrafo da folha: mantém as quebras de linha do texto do modelo. */
export function ParagrafoDaFolha({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-line">{children}</p>;
}

/** Cabeçalho do documento: texto à esquerda, marca à direita, filete verde embaixo. */
export function CabecalhoDoDocumento({ marca, children }: { marca: React.ReactNode; children: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
      <div className="shrink-0">{marca}</div>
    </header>
  );
}

export function TituloDoDocumento({ children }: { children: React.ReactNode }) {
  return <h2 className="font-title text-[18px] font-bold text-ink">{children}</h2>;
}

export function SecaoDoDocumento({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="ha-titulo-secao border-b border-rule-row pb-1 font-title text-[13px] font-bold text-ink">{titulo}</h3>
      {children}
    </section>
  );
}

/** Registro no documento: data à esquerda, texto inteiro à direita; não quebra entre páginas. */
export function RegistroDoDocumento({ quando, children }: { quando: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ha-registro grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-rule-row py-2 last:border-b-0">
      <span className="text-ink-secondary">{quando}</span>
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
    </div>
  );
}

/** Cópia que só existe na impressão (classe de `impressao.css`, não Tailwind). */
export function CopiaDeImpressao({ children }: { children: React.ReactNode }) {
  return <div className="ha-copia-impressao">{children}</div>;
}

/** Rodapé da folha na tela (na impressão quem numera é o `@page`). */
export function RodapeDaFolha({ children }: { children: React.ReactNode }) {
  return <footer className="ha-so-tela flex flex-wrap justify-between gap-2 border-t border-rule-row pt-2 text-[11px] text-ink-secondary">{children}</footer>;
}
