// Sends a project inquiry to the Django API (POST /api/contact/).
// In development Vite proxies /api to Django; in production set VITE_API_URL if the API lives elsewhere.
const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const TIMEOUT_MS = 15000;

export async function submitInquiry(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/contact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON error page (e.g. a proxy error); the status code is enough.
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}
