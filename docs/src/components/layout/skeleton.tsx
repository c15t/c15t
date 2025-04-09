

/**
 * Skeleton for the framework selector during SSR/hydration
 */
export function SkeletonFrameworkSelector() {
  return (
    <div className="mb-3">
      <div className="pb-1 pl-2 text-fd-muted-foreground text-xs">
        Select framework documentation
      </div>
      <div className='flex flex-row items-center gap-2.5 rounded-lg border bg-fd-card py-1.5 ps-2 pe-2'>
        <div className='h-6 w-6 animate-pulse rounded-full bg-fd-primary' />
        <div className="flex-1 text-start">
        </div>
        <div className="size-4 text-fd-muted-foreground" />
      </div>
    </div>
  );
}

/**
 * Skeleton navigation tree during SSR/hydration
 */
export function SkeletonNavigation() {
  return (
    <div className="animate-pulse">
      {/* General section */}
      <div className="mb-2 px-2 py-1">
        <div className='h-5 w-20 animate-pulse rounded bg-fd-muted' />
      </div>
      {/* Nav items */}
      {new Array(8).fill(0).map((_, i) => (
        <div key={i} className="mb-1 px-2 py-1.5">
          <div className='h-5 w-40 animate-pulse rounded bg-fd-muted' />
        </div>
      ))}
      {/* Second section */}
      <div className='mt-6 mb-2 px-2 py-1'>
        <div className='h-5 w-24 animate-pulse rounded bg-fd-muted' />
      </div>
      {/* More nav items */}
      {new Array(5).fill(0).map((_, i) => (
        <div key={i} className="mb-1 px-2 py-1.5">
          <div className='h-5 w-36 animate-pulse rounded bg-fd-muted' />
        </div>
      ))}
    </div>
  );
} 