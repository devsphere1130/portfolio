// Pure helpers for the case-study page (kept here so they can be unit tested without a browser).

/** Wrap an index into [0, length) so the gallery loops in both directions. */
export const wrapIndex = (index, length) => (length ? ((index % length) + length) % length : 0);

/** Group stack entries by category, keeping the editor's order of first appearance. */
export function groupStack(items = []) {
  const groups = new Map();
  for (const item of items) {
    const key = item.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups].map(([category, entries]) => ({ category, entries }));
}

/** 75.4 -> "1:15", 3725 -> "1:02:05". Null/0 -> "". */
export function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * Plain-text paragraphs from the API become blocks: lines starting with "- " or "• " form a list.
 * Content is plain text end to end (HTML is rejected by the API), and React escapes it on render.
 */
export function toBlocks(paragraphs = []) {
  return paragraphs.map((text) => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const isList = lines.length > 0 && lines.every((line) => /^[-•]\s+/.test(line));
    return isList ? { type: 'list', items: lines.map((line) => line.replace(/^[-•]\s+/, '')) } : { type: 'text', text: lines.join(' ') };
  });
}

/** "2024-03-01" + "2024-09-30" -> "2024", "2023-11-01" + "2024-02-01" -> "2023–2024". */
export function yearRange(start, end) {
  const a = start ? start.slice(0, 4) : '';
  const b = end ? end.slice(0, 4) : '';
  if (a && b) return a === b ? a : `${a}–${b}`;
  return a || b;
}

/** Number only the sections that render, so "[ 03 ]" never skips. */
export function numberSections(keys) {
  return Object.fromEntries(keys.map((key, i) => [key, String(i + 1).padStart(2, '0')]));
}
