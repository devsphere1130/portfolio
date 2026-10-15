import { useCallback, useEffect, useState } from 'react';
import { Archive, CheckCheck, Mail, Send } from 'lucide-react';
import { api } from '../../../lib/api';
import { chatUrl, fillTemplate } from '../../../lib/whatsapp';
import { WhatsAppIcon } from '../../../components/whatsapp/WhatsAppIcon';
import { Drawer, Spinner } from '../../components/Feedback';
import { useToast } from '../../toastContext';
import { fromLocalInput, LEAD_STATUSES, STATUS_TONE, statusLabel, toLocalInput } from './leadMeta';

const MESSAGE_STATUS = {
  pending: 'Pending', accepted: 'Accepted by WhatsApp', sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Failed', received: 'Received',
};

export const LeadDrawer = ({ id, onClose, onChanged }) => {
  const { notify, confirm } = useToast();
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState({});
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [users, setUsers] = useState([]);
  const [wa, setWa] = useState(null);
  const [config, setConfig] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [data, noteList, waData] = await Promise.all([
      api(`/admin/inquiries/${id}/`), api(`/admin/inquiries/${id}/notes/`), api(`/admin/inquiries/${id}/whatsapp/`),
    ]);
    setLead(data);
    setForm({ lead_status: data.lead_status, assigned_to: data.assigned_to ?? '', follow_up_at: toLocalInput(data.follow_up_at) });
    setNotes(noteList);
    setWa(waData);
  }, [id]);

  useEffect(() => {
    load().catch((e) => notify(e.message, 'error'));
    api('/admin/users/', { query: { page_size: 100 } }).then((d) => setUsers(d.results.filter((u) => u.is_active))).catch(() => {});
    api('/admin/whatsapp/settings/').then(setConfig).catch(() => {});
  }, [load, notify]);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const result = await fn();
      if (message) notify(message);
      onChanged();
      return result;
    } catch (e) {
      notify(Object.values(e.fieldErrors || {})[0] || e.message, 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    setLead(await api(`/admin/inquiries/${id}/`, { method: 'PATCH', body: {
      lead_status: form.lead_status, assigned_to: form.assigned_to || null, follow_up_at: fromLocalInput(form.follow_up_at),
    } }));
  }, 'Lead updated.');

  const archive = () => run(async () => {
    const data = await api(`/admin/inquiries/${id}/`, { method: 'PATCH', body: { lead_status: 'archived' } });
    setLead(data);
    setForm((f) => ({ ...f, lead_status: 'archived' }));
  }, 'Archived.');

  const markContacted = () => run(async () => {
    const data = await api(`/admin/inquiries/${id}/mark-contacted/`, { method: 'POST' });
    setLead(data);
    setForm((f) => ({ ...f, lead_status: data.lead_status }));
  }, 'Marked as contacted.');

  const addNote = () => run(async () => {
    const created = await api(`/admin/inquiries/${id}/notes/`, { method: 'POST', body: { body: note } });
    setNotes((list) => [created, ...list]);
    setNote('');
  }, 'Note added.');

  const sendCloud = () => run(async () => {
    await api(`/admin/inquiries/${id}/whatsapp/`, { method: 'POST', body: { text: reply } });
    setReply('');
    setWa(await api(`/admin/inquiries/${id}/whatsapp/`));
  }, 'Accepted by WhatsApp. Delivery is shown when WhatsApp confirms it.');

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this inquiry?', message: 'The inquiry, its notes and lead history are deleted permanently.', confirmLabel: 'Delete', danger: true }))) return;
    if (await run(() => api(`/admin/inquiries/${id}/`, { method: 'DELETE' }), 'Inquiry deleted.') !== null) onClose();
  };

  if (!lead) return <Drawer title="Inquiry" onClose={onClose}><Spinner /></Drawer>;

  const waText = config && fillTemplate(config.admin_message_template, { name: lead.name.split(' ')[0], service: lead.service_label });
  const waHref = lead.phone_number && chatUrl(lead.phone_number, waText);
  const dirty = form.lead_status !== lead.lead_status || String(form.assigned_to || '') !== String(lead.assigned_to || '')
    || fromLocalInput(form.follow_up_at) !== (lead.follow_up_at ? new Date(lead.follow_up_at).toISOString() : null);

  return (
    <Drawer title={`Inquiry from ${lead.name}`} onClose={onClose} wide footer={(
      <>
        <button type="button" className="admin-btn admin-btn-danger mr-auto" disabled={busy} onClick={remove}>Delete</button>
        {lead.lead_status !== 'archived' && <button type="button" className="admin-btn" disabled={busy} onClick={archive}><Archive size={14} />Archive</button>}
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !dirty} onClick={save}>Save lead</button>
      </>
    )}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`admin-badge ${STATUS_TONE[lead.lead_status]}`}>{statusLabel(lead.lead_status)}</span>
            <span className="text-slate-400">via {lead.source_label}</span>
          </p>
          <dl className="mt-4 grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-400">Email</dt><dd><a className="admin-link" href={`mailto:${lead.email}`}>{lead.email}</a></dd>
            <dt className="text-slate-400">Phone</dt><dd>{lead.phone_number || '—'}</dd>
            <dt className="text-slate-400">Company</dt><dd>{lead.company || '—'}</dd>
            <dt className="text-slate-400">Needs</dt><dd>{lead.service_label}</dd>
            <dt className="text-slate-400">Budget</dt><dd>{lead.budget_label || '—'}</dd>
            {(lead.related_project || lead.related_capability) && (<><dt className="text-slate-400">About</dt><dd>{(lead.related_project || lead.related_capability).title}</dd></>)}
            <dt className="text-slate-400">Received</dt><dd>{new Date(lead.created_at).toLocaleString()}</dd>
            <dt className="text-slate-400">Last contacted</dt><dd>{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleString() : 'Not yet'}</dd>
          </dl>
          <h3 className="mt-6 text-sm font-semibold">Message</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-6">{lead.details}</p>

          <h3 className="mt-6 text-sm font-semibold">Reply</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <a className="admin-btn" href={`mailto:${lead.email}?subject=${encodeURIComponent('Re: your project inquiry')}`}><Mail size={14} />Email</a>
            {waHref ? (
              <a className="admin-btn" href={waHref} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={15} className="text-[#25d366]" />Open WhatsApp</a>
            ) : <span className="self-center text-xs text-slate-500">No phone number, so no WhatsApp option.</span>}
            <button type="button" className="admin-btn" disabled={busy} onClick={markContacted}><CheckCheck size={14} />Mark as contacted</button>
          </div>
          {waHref && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Opens a chat with a draft message: you review and send it yourself in WhatsApp. Nothing is sent from here, and the number
              may not be on WhatsApp. Use “Mark as contacted” once you have actually reached them.
            </p>
          )}
        </div>

        <div className="grid content-start gap-4">
          <div className="admin-card grid gap-3 p-4">
            <h3 className="text-sm font-semibold">Lead</h3>
            <label className="text-sm"><span className="admin-label">Status</span>
              <select className="admin-input" value={form.lead_status} onChange={(e) => setForm({ ...form, lead_status: e.target.value })}>
                {LEAD_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="admin-label">Assigned to</span>
              <select className="admin-input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="admin-label">Follow up on</span>
              <input type="datetime-local" className="admin-input" value={form.follow_up_at} onChange={(e) => setForm({ ...form, follow_up_at: e.target.value })} />
            </label>
          </div>

          <div className="admin-card p-4">
            <h3 className="text-sm font-semibold">Internal notes <span className="font-normal text-slate-500">(private)</span></h3>
            <textarea className="admin-input mt-2" rows={3} maxLength={4000} placeholder="Call outcome, next step…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="admin-btn admin-btn-sm mt-2" disabled={busy || !note.trim()} onClick={addNote}>Add note</button>
            <ul className="mt-3 grid gap-2">
              {notes.length === 0 && <li className="text-xs text-slate-500">No notes yet.</li>}
              {notes.map((n) => (
                <li key={n.id} className="rounded border border-white/10 p-2 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{n.author_name || 'Removed user'} · {new Date(n.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {wa?.conversation && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><WhatsAppIcon size={15} className="text-[#25d366]" />WhatsApp conversation <span className="font-normal text-slate-500">(Cloud API records)</span></h3>
          <ul className="mt-3 grid gap-2">
            {wa.conversation.messages.map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${m.direction === 'outbound' ? 'ml-auto border-sky-300/25 bg-sky-300/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                <p className="whitespace-pre-wrap">{m.text || `[${m.message_type} message]`}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(m.created_at).toLocaleString()} · {MESSAGE_STATUS[m.status] || m.status}
                  {m.error_title && <span className="text-red-300"> · {m.error_title}</span>}
                </p>
              </li>
            ))}
          </ul>
          {wa.cloud_api_ready && (wa.conversation.service_window_open ? (
            <div className="mt-3 flex gap-2">
              <input className="admin-input" placeholder="Reply via the WhatsApp Cloud API" value={reply} maxLength={4096} onChange={(e) => setReply(e.target.value)} />
              <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !reply.trim()} onClick={sendCloud}><Send size={14} />Send</button>
            </div>
          ) : <p className="mt-3 text-xs text-slate-500">The 24-hour reply window is closed. WhatsApp only allows approved template messages until the customer writes again.</p>)}
        </div>
      )}
    </Drawer>
  );
};
