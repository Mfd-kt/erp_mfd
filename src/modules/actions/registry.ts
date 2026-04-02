import type { Alert } from '@/modules/alerts/types'

export interface QuickActionItem {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

export function getAlertQuickActions(alert: Alert, companyId?: string): QuickActionItem[] {
  if (alert.entityType === 'debt' && companyId && alert.entityId) {
    return [
      { label: 'Payer maintenant', href: `/app/${companyId}/debts/${alert.entityId}?action=pay`, variant: 'primary' },
      { label: 'Voir la dette', href: `/app/${companyId}/debts/${alert.entityId}`, variant: 'secondary' },
    ]
  }

  if (alert.entityType === 'revenue' && companyId && alert.entityId) {
    return [
      { label: 'Encaisser', href: `/app/${companyId}/revenues/${alert.entityId}?action=receive`, variant: 'primary' },
      { label: 'Voir le revenu', href: `/app/${companyId}/revenues/${alert.entityId}`, variant: 'secondary' },
    ]
  }

  if (alert.alertType === 'treasury_negative_projection' || alert.alertType === 'treasury_low_buffer') {
    if (companyId) {
      return [
        { label: 'Voir la prévision', href: `/app/${companyId}/forecast`, variant: 'primary' },
        { label: 'Voir les comptes', href: `/app/${companyId}/accounts`, variant: 'secondary' },
      ]
    }
    return [{ label: 'Voir la prévision groupe', href: '/app/forecast', variant: 'primary' }]
  }

  if (alert.alertType === 'forecast_missing_fx' || alert.alertType === 'forecast_incomplete') {
    return [
      { label: 'Voir la prévision groupe', href: '/app/forecast', variant: 'primary' },
      { label: 'Taux de change', href: '/app/exchange-rates', variant: 'secondary' },
    ]
  }

  if (companyId) {
    return [{ label: 'Ouvrir', href: `/app/${companyId}/alerts`, variant: 'secondary' }]
  }
  return [{ label: 'Ouvrir', href: '/app/alerts', variant: 'secondary' }]
}
