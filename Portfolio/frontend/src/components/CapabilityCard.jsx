import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { formatItemNumber } from './detail/formatItemNumber';

export const CapabilityCard = forwardRef(({ service, index, active, onOpen }, ref) => {
  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={() => onOpen(index)}
      aria-haspopup="dialog"
      aria-expanded={active}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, delay: index * 0.06 }}
      className="group glass-panel relative flex w-full cursor-pointer flex-col justify-start overflow-hidden rounded-lg p-6 text-left transition-[border-color,background-color,box-shadow] duration-300 hover:!border-sky-300/35 hover:!bg-sky-300/[0.03] hover:!shadow-[0_24px_80px_rgba(2,6,23,0.3),0_0_40px_rgba(56,189,248,0.07)] focus-visible:!border-sky-300/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/0 to-transparent transition-colors duration-300 group-hover:via-sky-300/60 group-focus-visible:via-sky-300/60"
      />
      <span className="mb-10 flex items-start justify-between gap-6">
        <span className="font-mono text-sm text-sky-300">{formatItemNumber(index)}</span>
        <span className="flex items-center gap-2 text-slate-500 transition-colors group-hover:text-sky-300 group-focus-visible:text-sky-300">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            Explore
          </span>
          <ArrowUpRight aria-hidden="true" className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
        </span>
      </span>
      <span className="mb-4 block text-xl font-semibold tracking-tight text-white">{service.title}</span>
      <span className="block leading-7 text-slate-400">{service.description}</span>
    </motion.button>
  );
});

CapabilityCard.displayName = 'CapabilityCard';
