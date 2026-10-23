/**
 * Utilitários de formatação — pt-PT / Africa/Maputo
 * Carsai BMS Admin — CarsaiDev
 */

const decimalFmt = new Intl.NumberFormat('pt-PT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formata um valor em meticais: 3500 → "3 500,00 MTn" */
export function formatMZN(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `${decimalFmt.format(n)} MTn`
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const dateFmt = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Africa/Maputo',
})

const dateTimeFmt = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Maputo',
})

/** "12/03/2025" */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateFmt.format(d) : '—'
}

/** "12/03/2025 14:32" */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateTimeFmt.format(d) : '—'
}

/** Tempo relativo: "agora mesmo", "há 5 min", "há 3 horas", "há 2 dias", "há 2 semanas" */
export function formatRelative(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return formatDate(d)
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  if (days < 31) {
    const weeks = Math.floor(days / 7)
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  }
  return formatDate(d)
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
