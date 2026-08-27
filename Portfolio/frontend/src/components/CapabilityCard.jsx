import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export const CapabilityCard = ({ service, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, delay: index * 0.06 }}
      className="group glass-panel rounded-lg p-6 transition-colors hover:border-sky-300/35"
    >
      <div className="mb-10 flex items-start justify-between gap-6">
        <span className="font-mono text-sm text-sky-300">{String(index + 1).padStart(2, '0')}</span>
        <ArrowUpRight className="h-5 w-5 text-slate-500 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-sky-300" />
      </div>
      <h3 className="mb-4 text-xl font-semibold tracking-tight text-white">{service.title}</h3>
      <p className="leading-7 text-slate-400">{service.description}</p>
    </motion.article>
  );
};
