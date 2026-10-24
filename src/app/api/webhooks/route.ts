/**
 * /api/webhooks
 * GET  — listagem de webhooks (com nome da empresa)
 * POST — criação de webhook (segredo HMAC gerado automaticamente)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { genWebhookSecret } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const companyId = req.nextUrl.searchParams.get('companyId') || ''

    const items = await db.webhook.findMany({
      where: companyId ? { companyId } : undefined,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[GET /api/webhooks]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

const createSchema = z.object({
  companyId: z.string({ message: 'Empresa é obrigatória' }).trim().min(1, 'Empresa é obrigatória'),
  url: z.string({ message: 'URL é obrigatório' }).trim().url('URL inválido (inclua https://)').max(500),
  events: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine(
      (v) => {
        if (!v || v === '*') return true
        return v.split(',').every((e) => /^[A-Z_]+$/.test(e.trim()))
      },
      { message: 'Eventos inválidos (use "*" ou nomes separados por vírgula)' }
    ),
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

    const company = await db.company.findUnique({ where: { id: data.companyId }, select: { id: true, name: true } })
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
    }

    const webhook = await db.webhook.create({
      data: {
        companyId: company.id,
        url: data.url,
        events: data.events && data.events.length > 0 ? data.events : '*',
        secret: genWebhookSecret(),
        isActive: true,
      },
    })

    await logAudit({
      action: 'WEBHOOK_CREATED',
      entityType: 'Webhook',
      entityId: webhook.id,
      entityName: company.name,
      details: `Webhook criado → ${webhook.url}`,
      actorEmail: user.email,
    })

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/webhooks]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
