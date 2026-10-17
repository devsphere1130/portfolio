import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { wrapIndex } from '../../lib/caseStudy';
import { getLenis } from '../../hooks/useLenis';
import { Reveal, ResponsiveImage, SectionHeader } from './Primitives';

const EASE = [0.22, 1, 0.36, 1];
const SWIPE_PX = 60;

const slideVariants = (reduced) => ({
  enter: (dir) => ({ opacity: 0, x: reduced ? 0 : `${dir * 6}%`, scale: reduced ? 1 : 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir) => ({ opacity: 0, x: reduced ? 0 : `${dir * -6}%`, scale: reduced ? 1 : 0.985 }),
});

/** Swipe/arrow-key paging shared by the slider and the lightbox. */
function usePager(count, start = 0) {
  const [[index, direction], setPage] = useState([start, 0]);
  const go = (delta) => setPage(([i]) => [wrapIndex(i + delta, count), delta]);
  const goTo = (next) => setPage(([i]) => [next, next >= i ? 1 : -1]);
  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
  };
  return { index, direction, go, goTo, onKeyDown };
}

const swipe = (go, dragged) => (_, { offset, velocity }) => {
  if (offset.x < -SWIPE_PX || velocity.x < -500) go(1);
  else if (offset.x > SWIPE_PX || velocity.x > 500) go(-1);
  if (Math.abs(offset.x) > 6) dragged.current = true;
};

export const ProjectGallery = ({ images, index: sectionIndex, onOpen }) => {
  const reduced = useReducedMotion();
  const pager = usePager(images.length);
  const dragged = useRef(false);
  const image = images[pager.index];
  const many = images.length > 1;

  // Warm the next image so paging feels instant (one image ahead, not the whole gallery).
  useEffect(() => {
    if (!many) return;
    const next = images[wrapIndex(pager.index + 1, images.length)];
    const preload = new Image();
    preload.src = next.url;
  }, [images, many, pager.index]);

  return (
    <section className="cs-section" aria-labelledby="cs-gallery-title">
      <div className="cs-shell cs-gallery">
        <SectionHeader id="cs-gallery-title" index={sectionIndex} eyebrow="Gallery" title="A closer" highlight="look." />
        <Reveal>
          <div
            className="cs-stage"
            role="region"
            aria-roledescription="carousel"
            aria-label="Project screenshots"
            tabIndex={0}
            onKeyDown={many ? pager.onKeyDown : undefined}
          >
            <AnimatePresence initial={false} custom={pager.direction}>
              <motion.div
                key={image.id}
                className="cs-slide"
                custom={pager.direction}
                variants={slideVariants(reduced)}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduced ? 0.15 : 0.55, ease: EASE }}
                drag={many ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragStart={() => { dragged.current = false; }}
                onDragEnd={swipe(pager.go, dragged)}
                role="group"
                aria-roledescription="slide"
                aria-label={`${pager.index + 1} of ${images.length}`}
              >
                <button
                  type="button"
                  className="cs-slide-button"
                  onClick={() => { if (!dragged.current) onOpen(images, pager.index); dragged.current = false; }}
                  aria-label={`Enlarge image ${pager.index + 1}${image.caption ? `: ${image.caption}` : ''}`}
                >
                  <ResponsiveImage image={image} sizes="(min-width: 1280px) 1240px, 100vw" draggable={false} />
                </button>
              </motion.div>
            </AnimatePresence>
            <div className="cs-stage-controls">
              <button type="button" className="cs-icon-btn" onClick={() => onOpen(images, pager.index)} aria-label="Open full screen"><ZoomIn size={18} /></button>
              {many && (
                <>
                  <button type="button" className="cs-icon-btn" onClick={() => pager.go(-1)} aria-label="Previous image"><ChevronLeft size={20} /></button>
                  <button type="button" className="cs-icon-btn" onClick={() => pager.go(1)} aria-label="Next image"><ChevronRight size={20} /></button>
                </>
              )}
            </div>
          </div>
          <div className="cs-gallery-meta">
            <p className="cs-caption" aria-live="polite">
              {image.category_label && <span className="cs-chip">{image.category_label}</span>}
              {image.caption}
            </p>
            {many && <span className="cs-counter" aria-hidden="true"><b>{String(pager.index + 1).padStart(2, '0')}</b> / {String(images.length).padStart(2, '0')}</span>}
          </div>
          {many && (
            <ul className="cs-thumbs" aria-label="Choose an image">
              {images.map((thumb, i) => (
                <li key={thumb.id}>
                  <button type="button" className="cs-thumb" aria-current={i === pager.index} onClick={() => pager.goTo(i)}
                          aria-label={`Show image ${i + 1}${thumb.caption ? `: ${thumb.caption}` : ''}`}>
                    <img src={thumb.thumbnail_url || thumb.url} alt="" loading="lazy" decoding="async" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </section>
  );
};

/** Full-screen viewer. Esc closes, arrows page, focus is trapped and returned to the opener. */
export const ProjectLightbox = ({ images, startIndex, onClose }) => {
  const reduced = useReducedMotion();
  const pager = usePager(images.length, startIndex);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const dragged = useRef(false);
  const image = images[pager.index];
  const many = images.length > 1;

  useEffect(() => {
    const opener = document.activeElement;
    const lenis = getLenis();
    lenis?.stop();
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = overflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (many) pager.onKeyDown(event);
    if (event.key === 'Tab') {
      const focusable = [...dialogRef.current.querySelectorAll('button')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };

  return createPortal(
    <motion.div
      ref={dialogRef}
      className="cs-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.1 : 0.25 }}
    >
      <div className="cs-lightbox-bar">
        <span className="cs-counter">{many && <><b>{String(pager.index + 1).padStart(2, '0')}</b> / {String(images.length).padStart(2, '0')}</>}</span>
        <button ref={closeRef} type="button" className="cs-icon-btn" onClick={onClose} aria-label="Close image viewer"><X size={20} /></button>
      </div>
      <div className="cs-lightbox-stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <AnimatePresence initial={false} custom={pager.direction} mode="popLayout">
          <motion.img
            key={image.id || image.url}
            src={image.url}
            alt={image.alt_text || ''}
            width={image.width}
            height={image.height}
            custom={pager.direction}
            variants={slideVariants(reduced)}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0.1 : 0.4, ease: EASE }}
            drag={many ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={swipe(pager.go, dragged)}
            draggable={false}
          />
        </AnimatePresence>
        {many && (
          <>
            <button type="button" className="cs-icon-btn cs-lightbox-nav prev" onClick={() => pager.go(-1)} aria-label="Previous image"><ChevronLeft size={22} /></button>
            <button type="button" className="cs-icon-btn cs-lightbox-nav next" onClick={() => pager.go(1)} aria-label="Next image"><ChevronRight size={22} /></button>
          </>
        )}
      </div>
      <p className="cs-lightbox-caption" aria-live="polite">{image.caption || image.alt_text || ''}</p>
    </motion.div>,
    document.body,
  );
};
