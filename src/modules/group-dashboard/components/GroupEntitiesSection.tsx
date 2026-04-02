'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import type { Company } from '@/lib/supabase/types'
import type { GroupExplainPayload } from '../types'
import { addCompanyMember, createCompany } from '@/modules/companies/actions'
import { createPayment } from '@/modules/payments/actions'
import { CURRENCY_OPTIONS } from '@/lib/currencies'

export interface EntityCardData {
  company: Company
  openDebtDisplay: string
  explainOpenDebt: GroupExplainPayload
  overdueCount: number
  debtsCount: number
  criticalDebtsCount: number
  revenuesExpectedDisplay: string
  revenuesReceivedDisplay: string
  tasksInProgressCount: number
  activeSprintsCount: number
  accounts: Array<{
    id: string
    name: string
    account_type: string
    currency_code: string
    current_balance_display: string
  }>
  debts: Array<{
    id: string
    title: string
    currency_code: string
    remaining_company_currency: number
  }>
  teamMembers: Array<{
    user_id: string
    display_name: string
    role: string
  }>
}

interface GroupEntitiesSectionProps {
  entities: EntityCardData[]
  onOpenExplain: (payload: GroupExplainPayload) => void
  groupId: string | null
  canManage: boolean
}

type NewCompanyFormState = {
  legal_name: string
  trade_name: string
  type: 'business' | 'personal'
  country_code: string
  default_currency: string
  timezone: string
}

const defaultNewCompanyForm: NewCompanyFormState = {
  legal_name: '',
  trade_name: '',
  type: 'business',
  country_code: 'FR',
  default_currency: 'EUR',
  timezone: 'Europe/Paris',
}

