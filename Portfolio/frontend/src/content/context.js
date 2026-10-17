import { createContext } from 'react';
import { contactDetails as staticContact, socialLinks as staticSocial } from '../data/contact';
import { projectsData } from '../data/projects';
import { serviceDetails } from '../data/serviceDetails';
import { servicesData } from '../data/services';
import { teamMembers as staticTeam } from '../data/team';
import { technologiesData } from '../data/technologies';

// Bundled content: rendered while the API loads, and kept if it is unreachable, so the site never goes blank.
export const FALLBACK = {
  status: 'fallback',
  preview: false,
  site: null,
  pages: {},
  contact: staticContact,
  socialLinks: staticSocial.filter((l) => l.href),
  services: serviceDetails,
  capabilities: servicesData,
  technologies: technologiesData,
  projects: projectsData,
  team: staticTeam,
  // Off until the API confirms a configured number: never show a button that could open the wrong chat.
  whatsapp: { enabled: false },
};

export const ContentContext = createContext(FALLBACK);

