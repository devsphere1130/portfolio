import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Archive, ArrowLeft, ExternalLink, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { ErrorState, Spinner, StatusBadge } from '../../components/Feedback';
import { FormGrid } from '../../components/ResourcePage';
import { slugify, toPayload } from '../../forms';
import { useToast } from '../../toastContext';
import { ChildManager } from './ChildManager';
import { GalleryManager } from './GalleryManager';
import { ALL_PROJECT_FIELDS, CHILD_CONFIGS, PROJECT_TABS } from './projectFields';
import { VideoManager } from './VideoManager';

const TABS = [
  ['general', 'General'], ['hero', 'Hero & media'], ['overview', 'Overview'], ['build', 'What we built', 'build_components'],
  ['gallery', 'Gallery', 'gallery'], ['videos', 'Videos', 'videos'], ['stack', 'Technology', 'stack'], ['story', 'Problem → solution'],
  ['features', 'Features', 'features'], ['outcomes', 'Outcomes', 'outcomes'], ['seo', 'SEO'], ['related', 'Related'], ['publishing', 'Publishing'],
];
const CHILD_TABS = new Set(['build', 'gallery', 'videos', 'stack', 'features', 'outcomes']);
const DEFAULTS = { technologies: [], related_projects: [], is_featured: false, display_order: 0, show_client_name: false, repository_public: false };

const editable = (values) => JSON.stringify(toPayload(ALL_PROJECT_FIELDS, values));
const toForm = (data) => ({ ...data });

const StackTab = ({ projectId }) => {
  const [techs, setTechs] = useState(null);
  useEffect(() => { api('/admin/technologies/', { query: { page_size: 100, ordering: 'name' } }).then((d) => setTechs(d.results)).catch(() => setTechs([])); }, []);
  if (techs === null) return <Spinner />;
  const config = {
    kind: 'stack', label: 'Technology', plural: 'technologies', title: (r) => r.name, summary: (r) => [r.category, r.note].filter(Boolean).join(' · '),
    defaults: { is_published: true },
    fields: [
      { name: 'technology', label: 'Technology', type: 'select', options: techs.map((t) => ({ value: t.id, label: `${t.name} (${t.category})` })), full: false,
        hint: 'Pick one from the list…' },
      { name: 'note', label: 'How it was used', maxLength: 200, placeholder: 'e.g. REST API and admin', full: false },
      { name: 'technology_name', label: 'Or type a new technology', maxLength: 80, placeholder: 'e.g. Tailwind CSS', full: false,
        hint: '…or type it here if it isn’t in the list.' },
      { name: 'technology_category', label: 'Its category', maxLength: 80, placeholder: 'e.g. Frontend, Backend, Database', full: false,
        hint: 'Defaults to “Other”.' },
    ],
  };
  return (
    <ChildManager projectId={projectId} config={config}
                  intro={<>Pick from the shared technology list, or type a new one. New ones are added to <Link className="admin-link" to="/admin/technologies">Tech stack</Link> as drafts, so they show on this project but not in the homepage Tech Stack until you publish them there.</>} />
  );
};

const BuildTab = ({ projectId }) => {
  const [videos, setVideos] = useState(null);
  useEffect(() => { api(`/admin/projects/${projectId}/videos/`).then(setVideos).catch(() => setVideos([])); }, [projectId]);
  if (videos === null) return <Spinner />;
  const base = CHILD_CONFIGS.build;
  const config = videos.length ? { ...base, fields: [...base.fields, { name: 'video', label: 'Video (optional)', type: 'select', options: videos.map((v) => ({ value: v.id, label: v.title })), hint: 'Shown instead of the screenshot. It must be published on the Videos tab.' }] } : base;
  return <ChildManager projectId={projectId} config={config} intro="The real engineering work, one component at a time. Write it so a non-technical client understands what it does and why it matters." />;
};

