import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Download, FileSpreadsheet, Package, Truck, Upload, Users } from 'lucide-react';
import { api } from '../api';
import { downloadCsv, num, shortDate } from '../format';
import { toast } from '../toast';
import { autoMap, parseCsv, parseDate, parseNumber } from '../csv';

const kinds = {
  orders: {
    label: 'Orders',
    icon: ClipboardList,
    blurb: 'Sales history. One row per order line, such as invoice, product code, quantity, price and date. Creates the products and customers it needs.',
    endpoint: '/import/orders',
    fields: [
      { key: 'orderNo', label: 'Order / invoice number', required: true, synonyms: ['invoiceno', 'invoice', 'invoicenumber', 'orderid', 'orderno', 'ordernumber', 'billno', 'transactionid'] },
      { key: 'date', label: 'Order date', required: true, synonyms: ['invoicedate', 'orderdate', 'date', 'datetime', 'timestamp', 'createdat'] },
      { key: 'sku', label: 'Product code', required: true, synonyms: ['stockcode', 'sku', 'productcode', 'itemcode', 'productid'] },
      { key: 'name', label: 'Product name', synonyms: ['description', 'productname', 'itemname', 'product', 'item'] },
      { key: 'quantity', label: 'Quantity', required: true, synonyms: ['quantity', 'qty', 'units'] },
      { key: 'price', label: 'Unit price', required: true, synonyms: ['unitprice', 'price', 'rate', 'mrp', 'sellingprice'] },
      { key: 'customerRef', label: 'Customer ID', synonyms: ['customerid', 'custid', 'customer', 'customercode'] },
      { key: 'customerName', label: 'Customer name', synonyms: ['customername'] },
      { key: 'country', label: 'Country', synonyms: ['country'] },
      { key: 'city', label: 'City', synonyms: ['city', 'town'] },
      { key: 'category', label: 'Category', synonyms: ['category', 'department'] },
      { key: 'payment', label: 'Payment method', synonyms: ['paymentmethod', 'payment', 'paymode'] },
    ],
    template: { Invoice: '536365', InvoiceDate: '2010-12-01 08:26:00', StockCode: '85123A', Description: 'WHITE HANGING HEART T-LIGHT HOLDER', Quantity: 6, Price: 2.55, 'Customer ID': 17850, Country: 'United Kingdom' },
  },
  products: {
    label: 'Products',
    icon: Package,
    blurb: 'A product list or stock sheet. Existing SKUs can be skipped or updated.',
    endpoint: '/import/products',
    fields: [
      { key: 'name', label: 'Product name', required: true, synonyms: ['name', 'productname', 'product', 'description', 'itemname', 'item', 'title'] },
      { key: 'sku', label: 'SKU / code', synonyms: ['sku', 'stockcode', 'code', 'productcode', 'itemcode', 'productid', 'barcode'] },
      { key: 'price', label: 'Price', required: true, synonyms: ['price', 'unitprice', 'mrp', 'rate', 'sellingprice', 'saleprice'] },
      { key: 'category', label: 'Category', synonyms: ['category', 'department', 'type', 'class', 'group'] },
      { key: 'brand', label: 'Brand', synonyms: ['brand', 'manufacturer', 'make'] },
      { key: 'stock', label: 'Stock quantity', synonyms: ['stock', 'quantity', 'qty', 'onhand', 'inventory', 'instock'] },
      { key: 'reorderLevel', label: 'Reorder level', synonyms: ['reorderlevel', 'reorderpoint', 'minstock', 'minimumstock'] },
      { key: 'supplier', label: 'Supplier', synonyms: ['supplier', 'vendor', 'suppliername'] },
    ],
    template: { name: 'Aashirvaad Whole Wheat Atta 5kg', sku: 'STP-001', price: 265, category: 'Staples', brand: 'Aashirvaad', stock: 48, reorderLevel: 15, supplier: 'Gupta Wholesale Traders' },
  },
  customers: {
    label: 'Customers',
    icon: Users,
    blurb: 'A customer list. Duplicates are matched by customer ID, phone or email and skipped.',
    endpoint: '/import/customers',
    fields: [
      { key: 'name', label: 'Customer name', required: true, synonyms: ['name', 'customername', 'fullname', 'customer'] },
      { key: 'externalRef', label: 'Customer ID', synonyms: ['customerid', 'custid', 'customercode', 'id', 'ref'] },
      { key: 'phone', label: 'Phone', synonyms: ['phone', 'mobile', 'mobileno', 'contact', 'phonenumber', 'telephone'] },
      { key: 'email', label: 'Email', synonyms: ['email', 'emailid', 'mail'] },
      { key: 'city', label: 'City', synonyms: ['city', 'town'] },
      { key: 'state', label: 'State', synonyms: ['state', 'province', 'region'] },
      { key: 'pincode', label: 'Pincode', synonyms: ['pincode', 'pin', 'zip', 'zipcode', 'postalcode', 'postcode'] },
      { key: 'country', label: 'Country', synonyms: ['country'] },
      { key: 'address', label: 'Address', synonyms: ['address', 'addressline', 'street'] },
    ],
    template: { name: 'Ravi Kumar', phone: '9876543210', email: 'ravi@example.com', city: 'Pune', pincode: '411001', address: '12, Model Town' },
  },
  suppliers: {
    label: 'Suppliers',
    icon: Truck,
    blurb: 'A supplier or vendor list. Names that already exist are skipped.',
    endpoint: '/import/suppliers',
    fields: [
      { key: 'name', label: 'Supplier name', required: true, synonyms: ['name', 'suppliername', 'vendor', 'vendorname', 'company'] },
      { key: 'phone', label: 'Phone', synonyms: ['phone', 'mobile', 'contact', 'phonenumber', 'telephone'] },
      { key: 'email', label: 'Email', synonyms: ['email', 'emailid', 'mail'] },
      { key: 'city', label: 'City', synonyms: ['city', 'town'] },
      { key: 'address', label: 'Address', synonyms: ['address', 'addressline', 'street'] },
    ],
    template: { name: 'Gupta Wholesale Traders', phone: '9811100001', email: 'orders@example.in', city: 'Delhi', address: 'Sadar Bazaar' },
  },
};

