/**
 * POST /api/telemetry — heartbeat das instâncias Carsai BMS.
 * Endpoint PÚBLICO autenticado pela chave de licença da empresa.
 * O BMS chama este endpoint periodicamente para reportar estado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const telemetrySchema = z.object({
  licenseKey: z
    .string({ message: 'Chave de licença é obrigatória' })
    .trim()
    .min(8, 'Chave de licença inválida')
    .max(64),
  instanceId: z
    .string({ message: 'Identificador da instância é obrigatório' })
    .trim()
    .min(1, 'Identificador da instância é obrigatório')
    .max(100),
  appVersion: z.string().trim().max(50).optional(),
  nodeVersion: z.string().trim().max(50).optional(),
  dbEngine: z.string().trim().max(30).optional(),
  usersCount: z.coerce.number().int().min(0).max(100000).optional(),
  meta: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = telemetrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const data = parsed.data

    const company = await db.company.findUnique({
      where: { licenseKey: data.licenseKey },
      select: {
        id: true,
        name: true,
        status: true,
        licenseStatus: true,
        plan: { select: { name: true } },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Chave de licença não encontrada' }, { status: 404 })
    }
    if (company.licenseStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Licença revogada' }, { status: 403 })
    }
    if (company.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Empresa não está activa' }, { status: 403 })
    }

    const now = new Date()
    await db.instance.upsert({
      where: { companyId_instanceId: { companyId: company.id, instanceId: data.instanceId } },
      create: {
        companyId: company.id,
        instanceId: data.instanceId,
        appVersion: data.appVersion ?? null,
        nodeVersion: data.nodeVersion ?? null,
        dbEngine: data.dbEngine ?? null,
        usersCount: data.usersCount ?? null,
        meta: data.meta ?? null,
        lastSeenAt: now,
      },
      update: {
        appVersion: data.appVersion ?? undefined,
        nodeVersion: data.nodeVersion ?? undefined,
        dbEngine: data.dbEngine ?? undefined,
        usersCount: data.usersCount ?? undefined,
        meta: data.meta ?? undefined,
        lastSeenAt: now,
      },
    })

    return NextResponse.json({
      ok: true,
      company: { name: company.name, plan: company.plan?.name ?? null },
      serverTime: now.toISOString(),
    })
  } catch (err) {
    console.error('[POST /api/telemetry]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
