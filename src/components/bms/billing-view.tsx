'use client'

/**
 * BillingView — facturação de subscrição das empresas cliente.
 * KPIs, filtros, tabela de facturas e diálogos (gerar mês, factura manual).
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  CircleAlert,
  CircleCheck,
  FileText,
  Loader2,
  MoreHorizontal,
  Percent,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  createInvoice,
  deleteInvoice,
  generateInvoices,
  listCompanies,
  listInvoices,
  updateInvoice,
} from '@/lib/bms-api'
import type {
  CompanyListItem,
  Invoice,
  InvoiceStatus,
  InvoicesResponse,
  PaymentMethod,
} from '@/lib/bms-api'
import { formatMZN, formatDate } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ConfirmDialog, EmptyState, PageHeader, StatCard, TableSkeleton } from './shared'

/* ------------------------------------------------------------------ */
/* Helpers locais                                                      */
/* ------------------------------------------------------------------ */

/** Cores por estado da factura — os rótulos vêm do núcleo i18n (statuses.*). */
const INVOICE_STATUS_META: Record<InvoiceStatus, string> = {
  OPEN: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PAID: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  OVERDUE: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  CANCELLED: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
}

/** Badge local de estado da factura (não reutiliza o StatusBadge de empresas). */
export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useI18n()
  const meta = INVOICE_STATUS_META[status] ?? INVOICE_STATUS_META.CANCELLED
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap px-2 py-0.5', meta)}>
      {t(`statuses.${status}`)}
    </Badge>
  )
}

const ALL_STATUSES: Array<InvoiceStatus | 'ALL'> = ['ALL', 'OPEN', 'PAID', 'OVERDUE', 'CANCELLED']

const PAYMENT_METHODS: PaymentMethod[] = ['MPESA', 'EMOLA', 'TRANSFER', 'CASH', 'CARD']

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthBounds(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number)
  const year = Number.isFinite(y) ? (y as number) : new Date().getFullYear()
  const month = Number.isFinite(m) && (m as number) >= 1 && (m as number) <= 12 ? (m as number) : new Date().getMonth() + 1
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start: toYMD(start), end: toYMD(end) }
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y ?? new Date().getFullYear(), (m ?? 1) - 1, (d ?? 1) + days)
  return toYMD(dt)
}

