'use client'

import { cn } from '@/lib/utils'
import {
  CURRENCY_OPTIONS,
  normalizeCurrencyCode,
  type SupportedCurrencyCode,
} from '@/lib/currencies'

const defaultClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export interface CurrencySelectProps {
  value: string
  onChange: (code: SupportedCurrencyCode) => void
  id?: string
  name?: string
  required?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function CurrencySelect({
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  className,
  'aria-label': ariaLabel,
}: CurrencySelectProps) {
  const v = normalizeCurrencyCode(value)
  return (
    <select
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      value={v}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as SupportedCurrencyCode)}
      className={cn(defaultClass, className)}
    >
      {CURRENCY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  )
}

export interface CurrencySelectOptionalProps extends Omit<CurrencySelectProps, 'onChange' | 'value'> {
  value: string
  onChange: (code: SupportedCurrencyCode | '') => void
  emptyLabel?: string
}

/** Filtre avec option « toutes les devises » (valeur vide). */
export function CurrencySelectOptional({
  value,
  onChange,
  emptyLabel = 'Toutes les devises',
  className,
  ...rest
}: CurrencySelectOptionalProps) {
  const hasValue = value !== '' && value != null
  const v = hasValue ? normalizeCurrencyCode(value) : ''
  return (
    <select
      {...rest}
      value={v}
      onChange={(e) => {
        const raw = e.target.value
        onChange(raw === '' ? '' : (raw as SupportedCurrencyCode))
      }}
      className={cn(defaultClass, className)}
    >
      <option value="">{emptyLabel}</option>
      {CURRENCY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  )
}
