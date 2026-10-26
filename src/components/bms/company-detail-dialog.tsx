'use client'

/**
 * CompanyDetailDialog — detalhe da empresa com abas:
 * Dados · Módulos · Chaves · Webhooks · Facturas · Instâncias · Actividade.
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Blocks,
  CircleAlert,
  CircleCheck,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Radar,
  RefreshCw,
  Webhook,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createWebhook,
  deleteWebhook,
  getCompany,
  regenerateKey,
  setKeyStatus,
  testWebhook,
  toggleCompanyModule,
  updateCompany,
  updateInvoice,
  updateWebhook,
  WEBHOOK_EVENT_LIST,
} from '@/lib/bms-api'
import type {
  Company,
  CompanyDetail,
  CompanyModuleState,
  CompanyStatus,
  Invoice,
  KeyStatus,
  KeyType,
  WebhookInfo,
} from '@/lib/bms-api'
import { formatDate, formatDateTime, formatMZN, formatRelative } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  AuditBadge,
  COMPANY_STATUSES,
  ConfirmDialog,
  CopyKeyButton,
  EmptyState,
  KeysField,
  maskKey,
  ModuleIcon,
  StatusBadge,
  useLabels,
} from './shared'
import { InvoiceBadge } from './billing-view'
import { InstanceStatusDot } from './instances-view'

/* ------------------------------------------------------------------ */
/* Helpers locais — webhooks                                           */
/* ------------------------------------------------------------------ */

function parseWebhookEvents(events: string): string[] {
  const trimmed = (events ?? '').trim()
  if (!trimmed || trimmed === '*') return []
  return trimmed.split(',').map((e) => e.trim()).filter(Boolean)
}

function LastStatusBadge({ status }: { status: number | null }) {
  const { t } = useI18n()
  if (status === null) {
    return (
      <Badge variant="outline" className="border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-400">
        {t('companyDetail.webhooks.noResponseBadge')}
      </Badge>
    )
  }
  const ok = status >= 200 && status < 300
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-2 py-0.5 tabular-nums',
        ok
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
      )}
    >
      {status}
    </Badge>
  )
}

