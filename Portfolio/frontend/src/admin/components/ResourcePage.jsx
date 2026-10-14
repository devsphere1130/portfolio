import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../toastContext';
import { Drawer, EmptyState, ErrorState, Pagination, Spinner, StatusBadge } from './Feedback';
import { Field } from './Fields';
import { slugify, toPayload } from '../forms';

export const FormGrid = ({ fields, values, errors, onChange }) => (
  <div className="grid gap-5 sm:grid-cols-2">
    {fields.map((field) => (
      <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={onChange} />
    ))}
  </div>
);

/**
 * Config-driven CRUD screen. A new content type only needs a config:
 *   { title, singular, endpoint, fields, columns, titleKey, publishable, reorderable, previewPath, Extra }
 */
export const ResourcePage = ({ config }) => {
  const { notify, confirm } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState({ search: '', status: '', page: 1 });
  const [editing, setEditing] = useState(null); // null | 'new' | item

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api(config.endpoint, { query: { ...query, page_size: config.pageSize || 50, ordering: config.ordering } }));
    } catch (e) {
      setError(e);
    }
  }, [config.endpoint, config.ordering, config.pageSize, query]);

  useEffect(() => {
    const t = setTimeout(load, query.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query.search]);

  const rows = data?.results ?? [];
  const canReorder = config.reorderable && !query.search && !query.status && (data?.count ?? 0) <= (config.pageSize || 50);

  const reorder = async (index, delta) => {
    const ids = rows.map((r) => r.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    try {
      await api(`${config.endpoint}reorder/`, { method: 'POST', body: { ids } });
      await load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
          {config.description && <p className="mt-1 max-w-2xl text-sm text-slate-400">{config.description}</p>}
        </div>
        <div className="flex gap-2">
          {config.previewPath && (
            <a className="admin-btn" href={`${config.previewPath}?preview=1`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Preview site</a>
          )}
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing('new')}><Plus size={16} />New {config.singular}</button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">Search {config.title}</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input className="admin-input pl-9" placeholder={`Search ${config.title.toLowerCase()}`} value={query.search}
                 onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })} />
        </label>
        {config.publishable && (
          <select className="admin-input w-auto" aria-label="Filter by status" value={query.status}
                  onChange={(e) => setQuery({ ...query, status: e.target.value, page: 1 })}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        )}
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : data === null ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title={query.search || query.status ? 'Nothing matches those filters.' : `No ${config.title.toLowerCase()} yet.`}
                    action={!query.search && !query.status && <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing('new')}><Plus size={16} />Create the first one</button>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                {canReorder && <th className="w-20"><span className="sr-only">Order</span></th>}
                {config.columns.map((c) => <th key={c.key}>{c.label}</th>)}
                {config.publishable && <th>Status</th>}
                <th className="text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  {canReorder && (
                    <td>
                      <div className="flex gap-1">
                        <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move ${row[config.titleKey]} up`} disabled={index === 0} onClick={() => reorder(index, -1)}><ArrowUp size={13} /></button>
                        <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move ${row[config.titleKey]} down`} disabled={index === rows.length - 1} onClick={() => reorder(index, 1)}><ArrowDown size={13} /></button>
                      </div>
                    </td>
                  )}
                  {config.columns.map((c, ci) => (
                    <td key={c.key}>
                      {ci === 0 ? (
                        <button type="button" className="text-left font-semibold text-white hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300" onClick={() => setEditing(row)}>
                          {c.render ? c.render(row) : row[c.key] || '—'}
                        </button>
                      ) : (c.render ? c.render(row) : row[c.key] || <span className="text-slate-500">—</span>)}
                    </td>
                  ))}
                  {config.publishable && <td><StatusBadge status={row.status} /></td>}
                  <td className="whitespace-nowrap text-right text-xs text-slate-400">{new Date(row.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={query.page} count={data.count} pageSize={config.pageSize || 50} onPage={(page) => setQuery({ ...query, page })} />}

      {editing && (
        <ResourceEditor
          config={config}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, { close } = {}) => { load(); if (close) setEditing(null); else setEditing(saved); }}
          notify={notify}
          confirm={confirm}
        />
      )}
    </section>
  );
};

