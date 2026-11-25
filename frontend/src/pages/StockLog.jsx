import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';
import { dateTime } from '../format';
import { toast } from '../toast';
import { Pager, usePaged } from '../components/Pager';

const filters = [
  { label: 'All', test: () => true },
  { label: 'Sales', test: (l) => l.reason.startsWith('Order') },
  { label: 'Cancellations', test: (l) => l.reason.startsWith('Cancelled') },
  { label: 'Manual', test: (l) => !l.reason.startsWith('Order') && !l.reason.startsWith('Cancelled') },
];

export default function StockLog() {
  const [logs, setLogs] = useState(null);
  const [filter, setFilter] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/stock-logs').then(setLogs).catch((e) => toast(e.message, 'error'));
  }, []);

  const shown = useMemo(
    () => (logs || []).filter((l) => filters[filter].test(l) && `${l.product ? l.product.name : ''} ${l.reason}`.toLowerCase().includes(query.toLowerCase())),
    [logs, filter, query]
  );
  const pager = usePaged(shown, 15);

  return (
    <>
      <div className="toolbar">
        <label className="searchbox"><Search size={16} /><input placeholder="Search product or reason" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <div className="chips">
          {filters.map((f, i) => <button key={f.label} className={i === filter ? 'on' : ''} onClick={() => setFilter(i)}>{f.label}</button>)}
        </div>
      </div>
      <div className="card table-card">
        {logs === null ? <p className="empty">Loading…</p> : shown.length === 0 ? <p className="empty">No stock movements found.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Product</th><th>Change</th><th className="num">Balance</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {pager.slice.map((l) => (
                  <tr key={l._id}>
                    <td>{dateTime(l.createdAt)}</td>
                    <td><strong>{l.product ? l.product.name : 'Deleted product'}</strong><small className="sub">{l.product && l.product.sku}</small></td>
                    <td><span className={'badge ' + (l.change > 0 ? 'ok' : 'warn')}>{l.change > 0 ? `+${l.change}` : l.change}</span></td>
                    <td className="num">{l.balance}</td>
                    <td>{l.reason}</td>
                    <td>{l.by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager {...pager} />
      </div>
    </>
  );
}
