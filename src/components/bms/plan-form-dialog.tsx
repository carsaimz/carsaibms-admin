'use client'

/**
 * PlanFormDialog — criar/editar plano de subscrição com módulos por categoria.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createPlan, updatePlan } from '@/lib/bms-api'
import type { ModuleWithCounts, PlanInterval, PlanWithModules } from '@/lib/bms-api'
import { categoryLabel } from './shared'

interface FormState {
  name: string
  description: string
  price: string
  interval: PlanInterval
  maxUsers: string
  isPopular: boolean
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '0',
  interval: 'MONTHLY',
  maxUsers: '5',
  isPopular: false,
  isActive: true,
}

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  modules,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanWithModules | null
  modules: ModuleWithCounts[]
  onSaved: () => void
}) {
  const isEdit = Boolean(plan)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [moduleIds, setModuleIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (plan) {
      setForm({
        name: plan.name,
        description: plan.description ?? '',
        price: String(plan.price ?? 0),
        interval: (plan.interval as PlanInterval) ?? 'MONTHLY',
        maxUsers: String(plan.maxUsers ?? 5),
        isPopular: plan.isPopular,
        isActive: plan.isActive,
      })
      setModuleIds(plan.modules.map((m) => m.id))
    } else {
      setForm(EMPTY_FORM)
      setModuleIds([])
    }
  }, [open, plan])

  const grouped = useMemo(() => {
    const map = new Map<string, ModuleWithCounts[]>()
    for (const m of modules) {
      if (!m.isActive) continue
      const arr = map.get(m.category) ?? []
      arr.push(m)
      map.set(m.category, arr)
    }
    return [...map.entries()]
  }, [modules])

  function toggleModule(id: string, checked: boolean) {
    setModuleIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  function toggleCategory(category: string, mods: ModuleWithCounts[], checked: boolean) {
    const ids = mods.map((m) => m.id)
    setModuleIds((prev) =>
      checked ? [...new Set([...prev, ...ids])] : prev.filter((x) => !ids.includes(x))
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('O nome do plano é obrigatório.')
      return
    }
    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('O preço deve ser um número igual ou superior a 0.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price) || 0,
        interval: form.interval,
        maxUsers: Math.max(1, Number(form.maxUsers) || 5),
        moduleIds,
        isPopular: form.isPopular,
        isActive: form.isActive,
      }
      if (isEdit && plan) {
        await updatePlan(plan.id, payload)
      } else {
        await createPlan(payload)
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar o plano.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          <DialogDescription>
            Defina o preço em meticais, limites e os módulos incluídos no plano.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="destructive" role="alert">
              <CircleAlert className="size-4" aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                Nome <span className="text-rose-600 dark:text-rose-400">*</span>
              </Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Profissional"
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Preço (MZN por mês)</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                step={50}
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-interval">Intervalo de facturação</Label>
              <Select
                value={form.interval}
                onValueChange={(v) => setForm((p) => ({ ...p, interval: v as PlanInterval }))}
                disabled={saving}
              >
                <SelectTrigger id="plan-interval" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-maxusers">Máx. utilizadores</Label>
              <Input
                id="plan-maxusers"
                type="number"
                min={1}
                value={form.maxUsers}
                onChange={(e) => setForm((p) => ({ ...p, maxUsers: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan-description">Descrição</Label>
              <Textarea
                id="plan-description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Para que tipo de empresa é este plano?"
                rows={2}
                disabled={saving}
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm">
                <span className="font-medium">Plano popular</span>
                <span className="block text-xs text-muted-foreground">Destaque no site público</span>
              </span>
              <Switch
                checked={form.isPopular}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isPopular: v }))}
                disabled={saving}
                aria-label="Plano popular"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm">
                <span className="font-medium">Plano activo</span>
                <span className="block text-xs text-muted-foreground">Disponível para novas empresas</span>
              </span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                disabled={saving}
                aria-label="Plano activo"
              />
            </label>
          </div>

          {/* Módulos por categoria */}
          <div className="space-y-3">
            <Label>Módulos incluídos ({moduleIds.length})</Label>
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum módulo activo disponível.</p>
            ) : (
              grouped.map(([category, mods]) => {
                const allChecked = mods.every((m) => moduleIds.includes(m.id))
                const someChecked = mods.some((m) => moduleIds.includes(m.id))
                return (
                  <div key={category} className="rounded-lg border">
                    <label className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                        onCheckedChange={(v) => toggleCategory(category, mods, v === true)}
                        disabled={saving}
                        aria-label={`Seleccionar todos os módulos de ${categoryLabel(category)}`}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {categoryLabel(category)}
                      </span>
                    </label>
                    <div className="grid gap-x-4 p-3 sm:grid-cols-2">
                      {mods.map((m) => (
                        <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
                          <Checkbox
                            checked={moduleIds.includes(m.id)}
                            onCheckedChange={(v) => toggleModule(m.id, v === true)}
                            disabled={saving}
                            aria-label={`Incluir módulo ${m.name}`}
                          />
                          <span className="min-w-0 text-sm">{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isEdit ? 'Guardar alterações' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
