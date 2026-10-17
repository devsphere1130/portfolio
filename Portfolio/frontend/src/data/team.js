import memberOnePortrait from '../assets/team/member-01.webp';

// About page content. The layout reads everything from here, so copy and people
// can change without touching components.
//
// Any value left as `null` renders as a clearly marked placeholder. Replace those
// with verified details only; never add invented experience, locations or credentials.
//
// To add a portrait, put an image in `src/assets/team/`, import it here and set:
//   portrait: { src: memberOnePortrait, width: 1200, height: 1500 }
// Portraits are framed at 4:5. `alt` is generated from the name and role.
// Optional `position` (CSS object-position) keeps the face in frame when the photo is cropped.

export const studioCapabilities = [
  { index: '01', label: 'Engineering' },
  { index: '02', label: 'Product Experience' },
  { index: '03', label: 'Quality & Testing' },
];

export const teamMembers = [
  {
    id: 'member-01',
    index: '01',
    discipline: 'Engineering',
    name: 'Sarthak Zaware',
    role: 'Full-Stack Developer',
    experience: '1+',
    location: 'Thane,Maharashtra, India',
    // Draft copy based on the role and the studio's stack. Confirm with the team member.
    focus: 'Application architecture, REST APIs and data modelling',
    introduction:
      'Turns product requirements into working software, from data models and APIs to the interfaces built on top of them, and keeps every release structured enough to grow.',
    expertiseLabel: 'Expertise',
    expertise: ['React', 'Django', 'REST APIs', 'PostgreSQL'],
    portrait: { src: memberOnePortrait, width: 1440, height: 1440, position: '57% 50%' },
  },
  {
    id: 'member-02',
    index: '02',
    discipline: 'Engineering',
    name: 'Ajay Gaikwad',
    // Draft role chosen to match the "Product Experience" capability. Confirm before publishing.
    role: 'Full-Stack Developer',
    experience: '1+',
    location: 'Bhandup,Maharashtra, India',
    focus: 'Interface engineering, responsive layouts and accessibility',
    introduction:
      'Shapes how DevSphere products look and respond, translating designs into accessible, responsive interfaces and the interaction details that make them feel considered.',
    expertiseLabel: 'Expertise',
    expertise: ['React', 'JavaScript', 'Tailwind CSS', 'GSAP'],
    portrait: null,
  },
  {
    id: 'member-03',
    index: '03',
    discipline: 'Quality Engineering',
    name: 'Shivraj Shingan ',
    role: 'QA Engineer / Software Tester',
    experience: '2+',
    location: 'Ghansoli,Maharashtra, India',
    focus: 'Functional and regression testing, release validation',
    introduction:
      'Tests each release the way people will actually use it: tracing requirements, reproducing edge cases and reporting issues clearly enough that they get fixed quickly.',
    expertiseLabel: 'Quality focus',
    // Only list testing skills this person actually practises (add automation only if verified).
    expertise: ['Functional testing', 'Regression testing', 'API testing', 'Bug reporting'],
    portrait: null,
  },
];
