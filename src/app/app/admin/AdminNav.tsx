'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-2 border-b border-zinc-800 pb-4">
      <Link
        href="/app/admin/jobs"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          pathname === '/app/admin/jobs' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        }`}
      >
        Jobs
      </Link>
      <Link
        href="/app/admin/errors"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          pathname === '/app/admin/errors' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        }`}
      >
        Erreurs
      </Link>
      <Link
        href="/app/admin/assistant"
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          pathname === '/app/admin/assistant' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        }`}
      >
        Assistant
      </Link>
    </nav>
  )
}