function BillingSkeleton() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <PageHeader title={t('billing.title')} description={t('billing.description')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-7 w-32 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-full rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Vista principal                                                     */
/* ------------------------------------------------------------------ */

export function BillingView() {
  const { t } = useI18n()
  const [data, setData] = useState<InvoicesResponse | null>(null)
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')

  // Diálogo: gerar facturas do mês
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateMonth, setGenerateMonth] = useState(currentMonth())
  const [generating, setGenerating] = useState(false)

  // Diálogo: nova factura manual
  const [createOpen, setCreateOpen] = useState(false)
  const [createCompanyId, setCreateCompanyId] = useState('')
  const [createAmount, setCreateAmount] = useState('')
  const [createStart, setCreateStart] = useState('')
  const [createEnd, setCreateEnd] = useState('')
  const [createDue, setCreateDue] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Acções sobre facturas
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('MPESA')
  const [paying, setPaying] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inv, comp] = await Promise.all([
        listInvoices({}),
        listCompanies({ pageSize: 100 }).catch(() => null),
      ])
      setData(inv)
      setCompanies(comp?.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('billing.errors.loadFallback'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const invoices = data?.items ?? []

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
      if (!q) return true
      const company = inv.company?.name ?? ''
      return inv.number.toLowerCase().includes(q) || company.toLowerCase().includes(q)
    })
  }, [invoices, searchInput, statusFilter])

  const summary = data?.summary ?? { OPEN: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 }
  const amounts = data?.amounts ?? { OPEN: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 }
  const collectible = summary.OPEN + summary.OVERDUE + summary.PAID
  const collectRate = collectible > 0 ? Math.round((summary.PAID / collectible) * 100) : 0
  const hasFilters = Boolean(searchInput.trim()) || statusFilter !== 'ALL'

  function resetFilters() {
    setSearchInput('')
    setStatusFilter('ALL')
  }

  function openCreate() {
    const bounds = monthBounds(currentMonth())
    setCreateCompanyId('')
    setCreateAmount('')
    setCreateStart(bounds.start)
    setCreateEnd(bounds.end)
    setCreateDue(addDays(bounds.end, 15))
    setCreateNotes('')
    setCreateOpen(true)
  }

  function handleCreateCompanyChange(companyId: string) {
    setCreateCompanyId(companyId)
    const company = companies.find((c) => c.id === companyId)
    if (company?.plan?.price) {
      setCreateAmount(String(company.plan.price))
    }
  }

  async function handleGenerate() {
    if (generating) return
    if (!/^\d{4}-\d{2}$/.test(generateMonth)) {
      toast.error(t('billing.toasts.invalidMonth'))
      return
    }
    setGenerating(true)
    try {
      const res = await generateInvoices(generateMonth)
      toast.success(t('billing.toasts.generated', { created: res.created, skipped: res.skipped }))
      setGenerateOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('billing.toasts.generateFail'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleCreate() {
    if (creating) return
    if (!createCompanyId) {
      toast.error(t('billing.toasts.chooseCompany'))
      return
    }
    const amount = Number(createAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('billing.toasts.invalidAmount'))
      return
    }
    if (!createStart || !createEnd || !createDue) {
      toast.error(t('billing.toasts.missingDates'))
      return
    }
    const company = companies.find((c) => c.id === createCompanyId)
    setCreating(true)
    try {
      const res = await createInvoice({
        companyId: createCompanyId,
        amount: Math.round(amount * 100) / 100,
        periodStart: createStart,
        periodEnd: createEnd,
        dueAt: createDue,
        planName: company?.plan?.name,
        notes: createNotes.trim() || undefined,
      })
      toast.success(t('billing.toasts.created', { number: res.invoice.number }))
      setCreateOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('billing.toasts.createFail'))
    } finally {
      setCreating(false)
    }
  }

  function openPay(invoice: Invoice) {
    setPayMethod('MPESA')
    setPayTarget(invoice)
  }

  async function handlePay() {
    if (!payTarget || paying) return
    setPaying(true)
    try {
      await updateInvoice(payTarget.id, { status: 'PAID', method: payMethod })
      toast.success(t('billing.toasts.markedPaid', { number: payTarget.number }))
      setPayTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('billing.toasts.payFail'))
    } finally {
      setPaying(false)
    }
  }

  async function handleReopen(invoice: Invoice) {
    if (rowBusyId) return
    setRowBusyId(invoice.id)
    try {
      await updateInvoice(invoice.id, { status: 'OPEN' })
      toast.success(t('billing.toasts.reopened', { number: invoice.number }))
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('billing.toasts.reopenFail'))
    } finally {
      setRowBusyId(null)
    }
  }

  async function handleCancel() {
    if (!cancelTarget || rowBusyId) return
    setRowBusyId(cancelTarget.id)
    try {
      await updateInvoice(cancelTarget.id, { status: 'CANCELLED' })
      toast.success(t('billing.toasts.cancelled', { number: cancelTarget.number }))
      setCancelTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('billing.toasts.cancelFail'))
    } finally {
      setRowBusyId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || rowBusyId) return
    setRowBusyId(deleteTarget.id)
    try {
      await deleteInvoice(deleteTarget.id)
      toast.success(t('billing.toasts.deleted', { number: deleteTarget.number }))
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('billing.toasts.deleteFail'))
    } finally {
      setRowBusyId(null)
    }
  }

  if (loading && !data) return <BillingSkeleton />

  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('billing.title')} description={t('billing.description')} />
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title={t('billing.errors.loadFail')}
              description={error}
              action={
                <Button onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('common.retry')}
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('billing.title')} description={t('billing.description')} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('billing.kpis.open')}
          value={summary.OPEN}
          hint={formatMZN(amounts.OPEN)}
          icon={FileText}
          tone="amber"
        />
        <StatCard
          title={t('billing.kpis.overdue')}
          value={summary.OVERDUE}
          hint={formatMZN(amounts.OVERDUE)}
          icon={CircleAlert}
          tone="rose"
        />
        <StatCard
          title={t('billing.kpis.collected')}
          value={formatMZN(amounts.PAID)}
          hint={t('billing.kpis.collectedHint', { n: summary.PAID })}
          icon={CircleCheck}
          tone="emerald"
        />
        <StatCard
          title={t('billing.kpis.collectRate')}
          value={`${collectRate}%`}
          hint={t('billing.kpis.collectRateHint', { paid: summary.PAID, total: collectible })}
          icon={Percent}
          tone="emerald"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-1.5">
            <Label htmlFor="billing-search" className="text-xs text-muted-foreground">
              {t('common.search')}
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="billing-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('billing.filters.searchPlaceholder')}
                className="h-11 pl-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="billing-status" className="text-xs text-muted-foreground">
              {t('billing.filters.status')}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'ALL')}
            >
              <SelectTrigger id="billing-status" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'ALL' ? t('billing.filters.allStatuses') : t(`statuses.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-11" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            {t('billing.actions.newInvoice')}
          </Button>
          <Button className="h-11" onClick={() => { setGenerateMonth(currentMonth()); setGenerateOpen(true) }}>
            <CalendarPlus className="size-4" aria-hidden />
            {t('billing.actions.generateMonth')}
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card className="py-0">
        <CardContent className="p-0 pb-4">
          {error && !loading ? (
            <EmptyState
              icon={CircleAlert}
              title={t('billing.errors.loadInvoices')}
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('common.retry')}
                </Button>
              }
            />
          ) : !loading && filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={hasFilters ? t('billing.empty.filteredTitle') : t('billing.empty.title')}
              description={
                hasFilters
                  ? t('billing.empty.filteredDescription')
                  : t('billing.empty.description')
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    {t('common.clearFilters')}
                  </Button>
                ) : (
                  <Button onClick={() => { setGenerateMonth(currentMonth()); setGenerateOpen(true) }}>
                    <CalendarPlus className="size-4" aria-hidden />
                    {t('billing.actions.generateMonth')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">{t('billing.table.number')}</TableHead>
                    <TableHead>{t('billing.table.company')}</TableHead>
                    <TableHead>{t('billing.table.plan')}</TableHead>
                    <TableHead>{t('billing.table.period')}</TableHead>
                    <TableHead className="text-right">{t('billing.table.amount')}</TableHead>
                    <TableHead>{t('billing.table.dueAt')}</TableHead>
                    <TableHead>{t('billing.table.status')}</TableHead>
                    <TableHead>{t('billing.table.payment')}</TableHead>
                    <TableHead className="pr-4 text-right">{t('billing.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                {loading ? (
                  <TableSkeleton rows={6} cols={9} />
                ) : (
                  <TableBody>
                    {filtered.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="pl-4 font-mono text-xs">{inv.number}</TableCell>
                        <TableCell className="max-w-48">
                          <span className="block truncate font-medium">{inv.company?.name ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="max-w-32 truncate px-2 py-0.5">
                            {inv.planName || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inv.periodStart)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatMZN(inv.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inv.dueAt)}</TableCell>
                        <TableCell>
                          <InvoiceBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.status === 'PAID' && inv.method ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {t(`billing.paymentMethods.${inv.method}`)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-9"
                                aria-label={t('billing.table.rowAria', { number: inv.number })}
                                disabled={rowBusyId === inv.id}
                              >
                                {rowBusyId === inv.id ? (
                                  <Loader2 className="size-4 animate-spin" aria-hidden />
                                ) : (
                                  <MoreHorizontal className="size-4" aria-hidden />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {(inv.status === 'OPEN' || inv.status === 'OVERDUE') && (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openPay(inv)}>
                                  <CircleCheck className="size-4" aria-hidden />
                                  {t('billing.actions.markAsPaid')}
                                </DropdownMenuItem>
                              )}
                              {(inv.status === 'PAID' || inv.status === 'CANCELLED') && (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleReopen(inv)}>
                                  <RefreshCw className="size-4" aria-hidden />
                                  {t('billing.actions.reopen')}
                                </DropdownMenuItem>
                              )}
                              {(inv.status === 'OPEN' || inv.status === 'OVERDUE') && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer"
                                  onClick={() => setCancelTarget(inv)}
                                >
                                  <CircleAlert className="size-4" aria-hidden />
                                  {t('common.cancel')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer"
                                onClick={() => setDeleteTarget(inv)}
                              >
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo: gerar facturas do mês */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('billing.generateDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('billing.generateDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="generate-month" className="text-xs text-muted-foreground">
              {t('billing.generateDialog.month')}
            </Label>
            <Input
              id="generate-month"
              type="month"
              value={generateMonth}
              onChange={(e) => setGenerateMonth(e.target.value)}
              className="h-11"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={generating} onClick={() => setGenerateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CalendarPlus className="size-4" aria-hidden />}
              {t('billing.actions.generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: nova factura manual */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('billing.createDialog.title')}</DialogTitle>
            <DialogDescription>{t('billing.createDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-company" className="text-xs text-muted-foreground">
                {t('billing.createDialog.company')}
              </Label>
              <Select value={createCompanyId} onValueChange={handleCreateCompanyChange}>
                <SelectTrigger id="create-company" className="h-11 w-full" aria-label={t('billing.createDialog.companyAria')}>
                  <SelectValue placeholder={t('billing.createDialog.companyPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {companies.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      {t('billing.createDialog.noCompanies')}
                    </SelectItem>
                  ) : (
                    companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.plan ? `${c.name} · ${c.plan.name}` : c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-amount" className="text-xs text-muted-foreground">
                {t('billing.createDialog.amount')}
              </Label>
              <Input
                id="create-amount"
                type="number"
                min="0"
                step="0.01"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                placeholder="0.00"
                className="h-11"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-start" className="text-xs text-muted-foreground">
                  {t('billing.createDialog.periodStart')}
                </Label>
                <Input
                  id="create-start"
                  type="date"
                  value={createStart}
                  onChange={(e) => setCreateStart(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-end" className="text-xs text-muted-foreground">
                  {t('billing.createDialog.periodEnd')}
                </Label>
                <Input
                  id="create-end"
                  type="date"
                  value={createEnd}
                  onChange={(e) => setCreateEnd(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-due" className="text-xs text-muted-foreground">
                  {t('billing.createDialog.dueAt')}
                </Label>
                <Input
                  id="create-due"
                  type="date"
                  value={createDue}
                  onChange={(e) => setCreateDue(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-notes" className="text-xs text-muted-foreground">
                {t('billing.createDialog.notes')}
              </Label>
              <Input
                id="create-notes"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder={t('billing.createDialog.notesPlaceholder')}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              {t('billing.actions.createInvoice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: marcar como paga */}
      <Dialog open={payTarget !== null} onOpenChange={(o) => { if (!o && !paying) setPayTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('billing.payDialog.title')}</DialogTitle>
            <DialogDescription>
              {payTarget
                ? `${payTarget.number} · ${payTarget.company?.name ?? '—'} · ${formatMZN(payTarget.amount)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pay-method" className="text-xs text-muted-foreground">
              {t('billing.payDialog.method')}
            </Label>
            <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
              <SelectTrigger id="pay-method" className="h-11 w-full" aria-label={t('billing.payDialog.method')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`billing.paymentMethods.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={paying} onClick={() => setPayTarget(null)}>
              {t('billing.actions.back')}
            </Button>
            <Button onClick={() => void handlePay()} disabled={paying}>
              {paying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
              {t('billing.actions.confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação: cancelar factura */}
      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => { if (!o && rowBusyId === null) setCancelTarget(null) }}
        title={t('billing.confirm.cancelTitle', { number: cancelTarget?.number ?? '' })}
        description={t('billing.confirm.cancelDescription')}
        confirmLabel={t('billing.confirm.cancelConfirm')}
        onConfirm={handleCancel}
      />

      {/* Confirmação: eliminar factura */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o && rowBusyId === null) setDeleteTarget(null) }}
        title={t('billing.confirm.deleteTitle', { number: deleteTarget?.number ?? '' })}
        description={t('billing.confirm.deleteDescription')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  )
}
