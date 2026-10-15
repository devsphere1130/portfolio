// Lead-management labels. These describe the sales workflow, not WhatsApp delivery.
export const LEAD_STATUSES = [
  ['new', 'New'], ['awaiting_response', 'Awaiting response'], ['contacted', 'Contacted'], ['qualified', 'Qualified'],
  ['converted', 'Converted'], ['not_qualified', 'Not qualified'], ['archived', 'Archived'],
];
export const SOURCES = [['contact_form', 'Contact form'], ['project', 'Project page'], ['capability', 'Capability / service'],
  ['whatsapp', 'WhatsApp (Cloud API)'], ['other', 'Other']];
export const STATUS_TONE = {
  new: 'admin-badge-new', awaiting_response: 'admin-badge-draft', contacted: 'admin-badge-draft', qualified: 'admin-badge-published',
  converted: 'admin-badge-published', not_qualified: 'admin-badge-muted', archived: 'admin-badge-muted',
};
export const statusLabel = (value) => LEAD_STATUSES.find(([v]) => v === value)?.[1] ?? value;

// <input type="datetime-local"> works in local time without a zone; the API uses ISO with a zone.
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);
