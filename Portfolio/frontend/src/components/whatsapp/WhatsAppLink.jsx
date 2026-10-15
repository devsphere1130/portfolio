import { chatUrl } from '../../lib/whatsapp';
import { WhatsAppIcon } from './WhatsAppIcon';

/**
 * A link that opens WhatsApp with a pre-filled message. The visitor reviews and sends it themselves;
 * nothing is sent or recorded by clicking. Renders nothing when there is no configured number.
 */
export const WhatsAppLink = ({ phone, text, children, className = '', iconSize = 18, label }) => {
  const href = chatUrl(phone, text);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}
       aria-label={label ? `${label} (opens WhatsApp in a new tab)` : undefined}>
      <WhatsAppIcon size={iconSize} />
      {children}
      {!label && <span className="sr-only"> (opens WhatsApp in a new tab)</span>}
    </a>
  );
};
