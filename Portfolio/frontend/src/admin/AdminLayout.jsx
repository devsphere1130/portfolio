import { useEffect, useState } from 'react';
import {
  Activity, Boxes, BriefcaseBusiness, ExternalLink, FileText, Gauge, Image, Inbox, Layers, LogOut, Menu, Settings,
  ShieldCheck, Sparkles, UserCog, Users, X,
} from 'lucide-react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo-clean-512.png';
import { useAuth } from './authContext';
import { Spinner } from './components/Feedback';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Gauge },
  { group: 'Content' },
  { to: '/admin/pages', label: 'Pages & sections', icon: FileText },
  { to: '/admin/projects', label: 'Projects', icon: BriefcaseBusiness },
  { to: '/admin/team', label: 'Team', icon: Users },
  { to: '/admin/capabilities', label: 'Capabilities', icon: Layers },
  { to: '/admin/services', label: 'Services', icon: Sparkles },
  { to: '/admin/technologies', label: 'Technology stack', icon: Boxes },
  { to: '/admin/media', label: 'Media library', icon: Image },
  { group: 'Administration', admin: true },
  { to: '/admin/whatsapp', label: 'Leads & WhatsApp', icon: Inbox, admin: true },
  { to: '/admin/settings', label: 'Site settings', icon: Settings, admin: true },
  { to: '/admin/users', label: 'Users', icon: UserCog, admin: true },
  { to: '/admin/activity', label: 'Activity log', icon: Activity, admin: true },
];

/** Every /admin page except login. The server still authorises each API call; this only routes. */
export const AdminLayout = ({ adminOnly = false }) => {
  const { user, loading, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Checking your session…" /></div>;
  if (!user) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  const signOut = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-[120] flex w-[260px] flex-col border-r border-white/10 bg-[#060a12] transition-[transform,visibility] lg:sticky lg:top-0 lg:h-screen lg:visible lg:translate-x-0 ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4">
          <img src={logoUrl} alt="DevSphere" className="h-12 w-auto" />
          <button type="button" className="admin-btn admin-btn-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={16} /></button>
        </div>
        <nav className="admin-scroll flex-1 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
          {NAV.filter((item) => !item.admin || isAdmin).map((item) => (item.group ? (
            <p key={item.group} className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.group}</p>
          ) : (
            <NavLink key={item.to} to={item.to}
                     className={({ isActive }) => `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${isActive ? 'bg-sky-300/12 font-semibold text-sky-100' : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'}`}>
              <item.icon size={16} aria-hidden="true" />{item.label}
            </NavLink>
          )))}
        </nav>
        <div className="border-t border-white/10 p-4 text-sm">
          <NavLink to="/admin/account" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-sky-300/40 bg-sky-300/10 text-xs font-semibold text-sky-100">{(user.name || user.email).slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{user.name || user.email}</span>
              <span className="flex items-center gap-1 text-xs capitalize text-slate-400"><ShieldCheck size={12} aria-hidden="true" />{user.role}</span>
            </span>
          </NavLink>
          <div className="mt-3 flex gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-sm flex-1"><ExternalLink size={13} />View site</a>
            <button type="button" className="admin-btn admin-btn-sm flex-1" onClick={signOut}><LogOut size={13} />Sign out</button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-[110] bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="min-w-0">
        <header className="sticky top-0 z-[100] flex items-center gap-3 border-b border-white/10 bg-[#05070a]/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu size={16} /></button>
          <span className="font-semibold">DevSphere admin</span>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {adminOnly && !isAdmin ? <p role="alert" className="text-sm text-slate-300">Only administrators can open this page.</p> : <Outlet />}
        </main>
      </div>
    </div>
  );
};
