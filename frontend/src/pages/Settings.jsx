import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, KeyRound, UserRound } from 'lucide-react';
import { api, getLocations } from '../api';
import { shortDate } from '../format';
import { toast } from '../toast';

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

export default function Settings({ user, onUser }) {
  const [cities, setCities] = useState([]);
  const [profile, setProfile] = useState({ name: user.name, storeName: user.storeName, city: user.city });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState('');

  useEffect(() => { getLocations().then(setCities).catch(() => {}); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try {
      onUser(await api.put('/auth/me', profile));
      toast('Profile updated');
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusy('');
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('password');
    try {
      await api.put('/auth/password', pw);
      setPw({ current: '', next: '' });
      toast('Password updated');
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusy('');
  };

  const loadSample = async () => {
    setBusy('sample');
    try {
      const r = await api.post('/workspace/sample');
      toast(`Loaded ${r.products} products, ${r.customers} customers and ${r.orders} orders`);
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusy('');
  };

  const reset = async () => {
    const typed = window.prompt('This permanently deletes every product, customer, supplier, order and stock record in your workspace. Type RESET to continue.');
    if (typed !== 'RESET') return;
    setBusy('reset');
    try {
      await api.del('/workspace');
      toast('Workspace cleared');
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusy('');
  };

  return (
    <motion.div className="settings" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
      <motion.form variants={item} className="card pad" onSubmit={saveProfile}>
        <h3><UserRound size={17} />Profile and store</h3>
        <div className="form-grid">
          <label><span>Your name</span><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label>
          <label><span>Store name</span><input value={profile.storeName} onChange={(e) => setProfile({ ...profile, storeName: e.target.value })} /></label>
          <label><span>Store city</span>
            <select value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })}>
              {cities.map((c) => <option key={c.city} value={c.city}>{c.city}, {c.state}</option>)}
            </select>
          </label>
          <label><span>Email</span><input value={user.email} disabled /></label>
        </div>
        <div className="form-actions"><span className="muted grow">Member since {shortDate(user.createdAt)}</span><button className="btn primary" disabled={busy === 'profile'}>Save profile</button></div>
      </motion.form>

      <motion.form variants={item} className="card pad" onSubmit={savePassword}>
        <h3><KeyRound size={17} />Change password</h3>
        <div className="form-grid">
          <label><span>Current password</span><input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
          <label><span>New password</span><input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></label>
        </div>
        <p className="muted tight">At least 8 characters including a letter and a number.</p>
        <div className="form-actions"><button className="btn primary" disabled={busy === 'password'}>Update password</button></div>
      </motion.form>

      <motion.section variants={item} className="card pad">
        <h3><Database size={17} />Workspace data</h3>
        <p className="muted">Your workspace is private to your account. Sample data uses real Indian brands and cities with generated customers and orders so every feature has something to show.</p>
        <div className="row">
          <button className="btn primary" onClick={loadSample} disabled={busy === 'sample'}>{busy === 'sample' ? 'Loading…' : 'Load sample data'}</button>
          <button className="btn danger-btn" onClick={reset} disabled={busy === 'reset'}>Reset workspace</button>
        </div>
        <p className="muted tight">Sample data can only be loaded into an empty workspace. Reset first if you already have records.</p>
      </motion.section>
    </motion.div>
  );
}
