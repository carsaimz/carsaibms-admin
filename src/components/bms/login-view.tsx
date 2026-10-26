'use client'

/**
 * LoginView — ecrã de entrada do Carsai BMS Admin.
 * Split-screen: painel de marca à esquerda (desktop) + card de login à direita.
 * Textos via i18n (pt-MZ / en).
 */

import { useState, type FormEvent } from 'react'
import {
  Blocks,
  Building2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'
import { login } from '@/lib/bms-api'
import type { User } from '@/lib/bms-api'
import { Logo, ThemeToggle, LanguageToggle } from './shared'

const CAPABILITY_KEYS = [
  { icon: Building2, key: 'companies' },
  { icon: Wallet, key: 'plans' },
  { icon: Blocks, key: 'modules' },
  { icon: KeyRound, key: 'keys' },
  { icon: ShieldCheck, key: 'audit' },
] as const

export function LoginView({ onSuccess }: { onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError(t('login.needCredentials'))
      return
    }
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      toast.success(t('login.welcomeBack', { name: user.name.split(' ')[0] }))
      onSuccess(user)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.loginFailed')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Painel de marca (desktop) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-300 lg:flex lg:w-[44%] xl:w-[46%]">
        <div className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full bg-emerald-600/20 blur-[120px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-[380px] rounded-full bg-emerald-500/10 blur-[110px]" aria-hidden />

        <div className="relative">
          <Logo size="md" dark />
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            {t('login.panelTitle')}
          </h1>
          <p className="mt-3 text-lg font-medium text-emerald-400">{t('brand.tagline')}</p>

          <ul className="mt-10 space-y-5">
            {CAPABILITY_KEYS.map((c) => (
              <li key={c.key} className="flex items-start gap-4">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <c.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-zinc-100">
                    {t(`login.capabilities.${c.key}.title`)}
                  </span>
                  <span className="block text-sm text-zinc-400">
                    {t(`login.capabilities.${c.key}.description`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-600">{t('brand.copyright')}</p>
      </aside>

      {/* Área de login */}
      <main className="relative flex min-h-screen flex-1 flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-md">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">{t('login.cardTitle')}</CardTitle>
                <CardDescription>{t('login.cardDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error ? (
                    <Alert variant="destructive" role="alert">
                      <CircleAlert className="size-4" aria-hidden />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('login.email')}</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('login.emailPlaceholder')}
                        className="h-11 pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t('login.password')}</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-11 pl-10 pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="h-11 w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {t('login.entering')}
                      </>
                    ) : (
                      t('login.enter')
                    )}
                  </Button>
                </form>

                <div className="mt-6 rounded-lg border border-dashed p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{t('login.demo')}</span>{' '}
                    <code className="font-mono">admin@carsai.co.mz</code> · <code className="font-mono">Admin@2025</code>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-8 text-xs text-emerald-700 dark:text-emerald-400"
                    onClick={() => {
                      setEmail('admin@carsai.co.mz')
                      setPassword('Admin@2025')
                      setError(null)
                    }}
                  >
                    {t('login.fillDemo')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
              {t('brand.footer')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
