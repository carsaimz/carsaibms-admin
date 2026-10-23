/**
 * GET /api/audit — listagem do registo de auditoria com filtros.
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
    const action = sp.get('action')?.trim() || ''
    const entityType = sp.get('entityType')?.trim() || ''
    const search = sp.get('search')?.trim() || ''
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit')) || 50))

    const where: Prisma.AuditLogWhereInput = {}
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (search) {
      where.OR = [
        { entityName: { contains: search } },
        { details: { contains: search } },
        { actorEmail: { contains: search } },
      ]
    }

    const items = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[GET /api/audit]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
