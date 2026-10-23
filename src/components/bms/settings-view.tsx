'use client'

/**
 * SettingsView — configurações da plataforma agrupadas em Geral, Acesso e Sistema.
 */

import { useCallback, useEffect, useState } from 'react'
import { Globe, Loader2, RefreshCw, Save, Settings as SettingsIcon, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { getSettings, updateSettings } from '@/lib/bms-api'
import type { SettingsMap } from '@/lib/bms-api'
import { EmptyState, PageHeader } from './shared'

type FieldType = 'string' | 'number' | 'boolean'

interface SettingField {
  key: string
  label: string
  type: FieldType
  hint?: string
  placeholder?: string
}

interface SettingGroup {
  id: string
  title: string
  description: string
  icon: LucideIcon
  fields: SettingField[]
}

const GROUPS: SettingGroup[] = [
  {
    id: 'general',
    title: 'Geral',
    description: 'Identidade e dados públicos da plataforma',
    icon: Globe,
    fields: [
      { key: 'siteName', label: 'Nome da plataforma', type: 'string', placeholder: 'Carsai BMS' },
      { key: 'companyName', label: 'Nome legal da empresa', type: 'string', placeholder: 'Carsai Moçambique, Lda' },
      { key: 'siteUrl', label: 'URL público', type: 'string', placeholder: 'https://bms.carsai.co.mz' },
      { key: 'supportEmail', label: 'Email de suporte', type: 'string', placeholder: 'suporte@carsai.co.mz' },
      { key: 'defaultLanguage', label: 'Idioma padrão', type: 'string', hint: 'pt ou en', placeholder: 'pt' },
      { key: 'currency', label: 'Moeda', type: 'string', hint: 'Código ISO (MZN)', placeholder: 'MZN' },
      { key: 'timezone', label: 'Fuso horário', type: 'string', placeholder: 'Africa/Maputo' },
    ],
  },
  {
    id: 'access',
    title: 'Acesso',
    description: 'Regras de registo e segurança de sessões',
    icon: ShieldCheck,
    fields: [
      {
        key: 'allowRegistration',
        label: 'Permitir auto-registo de empresas',
        type: 'boolean',
        hint: 'Se desactivado, só a equipa Carsai pode criar contas.',
      },
      {
        key: 'requireEmailVerification',
        label: 'Exigir verificação de email',
        type: 'boolean',
        hint: 'O registo só fica activo após confirmação do email.',
      },
      { key: 'sessionTimeoutHours', label: 'Expiração de sessão (horas)', type: 'number' },
    ],
  },
  {
    id: 'system',
    title: 'Sistema',
    description: 'Parâmetros de operação da plataforma',
    icon: SettingsIcon,
    fields: [
      {
        key: 'maintenanceMode',
        label: 'Modo de manutenção',
        type: 'boolean',
        hint: 'Bloqueia o acesso ao BMS para todos os clientes.',
      },
      {
        key: 'licenseEnforcement',
        label: 'Aplicar bloqueio de licença',
        type: 'boolean',
        hint: 'Bloqueia empresas com licença expirada ou revogada.',
      },
      { key: 'auditRetentionDays', label: 'Retenção de auditoria (dias)', type: 'number' },
    ],
  },
]

export function SettingsView() {
  const [loaded, setLoaded] = useState<SettingsMap | null>(null)
  const [draft, setDraft] = useState<Record<string, string | boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingGroup, setSavingGroup] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const settings = await getSettings()
      setLoaded(settings)
      const nextDraft: Record<string, string | boolean> = {}
      for (const group of GROUPS) {
        for (const field of group.fields) {
          const v = settings[field.key]
          if (field.type === 'boolean') {
            nextDraft[field.key] = v === true || v === 'true'
          } else {
            nextDraft[field.key] = v === undefined || v === null ? '' : String(v)
          }
        }
      }
      setDraft(nextDraft)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar as configurações.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function isDirty(group: SettingGroup): boolean {
    if (!loaded) return false
    return group.fields.some((f) => {
      const original = loaded[f.key]
      const current = draft[f.key]
      if (f.type === 'boolean') {
        return (current === true) !== (original === true || original === 'true')
      }
      if (f.type === 'number') {
        return Number(current ?? 0) !== Number(original ?? 0)
      }
      return String(current ?? '') !== String(original ?? '')
    })
  }

  async function saveGroup(group: SettingGroup) {
    setSavingGroup(group.id)
    try {
      const patch: Record<string, string | number | boolean> = {}
      for (const f of group.fields) {
        if (f.type === 'boolean') {
          patch[f.key] = draft[f.key] === true
        } else if (f.type === 'number') {
          patch[f.key] = Number(draft[f.key]) || 0
        } else {
          patch[f.key] = String(draft[f.key] ?? '')
        }
      }
      const res = await updateSettings(patch)
      toast.success(`Configurações de "${group.title}" guardadas.`)
      setLoaded(res.settings ?? { ...loaded, ...patch })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar as configurações.')
    } finally {
      setSavingGroup(null)
    }
  }

  function revertGroup(group: SettingGroup) {
    if (!loaded) return
    setDraft((prev) => {
      const next = { ...prev }
      for (const f of group.fields) {
        const v = loaded[f.key]
        next[f.key] = f.type === 'boolean' ? v === true || v === 'true' : v === undefined || v === null ? '' : String(v)
      }
      return next
    })
  }

  const anyDirty = loaded ? GROUPS.some((g) => isDirty(g)) : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Parâmetros gerais da plataforma — as alterações ficam registadas na auditoria"
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-32" />
                {[0, 1, 2].map((j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error || !loaded ? (
        <Card>
          <CardContent>
            <EmptyState
              title="Erro ao carregar as configurações"
              description={error ?? 'Tente novamente em instantes.'}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Tentar novamente
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((group) => {
            const dirty = isDirty(group)
            return (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                      <group.icon className="size-4" aria-hidden />
                    </span>
                    {group.title}
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.fields.map((field) => (
                    <div key={field.key}>
                      {field.type === 'boolean' ? (
                        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{field.label}</span>
                            {field.hint ? (
                              <span className="block text-xs text-muted-foreground">{field.hint}</span>
                            ) : null}
                          </span>
                          <Switch
                            checked={draft[field.key] === true}
                            onCheckedChange={(v) => setDraft((p) => ({ ...p, [field.key]: v }))}
                            aria-label={field.label}
                          />
                        </label>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor={`setting-${field.key}`} className="text-sm">
                            {field.label}
                          </Label>
                          <Input
                            id={`setting-${field.key}`}
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={String(draft[field.key] ?? '')}
                            onChange={(e) => setDraft((p) => ({ ...p, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                          />
                          {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => void saveGroup(group)}
                      disabled={!dirty || savingGroup !== null}
                      className="h-10"
                    >
                      {savingGroup === group.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Save className="size-4" aria-hidden />
                      )}
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => revertGroup(group)}
                      disabled={!dirty || savingGroup !== null}
                      className="h-10"
                    >
                      Reverter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {anyDirty ? (
        <p className="text-xs text-muted-foreground">Existem alterações por guardar — pressione &quot;Guardar&quot; em cada grupo.</p>
      ) : null}
    </div>
  )
}
