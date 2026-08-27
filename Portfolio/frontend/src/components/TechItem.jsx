import { motion } from 'framer-motion';

export const TechItem = ({ tech }) => {
  return (
    <motion.li
      whileHover={{ y: -3 }}
      className="group rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-sky-300/35 hover:bg-sky-300/[0.06]"
      title={tech.description}
    >
      <span className="block text-sm font-semibold text-white">{tech.name}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500 group-hover:text-slate-300">
        {tech.description}
      </span>
    </motion.li>
  );
};
