/**
 * PATCH /api/companies/[id]/modules — activa/desactiva um módulo para a empresa.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const toggleSchema = z.object({
  moduleId: z.string({ message: 'moduleId é obrigatório' }).min(1, 'moduleId é obrigatório'),
  isEnabled: z.boolean({ message: 'isEnabled deve ser verdadeiro ou falso' }),
})

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

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const company = await db.company.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = toggleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { moduleId, isEnabled } = parsed.data

    const mod = await db.module.findUnique({
      where: { id: moduleId },
      select: { id: true, name: true },
    })
    if (!mod) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }

    const now = new Date()
    await db.companyModule.upsert({
      where: { companyId_moduleId: { companyId: id, moduleId } },
      create: { companyId: id, moduleId, isEnabled, enabledAt: isEnabled ? now : null },
      update: { isEnabled, enabledAt: isEnabled ? now : null },
    })

    await logAudit({
      action: isEnabled ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
      entityType: 'CompanyModule',
      entityId: id,
      entityName: `${mod.name} — ${company.name}`,
      details: isEnabled
        ? 'Módulo activado para a empresa'
        : 'Módulo desactivado para a empresa',
      actorEmail: user.email,
    })

    const modules = await buildModulesPayload(id)
    return NextResponse.json({ modules })
  } catch (err) {
    console.error('[PATCH /api/companies/:id/modules]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
