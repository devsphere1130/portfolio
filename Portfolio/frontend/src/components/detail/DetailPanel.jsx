import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useContent } from '../../content/hooks';
import { fillTemplate } from '../../lib/whatsapp';
import { WhatsAppLink } from '../whatsapp/WhatsAppLink';
import { formatItemNumber } from './formatItemNumber';
import { SectionLabel } from './SectionLabel';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DEFAULT_NOTE = 'Every project is different. We agree on the exact features and scope with you before any work starts.';

// Shared modal (bottom sheet on mobile) for the Services and Capabilities cards.
// Renders number, headline, summary and example; `children(item)` fills the middle.
// Rendered inside <AnimatePresence>.
export const DetailPanel = ({ items, activeIndex, onSelect, onClose, onContact, kind, backLabel, children }) => {
  const item = items[activeIndex];
  const { whatsapp } = useContent();
  const noun = kind.toLowerCase();
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const closeRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const titleId = `${noun}-${item.id}-title`;

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape closes even when focus has drifted outside the dialog (e.g. after clicking text).
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Start each newly selected item from the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeIndex]);

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 16 } };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onKeyDown={handleKeyDown}
      data-lenis-prevent
    >
      <div className="absolute inset-0 bg-[#02050a]/80 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...panelMotion}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-white/10 bg-[#070b12] shadow-[0_32px_120px_rgba(0,0,0,0.6),0_0_0_1px_rgba(56,189,248,0.05)] sm:max-h-[88svh] sm:rounded-xl"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

        {/* Header: switcher + close */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <nav aria-label={`Switch ${noun}`} className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 py-1">
            {items.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(index)}
                aria-current={index === activeIndex ? 'true' : undefined}
                aria-label={`${formatItemNumber(index)} ${entry.title}`}
                className={`shrink-0 rounded px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                  index === activeIndex
                    ? 'bg-sky-300/15 text-sky-200'
                    : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'
                }`}
              >
                {formatItemNumber(index)}
              </button>
            ))}
          </nav>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${noun} details`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 text-slate-300 transition-colors hover:border-sky-300/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div ref={scrollRef} className="detail-panel-scroll overflow-y-auto overscroll-contain px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
          <motion.div
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
              {kind} {formatItemNumber(activeIndex)} <span className="text-slate-600">/</span> {item.title}
            </p>
            <h3 id={titleId} className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              {item.headline}
            </h3>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{item.summary}</p>

            <div className="mt-7 border-l-2 border-sky-300/50 bg-sky-300/[0.05] px-5 py-4">
              <SectionLabel>Real-world example</SectionLabel>
              <p className="text-[0.95rem] leading-7 text-slate-300">{item.example}</p>
            </div>

            {children(item)}

            <p className="mt-8 text-sm leading-6 text-slate-500">
              {item.note ?? DEFAULT_NOTE}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onContact}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-sky-200/40 bg-sky-300 px-6 py-3.5 font-bold text-slate-950 transition-colors hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                Discuss Your Project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              {whatsapp?.enabled && whatsapp.show_project_buttons && (
                <WhatsAppLink phone={whatsapp.phone} className="wa-button !min-h-[52px] !px-6"
                              text={fillTemplate(whatsapp.capability_message_template, { title: item.title })}>
                  Ask on WhatsApp
                </WhatsAppLink>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-6 py-3.5 font-bold text-white transition-colors hover:border-sky-300/50 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
