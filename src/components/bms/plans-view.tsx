'use client'

/**
 * PlansView — planos de subscrição em grelha de cartões.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Blocks,
  Building2,
  CircleAlert,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { deletePlan, listModules, listPlans, updatePlan } from '@/lib/bms-api'
import type { ModuleWithCounts, PlanWithModules } from '@/lib/bms-api'
import { formatMZN } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge } from './shared'
import { PlanFormDialog } from './plan-form-dialog'

export function PlansView() {
  const [plans, setPlans] = useState<PlanWithModules[] | null>(null)
  const [modules, setModules] = useState<ModuleWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PlanWithModules | null>(null)
  const [toDelete, setToDelete] = useState<PlanWithModules | null>(null)
  const { t } = useI18n()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ps, ms] = await Promise.all([listPlans(), listModules()])
      setPlans(ps)
      setModules(ms)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('plans.errors.load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(plan: PlanWithModules) {
    setEditing(plan)
    setFormOpen(true)
  }

  async function handleToggleActive(plan: PlanWithModules, active: boolean) {
    try {
      const updated = await updatePlan(plan.id, { isActive: active })
      setPlans((prev) => prev?.map((p) => (p.id === plan.id ? { ...p, isActive: updated.isActive } : p)) ?? prev)
      toast.success(
        active
          ? t('plans.toasts.activated', { name: plan.name })
          : t('plans.toasts.deactivated', { name: plan.name })
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plans.toasts.updateError'))
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deletePlan(toDelete.id)
      toast.success(t('plans.toasts.deleted', { name: toDelete.name }))
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plans.toasts.deleteError'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('plans.title')} description={t('plans.subtitle')}>
        <Button onClick={openCreate} className="h-11">
          <Plus className="size-4" aria-hidden />
          {t('plans.newPlan')}
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title={t('plans.errors.loadTitle')}
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('common.retry')}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : plans && plans.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Blocks}
              title={t('plans.empty.title')}
              description={t('plans.empty.description')}
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" aria-hidden />
                  {t('plans.newPlan')}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans?.map((p) => (
            <Card key={p.id} className={cn('flex flex-col', p.isPopular && 'border-emerald-500/50 shadow-emerald-600/5')}>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate font-semibold">{p.name}</h3>
                      {p.isPopular ? (
                        <Badge className="bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">
                          {t('plans.popular')}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.slug}</p>
                  </div>
                  <Switch
                    checked={p.isActive}
                    onCheckedChange={(v) => void handleToggleActive(p, v)}
                    aria-label={
                      p.isActive
                        ? t('plans.toggleDeactivate', { name: p.name })
                        : t('plans.toggleActivate', { name: p.name })
                    }
                  />
                </div>

                <div>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {formatMZN(p.price)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {p.interval === 'YEARLY' ? t('plans.perYear') : t('plans.perMonth')}
                    </span>
                  </p>
                  <div className="mt-1">
                    <StatusBadge
                      status={p.isActive ? 'ACTIVE' : 'INACTIVE'}
                      labels={{ ACTIVE: t('plans.statusActive'), INACTIVE: t('plans.statusInactive') }}
                    />
                  </div>
                </div>

                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{p.description ?? '—'}</p>

                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Users className="size-4 shrink-0" aria-hidden />
                    {t('plans.maxUsersUpTo', { n: p.maxUsers })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Blocks className="size-4 shrink-0" aria-hidden />
                    {t('plans.modulesIncluded', { n: p.modules.length })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Building2 className="size-4 shrink-0" aria-hidden />
                    {t('plans.companiesCount', { n: p.companiesCount })}
                  </li>
                </ul>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="h-10 flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="size-4" aria-hidden />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                    aria-label={t('plans.deleteAria', { name: p.name })}
                    title={t('common.delete')}
                    onClick={() => setToDelete(p)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editing}
        modules={modules}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('plans.deleteConfirmTitle', { name: toDelete?.name ?? '' })}
        description={t('plans.deleteConfirmDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  )
}
