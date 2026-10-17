import { NavLink, Outlet } from 'react-router-dom';

const TABS = [['/admin/whatsapp', 'Overview', true], ['/admin/whatsapp/inquiries', 'Inquiries'], ['/admin/whatsapp/settings', 'WhatsApp settings']];

export const WhatsAppSection = () => (
  <section>
    <h1 className="text-2xl font-semibold tracking-tight">Leads & WhatsApp</h1>
    <p className="mt-1 max-w-3xl text-sm text-slate-400">
      Website inquiries and their lead status, plus WhatsApp settings. Lead statuses are your own workflow; they are not
      proof that a WhatsApp message was sent.
    </p>
    <nav className="mb-6 mt-5 flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Leads and WhatsApp">
      {TABS.map(([to, label, end]) => (
        <NavLink key={to} to={to} end={end}
                 className={({ isActive }) => `-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${isActive ? 'border-sky-300 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
          {label}
        </NavLink>
      ))}
    </nav>
    <Outlet />
  </section>
);
