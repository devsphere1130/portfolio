import { useCallback, useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Spinner } from './Feedback';

/**
 * Renders one form field from a config object:
 *   { name, label, type, hint, required, options, placeholder, rows, keys }
 * Types: text, textarea, url, email, number, date, slug, select, boolean, list, steps, pairs, stats, cards,
 *        link, social, media.
 */
export const Field = ({ field, value, onChange, error }) => {
  const id = useId();
  const describedBy = [field.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const common = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy };
  const set = (next) => onChange(field.name, next);
  const isGroup = ['list', 'steps', 'pairs', 'stats', 'cards', 'link', 'social', 'media', 'boolean'].includes(field.type);

  let control;
  switch (field.type) {
    case 'textarea':
      control = <textarea {...common} className="admin-input" rows={field.rows || 4} value={value ?? ''} placeholder={field.placeholder}
                          maxLength={field.maxLength} onChange={(e) => set(e.target.value)} />;
      break;
    case 'select':
      control = (
        <select {...common} className="admin-input" value={value ?? ''} onChange={(e) => set(e.target.value)}>
          {!field.required && <option value="">—</option>}
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'boolean':
      control = (
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input {...common} type="checkbox" className="h-4 w-4 accent-sky-400" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} />
          {field.checkboxLabel || field.label}
        </label>
      );
      break;
    case 'number':
      control = <input {...common} type="number" min={0} className="admin-input max-w-[10rem]" value={value ?? 0} onChange={(e) => set(Number(e.target.value))} />;
      break;
    case 'date':
      control = <input {...common} type="date" className="admin-input max-w-[12rem]" value={value ?? ''} onChange={(e) => set(e.target.value || null)} />;
      break;
    case 'list':
      control = <ListEditor value={value || []} onChange={set} placeholder={field.placeholder} />;
      break;
    case 'steps':
      control = <RowsEditor value={value || []} onChange={set} keys={[['label', 'Step name'], ['text', 'What happens']]} addLabel="Add step" />;
      break;
    case 'pairs':
      control = <RowsEditor value={value || []} onChange={set} keys={[['label', 'Label'], ['value', 'Value']]} addLabel="Add row" />;
      break;
    case 'stats':
      control = <RowsEditor value={value || []} onChange={set} keys={[['value', 'Value (e.g. 15+)'], ['label', 'Label']]} addLabel="Add stat" />;
      break;
    case 'cards':
      control = <RowsEditor value={value || []} onChange={set} keys={[['title', 'Card title'], ['description', 'Card text']]} addLabel="Add card" />;
      break;
    case 'social':
      control = <RowsEditor value={value || []} onChange={set} keys={[['label', 'Network (e.g. GitHub)'], ['url', 'https://…']]} addLabel="Add link" />;
      break;
    case 'link':
      control = (
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="admin-input" aria-label={`${field.label} label`} placeholder="Button text" value={value?.label ?? ''}
                 onChange={(e) => set({ ...(value || {}), label: e.target.value })} />
          <input className="admin-input" aria-label={`${field.label} link`} placeholder="/contact, #work or https://…" value={value?.href ?? ''}
                 onChange={(e) => set({ ...(value || {}), href: e.target.value })} />
        </div>
      );
      break;
    case 'media':
      control = <MediaInput value={value} onChange={set} />;
      break;
    default:
      control = <input {...common} type={field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : 'text'} className="admin-input"
                       value={value ?? ''} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(e) => set(e.target.value)} />;
  }

  return (
    <div className={field.full === false ? '' : 'sm:col-span-2'}>
      {field.type !== 'boolean' && (isGroup
        ? <p className="admin-label">{field.label}{field.required && <span className="text-sky-300"> *</span>}</p>
        : <label htmlFor={id} className="admin-label">{field.label}{field.required && <span className="text-sky-300"> *</span>}</label>)}
      {control}
      {field.hint && <p id={`${id}-hint`} className="admin-hint">{field.hint}</p>}
      {error && <p id={`${id}-error`} className="admin-error">{error}</p>}
    </div>
  );
};

const move = (list, index, delta) => {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + delta, 0, item);
  return next;
};

