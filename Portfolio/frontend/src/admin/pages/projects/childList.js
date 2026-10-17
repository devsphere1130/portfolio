import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { useToast } from '../../toastContext';

export const childUrl = (projectId, kind, ...rest) => `/admin/projects/${projectId}/${kind}/${rest.map((r) => `${r}/`).join('')}`;

/** Load and mutate one project's child list. Every change reloads from the server (the source of truth). */
export function useChildList(projectId, kind) {
  const { notify } = useToast();
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => setRows(await api(childUrl(projectId, kind))), [projectId, kind]);
  useEffect(() => { load().catch((e) => notify(e.message, 'error')); }, [load, notify]);

  const run = useCallback(async (fn, success) => {
    try {
      const result = await fn();
      await load();
      if (success) notify(success);
      return result ?? true;
    } catch (e) {
      notify(Object.values(e.fieldErrors || {})[0] || e.message, 'error');
      throw e;
    }
  }, [load, notify]);

  const reorder = useCallback((ids) => run(() => api(childUrl(projectId, kind, 'reorder'), { method: 'POST', body: { ids } })), [projectId, kind, run]);
  return { rows, setRows, load, run, reorder };
}

/** Drag-and-drop ordering (HTML5 DnD) with arrow buttons as the keyboard alternative. */
export function useDragSort(rows, setRows, commit) {
  const from = useRef(null);
  const before = useRef(null);
  return (index) => ({
    draggable: true,
    onDragStart: (e) => { from.current = index; before.current = rows; e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e) => {
      e.preventDefault();
      if (from.current === null || from.current === index) return;
      const next = [...rows];
      const [moved] = next.splice(from.current, 1);
      next.splice(index, 0, moved);
      from.current = index;
      setRows(next);
    },
    onDrop: (e) => e.preventDefault(),
    onDragEnd: () => {
      const original = before.current;
      from.current = null;
      if (original && original.map((r) => r.id).join() !== rows.map((r) => r.id).join()) commit(rows.map((r) => r.id)).catch(() => setRows(original));
    },
  });
}

export const moveIds = (rows, index, delta) => {
  const ids = rows.map((r) => r.id);
  const [moved] = ids.splice(index, 1);
  ids.splice(index + delta, 0, moved);
  return ids;
};
