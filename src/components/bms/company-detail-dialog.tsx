'use client'

/**
 * CompanyDetailDialog — detalhe da empresa com abas:
 * Dados · Módulos · Chaves · Actividade.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Blocks, CircleAlert, History, Loader2, Pencil, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getCompany,
  regenerateKey,
  setKeyStatus,
  toggleCompanyModule,
  updateCompany,
} from '@/lib/bms-api'
import type { Company, CompanyDetail, CompanyModuleState, CompanyStatus, KeyStatus, KeyType } from '@/lib/bms-api'
import { formatDate, formatDateTime, formatMZN, formatRelative } from '@/lib/format'
import {
  AuditBadge,
  COMPANY_STATUSES,
  COMPANY_STATUS_LABELS,
  categoryLabel,
  EmptyState,
  KeysField,
  ModuleIcon,
  StatusBadge,
} from './shared'

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
              <TabsList className="grid h-11 w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="modulos">Módulos</TabsTrigger>
                <TabsTrigger value="chaves">Chaves</TabsTrigger>
                <TabsTrigger value="actividade">Actividade</TabsTrigger>
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
