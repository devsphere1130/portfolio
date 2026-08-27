export const ScrollIndicator = () => {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-slate-500 md:flex">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.34em]">
        Scroll to explore
      </span>
      <span className="relative h-10 w-px overflow-hidden bg-white/10">
        <span className="absolute left-0 top-0 h-4 w-px animate-pulse bg-sky-300" />
      </span>
    </div>
  );
};
