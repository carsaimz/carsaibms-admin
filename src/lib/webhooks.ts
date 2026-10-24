/**
 * Webhooks — Carsai BMS Admin
 * Disparo assíncrono de eventos da plataforma para URLs registadas por empresa.
 * Assinatura HMAC-SHA256 no header `X-Carsai-Signature: sha256=<hex>`.
 * Nunca lança — falhas de entrega não devem interromper a operação principal.
 *
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */
import crypto from 'node:crypto'
import { db } from '@/lib/db'

export const WEBHOOK_EVENTS = [
  'COMPANY_CREATED',
  'COMPANY_ACTIVATED',
  'COMPANY_SUSPENDED',
  'LICENSE_ACTIVATED',
  'LICENSE_REVOKED',
  'INVOICE_GENERATED',
  'INVOICE_PAID',
  'INVOICE_OVERDUE',
  'TEST',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export function genWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`
}

export function signPayload(secret: string, body: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
}

export interface WebhookDispatchResult {
  webhookId: string
  status: number | null
  ok: boolean
}

/**
 * Entrega um evento a um webhook específico (com timeout de 5s).
 * Devolve o código HTTP obtido, ou null em caso de erro de rede.
 */
export async function deliverWebhook(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<number | null> {
  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
    source: 'carsaibms-admin',
  })
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Carsai-Event': event,
        'X-Carsai-Signature': signPayload(secret, body),
      },
      body,
      signal: AbortSignal.timeout(5000),
    })
    return res.status
  } catch {
    return null
  }
}

/**
 * Dispara um evento para todos os webhooks activos da empresa que
 * subscrevam o evento (events = "*" ou CSV contendo o evento).
 * Fire-and-forget: actualiza lastStatus/lastFiredAt, nunca lança.
 */
export async function dispatchWebhook(
  companyId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const hooks = await db.webhook.findMany({
      where: { companyId, isActive: true },
    })
    const targets = hooks.filter((h) => {
      if (h.events.trim() === '*') return true
      return h.events
        .split(',')
        .map((s) => s.trim())
        .includes(event)
    })
    await Promise.all(
      targets.map(async (h) => {
        const status = await deliverWebhook(h.url, h.secret, event, payload)
        await db.webhook
          .update({
            where: { id: h.id },
            data: { lastStatus: status, lastFiredAt: new Date() },
          })
          .catch(() => undefined)
      })
    )
  } catch (err) {
    console.error('[webhooks] Dispatch falhou:', err)
  }
}
