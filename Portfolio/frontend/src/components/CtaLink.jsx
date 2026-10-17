import { motion, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

/**
 * The site's call-to-action link (styles in hero/hero-content.css).
 * Primary: gradient fill, arrow slides on hover and a gentle spring pull toward the pointer.
 * Secondary: glass outline with a light that orbits the border on hover.
 * `enabled` turns the pointer pull off (it is also off for touch and reduced motion).
 */
export function CtaLink({ primary = false, enabled = true, children, href, className = '' }) {
  const reduced = useReducedMotion();
  const active = enabled && !reduced;
  const x = useSpring(0, { stiffness: 220, damping: 30 });
  const y = useSpring(0, { stiffness: 220, damping: 30 });
  const reset = () => { x.set(0); y.set(0); };
  const move = (event) => {
    if (!primary || !active || event.pointerType === 'touch') return;
    // Measure the stationary slot so the moving button cannot chase its own bounds.
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    x.set(Math.max(-8, Math.min(8, ((event.clientX - bounds.left) / bounds.width - 0.5) * 16)));
    y.set(Math.max(-8, Math.min(8, ((event.clientY - bounds.top) / bounds.height - 0.5) * 16)));
  };

  return (
    <span className={`hero-content-cta-slot ${className}`}>
      <motion.a
        href={href}
        className={`interactive hero-content-cta ${primary ? 'hero-content-cta-primary' : 'hero-content-cta-secondary'}`}
        style={{ x: active ? x : 0, y: active ? y : 0 }}
        onPointerMove={move}
        onPointerLeave={reset}
        onPointerCancel={reset}
        onFocus={reset}
      >
        <span>{children}{primary ? <ArrowRight size={18} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}</span>
      </motion.a>
    </span>
  );
}
