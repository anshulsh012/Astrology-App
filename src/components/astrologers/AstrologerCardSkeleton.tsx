export function AstrologerCardSkeleton() {
  return (
    <div
      className="flex min-h-[22rem] flex-col rounded-2xl border border-line bg-card p-5"
      aria-hidden="true"
    >
      <div className="flex gap-4">
        <div className="h-20 w-20 animate-pulse rounded-2xl bg-plum" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-24 animate-pulse rounded bg-plum" />
          <div className="h-6 w-40 animate-pulse rounded bg-plum" />
          <div className="h-4 w-32 animate-pulse rounded bg-plum" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded-full bg-plum" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-plum" />
      </div>
      <div className="mt-6 h-4 w-48 animate-pulse rounded bg-plum" />
      <div className="mt-3 h-4 w-36 animate-pulse rounded bg-plum" />
      <div className="mt-auto flex justify-between pt-8">
        <div className="h-8 w-20 animate-pulse rounded bg-plum" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-plum" />
      </div>
    </div>
  )
}
