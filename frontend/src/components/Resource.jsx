import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Download, LocateFixed, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, getLocations } from '../api';
import { downloadCsv, nearestCity } from '../format';
import { toast } from '../toast';
import Modal from './Modal';
import { Pager, usePaged } from './Pager';

function RecordForm({ noun, endpoint, fields, options, row, onDone, onClose }) {
  const visible = fields.filter((f) => !(row && f.createOnly));
  const [cities, setCities] = useState([]);
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      visible.map((f) => {
        const v = row ? row[f.name] : '';
        return [f.name, v && typeof v === 'object' ? v._id : v ?? ''];
      })
    )
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible.some((f) => f.type === 'city')) getLocations().then(setCities).catch(() => {});
  }, []);

  const set = (name) => (e) => setValues({ ...values, [name]: e.target.value });

  const detect = () => {
    if (!navigator.geolocation) return toast('Location is not supported in this browser', 'error');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = nearestCity(cities, latitude, longitude);
        setValues((v) => ({ ...v, city: nearest.city, lat: latitude, lng: longitude }));
        toast(`Detected near ${nearest.city}, ${nearest.state}`);
      },
      () => toast('Location permission was denied', 'error'),
      { timeout: 8000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (row) await api.put(`${endpoint}/${row._id}`, values);
      else await api.post(endpoint, values);
      toast(row ? `${noun} updated` : `${noun} added`);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const control = (f) => {
    if (f.type === 'select') {
      return (
        <select value={values[f.name]} onChange={set(f.name)}>
          <option value="">None</option>
          {(options[f.name] || []).map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
      );
    }
    if (f.type === 'choice') {
      return (
        <select value={values[f.name]} onChange={set(f.name)}>
          <option value="">Select</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'city') {
      return (
        <div className="city-row">
          <select value={values[f.name]} onChange={set(f.name)}>
            <option value="">Select city</option>
            {cities.map((c) => <option key={c.city} value={c.city}>{c.city}, {c.state}</option>)}
          </select>
          <button type="button" className="btn small" onClick={detect} disabled={!cities.length}><LocateFixed size={15} />Use my location</button>
        </div>
      );
    }
    return <input type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined} value={values[f.name]} onChange={set(f.name)} />;
  };

  return (
    <Modal title={row ? `Edit ${noun.toLowerCase()}` : `Add ${noun.toLowerCase()}`} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        {visible.map((f) => (
          <label key={f.name} className={f.span === 2 ? 'span2' : ''}>
            <span>{f.label}</span>
            {control(f)}
          </label>
        ))}
        {error && <p className="form-error span2">{error}</p>}
        <div className="form-actions span2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{row ? 'Save changes' : `Add ${noun.toLowerCase()}`}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Resource({ title, noun, endpoint, columns, fields, search, actions, lookups = {}, filters = [], exportRow, exportName }) {
  const [rows, setRows] = useState(null);
  const [options, setOptions] = useState({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(0);
  const [sort, setSort] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(() => api.get(endpoint).then(setRows).catch((e) => toast(e.message, 'error')), [endpoint]);

  useEffect(() => {
    load();
    Object.entries(lookups).forEach(([key, path]) => api.get(path).then((d) => setOptions((o) => ({ ...o, [key]: d }))));
  }, [load]);

  const shown = useMemo(() => {
    let list = (rows || []).filter((r) => search(r).toLowerCase().includes(query.toLowerCase()));
    if (filters[filter]) list = list.filter(filters[filter].test);
    if (sort) {
      const col = columns[sort.index];
      list = [...list].sort((a, b) => {
        const x = col.sort(a);
        const y = col.sort(b);
        return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
      });
    }
    return list;
  }, [rows, query, filter, sort]);

  const pager = usePaged(shown, 12);

  const toggleSort = (index) => setSort((s) => (s && s.index === index ? { index, dir: -s.dir } : { index, dir: 1 }));

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${noun.toLowerCase()}?`)) return;
    try {
      await api.del(`${endpoint}/${row._id}`);
      toast(`${noun} deleted`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="toolbar">
        <label className="searchbox">
          <Search size={16} />
          <input placeholder={`Search ${title.toLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {filters.length > 0 && (
          <div className="chips">
            {filters.map((f, i) => (
              <button key={f.label} className={i === filter ? 'on' : ''} onClick={() => setFilter(i)}>{f.label}</button>
            ))}
          </div>
        )}
        <div className="toolbar-end">
          {exportRow && (
            <button className="btn" onClick={() => downloadCsv(exportName, shown.map(exportRow))} disabled={!shown.length}><Download size={16} />Export</button>
          )}
          <button className="btn primary" onClick={() => setForm({})}><Plus size={16} />Add {noun.toLowerCase()}</button>
        </div>
      </div>

      <div className="card table-card">
        {rows === null ? (
          <p className="empty">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="empty">{rows.length ? 'Nothing matches your search.' : `No ${title.toLowerCase()} yet. Add the first one.`}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c, i) => (
                    <th key={c.label} className={(c.num ? 'num ' : '') + (c.sort ? 'sortable' : '')} onClick={c.sort ? () => toggleSort(i) : undefined}>
                      {c.label}
                      {sort && sort.index === i && (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((r, idx) => (
                  <motion.tr key={r._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: idx * 0.02 }}>
                    {columns.map((c) => <td key={c.label} className={c.num ? 'num' : ''}>{c.render(r)}</td>)}
                    <td className="row-actions">
                      {actions && actions(r, load)}
                      <button className="icon" title="Edit" onClick={() => setForm({ row: r })}><Pencil size={16} /></button>
                      <button className="icon danger" title="Delete" onClick={() => remove(r)}><Trash2 size={16} /></button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager {...pager} />
      </div>

      {form && (
        <RecordForm
          noun={noun}
          endpoint={endpoint}
          fields={fields}
          options={options}
          row={form.row}
          onClose={() => setForm(null)}
          onDone={() => { setForm(null); load(); }}
        />
      )}
    </>
  );
}
