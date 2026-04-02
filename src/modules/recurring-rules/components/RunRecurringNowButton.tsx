'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Play } from 'lucide-react'
import { runRecurringNow } from '../actions'
import type { RunGenerationResult } from '../types'

interface RunRecurringNowButtonProps {
  companyId: string
  onSuccess: () => void
}

export function RunRecurringNowButton({ companyId, onSuccess }: RunRecurringNowButtonProps) {
  const [result, setResult] = useState<RunGenerationResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function formatDate(date: string) {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR')
  }

  function handleRun() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await runRecurringNow(companyId)
        setResult(res)
        onSuccess()
      } catch (e) {
        setResult({
          companyId,
          windowStart: new Date().toISOString().slice(0, 10),
          windowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          rulesChecked: 0,
          created: 0,
          alreadyGenerated: 0,
          errors: [e instanceof Error ? e.message : 'Erreur'],
        })
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/20"
        onClick={handleRun}
        disabled={isPending}
      >
        <Play size={14} />
        {isPending ? 'Exécution…' : 'Exécuter maintenant'}
      </Button>
      {result && (
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardContent className="p-3 text-sm">
            <p className="text-zinc-300">
              Règles traitées : <strong>{result.rulesChecked}</strong>
              {' · '}Créées : <strong className="text-emerald-400">{result.created}</strong>
              {' · '}Déjà générées : <strong>{result.alreadyGenerated}</strong>
            </p>
            {result.windowStart && result.windowEnd && (
              <p className="mt-1 text-zinc-400">
                Fenêtre traitée : <strong>{formatDate(result.windowStart)}</strong>
                {' → '}
                <strong>{formatDate(result.windowEnd)}</strong>
              </p>
            )}
            {result.errors.length > 0 && (
              <ul className="mt-2 text-red-400 list-disc list-inside">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
