/**
 * Autenticação — Carsai BMS Admin
 * Sessão por cookie httpOnly `bms_token` com token HMAC-SHA256 (node:crypto).
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { User } from '@prisma/client'
import { db } from '@/lib/db'

const SECRET = process.env.AUTH_SECRET || 'carsai-bms-admin-dev-secret-2025'

export const SESSION_COOKIE = 'bms_token'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
const SESSION_TTL_S = 7 * 24 * 60 * 60 // 7 dias em segundos

/* ------------------------------------------------------------------ */
/* Token: payload base64url JSON {uid, exp} + assinatura HMAC-SHA256   */
/* ------------------------------------------------------------------ */

export function signToken(uid: string): string {
  const payload = JSON.stringify({ uid, exp: Date.now() + SESSION_TTL_MS })
  const body = Buffer.from(payload, 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyToken(token: string): { uid: string } | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')

  const a = Buffer.from(signature, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      uid?: unknown
      exp?: unknown
    }
    if (typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null
    if (!Number.isFinite(parsed.exp) || Date.now() > parsed.exp) return null
    return { uid: parsed.uid }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Sessão                                                              */
/* ------------------------------------------------------------------ */

/**
 * Lê o cookie de sessão, valida o token (assinatura + exp) e devolve
 * o utilizador da BD — apenas se existir e estiver activo.
 */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await db.user.findUnique({ where: { id: payload.uid } })
  if (!user || !user.isActive) return null
  return user
}

/**
 * Alias de getSessionUser — devolve o utilizador autenticado ou null.
 */
export async function requireAuth(): Promise<User | null> {
  return getSessionUser()
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_S,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  })
}

/* ------------------------------------------------------------------ */
/* Prospecção pública de utilizador (sem dados sensíveis)              */
/* ------------------------------------------------------------------ */

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}
