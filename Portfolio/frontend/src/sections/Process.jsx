import { processData } from '../data/process';
import { SectionHeading } from '../components/SectionHeading';
import { ProcessStep } from '../components/ProcessStep';

export const Process = () => {
  return (
    <section className="py-24 md:py-32">
      <div className="section-shell grid gap-14 lg:grid-cols-[0.82fr_1fr]">
        <SectionHeading subtitle="A clear collaboration model keeps product decisions moving and prevents expensive surprises late in the build.">
          How a project moves from idea to launch.
        </SectionHeading>
        <div>
          {processData.map((step, index) => (
            <ProcessStep key={step.number} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
