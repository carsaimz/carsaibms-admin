/**
 * /api/users — gestão de utilizadores do painel.
 * GET  — listagem (qualquer sessão válida)
 * POST — criação (só SUPER_ADMIN)
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser, publicUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] as const

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json(users.map(publicUser))
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* POST — só SUPER_ADMIN                                               */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string({ message: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório').max(100, 'Nome demasiado longo'),
  email: z
    .string({ message: 'Email é obrigatório' })
    .trim()
    .min(1, 'Email é obrigatório')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
  password: z
    .string({ message: 'Password é obrigatória' })
    .min(8, 'A password deve ter pelo menos 8 caracteres')
    .max(72, 'Password demasiado longa'),
  role: z.enum(ROLES, { message: 'Papel inválido (SUPER_ADMIN, ADMIN ou SUPPORT)' }),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
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

    const email = data.email.toLowerCase()
    const exists = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (exists) {
      return NextResponse.json({ error: 'Já existe um utilizador com este email' }, { status: 400 })
    }

    const created = await db.user.create({
      data: {
        name: data.name,
        email,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: data.role,
        isActive: true,
      },
    })

    await logAudit({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: created.id,
      entityName: created.email,
      details: `Utilizador criado (${data.name}, papel: ${data.role})`,
      actorEmail: session.email,
    })

    return NextResponse.json(publicUser(created), { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
