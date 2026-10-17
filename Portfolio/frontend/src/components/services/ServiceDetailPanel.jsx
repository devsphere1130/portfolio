import { DeliverablesList } from '../detail/DeliverablesList';
import { DetailPanel } from '../detail/DetailPanel';
import { ProcessSteps } from '../detail/ProcessSteps';
import { SectionLabel } from '../detail/SectionLabel';

export const ServiceDetailPanel = ({ services, ...props }) => (
  <DetailPanel items={services} kind="Service" backLabel="Back to Services" {...props}>
    {(service) => (
      <>
        <div className="mt-8">
          <SectionLabel>How it works</SectionLabel>
          <ProcessSteps steps={service.steps} />
        </div>

        <div className="mt-8 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-[1.15fr_1fr]">
          <div>
            <SectionLabel>What you get</SectionLabel>
            <DeliverablesList items={service.deliverables} />
          </div>
          <div>
            <SectionLabel>Who it&rsquo;s for</SectionLabel>
            <p className="text-[0.95rem] leading-7 text-slate-300">{service.audience}</p>
          </div>
        </div>
      </>
    )}
  </DetailPanel>
);
