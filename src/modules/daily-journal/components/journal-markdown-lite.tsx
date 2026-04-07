'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Découpe le texte en blocs ## … (Markdown léger). */
function splitSections(md: string): { heading: string; body: string }[] {
  const t = md.trim()
  if (!t) return []
  const parts = t.split(/\n(?=##\s)/)
  const out: { heading: string; body: string }[] = []
  for (const part of parts) {
    const lines = part.split('\n')
    const first = lines[0] ?? ''
    if (first.startsWith('## ')) {
      out.push({
        heading: first.slice(3).trim(),
        body: lines.slice(1).join('\n').trim(),
      })
    } else if (first.trim()) {
      out.push({ heading: '', body: part.trim() })
    }
  }
  return out
}

function formatInline(text: string): ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*)/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {seg.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{seg}</span>
  })
}

type LineKind = 'blank' | 'bullet' | 'numbered' | 'text'

function classifyLine(line: string): { kind: LineKind; content: string; num?: number } {
  const trimmed = line.trim()
  if (!trimmed) return { kind: 'blank', content: '' }
  const bullet = /^[-*]\s+(.+)$/.exec(trimmed)
  if (bullet) return { kind: 'bullet', content: bullet[1] }
  const num = /^(\d+)[.)]\s+(.+)$/.exec(trimmed)
  if (num) return { kind: 'numbered', content: num[2], num: parseInt(num[1], 10) }
  return { kind: 'text', content: trimmed }
}

function renderBodyBlock(body: string, variant: 'default' | 'compact' = 'default') {
  const bulletListClass =
    variant === 'compact'
      ? 'my-2 list-inside list-disc space-y-1.5 pl-1 text-zinc-300 marker:text-amber-500/75'
      : 'my-2 list-inside list-disc space-y-1.5 pl-1 text-zinc-300 marker:text-violet-500/80'
  const orderedListClass =
    variant === 'compact'
      ? 'my-2 list-inside list-decimal space-y-1.5 pl-1 text-zinc-300 marker:font-mono marker:text-amber-500/70'
      : 'my-2 list-inside list-decimal space-y-1.5 pl-1 text-zinc-300 marker:font-mono marker:text-zinc-500'
  const orderedLiClass =
    variant === 'compact'
      ? 'leading-snug [&::marker]:text-amber-400/90'
      : 'leading-snug [&::marker]:text-violet-400/90'
  const lines = body.split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const c = classifyLine(line)

    if (c.kind === 'blank') {
      i++
      continue
    }

    if (c.kind === 'bullet') {
      const items: string[] = []
      while (i < lines.length) {
        const ci = classifyLine(lines[i])
        if (ci.kind === 'bullet') {
          items.push(ci.content)
          i++
        } else break
      }
      nodes.push(
        <ul key={key++} className={bulletListClass}>
          {items.map((item, j) => (
            <li key={j} className="leading-snug">
              {formatInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (c.kind === 'numbered') {
      const items: { n: number; t: string }[] = []
      while (i < lines.length) {
        const ci = classifyLine(lines[i])
        if (ci.kind === 'numbered' && ci.num != null) {
          items.push({ n: ci.num, t: ci.content })
          i++
        } else break
      }
      nodes.push(
        <ol key={key++} className={orderedListClass}>
          {items.map((item, j) => (
            <li key={j} className={orderedLiClass}>
              {formatInline(item.t)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    const para: string[] = [c.content]
    i++
    while (i < lines.length) {
      const cn = classifyLine(lines[i])
      if (cn.kind === 'text') {
        para.push(cn.content)
        i++
      } else break
    }
    nodes.push(
      <p key={key++} className="my-2 text-[13px] leading-relaxed text-zinc-300 first:mt-0">
        {formatInline(para.join(' '))}
      </p>
    )
  }

  return <div className="space-y-1">{nodes}</div>
}

export function JournalMarkdownLite({
  source,
  className,
  variant = 'default',
}: {
  source: string
  className?: string
  /** `compact` : sections plus légères (ex. bulles de chat). */
  variant?: 'default' | 'compact'
}) {
  const sections = splitSections(source)
  if (sections.length === 0) {
    return <p className="text-sm text-zinc-500">{source}</p>
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        {sections.map((sec, idx) => (
          <div key={idx} className="min-w-0">
            {sec.heading ? (
              <h4 className="mb-2 border-b border-zinc-700/60 pb-2 text-[13px] font-semibold tracking-wide text-amber-100/95">
                {sec.heading}
              </h4>
            ) : null}
            {sec.body ? renderBodyBlock(sec.body, 'compact') : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {sections.map((sec, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/50 to-zinc-950/60 p-3.5 shadow-sm shadow-black/20 sm:p-4"
        >
          {sec.heading ? (
            <h4 className="mb-2.5 border-b border-zinc-800/80 pb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-violet-200/95">
              {sec.heading}
            </h4>
          ) : null}
          {sec.body ? renderBodyBlock(sec.body, 'default') : null}
        </div>
      ))}
    </div>
  )
}
