/**
 * /api/companies/[id]/keys
 * POST  — regenera licença ou chave de API (KEY_REGENERATED)
 * PATCH — activa/revoga licença ou chave de API (KEY_REVOKED)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { genLicenseKey, genApiKey } from '@/lib/keys'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

const typeSchema = z.object({
  type: z.enum(['LICENSE', 'API'], { message: "Tipo deve ser 'LICENSE' ou 'API'" }),
})

const patchSchema = z.object({
  type: z.enum(['LICENSE', 'API'], { message: "Tipo deve ser 'LICENSE' ou 'API'" }),
  status: z.enum(['ACTIVE', 'REVOKED'], { message: "Estado deve ser 'ACTIVE' ou 'REVOKED'" }),
})

async function getCompany(id: string) {
  return db.company.findUnique({
    where: { id },
    select: { id: true, name: true, licenseKey: true, apiKey: true },
  })
}

/* ------------------------------------------------------------------ */
/* POST — regenerar chave                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const company = await getCompany(id)
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = typeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { type } = parsed.data

    if (type === 'LICENSE') {
      let licenseKey = genLicenseKey()
      for (let i = 0; i < 5; i++) {
        const exists = await db.company.findUnique({
          where: { licenseKey },
          select: { id: true },
        })
        if (!exists || exists.id === id) break
        licenseKey = genLicenseKey()
      }
      await db.company.update({
        where: { id },
        data: { licenseKey, licenseStatus: 'ACTIVE' },
      })
      await logAudit({
        action: 'KEY_REGENERATED',
        entityType: 'Company',
        entityId: id,
        entityName: company.name,
        details: 'Chave de licença regenerada',
        actorEmail: user.email,
      })
      return NextResponse.json({ licenseKey })
    }

    let apiKey = genApiKey()
    for (let i = 0; i < 5; i++) {
      const exists = await db.company.findUnique({ where: { apiKey }, select: { id: true } })
      if (!exists || exists.id === id) break
      apiKey = genApiKey()
    }
    await db.company.update({
      where: { id },
      data: { apiKey, apiKeyStatus: 'ACTIVE' },
    })
    await logAudit({
      action: 'KEY_REGENERATED',
      entityType: 'Company',
      entityId: id,
      entityName: company.name,
      details: 'Chave de API regenerada',
      actorEmail: user.email,
    })
    return NextResponse.json({ apiKey })
  } catch (err) {
    console.error('[POST /api/companies/:id/keys]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* PATCH — activar / revogar chave                                     */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { id } = await params

    const company = await getCompany(id)
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { type, status } = parsed.data

    if (type === 'LICENSE') {
      await db.company.update({ where: { id }, data: { licenseStatus: status } })
      await logAudit({
        action: 'KEY_REVOKED',
        entityType: 'Company',
        entityId: id,
        entityName: company.name,
        details:
          status === 'REVOKED'
            ? 'Chave de licença revogada'
            : 'Chave de licença reactivada',
        actorEmail: user.email,
      })
      return NextResponse.json({ licenseStatus: status })
    }

    await db.company.update({ where: { id }, data: { apiKeyStatus: status } })
    await logAudit({
      action: 'KEY_REVOKED',
      entityType: 'Company',
      entityId: id,
      entityName: company.name,
      details:
        status === 'REVOKED' ? 'Chave de API revogada' : 'Chave de API reactivada',
      actorEmail: user.email,
    })
    return NextResponse.json({ apiKeyStatus: status })
  } catch (err) {
    console.error('[PATCH /api/companies/:id/keys]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
