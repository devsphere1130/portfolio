import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, ImagePlus, Library, RefreshCw, Trash2, Upload } from 'lucide-react';
import { api } from '../../../lib/api';
import { Spinner } from '../../components/Feedback';
import { MediaPicker } from '../../components/Fields';
import { useToast } from '../../toastContext';
import { childUrl, moveIds, useChildList, useDragSort } from './childList';

const GALLERY_CATEGORIES = [
  ['', 'No category'], ['feature', 'Feature image'], ['desktop', 'Desktop screen'], ['mobile', 'Mobile screen'],
  ['dashboard', 'Dashboard'], ['workflow', 'Workflow'], ['before', 'Before'], ['after', 'After'],
];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

const uploadImage = async (file, altText = '') => {
  const body = new FormData();
  body.append('file', file);
  if (altText) body.append('alt_text', altText);
  return api('/admin/media/', { method: 'POST', body });
};

export const GalleryManager = ({ projectId }) => {
  const { notify, confirm } = useToast();
  const { rows, setRows, run, reorder } = useChildList(projectId, 'gallery');
  const [selected, setSelected] = useState(() => new Set());
  const [picking, setPicking] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);
  const replaceInput = useRef(null);
  const replacing = useRef(null);
  const dragProps = useDragSort(rows || [], setRows, reorder);
  const url = (...rest) => childUrl(projectId, 'gallery', ...rest);

  const attach = (asset) => api(url(), { method: 'POST', body: { media_asset: asset.id, alt_text: asset.alt_text || '' } });

  const uploadFiles = async (files) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setProgress({ done: 0, total: list.length });
    let added = 0;
    for (const file of list) {
      try {
        // Each image is validated and re-encoded by the server before it is attached.
        await attach(await uploadImage(file));
        added += 1;
      } catch (e) {
        notify(`${file.name}: ${e.fieldErrors?.file || e.fieldErrors?.media_asset || e.message}`, 'error');
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setProgress(null);
    await run(async () => {}, added ? `${added} image${added === 1 ? '' : 's'} added.` : null).catch(() => {});
  };

  const patch = (row, body) => run(() => api(url(row.id), { method: 'PATCH', body })).catch(() => {});
  const replace = async (file) => {
    const row = replacing.current;
    replacing.current = null;
    if (!row || !file) return;
    try {
      const asset = await uploadImage(file, row.alt_text);
      // The gallery item points at the new image; the old one stays in the media library.
      await run(() => api(url(row.id), { method: 'PATCH', body: { media_asset: asset.id } }), 'Image replaced.');
    } catch (e) {
      notify(e.fieldErrors?.file || e.message, 'error');
    }
  };
  const remove = async (ids) => {
    const ok = await confirm({ title: ids.length > 1 ? `Remove ${ids.length} images from the gallery?` : 'Remove this image from the gallery?',
      message: 'The images stay in the media library.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    await run(() => api(url('bulk-delete'), { method: 'POST', body: { ids } }), 'Removed from the gallery.').catch(() => {});
    setSelected(new Set());
  };
  const toggle = (id) => setSelected((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  if (rows === null) return <Spinner />;
  return (
    <div className="grid gap-4">
      <div
        className={`grid place-items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${dragOver ? 'border-sky-300 bg-sky-300/5' : 'border-white/15'}`}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); } }}
      >
        <Upload size={22} className="text-sky-300" aria-hidden="true" />
        <p className="text-sm text-slate-300">Drop screenshots here, or</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => fileInput.current.click()} disabled={Boolean(progress)}><ImagePlus size={15} />Upload images</button>
          <button type="button" className="admin-btn" onClick={() => setPicking(true)}><Library size={15} />Choose from library</button>
        </div>
        <p className="text-xs text-slate-500">JPEG, PNG, WebP or AVIF. Each image is checked, resized to at most 2400px and stripped of metadata.</p>
        {progress && (
          <div className="w-full max-w-sm" role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-sky-300 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-slate-400">Uploading {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…</p>
          </div>
        )}
        <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
        <input ref={replaceInput} type="file" accept={ACCEPT} hidden onChange={(e) => { replace(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {rows.length === 0 ? <p className="text-sm text-slate-400">No gallery images yet. The gallery stays hidden on the public page until you add one.</p> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={selected.size === rows.length}
                     onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
              Select all
            </label>
            {selected.size > 0 && <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove([...selected])}><Trash2 size={13} />Remove {selected.size} selected</button>}
          </div>
          <ul className="grid gap-3">
            {rows.map((row, index) => (
              <li key={row.id} {...dragProps(index)} className="flex flex-wrap items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 self-center">
                  <input type="checkbox" className="h-4 w-4 accent-sky-400" aria-label={`Select image ${index + 1}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                  <GripVertical size={16} className="cursor-grab text-slate-500" aria-hidden="true" />
                </div>
                <a href={row.media_asset.url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={row.media_asset.thumbnail_url} alt="" className={`h-20 w-32 rounded object-cover ${row.is_published ? '' : 'opacity-40'}`} />
                </a>
                <div className="grid min-w-[14rem] flex-1 gap-2 sm:grid-cols-2">
                  <input className="admin-input sm:col-span-2" aria-label={`Caption for image ${index + 1}`} placeholder="Caption (optional)" defaultValue={row.caption} maxLength={300}
                         onBlur={(e) => e.target.value !== row.caption && patch(row, { caption: e.target.value })} />
                  <input className="admin-input" aria-label={`Alt text for image ${index + 1}`} placeholder="Alt text: what the image shows" defaultValue={row.alt_text} maxLength={300}
                         onBlur={(e) => e.target.value !== row.alt_text && patch(row, { alt_text: e.target.value })} />
                  <select className="admin-input" aria-label={`Category for image ${index + 1}`} value={row.category} onChange={(e) => patch(row, { category: e.target.value })}>
                    {GALLERY_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {!row.alt_text && <p className="text-xs text-amber-200/80 sm:col-span-2">Add alt text so screen-reader users know what this image shows.</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move image ${index + 1} up`} disabled={index === 0} onClick={() => reorder(moveIds(rows, index, -1)).catch(() => {})}><ArrowUp size={13} /></button>
                  <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move image ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => reorder(moveIds(rows, index, 1)).catch(() => {})}><ArrowDown size={13} /></button>
                  <button type="button" className="admin-btn admin-btn-sm" onClick={() => patch(row, { is_published: !row.is_published })}>
                    {row.is_published ? <><EyeOff size={13} />Hide</> : <><Eye size={13} />Show</>}
                  </button>
                  <button type="button" className="admin-btn admin-btn-sm" onClick={() => { replacing.current = row; replaceInput.current.click(); }}><RefreshCw size={13} />Replace</button>
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" aria-label={`Remove image ${index + 1}`} onClick={() => remove([row.id])}><Trash2 size={13} /></button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {picking && (
        <MediaPicker onClose={() => setPicking(false)}
                     onPick={(asset) => { setPicking(false); run(() => attach(asset), 'Image added.').catch(() => {}); }} />
      )}
    </div>
  );
};
