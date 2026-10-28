import { cn } from "cn"

import { Skeleton } from "@/components/ui/skeleton"

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2" aria-hidden="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  )
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-3 rounded-xl border bg-card p-4", className)}
      aria-hidden="true"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-20" />
    </div>
  )
}

export function MonitorRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
      aria-hidden="true"
    >
      <Skeleton className="size-2.5 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
      <Skeleton className="hidden h-6 w-48 md:block" />
      <Skeleton className="h-4 w-14" />
    </div>
  )
}

export function MonitorListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card" role="status">
      <span className="sr-only">Loading monitors…</span>
      {Array.from({ length: rows }, (_, i) => (
        <MonitorRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading form…</span>
      <div className="grid gap-5 rounded-xl border bg-card p-4 sm:grid-cols-2 sm:p-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-xl border bg-card p-4", className)}
      role="status"
    >
      <span className="sr-only">Loading chart…</span>
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
