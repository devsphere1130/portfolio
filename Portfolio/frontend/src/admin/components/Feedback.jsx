import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ToastContext } from '../toastContext';

// Toasts + a promise-based confirm dialog, available anywhere via useToast().
export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const notify = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);
  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] grid w-[min(92vw,380px)] gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
               className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl backdrop-blur ${t.tone === 'error' ? 'border-red-300/30 bg-red-950/85 text-red-100' : 'border-sky-300/25 bg-slate-950/90 text-slate-100'}`}>
            {t.tone === 'error' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </ToastContext.Provider>
  );
};

const ConfirmDialog = ({ title, message, confirmLabel = 'Confirm', danger = false, onClose }) => {
  const confirmRef = useRef(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[210] grid place-items-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="admin-card w-full max-w-md p-6">
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        {message && <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="admin-btn" onClick={() => onClose(false)}>Cancel</button>
          <button ref={confirmRef} type="button" className={`admin-btn ${danger ? 'admin-btn-danger' : 'admin-btn-primary'}`} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

/** Right-hand editing panel (full screen on mobile). */
export const Drawer = ({ title, onClose, children, footer, wide = false }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={title}
             className={`flex h-full w-full flex-col border-l border-white/10 bg-[#070c15] shadow-2xl ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h2 className="truncate text-lg font-semibold">{title}</h2>
          <button type="button" className="admin-btn admin-btn-sm" onClick={onClose} aria-label="Close panel"><X size={16} /></button>
        </header>
        <div className="admin-scroll flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">{footer}</footer>}
      </aside>
    </div>
  );
};

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-3 py-10 text-sm text-slate-400" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300/30 border-t-sky-300" aria-hidden="true" />
    {label}
  </div>
);

export const EmptyState = ({ title, children, action }) => (
  <div className="admin-card grid place-items-center px-6 py-14 text-center">
    <p className="text-base font-semibold">{title}</p>
    {children && <p className="mt-2 max-w-md text-sm text-slate-400">{children}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div role="alert" className="admin-card border-red-300/30 px-5 py-4 text-sm text-red-100">
    {error?.status === 403 ? 'You do not have permission to view this.' : error?.message || 'Could not load this data.'}
    {onRetry && <button type="button" className="admin-btn admin-btn-sm ml-3" onClick={onRetry}>Try again</button>}
  </div>
);

export const Pagination = ({ page, count, pageSize = 20, onPage }) => {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm text-slate-400" aria-label="Pagination">
      <span>Page {page} of {pages} · {count} items</span>
      <div className="flex gap-2">
        <button type="button" className="admin-btn admin-btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="admin-btn admin-btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
};

export const StatusBadge = ({ status }) => (
  <span className={`admin-badge ${status === 'published' ? 'admin-badge-published' : 'admin-badge-draft'}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {status === 'published' ? 'Published' : 'Draft'}
  </span>
);
