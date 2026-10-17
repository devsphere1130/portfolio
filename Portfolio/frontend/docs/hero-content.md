# DevSphere hero content

`src/components/hero/HeroContent.jsx` is the complete left column. `Hero.jsx`
places it alongside `HeroScene` and `HeroRibbon`. The sphere canvas uses spare
desktop space on the right, and its camera fits the outer orbit on every screen.
Cube bobbing is relative to each cube's anchor so the position is not applied twice.

## Design decisions

- **Luminous brand:** Space Grotesk, a white-to-teal fill, a subtle two-pixel
  depth layer, and a cyan glow echo the sphere's illuminated glass.
- **Clear hierarchy:** one accessible h1 contains the brand and the benefit
  statement. The supporting paragraph is unboxed and stays under 480px wide.
- **Small glass surfaces:** 36px capability pills and the compact founder strip
  replace the large cards. Cyan dots connect the pills to the orbit particles.
- **Connected composition:** a faint SVG orbit and a local 600px radial glow
  connect the copy to the sphere. A translucent navy veil keeps the ribbon visible;
  shadows directly around the lettering maintain separation from its highlights.
- **Distinct actions:** the cyan primary link has a top highlight and magnetic
  movement bounded to 8px; the secondary link has a rotating conic border on
  hover or keyboard focus. Both have visible two-pixel focus outlines.
- **Calm motion:** the entrance finishes in 1.32 seconds. Letters crossfade a
  statically blurred copy while translating, so only opacity and transform are
  animated. Desktop text parallax uses separate 6px, 3px, and 2px depths.
- **Readable at every size:** desktop uses a 45/55 split; tablet stacks the
  existing sphere below at 70% width. Mobile centers the copy, uses two chip rows,
  and stacks full-width links. No mobile or touch parallax.

## Edit content

Edit `DEFAULT_FOUNDER`, `CAPABILITIES`, and `SERVICES` near the top of
`HeroContent.jsx`, or pass a `founder` prop with `name`, `initials`, `role`,
and a `stats` array of `{ value, label }` objects. The 15+ projects, 1.5 years,
and 100% metrics are editable sample values supplied in the brief; confirm
them before publishing. The avatar is a local initials placeholder.

The links point to the existing `#contact` and `#work` sections.

## Tailwind and fonts

This project uses Tailwind v4. No JavaScript Tailwind config is needed.
`hero-content.css`, imported by `src/index.css`, adds namespaced `@theme` tokens:

- Colors: `hero-cyan`, `hero-teal`, `hero-ink`, `hero-text`, `hero-secondary`.
- Fonts: `hero-display`, `hero-body`, `hero-mono`.

Space Grotesk, Inter, and JetBrains Mono are self-hosted WOFF2 fonts in
`public/fonts`, with their SIL Open Font Licenses alongside them. Their family
names are scoped to the hero so the rest of the site's typography stays intact.
Font preloads, `font-display: swap`, metric-adjusted fallbacks, explicit line
heights, and a fixed-width rotating-word slot keep the layout stable.

## Accessibility and lifecycle

Reduced motion is read on the first render and watched for changes. It shows
the final entrance state immediately and disables word rotation, parallax,
magnetic movement, and CSS loops. Screen readers get a static sentence listing
all services rather than repeated live announcements. Decorative letters, orbit,
and dots are hidden from the accessibility tree.

Service rotation and parallax pause offscreen and in hidden tabs. Timers, media
listeners, visibility listeners, pointer handlers, and observers are cleaned up
on unmount. Readable labels use the secondary text color rather than the brief's
lower-contrast muted color; the darker accents are reserved for decoration.

## Verification

- Production build, lint, and whitespace checks pass.
- Browser layouts checked at 320, 390, 640, 768, 1024, 1280, 1366, and 1821px.
- Keyboard focus and Work navigation, service rotation, bounded magnetic/parallax
  offsets, reduced motion, and offscreen pausing checked in Chrome.
- No hero layout shift recorded on font load; forcing the fallback fonts caused
  no vertical movement in the checked desktop and mobile layouts.
- Secondary text against the glass surface computes to 6.53:1 contrast;
  the primary CTA computes to 8.39:1.
