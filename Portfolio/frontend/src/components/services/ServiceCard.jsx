import { forwardRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { formatItemNumber } from '../detail/formatItemNumber';

export const ServiceCard = forwardRef(({ service, index, active, onOpen }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={() => onOpen(index)}
    aria-haspopup="dialog"
    aria-expanded={active}
    aria-label={`${service.title}: view service details`}
    className="capability-item group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-md border border-white/10 bg-white/[0.025] p-5 text-left transition-[border-color,background-color,box-shadow] duration-300 hover:border-sky-300/35 hover:bg-sky-300/[0.045] hover:shadow-[0_0_32px_rgba(56,189,248,0.08)] focus-visible:border-sky-300/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
  >
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-sky-300/0 to-transparent transition-colors duration-300 group-hover:via-sky-300/70 group-focus-visible:via-sky-300/70"
    />
    <span className="font-mono text-lg font-bold tabular-nums text-sky-300/85 transition-colors duration-300 group-hover:text-sky-300 md:text-2xl">
      {formatItemNumber(index)}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-base font-semibold text-white md:text-lg">{service.title}</span>
      <span className="mt-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500 transition-colors duration-300 group-hover:text-sky-200/80 group-focus-visible:text-sky-200/80">
        View details
      </span>
    </span>
    <ArrowUpRight
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-slate-500 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sky-300 group-focus-visible:text-sky-300 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
    />
  </button>
));

ServiceCard.displayName = 'ServiceCard';
