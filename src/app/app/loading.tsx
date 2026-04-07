import { Skeleton } from '@/components/ui/skeleton'

/** Affichage immédiat pendant le chargement serveur du shell /app (perception de vitesse). */
export default function AppRouteLoading() {
  return (
    <div className="space-y-8" aria-busy aria-label="Chargement">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}
