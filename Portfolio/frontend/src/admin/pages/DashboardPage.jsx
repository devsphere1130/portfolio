import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../authContext';
import { ErrorState, Spinner } from '../components/Feedback';

const Stat = ({ label, value, sub, to }) => (
  <Link to={to} className="admin-card group block p-5 transition-colors hover:border-sky-300/40">
    <p className="flex items-center justify-between text-sm text-slate-400">{label}<ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" /></p>
    <p className="mt-2 font-mono text-3xl font-semibold text-white">{value}</p>
    {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
  </Link>
);

export const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api('/admin/dashboard/').then(setData).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return <Spinner />;
  const pub = (key) => `${data[key].published} published · ${data[key].total - data[key].published} draft`;
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back{user.name ? `, ${user.name}` : ''}</h1>
      <p className="mt-1 text-sm text-slate-400">Every number here comes straight from the database.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published projects" value={data.projects.published} sub={pub('projects')} to="/admin/projects" />
        <Stat label="Team members" value={data.team_members.published} sub={pub('team_members')} to="/admin/team" />
        <Stat label="Pages / sections" value={`${data.pages.total} / ${data.pages.sections}`}
              sub={data.pages.with_unpublished_changes ? `${data.pages.with_unpublished_changes} page(s) with unpublished changes` : 'All pages published'} to="/admin/pages" />
        {isAdmin
          ? <Stat label="New inquiries" value={data.inquiries.new} sub={`${data.inquiries.total} total`} to="/admin/inquiries" />
          : <Stat label="Media library" value={data.media.total} sub="images" to="/admin/media" />}
        <Stat label="Capabilities" value={data.capabilities.published} sub={pub('capabilities')} to="/admin/capabilities" />
        <Stat label="Services" value={data.services.published} sub={pub('services')} to="/admin/services" />
        <Stat label="Technologies" value={data.technologies.published} sub={pub('technologies')} to="/admin/technologies" />
        {isAdmin && <Stat label="Media library" value={data.media.total} sub="images" to="/admin/media" />}
      </div>
      {isAdmin && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link to="/admin/activity" className="admin-link text-sm">View all</Link>
          </div>
          {data.recent_activity.length === 0 ? <p className="text-sm text-slate-400">No activity yet.</p> : (
            <ul className="admin-card divide-y divide-white/10">
              {data.recent_activity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                  <span><span className="text-slate-300">{entry.actor_name || entry.actor_email || 'System'}</span> <span className="text-slate-500">·</span> {entry.summary}</span>
                  <time className="text-xs text-slate-500" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
