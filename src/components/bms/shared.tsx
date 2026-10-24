'use client'

/**
 * Componentes partilhados do Carsai BMS Admin.
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

import * as React from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  BarChart3,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  FolderTree,
  Globe,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Moon,
  Newspaper,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  ShoppingBag,
  Sun,
  TrendingUp,
  Truck,
  Users,
  UserCog,
  Wallet,
  Warehouse,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Tipos e helpers globais                                             */
/* ------------------------------------------------------------------ */

export type SectionId =
  | 'dashboard'
  | 'companies'
  | 'plans'
  | 'modules'
  | 'billing'
  | 'users'
  | 'audit'
  | 'instances'
  | 'settings'

export function roleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'ADMIN':
      return 'Administrador'
    case 'SUPPORT':
      return 'Suporte'
    default:
      return role
  }
}

export const COMPANY_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'CANCELLED'] as const

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  PENDING: 'Pendente',
  SUSPENDED: 'Suspensa',
  CANCELLED: 'Cancelada',
}

export const ENTITY_LABELS: Record<string, string> = {
  Company: 'Empresa',
  Plan: 'Plano',
  Module: 'Módulo',
  User: 'Utilizador',
  Setting: 'Configuração',
  Auth: 'Autenticação',
  CompanyModule: 'Módulo de empresa',
}

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType
}

export const AUDIT_ENTITY_TYPES = ['Company', 'Plan', 'Module', 'User', 'Setting', 'Auth', 'CompanyModule']

const CATEGORY_LABEL_MAP: Record<string, string> = {
  CORE: 'Núcleo',
  POS: 'Ponto de Venda',
  VENDAS: 'Vendas',
  'INVENTÁRIO': 'Inventário',
  CRM: 'CRM',
  RH: 'Recursos Humanos',
  SUPORTE: 'Suporte',
  'FINANÇAS': 'Finanças',
  'CONTEÚDO': 'Conteúdo',
  WEBSITE: 'Website',
  'INTEGRAÇÕES': 'Integrações',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL_MAP[category] ?? category
}

/** Máscara de chave: "CARSAI-LIC-AB3D-EF2G-H9IJ" → "CARSAI-••••-••••-H9IJ" */
export function maskKey(key?: string | null): string {
  if (!key) return '—'
  if (key.startsWith('CARSAI-')) {
    return `CARSAI-••••-••••-${key.slice(-4)}`
  }
  if (key.length > 12) {
    return `${key.slice(0, 8)}••••••••${key.slice(-4)}`
  }
  return key
}

/* ------------------------------------------------------------------ */
/* Logo / Spinner / Tema                                               */
/* ------------------------------------------------------------------ */

