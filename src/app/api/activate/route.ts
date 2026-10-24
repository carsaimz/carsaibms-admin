/**
 * /api/activate
 * POST — activação de licença pelo INSTALADOR do Carsai BMS (público, sem sessão).
 * Chave de licença: CARSAI-LIC-XXXX-XXXX-XXXX · chave de API: sk_live_…
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

const activateSchema = z.object({
  licenseKey: z
    .string({ message: 'Chave de licença é obrigatória' })
    .trim()
    .min(8, 'Chave de licença inválida')
    .max(64, 'Chave de licença inválida'),
  apiKey: z.string().trim().optional().nullable(),
  domain: z.string().trim().max(255).optional().nullable(),
})

/**
 * Máscara segura da chave de licença para auditoria (nunca registar a chave completa).
 * Ex.: CARSAI-LIC-AB2D-EF3G → CARSAI-LIC-••••-EF3G
 */
function maskLicenseKey(key: string): string {
  return `${key.slice(0, 10)}-••••-${key.slice(-4)}`
}

/* ------------------------------------------------------------------ */
/* POST — activar licença                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = activateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Normalização: trim + uppercase (o instalador pode enviar em minúsculas)
    const licenseKey = parsed.data.licenseKey.toUpperCase()
    // apiKey/domain: ausentes, null ou vazios → "não fornecidos"
    const apiKey = parsed.data.apiKey || undefined
    const domain = parsed.data.domain || undefined

    const company = await db.company.findUnique({
      where: { licenseKey },
      include: {
        plan: { include: { modules: { include: { module: true } } } },
        modules: { include: { module: true } },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Licença inválida' }, { status: 404 })
    }

    // A chave de API só é validada quando fornecida; caso contrário, apiKeyStatus é ignorado
    if (apiKey !== undefined && apiKey !== company.apiKey) {
      return NextResponse.json({ error: 'Chave de API inválida' }, { status: 401 })
    }
    if (apiKey !== undefined && company.apiKeyStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Chave de API revogada' }, { status: 403 })
    }

    if (company.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Conta suspensa. Contacte a Carsai.' }, { status: 403 })
    }
    if (company.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Conta cancelada.' }, { status: 403 })
    }
    if (company.licenseStatus === 'REVOKED') {
      return NextResponse.json({ error: 'Licença revogada.' }, { status: 403 })
    }
    if (company.expiresAt && company.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Licença expirada.' }, { status: 403 })
    }

    // Módulos do plano. Plano "ALL" (Empresarial) → todos os módulos activos do sistema.
    const isAllPlan = company.plan?.slug === 'empresarial'
    const moduleSort = new Map<string, number>()

    let planKeys: string[] = []
    if (company.plan) {
      if (isAllPlan) {
        const activeModules = await db.module.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        })
        planKeys = activeModules.map((m) => m.key)
        for (const m of activeModules) moduleSort.set(m.key, m.sortOrder)
      } else {
        planKeys = company.plan.modules.map((pm) => pm.module.key)
        for (const pm of company.plan.modules) moduleSort.set(pm.module.key, pm.module.sortOrder)
      }
    }

    // Plano de módulos EFFECTIVO = módulos do plano ∪ CompanyModules isEnabled
    const enabledKeys = company.modules.filter((cm) => cm.isEnabled).map((cm) => cm.module.key)
    for (const cm of company.modules) moduleSort.set(cm.module.key, cm.module.sortOrder)

    const effectiveKeys = [...new Set([...planKeys, ...enabledKeys])].sort(
      (a, b) => (moduleSort.get(a) ?? 999) - (moduleSort.get(b) ?? 999)
    )

    await logAudit({
      action: 'LICENSE_ACTIVATED',
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      details: JSON.stringify({
        domain: domain ?? null,
        licenseKey: maskLicenseKey(licenseKey),
        apiKeyUsed: apiKey !== undefined,
      }),
    })

    return NextResponse.json({
      ok: true,
      activatedAt: new Date().toISOString(),
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
      },
      plan: company.plan
        ? {
            name: company.plan.name,
            slug: company.plan.slug,
            maxUsers: company.plan.maxUsers,
            modules: planKeys,
          }
        : null,
      modules: effectiveKeys,
      expiresAt: company.expiresAt ? company.expiresAt.toISOString() : null,
    })
  } catch (err) {
    console.error('[POST /api/activate]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* Outros métodos → 405                                                */
/* ------------------------------------------------------------------ */

function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Método não permitido. Use POST.' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export const GET = methodNotAllowed
export const PUT = methodNotAllowed
export const PATCH = methodNotAllowed
export const DELETE = methodNotAllowed
export const HEAD = methodNotAllowed
export const OPTIONS = methodNotAllowed
