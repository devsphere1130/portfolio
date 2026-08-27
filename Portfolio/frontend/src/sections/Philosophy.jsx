import { motion } from 'framer-motion';
import { philosophyData } from '../data/philosophy';

export const Philosophy = () => {
  return (
    <section id="about" className="border-y border-white/10 bg-slate-950/50 py-24 md:py-32">
      <div className="section-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="sticky top-28">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.3em] text-sky-300">Engineering Philosophy</p>
          <h2 className="text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-white md:text-6xl">
            I do not just write code. I solve the system behind the problem.
          </h2>
        </div>
        <div className="grid gap-4">
          {philosophyData.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-7"
            >
              <span className="font-mono text-sm text-sky-300">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 max-w-2xl leading-7 text-slate-400">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
