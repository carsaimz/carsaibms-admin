/**
 * Facturas — Carsai BMS Admin
 * Geração sequencial de números FT-<ano>-<seq> e geração mensal em lote.
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

/**
 * Próximo número de factura sequencial por ano: FT-2026-00042.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `FT-${year}-`
  const last = await db.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  let seq = 1
  if (last) {
    const parsed = Number.parseInt(last.number.slice(prefix.length), 10)
    if (Number.isFinite(parsed)) seq = parsed + 1
  }
  // Garantia extra contra colisões
  let number = `${prefix}${String(seq).padStart(5, '0')}`
  while (await db.invoice.findUnique({ where: { number }, select: { id: true } })) {
    seq += 1
    number = `${prefix}${String(seq).padStart(5, '0')}`
  }
  return number
}

export interface GenerateResult {
  month: string
  created: number
  skipped: number
  invoices: Array<{ id: string; number: string; company: string; amount: number }>
}

/**
 * Gera facturas de subscrição para o mês indicado (YYYY-MM).
 * - Planos MONTHLY: uma factura por empresa activa com plano pago.
 * - Planos YEARLY: apenas em Janeiro (renovação anual).
 * Salta empresas que já tenham factura no período.
 */
export async function generateMonthlyInvoices(month: string, actorEmail: string): Promise<GenerateResult> {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) throw new Error('Mês inválido (formato esperado: YYYY-MM)')
  const year = Number(match[1])
  const monthIdx = Number(match[2]) - 1
  if (monthIdx < 0 || monthIdx > 11) throw new Error('Mês inválido')

  const periodStart = new Date(year, monthIdx, 1, 0, 0, 0, 0)
  const periodEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999)
  const dueAt = new Date(periodEnd.getTime() + 15 * 24 * 3600 * 1000)

  const companies = await db.company.findMany({
    where: { status: 'ACTIVE', planId: { not: null } },
    select: { id: true, name: true, createdAt: true, plan: { select: { id: true, name: true, price: true, interval: true } } },
  })

  const result: GenerateResult = { month, created: 0, skipped: 0, invoices: [] }

  for (const c of companies) {
    if (!c.plan || c.plan.price <= 0) continue
    // Anuais só em Janeiro
    if (c.plan.interval === 'YEARLY' && monthIdx !== 0) {
      continue
    }
    // Já existe factura desta empresa neste período?
    const existing = await db.invoice.findFirst({
      where: {
        companyId: c.id,
        periodStart: { gte: periodStart, lte: periodEnd },
        status: { not: 'CANCELLED' },
      },
      select: { id: true },
    })
    if (existing) {
      result.skipped += 1
      continue
    }

    const invoice = await db.invoice.create({
      data: {
        number: await nextInvoiceNumber(),
        companyId: c.id,
        planId: c.plan.id,
        planName: c.plan.name,
        amount: c.plan.price,
        periodStart,
        periodEnd,
        dueAt,
        status: 'OPEN',
      },
    })
    result.created += 1
    result.invoices.push({ id: invoice.id, number: invoice.number, company: c.name, amount: invoice.amount })
  }

  await logAudit({
    action: 'INVOICE_GENERATED',
    entityType: 'Invoice',
    entityName: month,
    details: `${result.created} facturas geradas, ${result.skipped} já existentes`,
    actorEmail,
  })

  return result
}
