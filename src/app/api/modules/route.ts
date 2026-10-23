/**
 * /api/modules
 * GET  — listagem de módulos do sistema com contadores
 * POST — criação de módulo (key automática se omitida)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { slugify } from '@/lib/keys'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const modules = await db.module.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { companies: true, plans: true } } },
    })

    const items = modules.map(({ _count, ...m }) => ({
      ...m,
      companiesCount: _count.companies,
      plansCount: _count.plans,
    }))

    return NextResponse.json(items)
  } catch (err) {
    console.error('[GET /api/modules]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* POST                                                                */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string({ message: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório').max(100, 'Nome demasiado longo'),
  key: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
})

async function uniqueModuleKey(base: string): Promise<string> {
  let key = base
  let n = 2
  while (await db.module.findUnique({ where: { key }, select: { id: true } })) {
    key = `${base}-${n}`
    n += 1
  }
  return key
}

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

    // Chave: fornecida (deve ser única) ou auto-slug do nome
    let key: string
    if (data.key && data.key.length > 0) {
      const normalized = slugify(data.key)
      if (!normalized) {
        return NextResponse.json({ error: 'Chave inválida (use letras, números e hífens)' }, { status: 400 })
      }
      const exists = await db.module.findUnique({ where: { key: normalized }, select: { id: true } })
      if (exists) {
        return NextResponse.json({ error: 'Já existe um módulo com esta chave' }, { status: 400 })
      }
      key = normalized
    } else {
      key = await uniqueModuleKey(slugify(data.name) || 'modulo')
    }

    const maxSortOrder = await db.module.aggregate({ _max: { sortOrder: true } })
    const created = await db.module.create({
      data: {
        key,
        name: data.name,
        description: data.description && data.description.length > 0 ? data.description : null,
        icon: data.icon && data.icon.length > 0 ? data.icon : 'Package',
        category: data.category && data.category.length > 0 ? data.category : 'CORE',
        isCore: false,
        isActive: true,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    })

    await logAudit({
      action: 'MODULE_CREATED',
      entityType: 'Module',
      entityId: created.id,
      entityName: created.name,
      details: `Módulo criado (chave: ${created.key}, categoria: ${created.category})`,
      actorEmail: user.email,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('[POST /api/modules]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
