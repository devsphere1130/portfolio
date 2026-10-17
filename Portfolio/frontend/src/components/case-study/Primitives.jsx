import { motion, useReducedMotion } from 'framer-motion';
import { toBlocks } from '../../lib/caseStudy';

const EASE = [0.22, 1, 0.36, 1];

/** Fades content up once as it scrolls into view (a plain fade with reduced motion). */
export const Reveal = ({ as = 'div', delay = 0, children, className, ...rest }) => {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: reduced ? 0.2 : 0.8, delay: reduced ? 0 : delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const SectionHeader = ({ id, index, eyebrow, title, highlight, intro }) => (
  <Reveal className="cs-header">
    <p className="cs-eyebrow"><span className="cs-eyebrow-index">[ {index} ]</span> — {eyebrow}</p>
    <h2 id={id} className="cs-heading">{title}{highlight && <> <span>{highlight}</span></>}</h2>
    {intro && <p className="cs-lead">{intro}</p>}
  </Reveal>
);

/** Plain-text paragraphs (and "- " lists) from the API. */
export const Prose = ({ paragraphs, className = '' }) => {
  if (!paragraphs?.length) return null;
  return (
    <div className={`cs-prose ${className}`}>
      {toBlocks(paragraphs).map((block, i) => (block.type === 'list'
        ? <ul key={i}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
        : <p key={i}>{block.text}</p>))}
    </div>
  );
};

/** An uploaded image at the right size: 480px thumbnail or the full (≤2400px) file. */
export const ResponsiveImage = ({ image, sizes = '100vw', eager = false, alt, className, ...rest }) => (
  <img
    src={image.url}
    srcSet={image.thumbnail_url && image.thumbnail_url !== image.url ? `${image.thumbnail_url} 480w, ${image.url} ${image.width}w` : undefined}
    sizes={sizes}
    width={image.width}
    height={image.height}
    alt={alt ?? image.alt_text ?? ''}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    className={className}
    {...rest}
  />
);
