import type { AlertSeverity, AlertType } from '@/lib/supabase/types'

export interface Alert {
  id: string
  groupId: string | null
  companyId: string | null
  alertType: AlertType
  severity: AlertSeverity
  title: string
  message: string
  entityType: string
  entityId: string | null
  isRead: boolean
  createdAt: string
  resolvedAt: string | null
}

export interface CompanyAlertsResult {
  companyId: string
  critical: number
  warnings: number
  infos: number
  alerts: Alert[]
}

export interface GroupAlertsResult {
  groupId: string
  critical: number
  warnings: number
  infos: number
  alerts: Alert[]
}
