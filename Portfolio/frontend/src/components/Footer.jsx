import { Mail } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useContent } from '../content/hooks';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { contact: contactDetails, socialLinks, site } = useContent();

  return (
    <footer className="bg-[#05070a]">
      <div className="section-shell py-14">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <BrandLogo className="mb-4" imageClassName="h-36 md:h-40" />
            <p className="max-w-xs text-sm leading-6 text-slate-400">
              {site?.footer_tagline || 'Premium digital products and business systems engineered with clarity, precision and care.'}
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Navigation</h4>
            <ul className="space-y-0.5">
              {['Home', 'Work', 'Services', 'Stack', 'Contact'].map((link) => (
                <li key={link}>
                  <a
                    href={link === 'Contact' ? '/contact' : `/#${link.toLowerCase()}`}
                    className="inline-block py-2 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Services</h4>
            <ul className="space-y-0.5">
              {['Web Apps', 'SaaS', 'Backend API', 'Modernization'].map((service) => (
                <li key={service}>
                  <a
                    href="/#services"
                    className="inline-block py-2 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Get in Touch</h4>
            <div className="flex flex-col gap-1">
              <a
                href={`mailto:${contactDetails.email}`}
                className="flex items-center gap-2 py-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <Mail size={16} />
                <span>{contactDetails.email}</span>
              </a>
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {socialLinks.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                       className="inline-block py-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white">
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-slate-500">
            Copyright {currentYear} {site?.site_name || 'devsphere'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

