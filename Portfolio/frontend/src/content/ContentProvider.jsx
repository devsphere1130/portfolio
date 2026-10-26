import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toCapability, toContactDetails, toProject, toService, toSocialLinks, toTeamMember, toTechGroups } from './adapters';
import { ContentContext, FALLBACK } from './context';
import { isPreviewUrl } from './hooks';

export const ContentProvider = ({ children }) => {
  const [content, setContent] = useState(FALLBACK);

  useEffect(() => {
    const controller = new AbortController();
    api('/public/content/', { query: { preview: isPreviewUrl() ? '1' : undefined }, signal: controller.signal })
      .then((data) => setContent({
        status: 'live',
        preview: data.preview,
        site: data.site,
        pages: data.pages,
        contact: toContactDetails(data.site),
        socialLinks: toSocialLinks(data.site),
        services: data.services.map(toService),
        capabilities: data.capabilities.map(toCapability),
        technologies: toTechGroups(data.technologies),
        projects: data.projects.map(toProject),
        team: data.team.map(toTeamMember),
        whatsapp: data.whatsapp || { enabled: false },
      }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.warn('Content API unavailable; showing bundled content.', error.message);
        setContent((prev) => ({ ...prev, status: 'error' }));
      });
    return () => controller.abort();
  }, []);

  // A favicon chosen in Site settings replaces the bundled one (index.html) for this visit.
  const faviconUrl = content.site?.favicon?.thumbnail_url || content.site?.favicon?.url;
  useEffect(() => {
    if (!faviconUrl) return;
    for (const link of document.head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')) {
      link.href = faviconUrl;
      link.removeAttribute('type');
    }
  }, [faviconUrl]);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
};

