import type { RecurringRule } from '@/lib/supabase/types'

export type { RecurringRule }

export interface RecurringRuleRow extends RecurringRule {
  creditors?: { name: string } | null
  debt_categories?: { name: string; code: string } | null
}

export interface RunGenerationResult {
  companyId: string
  windowStart?: string
  windowEnd?: string
  rulesChecked: number
  created: number
  /** Périodes déjà couvertes par une dette existante (next_run_date avancé quand même) */
  alreadyGenerated: number
  errors: string[]
}
