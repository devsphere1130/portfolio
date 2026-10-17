import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PENDING = 'To be confirmed';

function Pending({ children }) {
  return <span className="team-profile-pending">{children}</span>;
}

function Portrait({ member }) {
  if (member.portrait) {
    const label = member.portrait.alt || (member.name ? `Portrait of ${member.name}, ${member.role}` : `Portrait of DevSphere's ${member.role}`);
    return (
      <img
        className="team-profile-photo"
        src={member.portrait.src}
        width={member.portrait.width}
        height={member.portrait.height}
        style={member.portrait.position ? { objectPosition: member.portrait.position } : undefined}
        alt={label}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="team-profile-placeholder" role="img" aria-label={`Portrait coming soon for the ${member.role}`}>
      <span className="team-profile-placeholder-label">Portrait pending</span>
    </div>
  );
}

/**
 * One editorial chapter of the team story. `align="right"` puts the portrait on the right.
 * Scroll choreography: content focuses in (blur, opacity, offset) as it approaches the
 * reading line, is fully sharp from there on, and only dims gently once it has scrolled past.
 */
export const TeamProfile = ({ member, total, align = 'left' }) => {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const mm = gsap.matchMedia();

    mm.add(
      {
        wide: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        narrow: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
      },
      ({ conditions }) => {
        const media = root.querySelector('[data-focus="media"]');
        const text = root.querySelectorAll('[data-focus="text"]');

        if (conditions.narrow) {
          // Stacked layout: each block focuses on its own, without blur, to keep touch scrolling light.
          [media, ...text].forEach((element) => {
            gsap.fromTo(element, { opacity: 0.2, y: 24 }, {
              opacity: 1,
              y: 0,
              ease: 'none',
              scrollTrigger: { trigger: element, start: 'top 96%', end: 'clamp(top 72%)', scrub: 0.4 },
            });
          });
          return;
        }

        const enter = gsap.timeline({
          defaults: { ease: 'power1.out', duration: 1 },
          scrollTrigger: { trigger: root, start: 'top 88%', end: 'clamp(top 32%)', scrub: 0.6 },
        });
        enter
          .fromTo(media, { opacity: 0.2, y: 36, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)' })
          .fromTo(
            text,
            { opacity: 0.18, y: 28, filter: 'blur(8px)' },
            { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.08 },
            0.15,
          );

        // Exit only touches opacity and position of the whole chapter: no large-area blur.
        gsap.fromTo(root.querySelector('.team-profile-inner'), { opacity: 1, y: 0 }, {
          opacity: 0.32,
          y: -28,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'clamp(bottom 42%)', end: 'bottom top', scrub: 0.6 },
        });
      },
      root,
    );

    return () => mm.revert();
  }, []);

  const details = [
    ['Role', member.role],
    ['Experience', member.experience],
    ['Location', member.location],
    ['Focus', member.focus],
  ];
  const nameId = `${member.id}-name`;

  return (
    <article ref={rootRef} id={member.id} className="team-profile" data-align={align} aria-labelledby={nameId}>
      <div className="team-profile-inner">
        <header className="team-profile-head">
          <p className="team-profile-eyebrow" data-focus="text">
            <span className="team-profile-eyebrow-dot" aria-hidden="true" />
            Team member {member.index} <span aria-hidden="true">/</span> {member.discipline}
          </p>
          <h3 id={nameId} className="team-profile-name" data-focus="text">
            {member.name ?? <span className="team-profile-name-pending">Name to be added</span>}
          </h3>
          <p className="team-profile-role" data-focus="text">{member.role}</p>
        </header>

        <figure className="team-profile-media" data-focus="media">
          <span className="team-profile-numeral" aria-hidden="true">{member.index}</span>
          <div className="team-profile-frame">
            <Portrait member={member} />
          </div>
          <figcaption className="team-profile-caption">
            <span>Fig. {member.index} — {member.discipline}</span>
            <span aria-hidden="true">{member.index} / {String(total).padStart(2, '0')}</span>
          </figcaption>
        </figure>

        <div className="team-profile-body">
          <div className="team-profile-rule" data-focus="text" aria-hidden="true"><span /></div>
          <p className="team-profile-intro" data-focus="text">{member.introduction}</p>

          <div data-focus="text">
            <h4 className="team-profile-label">Profile details</h4>
            <dl className="team-profile-details">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? <Pending>{PENDING}</Pending>}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-focus="text">
            <h4 className="team-profile-label">{member.expertiseLabel}</h4>
            <ul className="team-profile-skills">
              {member.expertise.map((skill) => <li key={skill}>{skill}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
};
