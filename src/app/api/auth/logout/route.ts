/**
 * POST /api/auth/logout — termina a sessão e limpa o cookie.
 */
import { NextResponse } from 'next/server'
import { getSessionUser, clearSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const user = await getSessionUser()
    await clearSessionCookie()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[POST /api/auth/logout]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
