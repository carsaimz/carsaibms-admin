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
import { cn } from '@/lib/utils'
import {
  AuditBadge,
  COMPANY_STATUSES,
  COMPANY_STATUS_LABELS,
  categoryLabel,
  ConfirmDialog,
  CopyKeyButton,
  EmptyState,
  KeysField,
  maskKey,
  ModuleIcon,
  StatusBadge,
} from './shared'
import { InvoiceBadge } from './billing-view'
import { InstanceStatusDot } from './instances-view'

/* ------------------------------------------------------------------ */
/* Helpers locais — webhooks                                           */
/* ------------------------------------------------------------------ */

const WEBHOOK_EVENT_LABELS: Record<string, string> = {
  COMPANY_CREATED: 'Empresa criada',
  COMPANY_ACTIVATED: 'Empresa activada',
  COMPANY_SUSPENDED: 'Empresa suspensa',
  LICENSE_ACTIVATED: 'Licença activada',
  LICENSE_REVOKED: 'Licença revogada',
  INVOICE_GENERATED: 'Factura emitida',
  INVOICE_PAID: 'Factura paga',
  INVOICE_OVERDUE: 'Factura em atraso',
  TEST: 'Teste',
}

function webhookEventLabel(event: string): string {
  return WEBHOOK_EVENT_LABELS[event] ?? event
}

function parseWebhookEvents(events: string): string[] {
  const trimmed = (events ?? '').trim()
  if (!trimmed || trimmed === '*') return []
  return trimmed.split(',').map((e) => e.trim()).filter(Boolean)
}

