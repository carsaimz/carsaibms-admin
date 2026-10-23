/**
 * /api/modules/[id]
 * PATCH  — actualização (isCore não é editável)
 * DELETE — eliminação (400 se isCore)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().trim().min(1, 'Nome não pode estar vazio').max(100, 'Nome demasiado longo').optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int('Ordem deve ser um inteiro').min(0, 'Ordem não pode ser negativa').max(9999).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.module.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
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
    if (data.icon !== undefined) update.icon = data.icon && data.icon.length > 0 ? data.icon : 'Package'
    if (data.category !== undefined) update.category = data.category && data.category.length > 0 ? data.category : 'CORE'
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
    }

    const mod = await db.module.update({ where: { id }, data: update })

    // Auditoria: activação/desactivação tem acção própria
    const activated = data.isActive !== undefined && data.isActive !== existing.isActive
    if (activated) {
      await logAudit({
        action: data.isActive ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
        entityType: 'Module',
        entityId: id,
        entityName: mod.name,
        details: data.isActive
          ? 'Módulo do sistema activado'
          : 'Módulo do sistema desactivado',
        actorEmail: user.email,
      })
    } else {
      await logAudit({
        action: 'MODULE_UPDATED',
        entityType: 'Module',
        entityId: id,
        entityName: mod.name,
        details: `Campos actualizados: ${Object.keys(update).join(', ')}`,
        actorEmail: user.email,
      })
    }

    return NextResponse.json(mod)
  } catch (err) {
    console.error('[PATCH /api/modules/:id]', err)
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

    const existing = await db.module.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }
    if (existing.isCore) {
      return NextResponse.json(
        { error: 'Não é possível eliminar um módulo central (core)' },
        { status: 400 }
      )
    }

    await db.module.delete({ where: { id } })

    await logAudit({
      action: 'MODULE_DELETED',
      entityType: 'Module',
      entityId: id,
      entityName: existing.name,
      details: `Módulo (chave: ${existing.key}) eliminado do sistema`,
      actorEmail: user.email,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/modules/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
