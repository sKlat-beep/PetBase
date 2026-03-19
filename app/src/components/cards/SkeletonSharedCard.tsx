import { Skeleton } from '../ui/Skeleton';

export function SkeletonSharedCard() {
  return (
    <div className="bg-surface-container-low/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-outline-variant/20 overflow-hidden w-full max-w-sm">
      {/* Header skeleton */}
      <div className="h-28 bg-surface-container relative">
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-white/30" />
            <Skeleton className="h-6 w-32 bg-white/30" />
          </div>
          <Skeleton className="w-16 h-16 rounded-2xl bg-white/20" />
        </div>
      </div>
      {/* Section skeletons */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      {/* Footer skeleton */}
      <div className="px-5 py-4 border-t border-outline-variant">
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}
