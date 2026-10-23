/**
 * POST /api/auth/login — autentica utilizador do painel e define cookie de sessão.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { signToken, setSessionCookie, publicUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const loginSchema = z.object({
  email: z
    .string({ message: 'Email é obrigatório' })
    .trim()
    .min(1, 'Email é obrigatório')
    .regex(EMAIL_RE, 'Email inválido'),
  password: z
    .string({ message: 'Password é obrigatória' })
    .min(1, 'Password é obrigatória'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const email = parsed.data.email.trim().toLowerCase()
    const user = await db.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      await logAudit({
        action: 'LOGIN_FAILED',
        entityType: 'Auth',
        entityName: email,
        details: 'Tentativa de login com credenciais inválidas',
        actorEmail: email,
      })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Conta desactivada' }, { status: 403 })
    }

    const now = new Date()
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: now } })
    await setSessionCookie(signToken(user.id))
    await logAudit({
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: user.id,
      entityName: user.email,
      details: 'Sessão iniciada',
      actorEmail: user.email,
    })

    return NextResponse.json({ user: publicUser({ ...user, lastLoginAt: now }) })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
