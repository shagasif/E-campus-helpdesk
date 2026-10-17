export function Skeleton({ height = 16, className = '' }: { height?: number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height }} aria-hidden="true" />;
}

export function ChartsSkeleton() {
  return (
    <div className="charts" role="status" aria-label="Loading charts">
      <div className="card"><Skeleton height={18} className="sk-w40" /><Skeleton height={240} /></div>
      <div className="card"><Skeleton height={18} className="sk-w40" /><Skeleton height={240} /></div>
    </div>
  );
}
