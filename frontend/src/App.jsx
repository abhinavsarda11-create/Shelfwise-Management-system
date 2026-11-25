import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BarChart3, ClipboardList, History, LayoutDashboard, LogOut, MapPin, Package, Settings as Cog, ShieldAlert, ShieldCheck, Truck, Upload, Users } from 'lucide-react';
import { api, session } from './api';
import { AuthContext } from './auth';
import Toasts from './components/Toasts';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import StockLog from './pages/StockLog';
import Settings from './pages/Settings';
import Import from './pages/Import';
import Team, { RoleBadge } from './pages/Team';

const Analytics = lazy(() => import('./pages/Analytics'));

const nav = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: Dashboard, perm: 'dashboard:view' },
  { key: 'products', label: 'Products', icon: Package, view: Products, perm: 'products:read' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, view: Orders, perm: 'orders:read' },
  { key: 'customers', label: 'Customers', icon: Users, view: Customers, perm: 'customers:read' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, view: Suppliers, perm: 'suppliers:read' },
  { key: 'stock', label: 'Stock log', icon: History, view: StockLog, perm: 'stocklog:read' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, view: Analytics, perm: 'analytics:view' },
  { key: 'import', label: 'Import', icon: Upload, view: Import, perm: 'import:run' },
  { key: 'team', label: 'Team', icon: ShieldCheck, view: Team, perm: 'team:manage' },
  { key: 'settings', label: 'Settings', icon: Cog, view: Settings },
];

function Forbidden({ label, role, home }) {
  return (
    <motion.div className="card forbidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <ShieldAlert size={30} />
      <h2>Access denied</h2>
      <p>Your role ({role}) does not have access to {label}. Ask your store owner if you need it.</p>
      <a className="btn primary" href={`#${home}`}>Go to your home page</a>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!session.token());
  const [page, setPage] = useState(() => location.hash.slice(1));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (session.token()) {
      api.get('/auth/me').then(setUser).catch(() => session.clear()).finally(() => setBooting(false));
    }
    const out = (e) => {
      setUser(null);
      setNotice(e.detail || '');
    };
    const hash = () => setPage(location.hash.slice(1));
    window.addEventListener('signed-out', out);
    window.addEventListener('hashchange', hash);
    return () => {
      window.removeEventListener('signed-out', out);
      window.removeEventListener('hashchange', hash);
    };
  }, []);

  const logout = () => {
    session.clear();
    setNotice('');
    setUser(null);
  };

  let content;
  if (booting) {
    content = (
      <div className="splash">
        <motion.span className="mark" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>S</motion.span>
      </div>
    );
  } else if (!user) {
    content = <Auth onAuth={(u) => { setNotice(''); setUser(u); }} notice={notice} />;
  } else {
    const can = (permission) => !permission || user.permissions.includes(permission);
    const allowed = nav.filter((n) => can(n.perm));
    const home = can('dashboard:view') ? 'dashboard' : can('orders:read') ? 'orders' : allowed[0].key;
    const current = nav.find((n) => n.key === page) || nav.find((n) => n.key === home);
    const blocked = !can(current.perm);
    const View = current.view;
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    content = (
      <AuthContext.Provider value={{ user, can }}>
        <div className="shell">
          <aside className="side">
            <div className="brand"><span className="mark">S</span>Shelfwise</div>
            <nav>
              {allowed.map(({ key, label, icon: Icon }) => (
                <a key={key} href={'#' + key} className={key === current.key ? 'on' : ''}>
                  {key === current.key && !blocked && <motion.span layoutId="nav-pill" className="pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={18} /><span>{label}</span>
                </a>
              ))}
            </nav>
            <div className="side-foot">
              <div>
                <strong>{user.name}</strong>
                <small><MapPin size={12} />{user.storeName}</small>
                <RoleBadge role={user.role} />
              </div>
              <button className="icon" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
            </div>
          </aside>
          <main className="main">
            <header className="page-head">
              <h1>{blocked ? 'Access denied' : current.label}</h1>
              <p>{today} · {user.city}</p>
            </header>
            <AnimatePresence mode="wait">
              <motion.div key={current.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
                {blocked ? (
                  <Forbidden label={current.label} role={user.role} home={home} />
                ) : (
                  <Suspense fallback={<p className="empty">Loading…</p>}><View user={user} onUser={setUser} /></Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {content}
      <Toasts />
    </MotionConfig>
  );
}
