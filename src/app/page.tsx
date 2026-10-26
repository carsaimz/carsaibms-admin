'use client'

/**
 * Carsai BMS Admin — ponto de entrada.
 * I18nProvider fornece o idioma (pt-MZ / en) a toda a aplicação.
 * AuthGate: verifica a sessão (GET /api/auth/me) e mostra
 * o splash, o login ou o painel administrativo.
 *
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getMe, logout } from '@/lib/bms-api'
import type { User } from '@/lib/bms-api'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { LoginView } from '@/components/bms/login-view'
import { AdminShell } from '@/components/bms/admin-shell'
import { Logo } from '@/components/bms/shared'

type AuthState = 'loading' | 'anon' | 'authed' | 'error'

function Splash({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <Logo size="lg" />
      {error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
          {onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {t('common.retry')}
            </Button>
          ) : null}
        </div>
      ) : (
        <Loader2 className="size-6 animate-spin text-emerald-600 dark:text-emerald-400" aria-label={t('common.loading')} />
      )}
      <p className="text-xs text-muted-foreground">{t('brand.tagline')}</p>
    </div>
  )
}

function AuthGate() {
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AuthState>('loading')
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const runSessionCheck = useCallback(async () => {
    try {
      const me = await getMe()
      if (me) {
        setUser(me)
        setState('authed')
      } else {
        setUser(null)
        setState('anon')
      }
    } catch (e) {
      setUser(null)
      setError(e instanceof Error ? e.message : t('common.networkError'))
      setState('error')
    }
  }, [t])

  const checkSession = useCallback(() => {
    setError(null)
    setState('loading')
    void runSessionCheck()
  }, [runSessionCheck])

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((me) => {
        if (cancelled) return
        if (me) {
          setUser(me)
          setState('authed')
        } else {
          setUser(null)
          setState('anon')
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setUser(null)
        setError(e instanceof Error ? e.message : t('common.networkError'))
        setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      // Cookie pode já estar limpo — seguimos para o login na mesma
    }
    setUser(null)
    setState('anon')
  }, [])

  if (state === 'loading') {
    return <Splash />
  }

  if (state === 'error') {
    return <Splash error={error} onRetry={() => void checkSession()} />
  }

  if (state === 'anon' || !user) {
    return (
      <LoginView
        onSuccess={(u) => {
          setUser(u)
          setState('authed')
        }}
      />
    )
  }

  return <AdminShell user={user} onLogout={handleLogout} />
}

export default function Home() {
  return (
    <I18nProvider>
      <AuthGate />
    </I18nProvider>
  )
}