const ResourceEditor = ({ config, item, onClose, onSaved, notify, confirm }) => {
  const isNew = item === null;
  const [values, setValues] = useState(() => item || { ...(config.defaults || {}) });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [dirty, setDirty] = useState(false);

  const onChange = (name, value) => {
    setDirty(true);
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'slug') setSlugTouched(true);
      if (name === config.titleKey && !slugTouched && config.fields.some((f) => f.name === 'slug')) next.slug = slugify(value || '');
      return next;
    });
  };

  const run = async (fn, success) => {
    setBusy(true);
    setErrors({});
    try {
      const result = await fn();
      if (success) notify(success);
      return result;
    } catch (e) {
      setErrors(e.fieldErrors || {});
      notify(e.status === 400 ? 'Please fix the highlighted fields.' : e.message, 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const body = toPayload(config.fields, values);
    const saved = await run(() => (isNew
      ? api(config.endpoint, { method: 'POST', body })
      : api(`${config.endpoint}${item.id}/`, { method: 'PATCH', body })), isNew ? `${config.singular} created as a draft.` : 'Changes saved.');
    if (saved) {
      setDirty(false);
      onSaved(saved);
    }
  };

  const setStatus = async (publish) => {
    if (dirty && !(await confirm({ title: 'Save changes first?', message: 'You have unsaved changes. Publishing uses the last saved version.', confirmLabel: 'Continue without saving' }))) return;
    const saved = await run(() => api(`${config.endpoint}${item.id}/${publish ? 'publish' : 'unpublish'}/`, { method: 'POST' }),
      publish ? 'Published — it is now live on the site.' : 'Unpublished — hidden from the site.');
    if (saved) onSaved(saved);
  };

  const remove = async () => {
    const ok = await confirm({ title: `Delete this ${config.singular.toLowerCase()}?`, message: `“${item[config.titleKey]}” will be removed permanently. This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const done = await run(() => api(`${config.endpoint}${item.id}/`, { method: 'DELETE' }), 'Deleted.');
    if (done !== null) onSaved(null, { close: true });
  };

  const close = async () => {
    if (dirty && !(await confirm({ title: 'Discard unsaved changes?', confirmLabel: 'Discard', danger: true }))) return;
    onClose();
  };

  const Extra = config.Extra;
  return (
    <Drawer
      title={isNew ? `New ${config.singular.toLowerCase()}` : item[config.titleKey] || config.singular}
      onClose={close}
      wide={config.wide}
      footer={(
        <>
          {!isNew && <button type="button" className="admin-btn admin-btn-danger mr-auto" disabled={busy} onClick={remove}>Delete</button>}
          {!isNew && config.publishable && (item.status === 'published'
            ? <button type="button" className="admin-btn" disabled={busy} onClick={() => setStatus(false)}>Unpublish</button>
            : <button type="button" className="admin-btn" disabled={busy} onClick={() => setStatus(true)}>Publish</button>)}
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : isNew ? 'Create draft' : 'Save changes'}</button>
        </>
      )}
    >
      {!isNew && config.publishable && (
        <p className="mb-5 flex items-center gap-2 text-sm text-slate-400">
          <StatusBadge status={item.status} />
          {item.status === 'published' ? 'Saved changes appear on the live site immediately.' : 'Drafts are only visible in preview.'}
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <FormGrid fields={config.fields} values={values} errors={errors} onChange={onChange} />
        <button type="submit" className="sr-only">Save</button>
      </form>
      {Extra && !isNew && <div className="mt-8 border-t border-white/10 pt-6"><Extra item={item} /></div>}
    </Drawer>
  );
};
