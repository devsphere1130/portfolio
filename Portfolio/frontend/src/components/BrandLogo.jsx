import logoUrl from '../assets/logo-clean.png';

export const BrandLogo = ({ className = '', imageClassName = '' }) => {
  return (
    <a
      href="/"
      className={`interactive group inline-flex items-center rounded-md transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 ${className}`}
      aria-label="DevSphere home"
    >
      <span className="relative inline-flex shrink-0 overflow-visible">
        <span className="absolute inset-8 rounded-full bg-violet-300/0 blur-2xl transition-colors duration-300 group-hover:bg-violet-300/20" />
        <img
          src={logoUrl}
          width="1600"
          height="1543"
          alt="DevSphere"
          className={`relative h-[5.75rem] w-auto object-contain drop-shadow-[0_0_10px_rgba(167,139,250,0.18)] transition duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_16px_rgba(167,139,250,0.34)] md:h-[6.25rem] ${imageClassName}`}
        />
      </span>
    </a>
  );
};





