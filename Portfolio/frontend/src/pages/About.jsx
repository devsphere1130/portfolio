import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AboutIntro } from '../components/about/AboutIntro';
import { TeamIntro } from '../components/about/TeamIntro';
import { TeamProfile } from '../components/about/TeamProfile';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { pick, useContent, usePageMeta, useSection } from '../content/hooks';
import { useLenis } from '../hooks/useLenis';

export const About = () => {
  useLenis();
  usePageMeta('about');
  const { team: teamMembers } = useContent();
  const closing = useSection('about', 'closing');
  const primary = pick(closing, 'primary_cta', { label: 'Start a Project', href: '/contact' });
  const secondary = pick(closing, 'secondary_cta', { label: 'View Our Work', href: '/#work' });

  useEffect(() => {
    // Trigger positions depend on final text metrics, so re-measure once the web fonts land.
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) ScrollTrigger.refresh(); });
    return () => { cancelled = true; };
  }, []);

  // Live team data can change section heights after first paint; re-measure scroll triggers.
  useEffect(() => { ScrollTrigger.refresh(); }, [teamMembers]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="about-page min-h-screen overflow-hidden bg-[#05070a] text-white"
    >
      <Navbar />
      <main>
        <AboutIntro />

        <section className="about-team" aria-labelledby="team-title">
          <TeamIntro members={teamMembers} />
          <div className="about-shell">
            {teamMembers.map((member, index) => (
              <TeamProfile
                key={member.id}
                member={member}
                total={teamMembers.length}
                align={index % 2 === 0 ? 'left' : 'right'}
              />
            ))}
          </div>
        </section>

        <section className="about-closing" aria-labelledby="about-closing-title">
          <div className="about-shell about-closing-inner">
            <p className="about-eyebrow">
              <span className="about-eyebrow-dot" aria-hidden="true" />
              {pick(closing, 'eyebrow', 'Work with the team')}
            </p>
            <h2 id="about-closing-title" className="about-closing-title">
              {pick(closing, 'title', 'Have a product that needs')} <span>{pick(closing, 'title_highlight', 'careful hands?')}</span>
            </h2>
            <div className="about-closing-actions">
              <a href={primary.href || '/contact'} className="interactive hero-content-cta hero-content-cta-primary">
                <span>{primary.label || 'Start a Project'}<ArrowRight size={18} aria-hidden="true" /></span>
              </a>
              <a href={secondary.href || '/#work'} className="interactive hero-content-cta hero-content-cta-secondary">
                <span>{secondary.label || 'View Our Work'}<ArrowUpRight size={16} aria-hidden="true" /></span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </motion.div>
  );
};
