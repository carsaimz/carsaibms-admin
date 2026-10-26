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
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { EmptyState, PageHeader, StatCard, TableSkeleton } from './shared'

/* ------------------------------------------------------------------ */
/* Estado da instância (partilhado com o detalhe de empresa)           */
/* ------------------------------------------------------------------ */

export type InstanceLive = 'ONLINE' | 'DORMANT' | 'OFFLINE'

export interface InstanceStatusInfo {
  key: InstanceLive
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
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
    }
  }
  if (hours <= 24 * 7) {
    return {
      key: 'DORMANT',
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
    }
  }
  return {
    key: 'OFFLINE',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
  }
}

export function InstanceStatusDot({ lastSeenAt }: { lastSeenAt: string | Date }) {
  const { t } = useI18n()
  const status = getInstanceStatus(lastSeenAt)
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium', status.text)}>
      <span className="relative flex size-2" aria-hidden>
        <span className={cn('absolute inline-flex size-full animate-pulse rounded-full opacity-60', status.dot)} />
        <span className={cn('relative inline-flex size-2 rounded-full', status.dot)} />
      </span>
      {t(`instances.status.${status.key}`)}
    </span>
  )
}

const REFRESH_INTERVAL = 30_000

function InstancesSkeleton() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <PageHeader title={t('instances.title')} description={t('instances.description')} />
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
  const { t } = useI18n()
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
      setError(e instanceof Error ? e.message : t('instances.errors.loadFallback'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

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
        <PageHeader title={t('instances.title')} description={t('instances.description')} />
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title={t('instances.errors.loadFail')}
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
      <PageHeader
        title={t('instances.title')}
        description={t('instances.description')}
      >
        <Button
          variant="outline"
          className="h-11"
          onClick={() => void load()}
          disabled={refreshing}
          aria-label={t('instances.actions.refreshAria')}
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden />
          {t('instances.actions.refresh')}
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('instances.kpis.total')} value={counts.total} hint={t('instances.kpis.totalHint')} icon={Radar} tone="zinc" />
        <StatCard
          title={t('instances.kpis.active24h')}
          value={counts.online}
          hint={t('instances.kpis.activeHint')}
          icon={Radar}
          tone="emerald"
        />
        <StatCard
          title={t('instances.kpis.dormant')}
          value={counts.dormant}
          hint={t('instances.kpis.dormantHint')}
          icon={Radar}
          tone="amber"
        />
        <StatCard
          title={t('instances.kpis.offline')}
          value={counts.offline}
          hint={t('instances.kpis.offlineHint')}
          icon={Radar}
          tone="rose"
        />
      </div>

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_260px]">
        <div className="space-y-1.5">
          <Label htmlFor="instances-search" className="text-xs text-muted-foreground">
            {t('common.search')}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="instances-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('instances.filters.searchPlaceholder')}
              className="h-11 pl-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instances-company" className="text-xs text-muted-foreground">
            {t('instances.filters.company')}
          </Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger id="instances-company" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('instances.filters.allCompanies')}</SelectItem>
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
              title={t('instances.errors.loadInstances')}
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
              icon={Radar}
              title={hasFilters ? t('instances.empty.filteredTitle') : t('instances.empty.title')}
              description={
                hasFilters
                  ? t('instances.empty.filteredDescription')
                  : t('instances.empty.description')
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    {t('common.clearFilters')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">{t('instances.table.company')}</TableHead>
                    <TableHead>{t('instances.table.instance')}</TableHead>
                    <TableHead>{t('instances.table.version')}</TableHead>
                    <TableHead>{t('instances.table.dbEngine')}</TableHead>
                    <TableHead className="text-right">{t('instances.table.users')}</TableHead>
                    <TableHead>{t('instances.table.firstSeen')}</TableHead>
                    <TableHead>{t('instances.table.lastSeen')}</TableHead>
                    <TableHead className="pr-4">{t('instances.table.status')}</TableHead>
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
