import { formatItemNumber } from './formatItemNumber';

export const ProcessSteps = ({ steps }) => (
  <ol className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-2">
    {steps.map((step, index) => (
      <li key={step.label} className="flex gap-3 bg-[#070b12] p-4">
        <span className="font-mono text-sm font-bold tabular-nums text-sky-300">{formatItemNumber(index)}</span>
        <span>
          <span className="block text-sm font-semibold text-white">{step.label}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-400">{step.text}</span>
        </span>
      </li>
    ))}
  </ol>
);
