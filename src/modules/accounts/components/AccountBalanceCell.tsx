'use client'

import { useEffect, useState, useTransition } from 'react'
import { reconcileAccountBalance } from '../actions'
import type { AccountWithBalance } from '@/lib/supabase/types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export function AccountBalanceCell({
  companyId,
  account,
  canManage,
  onSaved,
}: {
  companyId: string
  account: AccountWithBalance
  canManage: boolean
  onSaved: () => void
}) {
  const balance = Number(account.computed_balance ?? account.opening_balance)
  const currency = account.currency_code
  const negative = balance < 0

  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(() => String(balance))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!editing) setVal(String(balance))
  }, [balance, editing])

  if (!canManage) {
    return (
      <span className={`font-mono font-semibold ${negative ? 'text-red-400' : 'text-emerald-400'}`}>
        {formatCurrency(balance, currency)}
      </span>
    )
  }

  async function commit() {
    setError(null)
    const normalized = val.replace(/\s/g, '').replace(',', '.')
    const num = parseFloat(normalized)
    if (Number.isNaN(num)) {
      setError('Montant invalide')
      return
    }
    startTransition(async () => {
      try {
        await reconcileAccountBalance(companyId, { accountId: account.id, targetBalance: num })
        setEditing(false)
        onSaved()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            disabled={isPending}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit()
              if (e.key === 'Escape') {
                setEditing(false)
                setVal(String(balance))
                setError(null)
              }
            }}
            className="w-36 rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1 text-right font-mono text-sm text-white outline-none focus:border-amber-500/60"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => void commit()}
            className="rounded-lg bg-amber-600/90 px-2 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            OK
          </button>
        </div>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
        <span className="text-[10px] text-zinc-500">Entrée = valider · Échap = annuler</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setEditing(true)
        setVal(String(balance))
        setError(null)
      }}
      className={`group text-right font-mono font-semibold transition-colors hover:underline hover:underline-offset-2 ${
        negative ? 'text-red-400' : 'text-emerald-400'
      }`}
      title="Cliquer pour saisir le solde réel (réconciliation)"
    >
      {formatCurrency(balance, currency)}
      <span className="ml-1 inline text-[10px] font-normal text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
        (modifier)
      </span>
    </button>
  )
}
