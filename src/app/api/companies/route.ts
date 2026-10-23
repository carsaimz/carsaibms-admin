/**
 * /api/companies
 * GET  — listagem paginada com pesquisa e filtros
 * POST — criação de empresa (slug, licença e chave de API gerados)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { genLicenseKey, genApiKey, slugify } from '@/lib/keys'

export const dynamic = 'force-dynamic'

const COMPANY_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as const

/* ------------------------------------------------------------------ */
/* GET — listagem                                                      */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim() || ''
    const status = sp.get('status') || ''
    const planId = sp.get('planId') || ''
    const page = Math.max(1, Number(sp.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 10))

    const where: Prisma.CompanyWhereInput = {}
    if (status && (COMPANY_STATUSES as readonly string[]).includes(status)) {
      where.status = status
    }
    if (planId) {
      where.planId = planId
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { nuit: { contains: search } },
        { city: { contains: search } },
      ]
    }

    const [total, rows] = await Promise.all([
      db.company.count({ where }),
      db.company.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true, price: true, interval: true } },
          _count: { select: { modules: { where: { isEnabled: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const items = rows.map(({ _count, ...company }) => ({
      ...company,
      modulesEnabled: _count.modules,
    }))

    return NextResponse.json({ items, total, page, pageSize })
  } catch (err) {
    console.error('[GET /api/companies]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* POST — criação                                                      */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string({ message: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório').max(200, 'Nome demasiado longo'),
  email: z
    .string({ message: 'Email é obrigatório' })
    .trim()
    .min(1, 'Email é obrigatório')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
  phone: z.string().trim().max(50).optional(),
  nuit: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  planId: z.string().trim().optional(),
  maxUsers: z.coerce.number().int('Número máximo de utilizadores deve ser um inteiro').min(1, 'Número máximo de utilizadores deve ser maior que 0').max(9999).optional(),
  notes: z.string().trim().max(2000).optional(),
})

async function uniqueCompanySlug(name: string): Promise<string> {
  const base = slugify(name) || 'empresa'
  let slug = base
  let n = 2
  while (await db.company.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}

async function uniqueLicenseKey(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const key = genLicenseKey()
    const exists = await db.company.findUnique({ where: { licenseKey: key }, select: { id: true } })
    if (!exists) return key
  }
  return `${genLicenseKey().slice(0, -2)}${Date.now().toString(36).slice(-2).toUpperCase()}`
}

async function uniqueApiKey(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const key = genApiKey()
    const exists = await db.company.findUnique({ where: { apiKey: key }, select: { id: true } })
    if (!exists) return key
  }
  return `${genApiKey()}${Date.now().toString(16)}`
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

    let plan: { id: string; name: string } | null = null
    if (data.planId) {
      plan = await db.plan.findUnique({
        where: { id: data.planId },
        select: { id: true, name: true },
      })
      if (!plan) {
        return NextResponse.json({ error: 'Plano não encontrado' }, { status: 400 })
      }
    }

    const emptyToNull = (v?: string) => (v && v.length > 0 ? v : null)

    const company = await db.company.create({
      data: {
        name: data.name,
        slug: await uniqueCompanySlug(data.name),
        email: data.email.toLowerCase(),
        phone: emptyToNull(data.phone),
        nuit: emptyToNull(data.nuit),
        address: emptyToNull(data.address),
        city: emptyToNull(data.city),
        province: emptyToNull(data.province),
        status: 'PENDING',
        planId: plan?.id ?? null,
        licenseKey: await uniqueLicenseKey(),
        licenseStatus: 'ACTIVE',
        apiKey: await uniqueApiKey(),
        apiKeyStatus: 'ACTIVE',
        maxUsers: data.maxUsers ?? 5,
        notes: emptyToNull(data.notes),
      },
    })

    // Se tem plano: cria CompanyModules do plano com isEnabled=true
    if (plan) {
      const now = new Date()
      const planModules = await db.planModule.findMany({ where: { planId: plan.id } })
      if (planModules.length > 0) {
        await db.companyModule.createMany({
          data: planModules.map((pm) => ({
            companyId: company.id,
            moduleId: pm.moduleId,
            isEnabled: true,
            enabledAt: now,
          })),
        })
      }
    }

    const full = await db.company.findUnique({
      where: { id: company.id },
      include: { plan: true, modules: { include: { module: true } } },
    })

    await logAudit({
      action: 'COMPANY_CREATED',
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      details: plan ? `Empresa criada no plano ${plan.name}` : 'Empresa criada sem plano',
      actorEmail: user.email,
    })

    return NextResponse.json(full, { status: 201 })
  } catch (err) {
    console.error('[POST /api/companies]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
