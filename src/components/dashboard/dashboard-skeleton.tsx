import {
  MonitorListSkeleton,
  StatCardSkeleton,
} from "@/components/common/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <StatCardSkeleton
            key={i}
            className={i === 6 ? "col-span-2 lg:col-span-1" : undefined}
          />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <MonitorListSkeleton />
      </div>
    </div>
  )
}
