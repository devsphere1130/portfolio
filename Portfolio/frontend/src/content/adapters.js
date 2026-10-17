// Map public API payloads onto the shapes the existing components already render.

export const toService = (s) => ({
  id: s.slug, title: s.title, headline: s.headline, summary: s.summary, example: s.example,
  steps: s.steps, deliverables: s.deliverables, audience: s.audience, note: s.note || undefined,
});

export const toCapability = (c) => ({
  id: c.slug, title: c.title, description: c.card_description, headline: c.headline, summary: c.summary,
  example: c.example, buildsLabel: c.deliverables_label, builds: c.deliverables, steps: c.steps,
  outcome: c.business_outcome, note: c.note || undefined,
});

export const toTechGroups = (items) => {
  const groups = new Map();
  items.forEach((t) => {
    if (!groups.has(t.category)) groups.set(t.category, { category: t.category, items: [] });
    groups.get(t.category).items.push({ name: t.name, description: t.description, proficiency: t.proficiency_label });
  });
  return [...groups.values()];
};

export const toProject = (p) => ({
  id: p.slug, slug: p.slug, title: p.title, category: p.category, problem: p.problem_statement,
  description: p.description || p.short_description, technologies: p.technologies || [],
  image: p.cover?.url || null, imageAlt: p.cover?.alt_text || p.title, isFeatured: p.is_featured,
  projectUrl: p.project_url, repositoryUrl: p.repository_url,
});

export const toTeamMember = (m, index) => ({
  id: m.slug, index: String(index + 1).padStart(2, '0'), discipline: m.discipline, name: m.name,
  role: m.role_title, experience: m.experience_text || null, location: m.location_text || null,
  focus: m.focus || null, introduction: m.short_bio, expertiseLabel: m.expertise_label, expertise: m.expertise || [],
  portrait: m.portrait ? { src: m.portrait.url, width: m.portrait.width, height: m.portrait.height, position: m.portrait_position || undefined, alt: m.portrait.alt_text } : null,
});

export const toContactDetails = (site) => ({
  email: site.contact_email || null, phone: site.contact_phone || null,
  location: site.location_text || null, availability: site.availability_text || null,
});

export const toSocialLinks = (site) => (site.social_links || []).map((l) => ({ label: l.label, href: l.url }));
