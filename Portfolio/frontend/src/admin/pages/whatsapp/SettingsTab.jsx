import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../../../lib/api';
import { chatUrl, fillTemplate } from '../../../lib/whatsapp';
import { ErrorState, Spinner } from '../../components/Feedback';
import { FormGrid } from '../../components/ResourcePage';
import { useToast } from '../../toastContext';

const SWITCHES = [
  { name: 'enabled', label: 'WhatsApp', type: 'boolean', checkboxLabel: 'Enable WhatsApp on the website', full: false },
  { name: 'show_number_publicly', label: 'Number', type: 'boolean', checkboxLabel: 'Show the number as text on the Contact page', full: false },
  { name: 'show_floating_button', label: 'Floating button', type: 'boolean', checkboxLabel: 'Floating chat button on every page', full: false },
  { name: 'show_contact_button', label: 'Contact page', type: 'boolean', checkboxLabel: '“Chat on WhatsApp” on the Contact page', full: false },
  { name: 'show_project_buttons', label: 'Projects & capabilities', type: 'boolean', checkboxLabel: '“Ask on WhatsApp” on projects and capability panels', full: false },
  { name: 'show_after_form_button', label: 'After the form', type: 'boolean', checkboxLabel: '“Continue on WhatsApp” after a form is submitted', full: false },
];
const TEMPLATES = [
  { name: 'default_greeting', label: 'Default greeting (floating button & Contact page)', type: 'textarea', rows: 2, hint: 'No placeholders.' },
  { name: 'project_message_template', label: 'Project inquiry message', type: 'textarea', rows: 2, hint: 'Placeholders: {title}, {url} (the project’s public link, if any).' },
  { name: 'capability_message_template', label: 'Capability / service message', type: 'textarea', rows: 2, hint: 'Placeholder: {title}.' },
  { name: 'after_form_message_template', label: 'After the contact form', type: 'textarea', rows: 2, hint: 'Placeholders: {name}, {service}.' },
  { name: 'admin_message_template', label: 'Your reply draft (dashboard “Open WhatsApp”)', type: 'textarea', rows: 2, hint: 'Placeholders: {name}, {service}. Used when you message a lead.' },
];
const CLOUD = [
  { name: 'mode', label: 'Integration mode', type: 'select', required: true, options: [
    { value: 'click_to_chat', label: 'Click-to-chat only (no API, recommended to start)' },
    { value: 'cloud_api', label: 'Click-to-chat + official WhatsApp Cloud API' },
  ] },
  { name: 'cloud_phone_number_id', label: 'Phone number ID', full: false, hint: 'From Meta WhatsApp Manager → API setup.' },
  { name: 'cloud_business_account_id', label: 'WhatsApp Business Account ID', full: false },
];

export const SettingsTab = () => {
  const { notify } = useToast();
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api('/admin/whatsapp/settings/').then(setValues).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!values) return <Spinner />;
  const onChange = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const body = Object.fromEntries([...SWITCHES, ...TEMPLATES, ...CLOUD, { name: 'business_phone' }].map((f) => [f.name, values[f.name]]));
    try {
      setValues(await api('/admin/whatsapp/settings/', { method: 'PATCH', body }));
      notify('WhatsApp settings saved. The website updates within a minute.');
    } catch (e) {
      setErrors(e.fieldErrors);
      notify('Please fix the highlighted fields.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const testHref = chatUrl(values.business_phone, fillTemplate(values.default_greeting));
  const status = values.cloud_status;

  return (
    <form onSubmit={save} noValidate className="grid grid-cols-1 gap-6">
      <div className="admin-card p-6">
        <h2 className="mb-4 font-semibold">Click-to-chat</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormGrid fields={[{ name: 'business_phone', label: 'Business WhatsApp number', placeholder: '+91 98765 43210',
            hint: 'International format with country code. Visitors need it in the link, so it is visible to anyone who opens one.' }]}
                    values={values} errors={errors} onChange={onChange} />
          <div className="self-end">
            {testHref
              ? <a className="admin-btn" href={testHref} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Test link</a>
              : <p className="text-xs text-slate-500">Add a number to test the link.</p>}
          </div>
        </div>
        <div className="mt-5"><FormGrid fields={SWITCHES} values={values} errors={errors} onChange={onChange} /></div>
      </div>

      <div className="admin-card p-6">
        <h2 className="mb-4 font-semibold">Pre-filled messages</h2>
        <FormGrid fields={TEMPLATES} values={values} errors={errors} onChange={onChange} />
        <p className="mt-4 text-xs text-slate-500">Only public information is ever inserted. Visitors can edit the message before sending.</p>
      </div>

      <div className="admin-card p-6">
        <h2 className="font-semibold">WhatsApp Business Cloud API <span className="text-sm font-normal text-slate-500">(optional)</span></h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">Needed only to receive messages in this dashboard, reply from here and see delivery/read status. Click-to-chat works without it.</p>
        <FormGrid fields={CLOUD} values={values} errors={errors} onChange={onChange} />
        <div className={`mt-5 rounded-lg border p-4 text-sm ${status.ready ? 'border-emerald-300/30 bg-emerald-400/5' : 'border-white/10 bg-white/[0.02]'}`}>
          <p className="font-semibold">{status.ready ? 'Connected and ready' : 'Not active'}</p>
          {status.missing.length > 0 && (
            <p className="mt-1 text-slate-400">Missing: {status.missing.map((m) => <code key={m} className="mr-2 inline-block break-all rounded bg-white/5 px-1.5 py-0.5 text-xs">{m}</code>)}</p>
          )}
          <p className="mt-2 text-slate-400">Secrets are set on the server (environment variables), never here. Webhook URL for Meta:
            <code className="ml-1 break-all rounded bg-white/5 px-1.5 py-0.5 text-xs">{status.webhook_url}</code> · API {status.api_version}</p>
          <p className="mt-1 text-xs text-slate-500">Last webhook: {values.last_webhook_at ? new Date(values.last_webhook_at).toLocaleString() : 'never'} · Last successful send: {values.last_api_success_at ? new Date(values.last_api_success_at).toLocaleString() : 'never'}</p>
        </div>
      </div>

      <div><button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save WhatsApp settings'}</button></div>
    </form>
  );
};
