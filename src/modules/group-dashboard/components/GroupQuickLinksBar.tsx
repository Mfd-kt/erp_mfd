'use client'

import Link from 'next/link'
import { Bot, Calendar, ListTodo, Target } from 'lucide-react'

const links = [
  { href: '/app/assistant', label: 'Copilote', icon: Bot },
  { href: '/app/planning', label: 'Plan du jour', icon: Target },
  { href: '/app/sprints', label: 'Sprints', icon: Calendar },
  { href: '/app/tasks', label: 'Tâches', icon: ListTodo },
]

export function GroupQuickLinksBar() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
        >
          <item.icon size={14} />
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  )
}
