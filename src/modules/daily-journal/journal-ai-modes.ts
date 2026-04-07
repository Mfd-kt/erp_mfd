import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Brain,
  Briefcase,
  Flame,
  GitBranch,
  HelpCircle,
  LineChart,
  Moon,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'

export type JournalAiModeId =
  | 'month_synthesis'
  | 'urgent'
  | 'clarity'
  | 'patterns'
  | 'ceo'
  | 'unblock'
  | 'progress'
  | 'reframe'
  | 'evening'
  | 'decision'
  | 'vision'
  | 'action_plan'

export type JournalAiModeMeta = {
  id: JournalAiModeId
  title: string
  shortLabel: string
  description: string
  icon: LucideIcon
  needsExtraText: boolean
  usesEntrySnapshot: boolean
  loadsHistory: 'none' | 'last10' | 'last20'
  /** Mise en avant visuelle (mode urgence). */
  critical?: boolean
}

export const JOURNAL_AI_MODES: JournalAiModeMeta[] = [
  {
    id: 'urgent',
    title: 'Mode urgence (cash 24–48h)',
    shortLabel: 'Urgence',
    description: 'Cash, délai court, actions immédiates — zéro plan long terme.',
    icon: Flame,
    needsExtraText: false,
    usesEntrySnapshot: true,
    loadsHistory: 'none',
    critical: true,
  },
  {
    id: 'clarity',
    title: 'Clarté mentale',
    shortLabel: 'Clarté',
    description: 'Ressenti, vrai problème, actions 24–48h (pas de blabla).',
    icon: Brain,
    needsExtraText: false,
    usesEntrySnapshot: true,
    loadsHistory: 'none',
  },
  {
    id: 'patterns',
    title: 'Patterns (10 entrées)',
    shortLabel: 'Patterns',
    description: 'Schémas, erreurs répétées, stress, leviers — synthèse actionnable.',
    icon: BarChart3,
    needsExtraText: false,
    usesEntrySnapshot: false,
    loadsHistory: 'last10',
  },
  {
    id: 'ceo',
    title: 'Mode CEO (brutal)',
    shortLabel: 'CEO',
    description: 'Verdict sans filtre : fragilités, illusions, dépendances, actions 7 j.',
    icon: Briefcase,
    needsExtraText: true,
    usesEntrySnapshot: false,
    loadsHistory: 'none',
  },
  {
    id: 'unblock',
    title: 'Débloquer une situation',
    shortLabel: 'Déblocage',
    description: '5 questions serrées + 3 options avec 1ère action physique.',
    icon: HelpCircle,
    needsExtraText: true,
    usesEntrySnapshot: false,
    loadsHistory: 'none',
  },
  {
    id: 'progress',
    title: 'Progression personnelle',
    shortLabel: 'Progression',
    description: 'Notes /10 + plan 7 jours (1 action vérifiable par jour).',
    icon: LineChart,
    needsExtraText: false,
    usesEntrySnapshot: true,
    loadsHistory: 'none',
  },
  {
    id: 'reframe',
    title: 'Reprogrammation mentale',
    shortLabel: 'Reframe',
    description: 'Négatif → rationnel, stratégique, micro-actions.',
    icon: Sparkles,
    needsExtraText: true,
    usesEntrySnapshot: true,
    loadsHistory: 'none',
  },
  {
    id: 'evening',
    title: 'Journal du soir',
    shortLabel: 'Soir',
    description: 'Bilan + 3 actions demain + score d’exécution.',
    icon: Moon,
    needsExtraText: false,
    usesEntrySnapshot: true,
    loadsHistory: 'none',
  },
  {
    id: 'decision',
    title: 'Décision rapide',
    shortLabel: 'Décision',
    description: 'Risque, gain, pire cas, décision, actions immédiates.',
    icon: Zap,
    needsExtraText: true,
    usesEntrySnapshot: false,
    loadsHistory: 'none',
  },
  {
    id: 'vision',
    title: 'Vision long terme',
    shortLabel: 'Vision',
    description: 'Trajectoire conditionnelle, risques, 3 actions 90 j.',
    icon: GitBranch,
    needsExtraText: false,
    usesEntrySnapshot: false,
    loadsHistory: 'last20',
  },
  {
    id: 'action_plan',
    title: 'Passage à l’action',
    shortLabel: 'Action',
    description: '3 immédiat, 3 semaine, 1 décision — tout exécutable.',
    icon: Target,
    needsExtraText: false,
    usesEntrySnapshot: true,
    loadsHistory: 'none',
  },
]

export function getJournalAiMode(id: JournalAiModeId): JournalAiModeMeta | undefined {
  return JOURNAL_AI_MODES.find((m) => m.id === id)
}
