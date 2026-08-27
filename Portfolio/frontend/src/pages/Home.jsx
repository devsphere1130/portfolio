import { motion } from 'framer-motion';
import { CustomCursor } from '../components/CustomCursor';
import { MouseLight } from '../components/effects/MouseLight';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { CapabilitiesStrip } from '../sections/CapabilitiesStrip';
import { FinalCTA } from '../sections/FinalCTA';
import { Hero } from '../sections/Hero';
import { Philosophy } from '../sections/Philosophy';
import { Process } from '../sections/Process';
import { SelectedWork } from '../sections/SelectedWork';
import { Services } from '../sections/Services';
import { Stats } from '../sections/Stats';
import { TechStack } from '../sections/TechStack';
import { useLenis } from '../hooks/useLenis';

export const Home = () => {
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
      <main>
        <Hero />
        <CapabilitiesStrip />
        <SelectedWork />
        <Services />
        <TechStack />
        <Philosophy />
        <Stats />
        <Process />
        <FinalCTA />
      </main>
      <Footer />
    </motion.div>
  );
};
