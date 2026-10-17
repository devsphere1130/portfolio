import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Search, UploadCloud } from 'lucide-react';
import { api } from '../../lib/api';
import { Drawer, EmptyState, ErrorState, Pagination, Spinner } from '../components/Feedback';
import { useToast } from '../toastContext';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const kb = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export const MediaPage = () => {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState({ search: '', page: 1 });
  const [pending, setPending] = useState(null); // { file, preview, alt }
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(() => api('/admin/media/', { query: { ...query, page_size: 24 } }).then(setData).catch(setError), [query]);
  useEffect(() => {
    const t = setTimeout(load, query.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query.search]);
  useEffect(() => () => pending && URL.revokeObjectURL(pending.preview), [pending]);

  const choose = (file) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      notify('Choose a JPEG, PNG, WebP or AVIF image.', 'error');
      return;
    }
    setPending({ file, preview: URL.createObjectURL(file), alt: '' });
  };

  const upload = async () => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', pending.file);
      body.append('alt_text', pending.alt);
      await api('/admin/media/', { method: 'POST', body });
      notify('Image uploaded and optimised.');
      setPending(null);
      setQuery({ ...query, page: 1 });
      load();
    } catch (e) {
      notify(e.fieldErrors?.file || e.fieldErrors?.alt_text || e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
          <p className="mt-1 text-sm text-slate-400">Uploads are checked, resized to max 2400px, converted to WebP and stripped of metadata.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => inputRef.current?.click()}><ImagePlus size={16} />Upload image</button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
      </header>

      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
           onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
           className={`mb-5 rounded-xl border border-dashed px-5 py-6 text-center text-sm transition-colors ${dragging ? 'border-sky-300 bg-sky-300/10 text-sky-100' : 'border-white/15 text-slate-400'}`}>
        <UploadCloud size={20} className="mx-auto mb-2" aria-hidden="true" />Drag an image here, or use “Upload image”. JPEG, PNG, WebP or AVIF, up to 8 MB.
      </div>

      <label className="relative mb-4 block max-w-sm">
        <span className="sr-only">Search media</span>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input className="admin-input pl-9" placeholder="Search by file name or alt text" value={query.search} onChange={(e) => setQuery({ search: e.target.value, page: 1 })} />
      </label>

      {error ? <ErrorState error={error} onRetry={load} /> : data === null ? <Spinner /> : data.results.length === 0 ? (
        <EmptyState title={query.search ? 'No images match that search.' : 'No images yet.'}>Upload portraits, project covers and screenshots here, then pick them in any form.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.results.map((asset) => (
            <li key={asset.id}>
              <button type="button" onClick={() => setSelected(asset)} className="admin-card group block w-full overflow-hidden text-left hover:border-sky-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                <img src={asset.thumbnail_url} alt={asset.alt_text || ''} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <span className="block px-3 py-2">
                  <span className="block truncate text-sm">{asset.original_filename}</span>
                  <span className="text-xs text-slate-500">{asset.width}×{asset.height} · {kb(asset.file_size_bytes)} · {asset.reference_count ? `used ${asset.reference_count}×` : 'unused'}</span>
                  {!asset.alt_text && <span className="mt-1 block text-xs text-amber-300">Missing alt text</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={query.page} count={data.count} pageSize={24} onPage={(page) => setQuery({ ...query, page })} />}

      {pending && (
        <Drawer title="Upload image" onClose={() => setPending(null)} footer={(
          <>
            <button type="button" className="admin-btn" onClick={() => setPending(null)}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={uploading} onClick={upload}>{uploading ? 'Uploading…' : 'Upload'}</button>
          </>
        )}>
          <img src={pending.preview} alt="Preview of the image to upload" className="max-h-80 w-full rounded-lg border border-white/10 object-contain" />
          <p className="mt-2 text-xs text-slate-400">{pending.file.name} · {kb(pending.file.size)}</p>
          <label className="admin-label mt-5" htmlFor="pending-alt">Alt text</label>
          <input id="pending-alt" className="admin-input" maxLength={300} value={pending.alt} placeholder="Describe what the image shows"
                 onChange={(e) => setPending({ ...pending, alt: e.target.value })} />
          <p className="admin-hint">Read aloud by screen readers. Leave empty only for purely decorative images.</p>
        </Drawer>
      )}
      {selected && <MediaDetail asset={selected} onClose={() => setSelected(null)} onChanged={() => { load(); }} />}
    </section>
  );
};

const MediaDetail = ({ asset: initial, onClose, onChanged }) => {
  const { notify, confirm } = useToast();
  const [asset, setAsset] = useState(initial);
  const [alt, setAlt] = useState(initial.alt_text);
  const [refs, setRefs] = useState(null);
  const [busy, setBusy] = useState(false);
  const replaceRef = useRef(null);

  useEffect(() => { api(`/admin/media/${initial.id}/`).then((d) => setRefs(d.references)).catch(() => setRefs([])); }, [initial.id]);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const result = await fn();
      if (message) notify(message);
      onChanged();
      return result;
    } catch (e) {
      notify(e.fieldErrors?.alt_text || e.fieldErrors?.file || e.message, 'error');
      if (e.data?.references) setRefs(e.data.references);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveAlt = () => run(() => api(`/admin/media/${asset.id}/`, { method: 'PATCH', body: { alt_text: alt } }), 'Alt text saved.').then((a) => a && setAsset(a));
  const replace = (file) => {
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    run(() => api(`/admin/media/${asset.id}/replace/`, { method: 'POST', body }), 'Image replaced everywhere it is used.').then((a) => a && setAsset(a));
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this image?', message: 'The file is removed from storage permanently.', confirmLabel: 'Delete', danger: true }))) return;
    const done = await run(() => api(`/admin/media/${asset.id}/`, { method: 'DELETE' }), 'Image deleted.');
    if (done !== null) onClose();
  };

  return (
    <Drawer title={asset.original_filename} onClose={onClose} footer={(
      <>
        <button type="button" className="admin-btn admin-btn-danger mr-auto" disabled={busy || (refs?.length ?? 0) > 0} onClick={remove}
                title={refs?.length ? 'Remove it from the places listed first' : undefined}>Delete</button>
        <button type="button" className="admin-btn" disabled={busy} onClick={() => replaceRef.current?.click()}><RefreshCw size={14} />Replace file</button>
        <input ref={replaceRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => { replace(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || alt === asset.alt_text} onClick={saveAlt}>Save alt text</button>
      </>
    )}>
      <img src={asset.url} alt={asset.alt_text || ''} className="max-h-96 w-full rounded-lg border border-white/10 object-contain" />
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-slate-400">Size</dt><dd>{asset.width}×{asset.height} · {kb(asset.file_size_bytes)}</dd>
        <dt className="text-slate-400">Uploaded as</dt><dd>{asset.source_format} → WebP</dd>
        <dt className="text-slate-400">Uploaded</dt><dd>{new Date(asset.created_at).toLocaleString()}{asset.uploaded_by_name ? ` by ${asset.uploaded_by_name}` : ''}</dd>
      </dl>
      <label className="admin-label mt-5" htmlFor="asset-alt">Alt text</label>
      <input id="asset-alt" className="admin-input" maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} />
      <h3 className="mt-6 text-sm font-semibold">Used in</h3>
      {refs === null ? <Spinner /> : refs.length === 0 ? <p className="mt-1 text-sm text-slate-400">Not used anywhere. Safe to delete.</p> : (
        <ul className="mt-2 grid gap-1 text-sm">
          {refs.map((r) => <li key={`${r.type}-${r.id}`} className="rounded border border-white/10 px-3 py-2"><span className="font-mono text-xs text-slate-500">{r.type}</span> {r.label}</li>)}
        </ul>
      )}
    </Drawer>
  );
};
