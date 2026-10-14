import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '../../assets/logo-clean-512.png';
import { useAuth } from '../authContext';

export const LoginPage = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next');
  const target = next && next.startsWith('/admin') ? next : '/admin/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);
  if (!loading && user) return <Navigate to={target} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate(target, { replace: true });
    } catch (e) {
      setError(e.status === 429 ? 'Too many sign-in attempts. Wait a minute and try again.'
        : e.status === 400 ? (e.data?.detail || 'Incorrect email or password.')
          : e.status === 403 ? 'The security check failed. Reload the page and try again. (Admins: check CSRF_TRUSTED_ORIGINS.)'
            : 'Could not reach the server. Check that the API is running.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgb(56 189 248 / 10%), transparent 60%), #05070a' }}>
      <div className="w-full max-w-sm">
        <img src={logoUrl} alt="DevSphere" className="mx-auto mb-6 h-20 w-auto" />
        <form onSubmit={submit} noValidate className="admin-card p-7" aria-describedby={error ? 'login-error' : undefined}>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-sky-300"><LockKeyhole size={14} aria-hidden="true" />Admin dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
          <div className="mt-6 grid gap-4">
            <div>
              <label htmlFor="login-email" className="admin-label">Email</label>
              <input ref={emailRef} id="login-email" type="email" autoComplete="username" inputMode="email" className="admin-input"
                     value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error ? 'true' : undefined} />
            </div>
            <div>
              <label htmlFor="login-password" className="admin-label">Password</label>
              <div className="relative">
                <input id="login-password" type={show ? 'text' : 'password'} autoComplete="current-password" className="admin-input pr-11"
                       value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error ? 'true' : undefined} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p id="login-error" role="alert" className="rounded-md border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
            <button type="submit" className="admin-btn admin-btn-primary mt-1 h-11" disabled={busy}>
              {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" />Signing in…</> : 'Sign in'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">Accounts are created by an administrator. There is no public sign-up.</p>
      </div>
    </main>
  );
};
