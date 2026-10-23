/**
 * /api/plans/[id]
 * PATCH  — actualização de plano (moduleIds substitui o conjunto)
 * DELETE — eliminação (empresas ficam com planId null via SetNull)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

async function planWithDetails(id: string) {
  const plan = await db.plan.findUnique({
    where: { id },
    include: {
      modules: { include: { module: { select: { id: true, key: true, name: true, category: true } } } },
      _count: { select: { companies: true } },
    },
  })
  if (!plan) return null
  const { modules, _count, ...rest } = plan
  return { ...rest, modules: modules.map((pm) => pm.module), companiesCount: _count.companies }
}

const patchSchema = z.object({
  name: z.string().trim().min(1, 'Nome não pode estar vazio').max(100, 'Nome demasiado longo').optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.coerce.number({ message: 'Preço deve ser um número' }).min(0, 'Preço não pode ser negativo').max(1000000).optional(),
  interval: z.enum(['MONTHLY', 'YEARLY'], { message: "Intervalo deve ser 'MONTHLY' ou 'YEARLY'" }).optional(),
  maxUsers: z.coerce.number().int('Máximo de utilizadores deve ser um inteiro').min(1, 'Máximo de utilizadores deve ser maior que 0').max(9999).optional(),
  moduleIds: z.array(z.string()).optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const data = parsed.data

    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) {
      update.description = data.description && data.description.length > 0 ? data.description : null
    }
    if (data.price !== undefined) update.price = data.price
    if (data.interval !== undefined) update.interval = data.interval
    if (data.maxUsers !== undefined) update.maxUsers = data.maxUsers
    if (data.isPopular !== undefined) update.isPopular = data.isPopular
    if (data.isActive !== undefined) update.isActive = data.isActive

    let moduleIds: string[] | null = null
    if (data.moduleIds !== undefined) {
      moduleIds = [...new Set(data.moduleIds)]
      if (moduleIds.length > 0) {
        const found = await db.module.count({ where: { id: { in: moduleIds } } })
        if (found !== moduleIds.length) {
          return NextResponse.json({ error: 'Um ou mais módulos são inválidos' }, { status: 400 })
        }
      }
    }

    if (Object.keys(update).length === 0 && moduleIds === null) {
      return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      if (Object.keys(update).length > 0) {
        await tx.plan.update({ where: { id }, data: update })
      }
      if (moduleIds !== null) {
        await tx.planModule.deleteMany({ where: { planId: id } })
        if (moduleIds.length > 0) {
          await tx.planModule.createMany({
            data: moduleIds.map((moduleId) => ({ planId: id, moduleId })),
          })
        }
      }
    })

    await logAudit({
      action: 'PLAN_UPDATED',
      entityType: 'Plan',
      entityId: id,
      entityName: (data.name ?? existing.name),
      details:
        moduleIds !== null
          ? `Plano actualizado (${moduleIds.length} módulos associados)`
          : 'Plano actualizado',
      actorEmail: user.email,
    })

    const full = await planWithDetails(id)
    return NextResponse.json(full)
  } catch (err) {
    console.error('[PATCH /api/plans/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    await db.plan.delete({ where: { id } })

    await logAudit({
      action: 'PLAN_DELETED',
      entityType: 'Plan',
      entityId: id,
      entityName: existing.name,
      details: `Plano de ${existing.price} MZN eliminado (empresas associadas ficaram sem plano)`,
      actorEmail: user.email,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/plans/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
