import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { MagneticButton } from './MagneticButton';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/#home' },
    { label: 'About', href: '/#about' },
    { label: 'Work', href: '/#work' },
    { label: 'Services', href: '/#services' },
    { label: 'Stack', href: '/#stack' },
    { label: 'Contact', href: '/#contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        isScrolled ? 'border-b border-white/10 bg-slate-950/68 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="section-shell flex items-center justify-between py-0.5 lg:py-1">
        <BrandLogo imageClassName="h-[5.4rem] md:h-[6rem]" />

        <div className="hidden items-center gap-8 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="group relative text-sm font-medium text-slate-300 transition-colors duration-300 hover:text-white"
            >
              {link.label}
              <span className="absolute -bottom-3 left-1/2 h-1 w-1 -translate-x-1/2 scale-0 rounded-full bg-sky-300 transition-transform duration-300 group-hover:scale-100" />
            </a>
          ))}
        </div>

        <div className="hidden lg:block">
          <MagneticButton className="interactive rounded-md border border-sky-200/40 bg-sky-300 px-5 py-3 text-sm font-bold !text-slate-950 shadow-[0_0_36px_rgba(56,189,248,0.22)] transition-colors hover:bg-sky-200 hover:!text-slate-950">
            Start a Project
          </MagneticButton>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="interactive rounded-md border border-white/10 p-2 text-white lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-white/10 bg-slate-950/96 backdrop-blur-xl lg:hidden">
          <div className="section-shell space-y-2 py-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block rounded-md px-3 py-3 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <button className="mt-3 w-full rounded-md bg-sky-300 px-6 py-3 font-bold text-slate-950 transition-colors hover:bg-sky-200">
              Start a Project
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

