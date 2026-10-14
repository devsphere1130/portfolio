import ribbonImage from '../../assets/hero-ribbon.webp';
import { pick, useContent, useSection } from '../../content/hooks';
import { studioCapabilities as defaultCapabilities } from '../../data/team';

// Entrance is CSS-only (see `.about-rise`), so the copy is never hidden waiting on JavaScript.
const rise = (step) => ({ className: 'about-rise', style: { '--about-delay': `${0.08 + step * 0.09}s` } });

export const AboutIntro = () => {
  const intro = useSection('about', 'intro');
  const { team } = useContent();
  const lines = pick(intro, 'title_lines', ['Good software', 'starts with the', 'right people.']);
  const capabilities = pick(intro, 'studio_capabilities', defaultCapabilities.map((c) => c.label))
    .map((label, i) => ({ index: String(i + 1).padStart(2, '0'), label }));
  const meta = pick(intro, 'meta', [{ label: 'Studio', value: 'DevSphere' }, { label: 'Based', value: 'India' }, { label: 'Working', value: 'Worldwide' }]);
  return (
  <section className="about-intro" aria-labelledby="about-title">
    <div className="about-intro-grid" aria-hidden="true" />
    <div className="about-intro-glow" aria-hidden="true" />

    {/* Creative half of the composition: the brand ribbon, framed by precise crop marks. */}
    <div className="about-intro-visual" aria-hidden="true">
      <img src={ribbonImage} alt="" width="1024" height="1536" decoding="async" fetchPriority="low" />
      <span className="about-intro-mark about-intro-mark-tl" />
      <span className="about-intro-mark about-intro-mark-bl" />
      <span className="about-intro-coord about-intro-coord-top">X 00.48 · Y 01.00</span>
      <span className="about-intro-coord about-intro-coord-side">Fig. 00 — Creative / Precision</span>
    </div>

    <div className="about-shell about-intro-content">
      <p {...rise(0)}>
        <span className="about-eyebrow">
          <span className="about-eyebrow-dot" aria-hidden="true" />
          <span className="about-eyebrow-index">[ 00 ]</span> {pick(intro, 'eyebrow', 'About DevSphere')}
        </span>
      </p>

      <h1 id="about-title" className="about-intro-title">
        {lines.map((line, i) => (
          <span key={line} {...rise(1 + i)}>{i === lines.length - 1 ? <em>{line}</em> : line}{i < lines.length - 1 ? ' ' : ''}</span>
        ))}
      </h1>

      <p className="about-intro-copy about-rise" style={{ '--about-delay': '0.4s' }}>
        {pick(intro, 'description', 'We bring together development, product thinking, and software quality to build digital experiences that work beautifully and perform reliably.')}
      </p>

      <ol className="about-capabilities" aria-label="What the team covers">
        {capabilities.map((capability, index) => (
          <li key={capability.index} {...rise(5 + index)}>
            <span className="about-capability-index">{capability.index}</span>
            <span className="about-capability-label">{capability.label}</span>
          </li>
        ))}
      </ol>

      <dl className="about-meta about-rise" style={{ '--about-delay': '0.9s' }}>
        {meta.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
        <div><dt>Team</dt><dd>{String(team.length).padStart(2, '0')} people</dd></div>
      </dl>
    </div>
  </section>
  );
};
