import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ExternalLink, UploadCloud } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ErrorState, Spinner, StatusBadge } from '../components/Feedback';
import { Field } from '../components/Fields';
import { FormGrid } from '../components/ResourcePage';
import { BASE_TYPES, schemaFor } from '../sectionSchemas';
import { useToast } from '../toastContext';

const PUBLIC_PATH = { home: '/', about: '/about', contact: '/contact', projects: '/projects' };

export const PagesPage = () => {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api('/admin/pages/').then(setPages).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!pages) return <Spinner />;
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Pages & sections</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">Edit headings and copy section by section. Changes stay private until you publish the page.</p>
      <div className="admin-card mt-6 overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Page</th><th>Sections</th><th>Status</th><th>Last published</th></tr></thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td><Link className="font-semibold hover:text-sky-200" to={`/admin/pages/${page.id}`}>{page.title}</Link> <span className="ml-2 font-mono text-xs text-slate-500">{PUBLIC_PATH[page.slug] || `/${page.slug}`}</span></td>
                <td>{page.sections.length}</td>
                <td className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={page.status} />
                  {page.has_unpublished_changes && page.status === 'published' && <span className="admin-badge admin-badge-new">Unpublished changes</span>}
                </td>
                <td className="text-xs text-slate-400">{page.published_at ? new Date(page.published_at).toLocaleString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export const PageEditor = () => {
  const { id } = useParams();
  const { notify, confirm } = useToast();
  const [page, setPage] = useState(null);
  const [meta, setMeta] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api(`/admin/pages/${id}/`);
      setPage(data);
      setMeta({ title: data.title, meta_title: data.meta_title, meta_description: data.meta_description });
    } catch (e) {
      setError(e);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!page) return <Spinner />;
  const path = PUBLIC_PATH[page.slug] || `/${page.slug}`;

  const action = async (name, message) => {
    setBusy(true);
    try {
      setPage(await api(`/admin/pages/${page.id}/${name}/`, { method: 'POST' }));
      notify(message);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const unpublish = async () => {
    if (await confirm({ title: `Unpublish “${page.title}”?`, message: 'Visitors will see the built-in default content for this page until you publish again.', confirmLabel: 'Unpublish', danger: true })) {
      action('unpublish', 'Page unpublished.');
    }
  };
  const saveMeta = async () => {
    try {
      await api(`/admin/pages/${page.id}/`, { method: 'PATCH', body: meta });
      notify('Page details saved.');
    } catch (e) {
      notify(Object.values(e.fieldErrors)[0] || e.message, 'error');
    }
  };

  return (
    <section>
      <Link to="/admin/pages" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={14} />All pages</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <StatusBadge status={page.status} />
            {page.has_unpublished_changes ? <span className="admin-badge admin-badge-new">Unpublished changes</span> : <span>Live site is up to date.</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="admin-btn" href={`${path}?preview=1`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Preview draft</a>
          {page.status === 'published' && <button type="button" className="admin-btn" disabled={busy} onClick={unpublish}>Unpublish</button>}
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy || (!page.has_unpublished_changes && page.status === 'published')}
                  onClick={() => action('publish', 'Published — the live site now shows these changes.')}>
            <UploadCloud size={15} />{page.status === 'published' ? 'Publish changes' : 'Publish page'}
          </button>
        </div>
      </header>

      <details className="admin-card mt-6 p-5">
        <summary className="cursor-pointer font-semibold">Page details & SEO</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[['title', 'Page name', 'text'], ['meta_title', 'Browser tab / search title', 'text'], ['meta_description', 'Search description', 'textarea']].map(([name, label, type]) => (
            <Field key={name} field={{ name, label, type, maxLength: name === 'meta_description' ? 300 : 160 }} value={meta[name]} onChange={(k, v) => setMeta({ ...meta, [k]: v })} />
          ))}
        </div>
        <button type="button" className="admin-btn mt-4" onClick={saveMeta}>Save page details</button>
      </details>

      <div className="mt-6 grid gap-3">
        {page.sections.map((section) => <SectionEditor key={section.id} pageSlug={page.slug} section={section} onSaved={load} />)}
      </div>
    </section>
  );
};

const SectionEditor = ({ pageSlug, section, onSaved }) => {
  const { notify } = useToast();
  const schema = schemaFor(pageSlug, section.section_key);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => ({ ...section, ...section.content }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const baseFields = Object.entries(schema.base).map(([name, label]) => ({ name, label, type: BASE_TYPES[name], rows: name === 'description' ? 3 : 2 }));
  const fields = [...baseFields, ...schema.content];

  const onChange = (name, value) => {
    setDirty(true);
    setValues((v) => ({ ...v, [name]: value }));
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { is_enabled: values.is_enabled, content: Object.fromEntries(schema.content.map((f) => [f.name, values[f.name] ?? (['list', 'stats', 'pairs', 'cards'].includes(f.type) ? [] : f.type === 'link' ? { label: '', href: '' } : '')])) };
    baseFields.forEach((f) => { body[f.name] = values[f.name] ?? ''; });
    try {
      await api(`/admin/sections/${section.id}/`, { method: 'PATCH', body });
      setDirty(false);
      notify(`“${schema.label}” saved as a draft. Publish the page to make it live.`);
      onSaved();
    } catch (e) {
      const fieldErrors = e.fieldErrors;
      setErrors(fieldErrors);
      notify(fieldErrors.content || 'Please fix the highlighted fields.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
        <span>
          <span className="font-semibold">{schema.label}</span>
          <span className="ml-2 font-mono text-xs text-slate-500">{section.section_key}</span>
          {!section.is_enabled && <span className="admin-badge admin-badge-muted ml-2">Hidden</span>}
          {dirty && <span className="admin-badge admin-badge-draft ml-2">Unsaved</span>}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="border-t border-white/10 px-5 py-5">
          <FormGrid fields={fields} values={values} errors={errors} onChange={onChange} />
          {errors.content && <p className="admin-error mt-3">{errors.content}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Field field={{ name: 'is_enabled', label: 'Visible', type: 'boolean', checkboxLabel: 'Show this section (uses built-in copy when hidden or empty)', full: false }}
                   value={values.is_enabled} onChange={onChange} />
            <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save section'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
