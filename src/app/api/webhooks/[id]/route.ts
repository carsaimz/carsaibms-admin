/**
 * /api/webhooks/[id]
 * PATCH  — actualizar URL / eventos / activar-desactivar
 * DELETE — eliminar webhook
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  url: z.string().trim().url('URL inválido (inclua https://)').max(500).optional(),
  events: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => {
        if (v === '*') return true
        return v.split(',').every((e) => /^[A-Z_]+$/.test(e.trim()))
      },
      { message: 'Eventos inválidos (use "*" ou nomes separados por vírgula)' }
    )
    .optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.webhook.findUnique({
      where: { id },
      include: { company: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
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

    const webhook = await db.webhook.update({ where: { id }, data })

    await logAudit({
      action: 'WEBHOOK_UPDATED',
      entityType: 'Webhook',
      entityId: id,
      entityName: existing.company.name,
      details: `Actualizado (${Object.keys(data).join(', ')})`,
      actorEmail: user.email,
    })

    return NextResponse.json({ webhook })
  } catch (err) {
    console.error('[PATCH /api/webhooks/:id]', err)
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

    const existing = await db.webhook.findUnique({
      where: { id },
      include: { company: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
    }

    await db.webhook.delete({ where: { id } })

    await logAudit({
      action: 'WEBHOOK_DELETED',
      entityType: 'Webhook',
      entityId: id,
      entityName: existing.company.name,
      details: `Webhook ${existing.url} eliminado`,
      actorEmail: user.email,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/webhooks/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
