import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { EmptyState, ErrorState, Pagination, Spinner } from '../components/Feedback';

const TYPES = [['', 'All activity'], ['auth', 'Sign-ins'], ['page', 'Pages'], ['project', 'Projects'], ['team_member', 'Team'],
  ['capability', 'Capabilities'], ['service', 'Services'], ['technology', 'Technologies'], ['media', 'Media'],
  ['site_settings', 'Settings'], ['inquiry', 'Inquiries'], ['user', 'Users']];

export const ActivityPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState({ search: '', type: '', page: 1 });

  const load = useCallback(() => {
    const params = { search: query.search, page: query.page };
    if (query.type === 'auth') params.action = 'auth.';
    else if (query.type) params.entity_type = query.type;
    return api('/admin/activity/', { query: params }).then(setData).catch(setError);
  }, [query]);
  useEffect(() => {
    const t = setTimeout(load, query.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query.search]);

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
      <p className="mt-1 text-sm text-slate-400">Who changed what, and when. Passwords and tokens are never recorded.</p>
      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">Search activity</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input className="admin-input pl-9" placeholder="Search activity" value={query.search} onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })} />
        </label>
        <select className="admin-input w-auto" aria-label="Filter by type" value={query.type} onChange={(e) => setQuery({ ...query, type: e.target.value, page: 1 })}>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error ? <ErrorState error={error} onRetry={load} /> : data === null ? <Spinner /> : data.results.length === 0 ? <EmptyState title="No activity matches." /> : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Action</th></tr></thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.actor_name || row.actor_email || <span className="text-slate-500">Anonymous</span>}</td>
                  <td>{row.summary}</td>
                  <td className="font-mono text-xs text-slate-500">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={query.page} count={data.count} onPage={(page) => setQuery({ ...query, page })} />}
    </section>
  );
};
