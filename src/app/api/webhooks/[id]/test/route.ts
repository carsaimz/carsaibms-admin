/**
 * POST /api/webhooks/[id]/test — envia um evento TEST ao webhook e
 * devolve o código HTTP obtido (null se o destino não responder).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { deliverWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const webhook = await db.webhook.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    })
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
    }

    const status = await deliverWebhook(webhook.url, webhook.secret, 'TEST', {
      message: 'Teste de entrega do Carsai BMS Admin',
      company: webhook.company.name,
      webhookId: webhook.id,
    })

    await db.webhook.update({
      where: { id: webhook.id },
      data: { lastStatus: status, lastFiredAt: new Date() },
    })

    return NextResponse.json({ status, ok: status !== null && status < 400 })
  } catch (err) {
    console.error('[POST /api/webhooks/:id/test]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
