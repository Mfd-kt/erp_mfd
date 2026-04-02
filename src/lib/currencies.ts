import { z } from 'zod'

/** Devises autorisées dans l’application (sélection unique partout). */
export const SUPPORTED_CURRENCY_CODES = ['TND', 'EUR', 'USD'] as const
export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number]

export const CURRENCY_OPTIONS: { code: SupportedCurrencyCode; label: string }[] = [
  { code: 'TND', label: 'TND — Dinar tunisien' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'USD', label: 'USD — Dollar US' },
]

export const currencyCodeSchema = z.enum(SUPPORTED_CURRENCY_CODES)

export function normalizeCurrencyCode(code: string | null | undefined): SupportedCurrencyCode {
  const c = String(code ?? 'EUR')
    .trim()
    .toUpperCase()
  return (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(c) ? (c as SupportedCurrencyCode) : 'EUR'
}

/** Pour filtres optionnels : chaîne vide ou devise hors liste → « toutes les devises ». */
export function normalizeOptionalCurrencyFilter(code: string | null | undefined): '' | SupportedCurrencyCode {
  if (code == null || String(code).trim() === '') return ''
  const c = String(code).trim().toUpperCase()
  return (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(c) ? (c as SupportedCurrencyCode) : ''
}
