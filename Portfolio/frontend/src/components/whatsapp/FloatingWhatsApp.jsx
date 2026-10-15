import { useContent } from '../../content/hooks';
import { WhatsAppLink } from './WhatsAppLink';

// Fixed chat button on every public page, when enabled in the dashboard (WhatsApp → Settings).
export const FloatingWhatsApp = () => {
  const { whatsapp } = useContent();
  if (!whatsapp?.enabled || !whatsapp.show_floating_button) return null;
  return (
    <WhatsAppLink phone={whatsapp.phone} text={whatsapp.default_greeting} className="wa-float" iconSize={26}
                  label="Chat with Devsphere on WhatsApp">
      <span className="wa-float-tip" aria-hidden="true">Chat on WhatsApp</span>
    </WhatsAppLink>
  );
};
