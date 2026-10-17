// Field groups for the project editor tabs. Field types are the shared admin Field types.

export const FEATURE_ICONS = ['shield', 'zap', 'chart', 'users', 'workflow', 'database', 'lock', 'bell', 'globe', 'smartphone',
  'layers', 'credit-card', 'search', 'file-text', 'settings', 'cloud', 'code', 'message'];

export const PROJECT_TABS = {
  general: [
    { name: 'title', label: 'Project title', required: true, full: false },
    { name: 'slug', label: 'URL slug', required: true, full: false, hint: 'The page lives at /work/<slug>. Changing it breaks old links.' },
    { name: 'category', label: 'Category', placeholder: 'e.g. Fintech, SaaS, Healthcare', full: false },
    { name: 'status_label', label: 'Status badge', placeholder: 'e.g. Live, In development', full: false, hint: 'Optional.' },
    { name: 'project_role', label: 'Our role', placeholder: 'e.g. Full-stack design and build', full: false },
    { name: 'project_duration', label: 'Duration', placeholder: 'e.g. 4 months', full: false },
    { name: 'started_at', label: 'Started', type: 'date', full: false },
    { name: 'completed_at', label: 'Completed', type: 'date', full: false },
    { name: 'client_name', label: 'Client name', full: false, hint: 'Private unless you tick the box below.' },
    { name: 'show_client_name', label: 'Show client', type: 'boolean', checkboxLabel: 'The client approved being named publicly', full: false },
    { name: 'project_url', label: 'Live project URL', type: 'url', placeholder: 'https://…', full: false },
    { name: 'repository_url', label: 'Repository URL', type: 'url', placeholder: 'https://…', full: false },
    { name: 'repository_public', label: 'Repository', type: 'boolean', checkboxLabel: 'Show the repository link publicly', full: false },
    { name: 'is_featured', label: 'Featured', type: 'boolean', checkboxLabel: 'Feature on the homepage', full: false },
    { name: 'display_order', label: 'Display order', type: 'number', full: false, hint: 'Lower numbers show first.' },
  ],
  hero: [
    { name: 'short_description', label: 'Summary', type: 'textarea', rows: 2, maxLength: 300, hint: 'The compelling one-liner under the title. Also used for SEO if no SEO description is set.' },
    { name: 'description', label: 'What was built (intro)', type: 'textarea', rows: 4, hint: 'Shown as “Built” on the project card and as the hero introduction.' },
    { name: 'technologies', label: 'Technology badges', type: 'list', placeholder: 'e.g. React', hint: 'A short list for the card and hero. The detailed stack is on the Technology tab.' },
    { name: 'hero_media', label: 'Hero image', type: 'media', hint: 'Large image beside the title. Falls back to the cover image.' },
    { name: 'cover_media', label: 'Cover image', type: 'media', hint: 'Used on the project card and for social previews.' },
    { name: 'thumbnail_media', label: 'Card thumbnail', type: 'media', hint: 'Optional: a different crop for project cards.' },
  ],
  overview: [
    { name: 'overview', label: 'Overview', type: 'textarea', rows: 10, maxLength: 8000,
      hint: 'What the project is, the need it meets and what it lets people do. Leave a blank line between paragraphs; start lines with “- ” for a list. Plain text only.' },
    { name: 'audience', label: 'Built for', type: 'textarea', rows: 2, maxLength: 1000, hint: 'Who it serves, e.g. “Clinic staff and their patients”.' },
  ],
  story: [
    { name: 'problem_statement', label: 'The challenge', type: 'textarea', rows: 4, hint: 'Also shown as “Problem” on the project card.' },
    { name: 'problem_media', label: 'Challenge image', type: 'media' },
    { name: 'approach', label: 'The approach', type: 'textarea', rows: 4 },
    { name: 'approach_media', label: 'Approach image', type: 'media' },
    { name: 'solution', label: 'The solution', type: 'textarea', rows: 4 },
    { name: 'solution_media', label: 'Solution image', type: 'media' },
    { name: 'outcome', label: 'The result', type: 'textarea', rows: 4, hint: 'Only documented results. Leave blank if there is nothing verified to say.' },
    { name: 'outcome_media', label: 'Result image', type: 'media' },
  ],
  seo: [
    { name: 'seo_title', label: 'SEO title', maxLength: 70, hint: 'Up to 70 characters. Defaults to the project title.' },
    { name: 'seo_description', label: 'SEO description', type: 'textarea', rows: 3, maxLength: 180, hint: 'Up to 180 characters. Defaults to the summary.' },
  ],
};

export const ALL_PROJECT_FIELDS = [...Object.values(PROJECT_TABS).flat(), { name: 'related_projects', label: 'Related projects' }];

export const CHILD_CONFIGS = {
  build: {
    kind: 'build-components', label: 'Build component',
    title: (r) => r.title, summary: (r) => r.summary, thumb: (r) => r.media?.thumbnail_url,
    defaults: { is_published: true },
    fields: [
      { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Role-based access control' },
      { name: 'summary', label: 'Short explanation', type: 'textarea', rows: 2, maxLength: 400, required: true, hint: 'One or two sentences a non-technical client understands.' },
      { name: 'details', label: 'Technical detail', type: 'textarea', rows: 5, maxLength: 3000, hint: 'Optional. How it works, for readers who want depth.' },
      { name: 'media', label: 'Screenshot', type: 'media' },
    ],
  },
  features: {
    kind: 'features', label: 'Feature',
    title: (r) => r.title, summary: (r) => r.description, thumb: (r) => r.media?.thumbnail_url,
    defaults: { is_published: true },
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Short description', type: 'textarea', rows: 2, maxLength: 500 },
      { name: 'icon_key', label: 'Icon', type: 'select', options: FEATURE_ICONS.map((v) => ({ value: v, label: v })), full: false, hint: 'Shown when there is no image.' },
      { name: 'media', label: 'Image', type: 'media' },
    ],
  },
  outcomes: {
    kind: 'outcomes', label: 'Outcome',
    title: (r) => [r.metric_value, r.label].filter(Boolean).join(' · '), summary: (r) => r.description,
    defaults: { is_published: false, is_verified: false },
    publishHint: 'Only verified results can be shown. Never add estimates, invented percentages or testimonials.',
    fields: [
      { name: 'label', label: 'Result', required: true, placeholder: 'e.g. Less manual data entry', full: false },
      { name: 'metric_value', label: 'Metric (optional)', placeholder: 'e.g. 40%', full: false },
      { name: 'description', label: 'Explanation', type: 'textarea', rows: 2, maxLength: 500 },
      { name: 'is_verified', label: 'Verified', type: 'boolean', checkboxLabel: 'This result is measured or confirmed by the client' },
      { name: 'verification_note', label: 'Verification note (internal)', maxLength: 300, hint: 'Never shown publicly. e.g. “Client ops report, March 2026”.' },
      { name: 'is_published', label: 'Published', type: 'boolean', checkboxLabel: 'Show on the public page' },
    ],
  },
};
