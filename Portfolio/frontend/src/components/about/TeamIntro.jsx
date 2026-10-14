import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDownRight } from 'lucide-react';
import { pick, useSection } from '../../content/hooks';

gsap.registerPlugin(ScrollTrigger);

export const TeamIntro = ({ members }) => {
  const rootRef = useRef(null);
  const section = useSection('about', 'team');

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(rootRef.current.querySelectorAll('[data-reveal]'), { opacity: 0, y: 28 }, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: rootRef.current, start: 'top 78%', once: true },
      });
    }, rootRef);
    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="about-shell team-intro">
      <div className="team-intro-heading">
        <p className="about-eyebrow" data-reveal>
          <span className="about-eyebrow-dot" aria-hidden="true" />
          {pick(section, 'eyebrow', 'The people behind the work')}
        </p>
        <h2 id="team-title" className="team-intro-title" data-reveal>
          {pick(section, 'title', 'Small team.')} <span>{pick(section, 'title_highlight', 'Serious execution.')}</span>
        </h2>
      </div>

      <div className="team-intro-side">
        <p className="team-intro-copy" data-reveal>
          {pick(section, 'description', 'Meet the people turning ideas into thoughtful interfaces, reliable software, and production-ready experiences.')}
        </p>

        <nav aria-label="Team members" data-reveal>
          <ol className="team-index">
            {members.map((member) => (
              <li key={member.id}>
                <a href={`#${member.id}`} className="team-index-link">
                  <span className="team-index-number">{member.index}</span>
                  <span className="team-index-role">{member.role}</span>
                  <span className="team-index-discipline">{member.discipline}</span>
                  <ArrowDownRight className="team-index-arrow" size={16} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
};