export function Logo({ size = 'md', dark = false }: { size?: 'sm' | 'md' | 'lg'; dark?: boolean }) {
  const box = size === 'lg' ? 'size-14 rounded-2xl' : size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl'
  const title = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'
  const mark = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-lg'
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 font-bold text-white shadow-lg shadow-emerald-600/25',
          box
        )}
        aria-hidden
      >
        <span className={mark}>C</span>
      </div>
      <div className="leading-tight">
        <p className={cn('font-semibold tracking-tight', title, dark ? 'text-white' : 'text-foreground')}>
          Carsai <span className={dark ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}>BMS</span>
        </p>
        <p className={cn('text-[10px] font-medium uppercase tracking-[0.2em]', dark ? 'text-zinc-500' : 'text-muted-foreground')}>
          CarsaiDev · Admin
        </p>
      </div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-emerald-600 dark:text-emerald-400', className)} aria-label="A carregar" />
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('size-11', className)}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema escuro'}
      title={isDark ? 'Activar tema claro' : 'Activar tema escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="relative flex size-5 items-center justify-center">
        <Sun className="size-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
        <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* Cabeçalho de página e cartões de estatística                        */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

const STAT_TONES: Record<'emerald' | 'amber' | 'rose' | 'zinc', string> = {
  emerald: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  zinc: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'emerald',
  loading = false,
}: {
  title: string
  value?: React.ReactNode
  hint?: string
  icon: LucideIcon
  tone?: 'emerald' | 'amber' | 'rose' | 'zinc'
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', STAT_TONES[tone])}>
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-28" />
          ) : (
            <p className="truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          )}
          {hint && !loading ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  ACTIVE: {
    label: 'Activa',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  PENDING: {
    label: 'Pendente',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  SUSPENDED: {
    label: 'Suspensa',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-400',
  },
  REVOKED: {
    label: 'Revogada',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  INACTIVE: {
    label: 'Inactiva',
    className: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-400',
  },
}

export function StatusBadge({
  status,
  labels,
}: {
  status: string
  labels?: Record<string, string>
}) {
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED
  const label = labels?.[status] ?? cfg.label
  return (
    <Badge variant="outline" className={cn('gap-1.5 px-2 py-0.5', cfg.className)}>
      <span className="relative flex size-1.5" aria-hidden>
        <span className={cn('absolute inline-flex size-full animate-pulse rounded-full opacity-60', cfg.dot)} />
        <span className={cn('relative inline-flex size-1.5 rounded-full', cfg.dot)} />
      </span>
      {label}
    </Badge>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const cfg =
    role === 'SUPER_ADMIN'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : role === 'SUPPORT'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300'
  return (
    <Badge variant="outline" className={cn('px-2 py-0.5', cfg)}>
      {roleLabel(role)}
    </Badge>
  )
}

const AUDIT_TONES = {
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  zinc: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
} as const

type AuditTone = keyof typeof AUDIT_TONES

const AUDIT_META: Record<string, { label: string; tone: AuditTone }> = {
  LOGIN: { label: 'Sessão iniciada', tone: 'zinc' },
  LOGIN_FAILED: { label: 'Login falhado', tone: 'rose' },
  COMPANY_CREATED: { label: 'Empresa criada', tone: 'emerald' },
  COMPANY_UPDATED: { label: 'Empresa actualizada', tone: 'amber' },
  COMPANY_DELETED: { label: 'Empresa eliminada', tone: 'rose' },
  COMPANY_SUSPENDED: { label: 'Empresa suspensa', tone: 'rose' },
  COMPANY_ACTIVATED: { label: 'Empresa activada', tone: 'emerald' },
  PLAN_CREATED: { label: 'Plano criado', tone: 'emerald' },
  PLAN_UPDATED: { label: 'Plano actualizado', tone: 'amber' },
  PLAN_DELETED: { label: 'Plano eliminado', tone: 'rose' },
  MODULE_CREATED: { label: 'Módulo criado', tone: 'emerald' },
  MODULE_UPDATED: { label: 'Módulo actualizado', tone: 'amber' },
  MODULE_ENABLED: { label: 'Módulo activado', tone: 'emerald' },
  MODULE_DISABLED: { label: 'Módulo desactivado', tone: 'rose' },
  KEY_REGENERATED: { label: 'Chave regenerada', tone: 'amber' },
  KEY_REVOKED: { label: 'Chave revogada', tone: 'rose' },
  USER_CREATED: { label: 'Utilizador criado', tone: 'emerald' },
  USER_UPDATED: { label: 'Utilizador actualizado', tone: 'amber' },
  USER_DELETED: { label: 'Utilizador eliminado', tone: 'rose' },
  SETTING_UPDATED: { label: 'Configuração alterada', tone: 'amber' },
}

export const AUDIT_ACTIONS = Object.keys(AUDIT_META)

export function auditActionLabel(action: string): string {
  return AUDIT_META[action]?.label ?? action
}

export function AuditBadge({ action }: { action: string }) {
  const meta = AUDIT_META[action] ?? { label: action, tone: 'zinc' as AuditTone }
  return <Badge variant="outline" className={cn('px-2 py-0.5 whitespace-nowrap', AUDIT_TONES[meta.tone])}>{meta.label}</Badge>
}

/* ------------------------------------------------------------------ */
/* Módulos — mapa de ícones                                            */
/* ------------------------------------------------------------------ */

export const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wrench,
  FolderTree,
  ClipboardList,
  TrendingUp,
  ShoppingBag,
  Truck,
  Warehouse,
  Users,
  UserCog,
  ShieldCheck,
  LifeBuoy,
  Wallet,
  BarChart3,
  Newspaper,
  Globe,
  KeyRound,
}

export const MODULE_ICON_NAMES = Object.keys(MODULE_ICON_MAP)

export function ModuleIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && MODULE_ICON_MAP[name]) || Package
  return <Icon className={cn('size-5', className)} aria-hidden />
}

/* ------------------------------------------------------------------ */
/* Estado vazio / esqueleto de tabela / paginação                      */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted" aria-hidden>
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-5 w-full min-w-16 max-w-[180px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  unit = 'itens',
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  unit?: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {from}–{to} de {total} {unit}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-10"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-10"
          aria-label="Página seguinte"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Copiar chave / campo de chaves                                      */
/* ------------------------------------------------------------------ */

export function CopyKeyButton({ value, label }: { value?: string | null; label?: string }) {
  const [copied, setCopied] = React.useState(false)
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  async function handleCopy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Chave copiada para a área de transferência')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Não foi possível copiar a chave')
    }
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      aria-label={label ?? 'Copiar chave'}
      title={label ?? 'Copiar'}
      onClick={() => void handleCopy()}
    >
      {copied ? <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

export function KeysField({
  label,
  value,
  status,
  onRegenerate,
  onToggleStatus,
}: {
  label: string
  value?: string | null
  status?: string
  onRegenerate?: () => Promise<void> | void
  onToggleStatus?: () => Promise<void> | void
}) {
  const [confirmAction, setConfirmAction] = React.useState<'regenerate' | 'toggle' | null>(null)
  const [busy, setBusy] = React.useState(false)
  const revoked = status === 'REVOKED'

  async function runConfirm() {
    if (!confirmAction) return
    setBusy(true)
    try {
      if (confirmAction === 'regenerate') {
        await onRegenerate?.()
      } else {
        await onToggleStatus?.()
      }
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {status ? <StatusBadge status={status} labels={{ ACTIVE: 'Activa', REVOKED: 'Revogada' }} /> : null}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2.5 py-1.5 font-mono text-[13px]">
          {maskKey(value)}
        </code>
        <CopyKeyButton value={value} label={`Copiar ${label.toLowerCase()}`} />
      </div>
      {(onRegenerate || onToggleStatus) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onRegenerate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              disabled={busy}
              onClick={() => setConfirmAction('regenerate')}
            >
              <RefreshCw className="size-3.5" />
              Regenerar
            </Button>
          ) : null}
          {onToggleStatus ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('h-10', revoked ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}
              disabled={busy}
              onClick={() => setConfirmAction('toggle')}
            >
              <Ban className="size-3.5" />
              {revoked ? 'Reactivar' : 'Revogar'}
            </Button>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(o) => {
          if (!busy) setConfirmAction(o ? confirmAction : null)
        }}
        title={confirmAction === 'toggle' ? (revoked ? 'Reactivar chave?' : 'Revogar chave?') : 'Regenerar chave?'}
        description={
          confirmAction === 'toggle'
            ? revoked
              ? 'A chave voltará a ser aceite pelo sistema imediatamente.'
              : 'A aplicação cliente deixará de conseguir autenticar-se com esta chave. Pode reactivá-la mais tarde.'
            : 'Será gerada uma nova chave e a chave actual deixará de funcionar imediatamente. A acção fica registada na auditoria.'
        }
        confirmLabel={confirmAction === 'toggle' ? (revoked ? 'Reactivar' : 'Revogar') : 'Regenerar'}
        onConfirm={runConfirm}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Diálogo de confirmação (acções destrutivas)                         */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}) {
  const [busy, setBusy] = React.useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40' : undefined}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault()
              void handleConfirm()
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ------------------------------------------------------------------ */
/* Tooltip utilitário                                                  */
/* ------------------------------------------------------------------ */

export function HintTooltip({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 text-xs">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
