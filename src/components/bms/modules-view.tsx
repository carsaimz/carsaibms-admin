'use client'

/**
 * ModulesView — módulos do sistema BMS agrupados por categoria.
 * Inclui o diálogo de criação/edição de módulo.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Blocks, Building2, CircleAlert, CreditCard, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import { createModule, deleteModule, listModules, updateModule } from '@/lib/bms-api'
import type { ModulePayload, ModuleWithCounts } from '@/lib/bms-api'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  ConfirmDialog,
  EmptyState,
  HintTooltip,
  MODULE_ICON_MAP,
  MODULE_ICON_NAMES,
  ModuleIcon,
  PageHeader,
  StatusBadge,
  useLabels,
} from './shared'

export function ModulesView() {
  const [modules, setModules] = useState<ModuleWithCounts[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ModuleWithCounts | null>(null)
  const [toDelete, setToDelete] = useState<ModuleWithCounts | null>(null)
  const { t } = useI18n()
  const L = useLabels()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setModules(await listModules())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('modules.errors.load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const map = new Map<string, ModuleWithCounts[]>()
    for (const m of modules ?? []) {
      const arr = map.get(m.category) ?? []
      arr.push(m)
      map.set(m.category, arr)
    }
    return [...map.entries()]
  }, [modules])

  async function handleToggleActive(mod: ModuleWithCounts, active: boolean) {
    try {
      const updated = await updateModule(mod.id, { isActive: active })
      setModules((prev) => prev?.map((m) => (m.id === mod.id ? { ...m, isActive: updated.isActive } : m)) ?? prev)
      toast.success(
        active
          ? t('modules.toasts.activated', { name: mod.name })
          : t('modules.toasts.deactivated', { name: mod.name })
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('modules.toasts.updateError'))
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteModule(toDelete.id)
      toast.success(t('modules.toasts.deleted', { name: toDelete.name }))
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('modules.toasts.deleteError'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('modules.title')} description={t('modules.subtitle')}>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="h-11"
        >
          <Plus className="size-4" aria-hidden />
          {t('modules.newModule')}
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-6">
          {[0, 1].map((g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="space-y-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title={t('modules.errors.loadTitle')}
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
      ) : modules && modules.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Blocks}
              title={t('modules.empty.title')}
              description={t('modules.empty.description')}
              action={
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  {t('modules.newModule')}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        grouped.map(([category, mods]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {L.category(category)}
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t('modules.activeCount', { n: mods.filter((m) => m.isActive).length, total: mods.length })}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mods.map((m) => (
                <Card key={m.id} className={cn(!m.isActive && 'opacity-75')}>
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                        <ModuleIcon name={m.icon} className="size-5" />
                      </span>
                      <Switch
                        checked={m.isActive}
                        onCheckedChange={(v) => void handleToggleActive(m, v)}
                        aria-label={
                          m.isActive
                            ? t('modules.toggleDeactivate', { name: m.name })
                            : t('modules.toggleActivate', { name: m.name })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="truncate font-medium">{m.name}</h4>
                        {m.isCore ? (
                          <HintTooltip hint={t('modules.coreHint')}>
                            <span className="cursor-help rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                              {t('modules.coreBadge')}
                            </span>
                          </HintTooltip>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{m.key}</p>
                    </div>
                    <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{m.description ?? '—'}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-3.5" aria-hidden />
                        {t('modules.companiesCount', { n: m.companiesCount })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="size-3.5" aria-hidden />
                        {t('modules.plansCount', { n: m.plansCount })}
                      </span>
                      <span className="ml-auto">
                        <StatusBadge
                          status={m.isActive ? 'ACTIVE' : 'INACTIVE'}
                          labels={{ ACTIVE: t('modules.statusActive'), INACTIVE: t('modules.statusInactive') }}
                        />
                      </span>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 flex-1"
                        onClick={() => {
                          setEditing(m)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                        {t('common.edit')}
                      </Button>
                      {m.isCore ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                          aria-label={t('modules.deleteAria', { name: m.name })}
                          title={t('common.delete')}
                          onClick={() => setToDelete(m)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <ModuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        module={editing}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('modules.deleteConfirmTitle', { name: toDelete?.name ?? '' })}
        description={t('modules.deleteConfirmDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Diálogo de módulo                                                   */
/* ------------------------------------------------------------------ */

interface ModuleFormState {
  name: string
  key: string
  description: string
  icon: string
  category: string
  sortOrder: string
  isActive: boolean
}

const EMPTY_MODULE_FORM: ModuleFormState = {
  name: '',
  key: '',
  description: '',
  icon: 'Package',
  category: '',
  sortOrder: '0',
  isActive: true,
}

function ModuleFormDialog({
  open,
  onOpenChange,
  module,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: ModuleWithCounts | null
  onSaved: () => void
}) {
  const isEdit = Boolean(module)
  const [form, setForm] = useState<ModuleFormState>(EMPTY_MODULE_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    setError(null)
    if (module) {
      setForm({
        name: module.name,
        key: module.key,
        description: module.description ?? '',
        icon: module.icon in MODULE_ICON_MAP ? module.icon : 'Package',
        category: module.category,
        sortOrder: String(module.sortOrder ?? 0),
        isActive: module.isActive,
      })
    } else {
      setForm(EMPTY_MODULE_FORM)
    }
  }, [open, module])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError(t('modules.form.errors.nameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: ModulePayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon,
        category: form.category.trim() || 'CORE',
      }
      if (isEdit && module) {
        await updateModule(module.id, {
          ...payload,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder) || 0,
        })
      } else {
        await createModule({
          ...payload,
          key: form.key.trim() || undefined,
        })
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('modules.form.errors.save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('modules.form.editTitle') : t('modules.newModule')}</DialogTitle>
          <DialogDescription>
            {t('modules.form.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error ? (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="module-name">
              {t('modules.form.name')} <span className="text-rose-600 dark:text-rose-400">*</span>
            </Label>
            <Input
              id="module-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t('modules.form.namePlaceholder')}
              disabled={saving}
              required
            />
          </div>

          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="module-key">{t('modules.form.key')}</Label>
              <Input
                id="module-key"
                value={form.key}
                onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                placeholder={t('modules.form.keyPlaceholder')}
                disabled={saving}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="module-description">{t('modules.form.description')}</Label>
            <Textarea
              id="module-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={t('modules.form.descriptionPlaceholder')}
              rows={2}
              disabled={saving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="module-icon">{t('modules.form.icon')}</Label>
              <Select value={form.icon} onValueChange={(v) => setForm((p) => ({ ...p, icon: v }))} disabled={saving}>
                <SelectTrigger id="module-icon" className="w-full [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_ICON_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        <ModuleIcon name={name} className="size-4" />
                        {name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-category">{t('modules.form.category')}</Label>
              <Input
                id="module-category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value.toUpperCase() }))}
                placeholder={t('modules.form.categoryPlaceholder')}
                disabled={saving}
              />
            </div>
          </div>

          {isEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="module-sort">{t('modules.form.sortOrder')}</Label>
                <Input
                  id="module-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <label className="flex items-center justify-between gap-3 self-end rounded-lg border p-3">
                <span className="text-sm font-medium">{t('modules.form.activeLabel')}</span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                  disabled={saving}
                  aria-label={t('modules.form.activeLabel')}
                />
              </label>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isEdit ? t('modules.form.saveChanges') : t('modules.form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
