export type MembershipRole = 'group_admin' | 'company_admin' | 'finance_manager' | 'viewer'
export type DebtStatus = 'draft' | 'open' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue'
export type DebtPriority = 'critical' | 'high' | 'normal' | 'low'
export type AccountType = 'bank' | 'cash' | 'card' | 'wallet'
export type CreditorType = 'person' | 'company' | 'employee' | 'government' | 'landlord' | 'bank' | 'other'
export type RevenueStatus = 'expected' | 'partial' | 'received' | 'cancelled'
export type RevenueCategory = 'client' | 'goods_sale' | 'other'
export type FrequencyType = 'monthly' | 'quarterly' | 'yearly'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertType =
  | 'debt_overdue'
  | 'debt_due_soon'
  | 'debt_critical_unpaid'
  | 'treasury_negative_projection'
  | 'treasury_low_buffer'
  | 'revenue_overdue'
  | 'revenue_partial_overdue'
  | 'forecast_missing_fx'
  | 'forecast_incomplete'
export type NotificationType = 'info' | 'warning' | 'critical' | 'success'

export interface Group {
  id: string
  name: string
  base_currency: string
  created_at: string
}

export type CompanyType = 'business' | 'personal'

export interface Company {
  id: string
  group_id: string
  type: CompanyType
  legal_name: string
  trade_name: string | null
  country_code: string
  default_currency: string
  timezone: string
  is_active: boolean
  created_at: string
}

export interface Membership {
  id: string
  user_id: string
  group_id: string
  company_id: string | null
  role: MembershipRole
  created_at: string
}

