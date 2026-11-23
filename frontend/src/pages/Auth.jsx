import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Map, ShieldCheck, Warehouse } from 'lucide-react';
import { api, getLocations, session } from '../api';

const shelfLines = [70, 140, 210];
const boxes = [
  [30, 70, 34, 40], [70, 70, 28, 28], [104, 70, 40, 52], [150, 70, 30, 34], [186, 70, 36, 46], [228, 70, 28, 30], [262, 70, 44, 38],
  [30, 140, 44, 36], [80, 140, 30, 50], [116, 140, 36, 30], [158, 140, 40, 44], [204, 140, 30, 34], [240, 140, 46, 52], [292, 140, 30, 26],
  [30, 210, 40, 46], [76, 210, 36, 30], [118, 210, 44, 38], [168, 210, 30, 52], [204, 210, 40, 32], [250, 210, 34, 44], [290, 210, 40, 28],
];

function ShelfArt() {
  return (
    <svg className="shelf-art" viewBox="0 0 340 230" fill="none" aria-hidden="true">
      {shelfLines.map((y, i) => (
        <motion.line key={y} x1="14" x2="326" y1={y} y2={y} stroke="#DFB6B2" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: i * 0.25, ease: 'easeOut' }} />
      ))}
      {boxes.map(([x, y, w, h], i) => (
        <motion.rect
          key={i}
          x={x}
          y={y - h}
          width={w}
          height={h}
          rx="3"
          stroke="#FBE4D8"
          strokeOpacity="0.8"
          strokeWidth="1.2"
          fill="rgba(223,182,178,0.08)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5 + i * 0.07, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
}

const score = (p) => [p.length >= 8, /[A-Za-z]/.test(p) && /\d/.test(p), /[A-Z]/.test(p) || /[^A-Za-z0-9]/.test(p), p.length >= 12].filter(Boolean).length;

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ name: '', storeName: '', city: 'Delhi', email: '', password: '', sample: true });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { getLocations().then(setCities).catch(() => {}); }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const strength = score(form.password);
  const signup = mode === 'register';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = signup ? await api.post('/auth/register', form) : await api.post('/auth/login', { email: form.email, password: form.password });
      session.set(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside className="auth-art">
        <motion.div className="orb orb-a" animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="orb orb-b" animate={{ x: [0, -50, 0], y: [0, 40, 0] }} transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="brand"><span className="mark">S</span>Shelfwise</div>
        <div className="auth-copy">
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            Retail operations, in perfect order.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.7 }}>
            Inventory, orders and customers across every city you sell in, in one calm workspace.
          </motion.p>
          <ShelfArt />
        </div>
        <ul className="auth-points">
          <li><Warehouse size={18} />Live stock with automatic reorder alerts</li>
          <li><Map size={18} />Sales mapped across Indian cities</li>
          <li><ShieldCheck size={18} />Private workspace for every account</li>
        </ul>
      </aside>

      <main className="auth-form">
        <motion.div className="auth-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
          <div className="tabs2" role="tablist">
            {[['login', 'Sign in'], ['register', 'Create account']].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'on' : ''} onClick={() => { setMode(key); setError(''); }}>
                {label}
                {mode === key && <motion.span layoutId="auth-tab" className="tab-line" />}
              </button>
            ))}
          </div>

          <h2>{signup ? 'Set up your store' : 'Welcome back'}</h2>
          <p className="muted">{signup ? 'Create a private workspace for your retail business.' : 'Sign in to continue to your workspace.'}</p>

          <form onSubmit={submit}>
            <AnimatePresence initial={false}>
              {signup && (
                <motion.div key="extra" className="auth-extra" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                  <label><span>Your name</span><input value={form.name} onChange={set('name')} autoComplete="name" required /></label>
                  <label><span>Store name</span><input value={form.storeName} onChange={set('storeName')} placeholder="e.g. Sharma General Store" /></label>
                  <label>
                    <span>Store city</span>
                    <select value={form.city} onChange={set('city')}>
                      {(cities.length ? cities : [{ city: 'Delhi', state: 'Delhi' }]).map((c) => <option key={c.city} value={c.city}>{c.city}, {c.state}</option>)}
                    </select>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <label><span>Email</span><input type="email" value={form.email} onChange={set('email')} autoComplete="username" required /></label>
            <label>
              <span>Password</span>
              <div className="pw">
                <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete={signup ? 'new-password' : 'current-password'} required />
                <button type="button" className="icon" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>

            {signup && (
              <>
                <div className="strength" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => <i key={i} className={i < strength ? 'on' : ''} />)}
                  <small>{['Too short', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</small>
                </div>
                <label className="check">
                  <input type="checkbox" checked={form.sample} onChange={set('sample')} />
                  <span>Start with sample data: 100 real-brand products, 160 customers and 520 orders across Indian cities</span>
                </label>
              </>
            )}

            {error && <p className="form-error">{error}</p>}
            <motion.button className="btn primary block" disabled={busy} whileTap={{ scale: 0.98 }}>
              {busy ? (signup ? 'Creating your workspace…' : 'Signing in…') : signup ? 'Create account' : 'Sign in'}
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
