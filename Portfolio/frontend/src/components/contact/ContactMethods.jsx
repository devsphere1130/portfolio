import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { useContent } from '../../content/hooks';

const MethodLink = ({ href, icon: Icon, label, value, external }) => (
  <a
    href={href}
    className="contact-method"
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
  >
    <span className="contact-method-icon"><Icon size={17} aria-hidden="true" /></span>
    <span className="contact-method-text">
      <span className="contact-method-label">{label}</span>
      <span className="contact-method-value">{value}</span>
    </span>
    <ArrowUpRight size={16} className="contact-method-arrow" aria-hidden="true" />
  </a>
);

export const ContactMethods = () => {
  const { contact, socialLinks } = useContent();
  const { email, phone, location, availability } = contact;
  const socials = socialLinks.filter((link) => link.href);

  return (
    <div className="contact-methods">
      <ul className="contact-method-list">
        {email && (
          <li><MethodLink href={`mailto:${email}`} icon={Mail} label="Email" value={email} /></li>
        )}
        {phone && (
          <li><MethodLink href={`tel:${phone.replace(/[^\d+]/g, '')}`} icon={Phone} label="Phone" value={phone} /></li>
        )}
      </ul>

      {socials.length > 0 && (
        <ul className="contact-socials" aria-label="Profiles">
          {socials.map((link) => (
            <li key={link.label}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="contact-social">
                {link.label}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="contact-status">
        {availability && (
          <p><span className="contact-status-dot" aria-hidden="true" />{availability}</p>
        )}
        {location && (
          <p><MapPin size={14} aria-hidden="true" />{location}</p>
        )}
      </div>
    </div>
  );
};
