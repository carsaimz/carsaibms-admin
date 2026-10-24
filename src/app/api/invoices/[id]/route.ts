/**
 * /api/invoices/[id]
 * PATCH  — marcar como paga / reabrir / cancelar / editar notas
 * DELETE — eliminar factura
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { dispatchWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const INVOICE_STATUSES = ['OPEN', 'PAID', 'OVERDUE', 'CANCELLED'] as const
const PAYMENT_METHODS = ['MPESA', 'EMOLA', 'TRANSFER', 'CASH', 'CARD'] as const

const patchSchema = z.object({
  status: z.enum(INVOICE_STATUSES, { message: 'Estado inválido' }).optional(),
  method: z.enum(PAYMENT_METHODS, { message: 'Método de pagamento inválido' }).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  dueAt: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.invoice.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Factura não encontrada' }, { status: 404 })
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
    if (data.status !== undefined) {
      update.status = data.status
      if (data.status === 'PAID') {
        update.paidAt = new Date()
        update.method = data.method ?? 'CASH'
      } else {
        update.paidAt = null
        if (data.status !== 'OPEN') update.method = null
      }
    } else if (data.method !== undefined) {
      update.method = data.method
    }
    if (data.notes !== undefined) update.notes = data.notes
    if (data.dueAt !== undefined) {
      const d = new Date(data.dueAt)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data de vencimento inválida' }, { status: 400 })
      }
      update.dueAt = d
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
    }

    const invoice = await db.invoice.update({ where: { id }, data: update })

    // Auditoria + webhooks
    if (data.status === 'PAID' && existing.status !== 'PAID') {
      await logAudit({
        action: 'INVOICE_PAID',
        entityType: 'Invoice',
        entityId: invoice.id,
        entityName: invoice.number,
        details: `${existing.company.name} — pagamento via ${invoice.method ?? '—'}`,
        actorEmail: user.email,
      })
      void dispatchWebhook(existing.company.id, 'INVOICE_PAID', {
        invoiceId: invoice.id,
        number: invoice.number,
        company: existing.company.name,
        amount: invoice.amount,
        currency: invoice.currency,
        method: invoice.method,
      })
    } else {
      await logAudit({
        action: 'INVOICE_UPDATED',
        entityType: 'Invoice',
        entityId: invoice.id,
        entityName: invoice.number,
        details: `Actualizada (${Object.keys(update).join(', ')})`,
        actorEmail: user.email,
      })
    }

    return NextResponse.json({ invoice })
  } catch (err) {
    console.error('[PATCH /api/invoices/:id]', err)
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

    const existing = await db.invoice.findUnique({
      where: { id },
      include: { company: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Factura não encontrada' }, { status: 404 })
    }

    await db.invoice.delete({ where: { id } })

    await logAudit({
      action: 'INVOICE_DELETED',
      entityType: 'Invoice',
      entityId: id,
      entityName: existing.number,
      details: `Factura de ${existing.company.name} eliminada`,
      actorEmail: user.email,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/invoices/:id]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
