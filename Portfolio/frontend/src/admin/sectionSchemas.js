// Editable fields per page section. Mirrors cms/validation.py SECTION_SCHEMAS on the server, which
// remains the authority: anything not listed there is rejected.
//   base:    which of title / subtitle / description the section uses (with friendly labels)
//   content: section-specific fields stored in the section's JSON `content`

export const SECTION_SCHEMAS = {
  'home.hero': {
    label: 'Hero',
    base: { description: 'Intro paragraph' },
    content: [
      { name: 'eyebrow', label: 'Eyebrow label', full: false },
      { name: 'brand', label: 'Brand word (large heading)', full: false },
      { name: 'tagline_prefix', label: 'Tagline', full: false },
      { name: 'tagline_highlight', label: 'Tagline highlight (aqua)', full: false },
      { name: 'rotating_words', label: '“We build …” rotating words', type: 'list' },
      { name: 'chips', label: 'Capability chips', type: 'list' },
      { name: 'primary_cta', label: 'Primary button', type: 'link' },
      { name: 'secondary_cta', label: 'Secondary button', type: 'link' },
      { name: 'founder_name', label: 'Founder card name', full: false },
      { name: 'founder_role', label: 'Founder card role', full: false },
      { name: 'founder_initials', label: 'Avatar initials', full: false },
      { name: 'stats', label: 'Founder card stats', type: 'stats', hint: 'Only publish numbers you can verify.' },
      { name: 'status_items', label: 'Status line items', type: 'list' },
    ],
  },
  'home.selected-work': { label: 'Selected work', base: { title: 'Heading', subtitle: 'Subheading' }, content: [{ name: 'cta', label: 'Button', type: 'link' }] },
  'home.capabilities': { label: 'Capabilities heading', base: { title: 'Heading', subtitle: 'Subheading' }, content: [] },
  'home.tech-stack': { label: 'Technology stack heading', base: { title: 'Heading', subtitle: 'Subheading' }, content: [] },
  'home.philosophy': {
    label: 'Engineering philosophy',
    base: { title: 'Heading' },
    content: [
      { name: 'eyebrow', label: 'Eyebrow label' },
      { name: 'items', label: 'Principle cards', type: 'cards', hint: 'Numbered 01, 02… automatically, in this order.' },
    ],
  },
  'home.cta': {
    label: 'Closing call to action',
    base: { title: 'Heading', description: 'Supporting text' },
    content: [
      { name: 'eyebrow', label: 'Eyebrow label' },
      { name: 'primary_cta', label: 'Primary button', type: 'link' },
      { name: 'secondary_cta', label: 'Secondary button', type: 'link' },
    ],
  },
  'about.intro': {
    label: 'Intro',
    base: { description: 'Intro paragraph' },
    content: [
      { name: 'eyebrow', label: 'Eyebrow label' },
      { name: 'title_lines', label: 'Heading lines', type: 'list', hint: 'The last line is shown in the aqua highlight.' },
      { name: 'studio_capabilities', label: 'Studio capabilities', type: 'list' },
      { name: 'meta', label: 'Facts row', type: 'pairs', hint: 'The team count is added automatically.' },
    ],
  },
  'about.team': {
    label: 'Team intro',
    base: { title: 'Heading', description: 'Supporting text' },
    content: [{ name: 'eyebrow', label: 'Eyebrow label' }, { name: 'title_highlight', label: 'Heading highlight (aqua)' }],
  },
  'about.closing': {
    label: 'Closing',
    base: { title: 'Heading' },
    content: [
      { name: 'eyebrow', label: 'Eyebrow label' },
      { name: 'title_highlight', label: 'Heading highlight (aqua)' },
      { name: 'primary_cta', label: 'Primary button', type: 'link' },
      { name: 'secondary_cta', label: 'Secondary button', type: 'link' },
    ],
  },
  'contact.intro': {
    label: 'Intro',
    base: { title: 'Heading', description: 'Intro paragraph' },
    content: [
      { name: 'eyebrow', label: 'Eyebrow label', hint: 'Use “ / ” to show the aqua separator.' },
      { name: 'title_highlight', label: 'Heading highlight (aqua)' },
      { name: 'tagline', label: 'Small supporting statement' },
    ],
  },
  'contact.closing': { label: 'Closing', base: { title: 'Heading', description: 'Supporting text' }, content: [{ name: 'cta_label', label: 'Button label' }] },
  'projects.intro': { label: 'Intro', base: { title: 'Heading', description: 'Intro paragraph' }, content: [{ name: 'eyebrow', label: 'Eyebrow label' }] },
};

export const BASE_TYPES = { title: 'text', subtitle: 'textarea', description: 'textarea' };

/** Fallback for sections added later without a schema: base fields only. */
export const schemaFor = (pageSlug, key) => SECTION_SCHEMAS[`${pageSlug}.${key}`] ?? {
  label: key, base: { title: 'Title', subtitle: 'Subtitle', description: 'Description' }, content: [],
};
