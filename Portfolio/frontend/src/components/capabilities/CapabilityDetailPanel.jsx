import { DeliverablesList } from '../detail/DeliverablesList';
import { DetailPanel } from '../detail/DetailPanel';
import { ProcessSteps } from '../detail/ProcessSteps';
import { SectionLabel } from '../detail/SectionLabel';

export const CapabilityDetailPanel = ({ capabilities, ...props }) => (
  <DetailPanel items={capabilities} kind="Capability" backLabel="Back to Capabilities" {...props}>
    {(capability) => (
      <>
        <div className="mt-8">
          <SectionLabel>{capability.buildsLabel ?? 'What we can build'}</SectionLabel>
          <DeliverablesList items={capability.builds} />
        </div>

        <div className="mt-8">
          <SectionLabel>How it works</SectionLabel>
          <ProcessSteps steps={capability.steps} />
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
          <SectionLabel>The outcome</SectionLabel>
          <p className="max-w-2xl text-lg leading-8 text-white">{capability.outcome}</p>
        </div>
      </>
    )}
  </DetailPanel>
);
