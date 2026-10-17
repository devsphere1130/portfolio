import { Eye } from 'lucide-react';
import { useContent } from './hooks';

// Shown only when a signed-in editor views ?preview=1 (the API confirms it).
export const PreviewBanner = () => {
  const { preview } = useContent();
  if (!preview) return null;
  const exit = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    window.location.assign(url);
  };
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-300/40 bg-slate-950/90 px-4 py-2 text-sm text-amber-100 shadow-2xl backdrop-blur">
      <Eye size={16} aria-hidden="true" />
      Preview mode — showing unpublished drafts
      <button type="button" onClick={exit} className="rounded-full border border-amber-200/40 px-3 py-1 text-xs font-semibold hover:bg-amber-200/10">
        Exit preview
      </button>
    </div>
  );
};
