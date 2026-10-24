/**
 * GET /api/instances — listagem de instâncias BMS (telemetria).
 * Query: ?active=24h | ?companyId=... | ?search=...
 */
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const companyId = sp.get('companyId') || ''
    const search = sp.get('search')?.trim() || ''
    const active = sp.get('active') || ''

    const where: Prisma.InstanceWhereInput = {}
    if (companyId) where.companyId = companyId
    if (active === '24h') {
      where.lastSeenAt = { gte: new Date(Date.now() - 24 * 3600 * 1000) }
    } else if (active === '7d') {
      where.lastSeenAt = { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
    }
    if (search) {
      where.OR = [
        { instanceId: { contains: search } },
        { appVersion: { contains: search } },
        { company: { name: { contains: search } } },
      ]
    }

    const [items, total, active24h] = await Promise.all([
      db.instance.findMany({
        where,
        include: { company: { select: { id: true, name: true, status: true } } },
        orderBy: { lastSeenAt: 'desc' },
        take: 500,
      }),
      db.instance.count({ where }),
      db.instance.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } }),
    ])

    return NextResponse.json({ items, total, active24h })
  } catch (err) {
    console.error('[GET /api/instances]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
