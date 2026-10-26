'use client'

/**
 * DashboardView — visão geral da plataforma com estatísticas e gráficos.
 * Textos via i18n (pt-MZ / en); meses via Intl no locale activo.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  Blocks,
  Building2,
  CircleAlert,
  CircleCheck,
  FileText,
  History,
  Radar,
  RefreshCw,
  UserCog,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboard } from '@/lib/bms-api'
import type { DashboardStats } from '@/lib/bms-api'
import { formatMZN, formatRelative, initials, monthShort } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { AuditBadge, EmptyState, PageHeader, StatCard, StatusBadge, type SectionId } from './shared'

const EMERALD = '#10b981'
const EMERALD_DARK = '#059669'
const AMBER = '#f59e0b'
const ROSE = '#f43f5e'
const ZINC = '#a1a1aa'

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

function DashboardSkeleton({ headerTitle, headerDesc }: { headerTitle: string; headerDesc: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={headerTitle} description={headerDesc} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-36" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent>
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DashboardView({ onNavigate }: { onNavigate?: (section: SectionId) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await getDashboard())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <DashboardSkeleton headerTitle={t('dashboard.title')} headerDesc={t('dashboard.subtitle')} />
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title={t('dashboard.errors.loadFail')}
              description={error ?? t('common.checkConnection')}
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

  const pieData = [
    { name: t('statuses.ACTIVE'), value: stats.companies.active, color: EMERALD },
    { name: t('statuses.PENDING'), value: stats.companies.pending, color: AMBER },
    { name: t('statuses.SUSPENDED'), value: stats.companies.suspended, color: ROSE },
    { name: t('statuses.CANCELLED'), value: stats.companies.cancelled, color: ZINC },
  ].filter((d) => d.value > 0)

  const growthData = stats.growth.map((g) => ({ label: monthShort(g.month), count: g.count }))

  const billingData = stats.billing.series.map((s) => ({
    label: monthShort(s.month),
    issued: s.issued,
    paid: s.paid,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />

      {/* Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('dashboard.stats.activeCompanies')}
          value={stats.companies.active}
          hint={t('dashboard.stats.totalCompaniesHint', { n: stats.companies.total })}
          icon={Building2}
          tone="emerald"
        />
        <StatCard
          title={t('dashboard.stats.mrr')}
          value={formatMZN(stats.mrr)}
          hint={t('dashboard.stats.mrrHint')}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          title={t('dashboard.stats.activeModules')}
          value={stats.activeModules}
          hint={t('dashboard.stats.modulesInUseHint', { n: stats.moduleUsage.length })}
          icon={Blocks}
          tone="amber"
        />
        <StatCard
          title={t('dashboard.stats.panelUsers')}
          value={stats.adminUsers}
          hint={t('dashboard.stats.panelUsersHint')}
          icon={UserCog}
          tone="zinc"
        />
      </div>

      {/* Estatísticas — telemetria e facturação */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('dashboard.stats.activeInstances')}
          value={stats.instances.active24h}
          hint={t('dashboard.stats.installedHint', { n: stats.instances.total })}
          icon={Radar}
          tone="emerald"
        />
        <StatCard
          title={t('dashboard.stats.open')}
          value={stats.billing.open.count}
          hint={formatMZN(stats.billing.open.amount)}
          icon={FileText}
          tone="amber"
        />
        <StatCard
          title={t('dashboard.stats.overdue')}
          value={stats.billing.overdue.count}
          hint={formatMZN(stats.billing.overdue.amount)}
          icon={CircleAlert}
          tone="rose"
        />
        <StatCard
          title={t('dashboard.stats.paidThisMonth')}
          value={formatMZN(stats.billing.paidMonth.amount)}
          hint={t('dashboard.stats.paidInvoicesHint', { n: stats.billing.paidMonth.count })}
          icon={CircleCheck}
          tone="emerald"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.charts.companiesByPlan')}</CardTitle>
            <CardDescription>{t('dashboard.charts.companiesByPlanDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.companiesByPlan.length === 0 ? (
              <EmptyState icon={Building2} title={t('common.noData')} description={t('dashboard.errors.emptyByPlan')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.companiesByPlan} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa40" />
                  <XAxis
                    dataKey="planName"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <RechartsTooltip cursor={{ fill: 'rgba(16,185,129,0.07)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name={t('dashboard.charts.seriesCompanies')} fill={EMERALD_DARK} radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.charts.companyStates')}</CardTitle>
            <CardDescription>{t('dashboard.charts.companyStatesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyState icon={Building2} title={t('common.noData')} description={t('dashboard.errors.emptyStates')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    strokeWidth={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.charts.growth')}</CardTitle>
            <CardDescription>{t('dashboard.charts.growthDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {growthData.length === 0 ? (
              <EmptyState icon={Building2} title={t('common.noData')} description={t('dashboard.errors.emptyGrowth')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa40" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('dashboard.charts.seriesNewCompanies')}
                    stroke={EMERALD_DARK}
                    strokeWidth={2}
                    fill="url(#growthFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Facturação — últimos 6 meses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.charts.billing6')}</CardTitle>
          <CardDescription>{t('dashboard.charts.billing6Desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {billingData.length === 0 ? (
            <EmptyState icon={FileText} title={t('common.noData')} description={t('dashboard.errors.emptyBilling')} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={billingData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa40" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={64} />
                <RechartsTooltip cursor={{ fill: 'rgba(16,185,129,0.07)' }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="issued" name={t('dashboard.charts.seriesIssued')} fill={AMBER} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="paid" name={t('dashboard.charts.seriesPaid')} fill={EMERALD_DARK} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-base">{t('dashboard.lists.latestCompanies')}</CardTitle>
              <CardDescription>{t('dashboard.lists.latestCompaniesDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => onNavigate?.('companies')}>
              {t('common.seeAll')}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentCompanies.length === 0 ? (
              <EmptyState icon={Building2} title={t('dashboard.lists.noCompanies')} description={t('dashboard.lists.noCompaniesDesc')} />
            ) : (
              <div className="divide-y">
                {stats.recentCompanies.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.email}
                        {c.plan ? ` · ${c.plan.name}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-base">{t('dashboard.lists.recentActivity')}</CardTitle>
              <CardDescription>{t('dashboard.lists.recentActivityDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => onNavigate?.('audit')}>
              {t('common.viewAudit')}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentAudit.length === 0 ? (
              <EmptyState icon={History} title={t('dashboard.lists.noActivity')} description={t('dashboard.lists.noActivityDesc')} />
            ) : (
              <div className="divide-y">
                {stats.recentAudit.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <History className="size-4 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.entityName ?? a.entityType}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.details ?? a.actorEmail ?? '—'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <AuditBadge action={a.action} />
                      <span className="text-[11px] text-muted-foreground">{formatRelative(a.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
