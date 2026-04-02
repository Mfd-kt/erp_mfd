'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Company, CompanyType, Group, MembershipRole } from '@/lib/supabase/types'
import {
  LayoutDashboard, CreditCard, Users, Tag, FolderOpen,
  RefreshCw, TrendingUp, Wallet, BarChart3, ChevronDown, Building2, Settings, LineChart, PieChart, Bell, History, Globe, Target, ListTodo, Calendar, Bot, Radio, SlidersHorizontal, ShieldCheck, Banknote
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  companies: Company[]
  group: Group | null
  role: MembershipRole
  isGroupAdmin: boolean
}

const pilotageItems = (companyId: string) => [
  { href: `/app/${companyId}/dashboard`, label: 'Tableau de bord', icon: LayoutDashboard },
  { href: `/app/${companyId}/forecast`, label: 'Prévision', icon: LineChart },
  { href: `/app/${companyId}/analytics`, label: 'Analytique', icon: PieChart },
  { href: `/app/${companyId}/pilotage`, label: 'Pilotage financier', icon: Target },
  { href: `/app/${companyId}/alerts`, label: 'Alertes', icon: Bell },
]

const financeItems = (companyId: string) => [
  { href: `/app/${companyId}/debts`, label: 'Dettes', icon: CreditCard },
  { href: `/app/${companyId}/debts/archived`, label: 'Dettes archivées', icon: History },
  { href: `/app/${companyId}/payments`, label: 'Paiements', icon: Wallet },
  { href: `/app/${companyId}/revenues`, label: 'Revenus', icon: TrendingUp },
  { href: `/app/${companyId}/accounts`, label: 'Comptes', icon: BarChart3 },
]

const systemItems = (companyId: string) => [
  { href: `/app/${companyId}/notifications`, label: 'Notifications', icon: Bell },
  { href: `/app/${companyId}/activity`, label: 'Activité', icon: History },
  { href: `/app/${companyId}/automations`, label: 'Automations', icon: Settings },
  { href: `/app/${companyId}/webhooks`, label: 'Webhooks', icon: Settings },
  { href: `/app/${companyId}/recurring-rules`, label: 'Récurrences', icon: RefreshCw },
]

const referentielItems = (companyId: string) => [
  { href: `/app/${companyId}/team`, label: 'Équipe', icon: ShieldCheck },
  { href: `/app/${companyId}/creditors`, label: 'Créanciers', icon: Users },
  { href: `/app/${companyId}/debt-categories`, label: 'Catégories', icon: Tag },
  { href: `/app/${companyId}/debt-types`, label: 'Types', icon: FolderOpen },
]

