import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../toastContext';
import { MediaPicker } from './Fields';

export const ProjectGallery = ({ item }) => {
  const { notify, confirm } = useToast();
  const [rows, setRows] = useState(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => setRows(await api('/admin/project-media/', { query: { project: item.id } })), [item.id]);
  useEffect(() => { load().catch((e) => notify(e.message, 'error')); }, [load, notify]);

  const guarded = async (fn, message) => {
    try {
      await fn();
      await load();
      if (message) notify(message);
    } catch (e) {
      notify(Object.values(e.fieldErrors || {})[0] || e.message, 'error');
    }
  };
  const add = (asset) => {
    setPicking(false);
    guarded(() => api('/admin/project-media/', { method: 'POST', body: { project: item.id, media_asset: asset.id, display_order: rows.length } }), 'Image added to the gallery.');
  };
  const patch = (row, body) => guarded(() => api(`/admin/project-media/${row.id}/`, { method: 'PATCH', body }));
  const swap = async (index, delta) => {
    const a = rows[index];
    const b = rows[index + delta];
    await guarded(async () => {
      await api(`/admin/project-media/${a.id}/`, { method: 'PATCH', body: { display_order: index + delta } });
      await api(`/admin/project-media/${b.id}/`, { method: 'PATCH', body: { display_order: index } });
    });
  };
  const remove = async (row) => {
    if (await confirm({ title: 'Remove this image from the gallery?', message: 'The image stays in the media library.', confirmLabel: 'Remove', danger: true })) {
      guarded(() => api(`/admin/project-media/${row.id}/`, { method: 'DELETE' }), 'Removed from the gallery.');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Project gallery</h3>
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => setPicking(true)}><ImagePlus size={14} />Add image</button>
      </div>
      {rows === null ? null : rows.length === 0 ? <p className="text-sm text-slate-400">No gallery images yet.</p> : (
        <ul className="grid gap-3">
          {rows.map((row, index) => (
            <li key={row.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-white/10 p-3">
              <img src={row.media_asset.thumbnail_url} alt="" className="h-16 w-24 rounded object-cover" />
              <div className="grid min-w-[12rem] flex-1 gap-2">
                <input className="admin-input" aria-label="Caption" placeholder="Caption (optional)" defaultValue={row.caption}
                       onBlur={(e) => e.target.value !== row.caption && patch(row, { caption: e.target.value })} />
                <input className="admin-input" aria-label="Alt text" placeholder="Alt text: describe the image" defaultValue={row.alt_text}
                       onBlur={(e) => e.target.value !== row.alt_text && patch(row, { alt_text: e.target.value })} />
              </div>
              <div className="flex gap-1">
                <button type="button" className="admin-btn admin-btn-sm" aria-label="Move up" disabled={index === 0} onClick={() => swap(index, -1)}><ArrowUp size={13} /></button>
                <button type="button" className="admin-btn admin-btn-sm" aria-label="Move down" disabled={index === rows.length - 1} onClick={() => swap(index, 1)}><ArrowDown size={13} /></button>
                <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" aria-label="Remove image" onClick={() => remove(row)}><Trash2 size={13} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {picking && <MediaPicker onClose={() => setPicking(false)} onPick={add} />}
    </div>
  );
};
