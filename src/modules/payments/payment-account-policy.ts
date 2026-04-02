import type { AccountType } from '@/lib/supabase/types'

/** Valeurs alignées sur `paymentSchema` */
export type PaymentMethodDb = 'bank_transfer' | 'cash' | 'card' | 'check' | 'other'

/**
 * Types de compte autorisés pour un moyen de paiement.
 * — Espèces → uniquement compte « cash »
 * — Virement / chèque → compte banque
 * — Carte → banque ou compte carte (ou portefeuille pour du digital)
 */
export function allowedAccountTypesForPaymentMethod(method: PaymentMethodDb): AccountType[] {
  switch (method) {
    case 'cash':
      return ['cash']
    case 'bank_transfer':
    case 'check':
      return ['bank']
    case 'card':
      return ['bank', 'card', 'wallet']
    case 'other':
      return ['bank', 'cash', 'card', 'wallet']
  }
}

/**
 * Moyens autorisés pour un type de compte (ex. page détail d’un compte avec compte fixe).
 */
export function allowedPaymentMethodsForAccountType(accountType: AccountType): PaymentMethodDb[] {
  switch (accountType) {
    case 'cash':
      return ['cash']
    case 'bank':
      return ['bank_transfer', 'check', 'card', 'other']
    case 'card':
      return ['card', 'other', 'bank_transfer']
    case 'wallet':
      return ['card', 'other', 'bank_transfer']
  }
}

export function assertAccountMatchesPaymentMethod(accountType: AccountType, method: PaymentMethodDb): void {
  const allowed = allowedAccountTypesForPaymentMethod(method)
  if (!allowed.includes(accountType)) {
    const hint =
      method === 'cash'
        ? 'Pour des paiements en espèces, sélectionnez un compte de type « Espèces » (caisse).'
        : method === 'bank_transfer' || method === 'check'
          ? 'Pour virement ou chèque, utilisez un compte bancaire.'
          : method === 'card'
            ? 'Pour carte, utilisez un compte banque, carte ou portefeuille.'
            : 'Le type de compte ne correspond pas au moyen de paiement.'
    throw new Error(hint)
  }
}
