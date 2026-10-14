import { useEffect, useRef, useState } from 'react';
import { Code2, Lightbulb, PenTool, Rocket } from 'lucide-react';
import ribbonImage from '../../assets/hero-ribbon.webp';
import { journeySteps } from '../../data/contact';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ContactOrb } from '../three/ContactOrb';

const STEP_ICONS = [Lightbulb, PenTool, Code2, Rocket];

const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

// Ideas → products: the brand ribbon flows behind the orbital sphere inside one showcase card.
// Layers: atmosphere (grid, glow, particles) → ribbon + orb → status labels.
export const ContactVisual = () => {
  const rootRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [webgl, setWebgl] = useState(supportsWebGL);
  const [orbReady, setOrbReady] = useState(false);
  const active = inView && pageVisible;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(rootRef.current);
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Subtle parallax: DOM layers read --px/--py (eased by CSS transitions); the orb reads `pointer`.
  const setPointer = (x, y) => {
    pointer.current = { x, y };
    rootRef.current?.style.setProperty('--px', x.toFixed(3));
    rootRef.current?.style.setProperty('--py', y.toFixed(3));
  };
  const handlePointerMove = (event) => {
    if (reduced || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <figure
      ref={rootRef}
      className="contact-showcase"
      data-active={active}
      data-orb={webgl ? (orbReady ? 'ready' : 'loading') : 'fallback'}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointer(0, 0)}
      aria-label="Illustration: an idea flowing through design and development into a delivered product"
    >
      <figcaption className="contact-showcase-head">
        <span className="contact-showcase-index" aria-hidden="true">FIG. 01</span>
        <span className="contact-showcase-title">Turning ideas into digital solutions</span>
      </figcaption>

      <div className="contact-showcase-stage" aria-hidden="true">
        <div className="contact-showcase-grid" />
        <div className="contact-showcase-glow" />
        {[0, 1, 2, 3, 4].map((index) => (
          <span key={index} className={`contact-particle contact-particle-${index + 1}`} />
        ))}

        <div className="contact-ribbon contact-depth-far">
          <img src={ribbonImage} alt="" width="1024" height="1536" loading="lazy" decoding="async" />
          <span className="contact-ribbon-sheen" style={{ '--ribbon-src': `url(${ribbonImage})` }} />
        </div>

        <div className="contact-orb contact-depth-mid">
          {webgl ? (
            <ContactOrb
              pointer={pointer}
              active={active}
              reduced={reduced}
              onReady={() => setOrbReady(true)}
              onFail={() => setWebgl(false)}
            />
          ) : (
            <div className="contact-orb-fallback">
              <span className="contact-orb-fallback-ring contact-orb-fallback-ring-1" />
              <span className="contact-orb-fallback-ring contact-orb-fallback-ring-2" />
              <span className="contact-core" />
            </div>
          )}
        </div>

        <div className="contact-status-chip contact-status-chip-idea contact-depth-near">
          <span className="contact-status-chip-dot" />IDEA.md
        </div>
        <div className="contact-status-chip contact-status-chip-build contact-depth-near">
          <span className="contact-status-chip-pulse" />BUILD <span className="contact-status-chip-sep">/</span> ACTIVE
        </div>
        <div className="contact-status-chip contact-status-chip-deployed contact-depth-near">
          <span className="contact-status-chip-check">✓</span>DEPLOYED
        </div>
      </div>

      <ol className="contact-journey" aria-label="How a project moves forward">
        {journeySteps.map((step, index) => {
          const Icon = STEP_ICONS[index];
          return (
            <li key={step} style={{ '--step': index }}>
              <span className="contact-journey-icon"><Icon size={14} aria-hidden="true" /></span>
              <span className="contact-journey-label">{step}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
};
