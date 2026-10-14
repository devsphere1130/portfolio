import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ContactMethods } from '../components/contact/ContactMethods';
import { ContactVisual } from '../components/contact/ContactVisual';
import { InquiryForm } from '../components/contact/InquiryForm';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { getLenis, useLenis } from '../hooks/useLenis';
import { pick, usePageMeta, useSection } from '../content/hooks';

// Entrance is CSS-only (see `.contact-rise`), so nothing waits on JavaScript to become visible.
const rise = (step) => ({ style: { '--contact-delay': `${0.06 + step * 0.08}s` } });

export const Contact = () => {
  useLenis();
  usePageMeta('contact');
  const intro = useSection('contact', 'intro');
  const closing = useSection('contact', 'closing');
  const [eyebrowLead, ...eyebrowRest] = pick(intro, 'eyebrow', 'Get in touch / Start a project').split(' / ');
  const formPanelRef = useRef(null);
  const firstFieldRef = useRef(null);

  const startConversation = () => {
    const panel = formPanelRef.current;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(panel, { offset: -120 });
    else panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    firstFieldRef.current?.focus({ preventScroll: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="contact-page min-h-screen overflow-hidden bg-[#05070a] text-white"
    >
      <Navbar />
      <main>
        <section className="contact-hero" aria-labelledby="contact-title">
          <div className="contact-hero-grid" aria-hidden="true" />
          <div className="contact-hero-glow" aria-hidden="true" />

          <div className="contact-shell contact-layout">
            <div className="contact-intro">
              <p className="contact-eyebrow contact-rise" {...rise(0)}>
                <span className="contact-eyebrow-dot" aria-hidden="true" />
                {eyebrowLead}{eyebrowRest.length > 0 && <> <span className="contact-eyebrow-sep">/</span> {eyebrowRest.join(' / ')}</>}
              </p>
              <h1 id="contact-title" className="contact-title contact-rise" {...rise(1)}>
                {pick(intro, 'title', 'Let’s Build Something Great')} <em>{pick(intro, 'title_highlight', 'Together.')}</em>
              </h1>
              <p className="contact-lede contact-rise" {...rise(2)}>
                {pick(intro, 'description', 'Have a project in mind, a business challenge to solve, or an idea you’d like to bring to life? Tell me what you’re working on. Let’s explore how we can turn it into a reliable digital product.')}
              </p>
              <p className="contact-tagline contact-rise" {...rise(3)}>
                <span aria-hidden="true">//</span> {pick(intro, 'tagline', 'From the first idea to a production-ready experience.')}
              </p>
            </div>

            <div className="contact-details contact-rise" {...rise(4)}>
              <ContactMethods />
            </div>

            <div ref={formPanelRef} id="inquiry" className="contact-form-panel contact-rise" {...rise(3)}>
              <InquiryForm ref={firstFieldRef} />
            </div>

            <div className="contact-visual-slot contact-rise" {...rise(6)}>
              <ContactVisual />
            </div>
          </div>
        </section>

        <section className="contact-closing" aria-labelledby="contact-closing-title">
          <div className="contact-shell contact-closing-inner">
            <div>
              <h2 id="contact-closing-title" className="contact-closing-title">{pick(closing, 'title', 'Have an idea worth building?')}</h2>
              <p className="contact-closing-copy">
                {pick(closing, 'description', 'Share what you have in mind. We can start with the problem, explore the possibilities, and define the right next step.')}
              </p>
            </div>
            <button type="button" onClick={startConversation} className="interactive hero-content-cta hero-content-cta-primary">
              <span>{pick(closing, 'cta_label', 'Start a Conversation')}<ArrowRight size={18} aria-hidden="true" /></span>
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </motion.div>
  );
};
