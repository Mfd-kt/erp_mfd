const KEY_LABELS: Record<string, string> = {
  debt_id: 'Dette',
  revenue_id: 'Revenu',
  account_id: 'Compte',
  amount: 'Montant',
  amount_received: 'Montant reçu',
  amount_expected: 'Montant attendu',
  currency_code: 'Devise',
  payment_method: 'Moyen de paiement',
  reference: 'Référence',
}

export function formatActivityMetadata(
  metadata: Record<string, unknown> | null | undefined,
  actionType?: string
) {
  if (!metadata) return null
  if (actionType === 'task_auto_completed' && metadata.reason) {
    return `(${String(metadata.reason)})`
  }
  const entries = Object.entries(metadata)
  if (!entries.length) return null
  return entries
    .map(([key, value]) => {
      const label = KEY_LABELS[key] ?? key.replaceAll('_', ' ')
      return `${label}: ${String(value)}`
    })
    .join(' · ')
}