export function GroupEntitiesSection({ entities, onOpenExplain, groupId, canManage }: GroupEntitiesSectionProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<EntityCardData | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [paymentEntity, setPaymentEntity] = useState<EntityCardData | null>(null)
  const [paymentDebtId, setPaymentDebtId] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('EUR')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'card' | 'check' | 'other'>('bank_transfer')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [newCompany, setNewCompany] = useState<NewCompanyFormState>(defaultNewCompanyForm)
  const [memberEntity, setMemberEntity] = useState<EntityCardData | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'company_admin' | 'finance_manager' | 'viewer'>('viewer')
  const [memberSaving, setMemberSaving] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  async function handleCreateCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!groupId) {
      setCreateError('Groupe introuvable.')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      await createCompany(groupId, {
        legal_name: newCompany.legal_name.trim(),
        trade_name: newCompany.trade_name.trim() || null,
        type: newCompany.type,
        country_code: newCompany.country_code,
        default_currency: newCompany.default_currency,
        timezone: newCompany.timezone.trim(),
        is_active: true,
      })
      setCreateOpen(false)
      setNewCompany(defaultNewCompanyForm)
      setSuccessToast('Entreprise créée avec succès.')
      setTimeout(() => setSuccessToast(null), 2600)
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur de création')
    } finally {
      setCreating(false)
    }
  }

  function openPaymentDialog(entity: EntityCardData) {
    setPaymentEntity(entity)
    const firstDebt = entity.debts[0]
    const firstAccount = entity.accounts[0]
    setPaymentDebtId(firstDebt?.id ?? '')
    setPaymentCurrency(firstDebt?.currency_code ?? entity.company.default_currency ?? 'EUR')
    setPaymentAccountId(firstAccount?.id ?? '')
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentMethod('bank_transfer')
    setPaymentRef('')
    setPaymentNotes('')
    setPaymentError(null)
  }

  async function handleCreatePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!paymentEntity) return
    if (!paymentDebtId || !paymentAccountId) {
      setPaymentError('Sélectionne une dette et un compte.')
      return
    }
    const amountNum = Number(paymentAmount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPaymentError('Montant invalide.')
      return
    }
    setPaying(true)
    setPaymentError(null)
    try {
      await createPayment(paymentEntity.company.id, {
        debt_id: paymentDebtId,
        account_id: paymentAccountId,
        amount: amountNum,
        currency_code: paymentCurrency,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: paymentRef || null,
        notes: paymentNotes || null,
      })
      setPaymentEntity(null)
      setSuccessToast('Paiement créé avec succès.')
      setTimeout(() => setSuccessToast(null), 2600)
      router.refresh()
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Erreur de création du paiement')
    } finally {
      setPaying(false)
    }
  }

  function openAddMemberDialog(entity: EntityCardData) {
    setMemberEntity(entity)
    setMemberEmail('')
    setMemberRole('viewer')
    setMemberError(null)
  }

  async function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!memberEntity) return
    setMemberSaving(true)
    setMemberError(null)
    try {
      await addCompanyMember({
        companyId: memberEntity.company.id,
        email: memberEmail,
        role: memberRole,
      })
      setMemberEntity(null)
      setSuccessToast('Membre ajouté avec succès.')
      setTimeout(() => setSuccessToast(null), 2600)
      router.refresh()
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Erreur d'ajout du membre")
    } finally {
      setMemberSaving(false)
    }
  }

  return (
    <>
      {successToast ? (
        <div className="fixed right-4 top-4 z-[70] rounded-lg border border-emerald-800/60 bg-emerald-950/80 px-3 py-2 text-sm text-emerald-200 shadow-lg">
          {successToast}
        </div>
      ) : null}
      {canManage && groupId ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Ajouter une entreprise
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
      {entities.map((entity) => (
        <Card
          key={entity.company.id}
          className="border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700"
        >
          <CardContent className="p-4 md:p-5">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/app/${entity.company.id}/dashboard`}
                  className="text-base font-semibold text-white hover:text-amber-400 hover:underline"
                >
                  {entity.company.trade_name ?? entity.company.legal_name}
                </Link>
                <p className="text-xs text-zinc-400">{entity.company.legal_name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                  {entity.company.country_code}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenExplain(entity.explainOpenDebt)}
                  aria-label={`Voir le détail du calcul des dettes ouvertes pour ${entity.company.trade_name ?? entity.company.legal_name}`}
                  className="inline-flex items-center gap-0.5 rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-amber-400/90 hover:bg-zinc-800"
                  title="Détail du calcul des dettes ouvertes"
                >
                  {entity.company.default_currency}
                  <HelpCircle className="size-3 opacity-70" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Exposition</p>
                <button
                  type="button"
                  onClick={() => onOpenExplain(entity.explainOpenDebt)}
                  aria-label={`Ouvrir le détail de calcul des dettes ouvertes pour ${entity.company.trade_name ?? entity.company.legal_name}`}
                  className="mt-1 group flex items-center gap-1 font-mono text-sm font-medium text-white hover:text-amber-400"
                >
                  <span className="group-hover:underline decoration-dotted">{entity.openDebtDisplay}</span>
                  <HelpCircle className="size-3.5 text-zinc-500 group-hover:text-amber-400" />
                </button>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Dettes actives</p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">{entity.debtsCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Retards</p>
                <p className="mt-1 text-sm font-semibold text-red-300">{entity.overdueCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Execution</p>
                <p className="mt-1 text-sm font-semibold text-amber-200">{entity.tasksInProgressCount}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {entity.criticalDebtsCount > 0 ? (
                <Badge variant="destructive" className="h-5 text-[10px]">
                  {entity.criticalDebtsCount} dette(s) critique(s)
                </Badge>
              ) : null}
              <Badge variant="outline" className="h-5 text-[10px] text-zinc-300">
                Run-rate cible : {entity.revenuesExpectedDisplay}
              </Badge>
              <Badge variant="outline" className="h-5 text-[10px] text-zinc-300">
                Réalisé : {entity.revenuesReceivedDisplay}
              </Badge>
              <Badge variant="outline" className="h-5 text-[10px] text-zinc-300">
                Sprints actifs : {entity.activeSprintsCount}
              </Badge>
            </div>

            <div className="mt-3 flex justify-end">
              <div className="mr-auto flex flex-wrap gap-2">
                <Link
                  href={`/app/${entity.company.id}/debts?create=1`}
                  className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                >
                  Ajouter dette
                </Link>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    openPaymentDialog(entity)
                  }}
                  className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                >
                  Ajouter paiement
                </Link>
                <Link
                  href={`/app/${entity.company.id}/revenues?create=1`}
                  className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                >
                  Ajouter revenue
                </Link>
                <Link
                  href={`/app/${entity.company.id}/accounts?create=1`}
                  className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                >
                  Ajouter compte
                </Link>
                {groupId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canManage) {
                        setSuccessToast("Droits insuffisants pour ajouter un membre.")
                        setTimeout(() => setSuccessToast(null), 2600)
                        return
                      }
                      openAddMemberDialog(entity)
                    }}
                    className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                  >
                    Ajouter membre
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelected(entity)}
                aria-label={`Voir le détail de l'entité ${entity.company.trade_name ?? entity.company.legal_name}`}
                className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
              >
                Voir détail
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Comptes</p>
              {entity.accounts.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-600">Aucun compte actif.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {entity.accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-200">{acc.name}</p>
                        <p className="text-zinc-600">
                          {acc.account_type} · {acc.currency_code}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-zinc-300">{acc.current_balance_display}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Équipe</p>
              {entity.teamMembers.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-600">Aucun membre.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {entity.teamMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                      <p className="truncate text-zinc-200">{m.display_name}</p>
                      <Badge variant="outline" className="h-5 text-[10px] text-zinc-300">
                        {m.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      </div>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.company.trade_name ?? selected.company.legal_name}</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Vue exécutive de l'entité: risque, performance et exécution opérationnelle.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Profil</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <p className="text-zinc-500">Pays</p>
                    <p className="text-right">{selected.company.country_code || '—'}</p>
                    <p className="text-zinc-500">Devise</p>
                    <p className="text-right">{selected.company.default_currency || '—'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Risque</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <p className="text-zinc-500">Exposition ouverte</p>
                    <p className="text-right font-mono">{selected.openDebtDisplay || '—'}</p>
                    <p className="text-zinc-500">Dettes actives</p>
                    <p className="text-right">{selected.debtsCount}</p>
                    <p className="text-zinc-500">Retards</p>
                    <p className="text-right text-red-300">{selected.overdueCount}</p>
                    <p className="text-zinc-500">Critiques</p>
                    <p className="text-right">{selected.criticalDebtsCount}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Performance</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <p className="text-zinc-500">Run-rate cible</p>
                    <p className="text-right font-mono">{selected.revenuesExpectedDisplay || '—'}</p>
                    <p className="text-zinc-500">Réalisé</p>
                    <p className="text-right font-mono">{selected.revenuesReceivedDisplay || '—'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Execution</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <p className="text-zinc-500">Tâches en cours</p>
                    <p className="text-right">{selected.tasksInProgressCount}</p>
                    <p className="text-zinc-500">Sprints actifs</p>
                    <p className="text-right">{selected.activeSprintsCount}</p>
                    <p className="text-zinc-500">Comptes actifs</p>
                    <p className="text-right">{selected.accounts.length}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => onOpenExplain(selected.explainOpenDebt)}
                    className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Détail du calcul dettes ouvertes
                  </button>
                  <Link
                    href={`/app/${selected.company.id}/dashboard`}
                    className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Ouvrir le dashboard entité
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={memberEntity !== null} onOpenChange={(o) => !o && setMemberEntity(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          {memberEntity ? (
            <>
              <DialogHeader>
                <DialogTitle>Ajouter un membre</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {memberEntity.company.trade_name ?? memberEntity.company.legal_name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Email du membre *</label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Rôle *</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as 'company_admin' | 'finance_manager' | 'viewer')}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  >
                    <option value="viewer">Membre (lecture)</option>
                    <option value="finance_manager">Finance manager</option>
                    <option value="company_admin">Admin entreprise</option>
                  </select>
                </div>
                <p className="text-xs text-zinc-500">
                  Le membre doit deja avoir un compte (connexion au moins une fois).
                </p>
                {memberError ? (
                  <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{memberError}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setMemberEntity(null)} disabled={memberSaving}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={memberSaving}>
                    {memberSaving ? 'Ajout...' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentEntity !== null} onOpenChange={(o) => !o && setPaymentEntity(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          {paymentEntity ? (
            <>
              <DialogHeader>
                <DialogTitle>Ajouter paiement</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {paymentEntity.company.trade_name ?? paymentEntity.company.legal_name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePayment} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Dette *</label>
                  <select
                    value={paymentDebtId}
                    onChange={(e) => {
                      const id = e.target.value
                      setPaymentDebtId(id)
                      const debt = paymentEntity.debts.find((d) => d.id === id)
                      if (debt) setPaymentCurrency(debt.currency_code)
                    }}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">—</option>
                    {paymentEntity.debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} · restant {d.remaining_company_currency.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Compte *</label>
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">—</option>
                    {paymentEntity.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.currency_code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Montant *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Devise *</label>
                    <select
                      value={paymentCurrency}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Date *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Moyen *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'bank_transfer' | 'cash' | 'card' | 'check' | 'other')}
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    >
                      <option value="bank_transfer">Virement</option>
                      <option value="cash">Espèces</option>
                      <option value="card">Carte</option>
                      <option value="check">Chèque</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Référence</label>
                  <input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Notes</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                {paymentError ? (
                  <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{paymentError}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setPaymentEntity(null)} disabled={paying}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={paying}>
                    {paying ? 'Création...' : 'Créer paiement'}
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une entreprise</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Créez une nouvelle entité dans le groupe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Raison sociale *</label>
              <input
                required
                value={newCompany.legal_name}
                onChange={(e) => setNewCompany((p) => ({ ...p, legal_name: e.target.value }))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Nom commercial</label>
              <input
                value={newCompany.trade_name}
                onChange={(e) => setNewCompany((p) => ({ ...p, trade_name: e.target.value }))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Type</label>
                <select
                  value={newCompany.type}
                  onChange={(e) => setNewCompany((p) => ({ ...p, type: e.target.value as 'business' | 'personal' }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="business">Professionnel</option>
                  <option value="personal">Personnel</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Pays</label>
                <select
                  value={newCompany.country_code}
                  onChange={(e) => setNewCompany((p) => ({ ...p, country_code: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="FR">France</option>
                  <option value="TN">Tunisie</option>
                  <option value="US">États-Unis</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Devise *</label>
                <select
                  value={newCompany.default_currency}
                  onChange={(e) => setNewCompany((p) => ({ ...p, default_currency: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Fuseau horaire</label>
                <input
                  value={newCompany.timezone}
                  onChange={(e) => setNewCompany((p) => ({ ...p, timezone: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {createError ? (
              <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{createError}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                Annuler
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