const RelatedTab = ({ project, values, onChange }) => {
  const [others, setOthers] = useState(null);
  useEffect(() => { api('/admin/projects/', { query: { page_size: 100 } }).then((d) => setOthers(d.results.filter((p) => p.id !== project?.id))).catch(() => setOthers([])); }, [project?.id]);
  if (others === null) return <Spinner />;
  const chosen = new Set(values.related_projects || []);
  const toggle = (id) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id); else if (next.size < 6) next.add(id);
    onChange('related_projects', [...next]);
  };
  return (
    <div className="grid gap-3">
      <p className="max-w-3xl text-sm text-slate-400">Choose up to 6. Only published ones are shown. With none chosen, other published projects in the same category appear instead.</p>
      {others.length === 0 ? <p className="text-sm text-slate-400">There are no other projects yet.</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {others.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 hover:border-sky-300/40">
                <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} disabled={!chosen.has(p.id) && chosen.size >= 6} />
                <span className="flex-1"><span className="font-semibold">{p.title}</span><span className="block text-xs text-slate-400">{p.category || 'No category'}</span></span>
                <StatusBadge status={p.status} />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PublishingTab = ({ project, dirty, onStatus, onDelete }) => {
  const counts = project.section_counts;
  const rows = [['What we built', counts.build_components], ['Gallery images', counts.gallery], ['Videos', counts.videos],
    ['Technologies', counts.stack], ['Features', counts.features], ['Outcomes', counts.outcomes]];
  return (
    <div className="grid gap-6">
      <div className="admin-card p-5">
        <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">Status</h3><StatusBadge status={project.status} /></div>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {project.status === 'published' ? 'Live at /work/' + project.slug + '. Changes you save appear on the site within about a minute.'
            : project.status === 'archived' ? 'Archived: hidden from the site and kept for reference.'
              : 'Draft: only visible to signed-in editors through Preview.'}
        </p>
        {dirty && <p className="mt-2 text-sm text-amber-200">You have unsaved changes. Publishing uses the last saved version.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {project.status !== 'published' && <button type="button" className="admin-btn admin-btn-primary" onClick={() => onStatus('publish')}><Eye size={15} />Publish</button>}
          {project.status === 'published' && <button type="button" className="admin-btn" onClick={() => onStatus('unpublish')}><EyeOff size={15} />Unpublish (back to draft)</button>}
          {project.status !== 'archived' && <button type="button" className="admin-btn" onClick={() => onStatus('archive')}><Archive size={15} />Archive</button>}
          <a className="admin-btn" href={`/work/${project.slug}?preview=1`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Preview</a>
        </div>
      </div>
      <div className="admin-card p-5">
        <h3 className="font-semibold">What the public page will show</h3>
        <p className="mt-1 text-sm text-slate-400">Sections with nothing published are left out automatically.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {rows.map(([label, c]) => (
            <li key={label} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span>{label}</span>
              <span className={c.published ? 'text-emerald-200' : 'text-slate-500'}>{c.published ? `${c.published} shown` : 'Hidden'}{c.total > c.published ? ` · ${c.total - c.published} not published` : ''}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="admin-card border-red-300/20 p-5">
        <h3 className="font-semibold">Delete project</h3>
        <p className="mt-1 text-sm text-slate-400">Removes the project, its case-study items and its uploaded videos. Images stay in the media library.</p>
        <button type="button" className="admin-btn admin-btn-danger mt-4" onClick={onDelete}><Trash2 size={15} />Delete permanently</button>
      </div>
    </div>
  );
};

export const ProjectEditor = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { notify, confirm } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'general';
  const [project, setProject] = useState(isNew ? null : undefined); // undefined = loading
  const [values, setValues] = useState(DEFAULTS);
  const [saved, setSaved] = useState(editable(DEFAULTS));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const load = useCallback(async ({ keepValues = false } = {}) => {
    if (isNew) return;
    try {
      const data = await api(`/admin/projects/${id}/`);
      setProject(data);
      if (!keepValues) {
        setValues(toForm(data));
        setSaved(editable(data));
      }
    } catch (e) {
      setLoadError(e);
    }
  }, [id, isNew]);
  useEffect(() => { load(); }, [load]);
  // Child tabs change counts; refresh them (without touching unsaved form edits) when switching tabs.
  useEffect(() => { if (!isNew && project) load({ keepValues: true }); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => editable(values) !== saved, [values, saved]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const onChange = (name, value) => setValues((prev) => {
    const next = { ...prev, [name]: value };
    if (name === 'slug') setSlugTouched(true);
    if (name === 'title' && !slugTouched) next.slug = slugify(value || '');
    return next;
  });

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const body = toPayload(ALL_PROJECT_FIELDS, values);
      const result = isNew ? await api('/admin/projects/', { method: 'POST', body }) : await api(`/admin/projects/${id}/`, { method: 'PATCH', body });
      setProject(result);
      setValues(toForm(result));
      setSaved(editable(result));
      notify(isNew ? 'Project created as a draft.' : 'Changes saved.');
      if (isNew) navigate(`/admin/projects/${result.id}?tab=${tab}`, { replace: true });
    } catch (e) {
      setErrors(e.fieldErrors || {});
      const fields = Object.keys(e.fieldErrors || {});
      const where = TABS.find(([key]) => (PROJECT_TABS[key] || []).some((f) => fields.includes(f.name)));
      notify(e.status === 400 ? `Please fix the highlighted fields${where ? ` on the ${where[1]} tab` : ''}.` : e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (action) => {
    if (dirty && !(await confirm({ title: 'Save changes first?', message: 'You have unsaved changes. This uses the last saved version.', confirmLabel: 'Continue without saving' }))) return;
    try {
      const result = await api(`/admin/projects/${id}/${action}/`, { method: 'POST' });
      setProject(result);
      notify({ publish: 'Published: it is now live on the site.', unpublish: 'Unpublished: hidden from the site.', archive: 'Archived.' }[action]);
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this project?', message: `“${project.title}” and everything in its case study will be removed permanently.`, confirmLabel: 'Delete', danger: true }))) return;
    try {
      await api(`/admin/projects/${id}/`, { method: 'DELETE' });
      setSaved(editable(values)); // nothing left to warn about
      notify('Project deleted.');
      navigate('/admin/projects');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const leave = async (e) => {
    if (dirty && !(await confirm({ title: 'Leave without saving?', message: 'Your unsaved changes will be lost.', confirmLabel: 'Leave', danger: true }))) return;
    if (e) navigate('/admin/projects');
  };

  if (loadError) return <ErrorState error={loadError} onRetry={() => { setLoadError(null); load(); }} />;
  if (project === undefined) return <Spinner />;

  const counts = project?.section_counts;
  const panel = () => {
    if (CHILD_TABS.has(tab) && isNew) return <p className="text-sm text-slate-400">Save the project first, then add items here.</p>;
    switch (tab) {
      case 'build': return <BuildTab projectId={id} />;
      case 'gallery': return <GalleryManager projectId={id} />;
      case 'videos': return <VideoManager projectId={id} />;
      case 'stack': return <StackTab projectId={id} />;
      case 'features': return <ChildManager projectId={id} config={CHILD_CONFIGS.features} intro="Key capabilities of the product. Add an image, or pick an icon for a compact card." />;
      case 'outcomes': return <ChildManager projectId={id} config={CHILD_CONFIGS.outcomes} intro="Verified, approved results only. The whole section is hidden while there are none." />;
      case 'related': return <RelatedTab project={project} values={values} onChange={onChange} />;
      case 'publishing': return isNew ? <p className="text-sm text-slate-400">Save the project first.</p> : <PublishingTab project={project} dirty={dirty} onStatus={setStatus} onDelete={remove} />;
      case 'seo': return (
        <div className="grid gap-5">
          <FormGrid fields={PROJECT_TABS.seo} values={values} errors={errors} onChange={onChange} />
          <div className="admin-card max-w-2xl p-4" aria-label="Search result preview">
            <p className="text-xs text-slate-500">Search result preview</p>
            <p className="mt-2 truncate text-lg text-sky-200">{values.seo_title || values.title || 'Project title'} | DevSphere</p>
            <p className="text-xs text-emerald-200/80">/work/{values.slug || 'project-slug'}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-300">{values.seo_description || values.short_description || 'Add a summary or SEO description.'}</p>
          </div>
        </div>
      );
      default: return <FormGrid fields={PROJECT_TABS[tab]} values={values} errors={errors} onChange={onChange} />;
    }
  };
  const formTab = !CHILD_TABS.has(tab) && tab !== 'publishing';

  return (
    <section>
      <Link to="/admin/projects" className="admin-link mb-4 inline-flex items-center gap-1.5 text-sm" onClick={(e) => { e.preventDefault(); leave(e); }}>
        <ArrowLeft size={14} aria-hidden="true" />All projects
      </Link>
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#05070a]/95 px-4 py-3 backdrop-blur lg:top-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{values.title || 'New project'}</h1>
            {project && <StatusBadge status={project.status} />}
          </div>
          <p className="mt-0.5 text-xs text-slate-400" role="status" aria-live="polite">
            {busy ? 'Saving…' : dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : 'All changes saved'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project && <a className="admin-btn" href={`/work/${project.slug}?preview=1`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Preview</a>}
          {project && project.status !== 'published' && <button type="button" className="admin-btn" onClick={() => setStatus('publish')}><Eye size={15} />Publish</button>}
          <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={busy || (!dirty && !isNew)}><Save size={15} />{isNew ? 'Create draft' : 'Save'}</button>
        </div>
      </header>

      <div role="tablist" aria-label="Project sections" className="admin-scroll -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-white/10 px-1">
        {TABS.map(([key, label, countKey]) => {
          const c = countKey && counts?.[countKey];
          return (
            <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls="project-tabpanel"
                    onClick={() => setParams({ tab: key }, { replace: true })}
                    className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${tab === key ? 'border-sky-300 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
              {label}
              {c && c.total > 0 && <span className="rounded-full bg-white/10 px-1.5 text-[11px] text-slate-300" aria-label={`${c.published} of ${c.total} published`}>{c.published}/{c.total}</span>}
            </button>
          );
        })}
      </div>

      <div id="project-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="max-w-5xl">
        {panel()}
        {formTab && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={busy || (!dirty && !isNew)}><Save size={15} />{isNew ? 'Create draft' : 'Save changes'}</button>
            {dirty && <span className="text-sm text-amber-200">Unsaved changes</span>}
          </div>
        )}
      </div>
    </section>
  );
};
