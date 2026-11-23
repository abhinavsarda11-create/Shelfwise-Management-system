import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function usePaged(items, size = 12) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => { setPage(1); }, [items.length]);
  return { page, setPage, pages, slice: items.slice((page - 1) * size, page * size), total: items.length, size };
}

export function Pager({ page, pages, setPage, total, size }) {
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <div className="pager">
      <span>{from}-{to} of {total}</span>
      <div>
        <button className="icon" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <span className="pageno">{page} / {pages}</span>
        <button className="icon" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
