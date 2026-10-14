import { Check } from 'lucide-react';

export const DeliverablesList = ({ items }) => (
  <ul className="grid gap-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3 text-[0.95rem] leading-6 text-slate-300">
        <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-sky-300" />
        {item}
      </li>
    ))}
  </ul>
);
