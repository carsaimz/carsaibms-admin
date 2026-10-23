/**
 * /api/settings — configurações do sistema (key-value com tipos).
 * GET   — valores convertidos (boolean/number/string)
 * PATCH — actualiza apenas chaves existentes, validando o tipo
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type SettingValue = string | number | boolean

function convertValue(raw: string, type: string): SettingValue {
  if (type === 'boolean') return raw === 'true'
  if (type === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? raw : n
  }
  return raw
}

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } })
    const settings: Record<string, SettingValue> = {}
    for (const row of rows) {
      settings[row.key] = convertValue(row.value, row.type)
    }

    return NextResponse.json(settings)
  } catch (err) {
    console.error('[GET /api/settings]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* PATCH                                                               */
/* ------------------------------------------------------------------ */

const patchSchema = z.record(z.string(), z.unknown())

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const existing = await db.setting.findMany()
    const byKey = new Map(existing.map((s) => [s.key, s]))

    // Valida todas as chaves conhecidas antes de escrever (atomicidade lógica)
    const updates: Array<{ key: string; value: string }> = []
    for (const [key, value] of Object.entries(parsed.data)) {
      const setting = byKey.get(key)
      if (!setting) continue // chaves desconhecidas são ignoradas

      let normalized: string | null = null
      if (setting.type === 'boolean') {
        if (typeof value === 'boolean') normalized = value ? 'true' : 'false'
        else if (value === 'true' || value === 'false') normalized = value
      } else if (setting.type === 'number') {
        const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
        if (Number.isFinite(n)) normalized = String(n)
      } else {
        if (typeof value === 'string') normalized = value
        else if (typeof value === 'number' || typeof value === 'boolean') normalized = String(value)
      }

      if (normalized === null) {
        return NextResponse.json(
          { error: `Valor inválido para '${key}' (esperado ${setting.type})` },
          { status: 400 }
        )
      }
      if (normalized !== setting.value) {
        updates.push({ key, value: normalized })
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhuma configuração para actualizar' }, { status: 400 })
    }

    await db.$transaction(
      updates.map((u) =>
        db.setting.update({ where: { key: u.key }, data: { value: u.value } })
      )
    )

    for (const u of updates) {
      await logAudit({
        action: 'SETTING_UPDATED',
        entityType: 'Setting',
        entityId: u.key,
        entityName: u.key,
        details: `valor → ${u.value}`,
        actorEmail: user.email,
      })
    }

    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } })
    const settings: Record<string, SettingValue> = {}
    for (const row of rows) {
      settings[row.key] = convertValue(row.value, row.type)
    }

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[PATCH /api/settings]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
