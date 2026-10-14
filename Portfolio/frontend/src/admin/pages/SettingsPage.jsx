import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ErrorState, Spinner } from '../components/Feedback';
import { FormGrid } from '../components/ResourcePage';
import { toPayload } from '../forms';
import { useToast } from '../toastContext';

const FIELDS = [
  { name: 'site_name', label: 'Site name', required: true, full: false },
  { name: 'contact_email', label: 'Public contact email', type: 'email', full: false, hint: 'Shown on the site. Inquiry notifications go to CONTACT_NOTIFY_EMAIL on the server.' },
  { name: 'contact_phone', label: 'Phone', full: false, hint: 'Optional. Shown as a call link when set.' },
  { name: 'availability_text', label: 'Availability line', full: false },
  { name: 'location_text', label: 'Location line', full: false },
  { name: 'default_title', label: 'Default page title', full: false },
  { name: 'default_description', label: 'Default search description', type: 'textarea', rows: 2, maxLength: 300 },
  { name: 'footer_tagline', label: 'Footer tagline', type: 'textarea', rows: 2, maxLength: 300 },
  { name: 'social_links', label: 'Social links', type: 'social', hint: 'Full https:// profile URLs only. Leave empty to hide social links.' },
  { name: 'logo_media', label: 'Logo (optional)', type: 'media', full: false },
  { name: 'favicon_media', label: 'Favicon (optional)', type: 'media', full: false },
];

export const SettingsPage = () => {
  const { notify } = useToast();
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/admin/settings/').then(setValues).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!values) return <Spinner />;

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      setValues(await api('/admin/settings/', { method: 'PATCH', body: toPayload(FIELDS, values) }));
      notify('Settings saved. They are live on the site now.');
    } catch (e) {
      setErrors(e.fieldErrors);
      notify('Please fix the highlighted fields.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site settings</h1>
          <p className="mt-1 text-sm text-slate-400">Contact details, footer and social links used across the site.</p>
        </div>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </header>
      <div className="admin-card p-6">
        <FormGrid fields={FIELDS} values={values} errors={errors} onChange={(name, value) => setValues({ ...values, [name]: value })} />
      </div>
    </form>
  );
};
