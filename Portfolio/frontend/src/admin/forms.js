export const slugify = (text) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

/** API object -> JSON payload: media objects become ids, read-only keys are dropped. */
export const toPayload = (fields, values) => Object.fromEntries(
  fields.filter((f) => !f.readOnly).map((f) => [f.name, f.type === 'media' ? values[f.name]?.id ?? null : values[f.name]]),
);
