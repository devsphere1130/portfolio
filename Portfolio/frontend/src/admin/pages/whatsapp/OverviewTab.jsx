import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { ErrorState, Spinner } from '../../components/Feedback';
import { STATUS_TONE, statusLabel } from './leadMeta';

const Card = ({ label, value, sub, to }) => {
  const body = (
    <>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </>
  );
  return to ? <Link to={to} className="admin-card block p-4 hover:border-sky-300/40">{body}</Link> : <div className="admin-card p-4">{body}</div>;
};

export const OverviewTab = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api('/admin/whatsapp/overview/').then(setData).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return <Spinner />;
  const { inquiries, whatsapp } = data;
  const by = inquiries.by_status;
  const q = (status) => `/admin/whatsapp/inquiries?lead_status=${status}`;

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="mb-3 font-semibold">Website inquiries <span className="text-sm font-normal text-slate-500">(from the contact form and project/capability pages)</span></h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Total inquiries" value={inquiries.total} to="/admin/whatsapp/inquiries" />
          <Card label="New" value={by.new} to={q('new')} />
          <Card label="Awaiting response" value={inquiries.awaiting_response} sub="New + awaiting response" to={q('open')} />
          <Card label="Follow-ups due" value={inquiries.follow_ups_due} to="/admin/whatsapp/inquiries?due=1" />
          <Card label="Contacted" value={by.contacted} to={q('contacted')} />
          <Card label="Qualified" value={by.qualified} to={q('qualified')} />
          <Card label="Converted" value={by.converted} to={q('converted')} />
          <Card label="Closed" value={by.not_qualified + by.archived} sub={`${by.not_qualified} not qualified · ${by.archived} archived`} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">WhatsApp</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="admin-card p-5 text-sm">
            <p className="font-semibold">Click-to-chat {whatsapp.click_to_chat_ready ? <span className="admin-badge admin-badge-published ml-2">On</span> : <span className="admin-badge admin-badge-muted ml-2">Off</span>}</p>
            <p className="mt-2 leading-6 text-slate-400">
              Website buttons open WhatsApp with a pre-filled message. The visitor sends it themselves, so these chats live only in
              your WhatsApp app and are not counted here. {inquiries.with_phone} inquiries include a phone number you can reply to.
            </p>
            {!whatsapp.click_to_chat_ready && <Link to="/admin/whatsapp/settings" className="admin-link mt-2 inline-block">Set it up</Link>}
          </div>
          <div className="admin-card p-5 text-sm">
            <p className="font-semibold">Cloud API {whatsapp.cloud_api_ready ? <span className="admin-badge admin-badge-published ml-2">Connected</span> : <span className="admin-badge admin-badge-muted ml-2">Not configured</span>}</p>
            {whatsapp.cloud_api_ready || whatsapp.inbound_messages || Object.values(whatsapp.outbound_by_status).some(Boolean) ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                <dt className="text-slate-400">Conversations</dt><dd>{whatsapp.conversations}</dd>
                <dt className="text-slate-400">Messages received</dt><dd>{whatsapp.inbound_messages}</dd>
                {['accepted', 'sent', 'delivered', 'read', 'failed'].map((s) => (
                  <Fragment key={s}><dt className="capitalize text-slate-400">Sent · {s}</dt><dd>{whatsapp.outbound_by_status[s]}</dd></Fragment>
                ))}
                <dt className="text-slate-400">Last webhook</dt><dd>{whatsapp.last_webhook_at ? new Date(whatsapp.last_webhook_at).toLocaleString() : 'Never'}</dd>
              </dl>
            ) : (
              <p className="mt-2 leading-6 text-slate-400">Message, delivery and read counts appear here only when the official WhatsApp Business Cloud API is connected; they come from WhatsApp's own status events, never estimates.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">“Accepted” means WhatsApp received the request; delivered/read are only shown when WhatsApp reports them.</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Latest inquiries</h2><Link to="/admin/whatsapp/inquiries" className="admin-link text-sm">View all</Link></div>
        {inquiries.recent.length === 0 ? <p className="text-sm text-slate-400">No inquiries yet.</p> : (
          <ul className="admin-card divide-y divide-white/10">
            {inquiries.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <Link to={`/admin/whatsapp/inquiries?open=${row.id}`} className="admin-tap font-semibold hover:text-sky-200">{row.name}</Link>
                <span className="text-slate-400">{row.service}</span>
                <span className={`admin-badge ${STATUS_TONE[row.lead_status]}`}>{statusLabel(row.lead_status)}</span>
                <time className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