function LastStatusBadge({ status }: { status: number | null }) {
  if (status === null) {
    return (
      <Badge variant="outline" className="border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-400">
        Sem resposta
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

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCompany(companyId)
      setDetail(data)
      setModules(data.modules)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar a empresa.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

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
      toast.success(`Estado alterado para "${COMPANY_STATUS_LABELS[status]}".`)
      await load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao actualizar o estado.')
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
      toast.success(enabled ? `Módulo "${mod.name}" activado.` : `Módulo "${mod.name}" desactivado.`)
      onChanged()
    } catch (e) {
      setModules((prev) => prev.map((x) => (x.moduleId === mod.moduleId ? { ...x, isEnabled: !enabled } : x)))
      toast.error(e instanceof Error ? e.message : 'Erro ao actualizar o módulo.')
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
      toast.success(type === 'LICENSE' ? 'Chave de licença regenerada.' : 'Chave de API regenerada.')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao regenerar a chave.')
    }
  }

  async function handleKeyStatus(type: KeyType, status: KeyStatus) {
    if (!companyId) return
    try {
      await setKeyStatus(companyId, type, status)
      patchCompanyKeys(
        type === 'LICENSE' ? { licenseStatus: status } : { apiKeyStatus: status }
      )
      toast.success(status === 'REVOKED' ? 'Chave revogada.' : 'Chave reactivada.')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar o estado da chave.')
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
      toast.error('Indique um URL válido começado por https://')
      return
    }
    if (webhookEventsMode === 'CUSTOM' && !webhookEventsCustom.trim()) {
      toast.error('Lista os eventos separados por vírgula ou escolhe "Todos os eventos".')
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
      toast.success('Webhook criado com sucesso.', {
        description: `Segredo: ${res.webhook.secret} — copia agora, só é mostrado nesta mensagem.`,
        duration: 20000,
      })
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar o webhook.')
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
      toast.error('Indica um URL válido começado por https://')
      return
    }
    if (!editWebhookEvents.trim()) {
      toast.error('Indica os eventos (ou "*").')
      return
    }
    setSavingWebhook(true)
    try {
      await updateWebhook(editingWebhook.id, { url, events: editWebhookEvents.trim() })
      toast.success('Webhook actualizado.')
      setEditingWebhook(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao actualizar o webhook.')
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
      toast.success(isActive ? 'Webhook activado.' : 'Webhook desactivado.')
    } catch (e) {
      setDetail((prev) =>
        prev ? { ...prev, webhooks: prev.webhooks.map((w) => (w.id === wh.id ? { ...w, isActive: !isActive } : w)) } : prev
      )
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar o webhook.')
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
        toast.success(`Teste enviado — o webhook respondeu ${res.status}.`)
      } else {
        toast.warning('O webhook não respondeu com sucesso.', {
          description: res.status === null ? 'Sem resposta do servidor de destino.' : `Código de resposta: ${res.status}`,
        })
      }
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao testar o webhook.')
    } finally {
      setBusyWebhookId(null)
    }
  }

  async function handleDeleteWebhook() {
    if (!deletingWebhook || busyWebhookId) return
    setBusyWebhookId(deletingWebhook.id)
    try {
      await deleteWebhook(deletingWebhook.id)
      toast.success('Webhook eliminado.')
      setDeletingWebhook(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao eliminar o webhook.')
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
      toast.success(`Factura ${inv.number} marcada como paga (M-Pesa).`)
      await load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar a factura como paga.')
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
              <DialogTitle>A carregar detalhes da empresa</DialogTitle>
              <DialogDescription>Por favor aguarde.</DialogDescription>
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
              <DialogTitle>Detalhe da empresa</DialogTitle>
              <DialogDescription>Não foi possível carregar os dados.</DialogDescription>
            </DialogHeader>
            <EmptyState
              icon={CircleAlert}
              title="Erro ao carregar a empresa"
              description={error ?? 'Tente novamente em instantes.'}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Tentar novamente
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
                <TabsTrigger value="dados" className="shrink-0 px-3">Dados</TabsTrigger>
                <TabsTrigger value="modulos" className="shrink-0 px-3">Módulos</TabsTrigger>
                <TabsTrigger value="chaves" className="shrink-0 px-3">Chaves</TabsTrigger>
                <TabsTrigger value="webhooks" className="shrink-0 px-3">Webhooks</TabsTrigger>
                <TabsTrigger value="facturas" className="shrink-0 px-3">Facturas</TabsTrigger>
                <TabsTrigger value="instancias" className="shrink-0 px-3">Instâncias</TabsTrigger>
                <TabsTrigger value="actividade" className="shrink-0 px-3">Actividade</TabsTrigger>
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
                      <SelectTrigger className="h-10 w-44" aria-label="Alterar estado da empresa">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {COMPANY_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {changingStatus ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
                  </div>
                  <Button variant="outline" className="h-10" onClick={() => onEdit(company)}>
                    <Pencil className="size-4" aria-hidden />
                    Editar dados
                  </Button>
                </div>

                <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-2">
                  <DataItem label="Telefone" value={company.phone ?? '—'} />
                  <DataItem label="NUIT" value={company.nuit ?? '—'} />
                  <DataItem label="Endereço" value={company.address ?? '—'} />
                  <DataItem label="Cidade / Província" value={[company.city, company.province].filter(Boolean).join(', ') || '—'} />
                  <DataItem
                    label="Plano"
                    value={
                      company.plan
                        ? `${company.plan.name} · ${formatMZN(company.plan.price)} / ${company.plan.interval === 'YEARLY' ? 'ano' : 'mês'}`
                        : 'Sem plano'
                    }
                  />
                  <DataItem label="Máx. utilizadores" value={String(company.maxUsers)} />
                  <DataItem
                    label="Chave de licença"
                    value={<StatusBadge status={company.licenseStatus} labels={{ ACTIVE: 'Activa', REVOKED: 'Revogada' }} />}
                  />
                  <DataItem
                    label="Chave de API"
                    value={<StatusBadge status={company.apiKeyStatus} labels={{ ACTIVE: 'Activa', REVOKED: 'Revogada' }} />}
                  />
                  <DataItem label="Criada em" value={formatDateTime(company.createdAt)} />
                  <DataItem label="Expira em" value={company.expiresAt ? formatDate(company.expiresAt) : '—'} />
                  <DataItem label="Notas" value={company.notes ?? '—'} wide />
                </dl>
              </TabsContent>

              {/* -------- Módulos -------- */}
              <TabsContent value="modulos">
                {groupedModules.length === 0 ? (
                  <EmptyState
                    icon={Blocks}
                    title="Sem módulos"
                    description="Esta empresa ainda não tem módulos associados. Escolha um plano para os activar."
                  />
                ) : (
                  <div className="space-y-5">
                    {groupedModules.map(([category, mods]) => {
                      const enabledCount = mods.filter((m) => m.isEnabled).length
                      return (
                        <div key={category}>
                          <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>{categoryLabel(category)}</span>
                            <span className="tabular-nums">
                              {enabledCount}/{mods.length} activos
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
                                        Essencial
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">{m.description ?? m.key}</p>
                                </div>
                                <Switch
                                  checked={m.isEnabled}
                                  disabled={busyModuleId === m.moduleId || (m.isCore && m.isEnabled)}
                                  onCheckedChange={(v) => void handleToggleModule(m, v)}
                                  aria-label={`${m.isEnabled ? 'Desactivar' : 'Activar'} módulo ${m.name}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    <p className="text-xs text-muted-foreground">
                      Módulos marcados como essenciais não podem ser desactivados.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* -------- Chaves -------- */}
              <TabsContent value="chaves" className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  As chaves autenticam a instalação BMS do cliente. Regenerar invalida a chave anterior imediatamente e
                  fica registado na auditoria.
                </p>
                <KeysField
                  label="Chave de licença"
                  value={company.licenseKey}
                  status={company.licenseStatus}
                  onRegenerate={() => handleRegenerate('LICENSE')}
                  onToggleStatus={() => handleKeyStatus('LICENSE', company.licenseStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE')}
                />
                <KeysField
                  label="Chave de API"
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
                    Notificações HTTP assinadas (HMAC) enviadas quando algo muda nesta empresa.
                  </p>
                  <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={openWebhookCreate}>
                    <Plus className="size-4" aria-hidden />
                    Adicionar webhook
                  </Button>
                </div>

                {webhooks.length === 0 ? (
                  <EmptyState
                    icon={Webhook}
                    title="Sem webhooks"
                    description="Adiciona um webhook para receber eventos desta empresa no teu sistema."
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
                                    Todos
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
                              aria-label={`${wh.isActive ? 'Desactivar' : 'Activar'} webhook ${wh.url}`}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-9 shrink-0"
                                  aria-label={`Acções para o webhook ${wh.url}`}
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
                                  Testar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openWebhookEdit(wh)}>
                                  <Pencil className="size-4" aria-hidden />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer"
                                  onClick={() => setDeletingWebhook(wh)}
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <LastStatusBadge status={wh.lastStatus} />
                              {wh.lastFiredAt ? formatRelative(wh.lastFiredAt) : 'nunca enviado'}
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">
                                {maskKey(wh.secret)}
                              </code>
                              <CopyKeyButton value={wh.secret} label="Copiar segredo do webhook" />
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
                    title="Sem facturas"
                    description="As facturas de subscrição desta empresa aparecerão aqui."
                  />
                ) : (
                  <div className="max-h-80 overflow-y-auto rounded-lg border scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-3">Nº</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="pr-3 text-right">Acção</TableHead>
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
                                  Marcar paga
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
                    title="Sem instâncias"
                    description="As instalações BMS desta empresa aparecem aqui após activarem a licença."
                  />
                ) : (
                  <div className="divide-y rounded-lg border">
                    {instances.map((inst) => (
                      <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                        <InstanceStatusDot lastSeenAt={inst.lastSeenAt} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs">{inst.instanceId}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>Versão {inst.appVersion ?? '—'}</span>
                            {inst.dbEngine ? (
                              <Badge variant="outline" className="px-1.5 py-0.5 font-mono text-[10px] uppercase">
                                {inst.dbEngine}
                              </Badge>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          última conexão {formatRelative(inst.lastSeenAt)}
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
                    title="Sem actividade"
                    description="As acções relacionadas com esta empresa aparecerão aqui."
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
            <DialogTitle>Adicionar webhook</DialogTitle>
            <DialogDescription>
              Eventos desta empresa serão enviados por POST para o URL indicado, assinados com HMAC-SHA256.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url" className="text-xs text-muted-foreground">
                URL de destino
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
                Eventos
              </Label>
              <Select value={webhookEventsMode} onValueChange={(v) => setWebhookEventsMode(v as 'ALL' | 'CUSTOM')}>
                <SelectTrigger id="webhook-events" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os eventos (*)</SelectItem>
                  <SelectItem value="CUSTOM">Personalizado…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {webhookEventsMode === 'CUSTOM' ? (
              <div className="space-y-1.5">
                <Label htmlFor="webhook-events-custom" className="text-xs text-muted-foreground">
                  Eventos (separados por vírgula)
                </Label>
                <Input
                  id="webhook-events-custom"
                  value={webhookEventsCustom}
                  onChange={(e) => setWebhookEventsCustom(e.target.value)}
                  placeholder="Ex.: INVOICE_PAID,INVOICE_OVERDUE"
                  className="h-11 font-mono text-xs"
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Disponíveis: {WEBHOOK_EVENT_LIST.join(', ')}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={creatingWebhook} onClick={() => setWebhookCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateWebhook()} disabled={creatingWebhook}>
              {creatingWebhook ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              Criar webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: editar webhook */}
      <Dialog open={editingWebhook !== null} onOpenChange={(o) => { if (!o && !savingWebhook) setEditingWebhook(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar webhook</DialogTitle>
            <DialogDescription className="truncate">
              {editingWebhook?.url}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-webhook-url" className="text-xs text-muted-foreground">
                URL de destino
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
                Eventos (separados por vírgula ou &quot;*&quot; para todos)
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
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveWebhook()} disabled={savingWebhook}>
              {savingWebhook ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
              Guardar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação: eliminar webhook */}
      <ConfirmDialog
        open={deletingWebhook !== null}
        onOpenChange={(o) => { if (!o && busyWebhookId === null) setDeletingWebhook(null) }}
        title="Eliminar webhook?"
        description={`As notificações deixarão de ser enviadas para ${deletingWebhook?.url ?? ''}. Esta acção não pode ser revertida.`}
        confirmLabel="Eliminar"
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