export default function Sidebar({ companies, group, role, isGroupAdmin }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const currentCompanyId = pathname.split('/')[2]
  const currentCompany = companies.find(c => c.id === currentCompanyId) ?? companies[0]
  const isViewerOnly = role === 'viewer'
  const companyPilotage = isViewerOnly
    ? (currentCompany ? [{ href: `/app/${currentCompany.id}/dashboard`, label: 'Tableau de bord', icon: LayoutDashboard }] : [])
    : (currentCompany ? pilotageItems(currentCompany.id) : [])
  const companyFinance = isViewerOnly ? [] : (currentCompany ? financeItems(currentCompany.id) : [])
  const companySystem = isViewerOnly ? [] : (currentCompany ? systemItems(currentCompany.id) : [])
  const companyReferentiel = currentCompany
    ? (isViewerOnly
      ? [{ href: `/app/${currentCompany.id}/team`, label: 'Équipe', icon: ShieldCheck }]
      : referentielItems(currentCompany.id))
    : []

  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-zinc-800/80 bg-zinc-950">
      <div className="flex h-16 shrink-0 items-center border-b border-zinc-800/80 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-zinc-950">
            E
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {group?.name ?? 'ERP MFD'}
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Finance exécutive
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-4 pt-4 space-y-4">
        {isGroupAdmin ? (
        <div>
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Groupe · Vue & pilotage
          </p>
          <div className="space-y-1">
            <Link
              href="/app"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <LayoutDashboard size={15} />
              Vue groupe
            </Link>
            <Link
              href="/app/global"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/global'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Globe size={15} />
              Contrôle global
            </Link>
            <Link
              href="/app/forecast"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/forecast'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <LineChart size={15} />
              Prévision groupe
            </Link>
            <Link
              href="/app/analytics"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/analytics'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <PieChart size={15} />
              Analytique groupe
            </Link>
            <Link
              href="/app/exchange-rates"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/exchange-rates'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Banknote size={15} />
              Taux de change
            </Link>
          </div>
        </div>
        ) : null}

        {isGroupAdmin ? (
        <div>
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Exécution
          </p>
          <div className="space-y-1">
            <Link
              href="/app/assistant"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname?.startsWith('/app/assistant')
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Bot size={15} />
              Copilote
            </Link>
            <Link
              href="/app/planning"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/planning'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Target size={15} />
              Plan du jour
            </Link>
            {isGroupAdmin ? (
              <Link
                href="/app/sprints"
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  pathname?.startsWith('/app/sprints')
                    ? 'border-zinc-700 bg-zinc-900 text-white'
                    : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                )}
              >
                <Calendar size={15} />
                Sprints
              </Link>
            ) : null}
            <Link
              href="/app/tasks"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname?.startsWith('/app/tasks')
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <ListTodo size={15} />
              Tâches
            </Link>
          </div>
        </div>
        ) : null}

        {isGroupAdmin ? (
        <div>
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Alertes
          </p>
          <div className="space-y-1">
            <Link
              href="/app/alerts"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/alerts'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Bell size={15} />
              Alertes groupe
            </Link>
          </div>
        </div>
        ) : null}

        {isGroupAdmin ? (
        <div>
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Paramètres
          </p>
          <div className="space-y-1">
            <Link
              href="/app/notifications/channels"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/notifications/channels'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Radio size={15} />
              Canaux
            </Link>
            <Link
              href="/app/notifications/preferences"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/notifications/preferences'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <SlidersHorizontal size={15} />
              Préférences
            </Link>
            <Link
              href="/app/settings/companies"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname === '/app/settings/companies'
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <Building2 size={15} />
              Sociétés
            </Link>
            <Link
              href="/app/admin/jobs"
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                pathname?.startsWith('/app/admin')
                  ? 'border-zinc-700 bg-zinc-900 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
              )}
            >
              <ShieldCheck size={15} />
              Admin
            </Link>
          </div>
        </div>
        ) : null}
      </div>

      {companies.length > 0 && (
        <div className="px-4 pt-5 pb-3">
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Société active
          </p>
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-700"
            >
              <Building2 size={14} className="flex-shrink-0 text-zinc-500" />
              <span className="flex-1 truncate text-left">
                {currentCompany?.trade_name ?? currentCompany?.legal_name ?? 'Société'}
              </span>
              <ChevronDown size={13} className={cn('flex-shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                {(['business', 'personal'] as CompanyType[]).map((sectionType) => {
                  const sectionCompanies = companies.filter((c) => (c.type ?? 'business') === sectionType)
                  if (sectionCompanies.length === 0) return null
                  return (
                    <div key={sectionType}>
                      <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 bg-zinc-900/50">
                        {sectionType === 'personal' ? 'Personnel' : 'Professionnel'}
                      </p>
                      {sectionCompanies.map((c) => (
                        <Link
                          key={c.id}
                          href={`/app/${c.id}/dashboard`}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-zinc-900',
                            c.id === currentCompanyId ? 'text-white' : 'text-zinc-300'
                          )}
                        >
                          <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                            {c.country_code}
                          </span>
                          <span className="flex-1 truncate">{c.trade_name ?? c.legal_name}</span>
                          {c.type === 'personal' && (
                            <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400">
                              Personnel
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {currentCompany && (
        <nav className="flex-1 overflow-y-auto px-4 pb-5 space-y-4">
          <div>
            <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
              Pilotage
            </p>
            <div className="space-y-1">
              {companyPilotage.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                    pathname === href
                      ? 'border-zinc-700 bg-zinc-900 text-white'
                      : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
              Finance
            </p>
            <div className="space-y-1">
              {companyFinance.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                    pathname === href
                      ? 'border-zinc-700 bg-zinc-900 text-white'
                      : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {companySystem.length > 0 ? (
          <div>
            <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
              Système
            </p>
            <div className="space-y-1">
              {companySystem.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                    pathname === href
                      ? 'border-zinc-700 bg-zinc-900 text-white'
                      : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
          ) : null}

          <div>
            <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
              Référentiel
            </p>
            <div className="space-y-1">
              {companyReferentiel.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                    pathname === href
                      ? 'border-zinc-700 bg-zinc-900 text-white'
                      : 'border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
      </div>
    </aside>
  )
}
