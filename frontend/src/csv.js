export function parseCsv(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const newline = text.indexOf('\n');
  const firstLine = newline === -1 ? text : text.slice(0, newline);
  const delimiter = [',', ';', '\t', '|']
    .map((d) => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const finishRow = () => {
    row.push(field);
    field = '';
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      finishRow();
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) finishRow();

  const headers = (rows.shift() || []).map((h) => h.trim());
  return { headers, rows, delimiter };
}

export const parseNumber = (value) => {
  if (value === null || value === undefined) return NaN;
  let s = String(value).trim();
  if (!/\d/.test(s)) return NaN;
  if (/^-?\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^-?\d+,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  s = s.replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export const parseDate = (value, mode = 'auto') => {
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return null;
  if (/^\d{5}(\.\d+)?$/.test(s) && Number(s) > 20000 && Number(s) < 80000) {
    return new Date(Math.round((Number(s) - 25569) * 86400000)).toISOString();
  }
  let y;
  let mo;
  let d;
  let h;
  let mi;
  let se;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    [, y, mo, d, h, mi, se] = m;
  } else {
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) {
      const t = Date.parse(s);
      return Number.isNaN(t) ? null : new Date(t).toISOString();
    }
    const first = Number(m[1]);
    const second = Number(m[2]);
    const dayFirst = mode === 'dmy' ? true : mode === 'mdy' ? false : !(second > 12 && first <= 12);
    d = dayFirst ? first : second;
    mo = dayFirst ? second : first;
    y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : m[3];
    [, , , , h, mi, se] = m;
  }
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h || 0), Number(mi || 0), Number(se || 0));
  const check = new Date(t);
  if (Number.isNaN(t) || check.getUTCMonth() !== Number(mo) - 1 || check.getUTCDate() !== Number(d)) return null;
  return check.toISOString();
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export function autoMap(headers, fields) {
  const normalized = headers.map(norm);
  const used = new Set();
  const mapping = {};
  fields.forEach((f) => {
    let found = -1;
    for (const synonym of f.synonyms) {
      const i = normalized.findIndex((h, k) => h === synonym && !used.has(k));
      if (i !== -1) {
        found = i;
        break;
      }
    }
    if (found !== -1) used.add(found);
    mapping[f.key] = found;
  });
  return mapping;
}
