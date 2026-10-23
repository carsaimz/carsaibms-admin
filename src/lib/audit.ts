/**
 * Auditoria — Carsai BMS Admin
 * Registo centralizado de acções sensíveis na tabela AuditLog.
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */
import { db } from '@/lib/db'

export interface AuditInput {
  action: string
  entityType: string
  entityId?: string | null
  entityName?: string | null
  details?: string | null
  actorEmail?: string | null
}

/**
 * Regista uma entrada de auditoria. Nunca lança — falhas de auditoria
 * não devem interromper a operação principal (apenas log no servidor).
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityName: input.entityName ?? null,
        details: input.details ?? null,
        actorEmail: input.actorEmail ?? null,
      },
    })
  } catch (err) {
    console.error('[audit] Falha ao registar auditoria:', err)
  }
}
