import { motion } from 'framer-motion';

export const ProcessStep = ({ step, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="relative border-l border-white/10 pb-10 pl-8 last:pb-0"
    >
      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border border-sky-300 bg-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.45)]" />
      <span className="font-mono text-sm text-sky-300">{step.number}</span>
      <h3 className="mt-2 text-2xl font-semibold text-white">{step.title}</h3>
      <p className="mt-3 max-w-xl leading-7 text-slate-400">{step.description}</p>
    </motion.article>
  );
};
