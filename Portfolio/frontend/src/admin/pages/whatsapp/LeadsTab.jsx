import { useCallback, useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE, api } from '../../../lib/api';
import { EmptyState, ErrorState, Pagination, Spinner } from '../../components/Feedback';
import { LeadDrawer } from './LeadDrawer';
import { LEAD_STATUSES, SOURCES, STATUS_TONE, statusLabel } from './leadMeta';

const SORTS = [['-created_at', 'Newest first'], ['created_at', 'Oldest first'], ['follow_up_at', 'Follow-up date'], ['name', 'Name']];

export const LeadsTab = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(params.get('open'));
  const query = {
    search: params.get('search') || '', lead_status: params.get('lead_status') || '', source: params.get('source') || '',
    assigned: params.get('assigned') || '', due: params.get('due') || '', ordering: params.get('ordering') || '-created_at',
    page: Number(params.get('page') || 1),
  };
  const queryKey = params.toString();

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...changes }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete('open');
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    const q = Object.fromEntries(new URLSearchParams(queryKey));
    delete q.open;
    return api('/admin/inquiries/', { query: { ordering: '-created_at', ...q } }).then(setData).catch(setError);
  }, [queryKey]);

  useEffect(() => {
    const t = setTimeout(load, query.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query.search]);

  const exportUrl = (() => {
    const q = new URLSearchParams(queryKey);
    ['open', 'page'].forEach((k) => q.delete(k));
    return `${API_BASE}/admin/inquiries/export/${q.toString() ? `?${q}` : ''}`;
  })();

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Search inquiries</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input className="admin-input pl-9" placeholder="Name, email, phone, company, message" value={query.search} onChange={(e) => set({ search: e.target.value })} />
        </label>
        <select className="admin-input w-auto" aria-label="Lead status" value={query.lead_status} onChange={(e) => set({ lead_status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="open">Open (not closed)</option>
          {LEAD_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="admin-input w-auto" aria-label="Source" value={query.source} onChange={(e) => set({ source: e.target.value })}>
          <option value="">All sources</option>
          {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="admin-input w-auto" aria-label="Assigned to" value={query.assigned} onChange={(e) => set({ assigned: e.target.value })}>
          <option value="">Anyone</option><option value="me">Assigned to me</option><option value="none">Unassigned</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={query.due === '1'} onChange={(e) => set({ due: e.target.checked ? '1' : '' })} />
          Follow-up due
        </label>
        <select className="admin-input w-auto" aria-label="Sort" value={query.ordering} onChange={(e) => set({ ordering: e.target.value })}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <a className="admin-btn ml-auto" href={exportUrl}><Download size={15} />Export CSV</a>
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : data === null ? <Spinner /> : data.results.length === 0 ? (
        <EmptyState title={queryKey && queryKey !== 'ordering=-created_at' ? 'No inquiries match these filters.' : 'No inquiries yet.'}>
          Messages from the Contact form and the project / capability inquiry buttons appear here.
        </EmptyState>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>From</th><th>Needs</th><th>Source</th><th>Status</th><th>Follow-up</th><th className="text-right">Received</th></tr></thead>
            <tbody>
              {data.results.map((row) => {
                const overdue = row.follow_up_at && new Date(row.follow_up_at) <= new Date();
                return (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="text-left font-semibold hover:text-sky-200" onClick={() => setOpenId(String(row.id))}>{row.name}</button>
                      <span className="block text-xs text-slate-400">{row.email}{row.phone_number ? ` · ${row.phone_number}` : ''}</span>
                    </td>
                    <td>{row.service_label}{row.budget_label && <span className="block text-xs text-slate-500">{row.budget_label}</span>}</td>
                    <td className="text-sm">{row.source_label}{(row.related_project || row.related_capability) && <span className="block text-xs text-slate-500">{(row.related_project || row.related_capability).title}</span>}</td>
                    <td><span className={`admin-badge ${STATUS_TONE[row.lead_status]}`}>{statusLabel(row.lead_status)}</span>{row.assigned_to_name && <span className="block pt-1 text-xs text-slate-500">→ {row.assigned_to_name}</span>}</td>
                    <td className={`whitespace-nowrap text-xs ${overdue ? 'font-semibold text-amber-300' : 'text-slate-400'}`}>{row.follow_up_at ? new Date(row.follow_up_at).toLocaleString() : '—'}</td>
                    <td className="whitespace-nowrap text-right text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={query.page} count={data.count} onPage={(page) => set({ ...query, page: String(page) })} />}
      {openId && <LeadDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
};
