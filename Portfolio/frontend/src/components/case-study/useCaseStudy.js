import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { isPreviewUrl } from '../../content/hooks';

/** Load one published case study. status: loading | ready | not-found | error. */
export function useCaseStudy(slug) {
  const [state, setState] = useState({ slug: null, status: 'loading', project: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api(`/public/projects/${encodeURIComponent(slug)}/`, { query: { preview: isPreviewUrl() ? '1' : undefined }, signal: controller.signal })
      .then((project) => setState({ slug, status: 'ready', project }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ slug, status: error.status === 404 ? 'not-found' : 'error', project: null });
      });
    return () => controller.abort();
  }, [slug, attempt]);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, slug: null }));
    setAttempt((n) => n + 1);
  }, []);
  // A new slug (or a retry) shows the loading state until its own response arrives.
  return state.slug === slug ? { ...state, retry } : { status: 'loading', project: null, retry };
}

const META = [
  ['name', 'description', 'description'],
  ['property', 'og:title', 'title'],
  ['property', 'og:description', 'description'],
  ['property', 'og:type', 'type'],
  ['property', 'og:url', 'url'],
  ['property', 'og:image', 'image'],
  ['name', 'twitter:card', 'card'],
];

/**
 * Per-project <title>, description, Open Graph tags and canonical link, restored on leave.
 * Search engines that run JavaScript read these; link-preview bots get server-rendered tags from
 * /api/public/share/work/<slug>/ instead (see docs/CASE_STUDIES.md).
 */
export function useDocumentMeta(meta) {
  const { title, description, image, url } = meta || {};
  useEffect(() => {
    if (!title) return undefined;
    const previousTitle = document.title;
    const values = { title, description, image, url, type: 'article', card: image ? 'summary_large_image' : 'summary' };
    const restore = [];
    for (const [attr, key, field] of META) {
      if (!values[field]) continue;
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
      const created = !tag;
      if (created) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const old = tag.getAttribute('content');
      tag.setAttribute('content', values[field]);
      restore.push(() => (created ? tag.remove() : tag.setAttribute('content', old)));
    }
    let canonical = document.head.querySelector('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (createdCanonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    const oldHref = canonical.getAttribute('href');
    canonical.setAttribute('href', url);
    document.title = title;
    return () => {
      document.title = previousTitle;
      restore.forEach((fn) => fn());
      if (createdCanonical) canonical.remove();
      else canonical.setAttribute('href', oldHref);
    };
  }, [title, description, image, url]);
}
