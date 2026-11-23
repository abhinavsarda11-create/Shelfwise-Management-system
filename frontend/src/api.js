const TOKEN = 'shelfwise_token';

export const session = {
  token: () => localStorage.getItem(TOKEN),
  set: (token) => localStorage.setItem(TOKEN, token),
  clear: () => localStorage.removeItem(TOKEN),
};

async function request(path, options = {}) {
  const token = session.token();
  const res = await fetch('/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    session.clear();
    window.dispatchEvent(new Event('signed-out'));
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

let locations = null;
export const getLocations = () => {
  if (!locations) locations = api.get('/locations').catch((error) => { locations = null; throw error; });
  return locations;
};
