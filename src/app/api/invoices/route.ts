/**
 * /api/invoices
 * GET  — listagem de facturas (com sweep automático de vencidas)
 * POST — criação manual de factura
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { nextInvoiceNumber } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

const INVOICE_STATUSES = ['OPEN', 'PAID', 'OVERDUE', 'CANCELLED'] as const

/** Marca facturas OPEN cujo vencimento já passou como OVERDUE. */
async function sweepOverdue(): Promise<number> {
  const res = await db.invoice.updateMany({
    where: { status: 'OPEN', dueAt: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  })
  return res.count
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    await sweepOverdue()

    const sp = req.nextUrl.searchParams
    const status = sp.get('status') || ''
    const companyId = sp.get('companyId') || ''
    const search = sp.get('search')?.trim() || ''
    const take = Math.min(500, Math.max(1, Number(sp.get('take')) || 200))

    const where: Prisma.InvoiceWhereInput = {}
    if (status && (INVOICE_STATUSES as readonly string[]).includes(status)) {
      where.status = status
    }
    if (companyId) where.companyId = companyId
    if (search) {
      where.OR = [{ number: { contains: search } }, { company: { name: { contains: search } } }]
    }

    const [items, counts] = await Promise.all([
      db.invoice.findMany({
        where,
        include: { company: { select: { id: true, name: true, status: true } } },
        orderBy: { issuedAt: 'desc' },
        take,
      }),
      db.invoice.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    ])

    const summary = { OPEN: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 } as Record<string, number>
    const amounts = { OPEN: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 } as Record<string, number>
    for (const g of counts) {
      summary[g.status] = g._count._all
      amounts[g.status] = Math.round((g._sum.amount ?? 0) * 100) / 100
    }

    return NextResponse.json({ items, summary, amounts })
  } catch (err) {
    console.error('[GET /api/invoices]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

const createSchema = z.object({
  companyId: z.string({ message: 'Empresa é obrigatória' }).trim().min(1, 'Empresa é obrigatória'),
  amount: z.coerce
    .number({ message: 'Valor é obrigatório' })
    .positive('Valor deve ser maior que 0')
    .max(10_000_000),
  periodStart: z.string({ message: 'Início do período é obrigatório' }).trim().min(1, 'Início do período é obrigatório'),
  periodEnd: z.string({ message: 'Fim do período é obrigatório' }).trim().min(1, 'Fim do período é obrigatório'),
  dueAt: z.string({ message: 'Vencimento é obrigatório' }).trim().min(1, 'Vencimento é obrigatório'),
  planName: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
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

    const company = await db.company.findUnique({
      where: { id: data.companyId },
      select: { id: true, name: true, planId: true, plan: { select: { id: true, name: true } } },
    })
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
    }

    const start = new Date(data.periodStart)
    const end = new Date(data.periodEnd)
    const due = new Date(data.dueAt)
    if ([start, end, due].some((d) => Number.isNaN(d.getTime()))) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 })
    }

    const invoice = await db.invoice.create({
      data: {
        number: await nextInvoiceNumber(),
        companyId: company.id,
        planId: company.planId,
        planName: data.planName ?? company.plan?.name ?? '—',
        amount: data.amount,
        periodStart: start,
        periodEnd: end,
        dueAt: due,
        status: 'OPEN',
        notes: data.notes ?? null,
      },
    })

    await logAudit({
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityName: invoice.number,
      details: `Factura manual de ${company.name}`,
      actorEmail: user.email,
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/invoices]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