const ListEditor = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (text) onChange([...value, text]);
    setDraft('');
  };
  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] py-1 pl-3 pr-1 text-sm">
              {item}
              <button type="button" className="rounded-full p-1 text-slate-400 hover:text-white" aria-label={`Remove ${item}`}
                      onClick={() => onChange(value.filter((_, i) => i !== index))}><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input className="admin-input" value={draft} placeholder={placeholder || 'Type and press Enter'} onChange={(e) => setDraft(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="admin-btn" onClick={add}><Plus size={15} />Add</button>
      </div>
    </div>
  );
};

const RowsEditor = ({ value, onChange, keys, addLabel }) => {
  const update = (index, key, text) => onChange(value.map((row, i) => (i === index ? { ...row, [key]: text } : row)));
  return (
    <div className="grid gap-2">
      {value.map((row, index) => (
        <div key={index} className="flex flex-wrap items-start gap-2 rounded-lg border border-white/10 p-2 sm:flex-nowrap">
          {keys.map(([key, placeholder], k) => (
            <input key={key} className={`admin-input ${k === 0 && keys.length > 1 ? 'sm:max-w-[40%]' : ''}`} placeholder={placeholder}
                   aria-label={`${placeholder} ${index + 1}`} value={row[key] ?? ''} onChange={(e) => update(index, key, e.target.value)} />
          ))}
          <div className="flex shrink-0 gap-1">
            <button type="button" className="admin-btn admin-btn-sm" aria-label="Move up" disabled={index === 0} onClick={() => onChange(move(value, index, -1))}><ArrowUp size={14} /></button>
            <button type="button" className="admin-btn admin-btn-sm" aria-label="Move down" disabled={index === value.length - 1} onClick={() => onChange(move(value, index, 1))}><ArrowDown size={14} /></button>
            <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" aria-label="Remove row" onClick={() => onChange(value.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      <div><button type="button" className="admin-btn admin-btn-sm" onClick={() => onChange([...value, Object.fromEntries(keys.map(([k]) => [k, '']))])}><Plus size={14} />{addLabel}</button></div>
    </div>
  );
};

/** Media field value is the API's {id, url, thumbnail_url, alt_text}; saving sends just the id. */
const MediaInput = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? (
        <img src={value.thumbnail_url || value.url} alt={value.alt_text || ''} className="h-20 w-28 rounded-md border border-white/10 object-cover" />
      ) : (
        <div className="grid h-20 w-28 place-items-center rounded-md border border-dashed border-white/20 text-xs text-slate-500">No image</div>
      )}
      <div className="flex gap-2">
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => setOpen(true)}><ImagePlus size={14} />{value ? 'Change' : 'Choose image'}</button>
        {value && <button type="button" className="admin-btn admin-btn-sm" onClick={() => onChange(null)}>Remove</button>}
      </div>
      {open && <MediaPicker onClose={() => setOpen(false)} onPick={(asset) => { onChange(asset); setOpen(false); }} />}
    </div>
  );
};

export const MediaPicker = ({ onClose, onPick }) => {
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await api('/admin/media/', { query: { search, page_size: 60 } });
    setItems(data.results);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [load]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      onPick(await api('/admin/media/', { method: 'POST', body }));
    } catch (e) {
      setError(e.fieldErrors?.file || e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[180] grid place-items-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Choose an image" className="admin-card flex max-h-[85vh] w-full max-w-3xl flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-4">
          <input className="admin-input max-w-xs" placeholder="Search images" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="admin-btn admin-btn-primary cursor-pointer">
            <ImagePlus size={15} />{uploading ? 'Uploading…' : 'Upload new'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading}
                   onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <button type="button" className="admin-btn ml-auto" onClick={onClose}>Close</button>
        </div>
        {error && <p role="alert" className="px-4 pt-3 text-sm text-red-300">{error}</p>}
        <div className="admin-scroll grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
          {items === null ? <Spinner /> : items.length === 0 ? <p className="col-span-full text-sm text-slate-400">No images yet. Upload one above.</p> : items.map((asset) => (
            <button key={asset.id} type="button" onClick={() => onPick(asset)}
                    className="group overflow-hidden rounded-lg border border-white/10 text-left hover:border-sky-300/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
              <img src={asset.thumbnail_url} alt={asset.alt_text || ''} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <span className="block truncate px-2 py-1.5 text-xs text-slate-400 group-hover:text-slate-200">{asset.original_filename}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
