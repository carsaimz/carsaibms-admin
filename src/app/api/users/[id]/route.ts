/**
 * /api/users/[id] — actualização e eliminação (só SUPER_ADMIN).
 * Não é permitido alterar nem apagar a própria conta.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser, publicUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] as const

const patchSchema = z.object({
  name: z.string().trim().min(1, 'Nome não pode estar vazio').max(100, 'Nome demasiado longo').optional(),
  role: z.enum(ROLES, { message: 'Papel inválido (SUPER_ADMIN, ADMIN ou SUPPORT)' }).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'A password deve ter pelo menos 8 caracteres')
    .max(72, 'Password demasiado longa')
    .optional(),
})

/* ------------------------------------------------------------------ */
/* PATCH                                                               */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const { id } = await params

    if (id === session.id) {
      return NextResponse.json(
        { error: 'Não pode alterar a sua própria conta' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
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
    if (data.role !== undefined) update.role = data.role
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.password !== undefined) {
      update.passwordHash = await bcrypt.hash(data.password, 10)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
    }

    const updated = await db.user.update({ where: { id }, data: update })

    const changes: string[] = []
    if (data.name !== undefined && data.name !== existing.name) changes.push('nome')
    if (data.role !== undefined && data.role !== existing.role) changes.push(`papel → ${data.role}`)
    if (data.isActive !== undefined && data.isActive !== existing.isActive) {
      changes.push(data.isActive ? 'conta activada' : 'conta desactivada')
    }
    if (data.password !== undefined) changes.push('password redefinida')

    await logAudit({
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      entityName: updated.email,
      details: changes.length > 0 ? `Alterações: ${changes.join(', ')}` : 'Utilizador actualizado',
      actorEmail: session.email,
    })

    return NextResponse.json(publicUser(updated))
  } catch (err) {
    console.error('[PATCH /api/users/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* DELETE                                                              */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const { id } = await params

    if (id === session.id) {
      return NextResponse.json(
        { error: 'Não pode apagar a sua própria conta' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
    }

    await db.user.delete({ where: { id } })

    await logAudit({
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
      entityName: existing.email,
      details: `Utilizador ${existing.name} (${existing.role}) eliminado`,
      actorEmail: session.email,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/users/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
