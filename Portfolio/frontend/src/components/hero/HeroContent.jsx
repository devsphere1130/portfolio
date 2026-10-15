import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CtaLink } from '../CtaLink';
import { pick, useSection } from '../../content/hooks';

const EASE = [0.22, 1, 0.36, 1];
const SERVICES = ['web apps', 'dashboards', 'SaaS products', 'landing pages'];
const CAPABILITIES = ['Development', 'Testing', 'Marketing', 'UI/UX'];

// Editable sample content from the design brief. Verify metrics before publishing.
const DEFAULT_FOUNDER = {
  name: 'DevSphere IT Solutions',
  initials: 'DS',
  role: 'Founder ',
  stats: [
    { value: '15+', label: 'Projects shipped' },
    { value: '1.5 yrs', label: 'Experience' },
    { value: '100%', label: 'Remote-ready' },
  ],
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

// Keep the designed two-line tagline: break before the last word of the prefix ("...your<br/> business").
function splitTagline(prefix) {
  const words = prefix.trim().split(' ');
  if (words.length < 3) return prefix;
  return <>{words.slice(0, -1).join(' ')}<br className="hero-content-value-break" /> {words.at(-1)}</>;
}

function DepthLayer({ children, x, y, depth, enabled, className = '' }) {
  const offsetX = useTransform(x, [-1, 1], [-depth, depth]);
  const offsetY = useTransform(y, [-1, 1], [-depth, depth]);
  return (
    <motion.div className={className} style={{ x: enabled ? offsetX : 0, y: enabled ? offsetY : 0 }}>
      {children}
    </motion.div>
  );
}

function RotatingService({ reduced, active, words: SERVICES }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced || !active) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % SERVICES.length), 2500);
    return () => window.clearInterval(timer);
  }, [reduced, active, SERVICES.length]);

  return (
    <p className="hero-content-services">
      <span className="sr-only">We build {SERVICES.join(', ')}.</span>
      <span aria-hidden="true">We build</span>
      <span className="hero-content-word-window" aria-hidden="true">
        {reduced ? <span className="hero-content-word">{SERVICES[0]}</span> : <AnimatePresence initial={false}>
          <motion.span
            key={index}
            className="hero-content-word"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            {SERVICES[index % SERVICES.length]}
          </motion.span>
        </AnimatePresence>}
      </span>
      <span className="hero-content-service-cursor" aria-hidden="true" />
    </p>
  );
}

