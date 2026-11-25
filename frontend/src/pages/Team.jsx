import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { dateTime } from '../format';
import { toast } from '../toast';
import Modal from '../components/Modal';

const permLabels = {
  'dashboard:view': 'View dashboard',
  'analytics:view': 'View analytics and map',
  'products:read': 'View products',
  'products:write': 'Add and edit products',
  'products:delete': 'Delete products',
  'stock:adjust': 'Adjust stock',
  'stocklog:read': 'View stock log',
  'customers:read': 'View customers',
  'customers:write': 'Add and edit customers',
  'customers:delete': 'Delete customers',
  'suppliers:read': 'View suppliers',
  'suppliers:write': 'Add and edit suppliers',
  'suppliers:delete': 'Delete suppliers',
  'orders:read': 'View orders',
  'orders:create': 'Place orders',
  'orders:update': 'Mark orders delivered',
  'orders:cancel': 'Cancel orders',
  'import:run': 'Import CSV data',
  'team:manage': 'Manage team and roles',
  'workspace:manage': 'Load or reset workspace data',
};

const roleInfo = {
  owner: 'Full control of the store, the team and the data.',
  manager: 'Runs daily operations. Everything except managing the team and resetting data.',
  staff: 'Front counter. Places orders, marks them delivered, adds customers and views products.',
  viewer: 'Read-only access to records and reports. Cannot change anything.',
};

const roles = ['owner', 'manager', 'staff', 'viewer'];
export const RoleBadge = ({ role }) => <span className={'role role-' + role}>{role}</span>;

function MemberForm({ member, onClose, onDone }) {
  const editing = Boolean(member);
  const [form, setForm] = useState({ name: member ? member.name : '', email: member ? member.email : '', role: member ? member.role : 'staff', password: '', active: member ? member.active : true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing) await api.put(`/team/${member.id}`, { name: form.name, role: form.role, active: form.active, password: form.password || undefined });
      else await api.post('/team', { name: form.name, email: form.email, role: form.role, password: form.password });
      toast(editing ? 'Team member updated' : 'Team member added');
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? 'Edit team member' : 'Add team member'} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label><span>Full name</span><input value={form.name} onChange={set('name')} required /></label>
        <label><span>Email</span><input type="email" value={form.email} onChange={set('email')} disabled={editing} required /></label>
        <label className="span2">
          <span>Role</span>
          <select value={form.role} onChange={set('role')}>
            {['manager', 'staff', 'viewer'].map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
          <small>{roleInfo[form.role]}</small>
        </label>
        <label className="span2">
          <span>{editing ? 'New password (leave empty to keep the current one)' : 'Temporary password'}</span>
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required={!editing} />
          <small>At least 8 characters including a letter and a number. Share it with the member privately and ask them to change it in Settings.</small>
        </label>
        {editing && (
          <label className="check span2">
            <input type="checkbox" checked={form.active} onChange={set('active')} />
            <span>Account is active. Untick to block sign-in immediately.</span>
          </label>
        )}
        {error && <p className="form-error span2">{error}</p>}
        <div className="form-actions span2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{editing ? 'Save changes' : 'Add member'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Team() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(() => api.get('/team').then(setData).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => { load(); }, [load]);

  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name}? They will be signed out immediately.`)) return;
    try {
      await api.del(`/team/${m.id}`);
      toast('Team member removed');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (!data) return <p className="empty">Loading your team…</p>;

  return (
    <div className="stack">
      <div className="toolbar">
        <p className="muted grow">Create accounts for your staff and choose what each person can see and do. Changes apply immediately.</p>
        <button className="btn primary" onClick={() => setForm({})}><Plus size={16} />Add team member</button>
      </div>

      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>
              {data.members.map((m, i) => (
                <motion.tr key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }}>
                  <td><strong>{m.name}</strong><small className="sub">{m.email}</small></td>
                  <td><RoleBadge role={m.role} /></td>
                  <td><span className={'badge ' + (m.active ? 'ok' : 'bad')}>{m.active ? 'Active' : 'Deactivated'}</span></td>
                  <td>{m.lastLoginAt ? dateTime(m.lastLoginAt) : 'Never'}</td>
                  <td className="row-actions">
                    {m.role !== 'owner' && (
                      <>
                        <button className="icon" title="Edit member" onClick={() => setForm({ member: m })}><Pencil size={16} /></button>
                        <button className="icon danger" title="Remove member" onClick={() => remove(m)}><Trash2 size={16} /></button>
                      </>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pad">
        <h3>What each role can do</h3>
        <div className="role-cards">
          {roles.map((r) => (
            <div key={r}><RoleBadge role={r} /><p>{roleInfo[r]}</p></div>
          ))}
        </div>
        <div className="table-wrap flush">
          <table className="matrix">
            <thead><tr><th>Permission</th>{roles.map((r) => <th key={r} className="center">{r}</th>)}</tr></thead>
            <tbody>
              {data.matrix.owner.map((p) => (
                <tr key={p}>
                  <td>{permLabels[p] || p}</td>
                  {roles.map((r) => (
                    <td key={r} className="center">{data.matrix[r].includes(p) ? <Check size={16} className="yes" /> : <span className="no">—</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && <MemberForm member={form.member} onClose={() => setForm(null)} onDone={() => { setForm(null); load(); }} />}
    </div>
  );
}
