import { useCallback, useEffect, useState } from 'react';
import { Mail, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Drawer, EmptyState, ErrorState, Pagination, Spinner } from '../components/Feedback';
import { useToast } from '../toastContext';

const STATUSES = [['new', 'New'], ['in_progress', 'In progress'], ['resolved', 'Resolved']];
const badge = { new: 'admin-badge-new', in_progress: 'admin-badge-draft', resolved: 'admin-badge-published' };

export const InquiriesPage = () => {
  const { notify, confirm } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState({ search: '', status: '', page: 1 });
  const [open, setOpen] = useState(null);

  const load = useCallback(() => api('/admin/inquiries/', { query }).then(setData).catch(setError), [query]);
  useEffect(() => {
    const t = setTimeout(load, query.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query.search]);

  const setStatus = async (inquiry, status) => {
    try {
      const updated = await api(`/admin/inquiries/${inquiry.id}/`, { method: 'PATCH', body: { status } });
      setOpen(updated);
      notify('Status updated.');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const remove = async (inquiry) => {
    if (!(await confirm({ title: 'Delete this inquiry?', message: `The message from ${inquiry.name} will be deleted permanently.`, confirmLabel: 'Delete', danger: true }))) return;
    try {
      await api(`/admin/inquiries/${inquiry.id}/`, { method: 'DELETE' });
      setOpen(null);
      notify('Inquiry deleted.');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>
      <p className="mt-1 text-sm text-slate-400">Messages from the Contact page. Private: only administrators can see these.</p>
      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">Search inquiries</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input className="admin-input pl-9" placeholder="Search name, email, company or message" value={query.search} onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })} />
        </label>
        <select className="admin-input w-auto" aria-label="Filter by status" value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error ? <ErrorState error={error} onRetry={load} /> : data === null ? <Spinner /> : data.results.length === 0 ? (
        <EmptyState title={query.search || query.status ? 'No inquiries match those filters.' : 'No inquiries yet.'}>New messages from the Contact page appear here.</EmptyState>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>From</th><th>Needs</th><th>Budget</th><th>Status</th><th className="text-right">Received</th></tr></thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.id}>
                  <td><button type="button" className="text-left font-semibold hover:text-sky-200" onClick={() => setOpen(row)}>{row.name}</button><span className="block text-xs text-slate-400">{row.email}</span></td>
                  <td>{row.service_label}</td>
                  <td className="text-slate-300">{row.budget_label || '—'}</td>
                  <td><span className={`admin-badge ${badge[row.status]}`}>{STATUSES.find(([v]) => v === row.status)?.[1]}</span></td>
                  <td className="whitespace-nowrap text-right text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={query.page} count={data.count} onPage={(page) => setQuery({ ...query, page })} />}

      {open && (
        <Drawer title={`Inquiry from ${open.name}`} onClose={() => setOpen(null)} footer={(
          <>
            <button type="button" className="admin-btn admin-btn-danger mr-auto" onClick={() => remove(open)}>Delete</button>
            <a className="admin-btn admin-btn-primary" href={`mailto:${open.email}?subject=${encodeURIComponent('Re: your project inquiry')}`}><Mail size={15} />Reply by email</a>
          </>
        )}>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-400">Email</dt><dd><a className="admin-link" href={`mailto:${open.email}`}>{open.email}</a></dd>
            <dt className="text-slate-400">Company</dt><dd>{open.company || '—'}</dd>
            <dt className="text-slate-400">Needs</dt><dd>{open.service_label}</dd>
            <dt className="text-slate-400">Budget</dt><dd>{open.budget_label || '—'}</dd>
            <dt className="text-slate-400">Received</dt><dd>{new Date(open.created_at).toLocaleString()}</dd>
          </dl>
          <h3 className="mt-6 text-sm font-semibold">Message</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-6">{open.details}</p>
          <fieldset className="mt-6">
            <legend className="admin-label">Status</legend>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={open.status === value} onClick={() => setStatus(open, value)}
                        className={`admin-btn admin-btn-sm ${open.status === value ? 'admin-btn-primary' : ''}`}>{label}</button>
              ))}
            </div>
          </fieldset>
        </Drawer>
      )}
    </section>
  );
};
