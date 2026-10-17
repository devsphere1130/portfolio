// Click-to-chat helpers (Mode A). These only build a wa.me link: opening it lets the person review and
// send the message themselves in WhatsApp. Nothing is sent, and nothing is recorded, by opening the link.

/** Fill {placeholders}; unknown or empty ones are removed and whitespace is tidied. */
export function fillTemplate(template, values = {}) {
  return String(template || '')
    .replace(/\{(\w+)\}/g, (_, key) => (values[key] == null ? '' : String(values[key]).trim()))
    .replace(/\(\s*\)/g, '') // empty "( )" left by a missing value
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([.,!?)])/g, '$1')
    .trim();
}

/** wa.me works on phones (opens the app) and desktop (WhatsApp Web / desktop app). */
export function chatUrl(phoneDigits, text) {
  const digits = String(phoneDigits || '').replace(/\D/g, '');
  if (!digits) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}