export const HeroContent = () => {
  const hero = useSection('home', 'hero');
  const brand = pick(hero, 'brand', 'DevSphere');
  const taglinePrefix = pick(hero, 'tagline_prefix', 'Software that keeps your business');
  const taglineHighlight = pick(hero, 'tagline_highlight', 'in orbit.');
  const words = pick(hero, 'rotating_words', SERVICES);
  const chips = pick(hero, 'chips', CAPABILITIES);
  const primaryCta = pick(hero, 'primary_cta', { label: 'Start a Project', href: '/contact' });
  const secondaryCta = pick(hero, 'secondary_cta', { label: 'View Our Work', href: '#work' });
  const statusItems = pick(hero, 'status_items', ['Available for new projects', 'Based in India', 'Working worldwide']);
  const founder = {
    name: pick(hero, 'founder_name', DEFAULT_FOUNDER.name),
    initials: pick(hero, 'founder_initials', DEFAULT_FOUNDER.initials),
    role: pick(hero, 'founder_role', DEFAULT_FOUNDER.role),
    stats: pick(hero, 'stats', DEFAULT_FOUNDER.stats),
  };
  const rootRef = useRef(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const fineDesktop = useMediaQuery('(min-width: 1280px) and (hover: hover) and (pointer: fine)');
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, { stiffness: 85, damping: 24 });
  const y = useSpring(targetY, { stiffness: 85, damping: 24 });
  const active = inView && pageVisible;
  const parallax = fineDesktop && !reduced && active;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(rootRef.current);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    targetX.set(0);
    targetY.set(0);
    if (!parallax) return undefined;
    const scene = rootRef.current.closest('section');
    const move = (event) => {
      if (event.pointerType === 'touch') return;
      targetX.set(1 - (event.clientX / window.innerWidth) * 2);
      targetY.set(1 - (event.clientY / window.innerHeight) * 2);
    };
    const reset = () => { targetX.set(0); targetY.set(0); };
    scene.addEventListener('pointermove', move, { passive: true });
    scene.addEventListener('pointerleave', reset);
    return () => { scene.removeEventListener('pointermove', move); scene.removeEventListener('pointerleave', reset); };
  }, [parallax, targetX, targetY]);

  const reveal = (delay, distance = 12) => ({
    'data-hero-reveal': true,
    initial: reduced ? false : { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.4, delay: reduced ? 0 : delay, ease: EASE },
  });
  const depth = { x, y, enabled: parallax };

  return (
    <div ref={rootRef} className="hero-content" data-reduced-motion={reduced} data-motion-active={active}>
      <div className="hero-content-glow" aria-hidden="true" />
      <svg className="hero-content-orbit" viewBox="0 0 1100 520" fill="none" aria-hidden="true" focusable="false">
        <path d="M25 310C170 43 563 5 795 116S1035 362 1090 400" stroke="currentColor" strokeWidth="1" />
        <circle cx="795" cy="116" r="3" fill="currentColor" stroke="none" />
      </svg>

      <DepthLayer {...depth} depth={6} className="hero-content-heading-layer">
        <motion.p className="hero-content-eyebrow" {...reveal(0)}>
          <span className="hero-content-dot hero-content-dot-cyan" aria-hidden="true" />
          <span><span className="hero-content-index">[ 01 ]</span> <span aria-hidden="true">—</span> {pick(hero, 'eyebrow', 'DEVSPHERE / STUDIO')}</span>
        </motion.p>

        <h1 className="hero-content-heading">
          <span className="sr-only">{brand}. {taglinePrefix} {taglineHighlight}</span>
          <span className="hero-content-brand" aria-hidden="true">
            <span className="hero-content-brand-depth">{brand}</span>
            {brand.split('').map((letter, index) => (
              <motion.span key={index} className="hero-content-letter" {...reveal(0.08 + index * 0.04, 22)}>
                <span className="hero-content-letter-sharp">{letter}</span>
                {!reduced && <motion.span
                  className="hero-content-letter-blur"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 0.08 + index * 0.04, duration: 0.32 }}
                >{letter}</motion.span>}
              </motion.span>
            ))}
          </span>
          <motion.span className="hero-content-value" aria-hidden="true" {...reveal(0.28)}>
            {splitTagline(taglinePrefix)} <span>{taglineHighlight}</span>
          </motion.span>
        </h1>
      </DepthLayer>

      <DepthLayer {...depth} depth={3}>
        <motion.div className="hero-content-description" {...reveal(0.4)}>
          <p>{pick(hero, 'description', 'We design, build, test and market production-ready web applications for startups and growing teams.')}</p>
          <RotatingService reduced={reduced} active={active} words={words} />
        </motion.div>

        <ul className="hero-content-capabilities" aria-label="Studio capabilities">
          {chips.map((capability, index) => (
            <motion.li key={capability} {...reveal(0.52 + index * 0.04, 8)}>
              <span className="hero-content-chip"><span className="hero-content-chip-dot" aria-hidden="true" />{capability}</span>
            </motion.li>
          ))}
        </ul>

        <motion.div className="hero-content-actions" {...reveal(0.68)}>
          <CtaLink primary enabled={parallax} href={primaryCta.href || '/contact'}>{primaryCta.label || 'Start a Project'}</CtaLink>
          <CtaLink enabled={parallax} href={secondaryCta.href || '#work'}>{secondaryCta.label || 'View Our Work'}</CtaLink>
        </motion.div>
      </DepthLayer>

      <DepthLayer {...depth} depth={2}>
        <motion.div className="hero-content-founder" {...reveal(0.8, 8)}>
          <div className="hero-content-founder-person">
            <span className="hero-content-avatar" aria-hidden="true">{founder.initials}</span>
            <p><strong>{founder.name}</strong><span>{founder.role}</span></p>
          </div>
          <dl className="hero-content-founder-stats">
            {founder.stats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
        </motion.div>

        <motion.p className="hero-content-status" {...reveal(0.92, 6)}>
          {statusItems.map((item, index) => (
            <span key={item}>{index === 0 && <span className="hero-content-dot hero-content-dot-green" aria-hidden="true" />}{item}</span>
          ))}
        </motion.p>
      </DepthLayer>
    </div>
  );
};
