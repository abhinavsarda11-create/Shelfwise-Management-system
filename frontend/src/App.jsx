import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BarChart3, ClipboardList, History, LayoutDashboard, LogOut, MapPin, Package, Settings as Cog, Truck, Users } from 'lucide-react';
import { api, session } from './api';
import Toasts from './components/Toasts';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import StockLog from './pages/StockLog';
import Settings from './pages/Settings';

const Analytics = lazy(() => import('./pages/Analytics'));

const nav = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: Dashboard },
  { key: 'products', label: 'Products', icon: Package, view: Products },
  { key: 'orders', label: 'Orders', icon: ClipboardList, view: Orders },
  { key: 'customers', label: 'Customers', icon: Users, view: Customers },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, view: Suppliers },
  { key: 'stock', label: 'Stock log', icon: History, view: StockLog },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, view: Analytics },
  { key: 'settings', label: 'Settings', icon: Cog, view: Settings },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!session.token());
  const [page, setPage] = useState(() => location.hash.slice(1) || 'dashboard');

  useEffect(() => {
    if (session.token()) {
      api.get('/auth/me').then(setUser).catch(() => session.clear()).finally(() => setBooting(false));
    }
    const out = () => setUser(null);
    const hash = () => setPage(location.hash.slice(1) || 'dashboard');
    window.addEventListener('signed-out', out);
    window.addEventListener('hashchange', hash);
    return () => {
      window.removeEventListener('signed-out', out);
      window.removeEventListener('hashchange', hash);
    };
  }, []);

  const logout = () => {
    session.clear();
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
    content = <Auth onAuth={setUser} />;
  } else {
    const current = nav.find((n) => n.key === page) || nav[0];
    const View = current.view;
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    content = (
      <div className="shell">
        <aside className="side">
          <div className="brand"><span className="mark">S</span>Shelfwise</div>
          <nav>
            {nav.map(({ key, label, icon: Icon }) => (
              <a key={key} href={'#' + key} className={key === current.key ? 'on' : ''}>
                {key === current.key && <motion.span layoutId="nav-pill" className="pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon size={18} /><span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="side-foot">
            <div>
              <strong>{user.name}</strong>
              <small><MapPin size={12} />{user.storeName}</small>
            </div>
            <button className="icon" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </aside>
        <main className="main">
          <header className="page-head">
            <h1>{current.label}</h1>
            <p>{today} · {user.city}</p>
          </header>
          <AnimatePresence mode="wait">
            <motion.div key={current.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
              <Suspense fallback={<p className="empty">Loading…</p>}><View user={user} onUser={setUser} /></Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {content}
      <Toasts />
    </MotionConfig>
  );
}
