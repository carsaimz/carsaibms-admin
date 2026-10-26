'use client'

/**
 * Núcleo i18n da plataforma Carsai BMS Admin.
 *
 * Provider client-side com persistência em localStorage (chave
 * `carsai-locale`), lookup por caminho "a.b.c" com interpolação
 * `{variavel}` e fallback pt → en → própria chave.
 *
 * O locale vive num store externo lido via useSyncExternalStore:
 * durante a hidratação usa sempre 'pt' (server snapshot) e depois
 * re-verifica o valor guardado — sem mismatch e sem setState em effects.
 *
 * Uso:
 *   const { t, locale, setLocale } = useI18n()
 *   t('common.save') · t('login.welcomeBack', { name: 'Ana' })
 *
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'

import { setFormatLocale } from '@/lib/format'
import { CORE_LOCALES, LOCALES, LOCALE_STORAGE_KEY, type Locale } from './locales'
import { companiesPt, companiesEn } from './views-companies'
import { systemPt, systemEn } from './views-system'
import { billingPt, billingEn } from './views-billing'

type Dict = Record<string, unknown>

const DICTIONARIES: Record<Locale, Dict> = {
  pt: { ...CORE_LOCALES.pt, ...companiesPt, ...systemPt, ...billingPt },
  en: { ...CORE_LOCALES.en, ...companiesEn, ...systemEn, ...billingEn },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  locales: typeof LOCALES
  t: (path: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

/* ------------------------------------------------------------------ */
/* Store externo do locale (memória + localStorage)                    */
/* ------------------------------------------------------------------ */

let currentLocale: Locale = 'pt'
let storeInitialized = false
const listeners = new Set<() => void>()

function ensureStoreInitialized(): void {
  if (storeInitialized || typeof window === 'undefined') return
  storeInitialized = true
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'en' || stored === 'pt') currentLocale = stored
  } catch {
    // localStorage indisponível — mantém 'pt'
  }
  setFormatLocale(currentLocale)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getLocaleSnapshot(): Locale {
  ensureStoreInitialized()
  return currentLocale
}

function getServerLocaleSnapshot(): Locale {
  return 'pt'
}

function setGlobalLocale(next: Locale): void {
  ensureStoreInitialized()
  if (next === currentLocale) return
  currentLocale = next
  setFormatLocale(next)
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
  } catch {
    // localStorage indisponível — apenas estado em memória
  }
  for (const listener of listeners) listener()
}

/* ------------------------------------------------------------------ */
/* Tradução                                                            */
/* ------------------------------------------------------------------ */

function lookup(dict: Dict, path: string): string | undefined {
  let acc: unknown = dict
  for (const part of path.split('.')) {
    if (acc && typeof acc === 'object' && part in (acc as Dict)) {
      acc = (acc as Dict)[part]
    } else {
      return undefined
    }
  }
  return typeof acc === 'string' ? acc : undefined
}

function translate(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTIONARIES[locale], path) ?? lookup(DICTIONARIES.pt, path) ?? path
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  )
}

/* ------------------------------------------------------------------ */
/* Provider e hook                                                     */
/* ------------------------------------------------------------------ */

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocaleSnapshot, getServerLocaleSnapshot)

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'pt-MZ'
    setFormatLocale(locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => setGlobalLocale(next), [])

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => translate(locale, path, vars),
    [locale]
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, locales: LOCALES, t }),
    [locale, setLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n deve ser usado dentro de <I18nProvider>')
  }
  return ctx
}

/** Traduz a partir de fora de componentes (helpers pontuais). */
export function translateStatic(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  return translate(locale, path, vars)
}