export interface UserProfile {
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CompanyMemberInvitation {
  id: string
  company_id: string
  group_id: string
  email: string
  role: 'company_admin' | 'finance_manager' | 'viewer'
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  invitation_token: string
  expires_at: string
  last_sent_at: string
  sent_count: number
  invited_by_user_id: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface Creditor {
  id: string
  company_id: string
  name: string
  creditor_type: CreditorType
  country_code: string | null
  phone: string | null
  email: string | null
  notes: string | null
  /** Immatriculation (ex. R.C.S PARIS 845151067). */
  company_registration: string | null
  address_street: string | null
  address_postal_code: string | null
  address_city: string | null
  /** Pays libellé pour courriers / PDF ; si vide, dérivé de country_code. */
  address_country: string | null
  created_at: string
}

export interface DebtType {
  id: string
  company_id: string | null
  code: string
  name: string
  description: string | null
  created_at: string
}

export interface DebtCategory {
  id: string
  company_id: string | null
  debt_type_id: string
  code: string
  name: string
  description: string | null
  is_payroll: boolean
  is_recurring_default: boolean
  created_at: string
}

export interface Account {
  id: string
  company_id: string
  name: string
  account_type: AccountType
  currency_code: string
  opening_balance: number
  current_balance_cached: number
  /** Ajustement manuel (réconciliation) — voir vue accounts_with_balance */
  balance_reconciliation?: number
  is_active: boolean
  created_at: string
}

export interface AccountWithBalance extends Account {
  computed_balance: number
}

export interface Debt {
  id: string
  company_id: string
  creditor_id: string
  debt_category_id: string
  title: string
  description: string | null
  amount_original: number
  currency_code: string
  fx_rate_to_company_currency: number | null
  amount_company_currency: number
  due_date: string | null
  incurred_date: string
  status: DebtStatus
  priority: DebtPriority
  is_recurring_instance: boolean
  source_recurring_rule_id: string | null
  generated_period_key: string | null
  notes: string | null
  created_at: string
}

export interface DebtWithRemaining extends Debt {
  paid_company_currency: number
  remaining_company_currency: number
  computed_status: DebtStatus
}

export interface Payment {
  id: string
  company_id: string
  debt_id: string | null
  account_id: string
  payment_date: string
  amount: number
  currency_code: string
  fx_rate_to_company_currency: number | null
  amount_company_currency: number
  payment_method: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

export interface Revenue {
  id: string
  company_id: string
  title: string
  client_id: string | null
  revenue_category: RevenueCategory
  source_name: string | null
  amount_expected: number
  amount_received: number
  currency_code: string
  account_id: string | null
  expected_date: string
  received_date: string | null
  status: RevenueStatus
  notes: string | null
  created_at: string
}

export interface RevenueClient {
  id: string
  company_id: string
  name: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RecurringRule {
  id: string
  company_id: string
  creditor_id: string | null
  debt_category_id: string
  title: string
  template_description: string | null
  amount: number
  currency_code: string
  frequency: FrequencyType
  interval_count: number
  day_of_month: number | null
  month_of_year: number | null
  start_date: string
  end_date: string | null
  next_run_date: string
  auto_generate: boolean
  is_active: boolean
  last_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  company_id: string
  user_id: string | null
  action_type: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  company_id: string | null
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

export interface AutomationRule {
  id: string
  company_id: string
  name: string
  trigger_type: string
  condition_json: Record<string, unknown> | null
  action_json: Record<string, unknown> | null
  is_active: boolean
  created_at: string
}

export interface Webhook {
  id: string
  company_id: string
  event_type: string
  url: string
  secret: string | null
  is_active: boolean
  created_at: string
}

/** Taux pour consolidation multi-devises (1 unité from = rate unités to). */
export interface ExchangeRate {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  rate_date: string
  created_at: string
}

/** Tables Google Calendar (Sprint B) — typage client léger. */
export interface GoogleCalendarTokenRow {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  token_expiry: string
  scope: string | null
  created_at: string
  updated_at: string
}

export interface GoogleCalendarSelectionRow {
  id: string
  user_id: string
  calendar_id: string
  calendar_name: string
  color: string | null
  is_selected: boolean
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      groups: { Row: Group; Insert: Omit<Group, 'id' | 'created_at'>; Update: Partial<Omit<Group, 'id'>> }
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at'>; Update: Partial<Omit<Company, 'id'>> }
      memberships: { Row: Membership; Insert: Omit<Membership, 'id' | 'created_at'>; Update: Partial<Omit<Membership, 'id'>> }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
        Update: Partial<Omit<UserProfile, 'user_id' | 'created_at'>>
      }
      company_member_invitations: {
        Row: CompanyMemberInvitation
        Insert: Omit<CompanyMemberInvitation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CompanyMemberInvitation, 'id' | 'company_id' | 'group_id' | 'created_at'>>
      }
      creditors: { Row: Creditor; Insert: Omit<Creditor, 'id' | 'created_at'>; Update: Partial<Omit<Creditor, 'id'>> }
      debt_types: { Row: DebtType; Insert: Omit<DebtType, 'id' | 'created_at'>; Update: Partial<Omit<DebtType, 'id'>> }
      debt_categories: { Row: DebtCategory; Insert: Omit<DebtCategory, 'id' | 'created_at'>; Update: Partial<Omit<DebtCategory, 'id'>> }
      accounts: { Row: Account; Insert: Omit<Account, 'id' | 'created_at'>; Update: Partial<Omit<Account, 'id'>> }
      debts: { Row: Debt; Insert: Omit<Debt, 'id' | 'created_at'>; Update: Partial<Omit<Debt, 'id'>> }
      payments: { Row: Payment; Insert: Omit<Payment, 'id' | 'created_at'>; Update: Partial<Omit<Payment, 'id'>> }
      revenues: { Row: Revenue; Insert: Omit<Revenue, 'id' | 'created_at'>; Update: Partial<Omit<Revenue, 'id'>> }
      recurring_rules: { Row: RecurringRule; Insert: Omit<RecurringRule, 'id' | 'created_at'>; Update: Partial<Omit<RecurringRule, 'id'>> }
      activity_logs: { Row: ActivityLog; Insert: Omit<ActivityLog, 'id' | 'created_at'>; Update: Partial<Omit<ActivityLog, 'id'>> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Omit<Notification, 'id'>> }
      automation_rules: { Row: AutomationRule; Insert: Omit<AutomationRule, 'id' | 'created_at'>; Update: Partial<Omit<AutomationRule, 'id'>> }
      webhooks: { Row: Webhook; Insert: Omit<Webhook, 'id' | 'created_at'>; Update: Partial<Omit<Webhook, 'id'>> }
      exchange_rates: {
        Row: ExchangeRate
        Insert: Omit<ExchangeRate, 'id' | 'created_at'>
        Update: Partial<Omit<ExchangeRate, 'id' | 'created_at'>>
      }
      google_calendar_tokens: {
        Row: GoogleCalendarTokenRow
        Insert: Omit<GoogleCalendarTokenRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<GoogleCalendarTokenRow, 'id' | 'user_id'>>
      }
      google_calendar_selections: {
        Row: GoogleCalendarSelectionRow
        Insert: Omit<GoogleCalendarSelectionRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<GoogleCalendarSelectionRow, 'id' | 'user_id'>>
      }
    }
    Views: {
      debts_with_remaining: { Row: DebtWithRemaining }
      accounts_with_balance: { Row: AccountWithBalance }
    }
  }
}
