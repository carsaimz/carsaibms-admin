/**
 * POST /api/invoices/generate — gera facturas de subscrição em lote para um mês.
 * Body: { month: "YYYY-MM" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { generateMonthlyInvoices } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

const generateSchema = z.object({
  month: z
    .string({ message: 'Mês é obrigatório' })
    .regex(/^\d{4}-\d{2}$/, 'Mês inválido (formato: YYYY-MM)'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const result = await generateMonthlyInvoices(parsed.data.month, user.email)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('[POST /api/invoices/generate]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
