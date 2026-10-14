import { useContext, useEffect, useMemo } from 'react';
import { ContentContext } from './context';

export const isPreviewUrl = () => new URLSearchParams(window.location.search).get('preview') === '1';

export const useContent = () => useContext(ContentContext);

/** A page section from the API, or null (components then use their built-in copy). */
export const useSection = (page, key) => {
  const { pages } = useContent();
  return pages?.[page]?.sections?.[key] ?? null;
};

/** `pick(section, 'title', fallback)` — API value when present and non-empty, else the fallback. */
export const pick = (source, key, fallback) => {
  const value = source?.[key] ?? source?.content?.[key];
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return fallback;
  return value;
};

export const usePageMeta = (slug) => {
  const { pages, site } = useContent();
  const page = pages?.[slug];
  const title = page?.meta_title || site?.default_title;
  const description = page?.meta_description || site?.default_description;
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.content = description;
    }
  }, [title, description]);
  return useMemo(() => ({ title, description }), [title, description]);
};
