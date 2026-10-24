/**
 * /api/companies/[id]
 * GET    — detalhe completo (dados, módulos, auditoria)
 * PATCH  — actualização de dados / plano / estado
 * DELETE — eliminação (só SUPER_ADMIN)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { dispatchWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const COMPANY_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as const
const KEY_STATUSES = ['ACTIVE', 'REVOKED'] as const

/* ------------------------------------------------------------------ */
/* Módulos da empresa: todos os módulos do sistema + estado por empresa */
/* ------------------------------------------------------------------ */

async function buildModulesPayload(companyId: string) {
  const [allModules, companyModules] = await Promise.all([
    db.module.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    db.companyModule.findMany({ where: { companyId } }),
  ])
  const stateByModuleId = new Map(companyModules.map((cm) => [cm.moduleId, cm]))
  return allModules.map((m) => {
    const state = stateByModuleId.get(m.id)
    return {
      moduleId: m.id,
      key: m.key,
      name: m.name,
      description: m.description,
      icon: m.icon,
      category: m.category,
      isCore: m.isCore,
      isActive: m.isActive,
      isEnabled: state?.isEnabled ?? false,
      enabledAt: state?.enabledAt ?? null,
    }
  })
}

async function companyAudit(companyId: string, take = 15) {
  return db.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'Company', entityId: companyId },
        { entityType: 'CompanyModule', entityId: companyId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
}

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const company = await db.company.findUnique({
      where: { id },
      include: { plan: true },
    })
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const [modules, audit, webhooks, instances, invoices] = await Promise.all([
      buildModulesPayload(id),
      companyAudit(id),
      db.webhook.findMany({ where: { companyId: id }, orderBy: { createdAt: 'desc' } }),
      db.instance.findMany({ where: { companyId: id }, orderBy: { lastSeenAt: 'desc' } }),
      db.invoice.findMany({ where: { companyId: id }, orderBy: { issuedAt: 'desc' }, take: 12 }),
    ])

    return NextResponse.json({ company, modules, audit, webhooks, instances, invoices })
  } catch (err) {
    console.error('[GET /api/companies/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* PATCH                                                               */
/* ------------------------------------------------------------------ */

const patchSchema = z.object({
  name: z.string().trim().min(1, 'Nome não pode estar vazio').max(200, 'Nome demasiado longo').optional(),
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido')
    .optional(),
  phone: z.string().trim().max(50).optional(),
  nuit: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  status: z.enum(COMPANY_STATUSES, { message: 'Estado inválido' }).optional(),
  planId: z.string().nullable().optional(),
  maxUsers: z.coerce.number().int('Número máximo de utilizadores deve ser um inteiro').min(1, 'Número máximo de utilizadores deve ser maior que 0').max(9999).optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  licenseStatus: z.enum(KEY_STATUSES, { message: 'Estado de licença inválido' }).optional(),
  apiKeyStatus: z.enum(KEY_STATUSES, { message: 'Estado de chave de API inválido' }).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.company.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
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
    const emptyToNull = (v?: string | null) => (v && v.length > 0 ? v : null)

    if (data.name !== undefined) update.name = data.name
    if (data.email !== undefined) update.email = data.email.toLowerCase()
    if (data.phone !== undefined) update.phone = emptyToNull(data.phone)
    if (data.nuit !== undefined) update.nuit = emptyToNull(data.nuit)
    if (data.address !== undefined) update.address = emptyToNull(data.address)
    if (data.city !== undefined) update.city = emptyToNull(data.city)
    if (data.province !== undefined) update.province = emptyToNull(data.province)
    if (data.maxUsers !== undefined) update.maxUsers = data.maxUsers
    if (data.notes !== undefined) update.notes = emptyToNull(data.notes)
    if (data.licenseStatus !== undefined) update.licenseStatus = data.licenseStatus
    if (data.apiKeyStatus !== undefined) update.apiKeyStatus = data.apiKeyStatus

    if (data.expiresAt !== undefined) {
      if (data.expiresAt === null || data.expiresAt.trim() === '') {
        update.expiresAt = null
      } else {
        const d = new Date(data.expiresAt)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data de expiração inválida' }, { status: 400 })
        }
        update.expiresAt = d
      }
    }

    // Plano: valida existência e prepara módulos a adicionar (mantém existentes)
    let planChanged = false
    let planName: string | null = null
    let moduleIdsToAdd: string[] = []
    if (data.planId !== undefined && data.planId !== existing.planId) {
      if (data.planId !== null) {
        const plan = await db.plan.findUnique({
          where: { id: data.planId },
          select: { id: true, name: true },
        })
        if (!plan) {
          return NextResponse.json({ error: 'Plano não encontrado' }, { status: 400 })
        }
        planName = plan.name
        update.planId = plan.id
        const planModules = await db.planModule.findMany({
          where: { planId: plan.id },
          select: { moduleId: true },
        })
        const existingModuleIds = new Set(
          (
            await db.companyModule.findMany({
              where: { companyId: id },
              select: { moduleId: true },
            })
          ).map((cm) => cm.moduleId)
        )
        moduleIdsToAdd = planModules
          .filter((pm) => !existingModuleIds.has(pm.moduleId))
          .map((pm) => pm.moduleId)
      } else {
        update.planId = null
      }
      planChanged = true
    }

    const statusChanged = data.status !== undefined && data.status !== existing.status
    if (statusChanged) {
      update.status = data.status
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
    }

    // Escrita única: actualiza empresa + adiciona módulos do novo plano
    const updated = await db.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id },
        data: update,
        include: { plan: true },
      })
      if (planChanged && moduleIdsToAdd.length > 0) {
        const now = new Date()
        await tx.companyModule.createMany({
          data: moduleIdsToAdd.map((moduleId) => ({
            companyId: id,
            moduleId,
            isEnabled: true,
            enabledAt: now,
          })),
        })
      }
      return company
    })

    // Webhooks de mudança de estado / licença
    if (statusChanged && (data.status === 'ACTIVE' || data.status === 'SUSPENDED')) {
      void dispatchWebhook(
        id,
        data.status === 'ACTIVE' ? 'COMPANY_ACTIVATED' : 'COMPANY_SUSPENDED',
        { companyId: id, company: updated.name, status: data.status }
      )
    }
    if (data.licenseStatus !== undefined && data.licenseStatus !== existing.licenseStatus) {
      void dispatchWebhook(
        id,
        data.licenseStatus === 'ACTIVE' ? 'LICENSE_ACTIVATED' : 'LICENSE_REVOKED',
        { companyId: id, company: updated.name, licenseStatus: data.licenseStatus }
      )
    }

    // Auditoria
    if (statusChanged && data.status === 'SUSPENDED') {
      await logAudit({
        action: 'COMPANY_SUSPENDED',
        entityType: 'Company',
        entityId: id,
        entityName: updated.name,
        details: 'Empresa suspensa',
        actorEmail: user.email,
      })
    } else if (statusChanged && data.status === 'ACTIVE') {
      await logAudit({
        action: 'COMPANY_ACTIVATED',
        entityType: 'Company',
        entityId: id,
        entityName: updated.name,
        details: 'Empresa activada',
        actorEmail: user.email,
      })
    }

    const otherFields = Object.keys(update).filter((f) => f !== 'status')
    if (otherFields.length > 0) {
      const planNote = planChanged
        ? data.planId === null
          ? ' (plano removido)'
          : ` (plano → ${planName ?? 'novo plano'})`
        : ''
      await logAudit({
        action: 'COMPANY_UPDATED',
        entityType: 'Company',
        entityId: id,
        entityName: updated.name,
        details: `Campos actualizados: ${otherFields.join(', ')}${planNote}`,
        actorEmail: user.email,
      })
    }

    return NextResponse.json({ company: updated })
  } catch (err) {
    console.error('[PATCH /api/companies/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* DELETE — só SUPER_ADMIN                                             */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const { id } = await params

    const existing = await db.company.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    await db.company.delete({ where: { id } })

    await logAudit({
      action: 'COMPANY_DELETED',
      entityType: 'Company',
      entityId: id,
      entityName: existing.name,
      details: `Empresa ${existing.email} eliminada permanentemente`,
      actorEmail: user.email,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/companies/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
