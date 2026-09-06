import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomCursor } from '../components/CustomCursor';
import { MouseLight } from '../components/effects/MouseLight';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { ProjectCard } from '../components/ProjectCard';
import { projectsData } from '../data/projects';
import { useLenis } from '../hooks/useLenis';

export const Projects = () => {
  useLenis();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen overflow-hidden bg-[#05070a] text-white"
    >
      <MouseLight />
      <CustomCursor />
      <Navbar />

      <main className="relative pt-36 md:pt-44">
        <section className="section-shell pb-20 md:pb-28">
          <Link
            to="/"
            className="interactive inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-sky-300/50 hover:bg-white/[0.04] hover:text-white"
          >
            <ArrowLeft size={18} />
            Back Home
          </Link>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-sky-300">
              All Projects
            </p>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-7xl">
              Production-ready work across web apps, SaaS and business systems.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Explore the complete project collection, from dashboards and backend systems to scalable product platforms.
            </p>
          </div>

          <div className="mt-16 space-y-20 md:space-y-28">
            {projectsData.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </motion.div>
  );
};
