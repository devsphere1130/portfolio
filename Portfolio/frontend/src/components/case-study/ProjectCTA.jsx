import { useContent } from '../../content/hooks';
import { fillTemplate } from '../../lib/whatsapp';
import { CtaLink } from '../CtaLink';
import { WhatsAppLink } from '../whatsapp/WhatsAppLink';
import { Reveal } from './Primitives';

export const ProjectCTA = ({ project }) => {
  const { whatsapp } = useContent();
  const url = `${window.location.origin}/work/${project.slug}`;
  const showWhatsApp = whatsapp?.enabled && whatsapp.show_project_buttons && whatsapp.phone;
  return (
    <section className="cs-section" aria-labelledby="cs-cta-title">
      <div className="cs-shell">
        <Reveal className="cs-cta">
          <p className="cs-eyebrow"><span className="cs-eyebrow-dot" aria-hidden="true" />Start the conversation</p>
          <h2 id="cs-cta-title" className="cs-heading">Have a similar project <span>in mind?</span></h2>
          <p className="cs-lead">Let’s discuss your goals and explore how we can build the right solution for your business.</p>
          <div className="cs-cta-actions">
            <CtaLink primary href={`/contact?project=${encodeURIComponent(project.slug)}`}>Start a Project</CtaLink>
            {showWhatsApp && (
              // Opens WhatsApp with a pre-filled draft; the visitor reviews and sends it themselves.
              <WhatsAppLink phone={whatsapp.phone} className="wa-button" text={fillTemplate(whatsapp.project_message_template, { title: project.title, url })}>
                Ask about this project
              </WhatsAppLink>
            )}
            <CtaLink href="/contact">Contact DevSphere</CtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
