import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Eye, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import Modal from '../components/Modal';
import { Pager, usePaged } from '../components/Pager';
import { api } from '../api';
import { dateTime, downloadCsv, money, statusClass } from '../format';
import { toast } from '../toast';
import { useAuth } from '../auth';

const tabs = ['All', 'Placed', 'Delivered', 'Cancelled'];
const payments = ['UPI', 'Cash', 'Card', 'Credit'];

function NewOrder({ onClose, onDone }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customer, setCustomer] = useState('');
  const [lines, setLines] = useState([{ product: '', quantity: 1 }]);
  const [payment, setPayment] = useState('UPI');
  const [discount, setDiscount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/customers').then(setCustomers);
    api.get('/products').then(setProducts);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.category, [...(map.get(p.category) || []), p]));
    return [...map.entries()];
  }, [products]);

  const find = (id) => products.find((p) => p._id === id);
  const setLine = (i, patch) => setLines(lines.map((l, x) => (x === i ? { ...l, ...patch } : l)));
  const lineTotal = (l) => (find(l.product) ? find(l.product).price * (Number(l.quantity) || 0) : 0);
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const percent = Math.min(Math.max(Number(discount) || 0, 0), 50);
  const off = Math.round((subtotal * percent) / 100);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/orders', { customer, items: lines.filter((l) => l.product), paymentMethod: payment, discountPercent: percent });
      toast('Order placed');
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="New order" onClose={onClose} wide>
      <form className="order-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="span2">
            <span>Customer</span>
            <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="">Select a customer</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>)}
            </select>
          </label>
        </div>

        <div className="lines">
          {lines.map((l, i) => (
            <div className="line" key={i}>
              <select value={l.product} onChange={(e) => setLine(i, { product: e.target.value })}>
                <option value="">Select a product</option>
                {grouped.map(([category, list]) => (
                  <optgroup key={category} label={category}>
                    {list.map((p) => (
                      <option key={p._id} value={p._id} disabled={p.stock === 0}>{p.name} · {money(p.price)} · {p.stock} left</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} aria-label="Quantity" />
              <span className="line-total">{money(lineTotal(l))}</span>
              <button type="button" className="icon danger" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, x) => x !== i))} aria-label="Remove line"><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" className="btn small" onClick={() => setLines([...lines, { product: '', quantity: 1 }])}><Plus size={15} />Add another item</button>
        </div>

        <div className="form-grid">
          <label><span>Payment method</span>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>{payments.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label><span>Discount (%)</span><input type="number" min="0" max="50" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="order-foot">
          <div className="sums">
            <span>Subtotal {money(subtotal)}</span>
            {off > 0 && <span>Discount −{money(off)}</span>}
            <strong>{money(subtotal - off)}</strong>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={busy}>Place order</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Invoice({ order, onClose }) {
  const c = order.customer;
  return (
    <Modal title={`Invoice ${order.orderNo}`} onClose={onClose} wide>
      <div className="invoice">
        <div className="invoice-head">
          <div>
            <strong className="invoice-brand">Shelfwise</strong>
            <p>Retail Inventory and Order Management</p>
          </div>
          <div className="right">
            <p><b>{order.orderNo}</b></p>
            <p>{dateTime(order.createdAt)}</p>
            {order.servedBy && <p>Served by {order.servedBy}</p>}
            <span className={'badge ' + statusClass(order.status)}>{order.status}</span>
          </div>
        </div>
        <div className="invoice-meta">
          <div>
            <span className="muted">Billed to</span>
            <b>{c ? c.name : 'Deleted customer'}</b>
            {c && c.phone && <p>{c.phone}</p>}
            {c && c.address && <p>{c.address}</p>}
            {c && c.city && <p>{c.city}, {c.state} {c.pincode}</p>}
          </div>
          <div className="right">
            <span className="muted">Payment</span>
            <b>{order.paymentMethod}</b>
          </div>
        </div>
        <table>
          <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.product + it.sku}>
                <td>{it.name}<small className="sub">{it.sku}</small></td>
                <td className="num">{it.quantity}</td>
                <td className="num">{money(it.price)}</td>
                <td className="num">{money(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {order.discount > 0 && (
              <>
                <tr><td colSpan="3" className="num">Subtotal</td><td className="num">{money(order.subtotal)}</td></tr>
                <tr><td colSpan="3" className="num">Discount ({order.discountPercent}%)</td><td className="num">−{money(order.discount)}</td></tr>
              </>
            )}
            <tr className="grand"><td colSpan="3" className="num"><b>Total</b></td><td className="num"><b>{money(order.total)}</b></td></tr>
          </tfoot>
        </table>
      </div>
      <div className="form-actions no-print">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn primary" onClick={() => window.print()}><Printer size={16} />Print invoice</button>
      </div>
    </Modal>
  );
}

export default function Orders() {
  const { can } = useAuth();
  const [orders, setOrders] = useState(null);
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => api.get('/orders').then(setOrders).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => { load(); }, [load]);

  const change = async (order, status) => {
    const message = status === 'Cancelled' ? 'Cancel this order and return its items to stock?' : 'Mark this order as delivered?';
    if (!window.confirm(message)) return;
    try {
      await api.put(`/orders/${order._id}/status`, { status });
      toast(`${order.orderNo} ${status.toLowerCase()}`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const shown = useMemo(
    () => (orders || []).filter((o) => (tab === 'All' || o.status === tab) && `${o.orderNo} ${o.customer ? o.customer.name : ''} ${o.city || ''}`.toLowerCase().includes(query.toLowerCase())),
    [orders, tab, query]
  );
  const pager = usePaged(shown, 12);

  const exportCsv = () =>
    downloadCsv('orders.csv', shown.map((o) => ({
      Order: o.orderNo,
      Date: new Date(o.createdAt).toISOString(),
      Customer: o.customer ? o.customer.name : '',
      City: o.city,
      State: o.state,
      Payment: o.paymentMethod,
      Subtotal: o.subtotal,
      Discount: o.discount,
      Total: o.total,
      Status: o.status,
      Items: o.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
    })));

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          {tabs.map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        <label className="searchbox"><Search size={16} /><input placeholder="Search order, customer or city" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <div className="toolbar-end">
          <button className="btn" onClick={exportCsv} disabled={!shown.length}><Download size={16} />Export</button>
          {can('orders:create') && <button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />New order</button>}
        </div>
      </div>

      <div className="card table-card">
        {orders === null ? <p className="empty">Loading…</p> : shown.length === 0 ? (
          <p className="empty">{orders.length ? 'No orders match this filter.' : 'No orders yet. Create the first one.'}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Date</th><th>Payment</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
              <tbody>
                {pager.slice.map((o, idx) => (
                  <motion.tr key={o._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: idx * 0.02 }}>
                    <td><strong>{o.orderNo}</strong></td>
                    <td>{o.customer ? o.customer.name : 'Deleted customer'}<small className="sub">{o.city}</small></td>
                    <td className="clip">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td>{o.paymentMethod}</td>
                    <td className="num">{money(o.total)}</td>
                    <td><span className={'badge ' + statusClass(o.status)}>{o.status}</span></td>
                    <td className="row-actions">
                      <button className="icon" title="View invoice" onClick={() => setViewing(o)}><Eye size={16} /></button>
                      {o.status === 'Placed' && (
                        <>
                          {can('orders:update') && <button className="icon ok" title="Mark delivered" onClick={() => change(o, 'Delivered')}><Check size={16} /></button>}
                          {can('orders:cancel') && <button className="icon danger" title="Cancel order" onClick={() => change(o, 'Cancelled')}><X size={16} /></button>}
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager {...pager} />
      </div>

      {creating && <NewOrder onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
      {viewing && <Invoice order={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
