import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <Inbox size={24} className="text-zinc-500" />
      </div>
      <p className="text-lg font-semibold text-zinc-100">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-zinc-500">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-6 bg-white text-zinc-950 hover:bg-zinc-200">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
