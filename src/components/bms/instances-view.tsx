'use client'

/**
 * InstancesView — telemetria das instalações Carsai BMS em tempo real.
 * Auto-refresh a cada 30 s + pesquisa e filtro por empresa (client-side).
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, Radar, RefreshCw, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { listInstances } from '@/lib/bms-api'
import type { InstanceInfo } from '@/lib/bms-api'
import { formatDate, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EmptyState, PageHeader, StatCard, TableSkeleton } from './shared'

/* ------------------------------------------------------------------ */
/* Estado da instância (partilhado com o detalhe de empresa)           */
/* ------------------------------------------------------------------ */

export type InstanceLive = 'ONLINE' | 'DORMANT' | 'OFFLINE'

export interface InstanceStatusInfo {
  key: InstanceLive
  label: string
  dot: string
  text: string
}

/** Estado derivado do último heartbeat: ≤24 h online, 1–7 dias dormente, >7 dias offline. */
export function getInstanceStatus(lastSeenAt: string | Date): InstanceStatusInfo {
  const d = lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt)
  const hours = (Date.now() - d.getTime()) / 3_600_000
  if (hours <= 24) {
    return {
      key: 'ONLINE',
      label: 'Online',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
    }
  }
  if (hours <= 24 * 7) {
    return {
      key: 'DORMANT',
      label: 'Dormente',
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
    }
  }
  return {
    key: 'OFFLINE',
    label: 'Offline',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
  }
}

export function InstanceStatusDot({ lastSeenAt }: { lastSeenAt: string | Date }) {
  const status = getInstanceStatus(lastSeenAt)
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium', status.text)}>
      <span className="relative flex size-2" aria-hidden>
        <span className={cn('absolute inline-flex size-full animate-pulse rounded-full opacity-60', status.dot)} />
        <span className={cn('relative inline-flex size-2 rounded-full', status.dot)} />
      </span>
      {status.label}
    </span>
  )
}

const REFRESH_INTERVAL = 30_000

function InstancesSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Instâncias" description="Telemetria das instalações Carsai BMS em tempo real" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-7 w-20 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
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

export function InstancesView() {
  const [items, setItems] = useState<InstanceInfo[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [companyId, setCompanyId] = useState('ALL')

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await listInstances({})
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar as instâncias.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Auto-refresh a cada 30 s (silencioso, sem flash de skeleton)
  useEffect(() => {
    const t = window.setInterval(() => {
      void load(true)
    }, REFRESH_INTERVAL)
    return () => window.clearInterval(t)
  }, [load])

  const companies = useMemo(() => {
    const map = new Map<string, string>()
    for (const inst of items ?? []) {
      if (inst.company) map.set(inst.company.id, inst.company.name)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    return (items ?? []).filter((inst) => {
      if (companyId !== 'ALL' && inst.companyId !== companyId) return false
      if (!q) return true
      const haystack = [inst.instanceId, inst.company?.name ?? '', inst.appVersion ?? '']
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [items, searchInput, companyId])

  const counts = useMemo(() => {
    const all = items ?? []
    let online = 0
    let dormant = 0
    let offline = 0
    for (const inst of all) {
      switch (getInstanceStatus(inst.lastSeenAt).key) {
        case 'ONLINE':
          online++
          break
        case 'DORMANT':
          dormant++
          break
        default:
          offline++
      }
    }
    return { total: all.length, online, dormant, offline }
  }, [items])

  const hasFilters = Boolean(searchInput.trim()) || companyId !== 'ALL'

  function resetFilters() {
    setSearchInput('')
    setCompanyId('ALL')
  }

  if (loading && !items) return <InstancesSkeleton />

  if (error && !items) {
    return (
      <div className="space-y-6">
        <PageHeader title="Instâncias" description="Telemetria das instalações Carsai BMS em tempo real" />
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title="Não foi possível carregar as instâncias"
              description={error}
              action={
                <Button onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Tentar novamente
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
      <PageHeader
        title="Instâncias"
        description="Telemetria das instalações Carsai BMS em tempo real"
      >
        <Button
          variant="outline"
          className="h-11"
          onClick={() => void load()}
          disabled={refreshing}
          aria-label="Actualizar dados"
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden />
          Actualizar
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de instâncias" value={counts.total} hint="Instalações conhecidas" icon={Radar} tone="zinc" />
        <StatCard
          title="Activas (24h)"
          value={counts.online}
          hint="Heartbeat nas últimas 24 horas"
          icon={Radar}
          tone="emerald"
        />
        <StatCard
          title="Dormentes (1–7d)"
          value={counts.dormant}
          hint="Sem heartbeat há 1 a 7 dias"
          icon={Radar}
          tone="amber"
        />
        <StatCard
          title="Offline (>7d)"
          value={counts.offline}
          hint="Sem heartbeat há mais de 7 dias"
          icon={Radar}
          tone="rose"
        />
      </div>

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_260px]">
        <div className="space-y-1.5">
          <Label htmlFor="instances-search" className="text-xs text-muted-foreground">
            Pesquisar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="instances-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Instância, empresa ou versão…"
              className="h-11 pl-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instances-company" className="text-xs text-muted-foreground">
            Empresa
          </Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger id="instances-company" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as empresas</SelectItem>
              {companies.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card className="py-0">
        <CardContent className="p-0 pb-4">
          {error && !loading ? (
            <EmptyState
              icon={CircleAlert}
              title="Erro ao carregar instâncias"
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Tentar novamente
                </Button>
              }
            />
          ) : !loading && filtered.length === 0 ? (
            <EmptyState
              icon={Radar}
              title={hasFilters ? 'Nenhuma instância encontrada' : 'Ainda não há instâncias registadas'}
              description={
                hasFilters
                  ? 'Ajuste os filtros de pesquisa para ver mais resultados.'
                  : 'As instalações BMS aparecem aqui quando activam a licença e enviam o primeiro heartbeat.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Empresa</TableHead>
                    <TableHead>Instância</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Motor BD</TableHead>
                    <TableHead className="text-right">Utilizadores</TableHead>
                    <TableHead>Primeira conexão</TableHead>
                    <TableHead>Última conexão</TableHead>
                    <TableHead className="pr-4">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                {loading ? (
                  <TableSkeleton rows={6} cols={8} />
                ) : (
                  <TableBody>
                    {filtered.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell className="max-w-48 pl-4">
                          <span className="block truncate font-medium">{inst.company?.name ?? '—'}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inst.instanceId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inst.appVersion ?? '—'}</TableCell>
                        <TableCell>
                          {inst.dbEngine ? (
                            <Badge variant="outline" className="px-2 py-0.5 font-mono text-[10px] uppercase">
                              {inst.dbEngine}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{inst.usersCount ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inst.firstSeenAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatRelative(inst.lastSeenAt)}</TableCell>
                        <TableCell className="pr-4">
                          <InstanceStatusDot lastSeenAt={inst.lastSeenAt} />
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
    </div>
  )
}
