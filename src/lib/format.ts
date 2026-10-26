/**
 * Utilitários de formatação — pt-PT / en-GB · Africa/Maputo
 * O locale activo é controlado pelo I18nProvider via setFormatLocale().
 * Carsai BMS Admin — CarsaiDev
 */

import type { Locale } from '@/lib/i18n/locales'

const TIME_ZONE = 'Africa/Maputo'

type NumberFmt = Intl.NumberFormat
type DateFmt = Intl.DateTimeFormat
type RelFmt = Intl.RelativeTimeFormat

const decimalFmtCache: Partial<Record<Locale, NumberFmt>> = {}
const dateFmtCache: Partial<Record<Locale, DateFmt>> = {}
const dateTimeFmtCache: Partial<Record<Locale, DateFmt>> = {}
const relFmtCache: Partial<Record<Locale, RelFmt>> = {}

const BCP47: Record<Locale, string> = { pt: 'pt-PT', en: 'en-GB' }

let activeLocale: Locale = 'pt'

/** Definido pelo I18nProvider sempre que o idioma muda. */
export function setFormatLocale(locale: Locale): void {
  activeLocale = locale
}

function decimalFmt(): NumberFmt {
  let fmt = decimalFmtCache[activeLocale]
  if (!fmt) {
    fmt = new Intl.NumberFormat(BCP47[activeLocale], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    decimalFmtCache[activeLocale] = fmt
  }
  return fmt
}

/** Formata um valor em meticais: 3500 → "3 500,00 MTn" */
export function formatMZN(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `${decimalFmt().format(n)} MTn`
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function dateFmt(): DateFmt {
  let fmt = dateFmtCache[activeLocale]
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(BCP47[activeLocale], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: TIME_ZONE,
    })
    dateFmtCache[activeLocale] = fmt
  }
  return fmt
}

function dateTimeFmt(): DateFmt {
  let fmt = dateTimeFmtCache[activeLocale]
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(BCP47[activeLocale], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TIME_ZONE,
    })
    dateTimeFmtCache[activeLocale] = fmt
  }
  return fmt
}

function relFmt(): RelFmt {
  let fmt = relFmtCache[activeLocale]
  if (!fmt) {
    fmt = new Intl.RelativeTimeFormat(BCP47[activeLocale], { numeric: 'auto' })
    relFmtCache[activeLocale] = fmt
  }
  return fmt
}

/** "12/03/2025" */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateFmt().format(d) : '—'
}

/** "12/03/2025 14:32" */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateTimeFmt().format(d) : '—'
}

/** Tempo relativo localizado: "agora mesmo"/"now", "há 5 minutos"/"5 minutes ago", … */
export function formatRelative(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return formatDate(d)
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return relFmt().format(0, 'minute')
  if (minutes < 60) return relFmt().format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relFmt().format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 31) {
    if (days < 7) return relFmt().format(-days, 'day')
    const weeks = Math.round(days / 7)
    return relFmt().format(-weeks, 'week')
  }
  return formatDate(d)
}

/** "jan/25" a partir de "2025-01" — mês curto no locale activo. */
export function monthShort(ym: string): string {
  const [y, m] = ym.split('-')
  const idx = Number(m) - 1
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return ym
  const label = new Intl.DateTimeFormat(BCP47[activeLocale], { month: 'short' }).format(
    new Date(2024, idx, 1)
  )
  const clean = label.replace('.', '')
  return `${clean}/${(y ?? '').slice(2)}`
}

/** Converte uma data para o formato usado em <input type="date"> (yyyy-MM-dd) */
export function toDateInput(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? d.toISOString().slice(0, 10) : ''
}

/** Iniciais de um nome: "Administrador Carsai" → "AC" */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const out = parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
  return out || '?'
}
