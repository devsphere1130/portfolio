import { useEffect, useRef } from 'react';

export const MagneticButton = ({ children, className = '', onClick, href }) => {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!btnRef.current) return;
    const button = btnRef.current;

    const handleMouseMove = (e) => {
      const rect = button.getBoundingClientRect();
      const buttonX = rect.left + rect.width / 2;
      const buttonY = rect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(e.clientX - buttonX, 2) + Math.pow(e.clientY - buttonY, 2)
      );

      if (distance < 100) {
        const angle = Math.atan2(e.clientY - buttonY, e.clientX - buttonX);
        const moveX = Math.cos(angle) * (100 - distance) * 0.2;
        const moveY = Math.sin(angle) * (100 - distance) * 0.2;

        button.style.transform = `translate(${moveX}px, ${moveY}px)`;
      } else {
        button.style.transform = 'translate(0, 0)';
      }
    };

    const reset = () => {
      button.style.transform = 'translate(0, 0)';
    };

    button.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', reset);
    return () => {
      button.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', reset);
    };
  }, []);

  const classes = `relative inline-flex items-center justify-center overflow-hidden transition-transform duration-100 ${className}`;
  const content = <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>;

  if (href) {
    return (
      <a ref={btnRef} href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      className={classes}
    >
      {content}
    </button>
  );
};
