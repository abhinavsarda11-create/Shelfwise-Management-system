import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IndianRupee, Percent, ShoppingBag, Wallet } from 'lucide-react';
import { api } from '../api';
import { compact, money, num } from '../format';
import { toast } from '../toast';
import CountUp from '../components/CountUp';
import ChartTip from '../components/ChartTip';
import SalesMap from '../components/SalesMap';
import { tints } from './Dashboard';

const ranges = [30, 90, 180, 365];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const tick = { fill: 'rgba(251,228,216,.55)', fontSize: 12 };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

const monthLabel = (id) => new Date(id + '-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export default function Analytics() {
  const [days, setDays] = useState(180);
  const [d, setD] = useState(null);

  useEffect(() => {
    setD(null);
    api.get('/analytics?days=' + days).then(setD).catch((e) => toast(e.message, 'error'));
  }, [days]);

  const picker = (
    <div className="chips">
      {ranges.map((r) => <button key={r} className={r === days ? 'on' : ''} onClick={() => setDays(r)}>{r === 365 ? '1 year' : `${r} days`}</button>)}
    </div>
  );

  if (!d) return (<><div className="toolbar">{picker}</div><p className="empty">Crunching your numbers…</p></>);

  const monthly = d.monthly.map((m) => ({ ...m, label: monthLabel(m._id) }));
  const weekdays = dayNames.map((name, i) => {
    const found = d.weekdays.find((w) => w._id === i + 1);
    return { name, orders: found ? found.orders : 0, revenue: found ? found.revenue : 0 };
  });
  const aov = d.totals.orders ? d.totals.revenue / d.totals.orders : 0;
  const stateTotal = d.states.reduce((s, x) => s + x.revenue, 0) || 1;
  const catPeak = Math.max(...d.categories.map((c) => c.revenue), 1);

  return (
    <motion.div className="dash" variants={container} initial="hidden" animate="show" key={days}>
      <motion.div variants={item} className="toolbar">{picker}</motion.div>

      <div className="kpis">
        {[
          [IndianRupee, 'Revenue', d.totals.revenue, compact],
          [ShoppingBag, 'Orders', d.totals.orders, num],
          [Wallet, 'Average order value', aov, money],
          [Percent, 'Discounts given', d.totals.discount, compact],
        ].map(([Icon, label, value, format]) => (
          <motion.div key={label} variants={item} className="card kpi" whileHover={{ y: -3 }}>
            <div className="kpi-top"><span><Icon size={16} /></span>{label}</div>
            <strong><CountUp value={value} format={format} /></strong>
            <em>Cancelled orders excluded</em>
          </motion.div>
        ))}
      </div>

      <motion.section variants={item} className="card pad">
        <h3>Where your sales come from</h3>
        <p className="muted tight">Revenue by delivery city. Larger circles mean more revenue. Click a circle for details.</p>
        <SalesMap points={d.points} />
      </motion.section>

      <div className="grid-main">
        <motion.section variants={item} className="card pad">
          <h3>Monthly revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(223,182,178,.1)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
              <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={compact} width={62} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(223,182,178,.08)' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#DFB6B2" radius={[6, 6, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section variants={item} className="card pad">
          <h3>Payment methods</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={d.payments} dataKey="revenue" nameKey="_id" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none" animationDuration={1000}>
                {d.payments.map((p, i) => <Cell key={p._id} fill={tints[i % tints.length]} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="legend">
            {d.payments.map((p, i) => <li key={p._id}><i style={{ background: tints[i % tints.length] }} />{p._id}<b>{p.orders} orders</b></li>)}
          </ul>
        </motion.section>
      </div>

      <div className="grid-main even">
        <motion.section variants={item} className="card pad">
          <h3>Orders by weekday</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={weekdays} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(223,182,178,.1)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} />
              <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} />
              <Tooltip content={<ChartTip fmt={(v) => `${v} orders`} />} cursor={{ fill: 'rgba(223,182,178,.08)' }} />
              <Bar dataKey="orders" name="Orders" fill="#854F6C" radius={[6, 6, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section variants={item} className="card pad">
          <h3>Revenue by category</h3>
          <ul className="bars">
            {d.categories.map((c, i) => (
              <li key={c._id}>
                <div><span>{c._id}</span><b>{compact(c.revenue)}</b></div>
                <div className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 + i * 0.07 }} style={{ width: `${(c.revenue / catPeak) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

      <div className="grid-main even">
        <motion.section variants={item} className="card pad">
          <h3>Revenue by state</h3>
          <div className="table-wrap flush">
            <table>
              <thead><tr><th>State</th><th className="num">Orders</th><th className="num">Revenue</th><th className="num">Share</th></tr></thead>
              <tbody>
                {d.states.slice(0, 10).map((s) => (
                  <tr key={s._id}><td>{s._id || 'Unknown'}</td><td className="num">{s.orders}</td><td className="num">{money(s.revenue)}</td><td className="num">{Math.round((s.revenue / stateTotal) * 100)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section variants={item} className="card pad">
          <h3>Top customers</h3>
          <div className="table-wrap flush">
            <table>
              <thead><tr><th>Customer</th><th className="num">Orders</th><th className="num">Spent</th></tr></thead>
              <tbody>
                {d.topCustomers.map((c) => (
                  <tr key={c.id}><td><strong>{c.name}</strong><small className="sub">{c.city}{c.state ? `, ${c.state}` : ''}</small></td><td className="num">{c.orders}</td><td className="num">{money(c.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
