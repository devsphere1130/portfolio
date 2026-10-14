// Shared API client. Sessions live in an HttpOnly cookie set by Django; the CSRF token is kept in
// memory only (never localStorage) and sent on every unsafe request.
export const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

let csrfToken = null;

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.detail || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }

  // DRF field errors -> { field: 'first message' }
  get fieldErrors() {
    if (!this.data || typeof this.data !== 'object') return {};
    return Object.fromEntries(
      Object.entries(this.data)
        .filter(([key]) => key !== 'detail')
        .map(([key, value]) => [key, Array.isArray(value) ? flatten(value) : typeof value === 'object' ? flatten(Object.values(value)) : String(value)]),
    );
  }
}

const flatten = (value) => (Array.isArray(value) ? value.map(flatten).join(' ') : typeof value === 'object' && value ? flatten(Object.values(value)) : String(value));

export const setCsrfToken = (token) => {
  csrfToken = token || csrfToken;
};

export async function ensureCsrf(force = false) {
  if (csrfToken && !force) return csrfToken;
  const response = await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' });
  setCsrfToken((await response.json()).csrfToken);
  return csrfToken;
}

export async function api(path, { method = 'GET', body, query, signal, retry = true } = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = { Accept: 'application/json' };
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (unsafe) headers['X-CSRFToken'] = await ensureCsrf();

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    credentials: 'include',
    signal,
  });
  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  // A rotated or missing CSRF token (e.g. after login elsewhere): refresh once and retry.
  if (response.status === 403 && unsafe && retry && /csrf/i.test(data?.detail || '')) {
    await ensureCsrf(true);
    return api(path, { method, body, query, signal, retry: false });
  }
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}
