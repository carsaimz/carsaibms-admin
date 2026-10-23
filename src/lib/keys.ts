/**
 * Carkeys — Carsai BMS Admin
 * Geradores de chaves, slugs e identificadores únicos.
 * CarsaiDev — Uma linha, uma solução. 🇲🇿
 */
import crypto from 'node:crypto'

/**
 * Alfabeto sem caracteres ambíguos (sem I/O/0/1) para chaves de licença.
 */
const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(length: number, alphabet: string = LICENSE_ALPHABET): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[crypto.randomInt(0, alphabet.length)]
  }
  return out
}

/**
 * Chave de licença no formato CARSAI-LIC-XXXX-XXXX-XXXX.
 */
export function genLicenseKey(): string {
  return `CARSAI-LIC-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`
}

/**
 * Chave de API no formato sk_live_ + 32 caracteres hexadecimais.
 */
export function genApiKey(): string {
  return `sk_live_${crypto.randomBytes(16).toString('hex')}`
}

/**
 * Converte um nome em slug (sem acentos, minúsculas, hífens).
 * Devolve '' se o resultado for vazio — os chamadores devem aplicar fallback.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
