import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ClipboardList, IndianRupee, Package, ShoppingBag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { api } from '../api';
import { change, compact, dateTime, money, num, shortDate, statusClass } from '../format';
import { toast } from '../toast';
import CountUp from '../components/CountUp';
import ChartTip from '../components/ChartTip';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };
export const tints = ['#FBE4D8', '#DFB6B2', '#B97F96', '#854F6C', '#6B3A6F', '#522B5B'];
const tick = { fill: 'rgba(251,228,216,.55)', fontSize: 12 };

function Kpi({ icon: Icon, label, value, format, delta, sub }) {
  return (
    <motion.div variants={item} className="card kpi" whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <div className="kpi-top"><span><Icon size={16} /></span>{label}</div>
      <strong><CountUp value={value} format={format} /></strong>
      {delta != null ? (
        <em className={delta >= 0 ? 'up' : 'down'}>
          {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(delta).toFixed(1)}% vs previous 30 days
        </em>
      ) : (
        <em>{sub}</em>
      )}
    </motion.div>
  );
}

function Bars({ rows, peak, format }) {
  return (
    <ul className="bars">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div><span>{r.label}</span><b>{format(r.value)}</b></div>
          <div className="track">
            <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] }} style={{ width: `${(r.value / peak) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard({ user }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setD).catch((e) => toast(e.message, 'error'));
  }, []);

  if (!d) return <p className="empty">Loading your dashboard…</p>;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = (user.name || '').split(' ')[0];

  if (d.counts.products === 0 && d.counts.customers === 0) {
    return (
      <motion.div className="card welcome" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <h2>{greet}, {first}</h2>
        <p>Your workspace is empty. Load the sample retail data to explore every feature, or start adding your own products and customers.</p>
        <div className="row">
          <a className="btn primary" href="#settings">Load sample data</a>
          <a className="btn" href="#import">Import a file</a>
          <a className="btn" href="#products">Add products</a>
        </div>
      </motion.div>
    );
  }

  const sales = d.sales.map((s) => ({ ...s, label: new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }) }));
  const aov = d.current.orders ? d.current.revenue / d.current.orders : 0;
  const prevAov = d.previous.orders ? d.previous.revenue / d.previous.orders : 0;
  const catTotal = d.byCategory.reduce((s, c) => s + c.revenue, 0) || 1;
  const topPeak = Math.max(...d.topProducts.map((p) => p.revenue), 1);
  const statePeak = Math.max(...d.byState.map((s) => s.revenue), 1);

  return (
    <motion.div className="dash" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="dash-head">
        <div>
          <h2>{greet}, {first}</h2>
          <p>{d.stale ? `Here is how ${user.storeName} performed in the 30 days up to ${shortDate(d.asOf)}, your latest order.` : `Here is how ${user.storeName} performed over the last 30 days.`}</p>
        </div>
        <div className="pills">
          <a href="#orders"><ClipboardList size={15} />{d.counts.pending} pending orders</a>
          <a href="#products"><AlertTriangle size={15} />{d.lowStock.length} low-stock items</a>
        </div>
      </motion.div>

      <div className="kpis">
        <Kpi icon={IndianRupee} label="Revenue" value={d.current.revenue} format={compact} delta={change(d.current.revenue, d.previous.revenue)} />
        <Kpi icon={ShoppingBag} label="Orders" value={d.current.orders} format={num} delta={change(d.current.orders, d.previous.orders)} />
        <Kpi icon={Wallet} label="Average order value" value={aov} format={money} delta={change(aov, prevAov)} />
        <Kpi icon={Package} label="Stock value" value={d.stock.value} format={compact} sub={`${num(d.stock.units)} units across ${d.counts.products} products`} />
      </div>

      <div className="grid-main">
        <motion.section variants={item} className="card pad">
          <h3>Revenue, last 30 days</h3>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={sales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DFB6B2" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#DFB6B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(223,182,178,.1)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} interval={4} />
              <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={compact} width={62} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: '#854F6C' }} />
              <Area type="monotone" dataKey="total" name="Revenue" stroke="#DFB6B2" strokeWidth={2} fill="url(#rev)" animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section variants={item} className="card pad">
          <h3>Sales by category</h3>
          <div className="donut">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={d.byCategory} dataKey="revenue" nameKey="_id" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none" animationDuration={1000}>
                  {d.byCategory.map((c, i) => <Cell key={c._id} fill={tints[i % tints.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legend">
            {d.byCategory.map((c, i) => (
              <li key={c._id}><i style={{ background: tints[i % tints.length] }} />{c._id}<b>{Math.round((c.revenue / catTotal) * 100)}%</b></li>
            ))}
          </ul>
        </motion.section>
      </div>

      <div className="grid-3">
        <motion.section variants={item} className="card pad">
          <h3>Top products</h3>
          {d.topProducts.length === 0 ? <p className="muted">No sales in the last 30 days.</p> : (
            <Bars rows={d.topProducts.map((p) => ({ key: p._id, label: p._id, value: p.revenue }))} peak={topPeak} format={compact} />
          )}
        </motion.section>

        <motion.section variants={item} className="card pad">
          <h3>Revenue by region</h3>
          {d.byState.length === 0 ? <p className="muted">No location data yet.</p> : (
            <Bars rows={d.byState.map((s) => ({ key: s._id, label: s._id || 'Unknown', value: s.revenue }))} peak={statePeak} format={compact} />
          )}
        </motion.section>

        <motion.section variants={item} className="card pad">
          <h3>Needs restocking</h3>
          {d.lowStock.length === 0 ? <p className="muted">Every product is above its reorder level.</p> : (
            <ul className="list">
              {d.lowStock.map((p) => (
                <li key={p._id}>
                  <div><strong>{p.name}</strong><small>{p.supplier ? p.supplier.name : 'No supplier'}</small></div>
                  <span className={'badge ' + (p.stock === 0 ? 'bad' : 'warn')}>{p.stock === 0 ? 'Out' : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      <motion.section variants={item} className="card pad">
        <h3>Recent orders</h3>
        {d.recentOrders.length === 0 ? <p className="muted">No orders yet.</p> : (
          <div className="table-wrap flush">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th className="num">Total</th><th>Status</th></tr></thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td><strong>{o.orderNo}</strong></td>
                    <td>{o.customer ? o.customer.name : 'Deleted customer'}{o.customer && o.customer.city && <small className="sub">{o.customer.city}</small>}</td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td className="num">{money(o.total)}</td>
                    <td><span className={'badge ' + statusClass(o.status)}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
