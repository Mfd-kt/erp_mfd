import type { Creditor } from '@/lib/supabase/types'

/** Libellé pays pour affichage (champ libre ou nom ISO). */
export function creditorCountryDisplay(c: Creditor): string {
  if (c.address_country?.trim()) return c.address_country.trim()
  if (c.country_code) {
    try {
      return new Intl.DisplayNames(['fr'], { type: 'region' }).of(c.country_code) ?? c.country_code
    } catch {
      return c.country_code
    }
  }
  return '—'
}

/** Lignes type en-tête société (ex. Kavkom, RCS, adresse, etc.). */
export function getCreditorCompanyLines(c: Creditor): string[] {
  const lines: string[] = []
  if (c.company_registration?.trim()) lines.push(c.company_registration.trim())
  if (c.address_street?.trim()) lines.push(c.address_street.trim())
  const postalCity = [c.address_postal_code?.trim(), c.address_city?.trim()].filter(Boolean).join(' ')
  if (postalCity) lines.push(postalCity)
  const country =
    c.address_country?.trim() ||
    (c.country_code ? new Intl.DisplayNames(['fr'], { type: 'region' }).of(c.country_code) : '')
  if (country) lines.push(country)
  return lines
}
