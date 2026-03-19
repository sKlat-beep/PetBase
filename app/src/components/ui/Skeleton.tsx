interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-container-high ${className ?? ''}`}
    />
  );
}

export function SkeletonPost() {
  return (
    <div className="rounded-xl border border-outline-variant p-4 bg-surface-container-low space-y-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonUserCard() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-7 w-16 rounded-lg" />
    </div>
  );
}

export function SkeletonServiceCard() {
  return (
    <div className="rounded-xl border border-outline-variant p-4 space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}
