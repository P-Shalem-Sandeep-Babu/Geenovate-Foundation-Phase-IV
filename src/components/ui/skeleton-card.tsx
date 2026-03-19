import { cn } from "@/lib/utils";

interface SkeletonProps { className?: string; }
const Sk = ({ className }: SkeletonProps) => (
  <div className={cn("animate-pulse bg-muted/60 rounded-lg", className)} />
);

export function SkeletonCard() {
  return (
    <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-card/60">
      <div className="flex justify-between items-start">
        <Sk className="h-4 w-36" />
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      <Sk className="h-3 w-24" />
      <Sk className="h-3 w-full" />
      <Sk className="h-3 w-3/4" />
      <div className="flex gap-1 mt-2">
        {[1,2,3,4,5].map(i => <Sk key={i} className="h-1.5 w-8" />)}
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="border rounded-lg p-3 flex items-center gap-3 bg-card">
      <Sk className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Sk className="h-3.5 w-40" />
        <Sk className="h-3 w-24" />
      </div>
      <Sk className="h-7 w-16 rounded-md" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card">
      <Sk className="h-8 w-8 rounded-lg" />
      <Sk className="h-7 w-12" />
      <Sk className="h-3 w-24" />
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Sk className="h-7 w-48" />
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      <Sk className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Sk className="h-28 rounded-xl" />
        <Sk className="h-28 rounded-xl" />
      </div>
    </div>
  );
}
