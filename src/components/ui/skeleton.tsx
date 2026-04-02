import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-zinc-900/90', className)}
      {...props}
    />
  )
}
