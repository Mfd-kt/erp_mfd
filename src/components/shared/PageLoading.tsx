import { Skeleton } from '@/components/ui/skeleton'

export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-subtle rounded-xl p-5">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-3 h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface-subtle rounded-xl p-4">
      <div className="mb-4 grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="surface-subtle rounded-xl p-4">
      <Skeleton className="mb-4 h-3 w-36" />
      <Skeleton className="h-[260px] w-full" />
    </div>
  )
}

export function PageLoading({
  showCharts = false,
  showTable = true,
}: {
  showCharts?: boolean
  showTable?: boolean
}) {
  return (
    <div className="space-y-8 fade-in">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <KpiCardsSkeleton />
      {showCharts ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : null}
      {showTable ? <TableSkeleton /> : null}
    </div>
  )
}