export function CompanyDetailDialog({
  companyId,
  open,
  onOpenChange,
  onChanged,
  onEdit,
}: {
  companyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  onEdit: (company: Company) => void
}) {
  const { t } = useI18n()
  const L = useLabels()
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [modules, setModules] = useState<CompanyModuleState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)

  // Webhooks
  const [busyWebhookId, setBusyWebhookId] = useState<string | null>(null)
  const [webhookCreateOpen, setWebhookCreateOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEventsMode, setWebhookEventsMode] = useState<'ALL' | 'CUSTOM'>('ALL')
  const [webhookEventsCustom, setWebhookEventsCustom] = useState('')
  const [creatingWebhook, setCreatingWebhook] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookInfo | null>(null)
  const [editWebhookUrl, setEditWebhookUrl] = useState('')
  const [editWebhookEvents, setEditWebhookEvents] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [deletingWebhook, setDeletingWebhook] = useState<WebhookInfo | null>(null)

  // Facturas
  const [invoiceBusyId, setInvoiceBusyId] = useState<string | null>(null)

  /** Labels de eventos de webhook via i18n; fallback = identificador bruto. */
  function webhookEventLabel(event: string): string {
    const path = `companyDetail.events.${event}`
    const out = t(path)
    return out === path ? event : out
  }

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCompany(companyId)
      setDetail(data)
      setModules(data.modules)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('companyDetail.loadError'))
    } finally {
      setLoading(false)
    }
  }, [companyId, t])

  useEffect(() => {
    if (open) {
      void load()
    } else {
      setDetail(null)
      setModules([])
      setError(null)
    }
  }, [open, load])

  const company = detail?.company ?? null
  const auditEntries = detail?.audit ?? []
  const webhooks = detail?.webhooks ?? []
  const instances = detail?.instances ?? []
  const invoices = detail?.invoices ?? []

  const groupedModules = useMemo(() => {
    const map = new Map<string, CompanyModuleState[]>()
    for (const m of modules) {
      const arr = map.get(m.category) ?? []
      arr.push(m)
      map.set(m.category, arr)
    }
    return [...map.entries()]
  }, [modules])

  async function handleStatusChange(status: CompanyStatus) {
    if (!companyId || !company || changingStatus) return
    setChangingStatus(true)
    try {
      await updateCompany(companyId, { status })
      toast.success(t('companyDetail.statusChangedToast', { status: L.status(status) }))
      await load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.statusChangeError'))
    } finally {
      setChangingStatus(false)
    }
  }

  async function handleToggleModule(mod: CompanyModuleState, enabled: boolean) {
    if (!companyId || busyModuleId) return
    setBusyModuleId(mod.moduleId)
    // Actualização optimista
    setModules((prev) => prev.map((x) => (x.moduleId === mod.moduleId ? { ...x, isEnabled: enabled } : x)))
    try {
      const res = await toggleCompanyModule(companyId, mod.moduleId, enabled)
      setModules(res.modules)
      toast.success(enabled ? t('companyDetail.modules.enabledToast', { name: mod.name }) : t('companyDetail.modules.disabledToast', { name: mod.name }))
      onChanged()
    } catch (e) {
      setModules((prev) => prev.map((x) => (x.moduleId === mod.moduleId ? { ...x, isEnabled: !enabled } : x)))
      toast.error(e instanceof Error ? e.message : t('companyDetail.modules.updateError'))
    } finally {
      setBusyModuleId(null)
    }
  }

  function patchCompanyKeys(patch: Partial<Pick<Company, 'licenseKey' | 'apiKey' | 'licenseStatus' | 'apiKeyStatus'>>) {
    setDetail((prev) => (prev ? { ...prev, company: { ...prev.company, ...patch } } : prev))
  }

  async function handleRegenerate(type: KeyType) {
    if (!companyId) return
    try {
      const res = await regenerateKey(companyId, type)
      patchCompanyKeys(
        type === 'LICENSE'
          ? { licenseKey: res.licenseKey ?? undefined }
          : { apiKey: res.apiKey ?? undefined }
      )
      toast.success(type === 'LICENSE' ? t('companyDetail.keys.licenseRegenerated') : t('companyDetail.keys.apiRegenerated'))
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.keys.regenerateError'))
    }
  }

  async function handleKeyStatus(type: KeyType, status: KeyStatus) {
    if (!companyId) return
    try {
      await setKeyStatus(companyId, type, status)
      patchCompanyKeys(
        type === 'LICENSE' ? { licenseStatus: status } : { apiKeyStatus: status }
      )
      toast.success(status === 'REVOKED' ? t('companyDetail.keys.revoked') : t('companyDetail.keys.reactivated'))
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.keys.statusError'))
    }
  }

  /* -------- Webhooks -------- */

  function openWebhookCreate() {
    setWebhookUrl('')
    setWebhookEventsMode('ALL')
    setWebhookEventsCustom('')
    setWebhookCreateOpen(true)
  }

  async function handleCreateWebhook() {
    if (!companyId || creatingWebhook) return
    const url = webhookUrl.trim()
    if (!/^https:\/\/.+/.test(url)) {
      toast.error(t('companyDetail.webhooks.urlInvalid'))
      return
    }
    if (webhookEventsMode === 'CUSTOM' && !webhookEventsCustom.trim()) {
      toast.error(t('companyDetail.webhooks.eventsRequired'))
      return
    }
    setCreatingWebhook(true)
    try {
      const res = await createWebhook({
        companyId,
        url,
        events: webhookEventsMode === 'ALL' ? '*' : webhookEventsCustom.trim(),
      })
      setWebhookCreateOpen(false)
      toast.success(t('companyDetail.webhooks.createdToast'), {
        description: t('companyDetail.webhooks.createdToastDesc', { secret: res.webhook.secret }),
        duration: 20000,
      })
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.webhooks.createError'))
    } finally {
      setCreatingWebhook(false)
    }
  }

  function openWebhookEdit(wh: WebhookInfo) {
    setEditingWebhook(wh)
    setEditWebhookUrl(wh.url)
    setEditWebhookEvents(wh.events)
  }

  async function handleSaveWebhook() {
    if (!editingWebhook || savingWebhook) return
    const url = editWebhookUrl.trim()
    if (!/^https?:\/\/.+/.test(url)) {
      toast.error(t('companyDetail.webhooks.urlInvalidEdit'))
      return
    }
    if (!editWebhookEvents.trim()) {
      toast.error(t('companyDetail.webhooks.eventsRequiredEdit'))
      return
    }
    setSavingWebhook(true)
    try {
      await updateWebhook(editingWebhook.id, { url, events: editWebhookEvents.trim() })
      toast.success(t('companyDetail.webhooks.updatedToast'))
      setEditingWebhook(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.webhooks.saveError'))
    } finally {
      setSavingWebhook(false)
    }
  }

  async function handleToggleWebhook(wh: WebhookInfo, isActive: boolean) {
    if (busyWebhookId) return
    setBusyWebhookId(wh.id)
    // Actualização optimista
    setDetail((prev) =>
      prev ? { ...prev, webhooks: prev.webhooks.map((w) => (w.id === wh.id ? { ...w, isActive } : w)) } : prev
    )
    try {
      await updateWebhook(wh.id, { isActive })
      toast.success(isActive ? t('companyDetail.webhooks.enabledToast') : t('companyDetail.webhooks.disabledToast'))
    } catch (e) {
      setDetail((prev) =>
        prev ? { ...prev, webhooks: prev.webhooks.map((w) => (w.id === wh.id ? { ...w, isActive: !isActive } : w)) } : prev
      )
      toast.error(e instanceof Error ? e.message : t('companyDetail.webhooks.toggleError'))
    } finally {
      setBusyWebhookId(null)
    }
  }

  async function handleTestWebhook(wh: WebhookInfo) {
    if (busyWebhookId) return
    setBusyWebhookId(wh.id)
    try {
      const res = await testWebhook(wh.id)
      if (res.status !== null && res.status >= 200 && res.status < 300) {
        toast.success(t('companyDetail.webhooks.testSuccess', { code: res.status }))
      } else {
        toast.warning(t('companyDetail.webhooks.testFail'), {
          description:
            res.status === null
              ? t('companyDetail.webhooks.testNoResponse')
              : t('companyDetail.webhooks.testResponseCode', { code: res.status }),
        })
      }
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.webhooks.testError'))
    } finally {
      setBusyWebhookId(null)
    }
  }

  async function handleDeleteWebhook() {
    if (!deletingWebhook || busyWebhookId) return
    setBusyWebhookId(deletingWebhook.id)
    try {
      await deleteWebhook(deletingWebhook.id)
      toast.success(t('companyDetail.webhooks.deletedToast'))
      setDeletingWebhook(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.webhooks.deleteError'))
    } finally {
      setBusyWebhookId(null)
    }
  }

  /* -------- Facturas -------- */

  async function handleMarkInvoicePaid(inv: Invoice) {
    if (!companyId || invoiceBusyId) return
    setInvoiceBusyId(inv.id)
    try {
      await updateInvoice(inv.id, { status: 'PAID', method: 'MPESA' })
      toast.success(t('companyDetail.invoices.markPaidToast', { number: inv.number }))
      await load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('companyDetail.invoices.markPaidError'))
    } finally {
      setInvoiceBusyId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        {loading ? (
          <div className="space-y-4 py-2">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('companyDetail.loadingTitle')}</DialogTitle>
              <DialogDescription>{t('companyDetail.loadingDesc')}</DialogDescription>
            </DialogHeader>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ) : error || !company ? (
          <div>
            <DialogHeader>
              <DialogTitle>{t('companyDetail.title')}</DialogTitle>
              <DialogDescription>{t('companyDetail.loadFailDesc')}</DialogDescription>
            </DialogHeader>
            <EmptyState
              icon={CircleAlert}
              title={t('companyDetail.loadErrorTitle')}
              description={error ?? t('companyDetail.tryAgainLater')}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('common.retry')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                <span className="truncate">{company.name}</span>
                <StatusBadge status={company.status} />
              </DialogTitle>
              <DialogDescription className="truncate">{company.email}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="dados" className="gap-4">
              <TabsList className="flex h-11 w-full items-center justify-start gap-1 overflow-x-auto scrollbar-thin">
                <TabsTrigger value="dados" className="shrink-0 px-3">{t('companyDetail.tabs.data')}</TabsTrigger>
                <TabsTrigger value="modulos" className="shrink-0 px-3">{t('companyDetail.tabs.modules')}</TabsTrigger>
                <TabsTrigger value="chaves" className="shrink-0 px-3">{t('companyDetail.tabs.keys')}</TabsTrigger>
                <TabsTrigger value="webhooks" className="shrink-0 px-3">{t('companyDetail.tabs.webhooks')}</TabsTrigger>
                <TabsTrigger value="facturas" className="shrink-0 px-3">{t('companyDetail.tabs.invoices')}</TabsTrigger>
                <TabsTrigger value="instancias" className="shrink-0 px-3">{t('companyDetail.tabs.instances')}</TabsTrigger>
                <TabsTrigger value="actividade" className="shrink-0 px-3">{t('companyDetail.tabs.activity')}</TabsTrigger>
              </TabsList>

              {/* -------- Dados -------- */}
              <TabsContent value="dados" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={company.status}
                      onValueChange={(v) => void handleStatusChange(v as CompanyStatus)}
                      disabled={changingStatus}
                    >
                      <SelectTrigger className="h-10 w-44" aria-label={t('companyDetail.changeStatusAria')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {L.status(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {changingStatus ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
                  </div>
                  <Button variant="outline" className="h-10" onClick={() => onEdit(company)}>
                    <Pencil className="size-4" aria-hidden />
                    {t('companyDetail.editData')}
                  </Button>
                </div>

                <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-2">
                  <DataItem label={t('companyDetail.fields.phone')} value={company.phone ?? '—'} />
                  <DataItem label={t('companyDetail.fields.nuit')} value={company.nuit ?? '—'} />
                  <DataItem label={t('companyDetail.fields.address')} value={company.address ?? '—'} />
                  <DataItem label={t('companyDetail.fields.cityProvince')} value={[company.city, company.province].filter(Boolean).join(', ') || '—'} />
                  <DataItem
                    label={t('companyDetail.fields.plan')}
                    value={
                      company.plan
                        ? t('companyDetail.fields.planValue', {
                            name: company.plan.name,
                            price: formatMZN(company.plan.price),
                            interval:
                              company.plan.interval === 'YEARLY'
                                ? t('companyDetail.fields.perYear')
                                : t('companyDetail.fields.perMonth'),
                          })
                        : t('companyDetail.fields.noPlan')
                    }
                  />
                  <DataItem label={t('companyDetail.fields.maxUsers')} value={String(company.maxUsers)} />
                  <DataItem
                    label={t('companyDetail.fields.licenseKey')}
                    value={<StatusBadge status={company.licenseStatus} labels={{ ACTIVE: L.status('ACTIVE'), REVOKED: L.status('REVOKED') }} />}
                  />
                  <DataItem
                    label={t('companyDetail.fields.apiKey')}
                    value={<StatusBadge status={company.apiKeyStatus} labels={{ ACTIVE: L.status('ACTIVE'), REVOKED: L.status('REVOKED') }} />}
                  />
                  <DataItem label={t('companyDetail.fields.createdAt')} value={formatDateTime(company.createdAt)} />
                  <DataItem label={t('companyDetail.fields.expiresAt')} value={company.expiresAt ? formatDate(company.expiresAt) : '—'} />
                  <DataItem label={t('companyDetail.fields.notes')} value={company.notes ?? '—'} wide />
                </dl>
              </TabsContent>

              {/* -------- Módulos -------- */}
              <TabsContent value="modulos">
                {groupedModules.length === 0 ? (
                  <EmptyState
                    icon={Blocks}
                    title={t('companyDetail.modules.emptyTitle')}
                    description={t('companyDetail.modules.emptyDesc')}
                  />
                ) : (
                  <div className="space-y-5">
                    {groupedModules.map(([category, mods]) => {
                      const enabledCount = mods.filter((m) => m.isEnabled).length
                      return (
                        <div key={category}>
                          <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>{L.category(category)}</span>
                            <span className="tabular-nums">
                              {t('companyDetail.modules.activeCount', { enabled: enabledCount, total: mods.length })}
                            </span>
                          </p>
                          <div className="divide-y rounded-lg border">
                            {mods.map((m) => (
                              <div key={m.moduleId} className="flex items-center gap-3 px-4 py-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                                  <ModuleIcon name={m.icon} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {m.name}
                                    {m.isCore ? (
                                      <span className="ml-2 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 align-middle text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                        {t('companyDetail.modules.coreBadge')}
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">{m.description ?? m.key}</p>
                                </div>
                                <Switch
                                  checked={m.isEnabled}
                                  disabled={busyModuleId === m.moduleId || (m.isCore && m.isEnabled)}
                                  onCheckedChange={(v) => void handleToggleModule(m, v)}
                                  aria-label={
                                    m.isEnabled
                                      ? t('companyDetail.modules.disableAria', { name: m.name })
                                      : t('companyDetail.modules.enableAria', { name: m.name })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    <p className="text-xs text-muted-foreground">
                      {t('companyDetail.modules.coreHint')}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* -------- Chaves -------- */}
              <TabsContent value="chaves" className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {t('companyDetail.keys.hint')}
                </p>
                <KeysField
                  label={t('companyDetail.fields.licenseKey')}
                  value={company.licenseKey}
                  status={company.licenseStatus}
                  onRegenerate={() => handleRegenerate('LICENSE')}
                  onToggleStatus={() => handleKeyStatus('LICENSE', company.licenseStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE')}
                />
                <KeysField
                  label={t('companyDetail.fields.apiKey')}
                  value={company.apiKey}
                  status={company.apiKeyStatus}
                  onRegenerate={() => handleRegenerate('API')}
                  onToggleStatus={() => handleKeyStatus('API', company.apiKeyStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE')}
                />
              </TabsContent>

              {/* -------- Webhooks -------- */}
              <TabsContent value="webhooks" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t('companyDetail.webhooks.hint')}
                  </p>
                  <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={openWebhookCreate}>
                    <Plus className="size-4" aria-hidden />
                    {t('companyDetail.webhooks.add')}
                  </Button>
                </div>

                {webhooks.length === 0 ? (
                  <EmptyState
                    icon={Webhook}
                    title={t('companyDetail.webhooks.emptyTitle')}
                    description={t('companyDetail.webhooks.emptyDesc')}
                  />
                ) : (
                  <div className="divide-y rounded-lg border">
                    {webhooks.map((wh) => {
                      const events = parseWebhookEvents(wh.events)
                      return (
                        <div key={wh.id} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                              <Webhook className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium" title={wh.url}>
                                {wh.url}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {events.length === 0 ? (
                                  <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                                    {t('common.all')}
                                  </Badge>
                                ) : (
                                  events.map((ev) => (
                                    <Badge key={ev} variant="outline" className="px-1.5 py-0.5 text-[10px]">
                                      {webhookEventLabel(ev)}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={wh.isActive}
                              disabled={busyWebhookId === wh.id}
                              onCheckedChange={(v) => void handleToggleWebhook(wh, v)}
                              aria-label={
                                wh.isActive
                                  ? t('companyDetail.webhooks.disableAria', { url: wh.url })
                                  : t('companyDetail.webhooks.enableAria', { url: wh.url })
                              }
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-9 shrink-0"
                                  aria-label={t('companyDetail.webhooks.actionsAria', { url: wh.url })}
                                  disabled={busyWebhookId === wh.id}
                                >
                                  {busyWebhookId === wh.id ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden />
                                  ) : (
                                    <MoreHorizontal className="size-4" aria-hidden />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => void handleTestWebhook(wh)}>
                                  <CircleCheck className="size-4" aria-hidden />
                                  {t('companyDetail.webhooks.test')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openWebhookEdit(wh)}>
                                  <Pencil className="size-4" aria-hidden />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer"
                                  onClick={() => setDeletingWebhook(wh)}
                                >
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <LastStatusBadge status={wh.lastStatus} />
                              {wh.lastFiredAt ? formatRelative(wh.lastFiredAt) : t('companyDetail.webhooks.neverFired')}
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">
                                {maskKey(wh.secret)}
                              </code>
                              <CopyKeyButton value={wh.secret} label={t('companyDetail.webhooks.copySecret')} />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* -------- Facturas -------- */}
              <TabsContent value="facturas">
                {invoices.length === 0 ? (
                  <EmptyState
                    icon={CircleAlert}
                    title={t('companyDetail.invoices.emptyTitle')}
                    description={t('companyDetail.invoices.emptyDesc')}
                  />
                ) : (
                  <div className="max-h-80 overflow-y-auto rounded-lg border scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-3">{t('companyDetail.invoices.colNumber')}</TableHead>
                          <TableHead>{t('companyDetail.invoices.colPlan')}</TableHead>
                          <TableHead className="text-right">{t('companyDetail.invoices.colAmount')}</TableHead>
                          <TableHead>{t('companyDetail.invoices.colDue')}</TableHead>
                          <TableHead>{t('companyDetail.invoices.colStatus')}</TableHead>
                          <TableHead className="pr-3 text-right">{t('companyDetail.invoices.colAction')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="pl-3 font-mono text-xs">{inv.number}</TableCell>
                            <TableCell className="max-w-32">
                              <span className="block truncate text-sm">{inv.planName || '—'}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">{formatMZN(inv.amount)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(inv.dueAt)}</TableCell>
                            <TableCell>
                              <InvoiceBadge status={inv.status} />
                            </TableCell>
                            <TableCell className="pr-3 text-right">
                              {inv.status === 'OPEN' || inv.status === 'OVERDUE' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  disabled={invoiceBusyId === inv.id}
                                  onClick={() => void handleMarkInvoicePaid(inv)}
                                >
                                  {invoiceBusyId === inv.id ? (
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <CircleCheck className="size-3.5" aria-hidden />
                                  )}
                                  {t('companyDetail.invoices.markPaid')}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* -------- Instâncias -------- */}
              <TabsContent value="instancias">
                {instances.length === 0 ? (
                  <EmptyState
                    icon={Radar}
                    title={t('companyDetail.instances.emptyTitle')}
                    description={t('companyDetail.instances.emptyDesc')}
                  />
                ) : (
                  <div className="divide-y rounded-lg border">
                    {instances.map((inst) => (
                      <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                        <InstanceStatusDot lastSeenAt={inst.lastSeenAt} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs">{inst.instanceId}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>{t('companyDetail.instances.version', { version: inst.appVersion ?? '—' })}</span>
                            {inst.dbEngine ? (
                              <Badge variant="outline" className="px-1.5 py-0.5 font-mono text-[10px] uppercase">
                                {inst.dbEngine}
                              </Badge>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t('companyDetail.instances.lastConnection', { time: formatRelative(inst.lastSeenAt) })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* -------- Actividade -------- */}
              <TabsContent value="actividade">
                {auditEntries.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title={t('companyDetail.activity.emptyTitle')}
                    description={t('companyDetail.activity.emptyDesc')}
                  />
                ) : (
                  <div className="max-h-96 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                    {auditEntries.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                        <AuditBadge action={a.action} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.entityName ?? a.entityType}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.details ?? '—'}</p>
                        </div>
                        <span
                          className="shrink-0 text-[11px] text-muted-foreground"
                          title={formatDateTime(a.createdAt)}
                        >
                          {formatRelative(a.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>

      {/* Diálogo: criar webhook */}
      <Dialog open={webhookCreateOpen} onOpenChange={setWebhookCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('companyDetail.webhooks.dialog.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('companyDetail.webhooks.dialog.createDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url" className="text-xs text-muted-foreground">
                {t('companyDetail.webhooks.dialog.urlLabel')}
              </Label>
              <Input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://exemplo.co.mz/webhooks/carsai"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-events" className="text-xs text-muted-foreground">
                {t('companyDetail.webhooks.dialog.eventsLabel')}
              </Label>
              <Select value={webhookEventsMode} onValueChange={(v) => setWebhookEventsMode(v as 'ALL' | 'CUSTOM')}>
                <SelectTrigger id="webhook-events" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('companyDetail.webhooks.dialog.allEvents')}</SelectItem>
                  <SelectItem value="CUSTOM">{t('companyDetail.webhooks.dialog.customOption')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {webhookEventsMode === 'CUSTOM' ? (
              <div className="space-y-1.5">
                <Label htmlFor="webhook-events-custom" className="text-xs text-muted-foreground">
                  {t('companyDetail.webhooks.dialog.customEventsLabel')}
                </Label>
                <Input
                  id="webhook-events-custom"
                  value={webhookEventsCustom}
                  onChange={(e) => setWebhookEventsCustom(e.target.value)}
                  placeholder="Ex.: INVOICE_PAID,INVOICE_OVERDUE"
                  className="h-11 font-mono text-xs"
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t('companyDetail.webhooks.dialog.available', { events: WEBHOOK_EVENT_LIST.join(', ') })}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={creatingWebhook} onClick={() => setWebhookCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreateWebhook()} disabled={creatingWebhook}>
              {creatingWebhook ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              {t('companyDetail.webhooks.dialog.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: editar webhook */}
      <Dialog open={editingWebhook !== null} onOpenChange={(o) => { if (!o && !savingWebhook) setEditingWebhook(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('companyDetail.webhooks.dialog.editTitle')}</DialogTitle>
            <DialogDescription className="truncate">
              {editingWebhook?.url}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-webhook-url" className="text-xs text-muted-foreground">
                {t('companyDetail.webhooks.dialog.urlLabel')}
              </Label>
              <Input
                id="edit-webhook-url"
                type="url"
                value={editWebhookUrl}
                onChange={(e) => setEditWebhookUrl(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-webhook-events" className="text-xs text-muted-foreground">
                {t('companyDetail.webhooks.dialog.eventsEditLabel')}
              </Label>
              <Input
                id="edit-webhook-events"
                value={editWebhookEvents}
                onChange={(e) => setEditWebhookEvents(e.target.value)}
                className="h-11 font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingWebhook} onClick={() => setEditingWebhook(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSaveWebhook()} disabled={savingWebhook}>
              {savingWebhook ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
              {t('companyDetail.webhooks.dialog.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação: eliminar webhook */}
      <ConfirmDialog
        open={deletingWebhook !== null}
        onOpenChange={(o) => { if (!o && busyWebhookId === null) setDeletingWebhook(null) }}
        title={t('companyDetail.webhooks.deleteTitle')}
        description={t('companyDetail.webhooks.deleteDesc', { url: deletingWebhook?.url ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteWebhook}
      />
    </Dialog>
  )
}

function DataItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
    </div>
  )
}
