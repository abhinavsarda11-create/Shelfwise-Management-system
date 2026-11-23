import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import Resource from '../components/Resource';
import Modal from '../components/Modal';
import { api } from '../api';
import { money } from '../format';
import { toast } from '../toast';

const categories = ['Staples', 'Dairy & Beverages', 'Snacks & Biscuits', 'Personal Care', 'Household', 'Stationery', 'Electricals'];

const fields = [
  { name: 'name', label: 'Product name', span: 2 },
  { name: 'brand', label: 'Brand' },
  { name: 'sku', label: 'SKU' },
  { name: 'category', label: 'Category', type: 'choice', options: categories },
  { name: 'price', label: 'Price (₹)', type: 'number' },
  { name: 'stock', label: 'Opening stock', type: 'number', createOnly: true },
  { name: 'reorderLevel', label: 'Reorder level', type: 'number' },
  { name: 'supplier', label: 'Supplier', type: 'select', span: 2 },
];

const stockBadge = (r) => {
  const tone = r.stock === 0 ? 'bad' : r.stock <= r.reorderLevel ? 'warn' : 'ok';
  return <span className={'badge ' + tone}>{r.stock === 0 ? 'Out of stock' : `${r.stock} in stock`}</span>;
};

const columns = [
  { label: 'Product', sort: (r) => r.name.toLowerCase(), render: (r) => (<><strong>{r.name}</strong><small className="sub">{r.sku}</small></>) },
  { label: 'Category', sort: (r) => r.category, render: (r) => r.category },
  { label: 'Price', num: true, sort: (r) => r.price, render: (r) => money(r.price) },
  { label: 'Stock', sort: (r) => r.stock, render: stockBadge },
  { label: 'Supplier', render: (r) => (r.supplier ? r.supplier.name : '—') },
];

const filters = [
  { label: 'All', test: () => true },
  { label: 'Low stock', test: (r) => r.stock > 0 && r.stock <= r.reorderLevel },
  { label: 'Out of stock', test: (r) => r.stock === 0 },
];

function AdjustStock({ row, reload }) {
  const suggested = row.stock <= row.reorderLevel ? Math.max(row.reorderLevel * 2 - row.stock, 1) : 0;
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState(suggested ? String(suggested) : '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/products/${row._id}/stock`, { change: Number(change), reason });
      toast('Stock updated');
      setOpen(false);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <button className="icon" title="Adjust stock" onClick={() => setOpen(true)}><ArrowUpDown size={16} /></button>
      {open && (
        <Modal title={`Adjust stock · ${row.name}`} onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={submit}>
            <p className="hint span2">
              Current stock is <b>{row.stock}</b> and the reorder level is <b>{row.reorderLevel}</b>.
              {suggested > 0 && <> A restock of <b>{suggested}</b> units is suggested.</>} Use a negative number to remove stock.
            </p>
            <label><span>Change</span><input type="number" step="1" required value={change} onChange={(e) => setChange(e.target.value)} /></label>
            <label><span>Reason</span><input value={reason} placeholder="Restock, damaged, correction" onChange={(e) => setReason(e.target.value)} /></label>
            {error && <p className="form-error span2">{error}</p>}
            <div className="form-actions span2">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn primary">Update stock</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Products() {
  return (
    <Resource
      title="Products"
      noun="Product"
      endpoint="/products"
      columns={columns}
      fields={fields}
      filters={filters}
      lookups={{ supplier: '/suppliers' }}
      search={(r) => [r.name, r.sku, r.brand, r.category, r.supplier && r.supplier.name].join(' ')}
      actions={(row, reload) => <AdjustStock row={row} reload={reload} />}
      exportName="products.csv"
      exportRow={(r) => ({ Name: r.name, Brand: r.brand, SKU: r.sku, Category: r.category, Price: r.price, Stock: r.stock, ReorderLevel: r.reorderLevel, Supplier: r.supplier ? r.supplier.name : '' })}
    />
  );
}
