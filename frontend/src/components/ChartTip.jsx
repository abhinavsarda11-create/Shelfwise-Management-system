import { money } from '../format';

export default function ChartTip({ active, payload, label, fmt = money }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tip">
      <span>{label || payload[0].name}</span>
      {payload.map((p) => (
        <b key={p.dataKey || p.name}>{fmt(p.value)}</b>
      ))}
    </div>
  );
}