const labels = {
  inserted: 'Added',
  updated: 'Updated',
  skipped: 'Skipped',
  orders: 'Orders added',
  existingOrders: 'Orders already present',
  skippedLines: 'Lines skipped',
  productsCreated: 'Products created',
  customersCreated: 'Customers created',
};

const defaults = { multiplier: '1', dateMode: 'auto', mode: 'skip', startingStock: '100', payment: 'UPI', status: 'Delivered', detectCancellations: true, maxLines: '20000' };

export default function Import() {
  const [kind, setKind] = useState('orders');
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [opts, setOpts] = useState(defaults);
  const [stage, setStage] = useState('pick');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const cancelRef = useRef(false);
  const inputRef = useRef(null);
  const cfg = kinds[kind];

  const setOpt = (key) => (e) => setOpts({ ...opts, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const readFile = async (f) => {
    if (!f) return;
    setError('');
    if (!/\.(csv|tsv|txt)$/i.test(f.name)) {
      setError('Please choose a .csv file. For an Excel file, save it as CSV first, or use tools/xlsx_to_csv.py from the project.');
      return;
    }
    const parsed = parseCsv(await f.text());
    if (parsed.headers.length < 2 || parsed.rows.length === 0) {
      setError('This file looks empty or is not a valid CSV.');
      return;
    }
    setFile({ name: f.name, size: f.size });
    setData(parsed);
    setMapping(autoMap(parsed.headers, cfg.fields));
    setStage('map');
  };

  const cell = (row, key) => (mapping[key] >= 0 ? (row[mapping[key]] === undefined ? '' : row[mapping[key]]) : '');
  const missing = cfg.fields.filter((f) => f.required && !(mapping[f.key] >= 0));

  const stats = useMemo(() => {
    if (!data || kind !== 'orders' || !(mapping.orderNo >= 0)) return null;
    const numbers = new Set();
    let min = Infinity;
    let max = -Infinity;
    data.rows.forEach((r) => {
      numbers.add(r[mapping.orderNo]);
      if (mapping.date >= 0) {
        const d = parseDate(r[mapping.date], opts.dateMode);
        if (d) {
          const t = Date.parse(d);
          if (t < min) min = t;
          if (t > max) max = t;
        }
      }
    });
    return { invoices: numbers.size, from: min === Infinity ? null : new Date(min), to: max === -Infinity ? null : new Date(max) };
  }, [data, kind, mapping, opts.dateMode]);

  const reset = () => {
    setFile(null);
    setData(null);
    setResult(null);
    setError('');
    setStage('pick');
  };

  const buildChunks = () => {
    const multiplier = Number(opts.multiplier) > 0 ? Number(opts.multiplier) : 1;
    if (kind === 'orders') {
      const groups = new Map();
      data.rows.forEach((r) => {
        const orderNo = String(cell(r, 'orderNo')).trim();
        const line = {
          orderNo,
          date: parseDate(cell(r, 'date'), opts.dateMode),
          customerRef: cell(r, 'customerRef'),
          customerName: cell(r, 'customerName'),
          country: cell(r, 'country'),
          city: cell(r, 'city'),
          sku: cell(r, 'sku'),
          name: cell(r, 'name'),
          category: cell(r, 'category'),
          payment: cell(r, 'payment'),
          quantity: parseNumber(cell(r, 'quantity')),
          price: parseNumber(cell(r, 'price')) * multiplier,
        };
        if (!groups.has(orderNo)) groups.set(orderNo, []);
        groups.get(orderNo).push(line);
      });
      const limit = Number(opts.maxLines) > 0 ? Number(opts.maxLines) : Infinity;
      const chunks = [];
      let current = [];
      let invoices = 0;
      let taken = 0;
      for (const lines of groups.values()) {
        if (taken >= limit) break;
        current.push(...lines);
        invoices++;
        taken += lines.length;
        if (current.length >= 2500 || invoices >= 300) {
          chunks.push(current);
          current = [];
          invoices = 0;
        }
      }
      if (current.length) chunks.push(current);
      return chunks;
    }
    const mapRow = (r) => {
      const out = {};
      cfg.fields.forEach((f) => { out[f.key] = cell(r, f.key); });
      if (kind === 'products') {
        out.price = parseNumber(out.price) * multiplier;
        out.stock = parseNumber(out.stock);
        out.reorderLevel = parseNumber(out.reorderLevel);
      }
      return out;
    };
    const rows = data.rows.filter((r) => r.some((v) => String(v).trim() !== '')).map(mapRow);
    const chunks = [];
    for (let i = 0; i < rows.length; i += 1000) chunks.push(rows.slice(i, i + 1000));
    return chunks;
  };

  const run = async () => {
    cancelRef.current = false;
    setError('');
    setResult(null);
    const chunks = buildChunks();
    setProgress({ done: 0, total: chunks.length });
    setStage('run');
    const totals = {};
    const problems = [];
    let failure = '';
    for (let i = 0; i < chunks.length; i++) {
      if (cancelRef.current) break;
      try {
        const body = kind === 'orders'
          ? { lines: chunks[i], options: { startingStock: opts.startingStock, payment: opts.payment, status: opts.status, detectCancellations: opts.detectCancellations } }
          : { rows: chunks[i], mode: opts.mode };
        const r = await api.post(cfg.endpoint, body);
        Object.entries(r).forEach(([k, v]) => { if (typeof v === 'number') totals[k] = (totals[k] || 0) + v; });
        (r.errors || []).forEach((e) => { if (problems.length < 30) problems.push(`Batch ${i + 1}, row ${e.row}: ${e.message}`); });
      } catch (e) {
        failure = e.message;
        break;
      }
      setProgress({ done: i + 1, total: chunks.length });
    }
    setResult({ totals, problems, cancelled: cancelRef.current, failure });
    setStage('done');
    if (!failure) toast(cancelRef.current ? 'Import stopped' : 'Import finished');
  };

  const sample = data ? data.rows.slice(0, 5) : [];
  const shownFields = cfg.fields.filter((f) => mapping[f.key] >= 0);

  return (
    <div className="import">
      <AnimatePresence mode="wait" initial={false}>
        {stage === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="stack">
            <div className="kinds">
              {Object.entries(kinds).map(([key, k]) => {
                const Icon = k.icon;
                return (
                  <button key={key} className={'kind card' + (key === kind ? ' on' : '')} onClick={() => setKind(key)}>
                    <span><Icon size={18} /></span>
                    <strong>{k.label}</strong>
                    <small>{k.blurb}</small>
                  </button>
                );
              })}
            </div>

            <div
              className={'drop card' + (dragging ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current.click()}
            >
              <Upload size={28} />
              <strong>Drop a CSV file here, or click to choose one</strong>
              <small>Importing {cfg.label.toLowerCase()}. Comma, semicolon and tab separated files are detected automatically.</small>
              <input ref={inputRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => { readFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
            {error && <p className="form-error">{error}</p>}

            <div className="row">
              <button className="btn" onClick={() => downloadCsv(`${kind}-template.csv`, [cfg.template])}><Download size={16} />Download a {cfg.label.toLowerCase()} template</button>
              <span className="muted">Using an Excel file? Save it as CSV first, or run tools/xlsx_to_csv.py from the project.</span>
            </div>
          </motion.div>
        )}

        {stage === 'map' && data && (
          <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="stack">
            <div className="card pad file-head">
              <FileSpreadsheet size={22} />
              <div className="grow">
                <strong>{file.name}</strong>
                <small className="sub">{num(data.rows.length)} rows, {data.headers.length} columns, {(file.size / 1048576).toFixed(1)} MB</small>
              </div>
              <button className="btn small" onClick={reset}><ArrowLeft size={15} />Choose another file</button>
            </div>

            <div className="card pad">
              <h3>Match your columns to {cfg.label.toLowerCase()} fields</h3>
              <p className="muted tight">We matched what we could automatically. Change any choice, or set a field to not in file.</p>
              <div className="table-wrap flush">
                <table>
                  <thead><tr><th>Shelfwise field</th><th>Column in your file</th><th>Example value</th></tr></thead>
                  <tbody>
                    {cfg.fields.map((f) => (
                      <tr key={f.key}>
                        <td><strong>{f.label}</strong>{f.required && <small className="sub req">Required</small>}</td>
                        <td>
                          <select value={mapping[f.key]} onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}>
                            <option value={-1}>Not in file</option>
                            {data.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                          </select>
                        </td>
                        <td className="clip">{mapping[f.key] >= 0 && data.rows[0] ? data.rows[0][mapping[f.key]] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card pad">
              <h3>Options</h3>
              <div className="form-grid">
                {(kind === 'orders' || kind === 'products') && (
                  <label><span>Price multiplier</span><input type="number" step="any" min="0" value={opts.multiplier} onChange={setOpt('multiplier')} /></label>
                )}
                {kind === 'orders' && (
                  <>
                    <label>
                      <span>Date format</span>
                      <select value={opts.dateMode} onChange={setOpt('dateMode')}>
                        <option value="auto">Detect automatically</option>
                        <option value="dmy">Day first (31/12/2024)</option>
                        <option value="mdy">Month first (12/31/2024)</option>
                      </select>
                    </label>
                    <label><span>Starting stock for new products</span><input type="number" min="0" value={opts.startingStock} onChange={setOpt('startingStock')} /></label>
                    <label>
                      <span>Payment method when not in file</span>
                      <select value={opts.payment} onChange={setOpt('payment')}>{['UPI', 'Cash', 'Card', 'Credit'].map((p) => <option key={p}>{p}</option>)}</select>
                    </label>
                    <label>
                      <span>Status for imported orders</span>
                      <select value={opts.status} onChange={setOpt('status')}><option>Delivered</option><option>Placed</option></select>
                    </label>
                    <label><span>Import up to this many lines (0 for all)</span><input type="number" min="0" value={opts.maxLines} onChange={setOpt('maxLines')} /></label>
                    <label className="check span2">
                      <input type="checkbox" checked={opts.detectCancellations} onChange={setOpt('detectCancellations')} />
                      <span>Treat invoices starting with C, or negative quantities, as cancelled orders</span>
                    </label>
                  </>
                )}
                {kind === 'products' && (
                  <label>
                    <span>If a SKU already exists</span>
                    <select value={opts.mode} onChange={setOpt('mode')}><option value="skip">Skip it</option><option value="update">Update its details</option></select>
                  </label>
                )}
              </div>
              {kind === 'orders' && (
                <p className="hint tight">
                  Imported orders are history: they do not change stock. A price multiplier converts a currency, for example 105 for pounds to rupees. Rates change, so use your own figure.
                </p>
              )}
            </div>

            {stats && (
              <div className="card pad notice">
                <strong>{num(stats.invoices)} orders found in this file</strong>
                {stats.from && <span>{shortDate(stats.from)} to {shortDate(stats.to)}</span>}
                {stats.from && stats.to < Date.now() - 3 * 86400000 && <span>The dashboard will show the 30 days up to your latest order date, not today.</span>}
                {Number(opts.maxLines) > 0 && data.rows.length > Number(opts.maxLines) && <span>Only the first {num(opts.maxLines)} lines will be imported. Set the limit to 0 to import everything.</span>}
              </div>
            )}

            <div className="card pad">
              <h3>Preview of the first {sample.length} rows</h3>
              <div className="table-wrap flush">
                <table>
                  <thead><tr>{shownFields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                  <tbody>
                    {sample.map((r, i) => <tr key={i}>{shownFields.map((f) => <td key={f.key} className="clip">{cell(r, f.key)}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            {missing.length > 0 && (
              <p className="form-error"><AlertTriangle size={15} /> Still needed: {missing.map((f) => f.label).join(', ')}</p>
            )}
            <div className="form-actions">
              <button className="btn" onClick={reset}>Cancel</button>
              <motion.button className="btn primary" disabled={missing.length > 0} onClick={run} whileTap={{ scale: 0.98 }}>
                <Upload size={16} />Import {cfg.label.toLowerCase()}
              </motion.button>
            </div>
          </motion.div>
        )}

        {stage === 'run' && (
          <motion.div key="run" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card pad run">
            <h3>Importing {cfg.label.toLowerCase()}…</h3>
            <div className="progress"><motion.i animate={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} transition={{ duration: 0.4 }} /></div>
            <p className="muted">Batch {Math.min(progress.done + 1, progress.total)} of {progress.total}. Please keep this page open.</p>
            <button className="btn" onClick={() => { cancelRef.current = true; }}>Stop after this batch</button>
          </motion.div>
        )}

        {stage === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="stack">
            <div className="card pad">
              <h3>{result.failure ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}{result.failure ? 'Import stopped with an error' : result.cancelled ? 'Import stopped' : 'Import complete'}</h3>
              {result.failure && <p className="form-error">{result.failure}</p>}
              <div className="result-grid">
                {Object.entries(result.totals).filter(([k]) => labels[k]).map(([k, v]) => (
                  <div key={k}><strong>{num(v)}</strong><span>{labels[k]}</span></div>
                ))}
              </div>
              {result.problems.length > 0 && (
                <>
                  <h3 className="spaced">Rows that were skipped</h3>
                  <ul className="problems">{result.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </>
              )}
              <div className="row spaced">
                <a className="btn primary" href="#dashboard">Open dashboard</a>
                <a className="btn" href={kind === 'orders' ? '#orders' : `#${kind}`}>View {cfg.label.toLowerCase()}</a>
                <button className="btn" onClick={reset}>Import another file</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
