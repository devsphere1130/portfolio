import { useCallback, useEffect, useRef, useState } from 'react';
import { getLenis } from './useLenis';

const scrollToContact = () => {
  const contact = document.getElementById('contact');
  if (!contact) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(contact, { offset: -80 });
  else contact.scrollIntoView({ behavior: 'smooth' });
  // Move keyboard focus to the contact actions without fighting the scroll.
  contact.querySelector('a[href], button')?.focus({ preventScroll: true });
};

// State for a set of cards that open a detail modal: pauses page scrolling while open,
// returns focus to the last shown card on close, or jumps to #contact from the CTA.
export const useDetailPanel = () => {
  const cardRefs = useRef([]);
  const lastIndexRef = useRef(0);
  const goToContactRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    if (activeIndex !== null) lastIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const root = document.documentElement;
    const cards = cardRefs.current;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    const previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    root.style.overflow = 'hidden';
    if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;
    getLenis()?.stop();

    return () => {
      root.style.overflow = previous.overflow;
      root.style.paddingRight = previous.paddingRight;
      getLenis()?.start();
      if (goToContactRef.current) {
        goToContactRef.current = false;
        scrollToContact();
      } else {
        cards[lastIndexRef.current]?.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  const close = useCallback(() => setActiveIndex(null), []);
  const contact = useCallback(() => {
    goToContactRef.current = true;
    setActiveIndex(null);
  }, []);
  const cardRef = useCallback((index) => (node) => {
    cardRefs.current[index] = node;
  }, []);

  return { activeIndex, isOpen, open: setActiveIndex, close, contact, cardRef };
};
