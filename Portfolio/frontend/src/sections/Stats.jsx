import { motion } from 'framer-motion';
import { statsData } from '../data/stats';

export const Stats = () => {
  return (
    <section className="py-16">
      <div className="section-shell grid gap-4 md:grid-cols-4">
        {statsData.map((stat, index) => (
          <motion.article
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, delay: index * 0.05 }}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-lg font-semibold text-slate-200">{stat.value}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
