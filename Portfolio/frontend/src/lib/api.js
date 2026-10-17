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

/**
 * Upload a file with progress (fetch can't report upload progress).
 * - API upload: `path` is an API path; sent as multipart with the session cookie and CSRF token.
 * - Direct upload: `direct: true` with an absolute presigned URL; the raw file is sent with `method`
 *   (PUT for S3/R2 presigned URLs) and exactly the signed `headers`. No cookies or CSRF token are sent.
 */
export async function uploadWithProgress(path, file, { direct = false, method = 'POST', headers = {}, onProgress, signal } = {}) {
  const csrf = direct ? null : await ensureCsrf();
  let body = file;
  if (!direct) {
    body = new FormData();
    body.append('file', file);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(direct ? method : 'POST', direct ? path : `${API_BASE}${path}`);
    xhr.withCredentials = !direct;
    if (csrf) xhr.setRequestHeader('X-CSRFToken', csrf);
    if (!direct) xhr.setRequestHeader('Accept', 'application/json');
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
    xhr.onload = () => {
      let data = null;
      try { data = xhr.responseText && !direct ? JSON.parse(xhr.responseText) : null; } catch { data = null; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data || { detail: direct ? 'The storage service rejected the upload (check the bucket CORS rule).' : undefined }));
    };
    xhr.onerror = () => reject(new ApiError(0, { detail: direct ? 'Could not reach the storage service. Check the bucket CORS rule allows PUT from this site.' : 'The upload failed. Check your connection and try again.' }));
    xhr.onabort = () => reject(new ApiError(0, { detail: 'Upload cancelled.' }));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(body);
  });
}
