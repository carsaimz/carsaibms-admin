/**
 * /api/plans
 * GET  — listagem com módulos e contagem de empresas
 * POST — criação de plano (slug automático)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { slugify } from '@/lib/keys'

export const dynamic = 'force-dynamic'

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

async function uniquePlanSlug(name: string): Promise<string> {
  const base = slugify(name) || 'plano'
  let slug = base
  let n = 2
  while (await db.plan.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const plans = await db.plan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    })
    const items = (await Promise.all(plans.map((p) => planWithDetails(p.id)))).filter(
      (p) => p !== null
    )

    return NextResponse.json(items)
  } catch (err) {
    console.error('[GET /api/plans]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* POST                                                                */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string({ message: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório').max(100, 'Nome demasiado longo'),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number({ message: 'Preço deve ser um número' }).min(0, 'Preço não pode ser negativo').max(1000000).default(0),
  interval: z.enum(['MONTHLY', 'YEARLY'], { message: "Intervalo deve ser 'MONTHLY' ou 'YEARLY'" }).default('MONTHLY'),
  maxUsers: z.coerce.number().int('Máximo de utilizadores deve ser um inteiro').min(1, 'Máximo de utilizadores deve ser maior que 0').max(9999).default(5),
  moduleIds: z.array(z.string()).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Valida módulos
    const uniqueIds = [...new Set(data.moduleIds)]
    if (uniqueIds.length > 0) {
      const found = await db.module.count({ where: { id: { in: uniqueIds } } })
      if (found !== uniqueIds.length) {
        return NextResponse.json({ error: 'Um ou mais módulos são inválidos' }, { status: 400 })
      }
    }

    const maxSortOrder = await db.plan.aggregate({ _max: { sortOrder: true } })
    const plan = await db.plan.create({
      data: {
        name: data.name,
        slug: await uniquePlanSlug(data.name),
        description: data.description && data.description.length > 0 ? data.description : null,
        price: data.price,
        interval: data.interval,
        maxUsers: data.maxUsers,
        isPopular: data.isPopular,
        isActive: data.isActive,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        modules: {
          create: uniqueIds.map((moduleId) => ({ moduleId })),
        },
      },
    })

    await logAudit({
      action: 'PLAN_CREATED',
      entityType: 'Plan',
      entityId: plan.id,
      entityName: plan.name,
      details: `Plano criado (${data.price} MZN/${data.interval === 'YEARLY' ? 'ano' : 'mês'}, ${uniqueIds.length} módulos)`,
      actorEmail: user.email,
    })

    const full = await planWithDetails(plan.id)
    return NextResponse.json(full, { status: 201 })
  } catch (err) {
    console.error('[POST /api/plans]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
