export const money = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

export const compact = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2) + ' L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + 'K';
  return '₹' + Math.round(v);
};

export const num = (n) => Math.round(Number(n || 0)).toLocaleString('en-IN');

export const dateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const statusClass = (status) => ({ Placed: 'info', Delivered: 'ok', Cancelled: 'bad' }[status] || 'info');

export const change = (current, previous) => (previous ? ((current - previous) / previous) * 100 : null);

export const nearestCity = (cities, lat, lng) => {
  const rad = (x) => (x * Math.PI) / 180;
  const dist = (c) => {
    const a = Math.sin(rad(c.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(c.lat)) * Math.sin(rad(c.lng - lng) / 2) ** 2;
    return 2 * Math.asin(Math.sqrt(a));
  };
  return cities.reduce((best, c) => (dist(c) < dist(best) ? c : best), cities[0]);
};

export const downloadCsv = (name, rows) => {
  if (!rows.length) return;
  const heads = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [heads.join(','), ...rows.map((r) => heads.map((h) => esc(r[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
