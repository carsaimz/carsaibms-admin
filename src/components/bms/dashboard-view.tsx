'use client'

/**
 * DashboardView — visão geral da plataforma com estatísticas e gráficos.
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
import { formatMZN, formatRelative, initials } from '@/lib/format'
import { AuditBadge, EmptyState, PageHeader, StatCard, StatusBadge, type SectionId } from './shared'

const EMERALD = '#10b981'
const EMERALD_DARK = '#059669'
const AMBER = '#f59e0b'
const ROSE = '#f43f5e'
const ZINC = '#a1a1aa'

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const idx = Number(m) - 1
  return `${MONTHS_PT[idx] ?? m}/${(y ?? '').slice(2)}`
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral da plataforma em tempo real" />
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await getDashboard())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar o painel.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <DashboardSkeleton />

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão geral da plataforma em tempo real" />
        <Card>
          <CardContent>
            <EmptyState
              icon={CircleAlert}
              title="Não foi possível carregar o painel"
              description={error ?? 'Verifique a ligação e tente novamente.'}
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

  const pieData = [
    { name: 'Activas', value: stats.companies.active, color: EMERALD },
    { name: 'Pendentes', value: stats.companies.pending, color: AMBER },
    { name: 'Suspensas', value: stats.companies.suspended, color: ROSE },
    { name: 'Canceladas', value: stats.companies.cancelled, color: ZINC },
  ].filter((d) => d.value > 0)

  const growthData = stats.growth.map((g) => ({ label: monthLabel(g.month), count: g.count }))

  const billingData = stats.billing.series.map((s) => ({
    label: monthLabel(s.month),
    Emitido: s.issued,
    Cobrado: s.paid,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral da plataforma em tempo real" />

      {/* Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Empresas activas"
          value={stats.companies.active}
          hint={`${stats.companies.total} empresas no total`}
          icon={Building2}
          tone="emerald"
        />
        <StatCard
          title="MRR estimado"
          value={formatMZN(stats.mrr)}
          hint="Receita mensal recorrente"
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          title="Módulos activos"
          value={stats.activeModules}
          hint={`${stats.moduleUsage.length} módulos em uso`}
          icon={Blocks}
          tone="amber"
        />
        <StatCard
          title="Utilizadores do painel"
          value={stats.adminUsers}
          hint="Contas com acesso activo"
          icon={UserCog}
          tone="zinc"
        />
      </div>

      {/* Estatísticas — telemetria e facturação */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Instâncias activas"
          value={stats.instances.active24h}
          hint={`${stats.instances.total} instaladas`}
          icon={Radar}
          tone="emerald"
        />
        <StatCard
          title="Em aberto"
          value={stats.billing.open.count}
          hint={formatMZN(stats.billing.open.amount)}
          icon={FileText}
          tone="amber"
        />
        <StatCard
          title="Em atraso"
          value={stats.billing.overdue.count}
          hint={formatMZN(stats.billing.overdue.amount)}
          icon={CircleAlert}
          tone="rose"
        />
        <StatCard
          title="Cobrado este mês"
          value={formatMZN(stats.billing.paidMonth.amount)}
          hint={`${stats.billing.paidMonth.count} facturas pagas`}
          icon={CircleCheck}
          tone="emerald"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empresas por plano</CardTitle>
            <CardDescription>Distribuição de clientes por plano de subscrição</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.companiesByPlan.length === 0 ? (
              <EmptyState icon={Building2} title="Sem dados" description="Ainda não existem empresas associadas a planos." />
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
                  <Bar dataKey="count" name="Empresas" fill={EMERALD_DARK} radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estados das empresas</CardTitle>
            <CardDescription>Activa, pendente, suspensa e cancelada</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyState icon={Building2} title="Sem dados" description="Ainda não existem empresas registadas." />
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
            <CardTitle className="text-base">Crescimento — 6 meses</CardTitle>
            <CardDescription>Novas empresas criadas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {growthData.length === 0 ? (
              <EmptyState icon={Building2} title="Sem dados" description="Ainda não há crescimento para mostrar." />
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
                    name="Novas empresas"
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
          <CardTitle className="text-base">Facturação — últimos 6 meses</CardTitle>
          <CardDescription>Emitido vs. cobrado por mês</CardDescription>
        </CardHeader>
        <CardContent>
          {billingData.length === 0 ? (
            <EmptyState icon={FileText} title="Sem dados" description="Ainda não existem facturas emitidas." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={billingData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa40" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={64} />
                <RechartsTooltip cursor={{ fill: 'rgba(16,185,129,0.07)' }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Emitido" fill={AMBER} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Cobrado" fill={EMERALD_DARK} radius={[6, 6, 0, 0]} maxBarSize={28} />
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
              <CardTitle className="text-base">Últimas empresas</CardTitle>
              <CardDescription>Os 6 registos mais recentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => onNavigate?.('companies')}>
              Ver todas
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentCompanies.length === 0 ? (
              <EmptyState icon={Building2} title="Nenhuma empresa" description="As novas empresas aparecerão aqui." />
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
              <CardTitle className="text-base">Actividade recente</CardTitle>
              <CardDescription>Últimas acções registadas na auditoria</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => onNavigate?.('audit')}>
              Ver auditoria
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentAudit.length === 0 ? (
              <EmptyState icon={History} title="Sem actividade" description="As acções na plataforma aparecerão aqui." />
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
