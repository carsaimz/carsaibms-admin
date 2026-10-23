'use client'

/**
 * CompanyFormDialog — criar/editar empresa cliente.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { createCompany, updateCompany } from '@/lib/bms-api'
import type { Company, CompanyStatus, Plan } from '@/lib/bms-api'
import { toDateInput } from '@/lib/format'
import { COMPANY_STATUSES, COMPANY_STATUS_LABELS } from './shared'

interface FormState {
  name: string
  email: string
  phone: string
  nuit: string
  address: string
  city: string
  province: string
  planId: string
  maxUsers: string
  expiresAt: string
  status: CompanyStatus
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  nuit: '',
  address: '',
  city: '',
  province: '',
  planId: '',
  maxUsers: '5',
  expiresAt: '',
  status: 'PENDING',
  notes: '',
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  plans,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  plans: Plan[]
  onSaved: () => void
}) {
  const isEdit = Boolean(company)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (company) {
      setForm({
        name: company.name,
        email: company.email,
        phone: company.phone ?? '',
        nuit: company.nuit ?? '',
        address: company.address ?? '',
        city: company.city ?? '',
        province: company.province ?? '',
        planId: company.planId ?? '',
        maxUsers: String(company.maxUsers ?? 5),
        expiresAt: toDateInput(company.expiresAt),
        status: (company.status as CompanyStatus) ?? 'PENDING',
        notes: company.notes ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, company])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim()) {
      setError('O nome e o email são obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        nuit: form.nuit.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        province: form.province.trim() || undefined,
        planId: form.planId || null,
        maxUsers: Math.max(1, Number(form.maxUsers) || 5),
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T12:00:00Z`).toISOString() : null,
        notes: form.notes.trim() || undefined,
        ...(isEdit ? { status: form.status } : {}),
      }
      if (isEdit && company) {
        await updateCompany(company.id, payload)
      } else {
        await createCompany(payload)
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar a empresa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar empresa' : 'Nova empresa'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Actualize os dados de "${company?.name}".`
              : 'Registe uma nova empresa cliente. As chaves de licença e API são geradas automaticamente.'}
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
              <Label htmlFor="company-name">
                Nome <span className="text-rose-600 dark:text-rose-400">*</span>
              </Label>
              <Input
                id="company-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Mercado Chissano & Filhos"
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">
                Email <span className="text-rose-600 dark:text-rose-400">*</span>
              </Label>
              <Input
                id="company-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="geral@empresa.co.mz"
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Telefone</Label>
              <Input
                id="company-phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+258 84 000 0000"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-nuit">NUIT</Label>
              <Input
                id="company-nuit"
                value={form.nuit}
                onChange={(e) => set('nuit', e.target.value)}
                placeholder="400123456"
                disabled={saving}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company-address">Endereço</Label>
              <Input
                id="company-address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Av. Julius Nyerere, 1250"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-city">Cidade</Label>
              <Input
                id="company-city"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Maputo"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-province">Província</Label>
              <Input
                id="company-province"
                value={form.province}
                onChange={(e) => set('province', e.target.value)}
                placeholder="Maputo"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-plan">Plano</Label>
              <Select value={form.planId || 'NONE'} onValueChange={(v) => set('planId', v === 'NONE' ? '' : v)} disabled={saving}>
                <SelectTrigger id="company-plan" className="w-full">
                  <SelectValue placeholder="Seleccionar plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sem plano</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-maxusers">Máx. utilizadores</Label>
              <Input
                id="company-maxusers"
                type="number"
                min={1}
                value={form.maxUsers}
                onChange={(e) => set('maxUsers', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-expires">Licença expira em</Label>
              <Input
                id="company-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
                disabled={saving}
              />
            </div>
            {isEdit ? (
              <div className="space-y-2">
                <Label htmlFor="company-status">Estado</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v as CompanyStatus)} disabled={saving}>
                  <SelectTrigger id="company-status" className="w-full">
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
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company-notes">Notas internas</Label>
              <Textarea
                id="company-notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Observações sobre o cliente, pagamentos, pedidos…"
                rows={3}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isEdit ? 'Guardar alterações' : 'Criar empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
