/**
 * GET /api/dashboard — estatísticas agregadas para o ecrã principal.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const now = new Date()

    // Contagem de empresas por estado (groupBy) + total
    const [statusGroups, companiesTotal, adminUsers, activeModules] = await Promise.all([
      db.company.groupBy({ by: ['status'], _count: { _all: true } }),
      db.company.count(),
      db.user.count({ where: { isActive: true } }),
      db.module.count({ where: { isActive: true } }),
    ])

    const byStatus = new Map(statusGroups.map((g) => [g.status, g._count._all]))
    const companies = {
      total: companiesTotal,
      active: byStatus.get('ACTIVE') ?? 0,
      pending: byStatus.get('PENDING') ?? 0,
      suspended: byStatus.get('SUSPENDED') ?? 0,
      cancelled: byStatus.get('CANCELLED') ?? 0,
    }

    // MRR: soma mensalizada dos planos das empresas ACTIVE (YEARLY → price/12)
    const activeWithPlan = await db.company.findMany({
      where: { status: 'ACTIVE', planId: { not: null } },
      select: { plan: { select: { price: true, interval: true } } },
    })
    const rawMrr = activeWithPlan.reduce((sum, c) => {
      if (!c.plan) return sum
      return sum + (c.plan.interval === 'YEARLY' ? c.plan.price / 12 : c.plan.price)
    }, 0)
    const mrr = Math.round(rawMrr * 100) / 100

    // Empresas por plano (inclui bucket "Sem plano" para planId nulo)
    const [planGroups, allPlans] = await Promise.all([
      db.company.groupBy({ by: ['planId'], _count: { _all: true } }),
      db.plan.findMany({ select: { id: true, name: true } }),
    ])
    const planNameById = new Map(allPlans.map((p) => [p.id, p.name]))
    const companiesByPlan = planGroups
      .map((g) => ({
        planName: g.planId ? (planNameById.get(g.planId) ?? 'Plano removido') : 'Sem plano',
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count)

    // Crescimento: empresas criadas nos últimos 6 meses (por mês de createdAt)
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    }
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const createdRows = await db.company.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    })
    const growthCounts = new Map(months.map((m) => [m, 0]))
    for (const row of createdRows) {
      const key = monthKey(row.createdAt)
      if (growthCounts.has(key)) {
        growthCounts.set(key, (growthCounts.get(key) ?? 0) + 1)
      }
    }
    const growth = months.map((month) => ({ month, count: growthCounts.get(month) ?? 0 }))

    // Top 10 módulos habilitados nas empresas
    const usageGroups = await db.companyModule.groupBy({
      by: ['moduleId'],
      where: { isEnabled: true },
      _count: { moduleId: true },
      orderBy: { _count: { moduleId: 'desc' } },
      take: 10,
    })
    const usageModules = await db.module.findMany({
      where: { id: { in: usageGroups.map((g) => g.moduleId) } },
      select: { id: true, name: true },
    })
    const usageNameById = new Map(usageModules.map((m) => [m.id, m.name]))
    const moduleUsage = usageGroups.map((g) => ({
      name: usageNameById.get(g.moduleId) ?? g.moduleId,
      count: g._count.moduleId,
    }))

    // Listas recentes
    const [recentCompanies, recentAudit] = await Promise.all([
      db.company.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { plan: { select: { name: true } } },
      }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

    return NextResponse.json({
      companies,
      mrr,
      adminUsers,
      activeModules,
      companiesByPlan,
      growth,
      moduleUsage,
      recentCompanies,
      recentAudit,
    })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
