export function Skeleton({ className = '', variant = 'text' }) {
  const baseClasses = 'animate-shimmer bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 bg-[length:200%_100%]';

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} rounded-3xl p-6 ${className}`}>
        <div className="h-5 w-1/3 bg-surface-200/50 rounded-lg mb-3" />
        <div className="h-4 w-2/3 bg-surface-200/50 rounded-lg mb-2" />
        <div className="h-4 w-1/2 bg-surface-200/50 rounded-lg" />
      </div>
    );
  }

  if (variant === 'circle') {
    return <div className={`${baseClasses} rounded-full ${className}`} />;
  }

  return <div className={`${baseClasses} rounded-xl ${className}`} />;
}

export function SkeletonLine({ width = 'full' }) {
  const widths = { full: 'w-full', '3/4': 'w-3/4', '1/2': 'w-1/2', '1/3': 'w-1/3', '2/3': 'w-2/3' };
  return <Skeleton className={`h-4 ${widths[width] || 'w-full'}`} />;
}

export function CardSkeleton() {
  return (
    <Skeleton variant="card" className="h-[140px]">
      <Skeleton className="h-5 w-2/5 mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </Skeleton>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      <Skeleton variant="card" className="h-72" />
      <Skeleton variant="card" className="h-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton variant="card" className="h-56" />
        <Skeleton variant="card" className="h-56" />
      </div>
      <Skeleton variant="card" className="h-80" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-container space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Skeleton variant="card" className="h-[92px]" />
        <Skeleton variant="card" className="h-[92px]" />
        <Skeleton variant="card" className="h-[92px]" />
        <Skeleton variant="card" className="h-[92px]" />
      </div>
      <Skeleton variant="card" className="h-72" />
      <Skeleton variant="card" className="h-32" />
      <Skeleton variant="card" className="h-32" />
      <Skeleton variant="card" className="h-32" />
    </div>
  );
}
