import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { childUrl, moveIds, useChildList, useDragSort } from './childList';
import { EmptyState, Spinner } from '../../components/Feedback';
import { FormGrid } from '../../components/ResourcePage';
import { toPayload } from '../../forms';
import { useToast } from '../../toastContext';

const ItemForm = ({ fields, initial, onSubmit, onCancel, submitLabel }) => {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await onSubmit(toPayload(fields, values));
    } catch (err) {
      setErrors(err.fieldErrors || {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-sky-300/20 bg-sky-300/[0.03] p-4" noValidate>
      <FormGrid fields={fields} values={values} errors={errors} onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" className="admin-btn admin-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

/**
 * Generic manager for a project's list items.
 * config: { kind, label, fields, defaults, title(row), summary(row), publishHint }
 */
export const ChildManager = ({ projectId, config, intro }) => {
  const { confirm } = useToast();
  const { rows, setRows, run, reorder } = useChildList(projectId, config.kind);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const dragProps = useDragSort(rows || [], setRows, reorder);
  const url = (...rest) => childUrl(projectId, config.kind, ...rest);

  const create = (body) => run(() => api(url(), { method: 'POST', body }), `${config.label} added.`).then(() => setEditing(null));
  const update = (row, body) => run(() => api(url(row.id), { method: 'PATCH', body }), 'Saved.').then(() => setEditing(null));
  const togglePublished = (row) => run(() => api(url(row.id), { method: 'PATCH', body: { is_published: !row.is_published } }),
    row.is_published ? 'Hidden from the public page.' : 'Shown on the public page.').catch(() => {});
  const remove = async (row) => {
    if (await confirm({ title: `Remove this ${config.label.toLowerCase()}?`, message: `“${config.title(row)}” will be deleted.`, confirmLabel: 'Remove', danger: true })) {
      run(() => api(url(row.id), { method: 'DELETE' }), 'Removed.').catch(() => {});
    }
  };

  if (rows === null) return <Spinner />;
  return (
    <div className="grid gap-4">
      {intro && <p className="max-w-3xl text-sm text-slate-400">{intro}</p>}
      {rows.length === 0 && editing !== 'new' && (
        <EmptyState title={`No ${config.plural || `${config.label.toLowerCase()}s`} yet.`}>This section stays hidden on the public page until you add one.</EmptyState>
      )}
      {rows.length > 0 && (
        <ul className="grid gap-2">
          {rows.map((row, index) => (
            <li key={row.id} {...(editing ? {} : dragProps(index))} className="rounded-lg border border-white/10 bg-white/[0.02]">
              {editing === row.id ? (
                <ItemForm fields={config.fields} initial={row} submitLabel="Save" onCancel={() => setEditing(null)} onSubmit={(body) => update(row, body)} />
              ) : (
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <GripVertical size={16} className="cursor-grab text-slate-500" aria-hidden="true" />
                  {config.thumb?.(row) && <img src={config.thumb(row)} alt="" className="h-12 w-16 rounded object-cover" />}
                  <div className="min-w-[10rem] flex-1">
                    <p className="font-semibold">{config.title(row)}</p>
                    {config.summary?.(row) && <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{config.summary(row)}</p>}
                  </div>
                  {!row.is_published && <span className="admin-badge admin-badge-muted">Hidden</span>}
                  {config.badge?.(row)}
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move ${config.title(row)} up`} disabled={index === 0} onClick={() => reorder(moveIds(rows, index, -1)).catch(() => {})}><ArrowUp size={13} /></button>
                    <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move ${config.title(row)} down`} disabled={index === rows.length - 1} onClick={() => reorder(moveIds(rows, index, 1)).catch(() => {})}><ArrowDown size={13} /></button>
                    <button type="button" className="admin-btn admin-btn-sm" onClick={() => togglePublished(row)} aria-label={row.is_published ? `Hide ${config.title(row)}` : `Show ${config.title(row)}`}>
                      {row.is_published ? <EyeOff size={13} /> : <Eye size={13} />}{row.is_published ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" className="admin-btn admin-btn-sm" onClick={() => setEditing(row.id)}><Pencil size={13} />Edit</button>
                    <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" aria-label={`Remove ${config.title(row)}`} onClick={() => remove(row)}><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === 'new' ? (
        <ItemForm fields={config.fields} initial={config.defaults || {}} submitLabel={`Add ${config.label.toLowerCase()}`} onCancel={() => setEditing(null)} onSubmit={create} />
      ) : (
        <div><button type="button" className="admin-btn" onClick={() => setEditing('new')} disabled={editing !== null}><Plus size={15} />Add {config.label.toLowerCase()}</button></div>
      )}
      {config.publishHint && <p className="text-xs text-slate-500">{config.publishHint}</p>}
    </div>
  );
};
