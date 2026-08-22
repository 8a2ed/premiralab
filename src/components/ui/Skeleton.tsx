interface SkeletonProps {
  height?: number | string;
  width?:  number | string;
  radius?: number;
  count?:  number;
  gap?:    number;
}

export function Skeleton({ height = 20, width = '100%', radius = 8, count = 1, gap = 10 }: SkeletonProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height, width, borderRadius: radius }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ gap: 14, display: 'flex', flexDirection: 'column' }}>
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} count={3} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap">
      <table className="table" aria-busy="true">
        <thead>
          <tr>{Array.from({ length: cols }).map((_, i) => (
            <th key={i}><Skeleton height={16} width={80} /></th>
          ))}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>{Array.from({ length: cols }).map((_, c) => (
              <td key={c}><Skeleton height={14} /></td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
