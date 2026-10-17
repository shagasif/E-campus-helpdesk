import { Icon } from './Icon';

interface Props { page: number; pageSize: number; total: number; onPage: (p: number) => void }

export function Pagination({ page, pageSize, total, onPage }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="muted small">Showing {from}–{to} of {total}</span>
      <div className="pager-btns">
        <button type="button" className="pager-btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><Icon name="prev" size={16} /></button>
        {pages.map((p) => (
          <button key={p} type="button" className={`pager-btn${p === page ? ' on' : ''}`} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`}>{p}</button>
        ))}
        <button type="button" className="pager-btn" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page"><Icon name="next" size={16} /></button>
      </div>
    </nav>
  );
}
