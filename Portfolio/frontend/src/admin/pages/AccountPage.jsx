import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../authContext';
import { useToast } from '../toastContext';

export const AccountPage = () => {
  const { user } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState([]);

  const loadSessions = useCallback(() => api('/auth/sessions/').then(setSessions).catch(() => setSessions([])), []);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  const change = async (event) => {
    event.preventDefault();
    if (form.new_password !== form.confirm) {
      setErrors({ confirm: 'The new passwords do not match.' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await api('/auth/change-password/', { method: 'POST', body: { current_password: form.current_password, new_password: form.new_password } });
      setForm({ current_password: '', new_password: '', confirm: '' });
      notify('Password changed. Other sessions were signed out.');
      loadSessions();
    } catch (e) {
      setErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  const signOutOthers = async () => {
    const { revoked } = await api('/auth/sessions/revoke-others/', { method: 'POST' });
    notify(`Signed out ${revoked} other session(s).`);
    loadSessions();
  };

  const pw = (name, label, autoComplete) => ({ name, label, autoComplete });
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-slate-400">{user.email} · <span className="capitalize">{user.role}</span></p>

      <form onSubmit={change} noValidate className="admin-card mt-6 grid gap-4 p-6">
        <h2 className="font-semibold">Change password</h2>
        {[pw('current_password', 'Current password', 'current-password'), pw('new_password', 'New password', 'new-password'), pw('confirm', 'Repeat new password', 'new-password')].map((f) => (
          <div key={f.name}>
            <label className="admin-label" htmlFor={`acc-${f.name}`}>{f.label}</label>
            <input id={`acc-${f.name}`} type="password" autoComplete={f.autoComplete} className="admin-input" value={form[f.name]}
                   aria-invalid={errors[f.name] ? 'true' : undefined} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
            {errors[f.name] && <p className="admin-error">{errors[f.name]}</p>}
          </div>
        ))}
        <p className="admin-hint">At least 12 characters and not a common password.</p>
        <div><button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
      </form>

      <div className="admin-card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Active sessions</h2>
          <button type="button" className="admin-btn admin-btn-sm" disabled={sessions.length < 2} onClick={signOutOthers}>Sign out other sessions</button>
        </div>
        <ul className="mt-4 grid gap-2 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="rounded-lg border border-white/10 px-3 py-2">
              <span className="font-semibold">{s.is_current ? 'This browser' : s.ip_address || 'Unknown device'}</span>
              <span className="block truncate text-xs text-slate-400">{s.user_agent || 'Unknown browser'} · signed in {new Date(s.created_at).toLocaleString()} · expires {new Date(s.expires_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
